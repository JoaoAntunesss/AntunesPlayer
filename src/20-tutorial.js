/* ---------- first-run tutorial, like the official apps: the button to press is lit up, everything else is dimmed;
   pressing it (or "Next") moves on to the next step, which may be on the next screen. "Skip" ends it. ---------- */
Object.assign(PT, {
  'Show the tutorial': 'Ver o tutorial',
  Skip: 'Saltar',
  'Next step': 'Seguinte',
  Finish: 'Concluir',
  of: 'de',
  'Start here': 'Começa aqui',
  'Choose how to add your channels: your Xtream login, a playlist link, or the demo channels to look around.':
    'Escolhe como juntar os teus canais: o login Xtream, o link de uma lista ou os canais de demonstração para experimentar.',
  'Your films and series': 'Os teus filmes e séries',
  'AntunesFlix puts all your films and series together, like Netflix. Tap it.':
    'O AntunesFlix junta todos os teus filmes e séries, como na Netflix. Toca aqui.',
  'The whole catalogue': 'O catálogo todo',
  'Here you see every title, a page at a time. Tap it.': 'Aqui vês todos os títulos, sem limite. Toca aqui.',
  'Sort and filter': 'Ordenar e filtrar',
  'Choose films or series, and sort by IMDb rating, newest or A–Z.':
    'Escolhe filmes ou séries e ordena pela nota do IMDb, pelos mais recentes ou de A a Z.',
  'The best on IMDb': 'O melhor do IMDb',
  'The series you have with the best IMDb rating. Tap it.': 'As séries que tens com melhor nota no IMDb. Toca aqui.',
  'Open a title': 'Abrir um título',
  'Tap a poster to see the details, the episodes and to watch. The yellow badge is the IMDb rating.':
    'Toca num cartaz para veres os detalhes, os episódios e para começar a ver. O selo amarelo é a nota do IMDb.',
  'Back to the start': 'Voltar ao início',
  'This takes you back to the home screen. Tap it.': 'Isto leva-te de volta ao ecrã inicial. Toca aqui.',
  'Live TV': 'TV em direto',
  'All your channels, with the TV guide. Tap it.': 'Todos os teus canais, com o guia de TV. Toca aqui.',
  Categories: 'Categorias',
  'Pick a category to see only those channels. Favourites and recent channels are here too.':
    'Escolhe uma categoria para veres só esses canais. Os favoritos e os últimos canais também estão aqui.',
  'Watch a channel': 'Ver um canal',
  'Tap a channel to watch it. Tap again for full screen. The star adds it to your favourites.':
    'Toca num canal para o veres. Toca outra vez para ecrã inteiro. A estrela junta-o aos favoritos.',
  Settings: 'Definições',
  'Language, TV mode, parental control and updates. You can see this tutorial again here.':
    'Idioma, modo TV, controlo parental e atualizações. Podes ver este tutorial outra vez aqui.'
});
var TOURS = {
  welcome: [
    [
      '#vHome .wacts',
      'Start here',
      'Choose how to add your channels: your Xtream login, a playlist link, or the demo channels to look around.'
    ]
  ],
  home: [
    [
      '#vHome .t-flix',
      'Your films and series',
      'AntunesFlix puts all your films and series together, like Netflix. Tap it.',
      'click'
    ],
    [
      '#vFlix [data-ft="catalog"]',
      'The whole catalogue',
      'Here you see every title, a page at a time. Tap it.',
      'click'
    ],
    ['#vFlix .fxsort', 'Sort and filter', 'Choose films or series, and sort by IMDb rating, newest or A–Z.'],
    ['#vFlix [data-ft="imdbs"]', 'The best on IMDb', 'The series you have with the best IMDb rating. Tap it.', 'click'],
    [
      '#vFlix .fxgrid .pc, #vFlix .empty',
      'Open a title',
      'Tap a poster to see the details, the episodes and to watch. The yellow badge is the IMDb rating.'
    ],
    ['#vFlix #fxH', 'Back to the start', 'This takes you back to the home screen. Tap it.', 'click'],
    ['#vHome .t-live', 'Live TV', 'All your channels, with the TV guide. Tap it.', 'click'],
    [
      '#groups, #catBtn',
      'Categories',
      'Pick a category to see only those channels. Favourites and recent channels are here too.'
    ],
    [
      '#list .ch',
      'Watch a channel',
      'Tap a channel to watch it. Tap again for full screen. The star adds it to your favourites.'
    ],
    [
      '#bnav button:last-child, #bSet',
      'Settings',
      'Language, TV mode, parental control and updates. You can see this tutorial again here.'
    ]
  ]
};
var TOUR = null;
var tourPending = '';
function tourMaybe(name) {
  const d = LS.get('ap.tour', 0);
  if (TOUR || tourPending === name || d === 'done' || (name === 'welcome' && d === 'welcome')) return;
  tourPending = name;
  // waits for the first-run questions (language, look) to be answered, and for that screen to still be showing
  let n = 0;
  const iv = setInterval(() => {
    if (tourPending !== name || ++n > 600) {
      clearInterval(iv);
      return;
    }
    if (TOUR || (dlg && dlg.open) || fsOn) return;
    const where = name === 'welcome' ? $('#vHome .wacts') : $('#vHome .t-flix');
    if (!tourVisible(where)) {
      if (name === 'welcome' && S.sources.length) {
        clearInterval(iv);
        tourPending = '';
      }
      return;
    }
    clearInterval(iv);
    tourPending = '';
    setTimeout(() => {
      if (!TOUR && !(dlg && dlg.open)) tourStart(name);
    }, 600);
  }, 1000);
}
const tourVisible = el => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return (
    r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden'
  );
};
function tourFind(sel) {
  for (const one of sel.split(',')) {
    const el = $$(one.trim()).find(tourVisible);
    if (el) return el;
  }
  return null;
}
function tourStart(name, force) {
  if (TOUR) tourEnd(false);
  const steps = TOURS[name];
  if (!steps) return;
  const o = document.createElement('div');
  o.id = 'tour';
  o.innerHTML = '<div class="tspot"></div><div class="tcard" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(o);
  TOUR = { name, steps, i: -1, o, el: null, wait: 0 };
  o.addEventListener(
    'click',
    e => {
      // a tap on the lit-up button does what the button does, then the tour moves on
      if (e.target.closest('.tcard') || !TOUR || !TOUR.el) return;
      e.preventDefault();
      e.stopPropagation();
      const r = TOUR.el.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) tourPress();
    },
    true
  );
  addEventListener('resize', tourPlace);
  tourNext();
}
function tourPress() {
  const st = TOUR.steps[TOUR.i],
    el = TOUR.el;
  if (st[3] === 'click') {
    const b = el.matches('button,[data-go],[data-ft]') ? el : el.querySelector('button') || el;
    b.click();
  }
  tourNext();
}
function tourNext() {
  if (!TOUR) return;
  TOUR.i++;
  const T = TOUR;
  if (T.i >= T.steps.length) {
    tourEnd(true);
    return;
  }
  T.el = null;
  T.o.classList.add('busy');
  let tries = 0;
  clearInterval(T.wait);
  T.wait = setInterval(() => {
    // the next screen may still be opening (and the AntunesFlix intro playing)
    if (TOUR !== T) {
      clearInterval(T.wait);
      return;
    }
    const el = !$('#fxIntro') && tourFind(T.steps[T.i][0]);
    if (el) {
      clearInterval(T.wait);
      T.el = el;
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      setTimeout(() => tourShow(), 120);
    } else if (++tries > 25) {
      clearInterval(T.wait);
      tourNext();
    } // not on this screen (e.g. phone vs TV layout): skip that step
  }, 120);
}
function tourShow() {
  const T = TOUR;
  if (!T || !T.el) return;
  const st = T.steps[T.i],
    last = T.i === T.steps.length - 1,
    n = T.steps.length;
  $('.tcard', T.o).innerHTML =
    `${n > 1 ? `<small>${T.i + 1} ${t('of')} ${n}</small>` : ''}<h3>${t(st[1])}</h3><p>${t(st[2])}</p><div class="tacts"><button class="btn ghost" id="tSkip">${t('Skip')}</button><button class="btn p" id="tNext">${last ? t('Finish') : t('Next step')}</button></div>`;
  $('#tSkip', T.o).onclick = () => tourEnd(true);
  $('#tNext', T.o).onclick = () => tourPress();
  T.o.classList.remove('busy');
  tourPlace();
  $('#tNext', T.o).focus({ preventScroll: true });
}
function tourPlace() {
  const T = TOUR;
  if (!T || !T.el) return;
  const r = T.el.getBoundingClientRect(),
    pad = 8,
    sp = $('.tspot', T.o),
    cd = $('.tcard', T.o);
  Object.assign(sp.style, {
    left: r.left - pad + 'px',
    top: r.top - pad + 'px',
    width: r.width + pad * 2 + 'px',
    height: r.height + pad * 2 + 'px'
  });
  const cw = Math.min(360, innerWidth - 32);
  cd.style.width = cw + 'px';
  const below = r.bottom + 16 + cd.offsetHeight < innerHeight - 8,
    top = below ? r.bottom + 16 : Math.max(12, r.top - 16 - cd.offsetHeight);
  cd.style.top =
    (below || r.top - 16 - cd.offsetHeight > 12 ? top : Math.max(12, innerHeight - cd.offsetHeight - 12)) + 'px';
  cd.style.left = Math.min(innerWidth - cw - 16, Math.max(16, r.left + r.width / 2 - cw / 2)) + 'px';
}
function tourEnd(done) {
  const T = TOUR;
  if (!T) return;
  TOUR = null;
  clearInterval(T.wait);
  removeEventListener('resize', tourPlace);
  T.o.remove();
  if (done) LS.set('ap.tour', T.name === 'welcome' ? 'welcome' : 'done');
}
// the remote's Back key closes the tutorial
addEventListener(
  'keydown',
  e => {
    if (TOUR && (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack' || e.keyCode === 4)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      tourEnd(true);
    }
  },
  true
);
