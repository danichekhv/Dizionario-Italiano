// ── Аккаунты: вход по почте и паролю, профиль с ключами, общий кэш + личные данные ──
// Supabase Auth через его REST, без SDK. Пока пользователь не вошёл, запросы идут с анонимным
// ключом: кэш статей читается, а избранное, колоды и карта «моих слов» требуют входа.
// Права на уровне строк (RLS) задаются SQL-скриптом ниже: кэш читают все, пишут вошедшие;
// личные таблицы каждый видит только свои.
(function () {
  const SESSION_KEY = 'dizionario_session';
  const AUTH = `${SB_URL}/auth/v1`;
  let session = null, refreshTimer = 0, setupMissing = false;

  window.DIZ_SETUP_SQL = `-- Dizionario · таблицы, профили и права доступа. Скрипт можно запускать повторно.
-- Supabase → SQL Editor → New query → вставить → Run.

-- 1. Общий кэш: читают все, пишут вошедшие пользователи
create table if not exists dictionary (word text primary key, data jsonb, created_at timestamptz default now());
create table if not exists russian_search (word text primary key, data jsonb, created_at timestamptz default now());
create table if not exists grammar (topic text primary key, data jsonb, created_at timestamptz default now());

-- 2. Личные таблицы: у каждой строки есть владелец
create table if not exists favorites_dict (word text, data jsonb, created_at timestamptz default now());
create table if not exists favorites_grammar (topic text, data jsonb, created_at timestamptz default now());
alter table favorites_dict add column if not exists user_id uuid default auth.uid();
alter table favorites_grammar add column if not exists user_id uuid default auth.uid();
-- уникальность избранного теперь по паре (пользователь, слово), а не по слову
do $$ declare r record; begin
  for r in select conname, conrelid::regclass as t from pg_constraint
           where conrelid in ('public.favorites_dict'::regclass, 'public.favorites_grammar'::regclass) and contype in ('p','u') loop
    execute format('alter table %s drop constraint %I', r.t, r.conname);
  end loop;
end $$;
alter table favorites_dict add constraint favorites_dict_user_word unique (user_id, word);
alter table favorites_grammar add constraint favorites_grammar_user_topic unique (user_id, topic);

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references decks(id) on delete cascade,
  created_at timestamptz default now()
);
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks(id) on delete cascade,
  word text not null,
  translation text default '', phonetic text default '', example text default '', meaning text default '', pos text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references notes(id) on delete cascade,
  direction text not null check (direction in ('it','ru')),
  state text default 'new', step int default 0, due timestamptz default now(),
  interval_days real default 0, ease real default 2.5, reps int default 0, lapses int default 0,
  created_at timestamptz default now()
);
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade,
  note_id uuid references notes(id) on delete cascade,
  deck_id uuid, rating int not null, prev_state text, new_state text,
  prev_interval real default 0, interval_days real default 0, took_ms int default 0,
  reviewed_at timestamptz default now()
);
alter table decks add column if not exists user_id uuid default auth.uid();
alter table notes add column if not exists user_id uuid default auth.uid();
alter table cards add column if not exists user_id uuid default auth.uid();
alter table reviews add column if not exists user_id uuid default auth.uid();
create index if not exists cards_note_idx on cards(note_id);
create index if not exists notes_deck_idx on notes(deck_id);
create index if not exists reviews_at_idx on reviews(reviewed_at);

-- просмотренные слова (для личной карты слов) и профиль с ключами
create table if not exists word_views (
  user_id uuid not null default auth.uid(),
  word text not null,
  viewed_at timestamptz default now(),
  primary key (user_id, word)
);
create table if not exists profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  gemini_key text, fast_provider text, fast_key text,
  fast_model_groq text, fast_model_cerebras text, fast_model_mistral text,
  settings jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. Права доступа
alter table dictionary enable row level security;
alter table russian_search enable row level security;
alter table grammar enable row level security;
drop policy if exists dz_read on dictionary;   create policy dz_read on dictionary for select using (true);
drop policy if exists dz_insert on dictionary; create policy dz_insert on dictionary for insert to authenticated with check (true);
drop policy if exists dz_update on dictionary; create policy dz_update on dictionary for update to authenticated using (true) with check (true);
drop policy if exists dz_read on russian_search;   create policy dz_read on russian_search for select using (true);
drop policy if exists dz_insert on russian_search; create policy dz_insert on russian_search for insert to authenticated with check (true);
drop policy if exists dz_update on russian_search; create policy dz_update on russian_search for update to authenticated using (true) with check (true);
drop policy if exists dz_read on grammar;   create policy dz_read on grammar for select using (true);
drop policy if exists dz_insert on grammar; create policy dz_insert on grammar for insert to authenticated with check (true);
drop policy if exists dz_update on grammar; create policy dz_update on grammar for update to authenticated using (true) with check (true);

alter table favorites_dict enable row level security;
alter table favorites_grammar enable row level security;
alter table decks enable row level security;
alter table notes enable row level security;
alter table cards enable row level security;
alter table reviews enable row level security;
alter table word_views enable row level security;
alter table profiles enable row level security;
drop policy if exists dz_own on favorites_dict;    create policy dz_own on favorites_dict    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dz_own on favorites_grammar; create policy dz_own on favorites_grammar for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dz_own on decks;      create policy dz_own on decks      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dz_own on notes;      create policy dz_own on notes      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dz_own on cards;      create policy dz_own on cards      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dz_own on reviews;    create policy dz_own on reviews    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dz_own on word_views; create policy dz_own on word_views for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists dz_own on profiles;   create policy dz_own on profiles   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. Данные, накопленные до появления аккаунтов, при первом входе закрепляются за вошедшим
create or replace function claim_orphans() returns void language sql security definer set search_path = public as $$
  update favorites_dict set user_id = auth.uid() where user_id is null;
  update favorites_grammar set user_id = auth.uid() where user_id is null;
  update decks set user_id = auth.uid() where user_id is null;
  update notes set user_id = auth.uid() where user_id is null;
  update cards set user_id = auth.uid() where user_id is null;
  update reviews set user_id = auth.uid() where user_id is null;
$$;
grant execute on function claim_orphans() to authenticated;`;

  // ── Сессия ───────────────────────────────────────────────────────────────────
  function load() { try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { session = null; } }
  function save() { try { if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); } catch (e) {} }
  function apply() {
    // Все запросы к Supabase берут заголовки из SB_H: с токеном пользователя работают правила доступа
    SB_H['Authorization'] = 'Bearer ' + (session ? session.access_token : SB_KEY);
    document.body.classList.toggle('logged-in', !!session);
    renderUi();
  }
  async function authFetch(method, path, body, token) {
    const res = await fetch(`${AUTH}/${path}`, {
      method, headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + (token || SB_KEY) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(humanError(data, res.status));
    return data;
  }
  function humanError(data, status) {
    const m = data.msg || data.error_description || data.message || data.error || `HTTP ${status}`;
    if (/invalid login credentials/i.test(m)) return 'Неверная почта или пароль';
    if (/already registered|already been registered/i.test(m)) return 'Такой аккаунт уже есть, войдите';
    if (/password should be at least/i.test(m)) return 'Пароль не короче 6 символов';
    if (/email not confirmed/i.test(m)) return 'Почта ещё не подтверждена, проверьте письмо';
    if (/rate limit/i.test(m)) return 'Слишком много попыток, подождите минуту';
    if (/unable to validate email|invalid.*email/i.test(m)) return 'Проверьте адрес почты';
    return m;
  }
  function setSession(d, user) {
    const u = user || d.user || (session && session.user) || {};
    session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + ((d.expires_in || 3600) - 30) * 1000, user: { id: u.id, email: u.email } };
    save(); apply(); scheduleRefresh();
  }
  async function refresh() {
    if (!session) return;
    try { const d = await authFetch('POST', 'token?grant_type=refresh_token', { refresh_token: session.refresh_token }); setSession(d); }
    catch (e) { console.warn('auth refresh:', e.message); if (/invalid|expired|not found|revoked/i.test(e.message)) signOut(true); else scheduleRefresh(60000); }
  }
  function scheduleRefresh(inMs) {
    clearTimeout(refreshTimer); if (!session) return;
    refreshTimer = setTimeout(refresh, inMs || Math.max(5000, session.expires_at - Date.now() - 60000));
  }

  async function signIn(email, password) { const d = await authFetch('POST', 'token?grant_type=password', { email, password }); setSession(d); await afterLogin(); }
  async function signUp(email, password) {
    const d = await authFetch('POST', 'signup', { email, password });
    if (d.access_token) { setSession(d); await afterLogin(); return 'ok'; }
    return 'confirm'; // включено подтверждение почты — сессия появится после перехода по ссылке из письма
  }
  async function resetPassword(email) { await authFetch('POST', `recover?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`, { email }); }
  async function changePassword(password) { if (!session) throw new Error('Нужно войти'); await authFetch('PUT', 'user', { password }, session.access_token); }
  async function signOut(silent) {
    if (session && !silent) authFetch('POST', 'logout', {}, session.access_token).catch(() => {});
    session = null; clearTimeout(refreshTimer); save(); apply();
    showToast('Вы вышли из аккаунта');
    if (typeof _currentState !== 'undefined' && ['favorites', 'cards', 'graph'].includes(_currentState)) switchMode('dict');
  }

  // ── После входа: закрепить старые данные, забрать профиль ────────────────────
  async function afterLogin() {
    await claimOrphans();
    await pullProfile();
    showToast('✓ Вы вошли как ' + session.user.email);
    if (window.Cards && Cards.reload) Cards.reload().catch(() => {});
  }
  async function claimOrphans() {
    try { await fetch(`${SB_URL}/rest/v1/rpc/claim_orphans`, { method: 'POST', headers: { ...SB_H, 'Content-Type': 'application/json' }, body: '{}' }); }
    catch (e) { console.warn('claim_orphans:', e); }
  }
  async function pullProfile() {
    if (!session) return;
    try {
      const res = await fetch(`${SB_URL}/rest/v1/profiles?select=*&user_id=eq.${session.user.id}`, { headers: SB_H });
      if (res.status === 404) { setupMissing = true; renderUi(); return; }
      if (!res.ok) return;
      const p = (await res.json())[0];
      setupMissing = false;
      if (!p) { await pushProfile(); return; } // первый вход — заливаем ключи из браузера в профиль
      // ключи из профиля в браузер: на новом устройстве ничего вводить не надо
      const set = (k, v) => { try { if (v) localStorage.setItem(k, v); } catch (e) {} };
      set('dizionario_gemini_key', p.gemini_key); set('dizionario_fast_provider', p.fast_provider); set('dizionario_fast_key', p.fast_key);
      set('dizionario_fast_model_groq', p.fast_model_groq); set('dizionario_fast_model_cerebras', p.fast_model_cerebras); set('dizionario_fast_model_mistral', p.fast_model_mistral);
      if (!p.gemini_key && getApiKey()) await pushProfile();
      if (getApiKey()) hideApiKeyScreen();
    } catch (e) { console.warn('profile:', e); }
  }
  async function pushProfile() {
    if (!session) return;
    const g = k => { try { return localStorage.getItem(k) || null; } catch (e) { return null; } };
    const body = { user_id: session.user.id, gemini_key: g('dizionario_gemini_key'), fast_provider: g('dizionario_fast_provider'), fast_key: g('dizionario_fast_key'),
      fast_model_groq: g('dizionario_fast_model_groq'), fast_model_cerebras: g('dizionario_fast_model_cerebras'), fast_model_mistral: g('dizionario_fast_model_mistral'), updated_at: new Date().toISOString() };
    try {
      const res = await fetch(`${SB_URL}/rest/v1/profiles?on_conflict=user_id`, { method: 'POST', headers: { ...SB_H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(body) });
      if (res.status === 404) { setupMissing = true; renderUi(); }
    } catch (e) { console.warn('profile save:', e); }
  }

  // Просмотренные слова → личная карта слов
  const viewed = new Set();
  function logView(word) {
    if (!session || !word || viewed.has(word)) return;
    viewed.add(word);
    fetch(`${SB_URL}/rest/v1/word_views`, { method: 'POST', headers: { ...SB_H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ word, viewed_at: new Date().toISOString() }) }).catch(() => {});
  }
  async function myWords() {
    if (!session) return null;
    try { const res = await fetch(`${SB_URL}/rest/v1/word_views?select=word&limit=5000`, { headers: SB_H }); if (!res.ok) return null; return new Set((await res.json()).map(r => r.word)); }
    catch (e) { return null; }
  }

  // ── Экран ────────────────────────────────────────────────────────────────────
  function renderUi() {
    const box = document.getElementById('authBox'); if (!box) return;
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const sqlNote = setupMissing ? `<div class="cards-note">В Supabase ещё нет таблиц для аккаунтов. Выполните SQL один раз. <button class="cards-btn" onclick="Auth.showSql()">Показать SQL</button></div>` : '';
    if (session) {
      box.innerHTML = `${sqlNote}<div class="auth-user">Вы вошли как <b>${esc(session.user.email)}</b></div>
        <div class="auth-actions">
          <button class="cards-btn" onclick="Auth.signOut()">Выйти</button>
          <button class="auth-link" onclick="Auth.changePasswordUi()">Сменить пароль</button>
          <button class="auth-link" onclick="Auth.showSql()">SQL для базы</button>
        </div>`;
    } else {
      box.innerHTML = `${sqlNote}
        <input class="apikey-input auth-input" id="authEmail" type="email" placeholder="почта" autocomplete="email" spellcheck="false">
        <input class="apikey-input auth-input" id="authPassword" type="password" placeholder="пароль, не короче 6 символов" autocomplete="current-password" onkeydown="if(event.key==='Enter') Auth.signInUi()">
        <div class="apikey-error" id="authError"></div>
        <div class="auth-actions">
          <button class="cards-btn primary" onclick="Auth.signInUi()">Войти</button>
          <button class="cards-btn" onclick="Auth.signUpUi()">Создать аккаунт</button>
          <button class="auth-link" onclick="Auth.resetUi()">Забыли пароль?</button>
        </div>
        <div class="apikey-hint-small">Без входа словарь работает, но избранное, колоды и карта ваших слов доступны только после входа. Ключи ниже сохраняются в профиле и подхватываются на других устройствах.</div>`;
    }
    const hb = document.querySelector('#headerSettingsBtn span');
    if (hb) hb.textContent = session ? (session.user.email || '').split('@')[0] : 'API key';
  }
  function fieldError(msg) { const el = document.getElementById('authError'); if (el) { el.textContent = msg; el.classList.toggle('visible', !!msg); } }
  function creds() { const email = (document.getElementById('authEmail') || {}).value || '', password = (document.getElementById('authPassword') || {}).value || ''; return { email: email.trim(), password }; }
  async function signInUi() {
    const { email, password } = creds(); if (!email || !password) { fieldError('Введите почту и пароль'); return; }
    fieldError(''); try { await signIn(email, password); } catch (e) { fieldError(e.message); }
  }
  async function signUpUi() {
    const { email, password } = creds(); if (!email || password.length < 6) { fieldError('Введите почту и пароль не короче 6 символов'); return; }
    fieldError('');
    try { const r = await signUp(email, password); if (r === 'confirm') fieldError('Письмо отправлено: подтвердите почту по ссылке, затем войдите'); }
    catch (e) { fieldError(e.message); }
  }
  async function resetUi() {
    const { email } = creds(); if (!email) { fieldError('Введите почту, на неё придёт ссылка для смены пароля'); return; }
    try { await resetPassword(email); fieldError('Ссылка для смены пароля отправлена на ' + email); } catch (e) { fieldError(e.message); }
  }
  async function changePasswordUi() {
    const p = prompt('Новый пароль (не короче 6 символов):'); if (!p) return;
    try { await changePassword(p); showToast('✓ Пароль изменён'); } catch (e) { showToast('⚠ ' + e.message); }
  }
  function showSql() {
    let m = document.getElementById('sqlModal');
    if (!m) { m = document.createElement('div'); m.id = 'sqlModal'; m.className = 'cards-modal'; m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; }); document.body.appendChild(m); }
    m.innerHTML = `<div class="cards-modal-box wide"><div class="cards-title small">SQL для Supabase</div>
      <p class="cards-p">Supabase → SQL Editor → New query → вставить → Run. Скрипт можно запускать повторно, он ничего не удаляет. Затем в Authentication → URL Configuration укажите Site URL: <b>${location.origin}</b>, чтобы ссылки из писем вели на сайт.</p>
      <pre class="cards-sql">${window.DIZ_SETUP_SQL.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>
      <div class="cards-actions"><button class="cards-btn primary" onclick="Auth.copySql()">Скопировать SQL</button><button class="cards-btn" onclick="document.getElementById('sqlModal').style.display='none'">Закрыть</button></div></div>`;
    m.style.display = 'flex';
  }
  function copySql() { (navigator.clipboard ? navigator.clipboard.writeText(window.DIZ_SETUP_SQL) : Promise.reject()).then(() => showToast('✓ SQL скопирован'), () => showToast('Выделите текст и скопируйте вручную')); }

  // Требование входа для личных действий: подсказка и экран входа
  function require(what) {
    if (session) return true;
    showToast('🔒 ' + (what || 'Нужно войти в аккаунт'));
    showApiKeyScreen();
    setTimeout(() => { const e = document.getElementById('authEmail'); if (e) e.focus(); }, 150);
    return false;
  }

  // Переход по ссылке из письма: #access_token=…&type=signup|recovery
  async function handleHash() {
    if (!/access_token=/.test(location.hash)) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const access_token = p.get('access_token'), refresh_token = p.get('refresh_token'), type = p.get('type');
    if (!access_token) return;
    history.replaceState(null, '', location.pathname + location.search);
    try {
      const user = await authFetch('GET', 'user', undefined, access_token);
      setSession({ access_token, refresh_token, expires_in: parseInt(p.get('expires_in')) || 3600 }, user);
      if (type === 'recovery') { const np = prompt('Введите новый пароль (не короче 6 символов):'); if (np) { await changePassword(np); showToast('✓ Пароль изменён'); } }
      await afterLogin();
    } catch (e) { showToast('⚠ Не удалось войти по ссылке: ' + e.message); }
  }

  load();
  if (session && session.expires_at < Date.now()) { apply(); refresh(); } else { apply(); scheduleRefresh(); }
  handleHash();
  if (session) pullProfile();

  window.Auth = { user: () => session && session.user, require, signIn, signUp, signOut, resetPassword, changePassword, pushProfile, pullProfile, logView, myWords, renderUi, signInUi, signUpUi, resetUi, changePasswordUi, showSql, copySql };
})();
