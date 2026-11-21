/* Game Center — catálogo, perfil único e repasse de sessão (SSO) para os jogos.
   Contrato do perfil: spec.md §5.3. A ponte que recebe nos jogos: bridge/. */
'use strict';
(function () {
  const BASE_HOST = 'ederdandan.github.io';
  const KEY = { profile: 'gc_player_profile', recent: 'gc_recent', model: 'gc_model' };
  // Emojis escolhidos por existirem nas listas de avatar de vários jogos (ver bridge/adapters).
  const EMOJIS = ['🦊', '🐱', '🐸', '🦉', '🐼', '👑', '🤖', '👾', '🦄', '🚀', '🔥', '⚡', '😎', '🎩', '🧠', '🍕'];
  const COLORS = ['#8A2BE2', '#00F2FF', '#FF3D81', '#FFB020', '#22C55E', '#3B82F6', '#F97316', '#E2E8F0'];
  const MODELS = ['1', '2', '3'];
  const THEME_COLOR = { 1: '#0F1117', 2: '#07080C', 3: '#F6F1E7' };
  const PHOTO_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
  const PHOTO_MAX = 12000; // mesmo limite aceito pela ponte e pelo menor jogo (taco-chaos)
  const NAME_MAX = 12;
  const RECENT_MAX = 8;
  const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';

  const $ = (sel, root = document) => root.querySelector(sel);

  // Cria elementos sem innerHTML: todo texto vindo de dados entra como textContent.
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv);
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c);
    return el;
  }

  function playIcon() {
    const s = document.createElement('span');
    s.className = 'ico';
    s.innerHTML = PLAY_SVG; // constante estática
    return s;
  }

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } },
  };

  /* ---------------- utilidades de texto ---------------- */
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const slugify = (s) => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const cleanName = (s) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

  function hue(str) {
    let x = 2166136261;
    for (const ch of String(str)) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619); }
    return (x >>> 0) % 360;
  }

  function initials(name) {
    const w = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return (w.length === 1 ? [...w[0]].slice(0, 2).join('') : [...w[0]][0] + [...w[1]][0]).toUpperCase();
  }

  /* ---------------- perfil ---------------- */
  function validProfile(p) {
    if (!p || typeof p !== 'object' || p.v !== 1 || typeof p.id !== 'string' || !p.id) return null;
    const n = cleanName(p.n);
    if (n.length < 2) return null;
    const out = {
      v: 1,
      id: p.id.slice(0, 64),
      n,
      c: typeof p.c === 'string' && /^#[0-9a-f]{6}$/i.test(p.c) ? p.c : COLORS[0],
      e: typeof p.e === 'string' && p.e && p.e.length <= 16 && !/[<>"'&]/.test(p.e) ? p.e : EMOJIS[0],
      ts: Number(p.ts) || Date.now(),
    };
    if (typeof p.p === 'string' && p.p.length <= PHOTO_MAX && PHOTO_RE.test(p.p)) out.p = p.p;
    return out;
  }

  const loadProfile = () => validProfile(store.get(KEY.profile));
  const newId = () => (window.crypto && crypto.randomUUID
    ? crypto.randomUUID()
    : 'gc-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

  function encodeProfile(p) {
    const bytes = new TextEncoder().encode(JSON.stringify(p));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function avatar(p, cls) {
    const el = h('span', { class: 'avatar ' + (cls || ''), 'aria-hidden': 'true' });
    if (!p) { el.classList.add('avatar-empty'); el.textContent = '?'; return el; }
    el.style.setProperty('--av', p.c);
    if (p.p) el.append(h('img', { src: p.p, alt: '' }));
    else el.textContent = p.e;
    return el;
  }

  /* ---------------- catálogo ---------------- */
  // Mesma origem (github.io ou servidor local de teste): os jogos ficam em /<slug>/.
  function gameBase() {
    const hn = location.hostname;
    return hn === BASE_HOST || hn === 'localhost' || hn === '127.0.0.1' ? location.origin : 'https://' + BASE_HOST;
  }

  function safeImage(src) {
    if (typeof src !== 'string' || !src.trim()) return null;
    const s = src.trim();
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:/i.test(s)) return null; // bloqueia javascript:, data: etc.
    return s;
  }

  function normalizeGame(g, catIds) {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) return null;
    const name = g.name.trim().slice(0, 60);
    const rawUrl = typeof g.url === 'string' ? g.url.trim() : '';
    const full = /^https?:\/\//i.test(rawUrl);
    let slug = slugify(g.slug || (full ? '' : rawUrl));
    if (!slug && full) {
      try { slug = slugify(new URL(rawUrl).pathname.split('/').filter(Boolean).pop() || ''); } catch (e) { slug = ''; }
    }
    if (!slug) slug = slugify(name);
    if (!slug) return null;
    return {
      name,
      slug,
      url: full ? rawUrl : gameBase() + '/' + slug + '/',
      category: catIds.has(g.category) ? g.category : 'outros',
      image: safeImage(g.image),
      color: typeof g.color === 'string' && /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : null,
      desc: typeof g.desc === 'string' ? g.desc.trim().slice(0, 160) : '',
      online: g.online === true,
      h: hue(name),
    };
  }

  const state = { cats: [], catIds: new Set(), games: [], filter: 'all', q: '' };

  function categories() {
    const used = new Set(state.games.map((g) => g.category));
    const list = state.cats.filter((c) => used.has(c.id));
    if (used.has('outros') && !list.some((c) => c.id === 'outros')) list.push({ id: 'outros', label: 'Outros' });
    return list;
  }

  function cover(game, cls) {
    const el = h('span', { class: 'cover ' + (cls || ''), style: { '--h': String(game.h) } });
    const fallback = () => {
      el.classList.remove('has-img');
      el.classList.add('fallback');
      el.replaceChildren(h('span', { class: 'initials', text: initials(game.name) }));
    };
    if (game.image) {
      el.classList.add('has-img');
      if (game.color) el.style.setProperty('--gc', game.color);
      const img = h('img', { src: game.image, alt: '', loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', fallback, { once: true });
      el.append(img);
    } else {
      fallback();
    }
    return el;
  }

  function card(game, preview) {
    const play = preview ? null : () => requestPlay(game);
    return h('article', { class: 'card', 'data-slug': game.slug },
      h('button', { class: 'cover-btn', type: 'button', tabindex: '-1', 'aria-hidden': 'true', onclick: play }, cover(game)),
      h('div', { class: 'info' },
        h('h3', { text: game.name }),
        game.desc ? h('p', { class: 'desc', text: game.desc }) : null,
        h('div', { class: 'meta' },
          h('span', { class: 'slug', text: '/' + game.slug }),
          game.online ? h('span', { class: 'badge', text: 'Online' }) : null)),
      h('button', { class: 'play', type: 'button', 'aria-label': 'Jogar ' + game.name, onclick: play }, playIcon(), 'Jogar'));
  }

  const matches = (g, q) => !q || fold(g.name + ' ' + g.slug + ' ' + g.desc).includes(q);
  const browsing = () => state.filter === 'all' && !state.q.trim();

  function renderChips() {
    const counts = {};
    for (const g of state.games) counts[g.category] = (counts[g.category] || 0) + 1;
    const chip = (id, label, n) => h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(state.filter === id),
      onclick: () => { state.filter = id; renderChips(); renderAll(); },
    }, label, h('span', { class: 'n', text: String(n) }));
    $('#chips').replaceChildren(
      chip('all', 'Todos', state.games.length),
      ...categories().map((c) => chip(c.id, c.label, counts[c.id] || 0)));
  }

  function renderCatalog() {
    const q = fold(state.q.trim());
    let total = 0;
    const sections = [];
    for (const cat of categories()) {
      if (state.filter !== 'all' && state.filter !== cat.id) continue;
      const games = state.games.filter((g) => g.category === cat.id && matches(g, q));
      if (!games.length) continue;
      total += games.length;
      sections.push(h('section', { class: 'cat', 'data-cat': cat.id, style: { '--ch': String(hue(cat.id)) } },
        h('h2', { class: 'sec-title' },
          h('span', { text: cat.label }),
          h('span', { class: 'count', text: games.length + (games.length === 1 ? ' jogo' : ' jogos') })),
        h('div', { class: 'grid' }, games.map((g) => card(g)))));
    }
    $('#catalog').replaceChildren(...sections);
    $('#empty').hidden = total > 0;
  }

  function recentGames() {
    const list = Array.isArray(store.get(KEY.recent)) ? store.get(KEY.recent) : [];
    return list.map((s) => state.games.find((g) => g.slug === s)).filter(Boolean);
  }

  function renderRecent() {
    const games = recentGames();
    $('#recent').hidden = !browsing() || !games.length;
    $('#recent-row').replaceChildren(...games.map((g) =>
      h('button', { class: 'mini', type: 'button', 'aria-label': 'Jogar ' + g.name, onclick: () => requestPlay(g) },
        cover(g, 'mini-cover'), h('span', { text: g.name }))));
  }

  function renderHero() {
    const recent = recentGames();
    const g = recent[0] || state.games[0];
    const hero = $('#hero');
    hero.hidden = !g || !browsing();
    if (!g) return;
    hero.replaceChildren(
      h('div', { class: 'hero-bg', style: Object.assign({ '--h': String(g.h) }, g.color ? { '--gc': g.color } : {}) }),
      h('div', { class: 'hero-text' },
        h('span', { class: 'kicker', text: recent[0] ? 'Continue de onde parou' : 'Em destaque' }),
        h('h2', { text: g.name }),
        g.desc ? h('p', { text: g.desc }) : null,
        h('button', { class: 'play play-lg', type: 'button', onclick: () => requestPlay(g) }, playIcon(), 'Jogar agora')),
      h('div', { class: 'hero-art' }, cover(g, 'hero-cover')));
  }

  function renderWelcome() {
    $('#welcome').hidden = !!loadProfile() || !browsing();
  }

  function renderMe() {
    const p = loadProfile();
    const btn = $('#me');
    btn.setAttribute('aria-label', p ? 'Editar perfil de ' + p.n : 'Criar perfil');
    btn.replaceChildren(
      avatar(p),
      h('span', { class: 'me-text' },
        h('span', { class: 'me-name', text: p ? p.n : 'Entrar' }),
        h('span', { class: 'me-sub', text: p ? 'editar perfil' : 'criar perfil' })));
  }

  function renderAll() {
    renderCatalog();
    renderRecent();
    renderHero();
    renderWelcome();
  }

  /* ---------------- jogar ---------------- */
  let pendingGame = null;

  function pushRecent(slug) {
    const list = (Array.isArray(store.get(KEY.recent)) ? store.get(KEY.recent) : []).filter((s) => s !== slug);
    list.unshift(slug);
    store.set(KEY.recent, list.slice(0, RECENT_MAX));
  }

  function launch(game, withProfile) {
    const p = withProfile ? loadProfile() : null;
    // #gc_profile marca "veio do hub" e cobre o PWA do iOS, cujo storage é separado do Safari.
    const url = p ? game.url.split('#')[0] + '#gc_profile=' + encodeProfile(p) : game.url;
    pushRecent(game.slug);
    window.open(url, '_blank', 'noopener,noreferrer');
    renderRecent();
    renderHero();
  }

  function requestPlay(game) {
    if (loadProfile()) { launch(game, true); return; }
    pendingGame = game;
    $('#pl-title').textContent = 'Jogar ' + game.name;
    $('#play-dlg').showModal();
  }

  /* ---------------- diálogo de perfil ---------------- */
  let draft = null;
  let afterSave = null;

  function openProfile(then) {
    const p = loadProfile();
    draft = p ? Object.assign({}, p) : { v: 1, id: newId(), n: '', c: COLORS[0], e: EMOJIS[0] };
    afterSave = then || null;
    $('#pf-name').value = draft.n;
    $('#pf-error').textContent = '';
    const del = $('#pf-delete');
    del.hidden = !p;
    del.textContent = 'Remover perfil';
    delete del.dataset.armed;
    renderDraft();
    $('#profile-dlg').showModal();
  }

  function renderDraft() {
    const preview = Object.assign({}, draft, { n: draft.n || '?' });
    $('#pf-avatar').replaceWith(Object.assign(avatar(preview, 'avatar-xl'), { id: 'pf-avatar' }));
    for (const b of $('#pf-emojis').children) b.setAttribute('aria-pressed', String(!draft.p && b.dataset.e === draft.e));
    for (const b of $('#pf-colors').children) b.setAttribute('aria-pressed', String(b.dataset.c === draft.c));
    $('#pf-photo-rm').hidden = !draft.p;
  }

  function photoFromFile(file) {
    return new Promise((resolve) => {
      if (!file || !/^image\//.test(file.type)) return resolve(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const s = Math.min(img.naturalWidth, img.naturalHeight);
          const c = document.createElement('canvas');
          c.width = c.height = 96;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, 96, 96);
          ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 96, 96);
          for (let q = 0.85; q >= 0.3; q -= 0.1) {
            const d = c.toDataURL('image/jpeg', q);
            if (d.length <= PHOTO_MAX && PHOTO_RE.test(d)) return resolve(d);
          }
          resolve(null);
        } catch (e) { resolve(null); } finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  function saveProfile(ev) {
    ev.preventDefault();
    const n = cleanName($('#pf-name').value);
    if (n.length < 2) { $('#pf-error').textContent = 'Use de 2 a 12 caracteres no apelido.'; $('#pf-name').focus(); return; }
    const p = validProfile(Object.assign({}, draft, { n, ts: Date.now() }));
    if (!p || !store.set(KEY.profile, p)) { $('#pf-error').textContent = 'Não foi possível salvar neste aparelho.'; return; }
    $('#profile-dlg').close();
    renderMe();
    renderWelcome();
    toast('Perfil salvo! Ele vale em todos os jogos.');
    const cb = afterSave;
    afterSave = null;
    if (cb) cb();
  }

  /* ---------------- assistente "Adicionar jogo" ---------------- */
  function addDraft() {
    const val = (id) => $(id).value.trim();
    const o = { name: val('#ag-name') };
    const link = val('#ag-link');
    if (link) { if (/^https?:\/\//i.test(link)) o.url = link; else o.slug = slugify(link); }
    const cat = $('#ag-cat').value;
    if (cat && cat !== 'outros') o.category = cat;
    if (val('#ag-img')) o.image = val('#ag-img');
    if (val('#ag-desc')) o.desc = val('#ag-desc');
    if ($('#ag-online').checked) o.online = true;
    return o;
  }

  function updateAdd() {
    const o = addDraft();
    const g = normalizeGame(o, state.catIds);
    $('#ag-preview').replaceChildren(g ? card(g, true) : h('p', { class: 'muted', text: 'Informe o nome para ver a prévia.' }));
    $('#ag-json').value = o.name ? JSON.stringify(o, null, 2) + ',' : '';
  }

  function openAdd() {
    const sel = $('#ag-cat');
    sel.replaceChildren(...state.cats.map((c) => h('option', { value: c.id, text: c.label })),
      state.catIds.has('outros') ? null : h('option', { value: 'outros', text: 'Outros' }));
    updateAdd();
    $('#add-dlg').showModal();
  }

  /* ---------------- modelo visual ---------------- */
  function setModel(m) {
    if (!MODELS.includes(m)) m = '1';
    document.documentElement.dataset.model = m;
    try { localStorage.setItem(KEY.model, m); } catch (e) { /* ignora */ }
    $('meta[name="theme-color"]').setAttribute('content', THEME_COLOR[m]);
    for (const b of document.querySelectorAll('.model-switch [data-model]')) b.setAttribute('aria-pressed', String(b.dataset.model === m));
  }

  /* ---------------- toast ---------------- */
  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------------- carga ---------------- */
  async function load() {
    $('#error').hidden = true;
    try {
      const res = await fetch('./games.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.cats = (Array.isArray(data.categories) ? data.categories : [])
        .filter((c) => c && typeof c.id === 'string' && typeof c.label === 'string')
        .map((c) => ({ id: c.id, label: c.label }));
      state.catIds = new Set(state.cats.map((c) => c.id));
      const seen = new Set();
      state.games = (Array.isArray(data.games) ? data.games : [])
        .map((g) => normalizeGame(g, state.catIds))
        .filter((g) => g && !seen.has(g.slug) && seen.add(g.slug));
      renderChips();
      renderAll();
    } catch (e) {
      $('#catalog').replaceChildren();
      $('#error').hidden = false;
    }
  }

  function init() {
    setModel(document.documentElement.dataset.model);
    renderMe();

    for (const e of EMOJIS) {
      $('#pf-emojis').append(h('button', {
        class: 'emoji-btn', type: 'button', 'data-e': e, 'aria-label': 'Avatar ' + e, text: e,
        onclick: () => { draft.e = e; delete draft.p; renderDraft(); },
      }));
    }
    for (const c of COLORS) {
      $('#pf-colors').append(h('button', {
        class: 'swatch', type: 'button', 'data-c': c, 'aria-label': 'Cor ' + c, style: { '--sw': c },
        onclick: () => { draft.c = c; renderDraft(); },
      }));
    }

    $('#me').addEventListener('click', () => openProfile());
    $('#welcome-btn').addEventListener('click', () => openProfile());
    $('#pf-form').addEventListener('submit', saveProfile);
    $('#pf-photo').addEventListener('change', async (ev) => {
      const d = await photoFromFile(ev.target.files && ev.target.files[0]);
      ev.target.value = '';
      if (!d) { $('#pf-error').textContent = 'Não consegui usar essa imagem. Tente outra.'; return; }
      $('#pf-error').textContent = '';
      draft.p = d;
      renderDraft();
    });
    $('#pf-photo-rm').addEventListener('click', () => { delete draft.p; renderDraft(); });
    $('#pf-delete').addEventListener('click', (ev) => {
      const b = ev.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Confirmar remoção'; return; }
      store.del(KEY.profile);
      $('#profile-dlg').close();
      renderMe();
      renderWelcome();
      toast('Perfil removido deste aparelho.');
    });

    $('#pl-create').addEventListener('click', () => {
      const g = pendingGame;
      $('#play-dlg').close();
      openProfile(() => launch(g, true));
    });
    $('#pl-guest').addEventListener('click', () => {
      $('#play-dlg').close();
      if (pendingGame) launch(pendingGame, false);
    });

    $('#add-open').addEventListener('click', openAdd);
    for (const id of ['#ag-name', '#ag-link', '#ag-cat', '#ag-img', '#ag-desc', '#ag-online']) $(id).addEventListener('input', updateAdd);
    $('#ag-copy').addEventListener('click', async () => {
      const ta = $('#ag-json');
      if (!ta.value) { toast('Informe ao menos o nome do jogo.'); return; }
      try { await navigator.clipboard.writeText(ta.value); toast('JSON copiado. Cole dentro de "games" no games.json.'); }
      catch (e) { ta.select(); toast('Selecionei o JSON: copie com Ctrl+C.'); }
    });

    for (const d of document.querySelectorAll('dialog')) {
      d.addEventListener('click', (ev) => { if (ev.target === d) d.close(); }); // clique no fundo fecha
      for (const b of d.querySelectorAll('[data-close]')) b.addEventListener('click', () => d.close());
    }

    const search = $('#search');
    search.addEventListener('input', () => { state.q = search.value; renderAll(); });
    search.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { search.value = ''; state.q = ''; renderAll(); } });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
        ev.preventDefault();
        search.focus();
      }
    });

    for (const b of document.querySelectorAll('.model-switch [data-model]')) b.addEventListener('click', () => setModel(b.dataset.model));
    $('#retry').addEventListener('click', load);

    // Perfil alterado em outra aba do hub.
    window.addEventListener('storage', (ev) => { if (ev.key === KEY.profile) { renderMe(); renderWelcome(); } });

    load();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
  }

  init();
})();
