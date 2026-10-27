/* AntunesPlayer — a small IPTV player. Bring your own playlist (M3U/M3U8 link or file, or Xtream login). No channels included. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

/* ---------- language ---------- */
const LANG = (LS.get('ap.lang', '') || navigator.language || 'en').slice(0, 2) === 'pt' ? 'pt' : 'en';
const PT = { 'Search channels…': 'Pesquisar canais…', 'Favourites': 'Favoritos', 'Recent': 'Recentes', 'All channels': 'Todos os canais', 'Movies': 'Filmes', 'Series': 'Séries', 'Add playlist': 'Adicionar lista', 'Settings': 'Definições', 'Cancel': 'Cancelar', 'Save': 'Guardar', 'Add': 'Adicionar', 'Close': 'Fechar', 'Delete': 'Apagar', 'Refresh': 'Atualizar', 'Playlist link (M3U / M3U8)': 'Link da lista (M3U / M3U8)', 'Paste or upload': 'Colar ou carregar', 'Xtream login': 'Login Xtream', 'Name': 'Nome', 'Server (with http/https)': 'Servidor (com http/https)', 'Username': 'Utilizador', 'Password': 'Palavra-passe', 'TV guide link (XMLTV, optional)': 'Link do guia de programação (XMLTV, opcional)', 'Playlist text': 'Texto da lista', 'or choose a file': 'ou escolhe um ficheiro', 'Welcome to AntunesPlayer': 'Bem-vindo ao AntunesPlayer', 'AntunesPlayer plays the streams you give it — it comes with no channels. Add your own playlist, or look around with free test streams.': 'O AntunesPlayer reproduz as listas que lhe deres — não traz canais. Adiciona a tua lista ou experimenta com emissões de teste gratuitas.', 'Try demo channels': 'Experimentar canais de demonstração', 'Nothing found': 'Nada encontrado', 'Show more': 'Mostrar mais', 'Last channel': 'Último canal', 'No channel': 'Sem canal', 'Added to favourites': 'Adicionado aos favoritos', 'Removed from favourites': 'Removido dos favoritos', 'Loading…': 'A carregar…', 'Could not play this': 'Não foi possível reproduzir', 'Retry': 'Tentar de novo', 'Look': 'Aspeto', 'Theme': 'Tema', 'Number keys jump to': 'As teclas numéricas vão para', 'Channel numbers from the playlist': 'Números dos canais da lista', 'My favourites, in order': 'Os meus favoritos, por ordem', 'Big TV mode': 'Modo TV (grande)', 'Network': 'Rede', 'Helper link for blocked playlists (optional)': 'Link auxiliar para listas bloqueadas (opcional)', 'Also use it for streams': 'Usar também nas emissões', 'Yes': 'Sim', 'No': 'Não', 'Playlists': 'Listas', 'Keyboard & remote': 'Teclado e comando', 'Number': 'Número', 'jump to that channel': 'ir para esse canal', 'next / previous channel': 'canal seguinte / anterior', 'channel list': 'lista de canais', 'favourite on/off': 'favorito sim/não', 'last channel': 'último canal', 'mute': 'sem som', 'record (needs a browser that allows it)': 'gravar (precisa de navegador que permita)', 'full screen': 'ecrã inteiro', 'Recording saved': 'Gravação guardada', 'Recording…': 'A gravar…', 'Recording is not possible for this stream': 'Não é possível gravar esta emissão', 'Download': 'Descarregar', 'Now': 'Agora', 'Next': 'A seguir', 'channels': 'canais', 'Language': 'Idioma', 'Playlist added': 'Lista adicionada', 'Could not load the playlist': 'Não foi possível carregar a lista', 'Fill in the fields': 'Preenche os campos', 'No programme guide for this channel': 'Sem guia para este canal', 'Live': 'Em direto', 'Full screen': 'Ecrã inteiro' };
Object.assign(PT, { 'Filter categories…': 'Filtrar categorias…', 'TV guide': 'Guia de TV', 'Play': 'Ver', 'Search channels, movies, series…': 'Pesquisar canais, filmes, séries…', 'No guide data yet': 'Sem dados de guia ainda', 'Favourite': 'Favorito', 'Categories': 'Categorias', 'TV': 'TV', 'Season': 'Época', 'Episodes': 'Episódios', 'Loading…': 'A carregar…', 'No episodes found': 'Sem episódios' });
Object.assign(PT, { 'Audio': 'Áudio', 'Subtitles': 'Legendas', 'Off': 'Desligadas', 'No extra audio or subtitles': 'Sem áudio ou legendas extra', 'Fit': 'Ajustar', 'Fill': 'Preencher', 'Stretch': 'Esticar', 'Resume': 'Continuar', 'Continue watching': 'Continuar a ver' });
const VER = 'v20';
const t = s => (LANG === 'pt' && PT[s]) || s;
const THEMES = [['night', 'Signal'], ['ocean', 'Phosphor'], ['amber', 'Amber'], ['ember', 'Ember'], ['neon', 'Neon']];

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
      .concat((vod || []).map(x => ({ name: x.name, logo: x.stream_icon || '', vodId: x.stream_id, group: vm[x.category_id] || 'Movies', tvg: '', num: 0, url: `${base}/movie/${encodeURIComponent(src.user)}/${encodeURIComponent(src.pass)}/${x.stream_id}.${x.container_extension || 'mp4'}`, kind: 'vod' })))
      .concat((ser || []).map(x => ({ name: x.name, logo: x.cover || '', group: sm[x.category_id] || 'Series', tvg: '', num: 0, url: 'xtream-series:' + x.series_id, seriesId: x.series_id, kind: 'series' })));
    const acct = await fetchJson(`${base}/player_api.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}`).then(d => d && d.user_info ? { exp: +d.user_info.exp_date || 0, max: d.user_info.max_connections, act: d.user_info.active_cons, status: d.user_info.status } : null).catch(() => null);
    return { acct, list: finish(list), epg: src.epg || `${base}/xmltv.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}` };
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
const LOC = LANG === 'pt' ? 'pt-PT' : undefined;
const hm = ms => new Date(ms).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' });

/* ---------- sources & channels ---------- */
const curSrc = () => S.sources.find(x => x.id === S.srcId) || S.sources[0];
async function selectSource(id, refresh) {
  const src = S.sources.find(x => x.id === id); if (!src) { S.channels = []; S.srcId = ''; S.acct = null; indexChannels(); render(); return; }
  S.srcId = id; LS.set('ap.src', id); S.epg = {}; S.loadErr = ''; let data = refresh ? null : await idbGet('ch:' + id);
  if (!data) { S.loading = true; render(); try { data = await loadSource(src); await idbSet('ch:' + id, data); } catch (e) { S.loading = false; S.loadErr = t('Could not load the playlist') + ': ' + e.message; render(); return; } }
  S.loading = false; S.channels = data.list; S.acct = data.acct || null; src.epgUrl = data.epg; indexChannels(); S.shown = 250; render(); loadEpg(id, data.epg);
}
function indexChannels() { S.byNum = {}; S.byKey = {}; S.channels.forEach(c => { S.byKey[c.key] = c; if (c.kind === 'live' && c.num && !S.byNum[c.num]) S.byNum[c.num] = c; }); }
const favList = () => S.favs.map(k => S.byKey[k]).filter(Boolean);
function baseList() {
  const g = S.group; let l;
  if (g === 'fav') l = favList().filter(c => c.kind === kindOf(S.mode)); else if (g === 'recent') l = S.recent.map(k => S.byKey[k]).filter(c => c && c.kind === 'live');
  else if (g === 'all') l = S.channels.filter(c => c.kind === 'live'); else if (g.startsWith('v:')) l = S.channels.filter(c => c.kind === 'vod' && (c.group || '—') === g.slice(2)); else if (g.startsWith('s:')) l = S.channels.filter(c => c.kind === 'series' && (c.group || '—') === g.slice(2)); else if (g === '_vod') l = S.channels.filter(c => c.kind === 'vod'); else if (g === '_series') l = S.channels.filter(c => c.kind === 'series');
  else l = S.channels.filter(c => c.kind === 'live' && c.group === g.slice(2));
  return l;
}
function shownNum(c) { if (c.kind !== 'live') return ''; if (S.set.numberMode === 'favs') { const i = favLive().indexOf(c); return i < 0 ? '' : i + 1; } return c.num || ''; }
const favLive = () => favList().filter(c => c.kind === 'live');

/* ---------- player ---------- */
const v = $('#v'); let hls = null, mpg = null, osdT, numBuf = '', numT, retried = false, rec = null;
function destroyPlayer() { if (hls) { try { hls.destroy(); } catch (e) { } hls = null; } if (mpg) { try { mpg.destroy(); } catch (e) { } mpg = null; } v.removeAttribute('src'); try { v.load(); } catch (e) { } }
const spin = on => { $('#spin').hidden = !on; };
function showMsg(title, text, retry) { spin(false); const m = $('#msg'); m.innerHTML = `<b>${esc(title)}</b><p>${text}</p>${retry ? `<div><button class="btn p" id="mRetry">${t('Retry')}</button></div>` : ''}`; m.hidden = false; const b = $('#mRetry'); if (b) b.onclick = () => play(S.cur, true);
  if (retry && S.cur) { const c = S.cur, u = proxied(c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url); probe(u).then(r => { if (S.cur === c && !m.hidden) { const p = m.querySelector('p'); if (p) { const cf = /probe 40[13] .*error code: ?10\d\d/.test(r); if (cf) p.innerHTML = LANG === 'pt' ? 'A Cloudflare (o ajudante) não consegue abrir este servidor, porque ele usa um endereço IP. Na versão web isto não tem solução. Usa a app Android.' : 'Cloudflare (the helper) cannot open this server because it uses a raw IP address. The web version cannot fix this. Use the Android app.'; p.insertAdjacentHTML('beforeend', `<br><small style="opacity:.7;word-break:break-all">${esc(r)}</small>`); } } }); } }
async function probe(u) { try { const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 8000), r = await fetch(u, { signal: ac.signal, headers: { Range: 'bytes=0-399' } }), ct = r.headers.get('content-type') || ''; let txt = ''; try { const v2 = (await r.body.getReader().read()).value || new Uint8Array(); txt = new TextDecoder().decode(v2.slice(0, 90)).replace(/[^\x20-\x7e]/g, '·'); } catch (e) { } clearTimeout(tm); ac.abort(); return `probe ${r.status} ${ct} "${txt}"`; } catch (e) { return 'probe failed: ' + (e && e.message || e); } }
function whyHtml(url, viaHelper, detail) {
  const pt = LANG === 'pt', mixed = location.protocol === 'https:' && /^http:/i.test(url) && !viaHelper && !NATIVE;
  const d = `<br><small style="opacity:.7">${esc((detail ? detail + ' · ' : '') + VER + ' · helper ' + (S.set.proxy ? (S.set.proxy.includes('{url}') ? 'on' : 'missing {url}') : 'off') + (viaHelper ? ' · via helper' : ''))}</small>`;
  if (mixed) return (pt ? 'Esta emissão usa <code>http</code> e esta página usa <code>https</code>, por isso o navegador bloqueia. Em Definições, põe o <b>link auxiliar</b> (Cloudflare), ou usa a app Android.' : 'This stream uses plain <code>http</code> but this page is <code>https</code>, so the browser blocks it. In Settings set the <b>helper link</b> (Cloudflare), or use the Android app.') + d;
  if (viaHelper) return (pt ? 'O ajudante não conseguiu obter este canal. O fornecedor pode ter bloqueado o ajudante, o canal pode estar offline, ou o limite gratuito da Cloudflare foi atingido.' : 'The helper could not fetch this channel. The provider may block the helper, the channel may be offline, or the free Cloudflare limit was reached.') + d;
  return (pt ? 'O servidor pode bloquear páginas web (CORS), o formato pode não ser suportado ou o canal está offline.' : 'The server may block web pages (CORS), the format may be unsupported, or the channel is offline.') + d;
}
async function play(c, isRetry) {
  if (!c) return; if (S.cur && S.cur.key !== c.key) S.last = S.cur.key; if (!isRetry) { retried = false; } if (S.cur && S.cur.key !== c.key) LS.set('ap.last', S.cur.key);
  S.cur = c; LS.set('ap.cur', c.key); S.recent = [c.key].concat(S.recent.filter(k => k !== c.key)).slice(0, 30); LS.set('ap.recent', S.recent);
  S.dbg = ''; stopRec(true); destroyPlayer(); $('#screen').classList.toggle('vod', c.kind !== 'live'); $('#msg').hidden = true; spin(true); showOsd(c); showInfo(c); updateFavBtn(); $$('#list .ch').forEach(r => r.classList.toggle('on', r.dataset.k === c.key));
  const cu = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url, url = proxied(cu), isHls = /m3u8/i.test(cu), isTs = c.kind === 'live' && !isHls && !/\.(mp4|mkv|webm|avi|mov)(\?|$)/i.test(cu);
  try {
    if (isHls) {
      if (!window.Hls && !v.canPlayType('application/vnd.apple.mpegurl')) await loadScript('js/hls.min.js');
      if (window.Hls && Hls.isSupported()) { hls = new Hls(Object.assign({ lowLatencyMode: true, maxBufferLength: 20, manifestLoadPolicy: { default: { maxTimeToFirstByteMs: 12000, maxLoadTimeMs: 15000, timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 }, errorRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 } } }, playlistLoadPolicy: { default: { maxTimeToFirstByteMs: 12000, maxLoadTimeMs: 15000, timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 }, errorRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 } } } }, nativeHttp() ? { loader: NativeLoader } : {})); hls.loadSource(url); hls.attachMedia(v); hls.on(Hls.Events.ERROR, (_, d) => { S.dbg = (d.details || '') + (d.reason ? ' ' + d.reason : '') + (d.error && d.error.message ? ' ' + d.error.message : ''); if (!d.fatal) return; if (d.type === Hls.ErrorTypes.NETWORK_ERROR && !retried && !/manifest|level/i.test(d.details || '')) { retried = true; hls.startLoad(); } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !retried) { retried = true; hls.recoverMediaError(); } else if (!c.useTs && /\/live\/[^/]+\/[^/]+\/[^/]+\.m3u8/i.test(c.url)) { c.useTs = true; play(c, true); } else showMsg(t('Could not play this'), whyHtml(c.url, c.url !== url, (d.details || '') + (d.response && d.response.code ? ' · HTTP ' + d.response.code : '')), true); }); }
      else v.src = url;
    } else if (isTs) {
      if (!window.mpegts) await loadScript('js/mpegts.min.js');
      if (window.mpegts && mpegts.isSupported()) { mpg = mpegts.createPlayer({ type: 'mpegts', isLive: true, url }, { enableWorker: true, liveBufferLatencyChasing: true }); mpg.attachMediaElement(v); mpg.load(); mpg.on(mpegts.Events.ERROR, (a, b) => { const was = c.useTs; c.useTs = false; showMsg(t('Could not play this'), whyHtml(c.url, c.url !== url, String(b || a || '')), true); }); }
      else v.src = url;
    } else v.src = url;
    await v.play().catch(() => { });
  } catch (e) { showMsg(t('Could not play this'), whyHtml(c.url, false, String(e && e.message || e)), true); }
}
v.addEventListener('playing', () => { spin(false); $('#msg').hidden = true; }); v.addEventListener('waiting', () => { if (S.cur) spin(true); }); v.addEventListener('error', () => { if (S.cur && v.getAttribute('src')) showMsg(t('Could not play this'), whyHtml(S.cur.url, proxied(S.cur.url) !== S.cur.url, (v.error ? 'media error ' + v.error.code + (v.error.message ? ' ' + v.error.message : '') : '') + (S.dbg ? ' · ' + S.dbg : '')), true); });
function showOsd(c) { const n = shownNum(c); $('#osdN').innerHTML = seg(n); $('#osdT').textContent = c.name; $('#osdS').textContent = c.group || ''; liveBar(c); if (fsOn) showOv(); }
function liveBar(c) { const nn = c.kind === 'live' ? nowNext(c) : null; $('#liveBar').hidden = !(nn && nn.now); if (nn && nn.now) { $('#lbNow').innerHTML = `<b>${hm(nn.now.s)}</b> ${esc(nn.now.t)}`; $('#lbPb').style.width = Math.max(0, Math.min(100, Math.round((Date.now() - nn.now.s) / (nn.now.e - nn.now.s) * 100))) + '%'; $('#lbNext').innerHTML = nn.next ? `<b>${hm(nn.next.s)}</b> ${esc(nn.next.t)}` : ''; } }
function showInfo(c) {
  const box = $('#info'); if (!box || c.kind !== 'live') return;
  const l = epgFor(c), n = Date.now(), up = l ? l.filter(p => p.e > n).slice(0, 8) : [];
  box.innerHTML = `<div class="ihead"><span class="lgw">${logoHtml(c)}</span><div><b><em>${seg(shownNum(c))}</em> ${esc(c.name)}</b><small>${esc(c.group || '')}</small></div><button class="ib" id="iFs" aria-label="${t('Full screen')}">${ic('expand')}</button></div>` + (up.length ? `<div class="epg">${up.map(p => `<div class="${p.s <= n ? 'now' : ''}"><time>${hm(p.s)}</time><span>${esc(p.t)}</span>${p.s <= n ? `<i style="width:${Math.round((n - p.s) / (p.e - p.s) * 100)}%"></i>` : ''}</div>`).join('')}</div>` : `<p class="mut">${t('No programme guide for this channel')}</p>`);
  $('#iFs').onclick = enterFs;
}
function zapList() { const m = S.mode; S.mode = 'live'; const g = S.group; S.group = S.gsel.live; const l = baseList().filter(c => c.kind === 'live'); S.group = g; S.mode = m; return l.length ? l : S.channels.filter(c => c.kind === 'live'); }
function zap(dir) { const l = zapList(); if (!l.length) return; let i = S.cur ? l.findIndex(c => c.key === S.cur.key) : -1; i = i < 0 ? (dir > 0 ? 0 : l.length - 1) : (i + dir + l.length) % l.length; play(l[i]); const r = $(`#list .ch[data-k="${l[i].key}"]`); if (r) r.scrollIntoView({ block: 'nearest' }); }
function byNumber(n) { if (S.set.numberMode === 'favs') return favLive()[n - 1]; return S.byNum[n]; }
function numKey(d) {
  numBuf = (numBuf + d).slice(0, 4); const n = $('#num'); n.hidden = false; const c = byNumber(+numBuf); n.innerHTML = `${seg(numBuf.padStart(3, ' ').replace(/ /g, '-'))}<small>${c ? esc(c.name) : t('No channel')}</small>`; clearTimeout(numT); numT = setTimeout(commitNum, 1500);
}
function commitNum() { clearTimeout(numT); const n = +numBuf; numBuf = ''; $('#num').hidden = true; if (!n && n !== 0) return; const c = byNumber(n); if (!c) { toast(t('No channel') + ' ' + n); return; } if (fsOn || (S.view === 'browse' && S.mode === 'live')) play(c); else enterFsFor(c); }
function lastChannel() { const k = LS.get('ap.last', ''), c = S.byKey[S.last || k]; if (c && (!S.cur || c.key !== S.cur.key)) play(c); else toast(t('Last channel') + ' —'); }

/* ---------- quick list inside the player (works in full screen) ---------- */
let quick = null;
function openQuick() {
  closeQuick(); const l = zapList(); if (!l.length) return; const q = document.createElement('div'); q.id = 'quick'; 
  q.innerHTML = l.slice(0, 400).map(c => `<div class="ch ${S.cur && S.cur.key === c.key ? 'on' : ''}" tabindex="0" data-k="${c.key}"><span class="n">${shownNum(c)}</span><span class="lgw">${logoHtml(c)}</span><div class="t"><b>${esc(c.name)}</b></div><span></span></div>`).join('');
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
function openDlg(html, cls) { dlg.className = cls || ''; dlg.innerHTML = html; if (!dlg.open) dlg.showModal(); }
function addDemo() {
  const demo = `#EXTM3U\n#EXTINF:-1 tvg-chno="1" group-title="Demo",Big Buck Bunny\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8\n#EXTINF:-1 tvg-chno="2" group-title="Demo",Apple test stream\nhttps://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8\n#EXTINF:-1 tvg-chno="3" group-title="Demo",Sintel\nhttps://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8\n#EXTINF:-1 tvg-chno="4" group-title="Demo",Tears of Steel\nhttps://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8\n#EXTINF:-1 tvg-chno="5" group-title="Demo",Akamai live test\nhttps://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8\n#EXTINF:-1 group-title="Movies",Big Buck Bunny (mp4)\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\n#EXTINF:-1 group-title="Movies",Elephants Dream (mp4)\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4\n`;
  addSource({ name: 'Demo channels', type: 'm3u', text: demo });
}
async function addSource(src) {
  src.id = 's' + Date.now().toString(36); S.sources.push(src); LS.set('ap.sources', S.sources); if (dlg.open) dlg.close(); go('home'); await selectSource(src.id, true); toast(t('Playlist added'));
  const s = S.sources.find(x => x.id === src.id); if (s && s.text != null) { /* keep pasted text so it can be refreshed offline */ }
}
function addDialog(tab0) {
  let tab = tab0 || 'url';
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
  openDlg(`<h2>${t('Settings')}</h2><label>${t('Style')}</label><select id="sStyle"><option value="circuit" ${(s.style || 'circuit') === 'circuit' ? 'selected' : ''}>${t('Circuit (electronic)')}</option><option value="soft" ${s.style === 'soft' ? 'selected' : ''}>${t('Soft')}</option></select><label>${t('Theme')}</label><select id="sTheme">${THEMES.map(x => `<option value="${x[0]}" ${s.theme === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>
  <label>${t('Number keys jump to')}</label><select id="sNum"><option value="chno" ${s.numberMode === 'chno' ? 'selected' : ''}>${t('Channel numbers from the playlist')}</option><option value="favs" ${s.numberMode === 'favs' ? 'selected' : ''}>${t('My favourites, in order')}</option></select>
  <label>${t('Big TV mode')}</label><select id="sTv"><option value="0" ${!s.tv ? 'selected' : ''}>${t('No')}</option><option value="1" ${s.tv ? 'selected' : ''}>${t('Yes')}</option></select>
  <label>${t('Language')}</label><select id="sLang"><option value="en" ${LANG === 'en' ? 'selected' : ''}>English</option><option value="pt" ${LANG === 'pt' ? 'selected' : ''}>Português</option></select>
  <label>${t('Helper link for blocked playlists (optional)')}</label><input id="sProxy" value="${esc(s.proxy)}" placeholder="https://your-helper.example/?url={url}"><label>${t('Also use it for streams')}</label><select id="sPS"><option value="0" ${!s.proxyStreams ? 'selected' : ''}>${t('No')}</option><option value="1" ${s.proxyStreams ? 'selected' : ''}>${t('Yes')}</option></select>
  <h2 style="margin-top:18px">${t('Playlists')}</h2>${S.sources.map(x => `<div style="display:flex;gap:6px;align-items:center;margin:6px 0"><b style="flex:1">${esc(x.name)}</b><button class="btn" data-r="${x.id}">${t('Refresh')}</button><button class="btn" data-d="${x.id}">${t('Delete')}</button></div>`).join('') || '<p class="mut">—</p>'}
  <h2 style="margin-top:18px">${t('Keyboard & remote')}</h2><div class="keys"><kbd>0–9</kbd><span>${t('jump to that channel')}</span><kbd>↑ ↓ / CH±</kbd><span>${t('next / previous channel')}</span><kbd>Enter</kbd><span>${t('channel list')}</span><kbd>F</kbd><span>${t('favourite on/off')}</span><kbd>L</kbd><span>${t('last channel')}</span><kbd>M</kbd><span>${t('mute')}</span><kbd>R</kbd><span>${t('record (needs a browser that allows it)')}</span><kbd>Z</kbd><span>${t('full screen')}</span></div>
  <div class="row"><button class="btn p" id="sOk">${t('Close')}</button></div>`);
  const chg = () => { s.style = $('#sStyle').value; s.theme = $('#sTheme').value; s.numberMode = $('#sNum').value; s.tv = $('#sTv').value === '1'; s.proxy = $('#sProxy').value.trim(); s.proxyStreams = $('#sPS').value === '1'; saveSet(); applyLook(); render(); };
  $$('#sStyle,#sTheme,#sNum,#sTv,#sPS', dlg).forEach(e => e.onchange = chg); $('#sProxy').onchange = chg; $('#sLang').onchange = e => { LS.set('ap.lang', e.target.value); location.reload(); };
  $$('[data-r]', dlg).forEach(b => b.onclick = () => { dlg.close(); selectSource(b.dataset.r, true); }); $$('[data-d]', dlg).forEach(b => b.onclick = () => { const id = b.dataset.d; S.sources = S.sources.filter(x => x.id !== id); LS.set('ap.sources', S.sources); idbDel('ch:' + id); idbDel('epg:' + id); dlg.close(); selectSource(S.sources[0] && S.sources[0].id); });
  $('#sOk').onclick = () => dlg.close();
}
function applyLook() { if (!THEMES.some(x => x[0] === S.set.theme)) S.set.theme = 'night'; document.documentElement.dataset.theme = S.set.theme; document.documentElement.dataset.style = S.set.style || 'circuit'; document.body.classList.toggle('tv', !!S.set.tv); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1115'; }

/* ---------- player extras: pause, seek, resume, tracks, aspect, PiP ---------- */
const POS = LS.get('ap.pos', {}), DUR = LS.get('ap.dur', {}); let posT = 0;
const isVodNow = () => S.cur && S.cur.kind !== 'live';
const fmtT = x => { if (!isFinite(x) || x < 0) return '0:00'; x = Math.floor(x); const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s2 = x % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s2).padStart(2, '0'); };
function savePos() { if (!isVodNow() || !isFinite(v.duration) || v.duration < 60) return; const k = S.cur.key; if (v.currentTime > v.duration - 30) delete POS[k]; else { POS[k] = Math.floor(v.currentTime); DUR[k] = Math.floor(v.duration); LS.set('ap.dur', DUR); } const ks = Object.keys(POS); if (ks.length > 300) delete POS[ks[0]]; LS.set('ap.pos', POS); }
v.addEventListener('timeupdate', () => { if (!isVodNow()) return; if (!seeking) $('#seek').value = v.duration ? Math.round(v.currentTime / v.duration * 1000) : 0; $('#tCur').textContent = fmtT(v.currentTime); $('#tDur').textContent = fmtT(v.duration); if (Date.now() - posT > 5000) { posT = Date.now(); savePos(); } });
v.addEventListener('loadedmetadata', () => { if (isVodNow() && POS[S.cur.key] > 10 && isFinite(v.duration) && POS[S.cur.key] < v.duration - 30) { v.currentTime = POS[S.cur.key]; toast(t('Resume') + ' ' + fmtT(POS[S.cur.key])); } });
v.addEventListener('pause', () => { $('#cPlay').innerHTML = ic('play'); screenEl.classList.add('paused'); if (fsOn) showOv(true); savePos(); }); v.addEventListener('play', () => { $('#cPlay').innerHTML = ic('pause'); screenEl.classList.remove('paused'); if (fsOn) showOv(); });
let seeking = false; const sk = $('#seek'); sk.oninput = () => { seeking = true; if (v.duration) $('#tCur').textContent = fmtT(sk.value / 1000 * v.duration); }; sk.onchange = () => { if (v.duration) v.currentTime = sk.value / 1000 * v.duration; seeking = false; };
const seekBy = d => { if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d)); };
const togglePlay = () => { if (v.paused) v.play().catch(() => { }); else v.pause(); };
$('#cPlay').onclick = togglePlay; $('#cBack').onclick = () => seekBy(-10); $('#cFwd').onclick = () => seekBy(10);
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
/* ---------- icons ---------- */
const IC = {
  back: '<path d="M15 5l-7 7 7 7"/>', tv: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M8 2.5l4 3.5 4-3.5"/>',
  film: '<rect x="3" y="3.5" width="18" height="17" rx="2.5"/><path d="M7.5 3.5v17M16.5 3.5v17M3 8.5h4.5M3 15.5h4.5M16.5 8.5H21M16.5 15.5H21"/>',
  series: '<rect x="2.5" y="7.5" width="15" height="12" rx="2.5"/><path d="M6.5 4.5h12a3 3 0 013 3v8"/><path d="M8.5 11v5l4-2.5z" fill="currentColor" stroke="none"/>',
  guide: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M9 9.5V20M15 9.5V20"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  starF: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
  list: '<path d="M4 6.5h16M4 12h16M4 17.5h11"/>', up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  play: '<path d="M7.5 4.8v14.4L19 12z" fill="currentColor"/>', pause: '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor" stroke="none"/>',
  rew: '<path d="M11.5 7l-5 5 5 5M18 7l-5 5 5 5"/>', fwd: '<path d="M12.5 7l5 5-5 5M6 7l5 5-5 5"/>',
  vol: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 010 6M18 6.5a7.8 7.8 0 010 11"/>', mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  cc: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10.5 10.2a2.2 2.2 0 100 3.6M17 10.2a2.2 2.2 0 100 3.6"/>',
  aspect: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M7 11V9h2.5M17 13v2h-2.5"/>', pip: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><rect x="11.5" y="11" width="7" height="5.5" rx="1"/>',
  rec: '<circle cx="12" cy="12" r="5.5" fill="currentColor" stroke="none"/>', expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 4.5v4.8h-4.8"/>', user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0115 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', stack: '<path d="M4 6h13M4 11h13M4 16h7"/><path d="M15.5 14v6.5l5-3.2z" fill="currentColor" stroke="none"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
};
const seg = (v, cls) => { v = String(v == null ? '' : v); return v === '' ? '' : `<span class="seg ${cls || ''}" data-g="${v.replace(/[0-9-]/g, '8')}">${esc(v)}</span>`; };
const ic = (n, c) => `<svg viewBox="0 0 24 24" class="i ${c || ''}" aria-hidden="true">${IC[n] || ''}</svg>`;
Object.assign(PT, { 'Style': 'Estilo', 'Circuit (electronic)': 'Circuito (eletrónico)', 'Soft': 'Suave', 'Live TV': 'TV em direto', 'Search': 'Pesquisar', 'Playlists': 'Listas', 'Expires': 'Expira', 'Never': 'Nunca', 'Connections': 'Ligações', 'Recent channels': 'Últimos canais', 'Continue watching': 'Continuar a ver', 'movies': 'filmes', 'series': 'séries', 'All': 'Tudo', 'Loading your playlist…': 'A carregar a tua lista…', 'Watch': 'Ver', 'Resume': 'Continuar', 'Add favourite': 'Adicionar aos favoritos', 'In favourites': 'Nos favoritos', 'Active': 'Ativa', 'Account': 'Conta', 'Add a playlist': 'Adicionar lista', 'Use': 'Usar', 'Search everything': 'Pesquisar tudo', 'Type at least 2 letters': 'Escreve pelo menos 2 letras', 'Tap again for full screen': 'Toca outra vez para ecrã inteiro', 'Pick a channel': 'Escolhe um canal', 'Episode': 'Episódio', 'Seasons': 'Épocas', 'No details from the provider': 'O fornecedor não enviou detalhes', 'Status': 'Estado', 'Xtream login': 'Login Xtream' });

/* ---------- navigation ---------- */
const kindOf = m => m === 'vod' ? 'vod' : m === 'series' ? 'series' : 'live';
const GDEF = { live: 'all', vod: '_vod', series: '_series' };
S.mode = 'live'; S.gsel = Object.assign({}, GDEF, LS.get('ap.gsel', {})); S.view = 'home'; S.detail = null; const EPS = LS.get('ap.eps', {});
let fsOn = false, ovT = 0;
const screenEl = $('#screen');
function go(r, replace) { const d = (history.state && history.state.d || 0) + (replace ? 0 : 1); if (!replace && ('#' + r) === location.hash) { route(); return; } history[replace ? 'replaceState' : 'pushState']({ d }, '', '#' + r); route(); }
function route() {
  const h = (location.hash || '#home').slice(1);
  if (h === 'play') { if (S.cur) { doFs(true); return; } history.replaceState({ d: 0 }, '', '#home'); return route(); }
  if (fsOn) doFs(false);
  let view = 'home';
  if (h === 'live' || h === 'movies' || h === 'series') { view = 'browse'; const m = h === 'live' ? 'live' : h === 'movies' ? 'vod' : 'series'; if (S.mode !== m) { S.mode = m; S.q = ''; $('#q').value = ''; S.shown = 250; } S.group = S.gsel[m]; }
  else if (h === 'detail' && S.detail) view = 'detail';
  else if (h === 'search') view = 'search';
  if (!(view === 'browse' && S.mode === 'live') && S.cur && !fsOn) stopPlayback();
  S.view = view; document.body.dataset.view = view; document.body.dataset.mode = view === 'browse' ? S.mode : '';
  render();
  if (view === 'search') setTimeout(() => $('#q').focus(), 50);
  const f = $(`#v${view[0].toUpperCase() + view.slice(1)} [tabindex], #v${view[0].toUpperCase() + view.slice(1)} button`); if (S.set.tv && f && !document.activeElement.closest('.view')) f.focus();
}
window.addEventListener('popstate', route);
function back() { if (dlg.open) { dlg.close(); return true; } if (quick) { closeQuick(); return true; } if ((location.hash || '#home') !== '#home') { if (history.state && history.state.d > 0) history.back(); else go('home', true); return true; } return false; }

/* ---------- full screen player ---------- */
function enterFs() {
  if (!S.cur) return; if (!NATIVE && screenEl.requestFullscreen && !document.fullscreenElement) screenEl.requestFullscreen().catch(() => { });
  if (location.hash !== '#play') go('play'); else doFs(true);
}
function doFs(on) {
  if (on === fsOn) return; fsOn = on;
  if (on) { document.body.appendChild(screenEl); screenEl.classList.add('fs'); screenEl.classList.remove('pv'); document.body.classList.add('fsOn'); showOv(); try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }
  else {
    screenEl.classList.remove('fs', 'show'); screenEl.classList.add('pv'); document.body.classList.remove('fsOn'); closeQuick(); $('#slot').appendChild(screenEl);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); try { screen.orientation.unlock(); } catch (e) { }
    if (S.cur && S.cur.kind !== 'live') stopPlayback(); else if (!v.paused || S.cur) v.play().catch(() => { });
  }
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && fsOn && location.hash === '#play') history.back(); });
function stopPlayback() { savePos(); stopRec(true); destroyPlayer(); spin(false); $('#msg').hidden = true; S.cur = null; $$('.ch.on').forEach(r => r.classList.remove('on')); const i = $('#info'); if (i) i.innerHTML = sideEmpty(); }
function showOv(keep) { screenEl.classList.add('show'); clearTimeout(ovT); if (!keep) ovT = setTimeout(() => { if (!(isVodNow() && v.paused)) screenEl.classList.remove('show'); }, 4500); }
let lastTap = 0, tapX = 0, touchY = null;
v.addEventListener('click', e => {
  if (!fsOn) { if (S.cur) enterFs(); return; }
  const now = Date.now(), r = v.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
  if (isVodNow() && now - lastTap < 320 && Math.abs(x - tapX) < .2 && (x < .35 || x > .65)) { seekBy(x < .35 ? -10 : 10); toast(x < .35 ? '−10 s' : '+10 s'); lastTap = 0; showOv(); return; }
  lastTap = now; tapX = x; screenEl.classList.contains('show') ? screenEl.classList.remove('show') : showOv();
});
screenEl.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
screenEl.addEventListener('touchend', e => { if (touchY == null || !fsOn || isVodNow() || quick) return; const dy = e.changedTouches[0].clientY - touchY; touchY = null; if (Math.abs(dy) > 70) zap(dy < 0 ? 1 : -1); }, { passive: true });
screenEl.addEventListener('pointermove', e => { if (fsOn && e.pointerType === 'mouse') showOv(); });

/* ---------- header ---------- */
const TITLES = { live: 'Live TV', vod: 'Movies', series: 'Series' };
function renderHeader() {
  const vw = S.view; $('#title').textContent = vw === 'browse' ? t(TITLES[S.mode]) : vw === 'search' ? t('Search') : '';
  $('#q').placeholder = vw === 'search' ? t('Search channels, movies, series…') : vw === 'browse' ? (t('Search') + ' · ' + t(TITLES[S.mode])) : '';
  $('#bGuide').hidden = !(vw === 'home' || (vw === 'browse' && S.mode === 'live'));
  $('#bSearch').hidden = vw !== 'home' || !S.sources.length; if (!S.sources.length) $('#bGuide').hidden = true;
}
function tick() { const d = new Date(), tm = d.toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit', hour12: false }), dt = d.toLocaleDateString(LANG === 'pt' ? 'pt-PT' : undefined, { weekday: 'short', day: 'numeric', month: 'short' }); $('#clock b').innerHTML = seg(tm); $('#clock small').textContent = dt; $('#ovClock').innerHTML = seg(tm); if (S.cur && S.cur.kind === 'live') liveBar(S.cur); }

/* ---------- home ---------- */
const fmtN = n => n.toLocaleString(LANG === 'pt' ? 'pt-PT' : undefined);
function contList() { return Object.keys(POS).reverse().map(k => S.byKey[k] || EPS[k]).filter(Boolean).slice(0, 14); }
const TRACE = '<svg class="trace" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMin slice" aria-hidden="true"><g><path d="M120 58H230l26 26H400"/><path d="M120 72h70l18 18v40l22 22H400"/><path d="M300 0v40l20 20h80"/><path d="M340 300v-60l-24-24h-40l-20-20v-30"/><circle cx="256" cy="84" r="4"/><circle cx="230" cy="152" r="4"/><circle cx="256" cy="166" r="4"/></g><path class="pulse" d="M120 58H230l26 26H400"/><path class="pulse p2" d="M120 72h70l18 18v40l22 22H400"/></svg>';
function renderHome() {
  const box = $('#vHome');
  if (!S.sources.length) {
    box.innerHTML = `<div class="welcome"><div class="wmark">${ic('tv')}</div><h2>${t('Welcome to AntunesPlayer')}</h2><p>${t('AntunesPlayer plays the streams you give it — it comes with no channels. Add your own playlist, or look around with free test streams.')}</p>
    <div class="wacts"><button class="btn p big" id="wX">${ic('user')} ${t('Xtream login')}</button><button class="btn big" id="wU">${ic('plus')} ${t('Add a playlist')}</button><button class="btn big ghost" id="wD">${ic('play')} ${t('Try demo channels')}</button></div></div>`;
    $('#wX').onclick = () => addDialog('xt'); $('#wU').onclick = () => addDialog('url'); $('#wD').onclick = addDemo; return;
  }
  const n = k => S.channels.filter(c => c.kind === k).length, L = n('live'), M = n('vod'), Se = n('series'), src = curSrc() || {}, a = S.acct, ld = S.loading;
  const cnt = (x, w) => ld ? `<small>${t('Loading your playlist…')}</small>` : `<small>${seg(x, 'cnt')} ${w}</small>`;
  const exp = a && a.exp ? new Date(a.exp * 1000).toLocaleDateString(LANG === 'pt' ? 'pt-PT' : undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : (a ? t('Never') : '');
  const cont = contList(), rec = S.recent.map(k => S.byKey[k]).filter(c => c && c.kind === 'live').slice(0, 14);
  box.innerHTML = `<div class="hgrid">
    <button class="tile t-live" data-go="live">${TRACE}${ic('tv')}<b>${t('Live TV')}</b>${cnt(L, t('channels'))}</button>
    <button class="tile t-mov" data-go="movies">${TRACE}${ic('film')}<b>${t('Movies')}</b>${cnt(M, t('movies'))}</button>
    <button class="tile t-ser" data-go="series">${TRACE}${ic('series')}<b>${t('Series')}</b>${cnt(Se, t('series'))}</button>
    <div class="minis">
      <button class="mini" data-go="guide">${ic('guide')}<span>${t('TV guide')}</span></button>
      <button class="mini" data-go="fav">${ic('star')}<span>${t('Favourites')}</span><small>${favList().length}</small></button>
      <button class="mini" data-go="search">${ic('search')}<span>${t('Search')}</span></button>
      <button class="mini" data-go="lists">${ic('stack')}<span>${t('Playlists')}</span><small>${S.sources.length}</small></button>
    </div>
    <div class="acct"><div class="ah">${ic('user')}<div><b>${esc(src.name || '')}</b><small>${src.type === 'xtream' ? 'Xtream' : 'M3U'}${a && a.status ? ' · ' + esc(a.status) : ''}</small></div><button class="ib" id="hRef" aria-label="${t('Refresh')}">${ic('refresh')}</button></div>
      ${a ? `<dl><dt>${t('Expires')}</dt><dd>${esc(exp)}</dd><dt>${t('Connections')}</dt><dd>${esc(a.act != null ? a.act : '–')} / ${esc(a.max || '–')}</dd></dl>` : `<dl><dt>${t('Live TV')}</dt><dd>${fmtN(L)}</dd><dt>${t('Movies')}</dt><dd>${fmtN(M)}</dd></dl>`}
      ${S.loadErr ? `<p class="err">${esc(S.loadErr)}</p>` : ''}</div>
  </div>
  ${cont.length ? `<section class="hrow"><h3>${t('Continue watching')}</h3><div class="rail">${cont.map(posterHtml).join('')}</div></section>` : ''}
  ${rec.length ? `<section class="hrow"><h3>${t('Recent channels')}</h3><div class="rail chrail">${rec.map(c => `<button class="chc" data-k="${c.key}">${logoHtml(c)}<b>${seg(shownNum(c))}</b><span>${esc(c.name)}</span></button>`).join('')}</div></section>` : ''}`;
  $$('[data-go]', box).forEach(b => b.onclick = () => { const g = b.dataset.go; if (g === 'guide') openGuide(); else if (g === 'lists') listsDialog(); else if (g === 'fav') { S.gsel.live = 'fav'; go('live'); } else go(g); });
  $('#hRef').onclick = () => selectSource(S.srcId, true);
  wireItems(box);
  $$('.chc', box).forEach(b => b.onclick = () => { const c = S.byKey[b.dataset.k]; if (c) { S.gsel.live = 'recent'; go('live'); play(c); } });
}

/* ---------- lists ---------- */
const logoHtml = c => c.logo ? `<img loading="lazy" src="${esc(c.logo)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'lg',textContent:${esc(JSON.stringify((c.name || '?').charAt(0)))}}))">` : `<span class="lg">${esc((c.name || '?').charAt(0))}</span>`;
function rowHtml(c) {
  const nn = nowNext(c), fav = S.favs.includes(c.key), n = shownNum(c), pr = nn && nn.now ? Math.round((Date.now() - nn.now.s) / (nn.now.e - nn.now.s) * 100) : 0;
  return `<div class="ch ${S.cur && S.cur.key === c.key ? 'on' : ''}" tabindex="0" data-k="${c.key}"><span class="n">${seg(n)}</span><span class="lgw">${logoHtml(c)}</span><div class="t"><b>${esc(c.name)}</b><span>${nn && nn.now ? esc(nn.now.t) : esc(c.group || '')}</span>${nn && nn.now ? `<div class="pb"><i style="width:${pr}%"></i></div>` : ''}</div><span class="ctl2">${S.group === 'fav' && S.view === 'browse' ? `<button class="mv" data-mv="-1" data-k2="${c.key}" aria-label="Move up">${ic('up')}</button><button class="mv" data-mv="1" data-k2="${c.key}" aria-label="Move down">${ic('down')}</button>` : ''}<button class="star ${fav ? 'on' : ''}" data-s="${c.key}" aria-label="${t('Favourite')}">${ic(fav ? 'starF' : 'star')}</button></span></div>`;
}
function posterHtml(c) {
  const pos = POS[c.key], ini = esc((c.name || '?').charAt(0)), fav = S.favs.includes(c.key);
  return `<div class="pc" tabindex="0" data-k="${c.key}"><div class="po">${c.logo ? `<img loading="lazy" src="${esc(c.logo)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${ini}</span>${fav ? `<i class="fv">${ic('starF')}</i>` : ''}${pos ? `<div class="pp"><i style="width:${Math.min(100, Math.round(pos / (DUR[c.key] || c.dur || 5400) * 100))}%"></i></div>` : ''}</div><b>${esc(c.name)}</b></div>`;
}
function wireItems(box) {
  $$('.ch', box).forEach(r => { r.onclick = e => { if (e.target.closest('.star') || e.target.closest('.mv')) return; pick(S.byKey[r.dataset.k]); }; r.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); pick(S.byKey[r.dataset.k]); } }; });
  $$('.pc', box).forEach(r => { r.onclick = () => openDetail(S.byKey[r.dataset.k] || EPS[r.dataset.k]); r.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); r.click(); } }; });
  $$('.star', box).forEach(b => b.onclick = e => { e.stopPropagation(); toggleFav(S.byKey[b.dataset.s]); });
  $$('.mv', box).forEach(b => b.onclick = e => { e.stopPropagation(); moveFav(b.dataset.k2, +b.dataset.mv); const f = $(`.mv[data-k2="${b.dataset.k2}"][data-mv="${b.dataset.mv}"]`); if (f) f.focus(); });
}
function pick(c) {
  if (!c) return; if (c.kind !== 'live') { openDetail(c); return; }
  if (S.view !== 'browse') { enterFsFor(c); return; }
  if (S.cur && S.cur.key === c.key && $('#msg').hidden) enterFs(); else play(c);
}

/* ---------- browse (live / movies / series) ---------- */
const tabOf = g => (g === '_vod' || g.startsWith('v:')) ? 'vod' : (g === '_series' || g.startsWith('s:')) ? 'series' : 'live';
function catItems(tab) {
  const k = kindOf(tab), o = {}; let n = 0; S.channels.forEach(c => { if (c.kind !== k) return; n++; const g = c.group || '—'; o[g] = (o[g] || 0) + 1; });
  const favN = favList().filter(c => c.kind === k).length, pre = tab === 'live' ? 'g:' : tab === 'vod' ? 'v:' : 's:';
  const head = tab === 'live' ? [{ id: 'all', label: t('All channels'), n }, { id: 'fav', label: t('Favourites'), n: favN, icon: 'star' }, { id: 'recent', label: t('Recent'), n: S.recent.filter(x => S.byKey[x] && S.byKey[x].kind === 'live').length, icon: 'clock' }] : [{ id: GDEF[tab], label: t('All'), n }, { id: 'fav', label: t('Favourites'), n: favN, icon: 'star' }];
  return head.concat(Object.keys(o).map(g => ({ id: pre + g, label: g, n: o[g] })));
}
function renderBrowse() {
  const items = catItems(S.mode), cur = items.find(x => x.id === S.group) || items[0];
  const item = it => `<button data-g="${esc(it.id)}" class="${S.group === it.id ? 'on' : ''}">${it.icon ? ic(it.icon) : ''}<span>${esc(it.label)}</span><small>${fmtN(it.n)}</small></button>`;
  $('#groups').innerHTML = (items.length > 14 ? `<label class="gq">${ic('search')}<input id="gq" placeholder="${t('Filter categories…')}"></label>` : '') + `<div class="cats">${items.map(item).join('')}</div>`;
  $('#catBtn').innerHTML = `${ic('list')}<span>${esc(cur ? cur.label : '')}</span><small>${cur ? fmtN(cur.n) : ''}</small>${ic('down')}`;
  const pickG = id => { S.group = id; S.gsel[S.mode] = id; LS.set('ap.gsel', S.gsel); S.shown = 250; renderBrowse(); $('#list').scrollTop = 0; };
  $$('#groups .cats button').forEach(b => b.onclick = () => pickG(b.dataset.g));
  const gq = $('#gq'); if (gq) gq.oninput = () => { const q = gq.value.trim().toLowerCase(); $$('#groups .cats button').forEach(b => b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none'); };
  $('#catBtn').onclick = () => {
    openDlg(`<h2>${t('Categories')}</h2><label class="gq">${ic('search')}<input id="dq" placeholder="${t('Filter categories…')}"></label><div class="catlist">${items.map(item).join('')}</div><div class="row"><button class="btn" id="dx">OK</button></div>`, 'sheet');
    const f = () => { const q = $('#dq').value.trim().toLowerCase(); $$('.catlist button', dlg).forEach(b => b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none'); };
    $('#dq').oninput = f; $('#dx').onclick = () => dlg.close(); $$('.catlist button', dlg).forEach(b => b.onclick = () => { dlg.close(); pickG(b.dataset.g); }); const on = $('.catlist button.on', dlg); if (on) on.scrollIntoView({ block: 'center' });
  };
  renderList();
  if (S.mode === 'live') { if (S.cur) showInfo(S.cur); else $('#info').innerHTML = sideEmpty(); }
}
const sideEmpty = () => `<div class="sempty">${ic('tv')}<p>${t('Pick a channel')}</p></div>`;
function renderList() {
  const box = $('#list'), l = filtered(), grid = S.mode !== 'live';
  box.classList.toggle('grid', grid);
  if (S.loading && !S.channels.length) { box.innerHTML = `<div class="empty"><div class="ld"></div><p>${t('Loading your playlist…')}</p></div>`; return; }
  if (!l.length) { box.innerHTML = `<div class="empty"><h3>${t('Nothing found')}</h3></div>`; return; }
  box.innerHTML = l.slice(0, S.shown).map(grid ? posterHtml : rowHtml).join('') + (l.length > S.shown ? `<button class="more" id="more">${t('Show more')} (${fmtN(l.length - S.shown)})</button>` : '');
  wireItems(box); const m = $('#more', box); if (m) m.onclick = () => { S.shown += 250; renderList(); };
}
function filtered() {
  const q = S.q.trim().toLowerCase(); if (!q) return baseList();
  const k = kindOf(S.mode); return S.channels.filter(c => c.kind === k && ((c.name || '').toLowerCase().includes(q) || String(shownNum(c)) === q));
}
function renderSearch() {
  const box = $('#sres'), q = S.q.trim().toLowerCase();
  if (q.length < 2) { box.innerHTML = `<div class="empty">${ic('search')}<p>${t('Type at least 2 letters')}</p></div>`; return; }
  const res = S.channels.filter(c => (c.name || '').toLowerCase().includes(q)), sec = (k, label, f) => { const a = res.filter(c => c.kind === k); return a.length ? `<section class="hrow"><h3>${label} <small>${fmtN(a.length)}</small></h3>${k === 'live' ? `<div class="slist">${a.slice(0, 60).map(rowHtml).join('')}</div>` : `<div class="rail">${a.slice(0, 40).map(posterHtml).join('')}</div>`}</section>` : ''; };
  box.innerHTML = (sec('live', t('Live TV')) + sec('vod', t('Movies')) + sec('series', t('Series'))) || `<div class="empty"><h3>${t('Nothing found')}</h3></div>`;
  wireItems(box);
}
function render() {
  renderHeader();
  if (S.view === 'home') renderHome(); else if (S.view === 'browse') renderBrowse(); else if (S.view === 'search') renderSearch(); else if (S.view === 'detail' && !$('#vDetail').innerHTML) renderDetailShell();
  updateFavBtn();
}

/* ---------- detail page (movies & series) ---------- */
async function openDetail(c) { if (!c) return; S.detail = c; S.dinfo = null; S.deps = null; $('#vDetail').innerHTML = ''; go('detail'); loadDetail(c); }
function xbase() { const s = curSrc(); return s && s.type === 'xtream' ? { s, base: s.server.replace(/\/+$/, ''), q: encodeURIComponent } : null; }
async function loadDetail(c) {
  const x = xbase(); if (!x || (!c.vodId && !c.seriesId)) { S.dinfo = {}; renderDetailShell(); return; }
  try { const d = await fetchJson(`${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=${c.seriesId ? 'get_series_info&series_id=' + x.q(c.seriesId) : 'get_vod_info&vod_id=' + x.q(c.vodId)}`); if (S.detail !== c) return; S.dinfo = d.info || {}; if (c.seriesId) S.deps = d.episodes || {}; if (S.dinfo.duration_secs) c.dur = +S.dinfo.duration_secs; }
  catch (e) { if (S.detail === c) S.dinfo = { err: e.message }; }
  if (S.detail === c && S.view === 'detail') renderDetailShell();
}
function renderDetailShell() {
  const c = S.detail; if (!c) return; const i = S.dinfo || {}, box = $('#vDetail');
  const img = i.movie_image || i.cover_big || i.cover || c.logo || '', back = (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path) || img;
  const year = (i.releasedate || i.releaseDate || i.release_date || '').slice(0, 4), rating = parseFloat(i.rating) || 0;
  const chips = [year, i.genre, i.duration, rating ? '★ ' + rating.toFixed(1) : ''].filter(Boolean), fav = S.favs.includes(c.key), pos = POS[c.key];
  const seasons = S.deps ? Object.keys(S.deps).sort((a, b) => a - b) : [];
  box.innerHTML = `<div class="dbg" style="${back ? `background-image:url('${esc(back).replace(/'/g, '%27')}')` : ''}"></div><div class="dwrap">
    <div class="dpost">${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${esc((c.name || '?').charAt(0))}</span></div>
    <div class="dinfo"><h2>${esc(c.name)}</h2>${chips.length ? `<div class="chips">${chips.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${S.dinfo == null ? `<p class="mut">${t('Loading…')}</p>` : (i.plot || i.description) ? `<p class="plot">${esc(i.plot || i.description)}</p>` : `<p class="mut">${t('No details from the provider')}</p>`}
      ${i.cast ? `<p class="cast">${esc(i.cast)}</p>` : ''}
      <div class="dacts">${c.seriesId ? '' : `<button class="btn p big" id="dPlay">${ic('play')} ${pos ? t('Resume') + ' ' + fmtT(pos) : t('Watch')}</button>`}<button class="btn big ${fav ? 'on' : ''}" id="dFav">${ic(fav ? 'starF' : 'star')} ${fav ? t('In favourites') : t('Add favourite')}</button></div>
      ${seasons.length ? `<div class="seas">${seasons.map((s, n) => `<button data-sn="${esc(s)}" class="${n === 0 ? 'on' : ''}">${t('Season')} ${esc(s)}</button>`).join('')}</div><div class="eps" id="eps"></div>` : ''}
    </div></div>`;
  const p = $('#dPlay'); if (p) p.onclick = () => { enterFsFor(c); };
  $('#dFav').onclick = () => { toggleFav(c); renderDetailShell(); };
  if (seasons.length) { const draw = sn => { $$('.seas button').forEach(b => b.classList.toggle('on', b.dataset.sn === sn)); $('#eps').innerHTML = (S.deps[sn] || []).map((e, n) => { const ep = epObj(c, sn, e, n), ps = POS[ep.key]; return `<button class="ep" data-i="${n}">${e.info && e.info.movie_image ? `<img loading="lazy" src="${esc(e.info.movie_image)}" alt="" onerror="this.remove()">` : `<span class="en">${esc(e.episode_num || n + 1)}</span>`}<span class="et"><b>${t('Episode')} ${esc(e.episode_num || n + 1)}</b><span>${esc(e.title || '')}</span>${ps ? `<i class="epp"></i>` : ''}</span>${ic('play')}</button>`; }).join(''); $$('#eps .ep').forEach(b => b.onclick = () => { const e = S.deps[sn][+b.dataset.i]; enterFsFor(epObj(c, sn, e, +b.dataset.i)); }); }; $$('.seas button').forEach(b => b.onclick = () => draw(b.dataset.sn)); draw(seasons[0]); }
}
function epObj(c, sn, e, n) { const x = xbase(); const url = `${x.base}/series/${x.q(x.s.user)}/${x.q(x.s.pass)}/${e.id}.${e.container_extension || 'mp4'}`; return { name: `${c.name} · S${sn}E${e.episode_num || n + 1}`, logo: c.logo, group: c.group, url, kind: 'vod', num: 0, key: hash(c.name + '|' + url), dur: e.info && +e.info.duration_secs || 0 }; }
function enterFsFor(c) { if (c.kind !== 'live' && !S.byKey[c.key]) { S.byKey[c.key] = c; EPS[c.key] = c; const ks = Object.keys(EPS); if (ks.length > 60) delete EPS[ks[0]]; LS.set('ap.eps', EPS); } play(c); enterFs(); }

/* ---------- favourites ---------- */
function toggleFav(c) { if (!c) return; const i = S.favs.indexOf(c.key); if (i < 0) { S.favs.push(c.key); toast(t('Added to favourites') + (S.set.numberMode === 'favs' && c.kind === 'live' ? ` · ${favList().filter(x => x.kind === 'live').length}` : '')); } else { S.favs.splice(i, 1); toast(t('Removed from favourites')); } LS.set('ap.favs', S.favs); if (S.view !== 'detail') render(); updateFavBtn(); }
function moveFav(k, d) { const i = S.favs.indexOf(k), j = i + d; if (i < 0 || j < 0 || j >= S.favs.length) return; S.favs.splice(j, 0, S.favs.splice(i, 1)[0]); LS.set('ap.favs', S.favs); renderList(); }
function updateFavBtn() { const f = S.cur && S.favs.includes(S.cur.key); $('#cFav').innerHTML = ic(f ? 'starF' : 'star'); $('#cFav').classList.toggle('on', !!f); }

/* ---------- TV guide ---------- */
function openGuide() {
  const base = S.view === 'browse' && S.mode === 'live' ? baseList() : S.channels.filter(c => c.kind === 'live'), list = base.filter(c => c.kind === 'live').slice(0, 200);
  const PX = 4, step = 30 * 60000, now = Date.now(), start = Math.floor((now - 45 * 60000) / step) * step, end = start + 8 * 3600000, W = (end - start) / 60000 * PX;
  const ticks = []; for (let x = start; x < end; x += step) ticks.push(`<i style="left:${(x - start) / 60000 * PX}px">${hm(x)}</i>`);
  const rows = list.map(c => { const l = epgFor(c) || [], bl = l.filter(p => p.e > start && p.s < end).map(p => { const s = Math.max(p.s, start), e = Math.min(p.e, end); return `<button class="pg ${p.s <= now && p.e > now ? 'now' : ''}" style="left:${(s - start) / 60000 * PX}px;width:${Math.max(24, (e - s) / 60000 * PX - 3)}px" data-k="${c.key}"><b>${esc(p.t)}</b><small>${hm(p.s)} – ${hm(p.e)}</small></button>`; }).join(''); return `<div class="gr"><button class="gc" data-k="${c.key}"><span class="n">${seg(shownNum(c))}</span><span class="lgw">${logoHtml(c)}</span><span class="nm">${esc(c.name)}</span></button><div class="gt" style="width:${W}px">${bl || `<span class="gnone">—</span>`}</div></div>`; }).join('');
  openDlg(`<div class="gh"><h2>${ic('guide')} ${t('TV guide')}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('back')}</button></div><div class="gscroll" id="gs"><div class="gcols"><div class="gc0"></div><div class="gaxis" style="width:${W}px">${ticks.join('')}<u style="left:${(now - start) / 60000 * PX}px"></u></div></div>${rows || `<div class="empty"><p>${t('No guide data yet')}</p></div>`}</div>`, 'full');
  $('#dx').onclick = () => dlg.close(); const gs = $('#gs'); gs.scrollLeft = Math.max(0, (now - start) / 60000 * PX - 80);
  $$('#gs [data-k]').forEach(b => b.onclick = () => { const c = S.byKey[b.dataset.k]; dlg.close(); if (S.view === 'browse' && S.mode === 'live') play(c); else { go('live'); setTimeout(() => play(c), 30); } });
  if (!Object.keys(S.epg).length) toast(t('No guide data yet'));
}

/* ---------- playlists dialog ---------- */
function listsDialog() {
  openDlg(`<h2>${t('Playlists')}</h2><div class="srcs">${S.sources.map(x => `<div class="srow ${x.id === S.srcId ? 'on' : ''}"><span class="sic">${ic(x.type === 'xtream' ? 'user' : 'stack')}</span><div><b>${esc(x.name)}</b><small>${x.type === 'xtream' ? 'Xtream' : 'M3U'}${x.id === S.srcId ? ' · ' + t('Active') : ''}</small></div>${x.id === S.srcId ? '' : `<button class="btn" data-u="${x.id}">${t('Use')}</button>`}<button class="ib" data-r="${x.id}" aria-label="${t('Refresh')}">${ic('refresh')}</button><button class="btn" data-d="${x.id}">${t('Delete')}</button></div>`).join('')}</div>
  <div class="row"><button class="btn" id="lX">${ic('user')} ${t('Xtream login')}</button><button class="btn" id="lU">${ic('plus')} ${t('Add a playlist')}</button><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close(); $('#lX').onclick = () => addDialog('xt'); $('#lU').onclick = () => addDialog('url');
  $$('[data-u]', dlg).forEach(b => b.onclick = () => { dlg.close(); selectSource(b.dataset.u); });
  $$('[data-r]', dlg).forEach(b => b.onclick = () => { dlg.close(); selectSource(b.dataset.r, true); });
  $$('[data-d]', dlg).forEach(b => b.onclick = () => { const id = b.dataset.d; S.sources = S.sources.filter(x => x.id !== id); LS.set('ap.sources', S.sources); idbDel('ch:' + id); idbDel('epg:' + id); if (id === S.srcId) selectSource(S.sources[0] && S.sources[0].id); listsDialog(); render(); });
}

/* ---------- wiring ---------- */
[['#bBack', 'back'], ['#bSearch', 'search'], ['#bGuide', 'guide'], ['#bSet', 'gear'], ['#qWrap .si', 'search'], ['#pExpand', 'expand'], ['#cExit', 'back'], ['#cBack', 'rew'], ['#cFwd', 'fwd'], ['#cPlay', 'pause'], ['#bigPlay', 'play'], ['#cPrev', 'down'], ['#cNext', 'up'], ['#cList', 'list'], ['#cTrk', 'cc'], ['#cAsp', 'aspect'], ['#cPip', 'pip'], ['#cRec', 'rec'], ['#cMute', 'vol']].forEach(([s, n]) => { $(s).innerHTML = ic(n); });
$('#bBack').onclick = () => back(); $('#bSearch').onclick = () => { S.q = ''; $('#q').value = ''; go('search'); }; $('#bGuide').onclick = openGuide; $('#bSet').onclick = settingsDialog; $('#logo').onclick = () => go('home');
let qT; $('#q').oninput = e => { S.q = e.target.value; S.shown = 250; clearTimeout(qT); qT = setTimeout(() => S.view === 'search' ? renderSearch() : renderList(), 150); };
$('#cFav').onclick = () => toggleFav(S.cur); $('#cPrev').onclick = () => zap(-1); $('#cNext').onclick = () => zap(1); $('#cRec').onclick = toggleRec; $('#cList').onclick = () => quick ? closeQuick() : openQuick();
$('#cMute').onclick = () => { v.muted = !v.muted; $('#cMute').innerHTML = ic(v.muted ? 'mute' : 'vol'); };
$('#pExpand').onclick = e => { e.stopPropagation(); enterFs(); }; $('#cExit').onclick = () => back(); $('#bigPlay').onclick = e => { e.stopPropagation(); togglePlay(); };
$('#ovBot').addEventListener('click', () => showOv()); $('#ovTop').addEventListener('click', () => showOv());
document.body.appendChild($('#num')); $('#slot').appendChild(screenEl);

/* ---------- remote / keyboard ---------- */
function spatial(k, scope) {
  const cur = document.activeElement, els = $$('button, [tabindex="0"], input, select', scope || document).filter(el => { if (el.disabled || el.closest('[hidden]')) return false; if (!scope && dlg.contains(el)) return false; if (fsOn ? !screenEl.contains(el) : screenEl.contains(el) && el.id !== 'pExpand') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  if (!cur || cur === document.body || !els.includes(cur)) { const vis = el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }; const f = (!scope && !fsOn && els.find(el => el.closest('.view') && vis(el))) || els.find(vis) || els[0]; if (f) { f.focus(); return true; } return false; }
  const a = cur.getBoundingClientRect(); let best = null, bs = 1e9;
  for (const el of els) { if (el === cur) continue; const b = el.getBoundingClientRect(); let main, cross;
    if (k === 'ArrowRight') { if (b.left < a.right - 4) continue; main = b.left - a.right; cross = Math.abs((b.top + b.bottom) / 2 - (a.top + a.bottom) / 2); }
    else if (k === 'ArrowLeft') { if (b.right > a.left + 4) continue; main = a.left - b.right; cross = Math.abs((b.top + b.bottom) / 2 - (a.top + a.bottom) / 2); }
    else if (k === 'ArrowDown') { if (b.top < a.bottom - 4) continue; main = b.top - a.bottom; cross = Math.abs((b.left + b.right) / 2 - (a.left + a.right) / 2); }
    else { if (b.bottom > a.top + 4) continue; main = a.top - b.bottom; cross = Math.abs((b.left + b.right) / 2 - (a.left + a.right) / 2); }
    const sc = main + cross * 2.2; if (sc < bs) { bs = sc; best = el; } }
  if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return true; } return false;
}
document.addEventListener('keydown', e => {
  const k = e.key;
  if (dlg.open) { if (k.startsWith('Arrow') && !/input|textarea|select/i.test(e.target.tagName)) { if (spatial(k, dlg)) e.preventDefault(); } return; }
  if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack') { e.preventDefault(); if (numBuf) { numBuf = ''; $('#num').hidden = true; return; } back(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return; const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') { if (k === 'ArrowDown' && e.target.id === 'q') { e.preventDefault(); e.target.blur(); spatial(k); } return; }
  if (/^[0-9]$/.test(k)) { e.preventDefault(); numKey(k); return; }
  if (k === 'Enter' && numBuf) { e.preventDefault(); commitNum(); return; }
  if (quick && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); const a = $$('.ch', quick), i = a.indexOf(document.activeElement), n = a[Math.max(0, Math.min(a.length - 1, i + (k === 'ArrowDown' ? 1 : -1)))]; if (n) { n.focus(); n.scrollIntoView({ block: 'nearest' }); } return; }
  if (k === 'ChannelUp' || k === 'PageUp') { e.preventDefault(); zap(1); return; }
  if (k === 'ChannelDown' || k === 'PageDown') { e.preventDefault(); zap(-1); return; }
  const lk = k.toLowerCase();
  if (fsOn) {
    showOv(); const onBtn = e.target.closest && e.target.closest('#ov button');
    if (isVodNow()) { if (k === ' ' || (k === 'Enter' && !onBtn) || k === 'MediaPlayPause') { e.preventDefault(); togglePlay(); return; } if (!onBtn && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); seekBy(k === 'ArrowLeft' ? -10 : 10); return; } if (k.startsWith('Arrow')) { if (spatial(k)) e.preventDefault(); return; } }
    else { if (k === 'ArrowUp') { e.preventDefault(); zap(1); return; } if (k === 'ArrowDown') { e.preventDefault(); zap(-1); return; } if ((k === 'Enter' && !onBtn) || k === 'ArrowRight') { e.preventDefault(); quick ? closeQuick() : openQuick(); return; } if (k === 'ArrowLeft') { closeQuick(); return; } }
    if (k === 'Backspace') { e.preventDefault(); lastChannel(); return; }
  } else if (k.startsWith('Arrow')) { if (spatial(k)) e.preventDefault(); return; }
  else if (k === 'Backspace') { e.preventDefault(); back(); return; }
  if (lk === 'f') toggleFav(S.cur); else if (lk === 'l') lastChannel(); else if (lk === 'm') $('#cMute').click(); else if (lk === 'r') toggleRec(); else if (lk === 'z') { fsOn ? back() : enterFs(); } else if (lk === 'i' && S.cur) showOsd(S.cur);
});

/* ---------- start ---------- */
if (/Tizen|Web0S|SmartTV|HbbTV|AFT|Android TV|CrKey|BRAVIA|GoogleTV/i.test(navigator.userAgent) && !('tv' in LS.get('ap.set', {}))) { S.set.tv = true; }
if (NATIVE && Capacitor.Plugins && Capacitor.Plugins.App) Capacitor.Plugins.App.addListener('backButton', () => { if (!back()) Capacitor.Plugins.App.exitApp(); });
S.last = LS.get('ap.last', ''); window.__player = { S, play, byNumber, numKey, zap, parseM3U, parseXMLTV, finish, go, back };
applyLook(); tick(); setInterval(tick, 15000);
{ const h = location.hash.slice(1); history.replaceState({ d: 0 }, '', '#' + (['live', 'movies', 'series', 'search'].includes(h) ? h : 'home')); }
route(); if (S.sources.length) selectSource(S.srcId || S.sources[0].id);
})();
