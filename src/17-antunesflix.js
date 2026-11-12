/* ---------- AntunesFlix: films and series together, organised like Netflix ---------- */
Object.assign(PT, {
  'My list': 'A minha lista',
  'Top 10 today': 'Top 10 de hoje',
  'New on AntunesFlix': 'Novidades no AntunesFlix',
  'Top rated films': 'Filmes mais bem avaliados',
  'Top rated series': 'Séries mais bem avaliadas',
  'Your list is empty. Add films and series with the star.':
    'A tua lista está vazia. Junta filmes e séries com a estrela.',
  'Next episode in': 'Próximo episódio em',
  'Watch credits': 'Ver créditos',
  films: 'filmes',
  Play: 'Ver',
  'More info': 'Mais informação'
});
S.flixTab = 'all';
let flixHeroT = 0;
const FLIX_KINDS = { all: ['vod', 'series'], series: ['series'], movies: ['vod'] };
function contFor(kinds) {
  return contList().filter(c => kinds.includes(c.kind) || (kinds.includes('series') && (c.ser || c.cont)));
}
function top10Html(list) {
  return `<section class="hrow vrow top10"><div class="rh"><h3>${t('Top 10 today')}</h3></div><div class="rail">${list.map((c, i) => `<div class="t10" ><span class="t10n">${i + 1}</span>${posterHtml(c)}</div>`).join('')}</div></section>`;
}
const groupBy = (arr, f) => {
  const m = new Map();
  for (const c of arr) {
    const k = f(c);
    let a = m.get(k);
    if (!a) m.set(k, (a = []));
    a.push(c);
  }
  return m;
};
let lazyRest = [],
  lazyHtml = null,
  lazyIO = null;
function lazyRows(box) {
  if (lazyIO) lazyIO.disconnect();
  const sent = $('#fxMore', box);
  if (!sent) return;
  const more = () => {
    const div = document.createElement('div');
    div.innerHTML = lazyRest.splice(0, 8).map(lazyHtml).join('');
    sent.before(div);
    wireItems(div);
    wireSeeAll(div);
    if (!lazyRest.length) {
      lazyIO.disconnect();
      sent.remove();
    }
  };
  if (!('IntersectionObserver' in window)) {
    while (lazyRest.length) more();
    return;
  }
  const sc = /(auto|scroll)/.test(getComputedStyle(box).overflowY) ? box : null;
  lazyIO = new IntersectionObserver(
    es => {
      if (es[0].isIntersecting) more();
    },
    { root: sc, rootMargin: '900px 0px' }
  );
  lazyIO.observe(sent);
}
function wireSeeAll(root) {
  if (S.view === 'flix')
    $$('.seeall[data-sort]:not([data-g])', root).forEach(b => {
      b.classList.add('fxcat2');
    });
  $$('.seeall.fxcat2', root).forEach(
    b =>
      (b.onclick = () => {
        S.flixSort = b.dataset.sort === 'top' ? 'top' : 'new';
        S.flixKind =
          b.dataset.m === 'series' ? 'series' : S.flixTab === 'all' && b.dataset.sort === 'new' ? 'all' : 'movies';
        S.flixTab = 'catalog';
        S.flixGenre = '';
        S.flixCat = null;
        renderFlix();
        const bx = $('#vFlix');
        if (bx) bx.scrollTop = 0;
      })
  );
  $$('[data-gen]', root).forEach(
    b =>
      (b.onclick = () => {
        S.flixCat = null;
        S.flixGenre = S.flixGenre === b.dataset.gen && b.closest('.fxgen') ? '' : b.dataset.gen;
        renderFlix();
        const bx = $('#vFlix');
        if (bx) bx.scrollTop = 0;
        if (S.set.tv)
          setTimeout(() => {
            const f = $(`.fxgen [data-gen="${S.flixGenre}"]`) || $('.fxgen [data-gen]');
            if (f) f.focus();
          }, 20);
      })
  );
  $$('.seeall[data-g]:not([data-gen])', root).forEach(b => {
    if (S.view === 'flix') b.classList.add('fxcat');
  });
  $$('.seeall.fxcat', root).forEach(
    b =>
      (b.onclick = () => {
        const sec = b.closest('section'),
          h = sec && $('h3', sec);
        S.flixCat = { m: b.dataset.m, g: b.dataset.g, label: h ? h.firstChild.textContent.trim() : '' };
        S.flixGenre = '';
        renderFlix();
        const bx = $('#vFlix');
        if (bx) bx.scrollTop = 0;
      })
  );
  $$('.seeall:not([data-gen]):not(.fxcat):not(.fxcat2)', root).forEach(
    b =>
      (b.onclick = () => {
        const m = b.dataset.m;
        go(m === 'vod' ? 'movies' : 'series');
        setTimeout(() => {
          if (b.dataset.g) {
            S.group = b.dataset.g;
            S.gsel[S.mode] = S.group;
          } else if (b.dataset.sort) {
            S.sort[S.mode] = b.dataset.sort === 'top' ? 'rate' : 'new';
            S.group = GDEF[S.mode] + '!';
          }
          S.shown = 250;
          renderBrowse();
          $('#list').scrollTop = 0;
        }, 0);
      })
  );
}
// "Because you watched X": more from the same genre as the last thing watched, best rated first, nothing already seen
function becauseRow(kinds, all) {
  const last = contFor(kinds)[0];
  if (!last) return null;
  const base = (last.ser && S.byKey[last.ser]) || last;
  if (!base.group) return null;
  const list = all
    .filter(
      c => c.kind === base.kind && c.group === base.group && c.key !== base.key && c.logo && !SEEN[c.key] && !POS[c.key]
    )
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 24);
  return list.length >= 4 ? [t('Because you watched') + ' ' + base.name, list] : null;
}
// "Surprise me": a random well-rated title you have not seen yet; opens its page
function surprise(pool) {
  const fresh = pool.filter(c => !SEEN[c.key] && !POS[c.key]),
    good = fresh.filter(c => c.rating >= 6.5),
    from = good.length >= 10 ? good : fresh.length ? fresh : pool;
  const c = from[Math.floor(Math.random() * from.length)];
  if (c) openDetail(c);
}
Object.assign(PT, { 'Surprise me': 'Surpreende-me', 'Because you watched': 'Porque viste' });
/* ---------- genres: Netflix-style rows (Comedy, Romance, Christmas…) ----------
   Series lists usually carry the genre; films often don't, so it is read from the film's details
   (when you open one, and a few at a time in the background) and kept on the device. */
const GEN = LS.get('ap.gen', {});
let genSaveT = 0;
const saveGen = () => {
  clearTimeout(genSaveT);
  genSaveT = setTimeout(() => {
    const k = Object.keys(GEN);
    if (k.length > 9000) k.slice(0, k.length - 9000).forEach(x => delete GEN[x]);
    LS.set('ap.gen', GEN);
  }, 800);
};
// [id, English label, what that genre is called in the providers' genre text (en/pt/es/fr/it/de)]
const GENRES = [
  ['xmas', 'Christmas', /christmas|xmas|\bnatal|navidad|no[eë]l\b|weihnacht/i],
  ['comedy', 'Comedy', /com[eé]d|kom[oö]die|humou?r|sitcom|rom-?com/i],
  ['romance', 'Romance', /roman(ce|tic|tico|tique|tisch|zo)|rom[aâá]ntic|rom-?com/i],
  ['action', 'Action', /\ba[cç][cç]?[aã]o\b|action|acci[oó]n|azione/i],
  ['adventure', 'Adventure', /advent|aventur|abenteuer/i],
  ['animation', 'Animation', /anima[tcç]|anime|cartoon|zeichentrick/i],
  ['family', 'Family & kids', /fam[ií]l|\bkids\b|infantil|enfant|crian[cç]/i],
  ['horror', 'Horror', /horr|terror|orrore/i],
  ['thriller', 'Thriller', /thriller|suspen/i],
  ['crime', 'Crime', /\bcrim|polic|krimi|gangster/i],
  ['drama', 'Drama', /drama/i],
  ['scifi', 'Sci-fi', /sci[- ]?fi|science.?fiction|fic[cç][aã]o cient|ciencia ficci|science-fiction/i],
  ['fantasy', 'Fantasy', /fant[aá]s/i],
  ['mystery', 'Mystery', /myst|mist[eé]ri/i],
  ['docs', 'Documentaries', /docum|\bdocu/i],
  ['war', 'War', /\bwar\b|guerr|krieg|b[eé]lic/i],
  ['history', 'History', /hist[oó]r|geschicht/i],
  ['music', 'Music', /m[uú]sic/i],
  ['western', 'Western', /western|faroeste/i],
  ['reality', 'Reality TV', /reality/i]
];
const XMAS_TITLE = /christmas|xmas|\bnatal\b|navidad|\bno[eë]l\b|grinch|santa claus|pai natal|weihnacht/i;
Object.assign(PT, {
  Christmas: 'Natal',
  Comedy: 'Comédia',
  Romance: 'Romance',
  Action: 'Ação',
  Adventure: 'Aventura',
  Animation: 'Animação',
  'Family & kids': 'Família e crianças',
  Horror: 'Terror',
  Thriller: 'Suspense',
  Crime: 'Crime',
  Drama: 'Drama',
  'Sci-fi': 'Ficção científica',
  Fantasy: 'Fantasia',
  Mystery: 'Mistério',
  Documentaries: 'Documentários',
  War: 'Guerra',
  History: 'História',
  Music: 'Música',
  Western: 'Western',
  'Reality TV': 'Reality shows',
  Genres: 'Géneros'
});
function genreOf(c) {
  const txt = c.genre || GEN[c.key] || '',
    sig = txt + '|' + (c.name || '') + '|' + (c.group || '') + '|' + streamVer;
  if (c._gs !== sig) {
    c._gs = sig;
    c._g = txt
      ? GENRES.map(g => [g[0], txt.search(g[2])])
          .filter(x => x[1] > -1)
          .sort((a, b) => a[1] - b[1])
          .map(x => x[0])
      : [];
    if (!c._g.includes('xmas') && XMAS_TITLE.test(c.name || '')) c._g.push('xmas');
    if (PLATS) for (const p of platOf(c)) c._g.push(p); // streaming services (31-streaming.js)
  }
  return c._g;
}
const genSort = (a, b) => (b.rating || 0) - (a.rating || 0) || (b.added || 0) - (a.added || 0);
const xmasSeason = () => {
  const d = new Date(),
    m = d.getMonth();
  return m === 10 || m === 11 || (m === 0 && d.getDate() <= 6);
};
function genreGroups(all) {
  const m = {};
  for (const c of all) for (const g of genreOf(c)) (m[g] || (m[g] = [])).push(c);
  return m;
}
// one row per genre with at least 4 titles, in the order of GENRES (Christmas goes to the end out of season)
// a film whose main genre is this one comes before films that only have it as a side genre
const genByMain = id => (a, b) => (genreOf(a).indexOf(id) > 0) - (genreOf(b).indexOf(id) > 0) || genSort(a, b);
function genreRows(all, used) {
  const m = genreGroups(all.filter(c => c.logo)),
    ids = GENRES.map(g => g[0]);
  if (!xmasSeason()) ids.push(ids.shift());
  used = used || new Set();
  return ids
    .map(id => {
      const list = (m[id] || []).slice().sort(genByMain(id));
      if (list.length < 4) return null;
      return [t(GENRES.find(g => g[0] === id)[1]), pickRow(list, 24, 'g:' + id, used), { gen: id }, list.length];
    })
    .filter(Boolean);
}
function genreChips(all) {
  const m = genreGroups(all),
    ids = GENRES.map(g => g[0]).filter(id => (m[id] || []).length >= 4);
  if (!xmasSeason()) {
    const i = ids.indexOf('xmas');
    if (i > -1) ids.push(ids.splice(i, 1)[0]);
  }
  return ids.length
    ? `<nav class="fxtabs fxgen" aria-label="${t('Genres')}">${ids.map(id => `<button data-gen="${id}" class="${S.flixGenre === id ? 'on' : ''}">${t(GENRES.find(g => g[0] === id)[1])}</button>`).join('')}</nav>`
    : '';
}
// background: read the genre of a few films at a time (best rated and newest first), gently, and keep it
let genBusy = false,
  genDone = 0;
async function genEnrich() {
  const x = xbase();
  if (genBusy || !x || genDone >= 150) return;
  const films = S.vis.filter(c => c.kind === 'vod' && c.vodId && c.logo && !c.genre && GEN[c.key] == null);
  if (!films.length) return;
  const seen = new Set(),
    queue = films
      .slice()
      .sort(genSort)
      .slice(0, 100)
      .concat(
        films
          .slice()
          .sort((a, b) => (b.added || 0) - (a.added || 0))
          .slice(0, 60)
      )
      .filter(c => !seen.has(c.key) && seen.add(c.key));
  genBusy = true;
  const src = S.srcId;
  let got = 0;
  try {
    for (const c of queue) {
      if (genDone >= 150 || S.srcId !== src) break;
      // while anything is playing, leave the server alone (busy IPTV servers slow the stream down)
      while (S.cur && !v.paused && S.srcId === src) await new Promise(r => setTimeout(r, 5000));
      try {
        const d = await fetchJson(
          `${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=get_vod_info&vod_id=${x.q(c.vodId)}`
        );
        GEN[c.key] = (d && d.info && d.info.genre) || '';
        if (GEN[c.key]) got++;
        genDone++;
        saveGen();
      } catch (e) {
        genDone++;
      }
      await new Promise(r => setTimeout(r, 1200));
    }
  } finally {
    genBusy = false;
  }
  // show the new rows if the user is still at the top of AntunesFlix and not in the middle of something
  const box = $('#vFlix');
  if (
    got &&
    S.view === 'flix' &&
    box &&
    box.scrollTop < 40 &&
    !S.flixGenre &&
    !(document.activeElement && box.contains(document.activeElement) && S.set.tv)
  )
    renderFlix();
}
