// Dizionario · основной скрипт: конфигурация, API, поиск и рендер статей, избранное, интерфейс.
// Загружается перед cards.js, graph.js и auth.js, которые опираются на его глобальные функции.
// ── Иконки: один набор (Feather), одна толщина линии. В разметке — <span data-icon="…">,
// в шаблонах — ${svgIcon('…')}. Звезда заливается классом .starred у родителя.
const ICONS = {
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  graph: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  play: '<polygon points="5 3 19 12 5 21 5 3"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  subdeck: '<polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  external: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
  fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  'arrow-down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  deck: '<rect x="3" y="8" width="13" height="13" rx="1.5"/><path d="M8 4h13v13"/>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
};
function svgIcon(name) { return `<svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`; }
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = svgIcon(el.dataset.icon); });
// ── Конфигурация ─────────────────────────────────────────────────────────────
const GEMINI_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent`;

// Темы слов: одна и та же таксономия в промптах и в легенде графа (graph.js).
// Раньше было 10 тем и почти всё уходило в «altro», теперь модель выбирает из ~40.
const CATEGORY_KEYS = ['cibo','bevande','cucina','natura','animali','piante','geografia','clima','tempo','persone','famiglia','corpo','salute','emozioni','carattere','casa','oggetti','vestiti','città','viaggio','trasporti','lavoro','scuola','scienza','tecnologia','denaro','diritto','politica','società','cultura','arte','musica','sport','comunicazione','azioni','movimento','pensiero','quantità','astratto','grammatica','altro'];
const CATEGORY_PROMPT = CATEGORY_KEYS.join(' / ') + ' — choose the single most specific one; use altro only if nothing fits';

function getApiKey() {
  return localStorage.getItem('dizionario_gemini_key') || '';
}

function getApiUrl() {
  return `${GEMINI_MODEL_URL}?key=${getApiKey()}`;
}

// ── API Key screen logic ──────────────────────────────────────────────────────
function showApiKeyScreen() {
  $('apikeyOverlay').classList.add('open');
  $('headerSettingsBtn').style.visibility = 'hidden';
  const existing = getApiKey();
  if (existing) $('apikeyInput').value = existing;
  $('fastProviderSelect').value = getFastProvider();
  $('fastKeyInput').value = getFastKey();
  onFastProviderChange();
  if (window.Auth) Auth.renderUi();
  // Назад можно только если ключ уже сохранён — при первом запуске возвращаться некуда
  $('apikeyBackBtn').classList.add('visible'); // экран всегда можно закрыть, ключ не обязателен
  $('apikeyError').classList.remove('visible');
  $('fastKeyError').classList.remove('visible');
  setTimeout(() => $('apikeyInput').focus(), 100);
}

// Подстраиваем подсказки под выбранный быстрый провайдер
function onFastProviderChange() {
  const id = $('fastProviderSelect').value;
  const p = FAST_PROVIDERS[id] || FAST_PROVIDERS.groq;
  $('fastKeyInput').placeholder = p.keyHint;
  $('fastModelInput').placeholder = `модель, по умолчанию ${p.model}`;
  $('fastModelInput').value = getFastModel(true, id); // у каждого провайдера своё сохранённое имя модели
  $('fastModels').innerHTML = p.models.map(m => `<option value="${m}">`).join('');
}

function toggleKeyVisibility(id) {
  const inp = $(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function hideApiKeyScreen() {
  $('apikeyOverlay').classList.remove('open');
  $('headerSettingsBtn').style.visibility = 'visible';
}

// Escape тоже закрывает экран ключа, если ключ уже есть
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('apikeyOverlay').classList.contains('open')) hideApiKeyScreen();
});

function toggleApiKeyVisibility() {
  const inp = $('apikeyInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function saveApiKey() {
  const val = $('apikeyInput').value.trim();
  const err = $('apikeyError');
  // Ключ Gemini можно оставить пустым: читать кэш и учить карточки можно и без него
  if (val && (!val.startsWith('AIza') || val.length < 20)) {
    err.classList.add('visible');
    return;
  }
  err.classList.remove('visible');
  // Быстрый провайдер необязателен: пустое поле ключа — всё идёт через Gemini
  const fk = $('fastKeyInput').value.trim();
  const ferr = $('fastKeyError');
  if (fk && fk.length < 20) { ferr.classList.add('visible'); return; }
  ferr.classList.remove('visible');
  if (val) localStorage.setItem('dizionario_gemini_key', val); else localStorage.removeItem('dizionario_gemini_key');
  const providerId = $('fastProviderSelect').value;
  localStorage.setItem('dizionario_fast_provider', providerId);
  if (fk) localStorage.setItem('dizionario_fast_key', fk); else localStorage.removeItem('dizionario_fast_key');
  const model = $('fastModelInput').value.trim();
  if (model) localStorage.setItem('dizionario_fast_model_' + providerId, model); else localStorage.removeItem('dizionario_fast_model_' + providerId);
  if (window.Auth && Auth.user()) Auth.pushProfile(); // ключи уезжают в профиль и подхватятся на других устройствах
  hideApiKeyScreen();
}

// Экран ключей и входа при запуске не показываем: словарь читает общий кэш и без них.
// Ключ спросится, когда понадобится генерация, вход — когда понадобятся личные данные.

// ── Supabase ──────────────────────────────────────────────────────────────────
const SB_URL = "https://qmsgumhvbsefpbbkvxgs.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtc2d1bWh2YnNlZnBiYmt2eGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjI2OTYsImV4cCI6MjA4ODk5ODY5Nn0.z30dHGdi0uhNH-t1cRS2mtGe4_liamy3FGSIJIrhhmc";
const SB_H = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`
};

async function sbGet(table, key) {
  try {
    const col = (table === 'grammar' || table === 'favorites_grammar') ? 'topic' : 'word';
    const url = `${SB_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(key)}&select=data`;
    const getHeaders = { ...SB_H, "Accept": "application/json" }; // с токеном пользователя, если он вошёл
    const res = await fetch(url, { method: "GET", headers: getHeaders });
    const text = await res.text();
    console.log(`sbGet(${table}, "${key}") status=${res.status}:`, text.slice(0, 200));
    if (!res.ok) return null;
    const rows = JSON.parse(text);
    if (Array.isArray(rows) && rows.length > 0) return rows[0].data;
  } catch(e) { console.warn("Supabase sbGet exception:", e); }
  return null;
}

// Keep sbGetTopic as alias for compatibility
async function sbGetTopic(table, key) { return sbGet(table, key); }

async function sbSave(table, keyCol, keyVal, data) {
  if (table === 'dictionary' && typeof _mapInfos !== 'undefined') _mapInfos = null; // карта слов подтянет новое слово при следующем открытии
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...SB_H, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify({ [keyCol]: keyVal, data })
    });
    if (!res.ok) console.warn("Supabase sbSave error:", res.status, await res.text());
    return res.ok;
  } catch(e) { console.warn("Supabase sbSave exception:", e); return false; }
}

function showToast(text) {
  let stack = document.getElementById('toastStack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toastStack';
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'cache-toast';
  t.textContent = text;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function showCacheBadge() { showToast('⚡ из кэша'); }

// ── Состояние ────────────────────────────────────────────────────────────────
let currentLang = 'it';
let currentMode = 'dict'; // 'dict' | 'grammar'
let currentConjugations = {};

const $ = id => document.getElementById(id);

// ── Обновление шапки и nav под текущий режим ────────────────────────────────
function applyModeUI(mode) {
  const isGram = mode === 'grammar';
  const isFav  = mode === 'favorites';
  document.body.classList.toggle('mode-grammar', isGram);
  document.body.classList.toggle('mode-cards', mode === 'cards');
  $('navDict').classList.toggle('active', mode === 'dict');
  $('navGram').classList.toggle('active', isGram);
  $('navCards').classList.toggle('active', mode === 'cards');
  $('headerFavBtn').classList.toggle('active', isFav);
  updateFavFloat(mode);
  if (mode === 'cards') {
    $('headerOrnament').textContent = 'Интервальные повторения';
    $('headerTitle').innerHTML = 'Le <em>Carte</em>';
    $('headerSubtitle').textContent = 'Колоды · Карточки · Повторение';
    document.querySelector('.lang-toggle').style.display = 'none';
    document.querySelector('.search-area').style.display = 'none';
  } else if (isFav) {
    $('headerOrnament').textContent = 'Сохранённые статьи';
    $('headerTitle').innerHTML = 'Pre<em>feriti</em>';
    $('headerSubtitle').textContent = 'Словарь · Грамматика';
    document.querySelector('.lang-toggle').style.display = 'none';
    document.querySelector('.search-area').style.display = 'none';
  } else if (isGram) {
    $('headerOrnament').textContent = 'Справочник правил';
    $('headerTitle').innerHTML = 'La Gram<em>matica</em>';
    $('headerSubtitle').textContent = 'Правила итальянского языка на русском';
    $('searchInput').placeholder = 'Найти правило: pronomi, congiuntivo…';
    document.querySelector('.lang-toggle').style.display = 'none';
    document.querySelector('.search-area').style.display = 'block';
  } else {
    $('headerOrnament').textContent = 'Vocabolario completo';
    $('headerTitle').innerHTML = 'Diziona<em>rio</em>';
    $('headerSubtitle').textContent = 'Italiano · Russo · Inglese';
    $('searchInput').placeholder = currentLang === 'ru' ? 'Введите русское слово…' : 'Cerca una parola italiana…';
    document.querySelector('.lang-toggle').style.display = 'flex';
    document.querySelector('.search-area').style.display = 'block';
  }
}

// ── Переключение режима (Словарь / Грамматика / Избранное) ──────────────────
function switchMode(mode, skipHistoryClear = false) {
  if (!skipHistoryClear) {
    // Смена раздела тоже записывается в историю: «Назад» вернёт прежний экран, даже из другого раздела.
    // showState вызываем до смены currentMode, чтобы закладка запомнила старый режим.
    if (mode === 'favorites') showState('favorites');
    else if (mode === 'cards') showState('cards');
    else { $('searchInput').value = ''; showState('initial'); }
  }
  currentMode = mode;
  applyModeUI(mode);
  if (mode === 'favorites' && !skipHistoryClear) {
    renderFavList(currentFavTab);
    updateFavCount();
    return;
  }
  if (mode === 'cards' && !skipHistoryClear) {
    if (window.Cards) Cards.open();
    return;
  }
  if (!skipHistoryClear) {
    updateInitialMsg();
    renderHistory();
  }
}

function updateInitialMsg() {
  if (currentMode === 'grammar') {
    $('initialMsgText').textContent = 'Введите тему для поиска правила';
    $('initialMsgSub').textContent = 'Например: pronomi, articoli, congiuntivo, passato prossimo…';
  } else if (currentLang === 'ru') {
    $('initialMsgText').textContent = 'Введите русское слово для поиска';
    $('initialMsgSub').textContent = 'Будет показан список итальянских переводов';
  } else {
    $('initialMsgText').textContent = 'Inserisci una parola italiana per iniziare';
    $('initialMsgSub').textContent = 'Введите итальянское слово для поиска';
  }
}

// ── Переключение языка в словаре ─────────────────────────────────────────────
function setLang(lang) {
  currentLang = lang;
  $('btnIT').classList.toggle('active', lang === 'it');
  $('btnRU').classList.toggle('active', lang === 'ru');
  $('searchInput').placeholder = lang === 'ru' ? 'Введите русское слово…' : 'Cerca una parola italiana…';
  updateInitialMsg();
  showState('initial');
  $('searchInput').value = '';
  $('searchInput').focus();
}

// ── Управление состояниями ────────────────────────────────────────────────────
// ── Navigation history ───────────────────────────────────────────────────────
const navHistory = [];
let _currentState = 'initial';
let _suppressHistory = false;

// Внутренняя история дублируется в историю браузера: кнопка «Назад» в браузере (и жест на телефоне)
// возвращает предыдущий экран приложения, а не уводит с сайта. Выход — только с самого первого экрана.
function pushHistory(restoreFn) {
  navHistory.push(restoreFn);
  updateBackBtn();
  try { history.pushState({ diz: navHistory.length }, ''); } catch(e) {}
}

function performBack() {
  if (navHistory.length === 0) return;
  const restoreFn = navHistory.pop();
  _suppressHistory = true;
  try { restoreFn(); } finally { _suppressHistory = false; }
  updateBackBtn();
}

// Кнопка «Назад» в интерфейсе: если запись есть и в истории браузера, идём через неё,
// чтобы обе истории оставались синхронными; иначе откатываем сами
function goBack() {
  if (navHistory.length === 0) return;
  if (history.state && history.state.diz === navHistory.length) { history.back(); return; }
  performBack();
}

window.addEventListener('popstate', () => {
  if (navHistory.length > 0) performBack();
});

function updateBackBtn() {
  const btn = $('backBtn');
  if (!btn) return;
  btn.classList.toggle('visible', navHistory.length > 0);
}

// States that should be tracked in history
const TRACKABLE = ['result','rulist','grammar','favorites','initial'];

function showState(state) {
  // Push history when moving away from a meaningful state to another
  // Don't push if we're going to loading/error (transient states), or if suppressed
  const pushable = ['result','rulist','grammar','favorites','cards','graph','initial'];
  if (!_suppressHistory && state !== _currentState && pushable.includes(_currentState)) {
    const savedState = _currentState;
    const savedMode = currentMode;

    if (savedState === 'result' && currentDictEntry) {
      const e = currentDictEntry; const w = currentDictWord; const m = savedMode;
      const savedLang = currentLang;
      pushHistory(() => {
        currentMode = m;
        currentLang = savedLang;
        applyModeUI(m);
        $('btnIT').classList.toggle('active', savedLang === 'it');
        $('btnRU').classList.toggle('active', savedLang === 'ru');
        renderEntry(e);
        _suppressHistory = true; showState('result'); _suppressHistory = false;
        currentDictEntry = e; currentDictWord = w;
        $('searchInput').value = e.word || w;
        checkIfStarred('dict', w);
      });
    } else if (savedState === 'grammar' && currentGramEntry) {
      const g = currentGramEntry; const m = savedMode;
      pushHistory(() => {
        currentMode = m;
        applyModeUI(m);
        renderGrammar(g);
        _suppressHistory = true; showState('grammar'); _suppressHistory = false;
      });
    } else if (savedState === 'rulist' && currentRuResults.length > 0) {
      const query = currentRuQuery;
      const results = currentRuResults;
      const ruTitle = currentRuTitle;
      const searchVal = $('searchInput').value;
      const savedLang = currentLang;
      const m = savedMode;
      pushHistory(() => {
        currentMode = m;
        currentLang = savedLang;
        applyModeUI(m);
        // восстанавливаем кнопки языка
        $('btnIT').classList.toggle('active', savedLang === 'it');
        $('btnRU').classList.toggle('active', savedLang === 'ru');
        $('searchInput').value = searchVal;
        renderRuResults(query, results, ruTitle);
        _suppressHistory = true; showState('rulist'); _suppressHistory = false;
      });
    } else if (savedState === 'graph') {
      pushHistory(() => {
        currentMode = 'dict';
        applyModeUI('dict');
        _suppressHistory = true; openWordMap(); _suppressHistory = false;
      });
    } else if (savedState === 'cards') {
      const snap = window.Cards && Cards.snapshot ? Cards.snapshot() : null; // какой именно экран колод был открыт
      pushHistory(() => {
        currentMode = 'cards';
        applyModeUI('cards');
        _suppressHistory = true; showState('cards'); _suppressHistory = false;
        if (window.Cards) { if (snap && Cards.restore && window.Auth && Auth.user()) Cards.restore(snap); else Cards.open(); }
      });
    } else if (savedState === 'favorites') {
      const tab = currentFavTab;
      pushHistory(() => {
        currentMode = 'favorites';
        applyModeUI('favorites');
        _suppressHistory = true; showState('favorites'); _suppressHistory = false;
        currentFavTab = tab;
        renderFavList(tab);
      });
    } else if (savedState === 'initial') {
      // Поиск всегда идёт через 'loading', поэтому фиксируем начальный экран
      // и при уходе в loading — иначе кнопка «Назад» после первого поиска не появится
      if (['result','rulist','grammar','favorites','cards','graph','loading'].includes(state)) {
        const m = savedMode;
        pushHistory(() => {
          currentMode = m;
          applyModeUI(m);
          updateInitialMsg();
          _suppressHistory = true; showState('initial'); _suppressHistory = false;
        });
      }
    }
  }

  _currentState = state;
  ['initialMsg','loadingMsg','errorMsg','resultCard','ruResults','grammarCard','favScreen','cardsScreen','graphScreen']
    .forEach(id => $(id).classList.remove('active'));
  if (state === 'initial')        { $('initialMsg').classList.add('active'); renderHistory(); hideInlineHistory(); }
  else if (state === 'loading')   { $('loadingMsg').classList.add('active'); $('historySection').style.display='none'; hideInlineHistory(); }
  else if (state === 'error')     { $('errorMsg').classList.add('active'); $('historySection').style.display='none'; hideInlineHistory(); }
  else if (state === 'result')    { $('resultCard').classList.add('active'); $('historySection').style.display='none'; renderInlineHistory('dict'); }
  else if (state === 'rulist')    { $('ruResults').classList.add('active'); $('historySection').style.display='none'; hideInlineHistory(); }
  else if (state === 'grammar')   { $('grammarCard').classList.add('active'); $('historySection').style.display='none'; renderInlineHistory('grammar'); }
  else if (state === 'favorites') { $('favScreen').classList.add('active'); $('historySection').style.display='none'; hideInlineHistory(); }
  else if (state === 'cards')     { $('cardsScreen').classList.add('active'); $('historySection').style.display='none'; hideInlineHistory(); }
  else if (state === 'graph')     { $('graphScreen').classList.add('active'); $('historySection').style.display='none'; hideInlineHistory(); }

  updateBackBtn();
}

// ── Gemini API ────────────────────────────────────────────────────────────────
// У моделей Gemini 3 перед ответом включены «размышления» — для словарной задачи это лишние секунды.
// Просим минимальный уровень; если модель не знает такой параметр, запоминаем и больше не шлём.
let _geminiThinkingOff = (() => { try { return localStorage.getItem('dizionario_thinking_unsupported') !== '1'; } catch(e) { return true; } })();
function markThinkingUnsupported() {
  _geminiThinkingOff = false;
  try { localStorage.setItem('dizionario_thinking_unsupported', '1'); } catch(e) {} // чтобы не тратить запрос на пробу при каждом заходе
}
function geminiRequestBody(prompt) {
  const generationConfig = { temperature: 0.2, responseMimeType: 'application/json' };
  if (_geminiThinkingOff) generationConfig.thinkingConfig = { thinkingLevel: 'minimal' };
  return JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig });
}
const isThinkingParamError = msg => /thinking/i.test(msg || '');

async function callGemini(prompt) {
  if (!getApiKey()) throw new Error('NO_GEMINI_KEY');
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: geminiRequestBody(prompt)
  });
  const data = await response.json();
  if (data.error) {
    if (_geminiThinkingOff && isThinkingParamError(data.error.message)) { markThinkingUnsupported(); return callGemini(prompt); }
    throw new Error(data.error.message);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return extractJson(text);
}

// ── Быстрый провайдер (OpenAI-совместимый API: Groq / Cerebras / Mistral) ───────────
// Используется только для словаря и подсказок и только если введён ключ; грамматика и поиск
// с русского остаются на Gemini, где качество русского текста важнее скорости.
const FAST_PROVIDERS = {
  groq:     { name: 'Groq',     url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b',
              models: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen/qwen3-32b'], keyHint: 'gsk_…' },
  cerebras: { name: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', model: 'gpt-oss-120b',
              models: ['gpt-oss-120b', 'qwen-3-235b-a22b-instruct-2507', 'llama-3.3-70b'], keyHint: 'csk-…' },
  mistral:  { name: 'Mistral',  url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest',
              models: ['mistral-small-latest', 'mistral-medium-latest'], keyHint: 'ключ Mistral' },
};
// Перенос настроек из прежней версии, где был только Cerebras
try {
  if (!localStorage.getItem('dizionario_fast_key') && localStorage.getItem('dizionario_cerebras_key')) {
    localStorage.setItem('dizionario_fast_key', localStorage.getItem('dizionario_cerebras_key'));
    localStorage.setItem('dizionario_fast_provider', 'cerebras');
    const m = localStorage.getItem('dizionario_cerebras_model'); if (m) localStorage.setItem('dizionario_fast_model_cerebras', m);
  }
  // Промежуточная версия хранила одну модель на всех провайдеров — переносим её только к Cerebras
  const legacy = localStorage.getItem('dizionario_fast_model');
  if (legacy) { if (!localStorage.getItem('dizionario_fast_model_cerebras')) localStorage.setItem('dizionario_fast_model_cerebras', legacy); localStorage.removeItem('dizionario_fast_model'); }
} catch(e) {}
function getFastProvider() { try { return FAST_PROVIDERS[localStorage.getItem('dizionario_fast_provider')] ? localStorage.getItem('dizionario_fast_provider') : 'groq'; } catch(e) { return 'groq'; } }
function getFastKey() { try { return localStorage.getItem('dizionario_fast_key') || ''; } catch(e) { return ''; } }
// Модель хранится отдельно для каждого провайдера: у Groq та же gpt-oss называется openai/gpt-oss-120b
function getFastModel(raw, provider) {
  const p = provider || getFastProvider();
  let m = ''; try { m = localStorage.getItem('dizionario_fast_model_' + p) || ''; } catch(e) {}
  return raw ? m : (m || FAST_PROVIDERS[p].model);
}
const useFastForDict = () => !!getFastKey();
const fastLabel = () => `${FAST_PROVIDERS[getFastProvider()].name} · ${getFastModel()}`;

function fastBody(prompt, stream) {
  const model = getFastModel();
  const body = {
    model, stream, temperature: 0.2, max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a precise Italian lexicographer. Answer with valid JSON only, no markdown.' },
      { role: 'user', content: prompt }
    ]
  };
  if (/gpt-oss/.test(model)) body.reasoning_effort = 'low'; // у reasoning-моделей иначе уходят секунды на размышления
  return JSON.stringify(body);
}
const fastHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${getFastKey()}` });
async function fastError(response) {
  const data = await response.json().catch(() => ({}));
  const msg = data.error?.message || data.message || `HTTP ${response.status}`;
  return new Error(`${FAST_PROVIDERS[getFastProvider()].name}: ${msg}`);
}

async function callFast(prompt) {
  const response = await fetch(FAST_PROVIDERS[getFastProvider()].url, { method: 'POST', headers: fastHeaders(), body: fastBody(prompt, false) });
  if (!response.ok) throw await fastError(response);
  const data = await response.json();
  return extractJson(data.choices?.[0]?.message?.content || '');
}

async function callFastStream(prompt, onText) {
  const response = await fetch(FAST_PROVIDERS[getFastProvider()].url, { method: 'POST', headers: fastHeaders(), body: fastBody(prompt, true) });
  if (!response.ok || !response.body) throw await fastError(response);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let chunk;
      try { chunk = JSON.parse(payload); } catch { continue; }
      if (chunk.error) throw new Error(`${FAST_PROVIDERS[getFastProvider()].name}: ` + (chunk.error.message || 'stream error'));
      const t = chunk.choices?.[0]?.delta?.content || '';
      if (t) { text += t; if (onText) { try { onText(text); } catch(e) {} } }
    }
  }
  return extractJson(text);
}

// Маршрутизация по задачам: 'dict' — быстрый провайдер при наличии ключа, всё остальное — Gemini.
// При отказе по лимиту или сбое тот же запрос сразу уходит в Gemini. Ошибка ключа не маскируется.
let _lastDictLlm = 'Gemini';
const isKeyError = msg => /401|403|Unauthorized|invalid_api_key|Wrong API Key|PERMISSION_DENIED/i.test(msg || '');
// Причину отката показываем на экране (не чаще раза в 20 секунд), иначе непонятно, почему статью написал Gemini
let _lastFallbackToastAt = 0;
function noteFastFallback(e) {
  const msg = (e && e.message) || String(e);
  console.warn('fast provider → Gemini:', msg);
  if (Date.now() - _lastFallbackToastAt > 20000) {
    _lastFallbackToastAt = Date.now();
    showToast('⚠ ' + msg.slice(0, 140) + ' → Gemini');
  }
}
async function llmJson(prompt, task) {
  if (task === 'dict' && useFastForDict()) {
    try { const r = await callFast(prompt); _lastDictLlm = fastLabel(); return r; }
    catch(e) { if (isKeyError(e.message)) throw e; noteFastFallback(e); }
  }
  const r = await callGemini(prompt);
  if (task === 'dict') _lastDictLlm = 'Gemini';
  return r;
}
async function llmJsonStream(prompt, task, onText) {
  if (task === 'dict' && useFastForDict()) {
    try { const r = await callFastStream(prompt, onText); _lastDictLlm = fastLabel(); return r; }
    catch(e) { if (isKeyError(e.message)) throw e; noteFastFallback(e); }
  }
  const r = await callGeminiStream(prompt, onText);
  if (task === 'dict') _lastDictLlm = 'Gemini';
  return r;
}

function extractJson(text) {
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');
  // Pick whichever comes first in the response
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    const arrEnd = text.lastIndexOf(']');
    if (arrEnd !== -1) return JSON.parse(text.slice(arrStart, arrEnd + 1));
  }
  if (objStart !== -1) {
    const objEnd = text.lastIndexOf('}');
    if (objEnd !== -1) return JSON.parse(text.slice(objStart, objEnd + 1));
  }
  throw new Error('No JSON found in: ' + text.slice(0, 200));
}

// Потоковый вариант: тот же один запрос, но onText получает накопленный текст по мере генерации.
// Это позволяет показать начало ответа (русский перевод), пока модель дописывает остальное.
async function callGeminiStream(prompt, onText) {
  if (!getApiKey()) throw new Error('NO_GEMINI_KEY');
  const url = `${GEMINI_MODEL_URL.replace(':generateContent', ':streamGenerateContent')}?alt=sse&key=${getApiKey()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: geminiRequestBody(prompt)
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    const msg = data.error?.message || `HTTP ${response.status}`;
    if (_geminiThinkingOff && isThinkingParamError(msg)) { markThinkingUnsupported(); return callGeminiStream(prompt, onText); }
    throw new Error(msg);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let chunk;
      try { chunk = JSON.parse(payload); } catch { continue; }
      if (chunk.error) throw new Error(chunk.error.message);
      const t = chunk.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      if (t) { text += t; if (onText) { try { onText(text); } catch(e) {} } }
    }
  }
  return extractJson(text);
}

// ── Free Dictionary API (Wiktionary) — быстрые словарные факты без LLM ─────────
// Даёт транскрипцию, род, множественное число, простые времена, английские глоссы.
// Русский перевод и итальянские определения всё равно дописывает Gemini.
const FD_URL = 'https://freedictionaryapi.com/api/v1/entries/it/';

async function fetchFreeDictionary(word) {
  try {
    const res = await fetch(FD_URL + encodeURIComponent(word.trim().toLowerCase()));
    if (!res.ok) return null;
    const data = await res.json();
    const entries = (data.entries || []).filter(en => !en.language || en.language.code === 'it');
    return entries.length ? { ...data, entries } : null;
  } catch(e) { console.warn('FreeDictionary error:', e); return null; }
}

// ── Многословные выражения (fare bella figura, in bocca al lupo) ─────────────
// Кавычки из запроса убираем, апострофы оставляем (l'amico). Транскрипцию выражения не просим у модели:
// в многословных выражениях она путает ударения. Собираем её из транскрипций отдельных слов
// (Викисловарь, затем общий кэш); если хоть одного слова нет — оставляем пустой.
const cleanQuery = w => String(w || '').replace(/["“”„«»‹›]/g, '').replace(/\s+/g, ' ').trim();
const isPhrase = w => /\s/.test(cleanQuery(w));
async function wordIpa(w) {
  const fd = await fetchFreeDictionary(w).catch(() => null);
  const p = fd && fd.entries.flatMap(en => en.pronunciations || []).find(p => p.type === 'ipa' && p.text);
  if (p) return p.text;
  const c = await sbGet('dictionary', w).catch(() => null);
  return c && c.phonetic && !isPhrase(c.word || w) ? c.phonetic : '';
}
async function phrasePhonetic(phrase) {
  const parts = cleanQuery(phrase).toLowerCase().split(' ').filter(Boolean);
  const ipa = await Promise.all(parts.map(wordIpa));
  if (ipa.some(x => !x)) return '';
  return '/' + ipa.map(x => x.trim().replace(/^[\/\[]|[\/\]]$/g, '')).join(' ') + '/';
}

// ── Проверка по Викисловарю: связи от модели не должны плодить выдуманные слова ────────
// Модель иногда придумывает слова (fieraismo). Попав в relatedWords, такое слово становится кнопкой
// под статьёй и узлом графа, а клик по нему рождает ещё одну выдуманную статью в общем кэше.
// Поэтому всё, что модель предложила как связанное, сверяем с Викисловарём до сохранения,
// а у уже сохранённых статей подчищаем список при показе.
const _wordExists = {};
let _wordCheckFailed = 0; // сколько слов не удалось проверить из-за сбоя сервиса (для отчёта чистки)
async function wordExists(w) {
  const k = cleanQuery(w).toLowerCase();
  if (!k) return false;
  if (_wordExists[k] === undefined) {
    // Сбой сервиса (не 404) — пробуем ещё раз через секунду; если снова сбой, слово считаем существующим,
    // но ответ не запоминаем: ошибочно выбросить настоящее слово хуже, чем пропустить выдуманное
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(FD_URL + encodeURIComponent(k));
        if (res.ok || res.status === 404) {
          const data = res.ok ? await res.json() : {};
          _wordExists[k] = (data.entries || []).some(en => !en.language || en.language.code === 'it');
          return _wordExists[k];
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1000));
    }
    _wordCheckFailed++;
    return true;
  }
  return _wordExists[k];
}
async function verifyWords(words, trusted = []) {
  const list = (words || []).filter(w => typeof w === 'string' && w.trim());
  const flags = await Promise.all(list.map(w => trusted.includes(w) ? true : wordExists(w)));
  return list.filter((w, i) => flags[i]);
}
async function pruneRelated(entry) {
  const list = entry.relatedWords || [];
  if (!list.length) return;
  const ok = await verifyWords(list);
  if (ok.length === list.length) return;
  entry.relatedWords = ok;
  if (currentDictEntry === entry) renderEntry(entry);
  // запись в общем кэше чиним, если пользователь вошёл (анонимам писать нельзя)
  if (window.Auth && Auth.user() && entry.word) sbSave('dictionary', 'word', entry.word.toLowerCase(), entry);
}

// Разовая чистка всего кэша (кнопка у владельца в окне SQL): у каждой статьи проверяются связи,
// изменившиеся записи сохраняются заново. Нужен вход, иначе писать в кэш нельзя.
async function cleanupRelatedCache() {
  if (!(window.Auth && Auth.user())) { showToast('Нужно войти в аккаунт'); return; }
  showToast('Проверяю кэш…');
  _wordCheckFailed = 0;
  const res = await fetch(`${SB_URL}/rest/v1/dictionary?select=word,data&limit=2000`, { headers: SB_H });
  if (!res.ok) { showToast('Не удалось прочитать кэш: HTTP ' + res.status); return; }
  const rows = await res.json();
  let fixed = 0, failed = 0; const removed = new Set(), fake = [];
  for (const row of rows) {
    const d = row.data || {}; let changed = false;
    const list = d.relatedWords || [];
    if (list.length) {
      const ok = await verifyWords(list);
      if (ok.length !== list.length) { list.filter(w => !ok.includes(w)).forEach(w => removed.add(w)); d.relatedWords = ok; changed = true; }
    }
    // Заголовок статьи: одиночное слово, которого нет в Викисловаре, — выдумка модели.
    // Удалять строки права не позволяют, поэтому помечаем: граф и «мои слова» такие статьи не показывают
    const head = String(d.word || row.word || '');
    if (!d.isPhrase && !/\s/.test(head) && !d.unverified && !(await wordExists(head))) { d.unverified = true; fake.push(head.toLowerCase()); changed = true; }
    // Ключ с кавычками (fare “bella figura”) — след старого запроса из колоды; чистая статья у выражения уже есть
    if (!d.unverified && cleanQuery(row.word) !== row.word) { d.unverified = true; fake.push(row.word.toLowerCase()); changed = true; }
    if (changed) { if (await sbSave('dictionary', 'word', row.word, d)) fixed++; else failed++; }
  }
  if (fake.length) {
    const q = fake.map(w => '"' + w.replace(/"/g, '') + '"').join(',');
    await fetch(`${SB_URL}/rest/v1/word_views?word=in.(${encodeURIComponent(q)})`, { method: 'DELETE', headers: SB_H }).catch(() => {});
  }
  // Слова в своих колодах с кавычками внутри приводим к чистому виду, чтобы карточка вела на нормальную статью
  let notesFixed = 0;
  try {
    const nres = await fetch(`${SB_URL}/rest/v1/notes?select=id,word&limit=5000`, { headers: SB_H });
    for (const n of nres.ok ? await nres.json() : []) {
      const clean = cleanQuery(n.word);
      if (clean && clean !== n.word) {
        const r = await fetch(`${SB_URL}/rest/v1/notes?id=eq.${n.id}`, { method: 'PATCH', headers: { ...SB_H, 'Content-Type': 'application/json' }, body: JSON.stringify({ word: clean }) });
        if (r.ok) notesFixed++;
      }
    }
  } catch (e) { console.warn('notes cleanup:', e); }
  _mapInfos = null;
  console.log('cleanupRelatedCache: убраны связи', [...removed], '· помечены выдуманными', fake, '· ошибок сохранения', failed);
  showToast(`Проверено статей: ${rows.length}. Исправлено: ${fixed}, связей убрано: ${removed.size}, скрыто статей: ${fake.length}, слов в колодах: ${notesFixed}${failed ? `, не сохранилось: ${failed}` : ''}${_wordCheckFailed ? `, словарь не ответил по ${_wordCheckFailed} словам — повторите позже` : ''}`);
}

const FD_POS = {
  noun: 'sostantivo', 'proper noun': 'nome proprio', verb: 'verbo', adjective: 'aggettivo', adverb: 'avverbio',
  preposition: 'preposizione', conjunction: 'congiunzione', pronoun: 'pronome', article: 'articolo',
  determiner: 'determinante', interjection: 'interiezione', numeral: 'numerale', number: 'numerale',
  phrase: 'locuzione', prefix: 'prefisso', suffix: 'suffisso', participle: 'participio', contraction: 'contrazione'
};

// Викисловарь помечает ударение акцентом (màngio); в орфографии акцент остаётся только на последней букве
const FD_ACCENTS = { 'à':'a','á':'a','è':'e','é':'e','ì':'i','í':'i','ò':'o','ó':'o','ù':'u','ú':'u' };
// Односложные формы, у которых акцент — часть орфографии (è, dà, può…); остальные (fù, stà) пишутся без него
const FD_MONO_ACCENT = new Set(['è','dà','dì','sé','sì','né','già','giù','più','può','ciò','là','lì']);
function fdStripStress(form) {
  return (form || '').split(' ').map(w => {
    if (w.length < 2) return w;
    let out = w.slice(0, -1).replace(/[àáèéìíòóùú]/g, c => FD_ACCENTS[c]) + w.slice(-1);
    const mono = /^[^aeiouàáèéìíòóùú]*[aeiouàáèéìíòóùú]+[^aeiouàáèéìíòóùú]*$/i.test(out);
    if (mono && /[àáèéìíòóùú]$/.test(out) && !FD_MONO_ACCENT.has(out.toLowerCase())) {
      out = out.slice(0, -1) + FD_ACCENTS[out.slice(-1)];
    }
    return out;
  }).join(' ');
}

// Словоформа: помечена тегом «form of»/«alt of» либо описана как «inflection of cercare:»
const fdIsFormOf = s => (s.tags || []).some(t => t === 'form of' || t === 'alt of') || /^inflection of \S+/i.test(s.definition || '');

// Начальная форма из определения словоформы: «plural of casa», «inflection of cercare:», «feminine singular of porto (…)»
function fdLemmaOf(def) {
  const m = (def || '').match(/\bof ([^\s:,;()]+)/);
  return m ? m[1].replace(/[.…]+$/, '') : null;
}
const FD_FORM_RU = { plural: 'мн. ч.', participle: 'причастие', gerund: 'герундий', imperative: 'повелит. накл.', subjunctive: 'сослагат. накл.', past: 'прош. вр.', future: 'буд. вр.', conditional: 'условн. накл.' };
const FD_SKIP_FORM_TAGS = ['alt of', 'obsolete', 'archaic', 'poetic', 'literary', 'dialectal', 'rare', 'Latinism'];

// Все начальные формы, к которым отсылает слово: cerchi → cerchio (сущ.), cercare, cerchiare (гл.)
function fdCollectLemmas(entries, skipEntry) {
  const out = [];
  entries.forEach(en => {
    if (en === skipEntry) return;
    const pos = FD_POS[en.partOfSpeech] || en.partOfSpeech || '';
    (en.senses || []).forEach(s => {
      const tags = s.tags || [];
      if (!fdIsFormOf(s) || tags.some(t => FD_SKIP_FORM_TAGS.includes(t))) return;
      const lemma = fdLemmaOf(s.definition);
      if (!lemma || out.some(l => l.lemma === lemma)) return;
      const tag = tags.find(t => FD_FORM_RU[t]);
      const desc = tag ? `${FD_FORM_RU[tag]} от ${lemma}` : (pos === 'verbo' ? `форма глагола ${lemma}` : `форма слова ${lemma}`);
      out.push({ lemma, pos, desc });
    });
  });
  return out;
}
const fdHas = (tags, ...need) => need.every(t => tags.includes(t));

function fdPerson(tags) {
  const num = tags.includes('plural') ? 1 : tags.includes('singular') ? 0 : -1;
  if (num < 0) return null;
  if (tags.includes('first-person'))  return ['io', 'noi'][num];
  if (tags.includes('second-person')) return ['tu', 'voi'][num];
  if (tags.includes('third-person'))  return ['lui/lei', 'loro'][num];
  return null;
}

const FD_SIMPLE_TENSES = [
  ['Indicativo Presente',        t => fdHas(t, 'indicative', 'present')],
  ['Indicativo Imperfetto',      t => fdHas(t, 'indicative', 'imperfect')],
  ['Indicativo Passato Remoto',  t => fdHas(t, 'indicative', 'historic')],
  ['Indicativo Futuro Semplice', t => fdHas(t, 'indicative', 'future')],
  ['Condizionale Presente',      t => t.includes('conditional')],
  ['Congiuntivo Presente',       t => fdHas(t, 'subjunctive', 'present')],
  ['Congiuntivo Imperfetto',     t => fdHas(t, 'subjunctive', 'imperfect')],
  ['Imperativo',                 t => t.includes('imperative') && !t.includes('negative')],
];
const FD_PRONOUNS  = ['io','tu','lui/lei','noi','voi','loro'];
const FD_REFLEXIVE = ['mi','ti','si','ci','vi','si'];

// Простые времена essere/avere — из них собираются составные времена
const FD_AUX = {
  avere: {
    'Indicativo Presente':        ['ho','hai','ha','abbiamo','avete','hanno'],
    'Indicativo Imperfetto':      ['avevo','avevi','aveva','avevamo','avevate','avevano'],
    'Indicativo Futuro Semplice': ['avrò','avrai','avrà','avremo','avrete','avranno'],
    'Congiuntivo Presente':       ['abbia','abbia','abbia','abbiamo','abbiate','abbiano'],
    'Congiuntivo Imperfetto':     ['avessi','avessi','avesse','avessimo','aveste','avessero'],
    'Condizionale Presente':      ['avrei','avresti','avrebbe','avremmo','avreste','avrebbero'],
  },
  essere: {
    'Indicativo Presente':        ['sono','sei','è','siamo','siete','sono'],
    'Indicativo Imperfetto':      ['ero','eri','era','eravamo','eravate','erano'],
    'Indicativo Futuro Semplice': ['sarò','sarai','sarà','saremo','sarete','saranno'],
    'Congiuntivo Presente':       ['sia','sia','sia','siamo','siate','siano'],
    'Congiuntivo Imperfetto':     ['fossi','fossi','fosse','fossimo','foste','fossero'],
    'Condizionale Presente':      ['sarei','saresti','sarebbe','saremmo','sareste','sarebbero'],
  }
};
const FD_COMPOUND = [
  ['Indicativo Passato Prossimo',    'Indicativo Presente'],
  ['Indicativo Trapassato Prossimo', 'Indicativo Imperfetto'],
  ['Indicativo Futuro Anteriore',    'Indicativo Futuro Semplice'],
  ['Congiuntivo Passato',            'Congiuntivo Presente'],
  ['Congiuntivo Trapassato',         'Congiuntivo Imperfetto'],
  ['Condizionale Passato',           'Condizionale Presente'],
];

// Собирает таблицу спряжений из forms[] Викисловаря. null — если таблица неполная.
function fdBuildConjugations(entry, infinitive) {
  const conj = {};
  let participle = '', participlePres = '', gerund = '', aux = '';
  (entry.forms || []).forEach(f => {
    const tags = f.tags || [];
    if (!f.word || f.word === '-') return;
    if (tags.some(t => ['table-tags','inflection-template','canonical','alternative','error-unrecognized-form'].includes(t))) return;
    const form = fdStripStress(f.word);
    if (tags.includes('auxiliary')) { if (!aux) aux = form; return; }
    if (tags.includes('participle')) {
      if (tags.includes('past') && !participle) participle = form;
      else if (tags.includes('present') && !participlePres) participlePres = form;
      return;
    }
    if (tags.includes('gerund')) { if (!gerund) gerund = form; return; }
    if (tags.includes('infinitive')) return;
    const tense = FD_SIMPLE_TENSES.find(([, test]) => test(tags));
    const person = fdPerson(tags);
    if (!tense || !person) return;
    conj[tense[0]] = conj[tense[0]] || {};
    // Первая форма считается основной, орфографические варианты (mangerèbbe/mangerébbe) пропускаем
    if (!conj[tense[0]][person]) conj[tense[0]][person] = form;
  });

  const present = conj['Indicativo Presente'] || {};
  if (FD_PRONOUNS.some(p => !present[p]) || !participle) return null;

  // Составные времена: вспомогательный глагол + причастие (с согласованием при essere)
  const reflexive = /rsi$/.test(infinitive);
  if (reflexive) aux = 'essere';
  if (aux !== 'essere' && aux !== 'avere') aux = 'avere';
  const pp = reflexive ? participle.replace(/si$/, '') : participle;
  const agree = i => aux === 'essere' ? pp.replace(/o$/, i < 3 ? 'o/a' : 'i/e') : pp;
  FD_COMPOUND.forEach(([name, simple]) => {
    conj[name] = {};
    FD_PRONOUNS.forEach((p, i) => {
      conj[name][p] = (reflexive ? FD_REFLEXIVE[i] + ' ' : '') + FD_AUX[aux][simple][i] + ' ' + agree(i);
    });
  });

  // Порядок лиц — как в остальном приложении
  FD_SIMPLE_TENSES.forEach(([name]) => {
    if (!conj[name]) return;
    const ordered = {};
    FD_PRONOUNS.forEach(p => { if (conj[name][p]) ordered[p] = conj[name][p]; });
    conj[name] = ordered;
  });

  const ppSg = aux === 'essere' ? pp.replace(/o$/, 'o/a') : pp;
  conj['Infinito']   = { Presente: infinitive, Passato: reflexive ? `essersi ${ppSg}` : `${aux} ${ppSg}` };
  conj['Participio'] = { Presente: participlePres || '—', Passato: participle };
  conj['Gerundio']   = { Presente: gerund || '—', Passato: reflexive ? `essendosi ${ppSg}` : `${aux === 'essere' ? 'essendo' : 'avendo'} ${ppSg}` };
  return { conjugations: conj, auxiliary: aux };
}

// Артикль по роду и началу слова — в Викисловаре его нет
function fdArticle(word, gender, plural) {
  const w = (word || '').toLowerCase();
  const vowel = /^[aeiouàèéìòù]/.test(w);
  const special = /^(s[bcdfghjklmnpqrstvwxz]|z|gn|ps|pn|x|y|i[aeou])/.test(w);
  if (gender === 'f.') return plural ? 'le' : (vowel ? "l'" : 'la');
  if (plural) return (vowel || special) ? 'gli' : 'i';
  return vowel ? "l'" : special ? 'lo' : 'il';
}

function fdCleanGloss(def) {
  return (def || '')
    .replace(/\[[^\]]*\]/g, '')                       // [auxiliary avere]
    .replace(/^\s*\([^)]*\)\s*/, '')                  // (transitive, figurative)
    .replace(/^[A-Z][^.]*\.\s+(?=(to|a|an|the)\s)/, '') // "Used as a copula. to be" → "to be"
    .replace(/\s+/g, ' ').trim();
}
function fdSenseLabel(def) { const m = (def || '').match(/^\s*\(([^)]*)\)/); return m ? m[1] : ''; }

// Переводит ответ Free Dictionary в формат статьи приложения.
// Возвращает { lemma } для словоформ, null — если данных недостаточно (тогда всё генерирует Gemini).
function mapFreeDictionary(fd, opts = {}) {
  const entries = fd.entries;
  const primary = entries.find(en => (en.senses || []).some(s => !fdIsFormOf(s)));
  const word = fd.word;
  if (!primary) {
    // Все статьи — словоформы («sono» → essere, «case» → casa). Если начальных форм несколько
    // («cerchi» → cerchio / cercare / cerchiare), возвращаем список — пользователь выберет сам
    const lemmas = fdCollectLemmas(entries).filter(l => l.lemma.toLowerCase() !== word.toLowerCase());
    if (!lemmas.length) return null;
    return lemmas.length === 1 ? { lemma: lemmas[0].lemma } : { lemmas };
  }
  const posEn = primary.partOfSpeech || '';
  const isNoun = posEn === 'noun';
  const isVerb = posEn === 'verb';
  const senses = (primary.senses || []).filter(s => !fdIsFormOf(s)).slice(0, 4);
  const tagSet = new Set(senses.flatMap(s => s.tags || []));

  let gender = null;
  if (isNoun) {
    gender = tagSet.has('feminine') && tagSet.has('masculine') ? 'm./f.'
           : tagSet.has('feminine') ? 'f.' : tagSet.has('masculine') ? 'm.' : null;
  }

  const glosses = [];
  senses.forEach(s => { const g = fdCleanGloss(s.definition); if (g && !glosses.includes(g)) glosses.push(g); });
  const englishMain = (glosses[0] || '').split(/[;,]/)[0].trim();
  const englishAlts = glosses.slice(1, 4).map(g => g.split(';')[0].trim()).filter(Boolean).join('; ');

  const related = [];
  senses.forEach(s => (s.synonyms || []).concat(s.antonyms || []).forEach(w => {
    if (w && w !== word && !related.includes(w) && related.length < 6) related.push(w);
  }));

  let singular = null, plural = null;
  if (isNoun) {
    const pl = (primary.forms || []).find(f => (f.tags || []).includes('plural')
      && !(f.tags || []).some(t => ['archaic','dialectal','obsolete','rare','alternative'].includes(t)));
    const plForm = pl ? fdStripStress(pl.word) : (tagSet.has('invariable') ? word : null);
    if (plForm) {
      singular = { article: fdArticle(word, gender, false), form: word };
      plural   = { article: fdArticle(plForm, gender, true), form: plForm };
    }
  }

  let conjugations = null, auxiliary = null;
  if (isVerb) {
    const built = fdBuildConjugations(primary, word);
    // Неполная таблица форм — пусть Gemini генерирует статью целиком (превью спряжения не нужны)
    if (!built && !opts.light) return null;
    conjugations = built ? built.conjugations : null;
    auxiliary = built ? built.auxiliary : null;
  }

  const ipa = (primary.pronunciations || []).find(p => p.type === 'ipa' && p.text);
  return {
    word, partOfSpeech: FD_POS[posEn] || posEn, gender, isNoun, isVerb,
    phonetic: ipa ? ipa.text : '',
    singular, plural, conjugations, auxiliary,
    english: { main: englishMain, alternatives: englishAlts },
    relatedWords: related,
    senses: senses.map(s => ({
      gloss: fdCleanGloss(s.definition),
      label: fdSenseLabel(s.definition),
      example: (s.examples && s.examples[0]) || (s.quotes && s.quotes[0] && s.quotes[0].text) || ''
    })),
    // Слово одновременно является формой других слов («porta» → portare): покажем подсказку
    alsoForms: fdCollectLemmas(entries, primary).filter(l => l.lemma.toLowerCase() !== word.toLowerCase()),
    source: 'wiktionary',
    sourceUrl: (fd.source && fd.source.url) || ''
  };
}

// Короткий промпт только на то, чего в Викисловаре нет: русский, категория, итальянские определения
// ── Русский перевод без LLM: раздел «Значение» итальянской статьи на ru.wiktionary ─
const _ruWiktCache = {};
const _ruWiktInflight = {};
// Не больше двух одновременных запросов к Wikimedia; устаревшие (мышь уже ушла) отбрасываются
const _ruWiktLimit = { active: 0, max: 2, waiting: [] };
function _ruWiktAcquire() {
  if (_ruWiktLimit.active < _ruWiktLimit.max) { _ruWiktLimit.active++; return Promise.resolve(); }
  return new Promise(r => _ruWiktLimit.waiting.push(r)).then(() => { _ruWiktLimit.active++; });
}
function _ruWiktRelease() {
  _ruWiktLimit.active--;
  const next = _ruWiktLimit.waiting.shift();
  if (next) next();
}
// skipIf — функция; если к моменту запуска она вернёт true, запрос не делается (превью уже закрыто)
async function fetchRuWiktionary(word, skipIf) {
  const w = (word || '').toLowerCase();
  if (!w) return null;
  if (_ruWiktCache[w] !== undefined) return _ruWiktCache[w];
  if (_ruWiktInflight[w]) return _ruWiktInflight[w];
  const run = (async () => {
    if (skipIf && skipIf()) return null;
    await _ruWiktAcquire();
    if (_ruWiktCache[w] !== undefined) { _ruWiktRelease(); return _ruWiktCache[w]; }
    if (skipIf && skipIf()) { _ruWiktRelease(); return null; }
    let out = null, cacheable = true;
    try {
      const url = `https://ru.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(w)}&prop=wikitext&format=json&formatversion=2&redirects=1&origin=*`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          // MediaWiki отдаёт ошибки со статусом 200: «missingtitle» — статьи правда нет,
          // «ratelimited» и прочее — временный сбой, запоминать нельзя
          if (data.error.code !== 'missingtitle') { cacheable = false; console.warn('ru.wiktionary:', data.error.code); }
        } else {
          const text = data.parse && data.parse.wikitext;
          if (text) out = parseRuWiktionaryMeanings(text);
        }
      } else {
        cacheable = false; // 429 и прочие сбои не считаем за «статьи нет»
        console.warn('ru.wiktionary status', res.status);
      }
    } catch(e) { cacheable = false; console.warn('ru.wiktionary error:', e); }
    _ruWiktRelease();
    if (cacheable) _ruWiktCache[w] = out;
    return out;
  })();
  _ruWiktInflight[w] = run;
  run.finally(() => { delete _ruWiktInflight[w]; });
  return run;
}

function parseRuWiktionaryMeanings(text) {
  // Берём только итальянский раздел: от «= {{-it-}} =» до следующего языкового заголовка
  const start = text.search(/=\s*\{\{-it-\}\}\s*=/);
  if (start === -1) return null;
  let section = text.slice(start + 1);
  const next = section.search(/\n=\s*\{\{-[a-z-]+-\}\}\s*=/);
  if (next !== -1) section = section.slice(0, next);
  const m = section.match(/==+\s*Значение\s*==+[^\n]*\n([\s\S]*?)(?=\n=|$)/);
  if (!m) return null;
  const items = [];
  m[1].split('\n').forEach(line => {
    if (!/^#\s*[^#*:]/.test(line)) return; // только строки значений, без примеров (#*) и пояснений (#:)
    let s = line.replace(/^#\s*/, '');
    for (let i = 0; i < 6 && /\{\{/.test(s); i++) s = s.replace(/\{\{[^{}]*\}\}/g, ''); // {{пример|…}}, {{помета|…}}
    s = s.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
         .replace(/'{2,}/g, '')
         .replace(/<[^>]+>/g, '')
         .replace(/\s+/g, ' ')
         .replace(/^[\s,;:.—–-]+|[\s,;:.—–-]+$/g, '')
         .trim();
    if (s && !/^\?+$/.test(s) && !/отсутствует/i.test(s)) items.push(s);
  });
  if (!items.length) return null;
  const parts = items[0].split(/[;,]/).map(x => x.trim()).filter(Boolean);
  const main = parts[0];
  if (!main || main.length > 60) return null;
  const alts = [];
  parts.slice(1).concat(items.slice(1).map(x => x.split(/[;,]/)[0].trim()))
    .forEach(a => { if (a && a !== main && a.length <= 60 && !alts.includes(a) && alts.length < 4) alts.push(a); });
  return { main, alternatives: alts.join('; ') };
}

function fdCompletionPrompt(base, opts = {}) {
  const senseLines = base.senses.map((s, i) =>
    `${i + 1}. ${s.label ? '(' + s.label + ') ' : ''}${s.gloss}${s.example ? ` — e.g. "${s.example}"` : ''}`).join('\n');
  const needRelated = (base.relatedWords || []).length < 3;
  const meaningsRule = base.senses.length
    ? `exactly ${base.senses.length} item(s), one per known sense above, in the same order. Reuse the given example if it is a natural full sentence, otherwise write your own.`
    : `1-3 items ordered from most to least frequent usage.`;
  return `You are an expert Italian linguist. Complete the dictionary entry for the Italian ${base.partOfSpeech} "${base.word}"${base.gender ? ` (${base.gender})` : ''}.
Known senses from Wiktionary (English glosses, most common first):
${senseLines || '(none)'}

Return ONLY valid JSON, no markdown:
{${opts.skipRussian ? '' : `
  "russian": { "main": "primary Russian translation", "alternatives": "2-3 alternatives semicolon-separated or empty" },`}
  "category": "${CATEGORY_PROMPT}",
  "meanings": [ { "definition": "Definition in Italian (1 sentence)", "example": "Natural example sentence in Italian" } ]${needRelated ? `,
  "relatedWords": ["3-5 semantically related Italian words (synonyms, antonyms, thematic)"]` : ''}
}
meanings: ${meaningsRule}`;
}

function fdMergeCompletion(base, extra, fastRu) {
  const meanings = Array.isArray(extra.meanings) && extra.meanings.some(m => m && m.definition)
    ? extra.meanings.filter(m => m && m.definition).map(m => ({ definition: m.definition, example: m.example || '' }))
    : base.senses.map(s => ({ definition: s.gloss, example: s.example }));
  const related = (base.relatedWords || []).slice();
  (Array.isArray(extra.relatedWords) ? extra.relatedWords : []).forEach(w => {
    if (typeof w === 'string' && w && !related.includes(w) && related.length < 6) related.push(w);
  });
  const { senses, _pending, ...rest } = base;
  return {
    ...rest,
    russian: fastRu && fastRu.main
      ? fastRu
      : { main: extra.russian?.main || '', alternatives: extra.russian?.alternatives || '' },
    category: extra.category || 'altro',
    meanings,
    relatedWords: related,
    llm: _lastDictLlm
  };
}

// Гибридный путь: сразу показываем факты из Викисловаря, Gemini дописывает остальное
async function lookupWordHybrid(query, base) {
  const key = base.word.toLowerCase();
  renderEntry({ ...base, _pending: true });
  showState('result');
  addToHistory(base.word, 'dict');
  try {
    // Русский перевод показываем как можно раньше, но запрос к Gemini один: ответ читаем потоком,
    // поле russian в схеме стоит первым и приходит через ~1 с, определения дочитываются следом.
    // Параллельно бесплатно пробуем ru.wiktionary (~0.3 с).
    let shownRu = null;
    const takeRu = ru => {
      if (!ru || !ru.main || shownRu) return;
      shownRu = ru;
      if (currentDictWord === key && currentDictEntry && currentDictEntry._pending) renderEntry({ ...currentDictEntry, russian: ru });
    };
    // Если перевод уже добыт для всплывающей подсказки этого слова — показываем его сразу
    const previewQ = _previewCache['d:' + key] || _previewCache['d:' + query.toLowerCase()];
    if (previewQ && previewQ.data && previewQ.data.russian && previewQ.data.russian.main) takeRu(previewQ.data.russian);
    const wiktJob = fetchRuWiktionary(base.word).then(takeRu).catch(() => {});
    let shownMeanings = 0;
    const extra = await llmJsonStream(fdCompletionPrompt(base), 'dict', partial => {
      const m = partial.match(/"russian"\s*:\s*\{[^{}]*\}/);
      if (m) { try { takeRu(JSON.parse('{' + m[0] + '}').russian); } catch(e) {} }
      // Определения показываем по одному, как только очередной объект в массиве meanings дописан
      const mi = partial.indexOf('"meanings"');
      if (mi === -1 || currentDictWord !== key || !currentDictEntry || !currentDictEntry._pending) return;
      const objs = [...partial.slice(mi).matchAll(/\{\s*"definition"\s*:\s*"(?:[^"\\]|\\.)*"\s*(?:,\s*"example"\s*:\s*"(?:[^"\\]|\\.)*"\s*)?\}/g)];
      if (objs.length <= shownMeanings) return;
      const meanings = objs.map(o => { try { return JSON.parse(o[0]); } catch(e) { return null; } }).filter(Boolean);
      if (!meanings.length) return;
      shownMeanings = objs.length;
      renderEntry({ ...currentDictEntry, meanings, _pending: true });
    });
    await wiktJob;
    const entry = fdMergeCompletion(base, extra, shownRu);
    entry.relatedWords = await verifyWords(entry.relatedWords, base.relatedWords || []); // синонимы Викисловаря доверенные, добавки модели — проверяем
    const queryKey = query.toLowerCase();
    await sbSave('dictionary', 'word', key, entry);
    if (queryKey !== key) await sbSave('dictionary', 'word', queryKey, entry);
    // Пока Gemini отвечал, пользователь мог уйти на другое слово
    if (currentDictWord === key) renderEntry(entry);
  } catch(err) {
    console.error('lookupWordHybrid error:', err);
    if (currentDictWord !== key) return;
    // Оставляем быстрые данные на экране, вместо определений — английские глоссы и причина ошибки
    const { _pending, ...shown } = currentDictEntry || base;
    currentDictEntry = shown;
    $('transRU').textContent = '—'; $('transRUalt').textContent = '';
    $('meaningsContainer').innerHTML = `
      <div class="definition-text">${base.senses.map(s => makeClickable(s.gloss)).join('; ') || '—'}</div>
      <div class="pending-error">${describeApiError(err.message || '')}</div>`;
  }
}

// ── Поиск итальянского слова ──────────────────────────────────────────────────
async function lookupWord(word, _depth = 0, opts = {}) {
  word = cleanQuery(word);
  if (!word) return;
  showState('loading');
  const prompt = `You are an expert Italian linguist. Given the Italian word "${word}", provide a complete dictionary entry in JSON format.
Return ONLY valid JSON, no markdown, no explanation. Schema:
{
  "word": "canonical form",
  "partOfSpeech": "sostantivo / verbo / aggettivo / avverbio / preposizione / congiunzione / pronome / articolo / interiezione",
  "category": "${CATEGORY_PROMPT}",
  "gender": "m. / f. / m./f. / null",
  "phonetic": "IPA with ˈ before stressed syllable",
  "singular": { "article": "il/lo/la/l'", "form": "word" },
  "plural": { "article": "i/gli/le", "form": "plural form" },
  "russian": { "main": "primary Russian translation", "alternatives": "2-3 alts semicolon-separated or empty" },
  "english": { "main": "primary English translation", "alternatives": "2-3 alts semicolon-separated or empty" },
  "meanings": [
    { "definition": "Definition in Italian (1 sentence)", "example": "Example sentence in Italian" },
    { "definition": "Second meaning if exists", "example": "Example for second meaning" }
  ],
  "isNoun": true/false,
  "isVerb": true/false,
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
If isVerb false → conjugations null. If isNoun false → singular/plural null. If not a real Italian word → word null. relatedWords: 3-5 semantically related Italian words (synonyms, antonyms, thematic). meanings: 1-4 items ordered from most frequent to least frequent usage. Always include at least 1 meaning.`;
  // 1. Кэш Supabase — мгновенно
  const cachedWord = opts.force ? null : await sbGet('dictionary', word.toLowerCase());
  if (cachedWord) {
    try { renderEntry(cachedWord); showState('result'); showCacheBadge(); addToHistory(cachedWord.word || word, 'dict'); pruneRelated(cachedWord); }
    catch(e) { console.error("renderEntry from cache failed:", e); }
    return;
  }

  // Выражение из нескольких слов: у Викисловаря статьи нет, а общий промпт со спряжениями и родом
  // тут только вредит — отдельная короткая ветка
  if (isPhrase(word)) return lookupPhrase(word);

  // 2. Викисловарь: транскрипция, формы, спряжения, глоссы — быстро и без LLM
  const fd = await fetchFreeDictionary(word);
  const mapped = fd ? mapFreeDictionary(fd) : null;
  if (mapped && mapped.lemmas) {
    // Словоформа сразу нескольких слов — показываем список на выбор
    const items = mapped.lemmas.map(l => ({ italian: l.lemma, partOfSpeech: l.pos, shortDefinition: l.desc }));
    renderRuResults(word, items, `«${word}» — форма нескольких слов`);
    showState('rulist');
    return;
  }
  if (mapped && mapped.lemma) {
    // Введена словоформа («sono», «mangiato») — переходим к начальной форме
    if (_depth < 2 && mapped.lemma.toLowerCase() !== word.toLowerCase()) {
      showToast(`${word} → ${mapped.lemma}`);
      return lookupWord(mapped.lemma, _depth + 1);
    }
  } else if (mapped) {
    return lookupWordHybrid(word, mapped);
  }

  // 3. Fallback: слова нет в Викисловаре или таблица форм неполная — Gemini генерирует всё
  try {
    const entry = await llmJson(prompt, 'dict');
    if (!entry.word) { $('errorText').textContent = `"${word}" — parola non trovata`; showState('error'); return; }
    entry.relatedWords = await verifyWords(entry.relatedWords);
    // Слова нет в Викисловаре, статья целиком от модели: помечаем, в граф и «мои слова» оно не попадёт
    entry.unverified = !(await wordExists(entry.word || word));
    const canonicalKey = (entry.word || word).toLowerCase();
    const queryKey = word.toLowerCase();
    await sbSave('dictionary', 'word', canonicalKey, entry);
    // Кэшируем и под введённым запросом, чтобы повторный поиск попадал в кэш
    if (queryKey !== canonicalKey) await sbSave('dictionary', 'word', queryKey, entry);
    renderEntry(entry);
    showState('result');
    addToHistory(entry.word || word, 'dict');
  } catch(err) {
    console.error("lookupWord error:", err);
    const msg = err.message || '';
    handleApiError(msg);
  }
}

// ── Устойчивое выражение ──────────────────────────────────────────────────────
// Модель просим только о смысле: перевод, значение, пример, регистр. Без транскрипции, рода,
// множественного числа и таблиц спряжения — их у выражения нет, а модель их всё равно выдумывает.
async function lookupPhrase(phrase) {
  const ipaJob = phrasePhonetic(phrase);
  const prompt = `You are an expert Italian linguist. The user entered the Italian multi-word expression "${phrase}" (an idiom, collocation or set phrase).
Return ONLY valid JSON, no markdown:
{
  "word": "the expression in its canonical citation form (verb in the infinitive, no quotes), or null if it is not a real Italian expression",
  "partOfSpeech": "locuzione verbale / locuzione avverbiale / locuzione nominale / locuzione aggettivale / locuzione prepositiva / modo di dire / proverbio",
  "category": "${CATEGORY_PROMPT}",
  "literal": "word-for-word Russian gloss, only if it differs from the actual meaning, otherwise empty",
  "russian": { "main": "idiomatic Russian equivalent (not word-for-word)", "alternatives": "2-3 alternatives semicolon-separated or empty" },
  "english": { "main": "idiomatic English equivalent", "alternatives": "2-3 alternatives semicolon-separated or empty" },
  "meanings": [ { "definition": "What the expression means, in Italian (1 sentence)", "example": "Natural Italian sentence using the whole expression" } ],
  "register": "neutro / colloquiale / formale / volgare / letterario / regionale",
  "relatedWords": ["3-5 related Italian words or expressions"]
}
meanings: 1-3 items, most frequent first. Do NOT include phonetic transcription, gender, plural or conjugation tables.`;
  try {
    const raw = await llmJson(prompt, 'dict');
    if (!raw || !raw.word) { $('errorText').textContent = `"${phrase}" — espressione non trovata`; showState('error'); return; }
    const entry = {
      word: cleanQuery(raw.word) || phrase, partOfSpeech: raw.partOfSpeech || 'locuzione', category: raw.category || 'altro',
      gender: null, phonetic: await ipaJob, singular: null, plural: null, conjugations: null,
      russian: raw.russian || { main: '', alternatives: '' }, english: raw.english || { main: '', alternatives: '' },
      meanings: Array.isArray(raw.meanings) ? raw.meanings.filter(m => m && m.definition) : [],
      isNoun: false, isVerb: false, isPhrase: true,
      literal: raw.literal || '', register: raw.register || '',
      relatedWords: await verifyWords(raw.relatedWords),
      llm: _lastDictLlm
    };
    const key = entry.word.toLowerCase(), queryKey = phrase.toLowerCase();
    await sbSave('dictionary', 'word', key, entry);
    if (queryKey !== key) await sbSave('dictionary', 'word', queryKey, entry);
    renderEntry(entry);
    showState('result');
    addToHistory(entry.word, 'dict');
  } catch (err) {
    console.error('lookupPhrase error:', err);
    handleApiError(err.message || '');
  }
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function describeApiError(msg) {
  if (/NO_GEMINI_KEY/.test(msg)) return `${svgIcon('key')} Этого слова ещё нет в общей базе, для генерации статьи нужен ключ Gemini — <u style="cursor:pointer" onclick="showApiKeyScreen()">указать ключ</u> (бесплатно, минута)`;
  const isQuota = /quota|RESOURCE_EXHAUSTED|429|rate limit/i.test(msg);
  const isBadKey = /API[ _]key|API_KEY|PERMISSION_DENIED|leaked|403|401|Unauthorized|invalid_api_key/i.test(msg);
  const who = (msg.match(/^(Groq|Cerebras|Mistral)/i) || [])[1] || 'Gemini';
  if (isBadKey) return `${svgIcon('key')} Проблема с ключом ${who} — <u style="cursor:pointer" onclick="showApiKeyScreen()">сменить ключ</u>`;
  if (isQuota)  return `⏳ Лимит ${who} исчерпан — попробуйте позже или <u style="cursor:pointer" onclick="showApiKeyScreen()">смените ключ</u>`;
  return 'Errore: ' + escapeHtml(msg);
}

function handleApiError(msg) {
  $('errorText').innerHTML = describeApiError(msg);
  showState('error');
}

// ── Поиск русского слова ──────────────────────────────────────────────────────
async function lookupRussian(word) {
  if (!word.trim()) return;
  showState('loading');
  const prompt = `You are an expert Italian linguist. The user entered the Russian word "${word}".
Find all meaningful Italian translations. Return ONLY a JSON array, no markdown. Each item:
{"italian":"canonical form","partOfSpeech":"sostantivo/verbo/etc","gender":"m./f./null","shortDefinition":"краткое значение по-русски (4-8 слов)","register":"neutro/formale/colloquiale/letterario"}
Return 1-8 items. If no translation exists, return [].`;
  const cachedRu = await sbGet('russian_search', word.toLowerCase());
  if (cachedRu) {
    if (cachedRu.length === 1) { await lookupWord(cachedRu[0].italian); return; }
    renderRuResults(word, cachedRu); showState('rulist'); showCacheBadge(); return;
  }

  try {
    const results = await callGemini(prompt);
    if (!Array.isArray(results) || results.length === 0) { $('errorText').textContent = `"${word}" — перевод не найден`; showState('error'); return; }
    await sbSave('russian_search', 'word', word.toLowerCase(), results);
    if (results.length === 1) { await lookupWord(results[0].italian); return; }
    renderRuResults(word, results);
    showState('rulist');
  } catch(err) {
    console.error("lookupRussian error:", err);
    handleApiError(err.message || '');
  }
}

// ── Поиск грамматического правила ────────────────────────────────────────────
const GRAMMAR_SUGGESTIONS = [
  'articoli', 'pronomi personali', 'pronomi relativi', 'congiuntivo',
  'condizionale', 'passato prossimo', 'imperfetto', 'futuro',
  'imperativo', 'aggettivi', 'preposizioni', 'verbi modali',
  'discorso indiretto', 'gerundio', 'participio', 'verbi riflessivi'
];

async function lookupGrammar(topic, opts = {}) {
  if (!topic.trim()) return;
  showState('loading');
  const prompt = `Ты эксперт по итальянской грамматике. Пользователь ищет правило по теме: "${topic}".

Составь подробную грамматическую статью на РУССКОМ языке. Верни ТОЛЬКО валидный JSON без markdown:
{
  "title": "Название темы по-итальянски",
  "titleRu": "Название по-русски",
  "category": "Категория (Глаголы / Существительные / Местоимения / Предлоги / Синтаксис / etc)",
  "explanation": "Подробное объяснение на русском (3-5 предложений). Используй **жирный** для ключевых терминов и *курсив* для итальянских примеров прямо в тексте.",
  "rules": [
    { "text": "Правило 1 — подробно, с примерами **в тексте**. *Esempio: ...* — перевод" },
    { "text": "Правило 2..." }
  ],
  "table": {
    "headers": ["Колонка 1", "Колонка 2", "Колонка 3"],
    "rows": [
      ["ячейка", "*итал. форма*", "пример"],
      ["ячейка", "*итал. форма*", "пример"]
    ]
  },
  "examples": [
    { "it": "Итальянское предложение", "ru": "Перевод на русский", "pair": null },
    { "it": "Пример с местоимением", "ru": "Перевод", "pair": "prev" }
  ],
  "errors": [
    { "wrong": "Неправильная форма", "right": "Правильная форма", "explain": "Почему так" }
  ],
  "relatedTopics": ["связанная тема 1", "связанная тема 2", "связанная тема 3"]
}

Правила:
- rules: 3-6 пунктов
- table: если есть что показать в таблице (формы, окончания, местоимения и т.д.) — обязательно заполни; если нет смысла — пустой объект {}
- examples: 3-6 примеров. Если примеры логически связаны парами (например, с существительным и с местоимением), используй поле "pair": для второго примера пары укажи "pair": "prev", для первого "pair": null. Не все примеры должны быть парными.
- errors: 2-4 типичные ошибки русскоязычных
- Если тема не относится к итальянской грамматике — верни { "error": "not_grammar" }`;

  const cachedGram = opts.force ? null : await sbGetTopic('grammar', topic.toLowerCase());
  if (cachedGram) { renderGrammar(cachedGram); showState('grammar'); showCacheBadge(); addToHistory(cachedGram.title || topic, 'grammar'); return; }

  try {
    const g = await callGemini(prompt);
    if (g.error === 'not_grammar') {
      $('errorText').textContent = `"${topic}" — попробуйте другую грамматическую тему`;
      showState('error'); return;
    }
    const titleKey = (g.title || topic).toLowerCase();
    const topicKey = topic.toLowerCase();
    await sbSave('grammar', 'topic', titleKey, g);
    // Кэшируем и под введённым запросом: заголовок от Gemini почти никогда не совпадает с запросом
    if (topicKey !== titleKey) await sbSave('grammar', 'topic', topicKey, g);
    renderGrammar(g);
    showState('grammar');
    addToHistory(g.title || topic, 'grammar');
  } catch(err) {
    console.error("lookupGrammar error:", err);
    handleApiError(err.message || '');
  }
}

// ── Рендер грамматической статьи ─────────────────────────────────────────────
function parseInline(text) {
  return (text || '')
    .replace(/\\\*/g, '____STAR____')   // protect escaped \*
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/____STAR____/g, '*');
}

function renderGrammar(g) {
  currentGramEntry = g;
  currentGramTopic = (g.title || '').toLowerCase();
  const card = $('grammarCard');
  card.innerHTML = '';

  // Hero
  const hero = document.createElement('div');
  hero.className = 'grammar-hero';
  hero.innerHTML = `
    <div class="hero-actions">
      <button class="hero-action-btn refresh" id="gramRefreshBtn" title="Обновить статью" onclick="refreshEntry('grammar')">${svgIcon('refresh')}</button>
      <button class="hero-action-btn star" id="gramStarBtn" title="Добавить в избранное" onclick="toggleFav('grammar')">${svgIcon('star')}</button>
    </div>
    <div class="grammar-topic-badge">${g.category || 'Grammatica'}</div>
    <div class="grammar-title">${formatGrammarTitle(g.title || '')}</div>
    <div class="grammar-subtitle-text">${g.titleRu || ''}</div>
  `;
  card.appendChild(hero);

  // Explanation
  if (g.explanation) {
    const sec = makeSec('Объяснение');
    const p = document.createElement('div');
    p.className = 'grammar-explanation';
    p.innerHTML = parseInline(g.explanation);
    sec.appendChild(p);
    card.appendChild(sec);
  }

  // Rules
  if (g.rules && g.rules.length > 0) {
    const sec = makeSec('Правила');
    const list = document.createElement('div');
    list.className = 'grammar-rules';
    g.rules.forEach((r, i) => {
      const rule = document.createElement('div');
      rule.className = 'grammar-rule';
      rule.innerHTML = `
        <div class="grammar-rule-num">${i + 1}</div>
        <div class="grammar-rule-text">${parseInline(r.text)}</div>
      `;
      list.appendChild(rule);
    });
    sec.appendChild(list);
    card.appendChild(sec);
  }

  // Table
  if (g.table && g.table.headers && g.table.headers.length > 0) {
    const sec = makeSec('Таблица форм');
    const tbl = document.createElement('table');
    tbl.className = 'grammar-table';
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    g.table.headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    (g.table.rows || []).forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.innerHTML = parseInline(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    const tblWrap = document.createElement('div');
    tblWrap.className = 'grammar-table-wrap';
    tblWrap.appendChild(tbl);
    sec.appendChild(tblWrap);
    card.appendChild(sec);
  }

  // Examples
  if (g.examples && g.examples.length > 0) {
    const sec = makeSec('Примеры');
    const list = document.createElement('div');
    list.className = 'grammar-examples';
    let currentPair = null;
    g.examples.forEach(ex => {
      const el = document.createElement('div');
      el.className = 'grammar-example';
      el.innerHTML = `
        <div class="grammar-example-it">${parseInline(ex.it)}</div>
        <div class="grammar-example-ru">${parseInline(ex.ru)}</div>
      `;
      if (ex.pair === 'prev' && currentPair) {
        // Add arrow connector and append to pair group
        const arrow = document.createElement('div');
        arrow.className = 'grammar-example-arrow';
        arrow.innerHTML = svgIcon('arrow-down');
        currentPair.appendChild(arrow);
        currentPair.appendChild(el);
      } else {
        currentPair = document.createElement('div');
        currentPair.className = 'grammar-example-group';
        currentPair.appendChild(el);
        list.appendChild(currentPair);
      }
    });
    sec.appendChild(list);
    card.appendChild(sec);
  }

  // Errors
  if (g.errors && g.errors.length > 0) {
    const sec = makeSec('Типичные ошибки');
    const list = document.createElement('div');
    list.className = 'grammar-errors';
    g.errors.forEach(err => {
      const wrong = document.createElement('div');
      wrong.className = 'grammar-error wrong';
      wrong.innerHTML = `<div class="grammar-error-mark">✗</div><div class="grammar-error-content"><div class="grammar-error-form">${parseInline(err.wrong)}</div><div class="grammar-error-explain">${parseInline(err.explain)}</div></div>`;
      const right = document.createElement('div');
      right.className = 'grammar-error right';
      right.innerHTML = `<div class="grammar-error-mark">✓</div><div class="grammar-error-content"><div class="grammar-error-form">${parseInline(err.right)}</div></div>`;
      const pair = document.createElement('div');
      pair.className = 'grammar-error-pair';
      pair.appendChild(wrong);
      pair.appendChild(right);
      list.appendChild(pair);
    });
    sec.appendChild(list);
    card.appendChild(sec);
  }

  // Related topics
  if (g.relatedTopics && g.relatedTopics.length > 0) {
    const sec = makeSec('Смежные темы');
    const sugg = document.createElement('div');
    sugg.className = 'grammar-suggestions';
    g.relatedTopics.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'grammar-suggestion';
      btn.textContent = t;
      btn.onclick = () => { $('searchInput').value = t; lookupGrammar(t); };
      sugg.appendChild(btn);
    });
    sec.appendChild(sugg);
    card.appendChild(sec);
  }
  currentGramEntry = g;
  currentGramTopic = (g.title || '').toLowerCase();
  setTimeout(() => checkIfStarred('grammar', currentGramTopic), 100);
  updateFavCount();
}

function makeSec(label) {
  const sec = document.createElement('div');
  sec.className = 'grammar-section';
  const lbl = document.createElement('div');
  lbl.className = 'grammar-section-label';
  lbl.textContent = label;
  sec.appendChild(lbl);
  return sec;
}

function formatGrammarTitle(title) {
  // Italicize the last word for style
  const words = title.trim().split(' ');
  if (words.length <= 1) return `<em>${title}</em>`;
  const last = words.pop();
  return words.join(' ') + ' <em>' + last + '</em>';
}

// ── Рендер результатов поиска с русского ────────────────────────────────────
function renderRuResults(query, results, titleText) {
  currentRuQuery = query;
  currentRuResults = results;
  currentRuTitle = titleText || '';
  const container = $('ruResults');
  container.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'ru-results-title';
  title.textContent = titleText || `Переводы слова «${query}»`;
  container.appendChild(title);
  results.forEach(item => {
    const card = document.createElement('div');
    card.className = 'ru-word-card';
    card.innerHTML = `
      <div class="ru-word-left">
        <div class="ru-word-italian">${item.italian}</div>
        <div class="ru-word-meta">${item.partOfSpeech}${item.gender ? ' · ' + item.gender : ''} · ${item.shortDefinition}${item.register && item.register !== 'neutro' ? ' · <em>' + item.register + '</em>' : ''}</div>
      </div>
      <div class="ru-word-arrow">→</div>
    `;
    card.onclick = () => {
      // Переключаем язык без setLang: тот сбрасывает состояние на initial и кладёт лишний шаг в историю «Назад»
      currentLang = 'it';
      $('btnIT').classList.add('active'); $('btnRU').classList.remove('active');
      $('searchInput').placeholder = 'Cerca una parola italiana…';
      $('searchInput').value = item.italian;
      lookupWord(item.italian);
    };
    container.appendChild(card);
  });
}

// ── Рендер словарной статьи ───────────────────────────────────────────────────
function highlightStress(phonetic) {
  return (phonetic || '').replace(/ˈ([^ˌ\s.]+)/g, (m, syl) => `ˈ<span class="stress">${syl}</span>`);
}

function renderEntry(e) {
  // Повторный рендер того же слова (дозагрузка перевода/определений) не должен сбрасывать спряжения
  const sameWord = currentDictWord === (e.word || '').toLowerCase() && currentConjugations === e.conjugations;
  currentDictEntry = e;
  currentDictWord = (e.word || '').toLowerCase();
  checkIfStarred('dict', (e.word || '').toLowerCase());
  if (!e._pending && !e.unverified && window.Auth) Auth.logView((e.word || '').toLowerCase()); // для личной карты слов
    $('wordTitle').textContent = e.word;
  $('wordPhonetic').innerHTML = highlightStress(e.phonetic);
  $('wordType').textContent = e.partOfSpeech || '—';
  // Теги слова: по умолчанию тема из статьи, у вошедшего пользователя — свои (клик переименовывает,
  // «+» добавляет). Часть речи слева тегом не является и не редактируется.
  document.querySelectorAll('.word-tag, .word-tag-add').forEach(x => x.remove());
  const tags = window.Auth ? Auth.tagsFor(e.word, e.category) : (e.category && window.WordGraph ? [WordGraph.catKey(e.category)] : []);
  let anchor = $('wordType');
  tags.forEach((t, i) => {
    const tag = document.createElement('span');
    tag.className = 'word-category-badge word-tag';
    // Цвет из общей палитры графа (graph.js); у своих тегов цвет назначен при создании
    const color = window.WordGraph && WordGraph.CAT_COLORS[t];
    if (color && /^#[0-9a-f]{6}$/i.test(color)) {
      const [r, g, b] = [1, 3, 5].map(k => parseInt(color.slice(k, k + 2), 16));
      tag.style.background = `rgba(${r},${g},${b},0.14)`;
      tag.style.border = `1px solid rgba(${r},${g},${b},0.45)`;
      tag.style.color = color;
    } else if (color) { tag.style.color = color; tag.style.borderColor = color; }
    tag.textContent = t;
    tag.title = 'Нажмите, чтобы переименовать тег для этого слова';
    tag.onclick = () => window.Auth && Auth.renameTagUi(e.word, e.category, i);
    anchor.after(tag); anchor = tag;
  });
  const add = document.createElement('button');
  add.className = 'word-tag-add'; add.type = 'button'; add.textContent = '+'; add.title = 'Добавить тег';
  add.onclick = () => window.Auth && Auth.addTagUi(e.word, e.category);
  anchor.after(add);
  // Для глаголов вместо рода показываем вспомогательный глагол
  // У выражения вместо рода — буквальный перевод и регистр
  const genderEl = $('wordGender');
  if (e.isPhrase) genderEl.textContent = [e.literal ? `букв. «${e.literal}»` : '', e.register && e.register !== 'neutro' ? e.register : ''].filter(Boolean).join(' · ');
  else if (e.gender) genderEl.textContent = e.gender;
  // Вспомогательный глагол: подпись капителью, сам глагол — акцентом, чтобы строка не читалась как часть слова
  else if (e.isVerb && e.auxiliary) genderEl.innerHTML = `<span class="word-aux-label">ausiliare</span><span class="word-aux">${escapeHtml(e.auxiliary)}</span>`;
  else genderEl.textContent = '';
  const alsoEl = $('wordAlso');
  if (e.alsoForms && e.alsoForms.length) {
    alsoEl.innerHTML = 'также форма слова: ' + e.alsoForms.map(l => {
      const safe = l.lemma.replace(/'/g, "\\'");
      return `<button type="button" title="${l.desc}" onclick="$('searchInput').value='${safe}'; lookupWord('${safe}')">${l.lemma}</button>`;
    }).join(', ');
    alsoEl.style.display = 'block';
  } else {
    alsoEl.style.display = 'none';
  }
  if (e._pending && !e.russian?.main) {
    $('transRU').innerHTML = '<span class="pending-shimmer"></span>';
    $('transRUalt').innerHTML = '<span class="pending-shimmer short"></span>';
  } else {
    $('transRU').textContent = e.russian?.main || '—';
    $('transRUalt').textContent = e.russian?.alternatives || '';
  }
  $('transEN').textContent = e.english?.main || '—';
  $('transENalt').textContent = e.english?.alternatives || '';

  // Атрибуция источника
  const srcEl = $('entrySource');
  if (e.source === 'wiktionary') {
    const href = e.sourceUrl || `https://en.wiktionary.org/wiki/${encodeURIComponent(e.word || '')}`;
    srcEl.innerHTML = `Fonte: <a href="${href}" target="_blank" rel="noopener">Wiktionary</a> · CC BY-SA 4.0${e.llm ? ` · definizioni: ${escapeHtml(e.llm)}` : ''}`;
    srcEl.style.display = 'block';
  } else if (e.unverified) {
    srcEl.innerHTML = 'В Викисловаре этого слова нет: статья составлена моделью и может быть неточной или выдуманной';
    srcEl.style.display = 'block';
  } else {
    srcEl.style.display = 'none';
  }

  const pluralRow = $('pluralRow');
  if (e.isNoun && e.singular && e.plural) {
    pluralRow.style.display = 'grid';
    $('pluralForms').innerHTML = `
      <div class="plural-item">
        <div class="plural-item-label">Singolare</div>
        <div class="plural-item-form"><em>${e.singular.article}</em>${e.singular.form}</div>
      </div>
      <div class="plural-item">
        <div class="plural-item-label">Plurale</div>
        <div class="plural-item-form"><em>${e.plural.article}</em>${e.plural.form}</div>
      </div>`;
  } else {
    pluralRow.style.display = 'none';
  }

  // Definizione — поддержка нового формата meanings и старого definition/example
  const mc = $('meaningsContainer');
  if (e._pending && !(e.meanings && e.meanings.length > 0)) {
    // Быстрые данные уже на экране, Gemini дописывает определения и перевод
    mc.innerHTML = `
      <span class="pending-shimmer wide"></span>
      <span class="pending-shimmer wide" style="width:70%"></span>
      <div class="pending-note">Gemini готовит перевод и определения…</div>`;
  } else if (e.meanings && e.meanings.length > 0) {
    // Новый формат — массив значений
    if (e.meanings.length === 1) {
      // Одно значение — без номера
      const m = e.meanings[0];
      mc.innerHTML = `
        <div class="definition-text">${makeClickable(m.definition || '—')}</div>
        ${m.example ? `<div class="example-text">« ${makeClickable(m.example)} »</div>` : ''}`;
    } else {
      // Несколько значений — с нумерацией
      mc.innerHTML = `<div class="meanings-list">${e.meanings.map((m, i) => `
        <div class="meaning-item">
          <div class="meaning-num">${i + 1}</div>
          <div class="meaning-body">
            <div class="meaning-definition">${makeClickable(m.definition || '')}</div>
            ${m.example ? `<div class="meaning-example">« ${makeClickable(m.example)} »</div>` : ''}
          </div>
        </div>`).join('')}
      </div>`;
    }
    // Ответ ещё идёт потоком — следующие значения на подходе
    if (e._pending) mc.insertAdjacentHTML('beforeend', '<div class="pending-note"><span class="pending-shimmer wide" style="width:60%"></span></div>');
  } else {
    // Старый формат из кэша — definition + example
    mc.innerHTML = `
      <div class="definition-text">${makeClickable(e.definition || '—')}</div>
      ${e.example ? `<div class="example-text">« ${makeClickable(e.example)} »</div>` : ''}`;
  }

  // Related words
  const relSec = $('relatedWordsSection');
  const relList = $('relatedWordsList');
  if (e.relatedWords && e.relatedWords.length > 0) {
    relList.innerHTML = '';
    e.relatedWords.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'related-word-btn';
      btn.textContent = w;
      btn.onclick = () => { $('searchInput').value = w; lookupWord(w); };
      relList.appendChild(btn);
    });
    // rounded bottom only if no conjugation
    relSec.className = 'related-words-section' + (e.isVerb ? ' has-conj' : '');
    relSec.style.display = 'block';
    applyRelatedView(e);
  } else {
    relSec.style.display = 'none';
    destroyRelatedGraph();
  }

  const conjSection = $('conjugationSection');
  if (e.isVerb && e.conjugations) {
    conjSection.style.display = 'block';
    conjSection.classList.toggle('has-related', !!(e.relatedWords && e.relatedWords.length > 0));
    if (!sameWord) {
      currentConjugations = e.conjugations;
      renderTenseTabs(e.conjugations);
      $('conjBody').classList.remove('open');
      $('conjToggle').classList.remove('open');
    }
  } else {
    conjSection.style.display = 'none';
  }
}

// ── Спряжения ────────────────────────────────────────────────────────────────
const TENSE_GROUPS = [
  { label: 'Indicativo', tenses: ['Indicativo Presente','Indicativo Passato Prossimo','Indicativo Imperfetto','Indicativo Trapassato Prossimo','Indicativo Passato Remoto','Indicativo Futuro Semplice','Indicativo Futuro Anteriore'] },
  { label: 'Congiuntivo', tenses: ['Congiuntivo Presente','Congiuntivo Passato','Congiuntivo Imperfetto','Congiuntivo Trapassato'] },
  { label: 'Condizionale', tenses: ['Condizionale Presente','Condizionale Passato'] },
  { label: 'Imperativo', tenses: ['Imperativo'] },
  { label: 'Forme nominali', tenses: ['Infinito','Participio','Gerundio'] }
];

// Выбранное наклонение запоминается между словами
let currentMood = 'Indicativo';

// Вкладки — наклонения; внутри показываются сразу все его времена
function renderTenseTabs(conj) {
  const tabs = $('tenseTabs');
  tabs.innerHTML = '';
  const available = Object.keys(conj || {});
  const groups = TENSE_GROUPS
    .map(g => ({ label: g.label, tenses: g.tenses.filter(t => available.includes(t)) }))
    .filter(g => g.tenses.length);
  if (!groups.length) { $('conjTableWrap').innerHTML = ''; return; }
  if (!groups.some(g => g.label === currentMood)) currentMood = groups[0].label;
  groups.forEach(group => {
    const btn = document.createElement('button');
    btn.className = 'tense-tab' + (group.label === currentMood ? ' active' : '');
    btn.textContent = group.label;
    btn.onclick = () => {
      currentMood = group.label;
      tabs.querySelectorAll('.tense-tab').forEach(t => t.classList.toggle('active', t === btn));
      renderMoodCards(group, conj);
    };
    tabs.appendChild(btn);
  });
  renderMoodCards(groups.find(g => g.label === currentMood), conj);
}

function renderMoodCards(group, conj) {
  const wrap = $('conjTableWrap'); wrap.innerHTML = '';
  const cards = document.createElement('div'); cards.className = 'tense-cards';
  // Supabase (jsonb) не сохраняет порядок ключей, поэтому сортируем местоимения сами
  const order = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro', 'Presente', 'Passato'];
  const rank = k => { const i = order.indexOf(k); return i === -1 ? order.length : i; };
  group.tenses.forEach(tense => {
    // На телефоне карточки свёрнуты, на компьютере сразу развёрнуты (клик по названию сворачивает)
    const collapsedByDefault = window.matchMedia('(max-width: 640px)').matches;
    const card = document.createElement('div'); card.className = 'tense-card' + (collapsedByDefault ? ' collapsed' : '');
    const title = document.createElement('div'); title.className = 'tense-card-title';
    title.textContent = tense.replace(/^(Indicativo|Congiuntivo|Condizionale) /, '');
    title.onclick = () => card.classList.toggle('collapsed');
    card.appendChild(title);
    const body = document.createElement('div'); body.className = 'tense-card-body';
    const entries = Object.entries(conj[tense] || {}).sort((a, b) => rank(a[0]) - rank(b[0]));
    body.style.setProperty('--rows', Math.max(1, Math.ceil(entries.length / 2)));
    entries.forEach(([pronoun, form]) => {
      const row = document.createElement('div'); row.className = 'conj-row';
      row.innerHTML = `<div class="conj-pronoun">${pronoun}</div><div class="conj-form">${form}</div>`;
      body.appendChild(row);
    });
    card.appendChild(body);
    cards.appendChild(card);
  });
  wrap.appendChild(cards);
}

$('conjToggle').addEventListener('click', () => {
  $('conjBody').classList.toggle('open');
  $('conjToggle').classList.toggle('open');
});

// ── Обновление статьи ────────────────────────────────────────────────────────
async function refreshEntry(mode) {
  const btnId = mode === 'dict' ? 'dictRefreshBtn' : 'gramRefreshBtn';
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('spinning');

  try {
    if (mode === 'dict') {
      const word = currentDictWord || (currentDictEntry && currentDictEntry.word ? currentDictEntry.word.toLowerCase() : '');
      if (!word) return;
      // Удаление в базе никому не разрешено (общий кэш), поэтому просто генерируем заново и перезаписываем
      await lookupWord(word, 0, { force: true });
      // Если слово есть в избранном — обновляем и там
      await updateFavIfStarred('dict', word);
    } else if (mode === 'grammar') {
      const topic = currentGramTopic || '';
      if (!topic) return;
      await lookupGrammar(topic, { force: true });
      // Если тема есть в избранном — обновляем и там
      await updateFavIfStarred('grammar', topic);
    }
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
}

async function updateFavIfStarred(mode, key) {
  try {
    const table = mode === 'dict' ? 'favorites_dict' : 'favorites_grammar';
    const col   = mode === 'dict' ? 'word' : 'topic';
    // Проверяем — есть ли в избранном
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(key)}&select=${col}`, { headers: SB_H });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return; // не в избранном
    // Обновляем с новыми данными
    const newData = mode === 'dict' ? currentDictEntry : currentGramEntry;
    if (!newData) return;
    await fetch(`${SB_URL}/rest/v1/${table}?on_conflict=user_id,${col}`, {
      method: 'POST',
      headers: { ...SB_H, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ [col]: key, data: newData })
    });
  } catch(e) { console.warn('updateFavIfStarred error:', e); }
}

// ── Избранное ─────────────────────────────────────────────────────────────────
let currentFavTab = 'words';
let currentDictEntry = null;
let currentGramEntry = null;
let currentDictWord = '';
let currentGramTopic = '';
let currentRuQuery = '';
let currentRuResults = [];
let currentRuTitle = '';

async function getFavorites(type) {
  try {
    const col = type === 'words' ? 'word' : 'topic';
    const table = type === 'words' ? 'favorites_dict' : 'favorites_grammar';
    const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=created_at.desc`, { headers: SB_H });
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch(e) { return []; }
}

async function toggleFav(mode) {
  if (window.Auth && !Auth.require('Войдите, чтобы сохранять избранное')) return;
  if (mode === 'dict') {
    if (!currentDictEntry) return;
    if (currentDictEntry._pending) { showToast('⏳ дождитесь загрузки статьи'); return; }
    const btn = document.getElementById('dictStarBtn');
    const isStarred = btn.classList.contains('starred');
    if (isStarred) {
      await fetch(`${SB_URL}/rest/v1/favorites_dict?word=eq.${encodeURIComponent(currentDictWord)}`, { method: 'DELETE', headers: SB_H });
      btn.classList.remove('starred');
    } else {
      await fetch(`${SB_URL}/rest/v1/favorites_dict?on_conflict=user_id,word`, {
        method: 'POST', headers: { ...SB_H, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ word: currentDictWord, data: currentDictEntry })
      });
      btn.classList.add('starred');
    }
    updateFavCount();
  } else {
    if (!currentGramEntry) return;
    const btn = document.getElementById('gramStarBtn');
    const isStarred = btn.classList.contains('starred');
    if (isStarred) {
      await fetch(`${SB_URL}/rest/v1/favorites_grammar?topic=eq.${encodeURIComponent(currentGramTopic)}`, { method: 'DELETE', headers: SB_H });
      btn.classList.remove('starred');
    } else {
      await fetch(`${SB_URL}/rest/v1/favorites_grammar?on_conflict=user_id,topic`, {
        method: 'POST', headers: { ...SB_H, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ topic: currentGramTopic, data: currentGramEntry })
      });
      btn.classList.add('starred');
    }
    updateFavCount();
  }
}

async function checkIfStarred(mode, key) {
  try {
    const table = mode === 'dict' ? 'favorites_dict' : 'favorites_grammar';
    const col = mode === 'dict' ? 'word' : 'topic';
    const btnId = mode === 'dict' ? 'dictStarBtn' : 'gramStarBtn';
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(key)}&select=${col}`, { headers: SB_H });
    const rows = await res.json();
    const btn = document.getElementById(btnId);
    const starred = Array.isArray(rows) && rows.length > 0;
    if (btn) {
      btn.classList.toggle('starred', starred);
    }
  } catch(e) { console.warn('checkIfStarred error:', e); }
}

function updateFavCount() {} // badge removed

function switchFavTab(tab) {
  currentFavTab = tab;
  $('favTabWords').classList.toggle('active', tab === 'words');
  $('favTabGram').classList.toggle('active', tab === 'grammar');
  const s = $('favSearch'); if (s) s.value = '';
  cachedFavRows = [];
  favSelected.clear();
  const vt = $('favViewToggle'); if (vt) vt.style.display = tab === 'words' ? '' : 'none';
  renderFavList(tab);
}

let cachedFavRows = [];

async function renderFavList(tab) {
  const list = $('favList');
  const searchEl = $('favSearch');
  if (searchEl) searchEl.value = '';
  list.innerHTML = '<div class="fav-empty" style="font-style:italic;opacity:0.5">Загрузка…</div>';
  const table = tab === 'words' ? 'favorites_dict' : 'favorites_grammar';
  const keyCol = tab === 'words' ? 'word' : 'topic';
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=created_at.desc`, { headers: SB_H });
    const rows = await res.json();
    cachedFavRows = Array.isArray(rows) ? rows : [];
    list.innerHTML = '';
    if (cachedFavRows.length === 0) {
      list.innerHTML = '<div class="fav-empty">Пока ничего не сохранено — нажмите звёздочку на любой статье</div>';
      _favVisibleKeys = []; updateFavToolbar();
      return;
    }
    renderFavRows(cachedFavRows, tab);
  } catch(e) { list.innerHTML = '<div class="fav-empty">Ошибка загрузки</div>'; }
}

function filterFavList() {
  const q = ($('favSearch')?.value || '').toLowerCase().trim();
  if (!q) { renderFavRows(cachedFavRows, currentFavTab); return; }
  const filtered = cachedFavRows.filter(row => {
    const d = row.data;
    const searchable = [
      row.word || row.topic || '',
      d?.word || d?.title || '',
      d?.titleRu || '',
      d?.russian?.main || '',
      d?.category || '',
      d?.partOfSpeech || '',
    ].join(' ').toLowerCase();
    return searchable.includes(q);
  });
  if (filtered.length === 0) {
    $('favList').innerHTML = `<div class="fav-empty-search">Ничего не найдено по «${q}»</div>`;
    return;
  }
  renderFavRows(filtered, currentFavTab);
}

// ── Избранное → колоды карточек ──────────────────────────────────────────────
const favSelected = new Set();
let _favVisibleKeys = [];
function toggleFavSelect(key, on) { if (on) favSelected.add(key); else favSelected.delete(key); updateFavToolbar(); }
function favSelectAll() {
  const all = _favVisibleKeys.length && _favVisibleKeys.every(k => favSelected.has(k));
  if (all) favSelected.clear(); else _favVisibleKeys.forEach(k => favSelected.add(k));
  document.querySelectorAll('#favList .fav-check').forEach(cb => { cb.checked = favSelected.has(cb.dataset.key); });
  updateFavToolbar();
}
function updateFavToolbar() {
  const tb = $('favToolbar'); if (!tb) return;
  if (currentFavTab !== 'words' || !_favVisibleKeys.length) { tb.style.display = 'none'; return; }
  const n = favSelected.size;
  const all = _favVisibleKeys.every(k => favSelected.has(k));
  tb.style.display = 'flex';
  tb.innerHTML = `
    <button class="cards-btn" onclick="favSelectAll()">${all ? 'Снять выделение' : 'Выбрать все'}</button>
    <button class="cards-btn primary" ${n ? '' : 'disabled'} onclick="favAddSelectedToDeck()">${svgIcon('plus')} В колоду${n ? ` (${n})` : ''}</button>`;
}
function favAddSelectedToDeck() {
  const entries = cachedFavRows.filter(r => favSelected.has(r.word)).map(r => r.data);
  if (!entries.length || !window.Cards) return;
  Cards.addEntries(entries);
}
function favAddOneToDeck(event, key) {
  event.stopPropagation();
  const row = cachedFavRows.find(r => r.word === key);
  if (row && window.Cards) Cards.addEntries([row.data]);
}
function addEntryToDeck() {
  if (!currentDictEntry || !window.Cards) return;
  if (currentDictEntry._pending) { showToast('⏳ дождитесь загрузки статьи'); return; }
  Cards.addEntries([currentDictEntry]);
}

// ── Графы: связанные слова, карта всех слов, избранное ──────────────────────
const graphHandlers = () => ({
  onOpen: w => { $('searchInput').value = w; lookupWord(w); },
  onTap: w => showBottomSheet(w, false),
  onHover: (w, x, y) => showPreview(null, w, false, x, y),
  onHoverEnd: () => hidePreview()
});
let _relatedGraph = null, _relatedGraphKey = '';
const getRelatedView = () => { try { return localStorage.getItem('dizionario_related_view') || 'graph'; } catch(e) { return 'graph'; } };
const getRelatedDepth = () => { try { return parseInt(localStorage.getItem('dizionario_related_depth')) || 2; } catch(e) { return 2; } };
function setRelatedView(v) {
  try { localStorage.setItem('dizionario_related_view', v); } catch(e) {}
  if (currentDictEntry) applyRelatedView(currentDictEntry);
}
function destroyRelatedGraph() {
  if (_relatedGraph) { _relatedGraph.destroy(); _relatedGraph = null; }
  _relatedGraphKey = '';
  const g = $('relatedGraph'); if (g) g.innerHTML = '';
}
function applyRelatedView(e) {
  const view = window.WordGraph ? getRelatedView() : 'list';
  document.querySelectorAll('#relatedViewToggle .view-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.v === view));
  $('relatedWordsList').style.display = view === 'list' ? '' : 'none';
  $('relatedGraph').style.display = view === 'graph' ? 'block' : 'none';
  if (view !== 'graph') { destroyRelatedGraph(); return; }
  // Статья перерисовывается при дозагрузке; граф пересобираем, только если сменилось слово или список связей
  const key = (e.word || '').toLowerCase() + '|' + (e.relatedWords || []).join(',');
  if (_relatedGraph && _relatedGraphKey === key) return;
  renderRelatedGraph(e, getRelatedDepth());
}
async function renderRelatedGraph(e, depth) {
  destroyRelatedGraph();
  const word = (e.word || '').toLowerCase();
  _relatedGraphKey = word + '|' + (e.relatedWords || []).join(',');
  _relatedGraph = WordGraph.create($('relatedGraph'), {
    height: window.innerWidth < 640 ? '360px' : '440px', depthControl: true, depth,
    onDepth: d => { try { localStorage.setItem('dizionario_related_depth', d); } catch(e2) {} if (currentDictEntry) renderRelatedGraph(currentDictEntry, d); },
    extraButtons: '<button class="wg-btn" onclick="openWordMap()" title="Все открытые слова">вся карта</button>',
    hint: 'В центре это слово, вокруг его связи, дальше связи уже открытых слов. Серые точки ещё не открывались. Тяните, крутите колесо, кликайте.',
    ...graphHandlers()
  });
  const g = _relatedGraph;
  try {
    const data = await WordGraph.buildAround(e, depth);
    if (window.Auth) Auth.applyTagsToNodes(data.nodes);
    if (g === _relatedGraph) g.setData(data.nodes, data.edges, { center: word });
  } catch(err) { if (g === _relatedGraph) g.setLoading('Не удалось загрузить связи: ' + err.message); }
}

// Карта всех открытых слов
let _mapGraph = null, _mapInfos = null;
function openWordMap() {
  if (currentMode !== 'dict') { currentMode = 'dict'; applyModeUI('dict'); }
  showState('graph');
  if (_mapGraph) { _mapGraph.destroy(); _mapGraph = null; }
  const box = $('graphScreen');
  const loggedIn = !!(window.Auth && Auth.user());
  box.innerHTML = `<div class="graph-screen-head"><div class="cards-title">Карта слов</div><div class="cards-head-deck">${loggedIn ? 'слова, которые вы открывали' : 'все открытые слова и связи между ними'}</div></div><div id="mapGraphBox"></div>`;
  _mapGraph = WordGraph.create($('mapGraphBox'), {
    height: window.innerWidth < 640 ? '65vh' : '70vh', neighborsToggle: true, neighbors: false,
    onNeighbors: v => { _mapNeighbors = v; loadWordMap(); },
    extraButtons: loggedIn ? '<label class="wg-inline"><input type="checkbox" class="wg-all"> tutte le parole della base</label>' : '',
    hint: 'Каждая точка это открытое слово, линии это связи из статей. Слова одной темы сбиваются в кучки. Тяните, крутите колесо, кликайте.',
    ...graphHandlers()
  });
  const all = $('mapGraphBox').querySelector('.wg-all');
  if (all) all.addEventListener('change', () => { _mapShowAll = all.checked; loadWordMap(); });
  _mapNeighbors = false; _mapShowAll = false;
  loadWordMap();
}
let _mapNeighbors = false, _mapShowAll = false;
async function loadWordMap() {
  const g = _mapGraph; if (!g) return;
  try {
    if (!_mapInfos) _mapInfos = await WordGraph.loadAllWords();
    let infos = _mapInfos;
    // Вошедший пользователь видит свои слова; общая база — по галочке
    if (window.Auth && Auth.user() && !_mapShowAll) {
      const mine = await Auth.myWords();
      if (mine) { infos = new Map(); _mapInfos.forEach((info, id) => { if (mine.has(id)) infos.set(id, info); }); }
    }
    const data = WordGraph.buildGraph(infos, { neighbors: _mapNeighbors });
    if (window.Auth) Auth.applyTagsToNodes(data.nodes);
    if (g === _mapGraph) { g.setData(data.nodes, data.edges); if (!data.nodes.length) g.setLoading('Пока пусто: откройте несколько слов, и они появятся здесь'); }
  } catch(err) { if (g === _mapGraph) g.setLoading('Не удалось загрузить: ' + err.message); }
}

// Избранное: список или граф
let favView = 'list', _favGraph = null;
function setFavView(v) {
  favView = v;
  document.querySelectorAll('#favViewToggle .view-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  filterFavList();
}
function renderFavGraph(rows) {
  const list = $('favList');
  if (_favGraph) { _favGraph.destroy(); _favGraph = null; }
  list.innerHTML = '<div id="favGraphBox"></div>';
  let neighbors = false;
  const build = () => { const data = WordGraph.buildFromEntries(rows.map(r => r.data), { neighbors }); if (window.Auth) Auth.applyTagsToNodes(data.nodes); _favGraph.setData(data.nodes, data.edges); };
  _favGraph = WordGraph.create($('favGraphBox'), {
    height: window.innerWidth < 640 ? '60vh' : '65vh', neighborsToggle: true, neighbors,
    onNeighbors: v => { neighbors = v; build(); },
    hint: 'Связи между избранными словами. Включите соседей, чтобы увидеть, к чему они ведут.',
    ...graphHandlers()
  });
  build();
}

function renderFavRows(rows, tab) {
  const list = $('favList');
  const keyCol = tab === 'words' ? 'word' : 'topic';
  if (tab === 'words' && favView === 'graph' && window.WordGraph) { _favVisibleKeys = []; updateFavToolbar(); renderFavGraph(rows); return; }
  if (_favGraph) { _favGraph.destroy(); _favGraph = null; }
  list.innerHTML = '';
  _favVisibleKeys = tab === 'words' ? rows.map(r => r.word) : [];
  // Выделение не должно ссылаться на слова, которых в списке уже нет
  [...favSelected].forEach(k => { if (!cachedFavRows.some(r => r.word === k)) favSelected.delete(k); });
  rows.forEach(row => {
      const key = row[keyCol];
      const d = row.data;
      const card = document.createElement('div');
      card.className = 'fav-card';
      if (tab === 'words') {
        const safeKey = key.replace(/'/g, "\\'");
        card.innerHTML = `
          <input type="checkbox" class="fav-check" data-key="${escapeHtml(key)}" ${favSelected.has(key) ? 'checked' : ''} title="Выбрать" onclick="event.stopPropagation()" onchange="toggleFavSelect(this.dataset.key, this.checked)">
          <div class="fav-card-left">
            <div class="fav-card-word">${d.word || key}</div>
            <div class="fav-card-meta">${d.partOfSpeech || ''}${d.gender ? ' · ' + d.gender : ''} · ${d.russian?.main || ''}</div>
          </div>
          <div class="fav-card-right">
            <button class="fav-todeck" title="В колоду карточек" onclick="favAddOneToDeck(event,'${safeKey}')">${svgIcon('plus')} в колоду</button>
            <button class="fav-remove" title="Удалить" onclick="removeFav(event,'${tab}','${safeKey}')">${svgIcon('x')}</button>
            <span class="fav-card-arrow">→</span>
          </div>`;
        card.onclick = (e) => {
          if (e.target.classList.contains('fav-remove') || e.target.classList.contains('fav-check') || e.target.classList.contains('fav-todeck')) return;
          currentMode = 'dict';
          currentLang = 'it';
          applyModeUI('dict');
          $('btnIT').classList.add('active');
          $('btnRU').classList.remove('active');
          $('searchInput').value = key;
          currentDictEntry = row.data;
          currentDictWord = key;
          renderEntry(row.data);
          showState('result');
          checkIfStarred('dict', key);
        };
      } else {
        card.innerHTML = `
          <div class="fav-card-left">
            <div class="fav-card-word">${d.title || key}</div>
            <div class="fav-card-meta">${d.titleRu || ''} · ${d.category || ''}</div>
          </div>
          <div class="fav-card-right">
            <button class="fav-remove" title="Удалить" onclick="removeFav(event,'${tab}','${key.replace(/'/g,"\\'")}')">${svgIcon('x')}</button>
            <span class="fav-card-arrow">→</span>
          </div>`;
        card.onclick = (e) => {
          if (e.target.classList.contains('fav-remove')) return;
          currentMode = 'grammar';
          applyModeUI('grammar');
          $('searchInput').value = key;
          renderGrammar(row.data);
          showState('grammar');
        };
      }
      list.appendChild(card);
  });
  updateFavToolbar();
}

async function removeFav(e, tab, key) {
  e.stopPropagation();
  const table = tab === 'words' ? 'favorites_dict' : 'favorites_grammar';
  const col = tab === 'words' ? 'word' : 'topic';
  await fetch(`${SB_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(key)}`, { method: 'DELETE', headers: SB_H });
  renderFavList(tab);
  updateFavCount();
}

// ── Озвучка (Google TTS + fallback Web Speech) ───────────────────────────────
let _ttsAudio = null;

function speakWord() {
  if (!currentDictEntry) return;
  const btn = $('dictSpeakBtn');
  const word = currentDictEntry.word || '';

  // Останавливаем если уже играет
  if (_ttsAudio && !_ttsAudio.paused) {
    _ttsAudio.pause();
    _ttsAudio.currentTime = 0;
    btn.classList.remove('speaking');
    return;
  }

  // Пробуем Google TTS
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=it&client=tw-ob&q=${encodeURIComponent(word)}`;
  _ttsAudio = new Audio(url);
  _ttsAudio.onplay  = () => btn.classList.add('speaking');
  _ttsAudio.onended = () => { btn.classList.remove('speaking'); _ttsAudio = null; };
  _ttsAudio.onerror = () => {
    btn.classList.remove('speaking');
    _ttsAudio = null;
    speakWebSpeech(word, btn);
  };
  _ttsAudio.play().catch(() => {
    btn.classList.remove('speaking');
    _ttsAudio = null;
    speakWebSpeech(word, btn);
  });
}

function speakWebSpeech(word, btn) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(word);
  utt.lang = 'it-IT';
  utt.rate = 0.85;
  // Ищем итальянский голос
  const voices = window.speechSynthesis.getVoices();
  const itVoice = voices.find(v => v.lang === 'it-IT')
    || voices.find(v => v.lang.startsWith('it'))
    || voices.find(v => v.name.toLowerCase().includes('italian'));
  if (itVoice) utt.voice = itVoice;
  utt.onstart = () => btn.classList.add('speaking');
  utt.onend   = () => btn.classList.remove('speaking');
  utt.onerror = () => btn.classList.remove('speaking');
  window.speechSynthesis.speak(utt);
}

if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ── История поиска ────────────────────────────────────────────────────────────
const HISTORY_KEY = 'dizionario_history';
const HISTORY_MAX = 10;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function addToHistory(word, mode) {
  if (!word) return;
  const h = getHistory().filter(i => !(i.word === word && i.mode === mode));
  h.unshift({ word, mode });
  if (h.length > HISTORY_MAX) h.length = HISTORY_MAX;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function renderHistory() {
  const sec = $('historySection');
  if (!sec) return;
  // Показываем историю только на начальном экране в нужном режиме
  if (_currentState !== 'initial') { sec.style.display = 'none'; return; }
  const h = getHistory().filter(i => i.mode === currentMode);
  if (h.length === 0) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  sec.innerHTML = `
    <div class="history-label">
      <span>Недавние</span>
      <button class="history-clear" onclick="clearHistory()">очистить</button>
    </div>
    <div class="history-chips">
      ${h.map(i => `<button class="history-chip" onclick="historyClick('${i.word.replace(/'/g,"\\'")}','${i.mode}')">${i.word}</button>`).join('')}
    </div>`;
}

function renderInlineHistory(mode) {
  const id = mode === 'dict' ? 'inlineHistoryDict' : 'inlineHistoryGrammar';
  const sec = $(id);
  if (!sec) return;
  const h = getHistory().filter(i => i.mode === mode);
  if (h.length === 0) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  sec.innerHTML = `
    <div class="history-label">
      <span>Недавние</span>
      <button class="history-clear" onclick="clearHistory()">очистить</button>
    </div>
    <div class="history-chips">
      ${h.map(i => `<button class="history-chip" onclick="historyClick('${i.word.replace(/'/g,"\\'")}','${i.mode}')">${i.word}</button>`).join('')}
    </div>`;
}

function hideInlineHistory() {
  const d = $('inlineHistoryDict');
  const g = $('inlineHistoryGrammar');
  if (d) d.style.display = 'none';
  if (g) g.style.display = 'none';
}

function historyClick(word, mode) {
  $('searchInput').value = word;
  if (mode === 'grammar') lookupGrammar(word);
  else lookupWord(word);
}

// ── Кликабельные слова в примерах ─────────────────────────────────────────────
function makeClickable(text) {
  if (!text) return '';
  return text.replace(/([A-Za-zÀ-öø-ÿ']+)/g, (match) => {
    const clean = match.replace(/'/g, '');
    if (clean.length < 3) return match;
    const escaped = match.replace(/'/g, "\\'");
    return `<span class="clickable-word" data-word="${match.replace(/"/g, '&quot;')}" onclick="handleWordClick('${escaped}')">${match}</span>`;
  });
}

function handleWordClick(word) {
  if (isTouchDevice()) {
    // On mobile, bottom sheet is handled by the click event listener
    // This function is a no-op; the capturing listener handles it
    return;
  }
  $('searchInput').value = word;
  lookupWord(word);
}

// ── Клик по заголовку — на главный экран ──────────────────────────────────────
function goHome() {
  // Из избранного возвращаемся в тот режим, откуда его открыли
  switchMode(currentMode === 'favorites' ? _modeBeforeFav : currentMode);
}
function doSearch() {
  const val = $('searchInput').value.trim();
  if (!val) return;
  if (currentMode === 'grammar') lookupGrammar(val);
  else if (currentLang === 'ru') lookupRussian(val);
  else lookupWord(val);
}

$('searchBtn').addEventListener('click', doSearch);
$('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// ── Floating fav button logic ─────────────────────────────────────────────────
let _modeBeforeFav = 'dict';

function openFavorites() {
  if (currentMode !== 'favorites') _modeBeforeFav = currentMode;
  // showState должен вызываться ДО смены currentMode —
  // тогда он правильно захватит savedMode = 'dict'/'grammar' в историю
  showState('favorites');
  currentMode = 'favorites';
  applyModeUI('favorites');
  renderFavList(currentFavTab);
  updateFavCount();
}

function favFloatClick() {
  if (currentMode === 'favorites') {
    // Если истории нет (избранное открыто первым действием) — просто выходим в прежний режим
    if (navHistory.length > 0) goBack();
    else switchMode(_modeBeforeFav);
  } else {
    openFavorites();
  }
}




function updateFavFloat(mode) {
  const icon = $('favFloatIcon');
  const back = $('favFloatBack');
  if (!icon || !back) return;
  if (mode === 'favorites') {
    icon.style.display = 'none';
    back.style.display = 'block';
  } else {
    icon.style.display = 'block';
    back.style.display = 'none';
  }
}

// ── Floating buttons scroll behavior ─────────────────────────────────────────
(function() {
  let lastScrollY = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const favBtn = $('favFloatBtn');
        const setBtn = $('settingsFloatBtn');
        const currentY = window.scrollY;
        if (currentY > lastScrollY + 8) {
          if (favBtn) favBtn.classList.add('hidden');
          if (setBtn) setBtn.classList.add('hidden');
        } else if (currentY < lastScrollY - 8) {
          if (favBtn) favBtn.classList.remove('hidden');
          if (setBtn) setBtn.classList.remove('hidden');
        }
        lastScrollY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  });
})();

// ── Word preview popup ────────────────────────────────────────────────────────
const previewEl = document.createElement('div');
previewEl.id = 'wordPreview';
previewEl.className = 'word-preview';
document.body.appendChild(previewEl);

let _previewTimeout = null;
let _longPressTimeout = null;
const _previewCache = {}; // локальный кэш чтобы не дёргать Supabase дважды

function highlightStressPreview(phonetic) {
  return (phonetic || '').replace(/ˈ([^ˌ\s.]+)/g, (m, syl) => `ˈ<span style="color:var(--terracotta);font-weight:bold">${syl}</span>`);
}

// Общие куски разметки превью и мобильной шторки (prefix: 'wp' или 'sheet-wp')
function previewHeaderHtml(d, p) {
  const head = d.formWord && d.word && d.formWord !== d.word
    ? `${d.formWord}<span class="wp-arrow">→</span>${d.word}`
    : (d.word || d.formWord || '');
  // Форма нескольких слов (arti → arto, arte): список вариантов с переводом каждого
  let formOfHtml = '';
  if (d.formOfDetails && d.formOfDetails.length) {
    formOfHtml = `<div class="${p}-formof">форма слов:</div><div class="${p}-formof-list">${d.formOfDetails.map(x =>
      `<div><b>${x.lemma}</b>${x.pos ? `<span>${x.pos}</span>` : ''}${x.ru ? ` · ${x.ru}` : x.en ? ` · <em>${x.en}</em>` : ''}</div>`).join('')}</div>`;
  } else if (d.formOf && d.formOf.length > 1) {
    formOfHtml = `<div class="${p}-formof">форма слов: ${d.formOf.join(', ')}</div>`;
  }
  // Слово со своей статьёй, которое заодно является формой других слов (specifica → specifico, specificare)
  const alsoHtml = d.alsoForms && d.alsoForms.length
    ? `<div class="${p}-formof">также: ${d.alsoForms.map(l => `${l.lemma}${l.pos ? ` (${l.pos})` : ''}`).join(', ')}</div>` : '';
  return `<div class="${p}-word">${head}</div>
    ${formOfHtml}
    ${d.phonetic ? `<div class="${p}-phonetic">${highlightStressPreview(d.phonetic)}</div>` : ''}
    <div class="${p}-badges">
      ${d.partOfSpeech ? `<span class="${p}-badge">${d.partOfSpeech}</span>` : ''}
      ${d.category ? `<span class="${p}-badge">${d.category}</span>` : ''}
    </div>
    ${alsoHtml}`;
}
function previewRussianHtml(d) {
  if (d.russian && d.russian.main) return `${d.russian.main}${d.russian.alternatives ? `<br><em>${d.russian.alternatives}</em>` : ''}`;
  if (d._ruLoading) return `<span class="pending-shimmer short"></span>`;
  if (d._ruFailed) return `<em>перевод недоступен</em>`;
  return '';
}

function renderPreviewDict(popup, d) {
  popup.innerHTML = `
    ${previewHeaderHtml(d, 'wp')}
    <div class="wp-translation">${previewRussianHtml(d)}</div>
    ${d.english?.main ? `<div class="wp-en">${d.english.main}</div>` : ''}
    <button class="wp-add" onclick="addPreviewToDeck()">${svgIcon('deck')} в колоду</button>`;
}

// Быстрые данные для превью: кэш Supabase и Викисловарь запрашиваем параллельно.
// Возвращает { data, complete }: complete=false значит, что русский перевод ещё надо получить у Gemini.
async function fetchQuickDict(word, skipIf) {
  const w = word.toLowerCase();
  // Русский из ru.wiktionary запрашиваем сразу, параллельно с кэшем и Викисловарём
  let ruPromise = fetchRuWiktionary(w, skipIf).catch(() => null);
  const [cached, fd] = await Promise.all([sbGet('dictionary', w).catch(() => null), fetchFreeDictionary(w)]);
  if (cached) return { data: cached, complete: true };
  let m = fd ? mapFreeDictionary(fd, { light: true }) : null;
  if (!m) return null;
  if (m.lemmas) {
    // Форма нескольких слов: для каждого варианта подтягиваем перевод (ru.wiktionary, иначе английская глосса)
    const details = await Promise.all(m.lemmas.slice(0, 3).map(async l => {
      const [fdL, ru] = await Promise.all([fetchFreeDictionary(l.lemma), fetchRuWiktionary(l.lemma, skipIf).catch(() => null)]);
      const mL = fdL ? mapFreeDictionary(fdL, { light: true }) : null;
      const en = mL && !mL.lemma && !mL.lemmas ? (mL.english?.main || '') : '';
      return { lemma: l.lemma, pos: l.pos, desc: l.desc, ru: (ru && ru.main) || '', en };
    }));
    return { data: { formWord: w, formOf: m.lemmas.map(l => l.lemma), formOfDetails: details }, complete: true };
  }
  if (m.lemma) {
    // Словоформа: показываем начальную форму
    const lemma = m.lemma.toLowerCase();
    ruPromise = fetchRuWiktionary(lemma, skipIf).catch(() => null);
    const [cached2, fd2] = await Promise.all([sbGet('dictionary', lemma).catch(() => null), fetchFreeDictionary(lemma)]);
    if (cached2) return { data: { ...cached2, formWord: w }, complete: true };
    const m2 = fd2 ? mapFreeDictionary(fd2, { light: true }) : null;
    if (!m2 || m2.lemma || m2.lemmas) return { data: { formWord: w, word: m.lemma, formOf: [m.lemma] }, complete: true };
    m = { ...m2, formWord: w };
  }
  return { data: m, complete: false, ruPromise };
}

async function fetchPreviewData(word, isGrammar, skipIf) {
  const key = (isGrammar ? 'g:' : 'd:') + word.toLowerCase();
  if (_previewCache[key] !== undefined) return _previewCache[key];
  try {
    const q = isGrammar
      ? await sbGet('grammar', word.toLowerCase()).then(d => d ? { data: d, complete: true } : null)
      : await fetchQuickDict(word, skipIf);
    _previewCache[key] = q || null;
  } catch { _previewCache[key] = null; }
  return _previewCache[key];
}

// Только русский перевод, короткий промпт с опорой на английские глоссы Викисловаря
// Крошечный запрос к Gemini только за русским переводом (ответ ~15 токенов, поэтому быстрый)
async function fetchGeminiRussian(d) {
  const glosses = (d.senses || []).map(s => s.gloss).filter(Boolean).slice(0, 3).join('; ') || d.english?.main || '';
  const prompt = `Italian ${d.partOfSpeech || 'word'} "${d.word}"${glosses ? ` (English: ${glosses})` : ''}.
Return ONLY valid JSON, no markdown: {"russian":{"main":"primary Russian translation","alternatives":"1-3 alternatives semicolon-separated or empty"}}`;
  const r = await llmJson(prompt, 'dict');
  const ru = { main: r.russian?.main || '', alternatives: r.russian?.alternatives || '' };
  return ru.main ? ru : null;
}

// Для превью: сначала ru.wiktionary (бесплатно), Gemini только если статьи там нет —
// чтобы не тратить дневной лимит запросов на каждое наведение мыши
async function fetchQuickRussian(q) {
  const d = q.data;
  // Запрос к ru.wiktionary уже мог стартовать в fetchQuickDict — ждём его, а не запускаем новый
  let fast = q.ruPromise ? await q.ruPromise : null;
  q.ruPromise = null;
  if (!fast) fast = await fetchRuWiktionary(d.word).catch(() => null); // если прежний был отброшен как устаревший
  if (fast && fast.main) return fast;
  const ru = await fetchGeminiRussian(d);
  if (!ru) throw new Error('no translation');
  return ru;
}

// Дописывает русский перевод в данные превью и дёргает всех, кто ждёт обновления
function ensureQuickRussian(q, onUpdate) {
  const d = q.data;
  if (q.complete || (d.russian && d.russian.main)) return;
  d._ruWaiters = d._ruWaiters || [];
  d._ruWaiters.push(onUpdate);
  if (d._ruLoading) return;
  d._ruLoading = true;
  fetchQuickRussian(q)
    .then(ru => { d.russian = ru; })
    .catch(() => { d._ruFailed = true; })
    .finally(() => {
      d._ruLoading = false; q.complete = true;
      const waiters = d._ruWaiters; d._ruWaiters = [];
      waiters.forEach(fn => { try { fn(); } catch(e) {} });
    });
}

// Слова нет в Викисловаре — старый запасной путь через Gemini
async function fetchGeminiMiniPreview(word) {
  const prompt = `Italian word "${word}". Return ONLY valid JSON, no markdown:
{"word":"canonical form","partOfSpeech":"sostantivo/verbo/aggettivo/etc","category":"${CATEGORY_PROMPT}","phonetic":"IPA with ˈ","russian":{"main":"перевод","alternatives":"alt1; alt2"}}
If not a real Italian word return {"word":null}.`;
  const result = await llmJson(prompt, 'dict');
  if (!result || !result.word) return null;
  const q = { data: result, complete: true };
  _previewCache['d:' + word.toLowerCase()] = q;
  return q;
}

function showPreview(el, word, isGrammar, x, y) {
  clearTimeout(_previewTimeout); clearTimeout(_hideTimer);
  const popup = $('wordPreview');
  popup.className = 'word-preview' + (isGrammar ? ' grammar-preview' : '');
  popup.innerHTML = `<div class="wp-loading">…</div>`;
  popup.dataset.word = word;
  positionPreview(popup, x, y);
  popup.classList.add('visible');
  const stillMine = () => popup.classList.contains('visible') && popup.dataset.word === word;

  _previewTimeout = setTimeout(async () => {
    let q = await fetchPreviewData(word, isGrammar, () => !stillMine());
    if (!stillMine()) return;

    if (!q) {
      if (isGrammar) { hidePreview(); return; }
      popup.innerHTML = `<div class="wp-loading">Загрузка…</div>`;
      try { q = await fetchGeminiMiniPreview(word); } catch { q = null; }
      if (!stillMine()) return;
      if (!q) { hidePreview(); return; }
    }

    if (isGrammar) {
      const data = q.data;
      popup.innerHTML = `
        <div class="wp-word">${data.title || word}</div>
        <div class="wp-badges">
          ${data.category ? `<span class="wp-badge">${data.category}</span>` : ''}
        </div>
        <div class="wp-translation">${data.titleRu || ''}</div>`;
      return;
    }

    // Факты из Викисловаря показываем сразу, русский перевод подтягивается следом
    ensureQuickRussian(q, () => { if (stillMine()) renderPreviewDict(popup, q.data); });
    renderPreviewDict(popup, q.data);
  }, 80);
}

function positionPreview(popup, x, y) {
  popup.style.left = '0px'; popup.style.top = '0px';
  requestAnimationFrame(() => {
    const pw = popup.offsetWidth || 260;
    const ph = popup.offsetHeight || 120;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + 12;
    let top = y - ph / 2;
    if (left + pw > vw - 12) left = x - pw - 12;
    if (top < 8) top = 8;
    if (top + ph > vh - 8) top = vh - ph - 8;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  });
}

function hidePreview() {
  clearTimeout(_previewTimeout);
  const popup = $('wordPreview');
  popup.classList.remove('visible');
}

// Навешиваем события на кликабельные слова через делегирование
// Проверяем основной способ ввода, а не наличие тачскрина:
// ноутбук с сенсорным экраном и мышью должен работать как десктоп
const isTouchDevice = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// Desktop: hover preview. Подсказка не исчезает, пока курсор на ней самой: в ней есть кнопка «в колоду»
let _hideTimer = 0;
function scheduleHidePreview() { clearTimeout(_hideTimer); _hideTimer = setTimeout(hidePreview, 250); }
document.addEventListener('mouseover', (e) => {
  if (isTouchDevice()) return;
  if (e.target.closest('#wordPreview')) { clearTimeout(_hideTimer); return; }
  const el = e.target.closest('.clickable-word, .related-word-btn, .history-chip');
  if (!el) { scheduleHidePreview(); return; }
  const word = el.textContent.trim();
  if (!word || word.length < 3) return;
  const isGrammar = el.classList.contains('history-chip') && currentMode === 'grammar';
  showPreview(el, word, isGrammar, e.clientX, e.clientY);
});

document.addEventListener('mousemove', (e) => {
  if (isTouchDevice()) return;
  if (e.target.closest('#wordPreview')) return; // над самой подсказкой её не двигаем
  const popup = $('wordPreview');
  if (popup.classList.contains('visible')) {
    positionPreview(popup, e.clientX, e.clientY);
  }
});

document.addEventListener('mouseout', (e) => {
  if (isTouchDevice()) return;
  const el = e.target.closest('.clickable-word, .related-word-btn, .history-chip');
  if (el) scheduleHidePreview();
});
$('wordPreview').addEventListener('mouseleave', hidePreview);

// ── «В колоду» из подсказки и шторки ──────────────────────────────────────────
// Берём полную статью из кэша, если она есть; иначе лёгкие данные подсказки, а пример, значение
// и транскрипцию колода доберёт сама при добавлении. Колода выбирается каждый раз явно.
async function addWordToDeck(word, light) {
  if (!word || !window.Cards) return;
  if (window.Auth && !Auth.require('Войдите, чтобы добавлять слова в колоды')) return;
  hidePreview(); hideBottomSheet();
  const lemma = (light && light.word) || word;
  const full = await sbGet('dictionary', lemma.toLowerCase());
  Cards.addEntries([full || Object.assign({ word: lemma }, light || {})]);
}
function addPreviewToDeck() {
  const word = $('wordPreview').dataset.word || '';
  addWordToDeck(word, (_previewCache['d:' + word.toLowerCase()] || {}).data);
}
const _sheetAddBtn = $('sheetAddBtn');
if (_sheetAddBtn) _sheetAddBtn.addEventListener('click', () => addWordToDeck(_sheetWord, (_previewCache['d:' + _sheetWord.toLowerCase()] || {}).data));

// ── Сегодняшние карточки: кнопка на главной и бейдж на вкладке Le Carte ──────
async function refreshHomeDue() {
  const box = $('homeDue'), badge = $('navCardsBadge');
  const hide = () => { if (box) box.style.display = 'none'; if (badge) badge.style.display = 'none'; };
  if (!(window.Auth && Auth.user() && window.Cards && Cards.dueSummary)) { hide(); return; }
  const s = await Cards.dueSummary().catch(() => null);
  if (!s) { hide(); return; }
  const repeat = s.learn + s.due, total = repeat + s.newToday;
  if (badge) { badge.textContent = total; badge.style.display = total ? '' : 'none'; }
  if (!box) return;
  if (!total) { hide(); if (badge) badge.style.display = 'none'; return; }
  const parts = [repeat ? `${repeat} к повторению` : '', s.newToday ? `${s.newToday} новых` : ''].filter(Boolean).join(' · ');
  box.innerHTML = `<button class="cards-btn primary" onclick="Cards.studyAll()">Учить сегодняшнее · ${total}</button><div class="home-due-sub">${parts}</div>`;
  box.style.display = '';
}
window.addEventListener('load', () => refreshHomeDue());

// ── Bottom sheet (mobile) ─────────────────────────────────────────────────────
let _sheetWord = '';
let _sheetIsGrammar = false;
let _sheetDragStartY = 0;
let _sheetDragCurrentY = 0;
let _sheetIsDragging = false;

function showBottomSheet(word, isGrammar) {
  _sheetWord = word;
  _sheetIsGrammar = isGrammar;
  const sheet = $('bottomSheet');
  const overlay = $('sheetOverlay');
  const content = $('sheetContent');
  const openBtn = $('sheetOpenBtn');

  sheet.className = 'bottom-sheet' + (isGrammar ? ' grammar-sheet' : '');
  content.innerHTML = `<div class="sheet-wp-loading">Загрузка…</div>`;
  openBtn.style.display = 'block';
  const addBtn = $('sheetAddBtn'); if (addBtn) addBtn.style.display = isGrammar ? 'none' : 'block';

  // Show
  requestAnimationFrame(() => {
    overlay.classList.add('open');
    sheet.classList.add('open');
  });

  // Load data. Токен нужен, чтобы данные из кэша (они приходят раньше первого кадра анимации)
  // не отбрасывались как устаревшие, а ответ для прежнего слова не попал в новую шторку
  _sheetToken++;
  loadSheetData(word, isGrammar, content, _sheetToken);
}
let _sheetToken = 0;

async function loadSheetData(word, isGrammar, content, token) {
  const sheet = $('bottomSheet');
  const stillMine = () => _sheetToken === token && _sheetWord === word;
  let q = await fetchPreviewData(word, isGrammar, () => !stillMine());
  if (!stillMine()) return;

  if (!q && !isGrammar) {
    // Слова нет в Викисловаре — пробуем Gemini
    content.innerHTML = `<div class="sheet-wp-loading">Ищем слово…</div>`;
    try { q = await fetchGeminiMiniPreview(word); } catch { q = null; content.innerHTML = `<div class="sheet-wp-loading">Ошибка загрузки</div>`; return; }
    if (!stillMine()) return;
    if (!q) { content.innerHTML = `<div class="sheet-wp-loading">Слово не найдено</div>`; return; }
  }

  if (!q) {
    content.innerHTML = `<div class="sheet-wp-loading">Нет данных</div>`;
    return;
  }

  if (isGrammar) {
    const data = q.data;
    content.innerHTML = `
      <div class="sheet-wp-word">${data.title || word}</div>
      <div class="sheet-wp-badges">
        ${data.category ? `<span class="sheet-wp-badge">${data.category}</span>` : ''}
      </div>
      <div class="sheet-wp-translation">${data.titleRu || ''}</div>`;
    return;
  }

  ensureQuickRussian(q, () => { if (stillMine()) renderSheetDict(content, q.data); });
  renderSheetDict(content, q.data);
}

function renderSheetDict(container, d) {
  container.innerHTML = `
    ${previewHeaderHtml(d, 'sheet-wp')}
    <div class="sheet-wp-translation">${previewRussianHtml(d)}</div>
    ${d.english?.main ? `<div class="sheet-wp-en">${d.english.main}</div>` : ''}
  `;
}

function hideBottomSheet() {
  const sheet = $('bottomSheet');
  const overlay = $('sheetOverlay');
  _sheetToken++; // ответ для закрытой шторки уже не нужен
  sheet.classList.remove('open');
  sheet.classList.remove('dragging');
  sheet.style.transform = '';
  overlay.classList.remove('open');
}

function sheetOpenFull() {
  hideBottomSheet();
  if (_sheetWord) {
    $('searchInput').value = _sheetWord;
    if (_sheetIsGrammar) {
      lookupGrammar(_sheetWord);
    } else if (document.body.classList.contains('study-open') && window.Cards) {
      Cards.openArticle(_sheetWord); // из карточки: закрыть экран учёбы, «Назад» вернёт карточку
    } else {
      lookupWord(_sheetWord);
    }
  }
}

// Overlay click to close
$('sheetOverlay').addEventListener('click', hideBottomSheet);
$('sheetOpenBtn').addEventListener('click', sheetOpenFull);

// ── Swipe-to-dismiss ──────────────────────────────────────────────────────────
(function setupSheetSwipe() {
  const sheet = $('bottomSheet');
  const handleArea = $('sheetHandleArea');

  function onTouchStart(e) {
    if (!sheet.classList.contains('open')) return;
    _sheetDragStartY = e.touches[0].clientY;
    _sheetDragCurrentY = 0;
    _sheetIsDragging = true;
    sheet.classList.add('dragging');
  }

  function onTouchMove(e) {
    if (!_sheetIsDragging) return;
    const dy = e.touches[0].clientY - _sheetDragStartY;
    // Only allow dragging downward
    _sheetDragCurrentY = Math.max(0, dy);
    sheet.style.transform = `translateY(${_sheetDragCurrentY}px)`;
    // Dim overlay proportionally
    const progress = Math.min(_sheetDragCurrentY / 250, 1);
    $('sheetOverlay').style.opacity = 1 - progress * 0.7;
    e.preventDefault();
  }

  function onTouchEnd() {
    if (!_sheetIsDragging) return;
    _sheetIsDragging = false;
    sheet.classList.remove('dragging');
    $('sheetOverlay').style.opacity = '';
    // If dragged more than 100px or velocity was high — dismiss
    if (_sheetDragCurrentY > 100) {
      hideBottomSheet();
    } else {
      sheet.style.transform = '';
    }
  }

  // Attach to the handle area for reliable dragging
  handleArea.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (_sheetIsDragging) onTouchMove(e);
  }, { passive: false });
  document.addEventListener('touchend', onTouchEnd, { passive: true });

  // Also allow swiping from anywhere on the sheet
  sheet.addEventListener('touchstart', (e) => {
    if (!sheet.classList.contains('open')) return;
    // Only start drag if at scroll top
    if (sheet.scrollTop <= 0) {
      onTouchStart(e);
    }
  }, { passive: true });
})();

// ── Mobile: tap on clickable word → bottom sheet ──────────────────────────────
document.addEventListener('click', (e) => {
  if (!isTouchDevice()) return;
  const el = e.target.closest('.clickable-word, .related-word-btn');
  if (!el) return;
  const word = el.textContent.trim();
  // Короткие слова не перехватываем — пусть сработает обычный onclick элемента
  if (!word || word.length < 3) return;
  e.preventDefault();
  e.stopPropagation();
  const isGrammar = currentMode === 'grammar';
  showBottomSheet(word, isGrammar);
}, true);

// ── PWA: service worker и кнопка установки ────────────────────────────────────
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('Service worker:', e));
  });
}
let _installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  const b = $('installBtn'); if (b) b.style.display = 'block';
});
window.addEventListener('appinstalled', () => { _installPrompt = null; const b = $('installBtn'); if (b) b.style.display = 'none'; });
async function installApp() {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  try { await _installPrompt.userChoice; } catch(e) {}
  _installPrompt = null;
  $('installBtn').style.display = 'none';
}

