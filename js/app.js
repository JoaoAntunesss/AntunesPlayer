/* AntunesPlayer — a small IPTV player. Bring your own playlist (M3U/M3U8 link or file, or Xtream login). No channels included. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

/* ---------- language ---------- */
const LANG = (LS.get('ap.lang', '') || navigator.language || 'en').slice(0, 2) === 'pt' ? 'pt' : 'en';
const PT = { 'Search channels…': 'Pesquisar canais…', 'Favourites': 'Favoritos', 'Recent': 'Recentes', 'All channels': 'Todos os canais', 'Movies': 'Filmes', 'Series': 'Séries', 'Add playlist': 'Adicionar lista', 'Settings': 'Definições', 'Cancel': 'Cancelar', 'Save': 'Guardar', 'Add': 'Adicionar', 'Close': 'Fechar', 'Delete': 'Apagar', 'Refresh': 'Atualizar', 'Playlist link (M3U / M3U8)': 'Link da lista (M3U / M3U8)', 'Paste or upload': 'Colar ou carregar', 'Xtream login': 'Login Xtream', 'Name': 'Nome', 'Server (with http/https)': 'Servidor (com http/https)', 'Username': 'Utilizador', 'Password': 'Palavra-passe', 'TV guide link (XMLTV, optional)': 'Link do guia de programação (XMLTV, opcional)', 'Playlist text': 'Texto da lista', 'or choose a file': 'ou escolhe um ficheiro', 'Welcome to AntunesPlayer': 'Bem-vindo ao AntunesPlayer', 'AntunesPlayer plays the streams you give it — it comes with no channels. Add your own playlist, or look around with free test streams.': 'O AntunesPlayer reproduz as listas que lhe deres — não traz canais. Adiciona a tua lista ou experimenta com emissões de teste gratuitas.', 'Try demo channels': 'Experimentar canais de demonstração', 'Nothing found': 'Nada encontrado', 'Show more': 'Mostrar mais', 'Last channel': 'Último canal', 'No channel': 'Sem canal', 'Added to favourites': 'Adicionado aos favoritos', 'Removed from favourites': 'Removido dos favoritos', 'Loading…': 'A carregar…', 'Could not play this': 'Não foi possível reproduzir', 'Retry': 'Tentar de novo', 'Look': 'Aspeto', 'Theme': 'Tema', 'Number keys jump to': 'As teclas numéricas vão para', 'Channel numbers from the playlist': 'Números dos canais da lista', 'My favourites, in order': 'Os meus favoritos, por ordem', 'Big TV mode': 'Modo TV (grande)', 'Network': 'Rede', 'Helper link for blocked playlists (optional)': 'Link auxiliar para listas bloqueadas (opcional)', 'Also use it for streams': 'Usar também nas emissões', 'Yes': 'Sim', 'No': 'Não', 'Playlists': 'Listas', 'Keyboard & remote': 'Teclado e comando', 'Number': 'Número', 'jump to that channel': 'ir para esse canal', 'next / previous channel': 'canal seguinte / anterior', 'channel list': 'lista de canais', 'favourite on/off': 'favorito sim/não', 'last channel': 'último canal', 'mute': 'sem som', 'record (needs a browser that allows it)': 'gravar (precisa de navegador que permita)', 'full screen': 'ecrã inteiro', 'Recording saved': 'Gravação guardada', 'Recording…': 'A gravar…', 'Recording is not possible for this stream': 'Não é possível gravar esta emissão', 'Download': 'Descarregar', 'Now': 'Agora', 'Next': 'A seguir', 'channels': 'canais', 'Language': 'Idioma', 'Playlist added': 'Lista adicionada', 'Could not load the playlist': 'Não foi possível carregar a lista', 'Fill in the fields': 'Preenche os campos', 'No programme guide for this channel': 'Sem guia para este canal', 'Live': 'Em direto', 'Full screen': 'Ecrã inteiro' };
Object.assign(PT, { 'Filter categories…': 'Filtrar categorias…', 'Categories': 'Categorias', 'TV': 'TV', 'Season': 'Época', 'Episodes': 'Episódios', 'Loading…': 'A carregar…', 'No episodes found': 'Sem episódios' });
Object.assign(PT, { 'Audio': 'Áudio', 'Subtitles': 'Legendas', 'Off': 'Desligadas', 'No extra audio or subtitles': 'Sem áudio ou legendas extra', 'Fit': 'Ajustar', 'Fill': 'Preencher', 'Stretch': 'Esticar', 'Resume': 'Continuar', 'Continue watching': 'Continuar a ver' });
const t = s => (LANG === 'pt' && PT[s]) || s;
const THEMES = [['night', 'Night'], ['ocean', 'Ocean'], ['ember', 'Ember'], ['neon', 'Neon'], ['light', 'Light']];

/* ---------- tiny IndexedDB key/value ---------- */
let dbp; const idb = () => dbp || (dbp = new Promise((ok, no) => { const r = indexedDB.open('antunesplayer', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
const idbGet = k => idb().then(d => new Promise(ok => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => ok(undefined); })).catch(() => undefined);
const idbSet = (k, v) => idb().then(d => new Promise(ok => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => ok(); tx.onerror = () => ok(); })).catch(() => { });
const idbDel = k => idb().then(d => new Promise(ok => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete = () => ok(); })).catch(() => { });

/* ---------- state ---------- */
const S = { sources: LS.get('ap.sources', []), srcId: LS.get('ap.src', ''), channels: [], favs: LS.get('ap.favs', []), recent: LS.get('ap.recent', []), set: Object.assign({ proxy: '', proxyStreams: false, numberMode: 'chno', theme: 'night', tv: false }, LS.get('ap.set', {})), group: 'all', q: '', shown: 250, cur: null, last: null, epg: {}, byNum: {}, byKey: {} };
const saveSet = () => LS.set('ap.set', S.set);
let toastT; const toast = m => { const e = $('#toast'); e.textContent = m; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2400); };
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const proxied = (u, force) => { const p = S.set.proxy; if (!p || !(force || S.set.proxyStreams || (location.protocol === 'https:' && /^http:/i.test(u)))) return u; return p.includes('{url}') ? p.replace('{url}', encodeURIComponent(u)) : p + encodeURIComponent(u); };
const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
const nativeHttp = () => NATIVE && Capacitor.Plugins && Capacitor.Plugins.CapacitorHttp;
// In the Android app, hls.js loads through the native HTTP layer so servers that block web pages (CORS) still work.
class NativeLoader {
  constructor() { this.stats = { aborted: false, loaded: 0, retry: 0, total: 0, chunkCount: 0, bwEstimate: 0, loading: { start: 0, first: 0, end: 0 }, parsing: { start: 0, end: 0 }, buffering: { start: 0, first: 0, end: 0 } }; this.dead = false; }
  destroy() { this.dead = true; } abort() { this.dead = true; this.stats.aborted = true; }
  load(ctx, cfg, cb) {
    const st = this.stats; st.loading.start = performance.now(); const bin = ctx.responseType === 'arraybuffer', headers = {};
    if (ctx.rangeStart != null && ctx.rangeEnd != null) headers.Range = `bytes=${ctx.rangeStart}-${ctx.rangeEnd - 1}`;
    nativeHttp().request({ url: ctx.url, method: 'GET', headers, responseType: bin ? 'arraybuffer' : 'text', connectTimeout: 15000, readTimeout: 20000 }).then(r => {
      if (this.dead) return; if (r.status >= 400) { cb.onError({ code: r.status, text: 'HTTP ' + r.status }, ctx, r); return; }
      let data = r.data; if (bin) { const b = atob(typeof data === 'string' ? data : ''), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); data = u.buffer; }
      st.loading.first = st.loading.end = performance.now(); st.loaded = st.total = bin ? data.byteLength : String(data).length; cb.onSuccess({ url: r.url || ctx.url, data }, st, ctx, r);
    }).catch(e => { if (!this.dead) cb.onError({ code: 0, text: String(e && e.message || e) }, ctx, null); });
  }
}
const loadScript = src => new Promise((ok, no) => { const e = document.createElement('script'); e.src = src; e.onload = ok; e.onerror = () => no(new Error('Could not load ' + src)); document.head.appendChild(e); });

/* ---------- playlist parsing ---------- */
function parseM3U(text) {
  const out = [], lines = text.split(/\r?\n/); let cur = null, epg = '';
  const attr = (s, k) => { const m = s.match(new RegExp(k + '="([^"]*)"', 'i')); return m ? m[1] : ''; };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim(); if (!l) continue;
    if (/^#EXTM3U/i.test(l)) { epg = attr(l, 'url-tvg') || attr(l, 'x-tvg-url'); continue; }
    if (/^#EXTINF/i.test(l)) { const c = l.indexOf(','), head = l.slice(0, c < 0 ? undefined : c); cur = { name: (c < 0 ? '' : l.slice(c + 1)).trim() || attr(head, 'tvg-name'), logo: attr(head, 'tvg-logo'), group: attr(head, 'group-title') || '', tvg: attr(head, 'tvg-id'), num: parseInt(attr(head, 'tvg-chno'), 10) || 0 }; continue; }
    if (l[0] === '#') continue;
    if (cur) { cur.url = l; out.push(cur); cur = null; }
  }
  return { list: out, epg };
}
function finish(list) {
  const used = new Set(); list.forEach(c => { c.kind = c.kind || (/\/movie\//i.test(c.url) || /^(movies?|filmes?|vod)\b/i.test(c.group) ? 'vod' : /\/series\//i.test(c.url) ? 'series' : 'live'); c.key = hash((c.name || '') + '|' + c.url); if (c.kind === 'live' && c.num) used.add(c.num); });
  let n = 1; list.forEach(c => { if (c.kind !== 'live') { c.num = 0; return; } if (!c.num) { while (used.has(n)) n++; c.num = n; used.add(n); } });
  return list;
}
async function fetchText(u, force) { const r = await fetch(proxied(u, true === force || !!S.set.proxy), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }
async function loadSource(src) {
  if (src.type === 'xtream') {
    const base = src.server.replace(/\/+$/, ''), api = a => fetchJson(`${base}/player_api.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}&action=${a}`);
    const [cats, live, vod, vcats, ser, scats] = await Promise.all([api('get_live_categories'), api('get_live_streams'), api('get_vod_streams').catch(() => []), api('get_vod_categories').catch(() => []), api('get_series').catch(() => []), api('get_series_categories').catch(() => [])]);
    const cm = {}, vm = {}, sm = {}; (scats || []).forEach(c => sm[c.category_id] = c.category_name); (cats || []).forEach(c => cm[c.category_id] = c.category_name); (vcats || []).forEach(c => vm[c.category_id] = c.category_name);
    const list = (live || []).map(x => ({ name: x.name, logo: x.stream_icon || '', group: cm[x.category_id] || '', tvg: x.epg_channel_id || '', num: parseInt(x.num, 10) || 0, url: `${base}/live/${encodeURIComponent(src.user)}/${encodeURIComponent(src.pass)}/${x.stream_id}.m3u8`, kind: 'live' }))
      .concat((vod || []).map(x => ({ name: x.name, logo: x.stream_icon || '', group: vm[x.category_id] || 'Movies', tvg: '', num: 0, url: `${base}/movie/${encodeURIComponent(src.user)}/${encodeURIComponent(src.pass)}/${x.stream_id}.${x.container_extension || 'mp4'}`, kind: 'vod' })))
      .concat((ser || []).map(x => ({ name: x.name, logo: x.cover || '', group: sm[x.category_id] || 'Series', tvg: '', num: 0, url: 'xtream-series:' + x.series_id, seriesId: x.series_id, kind: 'series' })));
    return { list: finish(list), epg: src.epg || `${base}/xmltv.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}` };
  }
  const text = src.text != null ? src.text : await fetchText(src.url, true), p = parseM3U(text); return { list: finish(p.list), epg: src.epg || p.epg };
}
async function fetchJson(u) { const r = await fetch(proxied(u, true === !!S.set.proxy), { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }

/* ---------- TV guide (XMLTV) ---------- */
const decodeXml = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(amp|lt|gt|quot|apos|#39);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }[k]));
function xtime(s) { const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\s*([+-]\d{4})?/.exec(s || ''); if (!m) return 0; let off = 0; if (m[7]) off = (m[7][0] === '-' ? -1 : 1) * (parseInt(m[7].slice(1, 3), 10) * 60 + parseInt(m[7].slice(3, 5), 10)) * 60000; return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - off; }
function parseXMLTV(xml) {
  const now = Date.now(), res = {}, re = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g; let m;
  while ((m = re.exec(xml))) {
    const a = {}; m[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => { a[k] = v; });
    const s = xtime(a.start), e = xtime(a.stop); if (!e || e < now - 3600e3 || s > now + 24 * 3600e3) continue;
    const tm = /<title[^>]*>([\s\S]*?)<\/title>/.exec(m[2]); (res[a.channel] = res[a.channel] || []).push({ s, e, t: tm ? decodeXml(tm[1]).trim() : '' });
  }
  Object.keys(res).forEach(k => res[k].sort((x, y) => x.s - y.s)); return res;
}
async function loadEpg(id, url) {
  if (!url) return; const cache = await idbGet('epg:' + id);
  if (cache && Date.now() - cache.at < 6 * 3600e3) { S.epg = cache.data; render(); return; }
  try {
    const r = await fetch(proxied(url, !!S.set.proxy), { cache: 'no-store' }); if (!r.ok) return; let buf = new Uint8Array(await r.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b && window.DecompressionStream) { const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))); buf = new Uint8Array(await ds.arrayBuffer()); }
    const data = parseXMLTV(new TextDecoder().decode(buf)); S.epg = data; idbSet('epg:' + id, { at: Date.now(), data }); render(); if (S.cur) showInfo(S.cur);
  } catch (e) { /* guide is optional */ }
}
const epgFor = c => S.epg[c.tvg] || S.epg[(c.name || '').toLowerCase()] || null;
function nowNext(c) { const l = epgFor(c); if (!l) return null; const n = Date.now(); const i = l.findIndex(p => p.e > n); if (i < 0) return null; const cur = l[i].s <= n ? l[i] : null; return { now: cur, next: cur ? l[i + 1] : l[i] }; }
const hm = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ---------- sources & channels ---------- */
const curSrc = () => S.sources.find(x => x.id === S.srcId) || S.sources[0];
async function selectSource(id, refresh) {
  const src = S.sources.find(x => x.id === id); if (!src) { S.channels = []; S.srcId = ''; indexChannels(); render(); return; }
  S.srcId = id; LS.set('ap.src', id); S.epg = {}; let data = refresh ? null : await idbGet('ch:' + id);
  if (!data) { $('#list').innerHTML = `<div class="empty">${t('Loading…')}</div>`; try { data = await loadSource(src); await idbSet('ch:' + id, data); } catch (e) { S.channels = []; indexChannels(); render(); $('#list').innerHTML = `<div class="empty"><h3>${t('Could not load the playlist')}</h3><p>${esc(e.message)}</p><p class="mut" style="font-size:13px">${LANG === 'pt' ? 'Muitos servidores bloqueiam páginas web (CORS). Experimenta o link auxiliar em Definições, ou outro formato.' : 'Many servers block web pages (CORS). Try the helper link in Settings, or another format.'}</p></div>`; return; } }
  S.channels = data.list; src.epgUrl = data.epg; indexChannels(); S.group = 'all'; S.shown = 250; render(); loadEpg(id, data.epg);
  if (S.last) { const c = S.byKey[S.last]; if (c) { S.cur = c; showInfo(c); } }
}
function indexChannels() { S.byNum = {}; S.byKey = {}; S.channels.forEach(c => { S.byKey[c.key] = c; if (c.kind === 'live' && c.num && !S.byNum[c.num]) S.byNum[c.num] = c; }); }
function renderSources() { const s = $('#src'); s.innerHTML = S.sources.length ? S.sources.map(x => `<option value="${x.id}" ${x.id === S.srcId ? 'selected' : ''}>${esc(x.name)}</option>`).join('') : `<option>—</option>`; }
const favList = () => S.favs.map(k => S.byKey[k]).filter(Boolean);
function baseList() {
  const g = S.group; let l;
  if (g === 'fav') l = favList(); else if (g === 'recent') l = S.recent.map(k => S.byKey[k]).filter(Boolean);
  else if (g === 'all') l = S.channels.filter(c => c.kind === 'live'); else if (g.startsWith('v:')) l = S.channels.filter(c => c.kind === 'vod' && (c.group || '—') === g.slice(2)); else if (g.startsWith('s:')) l = S.channels.filter(c => c.kind === 'series' && (c.group || '—') === g.slice(2)); else if (g === '_vod') l = S.channels.filter(c => c.kind === 'vod'); else if (g === '_series') l = S.channels.filter(c => c.kind === 'series');
  else l = S.channels.filter(c => c.kind === 'live' && c.group === g.slice(2));
  return l;
}
function shownNum(c) { if (c.kind !== 'live') return ''; if (S.set.numberMode === 'favs') { const i = S.favs.indexOf(c.key); return i < 0 ? '' : i + 1; } return c.num || ''; }
function filtered() { let l = baseList(); const q = S.q.trim().toLowerCase(); if (q) l = l.filter(c => (c.name || '').toLowerCase().includes(q) || String(shownNum(c)) === q); return l; }

/* ---------- rendering ---------- */
const tabOf = g => (g === '_vod' || g.startsWith('v:')) ? 'vod' : (g === '_series' || g.startsWith('s:')) ? 'series' : 'live';
function catItems(tab) {
  const cnt = k => { const o = {}; S.channels.filter(c => c.kind === k).forEach(c => { const g = c.group || '—'; o[g] = (o[g] || 0) + 1; }); return o; };
  if (tab === 'live') { const o = cnt('live'), n = S.channels.filter(c => c.kind === 'live').length; return [{ id: 'fav', label: '★ ' + t('Favourites'), n: favList().length }, { id: 'recent', label: '🕒 ' + t('Recent'), n: S.recent.filter(k => S.byKey[k]).length }, { id: 'all', label: t('All channels'), n }].concat(Object.keys(o).sort().map(g => ({ id: 'g:' + g, label: g, n: o[g] }))); }
  const k = tab === 'vod' ? 'vod' : 'series', o = cnt(k), n = S.channels.filter(c => c.kind === k).length;
  return [{ id: tab === 'vod' ? '_vod' : '_series', label: t(tab === 'vod' ? 'Movies' : 'Series'), n }].concat(Object.keys(o).sort().map(g => ({ id: (tab === 'vod' ? 'v:' : 's:') + g, label: g, n: o[g] })));
}
function renderGroups() {
  const tab = tabOf(S.group), has = k => S.channels.some(c => c.kind === k), items = catItems(tab);
  const item = it => `<button data-g="${esc(it.id)}" class="${S.group === it.id ? 'on' : ''}"><span>${esc(it.label)}</span><small>${it.n}</small></button>`;
  const tabs = [['live', '📡 ' + t('TV')], ['vod', '🎬 ' + t('Movies')], ['series', '📺 ' + t('Series')]].filter(x => x[0] === 'live' || has(x[0] === 'vod' ? 'vod' : 'series'));
  const cur = items.find(x => x.id === S.group) || items[0];
  $('#groups').innerHTML = `<div class="tabs3">${tabs.map(x => `<button data-tab="${x[0]}" class="${x[0] === tab ? 'on' : ''}">${x[1]}</button>`).join('')}</div>` +
    `<button class="catbtn" id="catBtn">☰ <span>${esc(cur ? cur.label : t('Categories'))}</span> ▾</button>` +
    (items.length > 12 ? `<input id="gq" class="gq" placeholder="${t('Filter categories…')}">` : '') + `<div class="cats">${items.map(item).join('')}</div>`;
  const pick = id => { S.group = id; S.shown = 250; render(); $('#list').scrollTop = 0; };
  $$('#groups .cats button').forEach(b => b.onclick = () => pick(b.dataset.g));
  $$('#groups .tabs3 button').forEach(b => b.onclick = () => pick(b.dataset.tab === 'live' ? 'all' : b.dataset.tab === 'vod' ? '_vod' : '_series'));
  const gq = $('#gq'); if (gq) gq.oninput = () => { const q = gq.value.trim().toLowerCase(); $$('#groups .cats button').forEach(b => b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none'); };
  $('#catBtn').onclick = () => {
    openDlg(`<h2>${t('Categories')}</h2><input id="dq" placeholder="${t('Filter categories…')}"><div class="catlist">${items.map(item).join('')}</div><div class="row"><button class="btn" id="dx">OK</button></div>`);
    const f = () => { const q = $('#dq').value.trim().toLowerCase(); $$('.catlist button', dlg).forEach(b => b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none'); };
    $('#dq').oninput = f; $('#dx').onclick = () => dlg.close(); $$('.catlist button', dlg).forEach(b => b.onclick = () => { dlg.close(); pick(b.dataset.g); });
  };
}
function renderList() {
  const box = $('#list'), l = filtered();
  if (!S.sources.length) { box.innerHTML = `<div class="empty"><div style="font-size:42px">📺</div><h3>${t('Welcome to AntunesPlayer')}</h3><p>${t('AntunesPlayer plays the streams you give it — it comes with no channels. Add your own playlist, or look around with free test streams.')}</p><p><button class="btn p" id="eAdd">${t('Add playlist')}</button> <button class="btn" id="eDemo">${t('Try demo channels')}</button></p></div>`; $('#eAdd').onclick = addDialog; $('#eDemo').onclick = addDemo; return; }
  if (!l.length) { box.innerHTML = `<div class="empty"><h3>${t('Nothing found')}</h3></div>`; return; }
  const grid = tabOf(S.group) !== 'live'; box.classList.toggle('grid', grid);
  if (grid) { box.innerHTML = l.slice(0, S.shown).map(c => { const fav = S.favs.includes(c.key), pos = POS[c.key], ini = esc((c.name || '?').charAt(0)); return `<div class="ch pc ${S.cur && S.cur.key === c.key ? 'on' : ''}" tabindex="0" data-k="${c.key}"><div class="po">${c.logo ? `<img loading="lazy" src="${esc(c.logo)}" alt="" onerror="this.outerHTML='<span class=lg>${ini}</span>'">` : `<span class="lg">${ini}</span>`}${pos ? '<i class="rs">▶</i>' : ''}<button class="star ${fav ? 'on' : ''}" data-s="${c.key}" aria-label="Favourite">${fav ? '★' : '☆'}</button></div><b>${esc(c.name)}</b></div>`; }).join('') + (l.length > S.shown ? `<button class="more" id="more">${t('Show more')} (${l.length - S.shown})</button>` : ''); }
  else box.innerHTML = l.slice(0, S.shown).map(c => { const nn = nowNext(c), fav = S.favs.includes(c.key), n = shownNum(c), pr = nn && nn.now ? Math.round((Date.now() - nn.now.s) / (nn.now.e - nn.now.s) * 100) : 0;
    return `<div class="ch ${S.cur && S.cur.key === c.key ? 'on' : ''}" tabindex="0" data-k="${c.key}"><span class="n">${n}</span>${c.logo ? `<img loading="lazy" src="${esc(c.logo)}" alt="" onerror="this.outerHTML='<span class=lg>${esc((c.name || '?').charAt(0))}</span>'">` : `<span class="lg">${esc((c.name || '?').charAt(0))}</span>`}<div class="t"><b>${esc(c.name)}</b><span>${nn && nn.now ? esc(nn.now.t) : esc(c.group || '')}</span>${nn && nn.now ? `<div class="pb"><i style="width:${pr}%"></i></div>` : ''}</div><span class="ctl2">${S.group === 'fav' ? `<button class="mv" data-mv="-1" data-k2="${c.key}" aria-label="Move up">▲</button><button class="mv" data-mv="1" data-k2="${c.key}" aria-label="Move down">▼</button>` : ''}<button class="star ${fav ? 'on' : ''}" data-s="${c.key}" aria-label="Favourite">${fav ? '★' : '☆'}</button></span></div>`; }).join('') + (l.length > S.shown ? `<button class="more" id="more">${t('Show more')} (${l.length - S.shown})</button>` : '');
  $$('.ch', box).forEach(r => { r.onclick = e => { if (e.target.closest('.star') || e.target.closest('.mv')) return; open1(S.byKey[r.dataset.k]); }; r.onkeydown = e => { if (e.altKey && S.group === 'fav' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveFav(r.dataset.k, e.key === 'ArrowUp' ? -1 : 1); const x = $(`.ch[data-k="${r.dataset.k}"]`); if (x) x.focus(); return; } if (e.key === 'Enter') { e.preventDefault(); open1(S.byKey[r.dataset.k]); } }; });
  $$('.star', box).forEach(b => b.onclick = e => { e.stopPropagation(); toggleFav(S.byKey[b.dataset.s]); });
  $$('.mv', box).forEach(b => b.onclick = e => { e.stopPropagation(); moveFav(b.dataset.k2, +b.dataset.mv); const f = $(`.mv[data-k2="${b.dataset.k2}"][data-mv="${b.dataset.mv}"]`); if (f) f.focus(); });
  const m = $('#more'); if (m) m.onclick = () => { S.shown += 250; renderList(); };
}
function render() { renderSources(); renderGroups(); renderList(); }

/* ---------- favourites ---------- */
function toggleFav(c) { if (!c) return; const i = S.favs.indexOf(c.key); if (i < 0) { S.favs.push(c.key); toast(t('Added to favourites') + (S.set.numberMode === 'favs' ? ` · ${S.favs.length}` : '')); } else { S.favs.splice(i, 1); toast(t('Removed from favourites')); } LS.set('ap.favs', S.favs); render(); updateFavBtn(); if (S.cur) showOsd(S.cur); }
const open1 = c => { if (c && c.seriesId) openSeries(c); else play(c); };
async function openSeries(c) {
  const src = S.sources.find(x => x.id === S.srcId); if (!src || src.type !== 'xtream') return;
  const base = src.server.replace(/\/+$/, ''), q = encodeURIComponent;
  openDlg(`<h2>${esc(c.name)}</h2><p class="mut">${t('Loading…')}</p>`);
  try {
    const info = await fetchJson(`${base}/player_api.php?username=${q(src.user)}&password=${q(src.pass)}&action=get_series_info&series_id=${q(c.seriesId)}`);
    const eps = info.episodes || {}, seasons = Object.keys(eps).sort((a, b) => a - b);
    if (!seasons.length) { openDlg(`<h2>${esc(c.name)}</h2><p class="mut">${t('No episodes found')}</p><div class="row"><button class="btn" id="dx">OK</button></div>`); $('#dx').onclick = () => dlg.close(); return; }
    const draw = sn => { $('#epl').innerHTML = (eps[sn] || []).map((e, i) => `<button class="ep" data-i="${i}"><b>${esc(e.episode_num || i + 1)}</b><span>${esc(e.title || '')}</span></button>`).join(''); $$('#epl .ep').forEach(b => b.onclick = () => { const e = eps[sn][+b.dataset.i], url = `${base}/series/${q(src.user)}/${q(src.pass)}/${e.id}.${e.container_extension || 'mp4'}`; const ep = { name: `${c.name} · S${sn}E${e.episode_num || +b.dataset.i + 1}`, logo: c.logo, group: c.group, url, kind: 'vod', num: 0, key: hash(c.name + '|' + url) }; S.byKey[ep.key] = ep; dlg.close(); play(ep); }); };
    openDlg(`<h2>${esc(c.name)}</h2><label>${t('Season')}</label><select id="sn">${seasons.map(x => `<option value="${esc(x)}">${t('Season')} ${esc(x)}</option>`).join('')}</select><label>${t('Episodes')}</label><div id="epl" class="catlist"></div><div class="row"><button class="btn" id="dx">OK</button></div>`);
    $('#sn').onchange = e => draw(e.target.value); $('#dx').onclick = () => dlg.close(); draw(seasons[0]);
  } catch (e) { openDlg(`<h2>${esc(c.name)}</h2><p class="mut">${esc(e.message)}</p><div class="row"><button class="btn" id="dx">OK</button></div>`); $('#dx').onclick = () => dlg.close(); }
}
function moveFav(k, d) { const i = S.favs.indexOf(k), j = i + d; if (i < 0 || j < 0 || j >= S.favs.length) return; S.favs.splice(j, 0, S.favs.splice(i, 1)[0]); LS.set('ap.favs', S.favs); renderList(); }
function updateFavBtn() { const f = S.cur && S.favs.includes(S.cur.key); $('#cFav').textContent = f ? '★' : '☆'; }

/* ---------- player ---------- */
const v = $('#v'); let hls = null, mpg = null, osdT, numBuf = '', numT, retried = false, rec = null;
function destroyPlayer() { if (hls) { try { hls.destroy(); } catch (e) { } hls = null; } if (mpg) { try { mpg.destroy(); } catch (e) { } mpg = null; } v.removeAttribute('src'); try { v.load(); } catch (e) { } }
const spin = on => { $('#spin').hidden = !on; };
function showMsg(title, text, retry) { spin(false); const m = $('#msg'); m.innerHTML = `<b>${esc(title)}</b><p>${text}</p>${retry ? `<div><button class="btn p" id="mRetry">${t('Retry')}</button></div>` : ''}`; m.hidden = false; const b = $('#mRetry'); if (b) b.onclick = () => play(S.cur, true); }
function whyHtml(url) { const mixed = location.protocol === 'https:' && /^http:/i.test(url); return mixed ? (LANG === 'pt' ? 'Esta emissão usa <code>http</code> e esta página usa <code>https</code>, por isso o navegador bloqueia. Usa um link <code>https</code>, ou abre o AntunesPlayer por <code>http</code> na tua rede.' : 'This stream uses plain <code>http</code> but this page is <code>https</code>, so the browser blocks it. Use an <code>https</code> link, or open AntunesPlayer over <code>http</code> on your own network.') : (LANG === 'pt' ? 'O servidor pode bloquear páginas web (CORS), o formato pode não ser suportado ou o canal está offline.' : 'The server may block web pages (CORS), the format may be unsupported, or the channel is offline.'); }
async function play(c, isRetry) {
  if (!c) return; if (S.cur && S.cur.key !== c.key) S.last = S.cur.key; if (!isRetry) { retried = false; } if (S.cur && S.cur.key !== c.key) LS.set('ap.last', S.cur.key);
  S.cur = c; LS.set('ap.cur', c.key); S.recent = [c.key].concat(S.recent.filter(k => k !== c.key)).slice(0, 30); LS.set('ap.recent', S.recent);
  stopRec(true); destroyPlayer(); $('#screen').classList.toggle('vod', c.kind !== 'live'); $('#msg').hidden = true; spin(true); showOsd(c); showInfo(c); updateFavBtn(); $$('#list .ch').forEach(r => r.classList.toggle('on', r.dataset.k === c.key));
  const url = proxied(c.url), isHls = /m3u8/i.test(c.url), isTs = c.kind === 'live' && !isHls && !/\.(mp4|mkv|webm|avi|mov)(\?|$)/i.test(c.url);
  try {
    if (isHls) {
      if (!window.Hls && !v.canPlayType('application/vnd.apple.mpegurl')) await loadScript('js/hls.min.js');
      if (window.Hls && Hls.isSupported()) { hls = new Hls(Object.assign({ lowLatencyMode: true, maxBufferLength: 20 }, nativeHttp() ? { loader: NativeLoader } : {})); hls.loadSource(url); hls.attachMedia(v); hls.on(Hls.Events.ERROR, (_, d) => { if (!d.fatal) return; if (d.type === Hls.ErrorTypes.NETWORK_ERROR && !retried) { retried = true; hls.startLoad(); } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !retried) { retried = true; hls.recoverMediaError(); } else showMsg(t('Could not play this'), whyHtml(c.url), true); }); }
      else v.src = url;
    } else if (isTs) {
      if (!window.mpegts) await loadScript('js/mpegts.min.js');
      if (window.mpegts && mpegts.isSupported()) { mpg = mpegts.createPlayer({ type: 'mpegts', isLive: true, url }, { enableWorker: true, liveBufferLatencyChasing: true }); mpg.attachMediaElement(v); mpg.load(); mpg.on(mpegts.Events.ERROR, () => showMsg(t('Could not play this'), whyHtml(c.url), true)); }
      else v.src = url;
    } else v.src = url;
    await v.play().catch(() => { });
  } catch (e) { showMsg(t('Could not play this'), whyHtml(c.url), true); }
}
v.addEventListener('playing', () => { spin(false); $('#msg').hidden = true; }); v.addEventListener('waiting', () => { if (S.cur) spin(true); }); v.addEventListener('error', () => { if (S.cur && v.getAttribute('src')) showMsg(t('Could not play this'), whyHtml(S.cur.url), true); });
function showOsd(c) {
  const nn = nowNext(c), n = shownNum(c); $('#osdN').textContent = n === '' ? '·' : n; $('#osdT').textContent = c.name; $('#osdS').textContent = nn && nn.now ? `${t('Now')}: ${nn.now.t}${nn.next ? ' · ' + t('Next') + ': ' + nn.next.t : ''}` : (c.kind === 'live' ? t('Live') : c.group);
  const o = $('#osd'); o.hidden = false; $('#screen').classList.add('show'); clearTimeout(osdT); osdT = setTimeout(() => { o.hidden = true; $('#screen').classList.remove('show'); }, 4200);
}
function showInfo(c) {
  const nn = nowNext(c), l = epgFor(c), n = Date.now(), up = l ? l.filter(p => p.e > n).slice(0, 6) : [];
  $('#info').innerHTML = `<h2>${esc(c.name)}</h2><div class="mut">${esc(c.group || '')}</div>` + (up.length ? `<div class="epg">${up.map(p => `<div><time>${hm(p.s)}</time><span>${esc(p.t)}</span></div>`).join('')}</div>` : `<p class="mut">${t('No programme guide for this channel')}</p>`) + (c.kind === 'vod' ? `<p><button class="btn" id="dl">⬇ ${t('Download')}</button></p>` : '');
  const d = $('#dl'); if (d) d.onclick = () => { const a = document.createElement('a'); a.href = proxied(c.url); a.download = (c.name || 'video') + '.mp4'; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); };
}
function zapList() { return S.group === 'fav' ? favList() : baseList().filter(c => c.kind === 'live'); }
function zap(dir) { const l = zapList(); if (!l.length) return; let i = S.cur ? l.findIndex(c => c.key === S.cur.key) : -1; i = i < 0 ? (dir > 0 ? 0 : l.length - 1) : (i + dir + l.length) % l.length; play(l[i]); const r = $(`#list .ch[data-k="${l[i].key}"]`); if (r) r.scrollIntoView({ block: 'nearest' }); }
function byNumber(n) { if (S.set.numberMode === 'favs') return favList()[n - 1]; return S.byNum[n]; }
function numKey(d) {
  numBuf = (numBuf + d).slice(0, 4); const n = $('#num'); n.hidden = false; const c = byNumber(+numBuf); n.innerHTML = `${numBuf}<small>${c ? esc(c.name) : t('No channel')}</small>`; clearTimeout(numT); numT = setTimeout(commitNum, 1500);
}
function commitNum() { clearTimeout(numT); const n = +numBuf; numBuf = ''; $('#num').hidden = true; if (!n && n !== 0) return; const c = byNumber(n); if (c) play(c); else toast(t('No channel') + ' ' + n); }
function lastChannel() { const k = LS.get('ap.last', ''), c = S.byKey[S.last || k]; if (c && (!S.cur || c.key !== S.cur.key)) play(c); else toast(t('Last channel') + ' —'); }

/* ---------- quick list inside the player (works in full screen) ---------- */
let quick = null;
function openQuick() {
  closeQuick(); const l = zapList(); if (!l.length) return; const q = document.createElement('div'); q.id = 'quick'; q.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:min(360px,80%);background:rgba(10,12,16,.92);backdrop-filter:blur(8px);overflow:auto;z-index:4';
  q.innerHTML = l.slice(0, 400).map(c => `<div class="ch ${S.cur && S.cur.key === c.key ? 'on' : ''}" tabindex="0" data-k="${c.key}" style="color:#fff"><span class="n">${shownNum(c)}</span><span class="lg">${esc((c.name || '?').charAt(0))}</span><div class="t"><b>${esc(c.name)}</b></div><span></span></div>`).join('');
  $('#screen').appendChild(q); quick = q; $$('.ch', q).forEach(r => { r.onclick = () => { play(S.byKey[r.dataset.k]); closeQuick(); }; r.onkeydown = e => { if (e.key === 'Enter') { play(S.byKey[r.dataset.k]); closeQuick(); } }; }); const on = $('.ch.on', q) || $('.ch', q); if (on) { on.focus(); on.scrollIntoView({ block: 'center' }); }
}
function closeQuick() { if (quick) { quick.remove(); quick = null; } }

/* ---------- recording (browser capture; works only when the stream allows it) ---------- */
function stopRec(silent) { if (!rec) return; const r = rec; rec = null; try { r.mr.stop(); } catch (e) { } $('#cRec').classList.remove('rec'); if (silent) r.silent = true; }
function toggleRec() {
  if (rec) { stopRec(); return; }
  try {
    const st = (v.captureStream || v.mozCaptureStream).call(v), types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'], mt = types.find(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x)); if (!mt) throw new Error('no recorder');
    const mr = new MediaRecorder(st, { mimeType: mt }), chunks = [], name = (S.cur ? S.cur.name : 'recording').replace(/[^\w-]+/g, '_');
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); }; mr.onstop = () => { if (!chunks.length) return; const b = new Blob(chunks, { type: 'video/webm' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${name}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.webm`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); toast(t('Recording saved')); };
    mr.start(1000); rec = { mr }; $('#cRec').classList.add('rec'); toast(t('Recording…'));
  } catch (e) { toast(t('Recording is not possible for this stream')); }
}

/* ---------- dialogs ---------- */
const dlg = $('#dlg');
function openDlg(html) { dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
function addDemo() {
  const demo = `#EXTM3U\n#EXTINF:-1 tvg-chno="1" group-title="Demo",Big Buck Bunny\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8\n#EXTINF:-1 tvg-chno="2" group-title="Demo",Apple test stream\nhttps://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8\n#EXTINF:-1 tvg-chno="3" group-title="Demo",Sintel\nhttps://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8\n#EXTINF:-1 tvg-chno="4" group-title="Demo",Tears of Steel\nhttps://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8\n#EXTINF:-1 tvg-chno="5" group-title="Demo",Akamai live test\nhttps://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8\n#EXTINF:-1 group-title="Movies",Big Buck Bunny (mp4)\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\n#EXTINF:-1 group-title="Movies",Elephants Dream (mp4)\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4\n`;
  addSource({ name: 'Demo channels', type: 'm3u', text: demo });
}
async function addSource(src) {
  src.id = 's' + Date.now().toString(36); S.sources.push(src); LS.set('ap.sources', S.sources); if (dlg.open) dlg.close(); await selectSource(src.id, true); toast(t('Playlist added'));
  const s = S.sources.find(x => x.id === src.id); if (s && s.text != null) { /* keep pasted text so it can be refreshed offline */ }
}
function addDialog() {
  let tab = 'url';
  const draw = () => {
    openDlg(`<h2>${t('Add playlist')}</h2><div class="tabs"><button data-t="url" class="${tab === 'url' ? 'on' : ''}">${t('Playlist link (M3U / M3U8)').split(' (')[0]}</button><button data-t="text" class="${tab === 'text' ? 'on' : ''}">${t('Paste or upload')}</button><button data-t="xt" class="${tab === 'xt' ? 'on' : ''}">${t('Xtream login')}</button></div>
    <label>${t('Name')}</label><input id="aName" placeholder="My TV">` +
      (tab === 'url' ? `<label>${t('Playlist link (M3U / M3U8)')}</label><input id="aUrl" type="url" placeholder="https://…/playlist.m3u8">` : tab === 'text' ? `<label>${t('Playlist text')}</label><textarea id="aText" rows="5" placeholder="#EXTM3U …"></textarea><label>${t('or choose a file')}</label><input id="aFile" type="file" accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl">` : `<label>${t('Server (with http/https)')}</label><input id="xS" placeholder="http://server:8080"><label>${t('Username')}</label><input id="xU" autocomplete="off"><label>${t('Password')}</label><input id="xP" type="password" autocomplete="off">`) +
      `<label>${t('TV guide link (XMLTV, optional)')}</label><input id="aEpg" type="url" placeholder="https://…/guide.xml"><div class="row"><button class="btn" id="aCancel">${t('Cancel')}</button><button class="btn p" id="aOk">${t('Add')}</button></div>`);
    $$('.tabs button', dlg).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); }); $('#aCancel').onclick = () => dlg.close();
    $('#aOk').onclick = async () => {
      const name = ($('#aName').value || '').trim() || 'My TV', epg = ($('#aEpg').value || '').trim();
      if (tab === 'url') { const u = ($('#aUrl').value || '').trim(); if (!/^https?:\/\//i.test(u)) { toast(t('Fill in the fields')); return; } addSource({ name, type: 'm3u', url: u, epg }); }
      else if (tab === 'text') { let txt = $('#aText').value, f = $('#aFile').files[0]; if (f) txt = await f.text(); if (!txt || !/#EXTINF/i.test(txt)) { toast(t('Fill in the fields')); return; } addSource({ name, type: 'm3u', text: txt, epg }); }
      else { const server = $('#xS').value.trim(), user = $('#xU').value.trim(), pass = $('#xP').value; if (!/^https?:\/\//i.test(server) || !user) { toast(t('Fill in the fields')); return; } addSource({ name, type: 'xtream', server, user, pass, epg }); }
    };
  };
  draw();
}
function settingsDialog() {
  const s = S.set;
  openDlg(`<h2>${t('Settings')}</h2><label>${t('Theme')}</label><select id="sTheme">${THEMES.map(x => `<option value="${x[0]}" ${s.theme === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>
  <label>${t('Number keys jump to')}</label><select id="sNum"><option value="chno" ${s.numberMode === 'chno' ? 'selected' : ''}>${t('Channel numbers from the playlist')}</option><option value="favs" ${s.numberMode === 'favs' ? 'selected' : ''}>${t('My favourites, in order')}</option></select>
  <label>${t('Big TV mode')}</label><select id="sTv"><option value="0" ${!s.tv ? 'selected' : ''}>${t('No')}</option><option value="1" ${s.tv ? 'selected' : ''}>${t('Yes')}</option></select>
  <label>${t('Language')}</label><select id="sLang"><option value="en" ${LANG === 'en' ? 'selected' : ''}>English</option><option value="pt" ${LANG === 'pt' ? 'selected' : ''}>Português</option></select>
  <label>${t('Helper link for blocked playlists (optional)')}</label><input id="sProxy" value="${esc(s.proxy)}" placeholder="https://your-helper.example/?url={url}"><label>${t('Also use it for streams')}</label><select id="sPS"><option value="0" ${!s.proxyStreams ? 'selected' : ''}>${t('No')}</option><option value="1" ${s.proxyStreams ? 'selected' : ''}>${t('Yes')}</option></select>
  <h2 style="margin-top:18px">${t('Playlists')}</h2>${S.sources.map(x => `<div style="display:flex;gap:6px;align-items:center;margin:6px 0"><b style="flex:1">${esc(x.name)}</b><button class="btn" data-r="${x.id}">${t('Refresh')}</button><button class="btn" data-d="${x.id}">${t('Delete')}</button></div>`).join('') || '<p class="mut">—</p>'}
  <h2 style="margin-top:18px">${t('Keyboard & remote')}</h2><div class="keys"><kbd>0–9</kbd><span>${t('jump to that channel')}</span><kbd>↑ ↓ / CH±</kbd><span>${t('next / previous channel')}</span><kbd>Enter</kbd><span>${t('channel list')}</span><kbd>F</kbd><span>${t('favourite on/off')}</span><kbd>L</kbd><span>${t('last channel')}</span><kbd>M</kbd><span>${t('mute')}</span><kbd>R</kbd><span>${t('record (needs a browser that allows it)')}</span><kbd>Z</kbd><span>${t('full screen')}</span></div>
  <div class="row"><button class="btn p" id="sOk">${t('Close')}</button></div>`);
  const chg = () => { s.theme = $('#sTheme').value; s.numberMode = $('#sNum').value; s.tv = $('#sTv').value === '1'; s.proxy = $('#sProxy').value.trim(); s.proxyStreams = $('#sPS').value === '1'; saveSet(); applyLook(); render(); };
  $$('#sTheme,#sNum,#sTv,#sPS', dlg).forEach(e => e.onchange = chg); $('#sProxy').onchange = chg; $('#sLang').onchange = e => { LS.set('ap.lang', e.target.value); location.reload(); };
  $$('[data-r]', dlg).forEach(b => b.onclick = () => { dlg.close(); selectSource(b.dataset.r, true); }); $$('[data-d]', dlg).forEach(b => b.onclick = () => { const id = b.dataset.d; S.sources = S.sources.filter(x => x.id !== id); LS.set('ap.sources', S.sources); idbDel('ch:' + id); idbDel('epg:' + id); dlg.close(); selectSource(S.sources[0] && S.sources[0].id); });
  $('#sOk').onclick = () => dlg.close();
}
function applyLook() { document.documentElement.dataset.theme = S.set.theme; document.body.classList.toggle('tv', !!S.set.tv); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1115'; }

/* ---------- wiring ---------- */
$('#bAdd').onclick = addDialog; $('#bSet').onclick = settingsDialog; $('#src').onchange = e => selectSource(e.target.value); $('#q').oninput = e => { S.q = e.target.value; S.shown = 250; renderList(); };
$('#cFav').onclick = () => toggleFav(S.cur); $('#cPrev').onclick = () => zap(-1); $('#cNext').onclick = () => zap(1); $('#cRec').onclick = toggleRec; $('#cList').onclick = () => quick ? closeQuick() : openQuick();
$('#cMute').onclick = () => { v.muted = !v.muted; $('#cMute').textContent = v.muted ? '🔇' : '🔊'; };
const isFull = () => !!document.fullscreenElement || $('#screen').classList.contains('fake');
const fs = () => { const e = $('#screen'); if (NATIVE) { e.classList.toggle('fake'); document.body.classList.toggle('nofs', e.classList.contains('fake')); if (!e.classList.contains('fake')) closeQuick(); return; } if (document.fullscreenElement) document.exitFullscreen(); else if (e.requestFullscreen) e.requestFullscreen(); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); };
$('#cFs').onclick = fs; $('#v').ondblclick = fs;

/* ---------- player extras: pause, seek, resume, tracks, aspect, PiP ---------- */
const POS = LS.get('ap.pos', {}); let posT = 0;
const isVodNow = () => S.cur && S.cur.kind !== 'live';
const fmtT = x => { if (!isFinite(x) || x < 0) return '0:00'; x = Math.floor(x); const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s2 = x % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s2).padStart(2, '0'); };
function savePos() { if (!isVodNow() || !isFinite(v.duration) || v.duration < 60) return; const k = S.cur.key; if (v.currentTime > v.duration - 30) delete POS[k]; else POS[k] = Math.floor(v.currentTime); const ks = Object.keys(POS); if (ks.length > 300) delete POS[ks[0]]; LS.set('ap.pos', POS); }
v.addEventListener('timeupdate', () => { if (!isVodNow()) return; if (!seeking) $('#seek').value = v.duration ? Math.round(v.currentTime / v.duration * 1000) : 0; $('#tCur').textContent = fmtT(v.currentTime); $('#tDur').textContent = fmtT(v.duration); if (Date.now() - posT > 5000) { posT = Date.now(); savePos(); } });
v.addEventListener('loadedmetadata', () => { if (isVodNow() && POS[S.cur.key] > 10 && isFinite(v.duration) && POS[S.cur.key] < v.duration - 30) { v.currentTime = POS[S.cur.key]; toast(t('Resume') + ' ' + fmtT(POS[S.cur.key])); } });
v.addEventListener('pause', () => { $('#cPlay').textContent = '▶'; savePos(); }); v.addEventListener('play', () => { $('#cPlay').textContent = '⏸'; });
let seeking = false; const sk = $('#seek'); sk.oninput = () => { seeking = true; if (v.duration) $('#tCur').textContent = fmtT(sk.value / 1000 * v.duration); }; sk.onchange = () => { if (v.duration) v.currentTime = sk.value / 1000 * v.duration; seeking = false; };
const seekBy = d => { if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d)); };
const togglePlay = () => { if (v.paused) v.play().catch(() => { }); else v.pause(); };
$('#cPlay').onclick = togglePlay; $('#cBack').onclick = () => seekBy(-10); $('#cFwd').onclick = () => seekBy(10);
v.addEventListener('click', () => { if (isVodNow() && matchMedia('(hover:none)').matches === false) togglePlay(); });
const ASP = [['contain', 'Fit'], ['cover', 'Fill'], ['fill', 'Stretch']]; let aspI = 0;
$('#cAsp').onclick = () => { aspI = (aspI + 1) % ASP.length; v.style.objectFit = ASP[aspI][0]; toast(t(ASP[aspI][1])); };
$('#cPip').onclick = () => { try { if (document.pictureInPictureElement) document.exitPictureInPicture(); else v.requestPictureInPicture(); } catch (e) { toast('PiP ✕'); } };
$('#cTrk').onclick = () => {
  const au = [], su = []; let cur = { a: -1, s: -1 };
  if (hls) { (hls.audioTracks || []).forEach((x, i) => au.push({ i, n: x.name || x.lang || 'Audio ' + (i + 1) })); (hls.subtitleTracks || []).forEach((x, i) => su.push({ i, n: x.name || x.lang || 'Sub ' + (i + 1) })); cur = { a: hls.audioTrack, s: hls.subtitleTrack }; }
  else { if (v.audioTracks && v.audioTracks.length > 1) [...v.audioTracks].forEach((x, i) => { au.push({ i, n: x.label || x.language || 'Audio ' + (i + 1) }); if (x.enabled) cur.a = i; }); [...v.textTracks].filter(x => x.kind === 'subtitles' || x.kind === 'captions').forEach((x, i) => { su.push({ i, n: x.label || x.language || 'Sub ' + (i + 1) }); if (x.mode === 'showing') cur.s = i; }); }
  if (au.length < 2 && !su.length) { toast(t('No extra audio or subtitles')); return; }
  const btn = (kind, i, n, on) => `<button data-k="${kind}" data-i="${i}" class="${on ? 'on' : ''}"><span>${esc(n)}</span></button>`;
  openDlg(`<h2>${t('Audio')} / ${t('Subtitles')}</h2>` + (au.length > 1 ? `<label>${t('Audio')}</label><div class="catlist">${au.map(x => btn('a', x.i, x.n, x.i === cur.a)).join('')}</div>` : '') + (su.length ? `<label>${t('Subtitles')}</label><div class="catlist">${btn('s', -1, t('Off'), cur.s === -1)}${su.map(x => btn('s', x.i, x.n, x.i === cur.s)).join('')}</div>` : '') + `<div class="row"><button class="btn" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close();
  $$('.catlist button', dlg).forEach(b => b.onclick = () => { const i = +b.dataset.i; if (b.dataset.k === 'a') { if (hls) hls.audioTrack = i; else [...v.audioTracks].forEach((x, n) => x.enabled = n === i); } else { if (hls) hls.subtitleTrack = i; else [...v.textTracks].filter(x => x.kind === 'subtitles' || x.kind === 'captions').forEach((x, n) => x.mode = n === i ? 'showing' : 'disabled'); } dlg.close(); });
};
document.addEventListener('keydown', e => {
  if (dlg.open || e.ctrlKey || e.metaKey || e.altKey) return; const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const k = e.key, full = isFull();
  if (/^[0-9]$/.test(k)) { e.preventDefault(); numKey(k); return; }
  if (k === 'Enter' && numBuf) { e.preventDefault(); commitNum(); return; }
  if (quick && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); const a = $$('.ch', quick), i = a.indexOf(document.activeElement), n = a[Math.max(0, Math.min(a.length - 1, i + (k === 'ArrowDown' ? 1 : -1)))]; if (n) n.focus(); return; }
  if (k === 'Escape') { if (quick) { closeQuick(); return; } if (numBuf) { numBuf = ''; $('#num').hidden = true; } return; }
  if (isVodNow() && !numBuf) { if (k === ' ') { e.preventDefault(); togglePlay(); return; } if (k === 'ArrowLeft') { e.preventDefault(); seekBy(-10); return; } if (k === 'ArrowRight') { e.preventDefault(); seekBy(10); return; } }
  if (k === 'ChannelUp' || k === 'PageUp' || (full && k === 'ArrowUp')) { e.preventDefault(); zap(1); return; }
  if (k === 'ChannelDown' || k === 'PageDown' || (full && k === 'ArrowDown')) { e.preventDefault(); zap(-1); return; }
  if (full && (k === 'Enter' || k === 'ArrowRight')) { e.preventDefault(); quick ? closeQuick() : openQuick(); return; }
  if (full && k === 'ArrowLeft') { closeQuick(); return; }
  if (!full && (k === 'ArrowDown' || k === 'ArrowUp') && document.activeElement && document.activeElement.classList.contains('ch')) { e.preventDefault(); const a = document.activeElement, n = k === 'ArrowDown' ? a.nextElementSibling : a.previousElementSibling; if (n && n.classList.contains('ch')) n.focus(); return; }
  const lk = k.toLowerCase(); if (lk === 'f') toggleFav(S.cur); else if (lk === 'l' || k === 'Backspace') { e.preventDefault(); lastChannel(); } else if (lk === 'm') $('#cMute').click(); else if (lk === 'r') toggleRec(); else if (lk === 'z') fs(); else if (lk === 'i' && S.cur) showOsd(S.cur);
});
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) closeQuick(); });
$('#screen').addEventListener('mousemove', () => { $('#screen').classList.add('show'); clearTimeout(osdT); osdT = setTimeout(() => $('#screen').classList.remove('show'), 3000); });
if (/Tizen|Web0S|SmartTV|HbbTV|AFT|Android TV|CrKey/i.test(navigator.userAgent) && !('tv' in LS.get('ap.set', {}))) { S.set.tv = true; }
S.last = LS.get('ap.last', '') ; window.__player = { S, play, byNumber, numKey, zap, parseM3U, parseXMLTV, finish };
applyLook(); render(); if (S.sources.length) selectSource(S.srcId || S.sources[0].id);
})();
