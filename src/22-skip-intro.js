/* ---------- skip intro: the app learns where each series' opening ends from where you jump forward at the start of an
   episode (one long jump or several quick ones), and then offers "Skip intro" in the other episodes, like Netflix ---------- */
const INTRO = LS.get('ap.intro', {});
let introLastT = 0,
  introChain = null,
  introOff = '',
  introSelf = false;
function introTick() {
  let b = $('#skipIntro');
  const c = S.cur,
    w = c && c.ser && INTRO[c.ser],
    tt = v.currentTime;
  const on = !!w && isVodNow() && introOff !== c.key && w.e - w.s >= 15 && tt >= w.s && tt < w.e - 2;
  if (!on) {
    if (b && !b.hidden) b.hidden = true;
    return;
  }
  if (!b) {
    b = document.createElement('button');
    b.id = 'skipIntro';
    b.className = 'btn';
    b.hidden = true;
    screenEl.appendChild(b);
  }
  if (!b.hidden) return;
  b.innerHTML = `${ic('fwd')} ${t('Skip intro')}`;
  b.hidden = false;
  b.onclick = () => {
    introSelf = true;
    introOff = c.key;
    b.hidden = true;
    v.currentTime = w.e;
  };
  if (S.set.tv) b.focus({ preventScroll: true });
}
v.addEventListener('timeupdate', () => {
  if (!v.seeking) introLastT = v.currentTime;
  introTick();
});
v.addEventListener('seeked', () => {
  const c = S.cur,
    to = v.currentTime,
    from = introLastT,
    now = Date.now();
  introLastT = to;
  if (introSelf) {
    introSelf = false;
    introChain = null;
    return;
  }
  if (!c || !c.ser || !isVodNow() || to <= from) {
    introChain = null;
    return;
  }
  introChain =
    introChain && introChain.ser === c.ser && now - introChain.t < 5000 && Math.abs(from - introChain.to) < 4
      ? Object.assign(introChain, { to, t: now })
      : { ser: c.ser, from, to, t: now, base: INTRO[c.ser] };
  const x = introChain,
    len = x.to - x.from;
  if (x.from < 300 && x.to < 480 && len >= 15 && len <= 200) {
    const o = x.base,
      s0 = Math.max(0, Math.round(x.from) - 2),
      e0 = Math.round(x.to);
    INTRO[c.ser] = o ? { s: Math.round((o.s + s0) / 2), e: Math.round((o.e + e0) / 2) } : { s: s0, e: e0 };
    LS.set('ap.intro', INTRO);
    introOff = c.key;
  }
});
Object.assign(PT, { 'Skip intro': 'Saltar intro' });
