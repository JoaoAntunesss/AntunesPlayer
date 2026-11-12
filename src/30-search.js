/* ---------- search that finds what you mean ----------
   Playlists name things in many ways ("PT | Spider-Man: No Way Home (2021) 4K"), people type quickly and in
   Portuguese or English. A title matches when:
   1. the letters match ignoring accents, punctuation, spaces and quality tags ("spiderman" finds "Spider-Man");
   2. every word typed starts a word of the title, in any order ("home spider");
   3. a word has one typo (two in long words: "brekaing bad");
   4. or the IMDb data knows it by that name (search "Perdidos" and find "Lost", "O Padrinho" finds "The Godfather").
   Results are ranked by how good the match is, then by IMDb rating. */
var SKEY = new WeakMap(),
  IMDBN = null;
function skey(s) {
  return fold(s)
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
function searchKey(c) {
  let k = SKEY.get(c);
  if (!k) {
    const base = skey(c.kind === 'live' ? c.name : cleanTitle(c.name) || c.name);
    k = { s: base, c: base.replace(/ /g, ''), w: base.split(' ').filter(Boolean) };
    SKEY.set(c, k);
  }
  return k;
}
// true when a and b differ by at most `max` edits (insert, delete, change, or swap of two letters)
function near(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  if (a === b) return true;
  const n = a.length,
    m = b.length;
  let prev2 = null,
    prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= m; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return false;
    prev2 = prev;
    prev = cur;
  }
  return prev[m] <= max;
}
// the IMDb names of each title (original, English, Portuguese, Brazilian), ready to search
function imdbNames() {
  if (!IMDB) return null;
  if (!IMDBN) IMDBN = IMDB.map(e => e[0].map(n => skey(n).replace(/ /g, '')).join('|'));
  return IMDBN;
}
function searchItems(qRaw, kinds) {
  const q = skey(qRaw),
    qc = q.replace(/ /g, ''),
    qw = q.split(' ').filter(Boolean);
  if (qc.length < 2) return [];
  const names = imdbNames(),
    hits = [];
  for (const c of S.vis) {
    if (!kinds.includes(c.kind)) continue;
    const k = searchKey(c);
    let sc = 0;
    if (k.c.includes(qc)) sc = k.c.startsWith(qc) ? 100 : k.s.split(' ').some(w => w.startsWith(qw[0])) ? 90 : 70;
    else if (qw.length > 1 && qw.every(w => k.w.some(x => x.startsWith(w)))) sc = 80;
    else if (
      names &&
      (c.kind === 'vod' || c.kind === 'series') &&
      imdbOf(c) &&
      c._imi != null &&
      names[c._imi].includes(qc)
    )
      sc = 75;
    if (sc) hits.push([sc, c]);
  }
  // nothing (or very little) found: try again forgiving one typo per word
  if (hits.length < 8 && qw.some(w => w.length >= 4)) {
    const seen = new Set(hits.map(h => h[1]));
    for (const c of S.vis) {
      if (!kinds.includes(c.kind) || seen.has(c)) continue;
      const k = searchKey(c);
      const ok = qw.every(w =>
        k.w.some(x =>
          w.length < 4
            ? x.startsWith(w)
            : near(w, x.slice(0, w.length + 1), w.length >= 8 ? 2 : 1) || near(w, x, w.length >= 8 ? 2 : 1)
        )
      );
      if (ok) hits.push([40, c]);
      if (hits.length > 400) break;
    }
  }
  hits.sort((a, b) => b[0] - a[0] || (imdbOf(b[1]) || b[1].rating || 0) - (imdbOf(a[1]) || a[1].rating || 0));
  return hits.map(h => h[1]);
}
