/* ---------- "On Netflix", "On HBO Max"…: which of your films and series are also on each streaming service ----------
   Two sources, used together:
   1. the playlist's own categories ("NETFLIX SERIES", "HBO MAX", "DISNEY+"…), so it works straight away;
   2. data/streaming.json, built monthly from TMDB (what each service has in Portugal) by .github/workflows/streaming.yml,
      matched to the playlist by title and year like the IMDb ratings.
   Each service becomes a genre-like row and chip in AWflix, so it gets rows, "See all" and the full grid for free. */
var PLATS = [
  ['p-netflix', 'On Netflix', /netflix/i],
  ['p-hbo', 'On HBO Max', /\bhbo\b/i],
  ['p-disney', 'On Disney+', /disney/i],
  ['p-prime', 'On Prime Video', /prime ?video|amazon/i],
  ['p-apple', 'On Apple TV', /apple ?tv/i],
  ['p-sky', 'On SkyShowtime', /skyshowtime/i],
  ['p-filmin', 'On Filmin', /filmin/i],
  ['p-paramount', 'On Paramount+', /paramount/i]
];
var STREAM = null,
  STREAMIDX = null,
  streamBusy = false,
  streamVer = 0;
Object.assign(PT, {
  'On Netflix': 'Na Netflix',
  'On HBO Max': 'Na HBO Max',
  'On Disney+': 'No Disney+',
  'On Prime Video': 'No Prime Video',
  'On Apple TV': 'Na Apple TV',
  'On SkyShowtime': 'Na SkyShowtime',
  'On Filmin': 'Na Filmin',
  'On Paramount+': 'No Paramount+'
});
// the services join the genres (right after Christmas), with a pattern that never matches genre text
(() => {
  const at = GENRES.findIndex(g => g[0] === 'xmas') + 1;
  GENRES.splice(at, 0, ...PLATS.map(p => [p[0], p[1], /(?!)/]));
})();
async function streamLoad() {
  if (STREAM || streamBusy) return;
  streamBusy = true;
  for (const u of ['https://player.awdigital.pt/data/streaming.json', 'data/streaming.json']) {
    try {
      const r = await fetch(u);
      if (r.ok) {
        STREAM = await r.json();
        break;
      }
    } catch (e) {}
  }
  streamBusy = false;
  if (!STREAM || !Array.isArray(STREAM.t)) {
    STREAM = { t: [] };
    return;
  }
  STREAMIDX = new Map();
  STREAM.t.forEach((e, i) =>
    e[0].forEach(n => {
      const k = imdbNorm(n);
      if (!k) return;
      const a = STREAMIDX.get(k);
      if (a) a.push(i);
      else STREAMIDX.set(k, [i]);
    })
  );
  streamVer++;
  const box = $('#vFlix');
  if (S.view === 'flix' && box && box.scrollTop < 40) renderFlix();
}
// the services a film or series is on (ids from PLATS)
function platOf(c) {
  if (c.kind !== 'vod' && c.kind !== 'series') return [];
  const sig = streamVer + '|' + (c.group || '') + '|' + c.name;
  if (c._pls === sig) return c._pl;
  const out = new Set();
  for (const p of PLATS) if (p[2].test(c.group || '')) out.add(p[0]);
  if (STREAMIDX) {
    const ids = STREAMIDX.get(imdbNorm(c.name)),
      y = +((/\b(19|20)\d\d\b/.exec(c.name) || [])[0] || 0),
      want = c.kind === 'series' ? 's' : 'm';
    if (ids)
      for (const i of ids) {
        const e = STREAM.t[i];
        if (e[2] !== want || (y && e[1] && Math.abs(e[1] - y) > 1)) continue;
        e[3].forEach(p => out.add(p));
      }
  }
  c._pls = sig;
  c._pl = [...out];
  return c._pl;
}
