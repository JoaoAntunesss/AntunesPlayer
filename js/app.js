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
const S0 = 0;
const S = { lists: LS.get('ap.lists', []), vis: [], unlocked: false, sort: {}, sources: LS.get('ap.sources', []), srcId: LS.get('ap.src', ''), channels: [], favs: LS.get('ap.favs', []), recent: LS.get('ap.recent', []), set: Object.assign({ proxy: '', proxyStreams: false, numberMode: 'chno', theme: 'night', tv: false }, LS.get('ap.set', {})), group: 'all', q: '', shown: 250, cur: null, last: null, epg: {}, byNum: {}, byKey: {} };
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
    const st = this.stats; st.loading.start = performance.now(); const bin = ctx.responseType === 'arraybuffer', headers = Object.assign({}, uaHdr());
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
const uaHdr = () => { const u = NATIVE && srcUA(); return u ? { 'User-Agent': u } : {}; };
async function fetchText(u, force) { const r = await fetch(proxied(u, true === force || !!S.set.proxy), { cache: 'no-store', headers: uaHdr() }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }
async function loadSource(src) {
  if (src.type === 'xtream') {
    const base = src.server.replace(/\/+$/, ''), api = a => fetchJson(`${base}/player_api.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}&action=${a}`);
    const [cats, live, vod, vcats, ser, scats] = await Promise.all([api('get_live_categories'), api('get_live_streams'), api('get_vod_streams').catch(() => []), api('get_vod_categories').catch(() => []), api('get_series').catch(() => []), api('get_series_categories').catch(() => [])]);
    const cm = {}, vm = {}, sm = {}; (scats || []).forEach(c => sm[c.category_id] = c.category_name); (cats || []).forEach(c => cm[c.category_id] = c.category_name); (vcats || []).forEach(c => vm[c.category_id] = c.category_name);
    const list = (live || []).map(x => ({ name: x.name, logo: x.stream_icon || '', group: cm[x.category_id] || '', tvg: x.epg_channel_id || '', num: parseInt(x.num, 10) || 0, url: `${base}/live/${encodeURIComponent(src.user)}/${encodeURIComponent(src.pass)}/${x.stream_id}.m3u8`, kind: 'live', sid: x.stream_id, arch: +x.tv_archive || 0, archD: +x.tv_archive_duration || 0 }))
      .concat((vod || []).map(x => ({ name: x.name, logo: x.stream_icon || '', vodId: x.stream_id, rating: parseFloat(x.rating) || 0, added: +x.added || 0, group: vm[x.category_id] || 'Movies', tvg: '', num: 0, url: `${base}/movie/${encodeURIComponent(src.user)}/${encodeURIComponent(src.pass)}/${x.stream_id}.${x.container_extension || 'mp4'}`, kind: 'vod' })))
      .concat((ser || []).map(x => ({ name: x.name, logo: x.cover || '', group: sm[x.category_id] || 'Series', tvg: '', num: 0, url: 'xtream-series:' + x.series_id, seriesId: x.series_id, rating: parseFloat(x.rating) || 0, added: +x.last_modified || 0, kind: 'series' })));
    const acct = await fetchJson(`${base}/player_api.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}`).then(d => d && d.user_info ? { exp: +d.user_info.exp_date || 0, max: d.user_info.max_connections, act: d.user_info.active_cons, status: d.user_info.status, tz: d.server_info && d.server_info.timezone || '' } : null).catch(() => null);
    return { acct, list: finish(list), epg: src.epg || `${base}/xmltv.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}` };
  }
  const text = src.text != null ? src.text : await fetchText(src.url, true), p = parseM3U(text); return { list: finish(p.list), epg: src.epg || p.epg };
}
async function fetchJson(u) { const r = await fetch(proxied(u, true === !!S.set.proxy), { cache: 'no-store', headers: uaHdr() }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }

/* ---------- TV guide (XMLTV) ---------- */
const decodeXml = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(amp|lt|gt|quot|apos|#39);/g, (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }[k]));
function xtime(s) { const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\s*([+-]\d{4})?/.exec(s || ''); if (!m) return 0; let off = 0; if (m[7]) off = (m[7][0] === '-' ? -1 : 1) * (parseInt(m[7].slice(1, 3), 10) * 60 + parseInt(m[7].slice(3, 5), 10)) * 60000; return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - off; }
function parseXMLTV(xml) {
  const now = Date.now(), res = {}, re = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g; let m;
  while ((m = re.exec(xml))) {
    const a = {}; m[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => { a[k] = v; });
    const s = xtime(a.start), e = xtime(a.stop); if (!e || e < now - 72 * 3600e3 || s > now + 30 * 3600e3) continue;
    const tm = /<title[^>]*>([\s\S]*?)<\/title>/.exec(m[2]), dm = /<desc[^>]*>([\s\S]*?)<\/desc>/.exec(m[2]); (res[a.channel] = res[a.channel] || []).push({ s, e, t: tm ? decodeXml(tm[1]).trim() : '', d: dm ? decodeXml(dm[1]).trim().slice(0, 400) : '' });
  }
  Object.keys(res).forEach(k => res[k].sort((x, y) => x.s - y.s)); return res;
}
// Parsing a big XMLTV file can freeze a TV for seconds: do it in a background worker when possible.
let epgWorkerUrl = null;
function parseXMLTVAsync(buf) {
  if (!window.Worker || !window.Blob) return Promise.resolve(parseXMLTV(new TextDecoder().decode(buf)));
  try {
    epgWorkerUrl = epgWorkerUrl || URL.createObjectURL(new Blob([`const ${decodeXml.name}=${decodeXml.toString()};${xtime.toString()};${parseXMLTV.toString()};onmessage=e=>{try{postMessage({ok:${parseXMLTV.name}(new TextDecoder().decode(e.data))})}catch(x){postMessage({err:String(x)})}}`], { type: 'text/javascript' }));
    return new Promise(ok => { const w = new Worker(epgWorkerUrl); const done = r => { w.terminate(); ok(r); }; w.onmessage = e => done(e.data.ok || parseXMLTV(new TextDecoder().decode(buf))); w.onerror = () => done(parseXMLTV(new TextDecoder().decode(buf))); w.postMessage(buf); });
  } catch (e) { return Promise.resolve(parseXMLTV(new TextDecoder().decode(buf))); }
}
async function loadEpg(id, url) {
  if (!url) return; const cache = await idbGet('epg:' + id);
  if (cache && Date.now() - cache.at < 6 * 3600e3) { S.epg = shiftEpg(cache.data); render(); return; }
  try {
    const r = await fetch(proxied(url, !!S.set.proxy), { cache: 'no-store' }); if (!r.ok) return; let buf = new Uint8Array(await r.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b && window.DecompressionStream) { const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))); buf = new Uint8Array(await ds.arrayBuffer()); }
    const data = await parseXMLTVAsync(buf); S.epg = shiftEpg(data); idbSet('epg:' + id, { at: Date.now(), data }); render(); if (S.cur) showInfo(S.cur);
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
  S.srcId = id; LS.set('ap.src', id); S.epg = {}; S.loadErr = ''; let data = refresh ? null : await idbGet('ch:' + id); if (data && data.v !== 3) data = null;
  if (!data) { S.loading = true; render(); try { data = await loadSource(src); data.v = 3; data.at = Date.now(); await idbSet('ch:' + id, data); } catch (e) { S.loading = false; S.loadErr = t('Could not load the playlist') + ': ' + e.message; render(); return; } }
  S.loading = false; S.channels = data.list; S.acct = data.acct || null; src.epgUrl = data.epg; indexChannels(); refreshVis(); S.shown = 250; render(); loadEpg(id, data.epg);
  if (!S.booted) { S.booted = true; bootLast(); }
  if (!refresh && S.set.autoRefresh !== false && Date.now() - (data.at || 0) > 24 * 3600e3) setTimeout(async () => { // refresh the channel list quietly once a day
    try { const nd = await loadSource(src); nd.v = 3; nd.at = Date.now(); await idbSet('ch:' + id, nd); if (S.srcId !== id) return; S.channels = nd.list; S.acct = nd.acct || S.acct; indexChannels(); refreshVis(); if (!fsOn) render(); toast(t('Playlist updated')); } catch (e) { }
  }, 8000);
}
/* ---------- import / export favourites (JSON) ---------- */
const normName = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^[a-z]{2,3}\s*[:|\-]\s*/, '').replace(/\b(fhd|uhd|hd|sd|4k|hevc|h265|backup|\d{3,4}p)\b/g, '').replace(/[^a-z0-9]+/g, '');
function importFavs(text) {
  let d; try { d = JSON.parse(text); } catch (e) { toast(t('This file is not valid JSON')); return; }
  // accepts arrays, {favorites:[...]} and the {"0":"name","1":"name",…,"size":n} format some other apps export
  const toList = v => { if (Array.isArray(v)) return v; if (!v || typeof v !== 'object') return []; const inner = v.favorites || v.favourites || v.favoritos || v.channels || v.canais || v.list || v.items; if (inner) return toList(inner); const ks = Object.keys(v).filter(k => /^\d+$/.test(k)).sort((x, y) => x - y); return ks.map(k => v[k]); };
  d = toList(d);
  const live = S.channels.filter(c => c.kind === 'live'), byUrl = {}, bySid = {}, byName = {}, byNorm = {}, byNum = S.byNum;
  live.forEach(c => { byUrl[c.url] = c; if (c.sid != null) bySid[String(c.sid)] = c; byName[(c.name || '').toLowerCase().trim()] = byName[(c.name || '').toLowerCase().trim()] || c; const n = normName(c.name); if (n) byNorm[n] = byNorm[n] || c; });
  const found = [], missing = [];
  d.forEach(it => {
    const o = typeof it === 'object' && it ? it : { name: it }, name = o.name || o.title || o.channel || o.canal || '';
    const c = (o.url && byUrl[o.url]) || ((o.stream_id || o.id || o.sid) != null && bySid[String(o.stream_id || o.id || o.sid)]) || (name && byName[String(name).toLowerCase().trim()]) || (name && byNorm[normName(name)]) || (typeof it === 'number' && byNum[it]) || (o.num && !name && byNum[+o.num]);
    if (c) { if (!found.includes(c)) found.push(c); } else missing.push(name || JSON.stringify(it).slice(0, 40));
  });
  const before = S.favs.length; found.forEach(c => { if (!S.favs.includes(c.key)) S.favs.push(c.key); }); LS.set('ap.favs', S.favs); render();
  openDlg(`<h2>${ic('star')} ${t('Favourites imported')}</h2><p>${t('Added')}: <b>${S.favs.length - before}</b> · ${t('already there')}: ${found.length - (S.favs.length - before)} · ${t('not found')}: ${missing.length}</p>${missing.length ? `<p class="mut">${t('Not found in this playlist')}:</p><div class="catm">${missing.slice(0, 200).map(m => `<div class="cm"><span><b>${esc(m)}</b></span></div>`).join('')}</div>` : ''}<div class="row"><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close();
}
function favsJson() { return JSON.stringify({ app: 'AntunesPlayer', favorites: favLive().map((c, i) => ({ pos: i + 1, name: c.name, num: c.num || null, stream_id: c.sid != null ? c.sid : undefined, group: c.group || '', url: c.url })) }, null, 2); }
function backupDialog() {
  const dump = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('ap.') && !['ap.pos', 'ap.dur', 'ap.updT'].includes(k)) o[k] = localStorage.getItem(k); } return JSON.stringify({ app: 'AntunesPlayer', backup: o }); };
  openDlg(`<h2>${ic('stack')} ${t('Backup')}</h2><p class="mut">${t('Copies your playlists (with logins), favourites and settings. Paste it back after reinstalling. Keep it private: it contains your passwords.')}</p><textarea id="bTxt" rows="5"></textarea><div class="row" style="justify-content:space-between"><button class="btn" id="bCopy">${t('Copy backup')}</button><span><button class="btn" id="dx">${t('Cancel')}</button> <button class="btn p" id="bRest">${t('Restore')}</button></span></div>`);
  $('#dx').onclick = () => dlg.close();
  $('#bCopy').onclick = async () => { const d = dump(); try { await navigator.clipboard.writeText(d); toast(t('Copied')); } catch (e) { $('#bTxt').value = d; $('#bTxt').select(); toast(t('Select and copy the text')); } };
  $('#bRest').onclick = () => { try { const o = JSON.parse($('#bTxt').value).backup; if (!o) throw 0; Object.keys(o).forEach(k => { if (k.startsWith('ap.')) localStorage.setItem(k, o[k]); }); toast(t('Restored')); setTimeout(() => location.reload(), 600); } catch (e) { toast(t('This file is not valid JSON')); } };
}
function favsDialog() {
  openDlg(`<h2>${ic('star')} ${t('Favourites')}</h2><p class="mut">${t('Import a JSON file with channel names (or Xtream stream_id / links). They are added to your favourites in the file order.')}</p>
  <label>${t('JSON file')}</label><input id="fFile" type="file"><label>${t('or paste the JSON')}</label><textarea id="fText" rows="4" placeholder='["RTP 1 HD", "SIC HD", {"name": "TVI"}]'></textarea>
  <div class="row" style="justify-content:space-between"><span><button class="btn" id="fExp">${t('Export')}</button> <button class="btn" id="fCopy">${t('Copy JSON')}</button></span><span><button class="btn" id="dx">${t('Cancel')}</button> <button class="btn p" id="fImp">${t('Import')}</button></span></div>`);
  $('#dx').onclick = () => dlg.close();
  $('#fImp').onclick = async () => { const f = $('#fFile').files[0], txt = f ? await f.text() : $('#fText').value; if (!txt.trim()) { toast(t('Fill in the fields')); return; } importFavs(txt); };
  $('#fExp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([favsJson()], { type: 'application/json' })); a.download = 'antunesplayer-favoritos.json'; document.body.appendChild(a); a.click(); a.remove(); };
  $('#fCopy').onclick = async () => { try { await navigator.clipboard.writeText(favsJson()); toast(t('Copied')); } catch (e) { $('#fText').value = favsJson(); $('#fText').select(); toast(t('Select and copy the text')); } };
}
/* ---------- TV detection: TV browsers by name, Android TV / Google TV by the app (system TV mode) or by having no touch screen ---------- */
function isTvDevice() {
  return !!window.AP_IS_TV || /Tizen|Web0S|webOS|SmartTV|SMART-TV|HbbTV|NetCast|AFT[A-Z]|Android TV|GoogleTV|CrKey|BRAVIA|AndroidTV|PhilipsTV|VIDAA|Hisense/i.test(navigator.userAgent)
    || (NATIVE && (navigator.maxTouchPoints === 0 || matchMedia('(pointer: none)').matches));
}
function liteOn() { const m = S.set.lite || 'auto'; if (m === 'on') return true; if (m === 'off') return false; return !!S.set.tv || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency || 8) <= 4; }
function applyLite() { const on = liteOn(); document.documentElement.classList.toggle('lite', on); return on; }
function applyTvMode() {
  if (!S.set.tvMode) S.set.tvMode = ('tv' in S.set && S.set.tv && !isTvDevice()) ? 'on' : 'auto';
  const on = S.set.tvMode === 'on' || (S.set.tvMode === 'auto' && isTvDevice());
  S.set.tv = on; saveSet(); document.body.classList.toggle('tv', on); if (on) lastInput = 'key'; applyLite();
  $('#cList small').textContent = on ? t('Press ◀ on the remote') : t('Tap or swipe up');
  if (on && S.view && !fsOn) setTimeout(tvFocus, 50);
}
function bootLast() {
  if (window.AP_AMBIENT) { ambientStart(); return; }
  if ((S.set.startup || 'last') !== 'last' || !['home', 'live', ''].includes(location.hash.slice(1))) return;
  const c = S.byKey[LS.get('ap.cur', '')]; if (!c || c.kind !== 'live' || !S.vis.includes(c)) return;
  if (favLive().includes(c)) { S.gsel.live = 'fav'; LS.set('ap.gsel', S.gsel); }
  go('live'); enterFsFor(c);
}
const fold = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); // 'Notícias' and 'noticias' match
const LNC = new WeakMap(); const lname = c => { let n = LNC.get(c); if (n === undefined) { n = fold(c.name); LNC.set(c, n); } return n; }; // folded names cached for fast search
function indexChannels() { S.byNum = {}; S.byKey = {}; S.channels.forEach(c => { S.byKey[c.key] = c; if (c.kind === 'live' && c.num && !S.byNum[c.num]) S.byNum[c.num] = c; }); }
const favList = () => S.favs.map(k => S.byKey[k]).filter(Boolean);
function baseList() {
  const g = S.group; let l;
  if (g.startsWith('u:')) { const L = S.lists.find(x => 'u:' + x.id === g); l = L ? L.keys.map(k => S.byKey[k]).filter(c => c && S.vis.includes(c)) : []; } else if (g === 'fav') l = favList().filter(c => c.kind === kindOf(S.mode)); else if (g === 'recent') l = S.recent.map(k => S.byKey[k]).filter(c => c && c.kind === 'live');
  else if (g === 'all') l = S.vis.filter(c => c.kind === 'live'); else if (g.startsWith('v:')) l = S.vis.filter(c => c.kind === 'vod' && (c.group || '—') === g.slice(2)); else if (g.startsWith('s:')) l = S.vis.filter(c => c.kind === 'series' && (c.group || '—') === g.slice(2)); else if (g === '_vod' || g === '_vod!') l = S.vis.filter(c => c.kind === 'vod'); else if (g === '_series' || g === '_series!') l = S.vis.filter(c => c.kind === 'series');
  else l = S.vis.filter(c => c.kind === 'live' && c.group === g.slice(2));
  return l;
}
function shownNum(c) { if (c.kind !== 'live') return ''; if (S.set.numberMode === 'favs' && S.favs.length) { const i = favLive().indexOf(c); return i < 0 ? '' : i + 1; } return c.num || ''; }
const gkey = c => c.kind + ':' + (c.group || '—');
const lockedSet = () => new Set(S.set.pin ? (S.set.locked || []) : []);
function refreshVis() { const H = new Set(S.set.hidden || []), L = lockedSet(); S.vis = S.channels.filter(c => { const g = gkey(c); return !H.has(g) && (S.unlocked || !L.has(g)); }); }
const favLive = () => favList().filter(c => c.kind === 'live');

/* ---------- player ---------- */
const v = $('#v'); let hls = null, mpg = null, osdT, numBuf = '', numT, retried = false, rec = null;
function destroyPlayer() { $$('#v track[data-os]').forEach(x => x.remove()); if (hls) { try { hls.destroy(); } catch (e) { } hls = null; } if (mpg) { try { mpg.destroy(); } catch (e) { } mpg = null; } v.removeAttribute('src'); try { v.load(); } catch (e) { } }
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
/* Colours per channel: some TV boxes show certain HD streams with red and blue swapped (red shirts look blue).
   1 = swap red and blue back, 2 = compatible drawing (the video goes through the GPU, which fixes it on some boxes). */
const COLFIX = LS.get('ap.colfix', {});
document.body.insertAdjacentHTML('beforeend', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="rbSwap" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 1 0 0 0 1 0 0 0 1 0 0 0 0 0 0 0 1 0"/></filter></svg>');
function applyColor(c) { const m = (c && COLFIX[c.key]) || 0; v.style.filter = m === 1 ? 'url(#rbSwap)' : m === 2 ? 'saturate(1.001)' : ''; }
Object.assign(PT, { 'Colours': 'Cores', 'Normal': 'Normal', 'Swap red / blue': 'Trocar vermelho / azul', 'Compatible': 'Compatível', 'Colours wrong? Try the options below (saved for this channel).': 'Cores estranhas? Experimenta as opções (fica guardado para este canal).' });
async function play(c, isRetry) {
  if (!c) return; if (S.cur && S.cur.key !== c.key) S.last = S.cur.key; if (!isRetry) { retried = false; } if (S.cur && S.cur.key !== c.key) LS.set('ap.last', S.cur.key);
  S.cur = c; applyColor(c); LS.set('ap.cur', c.key); S.recent = [c.key].concat(S.recent.filter(k => k !== c.key)).slice(0, 30); LS.set('ap.recent', S.recent);
  S.dbg = ''; stopRec(true); destroyPlayer(); $('#screen').classList.toggle('vod', c.kind !== 'live'); $('#msg').hidden = true; spin(true); showOsd(c); showInfo(c); updateFavBtn(); $$('#list .ch').forEach(r => r.classList.toggle('on', r.dataset.k === c.key));
  const cu = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url, url = proxied(cu), isHls = /m3u8/i.test(cu), isTs = (c.kind === 'live' || c.kind === 'catchup') && !isHls && !/\.(mp4|mkv|webm|avi|mov)(\?|$)/i.test(cu);
  try {
    if (isHls) {
      if (!window.Hls && (NATIVE || !v.canPlayType('application/vnd.apple.mpegurl'))) await loadScript('js/hls.min.js'); // in the app, hls.js + native HTTP is more reliable than the WebView's own HLS
      if (window.Hls && Hls.isSupported()) { hls = new Hls(Object.assign({ lowLatencyMode: !document.documentElement.classList.contains('lite'), maxBufferLength: 20, backBufferLength: 30, startFragPrefetch: true, manifestLoadPolicy: { default: { maxTimeToFirstByteMs: 12000, maxLoadTimeMs: 15000, timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 }, errorRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 } } }, playlistLoadPolicy: { default: { maxTimeToFirstByteMs: 12000, maxLoadTimeMs: 15000, timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 }, errorRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 } } } }, nativeHttp() ? { loader: NativeLoader } : {})); hls.loadSource(url); hls.attachMedia(v); hls.on(Hls.Events.ERROR, (_, d) => { S.dbg = (d.details || '') + (d.reason ? ' ' + d.reason : '') + (d.error && d.error.message ? ' ' + d.error.message : ''); if (!d.fatal) return; if (d.type === Hls.ErrorTypes.NETWORK_ERROR && !retried && !/manifest|level/i.test(d.details || '')) { retried = true; hls.startLoad(); } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !retried) { retried = true; hls.recoverMediaError(); } else if (!c.useTs && /\/live\/[^/]+\/[^/]+\/[^/]+\.m3u8/i.test(c.url)) { c.useTs = true; play(c, true); } else showMsg(t('Could not play this'), whyHtml(c.url, c.url !== url, (d.details || '') + (d.response && d.response.code ? ' · HTTP ' + d.response.code : '')), true); }); }
      else v.src = url;
    } else if (isTs) {
      if (!window.mpegts) await loadScript('js/mpegts.min.js');
      if (window.mpegts && mpegts.isSupported()) { mpg = mpegts.createPlayer({ type: 'mpegts', isLive: c.kind === 'live', url }, { enableWorker: true, liveBufferLatencyChasing: true, headers: uaHdr(), autoCleanupSourceBuffer: true }); mpg.attachMediaElement(v); mpg.load(); mpg.on(mpegts.Events.ERROR, (a, b) => { const was = c.useTs; c.useTs = false; showMsg(t('Could not play this'), whyHtml(c.url, c.url !== url, String(b || a || '')), true); }); }
      else v.src = url;
    } else v.src = url;
    await v.play().catch(err => { if (err && err.name === 'NotAllowedError') { v.muted = true; $('#cMute').innerHTML = ic('mute'); v.play().catch(() => { }); toast(t('Tap for sound')); } });
    if (c.kind !== 'live' && c.kind !== 'catchup') autoSubs(c);
    if (c.kind === 'live' && NATIVE && Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.share) Capacitor.Plugins.ExtPlayer.share({ url: cu, name: c.name || '', ua: uaHdr()['User-Agent'] || '' }).catch(() => { }); // TV home screen background
  } catch (e) { showMsg(t('Could not play this'), whyHtml(c.url, false, String(e && e.message || e)), true); }
}
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
v.addEventListener('playing', () => { spin(false); $('#msg').hidden = true; if (v.animate && !RM && v.currentTime < 3) v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' }); }); v.addEventListener('waiting', () => { if (S.cur) spin(true); }); v.addEventListener('error', () => { if (S.cur && v.getAttribute('src')) showMsg(t('Could not play this'), whyHtml(S.cur.url, proxied(S.cur.url) !== S.cur.url, (v.error ? 'media error ' + v.error.code + (v.error.message ? ' ' + v.error.message : '') : '') + (S.dbg ? ' · ' + S.dbg : '')), true); });
function showOsd(c) { const o = $('#osd'); if (o && o.animate && !RM) o.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' }); const n = shownNum(c); $('#osdN').innerHTML = seg(n); $('#osdT').textContent = c.name; $('#osdS').textContent = c.group || ''; liveBar(c); if (fsOn) showOv(); }
function liveBar(c) { const nn = c.kind === 'live' ? nowNext(c) : null; $('#liveBar').hidden = !(nn && nn.now); if (nn && nn.now) { $('#lbNow').innerHTML = `<b>${hm(nn.now.s)}</b> ${esc(nn.now.t)}`; $('#lbPb').style.width = Math.max(0, Math.min(100, Math.round((Date.now() - nn.now.s) / (nn.now.e - nn.now.s) * 100))) + '%'; $('#lbNext').innerHTML = nn.next ? `<b>${hm(nn.next.s)}</b> ${esc(nn.next.t)}` : ''; } }
function showInfo(c) {
  const box = $('#info'); if (!box || c.kind !== 'live') return;
  const l = epgFor(c), n = Date.now(), up = l ? l.filter(p => p.e > n).slice(0, 8) : [], past = l && c.arch ? l.filter(p => p.e <= n && canCatch(c, p)).slice(-6) : [];
  box.innerHTML = `<div class="ihead"><span class="lgw">${logoHtml(c)}</span><div><b><em>${seg(shownNum(c))}</em> ${esc(c.name)}</b><small>${esc(c.group || '')}</small></div><button class="ib" id="iList" aria-label="${t('Add to list')}">${ic('stack')}</button><button class="ib" id="iFs" aria-label="${t('Full screen')}">${ic('expand')}</button></div>` + (past.length ? `<div class="epg past">${past.map(p => `<button data-ps="${p.s}">${ic('archive')}<time>${hm(p.s)}</time><span>${esc(p.t)}</span></button>`).join('')}</div>` : '') + (up.length ? `<div class="epg">${up.map(p => `<div class="${p.s <= n ? 'now' : ''}"><time>${hm(p.s)}</time><span>${esc(p.t)}</span>${p.s <= n ? `<i style="width:${Math.round((n - p.s) / (p.e - p.s) * 100)}%"></i>` : ''}</div>`).join('')}</div>` : `<p class="mut">${t('No programme guide for this channel')}</p>`);
  $('#iFs').onclick = enterFs; $('#iList').onclick = () => addToListDialog(c); $$('#info [data-ps]').forEach(b => b.onclick = () => { const p = l.find(x => x.s === +b.dataset.ps); if (p) playCatch(c, p); });
}
function zapList() { const m = S.mode; S.mode = 'live'; const g = S.group; S.group = S.gsel.live; const l = baseList().filter(c => c.kind === 'live'); S.group = g; S.mode = m; return l.length ? l : S.channels.filter(c => c.kind === 'live'); }
function zap(dir) { const l = zapList(); if (!l.length) return; let i = S.cur ? l.findIndex(c => c.key === S.cur.key) : -1; i = i < 0 ? (dir > 0 ? 0 : l.length - 1) : (i + dir + l.length) % l.length; play(l[i]); const r = $(`#list .ch[data-k="${l[i].key}"]`); if (r) r.scrollIntoView({ block: 'nearest' }); }
function byNumber(n) { if (S.set.numberMode === 'favs' && favLive().length) return favLive()[n - 1]; return S.byNum[n]; }
function numKey(d) {
  numBuf = (numBuf + d).slice(0, 4); const n = $('#num'); n.hidden = false; const c = byNumber(+numBuf); n.innerHTML = `${seg(numBuf.padStart(3, ' ').replace(/ /g, '-'))}<small>${c ? esc(c.name) : t('No channel')}</small>`; clearTimeout(numT); numT = setTimeout(commitNum, 1500);
}
function commitNum() { clearTimeout(numT); const n = +numBuf; numBuf = ''; $('#num').hidden = true; if (!n && n !== 0) return; const c = byNumber(n); if (!c) { toast(t('No channel') + ' ' + n); return; } if (fsOn || (S.view === 'browse' && S.mode === 'live')) play(c); else enterFsFor(c); }
function lastChannel() { const k = LS.get('ap.last', ''), c = S.byKey[S.last || k]; if (c && (!S.cur || c.key !== S.cur.key)) play(c); else toast(t('Last channel') + ' —'); }


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
      `<label>${t('TV guide link (XMLTV, optional)')}</label><input id="aEpg" type="url" placeholder="https://…/guide.xml">${NATIVE ? `<label>${t('User-Agent (optional, some providers need it)')}</label><input id="aUA" placeholder="VLC/3.0.20 LibVLC/3.0.20" autocomplete="off">` : ''}<div class="row"><button class="btn" id="aCancel">${t('Cancel')}</button><button class="btn p" id="aOk">${t('Add')}</button></div>`);
    $$('.tabs button', dlg).forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); }); $('#aCancel').onclick = () => dlg.close();
    $('#aOk').onclick = async () => {
      const name = ($('#aName').value || '').trim() || 'My TV', epg = ($('#aEpg').value || '').trim(), ua = $('#aUA') ? $('#aUA').value.trim() : '';
      if (tab === 'url') { const u = ($('#aUrl').value || '').trim(); if (!/^https?:\/\//i.test(u)) { toast(t('Fill in the fields')); return; } addSource({ name, type: 'm3u', url: u, epg, ua }); }
      else if (tab === 'text') { let txt = $('#aText').value, f = $('#aFile').files[0]; if (f) txt = await f.text(); if (!txt || !/#EXTINF/i.test(txt)) { toast(t('Fill in the fields')); return; } addSource({ name, type: 'm3u', text: txt, epg, ua }); }
      else { const server = $('#xS').value.trim(), user = $('#xU').value.trim(), pass = $('#xP').value; if (!/^https?:\/\//i.test(server) || !user) { toast(t('Fill in the fields')); return; } addSource({ name, type: 'xtream', server, user, pass, epg, ua }); }
    };
  };
  draw();
}
/* settings split into tabs (built from the same controls, so every option keeps working) */
Object.assign(PT, { 'Light mode (smoother on weak TVs)': 'Modo leve (mais fluido em TVs fracas)', 'on': 'ligado', 'off': 'desligado', 'General': 'Geral', 'Look': 'Aspeto', 'Player': 'Leitor', 'About': 'Sobre' });
const SET_TABS = [['general', 'General', 'home'], ['look', 'Look', 'sun'], ['player', 'Player', 'play'], ['lists', 'Playlists', 'stack'], ['account', 'Account', 'user'], ['about', 'About', 'info']];
const SET_MAP = { sAcc: 'account', sPin: 'account', sStart: 'general', sNum: 'general', sTv: 'general', sLang: 'general', sStyle: 'look', sTheme: 'look', cAcc: 'look', cFx: 'look', sDig: 'look', sBg: 'look', cRst: 'look', sPan: 'look', sSub: 'player', sOff: 'player', sAuto: 'lists', sProxy: 'lists', sPS: 'lists', sSA: 'player', sOK: 'player', sOU: 'player', sCats: 'account', sBak: 'lists', sFavs: 'lists', sUpd: 'about' };
function tabOfNode(n) {
  if (!n || n.nodeType !== 1) return null; const ids = [n.id, ...$$('[id]', n).map(x => x.id)].filter(Boolean);
  for (const id of ids) if (SET_MAP[id]) return SET_MAP[id];
  if (n.matches('[data-sl2]') || $('[data-sl2]', n)) return 'player'; if ($('[data-r]', n) || $('[data-d]', n)) return 'lists'; if (n.classList.contains('keys')) return 'about';
  return null;
}
function tabifySettings() {
  const kids = [...dlg.children], title = kids.shift(), panes = {}, nav = document.createElement('div'); nav.className = 'stabs'; nav.setAttribute('role', 'tablist');
  SET_TABS.forEach(([k, l, i]) => { const p = document.createElement('div'); p.className = 'spane'; p.dataset.pane = k; panes[k] = p; nav.insertAdjacentHTML('beforeend', `<button data-st="${k}" role="tab">${ic(i)}<span>${t(l)}</span></button>`); });
  const last = kids[kids.length - 1], upd = last && $('#sUpd', last); if (upd) panes.about.appendChild(upd);
  let cur = 'general', pending = [];
  kids.slice(0, -1).forEach(n => {
    let tb = tabOfNode(n);
    if (!tb && n.tagName === 'LABEL') tb = tabOfNode(n.nextElementSibling);
    if (!tb && n.tagName === 'H2') { let x = n.nextElementSibling; while (x && !tb) { tb = tabOfNode(x) || (x.tagName === 'LABEL' && tabOfNode(x.nextElementSibling)); x = x.nextElementSibling; } }
    if (n.tagName === 'H2' || n.tagName === 'LABEL') { pending.push(n); if (tb) { pending.forEach(p => panes[tb].appendChild(p)); pending = []; cur = tb; } return; }
    tb = tb || cur; pending.forEach(p => panes[tb].appendChild(p)); pending = []; panes[tb].appendChild(n); cur = tb;
  });
  pending.forEach(p => panes[cur].appendChild(p));
  { const bk = $('#sBak', panes.account), fv = $('#sFavs', panes.account); if (bk || fv) { const r = document.createElement('div'); r.className = 'row'; r.style.justifyContent = 'flex-start'; [bk, fv].forEach(x => x && r.appendChild(x)); panes.lists.insertBefore(r, panes.lists.firstChild); } }
  dlg.innerHTML = ''; dlg.appendChild(title); dlg.appendChild(nav); const body = document.createElement('div'); body.className = 'sbody'; Object.values(panes).forEach(p => { if (p.children.length) body.appendChild(p); else $(`[data-st="${p.dataset.pane}"]`, nav).remove(); }); dlg.appendChild(body); if (last) dlg.appendChild(last);
  dlg.classList.add('settings');
  const show = k => { $$('.spane', dlg).forEach(p => p.hidden = p.dataset.pane !== k); $$('[data-st]', nav).forEach(b => b.classList.toggle('on', b.dataset.st === k)); S.setTab = k; body.scrollTop = 0; };
  $$('[data-st]', nav).forEach(b => b.onclick = () => show(b.dataset.st)); show(S.setTab && panes[S.setTab] && panes[S.setTab].children.length ? S.setTab : 'general');
}
function settingsDialog() {
  const s = S.set;
  openDlg(`<h2>${ic('gear')} ${t('Settings')}</h2><button class="btn" id="sAcc" style="width:100%;justify-content:flex-start;margin-bottom:6px">${ic('user')} ${t('Google account')}${C.user ? ' · ' + esc(C.user.email || '') : ''}</button><label>${t('Style')}</label><select id="sStyle"><option value="circuit" ${(s.style || 'circuit') === 'circuit' ? 'selected' : ''}>${t('Circuit (electronic)')}</option><option value="soft" ${s.style === 'soft' ? 'selected' : ''}>${t('Soft')}</option></select><label>${t('Theme')}</label><select id="sTheme">${THEMES.map(x => `<option value="${x[0]}" ${s.theme === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>
  <label>${t('When the app opens')}</label><select id="sStart"><option value="last" ${(s.startup || 'last') === 'last' ? 'selected' : ''}>${t('Last channel in full screen (favourites)')}</option><option value="home" ${s.startup === 'home' ? 'selected' : ''}>${t('Home screen')}</option></select><label>${t('Number keys jump to')}</label><select id="sNum"><option value="chno" ${s.numberMode === 'chno' ? 'selected' : ''}>${t('Channel numbers from the playlist')}</option><option value="favs" ${s.numberMode === 'favs' ? 'selected' : ''}>${t('My favourites, in order')}</option></select>
  <label>${t('TV mode (remote, bigger text)')}</label><select id="sTv"><option value="auto" ${(s.tvMode || 'auto') === 'auto' ? 'selected' : ''}>${t('Automatic')} · ${isTvDevice() ? t('TV detected') : t('no TV detected')}</option><option value="on" ${s.tvMode === 'on' ? 'selected' : ''}>${t('Always on')}</option><option value="off" ${s.tvMode === 'off' ? 'selected' : ''}>${t('Off')}</option></select>
  <label>${t('Light mode (smoother on weak TVs)')}</label><select id="sLite"><option value="auto" ${(s.lite || 'auto') === 'auto' ? 'selected' : ''}>${t('Automatic')} · ${liteOn() ? t('on') : t('off')}</option><option value="on" ${s.lite === 'on' ? 'selected' : ''}>${t('Always on')}</option><option value="off" ${s.lite === 'off' ? 'selected' : ''}>${t('Off')}</option></select>
  <h2 style="margin-top:18px">${ic('cc')} ${t('Online subtitles')}</h2><label>${t('Subtitle languages (in order)')}</label><div class="row" style="justify-content:flex-start;gap:8px">${[0, 1, 2].map(i => `<select data-sl2="${i}" style="flex:1;min-width:120px"><option value="">—</option>${SUBL.map(x => `<option value="${x[0]}" ${subLangs()[i] === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>`).join('')}</div><label>${t('Turn on subtitles automatically')}</label><select id="sSA"><option value="1" ${s.subAuto !== false ? 'selected' : ''}>${t('Yes')}</option><option value="0" ${s.subAuto === false ? 'selected' : ''}>${t('No')}</option></select><label>${t('OpenSubtitles API key')}</label><input id="sOK" value="${esc(s.osKey || '')}" autocomplete="off" placeholder="${t('Built in (optional: your own key)')}"><label>${t('OpenSubtitles account (optional: 20 a day instead of 5)')}</label><div class="row" style="justify-content:flex-start;gap:8px"><input id="sOU" placeholder="${t('Username')}" value="${esc((LS.get('ap.osu', null) || {}).u || '')}" autocomplete="off" style="flex:1"><input id="sOP" type="password" placeholder="${t('Password')}" value="${esc((LS.get('ap.osu', null) || {}).p || '')}" autocomplete="off" style="flex:1"></div>
  <h2 style="margin-top:18px">${t('Colours')}</h2><label>${t('App colour (Live TV, menus, effects)')}</label>${colorPicker('cAcc', s.accent, getComputedStyle(document.documentElement).getPropertyValue('--acc').trim())}<label>${t('AntunesFlix colour')}</label>${colorPicker('cFx', s.fxColor, '#e50914')}<label>${t('Numbers (clock and channels)')}</label><select id="sDig"><option value="" ${!s.digits ? 'selected' : ''}>${t('Theme default')}</option><option value="accent" ${s.digits === 'accent' ? 'selected' : ''}>${t('Same as the app colour')}</option></select><label>${t('Background')}</label><select id="sBg">${[['circuit', 'Circuit lines'], ['plain', 'Plain'], ['black', 'Black']].map(x => `<option value="${x[0]}" ${(s.bgStyle || 'circuit') === x[0] ? 'selected' : ''}>${t(x[1])}</option>`).join('')}</select><div class="row" style="justify-content:flex-start"><button class="btn" id="cRst">${t('Reset colours')}</button></div>
  <label>${t('Channel list over the video')}</label><select id="sPan"><option value="clear" ${s.panelBg !== 'dim' ? 'selected' : ''}>${t('See-through')}</option><option value="dim" ${s.panelBg === 'dim' ? 'selected' : ''}>${t('Dark')}</option></select>
  <label>${t('Guide time offset (hours)')}</label><select id="sOff">${[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(h => `<option value="${h}" ${(+s.epgOff || 0) === h ? 'selected' : ''}>${h > 0 ? '+' + h : h}</option>`).join('')}</select><label>${t('Subtitle size')}</label><select id="sSub">${[80, 100, 130, 160, 200].map(z => `<option value="${z}" ${(+s.subSize || 100) === z ? 'selected' : ''}>${z}%</option>`).join('')}</select><label>${t('Update playlists automatically (daily)')}</label><select id="sAuto"><option value="1" ${s.autoRefresh !== false ? 'selected' : ''}>${t('Yes')}</option><option value="0" ${s.autoRefresh === false ? 'selected' : ''}>${t('No')}</option></select>
  <label>${t('Language')}</label><select id="sLang"><option value="en" ${LANG === 'en' ? 'selected' : ''}>English</option><option value="pt" ${LANG === 'pt' ? 'selected' : ''}>Português</option></select>
  <h2 style="margin-top:18px">${ic('lock')} ${t('Parental control')}</h2><label>${t('PIN (4 digits, empty = off)')}</label><input id="sPin" type="password" inputmode="numeric" maxlength="8" value="${esc(s.pin || '')}" autocomplete="off"><div class="row" style="justify-content:flex-start"><button class="btn" id="sCats">${t('Manage categories')}</button><button class="btn" id="sBak">${ic('stack')} ${t('Backup')}</button><button class="btn" id="sFavs">${ic('star')} ${t('Import / export favourites')}</button></div><label>${t('Helper link for blocked playlists (optional)')}</label><input id="sProxy" value="${esc(s.proxy)}" placeholder="https://your-helper.example/?url={url}"><label>${t('Also use it for streams')}</label><select id="sPS"><option value="0" ${!s.proxyStreams ? 'selected' : ''}>${t('No')}</option><option value="1" ${s.proxyStreams ? 'selected' : ''}>${t('Yes')}</option></select>
  <h2 style="margin-top:18px">${t('Playlists')}</h2>${S.sources.map(x => `<div style="display:flex;gap:6px;align-items:center;margin:6px 0"><b style="flex:1">${esc(x.name)}</b><button class="btn" data-r="${x.id}">${t('Refresh')}</button><button class="btn" data-d="${x.id}">${t('Delete')}</button></div>`).join('') || '<p class="mut">—</p>'}
  <h2 style="margin-top:18px">${t('Keyboard & remote')}</h2><div class="keys"><kbd>0–9</kbd><span>${t('jump to that channel')}</span><kbd>↑ ↓ / CH±</kbd><span>${t('next / previous channel')}</span><kbd>Enter</kbd><span>${t('channel list')}</span><kbd>F</kbd><span>${t('favourite on/off')}</span><kbd>L</kbd><span>${t('last channel')}</span><kbd>M</kbd><span>${t('mute')}</span><kbd>R</kbd><span>${t('record (needs a browser that allows it)')}</span><kbd>Z</kbd><span>${t('full screen')}</span></div>
  <div class="row" style="justify-content:space-between"><button class="btn" id="sUpd">${ic('refresh')} ${t('Check for updates')}${NATIVE ? ' · build ' + (BUILD || '—') : ''}</button><button class="btn p" id="sOk">${t('Close')}</button></div>`);
  tabifySettings();
  const chg = () => { s.startup = $('#sStart').value; s.style = $('#sStyle').value; s.theme = $('#sTheme').value; s.numberMode = $('#sNum').value; s.tvMode = $('#sTv').value; applyTvMode(); s.proxy = $('#sProxy').value.trim(); s.proxyStreams = $('#sPS').value === '1'; saveSet(); applyLook(); render(); };
  $$('#sStart,#sStyle,#sTheme,#sNum,#sTv,#sPS', dlg).forEach(e => e.onchange = chg); $('#sLite').onchange = e => { s.lite = e.target.value; saveSet(); applyLite(); };
  $$('[data-sl2]', dlg).forEach(x => x.onchange = () => { s.subLangs = [...new Set($$('[data-sl2]', dlg).map(y => y.value).filter(Boolean))].join(','); saveSet(); S.subList = null; }); $('#sSA').onchange = e => { s.subAuto = e.target.value === '1'; saveSet(); }; $('#sOK').onchange = e => { s.osKey = e.target.value.trim(); saveSet(); }; $$('#sOU,#sOP', dlg).forEach(x => x.onchange = () => { LS.set('ap.osu', { u: $('#sOU').value.trim(), p: $('#sOP').value }); LS.set('ap.ost', null); });
  wireColorPicker('cAcc', c => { s.accent = c; saveSet(); applyLook(); }); wireColorPicker('cFx', c => { s.fxColor = c; saveSet(); applyLook(); });
  $('#sDig').onchange = e => { s.digits = e.target.value; saveSet(); applyLook(); }; $('#sBg').onchange = e => { s.bgStyle = e.target.value; saveSet(); applyLook(); };
  $('#cRst').onclick = () => { delete s.accent; delete s.fxColor; delete s.digits; delete s.bgStyle; saveSet(); applyLook(); settingsDialog(); };
  $('#sPan').onchange = e => { s.panelBg = e.target.value; saveSet(); applyLook(); }; $('#sSub').onchange = e => { s.subSize = +e.target.value; saveSet(); applySubs(); }; $('#sAuto').onchange = e => { s.autoRefresh = e.target.value === '1'; saveSet(); };
  $('#sOff').onchange = async e => { s.epgOff = +e.target.value; saveSet(); const c = await idbGet('epg:' + S.srcId); if (c) { S.epg = shiftEpg(c.data); render(); if (S.cur) showInfo(S.cur); } }; $('#sProxy').onchange = chg; $('#sLang').onchange = e => { LS.set('ap.lang', e.target.value); location.reload(); };
  $$('[data-r]', dlg).forEach(b => b.onclick = () => { dlg.close(); selectSource(b.dataset.r, true); }); $$('[data-d]', dlg).forEach(b => b.onclick = () => { const id = b.dataset.d; S.sources = S.sources.filter(x => x.id !== id); LS.set('ap.sources', S.sources); idbDel('ch:' + id); idbDel('epg:' + id); dlg.close(); selectSource(S.sources[0] && S.sources[0].id); });
  $('#sOk').onclick = () => dlg.close(); $('#sAcc').onclick = accountDialog; $('#sCats').onclick = catsDialog; $('#sFavs').onclick = favsDialog; $('#sBak').onclick = backupDialog; $('#sUpd').onclick = () => { dlg.close(); checkUpdate(true); };
  $('#sPin').onchange = () => { const p = $('#sPin').value.trim(); const had = !!s.pin; s.pin = p; if (p && !had) { const a = new Set(s.locked || []); S.channels.forEach(c => { if (ADULT.test(c.group || '')) a.add(gkey(c)); }); s.locked = [...a]; } S.unlocked = false; saveSet(); refreshVis(); render(); };
}
function applyLook() { try { applyColors(); } catch (e) { } if (!THEMES.some(x => x[0] === S.set.theme)) S.set.theme = 'night'; document.documentElement.dataset.theme = S.set.theme; document.documentElement.dataset.style = S.set.style || 'circuit'; document.body.classList.toggle('tv', !!S.set.tv); document.body.classList.toggle('pclear', S.set.panelBg !== 'dim'); const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1115'; }

/* ---------- player extras: pause, seek, resume, tracks, aspect, PiP ---------- */
const POS = LS.get('ap.pos', {}), DUR = LS.get('ap.dur', {}); let posT = 0;
// Netflix-style memory: what was finished (SEEN), when each title was last watched (WTS), last episode per series (SLAST)
const epLabel = e => { const m = /S(\d+)E(\d+)\s*$/.exec(e && e.name || ''); return m ? `${LANG === 'pt' ? 'T' : 'S'}${m[1]}:E${m[2]}` : ''; };
const SEEN = LS.get('ap.seen', {}), WTS = LS.get('ap.wts', {}), SLAST = LS.get('ap.slast', {});
const saveWatch = () => { LS.set('ap.seen', SEEN); LS.set('ap.wts', WTS); LS.set('ap.slast', SLAST); };
function markSeen(c, on) { if (!c) return; if (on === false) { delete SEEN[c.key]; } else { SEEN[c.key] = Date.now(); delete POS[c.key]; LS.set('ap.pos', POS); } WTS[c.key] = Date.now(); saveWatch(); }
const isVodNow = () => S.cur && S.cur.kind !== 'live';
const fmtT = x => { if (!isFinite(x) || x < 0) return '0:00'; x = Math.floor(x); const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s2 = x % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s2).padStart(2, '0'); };
function savePos() { if (!isVodNow() || !isFinite(v.duration) || v.duration < 60) return; const c = S.cur, k = c.key; WTS[k] = Date.now(); if (c.ser) SLAST[c.ser] = { k, t: Date.now() }; if (v.currentTime > v.duration - Math.max(30, v.duration * 0.06)) { delete POS[k]; if (!SEEN[k]) { SEEN[k] = Date.now(); if (c.ser) try { nextEpisode(); } catch (e) { } } } else { POS[k] = Math.floor(v.currentTime); DUR[k] = Math.floor(v.duration); LS.set('ap.dur', DUR); } saveWatch(); const ks = Object.keys(POS); if (ks.length > 300) delete POS[ks[0]]; LS.set('ap.pos', POS); }
v.addEventListener('timeupdate', () => { if (!isVodNow()) return; if (!seeking) $('#seek').value = v.duration ? Math.round(v.currentTime / v.duration * 1000) : 0; $('#tCur').textContent = fmtT(v.currentTime); $('#tDur').textContent = fmtT(v.duration); if (Date.now() - posT > 5000) { posT = Date.now(); savePos(); } });
v.addEventListener('ended', () => { if (isVodNow()) { markSeen(S.cur); if (S.cur.ser) SLAST[S.cur.ser] = { k: S.cur.key, t: Date.now() }; saveWatch(); } const nx = nextEpisode(); if (nx) { toast(t('Next episode') + ': ' + nx.name); setTimeout(() => { if (S.cur && S.cur.ser) enterFsFor(nx); }, 1500); } });
v.addEventListener('loadedmetadata', () => { if (isVodNow() && POS[S.cur.key] > 10 && isFinite(v.duration) && POS[S.cur.key] < v.duration - 30) { v.currentTime = POS[S.cur.key]; toast(t('Resume') + ' ' + fmtT(POS[S.cur.key])); } });
v.addEventListener('pause', () => { $('#cPlay').innerHTML = ic('play'); screenEl.classList.add('paused'); if (fsOn) showOv(true); savePos(); }); v.addEventListener('play', () => { $('#cPlay').innerHTML = ic('pause'); screenEl.classList.remove('paused'); if (fsOn) showOv(); });
let seeking = false; const sk = $('#seek'); sk.oninput = () => { seeking = true; if (v.duration) $('#tCur').textContent = fmtT(sk.value / 1000 * v.duration); }; sk.onchange = () => { if (v.duration) v.currentTime = sk.value / 1000 * v.duration; seeking = false; };
const seekBy = d => { if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d)); };
const togglePlay = () => { if (v.paused) v.play().catch(() => { }); else v.pause(); };
$('#cPlay').onclick = togglePlay; $('#cBack').onclick = () => seekBy(-10); $('#cFwd').onclick = () => seekBy(10);
const ASP = [['contain', 'Fit'], ['cover', 'Fill'], ['fill', 'Stretch']]; let aspI = 0;
$('#cAsp').onclick = () => { aspI = (aspI + 1) % ASP.length; v.style.objectFit = ASP[aspI][0]; toast(t(ASP[aspI][1])); };
const openTracks = () => {
  const au = [], su = []; let cur = { a: -1, s: -1 };
  if (hls) { (hls.audioTracks || []).forEach((x, i) => au.push({ i, n: x.name || x.lang || 'Audio ' + (i + 1) })); (hls.subtitleTracks || []).forEach((x, i) => su.push({ i, n: x.name || x.lang || 'Sub ' + (i + 1) })); cur = { a: hls.audioTrack, s: hls.subtitleTrack }; }
  else { if (v.audioTracks && v.audioTracks.length > 1) [...v.audioTracks].forEach((x, i) => { au.push({ i, n: x.label || x.language || 'Audio ' + (i + 1) }); if (x.enabled) cur.a = i; }); [...v.textTracks].filter(x => x.kind === 'subtitles' || x.kind === 'captions').forEach((x, i) => { su.push({ i, n: x.label || x.language || 'Sub ' + (i + 1) }); if (x.mode === 'showing') cur.s = i; }); }
  const vodNow = S.cur && S.cur.kind !== 'live' && S.cur.kind !== 'catchup';
  if (au.length < 2 && !su.length && !vodNow) { toast(t('No extra audio or subtitles')); return; }
  const btn = (kind, i, n, on) => `<button data-k="${kind}" data-i="${i}" class="${on ? 'on' : ''}"><span>${esc(n)}</span></button>`;
  openDlg(`<h2>${t('Audio')} / ${t('Subtitles')}</h2>` + (au.length > 1 ? `<label>${t('Audio')}</label><div class="catlist">${au.map(x => btn('a', x.i, x.n, x.i === cur.a)).join('')}</div>` : '') + (su.length ? `<label>${t('Subtitles')}</label><div class="catlist">${btn('s', -1, t('Off'), cur.s === -1)}${su.map(x => btn('s', x.i, x.n, x.i === cur.s)).join('')}</div>` : '') + (vodNow ? onlineSubsHtml(S.cur) : '') + `<div class="row"><button class="btn" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close(); if (vodNow) wireOnlineSubs(S.cur, openTracks);
  $$('.catlist button[data-k]', dlg).forEach(b => b.onclick = () => { const i = +b.dataset.i; if (b.dataset.k === 'a') { if (hls) hls.audioTrack = i; else [...v.audioTracks].forEach((x, n) => x.enabled = n === i); } else { if (hls) hls.subtitleTrack = i; else [...v.textTracks].filter(x => x.kind === 'subtitles' || x.kind === 'captions').forEach((x, n) => x.mode = n === i ? 'showing' : 'disabled'); } dlg.close(); });
};
$('#cTrk').onclick = openTracks;
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
  plus: '<path d="M12 5v14M5 12h14"/>', grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor"/><circle cx="15" cy="6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.4" fill="currentColor"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="18" r="1.4" fill="currentColor"/><circle cx="15" cy="18" r="1.4" fill="currentColor"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', sort: '<path d="M7 4v16M3.5 16.5L7 20l3.5-3.5M13 6h8M13 11h6M13 16h4"/>', lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/>', archive: '<path d="M4 12a8 8 0 108-8 8.2 8.2 0 00-5.7 2.3L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4.5l3 1.8"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>', dots: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  left: '<path d="M14.5 6l-6 6 6 6"/>', right: '<path d="M9.5 6l6 6-6 6"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>', home: '<path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z"/>',
  skp: '<path d="M6.5 5v14"/><path d="M18.5 5.5v13l-9.5-6.5z" fill="currentColor"/>', skn: '<path d="M17.5 5v14"/><path d="M5.5 5.5v13l9.5-6.5z" fill="currentColor"/>', shuffle: '<path d="M3 7h3.5c2 0 3.2 1 4.3 2.6l2.4 3.8c1.1 1.6 2.3 2.6 4.3 2.6H21"/><path d="M3 17h3.5c1.4 0 2.4-.5 3.2-1.3M14 8.3c.8-.8 1.8-1.3 3.5-1.3H21"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
  rew10: '<path d="M4.5 12a7.5 7.5 0 107.5-7.5H8"/><path d="M10.5 1.8L7.6 4.6l2.9 2.8"/><text x="12" y="15.6" font-size="7" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none" text-anchor="middle">10</text>',
  fwd10: '<path d="M19.5 12A7.5 7.5 0 1112 4.5h4"/><path d="M13.5 1.8l2.9 2.8-2.9 2.8"/><text x="12" y="15.6" font-size="7" font-family="sans-serif" font-weight="700" fill="currentColor" stroke="none" text-anchor="middle">10</text>', stack: '<path d="M4 6h13M4 11h13M4 16h7"/><path d="M15.5 14v6.5l5-3.2z" fill="currentColor" stroke="none"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
};
const seg = (v, cls) => { v = String(v == null ? '' : v); return v === '' ? '' : `<span class="seg ${cls || ''}" data-g="${v.replace(/[0-9-]/g, '8')}">${esc(v)}</span>`; };
const isOrdList = g => g === 'fav' || (g || '').startsWith('u:');
const favEditing = () => S.favEdit && isOrdList(S.group) && S.view === 'browse' && S.mode === 'live';
const curUList = () => S.group.startsWith('u:') ? S.lists.find(x => 'u:' + x.id === S.group) : null;
const saveLists = () => LS.set('ap.lists', S.lists);
const ic = (n, c) => `<svg viewBox="0 0 24 24" class="i ${c || ''}" aria-hidden="true">${IC[n] || ''}</svg>`;
Object.assign(PT, { 'New list': 'Nova lista', 'Rename': 'Renomear', 'Delete list': 'Apagar lista', 'Remove from list': 'Tirar da lista', 'Add to list': 'Adicionar a uma lista', 'No lists yet.': 'Ainda não tens listas.', 'e.g. Sport, Kids, News': 'ex.: Desporto, Infantil, Notícias', 'This list is empty. Open a channel and use “Add to list”, or long-press a channel.': 'Esta lista está vazia. Abre um canal e usa «Adicionar a uma lista», ou faz toque longo num canal.', 'Backup': 'Cópia de segurança', 'Copies your playlists (with logins), favourites and settings. Paste it back after reinstalling. Keep it private: it contains your passwords.': 'Copia as tuas listas (com os logins), favoritos e definições. Cola-a de volta depois de reinstalar. Guarda-a só para ti: tem as palavras-passe.', 'Copy backup': 'Copiar cópia', 'Restore': 'Restaurar', 'Restored': 'Restaurado', 'A new version is being prepared. Try again in a few minutes.': 'Está a ser preparada uma versão nova. Tenta daqui a uns minutos.', 'TV mode (remote, bigger text)': 'Modo TV (comando, letras maiores)', 'Automatic': 'Automático', 'TV detected': 'TV detetada', 'no TV detected': 'sem TV detetada', 'Always on': 'Sempre ligado', 'No favourites yet': 'Ainda não tens favoritos', 'Tap the star next to a channel, or import a list.': 'Toca na estrela ao lado de um canal, ou importa uma lista.', 'Import favourites (JSON)': 'Importar favoritos (JSON)', 'This file is not valid JSON': 'Este ficheiro não é JSON válido', 'Favourites imported': 'Favoritos importados', 'Added': 'Adicionados', 'already there': 'já estavam', 'not found': 'não encontrados', 'Not found in this playlist': 'Não encontrados nesta lista', 'Import a JSON file with channel names (or Xtream stream_id / links). They are added to your favourites in the file order.': 'Importa um ficheiro JSON com os nomes dos canais (ou stream_id do Xtream / links). São adicionados aos favoritos pela ordem do ficheiro.', 'JSON file': 'Ficheiro JSON', 'or paste the JSON': 'ou cola o JSON', 'Export': 'Exportar', 'Copy JSON': 'Copiar JSON', 'Import': 'Importar', 'Copied': 'Copiado', 'Select and copy the text': 'Seleciona e copia o texto', 'Import / export favourites': 'Importar / exportar favoritos', 'Edit order': 'Editar ordem', 'Done': 'Concluído', 'Order saved': 'Ordem guardada', 'Drag ⋮⋮ or use the arrows': 'Arrasta ⋮⋮ ou usa as setas', 'OK picks a channel, ▲ ▼ move it, OK drops it': 'OK pega no canal, ▲ ▼ movem, OK larga', 'When the app opens': 'Ao abrir a app', 'Home screen': 'Ecrã inicial', 'Last channel in full screen (favourites)': 'Último canal em ecrã inteiro (favoritos)', 'Tap for sound': 'Toca para ligar o som', 'The web version is always up to date': 'A versão web está sempre atualizada', 'You have the latest version': 'Já tens a versão mais recente', 'New version available': 'Há uma versão nova', 'Build': 'Versão', 'you have': 'tens a', 'The download opens in the browser. Then open the file to install it over this version; your lists and favourites stay.': 'O download abre no navegador. Depois abre o ficheiro para instalar por cima desta versão; as listas e os favoritos ficam.', 'Later': 'Mais tarde', 'Could not check for updates': 'Não foi possível procurar atualizações', 'Check for updates': 'Procurar atualizações', 'Default order': 'Ordem original', 'A–Z': 'A–Z', 'Recently added': 'Adicionados recentemente', 'Top rated': 'Melhor nota', 'See all': 'Ver tudo', 'Details': 'Detalhes', 'Enter PIN': 'Introduz o PIN', 'Wrong PIN': 'PIN errado', 'Parental control': 'Controlo parental', 'PIN (4 digits, empty = off)': 'PIN (4 dígitos, vazio = desligado)', 'Manage categories': 'Gerir categorias', 'Hide': 'Esconder', 'Lock': 'Bloquear', 'Catch-up': 'Ver de novo', 'Next episode': 'Próximo episódio', 'Watch from the start': 'Ver desde o início', 'Home': 'Início', 'Group': 'Grupo', 'More': 'Mais', 'Speed': 'Velocidade', 'Picture size': 'Tamanho da imagem', 'Picture in picture': 'Imagem no ecrã', 'Record': 'Gravar', 'Stop recording': 'Parar gravação', 'More channels': 'Mais canais', 'Tap or swipe up': 'Toque ou deslize para cima', 'Press ◀ on the remote': 'Carrega ◀ no comando', 'Style': 'Estilo', 'Circuit (electronic)': 'Circuito (eletrónico)', 'Soft': 'Suave', 'Live TV': 'TV em direto', 'Search': 'Pesquisar', 'Playlists': 'Listas', 'Expires': 'Expira', 'Never': 'Nunca', 'Connections': 'Ligações', 'Recent channels': 'Últimos canais', 'Continue watching': 'Continuar a ver', 'movies': 'filmes', 'series': 'séries', 'All': 'Tudo', 'Loading your playlist…': 'A carregar a tua lista…', 'Watch': 'Ver', 'Resume': 'Continuar', 'Add favourite': 'Adicionar aos favoritos', 'In favourites': 'Nos favoritos', 'Active': 'Ativa', 'Account': 'Conta', 'Add a playlist': 'Adicionar lista', 'Use': 'Usar', 'Search everything': 'Pesquisar tudo', 'Type at least 2 letters': 'Escreve pelo menos 2 letras', 'Tap again for full screen': 'Toca outra vez para ecrã inteiro', 'Pick a channel': 'Escolhe um canal', 'Episode': 'Episódio', 'Seasons': 'Épocas', 'No details from the provider': 'O fornecedor não enviou detalhes', 'Status': 'Estado', 'Xtream login': 'Login Xtream' });

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
  else if (h === 'flix') view = 'flix';
  if (!(view === 'browse' && S.mode === 'live') && S.cur && !fsOn) stopPlayback();
  S.fx = view === 'flix' || (S.fx && (view === 'detail' || view === 'search' || (view === 'browse' && S.mode !== 'live'))); document.body.classList.toggle('fx', !!S.fx);
  if (view === 'flix' && S.view !== 'flix' && S.view !== 'detail') fxIntro();
  S.view = view; document.body.dataset.view = view; document.body.dataset.mode = view === 'browse' ? S.mode : '';
  render();
  if (view === 'search') setTimeout(() => $('#q').focus(), 50);
  if (S.set.tv) setTimeout(tvFocus, 30);
}
window.addEventListener('popstate', route);
function tvFocus() { if (fsOn || dlg.open) return; const ae = document.activeElement; if (ae && ae !== document.body && ae.closest('.view') && ae.offsetParent) return; const v2 = $(`#v${S.view[0].toUpperCase() + S.view.slice(1)}`); const f = $('#list .ch.on', v2) || $('#list .ch', v2) || $('.hacts .btn', v2) || $('#list .pc', v2) || $('.tile', v2) || $('#dPlay', v2) || $('#dFav', v2) || $('button, [tabindex="0"]', v2); if (f) { f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest' }); } }
// exit = the on-screen back arrow: always leaves the player. The 'hide the controls first' step is only for remotes/keyboards,
// on a phone the tap focuses the arrow itself, so it used to hide the controls instead of going back.
function back(exit) { if (dlg.open) { dlg.close(); return true; } if (fsOn && closeQuick() && !exit) return true; if (fsOn && !exit && !isTouch() && screenEl.classList.contains('show') && screenEl.contains(document.activeElement)) { hideOv(); return true; } if (S.view === 'browse' && S.mode !== 'live' && S.group !== GDEF[S.mode]) { S.group = GDEF[S.mode]; S.gsel[S.mode] = S.group; S.q = ''; $('#q').value = ''; renderBrowse(); $('#list').scrollTop = 0; return true; } if ((location.hash || '#home') !== '#home') { if (history.state && history.state.d > 0) history.back(); else go('home', true); return true; } return false; }

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
function showOv(keep) { screenEl.classList.add('show'); clearTimeout(ovT); if (!keep) ovT = setTimeout(() => { if (!(isVodNow() && v.paused)) hideOv(); }, 5000); }
/* ---------- player chrome: gestures, channel panel (TV), channel strip (touch) ---------- */
let lastTap = 0, tapX = 0, tch = null, lastInput = 'touch', bri = 1;
const isTouch = () => lastInput === 'touch';
document.addEventListener('keydown', () => { lastInput = 'key'; }, true);
document.addEventListener('pointerdown', e => { lastInput = e.pointerType === 'mouse' ? 'mouse' : 'touch'; }, true);
/* Remote: moving onto a text field (search, category filters) must not pop up the TV keyboard.
   Reached with the arrows, a field is read-only (no keyboard) and the arrows carry on past it; OK opens the keyboard to type. */
const isTxt = el => !!el && el.tagName === 'INPUT' && !/^(range|checkbox|radio|color|file|button|submit)$/i.test(el.type || 'text');
let tvTyping = null, tvRefocus = false;
document.addEventListener('focusin', e => { const el = e.target; if (!isTxt(el) || el === tvTyping || lastInput !== 'key' || el.readOnly || el.inputMode === 'numeric') return; el.readOnly = true; el.dataset.tvro = '1'; }, true);
document.addEventListener('focusout', e => { const el = e.target; if (el === tvTyping && !tvRefocus) tvTyping = null; if (el.dataset && el.dataset.tvro) { el.readOnly = false; delete el.dataset.tvro; } }, true);
document.addEventListener('pointerdown', e => { const el = e.target; if (isTxt(el) && el.dataset.tvro) { el.readOnly = false; delete el.dataset.tvro; tvTyping = el; } }, true);
document.addEventListener('keydown', e => {
  const el = e.target, k = e.key;
  if (el && el.tagName === 'SELECT' && lastInput === 'key') {
    if (k.startsWith('Arrow')) { e.preventDefault(); e.stopImmediatePropagation(); spatial(k, dlg.open ? dlg : undefined); }
    else if (k === 'Enter') { try { if (el.showPicker) { e.preventDefault(); el.showPicker(); } } catch (x) { } }
    return;
  }
  if (!isTxt(el)) return;
  if (el.dataset.tvro) {
    if (k === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); el.readOnly = false; delete el.dataset.tvro; tvTyping = el; tvRefocus = true; el.blur(); el.focus(); tvRefocus = false; }
    else if (k.startsWith('Arrow')) { e.preventDefault(); e.stopImmediatePropagation(); spatial(k, dlg.open ? dlg : undefined); }
    return;
  }
  // typing with the remote: ▲ ▼ leave the field (◀ ▶ still move the cursor)
  if (lastInput === 'key' && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); e.stopImmediatePropagation(); spatial(k, dlg.open ? dlg : undefined); }
}, true);
const panelOpen = () => !$('#chPanel').hidden || !$('#chStrip').hidden;
v.addEventListener('click', e => {
  if (!fsOn) { if (S.cur) enterFs(); return; }
  if (panelOpen()) { closeQuick(); return; }
  const now = Date.now(), r = v.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
  if (isVodNow() && now - lastTap < 320 && Math.abs(x - tapX) < .2 && (x < .35 || x > .65)) { seekBy(x < .35 ? -10 : 10); toast(x < .35 ? '−10 s' : '+10 s'); lastTap = 0; showOv(); return; }
  lastTap = now; tapX = x; screenEl.classList.contains('show') ? hideOv() : showOv();
});
$('#ov').addEventListener('click', e => { if (e.target === $('#ov') || e.target.id === 'ovMid') { hideOv(); } });
function hideOv() { screenEl.classList.remove('show'); clearTimeout(ovT); if (screenEl.contains(document.activeElement) && !panelOpen()) document.activeElement.blur(); }
const pill = (el, icon, val) => { el.querySelector('i').innerHTML = ic(icon); el.querySelector('b').textContent = Math.round(val * 100) + '%'; el.style.setProperty('--lv', Math.round(val * 100) + '%'); el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 900); };
screenEl.addEventListener('touchstart', e => { if (!fsOn || panelOpen() || e.target.closest('#ovTop,#ovBot,#ovMid button,dialog')) { tch = null; return; } const t0 = e.touches[0], r = screenEl.getBoundingClientRect(); tch = { x: t0.clientX, y: t0.clientY, side: (t0.clientX - r.left) / r.width, h: r.height, bri, vol: v.muted ? 0 : v.volume, mode: '' }; }, { passive: true });
screenEl.addEventListener('touchmove', e => {
  if (!tch) return; const t0 = e.touches[0], dx = t0.clientX - tch.x, dy = t0.clientY - tch.y;
  if (!tch.mode) { if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) tch.mode = tch.side < .38 ? 'bri' : tch.side > .62 ? 'vol' : 'mid'; else return; }
  const d = -dy / (tch.h * .7);
  if (tch.mode === 'bri') { bri = Math.max(.15, Math.min(1, tch.bri + d)); $('#dim').style.opacity = String(1 - bri); pill($('#gBri'), 'sun', bri); }
  else if (tch.mode === 'vol') { const vv = Math.max(0, Math.min(1, tch.vol + d)); v.volume = vv; v.muted = vv === 0; $('#cMute').innerHTML = ic(v.muted ? 'mute' : 'vol'); pill($('#gVol'), v.muted ? 'mute' : 'vol', vv); }
}, { passive: true });
screenEl.addEventListener('touchend', e => { if (!tch) return; const dy = e.changedTouches[0].clientY - tch.y, m = tch.mode; tch = null; if (m === 'mid' && dy < -60 && !isVodNow()) openStrip(); });
screenEl.addEventListener('pointermove', e => { if (fsOn && e.pointerType === 'mouse') showOv(); });

/* resolution badge */
const resLabel = () => { const w = v.videoWidth, h = v.videoHeight; if (!w) return ''; const q = h >= 2000 ? '4K' : h >= 1000 ? 'FHD' : h >= 700 ? 'HD' : 'SD'; return `${w}×${h} · ${q}`; };
['loadedmetadata', 'resize'].forEach(ev => v.addEventListener(ev, () => { const l = resLabel(); $('#resB').textContent = l; $('#resB').hidden = !l; }));

/* left channel panel — TV remote ◀ */
let cpGroup = null, cpT = 0;
const liveGroups = () => catItems('live').filter(x => x.n > 0 || x.id === 'all');
function cpBump() { clearTimeout(cpT); cpT = setTimeout(() => { if (!$('#chPanel').hidden && !$('#chPanel').contains(document.activeElement)) closeQuick(); }, 12000); }
function openPanel(focusCur = true) {
  $('#chStrip').hidden = true; hideOv(); const gs = liveGroups(); if (!gs.find(g => g.id === cpGroup)) cpGroup = S.gsel.live;
  if (!gs.find(g => g.id === cpGroup)) cpGroup = 'all';
  const g = gs.find(x => x.id === cpGroup) || gs[0], l = groupList(cpGroup);
  $('#cpGroup').innerHTML = `${esc(g ? g.label : '')}<small>${fmtN(l.length)}</small>`;
  $('#cpList').innerHTML = l.slice(0, 400).map(c => { const nn = nowNext(c), pr = nn && nn.now ? Math.round((Date.now() - nn.now.s) / (nn.now.e - nn.now.s) * 100) : 0; return `<button class="cpi ${S.cur && S.cur.key === c.key ? 'on' : ''}" data-k="${c.key}"><span class="n">${seg(shownNum(c))}</span><span class="lgw">${logoHtml(c)}</span><span class="t"><b>${esc(c.name)}</b><small>${nn && nn.now ? esc(nn.now.t) : ''}</small>${nn && nn.now ? `<i class="pb"><i style="width:${pr}%"></i></i>` : ''}</span></button>`; }).join('') || `<p class="mut" style="padding:20px">${t('Nothing found')}</p>`;
  $('#chPanel').hidden = false;
  $$('#cpList .cpi').forEach(b => { b.onclick = () => { const c = S.byKey[b.dataset.k]; S.gsel.live = cpGroup; LS.set('ap.gsel', S.gsel); play(c); $$('#cpList .cpi').forEach(x => x.classList.toggle('on', x === b)); cpBump(); }; b.onfocus = cpBump; });
  if (focusCur) { const on = $('#cpList .cpi.on') || $('#cpList .cpi'); if (on) { on.focus({ preventScroll: true }); on.scrollIntoView({ block: 'center' }); } }
  cpBump();
}
function cpShift(d) { const gs = liveGroups(); let i = gs.findIndex(x => x.id === cpGroup); i = (i + d + gs.length) % gs.length; cpGroup = gs[i].id; openPanel(); }
function groupList(id) { const m = S.mode, g = S.group; S.mode = 'live'; S.group = id; const l = baseList().filter(c => c.kind === 'live'); S.mode = m; S.group = g; return l; }

/* bottom channel strip — touch "More channels" */
let csGroup = null;
function openStrip() {
  $('#chPanel').hidden = true; hideOv(); const gs = liveGroups(); if (!gs.find(g => g.id === csGroup)) csGroup = gs.find(g => g.id === S.gsel.live) ? S.gsel.live : 'all';
  const g = gs.find(x => x.id === csGroup), l = groupList(csGroup);
  $('#csTitle').innerHTML = `${t('Group')}: ${esc(g ? g.label : '')} <small>${fmtN(l.length)}</small>`;
  $('#csChips').innerHTML = gs.map(x => `<button data-g="${esc(x.id)}" class="${x.id === csGroup ? 'on' : ''}">${esc(x.label)}</button>`).join('');
  $('#csCards').innerHTML = l.slice(0, 200).map(c => { const nn = nowNext(c), pr = nn && nn.now ? Math.round((Date.now() - nn.now.s) / (nn.now.e - nn.now.s) * 100) : 0; return `<button class="csc ${S.cur && S.cur.key === c.key ? 'on' : ''}" data-k="${c.key}"><span class="cl">${logoHtml(c)}</span><b><em>${seg(shownNum(c))}</em>${esc(c.name)}</b><small>${nn && nn.now ? esc(nn.now.t) : esc(c.group || '')}</small><i class="pb"><i style="width:${pr}%"></i></i></button>`; }).join('');
  $('#chStrip').hidden = false;
  $$('#csChips button').forEach(b => b.onclick = () => { csGroup = b.dataset.g; openStrip(); });
  $$('#csCards .csc').forEach(b => b.onclick = () => { S.gsel.live = csGroup; LS.set('ap.gsel', S.gsel); play(S.byKey[b.dataset.k]); closeQuick(); });
  const on = $('#csCards .csc.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); const oc = $('#csChips .on'); if (oc) oc.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function openQuick() { if (isVodNow()) return; isTouch() ? openStrip() : openPanel(); }
function closeQuick() { const had = panelOpen(); $('#chPanel').hidden = true; $('#chStrip').hidden = true; clearTimeout(cpT); if (had && screenEl.contains(document.activeElement)) document.activeElement.blur(); return had; }
$('#cpPrev').onclick = () => cpShift(-1); $('#cpNext').onclick = () => cpShift(1); $('#csClose').onclick = () => closeQuick();

/* info + more */
$('#cInfo').onclick = () => {
  const c = S.cur; if (!c) return; const l = epgFor(c) || [], n = Date.now(), nn = nowNext(c), cur = nn && nn.now;
  openDlg(`<h2>${c.kind === 'live' ? seg(shownNum(c)) + ' ' : ''}${esc(c.name)}</h2>${cur ? `<p class="mut">${hm(cur.s)} – ${hm(cur.e)}</p><h3 style="margin:4px 0 8px">${esc(cur.t)}</h3>${cur.d ? `<p class="plot">${esc(cur.d)}</p>` : ''}` : `<p class="mut">${esc(c.group || '')}</p>`}${l.filter(p => p.s > n).slice(0, 5).map(p => `<div class="epgl"><time>${hm(p.s)}</time><span>${esc(p.t)}</span></div>`).join('')}<div class="row"><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close();
};
$('#cMore').onclick = () => {
  const sp = [0.5, 0.75, 1, 1.25, 1.5, 2];
  openDlg(`<h2>${t('More')}</h2>${isVodNow() ? `<label>${t('Speed')}</label><div class="tabs">${sp.map(x => `<button data-sp="${x}" class="${v.playbackRate === x ? 'on' : ''}">${x}×</button>`).join('')}</div>` : ''}
  <label>${t('Picture size')}</label><div class="tabs">${ASP.map((x, i) => `<button data-as="${i}" class="${aspI === i ? 'on' : ''}">${t(x[1])}</button>`).join('')}</div>
  <label>${t('Colours')} <small class="mut">${t('Colours wrong? Try the options below (saved for this channel).')}</small></label><div class="tabs">${['Normal', 'Swap red / blue', 'Compatible'].map((x, i) => `<button data-cf="${i}" class="${((S.cur && COLFIX[S.cur.key]) || 0) === i ? 'on' : ''}">${t(x)}</button>`).join('')}</div>
  <div class="row" style="justify-content:flex-start">${document.pictureInPictureEnabled ? `<button class="btn" id="mPip">${ic('pip')} ${t('Picture in picture')}</button>` : ''}${!isVodNow() ? `<button class="btn" id="mRec">${ic('rec')} ${rec ? t('Stop recording') : t('Record')}</button>` : ''}</div>${!isVodNow() ? `<div class="row" style="justify-content:flex-start"><button class="btn" id="mList">${ic('stack')} ${t('Add to list')}</button></div>` : ''}<label>${t('Sleep timer')}${sleepAt ? ' · ' + sleepLeft() + ' ' + t('min') : ''}</label><div class="tabs">${[0, 15, 30, 60, 90, 120].map(m => `<button data-sl="${m}" class="${(!sleepAt && !m) ? 'on' : ''}">${m ? m + ' ' + t('min') : t('Off ').trim()}</button>`).join('')}</div>
  <div class="row" style="justify-content:flex-start"><button class="btn" id="mInfo">${ic('signal')} ${t('Stream info')}</button><button class="btn" id="mExt">${ic('ext')} ${NATIVE ? t('Open in another player') : t('Copy link')}</button></div>
  <div class="row" style="justify-content:space-between"><button class="btn" id="mSet">${ic('gear')} ${t('Settings')}</button><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close(); $('#mSet').onclick = settingsDialog; $('#mInfo').onclick = streamInfo; $('#mExt').onclick = () => { dlg.close(); openElsewhere(); };
  $$('[data-sl]', dlg).forEach(b => b.onclick = () => { setSleep(+b.dataset.sl); dlg.close(); }); const ml = $('#mList'); if (ml) ml.onclick = () => addToListDialog(S.cur);
  $$('[data-sp]', dlg).forEach(b => b.onclick = () => { v.playbackRate = +b.dataset.sp; $$('[data-sp]', dlg).forEach(x => x.classList.toggle('on', x === b)); });
  $$('[data-cf]', dlg).forEach(b => b.onclick = () => { if (!S.cur) return; const m = +b.dataset.cf; if (m) COLFIX[S.cur.key] = m; else delete COLFIX[S.cur.key]; LS.set('ap.colfix', COLFIX); applyColor(S.cur); $$('[data-cf]', dlg).forEach(x => x.classList.toggle('on', x === b)); });
  $$('[data-as]', dlg).forEach(b => b.onclick = () => { aspI = +b.dataset.as; v.style.objectFit = ASP[aspI][0]; $$('[data-as]', dlg).forEach(x => x.classList.toggle('on', x === b)); });
  const p = $('#mPip'); if (p) p.onclick = () => { dlg.close(); try { v.requestPictureInPicture(); } catch (e) { } };
  const r = $('#mRec'); if (r) r.onclick = () => { dlg.close(); toggleRec(); };
};

/* ---------- header ---------- */
const TITLES = { live: 'Live TV', vod: 'Movies', series: 'Series' };
function renderHeader() {
  renderNav();
  const vw = S.view; $('#title').textContent = vw === 'browse' ? t(TITLES[S.mode]) : vw === 'search' ? t('Search') : '';
  $('#q').placeholder = vw === 'search' ? t('Search channels, movies, series…') : vw === 'browse' ? (t('Search') + ' · ' + t(TITLES[S.mode])) : '';
  $('#bGuide').hidden = !(vw === 'home' || (vw === 'browse' && S.mode === 'live'));
  $('#bSearch').hidden = !(vw === 'home' || vw === 'flix') || !S.sources.length; if (!S.sources.length) $('#bGuide').hidden = true;
}
const NAV = [['home', 'home', 'Home'], ['live', 'tv', 'Live TV'], ['flix', 'film', 'AntunesFlix'], ['search', 'search', 'Search'], ['settings', 'gear', 'Settings']];
function renderNav() { const cur = S.view === 'browse' ? (S.mode === 'live' ? 'live' : 'flix') : S.view === 'detail' ? 'flix' : S.view; $$('#bnav button').forEach((b, i) => { const n = NAV[i]; if (!b.innerHTML) { b.innerHTML = ic(n[1]) + `<span>${t(n[2])}</span>`; b.onclick = () => { if (n[0] === 'settings') { settingsDialog(); return; } if (n[0] === 'search') { S.q = ''; $('#q').value = ''; } go(n[0]); }; } b.classList.toggle('on', n[0] === cur); }); $('#bnav').hidden = !S.sources.length; }
function tick() { const d = new Date(), tm = d.toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit', hour12: false }), dt = d.toLocaleDateString(LANG === 'pt' ? 'pt-PT' : undefined, { weekday: 'short', day: 'numeric', month: 'short' }); $('#clock b').innerHTML = seg(tm); $('#clock small').textContent = dt; $('#ovClock').innerHTML = seg(tm); if (S.cur && S.cur.kind === 'live') liveBar(S.cur); }

/* ---------- home ---------- */
const fmtN = n => n.toLocaleString(LANG === 'pt' ? 'pt-PT' : undefined);
function contList() {
  const items = [], seenSer = {};
  Object.keys(POS).forEach(k => { const c = S.byKey[k] || EPS[k]; if (!c) return; if (c.ser) return; items.push({ c, t: WTS[k] || 0 }); });
  Object.keys(SLAST).forEach(sk => {
    const l = SLAST[sk], ep = EPS[l.k] || S.byKey[l.k], sr = S.byKey[sk]; if (!ep || seenSer[sk]) return; seenSer[sk] = 1;
    const nx = !POS[l.k] && l.next && EPS[l.next], cur = nx || ep, lab = epLabel(cur);
    const card = Object.assign({}, sr || ep, { cont: true, ser: sk, cpos: POS[l.k] || 0, cdur: DUR[l.k] || ep.dur || 2700, clabel: POS[l.k] ? lab : (nx ? t('Next episode') + ' · ' + lab : t('Next episode')) });
    if (!sr) { card.key = ep.key; } items.push({ c: card, t: l.t });
  });
  return items.sort((a, b) => b.t - a.t).slice(0, 16).map(x => x.c);
}
const TRACE = '<svg class="trace" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMin slice" aria-hidden="true"><g><path d="M120 58H230l26 26H400"/><path d="M120 72h70l18 18v40l22 22H400"/><path d="M300 0v40l20 20h80"/><path d="M340 300v-60l-24-24h-40l-20-20v-30"/><circle cx="256" cy="84" r="4"/><circle cx="230" cy="152" r="4"/><circle cx="256" cy="166" r="4"/></g><path class="pulse" d="M120 58H230l26 26H400"/><path class="pulse p2" d="M120 72h70l18 18v40l22 22H400"/></svg>';
function renderHome() {
  const box = $('#vHome');
  if (!S.sources.length) {
    box.innerHTML = `<div class="welcome"><div class="wmark">${ic('tv')}</div><h2>${t('Welcome to AntunesPlayer')}</h2><p>${t('AntunesPlayer plays the streams you give it — it comes with no channels. Add your own playlist, or look around with free test streams.')}</p>
    <div class="wacts"><button class="btn p big" id="wX">${ic('user')} ${t('Xtream login')}</button><button class="btn big" id="wU">${ic('plus')} ${t('Add a playlist')}</button><button class="btn big ghost" id="wD">${ic('play')} ${t('Try demo channels')}</button><button class="btn big ghost" id="wS">${ic('gear')} ${t('Settings')}</button></div>${C.user ? `<p class="mut">${ic('user')} ${t('Signed in as')} <b>${esc(C.user.email || '')}</b> · ${t('Synced')}. ${t('Playlists you add here are saved to your account.')}</p>` : `<div class="wacts"><button class="btn big" id="wG">${ic('user')} ${t('Sign in with Google')}</button><button class="btn big ghost" id="wC">${ic('tv')} ${t('Sign in with a code (TV)')}</button></div><p class="mut">${t('Your playlists are already in your Google account. Sign in to get them back.')}</p>`}</div>`;
    $('#wX').onclick = () => addDialog('xt'); $('#wU').onclick = () => addDialog('url'); $('#wD').onclick = addDemo; $('#wS').onclick = settingsDialog; if ($('#wG')) { $('#wG').onclick = signInFlow; $('#wC').onclick = pairDialog; } return;
  }
  const n = k => S.vis.filter(c => c.kind === k).length, L = n('live'), M = n('vod'), Se = n('series'), src = curSrc() || {}, a = S.acct, ld = S.loading;
  const cnt = (x, w) => ld ? `<small>${t('Loading your playlist…')}</small>` : `<small>${seg(x, 'cnt')} ${w}</small>`;
  const exp = a && a.exp ? new Date(a.exp * 1000).toLocaleDateString(LANG === 'pt' ? 'pt-PT' : undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : (a ? t('Never') : '');
  const cont = contList(), rec = S.recent.map(k => S.byKey[k]).filter(c => c && c.kind === 'live').slice(0, 14);
  box.innerHTML = `<div class="hgrid">
    <button class="tile t-live" data-go="live">${TRACE}${ic('tv')}<b>${t('Live TV')}</b>${cnt(L, t('channels'))}</button>
    <button class="tile t-mov t-flix" data-go="flix">${TRACE}${ic('film')}<b>Antunes<span class="fxr">Flix</span></b>${ld ? `<small>${t('Loading your playlist…')}</small>` : `<small>${seg(M, 'cnt')} ${t('movies')} · ${seg(Se, 'cnt')} ${t('series')}</small>`}<span class="fxchips"><span data-go2="movies">${ic('film')} ${t('Movies')}</span><span data-go2="series">${ic('series')} ${t('Series')}</span></span></button>
    <div class="minis">
      <button class="mini" data-go="guide">${ic('guide')}<span>${t('TV guide')}</span></button>
      <button class="mini" data-go="fav">${ic('star')}<span>${t('Favourites')}</span><small>${favList().length}</small></button>
      <button class="mini" data-go="search">${ic('search')}<span>${t('Search')}</span></button>
      <button class="mini" data-go="lists">${ic('stack')}<span>${t('Playlists')}</span><small>${S.sources.length}</small></button>
      <button class="mini" data-go="settings">${ic('gear')}<span>${t('Settings')}</span></button>
    </div>
    <div class="acct"><div class="ah">${ic('user')}<div><b>${esc(src.name || '')}</b><small>${src.type === 'xtream' ? 'Xtream' : 'M3U'}${a && a.status ? ' · ' + esc(a.status) : ''}</small></div><button class="ib" id="hRef" aria-label="${t('Refresh')}">${ic('refresh')}</button></div>
      ${a ? `<dl><dt>${t('Expires')}</dt><dd>${esc(exp)}</dd><dt>${t('Connections')}</dt><dd>${esc(a.act != null ? a.act : '–')} / ${esc(a.max || '–')}</dd></dl>` : `<dl><dt>${t('Live TV')}</dt><dd>${fmtN(L)}</dd><dt>${t('Movies')}</dt><dd>${fmtN(M)}</dd></dl>`}
      ${S.loadErr ? `<p class="err">${esc(S.loadErr)}</p>` : ''}</div>
  </div>
  ${cont.length ? `<section class="hrow"><h3>${t('Continue watching')}</h3><div class="rail">${cont.map(posterHtml).join('')}</div></section>` : ''}
  ${rec.length ? `<section class="hrow"><h3>${t('Recent channels')}</h3><div class="rail chrail">${rec.map(c => `<button class="chc" data-k="${c.key}">${logoHtml(c)}<b>${seg(shownNum(c))}</b><span>${esc(c.name)}</span></button>`).join('')}</div></section>` : ''}`;
  $$('[data-go]', box).forEach(b => b.onclick = () => { const g = b.dataset.go; if (g === 'guide') openGuide(); else if (g === 'lists') listsDialog(); else if (g === 'settings') settingsDialog(); else if (g === 'fav') { S.gsel.live = 'fav'; go('live'); } else go(g); }); $$('[data-go2]', box).forEach(x => x.onclick = e => { e.stopPropagation(); S.fx = true; go(x.dataset.go2); });
  $('#hRef').onclick = () => selectSource(S.srcId, true);
  wireItems(box);
  $$('.chc', box).forEach(b => b.onclick = () => { const c = S.byKey[b.dataset.k]; if (c) { S.gsel.live = 'recent'; go('live'); play(c); } });
}

/* ---------- lists ---------- */
const logoHtml = c => c.logo ? `<img loading="lazy" decoding="async" src="${esc(c.logo)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'lg',textContent:${esc(JSON.stringify((c.name || '?').charAt(0)))}}))">` : `<span class="lg">${esc((c.name || '?').charAt(0))}</span>`;
function rowHtml(c) {
  const nn = nowNext(c), fav = S.favs.includes(c.key), n = shownNum(c), pr = nn && nn.now ? Math.round((Date.now() - nn.now.s) / (nn.now.e - nn.now.s) * 100) : 0;
  return `<div class="ch ${S.cur && S.cur.key === c.key ? 'on' : ''}" tabindex="0" data-k="${c.key}"><span class="n">${seg(n)}</span><span class="lgw">${logoHtml(c)}</span><div class="t"><b>${esc(c.name)}</b><span>${nn && nn.now ? esc(nn.now.t) : esc(c.group || '')}</span>${nn && nn.now ? `<div class="pb"><i style="width:${pr}%"></i></div>` : ''}</div><span class="ctl2">${favEditing() ? `<button class="mv" data-mv="-1" data-k2="${c.key}" aria-label="Move up">${ic('up')}</button><button class="mv" data-mv="1" data-k2="${c.key}" aria-label="Move down">${ic('down')}</button>${S.group.startsWith('u:') ? `<button class="mv rmv" data-rm="${c.key}" aria-label="${t('Remove from list')}">${ic('close')}</button>` : ''}<span class="grip" data-g2="${c.key}" aria-hidden="true">${ic('grip')}</span>` : `<button class="star ${fav ? 'on' : ''}" data-s="${c.key}" aria-label="${t('Favourite')}">${ic(fav ? 'starF' : 'star')}</button>`}</span></div>`;
}
function posterHtml(c) {
  const pos = c.cont ? c.cpos : POS[c.key], ini = esc((c.name || '?').charAt(0)), fav = S.favs.includes(c.key);
  return `<div class="pc" tabindex="0" data-k="${c.key}"${c.cont ? ` data-cont="${esc(c.ser)}"` : ''}><div class="po">${c.logo ? `<img loading="lazy" decoding="async" src="${esc(c.logo)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${ini}</span>${c.rating ? `<i class="rt">${c.rating.toFixed(1).replace('.', LANG === 'pt' ? ',' : '.')}</i>` : ''}${fav ? `<i class="fv">${ic('starF')}</i>` : ''}${pos ? `<div class="pp"><i style="width:${Math.min(100, Math.round(pos / ((c.cont ? c.cdur : DUR[c.key]) || c.dur || 5400) * 100))}%"></i></div>` : ''}${SEEN[c.key] && !pos && !c.cont ? `<i class="seen">${ic('check')}</i>` : ''}${c.cont && c.clabel ? `<i class="nxt ${pos ? 'up' : ''}">${esc(c.clabel)}</i>` : ''}</div><b>${esc(c.name)}</b></div>`;
}
function wireItems(box) {
  $$('.ch', box).forEach(r => {
    r.onclick = e => { if (e.target.closest('.star') || e.target.closest('.mv') || e.target.closest('.grip')) return; if (favEditing()) { liftRow(r); return; } pick(S.byKey[r.dataset.k]); };
    r.onkeydown = e => {
      if (favEditing()) {
        if (e.key === 'Enter') { e.preventDefault(); liftRow(r); return; }
        if (r.classList.contains('lift') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveFav(r.dataset.k, e.key === 'ArrowUp' ? -1 : 1, true); return; }
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); pick(S.byKey[r.dataset.k]); }
    };
  });
  $$('.grip', box).forEach(g => g.onpointerdown = e => dragFav(e, g.closest('.ch')));
  $$('.ch', box).forEach(r => r.oncontextmenu = e => { e.preventDefault(); const c = S.byKey[r.dataset.k]; if (c && c.kind === 'live') addToListDialog(c); });
  $$('.pc', box).forEach(r => { r.onclick = () => { const sk = r.dataset.cont, it = S.byKey[r.dataset.k] || EPS[r.dataset.k]; if (sk && S.byKey[sk]) { S.autoResume = true; openDetail(S.byKey[sk]); return; } if (it && it.ser) { const sr = S.byKey[it.ser]; if (sr) openDetail(sr); enterFsFor(it); } else openDetail(it); }; r.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); r.click(); } }; });
  $$('.star', box).forEach(b => b.onclick = e => { e.stopPropagation(); toggleFav(S.byKey[b.dataset.s]); });
  $$('.rmv', box).forEach(b => b.onclick = e => { e.stopPropagation(); const UL = curUList(); if (UL) { UL.keys = UL.keys.filter(x => x !== b.dataset.rm); saveLists(); renderBrowse(); } });
  $$('.mv:not(.rmv)', box).forEach(b => b.onclick = e => { e.stopPropagation(); moveFav(b.dataset.k2, +b.dataset.mv); const f = $(`.mv[data-k2="${b.dataset.k2}"][data-mv="${b.dataset.mv}"]`); if (f) f.focus(); });
}
function pick(c) {
  if (!c) return; if (c.kind !== 'live') { openDetail(c); return; }
  if (S.view !== 'browse') { enterFsFor(c); return; }
  if (S.cur && S.cur.key === c.key && $('#msg').hidden) enterFs(); else play(c);
}

/* ---------- browse (live / movies / series) ---------- */
const tabOf = g => (g === '_vod' || g.startsWith('v:')) ? 'vod' : (g === '_series' || g.startsWith('s:')) ? 'series' : 'live';
function catItems(tab) {
  const k = kindOf(tab), o = {}, H = new Set(S.set.hidden || []), L = lockedSet(); let n = 0; S.channels.forEach(c => { if (c.kind !== k) return; const g = c.group || '—', gk = k + ':' + g; if (H.has(gk)) return; if (!L.has(gk) || S.unlocked) n++; o[g] = (o[g] || 0) + 1; });
  const favN = favList().filter(c => c.kind === k).length, pre = tab === 'live' ? 'g:' : tab === 'vod' ? 'v:' : 's:';
  const head = tab === 'live' ? [{ id: 'all', label: t('All channels'), n }, { id: 'fav', label: t('Favourites'), n: favN, icon: 'star' }, { id: 'recent', label: t('Recent'), n: S.recent.filter(x => S.byKey[x] && S.byKey[x].kind === 'live').length, icon: 'clock' }].concat(S.lists.map(L => ({ id: 'u:' + L.id, label: L.name, n: L.keys.filter(x => S.byKey[x]).length, icon: 'stack' })), [{ id: 'newlist', label: t('New list'), n: '', icon: 'plus' }]) : [{ id: GDEF[tab], label: t('All'), n }, { id: 'fav', label: t('Favourites'), n: favN, icon: 'star' }];
  return head.concat(Object.keys(o).map(g => ({ id: pre + g, label: g, n: o[g], icon: L.has(k + ':' + g) && !S.unlocked ? 'lock' : '' })));
}
function renderBrowse() {
  const items = catItems(S.mode), cur = items.find(x => x.id === S.group) || items[0];
  const item = it => `<button data-g="${esc(it.id)}" class="${S.group === it.id ? 'on' : ''}">${it.icon ? ic(it.icon) : ''}<span>${esc(it.label)}</span><small>${it.n === '' ? '' : fmtN(it.n)}</small></button>`;
  $('#groups').innerHTML = (items.length > 14 ? `<label class="gq">${ic('search')}<input id="gq" placeholder="${t('Filter categories…')}"></label>` : '') + `<div class="cats">${items.map(item).join('')}</div>`;
  $('#catBtn').innerHTML = `${ic('list')}<span>${esc(cur ? cur.label : '')}</span><small>${cur ? fmtN(cur.n) : ''}</small>${ic('down')}`;
  const pickG = id => { if (id === 'newlist') { newListDialog(L => { S.group = 'u:' + L.id; S.gsel.live = S.group; LS.set('ap.gsel', S.gsel); renderBrowse(); }); return; } const it = items.find(x => x.id === id); if (it && it.icon === 'lock') { askPin(() => { S.unlocked = true; refreshVis(); S.group = id; S.gsel[S.mode] = id; LS.set('ap.gsel', S.gsel); S.shown = 250; renderBrowse(); }); return; } S.group = id; S.gsel[S.mode] = id; LS.set('ap.gsel', S.gsel); S.shown = 250; renderBrowse(); $('#list').scrollTop = 0; };
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
  if (!l.length && S.group === 'fav' && S.mode === 'live' && !S.q.trim()) { box.classList.remove('grid', 'vhome'); box.innerHTML = `<div class="empty">${ic('star')}<h3>${t('No favourites yet')}</h3><p>${t('Tap the star next to a channel, or import a list.')}</p><button class="btn p" id="favIo">${ic('stack')} ${t('Import favourites (JSON)')}</button></div>`; $('#favIo', box).onclick = favsDialog; return; }
  if (!l.length && S.group.startsWith('u:') && !S.q.trim()) { const UL0 = curUList(); box.innerHTML = `<div class="empty">${ic('stack')}<h3>${esc(UL0 ? UL0.name : '')}</h3><p>${t('This list is empty. Open a channel and use “Add to list”, or long-press a channel.')}</p><button class="btn" id="ulDel0">${ic('close')} ${t('Delete list')}</button></div>`; $('#ulDel0', box).onclick = () => { S.lists = S.lists.filter(x => x !== UL0); saveLists(); S.group = 'all'; S.gsel.live = 'all'; renderBrowse(); }; return; }
  if (!l.length) { box.innerHTML = `<div class="empty"><h3>${t('Nothing found')}</h3></div>`; return; }
  clearInterval(heroT);
  box.classList.remove('vhome');
  if (grid && !S.q.trim() && S.group === GDEF[S.mode]) { box.classList.remove('grid'); box.classList.add('vhome'); vodHome(box); return; }
  let L2 = l; const so = S.sort[S.mode] || 'def';
  if (grid && so !== 'def') { L2 = l.slice(); if (so === 'az') L2.sort((a, b) => (a.name || '').localeCompare(b.name || '')); else if (so === 'new') L2.sort((a, b) => (b.added || 0) - (a.added || 0)); else if (so === 'rate') L2.sort((a, b) => (b.rating || 0) - (a.rating || 0)); }
  const cur = grid ? catItems(S.mode).find(x => x.id === S.group.replace('!', '')) : null;
  const UL = curUList(); const ftools = !grid && isOrdList(S.group) && !S.q.trim() ? `<div class="ftools"><b>${esc(UL ? UL.name : t('Favourites'))}</b><small>${fmtN(l.length)}</small><span class="gap"></span>${S.favEdit ? `<span class="mut fhint">${t(isTouch() ? 'Drag ⋮⋮ or use the arrows' : 'OK picks a channel, ▲ ▼ move it, OK drops it')}</span>` : ''}${UL ? `<button class="btn sm" id="ulRen">${ic('edit')} ${t('Rename')}</button><button class="btn sm" id="ulDel">${ic('close')} ${t('Delete list')}</button>` : `<button class="btn sm" id="favIo" aria-label="${t('Import / export favourites')}">${ic('stack')} JSON</button>`}<button class="btn sm ${S.favEdit ? 'p' : ''}" id="favEd">${ic(S.favEdit ? 'check' : 'edit')} ${t(S.favEdit ? 'Done' : 'Edit order')}</button></div>` : '';
  box.innerHTML = ftools + (grid ? `<div class="ltools"><b>${esc(cur ? cur.label : t('Search'))}</b><small>${fmtN(l.length)}</small><span class="gap"></span><button class="btn sm" id="sortB">${ic('sort')} ${t(SORTS[so])}</button></div>` : '') + L2.slice(0, S.shown).map(grid ? posterHtml : rowHtml).join('') + (l.length > S.shown ? `<button class="more" id="more">${t('Show more')} (${fmtN(l.length - S.shown)})</button>` : '');
  wireItems(box); const m = $('#more', box); if (m) m.onclick = () => { S.shown += 250; renderList(); };
  const fio = $('#favIo', box); if (fio) fio.onclick = favsDialog;
  const ur = $('#ulRen', box); if (ur) ur.onclick = () => newListDialog(() => renderBrowse(), UL);
  const ud = $('#ulDel', box); if (ud) ud.onclick = () => { openDlg(`<h2>${t('Delete list')}</h2><p>${esc(UL.name)}</p><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="dy">${t('Delete')}</button></div>`); $('#dx').onclick = () => dlg.close(); $('#dy').onclick = () => { dlg.close(); S.lists = S.lists.filter(x => x !== UL); saveLists(); S.group = 'fav'; S.gsel.live = 'fav'; LS.set('ap.gsel', S.gsel); renderBrowse(); }; };
  const fe = $('#favEd', box); if (fe) fe.onclick = () => { S.favEdit = !S.favEdit; renderList(); const b = $('#favEd'); if (b) b.focus(); };
  const sb = $('#sortB', box); if (sb) sb.onclick = () => { const ks = Object.keys(SORTS); S.sort[S.mode] = ks[(ks.indexOf(so) + 1) % ks.length]; renderList(); $('#sortB').focus(); };
}
function filtered() {
  const q = fold(S.q.trim()); if (!q) return baseList();
  const k = kindOf(S.mode); return S.vis.filter(c => c.kind === k && (lname(c).includes(q) || String(shownNum(c)) === q));
}
const SORTS = { def: 'Default order', az: 'A–Z', new: 'Recently added', rate: 'Top rated' };
let heroT = 0;
function vodHome(box) {
  const k = kindOf(S.mode), all = S.vis.filter(c => c.kind === k);
  let top = all.filter(c => c.rating > 0 && c.logo).sort((a, b) => b.rating - a.rating).slice(0, 10); if (top.length < 4) top = all.filter(c => c.logo).sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 10);
  const rows = [[t('Continue watching'), contList().filter(c => c.kind === k || (k === 'series' && c.ser)), ''], [t('Favourites'), favList().filter(c => c.kind === k), 'fav'], [t('Recently added'), all.slice().sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 24), 'new']];
  const byG = groupBy(all, c => c.group || '—');
  catItems(S.mode).filter(x => !['fav', GDEF[S.mode]].includes(x.id) && x.icon !== 'lock').slice(0, 16).forEach(g => rows.push([g.label, (byG.get(g.id.slice(2)) || []).slice(0, 24), g.id, g.n]));
  box.innerHTML = (top.length ? `<div class="hero" id="hero">${top.map((c, i) => `<div class="hs ${i ? '' : 'on'}" data-k="${c.key}"><div class="hbg" style="background-image:url('${esc(c.logo).replace(/'/g, '%27')}')"></div><div class="hpo"><img src="${esc(c.logo)}" alt="" onerror="this.remove()"><span class="hn">${i + 1}</span></div><div class="hi"><h3>${esc(c.name)}</h3><div class="chips">${c.rating ? `<span>★ ${c.rating.toFixed(1)}</span>` : ''}<span>${esc(c.group || '')}</span></div><div class="hacts"><button class="btn p" data-hp="${c.key}">${ic('play')} ${t('Watch')}</button><button class="btn" data-hd="${c.key}">${ic('info')} ${t('Details')}</button></div></div></div>`).join('')}<div class="hdots">${top.map((c, i) => `<button data-hi="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"></button>`).join('')}</div></div>` : '') +
    rows.filter(r => r[1].length).map(r => `<section class="hrow vrow"><div class="rh"><h3>${esc(r[0])} <small>${fmtN(r[3] || r[1].length)}</small></h3>${r[2] && r[2] !== 'new' ? `<button class="seeall" data-g="${esc(r[2])}">${t('See all')}</button>` : r[2] === 'new' ? `<button class="seeall" data-sort="new">${t('See all')}</button>` : ''}</div><div class="rail">${r[1].map(posterHtml).join('')}</div></section>`).join('') || `<div class="empty"><h3>${t('Nothing found')}</h3></div>`;
  wireItems(box);
  const slides = $$('.hs', box), dots = $$('.hdots button', box); let hi = 0;
  const show = n => { hi = (n + slides.length) % slides.length; slides.forEach((x, i) => x.classList.toggle('on', i === hi)); dots.forEach((x, i) => x.classList.toggle('on', i === hi)); };
  dots.forEach(d => d.onclick = () => { show(+d.dataset.hi); clearInterval(heroT); });
  $$('[data-hp]', box).forEach(b => b.onclick = e => { e.stopPropagation(); const c = S.byKey[b.dataset.hp]; c.seriesId ? openDetail(c) : enterFsFor(c); });
  $$('[data-hd]', box).forEach(b => b.onclick = e => { e.stopPropagation(); openDetail(S.byKey[b.dataset.hd]); });
  slides.forEach(x => { x.onclick = () => openDetail(S.byKey[x.dataset.k]); x.addEventListener('focusin', () => clearInterval(heroT)); });
  if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) heroT = setInterval(() => { if (S.view === 'browse' && document.visibilityState === 'visible') show(hi + 1); }, 7000);
  let sx = null; const hero = $('#hero', box); if (hero) { hero.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true }); hero.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) { show(hi + (dx < 0 ? 1 : -1)); clearInterval(heroT); } }); }
  $$('.seeall', box).forEach(b => b.onclick = () => { if (b.dataset.sort) { S.sort[S.mode] = 'new'; S.group = GDEF[S.mode] + '!'; } else { S.group = b.dataset.g; S.gsel[S.mode] = S.group; } S.shown = 250; renderBrowse(); $('#list').scrollTop = 0; });
}
function renderSearch() {
  const box = $('#sres'), q = fold(S.q.trim());
  if (q.length < 2) { box.innerHTML = `<div class="empty">${ic('search')}<p>${t('Type at least 2 letters')}</p></div>`; return; }
  const res = S.vis.filter(c => lname(c).includes(q)), sec = (k, label, f) => { const a = res.filter(c => c.kind === k); return a.length ? `<section class="hrow"><h3>${label} <small>${fmtN(a.length)}</small></h3>${k === 'live' ? `<div class="slist">${a.slice(0, 60).map(rowHtml).join('')}</div>` : `<div class="rail">${a.slice(0, 40).map(posterHtml).join('')}</div>`}</section>` : ''; };
  box.innerHTML = (sec('live', t('Live TV')) + sec('vod', t('Movies')) + sec('series', t('Series'))) || `<div class="empty"><h3>${t('Nothing found')}</h3></div>`;
  wireItems(box);
}
function render() {
  renderHeader();
  if (S.view === 'home') renderHome(); else if (S.view === 'browse') renderBrowse(); else if (S.view === 'search') renderSearch(); else if (S.view === 'flix') renderFlix(); else if (S.view === 'detail' && !$('#vDetail').innerHTML) renderDetailShell();
  updateFavBtn();
}

/* ---------- detail page (movies & series) ---------- */
async function openDetail(c) { if (!c) return; S.fxSn = ''; S.fxTabD = ''; S.detail = c; S.dinfo = null; S.deps = null; $('#vDetail').innerHTML = ''; go('detail'); loadDetail(c); }
function xbase() { const s = curSrc(); return s && s.type === 'xtream' ? { s, base: s.server.replace(/\/+$/, ''), q: encodeURIComponent } : null; }
async function loadDetail(c) {
  const x = xbase(); if (!x || (!c.vodId && !c.seriesId)) { S.dinfo = {}; renderDetailShell(); return; }
  try { const d = await fetchJson(`${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=${c.seriesId ? 'get_series_info&series_id=' + x.q(c.seriesId) : 'get_vod_info&vod_id=' + x.q(c.vodId)}`); if (S.detail !== c) return; S.dinfo = d.info || {}; if (c.seriesId) S.deps = d.episodes || {}; if (S.dinfo.duration_secs) c.dur = +S.dinfo.duration_secs; }
  catch (e) { if (S.detail === c) S.dinfo = { err: e.message }; }
  if (S.detail === c && S.view === 'detail') renderDetailShell();
  if (S.autoResume && S.detail === c) { S.autoResume = false; const x = c.seriesId ? serResume(c) : null; if (x) enterFsFor(x.ep); }
}
// where to continue a series: the episode in progress, else the one after the last finished, else the first
function serResume(c) {
  if (!S.deps || S.detail !== c) return null; const ss = Object.keys(S.deps).sort((a, b) => a - b); if (!ss.length) return null;
  const all = []; ss.forEach(sn => (S.deps[sn] || []).forEach((e, n) => all.push({ sn, n, ep: epObj(c, sn, e, n) })));
  const last = SLAST[c.key]; let i = last ? all.findIndex(x => x.ep.key === last.k) : -1;
  if (i < 0) { const w = all.map((x, j) => (SEEN[x.ep.key] || POS[x.ep.key]) ? j : -1).filter(j => j > -1).pop(); i = w == null ? -1 : w; }
  if (i < 0) return Object.assign({ first: true }, all[0]);
  const x = all[i]; if (POS[x.ep.key]) return Object.assign({ resume: POS[x.ep.key] }, x);
  return all[i + 1] ? Object.assign({ next: true }, all[i + 1]) : Object.assign({ again: true }, all[0]);
}
function serPlayBtn(c) { const x = serResume(c); if (!x) return ''; const lab = epLabel(x.ep); return `<button class="btn p big" id="dSer">${ic('play')} ${x.resume ? t('Resume') + ' ' + lab : t('Watch') + ' ' + lab}</button>`; }
function renderDetailShell() {
  const c = S.detail; if (!c) return; if (S.fx) { renderFxDetail(c); return; } const i = S.dinfo || {}, box = $('#vDetail');
  const img = i.movie_image || i.cover_big || i.cover || c.logo || '', back = (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path) || img;
  const year = (i.releasedate || i.releaseDate || i.release_date || '').slice(0, 4), rating = parseFloat(i.rating) || 0;
  const chips = [year, i.genre, i.duration, rating ? '★ ' + rating.toFixed(1) : ''].filter(Boolean), fav = S.favs.includes(c.key), pos = POS[c.key];
  const seasons = S.deps ? Object.keys(S.deps).sort((a, b) => a - b) : [];
  box.innerHTML = `<div class="dbg" style="${back ? `background-image:url('${esc(back).replace(/'/g, '%27')}')` : ''}"></div><div class="dwrap">
    <div class="dpost">${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${esc((c.name || '?').charAt(0))}</span></div>
    <div class="dinfo"><h2>${esc(c.name)}</h2>${chips.length ? `<div class="chips">${chips.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${S.dinfo == null ? `<p class="mut">${t('Loading…')}</p>` : (i.plot || i.description) ? `<p class="plot">${esc(i.plot || i.description)}</p>` : `<p class="mut">${t('No details from the provider')}</p>`}
      ${i.cast ? `<p class="cast">${esc(i.cast)}</p>` : ''}
      <div class="dacts">${c.seriesId ? serPlayBtn(c) : `<button class="btn p big" id="dPlay">${ic('play')} ${pos ? t('Resume') + ' ' + fmtT(pos) : t('Watch')}</button>`}${c.seriesId ? '' : `<button class="btn big" id="dSeen">${ic('check')} ${SEEN[c.key] ? t('Watched') : t('Mark as watched')}</button>`}<button class="btn big ${fav ? 'on' : ''}" id="dFav">${ic(fav ? 'starF' : 'star')} ${fav ? t('In favourites') : t('Add favourite')}</button></div>
      ${seasons.length ? `<div class="seas">${seasons.map((s, n) => `<button data-sn="${esc(s)}" class="${n === 0 ? 'on' : ''}">${t('Season')} ${esc(s)}</button>`).join('')}</div><div class="eps" id="eps"></div>` : ''}
    </div></div>`;
  const p = $('#dPlay'); if (p) p.onclick = () => { enterFsFor(c); };
  const ds = $('#dSeen'); if (ds) ds.onclick = () => { markSeen(c, !SEEN[c.key]); renderDetailShell(); };
  const sp = $('#dSer'); if (sp) sp.onclick = () => { const x = serResume(c); if (x) enterFsFor(x.ep); };
  $('#dFav').onclick = () => { toggleFav(c); renderDetailShell(); };
  if (seasons.length) { const draw = sn => { $$('.seas button').forEach(b => b.classList.toggle('on', b.dataset.sn === sn)); $('#eps').innerHTML = (S.deps[sn] || []).map((e, n) => { const ep = epObj(c, sn, e, n), ps = POS[ep.key], dn = DUR[ep.key] || ep.dur || 2700; return `<button class="ep ${SEEN[ep.key] && !ps ? 'seen' : ''}" data-i="${n}">${e.info && e.info.movie_image ? `<img loading="lazy" decoding="async" src="${esc(e.info.movie_image)}" alt="" onerror="this.remove()">` : `<span class="en">${esc(e.episode_num || n + 1)}</span>`}<span class="et"><b>${t('Episode')} ${esc(e.episode_num || n + 1)}</b><span>${esc(e.title || '')}</span>${ps ? `<i class="epp" style="width:${Math.max(4, Math.min(100, Math.round(ps / dn * 100)))}%"></i>` : ''}</span>${SEEN[ep.key] && !ps ? `<i class="epseen">${ic('check')}</i>` : ic('play')}</button>`; }).join(''); $$('#eps .ep').forEach(b => b.onclick = () => { const e = S.deps[sn][+b.dataset.i]; enterFsFor(epObj(c, sn, e, +b.dataset.i)); }); }; $$('.seas button').forEach(b => b.onclick = () => draw(b.dataset.sn)); const rs = serResume(c); draw(rs && seasons.includes(String(rs.sn)) ? String(rs.sn) : seasons[0]); }
}
function epObj(c, sn, e, n) { const x = xbase(); const url = `${x.base}/series/${x.q(x.s.user)}/${x.q(x.s.pass)}/${e.id}.${e.container_extension || 'mp4'}`; return { name: `${c.name} · S${sn}E${e.episode_num || n + 1}`, logo: c.logo, group: c.group, url, kind: 'vod', num: 0, key: hash(c.name + '|' + url), dur: e.info && +e.info.duration_secs || 0, ser: c.key, sn, n }; }
function enterFsFor(c) { if (c.kind !== 'live' && !S.byKey[c.key]) { S.byKey[c.key] = c; EPS[c.key] = c; const ks = Object.keys(EPS); if (ks.length > 60) delete EPS[ks[0]]; LS.set('ap.eps', EPS); } play(c); enterFs(); }

/* ---------- favourites ---------- */
function toggleFav(c) { if (!c) return; const i = S.favs.indexOf(c.key); if (i < 0) { S.favs.push(c.key); toast(t('Added to favourites') + (S.set.numberMode === 'favs' && c.kind === 'live' ? ` · ${favList().filter(x => x.kind === 'live').length}` : '')); } else { S.favs.splice(i, 1); toast(t('Removed from favourites')); } LS.set('ap.favs', S.favs); if (S.view !== 'detail') render(); updateFavBtn(); }
function askPin(ok) {
  openDlg(`<h2>${ic('lock')} ${t('Enter PIN')}</h2><input id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="pOk">OK</button></div>`);
  const go2 = () => { if ($('#pin').value === String(S.set.pin || '')) { dlg.close(); ok(); } else { toast(t('Wrong PIN')); $('#pin').value = ''; } };
  $('#pOk').onclick = go2; $('#pin').onkeydown = e => { if (e.key === 'Enter') go2(); }; $('#dx').onclick = () => dlg.close(); setTimeout(() => $('#pin').focus(), 50);
}
function catsDialog() {
  const H = new Set(S.set.hidden || []), L = new Set(S.set.locked || []), gs = {}; S.channels.forEach(c => { gs[gkey(c)] = (gs[gkey(c)] || 0) + 1; });
  const lab = { live: t('Live TV'), vod: t('Movies'), series: t('Series') }, keys = Object.keys(gs).sort();
  openDlg(`<h2>${t('Manage categories')}</h2><label class="gq">${ic('search')}<input id="cq" placeholder="${t('Filter categories…')}"></label><div class="catm">${keys.map(k => { const [kd, ...g] = k.split(':'); return `<div class="cm" data-n="${esc(k.toLowerCase())}"><span><b>${esc(g.join(':'))}</b><small>${lab[kd]} · ${gs[k]}</small></span><label class="tg"><input type="checkbox" data-h="${esc(k)}" ${H.has(k) ? 'checked' : ''}>${t('Hide')}</label><label class="tg"><input type="checkbox" data-l="${esc(k)}" ${L.has(k) ? 'checked' : ''} ${S.set.pin ? '' : 'disabled'}>${ic('lock')}</label></div>`; }).join('')}</div><div class="row"><button class="btn p" id="dx">OK</button></div>`);
  $('#cq').oninput = () => { const q = $('#cq').value.trim().toLowerCase(); $$('.cm', dlg).forEach(r => r.style.display = !q || r.dataset.n.includes(q) ? '' : 'none'); };
  $$('[data-h]', dlg).forEach(x => x.onchange = () => { const a = new Set(S.set.hidden || []); x.checked ? a.add(x.dataset.h) : a.delete(x.dataset.h); S.set.hidden = [...a]; saveSet(); refreshVis(); });
  $$('[data-l]', dlg).forEach(x => x.onchange = () => { const a = new Set(S.set.locked || []); x.checked ? a.add(x.dataset.l) : a.delete(x.dataset.l); S.set.locked = [...a]; saveSet(); refreshVis(); });
  $('#dx').onclick = () => { dlg.close(); render(); };
}
const ADULT = /adult|xxx|porn|\+ ?18|18 ?\+|erotic|for adults/i;
function catchUrl(c, p) {
  const x = xbase(); if (!x || !c.sid) return ''; const tz = S.acct && S.acct.tz, d = new Date(p.s);
  let parts; try { parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(o => [o.type, o.value])); } catch (e) { parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(o => [o.type, o.value])); }
  const st = `${parts.year}-${parts.month}-${parts.day}:${parts.hour}-${parts.minute}`, dur = Math.max(1, Math.ceil((p.e - p.s) / 60000));
  return `${x.base}/timeshift/${x.q(x.s.user)}/${x.q(x.s.pass)}/${dur}/${st}/${c.sid}.ts`;
}
const canCatch = (c, p) => c.arch && c.sid && p.e <= Date.now() + 60000 && p.s > Date.now() - (c.archD || 1) * 86400000 && xbase();
function playCatch(c, p) { const url = catchUrl(c, p); if (!url) return; enterFsFor({ name: `${c.name} · ${p.t}`, logo: c.logo, group: `${t('Catch-up')} · ${hm(p.s)}–${hm(p.e)}`, url, kind: 'catchup', num: 0, key: hash(url) }); }
function rememberNext(c, nx) { EPS[nx.key] = nx; const ks = Object.keys(EPS); if (ks.length > 80) delete EPS[ks[0]]; LS.set('ap.eps', EPS); SLAST[c.ser] = Object.assign({}, SLAST[c.ser] || { k: c.key, t: Date.now() }, { next: nx.key }); saveWatch(); }
function nextEpisode() {
  const c = S.cur, d = S.detail; if (!c || !c.ser || !d || d.key !== c.ser || !S.deps) return null;
  const ss = Object.keys(S.deps).sort((a, b) => a - b), list = S.deps[c.sn] || [];
  if (c.n + 1 < list.length) { const nx = epObj(d, c.sn, list[c.n + 1], c.n + 1); rememberNext(c, nx); return nx; } const si = ss.indexOf(String(c.sn)); if (si > -1 && ss[si + 1] && (S.deps[ss[si + 1]] || []).length) { const nx = epObj(d, ss[si + 1], S.deps[ss[si + 1]][0], 0); rememberNext(c, nx); return nx; }
  const ns = ss[ss.indexOf(String(c.sn)) + 1]; return ns && S.deps[ns] && S.deps[ns][0] ? epObj(d, ns, S.deps[ns][0], 0) : null;
}
function newListDialog(done, edit) {
  openDlg(`<h2>${ic('stack')} ${edit ? t('Rename') : t('New list')}</h2><label>${t('Name')}</label><input id="lnName" maxlength="40" value="${esc(edit ? edit.name : '')}" placeholder="${t('e.g. Sport, Kids, News')}"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="lnOk">${t('Save')}</button></div>`);
  const ok = () => { const n = $('#lnName').value.trim(); if (!n) { toast(t('Fill in the fields')); return; } let L = edit; if (L) L.name = n; else { L = { id: Date.now().toString(36), name: n, keys: [] }; S.lists.push(L); } saveLists(); dlg.close(); done && done(L); };
  $('#lnOk').onclick = ok; $('#lnName').onkeydown = e => { if (e.key === 'Enter') ok(); }; $('#dx').onclick = () => dlg.close(); setTimeout(() => $('#lnName').focus(), 50);
}
function addToListDialog(c) {
  if (!c) return;
  const draw = () => {
    openDlg(`<h2>${ic('stack')} ${t('Add to list')}</h2><p class="mut">${esc(c.name)}</p><div class="catlist">${S.lists.map(L => `<button data-l="${L.id}" class="${L.keys.includes(c.key) ? 'on' : ''}">${ic(L.keys.includes(c.key) ? 'check' : 'plus')}<span>${esc(L.name)}</span><small>${L.keys.length}</small></button>`).join('') || `<p class="mut">${t('No lists yet.')}</p>`}</div><div class="row" style="justify-content:space-between"><button class="btn" id="lNew">${ic('plus')} ${t('New list')}</button><button class="btn p" id="dx">OK</button></div>`);
    $('#dx').onclick = () => { dlg.close(); if (S.view === 'browse') renderBrowse(); };
    $('#lNew').onclick = () => newListDialog(L => { L.keys.push(c.key); saveLists(); draw(); });
    $$('[data-l]', dlg).forEach(b => b.onclick = () => { const L = S.lists.find(x => x.id === b.dataset.l); const i = L.keys.indexOf(c.key); i < 0 ? L.keys.push(c.key) : L.keys.splice(i, 1); saveLists(); draw(); const f = $(`[data-l="${L.id}"]`, dlg); if (f) f.focus(); });
  };
  draw();
}
function moveFavTo(k, to) {
  const UL = curUList();
  if (UL) { const a = UL.keys, i = a.indexOf(k); if (i < 0) return false; to = Math.max(0, Math.min(a.length - 1, to)); if (to === i) return false; a.splice(to, 0, a.splice(i, 1)[0]); saveLists(); return true; }
  const live = favLive().map(c => c.key), i = live.indexOf(k); if (i < 0) return false; to = Math.max(0, Math.min(live.length - 1, to)); if (to === i) return false;
  live.splice(to, 0, live.splice(i, 1)[0]); const slots = S.favs.map((x, n) => live.includes(x) ? n : -1).filter(n => n >= 0); slots.forEach((n, j) => { S.favs[n] = live[j]; }); LS.set('ap.favs', S.favs); return true;
}
function moveFav(k, d, keepLift) {
  const UL = curUList(), i = UL ? UL.keys.indexOf(k) : favLive().findIndex(c => c.key === k); if (!moveFavTo(k, i + d)) return; renderList();
  const r = $(`#list .ch[data-k="${k}"]`); if (r) { if (keepLift) r.classList.add('lift'); r.focus({ preventScroll: true }); r.scrollIntoView({ block: 'nearest' }); }
}
function liftRow(r) { const was = r.classList.contains('lift'); $$('#list .ch.lift').forEach(x => x.classList.remove('lift')); if (!was) r.classList.add('lift'); else toast(t('Order saved')); }
function dragFav(e, row) {
  e.preventDefault(); const box = $('#list'), rows = $$('.ch', box), h = row.getBoundingClientRect().height + 4, y0 = e.clientY, i0 = rows.indexOf(row); let to = i0;
  row.classList.add('drag'); row.setPointerCapture && row.setPointerCapture(e.pointerId);
  const mv = ev => { const dy = ev.clientY - y0; row.style.transform = `translateY(${dy}px)`; to = Math.max(0, Math.min(rows.length - 1, i0 + Math.round(dy / h))); rows.forEach((r2, n) => { if (r2 === row) return; const shift = (n > i0 && n <= to) ? -h : (n < i0 && n >= to) ? h : 0; r2.style.transform = shift ? `translateY(${shift}px)` : ''; }); };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); rows.forEach(r2 => { r2.style.transform = ''; }); row.classList.remove('drag'); if (moveFavTo(row.dataset.k, to)) { renderList(); toast(t('Order saved')); } };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}
function updateFavBtn() { const f = S.cur && S.favs.includes(S.cur.key); $('#cFav').innerHTML = ic(f ? 'starF' : 'star'); $('#cFav').classList.toggle('on', !!f); }

/* ---------- TV guide ---------- */
function openGuide() {
  const base = S.view === 'browse' && S.mode === 'live' ? baseList() : S.channels.filter(c => c.kind === 'live'), list = base.filter(c => c.kind === 'live').slice(0, 200);
  const PX = 4, step = 30 * 60000, now = Date.now(), start = Math.floor((now - (list.some(c => c.arch) ? 3 * 3600000 : 45 * 60000)) / step) * step, end = start + 9 * 3600000, W = (end - start) / 60000 * PX;
  const ticks = []; for (let x = start; x < end; x += step) ticks.push(`<i style="left:${(x - start) / 60000 * PX}px">${hm(x)}</i>`);
  const rows = list.map(c => { const l = epgFor(c) || [], bl = l.filter(p => p.e > start && p.s < end).map(p => { const s = Math.max(p.s, start), e = Math.min(p.e, end); const cp = p.e <= now && canCatch(c, p); return `<button class="pg ${p.s <= now && p.e > now ? 'now' : ''} ${cp ? 'cu' : ''} ${remIdx(c, p) > -1 ? 'rem' : ''}" data-st="${p.s}" ${cp ? `data-ps="${p.s}"` : ''} style="left:${(s - start) / 60000 * PX}px;width:${Math.max(24, (e - s) / 60000 * PX - 3)}px" data-k="${c.key}"><b>${esc(p.t)}</b><small>${hm(p.s)} – ${hm(p.e)}</small></button>`; }).join(''); return `<div class="gr"><button class="gc" data-k="${c.key}"><span class="n">${seg(shownNum(c))}</span><span class="lgw">${logoHtml(c)}</span><span class="nm">${esc(c.name)}</span></button><div class="gt" style="width:${W}px">${bl || `<span class="gnone">—</span>`}</div></div>`; }).join('');
  openDlg(`<div class="gh"><h2>${ic('guide')} ${t('TV guide')}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('back')}</button></div><div class="gscroll" id="gs"><div class="gcols"><div class="gc0"></div><div class="gaxis" style="width:${W}px">${ticks.join('')}<u style="left:${(now - start) / 60000 * PX}px"></u></div></div>${rows || `<div class="empty"><p>${t('No guide data yet')}</p></div>`}</div>`, 'full');
  $('#dx').onclick = () => dlg.close(); const gs = $('#gs'); gs.scrollLeft = Math.max(0, (now - start) / 60000 * PX - 80);
  $$('#gs [data-k]').forEach(b => b.onclick = () => { const c = S.byKey[b.dataset.k]; if (b.dataset.st && +b.dataset.st > Date.now()) { const p = (epgFor(c) || []).find(x => x.s === +b.dataset.st); if (p) { progDialog(c, p); return; } } dlg.close(); if (b.dataset.ps) { const p = (epgFor(c) || []).find(x => x.s === +b.dataset.ps); if (p) { playCatch(c, p); return; } } if (S.view === 'browse' && S.mode === 'live') play(c); else { go('live'); setTimeout(() => play(c), 30); } });
  if (!Object.keys(S.epg).length) toast(t('No guide data yet'));
}

/* ---------- playlists dialog ---------- */
function listsDialog() {
  openDlg(`<h2>${t('Playlists')}</h2><div class="srcs">${S.sources.map(x => `<div class="srow ${x.id === S.srcId ? 'on' : ''}"><span class="sic">${ic(x.type === 'xtream' ? 'user' : 'stack')}</span><div><b>${esc(x.name)}</b><small>${x.type === 'xtream' ? 'Xtream' : 'M3U'}${x.id === S.srcId ? ' · ' + t('Active') : ''}</small></div>${x.id === S.srcId ? '' : `<button class="btn" data-u="${x.id}">${t('Use')}</button>`}<button class="ib" data-r="${x.id}" aria-label="${t('Refresh')}">${ic('refresh')}</button><button class="ib" data-e="${x.id}" aria-label="${t('Edit')}">${ic('edit')}</button><button class="btn" data-d="${x.id}">${t('Delete')}</button></div>`).join('')}</div>
  <div class="row"><button class="btn" id="lX">${ic('user')} ${t('Xtream login')}</button><button class="btn" id="lU">${ic('plus')} ${t('Add a playlist')}</button><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close(); $('#lX').onclick = () => addDialog('xt'); $('#lU').onclick = () => addDialog('url');
  $$('[data-u]', dlg).forEach(b => b.onclick = () => { dlg.close(); selectSource(b.dataset.u); });
  $$('[data-r]', dlg).forEach(b => b.onclick = () => { dlg.close(); selectSource(b.dataset.r, true); }); $$('[data-e]', dlg).forEach(b => b.onclick = () => editSourceDialog(b.dataset.e));
  $$('[data-d]', dlg).forEach(b => b.onclick = () => { const id = b.dataset.d; S.sources = S.sources.filter(x => x.id !== id); LS.set('ap.sources', S.sources); idbDel('ch:' + id); idbDel('epg:' + id); if (id === S.srcId) selectSource(S.sources[0] && S.sources[0].id); listsDialog(); render(); });
}

/* ---------- wiring ---------- */
[['#bBack', 'back'], ['#bSearch', 'search'], ['#bGuide', 'guide'], ['#bSet', 'gear'], ['#qWrap .si', 'search'], ['#pExpand', 'expand'], ['#cExit', 'back'], ['#cBack', 'rew10'], ['#cFwd', 'fwd10'], ['#cPlay', 'pause'], ['#cPrev', 'skp'], ['#cNext', 'skn'], ['#cTrk', 'cc'], ['#cAsp', 'aspect'], ['#cRec', 'rec'], ['#cMute', 'vol'], ['#cInfo', 'info'], ['#cMore', 'dots'], ['#cpPrev', 'left'], ['#cpNext', 'right'], ['#csClose', 'close'], ['#cList i', 'stack']].forEach(([s, n]) => { $(s).innerHTML = ic(n); });
$('#bBack').onclick = () => back(); $('#bSearch').onclick = () => { S.q = ''; $('#q').value = ''; go('search'); }; $('#bGuide').onclick = openGuide; $('#bSet').onclick = settingsDialog; $('#logo').onclick = () => go('home');
let qT; $('#q').oninput = e => { S.q = e.target.value; S.shown = 250; clearTimeout(qT); qT = setTimeout(() => S.view === 'search' ? renderSearch() : renderList(), 150); };
$('#cFav').onclick = () => toggleFav(S.cur); $('#cPrev').onclick = () => zap(-1); $('#cNext').onclick = () => zap(1); $('#cRec').onclick = toggleRec;
$('#cMute').onclick = () => { v.muted = !v.muted; $('#cMute').innerHTML = ic(v.muted ? 'mute' : 'vol'); };
$('#pExpand').onclick = e => { e.stopPropagation(); enterFs(); }; $('#cExit').onclick = e => { e.stopPropagation(); if (document.activeElement) document.activeElement.blur(); back(true); };
$('#ovBot').addEventListener('click', () => showOv()); $('#ovTop').addEventListener('click', () => showOv());
$('#cList b').textContent = t('More channels'); $('#cList small').textContent = S.set.tv ? t('Press ◀ on the remote') : t('Tap or swipe up'); $('#cList').onclick = () => isTouch() ? openStrip() : openPanel();
document.body.appendChild($('#num')); $('#slot').appendChild(screenEl);

/* ---------- remote / keyboard ---------- */
function scrollerOf(el) { for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) { if (x.scrollHeight > x.clientHeight + 2) { const o = getComputedStyle(x).overflowY; if (o === 'auto' || o === 'scroll') return x; } } return null; }
function spatial(k, scope) {
  const cur = document.activeElement, els = $$('button, [tabindex="0"], input, select', scope || document).filter(el => { if (el.disabled || el.closest('[hidden]')) return false; if (!scope && dlg.contains(el)) return false; if (fsOn ? !screenEl.contains(el) : screenEl.contains(el) && el.id !== 'pExpand') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  if (!cur || cur === document.body || !els.includes(cur)) { const vis = el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight; }; const f = (!scope && !fsOn && els.find(el => el.closest('.view') && vis(el))) || els.find(vis) || els[0]; if (f) { f.focus(); return true; } return false; }
  const a = cur.getBoundingClientRect(); let best = null, bs = 1e9, bestIn = null, bsIn = 1e9; const box = scrollerOf(cur);
  for (const el of els) { if (el === cur) continue; const b = el.getBoundingClientRect(); let main, cross;
    // cross = gap between the boxes sideways (0 when they line up, so a wide field under a small tab is the obvious next stop); centre distance only breaks ties
    const gapX = Math.max(0, b.left - a.right, a.left - b.right), gapY = Math.max(0, b.top - a.bottom, a.top - b.bottom), cx = Math.abs((b.left + b.right) / 2 - (a.left + a.right) / 2) * .05, cy = Math.abs((b.top + b.bottom) / 2 - (a.top + a.bottom) / 2) * .05;
    if (k === 'ArrowRight') { if (b.left < a.right - 4) continue; main = b.left - a.right; cross = gapY * 4 + cy; }
    else if (k === 'ArrowLeft') { if (b.right > a.left + 4) continue; main = a.left - b.right; cross = gapY * 4 + cy; }
    else if (k === 'ArrowDown') { if (b.top < a.bottom - 4) continue; main = b.top - a.bottom; cross = gapX * 4 + cx; }
    else { if (b.bottom > a.top + 4) continue; main = a.top - b.bottom; cross = gapX * 4 + cx; }
    const sc = main + cross; if (sc < bs) { bs = sc; best = el; } if (box && sc < bsIn && box.contains(el)) { bsIn = sc; bestIn = el; } }
  // things further down a scrolling area (settings, lists) come before the fixed buttons under it, e.g. Close
  if (bestIn) best = bestIn;
  if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return true; } return false;
}
document.addEventListener('keydown', e => {
  const k = e.key; if (e.defaultPrevented) return;
  if (dlg.open) { if (k.startsWith('Arrow') && !/input|textarea|select/i.test(e.target.tagName)) { if (spatial(k, dlg)) e.preventDefault(); } return; }
  if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack') { e.preventDefault(); if (numBuf) { numBuf = ''; $('#num').hidden = true; return; } back(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return; const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') { if (k === 'ArrowDown' && e.target.id === 'q') { e.preventDefault(); e.target.blur(); spatial(k); } return; }
  if (/^[0-9]$/.test(k)) { e.preventDefault(); numKey(k); return; }
  if (k === 'Enter' && numBuf) { e.preventDefault(); commitNum(); return; }
  if (k === 'ChannelUp' || k === 'PageUp') { e.preventDefault(); zap(1); return; }
  if (k === 'ChannelDown' || k === 'PageDown') { e.preventDefault(); zap(-1); return; }
  const lk = k.toLowerCase();
  if (fsOn) {
    const inPanel = !$('#chPanel').hidden, inStrip = !$('#chStrip').hidden, inOv = screenEl.classList.contains('show') && $('#ov').contains(document.activeElement);
    if (k === 'Backspace') { e.preventDefault(); back(); return; }
    if (inPanel) { if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); cpShift(k === 'ArrowLeft' ? -1 : 1); return; } if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); spatial(k, $('#cpList')); cpBump(); return; } }
    else if (inStrip) { if (k.startsWith('Arrow')) { e.preventDefault(); spatial(k, $('#chStrip')); return; } }
    else if (inOv) { showOv(); if (k.startsWith('Arrow')) { e.preventDefault(); spatial(k, $('#ov')); return; } if (k === 'Enter') return; }
    else if (isVodNow()) {
      if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); seekBy(k === 'ArrowLeft' ? -10 : 10); showOv(); return; }
      if (k === ' ' || k === 'MediaPlayPause') { e.preventDefault(); togglePlay(); showOv(); return; }
      if (k === 'Enter' || k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); showOv(); $('#cPlay').focus(); return; }
    } else {
      if (k === 'ArrowUp') { e.preventDefault(); zap(1); return; } if (k === 'ArrowDown') { e.preventDefault(); zap(-1); return; }
      if (k === 'ArrowLeft') { e.preventDefault(); openPanel(); return; }
      if (k === 'Enter' || k === 'ArrowRight') { e.preventDefault(); showOv(); $('#cPlay').focus(); return; }
    }
  } else if (k.startsWith('Arrow')) { if (spatial(k)) e.preventDefault(); return; }
  else if (k === 'Backspace') { e.preventDefault(); back(); return; }
  if (lk === 'f') toggleFav(S.cur); else if (lk === 'l') lastChannel(); else if (lk === 'm') $('#cMute').click(); else if (lk === 'r') toggleRec(); else if (lk === 'z') { fsOn ? back() : enterFs(); } else if (lk === 'i' && S.cur) showOsd(S.cur);
});

/* ---------- app updates (Android app only; the web version updates by itself) ---------- */
const BUILD = +(window.AP_BUILD || 0);
function openExternal(url) {
  const P = window.Capacitor && Capacitor.Plugins;
  if (NATIVE && P && P.Browser) { P.Browser.open({ url }).catch(() => { location.href = url; }); return; }
  if (NATIVE && P && P.AppLauncher) { P.AppLauncher.openUrl({ url }).catch(() => { location.href = url; }); return; }
  const w = window.open(url, '_blank'); if (!w) location.href = url;
}
async function checkUpdate(manual) {
  if (!NATIVE) { if (manual) toast(t('The web version is always up to date')); return; }
  if (!manual && Date.now() - LS.get('ap.updT', 0) < 6 * 3600e3) return; LS.set('ap.updT', Date.now());
  try {
    const r = await fetch('https://api.github.com/repos/JoaoAntunesss/AntunesPlayer/releases/tags/latest', { cache: 'no-store', headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AntunesPlayer-App' } }); if (r.status === 404) { if (manual) toast(t('A new version is being prepared. Try again in a few minutes.')); return; } if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(), n = +((/build\s+(\d+)/i.exec(d.name || '') || [])[1] || 0), a = (d.assets || []).find(x => /\.apk$/i.test(x.name));
    if (!a || !n || n <= BUILD) { if (manual) toast(t('You have the latest version') + (BUILD ? ' · build ' + BUILD : '')); return; }
    openDlg(`<h2>${ic('refresh')} ${t('New version available')}</h2><p>${t('Build')} ${n} · ${t('you have')} ${BUILD || '—'}</p><p class="mut">${t('The download opens in the browser. Then open the file to install it over this version; your lists and favourites stay.')}</p><div class="row"><button class="btn" id="dx">${t('Later')}</button><button class="btn p" id="uGo">${ic('plus')} ${t('Download')}</button></div>`);
    $('#dx').onclick = () => dlg.close(); $('#uGo').onclick = () => { dlg.close(); openExternal(a.browser_download_url); };
  } catch (e) { if (manual) toast(t('Could not check for updates') + ': ' + e.message); }
}

/* ---------- extras found in other IPTV players: sleep timer, reminders, stream info, external player, guide offset, subtitles size, User-Agent ---------- */
Object.assign(IC, {
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  ext: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13"/><path d="M17.5 13.5v5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V8A1.5 1.5 0 0 1 6 6.5h5"/>',
  signal: '<path d="M5 19v-3M9.5 19v-6M14 19v-9M18.5 19V6"/>'
});
Object.assign(PT, { 'Sleep timer': 'Temporizador', 'Sleep timer off': 'Temporizador desligado', 'min': 'min', 'Off ': 'Desligado', 'Playback stops in 30 s': 'A reprodução para daqui a 30 s', 'Keep watching': 'Continuar a ver', 'Stopped by the sleep timer': 'Parado pelo temporizador', 'Remind me': 'Lembrar-me', 'Cancel reminder': 'Cancelar lembrete', 'Reminder set': 'Lembrete guardado', 'Starting now': 'Vai começar', 'Watch now': 'Ver agora', 'Dismiss': 'Ignorar', 'Watch channel now': 'Ver o canal agora', 'Reminders': 'Lembretes', 'Stream info': 'Info do sinal', 'Resolution': 'Resolução', 'Engine': 'Leitor', 'Bitrate': 'Débito', 'Connection': 'Ligação', 'Buffer': 'Buffer', 'Dropped frames': 'Imagens perdidas', 'Quality': 'Qualidade', 'Auto': 'Auto', 'Open in another player': 'Abrir noutro leitor', 'Copy link': 'Copiar link', 'Link copied': 'Link copiado', 'No other video player installed': 'Não há outro leitor de vídeo instalado', 'Guide time offset (hours)': 'Acerto de horas do guia (horas)', 'Subtitle size': 'Tamanho das legendas', 'Update playlists automatically (daily)': 'Atualizar listas automaticamente (todos os dias)', 'User-Agent (optional, some providers need it)': 'User-Agent (opcional, alguns fornecedores pedem)', 'Edit': 'Editar', 'Edit playlist': 'Editar lista', 'Saved': 'Guardado', 'Name': 'Nome', 'TV guide link (XMLTV, optional)': 'Link do guia de TV (XMLTV, opcional)', 'Playlist updated': 'Lista atualizada', 'Channel list over the video': 'Lista de canais sobre o vídeo', 'See-through': 'Transparente', 'Dark': 'Escura' });

/* sleep timer */
let sleepT = 0, sleepAt = 0, sleepWarnT = 0;
function setSleep(min) {
  clearTimeout(sleepT); clearTimeout(sleepWarnT); sleepAt = 0;
  if (!min) { toast(t('Sleep timer off')); return; }
  sleepAt = Date.now() + min * 60000; toast(t('Sleep timer') + ': ' + min + ' ' + t('min'));
  sleepWarnT = setTimeout(() => {
    openDlg(`<h2>${ic('moon')} ${t('Sleep timer')}</h2><p>${t('Playback stops in 30 s')}</p><div class="row"><button class="btn p" id="slK">${t('Keep watching')}</button></div>`);
    $('#slK').onclick = () => { dlg.close(); setSleep(30); };
  }, Math.max(0, min * 60000 - 30000));
  sleepT = setTimeout(() => { sleepAt = 0; if (dlg.open) dlg.close(); stopPlayback(); if (fsOn) back(); toast(t('Stopped by the sleep timer')); }, min * 60000);
}
const sleepLeft = () => sleepAt ? Math.max(1, Math.round((sleepAt - Date.now()) / 60000)) : 0;

/* programme reminders (while the app is open) */
const REM = LS.get('ap.rem', []).filter(r => r.s > Date.now() - 600e3);
const saveRem = () => LS.set('ap.rem', REM);
const remIdx = (c, p) => REM.findIndex(r => r.k === c.key && r.s === p.s);
function progDialog(c, p) {
  const has = remIdx(c, p) > -1, d = new Date(p.s);
  openDlg(`<h2>${ic('bell')} ${esc(p.t)}</h2><p class="mut">${esc(c.name)} · ${d.toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'short' })} ${hm(p.s)} – ${hm(p.e)}</p>${p.d ? `<p>${esc(p.d)}</p>` : ''}<div class="row"><button class="btn" id="pgW">${ic('play')} ${t('Watch channel now')}</button><button class="btn p" id="pgR">${ic('bell')} ${has ? t('Cancel reminder') : t('Remind me')}</button></div>`);
  $('#pgW').onclick = () => { dlg.close(); if (S.view === 'browse' && S.mode === 'live') play(c); else { go('live'); setTimeout(() => play(c), 30); } };
  $('#pgR').onclick = () => { const i = remIdx(c, p); if (i > -1) REM.splice(i, 1); else { REM.push({ k: c.key, s: p.s, t: p.t, n: c.name }); toast(t('Reminder set') + ' · ' + hm(p.s)); } saveRem(); dlg.close(); };
}
function checkReminders() {
  const n = Date.now(); const due = REM.filter(r => !r.done && r.s - n <= 60e3 && r.s - n > -600e3); if (!due.length || dlg.open) return;
  const r = due[0]; r.done = true; saveRem(); const c = S.byKey[r.k];
  openDlg(`<h2>${ic('bell')} ${t('Starting now')}</h2><p><b>${esc(r.t)}</b><br><span class="mut">${esc(r.n)} · ${hm(r.s)}</span></p><div class="row"><button class="btn" id="dx">${t('Dismiss')}</button>${c ? `<button class="btn p" id="rmW">${ic('play')} ${t('Watch now')}</button>` : ''}</div>`);
  $('#dx').onclick = () => dlg.close(); const w = $('#rmW'); if (w) w.onclick = () => { dlg.close(); if (S.view === 'browse' && S.mode === 'live') play(c); else { go('live'); setTimeout(() => { play(c); enterFs(); }, 30); } };
  setTimeout(() => { for (let i = REM.length - 1; i >= 0; i--) if (REM[i].done && REM[i].s < Date.now() - 600e3) REM.splice(i, 1); saveRem(); }, 1000);
}
setInterval(checkReminders, 15000);

/* stream info */
let infoT = 0;
function streamInfo() {
  const row = (k, val) => `<dt>${t(k)}</dt><dd>${val}</dd>`;
  const draw = () => {
    if (!dlg.open || !$('#siBox', dlg)) { clearInterval(infoT); return; }
    const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null, lv = hls && hls.levels && hls.levels[hls.currentLevel];
    let buf = 0; try { for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime) buf = v.buffered.end(i) - v.currentTime; } catch (e) { }
    $('#siBox', dlg).innerHTML = row('Resolution', v.videoWidth ? `${v.videoWidth}×${v.videoHeight}` : '—') + row('Engine', hls ? 'hls.js' : mpg ? 'mpegts.js' : 'HTML5') + (lv && lv.bitrate ? row('Bitrate', (lv.bitrate / 1e6).toFixed(1) + ' Mbps' + (lv.videoCodec ? ' · ' + esc(lv.videoCodec.split('.')[0]) : '')) : '') + (hls && hls.bandwidthEstimate ? row('Connection', (hls.bandwidthEstimate / 1e6).toFixed(1) + ' Mbps') : '') + row('Buffer', buf.toFixed(1) + ' s') + (q ? row('Dropped frames', q.droppedVideoFrames + ' / ' + q.totalVideoFrames) : '');
  };
  const levels = hls && hls.levels && hls.levels.length > 1 ? hls.levels : null;
  openDlg(`<h2>${ic('signal')} ${t('Stream info')}</h2><p class="mut">${esc(S.cur ? S.cur.name : '')}</p><dl class="sinfo" id="siBox"></dl>${levels ? `<label>${t('Quality')}</label><div class="tabs"><button data-lv="-1" class="${hls.autoLevelEnabled ? 'on' : ''}">${t('Auto')}</button>${levels.map((l, i) => `<button data-lv="${i}" class="${!hls.autoLevelEnabled && hls.currentLevel === i ? 'on' : ''}">${l.height ? l.height + 'p' : Math.round(l.bitrate / 1000) + 'k'}</button>`).join('')}</div>` : ''}<div class="row"><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close();
  $$('[data-lv]', dlg).forEach(b => b.onclick = () => { hls.currentLevel = +b.dataset.lv; $$('[data-lv]', dlg).forEach(x => x.classList.toggle('on', x === b)); });
  draw(); clearInterval(infoT); infoT = setInterval(draw, 1000);
}

/* open the current stream in another app (VLC, MX Player, Just Player…) */
async function openElsewhere() {
  const c = S.cur; if (!c) return; const url = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url, P = window.Capacitor && Capacitor.Plugins;
  if (NATIVE && P && P.ExtPlayer) { try { await P.ExtPlayer.open({ url, title: c.name || '' }); v.pause(); } catch (e) { toast(t('No other video player installed')); } return; }
  try { await navigator.clipboard.writeText(url); toast(t('Link copied')); } catch (e) { prompt(t('Copy link'), url); }
}

/* guide offset, subtitle size */
function shiftEpg(data) { const h = +S.set.epgOff || 0; if (!h) return data; const o = {}, d = h * 3600e3; Object.keys(data).forEach(k => { o[k] = data[k].map(p => ({ s: p.s + d, e: p.e + d, t: p.t, d: p.d })); }); return o; }
function applySubs() { let st = $('#subStyle'); if (!st) { st = document.createElement('style'); st.id = 'subStyle'; document.head.appendChild(st); } const z = +S.set.subSize || 100; st.textContent = `#v::cue{font-size:${z}%;background:rgba(0,0,0,.6)}`; }
applySubs();

/* per-playlist User-Agent (Android app; browsers do not allow changing it) */
const srcUA = () => { const s = curSrc(); return s && s.ua ? s.ua : ''; };
function editSourceDialog(id) {
  const s = S.sources.find(x => x.id === id); if (!s) return;
  openDlg(`<h2>${ic('edit')} ${t('Edit playlist')}</h2><label>${t('Name')}</label><input id="eN" value="${esc(s.name)}"><label>${t('TV guide link (XMLTV, optional)')}</label><input id="eE" type="url" value="${esc(s.epg || '')}"><label>${t('User-Agent (optional, some providers need it)')}</label><input id="eU" value="${esc(s.ua || '')}" placeholder="VLC/3.0.20 LibVLC/3.0.20" autocomplete="off"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="eOk">${t('Save')}</button></div>`);
  $('#dx').onclick = listsDialog;
  $('#eOk').onclick = () => { s.name = $('#eN').value.trim() || s.name; s.epg = $('#eE').value.trim(); s.ua = $('#eU').value.trim(); LS.set('ap.sources', S.sources); toast(t('Saved')); listsDialog(); if (s.id === S.srcId) selectSource(s.id, true); };
}

/* ---------- online subtitles (OpenSubtitles.com): search by film/episode, pick a language, switch on by itself ---------- */
Object.assign(PT, { 'Online subtitles': 'Legendas online', 'Search online': 'Procurar online', 'Searching subtitles…': 'A procurar legendas…', 'No subtitles found online': 'Não foram encontradas legendas online', 'Subtitles': 'Legendas', 'Subtitle languages (in order)': 'Idiomas das legendas (por ordem)', 'Turn on subtitles automatically': 'Ligar legendas automaticamente', 'OpenSubtitles API key': 'Chave da API do OpenSubtitles', 'OpenSubtitles account (optional: 20 a day instead of 5)': 'Conta OpenSubtitles (opcional: 20 por dia em vez de 5)', 'Username': 'Utilizador', 'Password': 'Palavra-passe', 'Daily download limit reached': 'Limite diário de downloads atingido', 'Add the OpenSubtitles key in Settings': 'Põe a chave do OpenSubtitles nas Definições', 'Could not get subtitles': 'Não foi possível obter as legendas', 'left today': 'restantes hoje', 'downloads': 'downloads', 'Built in (optional: your own key)': 'Já incluída (opcional: a tua chave)' });
const SUBL = [['pt-pt', 'Português (PT)'], ['pt-br', 'Português (BR)'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['it', 'Italiano'], ['de', 'Deutsch'], ['nl', 'Nederlands'], ['ro', 'Română'], ['pl', 'Polski'], ['tr', 'Türkçe'], ['ar', 'العربية']];
const subLangs = () => (S.set.subLangs || (LANG === 'pt' ? 'pt-pt,pt-br,en' : 'en')).split(',').filter(Boolean);
const OS_APP_KEY = 'PK4BCOwRA0rHjsuJ9VKLY0OaTMZMx0oJ'; // AntunesPlayer's OpenSubtitles consumer (identifies the app, not a password)
const OSK = () => (S.set.osKey || '').trim() || OS_APP_KEY;
let osBase = 'https://api.opensubtitles.com/api/v1';
async function osFetch(path, opt) {
  const tok = LS.get('ap.ost', null), h = { 'Api-Key': OSK(), 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'AntunesPlayer v1.0', 'X-User-Agent': 'AntunesPlayer v1.0' };
  if (tok && tok.exp > Date.now()) { h.Authorization = 'Bearer ' + tok.t; if (tok.b) osBase = 'https://' + tok.b + '/api/v1'; }
  const r = await fetch(osBase + path, Object.assign({ headers: h }, opt || {})); const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || j.errors && j.errors[0] || 'HTTP ' + r.status); e.status = r.status; e.j = j; throw e; } return j;
}
async function osLogin() {
  const a = LS.get('ap.osu', null); if (!a || !a.u || !a.p) return; const tok = LS.get('ap.ost', null); if (tok && tok.exp > Date.now()) return;
  try { const j = await osFetch('/login', { method: 'POST', body: JSON.stringify({ username: a.u, password: a.p }) }); LS.set('ap.ost', { t: j.token, b: j.base_url, exp: Date.now() + 20 * 3600e3 }); } catch (e) { }
}
const cleanTitle = n => String(n || '').replace(/\s*·\s*S\d+E\d+.*$/, '').replace(/^[A-Z]{2,3}\s*[:|\-]\s*/, '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\b(19|20)\d\d\b/g, ' ').replace(/\b(4k|uhd|fhd|hd|sd|multi|legendado|dublado|pt|vo)\b/gi, ' ').replace(/\s+/g, ' ').trim();
async function subsTarget(c) {
  // what to search for: TMDB id when the provider gives it, otherwise the title (+ year)
  const o = { name: cleanTitle(c.name), year: '', tmdb: '', sn: 0, ep: 0, type: 'movie' };
  if (c.ser) { const s = S.byKey[c.ser]; o.name = cleanTitle(s ? s.name : c.name); o.sn = +c.sn || 0; o.ep = +(/E(\d+)/.exec(c.name) || [])[1] || 0; o.type = 'episode'; const i = S.detail && S.detail.key === c.ser ? S.dinfo || {} : {}; o.tmdb = i.tmdb || i.tmdb_id || ''; o.year = (i.releaseDate || i.releasedate || '').slice(0, 4); return o; }
  let i = S.detail === c ? S.dinfo || {} : null;
  if (!i && c.vodId) { try { const x = xbase(); const d = await fetchJson(`${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=get_vod_info&vod_id=${x.q(c.vodId)}`); i = d.info || {}; } catch (e) { i = {}; } }
  i = i || {}; o.tmdb = i.tmdb_id || i.tmdb || ''; o.year = (i.releasedate || i.release_date || '').slice(0, 4) || ((/\b(19|20)\d\d\b/.exec(c.name) || [])[0] || ''); return o;
}
async function subsSearch(c) {
  const o = await subsTarget(c), L = subLangs(), q = new URLSearchParams({ languages: L.join(','), order_by: 'download_count' });
  if (o.type === 'episode') { if (o.tmdb) q.set('parent_tmdb_id', o.tmdb); else q.set('query', o.name); if (o.sn) q.set('season_number', o.sn); if (o.ep) q.set('episode_number', o.ep); q.set('type', 'episode'); }
  else { if (o.tmdb) q.set('tmdb_id', o.tmdb); else { q.set('query', o.name); if (o.year) q.set('year', o.year); } q.set('type', 'movie'); }
  const j = await osFetch('/subtitles?' + q.toString()), rank = l => { const i = L.indexOf(String(l).toLowerCase()); return i < 0 ? 99 : i; };
  return (j.data || []).map(d => { const a = d.attributes || {}, f = (a.files || [])[0] || {}; return { id: f.file_id, lang: String(a.language || '').toLowerCase(), rel: a.release || f.file_name || '', dl: a.download_count || 0, hi: !!a.hearing_impaired }; })
    .filter(x => x.id).sort((a, b) => rank(a.lang) - rank(b.lang) || (a.hi - b.hi) || b.dl - a.dl).slice(0, 30);
}
const langName = l => (SUBL.find(x => x[0] === l) || [0, l.toUpperCase()])[1];
async function subsLoad(r, c) {
  let vtt = await idbGet('sub:' + r.id);
  if (!vtt) {
    await osLogin(); const j = await osFetch('/download', { method: 'POST', body: JSON.stringify({ file_id: r.id, sub_format: 'webvtt' }) });
    const tx = await (await fetch(j.link)).text(); vtt = /^\uFEFF?WEBVTT/.test(tx) ? tx : 'WEBVTT\n\n' + tx.replace(/\r/g, '').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
    idbSet('sub:' + r.id, vtt); if (j.remaining != null) S.subLeft = j.remaining;
  }
  if (S.cur !== c) return false;
  $$('#v track[data-os]').forEach(x => x.remove());
  const tr = document.createElement('track'); tr.kind = 'subtitles'; tr.label = langName(r.lang) + ' · online'; tr.srclang = r.lang.slice(0, 2); tr.dataset.os = r.id; tr.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })); v.appendChild(tr);
  const show = () => [...v.textTracks].forEach(x => { x.mode = x.label === tr.label ? 'showing' : 'disabled'; }); show(); tr.addEventListener('load', show); setTimeout(show, 300);
  return true;
}
function subsErr(e) { if (e && (e.status === 406 || /limit|quota/i.test(e.message || ''))) toast(t('Daily download limit reached')); else toast(t('Could not get subtitles') + (e && e.message ? ': ' + e.message : '')); }
async function autoSubs(c) {
  if (!c || c.kind === 'live' || c.kind === 'catchup' || S.set.subAuto === false || !OSK()) return;
  try { const list = await subsSearch(c); if (S.cur !== c) return; S.subList = { k: c.key, list }; if (!list.length) return; const ok = await subsLoad(list[0], c); if (ok) toast(t('Subtitles') + ': ' + langName(list[0].lang)); } catch (e) { if (S.cur === c) subsErr(e); }
}
function onlineSubsHtml(c) {
  if (!c || c.kind === 'live') return '';
  const L = S.subList && S.subList.k === c.key ? S.subList.list : null;
  return `<label>${t('Online subtitles')}${S.subLeft != null ? ` <small class="mut">· ${S.subLeft} ${t('left today')}</small>` : ''}</label>` + (L ? (L.length ? `<div class="catlist">${L.map((r, i) => `<button data-os="${i}"><span>${esc(langName(r.lang))}${r.hi ? ' · CC' : ''} <small class="mut">${esc(r.rel).slice(0, 60)} · ${r.dl} ${t('downloads')}</small></span></button>`).join('')}</div>` : `<p class="mut">${t('No subtitles found online')}</p>`) : `<div class="row" style="justify-content:flex-start"><button class="btn" id="osGo">${ic('search')} ${t('Search online')}</button></div>`);
}
function wireOnlineSubs(c, reopen) {
  const g = $('#osGo', dlg); if (g) g.onclick = async () => { if (!OSK()) { toast(t('Add the OpenSubtitles key in Settings')); return; } g.disabled = true; g.textContent = t('Searching subtitles…'); try { S.subList = { k: c.key, list: await subsSearch(c) }; } catch (e) { subsErr(e); } reopen(); };
  $$('[data-os]', dlg).forEach(b => b.onclick = async () => { const r = S.subList.list[+b.dataset.os]; dlg.close(); try { if (await subsLoad(r, c)) toast(t('Subtitles') + ': ' + langName(r.lang)); } catch (e) { subsErr(e); } });
}

/* ---------- AntunesFlix: films and series together, organised like Netflix ---------- */
Object.assign(PT, { 'My list': 'A minha lista', 'Top 10 today': 'Top 10 de hoje', 'New on AntunesFlix': 'Novidades no AntunesFlix', 'Top rated films': 'Filmes mais bem avaliados', 'Top rated series': 'Séries mais bem avaliadas', 'Your list is empty. Add films and series with the star.': 'A tua lista está vazia. Junta filmes e séries com a estrela.', 'Next episode in': 'Próximo episódio em', 'Watch credits': 'Ver créditos', 'films': 'filmes', 'Play': 'Ver', 'More info': 'Mais informação' });
S.flixTab = 'all';
let flixHeroT = 0;
const FLIX_KINDS = { all: ['vod', 'series'], series: ['series'], movies: ['vod'] };
function contFor(kinds) { return contList().filter(c => kinds.includes(c.kind) || (kinds.includes('series') && (c.ser || c.cont))); }
function top10Html(list) { return `<section class="hrow vrow top10"><div class="rh"><h3>${t('Top 10 today')}</h3></div><div class="rail">${list.map((c, i) => `<div class="t10" ><span class="t10n">${i + 1}</span>${posterHtml(c)}</div>`).join('')}</div></section>`; }
const groupBy = (arr, f) => { const m = new Map(); for (const c of arr) { const k = f(c); let a = m.get(k); if (!a) m.set(k, a = []); a.push(c); } return m; };
let lazyRest = [], lazyHtml = null, lazyIO = null;
function lazyRows(box) {
  if (lazyIO) lazyIO.disconnect(); const sent = $('#fxMore', box); if (!sent) return;
  const more = () => { const div = document.createElement('div'); div.innerHTML = lazyRest.splice(0, 8).map(lazyHtml).join(''); sent.before(div); wireItems(div); wireSeeAll(div); if (!lazyRest.length) { lazyIO.disconnect(); sent.remove(); } };
  if (!('IntersectionObserver' in window)) { while (lazyRest.length) more(); return; }
  const sc = /(auto|scroll)/.test(getComputedStyle(box).overflowY) ? box : null; lazyIO = new IntersectionObserver(es => { if (es[0].isIntersecting) more(); }, { root: sc, rootMargin: '900px 0px' }); lazyIO.observe(sent);
}
function wireSeeAll(root) {
  $$('.seeall', root).forEach(b => b.onclick = () => { const m = b.dataset.m; go(m === 'vod' ? 'movies' : 'series'); setTimeout(() => { if (b.dataset.g) { S.group = b.dataset.g; S.gsel[S.mode] = S.group; } else if (b.dataset.sort) { S.sort[S.mode] = b.dataset.sort === 'top' ? 'rate' : 'new'; S.group = GDEF[S.mode] + '!'; } S.shown = 250; renderBrowse(); $('#list').scrollTop = 0; }, 0); });
}
// "Because you watched X": more from the same genre as the last thing watched, best rated first, nothing already seen
function becauseRow(kinds, all) {
  const last = contFor(kinds)[0]; if (!last) return null;
  const base = (last.ser && S.byKey[last.ser]) || last; if (!base.group) return null;
  const list = all.filter(c => c.kind === base.kind && c.group === base.group && c.key !== base.key && c.logo && !SEEN[c.key] && !POS[c.key]).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 24);
  return list.length >= 4 ? [t('Because you watched') + ' ' + base.name, list] : null;
}
// "Surprise me": a random well-rated title you have not seen yet; opens its page
function surprise(pool) {
  const fresh = pool.filter(c => !SEEN[c.key] && !POS[c.key]), good = fresh.filter(c => c.rating >= 6.5), from = good.length >= 10 ? good : fresh.length ? fresh : pool;
  const c = from[Math.floor(Math.random() * from.length)]; if (c) openDetail(c);
}
Object.assign(PT, { 'Surprise me': 'Surpreende-me', 'Because you watched': 'Porque viste' });
function renderFlix() {
  const box = $('#vFlix'), tab = S.flixTab, kinds = FLIX_KINDS[tab] || FLIX_KINDS.all;
  const all = S.vis.filter(c => kinds.includes(c.kind)), withArt = all.filter(c => c.logo);
  const byRating = withArt.filter(c => c.rating > 0).sort((a, b) => b.rating - a.rating), recent = all.slice().sort((a, b) => (b.added || 0) - (a.added || 0));
  // the hero mixes what is new and what is best rated, like the Netflix billboard
  const pool = recent.filter(c => c.logo).slice(0, 30).filter(c => c.rating >= 6).concat(byRating.slice(0, 20)); const seen = {}, top = pool.filter(c => !seen[c.key] && (seen[c.key] = 1)).slice(0, 8);
  const tabs = [['all', 'Home'], ['series', 'Series'], ['movies', 'Movies'], ['mylist', 'My list']];
  let body = '';
  if (tab === 'mylist') {
    const mine = favList().filter(c => c.kind === 'vod' || c.kind === 'series');
    body = mine.length ? `<div class="fxgrid">${mine.map(posterHtml).join('')}</div>` : `<div class="empty"><p>${t('Your list is empty. Add films and series with the star.')}</p></div>`;
  } else {
    const cw = contFor(kinds), rows = [[t('My list'), favList().filter(c => kinds.includes(c.kind))]];
    const t10 = byRating.slice(0, 10);
    const byw = becauseRow(kinds, all); if (byw) rows.push(byw);
    const rest = [[t('New on AntunesFlix'), recent.slice(0, 24), { sort: 'new', m: kinds.length > 1 ? 'vod' : kinds[0] }]];
    if (kinds.includes('vod')) rest.push([t('Top rated films'), withArt.filter(c => c.kind === 'vod' && c.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 24), { m: 'vod', sort: 'top' }]);
    if (kinds.includes('series')) rest.push([t('Top rated series'), withArt.filter(c => c.kind === 'series' && c.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 24), { m: 'series', sort: 'top' }]);
    // genres / categories from both, taking turns
    const cv = kinds.includes('vod') ? catItems('vod').filter(x => x.id.indexOf('v:') === 0 && x.icon !== 'lock').map(g => ['vod', g]) : [], cs = kinds.includes('series') ? catItems('series').filter(x => x.id.indexOf('s:') === 0 && x.icon !== 'lock').map(g => ['series', g]) : [];
    const cats = []; for (let i = 0; i < Math.max(cv.length, cs.length) && cats.length < 120; i++) { if (cv[i]) cats.push(cv[i]); if (cs[i]) cats.push(cs[i]); }
    const byG = groupBy(all, c => c.kind + '|' + (c.group || '—'));
    cats.forEach(([m, g]) => rest.push([g.label, (byG.get(m + '|' + g.id.slice(2)) || []).slice(0, 24), { m, g: g.id }, g.n]));
    const rowHtmlF = r => `<section class="hrow vrow"><div class="rh"><h3>${esc(r[0])}${r[3] ? ` <small>${fmtN(r[3])}</small>` : ''}</h3>${r[2] ? `<button class="seeall" data-m="${r[2].m}" ${r[2].g ? `data-g="${esc(r[2].g)}"` : ''} ${r[2].sort ? `data-sort="${r[2].sort}"` : ''}>${t('See all')}</button>` : ''}</div><div class="rail">${r[1].map(posterHtml).join('')}</div></section>`;
    body = (cw.length ? `<section class="hrow vrow cwrow"><div class="rh"><h3>${t('Continue watching')}</h3></div><div class="rail">${cw.map(cwHtml).join('')}</div></section>` : '') + rows.filter(r => r[1].length).map(rowHtmlF).join('') + (t10.length >= 5 ? top10Html(t10) : '');
    // only the first rows go in now; the others are added as you scroll (a big catalogue has 100+ genre rows)
    lazyRest = rest.filter(r => r[1].length); lazyHtml = rowHtmlF; body += lazyRest.splice(0, 8).map(rowHtmlF).join('') + (lazyRest.length ? '<div class="fxmore" id="fxMore"></div>' : '');
  }
  box.innerHTML = `<div class="fxbar"><button class="fxlogo" data-ft="all">Antunes<span>Flix</span></button><span class="gap"></span>${tab !== 'mylist' && withArt.length ? `<button class="btn fxsurp" id="fxR" aria-label="${t('Surprise me')}">${ic('shuffle')} <span>${t('Surprise me')}</span></button>` : ''}<button class="ib fxic" id="fxS" aria-label="${t('Search')}">${ic('search')}</button><button class="ib fxic" id="fxH" aria-label="${t('Home')}">${ic('home')}</button></div><nav class="fxtabs">${tabs.filter(x => x[0] !== 'all').map(x => `<button data-ft="${x[0]}" class="${tab === x[0] ? 'on' : ''}">${t(x[1])}</button>`).join('')}${tab !== 'all' ? `<button data-ft="all" class="fxx" aria-label="${t('Close')}">✕</button>` : ''}</nav>` +
    (tab !== 'mylist' && top.length ? `<div class="hero fxhero" id="fxhero">${top.map((c, i) => `<div class="hs ${i ? '' : 'on'}" data-k="${c.key}"><div class="hbg" style="background-image:url('${esc(c.logo).replace(/'/g, '%27')}')"></div><div class="hpo"><img src="${esc(c.logo)}" alt="" onerror="this.remove()"></div><div class="hi"><small class="fxkind">${c.kind === 'series' ? t('Series') : t('Movies').replace(/s$/, '')}</small><h3>${esc(c.name)}</h3><div class="chips">${c.rating ? `<span>★ ${c.rating.toFixed(1)}</span>` : ''}<span>${esc(c.group || '')}</span></div><div class="hacts"><button class="btn p" data-hp="${c.key}">${ic('play')} ${c.kind === 'series' ? t('Watch series') : t('Play')}</button><button class="btn" data-hl="${c.key}">${ic(S.favs.includes(c.key) ? 'check' : 'plus')} ${t('My list')}</button></div></div></div>`).join('')}<div class="hdots">${top.map((c, i) => `<button data-hi="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"></button>`).join('')}</div></div>` : '') + body;
  wireItems(box); wireCw(box); $('#fxS', box).onclick = () => { S.q = ''; $('#q').value = ''; go('search'); };
  const fr = $('#fxR', box); if (fr) fr.onclick = () => surprise(withArt);
  lazyRows(box); $('#fxH', box).onclick = () => go('home');
  $$('[data-ft]', box).forEach(b => b.onclick = () => { S.flixTab = b.dataset.ft; renderFlix(); box.scrollTop = 0; if (S.set.tv) setTimeout(() => { const f = $(`[data-ft="${S.flixTab}"]`, box); if (f) f.focus(); }, 20); });
  wireSeeAll(box);
  const slides = $$('.hs', box), dots = $$('.hdots button', box); let hi = 0; clearInterval(flixHeroT);
  const show = n => { hi = (n + slides.length) % slides.length; slides.forEach((x, i) => x.classList.toggle('on', i === hi)); dots.forEach((x, i) => x.classList.toggle('on', i === hi)); };
  dots.forEach(d => d.onclick = () => { show(+d.dataset.hi); clearInterval(flixHeroT); });
  $$('[data-hp]', box).forEach(b => b.onclick = e => { e.stopPropagation(); const c = S.byKey[b.dataset.hp]; if (c.seriesId) { S.autoResume = true; openDetail(c); } else enterFsFor(c); });
  $$('[data-hd]', box).forEach(b => b.onclick = e => { e.stopPropagation(); openDetail(S.byKey[b.dataset.hd]); });
  $$('[data-hl]', box).forEach(b => b.onclick = e => { e.stopPropagation(); const c = S.byKey[b.dataset.hl]; toggleFav(c); b.innerHTML = `${ic(S.favs.includes(c.key) ? 'check' : 'plus')} ${t('My list')}`; });
  slides.forEach(x => { x.onclick = () => openDetail(S.byKey[x.dataset.k]); x.addEventListener('focusin', () => clearInterval(flixHeroT)); });
  let sx = null; const hero = $('#fxhero', box); if (hero) { hero.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true }); hero.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) { show(hi + (dx < 0 ? 1 : -1)); clearInterval(flixHeroT); } }); }
  if (slides.length > 1 && !RM) flixHeroT = setInterval(() => { if (S.view === 'flix' && document.visibilityState === 'visible') show(hi + 1); else clearInterval(flixHeroT); }, 8000);
}

/* Netflix-style "next episode" card in the last seconds of an episode */
let nuDismissed = '', nuNext = null;
function nextUpTick() {
  const box = $('#nextUp'); if (!box) return;
  const c = S.cur, rem = isFinite(v.duration) ? v.duration - v.currentTime : 1e9;
  if (!c || !c.ser || !isVodNow() || v.duration < 300 || rem > 20 || nuDismissed === c.key) { if (!box.hidden) box.hidden = true; return; }
  if (!nuNext || nuNext.from !== c.key) { const nx = nextEpisode(); nuNext = nx ? { from: c.key, ep: nx } : { from: c.key, ep: null }; }
  if (!nuNext.ep) return;
  const secs = Math.max(0, Math.ceil(rem));
  if (box.hidden) {
    box.innerHTML = `<small>${t('Next episode')}</small><b>${esc(nuNext.ep.name)}</b><div class="nuacts"><button class="btn" id="nuC">${t('Watch credits')}</button><button class="btn p nub" id="nuGo">${ic('play')} <span>${t('Next episode in')} <em>${secs}</em></span><i class="nubar"></i></button></div>`;
    box.hidden = false; $('#nuGo').onclick = () => { const ep = nuNext.ep; box.hidden = true; nuDismissed = c.key; markSeen(c); enterFsFor(ep); };
    $('#nuC').onclick = () => { nuDismissed = c.key; box.hidden = true; }; if (S.set.tv) $('#nuGo').focus({ preventScroll: true });
    const bar = $('.nubar', box); if (bar && bar.animate && !RM) bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: secs * 1000, easing: 'linear', fill: 'forwards' });
  } else { const e = $('#nuGo em', box); if (e) e.textContent = secs; }
}
v.addEventListener('timeupdate', nextUpTick);

/* ---------- AntunesFlix, round 2: intro, Netflix-style continue cards, title page ---------- */
Object.assign(PT, { 'Details and more': 'Detalhes e mais', 'Remove from row': 'Remover da faixa', 'left': 'restantes', 'Cast': 'Com', 'Director': 'Realizador', 'Episodes': 'Episódios', 'More like this': 'Títulos semelhantes', 'Trailer': 'Trailer', 'Watch series': 'Ver série', 'Rate': 'Classificar', 'Continue': 'Continuar' });
// intro: our own red "A" monogram with light streaks (shown when AntunesFlix opens)
let fxIntroShown = false;
function fxIntro() {
  if (fxIntroShown || RM || document.documentElement.classList.contains('lite')) return; fxIntroShown = true;
  const o = document.createElement('div'); o.id = 'fxIntro'; o.setAttribute('aria-hidden', 'true');
  o.innerHTML = `<div class="fxi-rays">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><div class="fxi-a">A</div><div class="fxi-word">Antunes<span>Flix</span></div>`;
  document.body.appendChild(o); const end = () => { o.classList.add('out'); setTimeout(() => o.remove(), 450); };
  o.onclick = end; setTimeout(end, 2300);
}
const fmtLeft = s => { s = Math.max(0, Math.round(s / 60)); const h = Math.floor(s / 60), m = s % 60; return (h ? h + ' h ' : '') + m + ' min ' + t('left'); };
function cwHtml(c) {
  const pos = c.cont ? c.cpos : POS[c.key], dur = (c.cont ? c.cdur : DUR[c.key]) || c.dur || 5400, pct = pos ? Math.min(100, Math.round(pos / dur * 100)) : 0;
  return `<div class="pc cw" tabindex="0" data-k="${c.key}"${c.cont ? ` data-cont="${esc(c.ser)}"` : ''}><div class="po">${c.logo ? `<img loading="lazy" decoding="async" src="${esc(c.logo)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${esc((c.name || '?').charAt(0))}</span><span class="cwplay">${ic('play')}</span>${c.clabel ? `<i class="cwlab">${esc(c.clabel)}</i>` : ''}</div><div class="cwbar"><i style="width:${pct}%"></i></div><div class="cwacts"><button class="cwb" data-cwi="${c.key}" aria-label="${t('Details')}">${ic('info')}</button><span></span><button class="cwb" data-cwm="${c.key}" aria-label="${t('More')}">${ic('dots')}</button></div></div>`;
}
function cwSheet(c) {
  const isSer = !!c.cont, k = c.key;
  openDlg(`<div class="shh"><h2>${esc(c.name)}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('close')}</button></div><div class="shl"><button id="shD">${ic('info')} ${t('Details and more')}</button>${isSer ? '' : `<button id="shS">${ic('check')} ${SEEN[k] ? t('Watched') : t('Mark as watched')}</button>`}<button id="shF">${ic(S.favs.includes(isSer ? c.ser : k) ? 'check' : 'plus')} ${t('My list')}</button><button id="shR">${ic('close')} ${t('Remove from row')}</button></div>`, 'sheet');
  $('#dx').onclick = () => dlg.close();
  $('#shD').onclick = () => { dlg.close(); openDetail(S.byKey[isSer ? c.ser : k] || c); };
  const ss = $('#shS'); if (ss) ss.onclick = () => { markSeen(S.byKey[k] || c, !SEEN[k]); dlg.close(); render(); };
  $('#shF').onclick = () => { dlg.close(); toggleFav(S.byKey[isSer ? c.ser : k] || c); render(); };
  $('#shR').onclick = () => { if (isSer) { const l = SLAST[c.ser]; if (l) delete POS[l.k]; delete SLAST[c.ser]; } else delete POS[k]; LS.set('ap.pos', POS); saveWatch(); dlg.close(); render(); };
}
function wireCw(box) {
  $$('[data-cwi]', box).forEach(b => b.onclick = e => { e.stopPropagation(); const card = b.closest('.pc'), sk = card.dataset.cont; openDetail(S.byKey[sk || b.dataset.cwi] || EPS[b.dataset.cwi]); });
  $$('[data-cwm]', box).forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.cwm, it = contList().find(x => x.key === k); if (it) cwSheet(it); });
}
// title page like Netflix (used inside AntunesFlix)
function renderFxDetail(c) {
  const i = S.dinfo || {}, box = $('#vDetail'), back = (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path) || i.movie_image || i.cover_big || i.cover || c.logo || '';
  const year = (i.releasedate || i.releaseDate || i.release_date || '').slice(0, 4), rating = parseFloat(i.rating) || 0, fav = S.favs.includes(c.key);
  const pos = POS[c.key], dur = DUR[c.key] || +i.duration_secs || 0, seasons = S.deps ? Object.keys(S.deps).sort((a, b) => a - b) : [];
  const x = c.seriesId ? serResume(c) : null, sn = S.fxSn && seasons.includes(S.fxSn) ? S.fxSn : x && seasons.includes(String(x.sn)) ? String(x.sn) : seasons[0];
  const main = c.seriesId ? (x ? `<button class="nfbig" id="dSer">${ic('play')} ${x.resume ? t('Continue') + ' ' + epLabel(x.ep) : x.first ? t('Watch series') : t('Watch') + ' ' + epLabel(x.ep)}</button>` : '') : `<button class="nfbig" id="dPlay">${ic('play')} ${pos ? t('Continue') : t('Watch')}</button>`;
  const prog = !c.seriesId && pos && dur ? `<div class="nfprog"><div><i style="width:${Math.min(100, Math.round(pos / dur * 100))}%"></i></div><small>${fmtLeft(dur - pos)}</small></div>` : x && x.resume ? `<div class="nfprog"><div><i style="width:${Math.min(100, Math.round(x.resume / (DUR[x.ep.key] || x.ep.dur || 2700) * 100))}%"></i></div><small>${epLabel(x.ep)} · ${fmtLeft((DUR[x.ep.key] || x.ep.dur || 2700) - x.resume)}</small></div>` : '';
  const similar = S.vis.filter(o => o.kind === c.kind && o.key !== c.key && o.group === c.group && o.logo).slice(0, 18);
  const tab = c.seriesId && seasons.length ? (S.fxTabD || 'eps') : 'sim', trailer = i.youtube_trailer || i.trailer || '';
  box.innerHTML = `<div class="nfd"><div class="nfhero" style="${back ? `background-image:url('${esc(back).replace(/'/g, '%27')}')` : ''}"><button class="nfcircle" id="nfP" aria-label="${t('Play')}">${ic('play')}</button></div><div class="nfbody">
    <h2>${esc(c.name)}</h2><div class="nfmeta">${[year, i.duration || (dur ? Math.round(dur / 60) + ' min' : ''), seasons.length ? seasons.length + ' ' + (seasons.length > 1 ? t('Seasons') : t('Season')) : '', rating ? '★ ' + rating.toFixed(1) : ''].filter(Boolean).map(s => `<span>${esc(s)}</span>`).join('')}</div>
    ${main}${prog}
    ${S.dinfo == null ? `<p class="mut">${t('Loading…')}</p>` : (i.plot || i.description) ? `<p class="nfplot">${esc(i.plot || i.description)}</p>` : ''}
    ${i.cast ? `<p class="nfsmall"><b>${t('Cast')}:</b> ${esc(i.cast)}</p>` : ''}${i.director ? `<p class="nfsmall"><b>${t('Director')}:</b> ${esc(i.director)}</p>` : ''}${i.genre ? `<p class="nfsmall">${esc(i.genre)}</p>` : ''}
    <div class="nfacts"><button id="dFav">${ic(fav ? 'check' : 'plus')}<span>${t('My list')}</span></button>${c.seriesId ? '' : `<button id="dSeen">${ic('check')}<span>${SEEN[c.key] ? t('Watched') : t('Mark as watched')}</span></button>`}${trailer ? `<button id="dTr">${ic('film')}<span>${t('Trailer')}</span></button>` : ''}</div>
    <div class="nftabs">${c.seriesId && seasons.length ? `<button data-dt="eps" class="${tab === 'eps' ? 'on' : ''}">${t('Episodes')}</button>` : ''}<button data-dt="sim" class="${tab === 'sim' ? 'on' : ''}">${t('More like this')}</button></div>
    ${tab === 'eps' ? `${seasons.length > 1 ? `<select class="nfsel" id="nfSn">${seasons.map(s => `<option value="${esc(s)}" ${s === sn ? 'selected' : ''}>${t('Season')} ${esc(s)}</option>`).join('')}</select>` : ''}<div class="nfeps">${(S.deps[sn] || []).map((e, n) => { const ep = epObj(c, sn, e, n), ps = POS[ep.key], dn = DUR[ep.key] || ep.dur || 2700, img = e.info && e.info.movie_image; return `<button class="nfep ${SEEN[ep.key] && !ps ? 'seen' : ''}" data-i="${n}"><span class="nfth">${img ? `<img loading="lazy" decoding="async" src="${esc(img)}" alt="" onerror="this.remove()">` : `<em>${esc(e.episode_num || n + 1)}</em>`}<span class="cwplay">${ic('play')}</span>${ps ? `<i class="nfthp"><i style="width:${Math.max(4, Math.min(100, Math.round(ps / dn * 100)))}%"></i></i>` : ''}</span><span class="nfet"><b>${esc(e.episode_num || n + 1)}. ${esc(e.title || t('Episode') + ' ' + (n + 1))}</b><small>${e.info && e.info.duration ? esc(e.info.duration) : ''}${SEEN[ep.key] && !ps ? ' · ' + t('Watched') : ''}</small>${e.info && e.info.plot ? `<span>${esc(e.info.plot)}</span>` : ''}</span></button>`; }).join('')}</div>` : `<div class="fxgrid nfsim">${similar.map(posterHtml).join('') || `<p class="mut">—</p>`}</div>`}
  </div></div>`;
  const play = () => { if (c.seriesId) { const r = serResume(c); if (r) enterFsFor(r.ep); } else enterFsFor(c); };
  $('#nfP').onclick = play; const p = $('#dPlay') || $('#dSer'); if (p) p.onclick = play;
  $('#dFav').onclick = () => { toggleFav(c); renderFxDetail(c); };
  const ds = $('#dSeen'); if (ds) ds.onclick = () => { markSeen(c, !SEEN[c.key]); renderFxDetail(c); };
  const tr = $('#dTr'); if (tr) tr.onclick = () => openExternal(/^https?:/.test(trailer) ? trailer : 'https://www.youtube.com/watch?v=' + encodeURIComponent(trailer));
  $$('[data-dt]', box).forEach(b => b.onclick = () => { S.fxTabD = b.dataset.dt; renderFxDetail(c); });
  const sel = $('#nfSn'); if (sel) sel.onchange = () => { S.fxSn = sel.value; renderFxDetail(c); };
  $$('.nfep', box).forEach(b => b.onclick = () => { const e = S.deps[sn][+b.dataset.i]; enterFsFor(epObj(c, sn, e, +b.dataset.i)); });
  wireItems(box);
}

/* ---------- colours chosen by the person: app accent, AntunesFlix colour, digits, background ---------- */
Object.assign(PT, { 'Colours': 'Cores', 'App colour (Live TV, menus, effects)': 'Cor da app (TV em direto, menus, efeitos)', 'AntunesFlix colour': 'Cor do AntunesFlix', 'Numbers (clock and channels)': 'Números (relógio e canais)', 'Theme default': 'Do tema', 'Same as the app colour': 'Iguais à cor da app', 'Background': 'Fundo', 'Circuit lines': 'Linhas de circuito', 'Plain': 'Liso', 'Black': 'Preto', 'Custom': 'Personalizada', 'Reset colours': 'Repor cores' });
const SWATCH = ['#2fd8ff', '#3d9bff', '#45f5d2', '#3ddc84', '#ffd400', '#ffb020', '#ff6a3d', '#e50914', '#ff4fd8', '#a970ff', '#ffffff'];
const TRACE_SVG = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'220\' height=\'220\' fill=\'none\' stroke=\'%2333c6ff\' stroke-opacity=\'.075\' stroke-width=\'1.2\'%3E%3Cpath d=\'M0 40h60l20 20h70l20-20h50M40 0v30l20 20M120 220v-50l20-20h40l20-20V90M0 150h40l25 25v45M220 170h-30l-15 15\'/%3E%3Ccircle cx=\'80\' cy=\'60\' r=\'3\'/%3E%3Ccircle cx=\'170\' cy=\'40\' r=\'3\'/%3E%3Ccircle cx=\'140\' cy=\'150\' r=\'3\'/%3E%3Ccircle cx=\'65\' cy=\'175\' r=\'3\'/%3E%3C/svg%3E")';
const hexRgb = h => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const onColor = h => { const [r, g, b] = hexRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return (.2126 * r + .7152 * g + .0722 * b) > .45 ? '#05080c' : '#fff'; };
function applyColors() {
  const R = document.documentElement.style, st = S.set; ['--acc', '--ar', '--onacc', '--vfd', '--trace', '--fx', '--fxr', '--fxon'].forEach(k => R.removeProperty(k));
  document.documentElement.dataset.bg = st.bgStyle || 'circuit';
  if (st.accent) { const a = st.accent; R.setProperty('--acc', a); R.setProperty('--ar', hexRgb(a).join(',')); R.setProperty('--onacc', onColor(a)); R.setProperty('--trace', TRACE_SVG.replace('%2333c6ff', '%23' + a.replace('#', ''))); }
  if (st.digits === 'accent') R.setProperty('--vfd', st.accent || getComputedStyle(document.documentElement).getPropertyValue('--acc').trim());
  if (st.fxColor) { R.setProperty('--fx', st.fxColor); R.setProperty('--fxr', hexRgb(st.fxColor).join(',')); R.setProperty('--fxon', onColor(st.fxColor)); }
}
function colorPicker(id, cur, def) { return `<div class="swatches" id="${id}">${SWATCH.map(c => `<button class="sw ${(cur || def) === c ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="swc" title="${t('Custom')}" style="${cur && !SWATCH.includes(cur) ? `background:${cur}` : ''}">+<input type="color" value="${cur || def}"></label></div>`; }
function wireColorPicker(id, set) { const box = $('#' + id, dlg); if (!box) return; $$('.sw', box).forEach(b => b.onclick = () => { $$('.sw', box).forEach(x => x.classList.toggle('on', x === b)); set(b.dataset.c); }); const inp = $('input', box); inp.oninput = () => { inp.parentNode.style.background = inp.value; $$('.sw', box).forEach(x => x.classList.remove('on')); set(inp.value); }; }

/* ---------- Google account: playlists (encrypted), favourites, lists and settings follow you to every device ---------- */
const FB = { apiKey: 'AIzaSyAANTo-ceh1SDXu6b6oRG-ujR4_JiiL4GA', authDomain: 'iptv-364a1.firebaseapp.com', databaseURL: 'https://iptv-364a1-default-rtdb.europe-west1.firebasedatabase.app', projectId: 'iptv-364a1', storageBucket: 'iptv-364a1.firebasestorage.app', messagingSenderId: '835085103047', appId: '1:835085103047:web:dceffba87c28fbf73ef3e2' };
let signing = false;
const CK = ['ap.sources', 'ap.favs', 'ap.lists', 'ap.set'], PEPPER = '|AntunesPlayer.sync.v1';
const C = { user: null, pushT: 0, applying: false, dev: LS.get('ap.dev', '') || (() => { const d = 'd' + Math.random().toString(36).slice(2, 10); LS.set('ap.dev', d); return d; })() };
Object.assign(PT, { 'Google account': 'Conta Google', 'Sign in with Google': 'Entrar com Google', 'Sign out': 'Sair', 'Signed in as': 'Entraste como', 'Sync now': 'Sincronizar agora', 'Synced': 'Sincronizado', 'Not synced yet': 'Ainda não sincronizado', 'Your playlists, favourites, lists and settings are saved in your Google account and appear on every device where you sign in. Playlist logins are encrypted before they leave this device.': 'As tuas listas, favoritos, listas próprias e definições ficam guardados na tua conta Google e aparecem em todos os aparelhos onde entrares. Os logins das listas são encriptados antes de saírem deste aparelho.', 'Sign in with a code (TV)': 'Entrar com código (TV)', 'Send to a TV': 'Enviar para uma TV', 'Code shown on the TV': 'Código que aparece na TV', 'Sent. Look at the TV.': 'Enviado. Olha para a TV.', 'The code has 8 letters/numbers': 'O código tem 8 letras/números', 'On your phone, open AntunesPlayer (app or website), sign in with Google, then Settings → Google account → Send to a TV, and type this code:': 'No telemóvel, abre o AntunesPlayer (app ou site), entra com o Google e vai a Definições → Conta Google → Enviar para uma TV, e escreve este código:', 'Waiting for your phone…': 'À espera do telemóvel…', 'The code expired. Open it again for a new one.': 'O código expirou. Abre outra vez para teres um novo.', 'Playlists in your account': 'Listas na tua conta', 'Pick the playlists to connect on this device:': 'Escolhe as listas a ligar neste aparelho:', 'Connect': 'Ligar', 'Connected': 'Ligado', 'Nothing saved in your account yet. What you add here will be saved.': 'Ainda não tens nada guardado na conta. O que adicionares aqui fica guardado.', 'Could not sign in': 'Não foi possível entrar', 'Update the app to sign in': 'Atualiza a app para poderes entrar', 'Signed out. Your data stays on this device.': 'Saíste. Os dados ficam neste aparelho.', 'Account': 'Conta', 'Your playlists are already in your Google account. Sign in to get them back.': 'As tuas listas podem estar na tua conta Google. Entra para as recuperares.', 'on this device': 'neste aparelho', 'Sync error': 'Erro de sincronização', 'Watched': 'Visto', 'Mark as watched': 'Marcar como visto', 'Opening Google…': 'A abrir o Google…', 'Playlists you add here are saved to your account.': 'As listas que adicionares aqui ficam guardadas na conta.' });
let fbp;
const fbLoad = () => fbp || (fbp = (async () => { for (const f of ['app', 'auth', 'database']) await loadScript(`js/vendor/firebase-${f}-compat.js`); if (!firebase.apps.length) firebase.initializeApp(FB); return firebase; })().catch(e => { fbp = null; throw e; }));
// AES-GCM; the key comes from PBKDF2 so logins never sit in the database as plain text
const toB64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const KEYS = {};
const ckey = secret => KEYS[secret] || (KEYS[secret] = crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']).then(b => crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new TextEncoder().encode('AntunesPlayer-salt-v1'), iterations: 120000, hash: 'SHA-256' }, b, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])));
async function seal(obj, secret) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await ckey(secret), new TextEncoder().encode(JSON.stringify(obj))); return toB64(iv) + '.' + toB64(ct); }
async function unseal(s, secret) { const [a, b] = String(s).split('.'); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(a) }, await ckey(secret), fromB64(b)); return JSON.parse(new TextDecoder().decode(pt)); }
const userSecret = () => C.user.uid + PEPPER;
function bundle() {
  const set = Object.assign({}, S.set); delete set.tv; delete set.tvMode;
  const sources = S.sources.map(x => { const o = Object.assign({}, x); if (o.text && o.text.length > 400000) delete o.text; return o; });
  return { sources, favs: S.favs, lists: S.lists, set, watch: { pos: POS, dur: DUR, seen: SEEN, wts: WTS, slast: SLAST, eps: EPS } };
}
// "continue watching" and watched marks follow you between devices: newest wins per title
function mergeWatch(w) {
  if (!w) return; const tw = w.wts || {};
  Object.keys(w.seen || {}).forEach(k => { if (!SEEN[k]) SEEN[k] = w.seen[k]; });
  Object.keys(tw).forEach(k => { if (!WTS[k] || tw[k] > WTS[k]) { WTS[k] = tw[k]; if (w.pos && w.pos[k] != null) POS[k] = w.pos[k]; else if (SEEN[k]) delete POS[k]; if (w.dur && w.dur[k]) DUR[k] = w.dur[k]; } });
  Object.keys(w.slast || {}).forEach(k => { if (!SLAST[k] || w.slast[k].t > SLAST[k].t) SLAST[k] = w.slast[k]; });
  Object.keys(w.eps || {}).forEach(k => { if (!EPS[k]) EPS[k] = w.eps[k]; });
  LS.set('ap.pos', POS); LS.set('ap.dur', DUR); LS.set('ap.eps', EPS); saveWatch();
}
const sameSrc = (a, b) => a.type === b.type && (a.type === 'xtream' ? a.server === b.server && a.user === b.user : (a.url || a.name) === (b.url || b.name));
function applyBundle(b, mode, pick) {
  C.applying = true;
  try {
    const rs = (b.sources || []).filter(x => !pick || pick.includes(x.id));
    if (mode === 'replace') S.sources = rs.map(x => Object.assign({}, x));
    else rs.forEach(x => { if (!S.sources.some(y => sameSrc(x, y))) S.sources.push(Object.assign({}, x)); });
    LS.set('ap.sources', S.sources);
    const f = (b.favs || []).slice(); if (mode !== 'replace') S.favs.forEach(k => { if (!f.includes(k)) f.push(k); }); S.favs = f; LS.set('ap.favs', f);
    const L = (b.lists || []).slice(); if (mode !== 'replace') S.lists.forEach(l => { if (!L.some(x => x.id === l.id)) L.push(l); }); S.lists = L; LS.set('ap.lists', L);
    if (b.set) { const keep = { tv: S.set.tv, tvMode: S.set.tvMode }; Object.assign(S.set, b.set, keep); saveSet(); applyLook(); }
    mergeWatch(b.watch);
  } finally { C.applying = false; }
  if (typeof refreshVis === 'function') refreshVis();
  if (!S.sources.some(x => x.id === S.srcId)) selectSource(S.sources[0] && S.sources[0].id); else render();
}
async function cloudPush() {
  if (!C.user) return; const fb = await fbLoad(), now = Date.now();
  await fb.database().ref('users/' + C.user.uid).set({ d: await seal(bundle(), userSecret()), t: now, dev: C.dev });
  LS.set('ap.cloudT', now); LS.set('ap.dirty', false); C.err = '';
}
const schedulePush = () => { if (C.applying) return; LS.set('ap.dirty', true); if (!C.user) return; clearTimeout(C.pushT); C.pushT = setTimeout(() => cloudPush().catch(e => { C.err = e.message; console.warn('sync', e); }), 2500); };
{ const raw = LS.set; LS.set = (k, v) => { raw(k, v); if (CK.includes(k)) schedulePush(); }; }
async function readRemote() { const fb = await fbLoad(); const v = (await fb.database().ref('users/' + C.user.uid).get()).val(); return v && v.d ? { t: v.t || 0, dev: v.dev, data: await unseal(v.d, userSecret()) } : null; }
async function onSignedIn(u) {
  C.user = u; const first = LS.get('ap.cloudUid', '') !== u.uid; LS.set('ap.cloudUid', u.uid);
  if (signing || first) toast(t('Signed in as') + ' ' + (u.email || '')); render();
  let r; try { r = await readRemote(); } catch (e) { C.err = e.message; toast(t('Sync error') + ': ' + e.message); return; }
  if (!r) { await cloudPush().catch(e => { C.err = e.message; }); if (first) toast(t('Nothing saved in your account yet. What you add here will be saved.')); }
  else if (first) {
    if ((r.data.sources || []).length) connectDialog(r.data, S.sources.length ? 'merge' : 'replace');
    else { applyBundle(r.data, 'merge'); await cloudPush().catch(() => { }); }
  } else if (LS.get('ap.dirty', false)) await cloudPush().catch(e => { C.err = e.message; });
  else if (r.t > LS.get('ap.cloudT', 0)) { applyBundle(r.data, 'replace'); LS.set('ap.cloudT', r.t); }
  // changes made on other devices arrive while the app is open
  const fb = await fbLoad(); fb.database().ref('users/' + u.uid).on('value', async s => {
    const v = s.val(); if (!v || !v.d || v.dev === C.dev || v.t <= LS.get('ap.cloudT', 0) || LS.get('ap.dirty', false) || dlg.open) return;
    try { applyBundle(await unseal(v.d, userSecret()), 'replace'); LS.set('ap.cloudT', v.t); } catch (e) { }
  });
}
function connectDialog(data, mode, after) {
  const src = data.sources || [];
  openDlg(`<h2>${ic('user')} ${t('Playlists in your account')}</h2><p class="mut">${t('Pick the playlists to connect on this device:')}</p><div class="srcs">${src.map(x => `<label class="srow"><input type="checkbox" data-pk="${esc(x.id)}" checked><span class="sic">${ic(x.type === 'xtream' ? 'user' : 'stack')}</span><div><b>${esc(x.name)}</b><small>${x.type === 'xtream' ? 'Xtream' : 'M3U'}${S.sources.some(y => sameSrc(x, y)) ? ' · ' + t('on this device') : ''}</small></div></label>`).join('')}</div><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="pkGo">${t('Connect')}</button></div>`);
  $('#dx').onclick = () => dlg.close();
  $('#pkGo').onclick = async () => { const pick = $$('[data-pk]', dlg).filter(c => c.checked).map(c => c.dataset.pk); dlg.close(); applyBundle(data, mode, pick); if (S.sources.length && !S.srcId) selectSource(S.sources[0].id); toast(t('Connected')); if (after) after(); else if (C.user) cloudPush().catch(() => { }); };
}
async function googleSignIn() {
  const P = window.Capacitor && Capacitor.Plugins;
  if (NATIVE) {
    if (!P || !P.FirebaseAuthentication) throw new Error(t('Update the app to sign in'));
    // open the Google account picker first (Firebase loads while the person picks)
    const fbw = fbLoad(); const r = await P.FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true }); const tok = r && r.credential && r.credential.idToken;
    if (!tok) throw new Error('no token'); const fb = await fbw; await fb.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(tok));
  } else {
    const fb = await fbLoad(), p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await fb.auth().signInWithPopup(p); } catch (e) { if (/popup-blocked|operation-not-supported/.test(e.code || '')) await fb.auth().signInWithRedirect(p); else throw e; }
  }
}
let authHooked = false;
async function cloudBoot(force) {
  if (!force && !LS.get('ap.cloudUid', '')) return; const fb = await fbLoad(); if (authHooked) return; authHooked = true;
  fb.auth().onAuthStateChanged(u => { if (u && (!C.user || C.user.uid !== u.uid)) onSignedIn(u); if (!u) C.user = null; });
}
function accountDialog() {
  const u = C.user, when = LS.get('ap.cloudT', 0);
  openDlg(`<h2>${ic('user')} ${t('Google account')}</h2><p class="mut">${t('Your playlists, favourites, lists and settings are saved in your Google account and appear on every device where you sign in. Playlist logins are encrypted before they leave this device.')}</p>
  ${u ? `<p>${t('Signed in as')} <b>${esc(u.email || u.displayName || '')}</b><br><small class="mut">${when ? t('Synced') + ' · ' + new Date(when).toLocaleString(LANG === 'pt' ? 'pt-PT' : undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('Not synced yet')}${C.err ? ' · ' + esc(C.err) : ''}</small></p>
  <div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" id="aSync">${ic('refresh')} ${t('Sync now')}</button><button class="btn" id="aTv">${ic('tv')} ${t('Send to a TV')}</button><button class="btn" id="aOut">${t('Sign out')}</button></div>`
    : `<div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn p" id="aIn">${ic('user')} ${t('Sign in with Google')}</button><button class="btn" id="aCode">${ic('tv')} ${t('Sign in with a code (TV)')}</button></div>`}
  <div class="row"><button class="btn p" id="dx">${t('Close')}</button></div>`);
  $('#dx').onclick = () => dlg.close();
  if (u) {
    $('#aSync').onclick = async () => { try { await cloudPush(); toast(t('Synced')); accountDialog(); } catch (e) { toast(t('Sync error') + ': ' + e.message); } };
    $('#aTv').onclick = sendToTvDialog;
    $('#aOut').onclick = async () => { try { const fb = await fbLoad(); await fb.auth().signOut(); const P = window.Capacitor && Capacitor.Plugins; if (NATIVE && P && P.FirebaseAuthentication) P.FirebaseAuthentication.signOut().catch(() => { }); } catch (e) { } C.user = null; LS.set('ap.cloudUid', ''); dlg.close(); toast(t('Signed out. Your data stays on this device.')); };
  } else {
    $('#aIn').onclick = signInFlow;
    $('#aCode').onclick = pairDialog;
  }
}
async function signInFlow() {
  if (signing) return; signing = true; toast(t('Opening Google…'));
  try { const boot = cloudBoot(true); await googleSignIn(); await boot; if (dlg.open) dlg.close(); }
  catch (e) { const m = String(e && (e.message || e.code) || e); if (!/cancel|closed-by-user|12501|12502/i.test(m)) toast(t('Could not sign in') + ': ' + m); }
  finally { signing = false; }
}
/* TV without a keyboard: the TV shows a code, the phone (signed in) sends the encrypted data for that code */
const PAIR_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let pairT = 0;
function pairDialog() {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => PAIR_ABC[b % 32]).join(''), url = FB.databaseURL + '/pair/' + code + '.json', end = Date.now() + 10 * 60e3;
  openDlg(`<h2>${ic('tv')} ${t('Sign in with a code (TV)')}</h2><p>${t('On your phone, open AntunesPlayer (app or website), sign in with Google, then Settings → Google account → Send to a TV, and type this code:')}</p><div class="paircode">${code.slice(0, 4)}-${code.slice(4)}</div><p class="mut" id="pSt">${t('Waiting for your phone…')}</p><p class="mut"><small>joaoantunesss.github.io/AntunesPlayer</small></p><div class="row"><button class="btn" id="dx">${t('Cancel')}</button></div>`);
  const stop = () => clearTimeout(pairT); $('#dx').onclick = () => { stop(); dlg.close(); };
  const poll = async () => {
    if (!dlg.open || !$('.paircode', dlg)) return;
    if (Date.now() > end) { $('#pSt').textContent = t('The code expired. Open it again for a new one.'); return; }
    try {
      const r = await fetch(url, { cache: 'no-store' }); const v = r.ok ? await r.json() : null;
      if (v && v.d) { fetch(url, { method: 'DELETE' }).catch(() => { }); const data = await unseal(v.d, code + PEPPER); connectDialog(data, S.sources.length ? 'merge' : 'replace', () => { }); return; }
    } catch (e) { }
    pairT = setTimeout(poll, 3000);
  };
  pairT = setTimeout(poll, 2500);
}
function sendToTvDialog() {
  openDlg(`<h2>${ic('tv')} ${t('Send to a TV')}</h2><label>${t('Code shown on the TV')}</label><input id="tvC" autocomplete="off" autocapitalize="characters" placeholder="ABCD-EFGH" style="text-transform:uppercase;letter-spacing:.2em"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="tvGo">${t('Send to a TV')}</button></div>`);
  $('#dx').onclick = accountDialog;
  $('#tvGo').onclick = async () => {
    const code = $('#tvC').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length !== 8) { toast(t('The code has 8 letters/numbers')); return; }
    try { const fb = await fbLoad(); await fb.database().ref('pair/' + code).set({ d: await seal(bundle(), code + PEPPER), t: firebase.database.ServerValue.TIMESTAMP }); toast(t('Sent. Look at the TV.')); dlg.close(); }
    catch (e) { toast(t('Sync error') + ': ' + e.message); }
  };
}
window.addEventListener('focus', () => { if (C.user && LS.get('ap.dirty', false)) schedulePush(); });
v.addEventListener('pause', () => { if (isVodNow()) schedulePush(); }); v.addEventListener('ended', () => schedulePush());

/* ---------- start ---------- */
if (!S.set.nm2) { S.set.numberMode = 'favs'; S.set.nm2 = true; saveSet(); }
applyTvMode(); window.addEventListener('ap-tv', applyTvMode); $('#cList small').textContent = S.set.tv ? t('Press ◀ on the remote') : t('Tap or swipe up');
if (NATIVE && Capacitor.Plugins && Capacitor.Plugins.App) Capacitor.Plugins.App.addListener('backButton', () => { if (AMB) { ambientEnd(true); return; } if (!back()) Capacitor.Plugins.App.exitApp(); });
/* Ambient mode: when the TV is switched on, the TV home screen opens the app like this: last channel, full screen,
   no sound, no controls. The app then puts the (see-through) home screen back on top, so the channel plays behind it
   as the background. Opening the app from the home screen turns the sound on; opening any other app stops it.
   If the stream fails (network still coming up after boot) it retries. */
let AMB = false, ambT = null, ambTries = 0, ambAt = 0;
function ambientStart() {
  if (!S.booted) return; // the playlist is still loading; bootLast() calls this when it is ready
  window.AP_AMBIENT = false;
  const c = S.byKey[LS.get('ap.cur', '')] || favLive()[0] || S.channels.find(x => x.kind === 'live'); if (!c) return;
  AMB = true; window.AP_AMB_ON = true; ambAt = Date.now(); ambTries = 0; v.muted = true; $('#cMute').innerHTML = ic('mute'); if (dlg.open) dlg.close();
  if (!(fsOn && S.cur && S.cur.key === c.key)) { if (favLive().includes(c)) { S.gsel.live = 'fav'; LS.set('ap.gsel', S.gsel); } go('live'); enterFsFor(c); } else v.play().catch(() => { });
  setTimeout(() => { if (AMB) hideOv(); }, 600);
  clearInterval(ambT); ambT = setInterval(() => { if (!AMB) { clearInterval(ambT); return; } if (S.cur && (!$('#msg').hidden || (v.paused && v.readyState < 3)) && ambTries++ < 6) play(S.cur, true); }, 10000);
}
function ambientEnd(leave) {
  AMB = false; window.AP_AMB_ON = false; clearInterval(ambT);
  if (leave) { destroyPlayer(); if (NATIVE && Capacitor.Plugins.App) Capacitor.Plugins.App.exitApp(); return; }
  v.muted = false; $('#cMute').innerHTML = ic('vol'); showOv(); toast(t('Sound on'));
}
window.addEventListener('ap-ambient', ambientStart); window.AP_AMB_READY = true;
window.addEventListener('keydown', e => { if (!AMB) return; if (/^(Escape|GoBack|BrowserBack|Backspace)$/.test(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); ambientEnd(true); return; } const ok = e.key === 'Enter' || e.key === ' '; ambientEnd(false); if (ok) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
window.addEventListener('pointerdown', () => { if (AMB) ambientEnd(false); }, true);
window.addEventListener('ap-resume', () => { if (AMB && Date.now() - ambAt > 2500) ambientEnd(false); });
window.addEventListener('ap-stop', () => { if (AMB) ambientEnd(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && AMB) ambientEnd(true); });
Object.assign(PT, { 'OK for sound': 'OK para ligar o som', 'Sound on': 'Som ligado' });
S.last = LS.get('ap.last', ''); window.__player = { S, play, byNumber, numKey, zap, parseM3U, parseXMLTV, finish, go, back };
applyLook(); tick(); setInterval(tick, 15000);
{ const h = location.hash.slice(1); history.replaceState({ d: 0 }, '', '#' + (['live', 'movies', 'series', 'search', 'flix'].includes(h) ? h : 'home')); }
route(); if (S.sources.length) selectSource(S.srcId || S.sources[0].id);
Object.assign(PT, { 'How should the app look?': 'Como queres a app?', 'You can change this later in Settings → General.': 'Podes mudar depois em Definições → Geral.', 'Light': 'Leve', 'All effects and animations': 'Com todos os efeitos e animações', 'Smoother on weak TVs and boxes': 'Mais fluida em TVs e boxes fracas' });
if (!LS.get('ap.lang', '') && !S.sources.length) {
  openDlg(`<h2>Português ou English?</h2><p class="mut">Escolha a língua da app · Choose the app language</p><div class="row" style="justify-content:center;gap:12px;margin-top:14px"><button class="btn p" data-lg="pt" style="min-width:150px">🇵🇹 Português</button><button class="btn p" data-lg="en" style="min-width:150px">🇬🇧 English</button></div>`);
  $$('[data-lg]', dlg).forEach(b => b.onclick = () => { LS.set('ap.lang', b.dataset.lg); dlg.close(); if (b.dataset.lg !== LANG) location.reload(); else askMode(); });
  setTimeout(() => { const f = $(`[data-lg="${LANG}"]`, dlg); if (f) f.focus(); }, 60);
} else if (!LS.get('ap.modeAsked', false) && !S.sources.length) askMode();
// first start, after the language: full effects or the light mode for weak TVs (can be changed later in Settings → General)
function askMode() {
  LS.set('ap.modeAsked', true); const auto = liteOn();
  openDlg(`<h2>${t('How should the app look?')}</h2><p class="mut">${t('You can change this later in Settings → General.')}</p><div class="row" style="justify-content:center;gap:12px;margin-top:14px;flex-wrap:wrap"><button class="btn ${auto ? '' : 'p'}" data-md="off" style="min-width:200px;flex-direction:column;align-items:flex-start;padding:14px 18px;height:auto"><b>✨ ${t('Normal')}</b><small class="mut">${t('All effects and animations')}</small></button><button class="btn ${auto ? 'p' : ''}" data-md="on" style="min-width:200px;flex-direction:column;align-items:flex-start;padding:14px 18px;height:auto"><b>⚡ ${t('Light')}</b><small class="mut">${t('Smoother on weak TVs and boxes')}</small></button></div>`);
  $$('[data-md]', dlg).forEach(b => b.onclick = () => { S.set.lite = b.dataset.md; saveSet(); applyLite(); dlg.close(); });
  setTimeout(() => { const f = $(`[data-md="${auto ? 'on' : 'off'}"]`, dlg); if (f) f.focus(); }, 60);
}
setTimeout(() => checkUpdate(false), 4000);
cloudBoot().catch(e => console.warn('cloud', e));
})();
