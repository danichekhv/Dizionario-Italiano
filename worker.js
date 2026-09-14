// ── Бэкенд модели: общий ключ владельца вместо ключа каждого пользователя ────────────────────
// Сайт был чистой статикой (см. wrangler.jsonc). Здесь — все вызовы модели разом: сборка/проверка/
// починка словарной статьи, устойчивые выражения, русский поиск, Altre voci, шторка при наведении,
// сборка карточек, La Pratica и грамматика (та — только владельцу, см. ROUTES ниже).
// Сами промпты вынесены в prompts.js — так их проще держать в одном месте и читать отдельно.
import './prompts.js';
const P = self.DizPrompts;

// Публичный анон-ключ Supabase — тот же, что зашит в app.js (SB_URL/SB_KEY). Не секрет,
// доступ ограничивает RLS, а не сокрытие ключа.
const SB_URL = 'https://qmsgumhvbsefpbbkvxgs.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtc2d1bWh2YnNlZnBiYmt2eGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjI2OTYsImV4cCI6MjA4ODk5ODY5Nn0.z30dHGdi0uhNH-t1cRS2mtGe4_liamy3FGSIJIrhhmc';

// Грубые предохранители от расхода, не тонкий учёт токенов — см. llm_usage_bump()/llm_usage_bump_anon()
// в SQL из auth.js. article — «тяжёлые» операции (генерация чего угодно, кроме шторки); preview —
// шторка при наведении, частая и дешёвая, отдельным ведром, чтобы не съедала article раньше времени.
// anon — вошедших это не касается: раздельный, мягкий потолок по IP на пробу без регистрации.
const DAILY_LIMIT = 80;
const PREVIEW_LIMIT = 500;
const ANON_LIMIT = 30;
// Пробных генераций без регистрации браузер разрешает 15 (localStorage на клиенте, см. app.js) —
// это видимый, тёплый предохранитель. ANON_LIMIT выше — тихая серверная страховка по IP на случай,
// если кто-то обходит клиентский счётчик скриптом мимо браузера; она общая на всех анонимов с одного IP.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview';
const CHECK_URLS = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions'
};
const CHECK_MODELS = { groq: 'openai/gpt-oss-120b', cerebras: 'gpt-oss-120b', mistral: 'mistral-small-latest' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function extractJson(text) {
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');
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

// Тот же список, что ADMIN_EMAILS в auth.js — владелец гоняет QA-батчи (золотой набор, пересборка,
// «Исправить по замечаниям») через этот же бэкенд, и дневной лимит для обычных пользователей ему мешает.
const ADMIN_EMAILS = ['danichek.hv@gmail.com'];

// ── Кто вызывает и сколько ему ещё можно сегодня ────────────────────────────────────────────
// Анонимный запрос больше не отбивается тут же: часть путей (см. ROUTES) ему открыта, только
// под своим, более скупым потолком по IP. token остаётся null, если входа нет или он истёк.
async function requireUser(request) {
  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === SB_KEY) return { token: null, isAdmin: false, ip };
  const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } });
  if (!res.ok) return { token: null, isAdmin: false, ip };
  const user = await res.json().catch(() => null);
  if (!user || !user.id) return { token: null, isAdmin: false, ip };
  return { token, isAdmin: ADMIN_EMAILS.includes(String(user.email || '').toLowerCase()), ip };
}

// Атомарный инкремент в Supabase (RPC llm_usage_bump, security definer) — под тем же токеном
// пользователя, что и все остальные запросы к базе, RLS применяется как обычно.
async function withinQuota(auth, bucket) {
  if (auth.isAdmin) return true;
  const res = await fetch(`${SB_URL}/rest/v1/rpc/llm_usage_bump`, {
    method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_bucket: bucket })
  });
  if (!res.ok) return true; // счётчик недоступен — не блокируем генерацию из-за сбоя учёта
  const n = await res.json().catch(() => 0);
  const limit = bucket === 'preview' ? PREVIEW_LIMIT : DAILY_LIMIT;
  return typeof n === 'number' ? n <= limit : true;
}
// Для анонима своя RPC (llm_usage_bump_anon) — auth.uid() у него нет, ключ — IP. Зовём тем же
// анон-ключом, что и остальные анонимные чтения; RLS на anon_usage открыта для роли anon.
async function withinAnonQuota(ip) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/llm_usage_bump_anon`, {
    method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_ip: ip })
  });
  if (!res.ok) return true;
  const n = await res.json().catch(() => 0);
  return typeof n === 'number' ? n <= ANON_LIMIT : true;
}

// ── Модели: пишет всегда Gemini, проверяет всегда другой провайдер ──────────────────────────
// Раньше это гарантировалось только если у пользователя случайно было два разных ключа
// (app.js: «иначе она подтвердит собственные выдумки»); на своих ключах это стало правилом без исключений.
// thinkingLevel:minimal ускоряет и удешевляет ответ; часть ключей/регионов его не принимает —
// как и в app.js, при такой ошибке один раз отключаем параметр и повторяем запрос.
let geminiThinkingOn = true;
const isThinkingParamError = msg => /thinking/i.test(msg || '');
function geminiBody(prompt) {
  const generationConfig = { temperature: 0.2, responseMimeType: 'application/json' };
  if (geminiThinkingOn) generationConfig.thinkingConfig = { thinkingLevel: 'minimal' };
  return JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig });
}
async function callGeminiRaw(env, prompt, stream) {
  const url = `${GEMINI_URL}:${stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?'}key=${env.GEMINI_KEY}`;
  return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: geminiBody(prompt) });
}
async function geminiJson(env, prompt) {
  let res = await callGeminiRaw(env, prompt, false);
  let data = await res.json();
  if (data.error && geminiThinkingOn && isThinkingParamError(data.error.message)) {
    geminiThinkingOn = false;
    res = await callGeminiRaw(env, prompt, false);
    data = await res.json();
  }
  if (data.error) throw new Error(data.error.message);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return extractJson(text);
}
const checkerProvider = env => CHECK_URLS[env.CHECK_PROVIDER] ? env.CHECK_PROVIDER : 'groq';
const CHECK_NAME = { groq: 'Groq', cerebras: 'Cerebras', mistral: 'Mistral' };
const checkerLabel = env => `${CHECK_NAME[checkerProvider(env)]} · ${env.CHECK_MODEL || CHECK_MODELS[checkerProvider(env)]}`;
async function checkerJson(env, prompt) {
  const provider = checkerProvider(env);
  const res = await fetch(CHECK_URLS[provider], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.CHECK_KEY}` },
    body: JSON.stringify({
      model: env.CHECK_MODEL || CHECK_MODELS[provider], temperature: 0.2, max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a precise Italian lexicographer. Answer with valid JSON only, no markdown.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(`checker HTTP ${res.status}: ${t.slice(0, 200)}`); }
  const data = await res.json();
  return extractJson(data.choices?.[0]?.message?.content || '');
}

// ── Проверка статьи: те же два вопроса, что раньше делал клиент (verifyArticle в app.js) ────
async function checkFacts(env, prompt) {
  const r = await checkerJson(env, prompt);
  const clean = a => (Array.isArray(a) ? a : []).map(s => String(s).trim()).filter(Boolean).slice(0, 6);
  const errors = clean(r && (r.errors || r.issues)), warnings = clean(r && r.warnings);
  const fix = String((r && r.russianMain) || '').trim();
  const fixRu = fix && fix.length <= 40 && /^[а-яёА-ЯЁ][а-яёА-ЯЁ\s-]*$/.test(fix) ? fix : '';
  return { errors, warnings, fixRu };
}
async function verifyArticle(env, entry, base) {
  const f = await checkFacts(env, P.verifyArticleFactsPrompt(entry, base)); // без сверки фактов вердикта нет — ошибка уходит наверх
  let sErrors = [], sWarn = [];
  const ms = (entry.meanings || []).filter(m => m && m.definition);
  if (ms.length) {
    try {
      const r = await checkerJson(env, P.verifySensesPrompt(entry));
      const verdicts = Array.isArray(r && r.verdicts) ? r.verdicts : [];
      sErrors = verdicts.filter(v => v && v.genuine === false)
        .map(v => `значение ${v.n}${ms[v.n - 1] ? ` «${String(ms[v.n - 1].definition).slice(0, 60)}»` : ''} не является значением слова${v.note ? ': ' + String(v.note).trim() : ''}`)
        .slice(0, 6);
    } catch (e) { sWarn = ['проверка значений не удалась: ' + (e.message || '')]; }
  }
  const errors = [...sErrors, ...f.errors].slice(0, 8);
  return { ok: !errors.length, errors, warnings: [...f.warnings, ...sWarn], fixRu: f.fixRu, by: checkerLabel(env) };
}

// ── Маршруты ─────────────────────────────────────────────────────────────────────────────
// access: 'open' — работает и анонимам (под потолком по IP), 'user' — только вошедшим,
// 'admin' — только владельцу (grammar: см. правку «поиск по грамматике» — генерация статьи
// доступна исключительно ему, у остальных только чтение готового из закрытого списка тем).
// bucket: null у admin-путей — квота владельцу не нужна, он и так исключён из неё.
const ROUTES = {
  '/api/article/hybrid':   { access: 'open',  bucket: 'article' },
  '/api/article/fallback': { access: 'open',  bucket: 'article' },
  '/api/article/check':    { access: 'open',  bucket: 'article' },
  '/api/article/fix':      { access: 'open',  bucket: 'article' },
  '/api/phrase':           { access: 'open',  bucket: 'article' },
  '/api/russian-search':   { access: 'open',  bucket: 'article' },
  '/api/voices':           { access: 'open',  bucket: 'article' },
  '/api/cards-fill':       { access: 'user',  bucket: 'article' },
  '/api/pratica':          { access: 'user',  bucket: 'article' },
  '/api/preview/ru':       { access: 'user',  bucket: 'preview' },
  '/api/preview/mini':     { access: 'user',  bucket: 'preview' },
  '/api/preview/translit': { access: 'user',  bucket: 'preview' },
  '/api/grammar':          { access: 'admin', bucket: null }
};

async function handleApi(request, env) {
  const url = new URL(request.url);
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const route = ROUTES[url.pathname];
  if (!route) return json({ error: 'not found' }, 404);

  const auth = await requireUser(request);
  const isAnon = !auth.token && !auth.isAdmin;
  if (route.access === 'admin' && !auth.isAdmin) return json({ error: 'Статьи грамматики создаёт только владелец сайта' }, 403);
  if (route.access === 'user' && !auth.token) return json({ error: 'Нужно войти в аккаунт' }, 401);
  // route.access === 'open': анониму (isAnon) дальше идти можно, но под потолком по IP ниже

  if (route.bucket) {
    const ok = isAnon ? await withinAnonQuota(auth.ip) : await withinQuota(auth, route.bucket);
    if (!ok) {
      const msg = isAnon
        ? 'Слишком много запросов без регистрации — зарегистрируйтесь, это займёт меньше минуты'
        : `Дневной лимит (${route.bucket === 'preview' ? PREVIEW_LIMIT : DAILY_LIMIT}) исчерпан, попробуйте завтра`;
      return json({ error: msg }, 429);
    }
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

  try {
    if (url.pathname === '/api/article/hybrid') {
      const prompt = P.fdCompletionPrompt(body.base, { ruHint: body.ruHint });
      let upstream = await callGeminiRaw(env, prompt, true);
      let errData = null;
      if (!upstream.ok || !upstream.body) errData = await upstream.json().catch(() => ({}));
      if (errData && geminiThinkingOn && isThinkingParamError(errData.error?.message)) {
        geminiThinkingOn = false;
        upstream = await callGeminiRaw(env, prompt, true);
        errData = (!upstream.ok || !upstream.body) ? await upstream.json().catch(() => ({})) : null;
      }
      if (errData) return json({ error: errData.error?.message || `HTTP ${upstream.status}` }, 502);
      // Тело — «как есть» SSE-поток от Gemini: клиент читает его тем же ридером, что раньше
      // читал прямой ответ Google, только URL теперь свой.
      return new Response(upstream.body, { headers: { 'Content-Type': 'text/event-stream' } });
    }
    if (url.pathname === '/api/article/fallback') {
      const prompt = P.articleFallbackPrompt(body.word) + P.ruHintRule(body.ruHint);
      const entry = await geminiJson(env, prompt);
      return json({ entry, by: 'Gemini' });
    }
    if (url.pathname === '/api/article/check') {
      const v = await verifyArticle(env, body.entry, body.base);
      return json(v);
    }
    if (url.pathname === '/api/article/fix') {
      const patch = await geminiJson(env, P.fixArticlePrompt(body.entry, body.notes));
      return json({ patch, by: 'Gemini' });
    }
    if (url.pathname === '/api/phrase') {
      const entry = await geminiJson(env, P.phrasePrompt(body.phrase));
      return json({ entry, by: 'Gemini' });
    }
    if (url.pathname === '/api/russian-search') {
      const results = await geminiJson(env, P.russianSearchPrompt(body.word));
      return json({ results, by: 'Gemini' });
    }
    if (url.pathname === '/api/voices') {
      const raw = await geminiJson(env, P.voicesPrompt(body.word, body.partOfSpeech, body.meaningsText));
      return json({ voices: raw && raw.voices, by: 'Gemini' });
    }
    if (url.pathname === '/api/cards-fill') {
      const results = await geminiJson(env, P.cardsFillPrompt(body.list));
      return json({ results, by: 'Gemini' });
    }
    if (url.pathname === '/api/pratica') {
      const raw = await geminiJson(env, P.praticaPrompt(body.text, body.topics));
      return json({ raw, by: 'Gemini' });
    }
    if (url.pathname === '/api/preview/ru') {
      const raw = await geminiJson(env, P.previewRuPrompt(body.word, body.partOfSpeech, body.glosses));
      return json({ russian: raw && raw.russian });
    }
    if (url.pathname === '/api/preview/mini') {
      const entry = await geminiJson(env, P.previewMiniPrompt(body.word));
      return json({ entry });
    }
    if (url.pathname === '/api/preview/translit') {
      const raw = await geminiJson(env, P.previewTranslitPrompt(body.word, body.partOfSpeech, body.gloss));
      return json({ russian: raw && raw.russian });
    }
    if (url.pathname === '/api/grammar') {
      const g = await geminiJson(env, P.grammarPrompt(body.topic));
      return json({ entry: g, by: 'Gemini' });
    }
  } catch (e) {
    return json({ error: e.message || String(e) }, 502);
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  }
};
