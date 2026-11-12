/* ---------- playlist parsing ---------- */
function parseM3U(text) {
  const out = [],
    lines = text.split(/\r?\n/);
  let cur = null,
    epg = '';
  const attr = (s, k) => {
    const m = s.match(new RegExp(k + '="([^"]*)"', 'i'));
    return m ? m[1] : '';
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (/^#EXTM3U/i.test(l)) {
      epg = attr(l, 'url-tvg') || attr(l, 'x-tvg-url');
      continue;
    }
    if (/^#EXTINF/i.test(l)) {
      const c = l.indexOf(','),
        head = l.slice(0, c < 0 ? undefined : c);
      cur = {
        name: (c < 0 ? '' : l.slice(c + 1)).trim() || attr(head, 'tvg-name'),
        logo: attr(head, 'tvg-logo'),
        group: attr(head, 'group-title') || '',
        tvg: attr(head, 'tvg-id'),
        num: parseInt(attr(head, 'tvg-chno'), 10) || 0
      };
      continue;
    }
    if (l[0] === '#') continue;
    if (cur) {
      cur.url = l;
      out.push(cur);
      cur = null;
    }
  }
  return { list: out, epg };
}
function finish(list) {
  const used = new Set();
  list.forEach(c => {
    c.kind =
      c.kind ||
      (/\/movie\//i.test(c.url) || /^(movies?|filmes?|vod)\b/i.test(c.group)
        ? 'vod'
        : /\/series\//i.test(c.url)
          ? 'series'
          : 'live');
    c.key = hash((c.name || '') + '|' + c.url);
    if (c.kind === 'live' && c.num) used.add(c.num);
  });
  let n = 1;
  list.forEach(c => {
    if (c.kind !== 'live') {
      c.num = 0;
      return;
    }
    if (!c.num) {
      while (used.has(n)) n++;
      c.num = n;
      used.add(n);
    }
  });
  return list;
}
const uaHdr = () => {
  const u = NATIVE && srcUA();
  return u ? { 'User-Agent': u } : {};
};
async function fetchText(u, force) {
  const r = await fetch(proxied(u, true === force || !!S.set.proxy), { cache: 'no-store', headers: uaHdr() });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
async function loadSource(src) {
  if (src.type === 'xtream') {
    const base = src.server.replace(/\/+$/, ''),
      api = a =>
        fetchJson(
          `${base}/player_api.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}&action=${a}`
        );
    const [cats, live, vod, vcats, ser, scats] = await Promise.all([
      api('get_live_categories'),
      api('get_live_streams'),
      api('get_vod_streams').catch(() => []),
      api('get_vod_categories').catch(() => []),
      api('get_series').catch(() => []),
      api('get_series_categories').catch(() => [])
    ]);
    const cm = {},
      vm = {},
      sm = {};
    (scats || []).forEach(c => (sm[c.category_id] = c.category_name));
    (cats || []).forEach(c => (cm[c.category_id] = c.category_name));
    (vcats || []).forEach(c => (vm[c.category_id] = c.category_name));
    const list = (live || [])
      .map(x => ({
        name: x.name,
        logo: x.stream_icon || '',
        group: cm[x.category_id] || '',
        tvg: x.epg_channel_id || '',
        num: parseInt(x.num, 10) || 0,
        url: `${base}/live/${encodeURIComponent(src.user)}/${encodeURIComponent(src.pass)}/${x.stream_id}.m3u8`,
        kind: 'live',
        sid: x.stream_id,
        arch: +x.tv_archive || 0,
        archD: +x.tv_archive_duration || 0
      }))
      .concat(
        (vod || []).map(x => ({
          name: x.name,
          logo: x.stream_icon || '',
          vodId: x.stream_id,
          rating: parseFloat(x.rating) || 0,
          added: +x.added || 0,
          group: vm[x.category_id] || 'Movies',
          tvg: '',
          num: 0,
          url: `${base}/movie/${encodeURIComponent(src.user)}/${encodeURIComponent(src.pass)}/${x.stream_id}.${x.container_extension || 'mp4'}`,
          genre: x.genre || '',
          kind: 'vod'
        }))
      )
      .concat(
        (ser || []).map(x => ({
          name: x.name,
          logo: x.cover || '',
          group: sm[x.category_id] || 'Series',
          tvg: '',
          num: 0,
          url: 'xtream-series:' + x.series_id,
          seriesId: x.series_id,
          rating: parseFloat(x.rating) || 0,
          added: +x.last_modified || 0,
          genre: x.genre || '',
          kind: 'series'
        }))
      );
    const acct = await fetchJson(
      `${base}/player_api.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}`
    )
      .then(d =>
        d && d.user_info
          ? {
              exp: +d.user_info.exp_date || 0,
              max: d.user_info.max_connections,
              act: d.user_info.active_cons,
              status: d.user_info.status,
              tz: (d.server_info && d.server_info.timezone) || ''
            }
          : null
      )
      .catch(() => null);
    return {
      acct,
      list: finish(list),
      epg:
        src.epg || `${base}/xmltv.php?username=${encodeURIComponent(src.user)}&password=${encodeURIComponent(src.pass)}`
    };
  }
  const text = src.text != null ? src.text : await fetchText(src.url, true),
    p = parseM3U(text);
  return { list: finish(p.list), epg: src.epg || p.epg };
}
async function fetchJson(u) {
  const r = await fetch(proxied(u, true === !!S.set.proxy), { cache: 'no-store', headers: uaHdr() });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* ---------- TV guide (XMLTV) ---------- */
const decodeXml = s =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(
      /&(amp|lt|gt|quot|apos|#39);/g,
      (m, k) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" })[k]
    );
function xtime(s) {
  const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)\s*([+-]\d{4})?/.exec(s || '');
  if (!m) return 0;
  let off = 0;
  if (m[7])
    off = (m[7][0] === '-' ? -1 : 1) * (parseInt(m[7].slice(1, 3), 10) * 60 + parseInt(m[7].slice(3, 5), 10)) * 60000;
  return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - off;
}
function parseXMLTV(xml) {
  const now = Date.now(),
    res = {},
    re = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g;
  let m;
  while ((m = re.exec(xml))) {
    const a = {};
    m[1].replace(/(\w+)="([^"]*)"/g, (_, k, v) => {
      a[k] = v;
    });
    const s = xtime(a.start),
      e = xtime(a.stop);
    if (!e || e < now - 72 * 3600e3 || s > now + 30 * 3600e3) continue;
    const tm = /<title[^>]*>([\s\S]*?)<\/title>/.exec(m[2]),
      dm = /<desc[^>]*>([\s\S]*?)<\/desc>/.exec(m[2]);
    (res[a.channel] = res[a.channel] || []).push({
      s,
      e,
      t: tm ? decodeXml(tm[1]).trim() : '',
      d: dm ? decodeXml(dm[1]).trim().slice(0, 400) : ''
    });
  }
  Object.keys(res).forEach(k => res[k].sort((x, y) => x.s - y.s));
  return res;
}
// Parsing a big XMLTV file can freeze a TV for seconds: do it in a background worker when possible.
let epgWorkerUrl = null;
function parseXMLTVAsync(buf) {
  if (!window.Worker || !window.Blob) return Promise.resolve(parseXMLTV(new TextDecoder().decode(buf)));
  try {
    epgWorkerUrl =
      epgWorkerUrl ||
      URL.createObjectURL(
        new Blob(
          [
            `const ${decodeXml.name}=${decodeXml.toString()};${xtime.toString()};${parseXMLTV.toString()};onmessage=e=>{try{postMessage({ok:${parseXMLTV.name}(new TextDecoder().decode(e.data))})}catch(x){postMessage({err:String(x)})}}`
          ],
          { type: 'text/javascript' }
        )
      );
    return new Promise(ok => {
      const w = new Worker(epgWorkerUrl);
      const done = r => {
        w.terminate();
        ok(r);
      };
      w.onmessage = e => done(e.data.ok || parseXMLTV(new TextDecoder().decode(buf)));
      w.onerror = () => done(parseXMLTV(new TextDecoder().decode(buf)));
      w.postMessage(buf);
    });
  } catch (e) {
    return Promise.resolve(parseXMLTV(new TextDecoder().decode(buf)));
  }
}
async function loadEpg(id, url) {
  if (!url) return;
  const cache = await idbGet('epg:' + id);
  if (cache && Date.now() - cache.at < 6 * 3600e3) {
    S.epg = shiftEpg(cache.data);
    render();
    return;
  }
  try {
    const r = await fetch(proxied(url, !!S.set.proxy), { cache: 'no-store' });
    if (!r.ok) return;
    let buf = new Uint8Array(await r.arrayBuffer());
    if (buf[0] === 0x1f && buf[1] === 0x8b && window.DecompressionStream) {
      const ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')));
      buf = new Uint8Array(await ds.arrayBuffer());
    }
    const data = await parseXMLTVAsync(buf);
    S.epg = shiftEpg(data);
    idbSet('epg:' + id, { at: Date.now(), data });
    render();
    if (S.cur) showInfo(S.cur);
  } catch (e) {
    /* guide is optional */
  }
}
const epgFor = c => S.epg[c.tvg] || S.epg[(c.name || '').toLowerCase()] || null;
function nowNext(c) {
  const l = epgFor(c);
  if (!l) return null;
  const n = Date.now();
  const i = l.findIndex(p => p.e > n);
  if (i < 0) return null;
  const cur = l[i].s <= n ? l[i] : null;
  return { now: cur, next: cur ? l[i + 1] : l[i] };
}
const LOC = LANG === 'pt' ? 'pt-PT' : undefined;
const hm = ms => new Date(ms).toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' });
