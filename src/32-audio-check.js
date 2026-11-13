/* ---------- films and series: the app's native player (Android) ----------
   Many films and episodes come as MKV files with Dolby (AC3 / E-AC3 / TrueHD) or DTS sound. The WebView (and any browser)
   plays the picture but cannot decode that sound, so they ran silent.
   In the Android app every film and episode plays in the app's native player instead (ExoPlayer + FFmpeg, see
   NativePlayer in scripts/android_patch.py): all sound formats, the embedded subtitles and the online subtitles the app
   finds (OpenSubtitles), resume point, "Continue watching" and the next episode.
   Elsewhere (web, Windows, live channels) a few seconds of video with no sound decoded show a notice offering another
   player. Uses webkitAudioDecodedByteCount (Chrome, Edge, Electron); where it does not exist nothing happens. */
var audChk = { key: '', t0: -1, done: false },
  natBusy = false;
Object.assign(PT, {
  'No sound in this video': 'Este vídeo não tem som aqui',
  'Its sound is in a format this player cannot play (usually Dolby AC3/E-AC3 or DTS). Another player plays it.':
    'O som vem num formato que este leitor não consegue tocar (normalmente Dolby AC3/E-AC3 ou DTS). Noutro leitor ouve-se.',
  'Open in VLC or another player': 'Abrir no VLC ou noutro leitor',
  'Copy the link for VLC': 'Copiar o link para o VLC',
  'Play with Dolby / DTS sound': 'Ver com som Dolby / DTS',
  'Dolby / DTS sound: opening the built-in player': 'Som Dolby / DTS: a abrir no leitor da app',
  'The built-in player could not play this': 'O leitor da app não conseguiu reproduzir isto'
});
const natOk = () => NATIVE && !!(Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.nativePlay);
// films and episodes always open in the native player. Called by play().
function natFirst(c) {
  if (!natOk() || natBusy || c._web || (c.kind !== 'vod' && c.kind !== 'series')) return false;
  natPlay(c, POS[c.key] || 0);
  return true;
}
// the best online subtitle for c (same choice as autoSubs), as WebVTT text; gives up after 6 s
async function natSubs(c) {
  if (S.set.subAuto === false || !OSK()) return null;
  const go = (async () => {
    const list = await subsSearch(c);
    S.subList = { k: c.key, list };
    if (!list.length) return null;
    return { vtt: await subsVtt(list[0]), lang: list[0].lang, label: langName(list[0].lang) };
  })().catch(() => null);
  return Promise.race([go, new Promise(r => setTimeout(() => r(null), 6000))]);
}
async function natPlay(c, pos) {
  if (natBusy) return;
  natBusy = true;
  audBox(false);
  try {
    v.pause();
  } catch (e) {}
  destroyPlayer();
  spin(true);
  const cu = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url,
    url = c.local ? cu.replace(/^.*?\/_capacitor_file_/, 'file://') : cu,
    sub = await natSubs(c);
  spin(false);
  if (S.cur !== c) {
    natBusy = false;
    return;
  }
  let r = null;
  try {
    r = await Capacitor.Plugins.ExtPlayer.nativePlay({
      url,
      title: c.name || '',
      ua: uaHdr()['User-Agent'] || '',
      pos: Math.floor(pos || 0),
      vtt: (sub && sub.vtt) || '',
      subLang: (sub && sub.lang) || '',
      subLabel: (sub && sub.label) || '',
      subLangs: S.set.subAuto === false ? '' : subLangs().join(',')
    });
  } catch (e) {}
  natBusy = false;
  if (!r || r.err) {
    // it failed there (a stream the native player cannot open): try the app screen once, so it still plays
    if (S.cur === c) {
      c._web = true;
      toast(t('The built-in player could not play this') + (r && r.err ? ' (' + r.err + ')' : ''));
      play(c, true);
    }
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
