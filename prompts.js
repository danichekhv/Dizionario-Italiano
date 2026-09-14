// ── Промпты сборки словарной статьи ─────────────────────────────────────────────
// Раньше эти строки жили в app.js и звали модель прямо с ключа пользователя. Теперь их строит
// только Cloudflare Worker (worker.js), общим ключом владельца — браузер отправляет структурированные
// данные (слово, факты Викисловаря, статью, замечания), а не готовый текст промпта.
// Файл — обычный IIFE без import/export: Worker подключает его как side-effect import
// (`import './prompts-article.js'`), self в его isolate — общий глобальный объект.
(function (root) {

  // Темы слов: та же таксономия, что в легенде графа (graph.js).
  const CATEGORY_KEYS = ['cibo','bevande','cucina','natura','animali','piante','geografia','clima','tempo','persone','famiglia','corpo','salute','emozioni','carattere','casa','oggetti','vestiti','città','viaggio','trasporti','lavoro','scuola','scienza','tecnologia','denaro','diritto','politica','società','cultura','arte','musica','sport','comunicazione','azioni','movimento','pensiero','quantità','astratto','grammatica','altro'];
  const CATEGORY_PROMPT = CATEGORY_KEYS.join(' / ') + ' — choose the single most specific one; use altro only if nothing fits';

  // Пометы употребления. Без них статья врёт: у «sito» устаревшее «расположенный» и диалектное
  // «вонь» стоят рядом с обычным значением и выглядят как равноправные.
  const USAGE_RU = {
    obsolete: 'устар.', archaic: 'устар.', dated: 'устар.', historical: 'истор.',
    dialectal: 'диал.', regional: 'регион.', tuscan: 'тоскан.', 'southern italy': 'юж.',
    vulgar: 'вульг.', offensive: 'груб.', derogatory: 'пренебр.', slang: 'сленг',
    colloquial: 'разг.', informal: 'разг.', familiar: 'разг.',
    rare: 'редк.', uncommon: 'редк.', literary: 'книжн.', poetic: 'поэт.', formal: 'офиц.',
    figurative: 'перен.', humorous: 'шутл.', euphemistic: 'эвфем.',
    technical: 'спец.', medicine: 'мед.', law: 'юр.', nautical: 'мор.', botany: 'бот.',
    zoology: 'зоол.', anatomy: 'анат.', music: 'муз.', religion: 'религ.', military: 'воен.',
    // Итальянские пометы: модель пишет толкование по-итальянски и часто начинает его со скобки
    letterario: 'книжн.', raro: 'редк.', arcaico: 'устар.', antiquato: 'устар.', storico: 'истор.',
    dialettale: 'диал.', regionale: 'регион.', volgare: 'вульг.', spregiativo: 'пренебр.',
    familiare: 'разг.', colloquiale: 'разг.', informale: 'разг.', gergale: 'сленг',
    figurato: 'перен.', poetico: 'поэт.', formale: 'офиц.', scherzoso: 'шутл.', eufemistico: 'эвфем.',
    tecnico: 'спец.', medicina: 'мед.', diritto: 'юр.', marina: 'мор.', botanica: 'бот.',
    zoologia: 'зоол.', anatomia: 'анат.', musica: 'муз.', religione: 'религ.', militare: 'воен.'
  };

  // Часть речи без «sostantivo/aggettivo»-комбинаций из Free Dictionary — только для заголовка
  // промпта проверки значений; на сохранённую статью не влияет.
  function cleanPos(pos) {
    const s = String(pos || '').trim();
    if (!/[\/,]/.test(s)) return s;
    return s.split(/\s*[\/,]\s*/).map(p => p.trim()).filter(Boolean)[0] || s;
  }

  // Русский Викисловарь больше не соперник, а подсказка внутри промпта: его список плоский
  // на все слова этого написания, поэтому что из него подходит, решает модель, которая видит глосс.
  function ruHintRule(hint) {
    if (!hint || !hint.length) return '';
    return `\nRussian Wiktionary lists these Russian words for this spelling, grouped by the part of speech it gives them (a group may belong to a DIFFERENT word spelled the same): ${hint.join(' | ')}. Use a word only if its part of speech is the one above and it translates the sense described above; otherwise ignore the whole list.`;
  }

  // ── Гибридный путь: факты уже есть от Викисловаря, модель дописывает остальное ─────────────────
  function fdCompletionPrompt(base, opts = {}) {
    const senseLines = base.senses.map((s, i) =>
      `${i + 1}. ${s.label ? '(' + s.label + ') ' : ''}${s.gloss}${s.example ? ` — e.g. "${s.example}"` : ''}`).join('\n');
    const haveRelated = (base.relatedWords || []).slice(0, 8);
    const homos = base.homographs || [];
    const homoLines = homos.map((h, i) => `${i + 1}. ${h.partOfSpeech}${h.gender ? ` (${h.gender})` : ''}${h.phonetic ? ` ${h.phonetic}` : ''}: ${h.glosses.join('; ')}`).join('\n');
    const meaningsRule = base.senses.length
      ? `cover every known sense above, then add any frequent present-day sense of THIS word (same part of speech) that is missing from that list. Never add a sense that belongs to one of the homographs listed below — those are other words. Order by how common the sense is in Italian today: obsolete, dialectal and rare senses go last. Reuse a given example if it is a natural full sentence, otherwise write your own.`
      : `1-3 items ordered from most to least frequent usage.`;
    const LABELS = 'obsolete, archaic, dialectal, regional, vulgar, offensive, slang, colloquial, rare, literary, poetic, formal, figurative, humorous, technical, medicine, law, nautical, botany, zoology, military';
    return `You are an expert Italian linguist. Complete the dictionary entry for the Italian ${base.partOfSpeech} "${base.word}"${base.gender ? ` (${base.gender})` : ''}.
Known senses from Wiktionary (English glosses, most common first):
${senseLines || '(none)'}${homos.length ? `

The same spelling is also a different word (homographs):
${homoLines}` : ''}

Return ONLY valid JSON, no markdown:
{${opts.skipRussian ? '' : `
  "russian": { "main": "primary Russian translation", "alternatives": "2-3 alternatives semicolon-separated or empty" },`}
  "category": "${CATEGORY_PROMPT}",${!base.gender && /^sostantivo/.test(base.partOfSpeech || '') ? `
  "gender": "m. or f. or m./f. — Wiktionary did not record it",` : ''}
  "meanings": [ { "definition": "Definition in Italian (1 sentence)", "example": "Natural example sentence in Italian", "label": "usage label or empty string" } ],
  "relatedWords": ["3-4 Italian words tied to this one by topic or by word family (same root), NOT synonyms or antonyms${haveRelated.length ? `, and none of these: ${haveRelated.join(', ')}` : ''}"]${homos.length ? `,
  "homographs": [ { "russian": "primary Russian translation; alternatives after ;", "label": "usage label or empty string", "meanings": [ { "definition": "Definition in Italian (1 sentence)", "example": "Natural example sentence in Italian", "label": "usage label or empty string" } ] } ]` : ''}
}
meanings: ${meaningsRule}
label: one of [${LABELS}], or an empty string for an ordinary sense. Set it only when the sense really is restricted; never guess.${homos.length ? `
homographs: one object per homograph listed above, in the same order, 1-2 meanings each.` : ''}
russian.main MUST translate sense 1 of THIS word (the most common sense), never a homograph. Definitions are written in Italian; never copy an English gloss.${ruHintRule(opts.ruHint)}`;
  }

  // ── Fallback: слова нет в Викисловаре или таблица форм неполная — модель пишет всё сама ──────────
  function articleFallbackPrompt(word) {
    return `You are an expert Italian linguist. Given the Italian word "${word}", provide a complete dictionary entry in JSON format.
Return ONLY valid JSON, no markdown, no explanation. Schema:
{
  "word": "canonical form",
  "partOfSpeech": "EXACTLY ONE of these, never a combination: sostantivo, verbo, aggettivo, avverbio, preposizione, congiunzione, pronome, articolo, interiezione",
  "category": "${CATEGORY_PROMPT}",
  "gender": "m. / f. / m./f. / null",
  "phonetic": "IPA with ˈ before stressed syllable",
  "singular": { "article": "il/lo/la/l'", "form": "word" },
  "plural": { "article": "i/gli/le", "form": "plural form" },
  "russian": { "main": "primary Russian translation", "alternatives": "2-3 alts semicolon-separated or empty" },
  "english": { "main": "primary English translation", "alternatives": "2-3 alts semicolon-separated or empty" },
  "meanings": [
    { "definition": "Definition in Italian (1 sentence)", "example": "Example sentence in Italian", "label": "usage label or empty string" },
    { "definition": "Second meaning if exists", "example": "Example for second meaning", "label": "usage label or empty string" }
  ],
  "isNoun": true/false,
  "isVerb": true/false,
  "alsoForms": [ { "lemma": "another Italian word this exact spelling is also an inflected form of", "pos": "sostantivo / verbo / aggettivo", "desc": "short Russian note, e.g. «форма глагола puzzare»" } ],
  "relatedWords": ["слово1", "слово2", "слово3"],
  "conjugations": {
    "Indicativo Presente": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Indicativo Passato Prossimo": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Indicativo Imperfetto": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Indicativo Trapassato Prossimo": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Indicativo Passato Remoto": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Indicativo Futuro Semplice": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Indicativo Futuro Anteriore": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Congiuntivo Presente": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Congiuntivo Passato": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Congiuntivo Imperfetto": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Congiuntivo Trapassato": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Condizionale Presente": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Condizionale Passato": {"io":"","tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Imperativo": {"tu":"","lui/lei":"","noi":"","voi":"","loro":""},
    "Infinito": {"Presente":"","Passato":""},
    "Participio": {"Presente":"","Passato":""},
    "Gerundio": {"Presente":"","Passato":""}
  }
}
If isVerb false → conjugations null. If isNoun false → singular/plural null. If not a real Italian word → word null. relatedWords: 3-5 semantically related Italian words (synonyms, antonyms, thematic). meanings: 1-4 items ordered from most frequent to least frequent usage; obsolete, dialectal and rare senses go last. Always include at least 1 meaning.
label: one of [obsolete, archaic, dialectal, regional, vulgar, offensive, slang, colloquial, rare, literary, poetic, formal, figurative, humorous, technical, medicine, law, nautical, botany, zoology, military], or an empty string for an ordinary sense. Set it only when the sense really is restricted; never guess.
alsoForms: this article is about one word only. If the very same spelling is ALSO an inflected form of a different word (the noun "puzza" is also "puzza" from the verb puzzare), list that other word here so the reader can jump to it. Do not describe it and do not add its conjugation table here. Empty array when there is no such word.`;
  }

  // ── Проверка второй моделью: факты Викисловаря ──────────────────────────────────────────────
  function verifyArticleFactsPrompt(entry, base) {
    const senses = ((base && base.senses) || []).map((s, i) => `${i + 1}. ${s.label ? '(' + s.label + ') ' : ''}${s.gloss}`).join('\n');
    const homos = ((base && base.homographs) || []).map((h, i) => `${i + 1}. ${h.partOfSpeech}${h.label ? ` [Wiktionary marks it: ${h.label}]` : ''}: ${(h.glosses || []).join('; ')}`).join('\n');
    const article = {
      word: entry.word, partOfSpeech: entry.partOfSpeech, gender: entry.gender, russian: entry.russian, english: entry.english,
      meanings: (entry.meanings || []).map(m => ({ definition: m.definition, label: m.label || '' })),
      homographs: (entry.homographs || []).map(h => ({ partOfSpeech: h.partOfSpeech, russian: h.russian, label: h.label || '' }))
    };
    const groups = {}; Object.entries(USAGE_RU).forEach(([en, ru]) => { (groups[ru] = groups[ru] || []).push(en); });
    const labelMap = Object.entries(groups).map(([ru, ens]) => `${ru} = ${ens.join('/')}`).join('; ');
    return `You are checking a dictionary entry for the Italian word "${entry.word}" written by another model. Report real errors; do not invent problems.
${senses ? `Reference from Wiktionary — senses of THIS word (English glosses, Wiktionary order; the list may be incomplete and its order is historical, not by frequency):\n${senses}\n` : 'Wiktionary has no entry for this word; judge from your own knowledge of Italian.\n'}${homos ? `Other words with the same spelling, NOT this word:\n${homos}\n` : ''}
The entry:
${JSON.stringify(article)}

Rules:
- The writer was told to cover the Wiktionary senses AND add frequent present-day senses of this word that Wiktionary lacks. A meaning beyond the list is fine if it is a genuine common sense of this word ("andare" = to work/function, "vita" = waist, "tempo" = musical tempo). It is an error only if it is not a sense of this word at all, or belongs to a homograph listed above.
- russian.main must translate the most common present-day sense of this word, consistent with the list. Wiktionary's first line is not automatically the most common.
- Labels describe how the ITALIAN sense is used, never the Russian word. They are Russian abbreviations by design: ${labelMap}. A label is questionable only if it contradicts Wiktionary's mark for that sense or is clearly wrong for Italian; its spelling and language are never a problem.

errors (make ok false): russian.main is a wrong translation; a meaning belongs to one of the homographs listed above; a definition is an English gloss or not Italian; partOfSpeech or gender contradicts Wiktionary; a homograph's russian translates the wrong word. Whether a meaning is a genuine sense of this word at all is checked separately — never report that here, and never report a meaning merely because it is absent from the Wiktionary list.
warnings (ok stays true): doubtful labels, weak examples, missing common sense, style.
Return ONLY valid JSON: { "ok": true/false, "errors": ["one short line each, in Russian"], "warnings": ["one short line each, in Russian"], "russianMain": "" }. When in doubt, it is a warning, not an error.
russianMain: fill it ONLY when russian.main should be replaced — with the Russian word to use instead, 1-3 words, nothing else. Leave it empty otherwise.`;
  }

  // ── Проверка второй моделью: реальны ли сами значения (без списка Викисловаря перед глазами) ───
  // Со списком перед глазами проверяющий браковал «vita = талия» и «andare = работать» как «не из
  // списка», даже когда именно эти примеры вписаны в правила как разрешённые — вопрос задаём отдельно.
  function verifySensesPrompt(entry) {
    const ms = (entry.meanings || []).filter(m => m && m.definition);
    return `You know Italian at native level. For a learner's dictionary, the Italian ${cleanPos(entry.partOfSpeech) || 'word'} "${entry.word}" was given these definitions:
${ms.map((m, i) => `${i + 1}. ${m.definition}`).join('\n')}

For EACH definition say whether it describes a genuine sense of the word "${entry.word}" in Italian. Any register counts: standard, colloquial, figurative, technical, regional, dated. Judge from your own knowledge of Italian; there is no list to compare against. A definition is NOT genuine only if the word does not have that meaning at all, or the meaning belongs to a different word that merely looks the same.
Return ONLY valid JSON: { "verdicts": [ { "n": 1, "genuine": true/false, "note": "short reason in Russian, only when genuine is false" } ] }`;
  }

  // ── Исправление по замечаниям проверки ──────────────────────────────────────────────────────
  function fixArticlePrompt(entry, notes) {
    const article = {
      word: entry.word,
      partOfSpeech: entry.partOfSpeech,
      gender: entry.gender || '',
      russian: entry.russian || { main: '', alternatives: '' },
      meanings: (entry.meanings || []).map(m => ({ definition: m.definition, example: m.example || '', label: m.label || '' })),
      homographs: (entry.homographs || []).map(h => ({ partOfSpeech: h.partOfSpeech, russian: h.russian || '', label: h.label || '' }))
    };
    return `A dictionary entry for the Italian word "${entry.word}" was written by one model and checked by another. The reviewer found these problems:
${notes.map((n, i) => `${i + 1}. ${n}`).join('\n')}

The entry as it stands:
${JSON.stringify(article)}

Rewrite ONLY what the reviewer objected to; everything the reviewer did not mention must come back unchanged, word for word. The notes are in Russian, the entry keeps its own languages: definitions in Italian, translations and usage labels in Russian.

Return ONLY valid JSON, no markdown, with every field below:
{
  "partOfSpeech": "part of speech in Italian, as in the entry unless the reviewer objected",
  "gender": "m. or f. or m./f., empty when the word is not a noun",
  "russian": { "main": "primary Russian translation of the most common present-day sense", "alternatives": "other Russian translations, semicolon-separated, or empty" },
  "meanings": [ { "definition": "Definition in Italian (1 sentence)", "example": "Natural example sentence in Italian", "label": "usage label or empty string" } ],
  "homographs": [ { "russian": "primary Russian translation; alternatives after ;", "label": "usage label or empty string" } ]
}
meanings: the corrected full list, ordered from most to least common in Italian today. Drop a meaning the reviewer called not a sense of this word; keep every other one as it was. Never return an empty list.
homographs: exactly ${article.homographs.length} item(s), in the same order as above — those are other words with the same spelling, so fix only their Russian translation and label.`;
  }

  // ── Устойчивое выражение ─────────────────────────────────────────────────────────────────
  function phrasePrompt(phrase) {
    return `You are an expert Italian linguist. The user entered the Italian multi-word expression "${phrase}" (an idiom, collocation or set phrase).
Return ONLY valid JSON, no markdown:
{
  "word": "the expression in its canonical citation form (verb in the infinitive, no quotes), or null if it is not a real Italian expression",
  "partOfSpeech": "EXACTLY ONE of these, never a combination: locuzione verbale, locuzione avverbiale, locuzione nominale, locuzione aggettivale, locuzione prepositiva, modo di dire, proverbio",
  "category": "${CATEGORY_PROMPT}",
  "russian": { "main": "idiomatic Russian equivalent (not word-for-word)", "alternatives": "2-3 alternatives semicolon-separated or empty" },
  "english": { "main": "idiomatic English equivalent", "alternatives": "2-3 alternatives semicolon-separated or empty" },
  "meanings": [ { "definition": "What the expression means, in Italian (1 sentence)", "example": "Natural Italian sentence using the whole expression", "label": "one of [obsolete, archaic, dialectal, regional, vulgar, offensive, slang, colloquial, rare, literary, poetic, figurative, humorous] or an empty string; set it only when the sense really is restricted" } ],
  "register": "neutro / colloquiale / formale / volgare / letterario / regionale",
  "relatedWords": ["3-5 related Italian words or expressions"]
}
meanings: 1-3 items, most frequent first. Do NOT include phonetic transcription, gender, plural or conjugation tables.`;
  }

  // ── Фолбэк русского поиска: в кэше/Викисловаре меньше трёх вариантов ────────────────────────
  function russianSearchPrompt(word) {
    return `You are an expert Italian linguist. The user entered the Russian word "${word}".
Find all meaningful Italian translations. Return ONLY a JSON array, no markdown. Each item:
{"italian":"canonical form","partOfSpeech":"sostantivo/verbo/etc","gender":"m./f./null","shortDefinition":"краткое значение по-русски (4-8 слов)","register":"neutro/formale/colloquiale/letterario"}
Return 1-8 items. If no translation exists, return [].`;
  }

  // ── Пересборка «Altre voci» (омографов) у открытой статьи ───────────────────────────────────
  function voicesPrompt(word, partOfSpeech, meaningsText) {
    return `You are an expert Italian lexicographer. The Italian word "${word}" is already documented as: ${partOfSpeech || ''} — ${meaningsText || '—'}.
List OTHER Italian words spelled exactly "${word}" that are separate dictionary entries (homographs): a different part of speech, a different etymology, or a distinctly different word. Do not repeat the sense(s) above and do not list inflected forms of other words.
Return ONLY valid JSON, no markdown:
{ "voices": [ { "partOfSpeech": "exactly one of: sostantivo, verbo, aggettivo, avverbio, pronome, congiunzione, interiezione", "gender": "m. / f. / empty", "phonetic": "IPA in slashes or empty", "label": "usage label or empty string", "russian": "Russian translation; alternatives after ;", "meanings": [ { "definition": "Definition in Italian (1 sentence)", "example": "Natural Italian example", "label": "usage label or empty string" } ] } ] }
label: one of [obsolete, archaic, dialectal, regional, vulgar, offensive, slang, colloquial, rare, literary, poetic, formal, figurative, humorous, technical, medicine, law, nautical, botany, zoology, military] or empty. Mark obsolete, dialectal and rare entries honestly.
If there are no such homographs, return { "voices": [] }.`;
  }

  // ── Шторка при наведении: только перевод, короткий промпт (~15 токенов ответа) ─────────────
  function previewRuPrompt(word, partOfSpeech, glosses) {
    return `Italian ${partOfSpeech || 'word'} "${word}"${glosses ? ` (English: ${glosses})` : ''}.
Return ONLY valid JSON, no markdown: {"russian":{"main":"primary Russian translation","alternatives":"1-3 alternatives semicolon-separated or empty"}}`;
  }
  // ── Шторка: слова нет в Викисловаре — мини-статья целиком от модели ─────────────────────────
  function previewMiniPrompt(word) {
    return `Italian word "${word}". Return ONLY valid JSON, no markdown:
{"word":"canonical form","partOfSpeech":"sostantivo/verbo/aggettivo/etc","category":"${CATEGORY_PROMPT}","phonetic":"IPA with ˈ","russian":{"main":"перевод","alternatives":"alt1; alt2"}}
If not a real Italian word return {"word":null}.`;
  }
  // ── Шторка: «мамон» вместо перевода — переспрашиваем, не транслитерация ли это ──────────────
  function previewTranslitPrompt(word, partOfSpeech, gloss) {
    return `Italian ${partOfSpeech || 'word'} "${word}"${gloss ? ` means: ${gloss}` : ''}.
Give its natural Russian translation as a real Russian word or phrase. Do NOT transliterate the Italian word into Cyrillic.
Return ONLY valid JSON, no markdown: {"russian":{"main":"перевод","alternatives":"1-3 alternatives semicolon-separated or empty"}}`;
  }

  // ── Сборка карточек: довписать перевод/пример/значение батчем ───────────────────────────────
  function cardsFillPrompt(list) {
    return `You are an expert Italian lexicographer. For each Italian item below, provide ONLY the fields listed in "missing".
Fields: "translation" = primary Russian translation (1-3 words, alternatives after ";" allowed), "phonetic" = IPA with ˈ before the stressed syllable, "example" = one natural Italian sentence using the word, "meaning" = short definition in Italian (1 sentence).
Items with "isPhrase": true are multi-word expressions (idioms, collocations, set phrases): "translation" = the idiomatic Russian equivalent, not word-for-word; "meaning" = what the whole expression means; "example" = a natural sentence using the whole expression. Never add a phonetic for them.
Return ONLY a JSON array of objects {"word": "...", ...fields}, in the same order, no markdown.
${JSON.stringify(list)}`;
  }

  // ── La Pratica: разбор текста, который написал сам пользователь ─────────────────────────────
  function praticaPrompt(text, topics) {
    const lessico = topics[topics.length - 1];
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
      "topic": "одно из: ${topics.join(', ')}",
      "explanation": "объяснение по-русски, одно-два предложения"
    }
  ],
  "words_used": ["леммы значимых слов из текста"],
  "good_points": ["что получилось хорошо, по-русски, коротко"],
  "overall": "одно-два предложения по-русски об общем впечатлении"
}

Требования:
- fragment обязан быть точной подстрокой исходного текста: без изменений, без многоточий, без добавленных слов. Бери самый короткий кусок, в котором видна ошибка.
- lemma это словарная форма того слова, которое ты исправил, а не та форма, что стоит в предложении: andato → andare, belle → bello, dei libri → libro.
- Если изменилось одно слово, lemma обязательна, даже когда правка выглядит как оборот: в «sono 22 anni» → «ho 22 anni» изменился глагол, значит lemma это avere. В «mi chiamo Marco» это chiamarsi.
- Пустая строка только если изменился порядок слов или сразу несколько разных слов.
- Отмечай только то, что носитель счёл бы неверным или неестественным. Не придумывай ошибок там, где текст просто написан не так, как написал бы ты.
- Если ошибок нет, верни пустой массив issues.
- topic только из списка выше. Если ошибка не грамматическая, ставь ${lessico}.
- words_used: начальные формы (cercando → cercare, le chiavi → chiave), только значимые слова. Не включай артикли, предлоги, союзы, местоимения и вспомогательные essere и avere.
- Объяснения, переводы и общее впечатление пиши по-русски. Итальянские примеры оставляй по-итальянски.
- Никаких баллов, оценок и уровней.`;
  }

  // ── Грамматика: только канонические темы закрытого списка (GRAMMAR_TREE в grammatica.js) ────
  // Список тем и структура раздела остаются на клиенте (там же, где рисуется дерево); сюда едут
  // только опознавательные поля. Инструкции по типу статьи — тоже редакционный текст, поэтому
  // не приходят от клиента, а лежат здесь же, второй копией из grammatica.js: обе стороны меняются
  // редко и синхронизировать 7 параграфов между браузером и Worker'ом дороже, чем изредка свериться.
  const GRAM_TYPE_RULES = {
    paradigma: `- table: полная таблица форм. Для времени глагола — шесть лиц строками; для существительного или прилагательного — единственное и множественное по родам; для суффиксов — суффикс и пример. Ничего не сокращай многоточием.
- rules: как форма образуется, от какой основы, куда падает ударение.
- Отдельным пунктом rules перечисли исключения и самые частотные нерегулярные слова именно этой темы.
- examples: живые фразы, в каждой встречается разбираемая форма.`,
    scelta: `- explanation: назови оба варианта и признак, по которому между ними выбирают.
- rules: правило выбора по пунктам, один пункт — один случай.
- examples: минимальные пары. У первого примера пары "pair": null, у второго "pair": "prev". В паре меняется только разбираемое место, остальное слово в слово одинаково, а переводы показывают разницу смысла.
- errors: ошибка именно в выборе варианта, а не в образовании формы.
- table: случай — какой вариант — пример.`,
    uso: `- rules: перечень случаев употребления, один пункт — один случай, в каждом свой пример.
- Отдельным пунктом случаи, когда так НЕ говорят.
- examples: 4-6 фраз из живой речи, разные случаи, а не варианты одного и того же.
- table: заполняй, только если случаи удобно свести в таблицу; иначе пустой объект.`,
    parola: `- explanation: коротко скажи, что это слово заменяет или на что указывает.
- rules: значения этого слова списком, одно значение — один пункт с примером и переводом.
- table: значение — пример — перевод.
- errors: путаница с похожим по виду словом.`,
    costruzione: `- explanation: дай формулу конструкции словами, например «essere плюс причастие прошедшего времени».
- rules: из каких частей состоит конструкция и что с чем согласуется.
- examples: пары «до и после» превращения. У первого примера пары "pair": null, у второго "pair": "prev".
- table: части конструкции или её формы по временам.`,
    ortografia: `- rules: правило по пунктам, в каждом слова-примеры.
- table: пары слов, где различие видно: написание, чтение, перевод.
- Отдельным пунктом исключения и слова, в которых ошибаются чаще всего.
- Произношение объясняй сравнением с русскими звуками и итальянскими примерами, транскрипцию МФА не используй.`,
    classe: `- table: полный набор, ничего не пропуская. Для местоимений — лицо, число, форма; для союзов и наречий — слово, значение, пример.
- rules: как этот набор ведёт себя в предложении, где стоит, с чем согласуется.
- examples: фразы, покрывающие разные члены набора.`
  };
  const GRAM_TYPE_RU = {
    paradigma: 'формы', scelta: 'выбор между двумя вариантами', uso: 'когда так говорят',
    parola: 'одно служебное слово', costruzione: 'конструкция', ortografia: 'письмо и звук',
    classe: 'закрытый набор слов'
  };
  function grammarPrompt(t) {
    return `Ты пишешь статью для справочника по итальянской грамматике. Читатель русскоязычный, уровень от начального до среднего.

ТЕМА: ${t.it} — ${t.ru}
РАЗДЕЛ: ${t.sectionIt} (${t.sectionRu})
ТИП СТАТЬИ: ${GRAM_TYPE_RU[t.type] || 'правило'}

Требования к этому типу статьи:
${GRAM_TYPE_RULES[t.type] || GRAM_TYPE_RULES.uso}

Верни ТОЛЬКО валидный JSON без markdown:
{
  "title": "${t.it}",
  "titleRu": "${t.ru}",
  "category": "${t.sectionRu}",
  "explanation": "объяснение на русском, 3-5 предложений. **Жирным** ключевые термины, *курсивом* итальянские слова прямо в тексте.",
  "rules": [ { "text": "пункт правила с примером *по-итальянски* и переводом" } ],
  "table": { "headers": ["...", "..."], "rows": [["...", "..."]] },
  "examples": [ { "it": "фраза по-итальянски", "ru": "перевод", "pair": null } ],
  "errors": [ { "wrong": "Volevo che tu parlerebbe con lui.", "right": "Volevo che tu parlassi con lui.", "explain": "После volevo che идёт congiuntivo, а не condizionale." } ],
  "relatedTopics": []
}

Ошибки (errors) — самое важное, и делают их обычно плохо. Требования жёсткие:
- wrong и right — целые короткие предложения по-итальянски, а не отдельные слова. Ошибку видно только во фразе: одинокая словоформа сама по себе ни правильна, ни неправильна.
- Оба предложения отличаются ровно в одном месте, остальное совпадает слово в слово.
- explain одной фразой говорит, что именно не так, и не пересказывает предложение заново.
- Неправильный вариант должен быть тем, что человек действительно может написать. Не выдумывай несуществующих слов ради примера.
- Не бери ошибку, которой не видно на письме, например только в месте ударения. Исключение — статьи про письмо и звук, там это и есть тема.
- Одна ошибка — одна причина. Не смешивай в одном примере неверную форму и неверное наклонение.
- Ошибка должна быть про эту тему, а не про грамматику вообще.

Общее:
- rules: от 3 до 6 пунктов. errors: от 2 до 4, это ошибки именно русскоязычных.
- Статья строго про заявленную тему. Соседние темы не пересказывай, для них есть свои статьи.
- Не приводи форму, если не уверен в ней. Лучше меньше примеров, чем выдуманная форма.
- title, titleRu и category возьми ровно те, что даны выше, своих не придумывай.
- relatedTopics оставь пустым массивом, смежные темы подставляются без тебя.
- Пиши по-русски; итальянское остаётся по-итальянски. Никаких уровней, баллов и обращений к читателю.`;
  }

  root.DizPrompts = {
    CATEGORY_KEYS, CATEGORY_PROMPT, USAGE_RU, ruHintRule,
    fdCompletionPrompt, articleFallbackPrompt, verifyArticleFactsPrompt, verifySensesPrompt, fixArticlePrompt,
    phrasePrompt, russianSearchPrompt, voicesPrompt, previewRuPrompt, previewMiniPrompt, previewTranslitPrompt,
    cardsFillPrompt, praticaPrompt, grammarPrompt
  };
})(typeof self !== 'undefined' ? self : this);
