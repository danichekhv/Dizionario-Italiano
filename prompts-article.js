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

  root.DizPrompts = {
    CATEGORY_KEYS, CATEGORY_PROMPT, USAGE_RU, ruHintRule,
    fdCompletionPrompt, articleFallbackPrompt, verifyArticleFactsPrompt, verifySensesPrompt, fixArticlePrompt
  };
})(typeof self !== 'undefined' ? self : this);
