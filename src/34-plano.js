/* ---------- subscription: 24 hours free, then 1 € a month ----------
   Who paid is known by the Google account (the same sign-in that syncs playlists). The app asks the AW server
   (playerEstado, a Firebase function on aw-sites) with the account's token; payment is on a Stripe link tied to that
   account, so it works on every device where the same account is signed in (phone, TV, PC).
   Free for 24 hours from the first time the app opened on this device. Without internet, the last answer counts for
   up to 7 days. The owner and family are free (list on the server). */
const PLANO_API = 'https://europe-west1-aw-sites-e31c3.cloudfunctions.net/';
const PLANO_TESTE = 24 * 3600e3;
const planoIni = LS.get('ap.first', 0) || (LS.set('ap.first', Date.now()), Date.now());
let PLANO = LS.get('ap.plano', null), // { estado: 'gratis'|'pago'|'teste'|'pagar', ate, fimTeste, link, t }
  planoBusy = null;
Object.assign(PT, {
  'Your free day is over': 'O teu dia grátis acabou',
  'AntunesPlayer costs 1 € a month. You can cancel whenever you want.':
    'O AntunesPlayer custa 1 € por mês. Cancelas quando quiseres.',
  'Sign in with your Google account to pay, so the subscription works on all your devices.':
    'Entra com a tua conta Google para pagares. Assim a subscrição funciona em todos os teus aparelhos.',
  'Pay 1 € a month': 'Pagar 1 € por mês',
  'I have paid': 'Já paguei',
  'Checking…': 'A confirmar…',
  'Payment not found yet. If you just paid, wait a minute and try again.':
    'Ainda não encontrei o pagamento. Se acabaste de pagar, espera um minuto e tenta outra vez.',
  'Thank you! Enjoy.': 'Obrigado! Bom proveito.',
  'Pay on your phone: open AntunesPlayer there with the same Google account and tap “Pay 1 € a month”. Then tap “I have paid” here.':
    'Paga no telemóvel: abre lá o AntunesPlayer com a mesma conta Google e carrega em “Pagar 1 € por mês”. Depois carrega aqui em “Já paguei”.',
  Subscription: 'Subscrição',
  'Free account': 'Conta grátis',
  'Active until': 'Ativa até',
  'Ends on': 'Termina a',
  'Free until': 'Grátis até',
  'Manage subscription': 'Gerir subscrição',
  'Free time left': 'Tempo grátis que falta',
  'Could not check the subscription': 'Não deu para confirmar a subscrição'
});
const planoFmt = ms =>
  new Date(ms).toLocaleString(LANG === 'pt' ? 'pt-PT' : undefined, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
// can watch now?
function planoOk() {
  const now = Date.now(),
    p = PLANO;
  if (p && now - p.t < 7 * 86400e3 && (!C.user || !p.uid || p.uid === C.user.uid)) {
    if (p.estado === 'gratis') return true;
    if (p.estado === 'pago') return !p.ate || p.ate > now - 3 * 86400e3;
    if (p.estado === 'teste') return p.fimTeste > now;
  }
  if (!C.user) return now < planoIni + PLANO_TESTE; // not signed in: the device's own free day
  if (p && p.estado === 'limite' && now - p.t < 7 * 86400e3) return false; // the account is on too many devices
  return !p || p.estado !== 'pagar' ? now < planoIni + PLANO_TESTE : false;
}
// how this device appears in the account's list of devices
const planoDevName = () => {
  const ua = navigator.userAgent;
  const what = S.set.tv
    ? 'TV'
    : DESKTOP
      ? 'PC'
      : NATIVE
        ? /tablet|SM-T|Tab/i.test(ua)
          ? 'Tablet'
          : 'Telemóvel'
        : 'Navegador';
  const model =
    (/;\s*([^;)]+?)\s+Build\//.exec(ua) || [])[1] || (/Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : '');
  return (what + (model ? ' · ' + model : '')).slice(0, 40);
};
async function planoCall(fn, extra) {
  const tok = await C.user.getIdToken();
  const q = new URLSearchParams(Object.assign({ inicio: planoIni, dev: C.dev, nome: planoDevName() }, extra || {}));
  const r = await fetch(PLANO_API + fn + '?' + q, { headers: { Authorization: 'Bearer ' + tok }, cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || 'HTTP ' + r.status);
  return j;
}
function planoCheck(pago) {
  if (!C.user || !navigator.onLine) return Promise.resolve(PLANO);
  if (planoBusy && !pago) return planoBusy;
  planoBusy = planoCall('playerEstado', pago ? { pago: 1 } : null)
    .then(j => {
      PLANO = Object.assign(j, { t: Date.now(), uid: C.user.uid });
      LS.set('ap.plano', PLANO);
      if (!planoOk() && S.cur && !v.paused) {
        stopPlayback();
        planoShow();
      }
      return PLANO;
    })
    .catch(e => {
      console.warn('plano', e);
      return PLANO;
    })
    .finally(() => (planoBusy = null));
  return planoBusy;
}
// the screen shown when the free day is over
function planoShow() {
  const u = C.user,
    tv = !!S.set.tv;
  if (u && PLANO && PLANO.estado === 'limite') return planoDevices();
  openDlg(
    `<h2>${ic('play')} ${t('Your free day is over')}</h2><p>${t('AntunesPlayer costs 1 € a month. You can cancel whenever you want.')}</p>
    ${u ? (tv ? `<p class="mut">${t('Pay on your phone: open AntunesPlayer there with the same Google account and tap “Pay 1 € a month”. Then tap “I have paid” here.')}</p>` : '') : `<p class="mut">${t('Sign in with your Google account to pay, so the subscription works on all your devices.')}</p>`}
    <p class="mut" id="plSt" aria-live="polite">${u ? t('Signed in as') + ' <b>' + esc(u.email || '') + '</b>' : ''}</p>
    <div class="row" style="flex-wrap:wrap">${
      u
        ? `<button class="btn" id="plDone">${t('I have paid')}</button>${tv ? '' : `<button class="btn p" id="plPay">${t('Pay 1 € a month')}</button>`}`
        : `<button class="btn p" id="plIn">${ic('user')} ${t('Sign in with Google')}</button>`
    }</div>`
  );
  if (!u) {
    $('#plIn').onclick = async () => {
      await signInFlow();
      if (C.user) {
        await planoCheck();
        if (planoOk()) {
          if (dlg.open) dlg.close();
          toast(t('Thank you! Enjoy.'));
        } else planoShow();
      }
    };
    return;
  }
  const pay = $('#plPay');
  if (pay)
    pay.onclick = async () => {
      let l = PLANO && PLANO.link;
      if (!l) l = (await planoCheck()).link;
      if (l) openExternal(l);
    };
  $('#plDone').onclick = async () => {
    const st = $('#plSt');
    st.textContent = t('Checking…');
    await planoCheck(true);
    if (planoOk()) {
      dlg.close();
      toast(t('Thank you! Enjoy.'));
    } else st.textContent = t('Payment not found yet. If you just paid, wait a minute and try again.');
  };
}
// too many devices on this account: remove one to make room for this one
function planoDevices() {
  const p = PLANO || {},
    list = p.aparelhos || [];
  openDlg(
    `<h2>${ic('tv')} ${t('This account is on too many devices')}</h2>
    <p>${t('Each account can be used on up to')} ${p.max || 3} ${t('devices. To use it here, remove one you no longer use.')}</p>
    <div class="srcs">${list
      .map(
        x =>
          `<div class="srow"><span class="sic">${ic(/TV/.test(x.nome) ? 'tv' : 'user')}</span><div><b>${esc(x.nome)}</b><small>${t('Last used')} ${planoFmt(x.visto)}</small></div><button class="btn" data-pldev="${esc(x.id)}">${t('Remove')}</button></div>`
      )
      .join('')}</div>
    <p class="mut" id="plSt" aria-live="polite"></p>
    <div class="row"><button class="btn" id="dx">${t('Close')}</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $$('[data-pldev]', dlg).forEach(
    b =>
      (b.onclick = async () => {
        $('#plSt').textContent = t('Checking…');
        try {
          await planoCall('playerTirar', { id: b.dataset.pldev });
          await planoCheck(true);
          if (planoOk()) {
            dlg.close();
            toast(t('Thank you! Enjoy.'));
          } else planoShow();
        } catch (e) {
          $('#plSt').textContent = e.message;
        }
      })
  );
}
/* no more than 2 devices watching at the same time: while something plays, the device says so every minute */
let planoVerT = 0;
async function planoVer(parar) {
  if (!C.user || !navigator.onLine || (PLANO && PLANO.estado === 'gratis')) return;
  try {
    const j = await planoCall('playerVer', parar ? { parar: 1 } : null);
    if (j && j.ok === false && S.cur) {
      stopPlayback();
      openDlg(
        `<h2>${ic('tv')} ${t('Already watching on')} ${j.max || 2} ${t('devices')}</h2><p>${t('This account is playing on')} ${esc((j.nomes || []).join(', '))}. ${t('Stop one of them to watch here.')}</p><div class="row"><button class="btn p" id="dx">${t('Close')}</button></div>`
      );
      $('#dx').onclick = () => dlg.close();
    }
  } catch (e) {}
}
v.addEventListener('playing', () => {
  if (planoVerT) return;
  planoVer();
  planoVerT = setInterval(() => {
    if (!S.cur || v.paused) {
      clearInterval(planoVerT);
      planoVerT = 0;
      return;
    }
    planoVer();
  }, 60e3);
});
v.addEventListener('emptied', () => {
  if (!planoVerT) return;
  clearInterval(planoVerT);
  planoVerT = 0;
  planoVer(true);
});
Object.assign(PT, {
  'This account is on too many devices': 'Esta conta já está em demasiados aparelhos',
  'Each account can be used on up to': 'Cada conta pode ser usada em até',
  'devices. To use it here, remove one you no longer use.': 'aparelhos. Para a usares aqui, tira um que já não uses.',
  'Last used': 'Usado pela última vez a',
  Remove: 'Tirar',
  'Already watching on': 'Já está a ver em',
  devices: 'aparelhos',
  'This account is playing on': 'Esta conta está a dar em',
  'Stop one of them to watch here.': 'Para um deles para veres aqui.'
});
// a line about the subscription in Settings → Google account
function planoLinha() {
  const p = PLANO,
    now = Date.now();
  if (!C.user || !p)
    return `<p class="mut">${t('Free time left')}: ${Math.max(0, Math.ceil((planoIni + PLANO_TESTE - now) / 3600e3))} h</p>`;
  const txt =
    p.estado === 'gratis'
      ? t('Free account')
      : p.estado === 'pago'
        ? (p.cancelada ? t('Ends on') : t('Active until')) + ' ' + planoFmt(p.ate)
        : p.estado === 'teste'
          ? t('Free until') + ' ' + planoFmt(p.fimTeste)
          : t('Your free day is over');
  return `<p><b>${t('Subscription')}:</b> ${esc(txt)}</p><div class="row" style="justify-content:flex-start;flex-wrap:wrap">${
    p.estado === 'pago' ? `<button class="btn" id="plMan">${t('Manage subscription')}</button>` : ''
  }${p.estado === 'teste' || p.estado === 'pagar' ? `<button class="btn" id="plPay2">${t('Pay 1 € a month')}</button>` : ''}</div>`;
}
function planoBind() {
  const m = $('#plMan'),
    p = $('#plPay2');
  if (m)
    m.onclick = async () => {
      try {
        const j = await planoCall('playerGerir');
        if (j.url) openExternal(j.url);
      } catch (e) {
        toast(t('Could not check the subscription') + ': ' + e.message);
      }
    };
  if (p) p.onclick = () => PLANO && PLANO.link && openExternal(PLANO.link);
}
// check on start (after the account signs in), when the app comes back, and every hour
setTimeout(() => {
  if (!LS.get('ap.cloudUid', '') && !planoOk()) planoShow();
}, 4000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) planoCheck();
});
setInterval(() => planoCheck(), 3600e3);
