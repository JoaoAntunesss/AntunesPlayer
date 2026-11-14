/* ---------- AWflix, round 2: intro, Netflix-style continue cards, title page ---------- */
Object.assign(PT, {
  'Details and more': 'Detalhes e mais',
  'Remove from row': 'Remover da faixa',
  left: 'restantes',
  Cast: 'Com',
  Director: 'Realizador',
  Episodes: 'Episódios',
  'More like this': 'Títulos semelhantes',
  Trailer: 'Trailer',
  'Watch series': 'Ver série',
  Rate: 'Classificar',
  Continue: 'Continuar'
});
// intro: our own red "A" monogram with light streaks (shown when AWflix opens)
let fxIntroShown = false;
function fxIntro() {
  if (fxIntroShown || RM || document.documentElement.classList.contains('lite')) return;
  fxIntroShown = true;
  const o = document.createElement('div');
  o.id = 'fxIntro';
  o.setAttribute('aria-hidden', 'true');
  o.innerHTML = `<div class="fxi-rays">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div><div class="fxi-a">A</div><div class="fxi-word">AW<span>flix</span></div>`;
  document.body.appendChild(o);
  const end = () => {
    o.classList.add('out');
    setTimeout(() => o.remove(), 450);
  };
  o.onclick = end;
  setTimeout(end, 2300);
}
const fmtLeft = s => {
  s = Math.max(0, Math.round(s / 60));
  const h = Math.floor(s / 60),
    m = s % 60;
  return (h ? h + ' h ' : '') + m + ' min ' + t('left');
};
function cwHtml(c) {
  const pos = c.cont ? c.cpos : POS[c.key],
    dur = (c.cont ? c.cdur : DUR[c.key]) || c.dur || 5400,
    pct = pos ? Math.min(100, Math.round((pos / dur) * 100)) : 0;
  return `<div class="pc cw" tabindex="0" data-k="${c.key}"${c.cont ? ` data-cont="${esc(c.ser)}"` : ''}><div class="po">${c.logo ? `<img loading="lazy" decoding="async" src="${esc(c.logo)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${esc((c.name || '?').charAt(0))}</span><span class="cwplay">${ic('play')}</span>${c.clabel ? `<i class="cwlab">${esc(c.clabel)}</i>` : ''}</div><div class="cwbar"><i style="width:${pct}%"></i></div><div class="cwacts"><button class="cwb" data-cwi="${c.key}" aria-label="${t('Details')}">${ic('info')}</button><span></span><button class="cwb" data-cwm="${c.key}" aria-label="${t('More')}">${ic('dots')}</button></div></div>`;
}
function cwSheet(c) {
  const isSer = !!c.cont,
    k = c.key;
  openDlg(
    `<div class="shh"><h2>${esc(c.name)}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('close')}</button></div><div class="shl"><button id="shD">${ic('info')} ${t('Details and more')}</button>${isSer ? '' : `<button id="shS">${ic('check')} ${SEEN[k] ? t('Watched') : t('Mark as watched')}</button>`}<button id="shF">${ic(S.favs.includes(isSer ? c.ser : k) ? 'check' : 'plus')} ${t('My list')}</button><button id="shR">${ic('close')} ${t('Remove from row')}</button></div>`,
    'sheet'
  );
  $('#dx').onclick = () => dlg.close();
  $('#shD').onclick = () => {
    dlg.close();
    openDetail(S.byKey[isSer ? c.ser : k] || c);
  };
  const ss = $('#shS');
  if (ss)
    ss.onclick = () => {
      markSeen(S.byKey[k] || c, !SEEN[k]);
      dlg.close();
      render();
    };
  $('#shF').onclick = () => {
    dlg.close();
    toggleFav(S.byKey[isSer ? c.ser : k] || c);
    render();
  };
  $('#shR').onclick = () => {
    if (isSer) {
      const l = SLAST[c.ser];
      if (l) delete POS[l.k];
      delete SLAST[c.ser];
    } else delete POS[k];
    LS.set('ap.pos', POS);
    saveWatch();
    dlg.close();
    render();
  };
}
function wireCw(box) {
  $$('[data-cwi]', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const card = b.closest('.pc'),
          sk = card.dataset.cont;
        openDetail(S.byKey[sk || b.dataset.cwi] || EPS[b.dataset.cwi]);
      })
  );
  $$('[data-cwm]', box).forEach(
    b =>
      (b.onclick = e => {
        e.stopPropagation();
        const k = b.dataset.cwm,
          it = contList().find(x => x.key === k);
        if (it) cwSheet(it);
      })
  );
}
// title page like Netflix (used inside AWflix)
function renderFxDetail(c) {
  const i = S.dinfo || {},
    box = $('#vDetail'),
    back =
      (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path) ||
      i.movie_image ||
      i.cover_big ||
      i.cover ||
      c.logo ||
      '';
  const year = (i.releasedate || i.releaseDate || i.release_date || '').slice(0, 4),
    rating = parseFloat(i.rating) || 0,
    fav = S.favs.includes(c.key);
  const pos = POS[c.key],
    dur = DUR[c.key] || +i.duration_secs || 0,
    seasons = S.deps ? Object.keys(S.deps).sort((a, b) => a - b) : [];
  const x = c.seriesId ? serResume(c) : null,
    sn = S.fxSn && seasons.includes(S.fxSn) ? S.fxSn : x && seasons.includes(String(x.sn)) ? String(x.sn) : seasons[0];
  const main = c.seriesId
    ? x
      ? `<button class="nfbig" id="dSer">${ic('play')} ${x.resume ? t('Continue') + ' ' + epLabel(x.ep) : x.first ? t('Watch series') : t('Watch') + ' ' + epLabel(x.ep)}</button>`
      : ''
    : `<button class="nfbig" id="dPlay">${ic('play')} ${pos ? t('Continue') : t('Watch')}</button>`;
  const prog =
    !c.seriesId && pos && dur
      ? `<div class="nfprog"><div><i style="width:${Math.min(100, Math.round((pos / dur) * 100))}%"></i></div><small>${fmtLeft(dur - pos)}</small></div>`
      : x && x.resume
        ? `<div class="nfprog"><div><i style="width:${Math.min(100, Math.round((x.resume / (DUR[x.ep.key] || x.ep.dur || 2700)) * 100))}%"></i></div><small>${epLabel(x.ep)} · ${fmtLeft((DUR[x.ep.key] || x.ep.dur || 2700) - x.resume)}</small></div>`
        : '';
  const similar = S.vis.filter(o => o.kind === c.kind && o.key !== c.key && o.group === c.group && o.logo).slice(0, 18);
  const tab = c.seriesId && seasons.length ? S.fxTabD || 'eps' : 'sim',
    trailer = i.youtube_trailer || i.trailer || '';
  box.innerHTML = `<div class="nfd"><div class="nfhero" style="${back ? `background-image:url('${esc(back).replace(/'/g, '%27')}')` : ''}"><button class="nfcircle" id="nfP" aria-label="${t('Play')}">${ic('play')}</button></div><div class="nfbody"><div class="nftop">
    <h2>${esc(c.name)}</h2><div class="nfmeta">${[
      year,
      i.duration || (dur ? Math.round(dur / 60) + ' min' : ''),
      seasons.length ? seasons.length + ' ' + (seasons.length > 1 ? t('Seasons') : t('Season')) : '',
      rating ? '★ ' + rating.toFixed(1) : ''
    ]
      .filter(Boolean)
      .map(s => `<span>${esc(s)}</span>`)
      .join('')}</div>
    ${main}${prog}
    ${S.dinfo == null ? `<p class="mut">${t('Loading…')}</p>` : i.plot || i.description ? `<p class="nfplot">${esc(i.plot || i.description)}</p>` : ''}
    ${i.cast ? `<p class="nfsmall"><b>${t('Cast')}:</b> ${esc(i.cast)}</p>` : ''}${i.director ? `<p class="nfsmall"><b>${t('Director')}:</b> ${esc(i.director)}</p>` : ''}${i.genre ? `<p class="nfsmall">${esc(i.genre)}</p>` : ''}
    <div class="nfacts"><button id="dFav">${ic(fav ? 'check' : 'plus')}<span>${t('My list')}</span></button>${c.seriesId ? '' : `<button id="dSeen">${ic('check')}<span>${SEEN[c.key] ? t('Watched') : t('Mark as watched')}</span></button>`}<button id="dTr">${ic('film')}<span>${t('Trailer')}</span></button>${dlNative() && c.seriesId ? `<button id="dDlS">${ic('dl')}<span>${t('Download')}</span></button>` : ''}${dlNative() && !c.seriesId && c.url ? `<button id="dDl">${ic('dl')}<span>${DLS[c.key] ? (DLS[c.key].state === 'ok' ? t('Downloaded') : t('Downloading…')) : t('Download')}</span></button>` : ''}</div>
    </div><div class="nftabs">${c.seriesId && seasons.length ? `<button data-dt="eps" class="${tab === 'eps' ? 'on' : ''}">${t('Episodes')}</button>` : ''}<button data-dt="sim" class="${tab === 'sim' ? 'on' : ''}">${t('More like this')}</button></div>
    ${
      tab === 'eps'
        ? `${seasons.length > 1 ? `<select class="nfsel" id="nfSn">${seasons.map(s => `<option value="${esc(s)}" ${s === sn ? 'selected' : ''}>${t('Season')} ${esc(s)}</option>`).join('')}</select>` : ''}<div class="nfeps">${(
            S.deps[sn] || []
          )
            .map((e, n) => {
              const ep = epObj(c, sn, e, n),
                ps = POS[ep.key],
                dn = DUR[ep.key] || ep.dur || 2700,
                img = e.info && e.info.movie_image;
              return `${dlNative() ? '<div class="nfepw">' : ''}<button class="nfep ${SEEN[ep.key] && !ps ? 'seen' : ''}" data-i="${n}"><span class="nfth">${img ? `<img loading="lazy" decoding="async" src="${esc(img)}" alt="" onerror="this.remove()">` : `<em>${esc(e.episode_num || n + 1)}</em>`}<span class="cwplay">${ic('play')}</span>${ps ? `<i class="nfthp"><i style="width:${Math.max(4, Math.min(100, Math.round((ps / dn) * 100)))}%"></i></i>` : ''}</span><span class="nfet"><b>${esc(e.episode_num || n + 1)}. ${esc(e.title || t('Episode') + ' ' + (n + 1))}</b><small>${e.info && e.info.duration ? esc(e.info.duration) : ''}${SEEN[ep.key] && !ps ? ' · ' + t('Watched') : ''}</small>${e.info && e.info.plot ? `<span>${esc(e.info.plot)}</span>` : ''}</span></button>${dlNative() ? dlEpBtn(ep, n) + '</div>' : ''}`;
            })
            .join('')}</div>`
        : `<div class="fxgrid nfsim">${similar.map(posterHtml).join('') || `<p class="mut">—</p>`}</div>`
    }
  </div></div>`;
  const play = () => {
    if (c.seriesId) {
      const r = serResume(c);
      if (r) enterFsFor(r.ep);
    } else enterFsFor(c);
  };
  $('#nfP').onclick = play;
  const p = $('#dPlay') || $('#dSer');
  if (p) p.onclick = play;
  $('#dFav').onclick = () => {
    toggleFav(c);
    renderFxDetail(c);
  };
  const ds = $('#dSeen');
  if (ds)
    ds.onclick = () => {
      markSeen(c, !SEEN[c.key]);
      renderFxDetail(c);
    };
  const tr = $('#dTr');
  if (tr) tr.onclick = () => trailerDialog(c, trailer, year);
  const dd = $('#dDl');
  if (dd)
    dd.onclick = () => {
      if (DLS[c.key] && DLS[c.key].state === 'ok') {
        S.flixTab = 'dl';
        go('flix');
      } else dlStart(c);
    };
  if (c.seriesId && NEWEP[c.key]) {
    delete NEWEP[c.key];
    LS.set('ap.newep', NEWEP);
  }
  $$('[data-dt]', box).forEach(
    b =>
      (b.onclick = () => {
        S.fxTabD = b.dataset.dt;
        renderFxDetail(c);
      })
  );
  const sel = $('#nfSn');
  if (sel)
    sel.onchange = () => {
      S.fxSn = sel.value;
      renderFxDetail(c);
    };
  const dls = $('#dDlS');
  if (dls) dls.onclick = () => dlSeriesAsk(c, sn);
  $$('[data-dle]', box).forEach(
    b =>
      (b.onclick = () => {
        const n = +b.dataset.dle,
          ep = epObj(c, sn, S.deps[sn][n], n),
          d = DLS[ep.key];
        if (d && d.state === 'ok') {
          S.flixTab = 'dl';
          go('flix');
        } else if (!d || d.state === 'stop' || d.state === 'err') dlAsk([ep], ep.name);
      })
  );
  $$('.nfep', box).forEach(
    b =>
      (b.onclick = () => {
        const e = S.deps[sn][+b.dataset.i];
        enterFsFor(epObj(c, sn, e, +b.dataset.i));
      })
  );
  wireItems(box);
}
