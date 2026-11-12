/* ---------- multi-screen: 2 or 4 live channels at once, sound from the one you pick ----------
   Each picture is its own small player (lower quality is chosen automatically to save bandwidth).
   Remote: arrows move between pictures; OK gives that picture the sound; OK again changes its channel; Back closes. */
const MV = { on: false, n: 4, aud: 0, cells: [] };
function mvPlay(cell) {
  const c = cell.c,
    el = cell.el;
  if (!c || !el) return;
  const cu = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url,
    url = proxied(cu),
    isHls = /m3u8/i.test(cu);
  el.muted = MV.cells.indexOf(cell) !== MV.aud;
  (async () => {
    try {
      if (isHls) {
        if (!window.Hls && (NATIVE || !el.canPlayType('application/vnd.apple.mpegurl')))
          await loadScript('js/hls.min.js');
        if (window.Hls && Hls.isSupported()) {
          const h = (cell.h = new Hls(
            Object.assign(
              { liveSyncDurationCount: 6, maxBufferLength: 30, backBufferLength: 10, capLevelToPlayerSize: true },
              nativeHttp() ? { loader: NativeLoader } : {}
            )
          ));
          h.loadSource(url);
          h.attachMedia(el);
          h.on(Hls.Events.ERROR, (_, d) => {
            if (!d.fatal || cell.h !== h) return;
            if (d.type === Hls.ErrorTypes.MEDIA_ERROR) h.recoverMediaError();
            else
              setTimeout(() => {
                if (cell.h === h) h.startLoad();
              }, 2000);
          });
        } else el.src = url;
      } else {
        if (!window.mpegts) await loadScript('js/mpegts.min.js');
        if (window.mpegts && mpegts.isSupported()) {
          const m = (cell.m = mpegts.createPlayer(
            { type: 'mpegts', isLive: true, url },
            {
              enableWorker: true,
              enableStashBuffer: true,
              stashInitialSize: 1024 * 1024,
              liveBufferLatencyChasing: false,
              headers: uaHdr(),
              autoCleanupSourceBuffer: true
            }
          ));
          m.attachMediaElement(el);
          m.load();
        } else el.src = url;
      }
      await el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    } catch (e) {}
  })();
}
function mvStop(cell) {
  try {
    if (cell.h) cell.h.destroy();
  } catch (e) {}
  try {
    if (cell.m) cell.m.destroy();
  } catch (e) {}
  cell.h = cell.m = null;
  if (cell.el) {
    cell.el.removeAttribute('src');
    try {
      cell.el.load();
    } catch (e) {}
  }
}
function mvLabel(i) {
  const cell = MV.cells[i],
    b = $(`[data-mv="${i}"]`);
  if (!b) return;
  b.classList.toggle('aud', i === MV.aud && !!cell.c);
  b.classList.toggle('empty', !cell.c);
  $('.mvname', b).innerHTML = cell.c
    ? `${ic(i === MV.aud ? 'vol' : 'mute')} ${esc(cell.c.name)}`
    : `${ic('plus')} ${t('Choose channel')}`;
}
function mvAudio(i) {
  MV.aud = i;
  MV.cells.forEach((x, j) => {
    if (x.el) x.el.muted = j !== i;
    mvLabel(j);
  });
}
function mvBuild() {
  let box = $('#multi');
  if (!box) {
    box = document.createElement('div');
    box.id = 'multi';
    document.body.appendChild(box);
  }
  box.hidden = false;
  box.className = 'mv' + MV.n;
  box.innerHTML = `<div class="mvgrid">${MV.cells
    .slice(0, MV.n)
    .map(
      (x, i) =>
        `<button class="mvcell" data-mv="${i}"><video playsinline muted></video><span class="mvname"></span></button>`
    )
    .join('')}</div>
    <div class="mvbar"><small class="mut">${t('OK: sound from this channel · OK again: change channel')}</small><button class="btn" id="mvN">${ic('stack')} ${MV.n === 4 ? t('2 screens') : t('4 screens')}</button><button class="btn" id="mvX">${ic('close')} ${t('Close')}</button></div>`;
  MV.cells.slice(0, MV.n).forEach((x, i) => {
    x.el = $(`[data-mv="${i}"] video`, box);
    mvLabel(i);
    mvPlay(x);
  });
  $$('[data-mv]', box).forEach(
    b =>
      (b.onclick = () => {
        const i = +b.dataset.mv,
          x = MV.cells[i];
        if (x.c && i !== MV.aud) mvAudio(i);
        else mvPick(i);
      })
  );
  $('#mvX').onclick = mvClose;
  $('#mvN').onclick = () => {
    MV.cells.forEach(mvStop);
    MV.n = MV.n === 4 ? 2 : 4;
    if (MV.aud >= MV.n) MV.aud = 0;
    mvBuild();
  };
  setTimeout(() => {
    const f = $(`[data-mv="${MV.aud}"]`, box);
    if (f) f.focus();
  }, 40);
}
function mvPick(i) {
  const live = S.vis.filter(c => c.kind === 'live'),
    favs = live.filter(c => S.favs.includes(c.key)),
    list = q =>
      (q ? live.filter(c => lname(c).includes(fold(q))) : favs.concat(live.filter(c => !S.favs.includes(c.key)))).slice(
        0,
        150
      );
  openDlg(
    `<h2>${ic('tv')} ${t('Choose channel')}</h2><input id="mvQ" placeholder="${t('Search')}" autocomplete="off"><div class="catlist" id="mvL"></div><div class="row"><button class="btn p" id="dx">${t('Close')}</button></div>`
  );
  const draw = () => {
    const L = list($('#mvQ').value.trim());
    $('#mvL').innerHTML = L.map((c, j) => `<button data-mc="${j}"><span>${esc(c.name)}</span></button>`).join('');
    $$('[data-mc]', dlg).forEach(
      b =>
        (b.onclick = () => {
          const c = L[+b.dataset.mc],
            x = MV.cells[i];
          dlg.close();
          mvStop(x);
          x.c = c;
          mvLabel(i);
          mvAudio(i);
          mvPlay(x);
          const f = $(`[data-mv="${i}"]`);
          if (f) f.focus();
        })
    );
  };
  $('#mvQ').oninput = draw;
  $('#dx').onclick = () => dlg.close();
  draw();
  setTimeout(() => {
    const f = $('[data-mc]', dlg) || $('#mvQ');
    if (f) f.focus();
  }, 40);
}
function openMulti(chs) {
  if (S.cur) stopPlayback();
  if (fsOn) doFs(false);
  MV.on = true;
  MV.aud = 0;
  MV.n = (chs || []).filter(Boolean).length > 2 ? 4 : MV.n || 4;
  MV.cells = [0, 1, 2, 3].map(i => ({ c: (chs || [])[i] || null, el: null, h: null, m: null }));
  document.body.classList.add('mvOn');
  mvBuild();
  toast(t('Each picture uses one connection of your IPTV account'));
}
function mvClose() {
  MV.cells.forEach(mvStop);
  MV.on = false;
  const box = $('#multi');
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
  document.body.classList.remove('mvOn');
  render();
}
Object.assign(PT, {
  'Multi-screen': 'Multi-ecrã',
  'Watch several games at once': 'Ver vários jogos ao mesmo tempo',
  'Choose channel': 'Escolher canal',
  '2 screens': '2 ecrãs',
  '4 screens': '4 ecrãs',
  'OK: sound from this channel · OK again: change channel': 'OK: som deste canal · OK outra vez: trocar de canal',
  'Each picture uses one connection of your IPTV account': 'Cada imagem usa uma ligação da tua conta de IPTV'
});
