/* ---------- player ---------- */
const v = $('#v');
let hls = null,
  mpg = null,
  osdT,
  numBuf = '',
  numT,
  retried = false,
  rec = null;
function destroyPlayer() {
  if (NV.on) nvStop(); // films and series on Android: the native engine (src/32-native-video.js)
  $$('#v track[data-os]').forEach(x => x.remove());
  if (hls) {
    try {
      hls.destroy();
    } catch (e) {}
    hls = null;
  }
  if (mpg) {
    try {
      mpg.destroy();
    } catch (e) {}
    mpg = null;
  }
  v.removeAttribute('src');
  try {
    v.load();
  } catch (e) {}
}
const spin = on => {
  $('#spin').hidden = !on;
};
function showMsg(title, text, retry) {
  spin(false);
  const m = $('#msg');
  m.innerHTML = `<b>${esc(title)}</b><p>${text}</p><div>${retry ? `<button class="btn p" id="mRetry">${t('Retry')}</button> ` : ''}<button class="btn" id="mBug">${t('Report a problem')}</button></div>`;
  S.lastErr = (title + ' · ' + String(text).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').slice(0, 280);
  $('#mBug').onclick = () => bugDialog();
  m.hidden = false;
  const b = $('#mRetry');
  if (b) b.onclick = () => play(S.cur, true);
  if (retry && S.cur) {
    const c = S.cur,
      u = proxied(c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url);
    probe(u).then(r => {
      if (S.cur === c && !m.hidden) {
        const p = m.querySelector('p');
        if (p) {
          const cf = /probe 40[13] .*error code: ?10\d\d/.test(r);
          if (cf)
            p.innerHTML =
              LANG === 'pt'
                ? 'A Cloudflare (o ajudante) não consegue abrir este servidor, porque ele usa um endereço IP. Na versão web isto não tem solução. Usa a app Android.'
                : 'Cloudflare (the helper) cannot open this server because it uses a raw IP address. The web version cannot fix this. Use the Android app.';
          p.insertAdjacentHTML('beforeend', `<br><small style="opacity:.7;word-break:break-all">${esc(r)}</small>`);
        }
      }
    });
  }
}
async function probe(u) {
  try {
    const ac = new AbortController(),
      tm = setTimeout(() => ac.abort(), 8000),
      r = await fetch(u, { signal: ac.signal, headers: { Range: 'bytes=0-399' } }),
      ct = r.headers.get('content-type') || '';
    let txt = '';
    try {
      const v2 = (await r.body.getReader().read()).value || new Uint8Array();
      txt = new TextDecoder().decode(v2.slice(0, 90)).replace(/[^\x20-\x7e]/g, '·');
    } catch (e) {}
    clearTimeout(tm);
    ac.abort();
    return `probe ${r.status} ${ct} "${txt}"`;
  } catch (e) {
    return 'probe failed: ' + ((e && e.message) || e);
  }
}
function whyHtml(url, viaHelper, detail) {
  const pt = LANG === 'pt',
    mixed = location.protocol === 'https:' && /^http:/i.test(url) && !viaHelper && !NATIVE;
  const d = `<br><small style="opacity:.7">${esc((detail ? detail + ' · ' : '') + VER + ' · helper ' + (S.set.proxy ? (S.set.proxy.includes('{url}') ? 'on' : 'missing {url}') : 'off') + (viaHelper ? ' · via helper' : ''))}</small>`;
  if (mixed)
    return (
      (pt
        ? 'Esta emissão usa <code>http</code> e esta página usa <code>https</code>, por isso o navegador bloqueia. Em Definições, põe o <b>link auxiliar</b> (Cloudflare), ou usa a app Android.'
        : 'This stream uses plain <code>http</code> but this page is <code>https</code>, so the browser blocks it. In Settings set the <b>helper link</b> (Cloudflare), or use the Android app.') +
      d
    );
  if (viaHelper)
    return (
      (pt
        ? 'O ajudante não conseguiu obter este canal. O fornecedor pode ter bloqueado o ajudante, o canal pode estar offline, ou o limite gratuito da Cloudflare foi atingido.'
        : 'The helper could not fetch this channel. The provider may block the helper, the channel may be offline, or the free Cloudflare limit was reached.') +
      d
    );
  return (
    (pt
      ? 'O servidor pode bloquear páginas web (CORS), o formato pode não ser suportado ou o canal está offline.'
      : 'The server may block web pages (CORS), the format may be unsupported, or the channel is offline.') + d
  );
}
/* Colours per channel: some TV boxes show certain HD streams with red and blue swapped (red shirts look blue).
   1 = swap red and blue back, 2 = compatible drawing (the video goes through the GPU, which fixes it on some boxes). */
const COLFIX = LS.get('ap.colfix', {});
document.body.insertAdjacentHTML(
  'beforeend',
  '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="rbSwap" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 1 0 0 0 1 0 0 0 1 0 0 0 0 0 0 0 1 0"/></filter></svg>'
);
function applyColor(c) {
  const m = (c && COLFIX[c.key]) || 0;
  v.style.filter = m === 1 ? 'url(#rbSwap)' : m === 2 ? 'saturate(1.001)' : '';
}
Object.assign(PT, {
  Colours: 'Cores',
  Normal: 'Normal',
  'Swap red / blue': 'Trocar vermelho / azul',
  Compatible: 'Compatível',
  'Colours wrong? Try the options below (saved for this channel).':
    'Cores estranhas? Experimenta as opções (fica guardado para este canal).'
});
async function play(c, isRetry) {
  if (!c) return;
  if (!isRetry && !(await planoPode())) {
    planoShow(); // free day over and not paid
    return;
  }
  if (S.cur && S.cur.key !== c.key) S.last = S.cur.key;
  if (!isRetry) {
    retried = false;
  }
  if (S.cur && S.cur.key !== c.key) LS.set('ap.last', S.cur.key);
  S.cur = c;
  applyColor(c);
  LS.set('ap.cur', c.key);
  S.recent = [c.key].concat(S.recent.filter(k => k !== c.key)).slice(0, 30);
  LS.set('ap.recent', S.recent);
  S.dbg = '';
  stopRec(true);
  destroyPlayer();
  armStart(c, isRetry);
  $('#screen').classList.toggle('vod', c.kind !== 'live');
  $('#msg').hidden = true;
  spin(true);
  showOsd(c);
  showInfo(c);
  updateFavBtn();
  $$('#list .ch').forEach(r => r.classList.toggle('on', r.dataset.k === c.key));
  const cu = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url,
    url = c.local ? cu : proxied(cu),
    isHls = /m3u8/i.test(cu),
    isTs = (c.kind === 'live' || c.kind === 'catchup') && !isHls && !/\.(mp4|mkv|webm|avi|mov)(\?|$)/i.test(cu),
    ST = STAB[stabLevel(c)];
  try {
    if (nvFor(c))
      await nvStart(c, cu); // Android films and series: native engine, any sound format (src/32-native-video.js)
    else if (isHls) {
      if (!window.Hls && (NATIVE || !v.canPlayType('application/vnd.apple.mpegurl'))) await loadScript('js/hls.min.js'); // in the app, hls.js + native HTTP is more reliable than the WebView's own HLS
      if (window.Hls && Hls.isSupported()) {
        hls = new Hls(
          Object.assign(
            {
              lowLatencyMode: false,
              liveSyncDurationCount: ST.sync,
              liveMaxLatencyDurationCount: ST.max,
              maxBufferLength: ST.buf,
              maxMaxBufferLength: ST.mbuf,
              backBufferLength: 20,
              startFragPrefetch: true,
              nudgeMaxRetry: 6,
              fragLoadPolicy: {
                default: {
                  maxTimeToFirstByteMs: 10000,
                  maxLoadTimeMs: 30000,
                  timeoutRetry: { maxNumRetry: 4, retryDelayMs: 0, maxRetryDelayMs: 0 },
                  errorRetry: { maxNumRetry: 6, retryDelayMs: 500, maxRetryDelayMs: 4000, backoff: 'exponential' }
                }
              },
              manifestLoadPolicy: {
                default: {
                  maxTimeToFirstByteMs: 12000,
                  maxLoadTimeMs: 15000,
                  timeoutRetry: { maxNumRetry: 1, retryDelayMs: 0, maxRetryDelayMs: 0 },
                  errorRetry: { maxNumRetry: 0, retryDelayMs: 0, maxRetryDelayMs: 0 }
                }
              },
              playlistLoadPolicy: {
                default: {
                  maxTimeToFirstByteMs: 12000,
                  maxLoadTimeMs: 15000,
                  timeoutRetry: { maxNumRetry: 3, retryDelayMs: 0, maxRetryDelayMs: 0 },
                  errorRetry: { maxNumRetry: 4, retryDelayMs: 1000, maxRetryDelayMs: 8000, backoff: 'exponential' }
                }
              }
            },
            nativeHttp() ? { loader: NativeLoader } : {}
          )
        );
        hls.loadSource(url);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_, d) => {
          S.dbg =
            (d.details || '') +
            (d.reason ? ' ' + d.reason : '') +
            (d.error && d.error.message ? ' ' + d.error.message : '');
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR && !retried && !/manifest/i.test(d.details || '')) {
            retried = true;
            hls.startLoad();
          } else if (d.type === Hls.ErrorTypes.MEDIA_ERROR && !retried) {
            retried = true;
            hls.recoverMediaError();
          } else if (!c.useTs && /\/live\/[^/]+\/[^/]+\/[^/]+\.m3u8/i.test(c.url)) {
            c.useTs = true;
            play(c, true);
          } else
            showMsg(
              t('Could not play this'),
              whyHtml(
                c.url,
                c.url !== url,
                (d.details || '') + (d.response && d.response.code ? ' · HTTP ' + d.response.code : '')
              ),
              true
            );
        });
      } else v.src = url;
    } else if (isTs) {
      if (!window.mpegts) await loadScript('js/mpegts.min.js');
      if (window.mpegts && mpegts.isSupported()) {
        mpg = mpegts.createPlayer(
          { type: 'mpegts', isLive: c.kind === 'live', url },
          {
            enableWorker: true,
            enableStashBuffer: true,
            stashInitialSize: ST.stash * 1024,
            lazyLoad: false,
            liveBufferLatencyChasing: false,
            liveSync: false,
            headers: uaHdr(),
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 60,
            autoCleanupMinBackwardDuration: 30
          }
        );
        mpg.attachMediaElement(v);
        mpg.load();
        mpg.on(mpegts.Events.ERROR, (a, b) => {
          const was = c.useTs;
          c.useTs = false;
          showMsg(t('Could not play this'), whyHtml(c.url, c.url !== url, String(b || a || '')), true);
        });
      } else v.src = url;
    } else v.src = url;
    await v.play().catch(err => {
      if (err && err.name === 'NotAllowedError') {
        v.muted = true;
        $('#cMute').innerHTML = ic('mute');
        v.play().catch(() => {});
        toast(t('Tap for sound'));
      }
    });
    if (c.kind !== 'live' && c.kind !== 'catchup') autoSubs(c);
    if (c.kind === 'live' && NATIVE && Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.share)
      Capacitor.Plugins.ExtPlayer.share({ url: cu, name: c.name || '', ua: uaHdr()['User-Agent'] || '' }).catch(
        () => {}
      ); // TV home screen background
  } catch (e) {
    showMsg(t('Could not play this'), whyHtml(c.url, false, String((e && e.message) || e)), true);
  }
}
/* Start timeout: a channel that is off air (an event channel before or after the game, a dead stream) often answers
   but never sends a picture, so the spinner turned forever. After 20 s without a first frame, say so and offer the next channel. */
let startT = 0,
  startC = null;
function armStart(c, isRetry) {
  if (isRetry && startT && startC === c) return; // a retry of the same channel keeps the first deadline
  clearTimeout(startT);
  startT = 0;
  startC = c;
  if (!c || c.kind === 'vod' || c.kind === 'series') return;
  startT = setTimeout(() => {
    startT = 0;
    if (S.cur !== c || v.readyState >= 3 || !$('#msg').hidden) return;
    destroyPlayer();
    clearTimeout(stallT);
    stallT = null; // stop the retries, or they would hide the message again
    showMsg(
      t('This channel is not sending video right now'),
      esc(
        t('It may only broadcast during the event, or the server is down. Try again later or watch another channel.')
      ) + (c.kind === 'live' ? `<br><button class="btn" id="mNext">${t('Next channel')}</button>` : ''),
      true
    );
    const nx = $('#mNext');
    if (nx) nx.onclick = () => zap(1);
  }, 20000);
}
Object.assign(PT, {
  'This channel is not sending video right now': 'Este canal não está a emitir agora',
  'It may only broadcast during the event, or the server is down. Try again later or watch another channel.':
    'Pode só emitir durante o evento, ou o servidor está em baixo. Tenta mais tarde ou vê outro canal.',
  'Next channel': 'Canal seguinte'
});
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
v.addEventListener('playing', () => {
  spin(false);
  $('#msg').hidden = true;
  if (v.animate && !RM && v.currentTime < 3)
    v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
});
v.addEventListener('waiting', () => {
  if (S.cur) spin(true);
  armStall();
  if (!waitT0 && v.currentTime > 2) waitT0 = Date.now();
});
/* Live stall watchdog: if a live channel stays frozen, jump to the live edge (HLS) or reconnect (TS) instead of waiting forever. */
let stallT = null,
  stallN = 0,
  waitT0 = 0;
/* Live stability: crowded IPTV servers (big games) deliver late, so the picture stops. Playing a little further behind
   the live edge with a bigger buffer rides over those gaps. "auto" starts normal and, if a channel keeps stopping,
   buffers more; if it still stops, it switches Xtream channels from HLS to the direct TS stream. */
const STAB = {
  normal: { sync: 4, max: 12, buf: 30, mbuf: 60, stash: 512, wd: 6000 },
  stable: { sync: 6, max: 18, buf: 60, mbuf: 120, stash: 2048, wd: 9000 },
  max: { sync: 8, max: 24, buf: 90, mbuf: 180, stash: 4096, wd: 12000 }
};
let stabBoost = { k: '', lvl: '' },
  stallLog = [];
function stabLevel(c) {
  const s = S.set.stab || 'auto';
  if (STAB[s]) return s;
  return c && stabBoost.k === c.key ? stabBoost.lvl : 'normal';
}
function noteStall() {
  const c = S.cur;
  if (!c || c.kind !== 'live' || (S.set.stab || 'auto') !== 'auto') return;
  const now = Date.now();
  stallLog = stallLog.filter(x => x.k === c.key && now - x.t < 180000);
  stallLog.push({ k: c.key, t: now });
  if (stallLog.length < 3) return;
  const lvl = stabLevel(c);
  stallLog = [];
  if (lvl === 'normal') {
    stabBoost = { k: c.key, lvl: 'stable' };
    toast(t('The stream keeps stopping: buffering more'));
    play(c, true);
  } else if (lvl === 'stable') {
    stabBoost = { k: c.key, lvl: 'max' };
    if (c.sid && /\.m3u8(\?|$)/i.test(c.url) && !c.useTs) {
      c.useTs = true;
      toast(t('The stream keeps stopping: trying the direct stream'));
    } else toast(t('The stream keeps stopping: buffering more'));
    play(c, true);
  }
}
Object.assign(PT, {
  'Live stream stability': 'Estabilidade do direto',
  'Automatic (recommended)': 'Automática (recomendado)',
  'Normal (less delay)': 'Normal (menos atraso)',
  'Stable (a few seconds more delay)': 'Estável (mais uns segundos de atraso)',
  'Maximum (for very busy servers)': 'Máxima (para servidores muito cheios)',
  'The stream keeps stopping: buffering more': 'O canal está sempre a parar: a guardar mais vídeo de reserva',
  'The stream keeps stopping: trying the direct stream': 'O canal está sempre a parar: a experimentar a ligação direta'
});
function armStall() {
  clearTimeout(stallT);
  stallT = null;
  if (!S.cur || S.cur.kind !== 'live') return;
  const k = S.cur.key,
    t0 = v.currentTime;
  stallT = setTimeout(() => {
    stallT = null;
    if (!S.cur || S.cur.key !== k || v.paused || v.currentTime > t0 + 0.5) return;
    stallN++;
    if (NV.on) nvCmd('reload');
    else if (hls) {
      const edge = hls.liveSyncPosition;
      if (edge && edge > v.currentTime + 1) v.currentTime = edge;
      else {
        hls.stopLoad();
        hls.startLoad();
      }
    } else if (mpg) {
      try {
        mpg.unload();
        mpg.load();
        mpg.play();
      } catch (e) {
        play(S.cur, true);
      }
    } else play(S.cur, true);
    if (stallN < 4) armStall();
  }, STAB[stabLevel(S.cur)].wd);
}
v.addEventListener('playing', () => {
  clearTimeout(startT);
  startT = 0;
  clearTimeout(stallT);
  stallT = null;
  stallN = 0;
  retried = false;
  if (waitT0 && Date.now() - waitT0 > 1500) noteStall();
  waitT0 = 0;
});
v.addEventListener('error', () => {
  if (S.cur && v.getAttribute('src'))
    showMsg(
      t('Could not play this'),
      whyHtml(
        S.cur.url,
        proxied(S.cur.url) !== S.cur.url,
        (v.error ? 'media error ' + v.error.code + (v.error.message ? ' ' + v.error.message : '') : '') +
          (S.dbg ? ' · ' + S.dbg : '')
      ),
      true
    );
});
function showOsd(c) {
  const o = $('#osd');
  if (o && o.animate && !RM)
    o.animate(
      [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'none' }
      ],
      { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' }
    );
  const n = shownNum(c);
  $('#osdN').innerHTML = seg(n);
  $('#osdT').textContent = c.name;
  $('#osdS').textContent = c.group || '';
  liveBar(c);
  if (fsOn) showOv();
}
function liveBar(c) {
  const nn = c.kind === 'live' ? nowNext(c) : null;
  $('#liveBar').hidden = !(nn && nn.now);
  if (nn && nn.now) {
    $('#lbNow').innerHTML = `<b>${hm(nn.now.s)}</b> ${esc(nn.now.t)}`;
    $('#lbPb').style.width =
      Math.max(0, Math.min(100, Math.round(((Date.now() - nn.now.s) / (nn.now.e - nn.now.s)) * 100))) + '%';
    $('#lbNext').innerHTML = nn.next ? `<b>${hm(nn.next.s)}</b> ${esc(nn.next.t)}` : '';
  }
}
function showInfo(c) {
  const box = $('#info');
  if (!box || c.kind !== 'live') return;
  const l = epgFor(c),
    n = Date.now(),
    up = l ? l.filter(p => p.e > n).slice(0, 8) : [],
    past = l && c.arch ? l.filter(p => p.e <= n && canCatch(c, p)).slice(-6) : [];
  box.innerHTML =
    `<div class="ihead"><span class="lgw">${logoHtml(c)}</span><div><b><em>${seg(shownNum(c))}</em> ${esc(c.name)}</b><small>${esc(c.group || '')}</small></div><button class="ib" id="iList" aria-label="${t('Add to list')}">${ic('stack')}</button><button class="ib" id="iFs" aria-label="${t('Full screen')}">${ic('expand')}</button></div>` +
    (past.length
      ? `<div class="epg past">${past.map(p => `<button data-ps="${p.s}">${ic('archive')}<time>${hm(p.s)}</time><span>${esc(p.t)}</span></button>`).join('')}</div>`
      : '') +
    (up.length
      ? `<div class="epg">${up.map(p => `<div class="${p.s <= n ? 'now' : ''}"><time>${hm(p.s)}</time><span>${esc(p.t)}</span>${p.s <= n ? `<i style="width:${Math.round(((n - p.s) / (p.e - p.s)) * 100)}%"></i>` : ''}</div>`).join('')}</div>`
      : `<p class="mut">${t('No programme guide for this channel')}</p>`);
  $('#iFs').onclick = enterFs;
  $('#iList').onclick = () => addToListDialog(c);
  $$('#info [data-ps]').forEach(
    b =>
      (b.onclick = () => {
        const p = l.find(x => x.s === +b.dataset.ps);
        if (p) playCatch(c, p);
      })
  );
}
function zapList() {
  const m = S.mode;
  S.mode = 'live';
  const g = S.group;
  S.group = S.gsel.live;
  const l = baseList().filter(c => c.kind === 'live');
  S.group = g;
  S.mode = m;
  return l.length ? l : S.channels.filter(c => c.kind === 'live');
}
function zap(dir) {
  const l = zapList();
  if (!l.length) return;
  let i = S.cur ? l.findIndex(c => c.key === S.cur.key) : -1;
  i = i < 0 ? (dir > 0 ? 0 : l.length - 1) : (i + dir + l.length) % l.length;
  play(l[i]);
  const r = $(`#list .ch[data-k="${l[i].key}"]`);
  if (r) r.scrollIntoView({ block: 'nearest' });
}
function byNumber(n) {
  if (S.set.numberMode === 'favs' && favLive().length) return favLive()[n - 1];
  return S.byNum[n];
}
function numKey(d) {
  numBuf = (numBuf + d).slice(0, 4);
  const n = $('#num');
  n.hidden = false;
  const c = byNumber(+numBuf);
  n.innerHTML = `${seg(numBuf.padStart(3, ' ').replace(/ /g, '-'))}<small>${c ? esc(c.name) : t('No channel')}</small>`;
  clearTimeout(numT);
  numT = setTimeout(commitNum, 1500);
}
function commitNum() {
  clearTimeout(numT);
  const n = +numBuf;
  numBuf = '';
  $('#num').hidden = true;
  if (!n && n !== 0) return;
  const c = byNumber(n);
  if (!c) {
    toast(t('No channel') + ' ' + n);
    return;
  }
  if (fsOn || (S.view === 'browse' && S.mode === 'live')) play(c);
  else enterFsFor(c);
}
function lastChannel() {
  const k = LS.get('ap.last', ''),
    c = S.byKey[S.last || k];
  if (c && (!S.cur || c.key !== S.cur.key)) play(c);
  else toast(t('Last channel') + ' —');
}

/* ---------- recording (browser capture; works only when the stream allows it) ---------- */
function stopRec(silent) {
  if (!rec) return;
  const r = rec;
  rec = null;
  try {
    r.mr.stop();
  } catch (e) {}
  $('#cRec').classList.remove('rec');
  if (silent) r.silent = true;
}
function toggleRec() {
  if (rec) {
    stopRec();
    return;
  }
  if (NV.on) {
    toast(t('Not available with this video'));
    return;
  }
  try {
    const st = (v.captureStream || v.mozCaptureStream).call(v),
      types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'],
      mt = types.find(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x));
    if (!mt) throw new Error('no recorder');
    const mr = new MediaRecorder(st, { mimeType: mt }),
      chunks = [],
      name = (S.cur ? S.cur.name : 'recording').replace(/[^\w-]+/g, '_');
    mr.ondataavailable = e => {
      if (e.data.size) chunks.push(e.data);
    };
    mr.onstop = () => {
      if (!chunks.length) return;
      const b = new Blob(chunks, { type: 'video/webm' }),
        a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `${name}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 8000);
      toast(t('Recording saved'));
    };
    mr.start(1000);
    rec = { mr };
    $('#cRec').classList.add('rec');
    toast(t('Recording…'));
  } catch (e) {
    toast(t('Recording is not possible for this stream'));
  }
}
