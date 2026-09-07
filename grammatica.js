// ── La Grammatica: справочник по разделам ────────────────────────────────────
// Список тем закрытый и живёт здесь, модель его не придумывает и не расширяет.
// Slug — личность статьи: одна тема, одна строка в базе, одна статья на всех.
// Пока это болванка интерфейса: показывает дерево и отмечает, для каких тем
// статья уже есть в общей базе. Резолвер запросов, пакетная генерация и
// проверка второй моделью приезжают отдельно.
(function () {
  const GRAMMAR_TREE = [
    { id: "articoli", it: "Articoli", ru: "Артикли", topics: [
      { slug: "articolo-determinativo-forme", it: "Articolo determinativo: forme", ru: "определённый артикль: формы", type: "classe" },
      { slug: "articolo-determinativo-uso", it: "Articolo determinativo: uso", ru: "определённый артикль: употребление", type: "uso" },
      { slug: "articolo-indeterminativo", it: "Articolo indeterminativo", ru: "неопределённый артикль", type: "classe" },
      { slug: "articolo-partitivo", it: "Articolo partitivo", ru: "партитивный артикль (del, della, dei)", type: "uso" },
      { slug: "omissione-articolo", it: "Omissione dell'articolo", ru: "когда артикль не ставится", type: "uso" },
      { slug: "articolo-nomi-geografici", it: "Articolo con i nomi geografici", ru: "артикль со странами и городами", type: "uso" },
      { slug: "articolo-possessivi-parentela", it: "Articolo con possessivi e nomi di parentela", ru: "артикль с притяжательными и родственниками", type: "uso" },
    ] },
    { id: "sostantivi", it: "Sostantivi", ru: "Существительные", topics: [
      { slug: "genere-nomi", it: "Genere dei nomi", ru: "род существительных", type: "paradigma" },
      { slug: "nomi-in-e", it: "Nomi in -e", ru: "существительные на -e и их род", type: "paradigma" },
      { slug: "plurale-regolare", it: "Plurale dei nomi", ru: "множественное число: основные правила", type: "paradigma" },
      { slug: "plurale-co-go", it: "Plurale in -co, -go, -ca, -ga", ru: "множественное число на -co, -go", type: "paradigma" },
      { slug: "plurale-cia-gia", it: "Plurale in -cia, -gia", ru: "множественное число на -cia, -gia", type: "paradigma" },
      { slug: "nomi-invariabili", it: "Nomi invariabili", ru: "неизменяемые существительные", type: "uso" },
      { slug: "plurali-irregolari", it: "Plurali irregolari", ru: "нерегулярное множественное (uomo, dito, uovo)", type: "paradigma" },
      { slug: "nomi-difettivi-sovrabbondanti", it: "Nomi difettivi e sovrabbondanti", ru: "только одно число, двойные формы", type: "uso" },
      { slug: "plurale-nomi-composti", it: "Plurale dei nomi composti", ru: "множественное у сложных слов", type: "paradigma" },
      { slug: "alterati", it: "Alterati: diminutivi e accrescitivi", ru: "уменьшительные и увеличительные (-ino, -one, -accio)", type: "paradigma" },
      { slug: "femminile-professioni", it: "Femminile dei nomi di professione", ru: "женский род названий профессий", type: "paradigma" },
      { slug: "nomi-collettivi", it: "Nomi collettivi", ru: "собирательные существительные", type: "uso" },
    ] },
    { id: "aggettivi", it: "Aggettivi", ru: "Прилагательные", topics: [
      { slug: "aggettivi-accordo", it: "Aggettivi qualificativi: accordo", ru: "согласование прилагательных", type: "paradigma" },
      { slug: "posizione-aggettivo", it: "Posizione dell'aggettivo", ru: "место прилагательного и смена смысла", type: "scelta" },
      { slug: "bello-buono-grande-santo", it: "Bello, buono, grande, santo", ru: "особые формы перед существительным", type: "paradigma" },
      { slug: "comparativo", it: "Comparativo", ru: "сравнительная степень", type: "costruzione" },
      { slug: "superlativo", it: "Superlativo relativo e assoluto", ru: "превосходная степень", type: "costruzione" },
      { slug: "comparativi-irregolari", it: "Comparativi e superlativi irregolari", ru: "migliore, peggiore, ottimo", type: "paradigma" },
      { slug: "possessivi", it: "Aggettivi e pronomi possessivi", ru: "притяжательные", type: "classe" },
      { slug: "dimostrativi", it: "Dimostrativi: questo e quello", ru: "указательные", type: "classe" },
      { slug: "indefiniti-aggettivi", it: "Aggettivi indefiniti", ru: "неопределённые (alcuni, qualche, ogni, tutto)", type: "classe" },
      { slug: "interrogativi-esclamativi", it: "Aggettivi interrogativi ed esclamativi", ru: "che, quale, quanto", type: "classe" },
    ] },
    { id: "numerali", it: "Numerali", ru: "Числительные", topics: [
      { slug: "numerali-cardinali", it: "Numerali cardinali", ru: "количественные числительные", type: "classe" },
      { slug: "numerali-ordinali", it: "Numerali ordinali", ru: "порядковые числительные", type: "classe" },
      { slug: "numeri-grandi", it: "Cento, mille, milione", ru: "сотни, тысячи, миллионы и их множественное", type: "paradigma" },
      { slug: "frazioni-decimali", it: "Frazioni e decimali", ru: "дроби и десятичные (mezzo, tre quarti, virgola)", type: "uso" },
      { slug: "numerali-collettivi", it: "Numerali collettivi", ru: "paio, decina, dozzina, centinaio", type: "classe" },
      { slug: "numerali-moltiplicativi", it: "Numerali moltiplicativi", ru: "doppio, triplo, duplice", type: "classe" },
      { slug: "percentuali", it: "Percentuali", ru: "проценты", type: "uso" },
      { slug: "ora", it: "Dire l'ora", ru: "который час", type: "costruzione" },
      { slug: "date-anni", it: "Date e anni", ru: "даты и годы", type: "costruzione" },
      { slug: "secoli-numeri-romani", it: "Secoli e numeri romani", ru: "века и римские цифры", type: "uso" },
      { slug: "operazioni-matematiche", it: "Operazioni matematiche", ru: "как читать вслух сложение и деление", type: "uso" },
      { slug: "misure-quantita", it: "Misure e quantità", ru: "un chilo di, un po' di, una bottiglia d'acqua", type: "costruzione" },
    ] },
    { id: "pronomi", it: "Pronomi", ru: "Местоимения", topics: [
      { slug: "pronomi-soggetto", it: "Pronomi personali soggetto", ru: "личные местоимения подлежащего", type: "classe" },
      { slug: "pronomi-tonici", it: "Pronomi tonici", ru: "ударные формы (me, te, lui)", type: "classe" },
      { slug: "pronomi-diretti", it: "Pronomi diretti", ru: "прямые дополнения (lo, la, li, le)", type: "classe" },
      { slug: "pronomi-indiretti", it: "Pronomi indiretti", ru: "косвенные дополнения (gli, le, loro)", type: "classe" },
      { slug: "pronomi-combinati", it: "Pronomi combinati", ru: "сдвоенные (glielo, me lo)", type: "paradigma" },
      { slug: "posizione-pronomi", it: "Posizione dei pronomi", ru: "место при инфинитиве, герундии, императиве", type: "uso" },
      { slug: "accordo-participio-pronomi", it: "Accordo del participio con i pronomi", ru: "согласование причастия с прямым дополнением", type: "uso" },
      { slug: "particella-ne", it: "Particella ne", ru: "частица ne", type: "parola" },
      { slug: "particella-ci", it: "Particella ci", ru: "частица ci, места и замены", type: "parola" },
      { slug: "pronomi-riflessivi", it: "Pronomi riflessivi", ru: "возвратные местоимения", type: "classe" },
      { slug: "pronomi-relativi-che-cui", it: "Pronomi relativi: che, cui", ru: "относительные che и cui", type: "scelta" },
      { slug: "pronomi-relativi-il-quale", it: "Il quale, chi, quello che", ru: "остальные относительные", type: "uso" },
      { slug: "pronomi-interrogativi", it: "Pronomi interrogativi", ru: "вопросительные", type: "classe" },
      { slug: "pronomi-indefiniti", it: "Pronomi indefiniti", ru: "неопределённые (qualcuno, nessuno, niente)", type: "classe" },
    ] },
    { id: "verbi-indicativo", it: "Verbi: indicativo", ru: "Изъявительное наклонение", topics: [
      { slug: "presente-regolari", it: "Presente: verbi regolari", ru: "настоящее время правильных глаголов", type: "paradigma" },
      { slug: "presente-irregolari", it: "Presente: verbi irregolari", ru: "неправильные глаголы в настоящем", type: "paradigma" },
      { slug: "presente-isc", it: "Presente: verbi in -isc-", ru: "глаголы типа finire", type: "paradigma" },
      { slug: "passato-prossimo-formazione", it: "Passato prossimo: formazione", ru: "образование", type: "paradigma" },
      { slug: "passato-prossimo-ausiliare", it: "Passato prossimo: scelta dell'ausiliare", ru: "выбор essere или avere", type: "scelta" },
      { slug: "passato-prossimo-accordo", it: "Passato prossimo: accordo del participio", ru: "согласование причастия", type: "uso" },
      { slug: "imperfetto", it: "Imperfetto", ru: "имперфект: образование и употребление", type: "paradigma" },
      { slug: "passato-prossimo-vs-imperfetto", it: "Passato prossimo o imperfetto", ru: "как выбрать между ними", type: "scelta" },
      { slug: "trapassato-prossimo", it: "Trapassato prossimo", ru: "предпрошедшее", type: "paradigma" },
      { slug: "passato-remoto-formazione", it: "Passato remoto: formazione", ru: "простое прошедшее: формы", type: "paradigma" },
      { slug: "passato-remoto-uso", it: "Passato remoto: uso", ru: "когда употребляется", type: "uso" },
      { slug: "trapassato-remoto", it: "Trapassato remoto", ru: "давнопрошедшее", type: "paradigma" },
      { slug: "futuro-semplice", it: "Futuro semplice", ru: "простое будущее", type: "paradigma" },
      { slug: "futuro-anteriore", it: "Futuro anteriore", ru: "предбудущее", type: "paradigma" },
      { slug: "futuro-probabilita", it: "Futuro di probabilità", ru: "будущее в значении предположения", type: "uso" },
    ] },
    { id: "verbi-altri-modi", it: "Verbi: altri modi", ru: "Прочие наклонения и неличные формы", topics: [
      { slug: "condizionale-presente", it: "Condizionale presente", ru: "условное настоящее", type: "paradigma" },
      { slug: "condizionale-passato", it: "Condizionale passato", ru: "условное прошедшее", type: "paradigma" },
      { slug: "uso-condizionale", it: "Uso del condizionale", ru: "вежливость и будущее в прошедшем", type: "uso" },
      { slug: "congiuntivo-presente", it: "Congiuntivo presente", ru: "сослагательное настоящее: формы", type: "paradigma" },
      { slug: "congiuntivo-passato", it: "Congiuntivo passato", ru: "сослагательное прошедшее", type: "paradigma" },
      { slug: "congiuntivo-imperfetto", it: "Congiuntivo imperfetto", ru: "сослагательное имперфекта", type: "paradigma" },
      { slug: "congiuntivo-trapassato", it: "Congiuntivo trapassato", ru: "сослагательное предпрошедшее", type: "paradigma" },
      { slug: "quando-congiuntivo", it: "Quando si usa il congiuntivo", ru: "после каких глаголов и выражений", type: "uso" },
      { slug: "congiuntivo-o-indicativo", it: "Congiuntivo o indicativo", ru: "как выбрать", type: "scelta" },
      { slug: "imperativo-diretto", it: "Imperativo diretto", ru: "повелительное на ты, мы, вы", type: "paradigma" },
      { slug: "imperativo-formale", it: "Imperativo formale", ru: "вежливое повелительное на Lei", type: "paradigma" },
      { slug: "imperativo-negativo", it: "Imperativo negativo", ru: "отрицательное повелительное", type: "paradigma" },
      { slug: "imperativo-pronomi", it: "Imperativo con i pronomi", ru: "повелительное с местоимениями", type: "uso" },
      { slug: "infinito", it: "Infinito presente e passato", ru: "инфинитив настоящий и прошедший", type: "uso" },
      { slug: "gerundio", it: "Gerundio presente e passato", ru: "герундий", type: "uso" },
      { slug: "stare-gerundio", it: "Stare + gerundio", ru: "длительное действие", type: "costruzione" },
      { slug: "participio-presente", it: "Participio presente", ru: "причастие настоящего времени", type: "paradigma" },
      { slug: "participio-passato-irregolari", it: "Participio passato: forme irregolari", ru: "нерегулярные причастия", type: "paradigma" },
    ] },
    { id: "verbi-costruzioni", it: "Verbi: costruzioni", ru: "Конструкции с глаголом", topics: [
      { slug: "ausiliari-essere-avere", it: "Ausiliari essere e avere", ru: "выбор вспомогательного глагола", type: "scelta" },
      { slug: "transitivi-intransitivi", it: "Verbi transitivi e intransitivi", ru: "переходность", type: "uso" },
      { slug: "verbi-riflessivi", it: "Verbi riflessivi", ru: "возвратные глаголы", type: "paradigma" },
      { slug: "verbi-pronominali", it: "Verbi pronominali", ru: "andarsene, farcela, cavarsela", type: "uso" },
      { slug: "verbi-modali", it: "Verbi modali: potere, dovere, volere", ru: "модальные глаголы", type: "paradigma" },
      { slug: "modali-tempi-composti", it: "Modali nei tempi composti", ru: "модальные в сложных временах и с местоимениями", type: "uso" },
      { slug: "passivo-essere", it: "Forma passiva con essere", ru: "страдательный залог", type: "costruzione" },
      { slug: "passivo-venire-andare", it: "Passivo con venire e andare", ru: "страдательный с venire и andare", type: "scelta" },
      { slug: "si-passivante", it: "Si passivante", ru: "пассивное si", type: "costruzione" },
      { slug: "si-impersonale", it: "Si impersonale", ru: "безличное si", type: "costruzione" },
      { slug: "verbi-impersonali", it: "Verbi impersonali", ru: "безличные и погодные глаголы", type: "uso" },
      { slug: "causativo-fare", it: "Fare + infinito", ru: "каузативная конструкция", type: "costruzione" },
      { slug: "lasciare-infinito", it: "Lasciare + infinito", ru: "позволение", type: "costruzione" },
      { slug: "percezione-infinito", it: "Verbi di percezione + infinito", ru: "вижу, как он идёт", type: "costruzione" },
      { slug: "piacere-verbi-simili", it: "Piacere e verbi simili", ru: "piacere, mancare, servire, bastare", type: "costruzione" },
      { slug: "ci-vuole-metterci", it: "Ci vuole e metterci", ru: "сколько нужно времени", type: "scelta" },
      { slug: "c-e-ci-sono", it: "C'è e ci sono", ru: "есть, имеется", type: "costruzione" },
      { slug: "stare-per", it: "Stare per + infinito", ru: "вот-вот произойдёт", type: "costruzione" },
      { slug: "da-tempo-presente", it: "Da + espressioni di tempo", ru: "сколько времени уже длится", type: "costruzione" },
      { slug: "concordanza-tempi", it: "Concordanza dei tempi", ru: "согласование времён", type: "uso" },
    ] },
    { id: "preposizioni", it: "Preposizioni", ru: "Предлоги", topics: [
      { slug: "preposizioni-semplici", it: "Preposizioni semplici", ru: "простые предлоги: обзор", type: "classe" },
      { slug: "preposizioni-articolate", it: "Preposizioni articolate", ru: "слитные предлоги", type: "paradigma" },
      { slug: "preposizione-di", it: "Preposizione di", ru: "предлог di", type: "parola" },
      { slug: "preposizione-a", it: "Preposizione a", ru: "предлог a", type: "parola" },
      { slug: "preposizione-da", it: "Preposizione da", ru: "предлог da", type: "parola" },
      { slug: "preposizione-in", it: "Preposizione in", ru: "предлог in", type: "parola" },
      { slug: "preposizioni-con-su-per", it: "Con, su, per, tra e fra", ru: "остальные предлоги", type: "parola" },
      { slug: "preposizioni-luogo", it: "Preposizioni di luogo", ru: "in или a с городами и странами", type: "scelta" },
      { slug: "preposizioni-tempo", it: "Preposizioni di tempo", ru: "предлоги времени", type: "uso" },
      { slug: "reggenza-verbi", it: "Reggenza dei verbi", ru: "какой предлог требует глагол перед инфинитивом", type: "uso" },
      { slug: "locuzioni-preposizionali", it: "Locuzioni preposizionali", ru: "устойчивые сочетания с предлогами", type: "uso" },
    ] },
    { id: "avverbi", it: "Avverbi", ru: "Наречия", topics: [
      { slug: "avverbi-mente", it: "Avverbi in -mente", ru: "образование наречий", type: "paradigma" },
      { slug: "avverbi-tempo", it: "Avverbi di tempo", ru: "наречия времени", type: "classe" },
      { slug: "avverbi-luogo", it: "Avverbi di luogo", ru: "наречия места", type: "classe" },
      { slug: "avverbi-quantita", it: "Avverbi di quantità", ru: "наречия количества", type: "classe" },
      { slug: "avverbi-modo", it: "Avverbi di modo", ru: "наречия образа действия", type: "uso" },
      { slug: "posizione-avverbi", it: "Posizione degli avverbi", ru: "место наречия во фразе", type: "uso" },
      { slug: "comparativo-avverbi", it: "Comparativo e superlativo degli avverbi", ru: "степени сравнения наречий", type: "paradigma" },
      { slug: "gia-ancora-appena", it: "Già, ancora, appena, mai", ru: "наречия при сложных временах", type: "parola" },
      { slug: "anche-neanche-pure", it: "Anche, pure, neanche, nemmeno", ru: "тоже и тоже не", type: "parola" },
    ] },
    { id: "sintassi", it: "Sintassi", ru: "Синтаксис", topics: [
      { slug: "ordine-parole", it: "Ordine delle parole", ru: "порядок слов", type: "uso" },
      { slug: "frase-interrogativa", it: "Frase interrogativa", ru: "вопросительное предложение", type: "costruzione" },
      { slug: "negazione", it: "Negazione e doppia negazione", ru: "отрицание и двойное отрицание", type: "costruzione" },
      { slug: "frasi-relative", it: "Frasi relative", ru: "придаточные определительные", type: "costruzione" },
      { slug: "discorso-indiretto", it: "Discorso indiretto", ru: "косвенная речь", type: "costruzione" },
      { slug: "periodo-ipotetico-1", it: "Periodo ipotetico della realtà", ru: "реальное условие", type: "costruzione" },
      { slug: "periodo-ipotetico-2", it: "Periodo ipotetico della possibilità", ru: "возможное условие", type: "costruzione" },
      { slug: "periodo-ipotetico-3", it: "Periodo ipotetico dell'irrealtà", ru: "нереальное условие", type: "costruzione" },
      { slug: "frasi-finali", it: "Frasi finali", ru: "придаточные цели (perché, affinché)", type: "costruzione" },
      { slug: "frasi-causali", it: "Frasi causali", ru: "придаточные причины", type: "costruzione" },
      { slug: "frasi-temporali", it: "Frasi temporali", ru: "придаточные времени", type: "costruzione" },
      { slug: "frasi-concessive", it: "Frasi concessive", ru: "уступительные (benché, sebbene, anche se)", type: "costruzione" },
      { slug: "frasi-consecutive", it: "Frasi consecutive", ru: "придаточные следствия", type: "costruzione" },
      { slug: "frasi-comparative", it: "Frasi comparative", ru: "сравнительные придаточные", type: "costruzione" },
      { slug: "congiunzioni-coordinanti", it: "Congiunzioni coordinanti", ru: "сочинительные союзы", type: "classe" },
      { slug: "congiunzioni-subordinanti", it: "Congiunzioni subordinanti", ru: "подчинительные союзы", type: "classe" },
      { slug: "connettivi-discorso", it: "Connettivi del discorso", ru: "inoltre, tuttavia, quindi", type: "classe" },
      { slug: "forme-di-cortesia", it: "Forme di cortesia: dare del Lei", ru: "вежливое обращение", type: "uso" },
    ] },
    { id: "ortografia-e-pronuncia", it: "Ortografia e pronuncia", ru: "Орфография и произношение", topics: [
      { slug: "alfabeto-pronuncia", it: "Alfabeto e pronuncia", ru: "алфавит и чтение", type: "ortografia" },
      { slug: "suoni-c-g", it: "Suoni c e g", ru: "твёрдые и мягкие c и g", type: "ortografia" },
      { slug: "gruppi-gli-gn-sc", it: "Gruppi gli, gn, sc", ru: "сочетания gli, gn, sc", type: "ortografia" },
      { slug: "accento-grafico", it: "Accento grafico", ru: "графическое ударение", type: "ortografia" },
      { slug: "accento-tonico", it: "Accento tonico", ru: "словесное ударение и омографы", type: "ortografia" },
      { slug: "elisione-apostrofo", it: "Elisione e apostrofo", ru: "элизия и апостроф", type: "ortografia" },
      { slug: "troncamento", it: "Troncamento", ru: "усечение (buon, quel, san)", type: "ortografia" },
      { slug: "consonanti-doppie", it: "Consonanti doppie", ru: "удвоенные согласные", type: "ortografia" },
      { slug: "divisione-sillabe", it: "Divisione in sillabe", ru: "деление на слоги", type: "ortografia" },
      { slug: "maiuscole", it: "Uso delle maiuscole", ru: "прописные буквы", type: "ortografia" },
      { slug: "punteggiatura", it: "Punteggiatura", ru: "пунктуация", type: "ortografia" },
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
  // null — статьи нет; иначе draft (сгенерирована), checked (прошла проверяющую модель,
  // появится вместе с пакетной генерацией) или verified (вычитана владельцем)
  function statusOf(t) {
    if (!S.keys) return null;
    const k = S.keys.has(topicKey(t)) ? topicKey(t) : (S.keys.has(t.slug) ? t.slug : null);
    if (k === null) return null;
    return S.keys.get(k) || 'draft';
  }
  const hasArticle = t => statusOf(t) !== null;
  const isAdmin = () => !!(window.Auth && Auth.isAdmin && Auth.isAdmin());

  // Один запрос за ключами и статусами вместо ста пятидесяти семи проверок по одной
  async function loadKeys() {
    try {
      const res = await fetch(`${SB_URL}/rest/v1/grammar?select=topic,status:data->>status`, { headers: SB_H });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = await res.json();
      S.keys = new Map((rows || []).map(r => [norm(r.topic), r.status || 'draft']));
      S.failed = false;
    } catch (e) { S.keys = new Map(); S.failed = true; }
  }

  // ── Промпты по типам статьи ──────────────────────────────────────────────────
  // Один шаблон на все темы даёт одинаково бесполезные статьи: таблица спряжений и
  // правило про апостроф требуют разного. Промпт под каждую из 157 тем писать незачем —
  // тем семь типов, и различия целиком укладываются в них.
  const TYPE_RU = {
    paradigma: 'формы', scelta: 'выбор между двумя вариантами', uso: 'когда так говорят',
    parola: 'одно служебное слово', costruzione: 'конструкция', ortografia: 'письмо и звук',
    classe: 'закрытый набор слов'
  };
  const TYPE_RULES = {
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

  const sectionOf = t => GRAMMAR_TREE.find(s => s.topics.includes(t));
  // Смежные темы подставляем сами: если их придумает модель, ссылки поведут в никуда
  function relatedFor(t) {
    const sec = sectionOf(t); if (!sec) return [];
    return sec.topics.filter(x => x !== t).slice(0, 4).map(x => x.it);
  }

  function promptFor(t) {
    const sec = sectionOf(t) || { it: '', ru: 'Grammatica' };
    return `Ты пишешь статью для справочника по итальянской грамматике. Читатель русскоязычный, уровень от начального до среднего.

ТЕМА: ${t.it} — ${t.ru}
РАЗДЕЛ: ${sec.it} (${sec.ru})
ТИП СТАТЬИ: ${TYPE_RU[t.type] || 'правило'}

Требования к этому типу статьи:
${TYPE_RULES[t.type] || TYPE_RULES.uso}

Верни ТОЛЬКО валидный JSON без markdown:
{
  "title": "${t.it}",
  "titleRu": "${t.ru}",
  "category": "${sec.ru}",
  "explanation": "объяснение на русском, 3-5 предложений. **Жирным** ключевые термины, *курсивом* итальянские слова прямо в тексте.",
  "rules": [ { "text": "пункт правила с примером *по-итальянски* и переводом" } ],
  "table": { "headers": ["...", "..."], "rows": [["...", "..."]] },
  "examples": [ { "it": "фраза по-итальянски", "ru": "перевод", "pair": null } ],
  "errors": [ { "wrong": "как ошибаются", "right": "как правильно", "explain": "почему" } ],
  "relatedTopics": []
}

Общее:
- rules: от 3 до 6 пунктов. errors: от 2 до 4, это ошибки именно русскоязычных.
- Статья строго про заявленную тему. Соседние темы не пересказывай, для них есть свои статьи.
- Не приводи форму, если не уверен в ней. Лучше меньше примеров, чем выдуманная форма.
- title, titleRu и category возьми ровно те, что даны выше, своих не придумывай.
- relatedTopics оставь пустым массивом, смежные темы подставляются без тебя.
- Пиши по-русски; итальянское остаётся по-итальянски. Никаких уровней, баллов и обращений к читателю.`;
  }

  // ── Поиск по дереву ──────────────────────────────────────────────────────────
  function matches(t, q) { return norm(t.it).includes(q) || norm(t.ru).includes(q) || t.slug.includes(q); }
  function visibleTopics(sec, q) {
    if (!q) return sec.topics;
    if (norm(sec.it).includes(q) || norm(sec.ru).includes(q)) return sec.topics; // совпал раздел — показываем целиком
    return sec.topics.filter(t => matches(t, q));
  }

  // ── Экран ────────────────────────────────────────────────────────────────────
  const STATUS_RU = { draft: 'черновик, никто не проверял', checked: 'проверено моделью', verified: 'вычитано' };
  function topicHtml(t) {
    const st = statusOf(t);
    // Кнопка создания стоит отдельно и только у владельца: по справочнику ходят листая,
    // и статья на всех не должна появляться от случайного нажатия на строку
    const gen = (!st && isAdmin())
      ? `<button class="gram-gen" onclick="Grammatica.generate('${t.slug}')" title="Создать статью вашим ключом">создать</button>` : '';
    return `
      <div class="gram-row">
        <button class="gram-topic ${st ? 'ready' : 'empty'}" onclick="Grammatica.openTopic('${t.slug}')">
          <span class="gram-dot ${st || 'none'}" title="${st ? STATUS_RU[st] : 'статьи пока нет'}"></span>
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
    const verified = all.filter(t => statusOf(t) === 'verified').length;
    const body = GRAMMAR_TREE.map(s => sectionHtml(s, q)).join('');
    const shown = GRAMMAR_TREE.reduce((n, s) => n + visibleTopics(s, q).length, 0);
    el.innerHTML = `
      <div class="gram-index-head">
        <div class="gram-index-title">Справочник</div>
        <div class="gram-index-sub">${all.length} ${pluralRu(all.length, 'тема', 'темы', 'тем')} в ${GRAMMAR_TREE.length} разделах${S.keys ? ` · статей ${ready}, из них вычитано ${verified}` : ' · смотрю, что уже написано…'}</div>
      </div>
      ${S.failed ? `<div class="gram-note">Не удалось узнать, какие статьи уже есть. Список тем показан целиком.</div>` : ''}
      ${q ? `<div class="gram-note">Найдено тем: ${shown}. Очистите поле поиска, чтобы вернуть все разделы.</div>` : ''}
      <div class="gram-sections">${body || `<div class="gram-note">По запросу ничего не нашлось. Справочник закрытый: если темы нет в списке, статьи по ней не будет.</div>`}</div>
      <div class="gram-legend">
        <span><i class="gram-dot none"></i> статьи нет</span>
        <span><i class="gram-dot draft"></i> черновик</span>
        <span><i class="gram-dot verified"></i> вычитано</span>
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
    // Для lookupGrammar: узнать каноническую тему по строке запроса и получить её промпт
    topicByName(s) {
      const q = norm(s); if (!q) return null;
      return allTopics().find(t => t.slug === q || norm(t.it) === q || norm(t.ru) === q) || null;
    },
    promptFor, relatedFor,
    sectionRu(t) { const sec = sectionOf(t); return sec ? sec.ru : ''; },
    // Фильтр приходит из общего поля поиска: второго поля на экране быть не должно
    setFilter(q) { if (S.filter === q) return; S.filter = q; render(); },
    // После генерации статьи отметка «готово» должна появиться без перезагрузки
    async refresh() { await loadKeys(); if (_currentState === 'gramindex') render(); },
    _tree: GRAMMAR_TREE
  };
})();
