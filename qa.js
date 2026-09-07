// ── Проверка словаря: золотой набор и пересборка кэша ─────────────────────────
// Правки промпта и склейки проверяются не по скриншоту, а прогоном по набору коварных слов
// с заранее известными фактами. Тот же конвейер без экрана пересобирает накопленный кэш:
// всё, что лежит там, собрано старой склейкой и по одной статье не чинится.
(function () {
  // Ожидания — только факты, в которых нет сомнений. ru проверяется по главному переводу и вариантам.
  const GOLDEN = [
    { word: 'porto',   pos: 'sostantivo', gender: 'm.', ru: /порт|гаван/i, forms: ['porgere', 'portare'], homographsMin: 2 },
    { word: 'puzza',   pos: 'sostantivo', gender: 'f.', ru: /вон|злов|смрад/i },
    { word: 'sito',    pos: 'sostantivo', gender: 'm.', ru: /сайт|мест/i },
    { word: 'porta',   pos: 'sostantivo', gender: 'f.', ru: /двер/i, forms: ['portare'] },
    { word: 'canto',   pos: 'sostantivo', gender: 'm.', ru: /пени|песн|угол/i, forms: ['cantare'] },
    { word: 'casa',    pos: 'sostantivo', gender: 'f.', ru: /дом/i },
    { word: 'legge',   pos: 'sostantivo', gender: 'f.', ru: /закон/i, forms: ['leggere'] },
    { word: 'sale',    pos: 'sostantivo', gender: 'm.', ru: /сол/i, forms: ['salire'] },
    { word: 'pesca',   pos: 'sostantivo', gender: 'f.', ru: /персик|рыбал|рыбн|лов/i, forms: ['pescare'] },
    { word: 'chiave',  pos: 'sostantivo', gender: 'f.', ru: /ключ/i },
    { word: 'mare',    pos: 'sostantivo', gender: 'm.', ru: /мор/i },
    { word: 'tempo',   pos: 'sostantivo', gender: 'm.', ru: /врем|погод/i },
    { word: 'vita',    pos: 'sostantivo', gender: 'f.', ru: /жизн|тали/i },
    { word: 'gatto',   pos: 'sostantivo', gender: 'm.', ru: /кот|кош/i },
    { word: 'ancora',  pos: /avverbio|sostantivo/, ru: /ещё|еще|якор/i },
    { word: 'fine',    pos: /sostantivo|aggettivo/, ru: /конец|кон[её]ц|цел|тонк|изящ/i },
    { word: 'volto',   pos: /sostantivo|aggettivo/, ru: /лиц|обращ|поверн/i, forms: ['volgere'] },
    { word: 'piano',   pos: /sostantivo|aggettivo|avverbio/, ru: /этаж|план|тих|медлен|ровн|плоск/i },
    { word: 'andare',  pos: 'verbo', ru: /идти|ехать|ходить|пойти/i },
    { word: 'essere',  pos: 'verbo', ru: /быть/i },
    { word: 'mangiare', pos: 'verbo', ru: /есть|кушать|съе/i },
    { word: 'bello',   pos: 'aggettivo', ru: /красив/i },
    { word: 'rosso',   pos: 'aggettivo', ru: /красн|рыж/i },
    { word: 'sempre',  pos: 'avverbio', ru: /всегда/i },
    { word: 'perché',  pos: /congiunzione|avverbio/, ru: /почему|потому/i }
  ];

  const S = { rows: {}, running: false, stop: false, batch: { running: false, done: 0, total: 0, log: [], counts: {} } };
  const root = () => $('qaScreen');
  const esc = s => escapeHtml(s == null ? '' : String(s));
  const isAdmin = () => !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── Сверка статьи с ожиданиями ───────────────────────────────────────────────
  const testPos = (want, have) => want instanceof RegExp ? want.test(have) : String(have).startsWith(want);
  function check(g, e) {
    const pos = cleanPos(e.partOfSpeech).toLowerCase();
    const ruText = [e.russian && e.russian.main, e.russian && e.russian.alternatives].filter(Boolean).join(' ');
    const forms = (e.alsoForms || []).map(l => String(l.lemma || '').toLowerCase());
    return {
      pos: testPos(g.pos, pos),
      gender: g.gender ? e.gender === g.gender : null,
      ru: g.ru.test(ruText),
      forms: g.forms ? g.forms.every(f => forms.includes(f)) : null,
      homos: g.homographsMin ? (e.homographs || []).length >= g.homographsMin : null
    };
  }
  const allOk = c => Object.values(c).every(v => v !== false);

  // ── Прогон золотого набора ───────────────────────────────────────────────────
  async function runGolden() {
    if (S.running) return;
    if (!(window.Auth && Auth.user())) { showToast('Нужно войти: статьи пишутся в общий кэш'); return; }
    S.running = true; S.stop = false; S.rows = {}; render();
    for (const g of GOLDEN) {
      if (S.stop) break;
      S.rows[g.word] = { state: 'running' }; render();
      try {
        const e = await lookupWord(g.word, 0, { force: true, skipChooser: true, headless: true });
        if (!e || e.redirects) S.rows[g.word] = { state: 'error', note: e && e.redirects ? 'перенаправление на ' + e.redirects.join(', ') : 'нет статьи' };
        else S.rows[g.word] = { state: 'done', checks: check(g, e), status: e.status, notes: e.checkNotes || [],
          got: { pos: cleanPos(e.partOfSpeech), gender: e.gender || '', ru: (e.russian && e.russian.main) || '', llm: e.llm || '' } };
      } catch (err) { S.rows[g.word] = { state: 'error', note: err.message || String(err) }; }
      render();
      await sleep(1200); // лимиты запросов в минуту у бесплатных ключей
    }
    S.running = false; render();
  }

  // ── Пересборка кэша: всё, что собрано не текущим конвейером ──────────────────
  async function runBatch() {
    const B = S.batch;
    if (B.running) return;
    if (!(window.Auth && Auth.user())) { showToast('Нужно войти'); return; }
    const res = await fetch(`${SB_URL}/rest/v1/dictionary?select=word,p:data->>pipeline&limit=3000`, { headers: SB_H });
    if (!res.ok) { showToast('Не удалось прочитать кэш: HTTP ' + res.status); return; }
    // Выражения из нескольких слов идут своим путём и без экрана не собираются — пропускаем
    const words = [...new Set((await res.json()).filter(r => r.p !== '2' && r.word && !/\s/.test(r.word)).map(r => r.word))];
    if (!words.length) { showToast('Весь кэш уже собран новым конвейером'); return; }
    if (!confirm(`Пересобрать ${words.length} статей? Это два запроса к моделям на каждую, можно остановить в любой момент.`)) return;
    B.running = true; S.stop = false; B.done = 0; B.total = words.length; B.log = []; B.counts = { checked: 0, flagged: 0, draft: 0, error: 0 }; render();
    for (const w of words) {
      if (S.stop) break;
      try {
        const e = await lookupWord(w, 0, { force: true, skipChooser: true, headless: true });
        const st = e && !e.redirects ? (e.status || 'draft') : 'error';
        B.counts[st] = (B.counts[st] || 0) + 1;
        B.log.unshift(`${w} — ${st}${e && e.checkNotes && e.checkNotes.length ? ': ' + e.checkNotes.join('; ') : ''}`);
      } catch (err) { B.counts.error++; B.log.unshift(`${w} — ошибка: ${err.message || err}`); }
      B.done++; if (B.log.length > 200) B.log.length = 200; render();
      await sleep(1500);
    }
    B.running = false; render();
  }

  // ── Экран ────────────────────────────────────────────────────────────────────
  const mark = v => v === null ? '<span class="qa-na">·</span>' : v ? '<span class="qa-ok">✓</span>' : '<span class="qa-bad">✗</span>';
  function rowHtml(g) {
    const r = S.rows[g.word];
    if (!r) return `<tr><td class="qa-word">${esc(g.word)}</td><td colspan="7" class="qa-note">ещё не прогонялось</td></tr>`;
    if (r.state === 'running') return `<tr><td class="qa-word">${esc(g.word)}</td><td colspan="7" class="qa-note">собираю…</td></tr>`;
    if (r.state === 'error') return `<tr><td class="qa-word">${esc(g.word)}</td><td colspan="7" class="qa-bad">${esc(r.note)}</td></tr>`;
    const c = r.checks;
    return `<tr>
      <td class="qa-word">${esc(g.word)}</td>
      <td>${mark(allOk(c))}</td>
      <td>${mark(c.pos)} <span class="qa-note">${esc(r.got.pos)}</span></td>
      <td>${mark(c.gender)} <span class="qa-note">${esc(r.got.gender)}</span></td>
      <td>${mark(c.ru)} <span class="qa-note">${esc(r.got.ru)}</span></td>
      <td>${mark(c.forms)}</td>
      <td>${mark(c.homos)}</td>
      <td><span class="qa-status ${esc(r.status)}">${esc(r.status || '—')}</span>${r.notes.length ? `<div class="qa-note">${r.notes.map(esc).join('<br>')}</div>` : ''}<div class="qa-note">${esc(r.got.llm)}</div></td>
    </tr>`;
  }
  function render() {
    const el = root(); if (!el) return;
    if (!isAdmin()) { el.innerHTML = '<div class="cards-empty">Проверка словаря доступна только владельцу сайта</div>'; return; }
    const done = Object.values(S.rows).filter(r => r.state === 'done');
    const good = done.filter(r => allOk(r.checks)).length;
    const B = S.batch;
    el.innerHTML = `
      <div class="qa-head">
        <div class="cards-title small">Проверка словаря</div>
        ${S.running || B.running ? `<button class="cards-btn danger" onclick="Qa.stop()">Стоп</button>` : `<button class="cards-btn primary" onclick="Qa.runGolden()">Прогнать набор · ${GOLDEN.length}</button>`}
      </div>
      <div class="qa-intro">Каждое слово собирается заново тем же конвейером, что и обычный поиск, и сверяется с ожиданиями: часть речи, род, перевод, сноски на другие слова, омографы. Статус — вердикт проверяющей модели.${done.length ? ` Сейчас: ${good} из ${done.length} без расхождений.` : ''}</div>
      <div style="overflow-x:auto"><table class="qa-table">
        <thead><tr><th>слово</th><th>всё</th><th>часть речи</th><th>род</th><th>перевод</th><th>формы</th><th>омографы</th><th>проверка</th></tr></thead>
        <tbody>${GOLDEN.map(rowHtml).join('')}</tbody>
      </table></div>
      <div class="qa-batch">
        <div class="cards-title small">Пересборка кэша</div>
        <div class="qa-intro">Все статьи, собранные старой склейкой, пересобираются новым конвейером и проверяются. Уже пересобранные пропускаются, поэтому процесс можно останавливать и продолжать.</div>
        ${B.running || B.total ? `<div class="qa-progress"><i style="width:${B.total ? Math.round(B.done / B.total * 100) : 0}%"></i></div>
          <div class="qa-note">${B.done} / ${B.total} · проверено ${B.counts.checked || 0} · с расхождениями ${B.counts.flagged || 0} · не проверено ${B.counts.draft || 0} · ошибок ${B.counts.error || 0}</div>
          <div class="qa-log">${B.log.map(esc).join('<br>')}</div>` : ''}
        ${B.running ? '' : `<div class="cards-actions"><button class="cards-btn" onclick="Qa.runBatch()">${svgIcon('refresh')} Пересобрать кэш</button></div>`}
      </div>`;
  }

  window.Qa = {
    open() {
      if (!isAdmin()) { showToast('Проверка словаря доступна только владельцу сайта'); return; }
      currentMode = 'dict'; applyModeUI('dict'); showState('qa'); render();
    },
    render, runGolden, runBatch,
    stop() { S.stop = true; showToast('Останавливаю после текущего слова'); },
    _golden: GOLDEN, _state: S
  };
})();
