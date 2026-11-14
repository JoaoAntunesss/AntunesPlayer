/* ---------- send to the TV (Chromecast). In the Android app the system's device picker (ExtPlayer.cast);
   in Chrome, Google's Cast sender. Live Xtream channels are sent as HLS, which the Chromecast plays. ---------- */
Object.assign(PT, {
  'Send to TV (Chromecast)': 'Enviar para a TV (Chromecast)',
  'Looking for TVs…': 'A procurar TVs…',
  'Playing on the TV': 'A dar na TV',
  'No Chromecast found on this network': 'Nenhum Chromecast encontrado nesta rede',
  'This cannot be sent to the TV': 'Isto não pode ser enviado para a TV',
  'On now': 'Agora na TV',
  Statistics: 'Estatísticas',
  Downloads: 'Descarregados',
  Download: 'Descarregar',
  Downloaded: 'Descarregado',
  'Downloading…': 'A descarregar…',
  'Download started. Follow it in AntunesFlix → Downloads.':
    'Começou a descarregar. Acompanha em AntunesFlix → Descarregados.',
  'Nothing downloaded yet. Open a film and tap Download, or use More → Download while watching.':
    'Ainda não descarregaste nada. Abre um filme e toca em Descarregar, ou usa Mais → Descarregar enquanto vês.',
  'Delete download': 'Apagar',
  Failed: 'Falhou',
  Stopped: 'Parado',
  'Try again': 'Tentar de novo',
  Stop: 'Parar',
  'New episodes': 'Episódios novos',
  new: 'novos',
  New: 'Novo',
  'New episodes of': 'Há episódios novos de',
  'Open on YouTube': 'Abrir no YouTube',
  'Search the trailer on YouTube': 'Procurar o trailer no YouTube',
  'No trailer from the provider for this title.': 'O fornecedor não tem trailer para este título.'
});
var castable = () =>
  !!S.cur &&
  !S.cur.local &&
  (NATIVE
    ? !!(Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.cast)
    : !DESKTOP && /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent));
function castUrl(c) {
  let u = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url || '';
  if (!/^https?:/.test(u)) return '';
  if (c.kind === 'live' && /\/live\/[^?]+\.ts(\?|$)/.test(u)) u = u.replace(/\.ts(\?|$)/, '.m3u8$1');
  return u;
}
const castType = u =>
  /\.m3u8(\?|$)/i.test(u)
    ? 'application/x-mpegURL'
    : /\.mkv(\?|$)/i.test(u)
      ? 'video/x-matroska'
      : /\.webm(\?|$)/i.test(u)
        ? 'video/webm'
        : /\.ts(\?|$)/i.test(u)
          ? 'video/mp2t'
          : 'video/mp4';
let castP = null;
function castWebLoad() {
  return (
    castP ||
    (castP = new Promise((ok, ko) => {
      if (window.cast && cast.framework) {
        ok();
        return;
      }
      window.__onGCastApiAvailable = a => (a ? ok() : ko(new Error('nocast')));
      const sc = document.createElement('script');
      sc.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      sc.onerror = () => ko(new Error('load'));
      document.head.appendChild(sc);
      setTimeout(() => ko(new Error('timeout')), 12000);
    }).catch(e => {
      castP = null;
      throw e;
    }))
  );
}
async function castCur() {
  const c = S.cur;
  if (!c) return;
  const url = castUrl(c);
  if (!url) {
    toast(t('This cannot be sent to the TV'));
    return;
  }
  const live = c.kind === 'live',
    m = {
      url,
      type: castType(url),
      title: c.name || '',
      image: /^https?:/.test(c.logo || '') ? c.logo : '',
      live,
      pos: live ? 0 : Math.floor(v.currentTime || 0)
    };
  if (NATIVE) {
    try {
      toast(t('Looking for TVs…'));
      const r = await Capacitor.Plugins.ExtPlayer.cast(m);
      if (r && r.ok) {
        v.pause();
        toast(t('Playing on the TV'));
      }
    } catch (e) {
      toast(t('No Chromecast found on this network'));
    }
    return;
  }
  try {
    await castWebLoad();
    const ctx = cast.framework.CastContext.getInstance();
    ctx.setOptions({
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });
    if (!ctx.getCurrentSession()) await ctx.requestSession();
    const ses = ctx.getCurrentSession(),
      mi = new chrome.cast.media.MediaInfo(m.url, m.type);
    mi.streamType = live ? chrome.cast.media.StreamType.LIVE : chrome.cast.media.StreamType.BUFFERED;
    mi.metadata = new chrome.cast.media.GenericMediaMetadata();
    mi.metadata.title = m.title;
    if (m.image) mi.metadata.images = [new chrome.cast.Image(m.image)];
    const rq = new chrome.cast.media.LoadRequest(mi);
    rq.currentTime = m.pos;
    await ses.loadMedia(rq);
    v.pause();
    toast(t('Playing on the TV'));
  } catch (e) {
    if (e === 'cancel' || (e && e.code === 'cancel')) return;
    toast(t('No Chromecast found on this network'));
  }
}
// a cast button next to the others at the top of the player
(() => {
  const b = document.createElement('button');
  b.className = 'ob';
  b.id = 'cCast';
  b.setAttribute('aria-label', 'Chromecast');
  b.innerHTML = ic('cast');
  b.onclick = e => {
    e.stopPropagation();
    castCur();
  };
  const ref = $('#cMore');
  if (ref) ref.before(b);
  const upd = () => {
    b.hidden = !castable();
  };
  v.addEventListener('loadstart', upd);
  upd();
})();

/* ---------- downloads (Android app): films and episodes saved inside the app, to watch offline ---------- */
var dlNative = () => NATIVE && !!(Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.dlStart);
var DLS = {},
  dlT = 0;
async function dlSync() {
  if (!dlNative()) return;
  try {
    const r = await Capacitor.Plugins.ExtPlayer.dlList();
    DLS = {};
    ((r && r.list) || []).forEach(d => (DLS[d.key] = d));
  } catch (e) {}
}
async function dlStart(c, quiet) {
  if (!c || !c.url || !dlNative()) return;
  const ext = (/\.(mp4|mkv|avi|mov|webm|ts)(\?|$)/i.exec(c.url) || [, 'mp4'])[1].toLowerCase();
  const base = c.ser && S.byKey[c.ser] ? S.byKey[c.ser] : c;
  try {
    await Capacitor.Plugins.ExtPlayer.dlStart({
      id: 'd' + Math.abs(hash(c.key)),
      key: c.key,
      url: c.url,
      ua: uaHdr()['User-Agent'] || '',
      name: c.name || '',
      ext,
      logo: base.logo || '',
      ser: c.ser || ''
    });
    if (!quiet) toast(t('Download started. Follow it in AntunesFlix → Downloads.'));
    await dlSync();
    dlPoll();
  } catch (e) {
    toast(t('Failed'));
  }
}
function dlPoll() {
  clearTimeout(dlT);
  const run = Object.values(DLS).some(d => d.state === 'run' || d.state === 'queue');
  if (!run) return;
  dlT = setTimeout(async () => {
    await dlSync();
    if (S.view === 'flix' && S.flixTab === 'dl') renderFlix();
    else if (S.view === 'flix' && S.detail && $('.nfdlb')) renderFxDetail(S.detail);
    dlPoll();
  }, 2000);
}
const fmtMB = b =>
  b >= 1073741824
    ? (b / 1073741824).toFixed(1).replace('.', LANG === 'pt' ? ',' : '.') + ' GB'
    : Math.round(b / 1048576) + ' MB';
function dlHtml() {
  const grp = d => (d.ser ? (S.byKey[d.ser] && S.byKey[d.ser].name) || String(d.name).split(' · ')[0] : '');
  const L = Object.values(DLS).sort(
    (a, b) => grp(a).localeCompare(grp(b)) || String(a.name).localeCompare(String(b.name), undefined, { numeric: true })
  );
  let last = null;
  dlPoll();
  if (!L.length)
    return `<div class="empty"><p>${t('Nothing downloaded yet. Open a film and tap Download, or use More → Download while watching.')}</p></div>`;
  return `<div class="dlist">${L.map(d => {
    const g = grp(d),
      hd = g !== last ? `<h3 class="dlh">${esc(g || t('Films'))}</h3>` : '';
    last = g;
    const pct = d.total ? Math.min(100, Math.round((d.size / d.total) * 100)) : 0,
      st =
        d.state === 'ok'
          ? fmtMB(d.size)
          : d.state === 'run'
            ? `${t('Downloading…')} ${d.total ? pct + '%' : fmtMB(d.size)}`
            : d.state === 'queue'
              ? t('Waiting')
              : d.state === 'stop'
                ? t('Stopped')
                : t('Failed');
    return `${hd}<div class="dli"><button class="dlp" data-dlp="${esc(d.id)}" ${d.state === 'ok' ? '' : 'disabled'}><span class="dlimg">${d.logo ? `<img loading="lazy" src="${esc(d.logo)}" alt="" onerror="this.remove()">` : ''}${d.state === 'ok' ? `<i>${ic('play')}</i>` : ''}</span><span class="dlt"><b>${esc(d.name)}</b><small>${esc(st)}</small>${d.state === 'run' ? `<i class="dlbar"><i style="width:${pct}%"></i></i>` : ''}</span></button>${d.state === 'run' || d.state === 'queue' ? `<button class="btn" data-dls="${esc(d.id)}">${t('Stop')}</button>` : d.state !== 'ok' ? `<button class="btn" data-dlr="${esc(d.id)}">${t('Try again')}</button>` : ''}<button class="ib" data-dld="${esc(d.id)}" aria-label="${t('Delete download')}">${ic('close')}</button></div>`;
  }).join('')}</div>`;
}
function dlWire(box) {
  const byId = id => Object.values(DLS).find(d => d.id === id),
    P = () => Capacitor.Plugins.ExtPlayer;
  $$('[data-dlp]', box).forEach(
    b =>
      (b.onclick = () => {
        const d = byId(b.dataset.dlp);
        if (!d || !d.path) return;
        const orig = S.byKey[d.key] || EPS[d.key];
        enterFsFor(
          Object.assign({}, orig || { name: d.name, logo: d.logo, kind: 'vod', ser: d.ser || undefined }, {
            key: d.key,
            url: Capacitor.convertFileSrc('file://' + d.path),
            local: true,
            kind: 'vod'
          })
        );
      })
  );
  $$('[data-dld]', box).forEach(
    b =>
      (b.onclick = async () => {
        await P()
          .dlDelete({ id: b.dataset.dld })
          .catch(() => {});
        await dlSync();
        renderFlix();
      })
  );
  $$('[data-dls]', box).forEach(
    b =>
      (b.onclick = async () => {
        await P()
          .dlStop({ id: b.dataset.dls })
          .catch(() => {});
        setTimeout(async () => {
          await dlSync();
          renderFlix();
        }, 800);
      })
  );
  $$('[data-dlr]', box).forEach(
    b =>
      (b.onclick = async () => {
        const d = byId(b.dataset.dlr);
        await P()
          .dlStart(d)
          .catch(() => {});
        await dlSync();
        renderFlix();
      })
  );
}
dlSync();
