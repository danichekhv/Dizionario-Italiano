// ── Le Carte: колоды, карточки и интервальные повторения ─────────────────────
// Данные живут в Supabase (таблицы decks / notes / cards), поэтому прогресс общий
// на всех устройствах. Одна заметка (слово) порождает две карточки: с итальянской
// и с русской лицевой стороной; оборот у обеих одинаковый.
(function () {
  const DAY = 86400000, MIN = 60000;
  const LEARN_STEPS = [1, 10];     // минуты: шаги заучивания новой карточки
  const RELEARN_STEPS = [10];      // минуты: после ошибки на выученной карточке
  const GRADUATE_DAYS = 1, EASY_DAYS = 4, LEARN_AHEAD_MIN = 20;
  const NEW_PER_DAY_KEY = 'dizionario_cards_new_per_day';

  const S = {
    decks: [], notes: [], cards: [],
    view: 'decks', deckId: null, tagFilter: '',
    queue: [], current: null, revealed: false, undo: null,
    collapsed: {}, loaded: false, missingTables: false,
    build: null, browseSelected: new Set(),
    reviews: [], reviewsMissing: false, shownAt: 0, statsDeckId: null
  };

  // ── Supabase REST ────────────────────────────────────────────────────────────
  async function sb(path, opts = {}) {
    const method = opts.method || 'GET';
    const headers = { ...SB_H };
    if (method === 'POST' || method === 'PATCH') headers['Prefer'] = 'return=representation';
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const text = await res.text();
    let data = null; try { data = text ? JSON.parse(text) : null; } catch (e) {}
    if (!res.ok) {
      const err = new Error((data && (data.message || data.hint)) || `HTTP ${res.status}`);
      err.code = data && data.code; err.status = res.status; throw err;
    }
    return data;
  }
  const isMissingTable = e => e && (e.code === 'PGRST205' || e.code === '42P01' || /Could not find the table|does not exist/i.test(e.message || ''));

  const SETUP_SQL = `-- Выполните один раз в Supabase: SQL Editor → New query → Run
create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references decks(id) on delete cascade,
  created_at timestamptz default now()
);
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks(id) on delete cascade,
  word text not null,
  translation text default '',
  phonetic text default '',
  example text default '',
  meaning text default '',
  pos text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade,
  direction text not null check (direction in ('it','ru')),
  state text default 'new',
  step int default 0,
  due timestamptz default now(),
  interval_days real default 0,
  ease real default 2.5,
  reps int default 0,
  lapses int default 0,
  created_at timestamptz default now()
);
create index if not exists cards_note_idx on cards(note_id);
create index if not exists notes_deck_idx on notes(deck_id);
-- История ответов для статистики
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade,
  note_id uuid references notes(id) on delete cascade,
  deck_id uuid,
  rating int not null,
  prev_state text,
  new_state text,
  prev_interval real default 0,
  interval_days real default 0,
  took_ms int default 0,
  reviewed_at timestamptz default now()
);
create index if not exists reviews_at_idx on reviews(reviewed_at);`;

  async function loadAll() {
    try {
      const [decks, notes, cards] = await Promise.all([
        sb('decks?select=*&order=created_at'),
        sb('notes?select=*&order=created_at'),
        sb('cards?select=*')
      ]);
      S.decks = decks || []; S.notes = notes || [];
      S.cards = (cards || []).map(c => ({ ...c, dueMs: Date.parse(c.due) || 0 }));
      S.loaded = true; S.missingTables = false;
    } catch (e) {
      if (isMissingTable(e)) { S.missingTables = true; S.loaded = true; }
      else { console.error('cards load:', e); showToast('⚠ Не удалось загрузить колоды: ' + e.message); }
    }
    // История ответов отдельно: её таблица могла появиться позже остальных
    if (!S.missingTables) {
      try {
        const rv = await sb('reviews?select=*&order=reviewed_at');
        S.reviews = (rv || []).map(r => ({ ...r, atMs: Date.parse(r.reviewed_at) || 0 }));
        S.reviewsMissing = false;
      } catch (e) { if (isMissingTable(e)) S.reviewsMissing = true; else console.warn('reviews load:', e); }
    }
  }

  // ── Дерево колод ─────────────────────────────────────────────────────────────
  const childrenOf = pid => S.decks.filter(d => (d.parent_id || null) === (pid || null)).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  function subtreeIds(id) { const out = [id]; childrenOf(id).forEach(c => out.push(...subtreeIds(c.id))); return out; }
  const deckById = id => S.decks.find(d => d.id === id);
  function deckPath(id) { const parts = []; let d = deckById(id); while (d) { parts.unshift(d.name); d = d.parent_id ? deckById(d.parent_id) : null; } return parts.join(' › '); }
  const notesInDeck = id => { const ids = new Set(subtreeIds(id)); return S.notes.filter(n => ids.has(n.deck_id)); };
  const cardsOfNotes = notes => { const ids = new Set(notes.map(n => n.id)); return S.cards.filter(c => ids.has(c.note_id)); };
  const noteById = id => S.notes.find(n => n.id === id);

  function counts(cards) {
    const now = Date.now(); const c = { new: 0, learn: 0, due: 0 };
    cards.forEach(k => {
      if (k.state === 'new') c.new++;
      else if (k.state === 'learning' || k.state === 'relearning') { if (k.dueMs <= now) c.learn++; }
      else if (k.dueMs <= now) c.due++;
    });
    return c;
  }
  const newPerDay = () => { try { return parseInt(localStorage.getItem(NEW_PER_DAY_KEY)) || 20; } catch (e) { return 20; } };

  // ── Расписание (SM-2 в духе Anki) ────────────────────────────────────────────
  function schedule(card, rating) {
    const now = Date.now(); const c = { ...card };
    const learning = c.state === 'new' || c.state === 'learning' || c.state === 'relearning';
    if (learning) {
      const steps = c.state === 'relearning' ? RELEARN_STEPS : LEARN_STEPS;
      const stateName = c.state === 'relearning' ? 'relearning' : 'learning';
      if (rating === 1) { c.state = stateName; c.step = 0; c.dueMs = now + steps[0] * MIN; }
      else if (rating === 2) { c.state = stateName; c.step = c.step || 0; c.dueMs = now + Math.max(steps[c.step] || steps[0], 5) * MIN; }
      else if (rating === 3) {
        const next = (c.step || 0) + 1;
        if (next >= steps.length) { c.state = 'review'; c.interval_days = Math.max(GRADUATE_DAYS, c.interval_days || 0); c.dueMs = now + c.interval_days * DAY; c.step = 0; }
        else { c.state = stateName; c.step = next; c.dueMs = now + steps[next] * MIN; }
      } else { c.state = 'review'; c.interval_days = Math.max(EASY_DAYS, c.interval_days || 0); c.dueMs = now + c.interval_days * DAY; c.step = 0; }
    } else {
      const iv = Math.max(1, c.interval_days || 1);
      if (rating === 1) { c.lapses = (c.lapses || 0) + 1; c.ease = Math.max(1.3, (c.ease || 2.5) - 0.2); c.state = 'relearning'; c.step = 0; c.interval_days = Math.max(1, Math.round(iv * 0.5)); c.dueMs = now + RELEARN_STEPS[0] * MIN; }
      else if (rating === 2) { c.interval_days = Math.max(iv + 1, Math.round(iv * 1.2)); c.ease = Math.max(1.3, (c.ease || 2.5) - 0.15); c.dueMs = now + c.interval_days * DAY; }
      else if (rating === 3) { c.interval_days = Math.max(iv + 1, Math.round(iv * (c.ease || 2.5))); c.dueMs = now + c.interval_days * DAY; }
      else { c.interval_days = Math.max(iv + 1, Math.round(iv * (c.ease || 2.5) * 1.3)); c.ease = (c.ease || 2.5) + 0.15; c.dueMs = now + c.interval_days * DAY; }
      c.interval_days = Math.min(c.interval_days, 36500);
    }
    c.reps = (c.reps || 0) + 1;
    c.due = new Date(c.dueMs).toISOString();
    return c;
  }
  function fmtInterval(ms) {
    const m = ms / MIN, h = ms / 3600000, d = ms / DAY;
    if (m < 60) return `<${Math.max(1, Math.round(m))} мин`;
    if (h < 24) return `${Math.round(h)} ч`;
    if (d < 30) return `${Math.round(d)} дн.`;
    if (d < 365) return `${(d / 30).toFixed(1).replace('.0', '')} мес.`;
    return `${(d / 365).toFixed(1).replace('.0', '')} г.`;
  }
  const previewLabel = (card, r) => fmtInterval(schedule(card, r).dueMs - Date.now());

  // ── Очередь на сегодня ───────────────────────────────────────────────────────
  function buildQueue() {
    let notes = notesInDeck(S.deckId);
    if (S.tagFilter) notes = notes.filter(n => (n.tags || []).includes(S.tagFilter));
    const cards = cardsOfNotes(notes); const now = Date.now();
    const learn = cards.filter(c => (c.state === 'learning' || c.state === 'relearning') && c.dueMs <= now).sort((a, b) => a.dueMs - b.dueMs);
    const review = cards.filter(c => c.state === 'review' && c.dueMs <= now).sort((a, b) => a.dueMs - b.dueMs);
    const fresh = cards.filter(c => c.state === 'new').sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).slice(0, newPerDay());
    // Парные карточки одного слова разводим: сначала все итальянские, потом русские,
    // чтобы ответ на первую не подсказывал вторую через минуту
    const freshOrdered = [...fresh.filter(c => c.direction === 'it'), ...fresh.filter(c => c.direction !== 'it')];
    S.queue = [...learn, ...review, ...freshOrdered];
  }
  function nextCard() {
    const now = Date.now();
    if (!S.queue.length) {
      // Карточки, которые подойдут в ближайшие минуты, показываем сразу, как в Anki
      const soon = cardsOfNotes(notesInDeck(S.deckId)).filter(c => (c.state === 'learning' || c.state === 'relearning') && c.dueMs <= now + LEARN_AHEAD_MIN * MIN).sort((a, b) => a.dueMs - b.dueMs);
      if (soon.length) S.queue = soon;
    }
    S.current = S.queue.shift() || null; S.revealed = false; S.shownAt = Date.now();
  }

  // ── Рендер ───────────────────────────────────────────────────────────────────
  const esc = s => escapeHtml(s == null ? '' : String(s));
  const root = () => $('cardsScreen');
  // Экран учёбы живёт в отдельном слое поверх страницы (как в Anki), остальное — внутри вкладки
  function overlay() {
    let o = document.getElementById('studyOverlay');
    if (!o) { o = document.createElement('div'); o.id = 'studyOverlay'; o.className = 'study-overlay'; document.body.appendChild(o); }
    return o;
  }
  function closeOverlay() { const o = document.getElementById('studyOverlay'); if (o) { o.classList.remove('open'); o.innerHTML = ''; } document.body.classList.remove('study-open'); }
  function render() {
    const el = root(); if (!el) return;
    if (!S.loaded) { el.innerHTML = `<div class="cards-empty">Загрузка колод…</div>`; return; }
    if (S.missingTables) { closeOverlay(); renderSetup(el); return; }
    if (S.view === 'study') { renderDecks(el); const o = overlay(); renderStudy(o); o.classList.add('open'); document.body.classList.add('study-open'); return; }
    closeOverlay();
    if (S.view === 'sql') { renderSetup(el); return; }
    ({ decks: renderDecks, add: renderAdd, browse: renderBrowse, stats: renderStats })[S.view](el);
  }
  // Переход на внутренний экран с записью в историю: «Назад» вернёт прежний вид
  function pushView(view) {
    const prev = { view: S.view, deckId: S.deckId, tagFilter: S.tagFilter };
    if (prev.view === view) return;
    pushHistory(() => { S.view = prev.view; S.deckId = prev.deckId; S.tagFilter = prev.tagFilter; S.build = null; S.browseSelected.clear(); render(); });
  }

  function renderSetup(el) {
    el.innerHTML = `
      <div class="cards-head">${S.missingTables ? '' : '<button class="cards-back" onclick="goBack()">←</button>'}<div class="cards-title">Le Carte${S.missingTables ? '' : ' · SQL'}</div></div>
      <div class="cards-setup">
        <p>Для карточек нужны три таблицы в Supabase. Скопируйте SQL, вставьте в SQL Editor вашего проекта и нажмите Run, затем вернитесь сюда.</p>
        <pre class="cards-sql" id="cardsSql">${esc(window.DIZ_SETUP_SQL || SETUP_SQL)}</pre>
        <div class="cards-actions">
          <button class="cards-btn primary" onclick="Cards.copySql()">Скопировать SQL</button>
          <button class="cards-btn" onclick="Cards.reload()">Проверить снова</button>
        </div>
      </div>`;
  }

  function renderDecks(el) {
    const rows = [];
    const walk = (pid, depth) => childrenOf(pid).forEach(d => {
      const kids = childrenOf(d.id); const c = counts(cardsOfNotes(notesInDeck(d.id)));
      const collapsed = !!S.collapsed[d.id];
      rows.push(`
        <div class="deck-row" style="--depth:${depth}">
          <button class="deck-toggle ${kids.length ? '' : 'hidden'} ${collapsed ? 'closed' : ''}" onclick="Cards.toggleDeck('${d.id}')" title="Свернуть/развернуть"></button>
          <button class="deck-name" onclick="Cards.study('${d.id}')" title="Учить">${esc(d.name)}</button>
          <div class="deck-counts"><span class="c-new" data-l="новых">${c.new}</span><span class="c-learn" data-l="учить">${c.learn}</span><span class="c-due" data-l="повторить">${c.due}</span></div>
          <button class="deck-play" onclick="Cards.study('${d.id}')" title="Учить">▶</button>
          <div class="deck-menu">
            <button onclick="Cards.openAdd('${d.id}')" title="Добавить слова">＋</button>
            <button onclick="Cards.browse('${d.id}')" title="Карточки">☰</button>
            <button onclick="Cards.stats('${d.id}')" title="Статистика колоды">∿</button>
            <button onclick="Cards.newDeck('${d.id}')" title="Подколода">⤵</button>
            <button onclick="Cards.renameDeck('${d.id}')" title="Переименовать">✎</button>
            <button onclick="Cards.deleteDeck('${d.id}')" title="Удалить">✕</button>
          </div>
        </div>`);
      if (!collapsed) walk(d.id, depth + 1);
    });
    walk(null, 0);
    const total = counts(S.cards);
    const t = todayStats(null);
    el.innerHTML = `
      <div class="cards-head">
        <div class="cards-title">Le Carte</div>
        <div class="cards-head-counts" title="новые · заучиваемые · к повторению"><span class="c-new">${total.new}</span><span class="c-learn">${total.learn}</span><span class="c-due">${total.due}</span></div>
      </div>
      <div class="today-box">
        <div>
          <div class="stat-label">Сегодня</div>
          <div class="today-line"><b>${t.count}</b> повторений · <b>${t.learned}</b> новых${t.correct !== null ? ` · <b>${t.correct}%</b> верно` : ''} · <b>${t.timeMin}</b> мин · серия <b>${t.streak}</b> дн.</div>
        </div>
        <button class="cards-btn" onclick="Cards.stats(null)">Статистика →</button>
      </div>
      <div class="deck-list">${rows.join('') || '<div class="cards-empty">Колод пока нет</div>'}</div>
      <div class="cards-actions">
        <button class="cards-btn primary" onclick="Cards.newDeck(null)">＋ Новая колода</button>
        <label class="cards-inline">новых в день <input type="number" min="0" max="500" value="${newPerDay()}" onchange="Cards.setNewPerDay(this.value)"></label>
      </div>
      <div class="cards-legend"><span class="c-new">синие</span> новые · <span class="c-learn">красные</span> заучиваемые · <span class="c-due">зелёные</span> к повторению. Нажмите на название колоды, чтобы учить.</div>`;
  }

  // ── Статистика ───────────────────────────────────────────────────────────────
  const dayKey = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const startOfDay = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const scopeNotes = deckId => deckId ? notesInDeck(deckId) : S.notes;
  function scopeReviews(deckId) {
    if (!deckId) return S.reviews;
    const ids = new Set(scopeNotes(deckId).map(n => n.id));
    return S.reviews.filter(r => ids.has(r.note_id));
  }
  function streak(deckId) {
    const days = new Set(scopeReviews(deckId).map(r => dayKey(r.atMs)));
    let n = 0, d = startOfDay(Date.now());
    if (!days.has(dayKey(d))) d -= DAY; // сегодня ещё не занимались — серия считается до вчера
    while (days.has(dayKey(d))) { n++; d -= DAY; }
    return n;
  }
  function todayStats(deckId) {
    const t0 = startOfDay(Date.now());
    const rs = scopeReviews(deckId).filter(r => r.atMs >= t0);
    const again = rs.filter(r => r.rating === 1).length;
    const time = rs.reduce((s, r) => s + Math.min(r.took_ms || 0, 60000), 0);
    return { count: rs.length, again, correct: rs.length ? Math.round((1 - again / rs.length) * 100) : null,
      learned: rs.filter(r => r.prev_state === 'new').length, timeMin: Math.round(time / 6000) / 10, streak: streak(deckId) };
  }
  function cardStates(deckId) {
    const s = { new: 0, learning: 0, young: 0, mature: 0 };
    cardsOfNotes(scopeNotes(deckId)).forEach(c => { if (c.state === 'new') s.new++; else if (c.state !== 'review') s.learning++; else if ((c.interval_days || 0) < 21) s.young++; else s.mature++; });
    return s;
  }
  function forecastItems(deckId, daysN = 30) {
    const t0 = startOfDay(Date.now()); const b = new Array(daysN).fill(0);
    cardsOfNotes(scopeNotes(deckId)).filter(c => c.state !== 'new').forEach(c => { const d = Math.max(0, Math.floor((c.dueMs - t0) / DAY)); if (d < daysN) b[d]++; });
    return b.map((v, i) => ({ label: i === 0 ? 'сег.' : (i % 5 === 0 ? String(i) : ''), value: v, title: i === 0 ? `сегодня и просроченные: ${v}` : `через ${i} дн.: ${v}` }));
  }
  function reviewsPerDay(deckId, daysN = 30) {
    const t0 = startOfDay(Date.now()) - (daysN - 1) * DAY; const b = new Array(daysN).fill(0);
    scopeReviews(deckId).forEach(r => { const i = Math.floor((r.atMs - t0) / DAY); if (i >= 0 && i < daysN) b[i]++; });
    return b.map((v, i) => { const d = new Date(t0 + i * DAY); return { label: (daysN - 1 - i) % 5 === 0 ? `${d.getDate()}.${d.getMonth() + 1}` : '', value: v, title: `${dayKey(t0 + i * DAY)}: ${v}` }; });
  }
  function intervalItems(deckId) {
    const edges = [1, 3, 7, 14, 30, 90, 180, 365, Infinity], labels = ['1 д', '2–3', '4–7', '8–14', '15–30', '1–3 м', '3–6 м', '6–12 м', '> 1 г'];
    const b = new Array(labels.length).fill(0);
    cardsOfNotes(scopeNotes(deckId)).filter(c => c.state === 'review').forEach(c => { const i = edges.findIndex(e => (c.interval_days || 0) <= e); b[i === -1 ? b.length - 1 : i]++; });
    return b.map((v, i) => ({ label: labels[i], value: v }));
  }
  function easeItems(deckId) {
    const b = {};
    cardsOfNotes(scopeNotes(deckId)).filter(c => c.state === 'review').forEach(c => { const e = Math.round((c.ease || 2.5) * 10) * 10; b[e] = (b[e] || 0) + 1; });
    return Object.keys(b).map(Number).sort((a, b2) => a - b2).map(k => ({ label: k + '%', value: b[k] }));
  }
  function buttonStats(deckId) {
    const g = { learning: [0, 0, 0, 0], young: [0, 0, 0, 0], mature: [0, 0, 0, 0] };
    scopeReviews(deckId).forEach(r => { const k = r.prev_state === 'review' ? ((r.prev_interval || 0) >= 21 ? 'mature' : 'young') : 'learning'; g[k][Math.min(4, Math.max(1, r.rating || 3)) - 1]++; });
    return g;
  }
  // Столбчатая диаграмма без библиотек: SVG со строками
  function svgBars(items, opts = {}) {
    const { height = 150, color = 'var(--terracotta)' } = opts;
    const w = 600, h = height, padL = 36, padB = 22, padT = 10;
    const max = Math.max(1, ...items.map(i => i.value));
    const bw = (w - padL) / Math.max(1, items.length);
    const bars = items.map((it, i) => {
      const bh = (h - padB - padT) * it.value / max, x = padL + i * bw, y = h - padB - bh;
      return `<rect x="${(x + bw * 0.15).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${bh.toFixed(1)}" fill="${it.color || color}" rx="2"><title>${esc(it.title || `${it.label}: ${it.value}`)}</title></rect>`
        + (it.label ? `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 6}" text-anchor="middle" class="ax">${esc(it.label)}</text>` : '');
    }).join('');
    const seen = new Set();
    const grid = [0, 0.5, 1].map(f => {
      const y = h - padB - (h - padB - padT) * f, v = Math.round(max * f);
      const label = seen.has(v) ? '' : String(v); seen.add(v); // на маленьких значениях подписи не дублируем
      return `<line x1="${padL}" x2="${w}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="gl"/>${label ? `<text x="${padL - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="ax">${label}</text>` : ''}`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" class="chart" preserveAspectRatio="none">${grid}${bars}</svg>`;
  }
  // Тепловая карта активности за год, как в Anki и на GitHub
  function heatmapHtml(deckId) {
    const counts = {}; scopeReviews(deckId).forEach(r => { const k = dayKey(r.atMs); counts[k] = (counts[k] || 0) + 1; });
    const today = startOfDay(Date.now());
    let start = today - 364 * DAY; start -= ((new Date(start).getDay() + 6) % 7) * DAY; // с понедельника
    const cells = [], months = []; let lastMonth = -1;
    const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    for (let t = start, col = 0; t <= today; t += 7 * DAY, col++) {
      for (let r = 0; r < 7; r++) {
        const ms = t + r * DAY; if (ms > today) break;
        const k = dayKey(ms), c = counts[k] || 0, lvl = c === 0 ? 0 : c < 10 ? 1 : c < 30 ? 2 : c < 60 ? 3 : 4;
        cells.push(`<div class="hm-cell l${lvl}" style="grid-column:${col + 1};grid-row:${r + 1}" title="${k}: ${c}"></div>`);
      }
      const m = new Date(t).getMonth();
      if (m !== lastMonth) { months.push(`<span style="grid-column:${col + 1}">${MONTHS[m]}</span>`); lastMonth = m; }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0), activeDays = Object.keys(counts).length;
    return `<div class="hm-wrap"><div class="hm-months">${months.join('')}</div><div class="hm-grid">${cells.join('')}</div></div>
      <div class="cards-p">${total} повторений за год · ${activeDays} активных дней · текущая серия ${streak(deckId)} дн.</div>`;
  }
  function renderStats(el) {
    const deckId = S.statsDeckId; const title = deckId ? deckPath(deckId) : 'Все колоды';
    const t = todayStats(deckId), st = cardStates(deckId), rs = scopeReviews(deckId);
    const totalCards = st.new + st.learning + st.young + st.mature;
    const activeDays = new Set(rs.map(r => dayKey(r.atMs))).size;
    const btn = buttonStats(deckId);
    const btnRow = (name, arr) => {
      const s = arr.reduce((a, b) => a + b, 0); const p = s ? arr.map(v => Math.round(v / s * 100)) : [0, 0, 0, 0];
      const names = ['Снова', 'Трудно', 'Хорошо', 'Легко'], cls = ['again', 'hard', 'good', 'easy'];
      return `<div class="btn-row"><div class="btn-row-name">${name} <small>${s}</small></div><div class="btn-bar">${arr.map((v, i) => v ? `<span class="${cls[i]}" style="width:${p[i]}%" title="${names[i]}: ${v} (${p[i]}%)">${p[i] >= 10 ? p[i] + '%' : ''}</span>` : '').join('')}</div></div>`;
    };
    const ease = easeItems(deckId);
    el.innerHTML = `
      <div class="cards-head"><button class="cards-back" onclick="goBack()">←</button><div class="cards-title small">Статистика</div><div class="cards-head-deck">${esc(title)}</div></div>
      ${S.reviewsMissing ? `<div class="cards-note">История ответов не пишется: в Supabase нет таблицы <b>reviews</b>. Выполните SQL ещё раз, он добавит только недостающее. <button class="cards-btn" onclick="Cards.showSql()">Показать SQL</button></div>` : ''}
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Сегодня</div><div class="stat-big">${t.count}</div><div class="stat-sub">повторений · ${t.timeMin} мин${t.correct !== null ? ` · ${t.correct}% верно` : ''} · новых ${t.learned}</div></div>
        <div class="stat-card"><div class="stat-label">Серия</div><div class="stat-big">${t.streak}</div><div class="stat-sub">дней подряд · активных дней ${activeDays}</div></div>
        <div class="stat-card"><div class="stat-label">Карточки</div><div class="stat-big">${totalCards}</div><div class="stat-sub"><span class="c-new">${st.new} новых</span> · <span class="c-learn">${st.learning} учатся</span> · ${st.young} молодых · ${st.mature} зрелых</div></div>
        <div class="stat-card"><div class="stat-label">Всего повторений</div><div class="stat-big">${rs.length}</div><div class="stat-sub">${activeDays ? Math.round(rs.length / activeDays) : 0} в активный день</div></div>
      </div>
      <div class="stat-section"><div class="stat-title">Активность за год</div>${heatmapHtml(deckId)}</div>
      <div class="stat-section"><div class="stat-title">Повторения за 30 дней</div>${svgBars(reviewsPerDay(deckId))}</div>
      <div class="stat-section"><div class="stat-title">Прогноз на 30 дней: сколько карточек подойдёт к повторению</div>${svgBars(forecastItems(deckId), { color: 'var(--sage)' })}</div>
      <div class="stat-section"><div class="stat-title">Кнопки ответов</div>${btnRow('Заучивание', btn.learning)}${btnRow('Молодые', btn.young)}${btnRow('Зрелые', btn.mature)}<div class="cards-p">Молодые — выученные карточки с интервалом до 21 дня, зрелые — от 21 дня.</div></div>
      <div class="stat-section"><div class="stat-title">Интервалы выученных карточек</div>${svgBars(intervalItems(deckId), { color: '#3b64b4' })}</div>
      <div class="stat-section"><div class="stat-title">Лёгкость</div>${ease.length ? svgBars(ease, { color: 'var(--gold)' }) : '<div class="cards-empty">Пока нет выученных карточек</div>'}</div>`;
  }

  function cardFaces(card) {
    const n = noteById(card.note_id) || {};
    const mainRu = (n.translation || '').split(/[;,]/)[0].trim();
    const front = card.direction === 'it' ? n.word : (mainRu || n.word);
    const answer = card.direction === 'it' ? (n.translation || '—') : n.word;
    return { n, front, answer };
  }

  function renderStudy(el) {
    const deck = deckById(S.deckId); const c = counts(cardsOfNotes(notesInDeck(S.deckId)));
    const head = `
      <div class="study-topbar">
        <button class="cards-back" onclick="goBack()" title="К колодам">←</button>
        <div class="cards-head-counts"><span class="c-new">${c.new}</span><span class="c-learn">${c.learn}</span><span class="c-due">${c.due}</span></div>
        <div class="cards-head-deck">${esc(deck ? deck.name : '')}${S.tagFilter ? ` · #${esc(S.tagFilter)}` : ''}</div>
        <button class="cards-undo ${S.undo ? '' : 'disabled'}" onclick="Cards.undo()" title="Отменить ответ">↶</button>
      </div>`;
    if (!S.current) {
      el.innerHTML = head + `<div class="study-body"><div class="cards-done"><div class="cards-done-mark">✓</div><div>На сегодня в этой колоде всё.</div><button class="cards-btn" onclick="goBack()">К колодам</button></div></div>`;
      return;
    }
    const { n, front, answer } = cardFaces(S.current);
    const back = S.revealed ? `
        <div class="study-rule"></div>
        <div class="study-answer">${esc(answer)}</div>
        ${n.phonetic ? `<div class="study-ipa">${esc(n.phonetic)}</div>` : ''}
        ${n.example ? `<div class="study-box"><div class="study-box-label">Esempio</div><div class="study-box-text italic">«${esc(n.example)}»</div></div>` : ''}
        ${n.meaning ? `<div class="study-box"><div class="study-box-label">Significato</div><div class="study-box-text">${esc(n.meaning)}</div></div>` : ''}
        ${(n.tags || []).length ? `<div class="study-tags">${n.tags.map(t => `<span class="tag-chip">#${esc(t)}</span>`).join('')}</div>` : ''}` : '';
    const buttons = S.revealed ? `
      <div class="study-buttons">
        <button class="sb again" onclick="Cards.answer(1)"><small>${previewLabel(S.current, 1)}</small>Снова</button>
        <button class="sb hard" onclick="Cards.answer(2)"><small>${previewLabel(S.current, 2)}</small>Трудно</button>
        <button class="sb good" onclick="Cards.answer(3)"><small>${previewLabel(S.current, 3)}</small>Хорошо</button>
        <button class="sb easy" onclick="Cards.answer(4)"><small>${previewLabel(S.current, 4)}</small>Легко</button>
      </div>` : `<div class="study-buttons"><button class="sb show" onclick="Cards.reveal()">Показать ответ</button></div>`;
    el.innerHTML = head + `
      <div class="study-body">
        <div class="study-card ${S.current.direction}">
          <div class="study-dir">${S.current.direction === 'it' ? 'IT → RU' : 'RU → IT'}${S.current.state === 'new' ? ' · новая' : ''}</div>
          <div class="study-front">${esc(front)}</div>
          ${back}
        </div>
      </div>
      <div class="study-footer">${buttons}<div class="study-hint">Пробел — показать ответ, клавиши 1–4 — оценка, Esc — выйти</div></div>`;
  }

  function renderAdd(el) {
    const deck = deckById(S.deckId); const b = S.build;
    let body = '';
    if (!b) {
      body = `
        <p class="cards-p">Вставьте слова, по одному в строке. Перевод, транскрипцию, пример и значение приложение соберёт само: сначала из кэша словаря и Викисловаря, недостающее допишет модель одним запросом.</p>
        <p class="cards-p">Можно и готовыми строками CSV: <code>слово; перевод; пример; значение; теги</code> (разделитель <code>;</code>, <code>,</code> или табуляция). Пустые поля будут дозаполнены.</p>
        <textarea class="cards-textarea" id="cardsWords" placeholder="frigorifero&#10;caffettiera&#10;tovagliolo; салфетка&#10;…"></textarea>
        <input class="cards-input" id="cardsTags" placeholder="теги через запятую, например: cucina, A2" autocomplete="off">
        <div class="cards-actions">
          <button class="cards-btn primary" onclick="Cards.buildFromText()">Собрать карточки</button>
          <label class="cards-btn file">Импорт CSV<input type="file" accept=".csv,.tsv,.txt" onchange="Cards.importFile(this.files[0])" hidden></label>
        </div>`;
    } else if (b.phase === 'running') {
      body = `<div class="cards-progress"><div class="cards-progress-bar" style="width:${Math.round(b.done / b.total * 100)}%"></div></div>
        <div class="cards-p">${esc(b.status)}</div>`;
    } else {
      const rows = b.items.map((it, i) => `
        <div class="build-row ${it.include ? '' : 'off'}">
          <input type="checkbox" ${it.include ? 'checked' : ''} onchange="Cards.toggleItem(${i}, this.checked)">
          <div class="build-main">
            <div class="build-word">${esc(it.word)} <span class="build-ipa">${esc(it.phonetic)}</span> <span class="build-ru">${esc(it.translation) || '<em>нет перевода</em>'}</span></div>
            ${it.example ? `<div class="build-ex">«${esc(it.example)}»</div>` : ''}
            ${it.meaning ? `<div class="build-mean">${esc(it.meaning)}</div>` : ''}
            ${it.warn ? `<div class="build-warn">${esc(it.warn)}</div>` : ''}
          </div>
        </div>`).join('');
      body = `
        <div class="cards-p">Найдено ${b.items.length} слов${b.llmUsed ? `, модель дописала недостающее (${esc(b.llmUsed)})` : ''}. Снимите галочку с лишних и сохраните.</div>
        <div class="build-list">${rows}</div>
        <div class="cards-actions">
          <button class="cards-btn primary" onclick="Cards.saveBuild()">Сохранить ${b.items.filter(i => i.include).length} слов → ${b.items.filter(i => i.include).length * 2} карточек</button>
          <button class="cards-btn" onclick="Cards.resetBuild()">Назад к вводу</button>
        </div>`;
    }
    el.innerHTML = `
      <div class="cards-head"><button class="cards-back" onclick="goBack()">←</button><div class="cards-title small">Добавить слова</div><div class="cards-head-deck">${esc(deckPath(S.deckId))}</div></div>
      <div class="cards-panel">${body}</div>`;
  }

  function renderBrowse(el) {
    const notes = notesInDeck(S.deckId);
    const tags = [...new Set(notes.flatMap(n => n.tags || []))].sort();
    const filtered = S.tagFilter ? notes.filter(n => (n.tags || []).includes(S.tagFilter)) : notes;
    const rows = filtered.map(n => {
      const cs = S.cards.filter(c => c.note_id === n.id);
      const st = cs.map(c => c.state === 'new' ? 'н' : (c.state === 'review' ? 'п' : 'з')).join('');
      return `
        <div class="browse-row">
          <input type="checkbox" ${S.browseSelected.has(n.id) ? 'checked' : ''} onchange="Cards.selectNote('${n.id}', this.checked)">
          <button class="browse-word" onclick="Cards.editNote('${n.id}')">${esc(n.word)}</button>
          <div class="browse-ru">${esc(n.translation)}</div>
          <div class="browse-tags">${(n.tags || []).map(t => `<span class="tag-chip" onclick="Cards.setTagFilter('${esc(t)}')">#${esc(t)}</span>`).join('')}</div>
          <div class="browse-state" title="состояние карточек: н новая, з заучивается, п повторение">${st}</div>
        </div>`;
    }).join('');
    el.innerHTML = `
      <div class="cards-head"><button class="cards-back" onclick="goBack()">←</button><div class="cards-title small">Карточки</div><div class="cards-head-deck">${esc(deckPath(S.deckId))} · ${filtered.length}</div></div>
      <div class="cards-panel">
        <div class="cards-actions wrap">
          <select class="cards-select" onchange="Cards.setTagFilter(this.value)">
            <option value="">все теги</option>${tags.map(t => `<option value="${esc(t)}" ${t === S.tagFilter ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
          </select>
          <button class="cards-btn" onclick="Cards.study('${S.deckId}')">Учить ${S.tagFilter ? '#' + esc(S.tagFilter) : 'колоду'}</button>
          <button class="cards-btn" onclick="Cards.selectAll(${S.browseSelected.size === filtered.length && filtered.length ? 'false' : 'true'})">${S.browseSelected.size === filtered.length && filtered.length ? 'Снять выделение' : 'Выделить все'}</button>
          <button class="cards-btn" onclick="Cards.tagSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Добавить тег</button>
          <button class="cards-btn" onclick="Cards.untagSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Убрать тег</button>
          <button class="cards-btn" onclick="Cards.moveSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Переместить</button>
          <button class="cards-btn danger" onclick="Cards.deleteSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Удалить</button>
        </div>
        <div class="browse-list">${rows || '<div class="cards-empty">В колоде пока нет слов</div>'}</div>
      </div>
      <div class="cards-modal" id="cardsModal" style="display:none"></div>`;
  }

  // ── Действия: колоды ─────────────────────────────────────────────────────────
  async function newDeck(parentId) {
    const name = prompt(parentId ? `Название подколоды в «${deckById(parentId).name}»:` : 'Название колоды:');
    if (!name || !name.trim()) return;
    try { const [d] = await sb('decks', { method: 'POST', body: { name: name.trim(), parent_id: parentId || null } }); S.decks.push(d); render(); }
    catch (e) { showToast('⚠ ' + e.message); }
  }
  async function renameDeck(id) {
    const d = deckById(id); const name = prompt('Новое название:', d.name); if (!name || !name.trim() || name.trim() === d.name) return;
    try { await sb(`decks?id=eq.${id}`, { method: 'PATCH', body: { name: name.trim() } }); d.name = name.trim(); render(); } catch (e) { showToast('⚠ ' + e.message); }
  }
  async function deleteDeck(id) {
    const d = deckById(id); const n = notesInDeck(id).length;
    if (!confirm(`Удалить колоду «${d.name}»${n ? ` вместе с ${n} словами и подколодами` : ''}?`)) return;
    try {
      await sb(`decks?id=eq.${id}`, { method: 'DELETE' });
      const gone = new Set(subtreeIds(id)); const goneNotes = new Set(S.notes.filter(x => gone.has(x.deck_id)).map(x => x.id));
      S.decks = S.decks.filter(x => !gone.has(x.id)); S.notes = S.notes.filter(x => !goneNotes.has(x.id)); S.cards = S.cards.filter(x => !goneNotes.has(x.note_id));
      render();
    } catch (e) { showToast('⚠ ' + e.message); }
  }

  // ── Действия: учёба ──────────────────────────────────────────────────────────
  function study(deckId, tag) {
    pushView('study');
    S.deckId = deckId; S.view = 'study'; S.undo = null;
    if (tag !== undefined) S.tagFilter = tag;
    buildQueue(); nextCard(); render();
  }
  function reveal() { if (S.current && !S.revealed) { S.revealed = true; render(); } }
  async function answer(rating) {
    if (!S.current || !S.revealed) return;
    const before = { ...S.current }; const after = schedule(S.current, rating);
    Object.assign(S.current, after);
    // Запись в историю ответов — из неё строится статистика
    const note = noteById(S.current.note_id);
    const rev = { card_id: S.current.id, note_id: S.current.note_id, deck_id: note ? note.deck_id : null, rating,
      prev_state: before.state, new_state: after.state, prev_interval: before.interval_days || 0, interval_days: after.interval_days || 0,
      took_ms: Math.min(Math.max(0, Date.now() - (S.shownAt || Date.now())), 60000) };
    const local = { ...rev, atMs: Date.now(), reviewed_at: new Date().toISOString() };
    S.reviews.push(local);
    if (!S.reviewsMissing) sb('reviews', { method: 'POST', body: rev }).then(rows => { if (rows && rows[0]) local.id = rows[0].id; }).catch(e => { if (isMissingTable(e)) S.reviewsMissing = true; });
    S.undo = { before, card: S.current, review: local };
    const payload = { state: after.state, step: after.step, due: after.due, interval_days: after.interval_days, ease: after.ease, reps: after.reps, lapses: after.lapses };
    sb(`cards?id=eq.${S.current.id}`, { method: 'PATCH', body: payload }).catch(e => showToast('⚠ Не сохранилось: ' + e.message));
    nextCard(); render();
  }
  async function undo() {
    if (!S.undo) return;
    const { before, card, review } = S.undo; S.undo = null;
    if (review) { S.reviews = S.reviews.filter(r => r !== review); if (review.id) sb(`reviews?id=eq.${review.id}`, { method: 'DELETE' }).catch(() => {}); }
    Object.assign(card, before);
    sb(`cards?id=eq.${card.id}`, { method: 'PATCH', body: { state: before.state, step: before.step, due: before.due, interval_days: before.interval_days, ease: before.ease, reps: before.reps, lapses: before.lapses } }).catch(() => {});
    if (S.current) S.queue.unshift(S.current);
    S.current = card; S.revealed = false; render();
  }

  // ── Действия: добавление слов ────────────────────────────────────────────────
  function parseLines(text) {
    const items = [];
    text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
      const delim = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : (line.split(',').length > 1 ? ',' : null));
      const parts = delim ? line.split(delim).map(p => p.trim().replace(/^"|"$/g, '')) : [line];
      if (!parts[0] || /^(word|parola|слово)$/i.test(parts[0])) return; // заголовок CSV
      items.push({ word: parts[0], translation: parts[1] || '', example: parts[2] || '', meaning: parts[3] || '', tags: parts[4] ? parts[4].split(/[,\s]+/).filter(Boolean) : [] });
    });
    return items;
  }

  async function lookupOne(it) {
    const lw = it.word.toLowerCase();
    const d = { ...it, phonetic: '', pos: '', glosses: [], include: true, warn: '' };
    const [cached, fd, ru] = await Promise.all([
      sbGet('dictionary', lw).catch(() => null), fetchFreeDictionary(lw), fetchRuWiktionary(lw).catch(() => null)
    ]);
    if (cached) {
      d.word = cached.word || d.word; d.pos = cached.partOfSpeech || '';
      d.translation = d.translation || (cached.russian && cached.russian.main) || '';
      d.phonetic = cached.phonetic || '';
      const m0 = (cached.meanings || [])[0] || {};
      d.example = d.example || m0.example || cached.example || '';
      d.meaning = d.meaning || m0.definition || cached.definition || '';
    }
    if (fd) {
      const m = mapFreeDictionary(fd, { light: true });
      if (m && m.lemma) { d.warn = `форма слова ${m.lemma}, карточка будет на неё`; d.word = m.lemma; return lookupOne({ ...it, word: m.lemma, _redirected: true }).then(x => ({ ...x, warn: d.warn })); }
      if (m && m.lemmas) d.warn = `форма нескольких слов: ${m.lemmas.map(l => l.lemma).join(', ')}`;
      else if (m) { d.phonetic = d.phonetic || m.phonetic || ''; d.pos = d.pos || m.partOfSpeech || ''; d.glosses = (m.senses || []).map(s => s.gloss).filter(Boolean).slice(0, 3); d.example = d.example || (m.senses || []).map(s => s.example).find(Boolean) || ''; }
    }
    if (ru && ru.main) d.translation = d.translation || ru.main;
    if (!cached && !fd) d.warn = d.warn || 'слова нет в словарях, всё допишет модель';
    return d;
  }

  async function completeWithLlm(items) {
    const need = items.filter(i => !i.translation || !i.phonetic || !i.example || !i.meaning);
    if (!need.length) return null;
    const BATCH = 15; let used = null;
    for (let i = 0; i < need.length; i += BATCH) {
      const chunk = need.slice(i, i + BATCH);
      S.build.status = `Модель дописывает недостающее: ${Math.min(i + BATCH, need.length)} из ${need.length}…`; render();
      const list = chunk.map(x => ({ word: x.word, partOfSpeech: x.pos || undefined, englishGlosses: x.glosses.length ? x.glosses : undefined,
        missing: ['translation', 'phonetic', 'example', 'meaning'].filter(f => !x[f]) }));
      const prompt = `You are an expert Italian lexicographer. For each Italian word below, provide ONLY the fields listed in "missing".
Fields: "translation" = primary Russian translation (1-3 words, alternatives after ";" allowed), "phonetic" = IPA with ˈ before the stressed syllable, "example" = one natural Italian sentence using the word, "meaning" = short definition in Italian (1 sentence).
Return ONLY a JSON array of objects {"word": "...", ...fields}, in the same order, no markdown.
${JSON.stringify(list)}`;
      try {
        const res = await llmJson(prompt, 'dict');
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : []);
        arr.forEach(r => { const t = chunk.find(x => x.word.toLowerCase() === String(r.word || '').toLowerCase()) || chunk[arr.indexOf(r)]; if (!t) return;
          ['translation', 'phonetic', 'example', 'meaning'].forEach(f => { if (!t[f] && r[f]) t[f] = String(r[f]); }); });
        used = _lastDictLlm;
      } catch (e) { showToast('⚠ Модель не ответила: ' + e.message); }
    }
    return used;
  }

  async function runBuild(items, tags) {
    S.build = { phase: 'running', total: items.length, done: 0, status: 'Ищем в словарях…', items: [], llmUsed: null }; render();
    const out = new Array(items.length); let idx = 0;
    const worker = async () => { while (idx < items.length) { const i = idx++; try { out[i] = await lookupOne(items[i]); } catch (e) { out[i] = { ...items[i], phonetic: '', pos: '', glosses: [], include: true, warn: 'ошибка поиска: ' + e.message }; } S.build.done++; S.build.status = `Ищем в словарях: ${S.build.done} из ${items.length}…`; render(); } };
    await Promise.all([worker(), worker(), worker()]);
    // дубли (два одинаковых слова или уже есть в колоде)
    const existing = new Set(notesInDeck(S.deckId).map(n => n.word.toLowerCase())); const seen = new Set();
    out.forEach(it => { const k = it.word.toLowerCase(); if (existing.has(k)) { it.include = false; it.warn = 'уже есть в колоде'; } else if (seen.has(k)) { it.include = false; it.warn = 'дубль в списке'; } seen.add(k); it.tags = [...new Set([...(it.tags || []), ...tags])]; });
    S.build.items = out;
    S.build.llmUsed = await completeWithLlm(out.filter(i => i.include));
    S.build.phase = 'preview'; render();
  }
  function buildFromText() {
    const text = $('cardsWords').value; const tags = ($('cardsTags').value || '').split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
    const items = parseLines(text); if (!items.length) { showToast('Введите хотя бы одно слово'); return; }
    if (items.length > 200) { showToast('За раз не больше 200 слов'); return; }
    runBuild(items, tags);
  }
  function importFile(file) {
    if (!file) return; const r = new FileReader();
    r.onload = () => { $('cardsWords').value = String(r.result || ''); showToast(`Загружено строк: ${parseLines($('cardsWords').value).length}`); };
    r.readAsText(file);
  }
  async function saveBuild() {
    const items = S.build.items.filter(i => i.include); if (!items.length) return;
    try {
      const notes = await sb('notes', { method: 'POST', body: items.map(i => ({ deck_id: S.deckId, word: i.word, translation: i.translation || '', phonetic: i.phonetic || '', example: i.example || '', meaning: i.meaning || '', pos: i.pos || '', tags: i.tags || [] })) });
      const cards = await sb('cards', { method: 'POST', body: notes.flatMap(n => [{ note_id: n.id, direction: 'it' }, { note_id: n.id, direction: 'ru' }]) });
      S.notes.push(...notes); S.cards.push(...cards.map(c => ({ ...c, dueMs: Date.parse(c.due) || 0 })));
      showToast(`✓ Добавлено ${notes.length} слов, ${cards.length} карточек`);
      S.build = null; S.view = 'decks'; render();
    } catch (e) { showToast('⚠ ' + e.message); }
  }

  // ── Действия: обзор и теги ───────────────────────────────────────────────────
  const currentNotes = () => { const notes = notesInDeck(S.deckId); return S.tagFilter ? notes.filter(n => (n.tags || []).includes(S.tagFilter)) : notes; };
  async function patchNotes(ids, fn) {
    for (const id of ids) { const n = noteById(id); if (!n) continue; const body = fn(n); if (!body) continue; await sb(`notes?id=eq.${id}`, { method: 'PATCH', body }); Object.assign(n, body); }
  }
  async function tagSelected() {
    const tag = prompt('Какой тег добавить выделенным?'); if (!tag || !tag.trim()) return; const t = tag.trim().replace(/^#/, '');
    try { await patchNotes([...S.browseSelected], n => ({ tags: [...new Set([...(n.tags || []), t])] })); render(); } catch (e) { showToast('⚠ ' + e.message); }
  }
  async function untagSelected() {
    const tag = prompt('Какой тег убрать у выделенных?'); if (!tag || !tag.trim()) return; const t = tag.trim().replace(/^#/, '');
    try { await patchNotes([...S.browseSelected], n => ({ tags: (n.tags || []).filter(x => x !== t) })); render(); } catch (e) { showToast('⚠ ' + e.message); }
  }
  async function moveSelected() {
    const options = S.decks.map(d => `${deckPath(d.id)}`); const choice = prompt('В какую колоду переместить? Введите название:\n' + options.join('\n'));
    if (!choice) return; const target = S.decks.find(d => deckPath(d.id).toLowerCase() === choice.trim().toLowerCase() || d.name.toLowerCase() === choice.trim().toLowerCase());
    if (!target) { showToast('Колода не найдена'); return; }
    try { await patchNotes([...S.browseSelected], () => ({ deck_id: target.id })); S.browseSelected.clear(); render(); } catch (e) { showToast('⚠ ' + e.message); }
  }
  async function deleteSelected() {
    const ids = [...S.browseSelected]; if (!ids.length || !confirm(`Удалить ${ids.length} слов вместе с карточками?`)) return;
    try {
      await sb(`notes?id=in.(${ids.join(',')})`, { method: 'DELETE' });
      const gone = new Set(ids); S.notes = S.notes.filter(n => !gone.has(n.id)); S.cards = S.cards.filter(c => !gone.has(c.note_id)); S.browseSelected.clear(); render();
    } catch (e) { showToast('⚠ ' + e.message); }
  }
  function editNote(id) {
    const n = noteById(id); if (!n) return; const m = $('cardsModal'); if (!m) return;
    m.style.display = 'flex';
    m.innerHTML = `
      <div class="cards-modal-box">
        <div class="cards-title small">Редактировать</div>
        ${['word:Слово', 'translation:Перевод', 'phonetic:Транскрипция', 'example:Пример', 'meaning:Значение'].map(f => { const [k, l] = f.split(':'); return `<label class="cards-field"><span>${l}</span>${k === 'example' || k === 'meaning' ? `<textarea id="edit_${k}">${esc(n[k])}</textarea>` : `<input id="edit_${k}" value="${esc(n[k])}">`}</label>`; }).join('')}
        <label class="cards-field"><span>Теги</span><input id="edit_tags" value="${esc((n.tags || []).join(', '))}"></label>
        <div class="cards-actions"><button class="cards-btn primary" onclick="Cards.saveNote('${id}')">Сохранить</button><button class="cards-btn" onclick="Cards.closeModal()">Отмена</button></div>
      </div>`;
  }
  async function saveNote(id) {
    const body = { word: $('edit_word').value.trim(), translation: $('edit_translation').value.trim(), phonetic: $('edit_phonetic').value.trim(), example: $('edit_example').value.trim(), meaning: $('edit_meaning').value.trim(), tags: $('edit_tags').value.split(/[,\s]+/).map(t => t.trim().replace(/^#/, '')).filter(Boolean) };
    if (!body.word) return;
    try { await sb(`notes?id=eq.${id}`, { method: 'PATCH', body }); Object.assign(noteById(id), body); closeModal(); render(); } catch (e) { showToast('⚠ ' + e.message); }
  }
  const closeModal = () => { const m = $('cardsModal'); if (m) m.style.display = 'none'; };

  // ── Добавление слов из словаря и избранного ─────────────────────────────────
  // Словарная статья → заметка колоды: перевод, транскрипция, первый пример и первое значение
  function entryToNote(e) {
    const m0 = (e.meanings || [])[0] || {};
    const ru = e.russian || {};
    return {
      word: e.word || '', pos: e.partOfSpeech || '',
      translation: [ru.main, ru.alternatives].filter(Boolean).join('; '),
      phonetic: e.phonetic || '',
      example: m0.example || e.example || '',
      meaning: m0.definition || e.definition || ''
    };
  }
  let _pendingNotes = null;
  async function addEntries(entries) {
    if (window.Auth && !Auth.require('Войдите, чтобы добавлять слова в колоды')) return;
    const notes = (entries || []).map(entryToNote).filter(n => n.word);
    if (!notes.length) { showToast('Нечего добавлять'); return; }
    if (!S.loaded) await loadAll();
    if (S.missingTables) { showToast('⚠ Сначала создайте таблицы карточек: откройте раздел Le Carte'); return; }
    _pendingNotes = notes;
    renderPicker();
  }
  function picker() {
    let m = document.getElementById('deckPickerModal');
    if (!m) { m = document.createElement('div'); m.id = 'deckPickerModal'; m.className = 'cards-modal'; m.addEventListener('click', e => { if (e.target === m) closePicker(); }); document.body.appendChild(m); }
    return m;
  }
  function renderPicker() {
    const m = picker(); const words = _pendingNotes.map(n => n.word);
    const rows = [];
    const walk = (pid, depth) => childrenOf(pid).forEach(d => { rows.push(`<button class="deck-pick" style="--depth:${depth}" onclick="Cards.pickDeck('${d.id}')">${esc(d.name)}<span>${notesInDeck(d.id).length}</span></button>`); walk(d.id, depth + 1); });
    walk(null, 0);
    m.innerHTML = `
      <div class="cards-modal-box">
        <div class="cards-title small">В какую колоду?</div>
        <div class="cards-p">${words.length === 1 ? esc(words[0]) : `${words.length} слов: ${esc(words.slice(0, 6).join(', '))}${words.length > 6 ? '…' : ''}`}</div>
        <input class="cards-input" id="deckPickTags" placeholder="теги через запятую (необязательно)" autocomplete="off">
        <div class="deck-pick-list">${rows.join('') || '<div class="cards-empty">Колод пока нет</div>'}</div>
        <div class="cards-actions">
          <button class="cards-btn" onclick="Cards.pickNewDeck()">＋ Новая колода</button>
          <button class="cards-btn" onclick="Cards.closePicker()">Отмена</button>
        </div>
      </div>`;
    m.style.display = 'flex';
  }
  function closePicker() { const m = document.getElementById('deckPickerModal'); if (m) m.style.display = 'none'; _pendingNotes = null; }
  async function pickDeck(deckId) {
    if (!_pendingNotes) return;
    const tags = (($('deckPickTags') || {}).value || '').split(/[,\s]+/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);
    const existing = new Set(notesInDeck(deckId).map(n => n.word.toLowerCase()));
    const fresh = _pendingNotes.filter(n => !existing.has(n.word.toLowerCase()));
    const skipped = _pendingNotes.length - fresh.length;
    if (!fresh.length) { showToast('Эти слова уже есть в колоде'); closePicker(); return; }
    try {
      const notes = await sb('notes', { method: 'POST', body: fresh.map(n => ({ deck_id: deckId, ...n, tags })) });
      const cards = await sb('cards', { method: 'POST', body: notes.flatMap(n => [{ note_id: n.id, direction: 'it' }, { note_id: n.id, direction: 'ru' }]) });
      S.notes.push(...notes); S.cards.push(...cards.map(c => ({ ...c, dueMs: Date.parse(c.due) || 0 })));
      showToast(`✓ ${notes.length} слов → ${deckPath(deckId)}${skipped ? ` (${skipped} уже были)` : ''}`);
      closePicker();
      if (_currentState === 'cards') render();
    } catch (e) { showToast('⚠ ' + e.message); }
  }
  async function pickNewDeck() {
    const name = prompt('Название новой колоды:'); if (!name || !name.trim()) return;
    try { const [d] = await sb('decks', { method: 'POST', body: { name: name.trim(), parent_id: null } }); S.decks.push(d); await pickDeck(d.id); }
    catch (e) { showToast('⚠ ' + e.message); }
  }

  // ── Клавиатура в режиме учёбы ────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (_currentState !== 'cards' || S.view !== 'study' || !S.current) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!S.revealed) reveal(); }
    else if (/^[1-4]$/.test(e.key) && S.revealed) answer(parseInt(e.key));
    else if (e.key === 'z' || e.key === 'Z') undo();
    else if (e.key === 'Escape') goBack();
  });

  // ── Публичный интерфейс ──────────────────────────────────────────────────────
  window.Cards = {
    async open() {
      S.view = 'decks'; S.build = null; S.browseSelected.clear(); closeOverlay();
      if (window.Auth && !Auth.user()) {
        // Колоды личные: без входа показываем приглашение вместо списка
        const el = root(); if (el) el.innerHTML = `<div class="cards-head"><div class="cards-title">Le Carte</div></div>
          <div class="cards-empty">Колоды и карточки хранятся в вашем аккаунте.<br><br><button class="cards-btn primary" onclick="Auth.require('Войдите, чтобы открыть колоды')">Войти или создать аккаунт</button></div>`;
        return;
      }
      render(); if (!S.loaded) { await loadAll(); render(); }
    },
    async reload() { S.loaded = false; if (_currentState === 'cards') render(); await loadAll(); if (_currentState === 'cards') render(); },
    copySql() { const t = window.DIZ_SETUP_SQL || SETUP_SQL; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => showToast('✓ SQL скопирован'), () => { const el = $('cardsSql'); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); showToast('Выделено — скопируйте вручную'); }); },
    toggleDeck(id) { S.collapsed[id] = !S.collapsed[id]; render(); },
    newDeck, renameDeck, deleteDeck,
    setNewPerDay(v) { try { localStorage.setItem(NEW_PER_DAY_KEY, String(Math.max(0, parseInt(v) || 0))); } catch (e) {} render(); },
    study(id) { study(id, S.view === 'browse' ? S.tagFilter : ''); },
    reveal, answer, undo,
    openAdd(id) { pushView('add'); S.deckId = id; S.view = 'add'; S.build = null; render(); },
    buildFromText, importFile, saveBuild,
    toggleItem(i, v) { S.build.items[i].include = v; render(); },
    resetBuild() { S.build = null; render(); },
    browse(id) { pushView('browse'); S.deckId = id; S.view = 'browse'; S.tagFilter = ''; S.browseSelected.clear(); render(); },
    stats(id) { pushView('stats'); S.statsDeckId = id || null; S.view = 'stats'; render(); },
    showSql() { pushView('sql'); S.view = 'sql'; render(); },
    setTagFilter(t) { S.tagFilter = t; S.browseSelected.clear(); render(); },
    selectNote(id, v) { if (v) S.browseSelected.add(id); else S.browseSelected.delete(id); render(); },
    selectAll(v) { S.browseSelected.clear(); if (v) currentNotes().forEach(n => S.browseSelected.add(n.id)); render(); },
    tagSelected, untagSelected, moveSelected, deleteSelected, editNote, saveNote, closeModal,
    addEntries, pickDeck, pickNewDeck, closePicker,
    _state: S, _schedule: schedule, _parseLines: parseLines, _fmt: fmtInterval
  };
})();
