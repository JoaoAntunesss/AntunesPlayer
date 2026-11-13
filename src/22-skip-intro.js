/* ---------- skip intro (and recap), like Netflix ----------
   Where the opening is changes from series to series, and often from episode to episode (a scene before the intro, a
   recap some weeks). So the times come, for each episode, from TheIntroDB (theintrodb.org: free, open, community made),
   found by the series' TMDB id that the provider gives, the season and the episode. When an episode is not there (or the
   playlist has no TMDB id), the app falls back to what it learned from your own jumps forward at the start of episodes,
   and only offers the button when those jumps agree from episode to episode.
   The button shows for a few seconds when the intro starts, and again while the controls are on screen; then it gets out
   of the way. */
const INTRO = LS.get('ap.intro', {}), // learned, per series: { L: [{ s, e }, …] } (older versions kept one { s, e })
  INTRODB = LS.get('ap.introdb', {}), // from TheIntroDB, per episode key: { i: [s, e] | null, r: [s, e] | null, t }
  SERTMDB = LS.get('ap.sertmdb', {}); // series key -> TMDB id ('' when the provider has none)
const INTRO_SHOW = 8000, // how long the button stays when the intro starts
  INTRO_API = 'https://api.theintrodb.org/v4/media';
let introLastT = 0,
  introChain = null,
  introOff = '',
  introSelf = false,
  introSeg = null, // { k: 'i' | 'r', s, e, at } the segment the button is for, and when it started
  introAct = 0;
Object.assign(PT, { 'Skip intro': 'Saltar intro', 'Skip recap': 'Saltar resumo' });

/* --- TheIntroDB --- */
const epNum = c => {
  const m = /S(\d+)\s*E(\d+)/i.exec(c.name || '');
  return m ? { sn: +m[1], ep: +m[2] } : c.sn ? { sn: +c.sn, ep: (+c.n || 0) + 1 } : null;
};
async function introTmdb(serKey) {
  if (serKey in SERTMDB) return SERTMDB[serKey];
  const s = S.byKey[serKey];
  let id = '';
  if (S.detail && S.detail.key === serKey && S.dinfo) id = S.dinfo.tmdb || S.dinfo.tmdb_id || '';
  const x = xbase();
  if (!id && x && s && s.seriesId) {
    try {
      const d = await fetchJson(
        `${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=get_series_info&series_id=${x.q(s.seriesId)}`
      );
      const i = (d && d.info) || {};
      id = i.tmdb || i.tmdb_id || '';
    } catch (e) {
      return ''; // try again next time
    }
  }
  id = /^\d+$/.test(String(id).trim()) ? String(id).trim() : '';
  SERTMDB[serKey] = id;
  LS.set('ap.sertmdb', SERTMDB);
  return id;
}
const introPair = a => {
  const x = (a || []).find(o => o && o.end_ms != null);
  return x ? [Math.max(0, (x.start_ms || 0) / 1000), x.end_ms / 1000] : null;
};
async function introFetch(c) {
  if (!c || !c.ser || !navigator.onLine) return;
  const old = INTRODB[c.key];
  if (old && Date.now() - old.t < (old.i || old.r ? 30 : 3) * 86400e3) return; // found: 30 days; not there yet: 3 days
  const n = epNum(c),
    id = n && (await introTmdb(c.ser));
  if (!id) return;
  const q = new URLSearchParams({ tmdb_id: id, season: n.sn, episode: n.ep });
  if (c.dur > 60) q.set('duration_ms', Math.round(c.dur * 1000));
  try {
    const r = await fetch(INTRO_API + '?' + q, { cache: 'no-store' });
    if (r.status === 429) return;
    const d = r.ok ? await r.json() : {};
    INTRODB[c.key] = { i: introPair(d.intro), r: introPair(d.recap), t: Date.now() };
    const ks = Object.keys(INTRODB);
    if (ks.length > 400) ks.slice(0, ks.length - 400).forEach(k => delete INTRODB[k]);
    LS.set('ap.introdb', INTRODB);
  } catch (e) {}
}
v.addEventListener('loadstart', () => {
  const c = S.cur;
  introSeg = null;
  if (c && c.ser && isVodNow()) introFetch(c);
});

/* --- what was learned from your own jumps --- */
function introLearned(ser) {
  let w = INTRO[ser];
  if (!w) return null;
  if (!w.L) w = INTRO[ser] = { L: [{ s: w.s, e: w.e }] };
  const L = w.L;
  if (L.length === 1) return L[0];
  // two or more episodes: only when they agree (the intro is at about the same time in all of them)
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1],
    s = L.map(x => x.s),
    e = L.map(x => x.e),
    ms = med(s),
    me = med(e),
    near = L.filter(x => Math.abs(x.s - ms) <= 20 && Math.abs(x.e - me) <= 20);
  return near.length * 2 > L.length ? { s: ms, e: me } : null;
}

/* --- the button --- */
function introSegs(c) {
  const d = INTRODB[c.key];
  if (d && (d.i || d.r)) {
    const out = [];
    if (d.r) out.push({ k: 'r', s: d.r[0], e: d.r[1] });
    if (d.i) out.push({ k: 'i', s: d.i[0], e: d.i[1] });
    return out;
  }
  const w = introLearned(c.ser);
  return w ? [{ k: 'i', s: w.s, e: w.e }] : [];
}
function introTick() {
  let b = $('#skipIntro');
  const c = S.cur,
    tt = v.currentTime,
    now = Date.now();
  const seg =
    c && c.ser && isVodNow() && introOff !== c.key
      ? introSegs(c).find(x => x.e - x.s >= 8 && tt >= x.s && tt < x.e - 2)
      : null;
  if (!seg) {
    introSeg = null;
    if (b && !b.hidden) b.hidden = true;
    return;
  }
  if (!introSeg || introSeg.k !== seg.k || introSeg.s !== seg.s) introSeg = Object.assign({ at: now }, seg);
  // on screen when the intro starts (8 s), and while the controls are shown or you just touched something
  const show = now - introSeg.at < INTRO_SHOW || screenEl.classList.contains('show') || now - introAct < 3000;
  if (!show) {
    if (b && !b.hidden) {
      if (document.activeElement === b) b.blur();
      b.hidden = true;
    }
    return;
  }
  if (!b) {
    b = document.createElement('button');
    b.id = 'skipIntro';
    b.className = 'btn';
    b.hidden = true;
    screenEl.appendChild(b);
  }
  if (!b.hidden && b.dataset.k === seg.k) return;
  b.dataset.k = seg.k;
  b.innerHTML = `${ic('fwd')} ${t(seg.k === 'r' ? 'Skip recap' : 'Skip intro')}`;
  b.hidden = false;
  b.onclick = () => {
    introSelf = true;
    b.hidden = true;
    v.currentTime = seg.e;
    // after the recap there can still be the intro; after the intro, nothing more for this episode
    if (seg.k === 'i') introOff = c.key;
  };
  if (S.set.tv) b.focus({ preventScroll: true });
}
['pointermove', 'pointerdown', 'keydown'].forEach(n =>
  screenEl.addEventListener(n, () => (introAct = Date.now()), { passive: true })
);
v.addEventListener('timeupdate', () => {
  if (!v.seeking) introLastT = v.currentTime;
  introTick();
});
v.addEventListener('seeked', () => {
  const c = S.cur,
    to = v.currentTime,
    from = introLastT,
    now = Date.now();
  introLastT = to;
  if (introSelf) {
    introSelf = false;
    introChain = null;
    return;
  }
  if (!c || !c.ser || !isVodNow() || to <= from) {
    introChain = null;
    return;
  }
  introChain =
    introChain &&
    introChain.ser === c.ser &&
    introChain.key === c.key &&
    now - introChain.t < 5000 &&
    Math.abs(from - introChain.to) < 4
      ? Object.assign(introChain, { to, t: now })
      : { ser: c.ser, key: c.key, from, to, t: now };
  const x = introChain,
    len = x.to - x.from;
  // learn only where the episode has no times from TheIntroDB
  if (x.from < 300 && x.to < 480 && len >= 15 && len <= 200 && !(INTRODB[c.key] && INTRODB[c.key].i)) {
    const w =
        INTRO[c.ser] && INTRO[c.ser].L
          ? INTRO[c.ser]
          : { L: INTRO[c.ser] ? [{ s: INTRO[c.ser].s, e: INTRO[c.ser].e }] : [] },
      one = { s: Math.max(0, Math.round(x.from) - 2), e: Math.round(x.to), k: c.key };
    // one sample per episode (the last jump wins), the last 8 episodes
    w.L = w.L.filter(o => o.k !== c.key)
      .concat(one)
      .slice(-8);
    INTRO[c.ser] = w;
    LS.set('ap.intro', INTRO);
    introOff = c.key;
  }
});
