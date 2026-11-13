/* ---------- films and series: native video engine under the app's own player (Android) ----------
   Many films and episodes come as MKV files with Dolby (AC3 / E-AC3 / TrueHD) or DTS sound, which the WebView cannot
   decode: they played with no sound. In the Android app they are played by NativeVideo (ExoPlayer + FFmpeg, see
   scripts/android_patch.py), which draws the picture under the WebView. The page turns transparent there, so the app's
   own player screen, controls, resume, skip intro and next episode stay exactly as they are.
   To keep all that code unchanged, the <video> element is driven through the same properties and events it already
   uses: while the engine is on, currentTime, duration, paused, play(), pause()… are redirected to it (properties set
   on the element itself, removed again when it stops), and its state comes back as the usual media events.
   Elsewhere (web, Windows, live channels) a few seconds of video with no sound decoded show a notice offering another
   player (webkitAudioDecodedByteCount: Chrome, Edge, Electron). */
var NV = { on: false },
  audChk = { key: '', t0: -1, done: false };
Object.assign(PT, {
  'No sound in this video': 'Este vídeo não tem som aqui',
  'Its sound is in a format this player cannot play (usually Dolby AC3/E-AC3 or DTS). Another player plays it.':
    'O som vem num formato que este leitor não consegue tocar (normalmente Dolby AC3/E-AC3 ou DTS). Noutro leitor ouve-se.',
  'Open in VLC or another player': 'Abrir no VLC ou noutro leitor',
  'Copy the link for VLC': 'Copiar o link para o VLC',
  'Not available with this video': 'Não disponível neste vídeo'
});
const XP = () => Capacitor.Plugins.ExtPlayer;
const nvOk = () => NATIVE && !!(window.Capacitor && Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.nvOpen);
// films and episodes always go to the engine; live channels too when watched full screen (football on a busy server:
// bigger reserve, reconnects by itself; and much less battery than decoding the stream in JavaScript). The small
// preview next to the channel list keeps the web player.
const nvFor = c => nvOk() && (c.kind === 'vod' || c.kind === 'series' || fsOn);
const nvFire = n => v.dispatchEvent(new Event(n));
const nvCmd = (c, x, s) =>
  XP()
    .nvCmd({ c, v: x || 0, s: s || '' })
    .catch(() => {});
let nvSeekT = 0;
const NVPROPS = {
  currentTime: {
    get: () => NV.t,
    set: x => {
      NV.t = Math.max(0, +x || 0);
      NV.seeking = true;
      clearTimeout(nvSeekT);
      nvSeekT = setTimeout(() => nvSeeked(), 4000);
      nvFire('seeking');
      nvFire('timeupdate');
      nvCmd('seek', Math.round(NV.t * 1000));
    }
  },
  duration: { get: () => NV.d },
  paused: { get: () => !NV.pw },
  ended: { get: () => NV.st === 4 },
  seeking: { get: () => !!NV.seeking },
  readyState: { get: () => (NV.st === 3 || NV.st === 4 ? 4 : NV.meta ? 1 : 0) },
  buffered: { get: () => ({ length: NV.meta ? 1 : 0, start: () => 0, end: () => NV.b }) },
  videoWidth: { get: () => NV.w },
  videoHeight: { get: () => NV.h },
  error: { get: () => NV.err },
  playbackRate: {
    get: () => NV.rate,
    set: x => {
      NV.rate = +x || 1;
      nvCmd('rate', NV.rate);
      nvFire('ratechange');
    }
  },
  volume: {
    get: () => NV.vol,
    set: x => {
      NV.vol = Math.max(0, Math.min(1, +x));
      nvCmd('vol', NV.muted ? 0 : NV.vol);
      nvFire('volumechange');
    }
  },
  muted: {
    get: () => NV.muted,
    set: x => {
      NV.muted = !!x;
      nvCmd('vol', NV.muted ? 0 : NV.vol);
      nvFire('volumechange');
    }
  },
  play: {
    value: () => {
      if (!NV.pw) {
        NV.pw = true;
        nvFire('play');
      }
      nvCmd('play');
      return Promise.resolve();
    }
  },
  pause: {
    value: () => {
      if (NV.pw) {
        NV.pw = false;
        nvFire('pause');
      }
      nvCmd('pause');
    }
  },
  load: { value: () => {} },
  getAttribute: { value: n => (n === 'src' ? NV.url : Element.prototype.getAttribute.call(v, n)) },
  audioTracks: { get: () => undefined },
  textTracks: { get: () => [] },
  getVideoPlaybackQuality: { value: () => ({ droppedVideoFrames: 0, totalVideoFrames: 0 }) },
  requestPictureInPicture: { value: () => Promise.reject(new Error('n/a')) },
  captureStream: { value: undefined },
  mozCaptureStream: { value: undefined }
};
function nvStart(c, url) {
  const muted = v.muted,
    vol = v.volume;
  Object.keys(NVPROPS).forEach(k => Object.defineProperty(v, k, Object.assign({ configurable: true }, NVPROPS[k])));
  NV = {
    on: true,
    live: c.kind === 'live',
    url,
    key: c.key,
    t: 0,
    d: NaN,
    b: 0,
    st: 2,
    pw: true,
    pl: false,
    w: 0,
    h: 0,
    err: null,
    seeking: false,
    meta: false,
    rate: 1,
    vol,
    muted
  };
  document.documentElement.classList.add('nv');
  nvFire('loadstart');
  nvFire('play');
  const src = c.local ? url.replace(/^.*?\/_capacitor_file_/, 'file://') : url;
  return XP()
    .nvOpen({
      url: src,
      ua: uaHdr()['User-Agent'] || '',
      pos: 0,
      subLangs: S.set.subAuto === false || c.kind === 'live' ? '' : subLangs().join(','),
      live: c.kind === 'live',
      stab: stabLevel(c),
      aspect: v.style.objectFit || 'contain',
      debug: !!LS.get('ap.nvdebug', false)
    })
    .then(() => {
      if (muted) nvCmd('vol', 0);
    })
    .catch(e => nvError(String((e && e.message) || e)));
}
function nvStop() {
  if (!NV.on) return;
  NV.on = false;
  clearTimeout(nvSeekT);
  Object.keys(NVPROPS).forEach(k => delete v[k]);
  document.documentElement.classList.remove('nv');
  XP()
    .nvClose()
    .catch(() => {});
}
function nvSeeked() {
  clearTimeout(nvSeekT);
  if (!NV.seeking) return;
  NV.seeking = false;
  nvFire('seeked');
  nvFire('timeupdate');
}
function nvError(msg) {
  if (!NV.on) return;
  NV.err = { code: 4, message: msg };
  const c = S.cur;
  if (c) showMsg(t('Could not play this'), whyHtml(c.url, false, msg), true);
}
// state from the engine (about 4 times a second, and on every change)
function nvEvt(d) {
  if (!NV.on || !d) return;
  if (!NV.seeking || d.e === 'seeked') NV.t = d.t;
  NV.b = d.b;
  const dur = NV.live ? Infinity : d.d > 0 ? d.d : NaN;
  if ((d.w && d.w !== NV.w) || (d.h && d.h !== NV.h)) {
    NV.w = d.w;
    NV.h = d.h;
    nvFire('resize');
  }
  if (d.e === 'retry') nvFire('waiting'); // a live stream reconnecting by itself
  if (!NV.meta && ((dur > 0 && !NV.live) || d.st === 3)) {
    NV.meta = true;
    NV.d = dur;
    ['durationchange', 'loadedmetadata', 'loadeddata', 'canplay'].forEach(nvFire);
  } else if (dur > 0 && dur !== NV.d && !NV.live) {
    NV.d = dur;
    nvFire('durationchange');
  }
  if (d.e === 'seeked') nvSeeked();
  if (d.pw !== NV.pw) {
    NV.pw = d.pw;
    nvFire(d.pw ? 'play' : 'pause');
  }
  if (d.st !== NV.st) {
    NV.st = d.st;
    if (d.st === 2) nvFire('waiting');
    if (d.st === 3 && NV.seeking) nvSeeked();
    if (d.st === 4) nvFire('ended');
  }
  if (d.pl !== NV.pl) {
    NV.pl = d.pl;
    if (d.pl) nvFire('playing');
  }
  if (d.e === 'error') nvError(d.err || 'error');
  else if (d.e === 'time' && d.pl) nvFire('timeupdate');
}
if (nvOk()) XP().addListener('nv', nvEvt);
// the engine's audio and subtitle tracks, for the Audio / Subtitles menu
async function nvTracks() {
  try {
    return await XP().nvTracks();
  } catch (e) {
    return { audio: [], text: [] };
  }
}
// online subtitles go to the engine, which shows them under the app's controls
function nvSub(vtt, lang, label) {
  return XP()
    .nvSub({ vtt, lang, label })
    .catch(() => {});
}
// test builds only: lets the automatic test on an Android emulator drive the app
if (LS.get('ap.devhook', false)) window.__ap = { S, NV: () => NV, v, enterFsFor, play, subsLoad, idbSet };

/* ---------- no sound on the web player ---------- */
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
  el.innerHTML =
    `<small>${ic('mute')} ${t('No sound in this video')}</small>` +
    `<p>${esc(t('Its sound is in a format this player cannot play (usually Dolby AC3/E-AC3 or DTS). Another player plays it.'))}</p>` +
    `<div class="row"><button class="btn p" id="naOpen">${ic('ext')} ${NATIVE ? t('Open in VLC or another player') : t('Copy the link for VLC')}</button>` +
    `<button class="btn" id="naX">${t('Close')}</button></div>`;
  el.hidden = false;
  $('#naOpen').onclick = () => {
    el.hidden = true;
    openElsewhere();
  };
  $('#naX').onclick = () => (el.hidden = true);
}
function audTick() {
  const c = S.cur;
  if (!c || NV.on || !('webkitAudioDecodedByteCount' in v)) return;
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
  if (v.webkitAudioDecodedByteCount === 0 && v.webkitVideoDecodedByteCount > 0) audBox(true);
}
v.addEventListener('timeupdate', audTick);
v.addEventListener('emptied', () => audBox(false));
