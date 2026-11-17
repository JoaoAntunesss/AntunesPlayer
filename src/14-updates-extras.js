/* ---------- app updates (Android app only; the web version updates by itself) ---------- */
const BUILD = +(window.AP_BUILD || 0);
function openExternal(url) {
  const P = window.Capacitor && Capacitor.Plugins;
  if (NATIVE && P && P.Browser) {
    P.Browser.open({ url }).catch(() => {
      location.href = url;
    });
    return;
  }
  if (NATIVE && P && P.AppLauncher) {
    P.AppLauncher.openUrl({ url }).catch(() => {
      location.href = url;
    });
    return;
  }
  const w = window.open(url, '_blank');
  if (!w) location.href = url;
}
async function checkUpdate(manual) {
  if (!NATIVE) {
    if (manual) toast(t('The web version is always up to date'));
    return;
  }
  if (!manual && Date.now() - LS.get('ap.updT', 0) < 6 * 3600e3) return;
  LS.set('ap.updT', Date.now());
  try {
    const r = await fetch('https://api.github.com/repos/JoaoAntunesss/AntunesPlayer/releases/tags/latest', {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'AntunesPlayer-App' }
    });
    if (r.status === 404) {
      if (manual) toast(t('A new version is being prepared. Try again in a few minutes.'));
      return;
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(),
      n = +((/build\s+(\d+)/i.exec(d.name || '') || [])[1] || 0),
      a = (d.assets || []).find(x => /\.apk$/i.test(x.name));
    if (!a || !n || n <= BUILD) {
      if (manual) toast(t('You have the latest version') + (BUILD ? ' · build ' + BUILD : ''));
      return;
    }
    const UP = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AppUpdate;
    const mb = x => (x / 1048576).toFixed(1).replace('.', ',');
    openDlg(
      `<h2>${ic('refresh')} ${t('New version available')}</h2><p>${t('Build')} ${n} · ${t('you have')} ${BUILD || '—'}${a.size ? ' · ' + mb(a.size) + ' MB' : ''}</p><p class="mut">${UP ? t('It downloads here in the app and then installs over this version; your lists and favourites stay.') : t('The download opens in the browser. Then open the file to install it over this version; your lists and favourites stay.')}</p><div class="row"><button class="btn" id="dx">${t('Later')}</button><button class="btn p" id="uGo">${ic('plus')} ${UP ? t('Update now') : t('Download')}</button></div>`
    );
    $('#dx').onclick = () => dlg.close();
    $('#uGo').onclick = () => {
      if (!UP) {
        dlg.close();
        openExternal(a.browser_download_url);
        return;
      }
      updInstalar(UP, a, n);
    };
  } catch (e) {
    if (manual) toast(t('Could not check for updates') + ': ' + e.message);
  }
}

/* In-app update (Android): download with a progress bar, then the Android installer opens on top of the app.
   The first time, Android asks to allow installs from AWplayer: we open that setting and continue when the app comes back. */
async function updInstalar(UP, a, n) {
  const mb = x => (x / 1048576).toFixed(1).replace('.', ',');
  let ouvinte = null;
  const fim = () => {
    if (ouvinte) {
      ouvinte.remove && ouvinte.remove();
      ouvinte = null;
    }
  };
  openDlg(
    `<h2>${ic('refresh')} ${t('Updating to build')} ${n}</h2><div class="upbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="upBar"><i style="width:0%"></i></div><p class="mut" id="upTxt">${t('Starting the download…')}</p><div class="row"><button class="btn" id="upX">${t('Cancel')}</button></div>`
  );
  $('#upX').onclick = () => {
    UP.cancel().catch(() => {});
    fim();
    dlg.close();
  };
  try {
    ouvinte = await UP.addListener('progress', d => {
      const tot = d.total > 0 ? d.total : a.size || 0,
        pct = tot ? Math.min(100, Math.round((d.done / tot) * 100)) : 0;
      const bar = $('#upBar');
      if (!bar) return;
      bar.setAttribute('aria-valuenow', pct);
      bar.firstElementChild.style.width = pct + '%';
      $('#upTxt').textContent = tot ? `${pct}% · ${mb(d.done)} / ${mb(tot)} MB` : `${mb(d.done)} MB`;
    });
    await UP.download({ url: a.browser_download_url });
    fim();
    await updAbrirInstalador(UP);
  } catch (e) {
    fim();
    if (String(e && e.message).includes('cancelled')) return;
    openDlg(
      `<h2>${ic('refresh')} ${t('The download failed')}</h2><p class="mut">${t('Check the internet connection and try again. You can also download it in the browser.')}</p><div class="row"><button class="btn" id="dx">${t('Close')}</button><button class="btn" id="upBr">${t('Download in the browser')}</button><button class="btn p" id="upRe">${t('Try again')}</button></div>`
    );
    $('#dx').onclick = () => dlg.close();
    $('#upBr').onclick = () => {
      dlg.close();
      openExternal(a.browser_download_url);
    };
    $('#upRe').onclick = () => updInstalar(UP, a, n);
  }
}
async function updAbrirInstalador(UP) {
  const { ok } = await UP.canInstall();
  if (ok) {
    if (dlg.open) dlg.close();
    toast(t('Confirm the installation on the Android screen'));
    await UP.install();
    return;
  }
  openDlg(
    `<h2>${ic('refresh')} ${t('One step left')}</h2><p>${t('Android needs your permission for AWplayer to install updates.')}</p><p class="mut">${t('On the next screen turn on “Allow from this source” and come back to the app: the installation continues by itself.')}</p><div class="row"><button class="btn" id="dx">${t('Later')}</button><button class="btn p" id="upPerm">${t('Allow')}</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $('#upPerm').onclick = async () => {
    const volta = async () => {
      window.removeEventListener('ap-resume', volta);
      const r = await UP.canInstall();
      if (r.ok) {
        if (dlg.open) dlg.close();
        toast(t('Confirm the installation on the Android screen'));
        UP.install().catch(() => {});
      } else toast(t('Without that permission the update cannot be installed'));
    };
    window.addEventListener('ap-resume', volta);
    await UP.openInstallSettings();
  };
}

/* ---------- extras found in other IPTV players: sleep timer, reminders, stream info, external player, guide offset, subtitles size, User-Agent ---------- */
Object.assign(IC, {
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  ext: '<path d="M14 4.5h5.5V10M19.5 4.5 11 13"/><path d="M17.5 13.5v5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V8A1.5 1.5 0 0 1 6 6.5h5"/>',
  signal: '<path d="M5 19v-3M9.5 19v-6M14 19v-9M18.5 19V6"/>'
});
Object.assign(PT, {
  'Sleep timer': 'Temporizador',
  'Sleep timer off': 'Temporizador desligado',
  min: 'min',
  'Off ': 'Desligado',
  'Playback stops in 30 s': 'A reprodução para daqui a 30 s',
  'Keep watching': 'Continuar a ver',
  'Stopped by the sleep timer': 'Parado pelo temporizador',
  'Remind me': 'Lembrar-me',
  'Cancel reminder': 'Cancelar lembrete',
  'Reminder set': 'Lembrete guardado',
  'Starting now': 'Vai começar',
  'Watch now': 'Ver agora',
  Dismiss: 'Ignorar',
  'Watch channel now': 'Ver o canal agora',
  Reminders: 'Lembretes',
  'Stream info': 'Info do sinal',
  Resolution: 'Resolução',
  Engine: 'Leitor',
  Bitrate: 'Débito',
  Connection: 'Ligação',
  Buffer: 'Buffer',
  'Dropped frames': 'Imagens perdidas',
  Quality: 'Qualidade',
  Auto: 'Auto',
  'Open in another player': 'Abrir noutro leitor',
  'Copy link': 'Copiar link',
  'Link copied': 'Link copiado',
  'No other video player installed': 'Não há outro leitor de vídeo instalado',
  'Guide time offset (hours)': 'Acerto de horas do guia (horas)',
  'Subtitle size': 'Tamanho das legendas',
  'Update playlists automatically (daily)': 'Atualizar listas automaticamente (todos os dias)',
  'User-Agent (optional, some providers need it)': 'User-Agent (opcional, alguns fornecedores pedem)',
  Edit: 'Editar',
  'Edit playlist': 'Editar lista',
  Saved: 'Guardado',
  Name: 'Nome',
  'TV guide link (XMLTV, optional)': 'Link do guia de TV (XMLTV, opcional)',
  'Playlist updated': 'Lista atualizada',
  'Channel list over the video': 'Lista de canais sobre o vídeo',
  'See-through': 'Transparente',
  Dark: 'Escura'
});

/* sleep timer */
let sleepT = 0,
  sleepAt = 0,
  sleepWarnT = 0;
function setSleep(min) {
  clearTimeout(sleepT);
  clearTimeout(sleepWarnT);
  sleepAt = 0;
  if (!min) {
    toast(t('Sleep timer off'));
    return;
  }
  sleepAt = Date.now() + min * 60000;
  toast(t('Sleep timer') + ': ' + min + ' ' + t('min'));
  sleepWarnT = setTimeout(
    () => {
      openDlg(
        `<h2>${ic('moon')} ${t('Sleep timer')}</h2><p>${t('Playback stops in 30 s')}</p><div class="row"><button class="btn p" id="slK">${t('Keep watching')}</button></div>`
      );
      $('#slK').onclick = () => {
        dlg.close();
        setSleep(30);
      };
    },
    Math.max(0, min * 60000 - 30000)
  );
  sleepT = setTimeout(() => {
    sleepAt = 0;
    if (dlg.open) dlg.close();
    stopPlayback();
    if (fsOn) back();
    toast(t('Stopped by the sleep timer'));
  }, min * 60000);
}
const sleepLeft = () => (sleepAt ? Math.max(1, Math.round((sleepAt - Date.now()) / 60000)) : 0);

/* programme reminders (while the app is open) */
const REM = LS.get('ap.rem', []).filter(r => r.s > Date.now() - 600e3);
const saveRem = () => LS.set('ap.rem', REM);
const remIdx = (c, p) => REM.findIndex(r => r.k === c.key && r.s === p.s);
function progDialog(c, p) {
  const has = remIdx(c, p) > -1,
    d = new Date(p.s);
  openDlg(
    `<h2>${ic('bell')} ${esc(p.t)}</h2><p class="mut">${esc(c.name)} · ${d.toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'short' })} ${hm(p.s)} – ${hm(p.e)}</p>${p.d ? `<p>${esc(p.d)}</p>` : ''}<div class="row"><button class="btn" id="pgW">${ic('play')} ${t('Watch channel now')}</button>${recNative() && c.kind === 'live' && p.e > Date.now() ? `<button class="btn" id="pgRec">${ic('rec')} ${RECS.some(r => r.id === recId(c, p)) ? t('Cancel recording') : t('Record')}</button>` : ''}<button class="btn p" id="pgR">${ic('bell')} ${has ? t('Cancel reminder') : t('Remind me')}</button></div>`
  );
  $('#pgW').onclick = () => {
    dlg.close();
    if (S.view === 'browse' && S.mode === 'live') play(c);
    else {
      go('live');
      setTimeout(() => play(c), 30);
    }
  };
  const pr = $('#pgRec');
  if (pr)
    pr.onclick = () => {
      dlg.close();
      recToggle(c, p);
    };
  $('#pgR').onclick = () => {
    const i = remIdx(c, p);
    if (i > -1) REM.splice(i, 1);
    else {
      REM.push({ k: c.key, s: p.s, t: p.t, n: c.name });
      toast(t('Reminder set') + ' · ' + hm(p.s));
    }
    saveRem();
    dlg.close();
  };
}
function checkReminders() {
  const n = Date.now();
  const due = REM.filter(r => !r.done && r.s - n <= 60e3 && r.s - n > -600e3);
  if (!due.length || dlg.open) return;
  const r = due[0];
  r.done = true;
  saveRem();
  const c = S.byKey[r.k];
  openDlg(
    `<h2>${ic('bell')} ${t('Starting now')}</h2><p><b>${esc(r.t)}</b><br><span class="mut">${esc(r.n)} · ${hm(r.s)}</span></p><div class="row"><button class="btn" id="dx">${t('Dismiss')}</button>${c ? `<button class="btn p" id="rmW">${ic('play')} ${t('Watch now')}</button>` : ''}</div>`
  );
  $('#dx').onclick = () => dlg.close();
  const w = $('#rmW');
  if (w)
    w.onclick = () => {
      dlg.close();
      if (S.view === 'browse' && S.mode === 'live') play(c);
      else {
        go('live');
        setTimeout(() => enterFsFor(c), 30);
      }
    };
  setTimeout(() => {
    for (let i = REM.length - 1; i >= 0; i--) if (REM[i].done && REM[i].s < Date.now() - 600e3) REM.splice(i, 1);
    saveRem();
  }, 1000);
}
setInterval(checkReminders, 15000);
