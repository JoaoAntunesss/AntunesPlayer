/* ---------- start ---------- */
if (!S.set.nm2) {
  S.set.numberMode = 'favs';
  S.set.nm2 = true;
  saveSet();
}
applyTvMode();
window.addEventListener('ap-tv', applyTvMode);
$('#cList small').textContent = S.set.tv ? t('Press ◀ on the remote') : t('Tap or swipe up');
if (NATIVE && Capacitor.Plugins && Capacitor.Plugins.App)
  Capacitor.Plugins.App.addListener('backButton', () => {
    if (AMB) {
      ambientEnd(true);
      return;
    }
    if (!back()) Capacitor.Plugins.App.exitApp();
  });
/* Ambient mode: when the TV is switched on, the TV home screen opens the app like this: last channel, full screen,
   no sound, no controls. The app then puts the (see-through) home screen back on top, so the channel plays behind it
   as the background. Opening the app from the home screen turns the sound on; opening any other app stops it.
   If the stream fails (network still coming up after boot) it retries. */
let AMB = false,
  ambT = null,
  ambTries = 0,
  ambAt = 0;
function ambientStart() {
  if (!S.booted) return; // the playlist is still loading; bootLast() calls this when it is ready
  window.AP_AMBIENT = false;
  const c = S.byKey[LS.get('ap.cur', '')] || favLive()[0] || S.channels.find(x => x.kind === 'live');
  if (!c) return;
  AMB = true;
  window.AP_AMB_ON = true;
  ambAt = Date.now();
  ambTries = 0;
  v.muted = true;
  $('#cMute').innerHTML = ic('mute');
  if (dlg.open) dlg.close();
  if (!(fsOn && S.cur && S.cur.key === c.key)) {
    if (favLive().includes(c)) {
      S.gsel.live = 'fav';
      LS.set('ap.gsel', S.gsel);
    }
    go('live');
    enterFsFor(c);
  } else v.play().catch(() => {});
  setTimeout(() => {
    if (AMB) hideOv();
  }, 600);
  clearInterval(ambT);
  ambT = setInterval(() => {
    if (!AMB) {
      clearInterval(ambT);
      return;
    }
    if (S.cur && (!$('#msg').hidden || (v.paused && v.readyState < 3)) && ambTries++ < 6) play(S.cur, true);
  }, 10000);
}
function ambientEnd(leave) {
  AMB = false;
  window.AP_AMB_ON = false;
  clearInterval(ambT);
  if (leave) {
    destroyPlayer();
    if (NATIVE && Capacitor.Plugins.App) Capacitor.Plugins.App.exitApp();
    return;
  }
  v.muted = false;
  $('#cMute').innerHTML = ic('vol');
  showOv();
  toast(t('Sound on'));
}
window.addEventListener('ap-ambient', ambientStart);
window.AP_AMB_READY = true;
window.addEventListener(
  'keydown',
  e => {
    if (!AMB) return;
    if (/^(Escape|GoBack|BrowserBack|Backspace)$/.test(e.key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      ambientEnd(true);
      return;
    }
    const ok = e.key === 'Enter' || e.key === ' ';
    ambientEnd(false);
    if (ok) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true
);
window.addEventListener(
  'pointerdown',
  () => {
    if (AMB) ambientEnd(false);
  },
  true
);
window.addEventListener('ap-resume', () => {
  if (AMB && Date.now() - ambAt > 2500) ambientEnd(false);
});
window.addEventListener('ap-stop', () => {
  if (AMB) ambientEnd(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && AMB) ambientEnd(true);
});
Object.assign(PT, { 'OK for sound': 'OK para ligar o som', 'Sound on': 'Som ligado' });
S.last = LS.get('ap.last', '');
window.__player = { S, play, byNumber, numKey, zap, parseM3U, parseXMLTV, finish, go, back };
applyLook();
tick();
setInterval(tick, 15000);
{
  const h = location.hash.slice(1);
  history.replaceState({ d: 0 }, '', '#' + (['live', 'movies', 'series', 'search', 'flix'].includes(h) ? h : 'home'));
}
route();
if (S.sources.length) selectSource(S.srcId || S.sources[0].id);
Object.assign(PT, {
  'How should the app look?': 'Como queres a app?',
  'You can change this later in Settings → General.': 'Podes mudar depois em Definições → Geral.',
  Light: 'Leve',
  'All effects and animations': 'Com todos os efeitos e animações',
  'Smoother on weak TVs and boxes': 'Mais fluida em TVs e boxes fracas'
});
if (!LS.get('ap.lang', '') && !S.sources.length) {
  openDlg(
    `<h2>Português ou English?</h2><p class="mut">Escolha a língua da app · Choose the app language</p><div class="row" style="justify-content:center;gap:12px;margin-top:14px"><button class="btn p" data-lg="pt" style="min-width:150px">🇵🇹 Português</button><button class="btn p" data-lg="en" style="min-width:150px">🇬🇧 English</button></div>`
  );
  $$('[data-lg]', dlg).forEach(
    b =>
      (b.onclick = () => {
        LS.set('ap.lang', b.dataset.lg);
        dlg.close();
        if (b.dataset.lg !== LANG) location.reload();
        else askMode();
      })
  );
  setTimeout(() => {
    const f = $(`[data-lg="${LANG}"]`, dlg);
    if (f) f.focus();
  }, 60);
} else if (!LS.get('ap.modeAsked', false) && !S.sources.length) askMode();
// first start, after the language: full effects or the light mode for weak TVs (can be changed later in Settings → General)
function askMode() {
  LS.set('ap.modeAsked', true);
  const auto = liteOn();
  openDlg(
    `<h2>${t('How should the app look?')}</h2><p class="mut">${t('You can change this later in Settings → General.')}</p><div class="row" style="justify-content:center;gap:12px;margin-top:14px;flex-wrap:wrap"><button class="btn ${auto ? '' : 'p'}" data-md="off" style="min-width:200px;flex-direction:column;align-items:flex-start;padding:14px 18px;height:auto"><b>✨ ${t('Normal')}</b><small class="mut">${t('All effects and animations')}</small></button><button class="btn ${auto ? 'p' : ''}" data-md="on" style="min-width:200px;flex-direction:column;align-items:flex-start;padding:14px 18px;height:auto"><b>⚡ ${t('Light')}</b><small class="mut">${t('Smoother on weak TVs and boxes')}</small></button></div>`
  );
  $$('[data-md]', dlg).forEach(
    b =>
      (b.onclick = () => {
        S.set.lite = b.dataset.md;
        saveSet();
        applyLite();
        dlg.close();
      })
  );
  setTimeout(() => {
    const f = $(`[data-md="${auto ? 'on' : 'off'}"]`, dlg);
    if (f) f.focus();
  }, 60);
}
setTimeout(() => checkUpdate(false), 4000);
cloudBoot().catch(e => console.warn('cloud', e));
if (LOGIN_PC && !NATIVE && !DESKTOP) setTimeout(() => loginPcDialog(LOGIN_PC), 400);
