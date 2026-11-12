/* ---------- browse (live / movies / series) ---------- */
const tabOf = g =>
  g === '_vod' || g.startsWith('v:') ? 'vod' : g === '_series' || g.startsWith('s:') ? 'series' : 'live';
function catItems(tab) {
  const k = kindOf(tab),
    o = {},
    H = new Set(S.set.hidden || []),
    L = lockedSet();
  let n = 0;
  S.channels.forEach(c => {
    if (c.kind !== k) return;
    const g = c.group || '—',
      gk = k + ':' + g;
    if (H.has(gk)) return;
    if (!L.has(gk) || S.unlocked) n++;
    o[g] = (o[g] || 0) + 1;
  });
  const favN = favList().filter(c => c.kind === k).length,
    pre = tab === 'live' ? 'g:' : tab === 'vod' ? 'v:' : 's:';
  const head =
    tab === 'live'
      ? [
          { id: 'all', label: t('All channels'), n },
          { id: 'fav', label: t('Favourites'), n: favN, icon: 'star' },
          {
            id: 'recent',
            label: t('Recent'),
            n: S.recent.filter(x => S.byKey[x] && S.byKey[x].kind === 'live').length,
            icon: 'clock'
          }
        ].concat(
          S.lists.map(L => ({
            id: 'u:' + L.id,
            label: L.name,
            n: L.keys.filter(x => S.byKey[x]).length,
            icon: 'stack'
          })),
          [{ id: 'newlist', label: t('New list'), n: '', icon: 'plus' }]
        )
      : [
          { id: GDEF[tab], label: t('All'), n },
          { id: 'fav', label: t('Favourites'), n: favN, icon: 'star' }
        ];
  return head.concat(
    Object.keys(o).map(g => ({ id: pre + g, label: g, n: o[g], icon: L.has(k + ':' + g) && !S.unlocked ? 'lock' : '' }))
  );
}
function renderBrowse() {
  const items = catItems(S.mode),
    cur = items.find(x => x.id === S.group) || items[0];
  const item = it =>
    `<button data-g="${esc(it.id)}" class="${S.group === it.id ? 'on' : ''}">${it.icon ? ic(it.icon) : ''}<span>${esc(it.label)}</span><small>${it.n === '' ? '' : fmtN(it.n)}</small></button>`;
  $('#groups').innerHTML =
    (items.length > 14
      ? `<label class="gq">${ic('search')}<input id="gq" placeholder="${t('Filter categories…')}"></label>`
      : '') + `<div class="cats">${items.map(item).join('')}</div>`;
  $('#catBtn').innerHTML =
    `${ic('list')}<span>${esc(cur ? cur.label : '')}</span><small>${cur ? fmtN(cur.n) : ''}</small>${ic('down')}`;
  const pickG = id => {
    if (id === 'newlist') {
      newListDialog(L => {
        S.group = 'u:' + L.id;
        S.gsel.live = S.group;
        LS.set('ap.gsel', S.gsel);
        renderBrowse();
      });
      return;
    }
    const it = items.find(x => x.id === id);
    if (it && it.icon === 'lock') {
      askPin(() => {
        S.unlocked = true;
        refreshVis();
        S.group = id;
        S.gsel[S.mode] = id;
        LS.set('ap.gsel', S.gsel);
        S.shown = 250;
        renderBrowse();
      });
      return;
    }
    S.group = id;
    S.gsel[S.mode] = id;
    LS.set('ap.gsel', S.gsel);
    S.shown = 250;
    renderBrowse();
    $('#list').scrollTop = 0;
  };
  $$('#groups .cats button').forEach(b => (b.onclick = () => pickG(b.dataset.g)));
  const gq = $('#gq');
  if (gq)
    gq.oninput = () => {
      const q = gq.value.trim().toLowerCase();
      $$('#groups .cats button').forEach(
        b => (b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none')
      );
    };
  $('#catBtn').onclick = () => {
    openDlg(
      `<h2>${t('Categories')}</h2><label class="gq">${ic('search')}<input id="dq" placeholder="${t('Filter categories…')}"></label><div class="catlist">${items.map(item).join('')}</div><div class="row"><button class="btn" id="dx">OK</button></div>`,
      'sheet'
    );
    const f = () => {
      const q = $('#dq').value.trim().toLowerCase();
      $$('.catlist button', dlg).forEach(
        b => (b.style.display = !q || b.textContent.toLowerCase().includes(q) ? '' : 'none')
      );
    };
    $('#dq').oninput = f;
    $('#dx').onclick = () => dlg.close();
    $$('.catlist button', dlg).forEach(
      b =>
        (b.onclick = () => {
          dlg.close();
          pickG(b.dataset.g);
        })
    );
    const on = $('.catlist button.on', dlg);
    if (on) on.scrollIntoView({ block: 'center' });
  };
  renderList();
  if (S.mode === 'live') {
    if (S.cur) showInfo(S.cur);
    else $('#info').innerHTML = sideEmpty();
  }
}
const sideEmpty = () => `<div class="sempty">${ic('tv')}<p>${t('Pick a channel')}</p></div>`;
function renderList() {
  const box = $('#list'),
    l = filtered(),
    grid = S.mode !== 'live';
  box.classList.toggle('grid', grid);
  if (S.loading && !S.channels.length) {
    box.innerHTML = `<div class="empty"><div class="ld"></div><p>${t('Loading your playlist…')}</p></div>`;
    return;
  }
  if (!l.length && S.group === 'fav' && S.mode === 'live' && !S.q.trim()) {
    box.classList.remove('grid', 'vhome');
    box.innerHTML = `<div class="empty">${ic('star')}<h3>${t('No favourites yet')}</h3><p>${t('Tap the star next to a channel, or import a list.')}</p><button class="btn p" id="favIo">${ic('stack')} ${t('Import favourites (JSON)')}</button></div>`;
    $('#favIo', box).onclick = favsDialog;
    return;
  }
  if (!l.length && S.group.startsWith('u:') && !S.q.trim()) {
    const UL0 = curUList();
    box.innerHTML = `<div class="empty">${ic('stack')}<h3>${esc(UL0 ? UL0.name : '')}</h3><p>${t('This list is empty. Open a channel and use “Add to list”, or long-press a channel.')}</p><button class="btn" id="ulDel0">${ic('close')} ${t('Delete list')}</button></div>`;
    $('#ulDel0', box).onclick = () => {
      S.lists = S.lists.filter(x => x !== UL0);
      saveLists();
      S.group = 'all';
      S.gsel.live = 'all';
      renderBrowse();
    };
    return;
  }
  if (!l.length) {
    box.innerHTML = `<div class="empty"><h3>${t('Nothing found')}</h3></div>`;
    return;
  }
  clearInterval(heroT);
  box.classList.remove('vhome');
  if (grid && !S.q.trim() && S.group === GDEF[S.mode]) {
    box.classList.remove('grid');
    box.classList.add('vhome');
    vodHome(box);
    return;
  }
  let L2 = l;
  const so = S.sort[S.mode] || 'def';
  if (grid && so !== 'def') {
    L2 = l.slice();
    if (so === 'az') L2.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (so === 'new') L2.sort((a, b) => (b.added || 0) - (a.added || 0));
    else if (so === 'rate') L2.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  const cur = grid ? catItems(S.mode).find(x => x.id === S.group.replace('!', '')) : null;
  const UL = curUList();
  const ftools =
    !grid && isOrdList(S.group) && !S.q.trim()
      ? `<div class="ftools"><b>${esc(UL ? UL.name : t('Favourites'))}</b><small>${fmtN(l.length)}</small><span class="gap"></span>${S.favEdit ? `<span class="mut fhint">${t(isTouch() ? 'Drag ⋮⋮ or use the arrows' : 'OK picks a channel, ▲ ▼ move it, OK drops it')}</span>` : ''}${UL ? `<button class="btn sm" id="ulRen">${ic('edit')} ${t('Rename')}</button><button class="btn sm" id="ulDel">${ic('close')} ${t('Delete list')}</button>` : `<button class="btn sm" id="favIo" aria-label="${t('Import / export favourites')}">${ic('stack')} JSON</button>`}<button class="btn sm ${S.favEdit ? 'p' : ''}" id="favEd">${ic(S.favEdit ? 'check' : 'edit')} ${t(S.favEdit ? 'Done' : 'Edit order')}</button></div>`
      : '';
  box.innerHTML =
    ftools +
    (grid
      ? `<div class="ltools"><b>${esc(cur ? cur.label : t('Search'))}</b><small>${fmtN(l.length)}</small><span class="gap"></span><button class="btn sm" id="sortB">${ic('sort')} ${t(SORTS[so])}</button></div>`
      : '') +
    L2.slice(0, S.shown)
      .map(grid ? posterHtml : rowHtml)
      .join('') +
    (l.length > S.shown
      ? `<button class="more" id="more">${t('Show more')} (${fmtN(l.length - S.shown)})</button>`
      : '');
  wireItems(box);
  const m = $('#more', box);
  if (m)
    m.onclick = () => {
      S.shown += 250;
      renderList();
    };
  const fio = $('#favIo', box);
  if (fio) fio.onclick = favsDialog;
  const ur = $('#ulRen', box);
  if (ur) ur.onclick = () => newListDialog(() => renderBrowse(), UL);
  const ud = $('#ulDel', box);
  if (ud)
    ud.onclick = () => {
      openDlg(
        `<h2>${t('Delete list')}</h2><p>${esc(UL.name)}</p><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="dy">${t('Delete')}</button></div>`
      );
      $('#dx').onclick = () => dlg.close();
      $('#dy').onclick = () => {
        dlg.close();
        S.lists = S.lists.filter(x => x !== UL);
        saveLists();
        S.group = 'fav';
        S.gsel.live = 'fav';
        LS.set('ap.gsel', S.gsel);
        renderBrowse();
      };
    };
  const fe = $('#favEd', box);
  if (fe)
    fe.onclick = () => {
      S.favEdit = !S.favEdit;
      renderList();
      const b = $('#favEd');
      if (b) b.focus();
    };
  const sb = $('#sortB', box);
  if (sb)
    sb.onclick = () => {
      const ks = Object.keys(SORTS);
      S.sort[S.mode] = ks[(ks.indexOf(so) + 1) % ks.length];
      renderList();
      $('#sortB').focus();
    };
}
function filtered() {
  const q = fold(S.q.trim());
  if (!q) return baseList();
  const k = kindOf(S.mode);
  return S.vis.filter(c => c.kind === k && (lname(c).includes(q) || String(shownNum(c)) === q));
}
const SORTS = { def: 'Default order', az: 'A–Z', new: 'Recently added', rate: 'Top rated' };
let heroT = 0;
function vodHome(box) {
  const k = kindOf(S.mode),
    all = S.vis.filter(c => c.kind === k);
  let top = all
    .filter(c => c.rating > 0 && c.logo)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);
  if (top.length < 4)
    top = all
      .filter(c => c.logo)
      .sort((a, b) => (b.added || 0) - (a.added || 0))
      .slice(0, 10);
  const rows = [
    [t('Continue watching'), contList().filter(c => c.kind === k || (k === 'series' && c.ser)), ''],
    [t('Favourites'), favList().filter(c => c.kind === k), 'fav'],
    [
      t('Recently added'),
      all
        .slice()
        .sort((a, b) => (b.added || 0) - (a.added || 0))
        .slice(0, 24),
      'new'
    ]
  ];
  const byG = groupBy(all, c => c.group || '—');
  catItems(S.mode)
    .filter(x => !['fav', GDEF[S.mode]].includes(x.id) && x.icon !== 'lock')
    .slice(0, 16)
    .forEach(g => rows.push([g.label, (byG.get(g.id.slice(2)) || []).slice(0, 24), g.id, g.n]));
  box.innerHTML =
    (top.length
      ? `<div class="hero" id="hero">${top.map((c, i) => `<div class="hs ${i ? '' : 'on'}" data-k="${c.key}"><div class="hbg" style="background-image:url('${esc(c.logo).replace(/'/g, '%27')}')"></div><div class="hpo"><img src="${esc(c.logo)}" alt="" onerror="this.remove()"><span class="hn">${i + 1}</span></div><div class="hi"><h3>${esc(c.name)}</h3><div class="chips">${c.rating ? `<span>★ ${c.rating.toFixed(1)}</span>` : ''}<span>${esc(c.group || '')}</span></div><div class="hacts"><button class="btn p" data-hp="${c.key}">${ic('play')} ${t('Watch')}</button><button class="btn" data-hd="${c.key}">${ic('info')} ${t('Details')}</button></div></div></div>`).join('')}<div class="hdots">${top.map((c, i) => `<button data-hi="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1}"></button>`).join('')}</div></div>`
      : '') +
      rows
        .filter(r => r[1].length)
        .map(
          r =>
            `<section class="hrow vrow"><div class="rh"><h3>${esc(r[0])} <small>${fmtN(r[3] || r[1].length)}</small></h3>${r[2] && r[2] !== 'new' ? `<button class="seeall" data-g="${esc(r[2])}">${t('See all')}</button>` : r[2] === 'new' ? `<button class="seeall" data-sort="new">${t('See all')}</button>` : ''}</div><div class="rail">${r[1].map(posterHtml).join('')}</div></section>`
        )
        .join('') || `<div class="empty"><h3>${t('Nothing found')}</h3></div>`;
  wireItems(box);
  const slides = $$('.hs', box),
    dots = $$('.hdots button', box);
  let hi = 0;
  const show = n => {
    hi = (n + slides.length) % slides.length;
    slides.forEach((x, i) => x.classList.toggle('on', i === hi));
    dots.forEach((x, i) => x.classList.toggle('on', i === hi));
  };
  dots.forEach(
    d =>
      (d.onclick = () => {
        show(+d.dataset.hi);
        clearInterval(heroT);
      })
  );
  $$('[data-hp]', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const c = S.byKey[b.dataset.hp];
        c.seriesId ? openDetail(c) : enterFsFor(c);
      })
  );
  $$('[data-hd]', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        openDetail(S.byKey[b.dataset.hd]);
      })
  );
  slides.forEach(x => {
    x.onclick = () => openDetail(S.byKey[x.dataset.k]);
    x.addEventListener('focusin', () => clearInterval(heroT));
  });
  if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    heroT = setInterval(() => {
      if (S.view === 'browse' && document.visibilityState === 'visible') show(hi + 1);
    }, 7000);
  let sx = null;
  const hero = $('#hero', box);
  if (hero) {
    hero.addEventListener(
      'touchstart',
      e => {
        sx = e.touches[0].clientX;
      },
      { passive: true }
    );
    hero.addEventListener('touchend', e => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) {
        show(hi + (dx < 0 ? 1 : -1));
        clearInterval(heroT);
      }
    });
  }
  $$('.seeall', box).forEach(
    b =>
      (b.onclick = () => {
        if (b.dataset.sort) {
          S.sort[S.mode] = 'new';
          S.group = GDEF[S.mode] + '!';
        } else {
          S.group = b.dataset.g;
          S.gsel[S.mode] = S.group;
        }
        S.shown = 250;
        renderBrowse();
        $('#list').scrollTop = 0;
      })
  );
}
function renderSearch() {
  imdbLoad();
  const box = $('#sres'),
    q = fold(S.q.trim());
  if (q.length < 2) {
    box.innerHTML = `<div class="empty">${ic('search')}<p>${t('Type at least 2 letters')}</p></div>`;
    return;
  }
  const kinds = S.qs === 'flix' ? ['vod', 'series'] : S.qs === 'live' ? ['live'] : ['live', 'vod', 'series'],
    res = searchItems(S.q, kinds),
    sec = (k, label, f) => {
      const a = res.filter(c => c.kind === k);
      return a.length
        ? `<section class="hrow"><h3>${label} <small>${fmtN(a.length)}</small></h3>${k === 'live' ? `<div class="slist">${a.slice(0, 60).map(rowHtml).join('')}</div>` : `<div class="rail">${a.slice(0, 40).map(posterHtml).join('')}</div>`}</section>`
        : '';
    };
  box.innerHTML =
    sec('live', t('Live TV')) + sec('vod', t('Movies')) + sec('series', t('Series')) ||
    `<div class="empty"><h3>${t('Nothing found')}</h3></div>`;
  wireItems(box);
}
function render() {
  renderHeader();
  if (S.view === 'home') renderHome();
  else if (S.view === 'browse') renderBrowse();
  else if (S.view === 'search') renderSearch();
  else if (S.view === 'flix') renderFlix();
  else if (S.view === 'detail' && !$('#vDetail').innerHTML) renderDetailShell();
  updateFavBtn();
}
