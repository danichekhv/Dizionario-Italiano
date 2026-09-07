// ── La Grammatica: справочник по разделам ────────────────────────────────────
// Список тем закрытый и живёт здесь, модель его не придумывает и не расширяет.
// Slug — личность статьи: одна тема, одна строка в базе, одна статья на всех.
// Пока это болванка интерфейса: показывает дерево и отмечает, для каких тем
// статья уже есть в общей базе. Резолвер запросов, пакетная генерация и
// проверка второй моделью приезжают отдельно.
(function () {
  const GRAMMAR_TREE = [
    { id: "articoli", it: "Articoli", ru: "Артикли", topics: [
      { slug: "articolo-determinativo-forme", it: "Articolo determinativo: forme", ru: "определённый артикль: формы" },
      { slug: "articolo-determinativo-uso", it: "Articolo determinativo: uso", ru: "определённый артикль: употребление" },
      { slug: "articolo-indeterminativo", it: "Articolo indeterminativo", ru: "неопределённый артикль" },
      { slug: "articolo-partitivo", it: "Articolo partitivo", ru: "партитивный артикль (del, della, dei)" },
      { slug: "omissione-articolo", it: "Omissione dell'articolo", ru: "когда артикль не ставится" },
      { slug: "articolo-nomi-geografici", it: "Articolo con i nomi geografici", ru: "артикль со странами и городами" },
      { slug: "articolo-possessivi-parentela", it: "Articolo con possessivi e nomi di parentela", ru: "артикль с притяжательными и родственниками" },
    ] },
    { id: "sostantivi", it: "Sostantivi", ru: "Существительные", topics: [
      { slug: "genere-nomi", it: "Genere dei nomi", ru: "род существительных" },
      { slug: "nomi-in-e", it: "Nomi in -e", ru: "существительные на -e и их род" },
      { slug: "plurale-regolare", it: "Plurale dei nomi", ru: "множественное число: основные правила" },
      { slug: "plurale-co-go", it: "Plurale in -co, -go, -ca, -ga", ru: "множественное число на -co, -go" },
      { slug: "plurale-cia-gia", it: "Plurale in -cia, -gia", ru: "множественное число на -cia, -gia" },
      { slug: "nomi-invariabili", it: "Nomi invariabili", ru: "неизменяемые существительные" },
      { slug: "plurali-irregolari", it: "Plurali irregolari", ru: "нерегулярное множественное (uomo, dito, uovo)" },
      { slug: "nomi-difettivi-sovrabbondanti", it: "Nomi difettivi e sovrabbondanti", ru: "только одно число, двойные формы" },
      { slug: "plurale-nomi-composti", it: "Plurale dei nomi composti", ru: "множественное у сложных слов" },
      { slug: "alterati", it: "Alterati: diminutivi e accrescitivi", ru: "уменьшительные и увеличительные (-ino, -one, -accio)" },
      { slug: "femminile-professioni", it: "Femminile dei nomi di professione", ru: "женский род названий профессий" },
      { slug: "nomi-collettivi", it: "Nomi collettivi", ru: "собирательные существительные" },
    ] },
    { id: "aggettivi", it: "Aggettivi", ru: "Прилагательные", topics: [
      { slug: "aggettivi-accordo", it: "Aggettivi qualificativi: accordo", ru: "согласование прилагательных" },
      { slug: "posizione-aggettivo", it: "Posizione dell'aggettivo", ru: "место прилагательного и смена смысла" },
      { slug: "bello-buono-grande-santo", it: "Bello, buono, grande, santo", ru: "особые формы перед существительным" },
      { slug: "comparativo", it: "Comparativo", ru: "сравнительная степень" },
      { slug: "superlativo", it: "Superlativo relativo e assoluto", ru: "превосходная степень" },
      { slug: "comparativi-irregolari", it: "Comparativi e superlativi irregolari", ru: "migliore, peggiore, ottimo" },
      { slug: "possessivi", it: "Aggettivi e pronomi possessivi", ru: "притяжательные" },
      { slug: "dimostrativi", it: "Dimostrativi: questo e quello", ru: "указательные" },
      { slug: "indefiniti-aggettivi", it: "Aggettivi indefiniti", ru: "неопределённые (alcuni, qualche, ogni, tutto)" },
      { slug: "interrogativi-esclamativi", it: "Aggettivi interrogativi ed esclamativi", ru: "che, quale, quanto" },
    ] },
    { id: "numerali", it: "Numerali", ru: "Числительные", topics: [
      { slug: "numerali-cardinali", it: "Numerali cardinali", ru: "количественные числительные" },
      { slug: "numerali-ordinali", it: "Numerali ordinali", ru: "порядковые числительные" },
      { slug: "numeri-grandi", it: "Cento, mille, milione", ru: "сотни, тысячи, миллионы и их множественное" },
      { slug: "frazioni-decimali", it: "Frazioni e decimali", ru: "дроби и десятичные (mezzo, tre quarti, virgola)" },
      { slug: "numerali-collettivi", it: "Numerali collettivi", ru: "paio, decina, dozzina, centinaio" },
      { slug: "numerali-moltiplicativi", it: "Numerali moltiplicativi", ru: "doppio, triplo, duplice" },
      { slug: "percentuali", it: "Percentuali", ru: "проценты" },
      { slug: "ora", it: "Dire l'ora", ru: "который час" },
      { slug: "date-anni", it: "Date e anni", ru: "даты и годы" },
      { slug: "secoli-numeri-romani", it: "Secoli e numeri romani", ru: "века и римские цифры" },
      { slug: "operazioni-matematiche", it: "Operazioni matematiche", ru: "как читать вслух сложение и деление" },
      { slug: "misure-quantita", it: "Misure e quantità", ru: "un chilo di, un po' di, una bottiglia d'acqua" },
    ] },
    { id: "pronomi", it: "Pronomi", ru: "Местоимения", topics: [
      { slug: "pronomi-soggetto", it: "Pronomi personali soggetto", ru: "личные местоимения подлежащего" },
      { slug: "pronomi-tonici", it: "Pronomi tonici", ru: "ударные формы (me, te, lui)" },
      { slug: "pronomi-diretti", it: "Pronomi diretti", ru: "прямые дополнения (lo, la, li, le)" },
      { slug: "pronomi-indiretti", it: "Pronomi indiretti", ru: "косвенные дополнения (gli, le, loro)" },
      { slug: "pronomi-combinati", it: "Pronomi combinati", ru: "сдвоенные (glielo, me lo)" },
      { slug: "posizione-pronomi", it: "Posizione dei pronomi", ru: "место при инфинитиве, герундии, императиве" },
      { slug: "accordo-participio-pronomi", it: "Accordo del participio con i pronomi", ru: "согласование причастия с прямым дополнением" },
      { slug: "particella-ne", it: "Particella ne", ru: "частица ne" },
      { slug: "particella-ci", it: "Particella ci", ru: "частица ci, места и замены" },
      { slug: "pronomi-riflessivi", it: "Pronomi riflessivi", ru: "возвратные местоимения" },
      { slug: "pronomi-relativi-che-cui", it: "Pronomi relativi: che, cui", ru: "относительные che и cui" },
      { slug: "pronomi-relativi-il-quale", it: "Il quale, chi, quello che", ru: "остальные относительные" },
      { slug: "pronomi-interrogativi", it: "Pronomi interrogativi", ru: "вопросительные" },
      { slug: "pronomi-indefiniti", it: "Pronomi indefiniti", ru: "неопределённые (qualcuno, nessuno, niente)" },
    ] },
    { id: "verbi-indicativo", it: "Verbi: indicativo", ru: "Изъявительное наклонение", topics: [
      { slug: "presente-regolari", it: "Presente: verbi regolari", ru: "настоящее время правильных глаголов" },
      { slug: "presente-irregolari", it: "Presente: verbi irregolari", ru: "неправильные глаголы в настоящем" },
      { slug: "presente-isc", it: "Presente: verbi in -isc-", ru: "глаголы типа finire" },
      { slug: "passato-prossimo-formazione", it: "Passato prossimo: formazione", ru: "образование" },
      { slug: "passato-prossimo-ausiliare", it: "Passato prossimo: scelta dell'ausiliare", ru: "выбор essere или avere" },
      { slug: "passato-prossimo-accordo", it: "Passato prossimo: accordo del participio", ru: "согласование причастия" },
      { slug: "imperfetto", it: "Imperfetto", ru: "имперфект: образование и употребление" },
      { slug: "passato-prossimo-vs-imperfetto", it: "Passato prossimo o imperfetto", ru: "как выбрать между ними" },
      { slug: "trapassato-prossimo", it: "Trapassato prossimo", ru: "предпрошедшее" },
      { slug: "passato-remoto-formazione", it: "Passato remoto: formazione", ru: "простое прошедшее: формы" },
      { slug: "passato-remoto-uso", it: "Passato remoto: uso", ru: "когда употребляется" },
      { slug: "trapassato-remoto", it: "Trapassato remoto", ru: "давнопрошедшее" },
      { slug: "futuro-semplice", it: "Futuro semplice", ru: "простое будущее" },
      { slug: "futuro-anteriore", it: "Futuro anteriore", ru: "предбудущее" },
      { slug: "futuro-probabilita", it: "Futuro di probabilità", ru: "будущее в значении предположения" },
    ] },
    { id: "verbi-altri-modi", it: "Verbi: altri modi", ru: "Прочие наклонения и неличные формы", topics: [
      { slug: "condizionale-presente", it: "Condizionale presente", ru: "условное настоящее" },
      { slug: "condizionale-passato", it: "Condizionale passato", ru: "условное прошедшее" },
      { slug: "uso-condizionale", it: "Uso del condizionale", ru: "вежливость и будущее в прошедшем" },
      { slug: "congiuntivo-presente", it: "Congiuntivo presente", ru: "сослагательное настоящее: формы" },
      { slug: "congiuntivo-passato", it: "Congiuntivo passato", ru: "сослагательное прошедшее" },
      { slug: "congiuntivo-imperfetto", it: "Congiuntivo imperfetto", ru: "сослагательное имперфекта" },
      { slug: "congiuntivo-trapassato", it: "Congiuntivo trapassato", ru: "сослагательное предпрошедшее" },
      { slug: "quando-congiuntivo", it: "Quando si usa il congiuntivo", ru: "после каких глаголов и выражений" },
      { slug: "congiuntivo-o-indicativo", it: "Congiuntivo o indicativo", ru: "как выбрать" },
      { slug: "imperativo-diretto", it: "Imperativo diretto", ru: "повелительное на ты, мы, вы" },
      { slug: "imperativo-formale", it: "Imperativo formale", ru: "вежливое повелительное на Lei" },
      { slug: "imperativo-negativo", it: "Imperativo negativo", ru: "отрицательное повелительное" },
      { slug: "imperativo-pronomi", it: "Imperativo con i pronomi", ru: "повелительное с местоимениями" },
      { slug: "infinito", it: "Infinito presente e passato", ru: "инфинитив настоящий и прошедший" },
      { slug: "gerundio", it: "Gerundio presente e passato", ru: "герундий" },
      { slug: "stare-gerundio", it: "Stare + gerundio", ru: "длительное действие" },
      { slug: "participio-presente", it: "Participio presente", ru: "причастие настоящего времени" },
      { slug: "participio-passato-irregolari", it: "Participio passato: forme irregolari", ru: "нерегулярные причастия" },
    ] },
    { id: "verbi-costruzioni", it: "Verbi: costruzioni", ru: "Конструкции с глаголом", topics: [
      { slug: "ausiliari-essere-avere", it: "Ausiliari essere e avere", ru: "выбор вспомогательного глагола" },
      { slug: "transitivi-intransitivi", it: "Verbi transitivi e intransitivi", ru: "переходность" },
      { slug: "verbi-riflessivi", it: "Verbi riflessivi", ru: "возвратные глаголы" },
      { slug: "verbi-pronominali", it: "Verbi pronominali", ru: "andarsene, farcela, cavarsela" },
      { slug: "verbi-modali", it: "Verbi modali: potere, dovere, volere", ru: "модальные глаголы" },
      { slug: "modali-tempi-composti", it: "Modali nei tempi composti", ru: "модальные в сложных временах и с местоимениями" },
      { slug: "passivo-essere", it: "Forma passiva con essere", ru: "страдательный залог" },
      { slug: "passivo-venire-andare", it: "Passivo con venire e andare", ru: "страдательный с venire и andare" },
      { slug: "si-passivante", it: "Si passivante", ru: "пассивное si" },
      { slug: "si-impersonale", it: "Si impersonale", ru: "безличное si" },
      { slug: "verbi-impersonali", it: "Verbi impersonali", ru: "безличные и погодные глаголы" },
      { slug: "causativo-fare", it: "Fare + infinito", ru: "каузативная конструкция" },
      { slug: "lasciare-infinito", it: "Lasciare + infinito", ru: "позволение" },
      { slug: "percezione-infinito", it: "Verbi di percezione + infinito", ru: "вижу, как он идёт" },
      { slug: "piacere-verbi-simili", it: "Piacere e verbi simili", ru: "piacere, mancare, servire, bastare" },
      { slug: "ci-vuole-metterci", it: "Ci vuole e metterci", ru: "сколько нужно времени" },
      { slug: "c-e-ci-sono", it: "C'è e ci sono", ru: "есть, имеется" },
      { slug: "stare-per", it: "Stare per + infinito", ru: "вот-вот произойдёт" },
      { slug: "da-tempo-presente", it: "Da + espressioni di tempo", ru: "сколько времени уже длится" },
      { slug: "concordanza-tempi", it: "Concordanza dei tempi", ru: "согласование времён" },
    ] },
    { id: "preposizioni", it: "Preposizioni", ru: "Предлоги", topics: [
      { slug: "preposizioni-semplici", it: "Preposizioni semplici", ru: "простые предлоги: обзор" },
      { slug: "preposizioni-articolate", it: "Preposizioni articolate", ru: "слитные предлоги" },
      { slug: "preposizione-di", it: "Preposizione di", ru: "предлог di" },
      { slug: "preposizione-a", it: "Preposizione a", ru: "предлог a" },
      { slug: "preposizione-da", it: "Preposizione da", ru: "предлог da" },
      { slug: "preposizione-in", it: "Preposizione in", ru: "предлог in" },
      { slug: "preposizioni-con-su-per", it: "Con, su, per, tra e fra", ru: "остальные предлоги" },
      { slug: "preposizioni-luogo", it: "Preposizioni di luogo", ru: "in или a с городами и странами" },
      { slug: "preposizioni-tempo", it: "Preposizioni di tempo", ru: "предлоги времени" },
      { slug: "reggenza-verbi", it: "Reggenza dei verbi", ru: "какой предлог требует глагол перед инфинитивом" },
      { slug: "locuzioni-preposizionali", it: "Locuzioni preposizionali", ru: "устойчивые сочетания с предлогами" },
    ] },
    { id: "avverbi", it: "Avverbi", ru: "Наречия", topics: [
      { slug: "avverbi-mente", it: "Avverbi in -mente", ru: "образование наречий" },
      { slug: "avverbi-tempo", it: "Avverbi di tempo", ru: "наречия времени" },
      { slug: "avverbi-luogo", it: "Avverbi di luogo", ru: "наречия места" },
      { slug: "avverbi-quantita", it: "Avverbi di quantità", ru: "наречия количества" },
      { slug: "avverbi-modo", it: "Avverbi di modo", ru: "наречия образа действия" },
      { slug: "posizione-avverbi", it: "Posizione degli avverbi", ru: "место наречия во фразе" },
      { slug: "comparativo-avverbi", it: "Comparativo e superlativo degli avverbi", ru: "степени сравнения наречий" },
      { slug: "gia-ancora-appena", it: "Già, ancora, appena, mai", ru: "наречия при сложных временах" },
      { slug: "anche-neanche-pure", it: "Anche, pure, neanche, nemmeno", ru: "тоже и тоже не" },
    ] },
    { id: "sintassi", it: "Sintassi", ru: "Синтаксис", topics: [
      { slug: "ordine-parole", it: "Ordine delle parole", ru: "порядок слов" },
      { slug: "frase-interrogativa", it: "Frase interrogativa", ru: "вопросительное предложение" },
      { slug: "negazione", it: "Negazione e doppia negazione", ru: "отрицание и двойное отрицание" },
      { slug: "frasi-relative", it: "Frasi relative", ru: "придаточные определительные" },
      { slug: "discorso-indiretto", it: "Discorso indiretto", ru: "косвенная речь" },
      { slug: "periodo-ipotetico-1", it: "Periodo ipotetico della realtà", ru: "реальное условие" },
      { slug: "periodo-ipotetico-2", it: "Periodo ipotetico della possibilità", ru: "возможное условие" },
      { slug: "periodo-ipotetico-3", it: "Periodo ipotetico dell'irrealtà", ru: "нереальное условие" },
      { slug: "frasi-finali", it: "Frasi finali", ru: "придаточные цели (perché, affinché)" },
      { slug: "frasi-causali", it: "Frasi causali", ru: "придаточные причины" },
      { slug: "frasi-temporali", it: "Frasi temporali", ru: "придаточные времени" },
      { slug: "frasi-concessive", it: "Frasi concessive", ru: "уступительные (benché, sebbene, anche se)" },
      { slug: "frasi-consecutive", it: "Frasi consecutive", ru: "придаточные следствия" },
      { slug: "frasi-comparative", it: "Frasi comparative", ru: "сравнительные придаточные" },
      { slug: "congiunzioni-coordinanti", it: "Congiunzioni coordinanti", ru: "сочинительные союзы" },
      { slug: "congiunzioni-subordinanti", it: "Congiunzioni subordinanti", ru: "подчинительные союзы" },
      { slug: "connettivi-discorso", it: "Connettivi del discorso", ru: "inoltre, tuttavia, quindi" },
      { slug: "forme-di-cortesia", it: "Forme di cortesia: dare del Lei", ru: "вежливое обращение" },
    ] },
    { id: "ortografia-e-pronuncia", it: "Ortografia e pronuncia", ru: "Орфография и произношение", topics: [
      { slug: "alfabeto-pronuncia", it: "Alfabeto e pronuncia", ru: "алфавит и чтение" },
      { slug: "suoni-c-g", it: "Suoni c e g", ru: "твёрдые и мягкие c и g" },
      { slug: "gruppi-gli-gn-sc", it: "Gruppi gli, gn, sc", ru: "сочетания gli, gn, sc" },
      { slug: "accento-grafico", it: "Accento grafico", ru: "графическое ударение" },
      { slug: "accento-tonico", it: "Accento tonico", ru: "словесное ударение и омографы" },
      { slug: "elisione-apostrofo", it: "Elisione e apostrofo", ru: "элизия и апостроф" },
      { slug: "troncamento", it: "Troncamento", ru: "усечение (buon, quel, san)" },
      { slug: "consonanti-doppie", it: "Consonanti doppie", ru: "удвоенные согласные" },
      { slug: "divisione-sillabe", it: "Divisione in sillabe", ru: "деление на слоги" },
      { slug: "maiuscole", it: "Uso delle maiuscole", ru: "прописные буквы" },
      { slug: "punteggiatura", it: "Punteggiatura", ru: "пунктуация" },
    ] },
  ];


  // open — какие разделы раскрыты вручную; keys — ключи статей, уже лежащих в общей базе
  const S = { open: {}, filter: '', keys: null, failed: false };
  const root = () => $('gramIndexScreen');
  const esc = s => escapeHtml(s == null ? '' : String(s));
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').trim();
  const pluralRu = (n, one, few, many) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? one : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? few : many; };

  const allTopics = () => GRAMMAR_TREE.flatMap(s => s.topics);
  // Ключ статьи в базе: пока это итальянское название темы в нижнем регистре — под ним
  // сохраняет lookupGrammar. Slug проверяем тоже, он станет ключом после переезда.
  const topicKey = t => norm(t.it);
  const hasArticle = t => !!(S.keys && (S.keys.has(topicKey(t)) || S.keys.has(t.slug)));
  const isAdmin = () => !!(window.Auth && Auth.isAdmin && Auth.isAdmin());

  // Один запрос за списком ключей вместо ста пятидесяти семи проверок по одной
  async function loadKeys() {
    try {
      const res = await fetch(`${SB_URL}/rest/v1/grammar?select=topic`, { headers: SB_H });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      S.keys = new Set((rows || []).map(r => norm(r.topic)));
      S.failed = false;
    } catch (e) { S.keys = new Set(); S.failed = true; }
  }

  // ── Поиск по дереву ──────────────────────────────────────────────────────────
  function matches(t, q) { return norm(t.it).includes(q) || norm(t.ru).includes(q) || t.slug.includes(q); }
  function visibleTopics(sec, q) {
    if (!q) return sec.topics;
    if (norm(sec.it).includes(q) || norm(sec.ru).includes(q)) return sec.topics; // совпал раздел — показываем целиком
    return sec.topics.filter(t => matches(t, q));
  }

  // ── Экран ────────────────────────────────────────────────────────────────────
  function topicHtml(t) {
    const ready = hasArticle(t);
    // Кнопка создания стоит отдельно и только у владельца: по справочнику ходят листая,
    // и статья на всех не должна появляться от случайного нажатия на строку
    const gen = (!ready && isAdmin())
      ? `<button class="gram-gen" onclick="Grammatica.generate('${t.slug}')" title="Создать статью вашим ключом">создать</button>` : '';
    return `
      <div class="gram-row">
        <button class="gram-topic ${ready ? 'ready' : 'empty'}" onclick="Grammatica.openTopic('${t.slug}')">
          <span class="gram-dot" title="${ready ? 'статья есть' : 'статьи пока нет'}"></span>
          <span class="gram-topic-it">${esc(t.it)}</span>
          <span class="gram-topic-ru">${esc(t.ru)}</span>
        </button>
        ${gen}
      </div>`;
  }

  function sectionHtml(sec, q) {
    const topics = visibleTopics(sec, q);
    if (!topics.length) return '';
    const ready = topics.filter(hasArticle).length;
    const open = q ? true : !!S.open[sec.id]; // при поиске разделы раскрыты, чтобы найденное было видно
    return `
      <div class="gram-section ${open ? 'open' : ''}">
        <button class="gram-sec-head" onclick="Grammatica.toggle('${sec.id}')">
          <span class="gram-sec-chevron">${svgIcon('chevron-right')}</span>
          <span class="gram-sec-it">${esc(sec.it)}</span>
          <span class="gram-sec-ru">${esc(sec.ru)}</span>
          <span class="gram-sec-count">${ready} / ${topics.length}</span>
        </button>
        ${open ? `<div class="gram-topics">${topics.map(topicHtml).join('')}</div>` : ''}
      </div>`;
  }

  function render() {
    const el = root(); if (!el) return;
    const q = norm(S.filter);
    const all = allTopics();
    const ready = all.filter(hasArticle).length;
    const body = GRAMMAR_TREE.map(s => sectionHtml(s, q)).join('');
    const shown = GRAMMAR_TREE.reduce((n, s) => n + visibleTopics(s, q).length, 0);
    el.innerHTML = `
      <div class="gram-index-head">
        <div class="gram-index-title">Справочник</div>
        <div class="gram-index-sub">${all.length} ${pluralRu(all.length, 'тема', 'темы', 'тем')} в ${GRAMMAR_TREE.length} разделах${S.keys ? ` · статей готово ${ready}` : ' · считаю готовые…'}</div>
      </div>
      ${S.failed ? `<div class="gram-note">Не удалось узнать, какие статьи уже есть. Список тем показан целиком.</div>` : ''}
      ${q ? `<div class="gram-note">Найдено тем: ${shown}. Очистите поле поиска, чтобы вернуть все разделы.</div>` : ''}
      <div class="gram-sections">${body || `<div class="gram-note">По запросу ничего не нашлось. Справочник закрытый: если темы нет в списке, статьи по ней не будет.</div>`}</div>
      <div class="gram-legend">
        <span><i class="gram-dot ready"></i> статья есть</span>
        <span><i class="gram-dot empty"></i> статьи пока нет</span>
        ${isAdmin() ? '<span class="gram-legend-admin">кнопка «создать» у пустой темы генерирует статью вашим ключом</span>' : ''}
      </div>`;
  }

  // ── Действия ─────────────────────────────────────────────────────────────────
  // Нажатие на строку только открывает готовое. Ничего не генерируется само.
  function openTopic(slug) {
    const t = allTopics().find(x => x.slug === slug); if (!t) return;
    if (hasArticle(t)) { lookupGrammar(t.it); return; }
    showToast(isAdmin() ? 'Статьи пока нет — «создать» справа от темы' : 'Статьи по этой теме пока нет — раздел ещё наполняется');
  }

  // Пока пакетной генерации нет, владелец создаёт статьи по одной, явным нажатием
  function generate(slug) {
    if (!isAdmin()) return;
    const t = allTopics().find(x => x.slug === slug); if (!t) return;
    lookupGrammar(t.it);
  }

  window.Grammatica = {
    async open() {
      S.filter = ''; render();
      if (!S.keys) { await loadKeys(); render(); }
    },
    render,
    toggle(id) { S.open[id] = !S.open[id]; render(); },
    openTopic, generate,
    // Фильтр приходит из общего поля поиска: второго поля на экране быть не должно
    setFilter(q) { if (S.filter === q) return; S.filter = q; render(); },
    // После генерации статьи отметка «готово» должна появиться без перезагрузки
    async refresh() { await loadKeys(); if (_currentState === 'gramindex') render(); },
    _tree: GRAMMAR_TREE
  };
})();
