/* ---------- "Are you still watching?" ----------
   Episodes play one after another by themselves. After 3 in a row with nobody touching the remote, keyboard or screen
   (or 90 minutes without a touch), the next one does not start: the app asks first, like Netflix. With no answer in
   10 minutes it leaves the player, so a series does not play all night (battery, data, and where you were). */
let stillT = Date.now(),
  stillN = 0,
  stillOff = 0;
const STILL_EPS = 3,
  STILL_IDLE = 90 * 60e3,
  STILL_WAIT = 10 * 60e3;
Object.assign(PT, {
  'Are you still watching?': 'Ainda estás a ver?',
  'Continue watching': 'Continuar a ver',
  'Stop watching': 'Sair',
  'Next: ': 'A seguir: '
});
['keydown', 'pointerdown', 'touchstart', 'wheel'].forEach(n =>
  document.addEventListener(
    n,
    () => {
      stillT = Date.now();
      stillN = 0;
    },
    { capture: true, passive: true }
  )
);
// called when an episode ended and the next one is about to start by itself
function stillNext(nx) {
  stillN++;
  if (stillN < STILL_EPS && Date.now() - stillT < STILL_IDLE) {
    enterFsFor(nx);
    return;
  }
  stillAsk(nx);
}
function stillAsk(nx) {
  let el = $('#still');
  if (!el) {
    el = document.createElement('div');
    el.id = 'still';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'stillH');
    screenEl.appendChild(el);
  }
  el.innerHTML =
    `<h2 id="stillH">${t('Are you still watching?')}</h2><p>${esc(t('Next: ') + nx.name)}</p>` +
    `<div class="row"><button class="btn p" id="stillGo">${ic('play')} ${t('Continue watching')}</button>` +
    `<button class="btn" id="stillX">${t('Stop watching')}</button></div>`;
  el.hidden = false;
  screenEl.classList.add('asking');
  const done = () => {
    el.hidden = true;
    screenEl.classList.remove('asking');
    clearTimeout(stillOff);
  };
  $('#stillGo').onclick = () => {
    done();
    stillT = Date.now();
    stillN = 0;
    enterFsFor(nx);
  };
  $('#stillX').onclick = () => {
    done();
    if (fsOn) back(true); // leave the player (not just hide its controls)
    else stopPlayback();
  };
  $('#stillGo').focus({ preventScroll: true });
  clearTimeout(stillOff);
  stillOff = setTimeout(() => {
    if (!el.hidden) $('#stillX').click();
  }, STILL_WAIT);
}
const stillOpen = () => {
  const el = $('#still');
  return !!el && !el.hidden;
};
// leaving the player some other way closes the question
v.addEventListener('loadstart', () => {
  if (stillOpen()) {
    $('#still').hidden = true;
    screenEl.classList.remove('asking');
    clearTimeout(stillOff);
  }
});
