/* ---------- IMDb ratings: data/imdb.json (built monthly from IMDb's datasets by .github/workflows/imdb.yml)
   is matched to the playlist by title (+ year when the name has one). Powers the IMDb badge and the Top IMDb tabs. */
var IMDB = null,
  imdbBusy = false,
  IMDBIDX = new Map();
const imdbNorm = n =>
  cleanTitle(n)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an|o|os|as) /, '');
async function imdbLoad() {
  if (IMDB || imdbBusy) return;
  imdbBusy = true;
  for (const u of ['https://joaoantunesss.github.io/AntunesPlayer/data/imdb.json', 'data/imdb.json']) {
    try {
      const r = await fetch(u);
      if (r.ok) {
        IMDB = await r.json();
        break;
      }
    } catch (e) {}
  }
  imdbBusy = false;
  if (!IMDB) return;
  IMDB.forEach((e, i) =>
    e[0].forEach(n => {
      const k = imdbNorm(n);
      if (!k) return;
      const a = IMDBIDX.get(k);
      if (a) {
        if (!a.includes(i)) a.push(i);
      } else IMDBIDX.set(k, [i]);
    })
  );
  if (S.view === 'search') renderSearch();
  const box = $('#vFlix');
  if (S.view === 'flix' && box && (/^imdb/.test(S.flixTab) || box.scrollTop < 40)) renderFlix();
}
// IMDb rating of a film or series (0 if unknown); remembered on the item
function imdbOf(c) {
  if (!IMDB || (c.kind !== 'vod' && c.kind !== 'series')) return 0;
  if (c._imn === c.name) return c._im;
  c._imn = c.name;
  c._im = 0;
  c._imv = 0;
  c._imi = null;
  const ids = IMDBIDX.get(imdbNorm(c.name));
  if (!ids) return 0;
  const y = +((/\b(19|20)\d\d\b/.exec(c.name) || [])[0] || 0),
    want = c.kind === 'series' ? 's' : 'm';
  let best = null;
  for (const i of ids) {
    const e = IMDB[i];
    if (e[2] !== want || (y && e[1] && Math.abs(e[1] - y) > 1)) continue;
    if (!best || e[4] > best[4]) {
      best = e;
      c._imi = i;
    }
  }
  if (best) {
    c._im = best[3];
    c._imv = best[4];
  }
  return c._im;
}
Object.assign(PT, {
  'Top IMDb films': 'Top IMDb filmes',
  'Top IMDb series': 'Top IMDb séries',
  'IMDb rating': 'Nota IMDb',
  'Loading IMDb ratings…': 'A carregar as notas do IMDb…',
  'Could not load the IMDb ratings. Check the internet connection.':
    'Não foi possível carregar as notas do IMDb. Verifica a ligação à internet.',
  'Best rated on IMDb that you have, with at least 25 000 votes':
    'O que tens com melhor nota no IMDb (pelo menos 25 000 votos)'
});
/* ---------- variety and the full catalogue ----------
   Rows rotate every day: each one picks from a wider pool of good titles (not always the same top 24),
   and a title shown in one row is avoided in the next ones. "Catalogue" shows everything, a page at a time. */
const dayKey = () => new Date().toISOString().slice(0, 10);
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function dayShuffle(list, salt) {
  const r = seeded(dayKey() + '|' + salt),
    a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// up to n titles from a list already ordered by quality: today's mix of its best part, preferring titles not shown above
function pickRow(list, n, salt, used) {
  const pool = dayShuffle(list.slice(0, Math.max(n * 4, 80)), salt),
    fresh = pool.filter(c => !used.has(c.key));
  const pick = (fresh.length >= Math.min(n, 8) ? fresh : fresh.concat(pool.filter(c => used.has(c.key)))).slice(0, n);
  pick.forEach(c => used.add(c.key));
  return pick;
}
Object.assign(PT, {
  Catalogue: 'Catálogo',
  Newest: 'Mais recentes',
  'Best rated': 'Melhor nota',
  'All titles': 'Todos os títulos'
});
S.flixSort = 'new';
S.flixKind = 'all';
S.flixCat = null;
const FX_SORTS = [
  ['imdb', 'IMDb rating'],
  ['new', 'Newest'],
  ['top', 'Best rated'],
  ['az', 'A–Z']
];
function fxSorted(list) {
  const k = S.flixSort,
    a = list.slice();
  if (k === 'az') return a.sort((x, y) => (x.name || '').localeCompare(y.name || '', 'pt', { sensitivity: 'base' }));
  if (k === 'imdb')
    return a.sort(
      (x, y) => imdbOf(y) - imdbOf(x) || (y._imv || 0) - (x._imv || 0) || (y.rating || 0) - (x.rating || 0)
    );
  if (k === 'top') return a.sort((x, y) => (y.rating || 0) - (x.rating || 0) || (y.added || 0) - (x.added || 0));
  return a.sort((x, y) => (y.added || 0) - (x.added || 0));
}
// a grid of every title, 120 at a time as you scroll
let gridRest = [],
  gridIO = null;
function fxGridHtml(title, list, kindChips, ranked) {
  const sorted = ranked ? list : fxSorted(list);
  gridRest = sorted.slice(120);
  const chips = ranked
    ? ''
    : `<nav class="fxtabs fxsort">${
        kindChips
          ? [
              ['all', 'All'],
              ['movies', 'Movies'],
              ['series', 'Series']
            ]
              .map(x => `<button data-fk="${x[0]}" class="${S.flixKind === x[0] ? 'on' : ''}">${t(x[1])}</button>`)
              .join('') + '<span class="fxsep"></span>'
          : ''
      }${FX_SORTS.map(x => `<button data-fs="${x[0]}" class="${S.flixSort === x[0] ? 'on' : ''}">${t(x[1])}</button>`).join('')}</nav>`;
  return (
    `<div class="rh fxgh"><h3>${esc(title)} <small>${fmtN(list.length)}</small></h3></div>` +
    chips +
    (list.length
      ? `<div class="fxgrid" id="fxGrid">${sorted.slice(0, 120).map(posterHtml).join('')}</div>${gridRest.length ? '<div class="fxmore" id="fxGridMore"></div>' : ''}`
      : `<div class="empty"><p>${t('Nothing found')}</p></div>`)
  );
}
function fxGridWire(box) {
  if (gridIO) gridIO.disconnect();
  const sent = $('#fxGridMore', box),
    grid = $('#fxGrid', box);
  if (!sent || !grid) return;
  const more = () => {
    const div = document.createElement('div');
    div.innerHTML = gridRest.splice(0, 120).map(posterHtml).join('');
    const items = [...div.children];
    items.forEach(x => grid.appendChild(x));
    wireItems(grid);
    if (!gridRest.length) {
      gridIO.disconnect();
      sent.remove();
    }
  };
  if (!('IntersectionObserver' in window)) {
    while (gridRest.length) more();
    return;
  }
  const sc = /(auto|scroll)/.test(getComputedStyle(box).overflowY) ? box : null;
  gridIO = new IntersectionObserver(
    es => {
      if (es[0].isIntersecting) more();
    },
    { root: sc, rootMargin: '1200px 0px' }
  );
  gridIO.observe(sent);
}
function renderFlix() {
  const box = $('#vFlix'),
    tab = S.flixTab,
    kinds = FLIX_KINDS[tab] || FLIX_KINDS.all;
  const all = S.vis.filter(c => kinds.includes(c.kind)),
    withArt = all.filter(c => c.logo);
  const byRating = withArt.filter(c => c.rating > 0).sort((a, b) => b.rating - a.rating),
    recent = all.slice().sort((a, b) => (b.added || 0) - (a.added || 0));
  // the hero mixes what is new and what is best rated, like the Netflix billboard
  const pool = recent
    .filter(c => c.logo)
    .slice(0, 30)
    .filter(c => c.rating >= 6)
    .concat(byRating.slice(0, 20));
  const seen = {},
    top = pool.filter(c => !seen[c.key] && (seen[c.key] = 1)).slice(0, 8);
  const tabs = [
    ['all', 'Home'],
    ['series', 'Series'],
    ['movies', 'Movies'],
    ['imdbm', 'Top IMDb films'],
    ['imdbs', 'Top IMDb series'],
    ['catalog', 'Catalogue'],
    ['mylist', 'My list']
  ].concat(dlNative() ? [['dl', 'Downloads']] : []);
  let body = '';
  imdbLoad();
  streamLoad();
  newEpCheck();
  if (tab === 'dl') body = dlHtml();
  else if (tab === 'imdbm' || tab === 'imdbs') {
    const kind = tab === 'imdbm' ? 'vod' : 'series';
    if (!IMDB)
      body = `<div class="empty"><p>${imdbBusy ? t('Loading IMDb ratings…') : t('Could not load the IMDb ratings. Check the internet connection.')}</p></div>`;
    else {
      const list = S.vis.filter(c => c.kind === kind && imdbOf(c) > 0 && c._imv >= 25000),
        seenN = new Set();
      // one entry per title (playlists often repeat a film in several categories or qualities)
      const uniq = list
        .sort((a, b) => b._im - a._im || b._imv - a._imv || (b.logo ? 1 : 0) - (a.logo ? 1 : 0))
        .filter(c => {
          const k = imdbNorm(c.name);
          return !seenN.has(k) && seenN.add(k);
        });
      const prev = S.flixSort;
      S.flixSort = 'imdb';
      body =
        `<p class="mut fxnote">${t('Best rated on IMDb that you have, with at least 25 000 votes')}</p>` +
        fxGridHtml(t(tab === 'imdbm' ? 'Top IMDb films' : 'Top IMDb series'), uniq, false, true);
      S.flixSort = prev;
    }
  } else if (tab === 'catalog') {
    const ck = FLIX_KINDS[S.flixKind] || FLIX_KINDS.all;
    body = fxGridHtml(
      t('All titles'),
      S.vis.filter(c => ck.includes(c.kind)),
      true
    );
  } else if (S.flixCat) {
    const fc = S.flixCat,
      list = S.vis.filter(c => c.kind === fc.m && (c.group || '—') === fc.g.slice(2));
    body = fxGridHtml(fc.label, list, false);
  } else if (tab === 'mylist') {
    const mine = favList().filter(c => c.kind === 'vod' || c.kind === 'series');
    body = mine.length
      ? `<div class="fxgrid">${mine.map(posterHtml).join('')}</div>`
      : `<div class="empty"><p>${t('Your list is empty. Add films and series with the star.')}</p></div>`;
  } else if (S.flixGenre) {
    const g = GENRES.find(x => x[0] === S.flixGenre),
      list = all.filter(c => genreOf(c).includes(S.flixGenre));
    body = fxGridHtml(t(g ? g[1] : ''), list, false);
  } else {
    const cw = contFor(kinds),
      rows = [
        [
          t('New episodes'),
          kinds.includes('series')
            ? Object.keys(NEWEP || {})
                .map(k => S.byKey[k])
                .filter(Boolean)
            : []
        ],
        [t('My list'), favList().filter(c => kinds.includes(c.kind))]
      ];
    const t10 = byRating.slice(0, 10),
      used = new Set(t10.map(c => c.key));
    const byw = becauseRow(kinds, all);
    if (byw) rows.push(byw);
    const rest = [
      [
        t('New on AWflix'),
        pickRow(
          recent.filter(c => c.logo),
          24,
          'new',
          used
        ),
        { sort: 'new', m: kinds.length > 1 ? 'vod' : kinds[0] }
      ]
    ];
    if (kinds.includes('vod'))
      rest.push([
        t('Top rated films'),
        pickRow(
          byRating.filter(c => c.kind === 'vod'),
          24,
          'topv',
          used
        ),
        { m: 'vod', sort: 'top' }
      ]);
    if (kinds.includes('series'))
      rest.push([
        t('Top rated series'),
        pickRow(
          byRating.filter(c => c.kind === 'series'),
          24,
          'tops',
          used
        ),
        { m: 'series', sort: 'top' }
      ]);
    const gr = genreRows(all, used),
      xmasRow = xmasSeason() ? gr.find(r => r[2].gen === 'xmas') : null;
    if (xmasRow) rows.splice(1, 0, xmasRow);
    gr.filter(r => r !== xmasRow).forEach(r => rest.push(r));
    // the provider's own categories from both, taking turns
    const cv = kinds.includes('vod')
        ? catItems('vod')
            .filter(x => x.id.indexOf('v:') === 0 && x.icon !== 'lock')
            .map(g => ['vod', g])
        : [],
      cs = kinds.includes('series')
        ? catItems('series')
            .filter(x => x.id.indexOf('s:') === 0 && x.icon !== 'lock')
            .map(g => ['series', g])
        : [];
    const cats = [];
    for (let i = 0; i < Math.max(cv.length, cs.length) && cats.length < 120; i++) {
      if (cv[i]) cats.push(cv[i]);
      if (cs[i]) cats.push(cs[i]);
    }
    const byG = groupBy(all, c => c.kind + '|' + (c.group || '—'));
    cats.forEach(([m, g]) => {
      const l = (byG.get(m + '|' + g.id.slice(2)) || []).filter(c => c.logo).sort(genSort);
      if (l.length) rest.push([g.label, pickRow(l, 24, 'c:' + g.id, used), { m, g: g.id, label: g.label }, g.n]);
    });
    const rowHtmlF = r =>
      `<section class="hrow vrow"><div class="rh"><h3>${esc(r[0])}${r[3] ? ` <small>${fmtN(r[3])}</small>` : ''}</h3>${r[2] && r[2].gen ? `<button class="seeall" data-gen="${r[2].gen}">${t('See all')}</button>` : r[2] ? `<button class="seeall" data-m="${r[2].m}" ${r[2].g ? `data-g="${esc(r[2].g)}"` : ''} ${r[2].sort ? `data-sort="${r[2].sort}"` : ''}>${t('See all')}</button>` : ''}</div><div class="rail">${r[1].map(posterHtml).join('')}</div></section>`;
    body =
      (cw.length
        ? `<section class="hrow vrow cwrow"><div class="rh"><h3>${t('Continue watching')}</h3></div><div class="rail">${cw.map(cwHtml).join('')}</div></section>`
        : '') +
      rows
        .filter(r => r[1].length)
        .map(rowHtmlF)
        .join('') +
      (t10.length >= 5 ? top10Html(t10) : '');
    // only the first rows go in now; the others are added as you scroll (a big catalogue has 100+ genre rows)
    lazyRest = rest.filter(r => r[1].length);
    lazyHtml = rowHtmlF;
    body +=
      lazyRest.splice(0, 8).map(rowHtmlF).join('') + (lazyRest.length ? '<div class="fxmore" id="fxMore"></div>' : '');
  }
  box.innerHTML =
    `<div class="fxbar"><button class="fxlogo" data-ft="all">AW<span>flix</span></button><span class="gap"></span>${tab !== 'mylist' && withArt.length ? `<button class="btn fxsurp" id="fxR" aria-label="${t('Surprise me')}">${ic('shuffle')} <span>${t('Surprise me')}</span></button>` : ''}<button class="ib fxic" id="fxS" aria-label="${t('Search')}">${ic('search')}</button><button class="ib fxic" id="fxH" aria-label="${t('Home')}">${ic('home')}</button></div><nav class="fxtabs">${tabs
      .filter(x => x[0] !== 'all')
      .map(x => `<button data-ft="${x[0]}" class="${tab === x[0] ? 'on' : ''}">${t(x[1])}</button>`)
      .join(
        ''
      )}${tab !== 'all' || S.flixCat || S.flixGenre ? `<button data-ft="all" class="fxx" aria-label="${t('Close')}">✕</button>` : ''}</nav>${!/^(mylist|catalog|imdb|dl)/.test(tab) ? genreChips(all) : ''}` +
    (!/^(mylist|catalog|imdb|dl)/.test(tab) && !S.flixGenre && !S.flixCat && top.length
      ? `<div class="hero fxhero" id="fxhero">${top.map((c, i) => `<div class="hs ${i ? '' : 'on'}" data-k="${c.key}"><div class="hbg" style="background-image:url('${esc(c.logo).replace(/'/g, '%27')}')"></div><div class="hpo"><img src="${esc(c.logo)}" alt="" onerror="this.remove()"></div><div class="hi"><small class="fxkind">${c.kind === 'series' ? t('Series') : t('Movies').replace(/s$/, '')}</small><h3>${esc(c.name)}</h3><div class="chips">${c.rating ? `<span>★ ${c.rating.toFixed(1)}</span>` : ''}<span>${esc(c.group || '')}</span></div><div class="hacts"><button class="btn p" data-hp="${c.key}">${ic('play')} ${c.kind === 'series' ? t('Watch series') : t('Play')}</button><button class="btn" data-hl="${c.key}">${ic(S.favs.includes(c.key) ? 'check' : 'plus')} ${t('My list')}</button></div></div></div>`).join('')}<div class="hdots">${top.map((c, i) => `<button data-hi="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"></button>`).join('')}</div></div>`
      : '') +
    body;
  wireItems(box);
  wireCw(box);
  $('#fxS', box).onclick = () => openSearch('flix');
  const fr = $('#fxR', box);
  if (fr) fr.onclick = () => surprise(withArt);
  lazyRows(box);
  dlWire(box);
  $('#fxH', box).onclick = () => go('home');
  setTimeout(genEnrich, 3000);
  fxGridWire(box);
  $$('[data-fs]', box).forEach(
    b =>
      (b.onclick = () => {
        S.flixSort = b.dataset.fs;
        renderFlix();
        if (S.set.tv)
          setTimeout(() => {
            const f = $(`[data-fs="${S.flixSort}"]`, box);
            if (f) f.focus();
          }, 20);
      })
  );
  $$('[data-fk]', box).forEach(
    b =>
      (b.onclick = () => {
        S.flixKind = b.dataset.fk;
        renderFlix();
        if (S.set.tv)
          setTimeout(() => {
            const f = $(`[data-fk="${S.flixKind}"]`, box);
            if (f) f.focus();
          }, 20);
      })
  );
  $$('[data-ft]', box).forEach(
    b =>
      (b.onclick = () => {
        S.flixTab = b.dataset.ft;
        S.flixGenre = '';
        S.flixCat = null;
        renderFlix();
        box.scrollTop = 0;
        if (S.set.tv)
          setTimeout(() => {
            const f = $(`[data-ft="${S.flixTab}"]`, box);
            if (f) f.focus();
          }, 20);
      })
  );
  wireSeeAll(box);
  const slides = $$('.hs', box),
    dots = $$('.hdots button', box);
  let hi = 0;
  clearInterval(flixHeroT);
  const show = n => {
    hi = (n + slides.length) % slides.length;
    slides.forEach((x, i) => x.classList.toggle('on', i === hi));
    dots.forEach((x, i) => x.classList.toggle('on', i === hi));
  };
  dots.forEach(
    d =>
      (d.onclick = () => {
        show(+d.dataset.hi);
        clearInterval(flixHeroT);
      })
  );
  $$('[data-hp]', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const c = S.byKey[b.dataset.hp];
        if (c.seriesId) {
          S.autoResume = true;
          openDetail(c);
        } else enterFsFor(c);
      })
  );
  $$('[data-hd]', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        openDetail(S.byKey[b.dataset.hd]);
      })
  );
  $$('[data-hl]', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const c = S.byKey[b.dataset.hl];
        toggleFav(c);
        b.innerHTML = `${ic(S.favs.includes(c.key) ? 'check' : 'plus')} ${t('My list')}`;
      })
  );
  slides.forEach(x => {
    x.onclick = () => openDetail(S.byKey[x.dataset.k]);
    x.addEventListener('focusin', () => clearInterval(flixHeroT));
  });
  let sx = null;
  const hero = $('#fxhero', box);
  if (hero) {
    hero.addEventListener(
      'touchstart',
      e => {
        sx = e.touches[0].clientX;
      },
      { passive: true }
    );
    hero.addEventListener('touchend', e => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) {
        show(hi + (dx < 0 ? 1 : -1));
        clearInterval(flixHeroT);
      }
    });
  }
  if (slides.length > 1 && !RM)
    flixHeroT = setInterval(() => {
      if (S.view === 'flix' && document.visibilityState === 'visible') show(hi + 1);
      else clearInterval(flixHeroT);
    }, 8000);
}

/* Netflix-style "next episode" card in the last seconds of an episode */
let nuDismissed = '',
  nuNext = null;
function nextUpTick() {
  const box = $('#nextUp');
  if (!box) return;
  const c = S.cur,
    rem = isFinite(v.duration) ? v.duration - v.currentTime : 1e9;
  if (!c || !c.ser || !isVodNow() || v.duration < 300 || rem > 20 || nuDismissed === c.key) {
    if (!box.hidden) box.hidden = true;
    return;
  }
  if (!nuNext || nuNext.from !== c.key) {
    const nx = nextEpisode();
    nuNext = nx ? { from: c.key, ep: nx } : { from: c.key, ep: null };
  }
  if (!nuNext.ep) return;
  const secs = Math.max(0, Math.ceil(rem));
  if (box.hidden) {
    box.innerHTML = `<small>${t('Next episode')}</small><b>${esc(nuNext.ep.name)}</b><div class="nuacts"><button class="btn" id="nuC">${t('Watch credits')}</button><button class="btn p nub" id="nuGo">${ic('play')} <span>${t('Next episode in')} <em>${secs}</em></span><i class="nubar"></i></button></div>`;
    box.hidden = false;
    $('#nuGo').onclick = () => {
      const ep = nuNext.ep;
      box.hidden = true;
      nuDismissed = c.key;
      markSeen(c);
      enterFsFor(ep);
    };
    $('#nuC').onclick = () => {
      nuDismissed = c.key;
      box.hidden = true;
    };
    if (S.set.tv) $('#nuGo').focus({ preventScroll: true });
    const bar = $('.nubar', box);
    if (bar && bar.animate && !RM)
      bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: secs * 1000,
        easing: 'linear',
        fill: 'forwards'
      });
  } else {
    const e = $('#nuGo em', box);
    if (e) e.textContent = secs;
  }
}
v.addEventListener('timeupdate', nextUpTick);
