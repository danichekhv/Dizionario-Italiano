// Service worker словаря.
// Оболочка приложения: сеть в приоритете, при отсутствии сети — копия из кэша.
// Шрифты: кэш в приоритете. Словарные данные (Supabase, Викисловарь): сеть в приоритете,
// а последний удачный ответ сохраняется, чтобы уже просмотренные слова открывались офлайн.
const VERSION = 'v6';
const SHELL_CACHE = 'shell-' + VERSION;
const FONT_CACHE = 'fonts-' + VERSION;
const DATA_CACHE = 'data-' + VERSION;
const DATA_MAX_ENTRIES = 500;
const SHELL = ['/', '/index.html', '/cards.js', '/manifest.json', '/icon-192.png', '/icon-512.png'];
const DATA_HOSTS = ['freedictionaryapi.com', 'ru.wiktionary.org', 'qmsgumhvbsefpbbkvxgs.supabase.co'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const hit = await cache.match(request, { ignoreVary: true });
    if (hit) return hit;
    if (request.mode === 'navigate') {
      const shell = await cache.match('/index.html', { ignoreVary: true });
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cache);
    }
    return response;
  } catch (err) {
    const hit = await cache.match(request, { ignoreVary: true });
    if (hit) return hit;
    throw err;
  }
}

let trimming = false;
async function trimCache(cache) {
  if (trimming) return;
  trimming = true;
  try {
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - DATA_MAX_ENTRIES; i++) await cache.delete(keys[i]);
  } finally { trimming = false; }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstShell(request));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE));
  } else if (DATA_HOSTS.includes(url.hostname)) {
    event.respondWith(networkFirstData(request));
  }
  // Запросы к Gemini/Groq и озвучке не перехватываем
});
