/* ---------- films and episodes with no sound ----------
   Many films and episodes come as MKV files with Dolby (AC3 / E-AC3 / TrueHD) or DTS sound. The browser, the Android
   WebView and the Windows app play the picture but cannot decode that sound, so the video runs silent.
   A few seconds into playback, if the player has decoded no sound at all:
   - in the Android app, the film switches by itself to the built-in native player (ExoPlayer + FFmpeg, see NativePlayer
     in scripts/android_patch.py) at the same point. The series is remembered, so its next episodes open there directly;
   - elsewhere (web, Windows, or a live channel), a notice offers VLC or another player.
   Uses webkitAudioDecodedByteCount (Chrome, Android WebView, Edge, Electron); where it does not exist nothing happens. */
var audChk = { key: '', t0: -1, done: false },
  NATAUD = LS.get('ap.natAud', {}),
  natBusy = false;
Object.assign(PT, {
  'No sound in this video': 'Este vídeo não tem som aqui',
  'Its sound is in a format this player cannot play (usually Dolby AC3/E-AC3 or DTS). Another player plays it.':
    'O som vem num formato que este leitor não consegue tocar (normalmente Dolby AC3/E-AC3 ou DTS). Noutro leitor ouve-se.',
  'Open in VLC or another player': 'Abrir no VLC ou noutro leitor',
  'Copy the link for VLC': 'Copiar o link para o VLC',
  'Play with Dolby / DTS sound': 'Ver com som Dolby / DTS',
  'Dolby / DTS sound: opening the built-in player': 'Som Dolby / DTS: a abrir no leitor com som',
  'The built-in player could not play this': 'O leitor com som não conseguiu reproduzir isto'
});
const natOk = () => NATIVE && !!(Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.nativePlay);
const natId = c => c.ser || c.key;
// films and series already known to need the native player open there straight away (called by play())
function natFirst(c) {
  if (!natOk() || natBusy || (c.kind !== 'vod' && c.kind !== 'series') || !NATAUD[natId(c)]) return false;
  natPlay(c, POS[c.key] || 0);
  return true;
}
async function natPlay(c, pos) {
  if (natBusy) return;
  natBusy = true;
  audBox(false);
  try {
    v.pause();
  } catch (e) {}
  destroyPlayer();
  spin(false);
  NATAUD[natId(c)] = Date.now();
  const ks = Object.keys(NATAUD);
  if (ks.length > 200) delete NATAUD[ks[0]];
  LS.set('ap.natAud', NATAUD);
  const cu = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url,
    url = c.local ? cu.replace(/^.*?\/_capacitor_file_/, 'file://') : cu;
  let r = null;
  try {
    r = await Capacitor.Plugins.ExtPlayer.nativePlay({
      url,
      title: c.name || '',
      ua: uaHdr()['User-Agent'] || '',
      pos: Math.floor(pos || 0)
    });
  } catch (e) {}
  natBusy = false;
  if (!r || r.err) {
    // it failed there too: forget it, so next time the normal player is tried again
    delete NATAUD[natId(c)];
    LS.set('ap.natAud', NATAUD);
    if (S.cur === c) showMsg(t('The built-in player could not play this'), esc((r && r.err) || ''), true);
    return;
  }
  // same bookkeeping as savePos(): continue watching, watched, last episode of the series
  const k = c.key,
    dur = r.dur || DUR[k] || 0;
  WTS[k] = Date.now();
  if (c.ser) SLAST[c.ser] = { k, t: Date.now() };
  let nx = null;
  if (r.ended || (dur > 60 && r.pos > dur - Math.max(30, dur * 0.06))) {
    markSeen(c);
    if (c.ser)
      try {
        nx = nextEpisode();
      } catch (e) {}
  } else if (r.pos > 10) {
    POS[k] = Math.floor(r.pos);
    if (dur) DUR[k] = Math.floor(dur);
    LS.set('ap.pos', POS);
    LS.set('ap.dur', DUR);
  }
  saveWatch();
  if (S.cur !== c) return;
  if (location.hash === '#play') history.back();
  else stopPlayback();
  if (nx && r.ended) {
    toast(t('Next episode') + ': ' + nx.name);
    setTimeout(() => enterFsFor(nx), 1200);
  }
}
function audBox(show) {
  let el = $('#noAud');
  if (!show) {
    if (el) el.hidden = true;
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'noAud';
    $('#nextUp').insertAdjacentElement('afterend', el);
  }
  const nat = natOk() && S.cur && S.cur.kind !== 'live';
  el.innerHTML =
    `<small>${ic('mute')} ${t('No sound in this video')}</small>` +
    `<p>${esc(t('Its sound is in a format this player cannot play (usually Dolby AC3/E-AC3 or DTS). Another player plays it.'))}</p>` +
    `<div class="row">${nat ? `<button class="btn p" id="naNat">${ic('vol')} ${t('Play with Dolby / DTS sound')}</button>` : ''}` +
    `<button class="btn${nat ? '' : ' p'}" id="naOpen">${ic('ext')} ${NATIVE ? t('Open in VLC or another player') : t('Copy the link for VLC')}</button>` +
    `<button class="btn" id="naX">${t('Close')}</button></div>`;
  el.hidden = false;
  const nb = $('#naNat');
  if (nb) nb.onclick = () => S.cur && natPlay(S.cur, v.currentTime);
  $('#naOpen').onclick = () => {
    el.hidden = true;
    openElsewhere();
  };
  $('#naX').onclick = () => (el.hidden = true);
}
function audTick() {
  const c = S.cur;
  if (!c || natBusy || !('webkitAudioDecodedByteCount' in v)) return;
  if (audChk.key !== c.key) {
    audChk = { key: c.key, t0: -1, done: false };
    audBox(false);
  }
  if (audChk.done || v.paused || v.muted || v.readyState < 3) return;
  if (audChk.t0 < 0) {
    audChk.t0 = v.currentTime;
    return;
  }
  // 5 s of picture played: enough for any sound to have been decoded
  if (v.currentTime - audChk.t0 < 5) return;
  audChk.done = true;
  if (v.webkitAudioDecodedByteCount !== 0 || !(v.webkitVideoDecodedByteCount > 0)) return;
  if (natOk() && (c.kind === 'vod' || c.kind === 'series')) {
    toast(t('Dolby / DTS sound: opening the built-in player'));
    natPlay(c, Math.max(0, v.currentTime - 5));
  } else audBox(true);
}
v.addEventListener('timeupdate', audTick);
v.addEventListener('emptied', () => audBox(false));
