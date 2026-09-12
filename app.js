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
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
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
  // Плитки главной и колод
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  // Разделы грамматики: у каждого своя иконка (см. SECTION_ICON в grammatica.js)
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  feather: '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/>',
  hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  shuffle: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  'git-branch': '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
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
  // Проверка словаря — инструмент владельца: золотой набор и пересборка кэша
  const qb = $('qaBtn'); if (qb) qb.style.display = (window.Auth && Auth.isAdmin && Auth.isAdmin()) ? 'block' : 'none';
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
  inp.classList.toggle('masked'); // ключ маскируется CSS, а не type=password: иначе браузер предлагает «сохранить пароль» при каждом переходе
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
  inp.classList.toggle('masked'); // ключ маскируется CSS, а не type=password: иначе браузер предлагает «сохранить пароль» при каждом переходе
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
  if (table === 'dictionary' && typeof _mapInfos !== 'undefined') { _mapInfos = null; _myMapInfos = null; } // карта слов подтянет новое слово при следующем открытии
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
  document.body.classList.toggle('mode-pratica', mode === 'pratica');
  $('navDict').classList.toggle('active', mode === 'dict');
  $('navGram').classList.toggle('active', isGram);
  $('navCards').classList.toggle('active', mode === 'cards');
  $('navPratica').classList.toggle('active', mode === 'pratica');
  $('headerFavBtn').classList.toggle('active', isFav);
  updateFavFloat(mode);
  if (mode === 'pratica') {
    $('headerOrnament').textContent = 'Разбор написанного';
    $('headerTitle').innerHTML = 'La Pra<em>tica</em>';
    $('headerSubtitle').textContent = 'Свой текст · Ошибки · В колоду';
    document.querySelector('.lang-toggle').style.display = 'none';
    document.querySelector('.search-area').style.display = 'none';
  } else if (mode === 'cards') {
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
    else if (mode === 'pratica') showState('pratica');
    else if (mode === 'grammar') { $('searchInput').value = ''; showState('gramindex'); }
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
  if (mode === 'pratica' && !skipHistoryClear) {
    if (window.Pratica) Pratica.open();
    return;
  }
  // Домашний экран грамматики — сам справочник, а не пустое место
  if (mode === 'grammar' && !skipHistoryClear) {
    if (window.Grammatica) Grammatica.open();
    return;
  }
  if (!skipHistoryClear) {
    updateInitialMsg();
    renderHistory();
  }
}

// Подсказок «введите слово» на начальном экране больше нет: место занимают действия и недавние
function updateInitialMsg() {}

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
  const pushable = ['result','rulist','grammar','favorites','cards','graph','pratica','gramindex','qa','initial'];
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
    } else if (savedState === 'qa') {
      pushHistory(() => { currentMode = 'dict'; applyModeUI('dict'); _suppressHistory = true; showState('qa'); _suppressHistory = false; if (window.Qa) Qa.render(); });
    } else if (savedState === 'gramindex') {
      // Раскрытые разделы и фильтр живут в модуле, поэтому достаточно вернуть экран
      pushHistory(() => {
        currentMode = 'grammar';
        applyModeUI('grammar');
        _suppressHistory = true; showState('gramindex'); _suppressHistory = false;
        if (window.Grammatica) Grammatica.render();
      });
    } else if (savedState === 'pratica') {
      // Разбор живёт в памяти модуля, поэтому достаточно вернуть экран: текст и ошибки на месте
      pushHistory(() => {
        currentMode = 'pratica';
        applyModeUI('pratica');
        _suppressHistory = true; showState('pratica'); _suppressHistory = false;
        if (window.Pratica) Pratica.render();
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
      if (['result','rulist','grammar','favorites','cards','graph','pratica','gramindex','qa','loading'].includes(state)) {
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

  // Подсказка про опечатку живёт ровно один экран ошибки и не должна всплыть над следующим
  const _es = $('errorSuggest'); if (_es) _es.innerHTML = '';
  _currentState = state;
  ['initialMsg','loadingMsg','errorMsg','resultCard','ruResults','grammarCard','favScreen','cardsScreen','graphScreen','praticaScreen','gramIndexScreen','qaScreen']
    .forEach(id => { const el = $(id); if (el) el.classList.remove('active'); });
  if (state === 'initial')        { $('initialMsg').classList.add('active'); renderHistory(); renderHome(); hideInlineHistory(); }
  else if (state === 'loading')   { $('loadingMsg').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'error')     { $('errorMsg').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'result')    { $('resultCard').classList.add('active'); hideRecent(); renderInlineHistory('dict'); }
  else if (state === 'rulist')    { $('ruResults').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'grammar')   { $('grammarCard').classList.add('active'); hideRecent(); renderInlineHistory('grammar'); }
  else if (state === 'favorites') { $('favScreen').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'cards')     { $('cardsScreen').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'graph')     { $('graphScreen').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'pratica')   { $('praticaScreen').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'gramindex') { $('gramIndexScreen').classList.add('active'); hideRecent(); hideInlineHistory(); }
  else if (state === 'qa')        { $('qaScreen').classList.add('active'); hideRecent(); hideInlineHistory(); }

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
  const err = new Error(`${FAST_PROVIDERS[getFastProvider()].name}: ${msg}`);
  err.status = response.status;
  // Groq присылает, сколько ждать; без заголовка ждём по своей лесенке
  const ra = parseFloat(response.headers.get('retry-after') || '');
  if (!isNaN(ra)) err.retryAfter = ra;
  return err;
}
const isRateLimit = e => !!e && (e.status === 429 || /429|rate limit|quota|RESOURCE_EXHAUSTED|too many requests/i.test(e.message || ''));
let _lastRateLimitAt = 0; // пакетные прогоны смотрят сюда и сбавляют темп

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
// Кто отвечает за какую задачу:
//   dict    — подсказки и мелочи: быстрый провайдер, если есть ключ, иначе Gemini
//   article — сохраняемая словарная статья: Gemini; быстрый провайдер только если ключа Gemini нет вовсе
//   check   — проверка статьи: другая модель, чем писала, иначе она подтвердит собственные выдумки
function pickModel(task) {
  const fast = useFastForDict(), gem = !!getApiKey();
  if (task === 'article') return gem ? 'gemini' : (fast ? 'fast' : 'gemini');
  if (task === 'dict' || task === 'check') return fast ? 'fast' : 'gemini';
  return 'gemini';
}
async function llmJson(prompt, task) {
  if (pickModel(task) === 'fast') {
    // Проверку статьи нельзя молча передавать Gemini: он же её и писал и подтвердит собственные ошибки.
    // Лимит у бесплатного ключа минутный, поэтому ждём по-настоящему: retry-after или 5, 15, 30 секунд.
    const CHECK_BACKOFF = [5000, 15000, 30000];
    for (let attempt = 0; attempt < CHECK_BACKOFF.length + 1; attempt++) {
      try { const r = await callFast(prompt); _lastDictLlm = fastLabel(); return r; }
      catch(e) {
        if (isKeyError(e.message)) throw e;
        if (isRateLimit(e)) _lastRateLimitAt = Date.now();
        if (task === 'check') {
          if (attempt >= CHECK_BACKOFF.length) throw e;
          const wait = isRateLimit(e) ? Math.max(CHECK_BACKOFF[attempt], (e.retryAfter || 0) * 1000 + 500) : 2500;
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        noteFastFallback(e); break;
      }
    }
  }
  const r = await callGemini(prompt);
  _lastDictLlm = 'Gemini';
  return r;
}
async function llmJsonStream(prompt, task, onText) {
  if (pickModel(task) === 'fast') {
    try { const r = await callFastStream(prompt, onText); _lastDictLlm = fastLabel(); return r; }
    catch(e) { if (isKeyError(e.message)) throw e; noteFastFallback(e); }
  }
  const r = await callGeminiStream(prompt, onText);
  _lastDictLlm = 'Gemini';
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
// Перевод в базе — список вариантов через «;» и «,», иногда с пояснением в скобках:
// «открывать (дверь, окно); обнаруживать». Искать и сравнивать надо по самим вариантам, без
// пояснений: иначе на «дверь» приезжает scoprire, у которого дверь только в скобке.
// В кэше пояснение бывает и оборванным: старый разбор резал строку по запятой прямо внутри скобки
// и сохранял «открывать (дверь» как готовый вариант. Незакрытую скобку отбрасываем так же.
const trVariants = s => String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\([^)]*$/, ' ').split(/[;,]/).map(x => x.trim()).filter(Boolean);

// ── Слова, которые легко перепутать ──────────────────────────────────────────
// «foglio» и «figlio», «fava» и «fama» — разница в одну букву внутри слова. Сравниваем только
// со словами нашего же словаря: по частотному списку на 30 000 половина находок — мусор и рифмы,
// а среди уже открытых слов на 187 слов набирается дюжина пар и почти все по делу.
let _wordList = null, _wordListJob = null;
function fetchWordList() {
  if (_wordList) return Promise.resolve(_wordList);
  return _wordListJob || (_wordListJob = fetch(`${SB_URL}/rest/v1/dictionary?select=word&limit=20000`, { headers: SB_H })
    .then(r => r.ok ? r.json() : [])
    .then(rows => (_wordList = rows.map(r => String(r.word || '').toLowerCase()).filter(w => w && !/[\s'’]/.test(w))))
    .catch(() => (_wordList = [])));
}
// Расстояние Дамерау—Левенштейна ровно в единицу: замена, вставка или удаление одной буквы
function oneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}
// Строка одного вида связи: подпись и слова, каждое ведёт в свою статью
function relatedRow(label, words) {
  const row = document.createElement('div');
  row.className = 'related-group' + (label ? '' : ' no-kind');
  if (label) { const t = document.createElement('span'); t.className = 'related-kind'; t.textContent = label; row.appendChild(t); }
  const box = document.createElement('div');
  box.className = 'related-group-words';
  words.forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'related-word-btn';
    btn.textContent = w;
    btn.onclick = () => { $('searchInput').value = w; lookupWord(w); };
    box.appendChild(btn);
  });
  row.appendChild(box);
  return row;
}

async function similarWords(e) {
  const w = String(e.word || '').toLowerCase();
  if (w.length < 4 || /\s/.test(w)) return [];
  // Свои же формы ловушкой не считаются: множественное число и то, формой чего это слово является
  const own = new Set([w, ...[e.singular, e.plural].map(f => String((f && f.form) || '').toLowerCase()),
    ...(e.alsoForms || []).map(l => String(l.lemma || '').toLowerCase())].filter(Boolean));
  const list = await fetchWordList();
  return list.filter(x => x.length >= 4 && !own.has(x) && oneEdit(w, x)).slice(0, 4);
}
const isPhrase = w => /\s/.test(cleanQuery(w));
async function wordIpa(w) {
  const fd = await fetchFreeDictionary(w).catch(() => null);
  const p = fd && fd.entries.flatMap(en => en.pronunciations || []).find(p => p.type === 'ipa' && p.text);
  if (p) return p.text;
  const it = await fetchItWiktIpa(w);
  if (it) return it;
  const c = await sbGet('dictionary', w).catch(() => null);
  return c && c.phonetic && !c.phoneticApprox && !isPhrase(c.word || w) ? c.phonetic : '';
}
// ── Транскрипция без модели ──────────────────────────────────────────────────
// Модель в IPA ошибается, чаще всего в ударении. Порядок источников: английский Викисловарь (fetchFreeDictionary),
// итальянский Викисловарь (шаблон {{IPA|…}} в тексте статьи), и только потом приблизительная транскрипция
// по правилам чтения. Правила ставят ударение лишь там, где оно известно наверняка: по написанному
// акценту (città) или в двусложных словах; в остальных случаях знак ударения не ставится вовсе.
// Итальянский Викисловарь: {{IPA|…}} и раздел {{-sill-}} с делением на слоги, где ударный слог помечен
// акцентом («mam | mì | smo», «mè | di | co»). Слогов с акцентом хватает, чтобы построить транскрипцию по
// правилам с верным ударением и качеством e/o даже там, где самой IPA в словаре нет.
const _itWikt = {};
async function fetchItWikt(word) {
  const k = word.toLowerCase();
  if (_itWikt[k] !== undefined) return _itWikt[k];
  const out = { ipa: '', accented: '' };
  try {
    const res = await fetch(`https://it.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(k)}&prop=wikitext&format=json&formatversion=2&origin=*`);
    const text = res.ok ? ((await res.json()).parse || {}).wikitext || '' : '';
    const m = text.match(/\{\{IPA\|(\/[^}|]+\/)/);
    if (m) out.ipa = m[1];
    const s = text.match(/\{\{-sill-\}\}\s*\n([^\n]+)/);
    if (s) {
      let line = s[1]; const bold = line.match(/'''([^']+)'''/); if (bold) line = bold[1];
      line = line.replace(/^[;*]\s*/, '').replace(/''[^']*''/g, '');
      const joined = line.split('|').map(p => p.trim()).join('').replace(/[^a-zàèéìíòóùú]/gi, '').toLowerCase();
      // Совпадает с самим словом без акцентов → берём; акцентов может быть несколько (vià…tà), главный — последний
      if (joined && joined.normalize('NFD').replace(/[̀-ͯ]/g, '') === k.normalize('NFD').replace(/[̀-ͯ]/g, '')) {
        const acc = [...joined].map((c, i) => /[àèéìíòóùú]/.test(c) ? i : -1).filter(i => i >= 0);
        if (acc.length) {
          const last = acc[acc.length - 1];
          out.accented = [...joined].map((c, i) => (i !== last && /[àìíùú]/.test(c)) ? c.normalize('NFD')[0] : c).join('');
        }
      }
    }
    _itWikt[k] = out;
  } catch (e) { return out; }
  return out;
}
async function fetchItWiktIpa(word) { return (await fetchItWikt(word)).ipa; }
function approxIpa(word) {
  let w = cleanQuery(word).toLowerCase().replace(/[^a-zàèéìíòóùú']/g, '');
  if (!w) return '';
  const V = 'aeiouàèéìíòóùú';
  const isV = ch => !!ch && V.includes(ch); // пустая строка не гласная: ''.includes('') было бы true
  const out = []; let i = 0, stressAt = -1;
  const accented = { 'à': 'a', 'è': 'ɛ', 'é': 'e', 'ì': 'i', 'í': 'i', 'ò': 'ɔ', 'ó': 'o', 'ù': 'u', 'ú': 'u' };
  while (i < w.length) {
    const ch = w[i];
    // Для правил чтения соседние гласные берём без акцента: «cì» в слоговом делении — это всё равно c + i → tʃ
    const BASE = { 'à': 'a', 'è': 'e', 'é': 'e', 'ì': 'i', 'í': 'i', 'ò': 'o', 'ó': 'o', 'ù': 'u', 'ú': 'u' };
    const nx = BASE[w[i + 1]] || w[i + 1] || '', nx2 = BASE[w[i + 2]] || w[i + 2] || '';
    const dbl = w[i - 1] === ch; // вторая буква удвоенной согласной: удваиваем результат
    if (ch === "'") { i++; continue; }
    if (accented[ch]) { stressAt = out.length; out.push(accented[ch]); i++; continue; }
    if (ch === 'g' && nx === 'l' && nx2 === 'i') { out.push('ʎ'); i += (w[i + 2] === 'i' && isV(w[i + 3] || '') ? 3 : 2); continue; }
    if (ch === 'g' && nx === 'n') { out.push('ɲ'); i += 2; continue; }
    if (ch === 's' && nx === 'c' && (nx2 === 'e' || nx2 === 'i')) { out.push('ʃ'); i += (w[i + 2] === 'i' && isV(w[i + 3] || '') ? 3 : 2); continue; }
    if (ch === 's' && nx === 'c' && nx2 === 'h') { out.push('sk'); i += 3; continue; }
    if ((ch === 'c' || ch === 'g') && nx === ch && nx2 === 'h') { i++; continue; } // cch / ggh: удвоение выдаст следующая ветка
    if (ch === 'c' && nx === 'h') { out.push(dbl ? 'kk' : 'k'); i += 2; continue; }
    if (ch === 'g' && nx === 'h') { out.push(dbl ? 'gg' : 'g'); i += 2; continue; }
    if (ch === 'c' && (nx === 'e' || nx === 'i')) { out.push(w[i - 1] === 'c' ? 'tʃ' : 'tʃ'); i += (w[i + 1] === 'i' && isV(nx2) ? 2 : 1); continue; } // немая только безударная i (bacìo: ì читается)
    if (ch === 'g' && (nx === 'e' || nx === 'i')) { out.push('dʒ'); i += (w[i + 1] === 'i' && isV(nx2) ? 2 : 1); continue; } // немая только безударная i (bacìo: ì читается)
    if (ch === 'c' && nx === 'c' && (nx2 === 'e' || nx2 === 'i')) { out.push('t'); i++; continue; } // первая c в «cce» — удлинение: ttʃ
    if (ch === 'g' && nx === 'g' && (nx2 === 'e' || nx2 === 'i')) { out.push('d'); i++; continue; }
    if (ch === 'c') { out.push('k'); i++; continue; } // c перед a, o, u и согласной
    if (ch === 'q' && nx === 'u') { out.push('kw'); i += 2; continue; }
    if (ch === 'h') { i++; continue; }
    if (ch === 'z' && nx === 'z') { out.push(i === 0 ? 'ddz' : 'tts'); i += 2; continue; }
    if (ch === 'z') { out.push(i === 0 ? 'dz' : 'ts'); i++; continue; }
    if (ch === 'x') { out.push('ks'); i++; continue; }
    if (ch === 's' && 'bdglmnrv'.includes(nx)) { out.push('z'); i++; continue; } // s перед звонкой согласной: sbaglio, -ismo
    if (ch === 's' && isV(w[i - 1] || '') && isV(nx)) { out.push('z'); i++; continue; }
    if ((ch === 'i' || ch === 'u') && isV(nx) && !isV(w[i - 1] || '')) { out.push(ch === 'i' ? 'j' : 'w'); i++; continue; }
    out.push(ch); i++;
  }
  // Слоги считаем по гласным; ударение: акцент в написании → туда; два слога → первый; иначе не ставим
  const nuclei = []; out.forEach((s, idx) => { if (/^[aeiouɛɔ]$/.test(s)) nuclei.push(idx); });
  let mark = -1;
  if (stressAt >= 0) mark = stressAt; else if (nuclei.length === 2) mark = nuclei[0];
  let ipa = '';
  out.forEach((s, idx) => {
    if (idx === mark) {
      // знак ударения — перед началом слога: одна согласная, аффриката (tʃ, dz) или кластер вроде pr, kw;
      // удвоенная согласная делится пополам, как в словарях: /tʃitˈta/
      const isVow = c => /[aeiouɛɔ]/.test(c);
      let cut = ipa.length;
      if (cut > 0 && !isVow(ipa[cut - 1])) {
        cut--;
        if (/[ʃʒsz]/.test(ipa[cut]) && cut > 0 && /[td]/.test(ipa[cut - 1])) cut--;
        if (/[rlwj]/.test(ipa[cut]) && cut > 0 && !isVow(ipa[cut - 1]) && ipa[cut - 1] !== ipa[cut]) cut--;
        if (!/[sz]/.test(ipa[cut]) && cut > 0 && /[sz]/.test(ipa[cut - 1])) cut--; // s/z + согласная начинает слог: ˈskwola, ˈzbaʎo
      }
      ipa = ipa.slice(0, cut) + 'ˈ' + ipa.slice(cut);
    }
    ipa += s;
  });
  return '/' + ipa + '/';
}
// Итог: { ipa, approx } — approx=true, когда транскрипция построена по правилам, а не взята из словаря
async function resolveIpa(word) {
  const k = cleanQuery(word).toLowerCase();
  if (!k) return { ipa: '', approx: false };
  const fd = await fetchFreeDictionary(k).catch(() => null);
  const p = fd && fd.entries.flatMap(en => en.pronunciations || []).find(x => x.type === 'ipa' && x.text);
  if (p) return { ipa: p.text, approx: false, src: 'wikt-en' };
  const it = await fetchItWikt(k);
  if (it.ipa) return { ipa: it.ipa, approx: false, src: 'wikt-it' };
  if (/\s/.test(k)) return { ipa: '', approx: true, src: 'none' };
  // Слоги с ударением из итальянского Викисловаря + правила чтения: ударение и e/o из словаря, остальное по правилам.
  // src запоминается в статье: построенное по правилам пересчитывается при открытии, если правила поправили
  if (it.accented) return { ipa: approxIpa(it.accented), approx: false, src: 'sill' };
  return { ipa: approxIpa(k), approx: true, src: 'rules' };
}
// Статья из кэша без транскрипции или с приблизительной: пробуем добыть точную и, если пользователь вошёл, сохраняем
async function fillPhonetic(entry) {
  // Пересчитываем только то, что не взято из словаря: пустое, приблизительное или построенное по слогам/правилам
  const builtByRules = !entry.phonetic || entry.phoneticApprox || entry.phoneticSrc === 'sill' || entry.phoneticSrc === 'rules';
  if (!entry.word || entry.isPhrase || !builtByRules) return;
  const r = await resolveIpa(entry.word);
  if (!r.ipa || (r.ipa === entry.phonetic && r.src === entry.phoneticSrc)) return;
  if (entry.phonetic && r.approx && entry.phoneticSrc !== 'rules') return; // приблизительным точное не заменяем
  entry.phonetic = r.ipa; entry.phoneticApprox = r.approx; entry.phoneticSrc = r.src;
  if (currentDictEntry === entry) renderEntry(entry);
  if (window.Auth && Auth.user()) sbSave('dictionary', 'word', entry.word.toLowerCase(), entry);
}

// ── Ловушка транслитерации: mammone → «мамон» ────────────────────────────────
// Быстрая модель иногда вместо перевода записывает итальянское слово кириллицей. Признак: русский
// похож на само слово, а английское толкование — нет (у настоящих когнатов, problema → проблема,
// английское похоже тоже). Тогда перевод перезапрашивается у Gemini с явным запретом транслитерации.
const _CYR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sh', ы: 'y', э: 'e', ю: 'u', я: 'a', ь: '', ъ: '' };
const translitRu = s => [...String(s || '').toLowerCase()].map(c => _CYR[c] ?? c).join('').replace(/[^a-z]/g, '');
function strSimilarity(a, b) {
  a = String(a || ''); b = String(b || ''); if (!a || !b) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}
function looksTransliterated(word, ru, en) {
  const w = cleanQuery(word).toLowerCase().replace(/[^a-z]/g, '');
  const r = translitRu(trVariants(ru)[0] || '');
  if (!w || !r || w.length < 4) return false;
  const e = String(trVariants(en)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  return strSimilarity(w, r) >= 0.6 && (!e || strSimilarity(w, e) < 0.5);
}
async function fixTransliteratedRussian(entry) {
  const ru = entry.russian && entry.russian.main, en = entry.english && entry.english.main;
  if (!ru || !looksTransliterated(entry.word, ru, en)) return false;
  const gloss = en || ((entry.meanings || [])[0] || {}).definition || '';
  const prompt = `Italian ${entry.partOfSpeech || 'word'} "${entry.word}"${gloss ? ` means: ${gloss}` : ''}.
Give its natural Russian translation as a real Russian word or phrase. Do NOT transliterate the Italian word into Cyrillic.
Return ONLY valid JSON, no markdown: {"russian":{"main":"перевод","alternatives":"1-3 alternatives semicolon-separated or empty"}}`;
  try {
    const r = await callGemini(prompt);
    const main = r && r.russian && String(r.russian.main || '').trim();
    if (!main || looksTransliterated(entry.word, main, en)) return false;
    entry.russian = { main, alternatives: String(r.russian.alternatives || '') };
    return true;
  } catch (e) { console.warn('translit fix:', e.message); return false; }
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
  _mapInfos = null; _myMapInfos = null;
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
// «female equivalent of anziano» Викисловарь тоже помечает как форму, но это отдельное слово со своей статьёй
const fdIsFormOf = s => !/^female (equivalent |form )?of\b/i.test(s.definition || '') && ((s.tags || []).some(t => t === 'form of' || t === 'alt of') || /^inflection of \S+/i.test(s.definition || ''));

// Начальная форма из определения словоформы: «plural of casa», «inflection of cercare:», «feminine singular of porto (…)»
function fdLemmaOf(def) {
  const m = (def || '').match(/\bof ([^\s:,;()]+)/);
  return m ? m[1].replace(/[.…]+$/, '') : null;
}
const FD_FORM_RU = { plural: 'мн. ч.', participle: 'причастие', gerund: 'герундий', imperative: 'повелит. накл.', subjunctive: 'сослагат. накл.', past: 'прош. вр.', future: 'буд. вр.', conditional: 'условн. накл.' };
const FD_SKIP_FORM_TAGS = ['alt of', 'obsolete', 'archaic', 'poetic', 'literary', 'dialectal', 'rare', 'Latinism'];
// Форма формы: «porta» — женский род причастия «porto», а «porto» само причастие (от porgere).
// Такая сноска ведёт не на лемму, а на другую словоформу, и по ссылке человек попадает в статью
// про порт и вино. Отличаем по тегам: у полезной сноски (volto → volgere) стоит participle с past,
// у бесполезной — participle вместе с родом или числом.
const fdFormOfForm = tags => tags.includes('participle') && tags.some(t => ['feminine', 'masculine', 'plural'].includes(t));

// Какую из статей одного написания делать главной. Викисловарь идёт по этимологии, и у «sito»
// первым стоит устаревшее прилагательное «situated», а существительное «место, сайт» — вторым.
// Главной должна быть статья, которой пользуются сегодня: без ограничительных помет и с большим числом значений.
const FD_RESTRICTED = ['obsolete', 'archaic', 'dated', 'rare', 'dialectal', 'regional', 'poetic', 'literary', 'historical'];
function fdEntryScore(en) {
  const senses = (en.senses || []).filter(s => !fdIsFormOf(s));
  if (!senses.length) return -1;
  const restricted = senses.every(s => {
    const tags = (s.tags || []).map(t => String(t).toLowerCase());
    const par = fdSenseLabel(s.definition).toLowerCase().split(/[,;]\s*/);
    return FD_RESTRICTED.some(t => tags.includes(t) || par.includes(t));
  });
  // Дальше порядок Викисловаря: бонус за число значений делал у «rosso» главным существительное «красный цвет»
  return restricted ? 0 : 100;
}
function fdPickPrimary(entries) {
  return entries.map((en, i) => ({ en, i, score: fdEntryScore(en) })).filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score || a.i - b.i).map(x => x.en)[0] || null;
}

// Все начальные формы, к которым отсылает слово: cerchi → cerchio (сущ.), cercare, cerchiare (гл.)
function fdCollectLemmas(entries, skipEntry) {
  const out = [];
  entries.forEach(en => {
    if (en === skipEntry) return;
    const pos = FD_POS[en.partOfSpeech] || en.partOfSpeech || '';
    (en.senses || []).forEach(s => {
      const tags = s.tags || [];
      if (!fdIsFormOf(s) || fdFormOfForm(tags) || tags.some(t => FD_SKIP_FORM_TAGS.includes(t))) return;
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

// В промпте варианты части речи перечислялись через « / », и модель иногда возвращала не выбор,
// а кусок самого списка: «sostantivo / verbo». Оставляем первый вариант.
function cleanPos(pos) {
  const s = String(pos || '').trim();
  if (!/[\/,]/.test(s)) return s;
  return s.split(/\s*[\/,]\s*/).map(p => p.trim()).filter(Boolean)[0] || s;
}

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
// Помета собирается и из тегов Викисловаря, и из скобки в начале толкования: «(obsolete) placed»
function usageLabel(tags, def) {
  const from = [...(tags || []), ...String(fdSenseLabel(def) || '').split(/[,;]/)];
  const out = [];
  from.forEach(t => {
    const ru = USAGE_RU[String(t).trim().toLowerCase()];
    if (ru && !out.includes(ru)) out.push(ru);
  });
  return out.join(' · ');
}

// Переводит ответ Free Dictionary в формат статьи приложения.
// Возвращает { lemma } для словоформ, null — если данных недостаточно (тогда всё генерирует Gemini).
function mapFreeDictionary(fd, opts = {}) {
  const entries = fd.entries;
  const primary = fdPickPrimary(entries);
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
  // Главный перевод — первый вариант глоссы, но резать по запятой напрямую нельзя: у «to train
  // (students, athletes)» запятая стоит внутри скобки, и на экран уезжало «to train (students»
  const englishMain = trVariants(glosses[0])[0] || String(glosses[0] || '').trim();
  const englishAlts = glosses.slice(1, 4).map(g => g.split(';')[0].trim()).filter(Boolean).join('; ');

  // Синонимы и антонимы Викисловарь даёт по каждому значению отдельно, и вид связи в них есть.
  // Раньше всё это сваливалось в общий relatedWords и вид терялся: у «bello» рядом с «buono»
  // оказывались «grande, grosso, forte» — синонимы значения «изрядный», и выглядело это ошибкой.
  // Держим их с видом и номером значения; relatedWords остаётся ради старых статей и модели.
  const related = [], links = [];
  const addLink = (w, kind, sense) => {
    if (!w || w === word || links.length >= 12 || links.some(l => l.word === w)) return; // потолок, чтобы список не разрастался
    links.push({ word: w, kind, sense });
    if (!related.includes(w) && related.length < 6) related.push(w);
  };
  senses.forEach((s, i) => {
    (s.synonyms || []).forEach(w => addLink(w, 'sin', i));
    (s.antonyms || []).forEach(w => addLink(w, 'ant', i));
  });

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
  // Омографы: другие леммы того же написания (ancora — наречие и существительное). Показываются
  // отдельным разделом статьи; словоформы других слов сюда не попадают, они в alsoForms
  const homographs = entries.filter(en => en !== primary && (en.senses || []).some(s => !fdIsFormOf(s))).map(en => {
    const ss = (en.senses || []).filter(s => !fdIsFormOf(s)).slice(0, 3);
    const tg = new Set(ss.flatMap(s => s.tags || []));
    const pr = (en.pronunciations || []).find(p => p.type === 'ipa' && p.text);
    return {
      partOfSpeech: FD_POS[en.partOfSpeech] || en.partOfSpeech || '',
      gender: en.partOfSpeech === 'noun' ? (tg.has('feminine') && tg.has('masculine') ? 'm./f.' : tg.has('feminine') ? 'f.' : tg.has('masculine') ? 'm.' : null) : null,
      phonetic: pr ? pr.text : '',
      label: usageLabel([...tg], ss[0] && ss[0].definition),
      glosses: ss.map(s => fdCleanGloss(s.definition)).filter(Boolean),
      example: ss.map(s => (s.examples && s.examples[0]) || '').find(Boolean) || ''
    };
  });
  return {
    word, partOfSpeech: FD_POS[posEn] || posEn, gender, isNoun, isVerb, homographs,
    phonetic: ipa ? ipa.text : '',
    singular, plural, conjugations, auxiliary,
    english: { main: englishMain, alternatives: englishAlts },
    relatedWords: related, links,
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
  // Делим по «;» и «,» только вне скобок: «старший (по службе, возрасту)» — один вариант, а не два обрывка
  const splitTop = s => { const out = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(') depth++; else if (ch === ')') depth = Math.max(0, depth - 1); if ((ch === ';' || ch === ',') && depth === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
  const parts = splitTop(items[0]);
  const main = parts[0];
  if (!main || main.length > 60) return null;
  const alts = [];
  parts.slice(1).concat(items.slice(1).map(x => splitTop(x)[0] || ''))
    .forEach(a => { if (a && a !== main && a.length <= 60 && !alts.includes(a) && alts.length < 4) alts.push(a); });
  return { main, alternatives: alts.join('; ') };
}

function fdCompletionPrompt(base, opts = {}) {
  const senseLines = base.senses.map((s, i) =>
    `${i + 1}. ${s.label ? '(' + s.label + ') ' : ''}${s.gloss}${s.example ? ` — e.g. "${s.example}"` : ''}`).join('\n');
  // Синонимы и антонимы уже есть от Викисловаря, и вид связи у них известен. У модели просим другое —
  // тематических соседей и однокоренные, — и всегда: раньше её не звали, если Викисловарь дал три слова,
  // и статья оставалась вообще без тематических связей, а именно они и наполняют карту.
  const haveRelated = (base.relatedWords || []).slice(0, 8);
  const homos = base.homographs || [];
  const homoLines = homos.map((h, i) => `${i + 1}. ${h.partOfSpeech}${h.gender ? ` (${h.gender})` : ''}${h.phonetic ? ` ${h.phonetic}` : ''}: ${h.glosses.join('; ')}`).join('\n');
  // Викисловарь у некоторых слов не знает современного значения (у «sito» нет «сайта»),
  // а порядок у него исторический, поэтому устаревшее идёт первым. И то и другое чиним здесь.
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

// ── Конвейер статьи: подсказка → модель → проверка полноты → сохранение → проверка второй моделью ──
// Русский Викисловарь больше не соперник, а подсказка внутри промпта: его список плоский на все
// слова этого написания, поэтому что из него подходит, решает модель, которая видит глосс.
async function ruHintFor(word) {
  try {
    const r = await Promise.race([fetchRuWiktionary(word), new Promise(res => setTimeout(() => res(null), 800))]);
    if (!r || !r.main) return null;
    return [r.main, ...String(r.alternatives || '').split(';')].map(s => s.trim()).filter(Boolean).slice(0, 6);
  } catch (e) { return null; }
}
function ruHintRule(hint) {
  if (!hint || !hint.length) return '';
  return `\nRussian Wiktionary lists these Russian words for this spelling (they may belong to OTHER words spelled the same): ${hint.join('; ')}. Use one only if it translates the sense described above; otherwise ignore it.`;
}

// Полнота статьи проверяется механически до сохранения. Раньше кривой ответ модели молча
// превращался в статью с английскими глоссами вместо определений и без перевода, и она уходила в кэш.
const POS_OK = ['sostantivo', 'verbo', 'aggettivo', 'avverbio', 'preposizione', 'congiunzione', 'pronome', 'articolo', 'interiezione', 'numerale', 'locuzione', 'modo di dire', 'proverbio'];
function validateArticle(entry, base) {
  const problems = [];
  const ru = entry.russian && String(entry.russian.main || '').trim();
  if (!ru || !/[а-яё]/i.test(ru)) problems.push('нет русского перевода');
  const ms = Array.isArray(entry.meanings) ? entry.meanings.filter(m => m && m.definition) : [];
  if (!ms.length) problems.push('нет определений');
  const glosses = new Set(((base && base.senses) || []).map(s => String(s.gloss || '').toLowerCase().trim()));
  if (ms.some(m => glosses.has(String(m.definition).toLowerCase().trim()))) problems.push('определение скопировано с английского глосса');
  const pos = cleanPos(entry.partOfSpeech).toLowerCase();
  if (!POS_OK.some(p => pos.startsWith(p))) problems.push(`часть речи вне списка: «${entry.partOfSpeech}»`);
  if (entry.category && !CATEGORY_KEYS.includes(entry.category)) entry.category = 'altro'; // не ошибка, просто приводим к списку
  if (problems.length) { const err = new Error('Статья неполная: ' + problems.join(', ')); err.validation = problems; throw err; }
}

// Проверка второй моделью по фактам Викисловаря: перевод того ли значения, есть ли пометы,
// не выдумано ли. Другая модель, чем писала, иначе она подтвердит собственные ошибки.
// Проверка в два вопроса разным контекстом. Вопрос «настоящее ли это значение» задаётся БЕЗ списка
// Викисловаря: со списком перед глазами проверяющий браковал «vita = талия» и «andare = работать»
// как «не из списка», даже когда именно эти примеры были вписаны в правила как разрешённые.
async function verifySenses(entry) {
  const ms = (entry.meanings || []).filter(m => m && m.definition);
  if (!ms.length) return { errors: [] };
  const prompt = `You know Italian at native level. For a learner's dictionary, the Italian ${cleanPos(entry.partOfSpeech) || 'word'} "${entry.word}" was given these definitions:
${ms.map((m, i) => `${i + 1}. ${m.definition}`).join('\n')}

For EACH definition say whether it describes a genuine sense of the word "${entry.word}" in Italian. Any register counts: standard, colloquial, figurative, technical, regional, dated. Judge from your own knowledge of Italian; there is no list to compare against. A definition is NOT genuine only if the word does not have that meaning at all, or the meaning belongs to a different word that merely looks the same.
Return ONLY valid JSON: { "verdicts": [ { "n": 1, "genuine": true/false, "note": "short reason in Russian, only when genuine is false" } ] }`;
  const r = await llmJson(prompt, 'check');
  const verdicts = Array.isArray(r && r.verdicts) ? r.verdicts : [];
  const errors = verdicts.filter(v => v && v.genuine === false).map(v => `значение ${v.n}${ms[v.n - 1] ? ` «${String(ms[v.n - 1].definition).slice(0, 60)}»` : ''} не является значением слова${v.note ? ': ' + String(v.note).trim() : ''}`);
  return { errors: errors.slice(0, 6) };
}

async function verifyArticle(entry, base) {
  // Два вопроса по очереди, а не разом: два одновременных запроса к Groq на каждое слово упирались в лимит
  const f = await verifyArticleFacts(entry, base); // без сверки фактов вердикта нет — ошибка уходит наверх
  let sErrors = [], sWarn = [];
  try { sErrors = (await verifySenses(entry)).errors; }
  catch (e) { sWarn = ['проверка значений не удалась: ' + (e.message || '')]; }
  const errors = [...sErrors, ...f.errors].slice(0, 8);
  return { ok: !errors.length, errors, warnings: [...f.warnings, ...sWarn], by: f.by };
}

// Перепроверка без перегенерации: статья в кэше уже есть, не хватает только вердикта.
// Факты Викисловаря добираем заново, это бесплатно и без моделей.
// Проверяющий не просто ругается, а называет более частый перевод. Раньше эта подсказка оставалась
// строчкой замечания и никто её не применял: сорок статей хранили «упражнять» с припиской «следует
// использовать „тренировать“». Теперь заменяем сразу, прежний перевод уходит в варианты.
function applyRuFix(entry, v) {
  if (!v || !v.fixRu) return v;
  const ru = entry.russian || (entry.russian = { main: '', alternatives: '' });
  const old = String(ru.main || '').trim();
  if (!old || old.toLowerCase() === v.fixRu.toLowerCase()) return v;
  const alts = trVariants(ru.alternatives).filter(a => a.toLowerCase() !== v.fixRu.toLowerCase());
  if (!alts.some(a => a.toLowerCase() === old.toLowerCase())) alts.unshift(old);
  ru.main = v.fixRu; ru.alternatives = alts.join('; ');
  // Снимаем только то замечание, которое этой заменой и закрыто; остальные остаются ошибками
  const kept = v.errors.filter(t => !/\brussian\.main\b/i.test(t));
  return { ...v, errors: kept, ok: !kept.length, warnings: [...v.warnings, `главный перевод заменён на «${v.fixRu}» по замечанию проверки, прежний — в вариантах`] };
}

async function recheckArticle(word) {
  const entry = await sbGet('dictionary', String(word).toLowerCase());
  if (!entry || !entry.word) return null;
  let base = null;
  if (entry.source === 'wiktionary') {
    try { const fd = await fetchFreeDictionary(entry.word); const m = fd && mapFreeDictionary(fd); if (m && !m.lemma && !m.lemmas) base = m; } catch (e) {}
  }
  const v = applyRuFix(entry, await verifyArticle(entry, base));
  entry.status = v.ok ? 'checked' : 'flagged'; entry.checkNotes = v.errors; entry.checkWarnings = v.warnings;
  entry.sources = { ...(entry.sources || {}), check: v.by };
  await sbSave('dictionary', 'word', entry.word.toLowerCase(), entry);
  if (currentDictEntry && String(currentDictEntry.word || '').toLowerCase() === entry.word.toLowerCase()) {
    Object.assign(currentDictEntry, { status: entry.status, checkNotes: entry.checkNotes, checkWarnings: entry.checkWarnings, sources: entry.sources });
    renderSourceLine(currentDictEntry);
  }
  return entry;
}

async function verifyArticleFacts(entry, base) {
  const senses = ((base && base.senses) || []).map((s, i) => `${i + 1}. ${s.label ? '(' + s.label + ') ' : ''}${s.gloss}`).join('\n');
  // Пометы Викисловаря передаём и для омографов: без них проверяющий решал, что «устар.» относится
  // к русскому слову «паром», а не к итальянскому значению, и браковал верную статью
  const homos = ((base && base.homographs) || []).map((h, i) => `${i + 1}. ${h.partOfSpeech}${h.label ? ` [Wiktionary marks it: ${h.label}]` : ''}: ${(h.glosses || []).join('; ')}`).join('\n');
  const article = {
    word: entry.word, partOfSpeech: entry.partOfSpeech, gender: entry.gender, russian: entry.russian, english: entry.english,
    meanings: (entry.meanings || []).map(m => ({ definition: m.definition, label: m.label || '' })),
    homographs: (entry.homographs || []).map(h => ({ partOfSpeech: h.partOfSpeech, russian: h.russian, label: h.label || '' }))
  };
  // Пометы в статье — русские сокращения тегов Викисловаря. Без этой таблицы проверяющий требовал
  // писать их по-итальянски и браковал «муз.» за то, что у Викисловаря «другая аббревиатура».
  const groups = {}; Object.entries(USAGE_RU).forEach(([en, ru]) => { (groups[ru] = groups[ru] || []).push(en); });
  const labelMap = Object.entries(groups).map(([ru, ens]) => `${ru} = ${ens.join('/')}`).join('; ');
  const prompt = `You are checking a dictionary entry for the Italian word "${entry.word}" written by another model. Report real errors; do not invent problems.
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
  const r = await llmJson(prompt, 'check');
  const clean = a => (Array.isArray(a) ? a : []).map(s => String(s).trim()).filter(Boolean).slice(0, 6);
  const errors = clean(r && (r.errors || r.issues)), warnings = clean(r && r.warnings);
  // Проверяющий не просто жалуется, а называет замену. Берём её: короткая русская строка, старый
  // перевод уезжает в варианты — ничего не теряется, а статья перестаёт хранить менее частый смысл.
  const fix = String((r && r.russianMain) || '').trim();
  const fixRu = fix && fix.length <= 40 && /^[а-яёА-ЯЁ][а-яёА-ЯЁ\s-]*$/.test(fix) ? fix : '';
  return { ok: !errors.length && (r ? r.ok !== false || !errors.length : false), errors, warnings, fixRu, by: _lastDictLlm };
}

// Сохранить, показать, проверить второй моделью, сохранить статус. Проверка идёт после первого
// сохранения: её сбой не должен оставить слово без статьи.
async function finalizeArticle(entry, query, base, opts = {}) {
  const key = String(entry.word || query).toLowerCase(), qk = String(query || '').toLowerCase();
  entry.pipeline = 2; entry.status = 'draft'; entry.checkNotes = [];
  const save = async () => { await sbSave('dictionary', 'word', key, entry); if (qk && qk !== key) await sbSave('dictionary', 'word', qk, entry); };
  await save();
  if (!opts.silent && currentDictWord === key) renderEntry(entry);
  try {
    const v = applyRuFix(entry, await verifyArticle(entry, base));
    entry.status = v.ok ? 'checked' : 'flagged'; entry.checkNotes = v.errors; entry.checkWarnings = v.warnings;
    entry.sources = { ...(entry.sources || {}), check: v.by };
  } catch (e) { entry.checkNotes = ['проверка не удалась: ' + (e.message || '')]; entry.checkWarnings = []; }
  await save();
  if (!opts.silent && currentDictWord === key && currentDictEntry && String(currentDictEntry.word || '').toLowerCase() === key) {
    currentDictEntry.status = entry.status; currentDictEntry.checkNotes = entry.checkNotes; currentDictEntry.checkWarnings = entry.checkWarnings; currentDictEntry.sources = entry.sources;
    renderSourceLine(currentDictEntry);
  }
  return entry;
}

// Объекты meanings из недописанного ответа: считаем скобки, а не подбираем регулярку под поля
function extractMeaningsFromPartial(partial) {
  const mi = partial.indexOf('"meanings"'); if (mi === -1) return [];
  const s = partial.slice(mi), out = [];
  let i = s.indexOf('['); if (i === -1) return out;
  for (let depth = 0, start = -1, inStr = false, esc = false; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') { depth--; if (depth === 0 && start >= 0) { try { const o = JSON.parse(s.slice(start, i + 1)); if (o && o.definition) out.push(o); } catch (e) {} start = -1; } }
    else if (ch === ']' && depth === 0) break;
  }
  return out;
}

function fdMergeCompletion(base, extra, fastRu) {
  // Пометку берём от модели; если модель вернула ровно столько значений, сколько знает
  // Викисловарь, и своей пометки не дала — подставляем разобранную из его тегов
  const meanings = Array.isArray(extra.meanings) && extra.meanings.some(m => m && m.definition)
    ? extra.meanings.filter(m => m && m.definition).map((m, i) => {
        const same = extra.meanings.length === base.senses.length;
        return { definition: m.definition, example: m.example || '',
                 label: usageLabel([m.label], '') || (same ? usageLabel([], base.senses[i] && base.senses[i].label) : '') };
      })
    : base.senses.map(s => ({ definition: s.gloss, example: s.example, label: usageLabel([], s.label) }));
  const related = (base.relatedWords || []).slice();
  (Array.isArray(extra.relatedWords) ? extra.relatedWords : []).forEach(w => {
    if (typeof w === 'string' && w && !related.includes(w) && related.length < 10) related.push(w); // синонимы Викисловаря и тематические соседи не делят один потолок
  });
  const homographs = (base.homographs || []).map((h, i) => {
    const x = (Array.isArray(extra.homographs) ? extra.homographs[i] : null) || {};
    return { ...h, russian: typeof x.russian === 'string' ? x.russian : '',
      label: h.label || usageLabel([x.label], ''),
      meanings: Array.isArray(x.meanings) ? x.meanings.filter(m => m && m.definition).map(m => ({ definition: m.definition, example: m.example || '', label: usageLabel([m.label], '') })) : [] };
  });
  const { senses, _pending, ...rest } = base;
  // Род берём у Викисловаря; если он его не записал (так у «sito»), принимаем от модели, но только m./f./m./f.
  const modelGender = String((extra && extra.gender) || '').trim();
  return {
    ...rest,
    gender: rest.gender || (/^(m\.|f\.|m\.\/f\.)$/.test(modelGender) ? modelGender : rest.gender),
    homographs,
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
// Одно написание — два разных слова: существительное «puzza» и форма глагола puzzare. Показываем
// выбор, а не запихиваем чужую лемму со спряжениями в чужую же статью. Спрашиваем только при ручном
// вводе: по ссылке слово уже выбрано, а в самой статье развилка и так стоит строкой «также форма слова».
function offerFormsChooser(entry, typed) {
  const self = String(entry.word || typed || '').toLowerCase();
  const forms = (entry.alsoForms || []).filter(l => l && l.lemma && l.lemma.toLowerCase() !== self);
  if (!forms.length) return false;
  const items = [
    { italian: entry.word || typed, partOfSpeech: cleanPos(entry.partOfSpeech), gender: entry.gender || '',
      shortDefinition: (entry.russian && entry.russian.main) || '' },
    ...forms.map(l => ({ italian: l.lemma, partOfSpeech: l.pos || '', shortDefinition: l.desc || '' }))
  ];
  renderRuResults(typed || entry.word, items, `«${typed || entry.word}» — это несколько разных слов`);
  showState('rulist');
  return true;
}

async function lookupWordHybrid(query, base, opts = {}) {
  const key = base.word.toLowerCase();
  // Развилку показываем, только если её попросили: это делает единственное место, где слово
  // вводят руками (doSearch). По ссылке человек уже выбрал слово — открываем статью.
  if (opts.chooser && offerFormsChooser(base, query)) return;
  // На экран сразу всё, что известно без модели: слово, часть речи, род, транскрипция, формы, английский.
  // Русский и определения дописываются по мере ответа, статья не висит пустой.
  if (!opts.headless) {
    renderEntry({ ...base, _pending: true });
    showState('result');
    addToHistory(base.word, 'dict');
  }
  try {
    const ruHint = await ruHintFor(base.word);
    let shownRu = false, shownMeanings = 0;
    const extra = await llmJsonStream(fdCompletionPrompt(base, { ruHint }), 'article', partial => {
      if (currentDictWord !== key || !currentDictEntry || !currentDictEntry._pending) return;
      if (!shownRu) {
        const m = partial.match(/"russian"\s*:\s*\{[^{}]*\}/);
        if (m) { try { const ru = JSON.parse('{' + m[0] + '}').russian; if (ru && ru.main) { shownRu = true; renderEntry({ ...currentDictEntry, russian: ru }); } } catch (e) {} }
      }
      const meanings = extractMeaningsFromPartial(partial);
      if (meanings.length > shownMeanings) {
        shownMeanings = meanings.length;
        renderEntry({ ...currentDictEntry, meanings: meanings.map(m => ({ ...m, label: usageLabel([m.label], '') })), _pending: true });
      }
    });
    const entry = fdMergeCompletion(base, extra, null);
    entry.relatedWords = await verifyWords(entry.relatedWords, base.relatedWords || []); // синонимы Викисловаря доверенные, добавки модели — проверяем
    if (!entry.phonetic) { const r = await resolveIpa(entry.word); entry.phonetic = r.ipa; entry.phoneticApprox = r.approx; entry.phoneticSrc = r.src; }
    await fixTransliteratedRussian(entry); // «мамон» вместо перевода — переспрашиваем у Gemini
    entry.sources = { structure: 'wiktionary', text: entry.llm, ruHint: !!ruHint };
    validateArticle(entry, base); // неполную статью не сохраняем и не показываем как готовую
    await finalizeArticle(entry, query, base, { silent: !!opts.headless });
    return entry;
  } catch(err) {
    console.error('lookupWordHybrid error:', err);
    if (opts.headless) throw err;
    if (currentDictWord !== key) return;
    // Быстрые данные остаются на экране; вместо определений — английские глоссы и причина.
    // В кэш это не уходит: при следующем открытии статья попробует собраться заново.
    const { _pending, ...shown } = currentDictEntry || base;
    currentDictEntry = shown;
    $('transRU').textContent = '—'; $('transRUalt').textContent = '';
    const why = err.validation
      ? `Модель вернула неполную статью: ${escapeHtml(err.validation.join(', '))}. Не сохранено — нажмите обновление в шапке, чтобы попробовать ещё раз.`
      : describeApiError(err.message || '');
    $('meaningsContainer').innerHTML = `
      <div class="definition-text">${base.senses.map(s => makeClickable(s.gloss)).join('; ') || '—'}</div>
      <div class="pending-error">${why}</div>`;
  }
}

// ── Поиск итальянского слова ──────────────────────────────────────────────────
async function lookupWord(word, _depth = 0, opts = {}) {
  word = cleanQuery(word);
  if (!word) return;
  // headless — конвейер без экрана: для прогона золотого набора и пересборки кэша. Возвращает статью.
  if (!opts.headless) showState('loading');
  const prompt = `You are an expert Italian linguist. Given the Italian word "${word}", provide a complete dictionary entry in JSON format.
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
  // 1. Кэш Supabase — мгновенно
  const cachedWord = opts.force ? null : await sbGet('dictionary', word.toLowerCase());
  if (cachedWord) {
    if (opts.chooser && offerFormsChooser(cachedWord, word)) return;
    try {
      renderEntry(cachedWord); showState('result'); showCacheBadge(); addToHistory(cachedWord.word || word, 'dict'); pruneRelated(cachedWord); fillPhonetic(cachedWord);
      // сохранённый перевод-транслитерация чинится при открытии и, если пользователь вошёл, пересохраняется
      fixTransliteratedRussian(cachedWord).then(fixed => { if (fixed && currentDictEntry === cachedWord) { renderEntry(cachedWord); if (window.Auth && Auth.user()) sbSave('dictionary', 'word', (cachedWord.word || word).toLowerCase(), cachedWord); } });
    }
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
    if (opts.headless) return { redirects: mapped.lemmas.map(l => l.lemma) };
    // Словоформа сразу нескольких слов — показываем список на выбор
    const items = mapped.lemmas.map(l => ({ italian: l.lemma, partOfSpeech: l.pos, shortDefinition: l.desc }));
    renderRuResults(word, items, `«${word}» — форма нескольких слов`);
    showState('rulist');
    return;
  }
  if (mapped && mapped.lemma) {
    if (opts.headless) return { redirects: [mapped.lemma] };
    // Введена словоформа («sono», «mangiato») — переходим к начальной форме
    if (_depth < 2 && mapped.lemma.toLowerCase() !== word.toLowerCase()) {
      showToast(`${word} → ${mapped.lemma}`);
      return lookupWord(mapped.lemma, _depth + 1);
    }
  } else if (mapped) {
    return lookupWordHybrid(word, mapped, opts);
  }

  // 3. Fallback: слова нет в Викисловаре или таблица форм неполная — Gemini генерирует всё
  try {
    const ruHint = await ruHintFor(word);
    const entry = await llmJson(prompt + ruHintRule(ruHint), 'article');
    if (!entry.word) { if (opts.headless) throw new Error('parola non trovata'); $('errorText').textContent = `"${word}" — parola non trovata`; showState('error'); return; }
    entry.relatedWords = await verifyWords(entry.relatedWords);
    entry.partOfSpeech = cleanPos(entry.partOfSpeech);
    // Сноска «также форма слова»: у статей из Викисловаря она строится из его же данных,
    // здесь данных нет, поэтому спрашиваем модель. Само другое слово живёт в своей статье.
    entry.alsoForms = (Array.isArray(entry.alsoForms) ? entry.alsoForms : [])
      .map(l => ({ lemma: String((l && l.lemma) || '').trim(), pos: cleanPos(l && l.pos), desc: String((l && l.desc) || '').trim() }))
      .filter(l => l.lemma && l.lemma.toLowerCase() !== String(entry.word || '').toLowerCase())
      .map(l => ({ ...l, desc: l.desc || `форма слова ${l.lemma}` }));
    // Пометки модель отдаёт по-английски, на экран они идут сокращениями по-русски
    if (Array.isArray(entry.meanings)) entry.meanings = entry.meanings.map(m => ({ ...m, label: usageLabel([m && m.label], '') }));
    // Слова нет в Викисловаре, статья целиком от модели: помечаем, в граф и «мои слова» оно не попадёт
    entry.unverified = !(await wordExists(entry.word || word));
    // Транскрипцию модели не берём: словари, иначе правила чтения
    { const r = await resolveIpa(entry.word || word); entry.phonetic = r.ipa; entry.phoneticApprox = r.approx; entry.phoneticSrc = r.src; }
    entry.llm = _lastDictLlm;
    entry.sources = { structure: 'model', text: entry.llm, ruHint: !!ruHint };
    validateArticle(entry, null); // неполную статью не сохраняем
    if (opts.headless) { await finalizeArticle(entry, word, null, { silent: true }); return entry; }
    if (opts.chooser && offerFormsChooser(entry, word)) { await finalizeArticle(entry, word, null, { silent: true }); return entry; }
    renderEntry(entry);
    showState('result');
    addToHistory(entry.word || word, 'dict');
    await finalizeArticle(entry, word, null);
    return entry;
  } catch(err) {
    if (opts.headless) throw err;
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
  "partOfSpeech": "EXACTLY ONE of these, never a combination: locuzione verbale, locuzione avverbiale, locuzione nominale, locuzione aggettivale, locuzione prepositiva, modo di dire, proverbio",
  "category": "${CATEGORY_PROMPT}",
  "russian": { "main": "idiomatic Russian equivalent (not word-for-word)", "alternatives": "2-3 alternatives semicolon-separated or empty" },
  "english": { "main": "idiomatic English equivalent", "alternatives": "2-3 alternatives semicolon-separated or empty" },
  "meanings": [ { "definition": "What the expression means, in Italian (1 sentence)", "example": "Natural Italian sentence using the whole expression", "label": "one of [obsolete, archaic, dialectal, regional, vulgar, offensive, slang, colloquial, rare, literary, poetic, figurative, humorous] or an empty string; set it only when the sense really is restricted" } ],
  "register": "neutro / colloquiale / formale / volgare / letterario / regionale",
  "relatedWords": ["3-5 related Italian words or expressions"]
}
meanings: 1-3 items, most frequent first. Do NOT include phonetic transcription, gender, plural or conjugation tables.`;
  try {
    const raw = await llmJson(prompt, 'dict');
    if (!raw || !raw.word) { $('errorText').textContent = `"${phrase}" — espressione non trovata`; showState('error'); return; }
    const entry = {
      word: cleanQuery(raw.word) || phrase, partOfSpeech: cleanPos(raw.partOfSpeech) || 'locuzione', category: raw.category || 'altro',
      gender: null, phonetic: await ipaJob, singular: null, plural: null, conjugations: null,
      russian: raw.russian || { main: '', alternatives: '' }, english: raw.english || { main: '', alternatives: '' },
      meanings: Array.isArray(raw.meanings) ? raw.meanings.filter(m => m && m.definition).map(m => ({ ...m, label: usageLabel([m.label], '') })) : [],
      isNoun: false, isVerb: false, isPhrase: true,
      register: raw.register || '',
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
  const q = word.trim().toLowerCase();
  // Ровно один вариант переведён именно этим словом и статья на него уже есть — открываем её сразу,
  // а не показываем список из одного знакомого слова и нескольких соседей. Остальные варианты
  // не теряются: они уходят строкой под заголовком статьи (см. _ruOthers в renderEntry).
  // Точных попаданий два — смотрим, одним ли словом переведены оба: casa и abitazione оба «дом»,
  // и выбирать между ними не по чему — открываем более частое. «замок» с castello и serratura
  // остаётся списком: в статьях там разные переводы, «замок (здание)» и «замок (на двери)».
  const exactOnes = list => list.filter(i => i && i.source === 'кэш' && trVariants(i.shortDefinition).some(x => x.toLowerCase() === q));
  const openOne = async (list, hit) => {
    _ruOthers = { q: word.trim(), word: String(hit.italian || '').toLowerCase(), items: list.filter(i => i !== hit) };
    await lookupWord(hit.italian);
  };
  // В кэше русских запросов осели варианты, найденные по слову внутри скобки («открывать (дверь,
  // окно)»): пропускаем сохранённый список через то же правило, что и живой поиск
  const atStart = (s, w) => { const i = String(s).toLowerCase().indexOf(w); return i === 0 || (i > 0 && !/[а-яёa-z]/i.test(s[i - 1])); };
  const dropStale = list => {
    const keep = list.filter(i => i && (i.source !== 'кэш' || trVariants(i.shortDefinition).some(x => atStart(x, q))));
    return keep.length ? keep : list;
  };
  const cachedRu = await sbGet('russian_search', q);
  if (cachedRu) {
    const list = await freshenRuGlosses(dropStale(cachedRu));
    const ex = exactOnes(list);
    if (list.length === 1) { await openOne(list, list[0]); return; }
    if (ex.length === 1) { await openOne(list, ex[0]); return; }
    if (ex.length > 1 && await sameMainTranslation(ex)) { await openOne(list, await mostFrequent(ex, i => i.italian)); return; }
    renderRuResults(word, list); showState('rulist'); showCacheBadge(); return;
  }

  // Слои, от бесплатного к дорогому: переводы уже открытых статей и колод → русский Викисловарь →
  // модель, только если набралось меньше трёх вариантов. Слова модели проверяются по Викисловарю.
  const items = [];
  const has = w => items.some(i => i.italian.toLowerCase() === String(w || '').toLowerCase());
  try { (await searchOwnTranslations(q)).forEach(i => { if (!has(i.italian)) items.push(i); }); } catch (e) { console.warn('own translations:', e); }
  try { (await fetchRuWiktItalian(q)).forEach(w => { if (!has(w)) items.push({ italian: w, source: 'словарь' }); }); } catch (e) { console.warn('ru.wiktionary it=:', e); }
  let llmError = null;
  if (items.length < 3) {
    try {
      const results = await llmJson(prompt, 'dict');
      const list = Array.isArray(results) ? results.filter(r => r && r.italian) : [];
      const ok = await verifyWords(list.map(r => cleanQuery(r.italian)));
      list.forEach(r => { if (ok.includes(cleanQuery(r.italian)) && !has(r.italian)) items.push({ ...r, source: 'модель' }); });
    } catch (err) { llmError = err; console.error('lookupRussian llm:', err); }
  }
  if (!items.length) {
    if (llmError) { handleApiError(llmError.message || ''); return; }
    $('errorText').textContent = `"${word}" — перевод не найден`; showState('error'); showErrorSuggest(await nearRuWords(q)); return;
  }
  const results = await freshenRuGlosses(await enrichRuItems(items.slice(0, 8)));
  await sbSave('russian_search', 'word', q, results);
  const exFresh = exactOnes(results);
  if (results.length === 1) { await openOne(results, results[0]); return; }
  if (exFresh.length === 1) { await openOne(results, exFresh[0]); return; }
  if (exFresh.length > 1 && await sameMainTranslation(exFresh)) { await openOne(results, await mostFrequent(exFresh, i => i.italian)); return; }
  renderRuResults(word, results);
  showState('rulist');
}

// Переводы из уже сохранённых статей (общий кэш) и из своих колод: поиск по подстроке, точное слово выше
async function searchOwnTranslations(q) {
  const out = [];
  const pat = `*${q.replace(/[*,()]/g, '')}*`;
  const exactIn = s => trVariants(s).some(x => x.toLowerCase() === q);
  // База ищет подстроку где угодно, и на «порт» приезжает «заниматься спортом». Оставляем только
  // совпадения с начала слова: «порт», «порты», «портвейн» проходят, «спортом» нет.
  const atWordStart = new RegExp('(^|[^а-яёa-z])' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const wordHit = (...fields) => fields.flatMap(trVariants).find(x => atWordStart.test(x)) || '';
  const res = await fetch(`${SB_URL}/rest/v1/dictionary?select=${encodeURIComponent('word,w:data->>word,pos:data->>partOfSpeech,g:data->>gender,ru:data->russian->>main,alt:data->russian->>alternatives,unv:data->>unverified')}&or=(${encodeURIComponent(`data->russian->>main.ilike.${pat},data->russian->>alternatives.ilike.${pat}`)})&limit=30`, { headers: SB_H });
  if (res.ok) (await res.json()).forEach(r => {
    if (r.unv === 'true' || !(r.w || r.word)) return;
    const hit = wordHit(r.ru, r.alt);
    if (!hit) return;
    out.push({ italian: r.w || r.word, partOfSpeech: r.pos || '', gender: r.g || null, shortDefinition: hit, source: 'кэш', _exact: exactIn(r.ru) || exactIn(r.alt) });
  });
  if (window.Auth && Auth.user()) {
    const nr = await fetch(`${SB_URL}/rest/v1/notes?select=word,pos,translation&translation=ilike.${encodeURIComponent(pat)}&limit=20`, { headers: SB_H }).catch(() => null);
    if (nr && nr.ok) (await nr.json()).forEach(n => {
      if (out.some(i => i.italian.toLowerCase() === String(n.word).toLowerCase())) return;
      const hit = wordHit(n.translation);
      if (!hit) return;
      out.push({ italian: n.word, partOfSpeech: n.pos || '', gender: null, shortDefinition: hit, source: 'кэш', _exact: exactIn(n.translation) });
    });
  }
  out.sort((a, b) => (b._exact ? 1 : 0) - (a._exact ? 1 : 0));
  return out.map(({ _exact, ...i }) => i);
}
// Строка |it= в разделе «Перевод» статьи русского слова: [[vecchio]], {{t|it|funzionario|m}}
async function fetchRuWiktItalian(q) {
  const res = await fetch(`https://ru.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(q)}&prop=wikitext&format=json&formatversion=2&redirects=1&origin=*`);
  if (!res.ok) return [];
  const text = ((await res.json()).parse || {}).wikitext || '';
  const words = [];
  for (const m of text.matchAll(/\|it=([^\n]*)/g)) {
    for (const w of m[1].matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|\{\{t\|it\|([^}|]+)/g)) {
      const w0 = cleanQuery(w[1] || w[2] || '').toLowerCase();
      if (w0 && /^[a-zàèéìíòóùú' ]+$/.test(w0) && !words.includes(w0)) words.push(w0);
    }
  }
  return words.slice(0, 8);
}
// Пояснение под словом в списке модель придумывает сама, и выходит «большая ворота». Если у слова
// уже есть статья, её перевод и точнее, и написан по-русски: одним запросом подменяем. Варианты из
// нашего же кэша не трогаем — там стоит ровно тот кусок перевода, по которому слово и нашлось.
async function freshenRuGlosses(list) {
  const words = [...new Set(list.filter(i => i && i.source !== 'кэш').map(i => String(i.italian || '').toLowerCase()).filter(Boolean))];
  if (!words.length) return list;
  const inList = words.map(w => '"' + w.replace(/"/g, '') + '"').join(',');
  try {
    const res = await fetch(`${SB_URL}/rest/v1/dictionary?word=in.(${encodeURIComponent(inList)})&select=${encodeURIComponent('word,ru:data->russian->>main')}`, { headers: SB_H });
    if (!res.ok) return list;
    const byWord = new Map();
    (await res.json()).forEach(r => { if (r.ru) byWord.set(String(r.word).toLowerCase(), r.ru); });
    list.forEach(i => { const ru = i && byWord.get(String(i.italian || '').toLowerCase()); if (ru) i.shortDefinition = ru; });
  } catch (e) { console.warn('freshen ru glosses:', e); }
  return list;
}
// Два слова с одним и тем же переводом (casa и abitazione — «дом») — синонимы, и выбрать между
// ними в списке не по чему: строки совпадают целиком. Сравниваем полные переводы статей, а не
// найденный кусок: у «замка» кусок один и тот же, а в статьях стоит «замок (здание)» и «замок
// (на двери)» — это разные значения русского слова, и список для них остаётся списком.
async function sameMainTranslation(items) {
  const words = [...new Set(items.map(i => String(i.italian || '').toLowerCase()).filter(Boolean))];
  if (words.length < 2) return false;
  const inList = words.map(w => '"' + w.replace(/"/g, '') + '"').join(',');
  try {
    const res = await fetch(`${SB_URL}/rest/v1/dictionary?word=in.(${encodeURIComponent(inList)})&select=${encodeURIComponent('word,ru:data->russian->>main')}`, { headers: SB_H });
    if (!res.ok) return false;
    const mains = new Map();
    (await res.json()).forEach(r => mains.set(String(r.word).toLowerCase(), String(r.ru || '').toLowerCase().replace(/\s+/g, ' ').trim()));
    if (words.some(w => !mains.get(w))) return false; // на какое-то слово статьи ещё нет — не нам решать за человека
    return new Set(words.map(w => mains.get(w))).size === 1;
  } catch (e) { return false; }
}
// Часть речи, род и короткое значение для найденного без модели: английский Викисловарь + русский
async function enrichRuItems(items) {
  await Promise.all(items.map(async i => {
    if (i.partOfSpeech && i.shortDefinition) return;
    try {
      const fd = await fetchFreeDictionary(i.italian);
      const m = fd ? mapFreeDictionary(fd, { light: true }) : null;
      if (m && !m.lemma && !m.lemmas) { i.partOfSpeech = i.partOfSpeech || m.partOfSpeech || ''; i.gender = i.gender || m.gender || null; if (!i.shortDefinition) i.shortDefinition = (m.english && m.english.main) || ''; }
      if (!i.shortDefinition || /^[a-z ,;()-]+$/i.test(i.shortDefinition)) { const ru = await fetchRuWiktionary(i.italian).catch(() => null); if (ru && ru.main) i.shortDefinition = ru.main; }
    } catch (e) {}
    i.partOfSpeech = i.partOfSpeech || ''; i.shortDefinition = i.shortDefinition || '';
  }));
  return items;
}

// ── Поиск грамматического правила ────────────────────────────────────────────
const GRAMMAR_SUGGESTIONS = [
  'articoli', 'pronomi personali', 'pronomi relativi', 'congiuntivo',
  'condizionale', 'passato prossimo', 'imperfetto', 'futuro',
  'imperativo', 'aggettivi', 'preposizioni', 'verbi modali',
  'discorso indiretto', 'gerundio', 'participio', 'verbi riflessivi'
];

// Одна статья лежит в базе под несколькими ключами: под заголовком от модели и под тем,
// что было в запросе. Отметку о проверке надо ставить всем, иначе справочник и статья разойдутся.
let _gramKeys = [];
const grammarKeys = (topic, title) => [...new Set([topic, title].filter(Boolean).map(s => String(s).toLowerCase()))];

async function lookupGrammar(topic, opts = {}) {
  if (!topic.trim()) return;
  showState('loading');
  // Тема из справочника генерируется промптом своего типа: у таблицы форм и у правила
  // про апостроф разные требования. Свободный запрос идёт по общему промпту ниже.
  const canon = window.Grammatica ? Grammatica.topicByName(topic) : null;
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
    { "wrong": "Volevo che tu parlerebbe con lui.", "right": "Volevo che tu parlassi con lui.", "explain": "После volevo che идёт congiuntivo, а не condizionale." }
  ],
  "relatedTopics": ["связанная тема 1", "связанная тема 2", "связанная тема 3"]
}

Правила:
- rules: 3-6 пунктов
- table: если есть что показать в таблице (формы, окончания, местоимения и т.д.) — обязательно заполни; если нет смысла — пустой объект {}
- examples: 3-6 примеров. Если примеры логически связаны парами (например, с существительным и с местоимением), используй поле "pair": для второго примера пары укажи "pair": "prev", для первого "pair": null. Не все примеры должны быть парными.
- errors: 2-4 типичные ошибки русскоязычных. wrong и right — целые короткие предложения, отличающиеся ровно в одном месте: отдельная словоформа вне фразы ни правильна, ни неправильна. Неправильный вариант должен быть тем, что человек реально может написать. Не бери ошибку, которой не видно на письме.
- Если тема не относится к итальянской грамматике — верни { "error": "not_grammar" }`;

  const cachedGram = opts.force ? null : await sbGetTopic('grammar', topic.toLowerCase());
  if (cachedGram) {
    _gramKeys = canon ? [...new Set([canon.slug, canon.it.toLowerCase()])] : grammarKeys(topic, cachedGram.title);
    renderGrammar(cachedGram); showState('grammar'); showCacheBadge(); addToHistory(cachedGram.title || topic, 'grammar'); return;
  }

  try {
    const g = await callGemini(canon ? Grammatica.promptFor(canon) : prompt);
    if (g.error === 'not_grammar') {
      $('errorText').textContent = `"${topic}" — попробуйте другую грамматическую тему`;
      showState('error'); return;
    }
    // Всё, что породила модель, это черновик. «Проверено» ставится отдельно и осознанно,
    // иначе свежая статья выглядит в справочнике как законченная.
    if (!g.status) g.status = 'draft';
    if (canon) {
      // Каноническая тема сама задаёт заголовок, раздел, тип и смежные темы:
      // модель ошибается в разделе, а придуманные ею смежные темы ведут в никуда
      g.title = canon.it; g.titleRu = canon.ru; g.slug = canon.slug; g.type = canon.type;
      g.category = Grammatica.sectionRu(canon) || g.category;
      g.relatedTopics = Grammatica.relatedFor(canon);
    }
    // Ключи: для темы справочника это slug и её итальянское название, для свободного
    // запроса — заголовок от модели и сама строка запроса
    const keys = canon ? [canon.slug, canon.it.toLowerCase()] : grammarKeys(topic, g.title);
    _gramKeys = [...new Set(keys)];
    for (const k of _gramKeys) await sbSave('grammar', 'topic', k, g);
    renderGrammar(g);
    showState('grammar');
    addToHistory(g.title || topic, 'grammar');
    if (window.Grammatica) Grammatica.refresh(); // в справочнике тема должна сразу отметиться готовой
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
    ${grammarStatusHtml(g)}
  `;
  card.appendChild(hero);

  // Блоки собираем в словарь, а порядок и заголовки берём по типу статьи (см. GRAM_LAYOUT):
  // в теме про формы первой должна идти таблица, а в теме про выбор — пары примеров
  const parts = {};
  const L = GRAM_LAYOUT[g.type] || {};
  const secTitle = k => (L.titles && L.titles[k]) || GRAM_TITLES_DEFAULT[k];

  // Explanation
  if (g.explanation) {
    const sec = makeSec(secTitle('explanation'));
    const p = document.createElement('div');
    p.className = 'grammar-explanation';
    p.innerHTML = parseInline(g.explanation);
    sec.appendChild(p);
    parts.explanation = sec;
  }

  // Rules
  if (g.rules && g.rules.length > 0) {
    const sec = makeSec(secTitle('rules'));
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
    parts.rules = sec;
  }

  // Table
  if (g.table && g.table.headers && g.table.headers.length > 0) {
    const sec = makeSec(secTitle('table'));
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
    parts.table = sec;
  }

  // Examples
  if (g.examples && g.examples.length > 0) {
    const sec = makeSec(secTitle('examples'));
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
    parts.examples = sec;
  }

  // Errors
  if (g.errors && g.errors.length > 0) {
    const sec = makeSec(secTitle('errors'));
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
    parts.errors = sec;
  }

  (L.order || GRAM_ORDER_DEFAULT).forEach(k => { if (parts[k]) card.appendChild(parts[k]); });

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
        <div class="ru-word-meta">${[item.partOfSpeech, item.gender, item.shortDefinition].filter(Boolean).join(' · ')}${item.register && item.register !== 'neutro' ? ' · <em>' + item.register + '</em>' : ''}${item.source === 'кэш' ? ' · <em>уже открывали</em>' : item.source === 'словарь' ? ' · <em>Викисловарь</em>' : ''}</div>
      </div>
      <div class="ru-word-arrow">→</div>
    `;
    card.onclick = () => {
      // Переключаем язык без setLang: тот сбрасывает состояние на initial и кладёт лишний шаг в историю «Назад»
      currentLang = 'it';
      $('btnIT').classList.add('active'); $('btnRU').classList.remove('active');
      $('searchInput').placeholder = 'Cerca una parola italiana…';
      $('searchInput').value = item.italian;
      // Человек уже выбрал слово в списке — открываем статью, а не спрашиваем ещё раз
      lookupWord(item.italian);
    };
    container.appendChild(card);
  });
}

// ── Рендер словарной статьи ───────────────────────────────────────────────────
function highlightStress(phonetic) {
  return (phonetic || '').replace(/ˈ([^ˌ\s.]+)/g, (m, syl) => `ˈ<span class="stress">${syl}</span>`);
}

// Ссылки в строке под заголовком статьи («другие переводы») ведут в свою статью
document.addEventListener('click', e => {
  const b = e.target.closest('#wordAlso button[data-w]');
  if (!b) return;
  $('searchInput').value = b.dataset.w;
  lookupWord(b.dataset.w);
});

function renderEntry(e) {
  // Повторный рендер того же слова (дозагрузка перевода/определений) не должен сбрасывать спряжения
  const sameWord = currentDictWord === (e.word || '').toLowerCase() && currentConjugations === e.conjugations;
  currentDictEntry = e;
  currentDictWord = (e.word || '').toLowerCase();
  checkIfStarred('dict', (e.word || '').toLowerCase());
  if (!e._pending && !e.unverified && window.Auth) Auth.logView((e.word || '').toLowerCase()); // для личной карты слов
    $('wordTitle').textContent = e.word;
  $('wordPhonetic').innerHTML = highlightStress(e.phonetic);
  $('wordPhonetic').classList.toggle('approx', !!e.phoneticApprox);
  $('wordPhonetic').title = e.phoneticApprox ? 'Приблизительно, по правилам чтения: в словарях транскрипции нет. Без знака ударения, если оно не очевидно' : '';
  $('wordType').textContent = cleanPos(e.partOfSpeech) || '—';
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
  // У выражения вместо рода — регистр
  const genderEl = $('wordGender');
  if (e.isPhrase) genderEl.textContent = e.register && e.register !== 'neutro' ? e.register : '';
  else if (e.gender) genderEl.textContent = e.gender;
  // Вспомогательный глагол: подпись капителью, сам глагол — акцентом, чтобы строка не читалась как часть слова
  else if (e.isVerb && e.auxiliary) genderEl.innerHTML = `<span class="word-aux-label">ausiliare</span><span class="word-aux">${escapeHtml(e.auxiliary)}</span>`;
  else genderEl.textContent = '';
  const alsoEl = $('wordAlso');
  // Под словом: формы других слов (ссылки на их статьи) и омографы (ссылка вниз, к разделу «Altre voci»)
  const POS_RU = { sostantivo: 'существительное', verbo: 'глагол', aggettivo: 'прилагательное', avverbio: 'наречие', preposizione: 'предлог', congiunzione: 'союз', pronome: 'местоимение', interiezione: 'междометие', articolo: 'артикль', numerale: 'числительное', locuzione: 'выражение' };
  const alsoParts = [];
  if (e.alsoForms && e.alsoForms.length) {
    alsoParts.push('также форма слова: ' + e.alsoForms.map(l => {
      const safe = l.lemma.replace(/'/g, "\\'");
      return `<button type="button" title="${l.desc}" onclick="$('searchInput').value='${safe}'; lookupWord('${safe}')">${l.lemma}</button>`;
    }).join(', '));
  }
  (e.homographs || []).forEach(h => {
    const label = POS_RU[(h.partOfSpeech || '').split(' ')[0]] || h.partOfSpeech || 'другое слово';
    const gloss = h.russian ? h.russian.split(';')[0].trim() : (h.glosses && h.glosses[0]) || '';
    alsoParts.push(`также ${escapeHtml(label)}: <button type="button" title="К разделу «Altre voci»" onclick="$('homographsSection').scrollIntoView({behavior:'smooth',block:'center'})">${escapeHtml(gloss)} ↓</button>`);
  });
  // Пришли сюда прыжком из русского поиска: остальные варианты перевода не теряем. Слово держим
  // в data-атрибуте, а не в onclick: у «po’» и «l’azienda» апостроф внутри строки всё бы сломал.
  if (_ruOthers && _ruOthers.word === String(e.word || '').toLowerCase() && _ruOthers.items.length) {
    alsoParts.push(`другие переводы «${escapeHtml(_ruOthers.q)}»: ` + _ruOthers.items
      .map(i => `<button type="button" data-w="${escapeHtml(i.italian)}" title="${escapeHtml(i.shortDefinition || '')}">${escapeHtml(i.italian)}</button>`)
      .join(', '));
  }
  if (alsoParts.length) { alsoEl.innerHTML = alsoParts.join(' · '); alsoEl.style.display = 'block'; }
  else alsoEl.style.display = 'none';
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
  renderSourceLine(e);

  // Омографы: другие слова того же написания — своя часть речи, род, транскрипция, перевод и определения
  const hs = $('homographsSection'), hc = $('homographsContainer');
  if (hs && hc) {
    const list = e.homographs || [];
    const adminVoices = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
    if (list.length) {
      hc.innerHTML = list.map((h, i) => {
        const ms = h.meanings && h.meanings.length ? h.meanings : (h.glosses || []).map((g, i) => ({ definition: g, example: i === 0 ? h.example : '' }));
        return `<div class="homograph">
          <div class="homograph-head">
            <span class="word-type-badge">${escapeHtml(cleanPos(h.partOfSpeech))}</span>
            ${h.gender ? `<span class="homograph-gender">${escapeHtml(h.gender)}</span>` : ''}
            ${h.label ? `<span class="usage-tag">${escapeHtml(h.label)}</span>` : ''}
            ${h.phonetic ? `<span class="homograph-ipa">${highlightStress(escapeHtml(h.phonetic))}</span>` : ''}
            ${adminVoices ? `<span class="homograph-admin"><button class="usage-edit" onclick="editVoice(${i})">править</button><button class="usage-edit" onclick="deleteVoice(${i})">удалить</button></span>` : ''}
          </div>
          ${h.russian ? `<div class="homograph-ru">${escapeHtml(h.russian)}</div>` : ''}
          ${ms.map(m => `<div class="definition-text">${defHtml(m)}</div>${m.example ? `<div class="example-text">${makeClickable(m.example)}</div>` : ''}`).join('')}
        </div>`;
      }).join('');
      hs.style.display = '';
    } else { hc.innerHTML = ''; hs.style.display = adminVoices ? '' : 'none'; }
    // Панель владельца: добавить статью того же написания или перегенерировать весь раздел
    const ha = $('homographsAdmin');
    if (ha) {
      ha.style.display = adminVoices ? 'flex' : 'none';
      ha.innerHTML = adminVoices
        ? `<button class="cards-btn" onclick="addVoice()">${svgIcon('plus')} добавить</button>
           <button class="cards-btn" onclick="regenVoices()">${svgIcon('refresh')} сгенерировать заново</button>
           ${list.length ? '' : '<span class="homograph-hint">других значений этого написания пока нет</span>'}` : '';
    }
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
        <div class="definition-text">${m.definition ? defHtml(m) : '—'}</div>
        ${m.example ? `<div class="example-text">${makeClickable(m.example)}</div>` : ''}`;
    } else {
      // Несколько значений — с нумерацией
      mc.innerHTML = `<div class="meanings-list">${e.meanings.map((m, i) => `
        <div class="meaning-item">
          <div class="meaning-num">${i + 1}</div>
          <div class="meaning-body">
            <div class="meaning-definition">${defHtml(m)}</div>
            ${m.example ? `<div class="meaning-example">${makeClickable(m.example)}</div>` : ''}
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
      ${e.example ? `<div class="example-text">${makeClickable(e.example)}</div>` : ''}`;
  }

  // Related words
  const relSec = $('relatedWordsSection');
  const relList = $('relatedWordsList');
  const relLinks = Array.isArray(e.links) ? e.links.filter(l => l && l.word) : [];
  relList.innerHTML = '';
  // Викисловарь знает вид связи, модель — нет. Что знаем, то и подписываем: иначе рядом с «buono»
  // у «bello» стоят «grande, grosso, forte» и читаются как ошибка, хотя это синонимы значения «изрядный»
  const known = new Set(relLinks.map(l => String(l.word).toLowerCase()));
  const rest = (e.relatedWords || []).filter(w => w && !known.has(String(w).toLowerCase()));
  [
    ['Sinonimi', relLinks.filter(l => l.kind === 'sin').map(l => l.word)],
    ['Contrari', relLinks.filter(l => l.kind === 'ant').map(l => l.word)],
    [relLinks.length ? 'Vicine' : '', rest]
  ].forEach(([label, words]) => { if (words.length) relList.appendChild(relatedRow(label, words)); });
  const hadRelated = !!relList.children.length;
  relSec.className = 'related-words-section' + (e.isVerb ? ' has-conj' : '');
  relSec.style.display = hadRelated ? 'block' : 'none';
  if (hadRelated) applyRelatedView(e); else destroyRelatedGraph();
  // Похожие по написанию считаются на лету по списку слов словаря, поэтому дорисовываются, когда
  // ответит база. Если за это время открыли другую статью — чужой экран не трогаем.
  similarWords(e).then(sim => {
    if (!sim.length || currentDictWord !== String(e.word || '').toLowerCase()) return;
    relList.appendChild(relatedRow('Non confondere', sim));
    relSec.style.display = 'block';
    if (!hadRelated) applyRelatedView(e);
  });

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

// ── Раскладка статьи по типу темы ────────────────────────────────────────────
// Тип меняет не только промпт, но и саму страницу: в теме про формы человек пришёл за
// таблицей, и она должна стоять первой, а в теме про выбор главное — пары примеров.
const GRAM_TITLES_DEFAULT = { explanation: 'Объяснение', rules: 'Правила', table: 'Таблица форм', examples: 'Примеры', errors: 'Типичные ошибки' };
const GRAM_ORDER_DEFAULT = ['explanation', 'rules', 'table', 'examples', 'errors'];
const GRAM_LAYOUT = {
  paradigma:   { order: ['table', 'rules', 'explanation', 'examples', 'errors'],
                 titles: { table: 'Формы', rules: 'Как образуется', explanation: 'Зачем это время' } },
  classe:      { order: ['table', 'rules', 'explanation', 'examples', 'errors'],
                 titles: { table: 'Полный набор', rules: 'Как ведёт себя в предложении' } },
  scelta:      { order: ['explanation', 'rules', 'examples', 'table', 'errors'],
                 titles: { explanation: 'В чём разница', rules: 'Как выбрать', examples: 'Пары для сравнения', table: 'Коротко' } },
  parola:      { order: ['explanation', 'rules', 'table', 'examples', 'errors'],
                 titles: { explanation: 'Что заменяет', rules: 'Значения', table: 'Значения коротко' } },
  costruzione: { order: ['explanation', 'rules', 'examples', 'table', 'errors'],
                 titles: { explanation: 'Как устроена', rules: 'Из чего состоит', examples: 'Превращения', table: 'Формы конструкции' } },
  ortografia:  { order: ['rules', 'table', 'explanation', 'examples', 'errors'],
                 titles: { rules: 'Правило', table: 'Пары для сравнения', explanation: 'Почему так' } },
  uso:         { order: ['explanation', 'rules', 'examples', 'table', 'errors'],
                 titles: { rules: 'Когда так говорят', table: 'Случаи коротко' } }
};

// ── Состояние статьи: черновик, проверено моделью, вычитано ──────────────────
// Статус хранится в самой статье, а не выводится из наличия строки в базе:
// иначе только что сгенерированная статья выглядит в справочнике законченной.
const GRAM_STATUS_RU = { draft: 'черновик', checked: 'проверено моделью', verified: 'вычитано' };
function grammarStatusHtml(g) {
  const st = GRAM_STATUS_RU[g.status] ? g.status : 'draft';
  const admin = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  const btn = st === 'verified'
    ? `<button class="gram-status-btn" onclick="setGrammarStatus('draft')">снять отметку</button>`
    : `<button class="gram-status-btn" onclick="setGrammarStatus('verified')">отметить вычитанной</button>`;
  return `<div class="gram-status-row"><span class="gram-status s-${st}">${GRAM_STATUS_RU[st]}</span>${admin ? btn : ''}</div>`;
}
async function setGrammarStatus(status) {
  if (!(window.Auth && Auth.isAdmin && Auth.isAdmin()) || !currentGramEntry) return;
  const g = currentGramEntry, prev = g.status;
  g.status = status;
  const keys = _gramKeys.length ? _gramKeys : grammarKeys(currentGramTopic, g.title);
  const saved = await Promise.all(keys.map(k => sbSave('grammar', 'topic', k, g)));
  if (saved.some(Boolean)) {
    showToast(status === 'verified' ? '✓ Отмечено вычитанным' : 'Отметка снята');
    renderGrammar(g);
    if (window.Grammatica) Grammatica.refresh();
  } else { g.status = prev; showToast('⚠ Не удалось сохранить отметку'); }
}

// ── Строка источника и статуса под статьёй ───────────────────────────────────
// Откуда структура, кто писал текст, кто проверял и что нашёл. Читателю — коротко,
// владельцу — ещё и сами замечания проверки.
function renderSourceLine(e) {
  const srcEl = $('entrySource'); if (!srcEl) return;
  const parts = [];
  if (e.source === 'wiktionary') {
    const href = e.sourceUrl || `https://en.wiktionary.org/wiki/${encodeURIComponent(e.word || '')}`;
    parts.push(`Fonte: <a href="${href}" target="_blank" rel="noopener">Wiktionary</a> · CC BY-SA 4.0${e.llm ? ` · definizioni: ${escapeHtml(e.llm)}` : ''}`);
  } else if (e.unverified) {
    parts.push('В Викисловаре этого слова нет: статья составлена моделью и может быть неточной или выдуманной');
  } else if (e.llm) {
    parts.push(`definizioni: ${escapeHtml(e.llm)}`);
  }
  const admin = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  const by = e.sources && e.sources.check ? ` (${escapeHtml(e.sources.check)})` : '';
  // «Проверено ✓» видят все: это знак, что статью сверяли с Викисловарём. Расхождения — нет.
  // Читателю с ними делать нечего, статью он починить не может, а плашка и внутренние
  // формулировки проверяющей модели в title только подрывают доверие к тому, что на экране.
  if (e.status === 'checked') parts.push(`<span class="src-ok">проверено${by} ✓</span>${admin && (e.checkWarnings || []).length ? `<ul class="src-notes">${e.checkWarnings.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}`);
  else if (admin && e.status === 'flagged') parts.push(`<span class="src-warn" title="${escapeHtml((e.checkNotes || []).join('\n'))}">⚠ проверка нашла расхождения${by}</span>${(e.checkNotes || []).length ? `<ul class="src-notes">${e.checkNotes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}`);
  else if (admin && e.pipeline === 2) parts.push('<span class="src-muted">не проверено</span>');
  else if (admin && !e._pending) parts.push('<span class="src-muted">старый конвейер</span>');
  srcEl.innerHTML = parts.join(' · ');
  srcEl.style.display = parts.length ? 'block' : 'none';
}

// ── Altre voci: правка раздела владельцем ────────────────────────────────────
// Другие слова того же написания приходят из Викисловаря или от модели и нередко бывают
// кривыми: устаревшее без пометки, современное значение отсутствует. Владелец правит руками.
const usageTag = l => l ? `<span class="usage-tag">${escapeHtml(l)}</span>` : '';
// «(letterario) uso elevato» — помета уже стоит плашкой, из текста её убираем, чтобы не двоилось.
// Скобку трогаем, только если всё в ней — известные пометы: «(di un animale)» должно остаться.
function stripUsagePrefix(def) {
  const s = String(def || '');
  const m = s.match(/^\s*\(([^)]*)\)\s*/);
  if (!m) return s;
  const parts = m[1].split(/[,;]/).map(p => p.trim().toLowerCase()).filter(Boolean);
  return parts.length && parts.every(p => USAGE_RU[p]) ? s.slice(m[0].length) : s;
}
// Толкование с пометой: у статей из кэша пометы в поле нет, но скобка в тексте есть — берём оттуда
const defHtml = m => usageTag(m.label || usageLabel([], m.definition)) + makeClickable(stripUsagePrefix(m.definition));
const USAGE_CHOICES = ['', ...new Set(Object.values(USAGE_RU))];

async function saveCurrentEntry() {
  const e = currentDictEntry; if (!e) return false;
  const key = String(e.word || currentDictWord || '').toLowerCase();
  const q = String(currentDictWord || '').toLowerCase();
  const keys = [...new Set([key, q].filter(Boolean))];
  const ok = await Promise.all(keys.map(k => sbSave('dictionary', 'word', k, e)));
  return ok.some(Boolean);
}

function voiceModal() {
  let m = $('voiceModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'voiceModal'; m.className = 'cards-modal'; m.style.display = 'none';
    m.addEventListener('click', ev => { if (ev.target === m) closeVoice(); });
    m.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.stopPropagation(); closeVoice(); } });
    document.body.appendChild(m);
  }
  return m;
}
const closeVoice = () => { const m = $('voiceModal'); if (m) m.style.display = 'none'; };

function editVoice(i) {
  const e = currentDictEntry; if (!e) return;
  const h = (e.homographs || [])[i] || { partOfSpeech: '', gender: '', phonetic: '', label: '', russian: '', meanings: [] };
  const ms = (h.meanings && h.meanings.length ? h.meanings : (h.glosses || []).map(g => ({ definition: g, example: '' })));
  const lines = ms.map(m => [m.definition || '', m.example || ''].filter(Boolean).join(' | ')).join('\n');
  const m = voiceModal(); m.style.display = 'flex';
  m.innerHTML = `
    <div class="cards-modal-box">
      <div class="cards-title small">${i === -1 ? 'Новая статья того же написания' : 'Править статью'}</div>
      <label class="cards-field"><span>Часть речи</span><input id="voice_pos" value="${escapeHtml(h.partOfSpeech || '')}" placeholder="sostantivo, verbo, aggettivo…"></label>
      <label class="cards-field"><span>Род</span><input id="voice_gender" value="${escapeHtml(h.gender || '')}" placeholder="m. / f. / пусто"></label>
      <label class="cards-field"><span>Транскрипция</span><input id="voice_ipa" value="${escapeHtml(h.phonetic || '')}" placeholder="/ˈsito/"></label>
      <label class="cards-field"><span>Помета</span><select id="voice_label">${
        // Составная пометка («диал. · редк.») в списке не значится — добавляем как есть, иначе она пропадёт при сохранении
        (USAGE_CHOICES.includes(h.label || '') ? USAGE_CHOICES : [...USAGE_CHOICES, h.label])
          .map(v => `<option value="${escapeHtml(v)}" ${v === (h.label || '') ? 'selected' : ''}>${escapeHtml(v) || 'без пометы'}</option>`).join('')
      }</select></label>
      <label class="cards-field"><span>Перевод</span><input id="voice_ru" value="${escapeHtml(h.russian || '')}" placeholder="основной; варианты через ;"></label>
      <label class="cards-field"><span>Значения, по одному в строке: определение | пример</span><textarea id="voice_ms" rows="5">${escapeHtml(lines)}</textarea></label>
      <div class="cards-actions"><button class="cards-btn primary" onclick="saveVoice(${i})">Сохранить</button><button class="cards-btn" onclick="closeVoice()">Отмена</button></div>
    </div>`;
  const first = $('voice_pos'); if (first && !isTouchDevice()) first.focus();
}
const addVoice = () => editVoice(-1);

async function saveVoice(i) {
  const e = currentDictEntry; if (!e) return;
  const meanings = $('voice_ms').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [definition, example] = l.split('|');
    return { definition: (definition || '').trim(), example: (example || '').trim(), label: '' };
  }).filter(m => m.definition);
  const voice = {
    partOfSpeech: $('voice_pos').value.trim(), gender: $('voice_gender').value.trim(),
    phonetic: $('voice_ipa').value.trim(), label: $('voice_label').value,
    russian: $('voice_ru').value.trim(), meanings, glosses: [], example: ''
  };
  if (!voice.partOfSpeech && !voice.russian && !meanings.length) { showToast('Пустая статья, нечего сохранять'); return; }
  e.homographs = e.homographs || [];
  if (i === -1) e.homographs.push(voice); else e.homographs[i] = voice;
  closeVoice(); renderEntry(e);
  showToast(await saveCurrentEntry() ? '✓ Сохранено' : '⚠ Не сохранилось в общей базе');
}

async function deleteVoice(i) {
  const e = currentDictEntry; if (!e || !(e.homographs || [])[i]) return;
  const h = e.homographs[i];
  if (!confirm(`Удалить «${h.partOfSpeech || ''} ${h.russian || (h.glosses || [])[0] || ''}» из Altre voci?`)) return;
  e.homographs.splice(i, 1);
  renderEntry(e);
  showToast(await saveCurrentEntry() ? '✓ Удалено' : '⚠ Не сохранилось в общей базе');
}

// Перегенерация раздела: спрашиваем у модели именно другие слова того же написания
async function regenVoices() {
  const e = currentDictEntry; if (!e) return;
  const word = e.word || currentDictWord;
  showToast('Ищу другие значения…');
  const prompt = `You are an expert Italian lexicographer. The Italian word "${word}" is already documented as: ${e.partOfSpeech || ''} — ${(e.meanings || []).map(m => m.definition).join('; ') || '—'}.
List OTHER Italian words spelled exactly "${word}" that are separate dictionary entries (homographs): a different part of speech, a different etymology, or a distinctly different word. Do not repeat the sense(s) above and do not list inflected forms of other words.
Return ONLY valid JSON, no markdown:
{ "voices": [ { "partOfSpeech": "exactly one of: sostantivo, verbo, aggettivo, avverbio, pronome, congiunzione, interiezione", "gender": "m. / f. / empty", "phonetic": "IPA in slashes or empty", "label": "usage label or empty string", "russian": "Russian translation; alternatives after ;", "meanings": [ { "definition": "Definition in Italian (1 sentence)", "example": "Natural Italian example", "label": "usage label or empty string" } ] } ] }
label: one of [obsolete, archaic, dialectal, regional, vulgar, offensive, slang, colloquial, rare, literary, poetic, formal, figurative, humorous, technical, medicine, law, nautical, botany, zoology, military] or empty. Mark obsolete, dialectal and rare entries honestly.
If there are no such homographs, return { "voices": [] }.`;
  try {
    const raw = await llmJson(prompt, 'dict');
    const voices = (Array.isArray(raw && raw.voices) ? raw.voices : []).map(v => ({
      partOfSpeech: cleanPos(v.partOfSpeech), gender: String(v.gender || '').trim(),
      phonetic: String(v.phonetic || '').trim(), label: usageLabel([v.label], ''),
      russian: String(v.russian || '').trim(), glosses: [], example: '',
      meanings: (Array.isArray(v.meanings) ? v.meanings : []).filter(m => m && m.definition)
        .map(m => ({ definition: m.definition, example: m.example || '', label: usageLabel([m.label], '') }))
    })).filter(v => v.partOfSpeech || v.meanings.length);
    e.homographs = voices;
    renderEntry(e);
    showToast(voices.length ? (await saveCurrentEntry() ? `✓ ${voices.length} · сохранено` : '⚠ Не сохранилось') : 'Других значений не нашлось');
  } catch (err) { showToast('⚠ ' + (err.message || 'не получилось')); }
}

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
// Прыгнули из русского поиска прямо в статью — остальные варианты перевода показываем строкой
// под заголовком, чтобы выбор не пропал вместе со списком
let _ruOthers = null;
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
  onHoverEnd: () => scheduleHidePreview() // с задержкой: курсору нужно время дойти до подсказки через холст
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
  const word = (e.word || '').toLowerCase();
  _relatedGraphKey = word + '|' + (e.relatedWords || []).join(',');
  // Граф не пересоздаём при смене колец или слова: узлы остаются на местах, а вид не улетает в угол
  if (_relatedGraph) _relatedGraph.setLoading('Загрузка…');
  else _relatedGraph = WordGraph.create($('relatedGraph'), {
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
  // «Вся база» — вид для владельца: карта всех статей ни на один вопрос читателя не отвечает
  // и перестаёт читаться, как только словарь вырастает. Читателю — его собственные слова.
  const admin = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  box.innerHTML = `<div class="graph-screen-head"><div class="cards-title">Карта слов</div><div class="cards-head-deck" id="mapSub">слова, которые вы открывали</div></div><div id="mapGraphBox"></div>`;
  _mapGraph = WordGraph.create($('mapGraphBox'), {
    height: window.innerWidth < 640 ? '65vh' : '70vh', neighborsToggle: true, neighbors: false, wordLinksToggle: true, wordLinks: false,
    onNeighbors: v => { _mapNeighbors = v; loadWordMap(); }, onWordLinks: v => { _mapLinks = v; loadWordMap(); },
    extraButtons: admin ? '<button class="wg-toggle wg-all" title="Все статьи в общей базе — вид для владельца">вся база</button>' : '',
    hint: 'Крупные узлы — темы и ваши теги, вокруг них ваши слова. Слова из колод обведены тёмным, из избранного — золотым, полые — те, что вам ещё не встречались. Клик по теме подсвечивает её слова, клик по слову открывает статью.',
    ...graphHandlers()
  });
  const all = $('mapGraphBox').querySelector('.wg-all');
  if (all) all.addEventListener('click', () => { _mapShowAll = all.classList.toggle('on'); loadWordMap(); });
  _mapNeighbors = false; _mapShowAll = false;
  loadWordMap();
}
let _mapNeighbors = false, _mapShowAll = false, _mapLinks = false, _myMapInfos = null, _mapTotal = 0;

// Кто на карте: свои открытые слова. У вошедшего их считает база одним запросом (my_map_words),
// у гостя они берутся из локальной истории просмотров. Раньше сюда приезжал весь словарь, из
// которого 95% тут же выбрасывалось, — при росте базы это мегабайты ради сотни своих слов.
async function mapPopulation() {
  if (_mapShowAll) {
    if (!_mapInfos) { const r = await WordGraph.loadAllWords(); _mapInfos = r.infos; _mapTotal = r.total; }
    return _mapInfos;
  }
  if (window.Auth && Auth.user()) {
    if (!_myMapInfos) {
      try { _myMapInfos = await WordGraph.loadMyWords(); }
      catch (e) {
        // Функции my_map_words ещё нет — SQL из настроек не прогнан. Идём прежним путём, через весь
        // словарь: медленно, зато карта не пустая до тех пор, пока владелец не выполнит скрипт.
        console.warn('my_map_words:', e.message);
        if (!_mapInfos) { const r = await WordGraph.loadAllWords(); _mapInfos = r.infos; _mapTotal = r.total; }
        const mine = await Auth.myWords();
        if (!mine) return _mapInfos;
        _myMapInfos = new Map();
        _mapInfos.forEach((info, id) => { if (mine.has(id)) _myMapInfos.set(id, info); });
      }
    }
    return _myMapInfos;
  }
  const ids = [...new Set(getHistory().filter(i => i.mode === 'dict').map(i => String(i.word || '').toLowerCase()).filter(Boolean))];
  return ids.length ? WordGraph.fetchWords(ids) : new Map();
}

async function loadWordMap() {
  const g = _mapGraph; if (!g) return;
  try {
    const infos = await mapPopulation();
    // Своё видно сразу: слово из колоды обводится тёмным, из избранного — золотым
    const deck = new Set(window.Cards && Cards.allWords ? Cards.allWords() : []);
    const fav = new Set((typeof cachedFavRows !== 'undefined' && cachedFavRows || []).map(r => String(r.word || '').toLowerCase()));
    const mineOf = id => deck.has(id) ? 'deck' : fav.has(id) ? 'fav' : '';
    const data = WordGraph.buildGraph(infos, { neighbors: _mapNeighbors && _mapLinks, wordLinks: _mapLinks, tagsOf: tagsOfInfo, mineOf });
    if (window.Auth) Auth.applyTagsToNodes(data.nodes);
    const sub = $('mapSub');
    if (sub) sub.textContent = _mapShowAll
      ? (_mapTotal > infos.size ? `вся база · показаны ${infos.size} из ${_mapTotal}` : `вся база · ${infos.size}`)
      : `слова, которые вы открывали · ${infos.size}`;
    if (g === _mapGraph) {
      g.setData(data.nodes, data.edges);
      if (!data.nodes.length) g.setLoading('Пока пусто: откройте несколько слов, и они появятся здесь');
    }
  } catch(err) { if (g === _mapGraph) g.setLoading('Не удалось загрузить: ' + err.message); }
}

// Избранное: список или граф
let favView = 'list', _favGraph = null;
function setFavView(v) {
  favView = v;
  document.querySelectorAll('#favViewToggle .view-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  filterFavList();
}
// Теги слова для узлов-тем на графах: личные теги, а без них — тема статьи
function tagsOfInfo(info) {
  const own = window.Auth && Auth.ownTags ? Auth.ownTags(info.id) : null;
  if (own && own.length) return own;
  return info.cat && info.cat !== '?' ? [info.cat] : [];
}
function renderFavGraph(rows) {
  const list = $('favList');
  if (_favGraph) { _favGraph.destroy(); _favGraph = null; }
  list.innerHTML = '<div id="favGraphBox"></div>';
  let neighbors = false, links = false;
  const build = () => { const data = WordGraph.buildFromEntries(rows.map(r => r.data), { neighbors: neighbors && links, wordLinks: links, tagsOf: tagsOfInfo }); if (window.Auth) Auth.applyTagsToNodes(data.nodes); _favGraph.setData(data.nodes, data.edges); };
  _favGraph = WordGraph.create($('favGraphBox'), {
    height: window.innerWidth < 640 ? '60vh' : '65vh', neighborsToggle: true, neighbors, wordLinksToggle: true, wordLinks: links,
    onNeighbors: v => { neighbors = v; build(); }, onWordLinks: v => { links = v; build(); },
    hint: 'Избранные слова вокруг своих тем. Клик по теме подсвечивает её слова. «Связи слов» включает связи между словами, соседи — ещё не открытые.',
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

// Недавние слова живут в выпадающем списке под полем поиска: показываются, когда поле в фокусе
// и пустое, как история в адресной строке. На главной они больше места не занимают.
function renderHistory() {
  const sec = $('searchRecent'), input = $('searchInput');
  if (!sec || !input) return;
  const h = getHistory().filter(i => i.mode === (currentMode === 'grammar' ? 'grammar' : 'dict'));
  if (document.activeElement !== input || input.value.trim() || h.length === 0) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  // mousedown с preventDefault: клик по слову не должен снимать фокус с поля раньше, чем сработает
  sec.innerHTML = `
    <div class="history-label">
      <span>Недавние</span>
      <button class="history-clear" onmousedown="event.preventDefault()" onclick="clearHistory()">очистить</button>
    </div>
    <div class="history-chips">
      ${h.map(i => `<button class="history-chip" onmousedown="event.preventDefault()" onclick="historyClick('${i.word.replace(/'/g,"\\'")}','${i.mode}')">${i.word}</button>`).join('')}
    </div>`;
}
let _freq = null, _freqLoading = null, _sugIndex = -1, _sugTimer = 0;
function hideRecent() { const sec = $('searchRecent'); if (sec) sec.style.display = 'none'; _sugIndex = -1; }
// Высота списка — сколько влезает от поля до низа видимой области (на телефоне — до клавиатуры);
// остальное прокручивается внутри списка, а не страницей
function showRecentBox(sec) {
  const wrap = sec.parentElement.getBoundingClientRect();
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const room = vh - wrap.bottom - 16;
  sec.style.maxHeight = Math.max(120, Math.min(room, window.innerWidth < 640 ? 196 : 480)) + 'px';
  sec.style.display = 'block';
}

// ── Подсказки при вводе: свои слова (недавние, колоды, избранное) и частотный список ──
// Список it-words.txt: 30 000 слов по убыванию частоты, грузится один раз при первом вводе.
// Подсказки только для итальянского поиска: в русском ищется перевод, в грамматике — тема.
function loadFreq() {
  if (_freq) return Promise.resolve(_freq);
  return _freqLoading || (_freqLoading = fetch('it-words.txt').then(r => r.text())
    .then(t => { _freq = t.split('\n').filter(l => l && l[0] !== '#'); return _freq; })
    .catch(() => (_freq = [])));
}
// Частотный ранг слова: его номер в it-words.txt, у незнакомого списку — конец списка. Нужен там,
// где выбирать приходится между словами, которые больше нечем различить.
let _freqRank = null;
async function freqRank(word) {
  const list = await loadFreq();
  if (!_freqRank) { _freqRank = new Map(); list.forEach((w, i) => { if (!_freqRank.has(w)) _freqRank.set(w, i); }); }
  const r = _freqRank.get(String(word || '').toLowerCase());
  return r === undefined ? Infinity : r;
}
// Самое частое из нескольких слов; при равном ранге — то, что стояло раньше
async function mostFrequent(items, key = i => i) {
  const ranked = await Promise.all(items.map(async i => [i, await freqRank(key(i))]));
  return ranked.reduce((best, cur) => cur[1] < best[1] ? cur : best)[0];
}
// Частотный список русского: те же 30 000 слов из того же источника. Нужен подсказкам в русском
// поиске и ловле опечаток: на своём языке человек ошибается не в словах, а в пальцах.
let _ruFreq = null, _ruFreqLoading = null, _ruFreqSet = null;
function loadRuFreq() {
  if (_ruFreq) return Promise.resolve(_ruFreq);
  return _ruFreqLoading || (_ruFreqLoading = fetch('ru-words.txt').then(r => r.text())
    .then(t => { _ruFreq = t.split('\n').map(l => l.trim()).filter(l => l && l[0] !== '#'); return _ruFreq; })
    .catch(() => (_ruFreq = [])));
}
// Опечатка: то же слово с одной правкой, самое частое из найденных — список идёт по убыванию
// частоты, поэтому берём первые совпадения. Короткие слова не трогаем: «бой» и «мой» отличаются
// одной буквой, и оба настоящие. Слово, которое есть в списке, опечаткой не считаем вовсе.
async function nearRuWords(q) {
  if (!q || q.length < 5) return [];
  const list = await loadRuFreq();
  if (!_ruFreqSet) _ruFreqSet = new Set(list);
  if (_ruFreqSet.has(q)) return [];
  const out = [];
  for (const w of list) { if (oneEdit(q, w)) { out.push(w); if (out.length >= 2) break; } }
  return out;
}
// «может быть, „сапог“?» под сообщением об ошибке. Показывается после showState: тот стирает
// подсказку на каждом переходе, чтобы она не всплыла над чужой ошибкой
function showErrorSuggest(words) {
  const el = $('errorSuggest'); if (!el) return;
  el.innerHTML = (words || []).length
    ? 'может быть, ' + words.map(w => `<button type="button" onclick="pickSuggest('${w}')">${escapeHtml(w)}</button>`).join(' или ') + '?'
    : '';
}
// «Свои» слова для русского поиска — это переводы из колод. В карточке стоит «дом; жильё», а
// ищут по одному слову, поэтому режем перевод на варианты тем же правилом, что и везде.
function myTranslationsForSuggest() {
  const out = new Map();
  if (window.Cards && Cards.allTranslations) Cards.allTranslations().forEach(t => trVariants(t).forEach(v => {
    const w = v.toLowerCase(); if (w && !out.has(w)) out.set(w, 'в колоде');
  }));
  return out;
}
function myWordsForSuggest() {
  const out = new Map(); // слово → откуда
  getHistory().filter(i => i.mode === 'dict').forEach(i => out.set(i.word.toLowerCase(), 'недавнее'));
  if (window.Cards && Cards.allWords) Cards.allWords().forEach(w => { if (!out.has(w)) out.set(w, 'в колоде'); });
  (typeof cachedFavRows !== 'undefined' && cachedFavRows || []).forEach(r => { const w = String(r.word || '').toLowerCase(); if (w && !out.has(w)) out.set(w, 'избранное'); });
  return out;
}
async function renderSuggest() {
  const inp = $('searchInput'), sec = $('searchRecent');
  const q = inp.value.trim().toLowerCase();
  if (currentMode !== 'dict' || q.length < 2) { hideRecent(); return; }
  // В русском поиске подсказываем так же, как в итальянском, только источники свои: переводы
  // из колод вместо своих слов и русский частотный список вместо итальянского
  const ru = currentLang === 'ru';
  const items = [];
  for (const [w, src] of (ru ? myTranslationsForSuggest() : myWordsForSuggest())) if (w.startsWith(q) && w !== q) items.push({ w, src });
  items.sort((a, b) => a.w.length - b.w.length);
  const freq = await (ru ? loadRuFreq() : loadFreq());
  if (inp.value.trim().toLowerCase() !== q) return; // пока грузили, ввод изменился
  for (const w of freq) { if (items.length >= 40) break; /* потолок только чтобы не рисовать сотни строк на «co» */ if (w.startsWith(q) && w !== q && !items.some(i => i.w === w)) items.push({ w, src: '' }); }
  if (!items.length) { hideRecent(); return; }
  _sugIndex = -1;
  sec.innerHTML = `<div class="suggest-list">${items.slice(0, 40).map(i =>
    `<button class="suggest-item" onmousedown="event.preventDefault()" onclick="pickSuggest('${i.w.replace(/'/g, "\\'")}')"><span><b>${escapeHtml(q)}</b>${escapeHtml(i.w.slice(q.length))}</span>${i.src ? `<span class="suggest-src">${i.src}</span>` : ''}</button>`).join('')}</div>`;
  showRecentBox(sec);
}
function pickSuggest(w) { hideRecent(); const inp = $('searchInput'); inp.value = w; inp.blur(); if (currentLang === 'ru' && currentMode === 'dict') lookupRussian(w); else lookupWord(w); } // blur прячет клавиатуру на телефоне
function onSearchInput() {
  clearTimeout(_sugTimer);
  // В грамматике то же поле фильтрует справочник: второго поля поиска на экране быть не должно
  if (_currentState === 'gramindex' && window.Grammatica) Grammatica.setFilter($('searchInput').value.trim());
  if (!$('searchInput').value.trim()) { renderHistory(); return; }
  _sugTimer = setTimeout(renderSuggest, 80);
}
$('searchInput').addEventListener('focus', onSearchInput);
$('searchInput').addEventListener('click', onSearchInput); // поле уже в фокусе после загрузки — по клику тоже показываем
$('searchInput').addEventListener('input', onSearchInput);
$('searchInput').addEventListener('blur', () => setTimeout(hideRecent, 150));
document.addEventListener('pointerdown', e => { if (!e.target.closest('.search-wrapper')) hideRecent(); }); // тап мимо поля закрывает список
$('searchInput').addEventListener('keydown', e => { if (e.key === 'Escape') hideRecent(); });

function renderInlineHistory(mode) {
  const id = mode === 'dict' ? 'inlineHistoryDict' : 'inlineHistoryGrammar';
  const sec = $(id);
  if (!sec) return;
  const h = getHistory().filter(i => i.mode === mode);
  if (h.length === 0) { sec.style.display = 'none'; return; }
  showRecentBox(sec);
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
  hideRecent();
  $('searchInput').value = word;
  $('searchInput').blur(); // прячем клавиатуру на телефоне
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
  // Из разбора текста уходим в словарь целиком, иначе статья открылась бы под шапкой «La Pratica»
  if (currentMode === 'pratica') { currentMode = 'dict'; applyModeUI('dict'); }
  $('searchInput').value = word;
  lookupWord(word);
}

// ── Клик по заголовку — на главный экран ──────────────────────────────────────
function goHome() {
  // «На главную» значит на главную словаря, из любого раздела и с любого экрана.
  // Раньше из избранного возвращало в тот режим, откуда его открыли, и это читалось как «назад».
  switchMode('dict');
}
function doSearch() {
  const val = $('searchInput').value.trim();
  if (!val) return;
  if (currentMode === 'grammar') lookupGrammar(val);
  else if (currentLang === 'ru') lookupRussian(val);
  else lookupWord(val, 0, { chooser: true }); // руками введённое слово может оказаться и формой другого — предлагаем выбор
}

$('searchBtn').addEventListener('click', doSearch);
// Enter ищет; стрелки ходят по подсказкам, Enter на выделенной берёт её
$('searchInput').addEventListener('keydown', e => {
  const items = [...document.querySelectorAll('#searchRecent .suggest-item')];
  const open = items.length && $('searchRecent').style.display !== 'none';
  if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    _sugIndex = (_sugIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('active', i === _sugIndex));
    return;
  }
  if (e.key === 'Enter') { if (open && _sugIndex >= 0) { items[_sugIndex].click(); return; } hideRecent(); doSearch(); }
});

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
  // Омографы в подсказке одной строкой: «также sostantivo: anchor»
  const homoHtml = d.homographs && d.homographs.length
    ? `<div class="${p}-formof">также ${d.homographs.map(h => `${h.partOfSpeech}${h.russian ? ': ' + h.russian.split(';')[0] : h.glosses && h.glosses[0] ? ': ' + h.glosses[0] : ''}`).join('; ')}</div>` : '';
  return `<div class="${p}-word">${head}</div>
    ${formOfHtml}
    ${d.phonetic ? `<div class="${p}-phonetic">${highlightStressPreview(d.phonetic)}</div>` : ''}
    <div class="${p}-badges">
      ${d.partOfSpeech ? `<span class="${p}-badge">${d.partOfSpeech}</span>` : ''}
      ${d.category ? `<span class="${p}-badge">${d.category}</span>` : ''}
    </div>
    ${alsoHtml}${homoHtml}`;
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
  positionPreview(popup); // высота изменилась — подгоняем к якорю
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
  { const r = await resolveIpa(result.word); result.phonetic = r.ipa; result.phoneticApprox = r.approx; } // IPA модели не доверяем
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
  // Граф передаёт не элемент, а координаты курсора: якорем служит точка под ним
  positionPreview(popup, el ? el.getBoundingClientRect() : { left: x - 8, right: x, top: y - 8, bottom: y + 4 });
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
      positionPreview(popup);
      return;
    }

    // Факты из Викисловаря показываем сразу, русский перевод подтягивается следом
    ensureQuickRussian(q, () => { if (stillMine()) renderPreviewDict(popup, q.data); });
    renderPreviewDict(popup, q.data);
  }, 80);
}

// Подсказка стоит под словом (у нижнего края экрана — над ним) и за курсором не ходит,
// иначе до кнопки «в колоду» внутри неё не довести мышь. Без rect — пересчёт по прежнему якорю.
function positionPreview(popup, rect) {
  if (rect) popup._anchor = rect; else rect = popup._anchor;
  if (!rect) return;
  requestAnimationFrame(() => {
    const pw = popup.offsetWidth || 260, ph = popup.offsetHeight || 120;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = rect.left, top = rect.bottom + 6;
    if (left + pw > vw - 12) left = Math.max(12, vw - pw - 12);
    if (top + ph > vh - 8) top = rect.top - ph - 6;
    if (top < 8) top = 8;
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

// ── Главная: бенто-плитки ─────────────────────────────────────────────────────
// Данные плиток из двух мест: сводка колод (Cards.homeSummary) и число избранных (favorites_dict). Сводка кэшируется и обновляется после ответа на карточке,
// входа и выхода — см. refreshHomeDue. Без входа колод нет, и плитки про них заменяет приглашение.
let _homeSummary = null, _homeFavCount = null;
// Главная рисуется последней строкой этого файла, а auth.js подключён после него: в первом кадре
// window.Auth ещё не существует, и вошедший успевал увидеть вспышку «Войдите». Про вход спрашиваем
// localStorage напрямую — он читается мгновенно, ещё до того, как auth.js разберёт сессию.
function sessionLikely() {
  if (window.Auth) return !!Auth.user();
  try { return !!(JSON.parse(localStorage.getItem('dizionario_session') || 'null') || {}).user; } catch (e) { return false; }
}
function sessionStale() {
  try { const s = JSON.parse(localStorage.getItem('dizionario_session') || 'null'); return !!(s && s.expires_at && s.expires_at < Date.now()); } catch (e) { return false; }
}
// Сводка с прошлого захода: показываем её сразу, пока считается свежая. Иначе первый кадр у вошедшего —
// нули и «Считаю…», хотя числа меняются от силы раз в день.
const HOME_CACHE_KEY = 'dizionario_home';
function loadHomeCache() {
  try {
    const c = JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || 'null');
    if (c && c.s) { _homeSummary = c.s; _homeFavCount = typeof c.f === 'number' ? c.f : null; }
  } catch (e) {}
}
function saveHomeCache() {
  try {
    if (_homeSummary) localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ s: _homeSummary, f: _homeFavCount }));
    else localStorage.removeItem(HOME_CACHE_KEY);
  } catch (e) {}
}
const homePlural = (n, one, few, many) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? one : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? few : many; };
function renderHome() {
  const box = $('homeBento'); if (!box) return;
  const loggedIn = sessionLikely();
  const s = _homeSummary;
  const head = (icon, label) => `<div class="tile-head"><div class="tile-icon">${svgIcon(icon)}</div><span class="tile-label">${label}</span></div>`;
  const tiles = [];
  if (!loggedIn) {
    tiles.push(`<button class="tile w4 h2 link" onclick="Auth.require('Войдите, чтобы учить карточки')">
      ${head('layers', 'Le Carte')}
      <div class="tile-title">Карточки живут в аккаунте</div>
      <div class="tile-sub">Войдите — и здесь будет видно, сколько слов пора повторить, серия дней и колоды</div>
      <div class="tile-foot"><span class="cards-btn primary">Войти или создать аккаунт</span></div>
    </button>`);
  } else if (s) {
    const repeat = s.learn + s.due, total = repeat + s.newToday;
    const parts = [repeat ? `${repeat} к повторению` : '', s.newToday ? `${s.newToday} новых` : ''].filter(Boolean).join(' · ');
    tiles.push(`<div class="tile w4 h2">
      ${head('layers', 'Сегодня')}
      <div class="tile-big">${total}</div>
      <div class="tile-sub">${total ? parts : (s.notes ? 'Всё повторено, новых на сегодня нет' : 'Колоды пока пусты — добавляйте слова из статей')}</div>
      <div class="tile-foot">${total ? `<button class="cards-btn primary" onclick="Cards.studyAll()">Учить · ${total}</button>` : ''}<button class="cards-btn" onclick="switchMode('cards')">Колоды</button></div>
    </div>`);
    tiles.push(`<div class="tile">
      ${head('trending-up', 'Серия')}
      <div class="tile-big">${s.streak}</div>
      <div class="tile-sub">${homePlural(s.streak, 'день', 'дня', 'дней')} подряд · сегодня ${s.todayCount} ${homePlural(s.todayCount, 'повторение', 'повторения', 'повторений')}</div>
    </div>`);
    tiles.push(`<div class="tile">
      ${head('book', 'В колодах')}
      <div class="tile-big">${s.notes}</div>
      <div class="tile-sub">${homePlural(s.notes, 'слово', 'слова', 'слов')} · выучено ${s.learnedPct}%</div>
      <div class="tile-bar"><i style="width:${s.learnedPct}%"></i></div>
    </div>`);
  } else {
    tiles.push(`<div class="tile w4 h2">${head('layers', 'Сегодня')}<div class="tile-sub">Считаю, что пора повторить…</div></div>`);
  }
  // Недавних слов здесь нет: они выпадают под полем поиска, когда оно в фокусе
  tiles.push(`<button class="tile link" onclick="openWordMap()" title="Все открытые слова и связи между ними">
    ${head('graph', 'Карта слов')}
    <div class="tile-title">Граф</div>
    <div class="tile-sub">Открытые слова, темы и связи между ними</div>
  </button>`);
  tiles.push(`<button class="tile link" onclick="openFavorites()">
    ${head('star', 'Preferiti')}
    <div class="tile-big">${loggedIn && _homeFavCount !== null ? _homeFavCount : '—'}</div>
    <div class="tile-sub">${loggedIn ? `${homePlural(_homeFavCount || 0, 'сохранённое слово', 'сохранённых слова', 'сохранённых слов')}` : 'избранные слова и правила'}</div>
  </button>`);
  if (loggedIn && s) tiles.push(`<button class="tile link" onclick="switchMode('cards'); Cards.stats(null)">
    ${head('chart', 'Статистика')}
    <div class="tile-title">Прогресс</div>
    <div class="tile-sub">Календарь, прогноз повторений, ответы</div>
  </button>`);
  box.innerHTML = tiles.join('');
}
// Сводка колод для главной и бейдж на вкладке Le Carte; вызывается после ответа на карточке, входа и выхода
async function refreshHomeDue() {
  const badge = $('navCardsBadge');
  // Пока токен просрочен, запросы уходят анонимным ключом и возвращают пустые колоды. Такую «сводку»
  // нельзя ни показывать, ни запоминать: auth.js позовёт нас ещё раз, когда обновит токен.
  if (sessionStale()) { renderHome(); return; }
  if (!(window.Auth && Auth.user() && window.Cards && Cards.homeSummary)) {
    _homeSummary = null; _homeFavCount = null;
    if (window.Auth && !Auth.user()) saveHomeCache(); // вышли из аккаунта — прошлые числа больше не наши
    if (badge) badge.style.display = 'none'; renderHome(); return;
  }
  const [s, favs] = await Promise.all([
    Cards.homeSummary().catch(() => null),
    fetch(`${SB_URL}/rest/v1/favorites_dict?select=word`, { headers: SB_H }).then(r => r.ok ? r.json() : null).catch(() => null)
  ]);
  // Не дозвонились — оставляем на экране прошлые числа, а не обнуляем их
  if (s) { _homeSummary = s; _homeFavCount = Array.isArray(favs) ? favs.length : null; saveHomeCache(); }
  else if (Array.isArray(favs)) _homeFavCount = favs.length;
  const total = _homeSummary ? _homeSummary.learn + _homeSummary.due + _homeSummary.newToday : 0;
  if (badge) { badge.textContent = total; badge.style.display = total ? '' : 'none'; }
  renderHome();
}
window.addEventListener('load', () => refreshHomeDue());
loadHomeCache();
renderHome();
renderHistory(); // «Недавние» на главной при первой загрузке: иначе список появлялся только после возврата на неё

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
    } else if (currentMode === 'pratica' && window.Cards) {
      Cards.openArticle(_sheetWord); // из разбора: переключить режим на словарь, «Назад» вернёт разбор
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
  // Новая сборка встаёт сразу (skipWaiting + claim), но уже открытая страница продолжает работать
  // на старом коде до перезагрузки. Без подсказки это выглядит так, будто правка не приехала.
  let _hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!_hadController) { _hadController = true; return; } // первая установка, перезагружать нечего
    showUpdateToast();
  });
}
function showUpdateToast() {
  if ($('updateToast')) return;
  let stack = document.getElementById('toastStack');
  if (!stack) { stack = document.createElement('div'); stack.id = 'toastStack'; stack.className = 'toast-stack'; document.body.appendChild(stack); }
  const t = document.createElement('div');
  t.id = 'updateToast'; t.className = 'cache-toast sticky';
  t.innerHTML = `Приложение обновилось <button type="button" onclick="location.reload()">перезагрузить</button>`;
  stack.appendChild(t);
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

