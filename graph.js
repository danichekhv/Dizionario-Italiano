// ── Граф слов: canvas, силовая раскладка, перетаскивание, зум, тач ────────────
// Один движок для трёх мест: «Parole correlate» в статье (кольца вокруг слова),
// общая карта всех открытых слов и граф избранного. Связи берутся из relatedWords
// уже сохранённых статей, новых запросов к модели не нужно.
(function () {
  const CAT_COLORS = { cibo: '#c4522a', natura: '#4a7c3a', persone: '#b8860b', lavoro: '#3b64b4', casa: '#8b5a2b', viaggio: '#2a8c8c', emozioni: '#b03a6a', tempo: '#6b6b9c', corpo: '#c97b3a', cultura: '#7a4fa0', altro: '#8b7355', '?': '#b8ae9c' };
  const CAT_LABELS = { cibo: 'еда', natura: 'природа', persone: 'люди', lavoro: 'работа', casa: 'дом', viaggio: 'путешествия', emozioni: 'эмоции', tempo: 'время', corpo: 'тело', cultura: 'культура', altro: 'прочее', '?': 'ещё не открыто' };
  const POS_COLORS = { sostantivo: '#3b64b4', verbo: '#c4522a', aggettivo: '#4a7c3a', avverbio: '#b8860b', preposizione: '#7a4fa0', congiunzione: '#2a8c8c', pronome: '#b03a6a', articolo: '#6b6b9c', interiezione: '#c97b3a', altro: '#8b7355', '?': '#b8ae9c' };
  const POS_LABELS = { sostantivo: 'существительное', verbo: 'глагол', aggettivo: 'прилагательное', avverbio: 'наречие', preposizione: 'предлог', congiunzione: 'союз', pronome: 'местоимение', articolo: 'артикль', interiezione: 'междометие', altro: 'прочее', '?': 'ещё не открыто' };

  const norm = s => (s == null ? '' : String(s)).toLowerCase().trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function catKey(c) { const k = norm(c).replace(/[^a-z]/g, ''); return CAT_COLORS[k] ? k : (k ? 'altro' : '?'); }
  function posKey(p) { const s = norm(p); const k = Object.keys(POS_COLORS).find(k => k !== '?' && k !== 'altro' && s.startsWith(k)); return k || (s ? 'altro' : '?'); }

  // ── Данные из Supabase: только нужные поля статьи, без спряжений ─────────────
  const SELECT = 'select=' + encodeURIComponent('word,w:data->>word,cat:data->>category,pos:data->>partOfSpeech,rel:data->relatedWords,ru:data->russian->>main');
  async function fetchRows(extra) {
    const res = await fetch(`${SB_URL}/rest/v1/dictionary?${SELECT}${extra ? '&' + extra : ''}`, { headers: SB_H });
    if (!res.ok) throw new Error('Supabase HTTP ' + res.status);
    return res.json();
  }
  const rowToInfo = r => ({ id: norm(r.w || r.word), label: r.w || r.word, cat: catKey(r.cat), pos: posKey(r.pos), rel: Array.isArray(r.rel) ? r.rel.map(norm).filter(Boolean) : [], ru: r.ru || '' });
  const entryToInfo = e => ({ id: norm(e.word), label: e.word || '', cat: catKey(e.category), pos: posKey(e.partOfSpeech), rel: (e.relatedWords || []).map(norm).filter(Boolean), ru: (e.russian && e.russian.main) || '' });

  async function loadAllWords() {
    const rows = await fetchRows('limit=5000');
    const map = new Map();
    rows.map(rowToInfo).forEach(i => { if (i.id && !map.has(i.id)) map.set(i.id, i); }); // строки-псевдонимы схлопываем
    return map;
  }
  async function fetchWords(ids) {
    const out = new Map(); const list = [...new Set(ids.map(norm).filter(Boolean))];
    for (let i = 0; i < list.length; i += 40) {
      const chunk = list.slice(i, i + 40);
      const q = 'word=in.(' + encodeURIComponent(chunk.map(w => '"' + w.replace(/"/g, '') + '"').join(',')) + ')';
      const rows = await fetchRows(q).catch(() => []);
      rows.map(rowToInfo).forEach(info => { if (info.id) out.set(info.id, info); rows.forEach(r => { const k = norm(r.word); if (norm(r.w) === info.id && !out.has(k)) out.set(k, info); }); });
    }
    return out;
  }

  // Узлы и рёбра из набора известных слов. neighbors=true добавляет серыми ещё не открытые соседние слова
  const edgeKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  function buildGraph(infos, opts = {}) {
    const nodes = new Map(); const edges = new Set();
    const add = (id, info, depth) => {
      if (!nodes.has(id)) nodes.set(id, { id, label: info ? info.label : id, cat: info ? info.cat : '?', pos: info ? info.pos : '?', ru: info ? info.ru : '', depth, known: !!info });
      else if (depth < nodes.get(id).depth) nodes.get(id).depth = depth;
    };
    infos.forEach((info, id) => add(id, info, opts.depthOf ? (opts.depthOf.get(id) ?? 0) : 0));
    infos.forEach((info, id) => info.rel.forEach(t => {
      if (t === id) return;
      if (infos.has(t)) edges.add(edgeKey(id, t));
      else if (opts.neighbors) { add(t, null, nodes.get(id).depth + 1); edges.add(edgeKey(id, t)); }
    }));
    return { nodes: [...nodes.values()], edges: [...edges].map(k => k.split('|')) };
  }
  function buildFromEntries(entries, opts = {}) {
    const infos = new Map(); entries.forEach(e => { const i = entryToInfo(e); if (i.id && !infos.has(i.id)) infos.set(i.id, i); });
    return buildGraph(infos, opts);
  }
  // Кольца вокруг слова: 1-е кольцо — relatedWords статьи, дальше — связи уже открытых слов
  async function buildAround(entry, depth) {
    const center = norm(entry.word);
    const infos = new Map([[center, entryToInfo(entry)]]);
    const depthOf = new Map([[center, 0]]);
    const unknown = new Set();
    let frontier = infos.get(center).rel.filter(w => w !== center), d = 1;
    while (frontier.length && d <= depth) {
      const need = frontier.filter(w => !infos.has(w));
      const fetched = need.length ? await fetchWords(need) : new Map();
      const next = [];
      frontier.forEach(w => {
        if (!depthOf.has(w)) depthOf.set(w, d);
        const info = infos.get(w) || fetched.get(w);
        if (info) { if (!infos.has(w)) infos.set(w, info); if (d < depth) info.rel.forEach(t => { if (!infos.has(t) && !depthOf.has(t)) next.push(t); }); }
        else unknown.add(w);
      });
      frontier = [...new Set(next)]; d++;
    }
    const g = buildGraph(infos, { depthOf });
    const seen = new Set(g.edges.map(e => edgeKey(e[0], e[1])));
    unknown.forEach(w => g.nodes.push({ id: w, label: w, cat: '?', pos: '?', ru: '', depth: depthOf.get(w) || 1, known: false }));
    infos.forEach((info, id) => info.rel.forEach(t => { if (unknown.has(t) && !seen.has(edgeKey(id, t))) { seen.add(edgeKey(id, t)); g.edges.push([id, t]); } }));
    return g;
  }

  // ── Интерактивный холст ──────────────────────────────────────────────────────
  function create(container, opts = {}) {
    container.classList.add('wg');
    container.innerHTML = `
      <div class="wg-bar">
        <input class="wg-search" placeholder="найти слово…" autocomplete="off" spellcheck="false">
        <select class="wg-mode" title="Чем раскрашивать узлы"><option value="cat">цвет: тема</option><option value="pos">цвет: часть речи</option></select>
        ${opts.depthControl ? `<label class="wg-inline">кольца <select class="wg-depth">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === (opts.depth || 2) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
        ${opts.neighborsToggle ? `<label class="wg-inline"><input type="checkbox" class="wg-neigh" ${opts.neighbors ? 'checked' : ''}> ещё не открытые соседи</label>` : ''}
        <button class="wg-btn wg-fit" title="Вписать всё">⤢</button>
        ${opts.extraButtons || ''}
      </div>
      <div class="wg-legend"></div>
      <div class="wg-canvas-wrap" style="height:${opts.height || '480px'}"><canvas class="wg-canvas"></canvas><div class="wg-empty">Загрузка…</div></div>
      <div class="wg-hint">${opts.hint || 'Тяните слова, крутите колесо для масштаба, тяните пустое место, чтобы двигать карту. Клик по слову открывает статью.'}</div>`;
    const canvas = container.querySelector('.wg-canvas'), wrap = container.querySelector('.wg-canvas-wrap'), ctx = canvas.getContext('2d');
    const emptyEl = container.querySelector('.wg-empty'), legendEl = container.querySelector('.wg-legend');
    const G = { nodes: [], edges: [], byId: new Map(), scale: 1, tx: 0, ty: 0, alpha: 0, mode: 'cat', hidden: new Set(), hover: null, query: '', matches: new Set(), center: null, raf: 0, w: 0, h: 0, dpr: 1, destroyed: false };
    const pointers = new Map(); let drag = null, pan = null, pinch = null, hoverTimer = 0;

    const colorOf = n => (G.mode === 'cat' ? CAT_COLORS[n.cat] : POS_COLORS[n.pos]) || '#8b7355';
    const keyOf = n => G.mode === 'cat' ? n.cat : n.pos;
    const visible = n => !G.hidden.has(keyOf(n));
    const depthAlpha = d => d <= 1 ? 1 : d === 2 ? 0.8 : d === 3 ? 0.6 : 0.45;

    function resize() {
      const r = wrap.getBoundingClientRect(); G.dpr = window.devicePixelRatio || 1; G.w = r.width; G.h = r.height;
      canvas.width = Math.round(r.width * G.dpr); canvas.height = Math.round(r.height * G.dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      draw();
    }
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    function setData(nodes, edges, o = {}) {
      G.center = o.center || null;
      const old = new Map(G.nodes.map(n => [n.id, n]));
      G.nodes = nodes.map(n => { const prev = old.get(n.id); return { ...n, deg: 0, x: prev ? prev.x : NaN, y: prev ? prev.y : NaN, vx: 0, vy: 0, fx: null, fy: null }; });
      G.byId = new Map(G.nodes.map(n => [n.id, n]));
      G.edges = edges.map(([a, b]) => [G.byId.get(a), G.byId.get(b)]).filter(e => e[0] && e[1] && e[0] !== e[1]);
      G.edges.forEach(([a, b]) => { a.deg++; b.deg++; });
      // Начальная раскладка: центр — в середине, остальные кольцами по глубине или по кругу
      const byDepth = {}; G.nodes.forEach(n => { (byDepth[n.depth || 0] = byDepth[n.depth || 0] || []).push(n); });
      Object.keys(byDepth).forEach(d => { const arr = byDepth[d]; const R = d == 0 ? (arr.length > 1 ? 40 : 0) : 90 + 110 * (d - 1); arr.forEach((n, i) => { if (isNaN(n.x)) { const a = (i / arr.length) * Math.PI * 2 + d * 0.4; n.x = Math.cos(a) * R * (arr.length > 30 ? Math.sqrt(arr.length / 30) : 1); n.y = Math.sin(a) * R * (arr.length > 30 ? Math.sqrt(arr.length / 30) : 1); } }); });
      if (G.center && G.byId.get(G.center)) { const c = G.byId.get(G.center); c.x = 0; c.y = 0; }
      emptyEl.style.display = G.nodes.length ? 'none' : 'block'; emptyEl.textContent = 'Пока нет связей';
      buildLegend(); G.alpha = 1; fitSoon(); loop();
    }
    let fitPending = 0;
    function fitSoon() { clearTimeout(fitPending); fitPending = setTimeout(fit, 700); }
    function fit() {
      const vis = G.nodes.filter(visible); if (!vis.length || !G.w) return;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      vis.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); });
      const pad = 60, bw = Math.max(1, x1 - x0 + pad * 2), bh = Math.max(1, y1 - y0 + pad * 2);
      G.scale = Math.min(2.2, Math.max(0.15, Math.min(G.w / bw, G.h / bh)));
      G.tx = G.w / 2 - ((x0 + x1) / 2) * G.scale; G.ty = G.h / 2 - ((y0 + y1) / 2) * G.scale; draw();
    }

    // Силовая раскладка
    function tick() {
      const a = G.alpha; const N = G.nodes;
      for (let i = 0; i < N.length; i++) { const n = N[i]; if (!visible(n)) continue; for (let j = i + 1; j < N.length; j++) { const m = N[j]; if (!visible(m)) continue;
        let dx = n.x - m.x, dy = n.y - m.y; let d2 = dx * dx + dy * dy; if (d2 > 160000) continue; if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const f = 2600 * a / d2; const fx = dx * f / Math.sqrt(d2), fy = dy * f / Math.sqrt(d2); n.vx += fx; n.vy += fy; m.vx -= fx; m.vy -= fy; } }
      G.edges.forEach(([n, m]) => { if (!visible(n) || !visible(m)) return; const dx = m.x - n.x, dy = m.y - n.y, d = Math.max(1, Math.sqrt(dx * dx + dy * dy)); const rest = 70 + 18 * Math.max(n.depth || 0, m.depth || 0); const f = (d - rest) * 0.045 * a; n.vx += dx / d * f; n.vy += dy / d * f; m.vx -= dx / d * f; m.vy -= dy / d * f; });
      N.forEach(n => { n.vx -= n.x * 0.012 * a; n.vy -= n.y * 0.012 * a; if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; return; } if (G.center === n.id && !drag) { n.x = n.y = 0; n.vx = n.vy = 0; return; } n.vx *= 0.55; n.vy *= 0.55; n.x += n.vx; n.y += n.vy; });
      G.alpha += (0 - G.alpha) * 0.022;
    }
    function loop() { if (G.destroyed) return; cancelAnimationFrame(G.raf); const step = () => { if (G.destroyed) return; if (G.alpha > 0.004 || drag) { tick(); draw(); G.raf = requestAnimationFrame(step); } else draw(); }; G.raf = requestAnimationFrame(step); }

    function draw() {
      if (!G.w) return;
      ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0); ctx.clearRect(0, 0, G.w, G.h);
      ctx.translate(G.tx, G.ty); ctx.scale(G.scale, G.scale);
      const hl = G.hover; const hlSet = new Set(); if (hl) { hlSet.add(hl); G.edges.forEach(([a, b]) => { if (a === hl) hlSet.add(b); if (b === hl) hlSet.add(a); }); }
      const dim = !!hl || G.matches.size > 0;
      // рёбра
      ctx.lineWidth = 1.2 / G.scale;
      G.edges.forEach(([a, b]) => { if (!visible(a) || !visible(b)) return; const strong = hl && (a === hl || b === hl); ctx.strokeStyle = strong ? 'rgba(196,82,42,0.9)' : `rgba(139,115,85,${dim ? 0.12 : 0.28 * depthAlpha(Math.max(a.depth || 0, b.depth || 0))})`; ctx.lineWidth = (strong ? 2.2 : 1.2) / G.scale; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
      // узлы
      G.nodes.forEach(n => { if (!visible(n)) return; const r = radius(n); const hot = hlSet.has(n) || G.matches.has(n) || n.id === G.center; ctx.globalAlpha = dim && !hot ? 0.25 : depthAlpha(n.depth || 0); ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fillStyle = colorOf(n); ctx.fill(); ctx.lineWidth = (hot ? 3 : 1.5) / G.scale; ctx.strokeStyle = hot ? '#1a1208' : 'rgba(255,255,255,0.9)'; ctx.stroke(); if (!n.known) { ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(1.5, r * 0.4), 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill(); } });
      // подписи — постоянного размера на экране
      const showAll = G.scale >= 0.55; const fs = 12.5 / G.scale;
      ctx.font = `${fs}px "Crimson Pro", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      G.nodes.forEach(n => { if (!visible(n)) return; const hot = hlSet.has(n) || G.matches.has(n) || n.id === G.center; if (!showAll && !hot && !(G.scale >= 0.35 && (n.depth || 0) <= 1)) return; ctx.globalAlpha = dim && !hot ? 0.3 : 1; const y = n.y + radius(n) + 3 / G.scale; ctx.lineWidth = 3 / G.scale; ctx.strokeStyle = 'rgba(245,240,232,0.9)'; ctx.strokeText(n.label, n.x, y); ctx.fillStyle = hot ? '#c4522a' : '#1a1208'; if (hot) ctx.font = `bold ${fs}px "Crimson Pro", Georgia, serif`; ctx.fillText(n.label, n.x, y); if (hot) ctx.font = `${fs}px "Crimson Pro", Georgia, serif`; });
      ctx.globalAlpha = 1;
    }
    const radius = n => (n.id === G.center ? 13 : (n.known ? 6 + Math.min(8, n.deg * 1.1) : 4.5));

    // Легенда — переключатели видимости
    function buildLegend() {
      const counts = {}; G.nodes.forEach(n => { const k = keyOf(n); counts[k] = (counts[k] || 0) + 1; });
      const colors = G.mode === 'cat' ? CAT_COLORS : POS_COLORS, labels = G.mode === 'cat' ? CAT_LABELS : POS_LABELS;
      const keys = Object.keys(colors).filter(k => counts[k]);
      legendEl.innerHTML = keys.map(k => `<button class="wg-chip ${G.hidden.has(k) ? 'off' : ''}" data-k="${k}"><i style="background:${colors[k]}"></i>${labels[k] || k}<span>${counts[k]}</span></button>`).join('')
        + (keys.length > 1 ? `<button class="wg-chip-all" data-all="1">все</button><button class="wg-chip-all" data-all="0">ничего</button>` : '');
      legendEl.querySelectorAll('.wg-chip').forEach(b => b.onclick = () => { const k = b.dataset.k; if (G.hidden.has(k)) G.hidden.delete(k); else G.hidden.add(k); buildLegend(); G.alpha = Math.max(G.alpha, 0.3); loop(); });
      legendEl.querySelectorAll('.wg-chip-all').forEach(b => b.onclick = () => { if (b.dataset.all === '1') G.hidden.clear(); else keys.forEach(k => G.hidden.add(k)); buildLegend(); G.alpha = Math.max(G.alpha, 0.3); loop(); });
    }

    // Координаты и попадание в узел
    const toWorld = (cx, cy) => { const r = canvas.getBoundingClientRect(); return { x: (cx - r.left - G.tx) / G.scale, y: (cy - r.top - G.ty) / G.scale }; };
    function hit(cx, cy) { const p = toWorld(cx, cy); let best = null, bd = Infinity; G.nodes.forEach(n => { if (!visible(n)) return; const d = Math.hypot(n.x - p.x, n.y - p.y); const rr = radius(n) + 6 / G.scale; if (d <= rr && d < bd) { best = n; bd = d; } }); return best; }
    function setHover(n, e) {
      if (G.hover === n) return; G.hover = n; draw();
      clearTimeout(hoverTimer);
      if (n && opts.onHover) hoverTimer = setTimeout(() => opts.onHover(n.label, e.clientX, e.clientY), 150);
      else if (!n && opts.onHoverEnd) opts.onHoverEnd();
      canvas.style.cursor = n ? 'pointer' : (pan ? 'grabbing' : 'grab');
    }

    canvas.addEventListener('pointerdown', e => {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {} // синтетические события без активного указателя
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), s0: G.scale, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx0: G.tx, ty0: G.ty }; drag = null; pan = null; return; }
      const n = hit(e.clientX, e.clientY);
      if (n) { drag = { node: n, x0: e.clientX, y0: e.clientY, moved: false, type: e.pointerType }; n.fx = n.x; n.fy = n.y; G.alpha = Math.max(G.alpha, 0.35); loop(); }
      else { pan = { x0: e.clientX, y0: e.clientY, tx0: G.tx, ty0: G.ty, moved: false }; canvas.style.cursor = 'grabbing'; }
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const s = Math.min(4, Math.max(0.1, pinch.s0 * d / pinch.d0)); const r = canvas.getBoundingClientRect(); const px = pinch.cx - r.left, py = pinch.cy - r.top; const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top; G.tx = mx - (px - pinch.tx0) * s / pinch.s0; G.ty = my - (py - pinch.ty0) * s / pinch.s0; G.scale = s; draw(); return; }
      if (drag) { const p = toWorld(e.clientX, e.clientY); drag.node.fx = p.x; drag.node.fy = p.y; if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 5) drag.moved = true; G.alpha = Math.max(G.alpha, 0.25); loop(); return; }
      if (pan) { G.tx = pan.tx0 + e.clientX - pan.x0; G.ty = pan.ty0 + e.clientY - pan.y0; if (Math.hypot(e.clientX - pan.x0, e.clientY - pan.y0) > 4) pan.moved = true; draw(); return; }
      if (e.pointerType === 'mouse') setHover(hit(e.clientX, e.clientY), e);
    });
    const finish = e => {
      pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null;
      if (drag) { const n = drag.node; n.fx = n.fy = null; if (!drag.moved) { if (drag.type === 'touch' || drag.type === 'pen') { if (opts.onTap) opts.onTap(n.label); } else if (opts.onOpen) opts.onOpen(n.label); } drag = null; G.alpha = Math.max(G.alpha, 0.15); loop(); }
      if (pan) { pan = null; canvas.style.cursor = 'grab'; }
    };
    canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish);
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setHover(null, e); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; const f = Math.pow(1.0015, -e.deltaY); const s = Math.min(4, Math.max(0.1, G.scale * f)); G.tx = px - (px - G.tx) * s / G.scale; G.ty = py - (py - G.ty) * s / G.scale; G.scale = s; draw(); }, { passive: false });
    canvas.addEventListener('dblclick', e => { e.preventDefault(); fit(); });
    canvas.style.cursor = 'grab'; canvas.style.touchAction = 'none';

    // Панель
    const searchEl = container.querySelector('.wg-search');
    searchEl.addEventListener('input', () => { G.query = norm(searchEl.value); G.matches = new Set(G.query ? G.nodes.filter(n => n.id.includes(G.query) || norm(n.ru).includes(G.query)) : []); draw(); });
    searchEl.addEventListener('keydown', e => { if (e.key === 'Enter' && G.matches.size) { const n = [...G.matches][0]; G.tx = G.w / 2 - n.x * G.scale; G.ty = G.h / 2 - n.y * G.scale; draw(); } });
    container.querySelector('.wg-mode').addEventListener('change', e => { G.mode = e.target.value; G.hidden.clear(); buildLegend(); draw(); });
    container.querySelector('.wg-fit').addEventListener('click', fit);
    const depthSel = container.querySelector('.wg-depth'); if (depthSel) depthSel.addEventListener('change', () => opts.onDepth && opts.onDepth(parseInt(depthSel.value)));
    const neigh = container.querySelector('.wg-neigh'); if (neigh) neigh.addEventListener('change', () => opts.onNeighbors && opts.onNeighbors(neigh.checked));

    function destroy() { G.destroyed = true; cancelAnimationFrame(G.raf); clearTimeout(hoverTimer); ro.disconnect(); }
    function setLoading(text) { emptyEl.style.display = 'block'; emptyEl.textContent = text || 'Загрузка…'; }
    resize();
    return { setData, fit, destroy, setLoading, get nodes() { return G.nodes; } };
  }

  window.WordGraph = { create, loadAllWords, fetchWords, buildGraph, buildFromEntries, buildAround, catKey, posKey, CAT_COLORS, CAT_LABELS };
})();
