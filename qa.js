// ── Проверка словаря: пересборка, перепроверка и исправление кэша ──────────────
// Всё, что лежит в кэше, собрано старой склейкой или не дождалось проверяющего, и по одной статье
// это не чинится — здесь тот же конвейер прогоняется по кэшу целиком без экрана.
(function () {
  const S = { stop: false, batch: { running: false, mode: '', done: 0, total: 0, log: [], counts: {} } };
  // После срыва в лимит сбавляем темп на минуту, иначе следующие слова тоже останутся без проверки.
  // worker.js заворачивает сбой проверяющего (Groq и т.п.) в HTTP 502 — реальный код ответа теряется,
  // поэтому срыв ловим по тексту ошибки, а не по res.status
  const isRateLimitErr = msg => /\b429\b|rate.?limit|too many requests|RESOURCE_EXHAUSTED|quota/i.test(String(msg || ''));
  const noteIfRateLimited = msg => { if (isRateLimitErr(msg)) window._lastRateLimitAt = Date.now(); };
  const pause = async base => { const recent = Date.now() - (window._lastRateLimitAt || 0) < 60000; await sleep(recent ? 15000 : base); };
  const root = () => $('qaScreen');
  const esc = s => escapeHtml(s == null ? '' : String(s));
  const isAdmin = () => !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ── Перепроверка: только вердикт, без перегенерации ──────────────────────────
  // Всё, что не дождалось проверки из-за лимитов, лежит черновиком с пометкой. Статью писать заново
  // не нужно, нужен только проверяющий.
  async function runRecheck() {
    const B = S.batch;
    if (B.running) return;
    if (!(window.Auth && Auth.user())) { showToast('Нужно войти'); return; }
    const res = await fetch(`${SB_URL}/rest/v1/dictionary?select=word,p:data->>pipeline,st:data->>status&limit=3000`, { headers: SB_H });
    if (!res.ok) { showToast('Не удалось прочитать кэш: HTTP ' + res.status); return; }
    const words = [...new Set((await res.json()).filter(r => r.p === '2' && r.st === 'draft' && r.word && !/\s/.test(r.word)).map(r => r.word))];
    if (!words.length) { showToast('Непроверенных статей нет'); return; }
    B.running = true; B.mode = 'Перепроверка'; S.stop = false; B.done = 0; B.total = words.length; B.log = []; B.counts = { checked: 0, flagged: 0, draft: 0, error: 0 }; render();
    for (const w of words) {
      if (S.stop) break;
      try {
        const e = await recheckArticle(w);
        const st = e ? (e.status || 'draft') : 'error';
        B.counts[st] = (B.counts[st] || 0) + 1;
        B.log.unshift(`${w} — ${st}${e && e.checkNotes && e.checkNotes.length ? ': ' + e.checkNotes.join('; ') : ''}`);
        noteIfRateLimited([...(e && e.checkNotes || []), ...(e && e.checkWarnings || [])].join(' '));
      } catch (err) { B.counts.error++; B.log.unshift(`${w} — ошибка: ${err.message || err}`); noteIfRateLimited(err.message); }
      B.done++; if (B.log.length > 200) B.log.length = 200; render();
      await pause(1500);
    }
    B.running = false; render();
  }

  // ── Исправление флагнутых: правка по замечаниям, а не переписывание с нуля ───
  // Вердикт проверяющего до сих пор был тупиком: пометка лежала в статье, и разбирать её было некому.
  // Здесь по каждому замечанию идёт адресная правка и новый вердикт; статья, не вытянувшая двух
  // попыток, остаётся flagged — вот её и стоит смотреть глазами.
  async function runFix() {
    const B = S.batch;
    if (B.running) return;
    if (!(window.Auth && Auth.user())) { showToast('Нужно войти'); return; }
    const res = await fetch(`${SB_URL}/rest/v1/dictionary?select=word,st:data->>status,ft:data->>fixTries&limit=3000`, { headers: SB_H });
    if (!res.ok) { showToast('Не удалось прочитать кэш: HTTP ' + res.status); return; }
    // Статьи, которым исправление уже не помогло дважды, пропускаем: дальше это работа для человека
    const words = [...new Set((await res.json()).filter(r => r.word && r.st === 'flagged' && (parseInt(r.ft) || 0) < FIX_MAX_TRIES).map(r => r.word))];
    if (!words.length) { showToast('Статей с расхождениями нет'); return; }
    B.running = true; B.mode = 'Исправление'; S.stop = false; B.done = 0; B.total = words.length; B.log = []; B.counts = { checked: 0, flagged: 0, draft: 0, error: 0 }; render();
    for (const w of words) {
      if (S.stop) break;
      try {
        const e = await fixArticle(w);
        const st = e ? (e.status || 'draft') : 'error';
        B.counts[st] = (B.counts[st] || 0) + 1;
        B.log.unshift(`${w} — ${st}${e && e.checkNotes && e.checkNotes.length ? ': ' + e.checkNotes.join('; ') : ''}`);
        noteIfRateLimited([...(e && e.checkNotes || []), ...(e && e.checkWarnings || [])].join(' '));
      } catch (err) { B.counts.error++; B.log.unshift(`${w} — ошибка: ${err.message || err}`); noteIfRateLimited(err.message); }
      B.done++; if (B.log.length > 200) B.log.length = 200; render();
      await pause(1500);
    }
    B.running = false; render();
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
    B.running = true; B.mode = 'Пересборка'; S.stop = false; B.done = 0; B.total = words.length; B.log = []; B.counts = { checked: 0, flagged: 0, draft: 0, error: 0 }; render();
    for (const w of words) {
      if (S.stop) break;
      try {
        const e = await lookupWord(w, 0, { force: true, headless: true });
        const st = e && !e.redirects ? (e.status || 'draft') : 'error';
        B.counts[st] = (B.counts[st] || 0) + 1;
        B.log.unshift(`${w} — ${st}${e && e.checkNotes && e.checkNotes.length ? ': ' + e.checkNotes.join('; ') : ''}`);
        noteIfRateLimited([...(e && e.checkNotes || []), ...(e && e.checkWarnings || [])].join(' '));
      } catch (err) { B.counts.error++; B.log.unshift(`${w} — ошибка: ${err.message || err}`); noteIfRateLimited(err.message); }
      B.done++; if (B.log.length > 200) B.log.length = 200; render();
      await pause(1500);
    }
    B.running = false; render();
  }

  // ── Экран ────────────────────────────────────────────────────────────────────
  function render() {
    const el = root(); if (!el) return;
    if (!isAdmin()) { el.innerHTML = '<div class="cards-empty">Проверка словаря доступна только владельцу сайта</div>'; return; }
    const B = S.batch;
    el.innerHTML = `
      <div class="qa-head">
        <div class="cards-title small">Проверка словаря</div>
        ${B.running ? `<button class="cards-btn danger" onclick="Qa.stop()">Стоп</button>` : ''}
      </div>
      <div class="qa-batch">
        <div class="qa-intro">«Пересобрать» заново пишет и проверяет всё, что собрано старой склейкой; уже пересобранное пропускается. «Перепроверить» трогает только статьи без вердикта: те, что не дождались проверяющего из-за лимитов, и статью не переписывает. «Исправить по замечаниям» берёт статьи с расхождениями и правит ровно то, на что указал проверяющий, после чего просит новый вердикт; не вытянувшие двух попыток остаются помеченными. После срыва в лимит темп сам сбавляется на минуту.</div>
        ${B.running || B.total ? `<div class="qa-note">${esc(B.mode)}</div><div class="qa-progress"><i style="width:${B.total ? Math.round(B.done / B.total * 100) : 0}%"></i></div>
          <div class="qa-note">${B.done} / ${B.total} · проверено ${B.counts.checked || 0} · с расхождениями ${B.counts.flagged || 0} · не проверено ${B.counts.draft || 0} · ошибок ${B.counts.error || 0}</div>
          <div class="qa-log">${B.log.map(esc).join('<br>')}</div>` : ''}
        ${B.running ? '' : `<div class="cards-actions"><button class="cards-btn" onclick="Qa.runBatch()">${svgIcon('refresh')} Пересобрать кэш</button><button class="cards-btn" onclick="Qa.runRecheck()">${svgIcon('chart')} Перепроверить непроверенные</button><button class="cards-btn" onclick="Qa.runFix()">${svgIcon('tool')} Исправить по замечаниям</button></div>`}
      </div>`;
  }

  window.Qa = {
    open() {
      if (!isAdmin()) { showToast('Проверка словаря доступна только владельцу сайта'); return; }
      currentMode = 'dict'; applyModeUI('dict'); showState('qa'); render();
    },
    render, runBatch, runRecheck, runFix,
    stop() { S.stop = true; showToast('Останавливаю после текущего слова'); },
    _state: S
  };
})();
