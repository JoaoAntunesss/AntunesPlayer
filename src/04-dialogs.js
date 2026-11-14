/* ---------- dialogs ---------- */
const dlg = $('#dlg');
function openDlg(html, cls) {
  dlg.className = cls || '';
  dlg.innerHTML = html;
  if (!dlg.open) dlg.showModal();
}
function addDemo() {
  const demo = `#EXTM3U\n#EXTINF:-1 tvg-chno="1" group-title="Demo",Big Buck Bunny\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8\n#EXTINF:-1 tvg-chno="2" group-title="Demo",Apple test stream\nhttps://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8\n#EXTINF:-1 tvg-chno="3" group-title="Demo",Sintel\nhttps://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8\n#EXTINF:-1 tvg-chno="4" group-title="Demo",Tears of Steel\nhttps://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8\n#EXTINF:-1 tvg-chno="5" group-title="Demo",Akamai live test\nhttps://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8\n#EXTINF:-1 group-title="Movies",Big Buck Bunny (mp4)\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\n#EXTINF:-1 group-title="Movies",Elephants Dream (mp4)\nhttps://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4\n`;
  addSource({ name: 'Demo channels', type: 'm3u', text: demo });
}
async function addSource(src) {
  src.id = 's' + Date.now().toString(36);
  S.sources.push(src);
  LS.set('ap.sources', S.sources);
  if (dlg.open) dlg.close();
  go('home');
  await selectSource(src.id, true);
  toast(t('Playlist added'));
  const s = S.sources.find(x => x.id === src.id);
  if (s && s.text != null) {
    /* keep pasted text so it can be refreshed offline */
  }
}
function addDialog(tab0) {
  let tab = tab0 || 'url';
  const draw = () => {
    openDlg(
      `<h2>${t('Add playlist')}</h2><div class="tabs"><button data-t="url" class="${tab === 'url' ? 'on' : ''}">${t('Playlist link (M3U / M3U8)').split(' (')[0]}</button><button data-t="text" class="${tab === 'text' ? 'on' : ''}">${t('Paste or upload')}</button><button data-t="xt" class="${tab === 'xt' ? 'on' : ''}">${t('Xtream login')}</button></div>
    <label>${t('Name')}</label><input id="aName" placeholder="My TV">` +
        (tab === 'url'
          ? `<label>${t('Playlist link (M3U / M3U8)')}</label><input id="aUrl" type="url" placeholder="https://…/playlist.m3u8">`
          : tab === 'text'
            ? `<label>${t('Playlist text')}</label><textarea id="aText" rows="5" placeholder="#EXTM3U …"></textarea><label>${t('or choose a file')}</label><input id="aFile" type="file" accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl">`
            : `<label>${t('Server (with http/https)')}</label><input id="xS" placeholder="http://server:8080"><label>${t('Username')}</label><input id="xU" autocomplete="off"><label>${t('Password')}</label><input id="xP" type="password" autocomplete="off">`) +
        `<label>${t('TV guide link (XMLTV, optional)')}</label><input id="aEpg" type="url" placeholder="https://…/guide.xml">${NATIVE ? `<label>${t('User-Agent (optional, some providers need it)')}</label><input id="aUA" placeholder="VLC/3.0.20 LibVLC/3.0.20" autocomplete="off">` : ''}<div class="row"><button class="btn" id="aCancel">${t('Cancel')}</button><button class="btn p" id="aOk">${t('Add')}</button></div>`
    );
    $$('.tabs button', dlg).forEach(
      b =>
        (b.onclick = () => {
          tab = b.dataset.t;
          draw();
        })
    );
    $('#aCancel').onclick = () => dlg.close();
    $('#aOk').onclick = async () => {
      const name = ($('#aName').value || '').trim() || 'My TV',
        epg = ($('#aEpg').value || '').trim(),
        ua = $('#aUA') ? $('#aUA').value.trim() : '';
      if (tab === 'url') {
        const u = ($('#aUrl').value || '').trim();
        if (!/^https?:\/\//i.test(u)) {
          toast(t('Fill in the fields'));
          return;
        }
        addSource({ name, type: 'm3u', url: u, epg, ua });
      } else if (tab === 'text') {
        let txt = $('#aText').value,
          f = $('#aFile').files[0];
        if (f) txt = await f.text();
        if (!txt || !/#EXTINF/i.test(txt)) {
          toast(t('Fill in the fields'));
          return;
        }
        addSource({ name, type: 'm3u', text: txt, epg, ua });
      } else {
        const server = $('#xS').value.trim(),
          user = $('#xU').value.trim(),
          pass = $('#xP').value;
        if (!/^https?:\/\//i.test(server) || !user) {
          toast(t('Fill in the fields'));
          return;
        }
        addSource({ name, type: 'xtream', server, user, pass, epg, ua });
      }
    };
  };
  draw();
}
/* settings split into tabs (built from the same controls, so every option keeps working) */
Object.assign(PT, {
  'Light mode (smoother on weak TVs)': 'Modo leve (mais fluido em TVs fracas)',
  on: 'ligado',
  off: 'desligado',
  General: 'Geral',
  Look: 'Aspeto',
  Player: 'Leitor',
  About: 'Sobre'
});
const SET_TABS = [
  ['general', 'General', 'home'],
  ['look', 'Look', 'sun'],
  ['player', 'Player', 'play'],
  ['lists', 'Playlists', 'stack'],
  ['account', 'Account', 'user'],
  ['about', 'About', 'info']
];
const SET_MAP = {
  sAcc: 'account',
  sBug: 'account',
  sPin: 'account',
  sStart: 'general',
  sNum: 'general',
  sTv: 'general',
  sLang: 'general',
  sStyle: 'look',
  sTheme: 'look',
  cAcc: 'look',
  cFx: 'look',
  sDig: 'look',
  sBg: 'look',
  cRst: 'look',
  sPan: 'look',
  sSub: 'player',
  sStab: 'player',
  sOff: 'player',
  sAuto: 'lists',
  sProxy: 'lists',
  sPS: 'lists',
  sSA: 'player',
  sOK: 'player',
  sOU: 'player',
  sCats: 'account',
  sBak: 'lists',
  sFavs: 'lists',
  sUpd: 'about'
};
function tabOfNode(n) {
  if (!n || n.nodeType !== 1) return null;
  const ids = [n.id, ...$$('[id]', n).map(x => x.id)].filter(Boolean);
  for (const id of ids) if (SET_MAP[id]) return SET_MAP[id];
  if (n.matches('[data-sl2]') || $('[data-sl2]', n)) return 'player';
  if ($('[data-r]', n) || $('[data-d]', n)) return 'lists';
  if (n.classList.contains('keys')) return 'about';
  return null;
}
function tabifySettings() {
  const kids = [...dlg.children],
    title = kids.shift(),
    panes = {},
    nav = document.createElement('div');
  nav.className = 'stabs';
  nav.setAttribute('role', 'tablist');
  SET_TABS.forEach(([k, l, i]) => {
    const p = document.createElement('div');
    p.className = 'spane';
    p.dataset.pane = k;
    panes[k] = p;
    nav.insertAdjacentHTML('beforeend', `<button data-st="${k}" role="tab">${ic(i)}<span>${t(l)}</span></button>`);
  });
  const last = kids[kids.length - 1],
    upd = last && $('#sUpd', last);
  if (upd) panes.about.appendChild(upd);
  let cur = 'general',
    pending = [];
  kids.slice(0, -1).forEach(n => {
    let tb = tabOfNode(n);
    if (!tb && n.tagName === 'LABEL') tb = tabOfNode(n.nextElementSibling);
    if (!tb && n.tagName === 'H2') {
      let x = n.nextElementSibling;
      while (x && !tb) {
        tb = tabOfNode(x) || (x.tagName === 'LABEL' && tabOfNode(x.nextElementSibling));
        x = x.nextElementSibling;
      }
    }
    if (n.tagName === 'H2' || n.tagName === 'LABEL') {
      pending.push(n);
      if (tb) {
        pending.forEach(p => panes[tb].appendChild(p));
        pending = [];
        cur = tb;
      }
      return;
    }
    tb = tb || cur;
    pending.forEach(p => panes[tb].appendChild(p));
    pending = [];
    panes[tb].appendChild(n);
    cur = tb;
  });
  pending.forEach(p => panes[cur].appendChild(p));
  {
    const bk = $('#sBak', panes.account),
      fv = $('#sFavs', panes.account);
    if (bk || fv) {
      const r = document.createElement('div');
      r.className = 'row';
      r.style.justifyContent = 'flex-start';
      [bk, fv].forEach(x => x && r.appendChild(x));
      panes.lists.insertBefore(r, panes.lists.firstChild);
    }
  }
  dlg.innerHTML = '';
  dlg.appendChild(title);
  dlg.appendChild(nav);
  const body = document.createElement('div');
  body.className = 'sbody';
  Object.values(panes).forEach(p => {
    if (p.children.length) body.appendChild(p);
    else $(`[data-st="${p.dataset.pane}"]`, nav).remove();
  });
  dlg.appendChild(body);
  if (last) dlg.appendChild(last);
  dlg.classList.add('settings');
  const show = k => {
    $$('.spane', dlg).forEach(p => (p.hidden = p.dataset.pane !== k));
    $$('[data-st]', nav).forEach(b => b.classList.toggle('on', b.dataset.st === k));
    S.setTab = k;
    body.scrollTop = 0;
  };
  $$('[data-st]', nav).forEach(b => (b.onclick = () => show(b.dataset.st)));
  show(S.setTab && panes[S.setTab] && panes[S.setTab].children.length ? S.setTab : 'general');
}
function settingsDialog() {
  const s = S.set;
  openDlg(`<h2>${ic('gear')} ${t('Settings')}</h2><button class="btn" id="sAcc" style="width:100%;justify-content:flex-start;margin-bottom:6px">${ic('user')} ${t('Google account')}${C.user ? ' · ' + esc(C.user.email || '') : ''}</button><button class="btn" id="sBug" style="width:100%;justify-content:flex-start;margin-bottom:6px">${ic('info')} ${t('Report a problem')}</button><label>${t('Style')}</label><select id="sStyle"><option value="circuit" ${(s.style || 'circuit') === 'circuit' ? 'selected' : ''}>${t('Circuit (electronic)')}</option><option value="soft" ${s.style === 'soft' ? 'selected' : ''}>${t('Soft')}</option></select><label>${t('Theme')}</label><select id="sTheme">${THEMES.map(x => `<option value="${x[0]}" ${s.theme === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>
  <label>${t('When the app opens')}</label><select id="sStart"><option value="last" ${(s.startup || 'last') === 'last' ? 'selected' : ''}>${t('Last channel in full screen (favourites)')}</option><option value="home" ${s.startup === 'home' ? 'selected' : ''}>${t('Home screen')}</option></select><label>${t('Number keys jump to')}</label><select id="sNum"><option value="chno" ${s.numberMode === 'chno' ? 'selected' : ''}>${t('Channel numbers from the playlist')}</option><option value="favs" ${s.numberMode === 'favs' ? 'selected' : ''}>${t('My favourites, in order')}</option></select>
  <label>${t('TV mode (remote, bigger text)')}</label><select id="sTv"><option value="auto" ${(s.tvMode || 'auto') === 'auto' ? 'selected' : ''}>${t('Automatic')} · ${isTvDevice() ? t('TV detected') : t('no TV detected')}</option><option value="on" ${s.tvMode === 'on' ? 'selected' : ''}>${t('Always on')}</option><option value="off" ${s.tvMode === 'off' ? 'selected' : ''}>${t('Off')}</option></select>
  <label>${t('Light mode (smoother on weak TVs)')}</label><select id="sLite"><option value="auto" ${(s.lite || 'auto') === 'auto' ? 'selected' : ''}>${t('Automatic')} · ${liteOn() ? t('on') : t('off')}</option><option value="on" ${s.lite === 'on' ? 'selected' : ''}>${t('Always on')}</option><option value="off" ${s.lite === 'off' ? 'selected' : ''}>${t('Off')}</option></select>
  <h2 style="margin-top:18px">${ic('cc')} ${t('Online subtitles')}</h2><label>${t('Subtitle languages (in order)')}</label><div class="row" style="justify-content:flex-start;gap:8px">${[0, 1, 2].map(i => `<select data-sl2="${i}" style="flex:1;min-width:120px"><option value="">—</option>${SUBL.map(x => `<option value="${x[0]}" ${subLangs()[i] === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>`).join('')}</div><label>${t('Turn on subtitles automatically')}</label><select id="sSA"><option value="1" ${s.subAuto !== false ? 'selected' : ''}>${t('Yes')}</option><option value="0" ${s.subAuto === false ? 'selected' : ''}>${t('No')}</option></select><label>${t('OpenSubtitles API key')}</label><input id="sOK" value="${esc(s.osKey || '')}" autocomplete="off" placeholder="${t('Built in (optional: your own key)')}"><label>${t('OpenSubtitles account (optional: 20 a day instead of 5)')}</label><div class="row" style="justify-content:flex-start;gap:8px"><input id="sOU" placeholder="${t('Username')}" value="${esc((LS.get('ap.osu', null) || {}).u || '')}" autocomplete="off" style="flex:1"><input id="sOP" type="password" placeholder="${t('Password')}" value="${esc((LS.get('ap.osu', null) || {}).p || '')}" autocomplete="off" style="flex:1"></div>
  <h2 style="margin-top:18px">${t('Colours')}</h2><label>${t('App colour (Live TV, menus, effects)')}</label>${colorPicker('cAcc', s.accent, getComputedStyle(document.documentElement).getPropertyValue('--acc').trim())}<label>${t('AWflix colour')}</label>${colorPicker('cFx', s.fxColor, '#e50914')}<label>${t('Numbers (clock and channels)')}</label><select id="sDig"><option value="" ${!s.digits ? 'selected' : ''}>${t('Theme default')}</option><option value="accent" ${s.digits === 'accent' ? 'selected' : ''}>${t('Same as the app colour')}</option></select><label>${t('Background')}</label><select id="sBg">${[
    ['circuit', 'Circuit lines'],
    ['plain', 'Plain'],
    ['black', 'Black']
  ]
    .map(x => `<option value="${x[0]}" ${(s.bgStyle || 'circuit') === x[0] ? 'selected' : ''}>${t(x[1])}</option>`)
    .join(
      ''
    )}</select><div class="row" style="justify-content:flex-start"><button class="btn" id="cRst">${t('Reset colours')}</button></div>
  <label>${t('Channel list over the video')}</label><select id="sPan"><option value="clear" ${s.panelBg !== 'dim' ? 'selected' : ''}>${t('See-through')}</option><option value="dim" ${s.panelBg === 'dim' ? 'selected' : ''}>${t('Dark')}</option></select>
  <label>${t('Guide time offset (hours)')}</label><select id="sOff">${[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(h => `<option value="${h}" ${(+s.epgOff || 0) === h ? 'selected' : ''}>${h > 0 ? '+' + h : h}</option>`).join('')}</select><label>${t('Live stream stability')}</label><select id="sStab">${[
    ['auto', 'Automatic (recommended)'],
    ['normal', 'Normal (less delay)'],
    ['stable', 'Stable (a few seconds more delay)'],
    ['max', 'Maximum (for very busy servers)']
  ]
    .map(x => `<option value="${x[0]}" ${(s.stab || 'auto') === x[0] ? 'selected' : ''}>${t(x[1])}</option>`)
    .join(
      ''
    )}</select><label>${t('Subtitle size')}</label><select id="sSub">${[80, 100, 130, 160, 200].map(z => `<option value="${z}" ${(+s.subSize || 100) === z ? 'selected' : ''}>${z}%</option>`).join('')}</select><label>${t('Update playlists automatically (daily)')}</label><select id="sAuto"><option value="1" ${s.autoRefresh !== false ? 'selected' : ''}>${t('Yes')}</option><option value="0" ${s.autoRefresh === false ? 'selected' : ''}>${t('No')}</option></select>
  <label>${t('Language')}</label><select id="sLang"><option value="en" ${LANG === 'en' ? 'selected' : ''}>English</option><option value="pt" ${LANG === 'pt' ? 'selected' : ''}>Português</option></select>
  <h2 style="margin-top:18px">${ic('lock')} ${t('Parental control')}</h2><label>${t('PIN (4 digits, empty = off)')}</label><input id="sPin" type="password" inputmode="numeric" maxlength="8" value="${esc(s.pin || '')}" autocomplete="off"><div class="row" style="justify-content:flex-start"><button class="btn" id="sCats">${t('Manage categories')}</button><button class="btn" id="sBak">${ic('stack')} ${t('Backup')}</button><button class="btn" id="sFavs">${ic('star')} ${t('Import / export favourites')}</button></div><label>${t('Helper link for blocked playlists (optional)')}</label><input id="sProxy" value="${esc(s.proxy)}" placeholder="https://your-helper.example/?url={url}"><label>${t('Also use it for streams')}</label><select id="sPS"><option value="0" ${!s.proxyStreams ? 'selected' : ''}>${t('No')}</option><option value="1" ${s.proxyStreams ? 'selected' : ''}>${t('Yes')}</option></select>
  <h2 style="margin-top:18px">${t('Playlists')}</h2>${S.sources.map(x => `<div style="display:flex;gap:6px;align-items:center;margin:6px 0"><b style="flex:1">${esc(x.name)}</b><button class="btn" data-r="${x.id}">${t('Refresh')}</button><button class="btn" data-d="${x.id}">${t('Delete')}</button></div>`).join('') || '<p class="mut">—</p>'}
  <h2 style="margin-top:18px">${t('Keyboard & remote')}</h2><div class="keys"><kbd>0–9</kbd><span>${t('jump to that channel')}</span><kbd>↑ ↓ / CH±</kbd><span>${t('next / previous channel')}</span><kbd>Enter</kbd><span>${t('channel list')}</span><kbd>F</kbd><span>${t('favourite on/off')}</span><kbd>L</kbd><span>${t('last channel')}</span><kbd>M</kbd><span>${t('mute')}</span><kbd>R</kbd><span>${t('record (needs a browser that allows it)')}</span><kbd>Z</kbd><span>${t('full screen')}</span></div>
  <div class="row" style="justify-content:space-between"><button class="btn" id="sUpd">${ic('refresh')} ${t('Check for updates')}${NATIVE ? ' · build ' + (BUILD || '—') : ''}</button><button class="btn" id="sTour">${ic('info')} ${t('Show the tutorial')}</button><button class="btn p" id="sOk">${t('Close')}</button></div>`);
  tabifySettings();
  $('#sTour').onclick = () => {
    dlg.close();
    LS.set('ap.tour', 0);
    go('home');
    setTimeout(() => tourStart(S.sources.length ? 'home' : 'welcome', true), 300);
  };
  const chg = () => {
    s.startup = $('#sStart').value;
    s.style = $('#sStyle').value;
    s.theme = $('#sTheme').value;
    s.numberMode = $('#sNum').value;
    s.tvMode = $('#sTv').value;
    applyTvMode();
    s.proxy = $('#sProxy').value.trim();
    s.proxyStreams = $('#sPS').value === '1';
    saveSet();
    applyLook();
    render();
  };
  $$('#sStart,#sStyle,#sTheme,#sNum,#sTv,#sPS', dlg).forEach(e => (e.onchange = chg));
  $('#sLite').onchange = e => {
    s.lite = e.target.value;
    saveSet();
    applyLite();
  };
  $$('[data-sl2]', dlg).forEach(
    x =>
      (x.onchange = () => {
        s.subLangs = [
          ...new Set(
            $$('[data-sl2]', dlg)
              .map(y => y.value)
              .filter(Boolean)
          )
        ].join(',');
        saveSet();
        S.subList = null;
      })
  );
  $('#sSA').onchange = e => {
    s.subAuto = e.target.value === '1';
    saveSet();
  };
  $('#sOK').onchange = e => {
    s.osKey = e.target.value.trim();
    saveSet();
  };
  $$('#sOU,#sOP', dlg).forEach(
    x =>
      (x.onchange = () => {
        LS.set('ap.osu', { u: $('#sOU').value.trim(), p: $('#sOP').value });
        LS.set('ap.ost', null);
      })
  );
  wireColorPicker('cAcc', c => {
    s.accent = c;
    saveSet();
    applyLook();
  });
  wireColorPicker('cFx', c => {
    s.fxColor = c;
    saveSet();
    applyLook();
  });
  $('#sDig').onchange = e => {
    s.digits = e.target.value;
    saveSet();
    applyLook();
  };
  $('#sBg').onchange = e => {
    s.bgStyle = e.target.value;
    saveSet();
    applyLook();
  };
  $('#cRst').onclick = () => {
    delete s.accent;
    delete s.fxColor;
    delete s.digits;
    delete s.bgStyle;
    saveSet();
    applyLook();
    settingsDialog();
  };
  $('#sPan').onchange = e => {
    s.panelBg = e.target.value;
    saveSet();
    applyLook();
  };
  $('#sStab').onchange = e => {
    s.stab = e.target.value;
    saveSet();
    stabBoost = { k: '', lvl: '' };
    if (S.cur && S.cur.kind === 'live') play(S.cur, true);
  };
  $('#sSub').onchange = e => {
    s.subSize = +e.target.value;
    saveSet();
    applySubs();
  };
  $('#sAuto').onchange = e => {
    s.autoRefresh = e.target.value === '1';
    saveSet();
  };
  $('#sOff').onchange = async e => {
    s.epgOff = +e.target.value;
    saveSet();
    const c = await idbGet('epg:' + S.srcId);
    if (c) {
      S.epg = shiftEpg(c.data);
      render();
      if (S.cur) showInfo(S.cur);
    }
  };
  $('#sProxy').onchange = chg;
  $('#sLang').onchange = e => {
    LS.set('ap.lang', e.target.value);
    location.reload();
  };
  $$('[data-r]', dlg).forEach(
    b =>
      (b.onclick = () => {
        dlg.close();
        selectSource(b.dataset.r, true);
      })
  );
  $$('[data-d]', dlg).forEach(
    b =>
      (b.onclick = () => {
        const id = b.dataset.d;
        S.sources = S.sources.filter(x => x.id !== id);
        LS.set('ap.sources', S.sources);
        idbDel('ch:' + id);
        idbDel('epg:' + id);
        dlg.close();
        selectSource(S.sources[0] && S.sources[0].id);
      })
  );
  $('#sOk').onclick = () => dlg.close();
  $('#sAcc').onclick = accountDialog;
  $('#sBug').onclick = () => bugDialog();
  $('#sCats').onclick = catsDialog;
  $('#sFavs').onclick = favsDialog;
  $('#sBak').onclick = backupDialog;
  $('#sUpd').onclick = () => {
    dlg.close();
    checkUpdate(true);
  };
  $('#sPin').onchange = () => {
    const p = $('#sPin').value.trim();
    const had = !!s.pin;
    s.pin = p;
    if (p && !had) {
      const a = new Set(s.locked || []);
      S.channels.forEach(c => {
        if (ADULT.test(c.group || '')) a.add(gkey(c));
      });
      s.locked = [...a];
    }
    S.unlocked = false;
    saveSet();
    refreshVis();
    render();
  };
}
function applyLook() {
  try {
    applyColors();
  } catch (e) {}
  if (!THEMES.some(x => x[0] === S.set.theme)) S.set.theme = 'night';
  document.documentElement.dataset.theme = S.set.theme;
  document.documentElement.dataset.style = S.set.style || 'circuit';
  document.body.classList.toggle('tv', !!S.set.tv);
  document.body.classList.toggle('pclear', S.set.panelBg !== 'dim');
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1115';
}
