/* ---------- navigation ---------- */
const kindOf = m => (m === 'vod' ? 'vod' : m === 'series' ? 'series' : 'live');
const GDEF = { live: 'all', vod: '_vod', series: '_series' };
S.mode = 'live';
S.gsel = Object.assign({}, GDEF, LS.get('ap.gsel', {}));
S.view = 'home';
S.detail = null;
const EPS = LS.get('ap.eps', {});
let fsOn = false,
  ovT = 0;
const screenEl = $('#screen');
function openSearch(scope) {
  S.qs = scope || 'all';
  if (S.qs !== 'flix') S.fx = false;
  S.q = '';
  $('#q').value = '';
  go('search');
}
function go(r, replace) {
  const d = ((history.state && history.state.d) || 0) + (replace ? 0 : 1);
  if (!replace && '#' + r === location.hash) {
    route();
    return;
  }
  history[replace ? 'replaceState' : 'pushState']({ d }, '', '#' + r);
  route();
}
function route() {
  const h = (location.hash || '#home').slice(1);
  if (h === 'play') {
    if (S.cur) {
      doFs(true);
      return;
    }
    history.replaceState({ d: 0 }, '', '#home');
    return route();
  }
  if (fsOn) doFs(false);
  let view = 'home';
  const prevView = S.view,
    prevMode = S.mode;
  if (h === 'live' || h === 'movies' || h === 'series') {
    view = 'browse';
    const m = h === 'live' ? 'live' : h === 'movies' ? 'vod' : 'series';
    if (S.mode !== m) {
      S.mode = m;
      S.q = '';
      $('#q').value = '';
      S.shown = 250;
    }
    S.group = S.gsel[m];
  } else if (h === 'detail' && S.detail) view = 'detail';
  else if (h === 'search') view = 'search';
  else if (h === 'flix') view = 'flix';
  if (!(view === 'browse' && S.mode === 'live') && S.cur && !fsOn) stopPlayback();
  S.fx =
    view === 'flix' || (S.fx && (view === 'detail' || view === 'search' || (view === 'browse' && S.mode !== 'live')));
  document.body.classList.toggle('fx', !!S.fx);
  if (view === 'flix' && S.view !== 'flix' && S.view !== 'detail') fxIntro();
  {
    const viaDetalhe =
      (prevView === 'detail' && (view === 'search' || view === 'browse')) ||
      (view === 'detail' && (prevView === 'search' || prevView === 'browse'));
    const mesmo = prevView === view && (view !== 'browse' || prevMode === S.mode);
    if (!viaDetalhe && !mesmo && view !== 'search') {
      S.q = '';
      $('#q').value = '';
      S.shown = 250;
    }
  }
  S.view = view;
  document.body.dataset.view = view;
  document.body.dataset.mode = view === 'browse' ? S.mode : '';
  render();
  if (view === 'search') setTimeout(() => $('#q').focus(), 50);
  if (S.set.tv) setTimeout(tvFocus, 30);
}
window.addEventListener('popstate', route);
function tvFocus() {
  if (fsOn || dlg.open) return;
  const ae = document.activeElement;
  if (ae && ae !== document.body && ae.closest('.view') && ae.offsetParent) return;
  const v2 = $(`#v${S.view[0].toUpperCase() + S.view.slice(1)}`);
  const f =
    $('#list .ch.on', v2) ||
    $('#list .ch', v2) ||
    $('.hacts .btn', v2) ||
    $('#list .pc', v2) ||
    $('.tile', v2) ||
    $('#dPlay', v2) ||
    $('#dFav', v2) ||
    $('button, [tabindex="0"]', v2);
  if (f) {
    f.focus({ preventScroll: true });
    f.scrollIntoView({ block: 'nearest' });
  }
}
// exit = the on-screen back arrow: always leaves the player. The 'hide the controls first' step is only for remotes/keyboards,
// on a phone the tap focuses the arrow itself, so it used to hide the controls instead of going back.
function back(exit) {
  if (dlg.open) {
    dlg.close();
    return true;
  }
  if (MV.on) {
    mvClose();
    return true;
  }
  if (fsOn && closeQuick() && !exit) return true;
  if (fsOn && !exit && !isTouch() && screenEl.classList.contains('show') && screenEl.contains(document.activeElement)) {
    hideOv();
    return true;
  }
  if (S.view === 'flix' && (S.flixCat || S.flixGenre || S.flixTab !== 'all')) {
    if (S.flixCat || S.flixGenre) {
      S.flixCat = null;
      S.flixGenre = '';
    } else S.flixTab = 'all';
    renderFlix();
    const bx = $('#vFlix');
    if (bx) bx.scrollTop = 0;
    return true;
  }
  if (S.view === 'browse' && S.mode !== 'live' && S.group !== GDEF[S.mode]) {
    S.group = GDEF[S.mode];
    S.gsel[S.mode] = S.group;
    S.q = '';
    $('#q').value = '';
    renderBrowse();
    $('#list').scrollTop = 0;
    return true;
  }
  if ((location.hash || '#home') !== '#home') {
    if (history.state && history.state.d > 0) history.back();
    else go('home', true);
    return true;
  }
  return false;
}

/* ---------- full screen player ---------- */
function enterFs() {
  if (!S.cur) return;
  if (!NATIVE && screenEl.requestFullscreen && !document.fullscreenElement)
    screenEl.requestFullscreen().catch(() => {});
  if (location.hash !== '#play') go('play');
  else doFs(true);
}
function doFs(on) {
  if (on === fsOn) return;
  fsOn = on;
  if (on) {
    document.body.appendChild(screenEl);
    screenEl.classList.add('fs');
    screenEl.classList.remove('pv');
    document.body.classList.add('fsOn');
    showOv();
    try {
      screen.orientation.lock('landscape').catch(() => {});
    } catch (e) {}
  } else {
    screenEl.classList.remove('fs', 'show');
    screenEl.classList.add('pv');
    document.body.classList.remove('fsOn');
    closeQuick();
    $('#slot').appendChild(screenEl);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    try {
      screen.orientation.unlock();
    } catch (e) {}
    if (S.cur && S.cur.kind !== 'live') stopPlayback();
    else if (!v.paused || S.cur) v.play().catch(() => {});
  }
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && fsOn && location.hash === '#play') history.back();
});
function stopPlayback() {
  savePos();
  stopRec(true);
  destroyPlayer();
  spin(false);
  $('#msg').hidden = true;
  S.cur = null;
  $$('.ch.on').forEach(r => r.classList.remove('on'));
  const i = $('#info');
  if (i) i.innerHTML = sideEmpty();
}
function showOv(keep) {
  screenEl.classList.add('show');
  clearTimeout(ovT);
  if (!keep)
    ovT = setTimeout(() => {
      if (!(isVodNow() && v.paused)) hideOv();
    }, 5000);
}
