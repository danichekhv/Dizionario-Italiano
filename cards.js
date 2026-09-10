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
    view: 'decks', deckId: null, tagFilter: '', folder: null,
    queue: [], current: null, revealed: false, undo: null,
    loaded: false, missingTables: false,
    build: null, browseSelected: new Set(), browseQuery: '',
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
    // Колоды и слова уже есть — показываем их, не дожидаясь истории ответов: она нужна только
    // для серии и статистики, а растёт с каждым повторением и грузится дольше всего
    if (_currentState === 'cards' && S.view !== 'study') render();
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
  const pluralRu = (n, one, few, many) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? one : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? few : many; };

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
      let scope = notesInDeck(S.deckId); if (S.tagFilter) scope = scope.filter(n => (n.tags || []).includes(S.tagFilter));
      const soon = cardsOfNotes(scope).filter(c => (c.state === 'learning' || c.state === 'relearning') && c.dueMs <= now + LEARN_AHEAD_MIN * MIN).sort((a, b) => a.dueMs - b.dueMs);
      if (soon.length) S.queue = soon;
    }
    S.current = S.queue.shift() || null; S.revealed = false; S.check = null; S.shownAt = Date.now();
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
  // Переход на внутренний экран с записью в историю: «Назад» вернёт прежний вид.
  // Уровень колод (S.folder) — тоже экран: спуск в подколоду и подъём обратно идут через историю
  function pushView(view, folder = S.folder) {
    const prev = { view: S.view, deckId: S.deckId, tagFilter: S.tagFilter, folder: S.folder };
    if (prev.view === view && prev.folder === folder) return;
    pushHistory(() => { S.view = prev.view; S.deckId = prev.deckId; S.tagFilter = prev.tagFilter; S.folder = prev.folder; S.build = null; S.browseSelected.clear(); render(); });
  }

  // SQL показываем только владельцу сайта (см. ADMIN_EMAILS в auth.js); остальным — просьба подождать
  const isAdmin = () => !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  function renderSetup(el) {
    const body = isAdmin() ? `
        <p>Для карточек нужны три таблицы в Supabase. Скопируйте SQL, вставьте в SQL Editor вашего проекта и нажмите Run, затем вернитесь сюда.</p>
        <pre class="cards-sql" id="cardsSql">${esc(window.DIZ_SETUP_SQL || SETUP_SQL)}</pre>
        <div class="cards-actions">
          <button class="cards-btn primary" onclick="Cards.copySql()">Скопировать SQL</button>
          <button class="cards-btn" onclick="Cards.reload()">Проверить снова</button>
        </div>` : `
        <p>Карточки ещё не настроены: в базе нет нужных таблиц. Обратитесь к владельцу сайта и попробуйте позже.</p>
        <div class="cards-actions"><button class="cards-btn" onclick="Cards.reload()">Проверить снова</button></div>`;
    el.innerHTML = `
      <div class="cards-head"><div class="cards-title">Le Carte${S.missingTables ? '' : ' · SQL'}</div></div>
      <div class="cards-setup">${body}
      </div>`;
  }

  // ── Экран колод: плитки, уровень за уровнем ─────────────────────────────────
  // S.folder — колода, внутри которой стоим (null — корень). Плитка ведёт внутрь колоды, где та же
  // сетка: сводка по её словам, действия с ней и плитки подколод. ▶ на плитке учит колоду сразу.
  const learnedPct = cards => cards.length ? Math.round(cards.filter(c => c.state === 'review').length / cards.length * 100) : 0;
  function crumbsHtml(id) {
    const chain = []; let d = id ? deckById(id) : null;
    while (d) { chain.unshift(d); d = d.parent_id ? deckById(d.parent_id) : null; }
    if (!chain.length) return ''; // в корне путь показывать нечего: заголовок и так «Le Carte»
    const parts = [`<button onclick="Cards.openDeck(null)">Le Carte</button>`,
      ...chain.map((x, i) => i === chain.length - 1 ? `<span class="cur">${esc(x.name)}</span>` : `<button onclick="Cards.openDeck('${x.id}')">${esc(x.name)}</button>`)];
    return `<div class="crumbs">${parts.join('<span class="sep">›</span>')}</div>`;
  }
  function deckTile(d) {
    const kids = childrenOf(d.id).length, notes = notesInDeck(d.id), cards = cardsOfNotes(notes), c = counts(cards), pct = learnedPct(cards);
    return `
      <div class="tile link deck-tile" role="button" tabindex="0" onclick="Cards.openDeck('${d.id}')" onkeydown="if(event.key==='Enter')Cards.openDeck('${d.id}')">
        <div class="tile-head"><div class="tile-icon">${svgIcon(kids ? 'folder' : 'deck')}</div>
          <button class="deck-play" onclick="event.stopPropagation();Cards.study('${d.id}')" title="Учить">${svgIcon('play')}</button></div>
        <div class="tile-title">${esc(d.name)}</div>
        <div class="tile-sub">${notes.length} ${pluralRu(notes.length, 'слово', 'слова', 'слов')}${kids ? ` · ${kids} ${pluralRu(kids, 'подколода', 'подколоды', 'подколод')}` : ''}</div>
        <div class="tile-foot deck-counts" title="новые · заучиваемые · к повторению"><span class="c-new">${c.new}</span><span class="c-learn">${c.learn}</span><span class="c-due">${c.due}</span></div>
        <div class="tile-bar" title="выучено ${pct}%"><i style="width:${pct}%"></i></div>
      </div>`;
  }
  function renderDecks(el) {
    const id = S.folder || null, d = id ? deckById(id) : null;
    if (id && !d) { S.folder = null; renderDecks(el); return; } // колоду удалили или её нет в этом аккаунте
    const kids = childrenOf(id);
    const notes = id ? notesInDeck(id) : S.notes, cards = id ? cardsOfNotes(notes) : S.cards;
    const c = counts(cards), t = todayStats(id), pct = learnedPct(cards);
    const fresh = Math.min(c.new, newPerDay()), repeat = c.learn + c.due, due = repeat + fresh;
    const parts = [repeat ? `${repeat} к повторению` : '', fresh ? `${fresh} новых` : ''].filter(Boolean).join(' · ');
    const head = (icon, label) => `<div class="tile-head"><div class="tile-icon">${svgIcon(icon)}</div><span class="tile-label">${label}</span></div>`;
    const actions = id ? `
        <button class="cards-btn" onclick="Cards.openAdd('${id}')">${svgIcon('plus')} Добавить слова</button>
        <button class="cards-btn" onclick="Cards.browse('${id}')">${svgIcon('list')} Карточки</button>
        <button class="cards-btn" onclick="Cards.stats('${id}')">${svgIcon('chart')} Статистика</button>
        <button class="cards-btn" onclick="Cards.shareDeck('${id}')">${svgIcon('link')} Поделиться</button>
        <button class="cards-btn" onclick="Cards.renameDeck('${id}')">${svgIcon('edit')} Переименовать</button>
        <button class="cards-btn danger" onclick="Cards.deleteDeck('${id}')">${svgIcon('trash')} Удалить</button>` : `
        <button class="cards-btn" onclick="Cards.stats(null)">${svgIcon('chart')} Статистика</button>
        <label class="cards-inline">новых в день <input type="number" min="0" max="500" value="${newPerDay()}" onchange="Cards.setNewPerDay(this.value)"></label>`;
    el.innerHTML = `
      ${crumbsHtml(id)}
      <div class="cards-head">
        <div class="cards-title">${d ? esc(d.name) : 'Le Carte'}</div>
        <div class="cards-head-counts" title="новые · заучиваемые · к повторению"><span class="c-new">${c.new}</span><span class="c-learn">${c.learn}</span><span class="c-due">${c.due}</span></div>
      </div>
      <div class="bento">
        <div class="tile w4 h2">
          ${head('layers', 'Сегодня')}
          <div class="tile-big">${due}</div>
          <div class="tile-sub">${due ? parts : (notes.length ? 'На сегодня всё повторено' : 'Слов пока нет — добавьте из статьи или списком')}</div>
          <div class="tile-foot">${due ? `<button class="cards-btn primary" onclick="${id ? `Cards.study('${id}')` : 'Cards.studyAll()'}">Учить · ${due}</button>` : ''}${notes.length ? `<button class="cards-btn" onclick="${id ? `Cards.study('${id}')` : 'Cards.studyAll()'}" title="Учить, даже если на сегодня ничего не подошло">Учить всё равно</button>` : ''}</div>
        </div>
        <div class="tile">
          ${head('trending-up', 'Серия')}
          <div class="tile-big">${t.streak}</div>
          <div class="tile-sub">${pluralRu(t.streak, 'день', 'дня', 'дней')} · сегодня ${t.count} ${pluralRu(t.count, 'повторение', 'повторения', 'повторений')}${t.correct !== null ? `, ${t.correct}% верно` : ''}</div>
        </div>
        <div class="tile">
          ${head('book', 'Слова')}
          <div class="tile-big">${notes.length}</div>
          <div class="tile-sub">выучено ${pct}%</div>
          <div class="tile-bar"><i style="width:${pct}%"></i></div>
        </div>
      </div>
      <div class="cards-actions">${actions}</div>
      <div class="bento-label">${id ? 'Подколоды' : 'Колоды'}</div>
      <div class="bento">
        ${kids.map(deckTile).join('')}
        <button class="tile dashed link" onclick="Cards.newDeck(${id ? `'${id}'` : 'null'})">${svgIcon('plus')} ${id ? 'Подколода' : 'Новая колода'}</button>
      </div>
      <div class="cards-legend"><span class="c-new">синие</span> новые · <span class="c-learn">красные</span> заучиваемые · <span class="c-due">зелёные</span> к повторению. Плитка открывает колоду, ▶ сразу учит.</div>`;
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
  // Календарь активности по месяцам: листается стрелками, в клетке число и количество повторений
  function calendarHtml(deckId) {
    const counts = {}; scopeReviews(deckId).forEach(r => { const k = dayKey(r.atMs); counts[k] = (counts[k] || 0) + 1; });
    const now = new Date(), off = S.statsMonth || 0;
    const first = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const y = first.getFullYear(), m = first.getMonth(), daysIn = new Date(y, m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // неделя с понедельника
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const todayKey = dayKey(Date.now());
    let cells = ''; for (let i = 0; i < lead; i++) cells += '<div class="cal-cell empty"></div>';
    let total = 0, active = 0;
    for (let d = 1; d <= daysIn; d++) {
      const ms = new Date(y, m, d).getTime(), k = dayKey(ms), c = counts[k] || 0;
      if (c) { total += c; active++; }
      const lvl = c === 0 ? 0 : c < 10 ? 1 : c < 30 ? 2 : c < 60 ? 3 : 4;
      cells += `<div class="cal-cell l${lvl}${k === todayKey ? ' today' : ''}${ms > Date.now() ? ' future' : ''}" title="${k}: ${c}">${d}${c ? `<small>${c}</small>` : ''}</div>`;
    }
    return `<div class="cal-head">
        <button class="cards-btn" onclick="Cards.statsMonth(-1)" title="Предыдущий месяц">${svgIcon('chevron-left')}</button>
        <div class="cal-title">${MONTHS[m]} ${y}</div>
        <button class="cards-btn" onclick="Cards.statsMonth(1)" ${off >= 0 ? 'disabled' : ''} title="Следующий месяц">${svgIcon('chevron-right')}</button>
      </div>
      <div class="cal-week">${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <div class="cards-p">${total} повторений за месяц · ${active} активных дней · текущая серия ${streak(deckId)} дн.</div>`;
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
      <div class="cards-head"><div class="cards-title small">Статистика</div><div class="cards-head-deck">${esc(title)}</div></div>
      ${S.reviewsMissing ? `<div class="cards-note">История ответов не пишется: в Supabase нет таблицы <b>reviews</b>. ${isAdmin() ? 'Выполните SQL ещё раз, он добавит только недостающее. <button class="cards-btn" onclick="Cards.showSql()">Показать SQL</button>' : 'Обратитесь к владельцу сайта.'}</div>` : ''}
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-label">Сегодня</div><div class="stat-big">${t.count}</div><div class="stat-sub">повторений · ${t.timeMin} мин${t.correct !== null ? ` · ${t.correct}% верно` : ''} · новых ${t.learned}</div></div>
        <div class="stat-card"><div class="stat-label">Серия</div><div class="stat-big">${t.streak}</div><div class="stat-sub">дней подряд · активных дней ${activeDays}</div></div>
        <div class="stat-card"><div class="stat-label">Карточки</div><div class="stat-big">${totalCards}</div><div class="stat-sub"><span class="c-new">${st.new} новых</span> · <span class="c-learn">${st.learning} учатся</span> · ${st.young} молодых · ${st.mature} зрелых</div></div>
        <div class="stat-card"><div class="stat-label">Всего повторений</div><div class="stat-big">${rs.length}</div><div class="stat-sub">${activeDays ? Math.round(rs.length / activeDays) : 0} в активный день</div></div>
      </div>
      <div class="stat-section"><div class="stat-title">Активность</div>${calendarHtml(deckId)}</div>
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

  // ── Cloze: пример с пропуском и проверка введённого ответа ───────────────────
  // Слово в примере стоит в какой-то форме (cercare → cercando), поэтому ищем по основе:
  // отбрасываем окончание леммы и берём токены, начинающиеся с неё.
  // Ударения снимаем только с латиницы: в кириллице «й» раскладывается на «и» + значок, а это разные буквы
  const stripAccents = s => String(s || '').replace(/[A-Za-zÀ-ÿ]+/g, w => w.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const normAns = s => stripAccents(String(s || '').toLowerCase().replace(/ё/g, 'е')).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const IT_ARTICLE = /^(il|lo|la|l|i|gli|le|un|uno|una|del|della|di|a|da|in|con|su|per)\s+/;
  function itStem(word) {
    const w = normAns(word);
    const s = w.replace(/(arsi|ersi|irsi|are|ere|ire|zione|mente)$/, '').replace(/[aeio]$/, '');
    return s.length >= 3 ? s : w;
  }
  // Разбивает пример на токены и помечает те, что относятся к слову карточки
  function clozeTokens(example, word) {
    if (!example || !word) return null;
    const parts = normAns(word).split(' ').filter(w => w.length > 1);
    const stems = parts.map(itStem);
    const tokens = example.split(/(\p{L}[\p{L}'’]*)/u).filter(t => t !== '');
    let hits = 0;
    const out = tokens.map(t => {
      if (!/^\p{L}/u.test(t)) return { t, hit: false, word: false };
      const nt = normAns(t);
      const hit = stems.some((s, i) => nt === parts[i] || (nt.startsWith(s) && nt.length <= s.length + 6));
      if (hit) hits++;
      return { t, hit, word: true };
    });
    // Если в примере не нашлось ни одного слова карточки (или меньше половины у выражения) — пропуска не будет
    if (!hits || hits < Math.ceil(parts.length / 2)) return null;
    return out;
  }
  // HTML примера: mode = 'gap' (слово скрыто) | 'mark' (слово выделено). Остальные слова кликабельны, как в статье.
  function sentenceHtml(tokens, mode) {
    return tokens.map(x => {
      if (!x.word) return esc(x.t);
      // Изучаемое слово не кликабельно: подсказка по нему выдала бы ответ
      if (x.hit) return mode === 'gap' ? `<span class="cloze-gap" style="min-width:${Math.max(3, x.t.length) * 0.6}em"></span>` : `<span class="cloze-hit">${esc(x.t)}</span>`;
      return makeClickable(x.t);
    }).join('');
  }
  // Что считается верным ответом: для RU→IT — слово, форма из примера, с артиклем и без;
  // для IT→RU — любой из вариантов перевода через «;» или «,», без пояснений в скобках
  function answerVariants(card, n, tokens) {
    const out = [];
    if (card.direction === 'it') {
      (n.translation || '').replace(/\([^)]*\)/g, '').split(/[;,\/]/).map(s => s.trim()).filter(Boolean).forEach(s => out.push(s));
    } else {
      const w = (n.word || '').replace(/["“”„«»]/g, '').trim();
      if (w) { out.push(w); const bare = w.replace(IT_ARTICLE, ''); if (bare !== w) out.push(bare); }
      if (tokens) { const form = tokens.filter(x => x.hit).map(x => x.t).join(' '); if (form && !out.includes(form)) out.push(form); }
    }
    return out;
  }
  // Посимвольное сравнение через наибольшую общую подпоследовательность, как в Anki:
  // в строке ответа лишние символы красные, пропущенные показаны дефисом; в строке образца пропущенные красные
  function charDiff(typed, correct) {
    const a = [...typed], b = [...correct];
    const key = ch => stripAccents(ch.toLowerCase().replace('ё', 'е'));
    const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = key(a[i]) === key(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const typedOut = [], correctOut = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (key(a[i]) === key(b[j])) { typedOut.push({ ch: a[i], cls: 'ok' }); correctOut.push({ ch: b[j], cls: 'ok' }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { typedOut.push({ ch: a[i], cls: 'bad' }); i++; }
      else { typedOut.push({ ch: '-', cls: 'miss' }); correctOut.push({ ch: b[j], cls: 'miss' }); j++; }
    }
    while (i < n) { typedOut.push({ ch: a[i++], cls: 'bad' }); }
    while (j < m) { typedOut.push({ ch: '-', cls: 'miss' }); correctOut.push({ ch: b[j++], cls: 'miss' }); }
    return { typedOut, correctOut };
  }
  function checkTyped(typed, variants, italian) {
    let t = normAns(typed);
    if (!t) return null;
    // Артикль перед итальянским словом не ошибка: убираем его и из проверки, и из показа
    if (italian && IT_ARTICLE.test(t)) { t = t.replace(IT_ARTICLE, ''); typed = typed.trim().replace(/^\S+\s+/, ''); }
    const tBare = t;
    // точное совпадение с любым вариантом — без учёта регистра, знаков препинания, ударений и артикля
    let best = variants.find(v => { const nv = normAns(v); return nv === t || nv === tBare || nv.replace(IT_ARTICLE, '') === tBare; });
    if (best) return { ok: true, near: false, best, ...charDiff(typed.trim(), best) };
    // Несколько вариантов подряд («смешной забавный», «смешной, забавный»): разбираем ответ на куски,
    // каждый из которых — один из вариантов перевода (вариант может быть из нескольких слов)
    const multi = segmentByVariants(t, typed, variants);
    if (multi) return multi;
    // иначе ближайший вариант по длине общей подпоследовательности; одна опечатка в длинном слове — «почти»
    let bestScore = -1;
    variants.forEach(v => { const d = charDiff(t, normAns(v)); const score = d.correctOut.filter(x => x.cls === 'ok').length / Math.max(t.length, normAns(v).length); if (score > bestScore) { bestScore = score; best = v; } });
    if (!best) return null;
    const d = charDiff(typed.trim(), best);
    // Замена буквы даёт «лишняя + пропущенная», то есть 2; «почти» — одна замена или пара пропусков в слове от 4 букв
    const errors = d.typedOut.filter(x => x.cls !== 'ok').length;
    const near = normAns(best).length >= 4 && errors <= 2;
    return { ok: false, near, best, ...d };
  }
  // Разбор ответа по словам: dp[i] — лучший разбор первых i слов, где кусок либо совпадает с вариантом
  // (штраф 0), либо одно лишнее слово (штраф 1). Все слова узнаны — верно; узнан хоть один вариант — «почти».
  function segmentByVariants(t, typedRaw, variants) {
    const words = t.split(' ');
    const vars = variants.map(v => ({ v, w: normAns(v).split(' ') })).filter(x => x.w[0]);
    const dp = [{ cost: 0, parts: [], matched: 0 }];
    for (let i = 0; i < words.length; i++) {
      if (!dp[i]) continue;
      vars.forEach(({ v, w }) => {
        if (w.every((x, k) => words[i + k] === x)) {
          const cand = { cost: dp[i].cost, parts: [...dp[i].parts, { n: w.length, ok: true, v }], matched: dp[i].matched + 1 };
          if (!dp[i + w.length] || cand.cost < dp[i + w.length].cost) dp[i + w.length] = cand;
        }
      });
      const skip = { cost: dp[i].cost + 1, parts: [...dp[i].parts, { n: 1, ok: false }], matched: dp[i].matched };
      if (!dp[i + 1] || skip.cost < dp[i + 1].cost) dp[i + 1] = skip;
    }
    const res = dp[words.length];
    if (!res || res.matched === 0 || res.matched < 2 && res.cost > 0) return null; // один узнанный кусок среди мусора — это не «почти»
    // Показ: слова ответа в исходном написании, узнанные зелёным, лишние красным
    let shown = typedRaw.trim().split(/\s+/).map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
    if (shown.length !== words.length) shown = words;
    const typedOut = []; let i = 0;
    res.parts.forEach((p, idx) => {
      if (idx) typedOut.push({ ch: ' ', cls: 'ok' });
      typedOut.push(...[...shown.slice(i, i + p.n).join(' ')].map(ch => ({ ch, cls: p.ok ? 'ok' : 'bad' })));
      i += p.n;
    });
    const ok = res.cost === 0;
    const best = res.parts.filter(p => p.ok).map(p => p.v).join('; ');
    const correctOut = [...variants.join('; ')].map(ch => ({ ch, cls: 'ok' }));
    return { ok, near: !ok, best, typedOut, correctOut };
  }
  const diffHtml = arr => arr.map(x => `<span class="typed-${x.cls}">${esc(x.ch)}</span>`).join('');

  function renderStudy(el) {
    const deck = deckById(S.deckId); const c = counts(cardsOfNotes(notesInDeck(S.deckId)));
    const head = `
      <div class="study-topbar">
        <button class="cards-back" onclick="goBack()" title="К колодам">←</button>
        <div class="cards-head-counts"><span class="c-new">${c.new}</span><span class="c-learn">${c.learn}</span><span class="c-due">${c.due}</span></div>
        <div class="cards-head-deck">${esc(deck ? deck.name : 'все колоды')}${S.tagFilter ? ` · #${esc(S.tagFilter)}` : ''}</div>
        <button class="cards-undo ${S.undo ? '' : 'disabled'}" onclick="Cards.undo()" title="Отменить ответ">${svgIcon('undo')}</button>
        <button class="cards-edit ${S.current ? '' : 'disabled'}" onclick="Cards.editCurrent()" title="Редактировать карточку (E)">${svgIcon('edit')}</button>
      </div>`;
    if (!S.current) {
      // Итог сессии: сколько прошли, доля верных, когда подойдут следующие
      const s = S.session || { start: Date.now(), n: 0, again: 0 };
      const scopeNotes = S.tagFilter ? notesInDeck(S.deckId).filter(n => (n.tags || []).includes(S.tagFilter)) : notesInDeck(S.deckId);
      const now = Date.now();
      const next = cardsOfNotes(scopeNotes).filter(k => k.state !== 'new' && k.dueMs > now).reduce((m, k) => Math.min(m, k.dueMs), Infinity);
      const mins = Math.max(1, Math.round((now - s.start) / 60000));
      const summary = s.n ? `<div class="study-summary">${s.n} ${pluralRu(s.n, 'карточка', 'карточки', 'карточек')} за ${mins} мин · верно ${Math.round((1 - s.again / s.n) * 100)}%</div>` : '';
      const nextTxt = isFinite(next) ? `Следующие подойдут через ${fmtInterval(next - now)}` : (scopeNotes.length ? '' : 'Здесь пока нет карточек');
      el.innerHTML = head + `<div class="study-body"><div class="cards-done"><div class="cards-done-mark">✓</div><div>На сегодня ${S.deckId ? 'в этой колоде' : 'по всем колодам'} всё.</div>${summary}${nextTxt ? `<div class="study-summary sub">${nextTxt}</div>` : ''}<button class="cards-btn" onclick="goBack()">К колодам</button></div></div>`;
      return;
    }
    const { n, front, answer } = cardFaces(S.current);
    const isIt = S.current.direction === 'it';
    const tokens = clozeTokens(n.example, n.word);
    // Лицевая сторона: пример с пропуском (RU→IT) или с выделенным словом (IT→RU); слова примера кликабельны
    const sentence = tokens ? `<div class="study-box study-sentence"><div class="study-box-label">Esempio</div><div class="study-box-text italic">${sentenceHtml(tokens, S.revealed || isIt ? 'mark' : 'gap')}</div></div>`
      : (S.revealed && n.example ? `<div class="study-box"><div class="study-box-label">Esempio</div><div class="study-box-text italic">${makeClickable(n.example)}</div></div>` : '');
    const chk = S.check;
    const typedBlock = S.revealed && chk ? `
        <div class="study-typed ${chk.ok ? 'ok' : chk.near ? 'near' : 'bad'}">
          <div class="study-typed-line">${diffHtml(chk.typedOut)}</div>
          <div class="study-typed-arrow">${chk.ok ? '✓ верно' : chk.near ? '≈ почти' : '✗'}</div>
          ${chk.ok ? '' : `<div class="study-typed-line correct">${diffHtml(chk.correctOut)}</div>`}
        </div>` : '';
    const input = !S.revealed ? `
        <div class="study-input-wrap">
          <input class="study-input" id="studyInput" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"
            placeholder="${isIt ? 'перевод' : 'слово по-итальянски'}" onkeydown="if(event.key==='Enter'||(event.key===' '&&!this.value.trim())){event.preventDefault();Cards.submitTyped(this.value)}else if(event.key==='Escape'){this.blur()}">
        </div>` : '';
    const back = S.revealed ? `
        <div class="study-rule"></div>
        ${typedBlock}
        <div class="study-answer">${esc(answer)}</div>
        ${n.phonetic ? `<div class="study-ipa">${esc(n.phonetic)}</div>` : ''}
        ${sentence}
        ${n.meaning ? `<div class="study-box"><div class="study-box-label">Significato</div><div class="study-box-text">${makeClickable(n.meaning)}</div></div>` : ''}
        ${(n.tags || []).length ? `<div class="study-tags">${n.tags.map(t => `<span class="tag-chip">#${esc(t)}</span>`).join('')}</div>` : ''}
        <button class="study-article" onclick="Cards.openArticle('${esc(n.word || '').replace(/'/g, '&#39;')}')">открыть статью ${svgIcon('external')}</button>` : `${sentence}${input}`;
    const suggested = chk ? (chk.ok ? 3 : chk.near ? 2 : 1) : 0;
    const buttons = S.revealed ? `
      <div class="study-buttons">
        <button class="sb again ${suggested === 1 ? 'suggested' : ''}" onclick="Cards.answer(1)"><small>${previewLabel(S.current, 1)}</small>Снова</button>
        <button class="sb hard ${suggested === 2 ? 'suggested' : ''}" onclick="Cards.answer(2)"><small>${previewLabel(S.current, 2)}</small>Трудно</button>
        <button class="sb good ${suggested === 3 ? 'suggested' : ''}" onclick="Cards.answer(3)"><small>${previewLabel(S.current, 3)}</small>Хорошо</button>
        <button class="sb easy" onclick="Cards.answer(4)"><small>${previewLabel(S.current, 4)}</small>Легко</button>
      </div>` : `<div class="study-buttons"><button class="sb show" onclick="Cards.reveal()">Показать ответ</button></div>`;
    el.innerHTML = head + `
      <div class="study-body">
        <div class="study-card ${S.current.direction}">
          <div class="study-dir">${isIt ? 'IT → RU' : 'RU → IT'}${S.current.state === 'new' ? ' · новая' : ''}</div>
          <div class="study-front">${esc(front)}</div>
          ${back}
        </div>
      </div>
      <div class="study-footer">${buttons}<div class="study-hint">${S.revealed ? 'Клавиши 1–4 — оценка, Enter — «Хорошо», E — править, Esc — выйти' : 'Enter — проверить ответ, пустой Enter или пробел — показать, E — править, Esc — выйти'}</div></div>`;
    // На компьютере курсор сразу в поле ответа; на телефоне клавиатуру не поднимаем, пока не тронут поле
    const inp = document.getElementById('studyInput');
    if (inp && !(typeof isTouchDevice === 'function' && isTouchDevice())) inp.focus();
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
            ${it.example ? `<div class="build-ex">${esc(it.example)}</div>` : ''}
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
      <div class="cards-head"><div class="cards-title small">Добавить слова</div><div class="cards-head-deck">${esc(deckPath(S.deckId))}</div></div>
      <div class="cards-panel">${body}</div>`;
  }

  function browseRowsHtml(filtered) {
    const q = normFind(S.browseQuery).trim();
    return filtered.map(n => {
      const cs = S.cards.filter(c => c.note_id === n.id);
      const st = cs.map(c => c.state === 'new' ? 'н' : (c.state === 'review' ? 'п' : 'з')).join('');
      return `
        <div class="browse-row">
          <input type="checkbox" ${S.browseSelected.has(n.id) ? 'checked' : ''} onchange="Cards.selectNote('${n.id}', this.checked)">
          <button class="browse-word" onclick="Cards.editNote('${n.id}')">${highlight(n.word, q)}</button>
          <button class="browse-open" onclick="Cards.openArticle('${esc(n.word).replace(/'/g, '&#39;')}')" title="Открыть статью в словаре">${svgIcon('external')}</button>
          <div class="browse-ru">${highlight(n.translation, q)}</div>
          <div class="browse-tags">${(n.tags || []).map(t => `<span class="tag-chip" onclick="Cards.setTagFilter('${esc(t)}')">#${esc(t)}</span>`).join('')}</div>
          <div class="browse-state" title="состояние карточек: н новая, з заучивается, п повторение">${st}</div>
        </div>`;
    }).join('');
  }

  function browseToolbarHtml(filtered, tags) {
    const all = S.browseSelected.size === filtered.length && filtered.length;
    return `
      <select class="cards-select" onchange="Cards.setTagFilter(this.value)">
        <option value="">все теги</option>${tags.map(t => `<option value="${esc(t)}" ${t === S.tagFilter ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
      </select>
      <button class="cards-btn" onclick="Cards.study('${S.deckId}')">Учить ${S.tagFilter ? '#' + esc(S.tagFilter) : 'колоду'}</button>
      <button class="cards-btn" onclick="Cards.selectAll(${all ? 'false' : 'true'})">${all ? 'Снять выделение' : 'Выделить все'}</button>
      <button class="cards-btn" onclick="Cards.tagSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Добавить тег</button>
      <button class="cards-btn" onclick="Cards.untagSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Убрать тег</button>
      <button class="cards-btn" onclick="Cards.moveSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Переместить</button>
      <button class="cards-btn danger" onclick="Cards.deleteSelected()" ${S.browseSelected.size ? '' : 'disabled'}>Удалить</button>`;
  }

  const browseEmptyHtml = () => S.browseQuery
    ? `<div class="cards-empty">По запросу «${esc(S.browseQuery)}» ничего не нашлось</div>`
    : '<div class="cards-empty">В колоде пока нет слов</div>';

  function renderBrowse(el) {
    const notes = notesInDeck(S.deckId);
    const tags = [...new Set(notes.flatMap(n => n.tags || []))].sort();
    const filtered = currentNotes();
    el.innerHTML = `
      <div class="cards-head"><div class="cards-title small">Карточки</div><div class="cards-head-deck">${esc(deckPath(S.deckId))} · <span id="browseCount">${filtered.length}</span></div></div>
      <div class="cards-panel">
        <div class="cards-search-wrap">
          <input class="cards-search" id="browseSearch" type="text" value="${esc(S.browseQuery)}" placeholder="Поиск по колоде: слово или перевод"
            autocomplete="off" spellcheck="false" oninput="Cards.setBrowseQuery(this.value)">
          <span class="cards-search-icon">${svgIcon('search')}</span>
        </div>
        <div class="cards-actions wrap" id="browseToolbar">${browseToolbarHtml(filtered, tags)}</div>
        <div class="browse-list" id="browseList">${browseRowsHtml(filtered) || browseEmptyHtml()}</div>
      </div>
`;
  }

  // Перерисовываем только список и панель: полный render убил бы фокус в поле поиска
  function setBrowseQuery(v) {
    S.browseQuery = v;
    const notes = notesInDeck(S.deckId);
    const tags = [...new Set(notes.flatMap(n => n.tags || []))].sort();
    const filtered = currentNotes();
    const list = $('browseList'); if (list) list.innerHTML = browseRowsHtml(filtered) || browseEmptyHtml();
    const cnt = $('browseCount'); if (cnt) cnt.textContent = filtered.length;
    const tb = $('browseToolbar'); if (tb) tb.innerHTML = browseToolbarHtml(filtered, tags);
  }

  // Спуск в колоду (null — корень): та же сетка плиток, только для её подколод
  function openDeck(id) {
    id = id || null;
    if (S.view === 'decks' && S.folder === id) return;
    pushView('decks', id); S.folder = id; S.view = 'decks'; render();
  }
  // ── Действия: колоды ─────────────────────────────────────────────────────────
  async function newDeck(parentId) {
    const name = prompt(parentId ? `Название подколоды в «${deckById(parentId).name}»:` : 'Название колоды:');
    if (!name || !name.trim()) return;
    // Колоду создают, чтобы что-то в неё положить, — сразу заходим внутрь, а не показываем список
    try { const [d] = await sb('decks', { method: 'POST', body: { name: name.trim(), parent_id: parentId || null } }); S.decks.push(d); openDeck(d.id); }
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
      if (gone.has(S.folder)) S.folder = d.parent_id || null; // стояли внутри удалённой — поднимаемся к родителю
      render();
    } catch (e) { showToast('⚠ ' + e.message); }
  }

  // ── Действия: учёба ──────────────────────────────────────────────────────────
  function study(deckId, tag) {
    pushView('study');
    S.deckId = deckId; S.view = 'study'; S.undo = null;
    S.session = { start: Date.now(), n: 0, again: 0 }; // для итога в конце сессии
    if (tag !== undefined) S.tagFilter = tag;
    buildQueue(); nextCard(); render();
  }
  function reveal(typed) {
    if (!S.current || S.revealed) return;
    S.revealed = true; S.check = null;
    if (typed && typed.trim()) {
      const { n } = cardFaces(S.current);
      S.check = checkTyped(typed, answerVariants(S.current, n, clozeTokens(n.example, n.word)), S.current.direction !== 'it');
    }
    render();
  }
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
    if (S.session) { S.session.n++; if (rating === 1) S.session.again++; }
    if (window.refreshHomeDue) refreshHomeDue();
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
    S.current = card; S.revealed = false; S.check = null; render();
  }

  // ── Действия: добавление слов ────────────────────────────────────────────────
  function parseLines(text) {
    const items = [];
    text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
      const delim = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : (line.split(',').length > 1 ? ',' : null));
      const parts = delim ? line.split(delim).map(p => p.trim().replace(/^"|"$/g, '')) : [line];
      if (!parts[0] || /^(word|parola|слово)$/i.test(parts[0])) return; // заголовок CSV
      const word = cleanQuery(parts[0]); if (!word) return; // кавычки внутри (fare "bella figura") убираем
      items.push({ word, translation: parts[1] || '', example: parts[2] || '', meaning: parts[3] || '', tags: parts[4] ? parts[4].split(/[,\s]+/).filter(Boolean) : [] });
    });
    return items;
  }

  async function lookupOne(it) {
    const lw = it.word.toLowerCase();
    const d = { ...it, phonetic: '', pos: '', glosses: [], include: true, warn: '' };
    const phrase = isPhrase(lw);
    // Выражение из нескольких слов словари не знают: берём кэш статьи, транскрипцию собираем из слов,
    // остальное (перевод, пример, значение) допишет модель — но уже без транскрипции
    const [cached, fd, ru] = await Promise.all([
      sbGet('dictionary', lw).catch(() => null),
      phrase ? null : fetchFreeDictionary(lw),
      phrase ? null : fetchRuWiktionary(lw).catch(() => null)
    ]);
    if (cached) {
      d.word = cached.word || d.word; d.pos = cached.partOfSpeech || '';
      d.translation = d.translation || (cached.russian && cached.russian.main) || '';
      d.phonetic = cached.phonetic || '';
      const m0 = (cached.meanings || [])[0] || {};
      d.example = d.example || m0.example || cached.example || '';
      d.meaning = d.meaning || m0.definition || cached.definition || '';
    }
    if (phrase) {
      d.isPhrase = true; d.pos = d.pos || 'locuzione';
      if (!d.phonetic) d.phonetic = await phrasePhonetic(lw).catch(() => '');
      if (!cached) d.warn = 'выражение: перевод и пример допишет модель';
      return d;
    }
    if (fd) {
      const m = mapFreeDictionary(fd, { light: true });
      if (m && m.lemma) { d.warn = `форма слова ${m.lemma}, карточка будет на неё`; d.word = m.lemma; return lookupOne({ ...it, word: m.lemma, _redirected: true }).then(x => ({ ...x, warn: d.warn })); }
      if (m && m.lemmas) d.warn = `форма нескольких слов: ${m.lemmas.map(l => l.lemma).join(', ')}`;
      else if (m) { d.phonetic = d.phonetic || m.phonetic || ''; d.pos = d.pos || m.partOfSpeech || ''; d.glosses = (m.senses || []).map(s => s.gloss).filter(Boolean).slice(0, 3); d.example = d.example || (m.senses || []).map(s => s.example).find(Boolean) || ''; }
    }
    if (ru && ru.main) d.translation = d.translation || ru.main;
    if (!cached && !fd) d.warn = d.warn || 'слова нет в словарях, всё допишет модель';
    if (!d.phonetic) { const r = await resolveIpa(d.word).catch(() => ({ ipa: '' })); d.phonetic = r.ipa || ''; }
    return d;
  }

  async function completeWithLlm(items) {
    // У выражений транскрипцию не просим: модель в них путает ударения, лучше пусто, чем неверно
    // Транскрипцию у модели не просим вообще: она берётся из словарей или по правилам чтения (resolveIpa)
    const fieldsOf = () => ['translation', 'example', 'meaning'];
    const need = items.filter(i => fieldsOf(i).some(f => !i[f]));
    if (!need.length) return null;
    const BATCH = 15; let used = null;
    for (let i = 0; i < need.length; i += BATCH) {
      const chunk = need.slice(i, i + BATCH);
      if (S.build) { S.build.status = `Модель дописывает недостающее: ${Math.min(i + BATCH, need.length)} из ${need.length}…`; render(); }
      const list = chunk.map(x => ({ word: x.word, isPhrase: x.isPhrase || undefined, partOfSpeech: x.pos || undefined, englishGlosses: x.glosses.length ? x.glosses : undefined,
        missing: fieldsOf(x).filter(f => !x[f]) }));
      const prompt = `You are an expert Italian lexicographer. For each Italian item below, provide ONLY the fields listed in "missing".
Fields: "translation" = primary Russian translation (1-3 words, alternatives after ";" allowed), "phonetic" = IPA with ˈ before the stressed syllable, "example" = one natural Italian sentence using the word, "meaning" = short definition in Italian (1 sentence).
Items with "isPhrase": true are multi-word expressions (idioms, collocations, set phrases): "translation" = the idiomatic Russian equivalent, not word-for-word; "meaning" = what the whole expression means; "example" = a natural sentence using the whole expression. Never add a phonetic for them.
Return ONLY a JSON array of objects {"word": "...", ...fields}, in the same order, no markdown.
${JSON.stringify(list)}`;
      try {
        const res = await llmJson(prompt, 'dict');
        const arr = Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : []);
        arr.forEach(r => { const t = chunk.find(x => x.word.toLowerCase() === String(r.word || '').toLowerCase()) || chunk[arr.indexOf(r)]; if (!t) return;
          fieldsOf(t).forEach(f => { if (!t[f] && r[f]) t[f] = String(r[f]); }); });
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
      // Возвращаемся к колоде через «Назад», а не подменой вида: запись, которую положил openAdd,
      // иначе остаётся в истории, и первое нажатие «Назад» не делает ничего видимого
      S.build = null;
      if (typeof navHistory !== 'undefined' && navHistory.length) goBack(); else { S.view = 'decks'; render(); }
    } catch (e) { showToast('⚠ ' + e.message); }
  }

  // ── Действия: обзор и теги ───────────────────────────────────────────────────
  // Что сейчас видно в списке карточек: тег и строка поиска. Через это же смотрит «выделить все»,
  // иначе кнопка выделяла бы и то, что скрыто фильтром.
  const normFind = s => String(s || '').toLowerCase().replace(/ё/g, 'е')
    .replace(/[A-Za-zÀ-ÿ]+/g, w => w.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  // Ищем только по слову и переводу: совпадение в примере или значении не видно в строке списка,
  // и человек не понимает, почему карточка нашлась
  function noteMatches(n, q) {
    return normFind(n.word).includes(q) || normFind(n.translation).includes(q);
  }
  // Подсветка набранного. normFind не меняет длину строки (ё→е, é→e, регистр),
  // поэтому позиции в приведённой строке годятся для исходной; на всякий случай проверяем.
  function highlight(text, q) {
    const s = String(text || '');
    if (!q) return esc(s);
    const n = normFind(s);
    if (n.length !== s.length) return esc(s);
    let out = '', last = 0, i = n.indexOf(q);
    while (i !== -1) {
      out += esc(s.slice(last, i)) + `<mark>${esc(s.slice(i, i + q.length))}</mark>`;
      last = i + q.length;
      i = n.indexOf(q, last);
    }
    return out + esc(s.slice(last));
  }
  const currentNotes = () => {
    let notes = notesInDeck(S.deckId);
    if (S.tagFilter) notes = notes.filter(n => (n.tags || []).includes(S.tagFilter));
    const q = normFind(S.browseQuery).trim();
    return q ? notes.filter(n => noteMatches(n, q)) : notes;
  };
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
  // Окно редактирования живёт в body, а не внутри экрана колод: у того есть анимация с transform,
  // из-за которой position: fixed считался от экрана, и окно появлялось посреди длинного списка
  function cardsModal() {
    let m = $('cardsModal');
    if (!m) {
      m = document.createElement('div'); m.id = 'cardsModal'; m.className = 'cards-modal'; m.style.display = 'none';
      m.addEventListener('click', e => { if (e.target === m) closeModal(); });
      m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closeModal(); } });
      document.body.appendChild(m);
    }
    return m;
  }
  const modalOpen = () => { const m = $('cardsModal'); return !!m && m.style.display !== 'none'; };
  // Правка текущей карточки прямо во время учёбы: окно то же, что в списке слов
  function editCurrent() {
    if (!S.current) return;
    editNote(S.current.note_id);
    const first = document.getElementById('edit_word');
    if (first && !(typeof isTouchDevice === 'function' && isTouchDevice())) first.focus();
  }
  function editNote(id) {
    const n = noteById(id); if (!n) return; const m = cardsModal();
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
    try {
      await sb(`notes?id=eq.${id}`, { method: 'PATCH', body }); Object.assign(noteById(id), body); closeModal();
      // В учёбе экран перерисуется целиком — не теряем уже набранный, но ещё не проверенный ответ
      const inp = document.getElementById('studyInput'); const typed = inp ? inp.value : null;
      render();
      const inp2 = document.getElementById('studyInput'); if (inp2 && typed) inp2.value = typed;
    } catch (e) { showToast('⚠ ' + e.message); }
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
          <button class="cards-btn" onclick="Cards.pickNewDeck()">${svgIcon('plus')} Новая колода</button>
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
      // Слово из подсказки приходит с одним переводом: пример, значение и транскрипцию добираем
      // тем же путём, что при добавлении списком (кэш → Викисловарь → модель)
      const thin = fresh.filter(n => !n.example || !n.meaning || !n.translation || !n.phonetic);
      if (thin.length) { showToast('Дополняю карточки…'); await enrichNotes(thin); }
      const notes = await sb('notes', { method: 'POST', body: fresh.map(n => ({ deck_id: deckId, ...n, tags })) });
      const cards = await sb('cards', { method: 'POST', body: notes.flatMap(n => [{ note_id: n.id, direction: 'it' }, { note_id: n.id, direction: 'ru' }]) });
      S.notes.push(...notes); S.cards.push(...cards.map(c => ({ ...c, dueMs: Date.parse(c.due) || 0 })));
      showToast(`✓ ${notes.length} слов → ${deckPath(deckId)}${skipped ? ` (${skipped} уже были)` : ''}`);
      closePicker();
      // Разбор текста показывает «в колоде» по факту, а не по нажатию: пусть перерисуется
      document.dispatchEvent(new CustomEvent('cards:notes-added', { detail: { words: notes.map(n => n.word) } }));
      if (_currentState === 'cards') render();
      if (window.refreshHomeDue) refreshHomeDue();
    } catch (e) { showToast('⚠ ' + e.message); }
  }
  async function enrichNotes(notes) {
    const items = await Promise.all(notes.map(n => lookupOne({ word: n.word, translation: n.translation || '', example: n.example || '', meaning: n.meaning || '' }).catch(() => null)));
    await completeWithLlm(items.filter(Boolean));
    notes.forEach((n, i) => {
      const d = items[i]; if (!d) return;
      n.word = d.word || n.word; n.pos = n.pos || d.pos || '';
      ['translation', 'phonetic', 'example', 'meaning'].forEach(f => { if (!n[f] && d[f]) n[f] = d[f]; });
    });
  }
  async function pickNewDeck() {
    const name = prompt('Название новой колоды:'); if (!name || !name.trim()) return;
    try { const [d] = await sb('decks', { method: 'POST', body: { name: name.trim(), parent_id: null } }); S.decks.push(d); await pickDeck(d.id); }
    catch (e) { showToast('⚠ ' + e.message); }
  }

  // ── Обмен колодами по ссылке ─────────────────────────────────────────────────
  const PENDING_SHARE_KEY = 'dizionario_pending_share';
  const sqlHint = e => (isMissingTable(e) || /does not exist|not find the function|schema cache/i.test(e.message || '')) ? ' — выполните SQL из настроек, он добавляет функции обмена' : '';
  async function shareDeck(id) {
    if (window.Auth && !Auth.require('Войдите, чтобы делиться колодами')) return;
    try {
      const rows = await sb(`deck_shares?select=token&deck_id=eq.${id}`);
      let token = rows && rows[0] && rows[0].token;
      if (!token) {
        const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
        token = Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => abc[b % abc.length]).join('');
        await sb('deck_shares', { method: 'POST', body: { token, deck_id: id } });
      }
      showShareModal(id, `${location.origin}${location.pathname}?share=${token}`);
    } catch (e) { showToast('⚠ ' + e.message + sqlHint(e)); }
  }
  function showShareModal(id, url) {
    let m = document.getElementById('shareModal');
    if (!m) { m = document.createElement('div'); m.id = 'shareModal'; m.className = 'cards-modal'; m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; }); document.body.appendChild(m); }
    const d = deckById(id);
    m.innerHTML = `<div class="cards-modal-box">
      <div class="cards-title small">Поделиться колодой «${esc(d ? d.name : '')}»</div>
      <p class="cards-p">Тот, кто откроет ссылку и войдёт в свой аккаунт, получит копию колоды со всеми подколодами и словами. Дальше ваши колоды живут отдельно: изменения не синхронизируются.</p>
      <input class="cards-input" id="shareUrl" value="${esc(url)}" readonly onclick="this.select()">
      <div class="cards-actions">
        <button class="cards-btn primary" onclick="Cards.copyShare()">Скопировать ссылку</button>
        <button class="cards-btn danger" onclick="Cards.revokeShare('${id}')">Отозвать ссылку</button>
        <button class="cards-btn" onclick="document.getElementById('shareModal').style.display='none'">Закрыть</button>
      </div></div>`;
    m.style.display = 'flex';
  }
  function copyShare() {
    const url = ($('shareUrl') || {}).value || '';
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => showToast('✓ Ссылка скопирована'), () => { const i = $('shareUrl'); if (i) { i.select(); showToast('Выделено — скопируйте вручную'); } });
  }
  async function revokeShare(id) {
    if (!confirm('Отозвать ссылку? Те, кто уже скопировал колоду, её сохранят, но новые переходы работать не будут.')) return;
    try { await sb(`deck_shares?deck_id=eq.${id}`, { method: 'DELETE' }); showToast('Ссылка отозвана'); const m = document.getElementById('shareModal'); if (m) m.style.display = 'none'; }
    catch (e) { showToast('⚠ ' + e.message); }
  }
  async function processPendingShare() {
    let token = null; try { token = localStorage.getItem(PENDING_SHARE_KEY); } catch (e) {}
    if (!token || !(window.Auth && Auth.user())) return;
    const clear = () => { try { localStorage.removeItem(PENDING_SHARE_KEY); } catch (e) {} };
    try {
      const info = await sb('rpc/shared_deck_info', { method: 'POST', body: { p_token: token } });
      if (!info) { showToast('⚠ Ссылка на колоду недействительна или отозвана'); clear(); return; }
      if (!confirm(`Добавить колоду «${info.name}» (${info.words} слов) в ваш профиль?`)) { clear(); return; }
      await sb('rpc/import_shared_deck', { method: 'POST', body: { p_token: token } });
      clear();
      showToast(`✓ Колода «${info.name}» добавлена`);
      await loadAll();
      switchMode('cards');
    } catch (e) { showToast('⚠ ' + e.message + sqlHint(e)); if (sqlHint(e)) clear(); }
  }

  // ── Клавиатура в режиме учёбы ────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (_currentState !== 'cards' || S.view !== 'study' || !S.current) return;
    if (modalOpen()) return; // открыто окно редактирования: клавиши — ему, а не карточке
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!S.revealed) reveal(); else if (e.key === 'Enter') answer(3); }
    else if (/^[1-4]$/.test(e.key) && S.revealed) answer(parseInt(e.key));
    else if (e.key === 'z' || e.key === 'Z') undo();
    else if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') editCurrent();
    else if (e.key === 'Escape') goBack();
  });

  // Клик по слову в примере на карточке (компьютер): уходим в статью, закрыв экран учёбы;
  // «Назад» вернёт ту же карточку (см. snapshot/restore). На телефоне слово открывает шторку, как везде.
  document.addEventListener('click', e => {
    if (S.view !== 'study' || (typeof isTouchDevice === 'function' && isTouchDevice())) return;
    const el = e.target.closest('#studyOverlay .clickable-word');
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    window.Cards.openArticle(el.textContent.trim());
  }, true);

  // ── Публичный интерфейс ──────────────────────────────────────────────────────
  window.Cards = {
    async open() {
      S.view = 'decks'; S.folder = null; S.build = null; S.browseSelected.clear(); closeOverlay();
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
    openDeck,
    newDeck, renameDeck, deleteDeck,
    setNewPerDay(v) { try { localStorage.setItem(NEW_PER_DAY_KEY, String(Math.max(0, parseInt(v) || 0))); } catch (e) {} render(); },
    study(id) { study(id, S.view === 'browse' ? S.tagFilter : ''); },
    // Все колоды разом: deckId = null, notesInDeck(null) обходит дерево от корня
    allWords() { return S.notes.map(n => String(n.word || '').toLowerCase()); }, // для подсказок в поиске
    studyAll() { if (window.Auth && !Auth.require('Войдите, чтобы учить карточки')) return; if (currentMode !== 'cards') { currentMode = 'cards'; applyModeUI('cards'); showState('cards'); } (S.loaded ? Promise.resolve() : loadAll()).then(() => study(null, '')); },
    // Сводка для плиток главной: к повторению и новых (в пределах дневного лимита), серия, слова
    async homeSummary() {
      if (!(window.Auth && Auth.user())) return null;
      if (!S.loaded) await loadAll();
      if (S.missingTables) return null;
      const c = counts(S.cards), t = todayStats(null);
      return { learn: c.learn, due: c.due, newToday: Math.min(c.new, newPerDay()), streak: t.streak, todayCount: t.count, notes: S.notes.length, learnedPct: learnedPct(S.cards) };
    },
    reveal, answer, undo,
    openAdd(id) { pushView('add'); S.deckId = id; S.view = 'add'; S.build = null; render(); },
    buildFromText, importFile, saveBuild,
    toggleItem(i, v) { S.build.items[i].include = v; render(); },
    resetBuild() { S.build = null; render(); },
    browse(id) { pushView('browse'); S.deckId = id; S.view = 'browse'; S.tagFilter = ''; S.browseQuery = ''; S.browseSelected.clear(); render(); },
    setBrowseQuery,
    stats(id) { pushView('stats'); S.statsDeckId = id || null; S.statsMonth = 0; S.view = 'stats'; render(); },
    statsMonth(delta) { S.statsMonth = Math.min(0, (S.statsMonth || 0) + delta); render(); },
    shareDeck, copyShare, revokeShare, processPendingShare,
    // Переход из колоды к словарной статье; «Назад» вернёт тот же экран колод (см. snapshot/restore)
    openArticle(word) {
      if (!word) return;
      closeOverlay();
      currentMode = 'dict'; applyModeUI('dict');
      $('searchInput').value = word;
      lookupWord(word);
    },
    submitTyped(v) { if (!S.current) return; reveal(v); },
    // Снимок для истории: из учёбы «Назад» возвращает ту же карточку в том же состоянии
    snapshot() {
      const study = S.view === 'study' && S.current ? { current: S.current.id, queue: S.queue.map(c => c.id), revealed: S.revealed, check: S.check, shownAt: S.shownAt } : null;
      return { view: S.view, deckId: S.deckId, tagFilter: S.tagFilter, folder: S.folder, statsDeckId: S.statsDeckId, study };
    },
    async restore(snap) {
      closeOverlay(); S.build = null; S.browseSelected.clear();
      if (!S.loaded) { render(); await loadAll(); }
      const { study, ...rest } = snap || { view: 'decks' };
      Object.assign(S, rest);
      if (S.view === 'study') {
        const byId = id => S.cards.find(c => c.id === id);
        const cur = study && byId(study.current);
        if (cur) { S.current = cur; S.queue = study.queue.map(byId).filter(Boolean); S.revealed = study.revealed; S.check = study.check; S.shownAt = study.shownAt || Date.now(); }
        else { buildQueue(); nextCard(); }
      }
      render();
    },
    showSql() { if (!isAdmin()) { showToast('SQL для базы доступен только владельцу сайта'); return; } pushView('sql'); S.view = 'sql'; render(); },
    setTagFilter(t) { S.tagFilter = t; S.browseSelected.clear(); render(); },
    selectNote(id, v) { if (v) S.browseSelected.add(id); else S.browseSelected.delete(id); render(); },
    selectAll(v) { S.browseSelected.clear(); if (v) currentNotes().forEach(n => S.browseSelected.add(n.id)); render(); },
    tagSelected, untagSelected, moveSelected, deleteSelected, editNote, editCurrent, saveNote, closeModal,
    addEntries, pickDeck, pickNewDeck, closePicker,
    _state: S, _schedule: schedule, _parseLines: parseLines, _fmt: fmtInterval
  };
})();
