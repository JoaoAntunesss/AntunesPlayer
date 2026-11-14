/* ---------- header ---------- */
const TITLES = { live: 'Live TV', vod: 'Movies', series: 'Series' };
function renderHeader() {
  renderNav();
  const vw = S.view;
  $('#title').textContent = vw === 'browse' ? t(TITLES[S.mode]) : vw === 'search' ? t('Search') : '';
  $('#q').placeholder =
    vw === 'search'
      ? t(
          S.qs === 'flix'
            ? 'Search movies and series…'
            : S.qs === 'live'
              ? 'Search channels…'
              : 'Search channels, movies, series…'
        )
      : vw === 'browse'
        ? t('Search') + ' · ' + t(TITLES[S.mode])
        : '';
  $('#bGuide').hidden = !(vw === 'home' || (vw === 'browse' && S.mode === 'live'));
  $('#bSearch').hidden = !(vw === 'home' || vw === 'flix') || !S.sources.length;
  if (!S.sources.length) $('#bGuide').hidden = true;
}
const NAV = [
  ['home', 'home', 'Home'],
  ['live', 'tv', 'Live TV'],
  ['flix', 'film', 'AWflix'],
  ['search', 'search', 'Search'],
  ['settings', 'gear', 'Settings']
];
function renderNav() {
  const cur = S.view === 'browse' ? (S.mode === 'live' ? 'live' : 'flix') : S.view === 'detail' ? 'flix' : S.view;
  $$('#bnav button').forEach((b, i) => {
    const n = NAV[i];
    if (!b.innerHTML) {
      b.innerHTML = ic(n[1]) + `<span>${t(n[2])}</span>`;
      b.onclick = () => {
        if (n[0] === 'settings') {
          settingsDialog();
          return;
        }
        if (n[0] === 'search') {
          openSearch('all');
          return;
        }
        go(n[0]);
      };
    }
    b.classList.toggle('on', n[0] === cur);
  });
  $('#bnav').hidden = !S.sources.length;
}
function tick() {
  const d = new Date(),
    tm = d.toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit', hour12: false }),
    dt = d.toLocaleDateString(LANG === 'pt' ? 'pt-PT' : undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  $('#clock b').innerHTML = seg(tm);
  $('#clock small').textContent = dt;
  $('#ovClock').innerHTML = seg(tm);
  if (S.cur && S.cur.kind === 'live') liveBar(S.cur);
}

/* ---------- home ---------- */
const fmtN = n => n.toLocaleString(LANG === 'pt' ? 'pt-PT' : undefined);
function contList() {
  const items = [],
    seenSer = {};
  Object.keys(POS).forEach(k => {
    const c = S.byKey[k] || EPS[k];
    if (!c) return;
    if (c.ser) return;
    items.push({ c, t: WTS[k] || 0 });
  });
  Object.keys(SLAST).forEach(sk => {
    const l = SLAST[sk],
      ep = EPS[l.k] || S.byKey[l.k],
      sr = S.byKey[sk];
    if (!ep || seenSer[sk]) return;
    seenSer[sk] = 1;
    const nx = !POS[l.k] && l.next && EPS[l.next],
      cur = nx || ep,
      lab = epLabel(cur);
    const card = Object.assign({}, sr || ep, {
      cont: true,
      ser: sk,
      cpos: POS[l.k] || 0,
      cdur: DUR[l.k] || ep.dur || 2700,
      clabel: POS[l.k] ? lab : nx ? t('Next episode') + ' · ' + lab : t('Next episode')
    });
    if (!sr) {
      card.key = ep.key;
    }
    items.push({ c: card, t: l.t });
  });
  return items
    .sort((a, b) => b.t - a.t)
    .slice(0, 16)
    .map(x => x.c);
}
const TRACE =
  '<svg class="trace" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMin slice" aria-hidden="true"><g><path d="M120 58H230l26 26H400"/><path d="M120 72h70l18 18v40l22 22H400"/><path d="M300 0v40l20 20h80"/><path d="M340 300v-60l-24-24h-40l-20-20v-30"/><circle cx="256" cy="84" r="4"/><circle cx="230" cy="152" r="4"/><circle cx="256" cy="166" r="4"/></g><path class="pulse" d="M120 58H230l26 26H400"/><path class="pulse p2" d="M120 72h70l18 18v40l22 22H400"/></svg>';
function renderHome() {
  const box = $('#vHome');
  if (!S.sources.length) {
    box.innerHTML = `<div class="welcome"><div class="wmark">${ic('tv')}</div><h2>${t('Welcome to AWplayer')}</h2><p>${t('AWplayer plays the streams you give it — it comes with no channels. Add your own playlist, or look around with free test streams.')}</p>
    <div class="wacts"><button class="btn p big" id="wX">${ic('user')} ${t('Xtream login')}</button><button class="btn big" id="wU">${ic('plus')} ${t('Add a playlist')}</button><button class="btn big ghost" id="wD">${ic('play')} ${t('Try demo channels')}</button><button class="btn big ghost" id="wS">${ic('gear')} ${t('Settings')}</button></div>${C.user ? `<p class="mut">${ic('user')} ${t('Signed in as')} <b>${esc(C.user.email || '')}</b> · ${t('Synced')}. ${t('Playlists you add here are saved to your account.')}</p>` : `<div class="wacts"><button class="btn big" id="wG">${ic('user')} ${t('Sign in with Google')}</button><button class="btn big ghost" id="wC">${ic('tv')} ${t('Sign in with a code (TV)')}</button></div><p class="mut">${t('Your playlists are already in your Google account. Sign in to get them back.')}</p>`}</div>`;
    tourMaybe('welcome');
    $('#wX').onclick = () => addDialog('xt');
    $('#wU').onclick = () => addDialog('url');
    $('#wD').onclick = addDemo;
    $('#wS').onclick = settingsDialog;
    if ($('#wG')) {
      $('#wG').onclick = signInFlow;
      $('#wC').onclick = pairDialog;
    }
    return;
  }
  const n = k => S.vis.filter(c => c.kind === k).length,
    L = n('live'),
    M = n('vod'),
    Se = n('series'),
    src = curSrc() || {},
    a = S.acct,
    ld = S.loading;
  const cnt = (x, w) => (ld ? `<small>${t('Loading your playlist…')}</small>` : `<small>${seg(x, 'cnt')} ${w}</small>`);
  const exp =
    a && a.exp
      ? new Date(a.exp * 1000).toLocaleDateString(LANG === 'pt' ? 'pt-PT' : undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : a
        ? t('Never')
        : '';
  const cont = contList(),
    rec = S.recent
      .map(k => S.byKey[k])
      .filter(c => c && c.kind === 'live')
      .slice(0, 14);
  box.innerHTML = `<div class="hgrid">
    <button class="tile t-live" data-go="live">${TRACE}${ic('tv')}<b>${t('Live TV')}</b>${cnt(L, t('channels'))}</button>
    <button class="tile t-mov t-flix" data-go="flix">${TRACE}${ic('film')}<b>AW<span class="fxr">flix</span></b>${ld ? `<small>${t('Loading your playlist…')}</small>` : `<small>${seg(M, 'cnt')} ${t('movies')} · ${seg(Se, 'cnt')} ${t('series')}</small>`}<span class="fxchips"><span data-go2="movies">${ic('film')} ${t('Movies')}</span><span data-go2="series">${ic('series')} ${t('Series')}</span></span></button>
    <div class="minis">
      <button class="mini" data-go="guide">${ic('guide')}<span>${t('TV guide')}</span></button>
      <button class="mini" data-go="sports">${ic('tv')}<span>${t('Games')}</span></button>
      <button class="mini" data-go="fav">${ic('star')}<span>${t('Favourites')}</span><small>${favList().length}</small></button>
      <button class="mini" data-go="search">${ic('search')}<span>${t('Search')}</span></button>
      <button class="mini" data-go="lists">${ic('stack')}<span>${t('Playlists')}</span><small>${S.sources.length}</small></button>
      <button class="mini" data-go="now">${ic('now')}<span>${t('On now')}</span></button>
      <button class="mini" data-go="stats">${ic('chart')}<span>${t('Statistics')}</span></button>
      <button class="mini" data-go="settings">${ic('gear')}<span>${t('Settings')}</span></button>
    </div>
    <div class="acct"><div class="ah">${ic('user')}<div><b>${esc(src.name || '')}</b><small>${src.type === 'xtream' ? 'Xtream' : 'M3U'}${a && a.status ? ' · ' + esc(a.status) : ''}</small></div><button class="ib" id="hRef" aria-label="${t('Refresh')}">${ic('refresh')}</button></div><button class="btn hprof" id="hProf"><span class="pfav sm" style="background:${profCur().color}">${esc(profCur().name.charAt(0).toUpperCase())}</span> ${esc(profCur().name)}${kidsOn() ? ` · ${t('Kids')}` : ''}</button>
      ${a ? `<dl><dt>${t('Expires')}</dt><dd>${esc(exp)}</dd><dt>${t('Connections')}</dt><dd>${esc(a.act != null ? a.act : '–')} / ${esc(a.max || '–')}</dd></dl>` : `<dl><dt>${t('Live TV')}</dt><dd>${fmtN(L)}</dd><dt>${t('Movies')}</dt><dd>${fmtN(M)}</dd></dl>`}
      ${S.loadErr ? `<p class="err">${esc(S.loadErr)}</p>` : ''}</div>
  </div>
  ${cont.length ? `<section class="hrow"><h3>${t('Continue watching')}</h3><div class="rail">${cont.map(posterHtml).join('')}</div></section>` : ''}
  ${rec.length ? `<section class="hrow"><h3>${t('Recent channels')}</h3><div class="rail chrail">${rec.map(c => `<button class="chc" data-k="${c.key}">${logoHtml(c)}<b>${seg(shownNum(c))}</b><span>${esc(c.name)}</span></button>`).join('')}</div></section>` : ''}`;
  $$('[data-go]', box).forEach(
    b =>
      (b.onclick = () => {
        const g = b.dataset.go;
        if (g === 'guide') openGuide();
        else if (g === 'now') nowDialog();
        else if (g === 'stats') statsDialog();
        else if (g === 'sports') sportsDialog();
        else if (g === 'lists') listsDialog();
        else if (g === 'settings') settingsDialog();
        else if (g === 'fav') {
          S.gsel.live = 'fav';
          go('live');
        } else if (g === 'search') openSearch('all');
        else go(g);
      })
  );
  $$('[data-go2]', box).forEach(
    x =>
      (x.onclick = e => {
        e.stopPropagation();
        S.fx = true;
        go(x.dataset.go2);
      })
  );
  $('#hRef').onclick = () => selectSource(S.srcId, true);
  $('#hProf').onclick = () => profilesDialog();
  if (!ld && M + Se + L > 0) tourMaybe('home');
  wireItems(box);
  $$('.chc', box).forEach(
    b =>
      (b.onclick = () => {
        const c = S.byKey[b.dataset.k];
        if (c) {
          S.gsel.live = 'recent';
          go('live');
          play(c);
        }
      })
  );
}

/* ---------- lists ---------- */
const logoHtml = c =>
  c.logo
    ? `<img loading="lazy" decoding="async" src="${esc(c.logo)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'lg',textContent:${esc(JSON.stringify((c.name || '?').charAt(0)))}}))">`
    : `<span class="lg">${esc((c.name || '?').charAt(0))}</span>`;
function rowHtml(c) {
  const nn = nowNext(c),
    fav = S.favs.includes(c.key),
    n = shownNum(c),
    pr = nn && nn.now ? Math.round(((Date.now() - nn.now.s) / (nn.now.e - nn.now.s)) * 100) : 0;
  return `<div class="ch ${S.cur && S.cur.key === c.key ? 'on' : ''}" tabindex="0" data-k="${c.key}"><span class="n">${seg(n)}</span><span class="lgw">${logoHtml(c)}</span><div class="t"><b>${esc(c.name)}</b><span>${nn && nn.now ? esc(nn.now.t) : esc(c.group || '')}</span>${nn && nn.now ? `<div class="pb"><i style="width:${pr}%"></i></div>` : ''}</div><span class="ctl2">${favEditing() ? `<button class="mv" data-mv="-1" data-k2="${c.key}" aria-label="Move up">${ic('up')}</button><button class="mv" data-mv="1" data-k2="${c.key}" aria-label="Move down">${ic('down')}</button>${S.group.startsWith('u:') ? `<button class="mv rmv" data-rm="${c.key}" aria-label="${t('Remove from list')}">${ic('close')}</button>` : ''}<span class="grip" data-g2="${c.key}" aria-hidden="true">${ic('grip')}</span>` : `<button class="star ${fav ? 'on' : ''}" data-s="${c.key}" aria-label="${t('Favourite')}">${ic(fav ? 'starF' : 'star')}</button>`}</span></div>`;
}
function posterHtml(c) {
  const pos = c.cont ? c.cpos : POS[c.key],
    ini = esc((c.name || '?').charAt(0)),
    fav = S.favs.includes(c.key);
  return `<div class="pc" tabindex="0" data-k="${c.key}"${c.cont ? ` data-cont="${esc(c.ser)}"` : ''}><div class="po">${c.logo ? `<img loading="lazy" decoding="async" src="${esc(c.logo)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${ini}</span>${imdbOf(c) ? `<i class="rt imdb">IMDb ${c._im.toFixed(1).replace('.', LANG === 'pt' ? ',' : '.')}</i>` : c.rating ? `<i class="rt">${c.rating.toFixed(1).replace('.', LANG === 'pt' ? ',' : '.')}</i>` : ''}${fav ? `<i class="fv">${ic('starF')}</i>` : ''}${NEWEP && NEWEP[c.key] ? `<i class="newep">${NEWEP[c.key].n > 1 ? NEWEP[c.key].n + ' ' + t('new') : t('New')}</i>` : ''}${pos ? `<div class="pp"><i style="width:${Math.min(100, Math.round((pos / ((c.cont ? c.cdur : DUR[c.key]) || c.dur || 5400)) * 100))}%"></i></div>` : ''}${SEEN[c.key] && !pos && !c.cont ? `<i class="seen">${ic('check')}</i>` : ''}${c.cont && c.clabel ? `<i class="nxt ${pos ? 'up' : ''}">${esc(c.clabel)}</i>` : ''}</div><b>${esc(c.name)}</b></div>`;
}
function wireItems(box) {
  $$('.ch', box).forEach(r => {
    r.onclick = e => {
      if (e.target.closest('.star') || e.target.closest('.mv') || e.target.closest('.grip')) return;
      if (favEditing()) {
        liftRow(r);
        return;
      }
      pick(S.byKey[r.dataset.k]);
    };
    r.onkeydown = e => {
      if (favEditing()) {
        if (e.key === 'Enter') {
          e.preventDefault();
          liftRow(r);
          return;
        }
        if (r.classList.contains('lift') && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
          moveFav(r.dataset.k, e.key === 'ArrowUp' ? -1 : 1, true);
          return;
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        pick(S.byKey[r.dataset.k]);
      }
    };
  });
  $$('.grip', box).forEach(g => (g.onpointerdown = e => dragFav(e, g.closest('.ch'))));
  $$('.ch', box).forEach(
    r =>
      (r.oncontextmenu = e => {
        e.preventDefault();
        const c = S.byKey[r.dataset.k];
        if (c && c.kind === 'live') addToListDialog(c);
      })
  );
  $$('.pc', box).forEach(r => {
    r.onclick = () => {
      const sk = r.dataset.cont,
        it = S.byKey[r.dataset.k] || EPS[r.dataset.k];
      if (sk && S.byKey[sk]) {
        S.autoResume = true;
        openDetail(S.byKey[sk]);
        return;
      }
      if (it && it.ser) {
        const sr = S.byKey[it.ser];
        if (sr) openDetail(sr);
        enterFsFor(it);
      } else openDetail(it);
    };
    r.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        r.click();
      }
    };
  });
  $$('.star', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        toggleFav(S.byKey[b.dataset.s]);
      })
  );
  $$('.rmv', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const UL = curUList();
        if (UL) {
          UL.keys = UL.keys.filter(x => x !== b.dataset.rm);
          saveLists();
          renderBrowse();
        }
      })
  );
  $$('.mv:not(.rmv)', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        moveFav(b.dataset.k2, +b.dataset.mv);
        const f = $(`.mv[data-k2="${b.dataset.k2}"][data-mv="${b.dataset.mv}"]`);
        if (f) f.focus();
      })
  );
}
function pick(c) {
  if (!c) return;
  if (c.kind !== 'live') {
    openDetail(c);
    return;
  }
  if (S.view !== 'browse') {
    enterFsFor(c);
    return;
  }
  if (S.cur && S.cur.key === c.key && $('#msg').hidden) enterFs();
  else play(c);
}
