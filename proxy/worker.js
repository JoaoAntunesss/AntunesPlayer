// AntunesPlayer helper — your own tiny CORS/https bridge on Cloudflare Workers (free plan is enough to start).
// It lets the WEB version open playlists and streams from http:// servers that block browsers.
// Deploy it in YOUR account so your IPTV login only ever passes through you. See proxy/README.md.
const ALLOWED = ['https://joaoantunesss.github.io', 'http://localhost:8790']; // add your own site address if different

export default {
  async fetch(req) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (origin && !ALLOWED.includes(origin)) return new Response('Origin not allowed', { status: 403, headers: cors });
    const self = new URL(req.url);
    const target = self.searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) return new Response('AntunesPlayer helper OK. Use ?url=', { status: target ? 400 : 200, headers: cors });
    const h = new Headers(); const range = req.headers.get('Range'); if (range) h.set('Range', range);
    h.set('User-Agent', 'Mozilla/5.0 (Linux; Android 13) AntunesPlayer');
    let r;
    try { r = await fetch(target, { headers: h, redirect: 'follow' }); } catch (e) { return new Response('Upstream error: ' + e.message, { status: 502, headers: cors }); }
    const out = new Headers(cors);
    for (const k of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) { const v = r.headers.get(k); if (v) out.set(k, v); }
    const ct = (r.headers.get('Content-Type') || '').toLowerCase();
    const looksHls = /mpegurl/.test(ct) || /\.m3u8?(\?|$)/i.test(new URL(r.url).pathname + '?');
    if (looksHls && r.ok) {
      const txt = await r.text();
      if (txt.trimStart().startsWith('#EXTM3U') && /#EXT-X-/.test(txt)) {
        const base = r.url, prox = u => self.origin + self.pathname + '?url=' + encodeURIComponent(new URL(u, base).href);
        const body = txt.split(/\r?\n/).map(l => !l.trim() ? l : l.startsWith('#') ? l.replace(/URI="([^"]+)"/g, (m, u) => 'URI="' + prox(u) + '"') : prox(l.trim())).join('\n');
        out.set('Content-Type', 'application/vnd.apple.mpegurl'); out.delete('Content-Length'); out.delete('Content-Range');
        return new Response(body, { status: 200, headers: out });
      }
      return new Response(txt, { status: r.status, headers: out }); // plain M3U channel list: untouched
    }
    return new Response(r.body, { status: r.status, headers: out });
  },
};
