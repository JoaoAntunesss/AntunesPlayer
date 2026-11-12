/* ---------- favourites ---------- */
function toggleFav(c) {
  if (!c) return;
  const i = S.favs.indexOf(c.key);
  if (i < 0) {
    S.favs.push(c.key);
    toast(
      t('Added to favourites') +
        (S.set.numberMode === 'favs' && c.kind === 'live'
          ? ` · ${favList().filter(x => x.kind === 'live').length}`
          : '')
    );
  } else {
    S.favs.splice(i, 1);
    toast(t('Removed from favourites'));
  }
  LS.set('ap.favs', S.favs);
  if (S.view !== 'detail') render();
  updateFavBtn();
}
function askPin(ok) {
  openDlg(
    `<h2>${ic('lock')} ${t('Enter PIN')}</h2><input id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="pOk">OK</button></div>`
  );
  const go2 = () => {
    if ($('#pin').value === String(S.set.pin || '')) {
      dlg.close();
      ok();
    } else {
      toast(t('Wrong PIN'));
      $('#pin').value = '';
    }
  };
  $('#pOk').onclick = go2;
  $('#pin').onkeydown = e => {
    if (e.key === 'Enter') go2();
  };
  $('#dx').onclick = () => dlg.close();
  setTimeout(() => $('#pin').focus(), 50);
}
function catsDialog() {
  const H = new Set(S.set.hidden || []),
    L = new Set(S.set.locked || []),
    gs = {};
  S.channels.forEach(c => {
    gs[gkey(c)] = (gs[gkey(c)] || 0) + 1;
  });
  const lab = { live: t('Live TV'), vod: t('Movies'), series: t('Series') },
    keys = Object.keys(gs).sort();
  openDlg(
    `<h2>${t('Manage categories')}</h2><label class="gq">${ic('search')}<input id="cq" placeholder="${t('Filter categories…')}"></label><div class="catm">${keys
      .map(k => {
        const [kd, ...g] = k.split(':');
        return `<div class="cm" data-n="${esc(k.toLowerCase())}"><span><b>${esc(g.join(':'))}</b><small>${lab[kd]} · ${gs[k]}</small></span><label class="tg"><input type="checkbox" data-h="${esc(k)}" ${H.has(k) ? 'checked' : ''}>${t('Hide')}</label><label class="tg"><input type="checkbox" data-l="${esc(k)}" ${L.has(k) ? 'checked' : ''} ${S.set.pin ? '' : 'disabled'}>${ic('lock')}</label></div>`;
      })
      .join('')}</div><div class="row"><button class="btn p" id="dx">OK</button></div>`
  );
  $('#cq').oninput = () => {
    const q = $('#cq').value.trim().toLowerCase();
    $$('.cm', dlg).forEach(r => (r.style.display = !q || r.dataset.n.includes(q) ? '' : 'none'));
  };
  $$('[data-h]', dlg).forEach(
    x =>
      (x.onchange = () => {
        const a = new Set(S.set.hidden || []);
        x.checked ? a.add(x.dataset.h) : a.delete(x.dataset.h);
        S.set.hidden = [...a];
        saveSet();
        refreshVis();
      })
  );
  $$('[data-l]', dlg).forEach(
    x =>
      (x.onchange = () => {
        const a = new Set(S.set.locked || []);
        x.checked ? a.add(x.dataset.l) : a.delete(x.dataset.l);
        S.set.locked = [...a];
        saveSet();
        refreshVis();
      })
  );
  $('#dx').onclick = () => {
    dlg.close();
    render();
  };
}
const ADULT = /adult|xxx|porn|\+ ?18|18 ?\+|erotic|for adults/i;
function catchUrl(c, p) {
  const x = xbase();
  if (!x || !c.sid) return '';
  const tz = S.acct && S.acct.tz,
    d = new Date(p.s);
  let parts;
  try {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: tz || undefined,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      })
        .formatToParts(d)
        .map(o => [o.type, o.value])
    );
  } catch (e) {
    parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      })
        .formatToParts(d)
        .map(o => [o.type, o.value])
    );
  }
  const st = `${parts.year}-${parts.month}-${parts.day}:${parts.hour}-${parts.minute}`,
    dur = Math.max(1, Math.ceil((p.e - p.s) / 60000));
  return `${x.base}/timeshift/${x.q(x.s.user)}/${x.q(x.s.pass)}/${dur}/${st}/${c.sid}.ts`;
}
const canCatch = (c, p) =>
  c.arch && c.sid && p.e <= Date.now() + 60000 && p.s > Date.now() - (c.archD || 1) * 86400000 && xbase();
function playCatch(c, p) {
  const url = catchUrl(c, p);
  if (!url) return;
  enterFsFor({
    name: `${c.name} · ${p.t}`,
    logo: c.logo,
    group: `${t('Catch-up')} · ${hm(p.s)}–${hm(p.e)}`,
    url,
    kind: 'catchup',
    num: 0,
    key: hash(url)
  });
}
function rememberNext(c, nx) {
  EPS[nx.key] = nx;
  const ks = Object.keys(EPS);
  if (ks.length > 80) delete EPS[ks[0]];
  LS.set('ap.eps', EPS);
  SLAST[c.ser] = Object.assign({}, SLAST[c.ser] || { k: c.key, t: Date.now() }, { next: nx.key });
  saveWatch();
}
function nextEpisode() {
  const c = S.cur,
    d = S.detail;
  if (!c || !c.ser || !d || d.key !== c.ser || !S.deps) return null;
  const ss = Object.keys(S.deps).sort((a, b) => a - b),
    list = S.deps[c.sn] || [];
  if (c.n + 1 < list.length) {
    const nx = epObj(d, c.sn, list[c.n + 1], c.n + 1);
    rememberNext(c, nx);
    return nx;
  }
  const si = ss.indexOf(String(c.sn));
  if (si > -1 && ss[si + 1] && (S.deps[ss[si + 1]] || []).length) {
    const nx = epObj(d, ss[si + 1], S.deps[ss[si + 1]][0], 0);
    rememberNext(c, nx);
    return nx;
  }
  const ns = ss[ss.indexOf(String(c.sn)) + 1];
  return ns && S.deps[ns] && S.deps[ns][0] ? epObj(d, ns, S.deps[ns][0], 0) : null;
}
function newListDialog(done, edit) {
  openDlg(
    `<h2>${ic('stack')} ${edit ? t('Rename') : t('New list')}</h2><label>${t('Name')}</label><input id="lnName" maxlength="40" value="${esc(edit ? edit.name : '')}" placeholder="${t('e.g. Sport, Kids, News')}"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="lnOk">${t('Save')}</button></div>`
  );
  const ok = () => {
    const n = $('#lnName').value.trim();
    if (!n) {
      toast(t('Fill in the fields'));
      return;
    }
    let L = edit;
    if (L) L.name = n;
    else {
      L = { id: Date.now().toString(36), name: n, keys: [] };
      S.lists.push(L);
    }
    saveLists();
    dlg.close();
    done && done(L);
  };
  $('#lnOk').onclick = ok;
  $('#lnName').onkeydown = e => {
    if (e.key === 'Enter') ok();
  };
  $('#dx').onclick = () => dlg.close();
  setTimeout(() => $('#lnName').focus(), 50);
}
function addToListDialog(c) {
  if (!c) return;
  const draw = () => {
    openDlg(
      `<h2>${ic('stack')} ${t('Add to list')}</h2><p class="mut">${esc(c.name)}</p><div class="catlist">${S.lists.map(L => `<button data-l="${L.id}" class="${L.keys.includes(c.key) ? 'on' : ''}">${ic(L.keys.includes(c.key) ? 'check' : 'plus')}<span>${esc(L.name)}</span><small>${L.keys.length}</small></button>`).join('') || `<p class="mut">${t('No lists yet.')}</p>`}</div><div class="row" style="justify-content:space-between"><button class="btn" id="lNew">${ic('plus')} ${t('New list')}</button><button class="btn p" id="dx">OK</button></div>`
    );
    $('#dx').onclick = () => {
      dlg.close();
      if (S.view === 'browse') renderBrowse();
    };
    $('#lNew').onclick = () =>
      newListDialog(L => {
        L.keys.push(c.key);
        saveLists();
        draw();
      });
    $$('[data-l]', dlg).forEach(
      b =>
        (b.onclick = () => {
          const L = S.lists.find(x => x.id === b.dataset.l);
          const i = L.keys.indexOf(c.key);
          i < 0 ? L.keys.push(c.key) : L.keys.splice(i, 1);
          saveLists();
          draw();
          const f = $(`[data-l="${L.id}"]`, dlg);
          if (f) f.focus();
        })
    );
  };
  draw();
}
function moveFavTo(k, to) {
  const UL = curUList();
  if (UL) {
    const a = UL.keys,
      i = a.indexOf(k);
    if (i < 0) return false;
    to = Math.max(0, Math.min(a.length - 1, to));
    if (to === i) return false;
    a.splice(to, 0, a.splice(i, 1)[0]);
    saveLists();
    return true;
  }
  const live = favLive().map(c => c.key),
    i = live.indexOf(k);
  if (i < 0) return false;
  to = Math.max(0, Math.min(live.length - 1, to));
  if (to === i) return false;
  live.splice(to, 0, live.splice(i, 1)[0]);
  const slots = S.favs.map((x, n) => (live.includes(x) ? n : -1)).filter(n => n >= 0);
  slots.forEach((n, j) => {
    S.favs[n] = live[j];
  });
  LS.set('ap.favs', S.favs);
  return true;
}
function moveFav(k, d, keepLift) {
  const UL = curUList(),
    i = UL ? UL.keys.indexOf(k) : favLive().findIndex(c => c.key === k);
  if (!moveFavTo(k, i + d)) return;
  renderList();
  const r = $(`#list .ch[data-k="${k}"]`);
  if (r) {
    if (keepLift) r.classList.add('lift');
    r.focus({ preventScroll: true });
    r.scrollIntoView({ block: 'nearest' });
  }
}
function liftRow(r) {
  const was = r.classList.contains('lift');
  $$('#list .ch.lift').forEach(x => x.classList.remove('lift'));
  if (!was) r.classList.add('lift');
  else toast(t('Order saved'));
}
function dragFav(e, row) {
  e.preventDefault();
  const box = $('#list'),
    rows = $$('.ch', box),
    h = row.getBoundingClientRect().height + 4,
    y0 = e.clientY,
    i0 = rows.indexOf(row);
  let to = i0;
  row.classList.add('drag');
  row.setPointerCapture && row.setPointerCapture(e.pointerId);
  const mv = ev => {
    const dy = ev.clientY - y0;
    row.style.transform = `translateY(${dy}px)`;
    to = Math.max(0, Math.min(rows.length - 1, i0 + Math.round(dy / h)));
    rows.forEach((r2, n) => {
      if (r2 === row) return;
      const shift = n > i0 && n <= to ? -h : n < i0 && n >= to ? h : 0;
      r2.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };
  const up = () => {
    document.removeEventListener('pointermove', mv);
    document.removeEventListener('pointerup', up);
    rows.forEach(r2 => {
      r2.style.transform = '';
    });
    row.classList.remove('drag');
    if (moveFavTo(row.dataset.k, to)) {
      renderList();
      toast(t('Order saved'));
    }
  };
  document.addEventListener('pointermove', mv);
  document.addEventListener('pointerup', up);
}
function updateFavBtn() {
  const f = S.cur && S.favs.includes(S.cur.key);
  $('#cFav').innerHTML = ic(f ? 'starF' : 'star');
  $('#cFav').classList.toggle('on', !!f);
}

/* ---------- TV guide ---------- */
function openGuide() {
  const base = S.view === 'browse' && S.mode === 'live' ? baseList() : S.channels.filter(c => c.kind === 'live'),
    list = base.filter(c => c.kind === 'live').slice(0, 200);
  const PX = 4,
    step = 30 * 60000,
    now = Date.now(),
    start = Math.floor((now - (list.some(c => c.arch) ? 3 * 3600000 : 45 * 60000)) / step) * step,
    end = start + 9 * 3600000,
    W = ((end - start) / 60000) * PX;
  const ticks = [];
  for (let x = start; x < end; x += step) ticks.push(`<i style="left:${((x - start) / 60000) * PX}px">${hm(x)}</i>`);
  const rows = list
    .map(c => {
      const l = epgFor(c) || [],
        bl = l
          .filter(p => p.e > start && p.s < end)
          .map(p => {
            const s = Math.max(p.s, start),
              e = Math.min(p.e, end);
            const cp = p.e <= now && canCatch(c, p);
            return `<button class="pg ${p.s <= now && p.e > now ? 'now' : ''} ${cp ? 'cu' : ''} ${remIdx(c, p) > -1 ? 'rem' : ''}" data-st="${p.s}" ${cp ? `data-ps="${p.s}"` : ''} style="left:${((s - start) / 60000) * PX}px;width:${Math.max(24, ((e - s) / 60000) * PX - 3)}px" data-k="${c.key}"><b>${esc(p.t)}</b><small>${hm(p.s)} – ${hm(p.e)}</small></button>`;
          })
          .join('');
      return `<div class="gr"><button class="gc" data-k="${c.key}"><span class="n">${seg(shownNum(c))}</span><span class="lgw">${logoHtml(c)}</span><span class="nm">${esc(c.name)}</span></button><div class="gt" style="width:${W}px">${bl || `<span class="gnone">—</span>`}</div></div>`;
    })
    .join('');
  openDlg(
    `<div class="gh"><h2>${ic('guide')} ${t('TV guide')}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('back')}</button></div><div class="gscroll" id="gs"><div class="gcols"><div class="gc0"></div><div class="gaxis" style="width:${W}px">${ticks.join('')}<u style="left:${((now - start) / 60000) * PX}px"></u></div></div>${rows || `<div class="empty"><p>${t('No guide data yet')}</p></div>`}</div>`,
    'full'
  );
  $('#dx').onclick = () => dlg.close();
  const gs = $('#gs');
  gs.scrollLeft = Math.max(0, ((now - start) / 60000) * PX - 80);
  $$('#gs [data-k]').forEach(
    b =>
      (b.onclick = () => {
        const c = S.byKey[b.dataset.k];
        if (b.dataset.st && +b.dataset.st > Date.now()) {
          const p = (epgFor(c) || []).find(x => x.s === +b.dataset.st);
          if (p) {
            progDialog(c, p);
            return;
          }
        }
        dlg.close();
        if (b.dataset.ps) {
          const p = (epgFor(c) || []).find(x => x.s === +b.dataset.ps);
          if (p) {
            playCatch(c, p);
            return;
          }
        }
        if (S.view === 'browse' && S.mode === 'live') play(c);
        else {
          go('live');
          setTimeout(() => play(c), 30);
        }
      })
  );
  if (!Object.keys(S.epg).length) toast(t('No guide data yet'));
}

/* ---------- playlists dialog ---------- */
function listsDialog() {
  openDlg(`<h2>${t('Playlists')}</h2><div class="srcs">${S.sources.map(x => `<div class="srow ${x.id === S.srcId ? 'on' : ''}"><span class="sic">${ic(x.type === 'xtream' ? 'user' : 'stack')}</span><div><b>${esc(x.name)}</b><small>${x.type === 'xtream' ? 'Xtream' : 'M3U'}${x.id === S.srcId ? ' · ' + t('Active') : ''}</small></div>${x.id === S.srcId ? '' : `<button class="btn" data-u="${x.id}">${t('Use')}</button>`}<button class="ib" data-r="${x.id}" aria-label="${t('Refresh')}">${ic('refresh')}</button><button class="ib" data-e="${x.id}" aria-label="${t('Edit')}">${ic('edit')}</button><button class="btn" data-d="${x.id}">${t('Delete')}</button></div>`).join('')}</div>
  <div class="row"><button class="btn" id="lX">${ic('user')} ${t('Xtream login')}</button><button class="btn" id="lU">${ic('plus')} ${t('Add a playlist')}</button><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close();
  $('#lX').onclick = () => addDialog('xt');
  $('#lU').onclick = () => addDialog('url');
  $$('[data-u]', dlg).forEach(
    b =>
      (b.onclick = () => {
        dlg.close();
        selectSource(b.dataset.u);
      })
  );
  $$('[data-r]', dlg).forEach(
    b =>
      (b.onclick = () => {
        dlg.close();
        selectSource(b.dataset.r, true);
      })
  );
  $$('[data-e]', dlg).forEach(b => (b.onclick = () => editSourceDialog(b.dataset.e)));
  $$('[data-d]', dlg).forEach(
    b =>
      (b.onclick = () => {
        const id = b.dataset.d;
        S.sources = S.sources.filter(x => x.id !== id);
        LS.set('ap.sources', S.sources);
        idbDel('ch:' + id);
        idbDel('epg:' + id);
        if (id === S.srcId) selectSource(S.sources[0] && S.sources[0].id);
        listsDialog();
        render();
      })
  );
}

/* ---------- wiring ---------- */
[
  ['#bBack', 'back'],
  ['#bSearch', 'search'],
  ['#bGuide', 'guide'],
  ['#bSet', 'gear'],
  ['#qWrap .si', 'search'],
  ['#pExpand', 'expand'],
  ['#cExit', 'back'],
  ['#cBack', 'rew10'],
  ['#cFwd', 'fwd10'],
  ['#cPlay', 'pause'],
  ['#cPrev', 'skp'],
  ['#cNext', 'skn'],
  ['#cTrk', 'cc'],
  ['#cAsp', 'aspect'],
  ['#cRec', 'rec'],
  ['#cMute', 'vol'],
  ['#cInfo', 'info'],
  ['#cMore', 'dots'],
  ['#cpPrev', 'left'],
  ['#cpNext', 'right'],
  ['#csClose', 'close'],
  ['#cList i', 'stack']
].forEach(([s, n]) => {
  $(s).innerHTML = ic(n);
});
$('#bBack').onclick = () => back();
$('#bSearch').onclick = () => openSearch(S.view === 'flix' ? 'flix' : 'all');
$('#bGuide').onclick = openGuide;
$('#bSet').onclick = settingsDialog;
$('#logo').onclick = () => go('home');
