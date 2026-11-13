/* ---------- "no sound" check ----------
   Many films and episodes come as MKV files with Dolby (AC3 / E-AC3) or DTS sound. The browser, the Android WebView and
   the Windows app play the picture but cannot decode that sound, so the video runs silent and nothing says why.
   A few seconds into playback, if the player has decoded no sound at all, say so and offer another player (VLC, MX
   Player, Just Player… decode those formats). Uses webkitAudioDecodedByteCount (Chrome, Android WebView, Edge, Electron);
   where it does not exist the check does nothing. */
var audChk = { key: '', t0: -1, done: false };
Object.assign(PT, {
  'No sound in this video': 'Este vídeo não tem som aqui',
  'Its sound is in a format this player cannot play (usually Dolby AC3/E-AC3 or DTS). Another player plays it.':
    'O som vem num formato que este leitor não consegue tocar (normalmente Dolby AC3/E-AC3 ou DTS). Noutro leitor ouve-se.',
  'Open in VLC or another player': 'Abrir no VLC ou noutro leitor',
  'Copy the link for VLC': 'Copiar o link para o VLC'
});
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
  if (!c || !('webkitAudioDecodedByteCount' in v)) return;
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
