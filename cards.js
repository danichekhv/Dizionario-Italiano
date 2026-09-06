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
    build: null, browseSelected: new Set()
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
create index if not exists notes_deck_idx on notes(deck_id);`;

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
    S.current = S.queue.shift() || null; S.revealed = false;
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
    ({ decks: renderDecks, add: renderAdd, browse: renderBrowse })[S.view](el);
  }
  // Переход на внутренний экран с записью в историю: «Назад» вернёт прежний вид
  function pushView(view) {
    const prev = { view: S.view, deckId: S.deckId, tagFilter: S.tagFilter };
    if (prev.view === view) return;
    pushHistory(() => { S.view = prev.view; S.deckId = prev.deckId; S.tagFilter = prev.tagFilter; S.build = null; S.browseSelected.clear(); render(); });
  }

  function renderSetup(el) {
    el.innerHTML = `
      <div class="cards-head"><div class="cards-title">Le Carte</div></div>
      <div class="cards-setup">
        <p>Для карточек нужны три таблицы в Supabase. Скопируйте SQL, вставьте в SQL Editor вашего проекта и нажмите Run, затем вернитесь сюда.</p>
        <pre class="cards-sql" id="cardsSql">${esc(SETUP_SQL)}</pre>
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
            <button onclick="Cards.newDeck('${d.id}')" title="Подколода">⤵</button>
            <button onclick="Cards.renameDeck('${d.id}')" title="Переименовать">✎</button>
            <button onclick="Cards.deleteDeck('${d.id}')" title="Удалить">✕</button>
          </div>
        </div>`);
      if (!collapsed) walk(d.id, depth + 1);
    });
    walk(null, 0);
    const total = counts(S.cards);
    el.innerHTML = `
      <div class="cards-head">
        <div class="cards-title">Le Carte</div>
        <div class="cards-head-counts" title="новые · заучиваемые · к повторению"><span class="c-new">${total.new}</span><span class="c-learn">${total.learn}</span><span class="c-due">${total.due}</span></div>
      </div>
      <div class="deck-list">${rows.join('') || '<div class="cards-empty">Колод пока нет</div>'}</div>
      <div class="cards-actions">
        <button class="cards-btn primary" onclick="Cards.newDeck(null)">＋ Новая колода</button>
        <button class="cards-btn" onclick="Cards.seedExamples()">Создать примерные колоды</button>
        <label class="cards-inline">новых в день <input type="number" min="0" max="500" value="${newPerDay()}" onchange="Cards.setNewPerDay(this.value)"></label>
      </div>
      <div class="cards-legend"><span class="c-new">синие</span> новые · <span class="c-learn">красные</span> заучиваемые · <span class="c-due">зелёные</span> к повторению. Нажмите на название колоды, чтобы учить.</div>`;
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
    S.undo = { before, card: S.current };
    const payload = { state: after.state, step: after.step, due: after.due, interval_days: after.interval_days, ease: after.ease, reps: after.reps, lapses: after.lapses };
    sb(`cards?id=eq.${S.current.id}`, { method: 'PATCH', body: payload }).catch(e => showToast('⚠ Не сохранилось: ' + e.message));
    nextCard(); render();
  }
  async function undo() {
    if (!S.undo) return;
    const { before, card } = S.undo; S.undo = null;
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

  // ── Примерные колоды ─────────────────────────────────────────────────────────
  const EXAMPLES = {
    Cucina: [
      ['frigorifero', 'холодильник', '/friɡoˈrifero/', 'Metti il latte nel frigorifero.', 'Apparecchio usato per conservare i cibi al fresco.'],
      ['caffettiera', 'кофейник', '/kaffetˈtjɛra/', 'La caffettiera è sul fuoco, il caffè sarà pronto tra poco.', 'Recipiente per preparare il caffè.'],
      ['forchetta', 'вилка', '/forˈketta/', 'Mangia la pasta con la forchetta.', 'Posata con i denti usata per prendere il cibo.'],
      ['coltello', 'нож', '/kolˈtɛllo/', 'Attento, il coltello è molto affilato.', 'Strumento con una lama per tagliare.'],
      ['cucchiaio', 'ложка', '/kukˈkjajo/', 'Prendi un cucchiaio per la minestra.', 'Posata concava usata per i cibi liquidi.'],
      ['pentola', 'кастрюля', '/ˈpentola/', 'L\'acqua nella pentola sta bollendo.', 'Recipiente alto per cuocere i cibi.'],
      ['padella', 'сковорода', '/paˈdɛlla/', 'Ho fritto le uova in padella.', 'Recipiente basso e largo con manico per friggere.'],
      ['tovagliolo', 'салфетка', '/tovaʎˈʎɔlo/', 'Pulisciti la bocca con il tovagliolo.', 'Pezzo di stoffa o carta usato a tavola.'],
      ['bicchiere', 'стакан', '/bikˈkjɛre/', 'Mi dai un bicchiere d\'acqua, per favore?', 'Recipiente per bere.'],
      ['piatto', 'тарелка', '/ˈpjatto/', 'I piatti sono nel lavandino.', 'Recipiente piano su cui si serve il cibo.']
    ],
    Casa: [
      ['finestra', 'окно', '/fiˈnɛstra/', 'Apri la finestra, fa caldo.', 'Apertura nel muro che lascia entrare luce e aria.'],
      ['porta', 'дверь', '/ˈpɔrta/', 'Chiudi la porta quando esci.', 'Apertura che permette di entrare e uscire da una stanza.'],
      ['tetto', 'крыша', '/ˈtetto/', 'Il gatto è salito sul tetto.', 'Parte superiore che copre un edificio.'],
      ['scala', 'лестница', '/ˈskala/', 'La camera è in cima alla scala.', 'Serie di gradini per salire o scendere.'],
      ['cucina', 'кухня', '/kuˈtʃina/', 'Facciamo colazione in cucina.', 'Stanza dove si preparano i cibi.'],
      ['camera', 'комната; спальня', '/ˈkamera/', 'La mia camera è piccola ma luminosa.', 'Stanza di una casa, in particolare quella per dormire.'],
      ['bagno', 'ванная', '/ˈbaɲɲo/', 'Il bagno è in fondo al corridoio.', 'Stanza con i servizi igienici.'],
      ['divano', 'диван', '/diˈvano/', 'Ci sediamo sul divano a guardare un film.', 'Sedile imbottito per più persone.'],
      ['armadio', 'шкаф', '/arˈmadjo/', 'I cappotti sono nell\'armadio.', 'Mobile alto con ante per riporre vestiti.'],
      ['tappeto', 'ковёр', '/tapˈpeto/', 'Il cane dorme sul tappeto.', 'Tessuto spesso che copre il pavimento.']
    ]
  };
  async function seedExamples() {
    if (S.decks.some(d => d.name === 'Примеры')) { showToast('Колода «Примеры» уже есть'); return; }
    try {
      const [parent] = await sb('decks', { method: 'POST', body: { name: 'Примеры', parent_id: null } }); S.decks.push(parent);
      for (const [name, words] of Object.entries(EXAMPLES)) {
        const [deck] = await sb('decks', { method: 'POST', body: { name, parent_id: parent.id } }); S.decks.push(deck);
        const notes = await sb('notes', { method: 'POST', body: words.map(w => ({ deck_id: deck.id, word: w[0], translation: w[1], phonetic: w[2], example: w[3], meaning: w[4], pos: 'sostantivo', tags: [name.toLowerCase(), 'esempio'] })) });
        const cards = await sb('cards', { method: 'POST', body: notes.flatMap(n => [{ note_id: n.id, direction: 'it' }, { note_id: n.id, direction: 'ru' }]) });
        S.notes.push(...notes); S.cards.push(...cards.map(c => ({ ...c, dueMs: Date.parse(c.due) || 0 })));
      }
      showToast('✓ Созданы колоды Примеры › Cucina, Casa'); render();
    } catch (e) { showToast('⚠ ' + e.message); }
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
    async open() { S.view = 'decks'; S.build = null; S.browseSelected.clear(); closeOverlay(); render(); if (!S.loaded) { await loadAll(); render(); } },
    async reload() { S.loaded = false; render(); await loadAll(); render(); },
    copySql() { const t = SETUP_SQL; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => showToast('✓ SQL скопирован'), () => { const el = $('cardsSql'); const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); showToast('Выделено — скопируйте вручную'); }); },
    toggleDeck(id) { S.collapsed[id] = !S.collapsed[id]; render(); },
    newDeck, renameDeck, deleteDeck, seedExamples,
    setNewPerDay(v) { try { localStorage.setItem(NEW_PER_DAY_KEY, String(Math.max(0, parseInt(v) || 0))); } catch (e) {} render(); },
    study(id) { study(id, S.view === 'browse' ? S.tagFilter : ''); },
    reveal, answer, undo,
    openAdd(id) { pushView('add'); S.deckId = id; S.view = 'add'; S.build = null; render(); },
    buildFromText, importFile, saveBuild,
    toggleItem(i, v) { S.build.items[i].include = v; render(); },
    resetBuild() { S.build = null; render(); },
    browse(id) { pushView('browse'); S.deckId = id; S.view = 'browse'; S.tagFilter = ''; S.browseSelected.clear(); render(); },
    setTagFilter(t) { S.tagFilter = t; S.browseSelected.clear(); render(); },
    selectNote(id, v) { if (v) S.browseSelected.add(id); else S.browseSelected.delete(id); render(); },
    selectAll(v) { S.browseSelected.clear(); if (v) currentNotes().forEach(n => S.browseSelected.add(n.id)); render(); },
    tagSelected, untagSelected, moveSelected, deleteSelected, editNote, saveNote, closeModal,
    addEntries, pickDeck, pickNewDeck, closePicker,
    _state: S, _schedule: schedule, _parseLines: parseLines, _fmt: fmtInterval
  };
})();
