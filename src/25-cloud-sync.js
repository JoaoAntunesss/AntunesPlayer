/* ---------- Google account: playlists (encrypted), favourites, lists and settings follow you to every device ---------- */
const FB = {
  apiKey: 'AIzaSyAANTo-ceh1SDXu6b6oRG-ujR4_JiiL4GA',
  authDomain: 'iptv-364a1.firebaseapp.com',
  databaseURL: 'https://iptv-364a1-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'iptv-364a1',
  storageBucket: 'iptv-364a1.firebasestorage.app',
  messagingSenderId: '835085103047',
  appId: '1:835085103047:web:dceffba87c28fbf73ef3e2'
};
let signing = false;
const CK = ['ap.sources', 'ap.favs', 'ap.lists', 'ap.set'],
  PEPPER = '|AntunesPlayer.sync.v1';
const C = {
  user: null,
  pushT: 0,
  applying: false,
  dev:
    LS.get('ap.dev', '') ||
    (() => {
      const d = 'd' + Math.random().toString(36).slice(2, 10);
      LS.set('ap.dev', d);
      return d;
    })()
};
Object.assign(PT, {
  'Google account': 'Conta Google',
  'Sign in with Google': 'Entrar com Google',
  'Sign out': 'Sair',
  'Signed in as': 'Entraste como',
  'Sync now': 'Sincronizar agora',
  Synced: 'Sincronizado',
  'Not synced yet': 'Ainda não sincronizado',
  'Your playlists, favourites, lists and settings are saved in your Google account and appear on every device where you sign in. Playlist logins are encrypted before they leave this device.':
    'As tuas listas, favoritos, listas próprias e definições ficam guardados na tua conta Google e aparecem em todos os aparelhos onde entrares. Os logins das listas são encriptados antes de saírem deste aparelho.',
  'Sign in with a code (TV)': 'Entrar com código (TV)',
  'Send to a TV': 'Enviar para uma TV',
  'Code shown on the TV': 'Código que aparece na TV',
  'Sent. Look at the TV.': 'Enviado. Olha para a TV.',
  'The code has 8 letters/numbers': 'O código tem 8 letras/números',
  'On your phone, open AntunesPlayer (app or website), sign in with Google, then Settings → Google account → Send to a TV, and type this code:':
    'No telemóvel, abre o AntunesPlayer (app ou site), entra com o Google e vai a Definições → Conta Google → Enviar para uma TV, e escreve este código:',
  'Waiting for your phone…': 'À espera do telemóvel…',
  'The code expired. Open it again for a new one.': 'O código expirou. Abre outra vez para teres um novo.',
  'Playlists in your account': 'Listas na tua conta',
  'Pick the playlists to connect on this device:': 'Escolhe as listas a ligar neste aparelho:',
  Connect: 'Ligar',
  Connected: 'Ligado',
  'Nothing saved in your account yet. What you add here will be saved.':
    'Ainda não tens nada guardado na conta. O que adicionares aqui fica guardado.',
  'Could not sign in': 'Não foi possível entrar',
  'Update the app to sign in': 'Atualiza a app para poderes entrar',
  'Signed out. Your data stays on this device.': 'Saíste. Os dados ficam neste aparelho.',
  Account: 'Conta',
  'Your playlists are already in your Google account. Sign in to get them back.':
    'As tuas listas podem estar na tua conta Google. Entra para as recuperares.',
  'on this device': 'neste aparelho',
  'Sync error': 'Erro de sincronização',
  Watched: 'Visto',
  'Mark as watched': 'Marcar como visto',
  'Opening Google…': 'A abrir o Google…',
  'Playlists you add here are saved to your account.': 'As listas que adicionares aqui ficam guardadas na conta.'
});
let fbp;
const fbLoad = () =>
  fbp ||
  (fbp = (async () => {
    for (const f of ['app', 'auth', 'database']) await loadScript(`js/vendor/firebase-${f}-compat.js`);
    if (!firebase.apps.length) firebase.initializeApp(FB);
    return firebase;
  })().catch(e => {
    fbp = null;
    throw e;
  }));
// AES-GCM; the key comes from PBKDF2 so logins never sit in the database as plain text
const toB64 = buf => {
  const u = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const KEYS = {};
const ckey = secret =>
  KEYS[secret] ||
  (KEYS[secret] = crypto.subtle
    .importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
    .then(b =>
      crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('AntunesPlayer-salt-v1'),
          iterations: 120000,
          hash: 'SHA-256'
        },
        b,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      )
    ));
async function seal(obj, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await ckey(secret),
    new TextEncoder().encode(JSON.stringify(obj))
  );
  return toB64(iv) + '.' + toB64(ct);
}
async function unseal(s, secret) {
  const [a, b] = String(s).split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(a) }, await ckey(secret), fromB64(b));
  return JSON.parse(new TextDecoder().decode(pt));
}
const userSecret = () => C.user.uid + PEPPER;
function bundle() {
  const set = Object.assign({}, S.set);
  delete set.tv;
  delete set.tvMode;
  const sources = S.sources.map(x => {
    const o = Object.assign({}, x);
    if (o.text && o.text.length > 400000) delete o.text;
    return o;
  });
  const m = profMainData(); // only the main profile's lists and progress go to the account
  return {
    sources,
    favs: m ? m.favs : S.favs,
    lists: m ? m.lists : S.lists,
    set,
    watch: m ? m.watch : { pos: POS, dur: DUR, seen: SEEN, wts: WTS, slast: SLAST, eps: EPS },
    profiles: profBundle()
  };
}
// "continue watching" and watched marks follow you between devices: newest wins per title
function mergeWatch(w) {
  if (!w) return;
  const tw = w.wts || {};
  Object.keys(w.seen || {}).forEach(k => {
    if (!SEEN[k]) SEEN[k] = w.seen[k];
  });
  Object.keys(tw).forEach(k => {
    if (!WTS[k] || tw[k] > WTS[k]) {
      WTS[k] = tw[k];
      if (w.pos && w.pos[k] != null) POS[k] = w.pos[k];
      else if (SEEN[k]) delete POS[k];
      if (w.dur && w.dur[k]) DUR[k] = w.dur[k];
    }
  });
  Object.keys(w.slast || {}).forEach(k => {
    if (!SLAST[k] || w.slast[k].t > SLAST[k].t) SLAST[k] = w.slast[k];
  });
  Object.keys(w.eps || {}).forEach(k => {
    if (!EPS[k]) EPS[k] = w.eps[k];
  });
  LS.set('ap.pos', POS);
  LS.set('ap.dur', DUR);
  LS.set('ap.eps', EPS);
  saveWatch();
}
const sameSrc = (a, b) =>
  a.type === b.type &&
  (a.type === 'xtream' ? a.server === b.server && a.user === b.user : (a.url || a.name) === (b.url || b.name));
function applyBundle(b, mode, pick) {
  C.applying = true;
  try {
    const rs = (b.sources || []).filter(x => !pick || pick.includes(x.id));
    if (mode === 'replace') S.sources = rs.map(x => Object.assign({}, x));
    else
      rs.forEach(x => {
        if (!S.sources.some(y => sameSrc(x, y))) S.sources.push(Object.assign({}, x));
      });
    LS.set('ap.sources', S.sources);
    // profiles come with the account: every profile's lists and progress, on every device
    const pd = profApply(b.profiles, mode) || (profIsMain() ? { favs: b.favs, lists: b.lists, watch: b.watch } : null);
    if (pd) {
      const f = (pd.favs || []).slice();
      if (mode !== 'replace')
        S.favs.forEach(k => {
          if (!f.includes(k)) f.push(k);
        });
      S.favs = f;
      LS.set('ap.favs', f);
      const L = (pd.lists || []).slice();
      if (mode !== 'replace')
        S.lists.forEach(l => {
          if (!L.some(x => x.id === l.id)) L.push(l);
        });
      S.lists = L;
      LS.set('ap.lists', L);
      if (b.set) {
        const keep = { tv: S.set.tv, tvMode: S.set.tvMode };
        Object.assign(S.set, b.set, keep);
        saveSet();
        applyLook();
      }
      mergeWatch(pd.watch);
    }
  } finally {
    C.applying = false;
  }
  if (typeof refreshVis === 'function') refreshVis();
  if (!S.sources.some(x => x.id === S.srcId)) selectSource(S.sources[0] && S.sources[0].id);
  else render();
}
async function cloudPush() {
  if (!C.user) return;
  const fb = await fbLoad(),
    now = Date.now();
  await fb
    .database()
    .ref('users/' + C.user.uid)
    .set({ d: await seal(bundle(), userSecret()), t: now, dev: C.dev });
  LS.set('ap.cloudT', now);
  LS.set('ap.dirty', false);
  C.err = '';
}
const schedulePush = () => {
  if (C.applying) return;
  LS.set('ap.dirty', true);
  if (!C.user) return;
  clearTimeout(C.pushT);
  C.pushT = setTimeout(
    () =>
      cloudPush().catch(e => {
        C.err = e.message;
        console.warn('sync', e);
      }),
    2500
  );
};
{
  const raw = LS.set;
  LS.set = (k, v) => {
    raw(k, v);
    if (CK.includes(k)) schedulePush();
  };
}
async function readRemote() {
  const fb = await fbLoad();
  const v = (
    await fb
      .database()
      .ref('users/' + C.user.uid)
      .get()
  ).val();
  return v && v.d ? { t: v.t || 0, dev: v.dev, data: await unseal(v.d, userSecret()) } : null;
}
async function onSignedIn(u) {
  C.user = u;
  const first = LS.get('ap.cloudUid', '') !== u.uid;
  LS.set('ap.cloudUid', u.uid);
  if (signing || first) toast(t('Signed in as') + ' ' + (u.email || ''));
  render();
  let r;
  try {
    r = await readRemote();
  } catch (e) {
    C.err = e.message;
    toast(t('Sync error') + ': ' + e.message);
    return;
  }
  if (!r) {
    await cloudPush().catch(e => {
      C.err = e.message;
    });
    if (first) toast(t('Nothing saved in your account yet. What you add here will be saved.'));
  } else if (first) {
    if ((r.data.sources || []).length) connectDialog(r.data, S.sources.length ? 'merge' : 'replace');
    else {
      applyBundle(r.data, 'merge');
      await cloudPush().catch(() => {});
    }
  } else if (LS.get('ap.dirty', false))
    await cloudPush().catch(e => {
      C.err = e.message;
    });
  else if (r.t > LS.get('ap.cloudT', 0)) {
    applyBundle(r.data, 'replace');
    LS.set('ap.cloudT', r.t);
  }
  // changes made on other devices arrive while the app is open
  const fb = await fbLoad();
  fb.database()
    .ref('users/' + u.uid)
    .on('value', async s => {
      const v = s.val();
      if (!v || !v.d || v.dev === C.dev || v.t <= LS.get('ap.cloudT', 0) || LS.get('ap.dirty', false) || dlg.open)
        return;
      try {
        applyBundle(await unseal(v.d, userSecret()), 'replace');
        LS.set('ap.cloudT', v.t);
      } catch (e) {}
    });
}
function connectDialog(data, mode, after) {
  const src = data.sources || [];
  openDlg(
    `<h2>${ic('user')} ${t('Playlists in your account')}</h2><p class="mut">${t('Pick the playlists to connect on this device:')}</p><div class="srcs">${src.map(x => `<label class="srow"><input type="checkbox" data-pk="${esc(x.id)}" checked><span class="sic">${ic(x.type === 'xtream' ? 'user' : 'stack')}</span><div><b>${esc(x.name)}</b><small>${x.type === 'xtream' ? 'Xtream' : 'M3U'}${S.sources.some(y => sameSrc(x, y)) ? ' · ' + t('on this device') : ''}</small></div></label>`).join('')}</div><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="pkGo">${t('Connect')}</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $('#pkGo').onclick = async () => {
    const pick = $$('[data-pk]', dlg)
      .filter(c => c.checked)
      .map(c => c.dataset.pk);
    dlg.close();
    applyBundle(data, mode, pick);
    if (S.sources.length && !S.srcId) selectSource(S.sources[0].id);
    toast(t('Connected'));
    if (after) after();
    else if (C.user) cloudPush().catch(() => {});
  };
}
async function googleSignIn() {
  const P = window.Capacitor && Capacitor.Plugins;
  if (NATIVE) {
    if (!P || !P.FirebaseAuthentication) throw new Error(t('Update the app to sign in'));
    // open the Google account picker first (Firebase loads while the person picks)
    const fbw = fbLoad();
    const r = await P.FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const tok = r && r.credential && r.credential.idToken;
    if (!tok) throw new Error('no token');
    const fb = await fbw;
    await fb.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(tok));
  } else if (DESKTOP) {
    await desktopGoogle();
  } else {
    const fb = await fbLoad(),
      p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try {
      await fb.auth().signInWithPopup(p);
    } catch (e) {
      if (/popup-blocked|operation-not-supported/.test(e.code || '')) await fb.auth().signInWithRedirect(p);
      else throw e;
    }
  }
}
let authHooked = false;
async function cloudBoot(force) {
  if (!force && !LS.get('ap.cloudUid', '')) return;
  const fb = await fbLoad();
  if (authHooked) return;
  authHooked = true;
  fb.auth().onAuthStateChanged(u => {
    if (u && (!C.user || C.user.uid !== u.uid)) onSignedIn(u);
    if (!u) C.user = null;
  });
}
function accountDialog() {
  const u = C.user,
    when = LS.get('ap.cloudT', 0);
  openDlg(`<h2>${ic('user')} ${t('Google account')}</h2><p class="mut">${t('Your playlists, favourites, lists and settings are saved in your Google account and appear on every device where you sign in. Playlist logins are encrypted before they leave this device.')}</p>
  ${
    u
      ? `<p>${t('Signed in as')} <b>${esc(u.email || u.displayName || '')}</b><br><small class="mut">${when ? t('Synced') + ' · ' + new Date(when).toLocaleString(LANG === 'pt' ? 'pt-PT' : undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('Not synced yet')}${C.err ? ' · ' + esc(C.err) : ''}</small></p>
  <div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" id="aSync">${ic('refresh')} ${t('Sync now')}</button><button class="btn" id="aTv">${ic('tv')} ${t('Send to a TV')}</button><button class="btn" id="aOut">${t('Sign out')}</button></div>`
      : `<div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn p" id="aIn">${ic('user')} ${t('Sign in with Google')}</button><button class="btn" id="aCode">${ic('tv')} ${t('Sign in with a code (TV)')}</button></div>`
  }
  <div class="row"><button class="btn p" id="dx">${t('Close')}</button></div>`);
  $('#dx').onclick = () => dlg.close();
  if (u) {
    $('#aSync').onclick = async () => {
      try {
        await cloudPush();
        toast(t('Synced'));
        accountDialog();
      } catch (e) {
        toast(t('Sync error') + ': ' + e.message);
      }
    };
    $('#aTv').onclick = sendToTvDialog;
    $('#aOut').onclick = async () => {
      try {
        const fb = await fbLoad();
        await fb.auth().signOut();
        const P = window.Capacitor && Capacitor.Plugins;
        if (NATIVE && P && P.FirebaseAuthentication) P.FirebaseAuthentication.signOut().catch(() => {});
      } catch (e) {}
      C.user = null;
      LS.set('ap.cloudUid', '');
      dlg.close();
      toast(t('Signed out. Your data stays on this device.'));
    };
  } else {
    $('#aIn').onclick = signInFlow;
    $('#aCode').onclick = pairDialog;
  }
}
async function signInFlow() {
  if (signing) return;
  signing = true;
  toast(t('Opening Google…'));
  try {
    const boot = cloudBoot(true);
    await googleSignIn();
    await boot;
    if (dlg.open) dlg.close();
  } catch (e) {
    const m = String((e && (e.message || e.code)) || e);
    if (!/cancel|closed-by-user|12501|12502/i.test(m)) toast(t('Could not sign in') + ': ' + m);
  } finally {
    signing = false;
  }
}
/* TV without a keyboard: the TV shows a code, the phone (signed in) sends the encrypted data for that code */
const PAIR_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let pairT = 0;
function pairDialog() {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => PAIR_ABC[b % 32]).join(''),
    url = FB.databaseURL + '/pair/' + code + '.json',
    end = Date.now() + 10 * 60e3;
  openDlg(
    `<h2>${ic('tv')} ${t('Sign in with a code (TV)')}</h2><p>${t('On your phone, open AntunesPlayer (app or website), sign in with Google, then Settings → Google account → Send to a TV, and type this code:')}</p><div class="paircode">${code.slice(0, 4)}-${code.slice(4)}</div><p class="mut" id="pSt">${t('Waiting for your phone…')}</p><p class="mut"><small>joaoantunesss.github.io/AntunesPlayer</small></p><div class="row"><button class="btn" id="dx">${t('Cancel')}</button></div>`
  );
  const stop = () => clearTimeout(pairT);
  $('#dx').onclick = () => {
    stop();
    dlg.close();
  };
  const poll = async () => {
    if (!dlg.open || !$('.paircode', dlg)) return;
    if (Date.now() > end) {
      $('#pSt').textContent = t('The code expired. Open it again for a new one.');
      return;
    }
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const v = r.ok ? await r.json() : null;
      if (v && v.d) {
        fetch(url, { method: 'DELETE' }).catch(() => {});
        const data = await unseal(v.d, code + PEPPER);
        connectDialog(data, S.sources.length ? 'merge' : 'replace', () => {});
        return;
      }
    } catch (e) {}
    pairT = setTimeout(poll, 3000);
  };
  pairT = setTimeout(poll, 2500);
}
/* Windows app: Google refuses to sign in inside app windows ("this browser or app may not be secure").
   The app opens the PC's own browser on the web version with a one-time code. You sign in there, and that page
   sends the Google credential back, encrypted with the code (same channel as "Send to a TV"). */
const WEB_URL = 'https://joaoantunesss.github.io/AntunesPlayer/';
function desktopGoogle() {
  return new Promise((resolve, reject) => {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => PAIR_ABC[b % 32]).join(''),
      url = FB.databaseURL + '/pair/' + code + '.json',
      end = Date.now() + 10 * 60e3;
    const abrir = () => window.open(WEB_URL + '#login-pc=' + code, '_blank');
    openDlg(
      `<h2>${ic('user')} ${t('Sign in with Google')}</h2><p>${t('Your web browser opened. Sign in with Google there and this window carries on by itself.')}</p><div class="paircode">${code.slice(0, 4)}-${code.slice(4)}</div><p class="mut" id="pSt">${t('Waiting for the browser…')}</p><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="pOpen">${t('Open the browser again')}</button></div>`
    );
    let tm = 0,
      done = false;
    const fim = e => {
      done = true;
      clearTimeout(tm);
      if (e) reject(e);
    };
    $('#dx').onclick = () => {
      fim(new Error('cancelled'));
      dlg.close();
    };
    $('#pOpen').onclick = abrir;
    abrir();
    const poll = async () => {
      if (done) return;
      if (!dlg.open || !$('#pOpen', dlg)) {
        fim(new Error('cancelled'));
        return;
      }
      if (Date.now() > end) {
        $('#pSt').textContent = t('The code expired. Open it again for a new one.');
        fim(new Error('cancelled'));
        return;
      }
      try {
        const r = await fetch(url, { cache: 'no-store' });
        const v = r.ok ? await r.json() : null;
        if (v && v.d) {
          fetch(url, { method: 'DELETE' }).catch(() => {});
          const g = await unseal(v.d, code + PEPPER);
          if (g && g.idToken) {
            $('#pSt').textContent = t('Signing in…');
            const fb = await fbLoad();
            await fb
              .auth()
              .signInWithCredential(firebase.auth.GoogleAuthProvider.credential(g.idToken, g.accessToken || null));
            done = true;
            resolve();
            return;
          }
        }
      } catch (e) {
        if (e && e.code && /auth\//.test(e.code)) {
          fim(e);
          return;
        }
      }
      tm = setTimeout(poll, 2500);
    };
    tm = setTimeout(poll, 2000);
  });
}
// web version opened by the Windows app: sign in here and send the credential to the PC
function loginPcDialog(code) {
  openDlg(
    `<h2>${ic('user')} ${t('Sign in on the PC app')}</h2><p>${t('Sign in with Google here to finish signing in on AntunesPlayer for Windows. Check that the code is the same as on the PC:')}</p><div class="paircode">${code.slice(0, 4)}-${code.slice(4)}</div><p class="mut" id="lpSt"></p><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="lpGo">${ic('user')} ${t('Continue with Google')}</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $('#lpGo').onclick = async () => {
    const b = $('#lpGo');
    b.disabled = true;
    $('#lpSt').textContent = '';
    try {
      const fb = await fbLoad(),
        p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      const r = await fb.auth().signInWithPopup(p),
        cr = r.credential || {};
      if (!cr.idToken) throw new Error('no token');
      await fb
        .database()
        .ref('pair/' + code)
        .set({
          d: await seal({ idToken: cr.idToken, accessToken: cr.accessToken || '' }, code + PEPPER),
          t: firebase.database.ServerValue.TIMESTAMP
        });
      openDlg(
        `<h2>${ic('user')} ${t('Done')}</h2><p>${t('You can go back to the PC app: it is signing in now. You can close this tab.')}</p><div class="row"><button class="btn p" id="dx">OK</button></div>`
      );
      $('#dx').onclick = () => dlg.close();
    } catch (e) {
      b.disabled = false;
      const m = String((e && (e.message || e.code)) || e);
      if (!/closed-by-user|cancel/i.test(m)) $('#lpSt').textContent = t('Could not sign in') + ': ' + m;
    }
  };
}
Object.assign(PT, {
  'Your web browser opened. Sign in with Google there and this window carries on by itself.':
    'Abrimos o navegador do teu PC. Entra com a Google lá e esta janela continua sozinha.',
  'Waiting for the browser…': 'À espera do navegador…',
  'Open the browser again': 'Abrir o navegador outra vez',
  'Signing in…': 'A entrar…',
  'Sign in on the PC app': 'Entrar na app do PC',
  'Sign in with Google here to finish signing in on AntunesPlayer for Windows. Check that the code is the same as on the PC:':
    'Entra com a Google aqui para acabares de entrar no AntunesPlayer para Windows. Confirma que o código é igual ao do PC:',
  'Continue with Google': 'Continuar com a Google',
  'You can go back to the PC app: it is signing in now. You can close this tab.':
    'Podes voltar à app do PC: já está a entrar. Podes fechar este separador.'
});
function sendToTvDialog() {
  openDlg(
    `<h2>${ic('tv')} ${t('Send to a TV')}</h2><label>${t('Code shown on the TV')}</label><input id="tvC" autocomplete="off" autocapitalize="characters" placeholder="ABCD-EFGH" style="text-transform:uppercase;letter-spacing:.2em"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="tvGo">${t('Send to a TV')}</button></div>`
  );
  $('#dx').onclick = accountDialog;
  $('#tvGo').onclick = async () => {
    const code = $('#tvC')
      .value.toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) {
      toast(t('The code has 8 letters/numbers'));
      return;
    }
    try {
      const fb = await fbLoad();
      await fb
        .database()
        .ref('pair/' + code)
        .set({ d: await seal(bundle(), code + PEPPER), t: firebase.database.ServerValue.TIMESTAMP });
      toast(t('Sent. Look at the TV.'));
      dlg.close();
    } catch (e) {
      toast(t('Sync error') + ': ' + e.message);
    }
  };
}
window.addEventListener('focus', () => {
  if (C.user && LS.get('ap.dirty', false)) schedulePush();
});
v.addEventListener('pause', () => {
  if (isVodNow()) schedulePush();
});
v.addEventListener('ended', () => schedulePush());
