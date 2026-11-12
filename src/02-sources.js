/* ---------- sources & channels ---------- */
const curSrc = () => S.sources.find(x => x.id === S.srcId) || S.sources[0];
async function selectSource(id, refresh) {
  const src = S.sources.find(x => x.id === id);
  if (!src) {
    S.channels = [];
    S.srcId = '';
    S.acct = null;
    indexChannels();
    render();
    return;
  }
  S.srcId = id;
  LS.set('ap.src', id);
  S.epg = {};
  S.loadErr = '';
  let data = refresh ? null : await idbGet('ch:' + id);
  if (data && data.v !== 4) data = null;
  if (!data) {
    S.loading = true;
    render();
    try {
      data = await loadSource(src);
      data.v = 4;
      data.at = Date.now();
      await idbSet('ch:' + id, data);
    } catch (e) {
      S.loading = false;
      S.loadErr = t('Could not load the playlist') + ': ' + e.message;
      render();
      return;
    }
  }
  S.loading = false;
  S.channels = data.list;
  S.acct = data.acct || null;
  src.epgUrl = data.epg;
  indexChannels();
  refreshVis();
  S.shown = 250;
  render();
  loadEpg(id, data.epg);
  if (!S.booted) {
    S.booted = true;
    bootLast();
  }
  if (!refresh && S.set.autoRefresh !== false && Date.now() - (data.at || 0) > 24 * 3600e3)
    setTimeout(async () => {
      // refresh the channel list quietly once a day
      try {
        const nd = await loadSource(src);
        nd.v = 4;
        nd.at = Date.now();
        await idbSet('ch:' + id, nd);
        if (S.srcId !== id) return;
        S.channels = nd.list;
        S.acct = nd.acct || S.acct;
        indexChannels();
        refreshVis();
        if (!fsOn) render();
        toast(t('Playlist updated'));
      } catch (e) {}
    }, 8000);
}
/* ---------- import / export favourites (JSON) ---------- */
const normName = x =>
  String(x || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^[a-z]{2,3}\s*[:|\-]\s*/, '')
    .replace(/\b(fhd|uhd|hd|sd|4k|hevc|h265|backup|\d{3,4}p)\b/g, '')
    .replace(/[^a-z0-9]+/g, '');
function importFavs(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    toast(t('This file is not valid JSON'));
    return;
  }
  // accepts arrays, {favorites:[...]} and the {"0":"name","1":"name",…,"size":n} format some other apps export
  const toList = v => {
    if (Array.isArray(v)) return v;
    if (!v || typeof v !== 'object') return [];
    const inner = v.favorites || v.favourites || v.favoritos || v.channels || v.canais || v.list || v.items;
    if (inner) return toList(inner);
    const ks = Object.keys(v)
      .filter(k => /^\d+$/.test(k))
      .sort((x, y) => x - y);
    return ks.map(k => v[k]);
  };
  d = toList(d);
  const live = S.channels.filter(c => c.kind === 'live'),
    byUrl = {},
    bySid = {},
    byName = {},
    byNorm = {},
    byNum = S.byNum;
  live.forEach(c => {
    byUrl[c.url] = c;
    if (c.sid != null) bySid[String(c.sid)] = c;
    byName[(c.name || '').toLowerCase().trim()] = byName[(c.name || '').toLowerCase().trim()] || c;
    const n = normName(c.name);
    if (n) byNorm[n] = byNorm[n] || c;
  });
  const found = [],
    missing = [];
  d.forEach(it => {
    const o = typeof it === 'object' && it ? it : { name: it },
      name = o.name || o.title || o.channel || o.canal || '';
    const c =
      (o.url && byUrl[o.url]) ||
      ((o.stream_id || o.id || o.sid) != null && bySid[String(o.stream_id || o.id || o.sid)]) ||
      (name && byName[String(name).toLowerCase().trim()]) ||
      (name && byNorm[normName(name)]) ||
      (typeof it === 'number' && byNum[it]) ||
      (o.num && !name && byNum[+o.num]);
    if (c) {
      if (!found.includes(c)) found.push(c);
    } else missing.push(name || JSON.stringify(it).slice(0, 40));
  });
  const before = S.favs.length;
  found.forEach(c => {
    if (!S.favs.includes(c.key)) S.favs.push(c.key);
  });
  LS.set('ap.favs', S.favs);
  render();
  openDlg(
    `<h2>${ic('star')} ${t('Favourites imported')}</h2><p>${t('Added')}: <b>${S.favs.length - before}</b> · ${t('already there')}: ${found.length - (S.favs.length - before)} · ${t('not found')}: ${missing.length}</p>${
      missing.length
        ? `<p class="mut">${t('Not found in this playlist')}:</p><div class="catm">${missing
            .slice(0, 200)
            .map(m => `<div class="cm"><span><b>${esc(m)}</b></span></div>`)
            .join('')}</div>`
        : ''
    }<div class="row"><button class="btn p" id="dx">OK</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
}
function favsJson() {
  return JSON.stringify(
    {
      app: 'AntunesPlayer',
      favorites: favLive().map((c, i) => ({
        pos: i + 1,
        name: c.name,
        num: c.num || null,
        stream_id: c.sid != null ? c.sid : undefined,
        group: c.group || '',
        url: c.url
      }))
    },
    null,
    2
  );
}
function backupDialog() {
  const dump = () => {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('ap.') && !['ap.pos', 'ap.dur', 'ap.updT'].includes(k)) o[k] = localStorage.getItem(k);
    }
    return JSON.stringify({ app: 'AntunesPlayer', backup: o });
  };
  openDlg(
    `<h2>${ic('stack')} ${t('Backup')}</h2><p class="mut">${t('Copies your playlists (with logins), favourites and settings. Paste it back after reinstalling. Keep it private: it contains your passwords.')}</p><textarea id="bTxt" rows="5"></textarea><div class="row" style="justify-content:space-between"><button class="btn" id="bCopy">${t('Copy backup')}</button><span><button class="btn" id="dx">${t('Cancel')}</button> <button class="btn p" id="bRest">${t('Restore')}</button></span></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $('#bCopy').onclick = async () => {
    const d = dump();
    try {
      await navigator.clipboard.writeText(d);
      toast(t('Copied'));
    } catch (e) {
      $('#bTxt').value = d;
      $('#bTxt').select();
      toast(t('Select and copy the text'));
    }
  };
  $('#bRest').onclick = () => {
    try {
      const o = JSON.parse($('#bTxt').value).backup;
      if (!o) throw 0;
      Object.keys(o).forEach(k => {
        if (k.startsWith('ap.')) localStorage.setItem(k, o[k]);
      });
      toast(t('Restored'));
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast(t('This file is not valid JSON'));
    }
  };
}
function favsDialog() {
  openDlg(`<h2>${ic('star')} ${t('Favourites')}</h2><p class="mut">${t('Import a JSON file with channel names (or Xtream stream_id / links). They are added to your favourites in the file order.')}</p>
  <label>${t('JSON file')}</label><input id="fFile" type="file"><label>${t('or paste the JSON')}</label><textarea id="fText" rows="4" placeholder='["RTP 1 HD", "SIC HD", {"name": "TVI"}]'></textarea>
  <div class="row" style="justify-content:space-between"><span><button class="btn" id="fExp">${t('Export')}</button> <button class="btn" id="fCopy">${t('Copy JSON')}</button></span><span><button class="btn" id="dx">${t('Cancel')}</button> <button class="btn p" id="fImp">${t('Import')}</button></span></div>`);
  $('#dx').onclick = () => dlg.close();
  $('#fImp').onclick = async () => {
    const f = $('#fFile').files[0],
      txt = f ? await f.text() : $('#fText').value;
    if (!txt.trim()) {
      toast(t('Fill in the fields'));
      return;
    }
    importFavs(txt);
  };
  $('#fExp').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([favsJson()], { type: 'application/json' }));
    a.download = 'antunesplayer-favoritos.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  $('#fCopy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(favsJson());
      toast(t('Copied'));
    } catch (e) {
      $('#fText').value = favsJson();
      $('#fText').select();
      toast(t('Select and copy the text'));
    }
  };
}
/* ---------- TV detection: TV browsers by name, Android TV / Google TV by the app (system TV mode) or by having no touch screen ---------- */
function isTvDevice() {
  return (
    !!window.AP_IS_TV ||
    /Tizen|Web0S|webOS|SmartTV|SMART-TV|HbbTV|NetCast|AFT[A-Z]|Android TV|GoogleTV|CrKey|BRAVIA|AndroidTV|PhilipsTV|VIDAA|Hisense/i.test(
      navigator.userAgent
    ) ||
    (NATIVE && (navigator.maxTouchPoints === 0 || matchMedia('(pointer: none)').matches))
  );
}
function liteOn() {
  const m = S.set.lite || 'auto';
  if (m === 'on') return true;
  if (m === 'off') return false;
  return (
    !!S.set.tv || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency || 8) <= 4
  );
}
function applyLite() {
  const on = liteOn();
  document.documentElement.classList.toggle('lite', on);
  return on;
}
function applyTvMode() {
  if (!S.set.tvMode) S.set.tvMode = 'tv' in S.set && S.set.tv && !isTvDevice() ? 'on' : 'auto';
  const on = S.set.tvMode === 'on' || (S.set.tvMode === 'auto' && isTvDevice());
  S.set.tv = on;
  saveSet();
  document.body.classList.toggle('tv', on);
  if (on) lastInput = 'key';
  applyLite();
  $('#cList small').textContent = on ? t('Press ◀ on the remote') : t('Tap or swipe up');
  if (on && S.view && !fsOn) setTimeout(tvFocus, 50);
}
function bootLast() {
  if (window.AP_AMBIENT) {
    ambientStart();
    return;
  }
  if ((S.set.startup || 'last') !== 'last' || !['home', 'live', ''].includes(location.hash.slice(1))) return;
  const c = S.byKey[LS.get('ap.cur', '')];
  if (!c || c.kind !== 'live' || !S.vis.includes(c)) return;
  if (favLive().includes(c)) {
    S.gsel.live = 'fav';
    LS.set('ap.gsel', S.gsel);
  }
  go('live');
  enterFsFor(c);
}
const fold = x =>
  String(x || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase(); // 'Notícias' and 'noticias' match
const LNC = new WeakMap();
const lname = c => {
  let n = LNC.get(c);
  if (n === undefined) {
    n = fold(c.name);
    LNC.set(c, n);
  }
  return n;
}; // folded names cached for fast search
function indexChannels() {
  S.byNum = {};
  S.byKey = {};
  S.channels.forEach(c => {
    S.byKey[c.key] = c;
    if (c.kind === 'live' && c.num && !S.byNum[c.num]) S.byNum[c.num] = c;
  });
}
const favList = () => S.favs.map(k => S.byKey[k]).filter(Boolean);
function baseList() {
  const g = S.group;
  let l;
  if (g.startsWith('u:')) {
    const L = S.lists.find(x => 'u:' + x.id === g);
    l = L ? L.keys.map(k => S.byKey[k]).filter(c => c && S.vis.includes(c)) : [];
  } else if (g === 'fav') l = favList().filter(c => c.kind === kindOf(S.mode));
  else if (g === 'recent') l = S.recent.map(k => S.byKey[k]).filter(c => c && c.kind === 'live');
  else if (g === 'all') l = S.vis.filter(c => c.kind === 'live');
  else if (g.startsWith('v:')) l = S.vis.filter(c => c.kind === 'vod' && (c.group || '—') === g.slice(2));
  else if (g.startsWith('s:')) l = S.vis.filter(c => c.kind === 'series' && (c.group || '—') === g.slice(2));
  else if (g === '_vod' || g === '_vod!') l = S.vis.filter(c => c.kind === 'vod');
  else if (g === '_series' || g === '_series!') l = S.vis.filter(c => c.kind === 'series');
  else l = S.vis.filter(c => c.kind === 'live' && c.group === g.slice(2));
  return l;
}
function shownNum(c) {
  if (c.kind !== 'live') return '';
  if (S.set.numberMode === 'favs' && S.favs.length) {
    const i = favLive().indexOf(c);
    return i < 0 ? '' : i + 1;
  }
  return c.num || '';
}
const gkey = c => c.kind + ':' + (c.group || '—');
const lockedSet = () => new Set(S.set.pin ? S.set.locked || [] : []);
function refreshVis() {
  const H = new Set(S.set.hidden || []),
    L = lockedSet();
  const K = kidsOn();
  S.vis = S.channels.filter(c => {
    const g = gkey(c);
    return !H.has(g) && (S.unlocked || !L.has(g)) && (!K || kidsOk(c));
  });
}
const favLive = () => favList().filter(c => c.kind === 'live');
