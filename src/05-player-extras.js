/* ---------- player extras: pause, seek, resume, tracks, aspect, PiP ---------- */
const POS = LS.get('ap.pos', {}),
  DUR = LS.get('ap.dur', {});
let posT = 0;
// Netflix-style memory: what was finished (SEEN), when each title was last watched (WTS), last episode per series (SLAST)
const epLabel = e => {
  const m = /S(\d+)E(\d+)\s*$/.exec((e && e.name) || '');
  return m ? `${LANG === 'pt' ? 'T' : 'S'}${m[1]}:E${m[2]}` : '';
};
const SEEN = LS.get('ap.seen', {}),
  WTS = LS.get('ap.wts', {}),
  SLAST = LS.get('ap.slast', {});
const saveWatch = () => {
  LS.set('ap.seen', SEEN);
  LS.set('ap.wts', WTS);
  LS.set('ap.slast', SLAST);
};
function markSeen(c, on) {
  if (!c) return;
  if (on === false) {
    delete SEEN[c.key];
  } else {
    SEEN[c.key] = Date.now();
    delete POS[c.key];
    LS.set('ap.pos', POS);
  }
  WTS[c.key] = Date.now();
  saveWatch();
}
const isVodNow = () => S.cur && S.cur.kind !== 'live';
const fmtT = x => {
  if (!isFinite(x) || x < 0) return '0:00';
  x = Math.floor(x);
  const h = Math.floor(x / 3600),
    m = Math.floor((x % 3600) / 60),
    s2 = x % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s2).padStart(2, '0');
};
function savePos() {
  if (!isVodNow() || !isFinite(v.duration) || v.duration < 60) return;
  const c = S.cur,
    k = c.key;
  WTS[k] = Date.now();
  if (c.ser) SLAST[c.ser] = { k, t: Date.now() };
  if (v.currentTime > v.duration - Math.max(30, v.duration * 0.06)) {
    delete POS[k];
    if (!SEEN[k]) {
      SEEN[k] = Date.now();
      if (c.ser)
        try {
          nextEpisode();
        } catch (e) {}
    }
  } else {
    POS[k] = Math.floor(v.currentTime);
    DUR[k] = Math.floor(v.duration);
    LS.set('ap.dur', DUR);
  }
  saveWatch();
  const ks = Object.keys(POS);
  if (ks.length > 300) delete POS[ks[0]];
  LS.set('ap.pos', POS);
}
v.addEventListener('timeupdate', () => {
  if (!isVodNow()) return;
  if (!seeking) $('#seek').value = v.duration ? Math.round((v.currentTime / v.duration) * 1000) : 0;
  $('#tCur').textContent = fmtT(v.currentTime);
  $('#tDur').textContent = fmtT(v.duration);
  if (Date.now() - posT > 5000) {
    posT = Date.now();
    savePos();
  }
});
v.addEventListener('ended', () => {
  if (isVodNow()) {
    markSeen(S.cur);
    if (S.cur.ser) SLAST[S.cur.ser] = { k: S.cur.key, t: Date.now() };
    saveWatch();
  }
  const nx = nextEpisode();
  if (nx) {
    toast(t('Next episode') + ': ' + nx.name);
    setTimeout(() => {
      if (S.cur && S.cur.ser) enterFsFor(nx);
    }, 1500);
  }
});
v.addEventListener('loadedmetadata', () => {
  if (isVodNow() && POS[S.cur.key] > 10 && isFinite(v.duration) && POS[S.cur.key] < v.duration - 30) {
    v.currentTime = POS[S.cur.key];
    toast(t('Resume') + ' ' + fmtT(POS[S.cur.key]));
  }
});
v.addEventListener('pause', () => {
  $('#cPlay').innerHTML = ic('play');
  screenEl.classList.add('paused');
  if (fsOn) showOv(true);
  savePos();
});
v.addEventListener('play', () => {
  $('#cPlay').innerHTML = ic('pause');
  screenEl.classList.remove('paused');
  if (fsOn) showOv();
});
let seeking = false;
const sk = $('#seek');
sk.oninput = () => {
  seeking = true;
  if (v.duration) $('#tCur').textContent = fmtT((sk.value / 1000) * v.duration);
};
sk.onchange = () => {
  if (v.duration) v.currentTime = (sk.value / 1000) * v.duration;
  seeking = false;
};
const seekBy = d => {
  if (isFinite(v.duration)) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + d));
};
const togglePlay = () => {
  if (v.paused) v.play().catch(() => {});
  else v.pause();
};
$('#cPlay').onclick = togglePlay;
$('#cBack').onclick = () => seekBy(-10);
$('#cFwd').onclick = () => seekBy(10);
const ASP = [
  ['contain', 'Fit'],
  ['cover', 'Fill'],
  ['fill', 'Stretch']
];
let aspI = 0;
$('#cAsp').onclick = () => {
  aspI = (aspI + 1) % ASP.length;
  v.style.objectFit = ASP[aspI][0];
  toast(t(ASP[aspI][1]));
};
const openTracks = () => {
  const au = [],
    su = [];
  let cur = { a: -1, s: -1 };
  if (hls) {
    (hls.audioTracks || []).forEach((x, i) => au.push({ i, n: x.name || x.lang || 'Audio ' + (i + 1) }));
    (hls.subtitleTracks || []).forEach((x, i) => su.push({ i, n: x.name || x.lang || 'Sub ' + (i + 1) }));
    cur = { a: hls.audioTrack, s: hls.subtitleTrack };
  } else {
    if (v.audioTracks && v.audioTracks.length > 1)
      [...v.audioTracks].forEach((x, i) => {
        au.push({ i, n: x.label || x.language || 'Audio ' + (i + 1) });
        if (x.enabled) cur.a = i;
      });
    [...v.textTracks]
      .filter(x => x.kind === 'subtitles' || x.kind === 'captions')
      .forEach((x, i) => {
        su.push({ i, n: x.label || x.language || 'Sub ' + (i + 1) });
        if (x.mode === 'showing') cur.s = i;
      });
  }
  const vodNow = S.cur && S.cur.kind !== 'live' && S.cur.kind !== 'catchup';
  if (au.length < 2 && !su.length && !vodNow) {
    toast(t('No extra audio or subtitles'));
    return;
  }
  const btn = (kind, i, n, on) =>
    `<button data-k="${kind}" data-i="${i}" class="${on ? 'on' : ''}"><span>${esc(n)}</span></button>`;
  openDlg(
    `<h2>${t('Audio')} / ${t('Subtitles')}</h2>` +
      (au.length > 1
        ? `<label>${t('Audio')}</label><div class="catlist">${au.map(x => btn('a', x.i, x.n, x.i === cur.a)).join('')}</div>`
        : '') +
      (su.length
        ? `<label>${t('Subtitles')}</label><div class="catlist">${btn('s', -1, t('Off'), cur.s === -1)}${su.map(x => btn('s', x.i, x.n, x.i === cur.s)).join('')}</div>`
        : '') +
      (vodNow ? onlineSubsHtml(S.cur) : '') +
      `<div class="row"><button class="btn" id="dx">OK</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  if (vodNow) wireOnlineSubs(S.cur, openTracks);
  $$('.catlist button[data-k]', dlg).forEach(
    b =>
      (b.onclick = () => {
        const i = +b.dataset.i;
        if (b.dataset.k === 'a') {
          if (hls) hls.audioTrack = i;
          else [...v.audioTracks].forEach((x, n) => (x.enabled = n === i));
        } else {
          if (hls) hls.subtitleTrack = i;
          else
            [...v.textTracks]
              .filter(x => x.kind === 'subtitles' || x.kind === 'captions')
              .forEach((x, n) => (x.mode = n === i ? 'showing' : 'disabled'));
        }
        dlg.close();
      })
  );
};
$('#cTrk').onclick = openTracks;
