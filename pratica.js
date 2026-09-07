// ── La Pratica: разбор текста, который написал сам пользователь ───────────────
// Словарь показывает интерес, а не умение. Умение видно только в том, что человек
// написал сам, поэтому разбор своего текста живёт отдельно и пишется в production_log.
// Каждая найденная ошибка одним нажатием уходит в колоду и попадает в повторения.
(function () {
  const MAX_CHARS = 1500;
  const TYPE_RU = {
    grammar: 'грамматика', vocabulary: 'лексика', register: 'регистр',
    'word-order': 'порядок слов', spelling: 'орфография'
  };
  const LESSICO = 'lessico';
  const topicList = () => (typeof GRAMMAR_SUGGESTIONS !== 'undefined' ? GRAMMAR_SUGGESTIONS : []).concat(LESSICO);

  const S = { text: '', result: null, loading: false, error: '', added: new Set(), missingTable: false, noted: false };
  const root = () => $('praticaScreen');
  const esc = s => escapeHtml(s == null ? '' : String(s));
  const pluralRu = (n, one, few, many) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? one : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? few : many; };

  // ── Запрос к модели ──────────────────────────────────────────────────────────
  function buildPrompt(text) {
    return `Вот текст на итальянском языке, который написал изучающий язык (родной язык — русский).

ТЕКСТ:
"""
${text}
"""

Разбери этот текст и верни ТОЛЬКО валидный JSON без markdown:
{
  "issues": [
    {
      "fragment": "точная копия куска текста выше, буква в букву",
      "correction": "исправленный вариант этого же куска",
      "translation": "перевод исправленного варианта на русский, коротко",
      "lemma": "словарная форма исправленного слова: инфинитив для глагола, единственное число мужского рода для существительного и прилагательного. Пустая строка, если правка не про одно слово",
      "lemma_translation": "перевод словарной формы на русский, коротко. Пустая строка, если lemma пустая",
      "type": "одно из: grammar, vocabulary, register, word-order, spelling",
      "topic": "одно из: ${topicList().join(', ')}",
      "explanation": "объяснение по-русски, одно-два предложения"
    }
  ],
  "words_used": ["леммы значимых слов из текста"],
  "good_points": ["что получилось хорошо, по-русски, коротко"],
  "overall": "одно-два предложения по-русски об общем впечатлении"
}

Требования:
- fragment обязан быть точной подстрокой исходного текста: без изменений, без многоточий, без добавленных слов. Бери самый короткий кусок, в котором видна ошибка.
- lemma это словарная форма, а не та, что стоит в предложении: andato → andare, belle → bello, dei libri → libro. Если исправлен порядок слов, предлог внутри оборота или целое выражение, ставь пустую строку.
- Отмечай только то, что носитель счёл бы неверным или неестественным. Не придумывай ошибок там, где текст просто написан не так, как написал бы ты.
- Если ошибок нет, верни пустой массив issues.
- topic только из списка выше. Если ошибка не грамматическая, ставь ${LESSICO}.
- words_used: начальные формы (cercando → cercare, le chiavi → chiave), только значимые слова. Не включай артикли, предлоги, союзы, местоимения и вспомогательные essere и avere.
- Объяснения, переводы и общее впечатление пиши по-русски. Итальянские примеры оставляй по-итальянски.
- Никаких баллов, оценок и уровней.`;
  }

  // Модель иногда возвращает вольную структуру, поэтому приводим ответ к ожидаемому виду сами
  function normalize(raw, text) {
    const topics = topicList();
    const arr = v => Array.isArray(v) ? v : [];
    const issues = arr(raw && raw.issues).map(i => ({
      fragment: String((i && i.fragment) || '').trim(),
      correction: String((i && i.correction) || '').trim(),
      translation: String((i && i.translation) || '').trim(),
      lemma: String((i && i.lemma) || '').trim(),
      lemmaRu: String((i && i.lemma_translation) || '').trim(),
      type: TYPE_RU[i && i.type] ? i.type : 'grammar',
      topic: topics.includes(i && i.topic) ? i.topic : LESSICO,
      explanation: String((i && i.explanation) || '').trim()
    })).filter(i => i.fragment && i.correction && i.fragment !== i.correction);
    const words = arr(raw && raw.words_used).map(w => String(w || '').toLowerCase().trim()).filter(w => w && w.length > 1);
    return {
      text,
      issues,
      words: [...new Set(words)],
      good: arr(raw && raw.good_points).map(g => String(g || '').trim()).filter(Boolean),
      overall: String((raw && raw.overall) || '').trim(),
      marks: []
    };
  }

  // Привязка ошибки к месту в тексте: fragment должен быть точной подстрокой.
  // Идём слева направо, чтобы повторы не схлопывались в одно место; что не нашлось
  // или налезло на соседнюю ошибку — просто не подсвечиваем, карточка всё равно будет в списке.
  function anchor(res) {
    const found = [];
    let cursor = 0;
    res.issues.forEach((is, i) => {
      let at = res.text.indexOf(is.fragment, cursor);
      if (at === -1) at = res.text.indexOf(is.fragment);
      if (at === -1) return;
      found.push({ i, start: at, end: at + is.fragment.length });
      cursor = at + is.fragment.length;
    });
    found.sort((a, b) => a.start - b.start);
    const marks = [];
    let lastEnd = -1;
    found.forEach(m => { if (m.start >= lastEnd) { marks.push(m); lastEnd = m.end; } });
    res.marks = marks;
    res.anchored = new Set(marks.map(m => m.i));
  }

  async function analyze() {
    const text = (S.text || '').trim();
    if (!text) { showToast('Вставьте текст на итальянском'); return; }
    if (S.loading) return;
    const cut = text.slice(0, MAX_CHARS);
    if (cut.length < text.length) showToast(`Разбираю первые ${MAX_CHARS} знаков`);
    S.loading = true; S.error = ''; S.result = null; S.added.clear(); render();
    try {
      // Задача не словарная, поэтому запрос идёт в Gemini: тут важны русские объяснения
      const raw = await llmJson(buildPrompt(cut), 'pratica');
      const res = normalize(raw, cut);
      anchor(res);
      S.result = res;
      saveLog(res);
    } catch (e) {
      S.error = /NO_GEMINI_KEY/.test(e.message || '') ? 'Для разбора нужен ключ Gemini' : (e.message || 'Не получилось разобрать текст');
    } finally {
      S.loading = false; render();
    }
  }

  // ── Журнал продукции ─────────────────────────────────────────────────────────
  async function saveLog(res) {
    if (S.missingTable) return;
    if (!(window.Auth && Auth.user())) return; // без входа сохранять некуда: строки личные
    try {
      const r = await fetch(`${SB_URL}/rest/v1/production_log`, {
        method: 'POST',
        headers: { ...SB_H, Prefer: 'return=minimal' },
        body: JSON.stringify({
          source: 'text', raw_text: res.text, words_used: res.words,
          issues: res.issues, good_points: res.good
        })
      });
      if (r.ok) return;
      const data = await r.json().catch(() => ({}));
      if (data.code === 'PGRST205' || data.code === '42P01' || /Could not find the table/i.test(data.message || '')) {
        S.missingTable = true;
        showToast('⚠ Нет таблицы production_log: выполните SQL из настроек');
      } else {
        showToast('⚠ Разбор не сохранился: ' + (data.message || `HTTP ${r.status}`));
      }
    } catch (e) { showToast('⚠ Разбор не сохранился: ' + e.message); }
  }

  // ── Разметка текста ──────────────────────────────────────────────────────────
  // Свой обход вместо makeClickable: текст пользовательский, его надо экранировать,
  // а экранирование до makeClickable сделало бы кликабельным «amp» внутри &amp;
  const WORD_RE = /[A-Za-zÀ-öø-ÿ']+/g;
  function clickableEscaped(text) {
    let out = '', last = 0, m;
    WORD_RE.lastIndex = 0;
    while ((m = WORD_RE.exec(text)) !== null) {
      out += esc(text.slice(last, m.index));
      const w = m[0];
      out += w.replace(/'/g, '').length < 3
        ? esc(w)
        : `<span class="clickable-word" data-word="${esc(w)}" onclick="handleWordClick('${w.replace(/'/g, "\\'")}')">${esc(w)}</span>`;
      last = m.index + w.length;
    }
    return out + esc(text.slice(last));
  }

  function markedTextHtml(res) {
    let out = '', last = 0;
    res.marks.forEach(m => {
      const is = res.issues[m.i];
      out += clickableEscaped(res.text.slice(last, m.start));
      out += `<span class="pr-mark t-${esc(is.type)}" onclick="Pratica.jumpTo(${m.i})" title="${esc(is.correction)}">${esc(res.text.slice(m.start, m.end))}</span>`;
      last = m.end;
    });
    out += clickableEscaped(res.text.slice(last));
    return out.replace(/\n/g, '<br>');
  }

  // Предложение вокруг ошибки — оно станет примером на карточке. Исправляем в нём ВСЕ найденные
  // ошибки, а не только текущую: иначе на карточку уедет пример с оставшейся второй ошибкой.
  function sentenceAround(res, i) {
    const mark = res.marks.find(m => m.i === i);
    const is = res.issues[i];
    if (!mark) return is.correction;
    const t = res.text;
    let start = 0, end = t.length;
    for (let p = mark.start - 1; p >= 0; p--) if ('.!?\n'.includes(t[p])) { start = p + 1; break; }
    for (let p = mark.end; p < t.length; p++) if ('.!?\n'.includes(t[p])) { end = p + 1; break; }
    let sentence = t.slice(start, end);
    // Правки идут справа налево, чтобы уже применённые не сдвигали координаты следующих
    res.marks.filter(m => m.start >= start && m.end <= end)
      .sort((a, b) => b.start - a.start)
      .forEach(m => { sentence = sentence.slice(0, m.start - start) + res.issues[m.i].correction + sentence.slice(m.end - start); });
    sentence = sentence.trim();
    return sentence || is.correction;
  }

  // ── Экран ────────────────────────────────────────────────────────────────────
  function inputHtml() {
    const n = (S.text || '').length;
    return `
      <div class="pr-intro">Вставьте свой текст на итальянском: письмо, запись в дневнике, ответ в чате.
        Разбор смотрит только на то, что вы написали сами.</div>
      ${(window.Auth && Auth.user()) ? '' : `<div class="pr-note">Разобрать текст можно и так, но чтобы разборы копились в вашем профиле, нужно
        <u style="cursor:pointer" onclick="Auth.require('Войдите, чтобы сохранять разборы')">войти в аккаунт</u>.</div>`}
      <div class="pr-input-wrap">
        <textarea class="pr-input" id="prInput" spellcheck="false" autocapitalize="off"
          placeholder="Ieri sono andato al mercato con mia sorella…"
          oninput="Pratica.onInput(this)">${esc(S.text)}</textarea>
        <div class="pr-input-foot">
          <span class="pr-count ${n > MAX_CHARS ? 'over' : ''}" id="prCount">${n} / ${MAX_CHARS}</span>
          <button class="cards-btn primary" id="prGo" onclick="Pratica.analyze()" ${S.loading ? 'disabled' : ''}>
            ${S.loading ? 'Analizzo…' : 'Analizza'}
          </button>
        </div>
      </div>
      ${S.error ? `<div class="pr-error">${esc(S.error)}${/ключ/.test(S.error) ? ` — <u style="cursor:pointer" onclick="showApiKeyScreen()">указать ключ</u>` : ''}</div>` : ''}
      ${S.loading ? `<div class="pr-loading">Читаю текст<span class="loading-dots"><span></span><span></span><span></span></span></div>` : ''}`;
  }

  function issueHtml(res, i) {
    const is = res.issues[i];
    const added = S.added.has(i);
    const topicBtn = is.topic === LESSICO
      ? `<span class="tag-chip">${esc(is.topic)}</span>`
      : `<button class="tag-chip pr-topic" onclick="Pratica.openTopic('${esc(is.topic).replace(/'/g, "&#39;")}')" title="открыть правило">${esc(is.topic)}</button>`;
    return `
      <div class="pr-issue" id="prIssue${i}">
        <div class="pr-issue-head">
          <span class="pr-bad">${esc(is.fragment)}</span>
          <span class="pr-arrow">→</span>
          <span class="pr-good">${esc(is.correction)}</span>
        </div>
        ${is.translation ? `<div class="pr-issue-ru">${esc(is.translation)}</div>` : ''}
        ${is.explanation ? `<div class="pr-issue-expl">${esc(is.explanation)}</div>` : ''}
        <div class="pr-issue-foot">
          ${topicBtn}<span class="pr-type">${esc(TYPE_RU[is.type] || is.type)}</span>
          ${res.anchored.has(i) ? '' : '<span class="pr-type pr-loose" title="не удалось найти этот кусок в тексте">без привязки</span>'}
          <button class="cards-btn pr-add ${added ? 'done' : ''}" onclick="Pratica.toDeck(${i})" ${added ? 'disabled' : ''}>
            ${added ? '✓ в колоде' : `${svgIcon('deck')} в колоду`}
          </button>
        </div>
      </div>`;
  }

  function resultHtml() {
    const res = S.result;
    const n = res.issues.length;
    const newWords = freshWords(res);
    return `
      <div class="pr-head">
        <div class="cards-title small">Разбор</div>
        <div class="pr-head-count">${n ? `${n} ${pluralRu(n, 'замечание', 'замечания', 'замечаний')}` : 'без замечаний'}</div>
        <button class="cards-btn" onclick="Pratica.reset()">Новый текст</button>
      </div>
      ${res.overall ? `<div class="pr-overall">${esc(res.overall)}</div>` : ''}
      <div class="pr-text">${markedTextHtml(res)}</div>
      ${res.good.length ? `<div class="pr-good-box"><div class="pr-box-label">Хорошо получилось</div><ul>${res.good.map(g => `<li>${esc(g)}</li>`).join('')}</ul></div>` : ''}
      ${n ? `<div class="pr-issues">${res.issues.map((_, i) => issueHtml(res, i)).join('')}</div>`
          : `<div class="pr-none">Ошибок не нашлось. Слова из текста всё равно записаны в ваш активный словарь.</div>`}
      ${newWords.length ? `
        <div class="pr-words">
          <div class="pr-box-label">Слов из текста нет в колодах: ${newWords.length}</div>
          <div class="pr-word-chips">${newWords.slice(0, 40).map(w => `<span class="tag-chip">${esc(w)}</span>`).join('')}</div>
          <button class="cards-btn" onclick="Pratica.addWords()">${svgIcon('deck')} добавить слова в колоду</button>
        </div>` : ''}`;
  }

  function freshWords(res) {
    const known = new Set(window.Cards && Cards.allWords ? Cards.allWords() : []);
    return res.words.filter(w => !known.has(w));
  }

  function render() {
    const el = root(); if (!el) return;
    el.innerHTML = S.result ? resultHtml() : inputHtml();
  }

  // ── Действия ─────────────────────────────────────────────────────────────────
  function toDeck(i) {
    const res = S.result; if (!res || !res.issues[i]) return;
    const is = res.issues[i];
    // В колоду идёт словарная форма, а не та, что стояла в предложении: учить «andato» бессмысленно,
    // учить надо «andare». Если правка была не про одно слово, кладём исправленный кусок как есть.
    const word = is.lemma || is.correction;
    const ru = (is.lemma && is.lemmaRu) || is.translation || is.explanation;
    // Форма словарной статьи: её ждёт Cards.addEntries, он же покажет выбор колоды
    window.Cards && Cards.addEntries([{
      word,
      russian: { main: ru },
      meanings: [{ example: sentenceAround(res, i), definition: is.explanation }]
    }]);
    S.added.add(i); render();
  }

  function addWords() {
    const res = S.result; if (!res) return;
    const words = freshWords(res);
    if (!words.length) { showToast('Все слова уже в колодах'); return; }
    window.Cards && Cards.addEntries(words.map(w => ({ word: w })));
  }

  function openTopic(topic) {
    if (!topic || topic === LESSICO) return;
    currentMode = 'grammar'; applyModeUI('grammar');
    $('searchInput').value = topic;
    lookupGrammar(topic);
  }

  function jumpTo(i) {
    const el = document.getElementById('prIssue' + i); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  }

  // ── Публичный интерфейс ──────────────────────────────────────────────────────
  window.Pratica = {
    open() { if (!S.result) S.error = ''; render(); },
    render,
    analyze,
    onInput(el) {
      S.text = el.value;
      const c = document.getElementById('prCount');
      if (c) { c.textContent = `${S.text.length} / ${MAX_CHARS}`; c.classList.toggle('over', S.text.length > MAX_CHARS); }
    },
    reset() { S.result = null; S.error = ''; S.added.clear(); render(); const t = document.getElementById('prInput'); if (t) t.focus(); },
    toDeck, addWords, openTopic, jumpTo,
    _state: S
  };
})();
