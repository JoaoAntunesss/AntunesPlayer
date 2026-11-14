/* ---------- detail page (movies & series) ---------- */
async function openDetail(c) {
  if (!c) return;
  S.fxSn = '';
  S.fxTabD = '';
  S.detail = c;
  S.dinfo = null;
  S.deps = null;
  $('#vDetail').innerHTML = '';
  go('detail');
  loadDetail(c);
}
function xbase() {
  const s = curSrc();
  return s && s.type === 'xtream' ? { s, base: s.server.replace(/\/+$/, ''), q: encodeURIComponent } : null;
}
async function loadDetail(c) {
  const x = xbase();
  if (!x || (!c.vodId && !c.seriesId)) {
    S.dinfo = {};
    renderDetailShell();
    return;
  }
  try {
    const d = await fetchJson(
      `${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=${c.seriesId ? 'get_series_info&series_id=' + x.q(c.seriesId) : 'get_vod_info&vod_id=' + x.q(c.vodId)}`
    );
    if (S.detail !== c) return;
    S.dinfo = d.info || {};
    if (S.dinfo.genre && !c.genre && GEN[c.key] !== S.dinfo.genre) {
      GEN[c.key] = S.dinfo.genre;
      saveGen();
    }
    if (c.seriesId) S.deps = d.episodes || {};
    if (S.dinfo.duration_secs) c.dur = +S.dinfo.duration_secs;
  } catch (e) {
    if (S.detail === c) S.dinfo = { err: e.message };
  }
  if (S.detail === c && S.view === 'detail') renderDetailShell();
  if (S.autoResume && S.detail === c) {
    S.autoResume = false;
    const x = c.seriesId ? serResume(c) : null;
    if (x) enterFsFor(x.ep);
  }
}
// where to continue a series: the episode in progress, else the one after the last finished, else the first
function serResume(c) {
  if (!S.deps || S.detail !== c) return null;
  const ss = Object.keys(S.deps).sort((a, b) => a - b);
  if (!ss.length) return null;
  const all = [];
  ss.forEach(sn => (S.deps[sn] || []).forEach((e, n) => all.push({ sn, n, ep: epObj(c, sn, e, n) })));
  const last = SLAST[c.key];
  let i = last ? all.findIndex(x => x.ep.key === last.k) : -1;
  if (i < 0) {
    const w = all
      .map((x, j) => (SEEN[x.ep.key] || POS[x.ep.key] ? j : -1))
      .filter(j => j > -1)
      .pop();
    i = w == null ? -1 : w;
  }
  if (i < 0) return Object.assign({ first: true }, all[0]);
  const x = all[i];
  if (POS[x.ep.key]) return Object.assign({ resume: POS[x.ep.key] }, x);
  return all[i + 1] ? Object.assign({ next: true }, all[i + 1]) : Object.assign({ again: true }, all[0]);
}
function serPlayBtn(c) {
  const x = serResume(c);
  if (!x) return '';
  const lab = epLabel(x.ep);
  return `<button class="btn p big" id="dSer">${ic('play')} ${x.resume ? t('Resume') + ' ' + lab : t('Watch') + ' ' + lab}</button>`;
}
function renderDetailShell() {
  const c = S.detail;
  if (!c) return;
  if (S.fx) {
    renderFxDetail(c);
    return;
  }
  const i = S.dinfo || {},
    box = $('#vDetail');
  const img = i.movie_image || i.cover_big || i.cover || c.logo || '',
    back = (Array.isArray(i.backdrop_path) ? i.backdrop_path[0] : i.backdrop_path) || img;
  const year = (i.releasedate || i.releaseDate || i.release_date || '').slice(0, 4),
    rating = parseFloat(i.rating) || 0;
  const chips = [year, i.genre, i.duration, rating ? '★ ' + rating.toFixed(1) : ''].filter(Boolean),
    fav = S.favs.includes(c.key),
    pos = POS[c.key];
  const seasons = S.deps ? Object.keys(S.deps).sort((a, b) => a - b) : [];
  box.innerHTML = `<div class="dbg" style="${back ? `background-image:url('${esc(back).replace(/'/g, '%27')}')` : ''}"></div><div class="dwrap">
    <div class="dpost">${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ''}<span class="lg">${esc((c.name || '?').charAt(0))}</span></div>
    <div class="dinfo"><h2>${esc(c.name)}</h2>${chips.length ? `<div class="chips">${chips.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
      ${S.dinfo == null ? `<p class="mut">${t('Loading…')}</p>` : i.plot || i.description ? `<p class="plot">${esc(i.plot || i.description)}</p>` : `<p class="mut">${t('No details from the provider')}</p>`}
      ${i.cast ? `<p class="cast">${esc(i.cast)}</p>` : ''}
      <div class="dacts">${c.seriesId ? serPlayBtn(c) : `<button class="btn p big" id="dPlay">${ic('play')} ${pos ? t('Resume') + ' ' + fmtT(pos) : t('Watch')}</button>`}${c.seriesId ? '' : `<button class="btn big" id="dSeen">${ic('check')} ${SEEN[c.key] ? t('Watched') : t('Mark as watched')}</button>`}<button class="btn big ${fav ? 'on' : ''}" id="dFav">${ic(fav ? 'starF' : 'star')} ${fav ? t('In favourites') : t('Add favourite')}</button></div>
      ${seasons.length ? `<div class="seas">${seasons.map((s, n) => `<button data-sn="${esc(s)}" class="${n === 0 ? 'on' : ''}">${t('Season')} ${esc(s)}</button>`).join('')}</div><div class="eps" id="eps"></div>` : ''}
    </div></div>`;
  const p = $('#dPlay');
  if (p)
    p.onclick = () => {
      enterFsFor(c);
    };
  const ds = $('#dSeen');
  if (ds)
    ds.onclick = () => {
      markSeen(c, !SEEN[c.key]);
      renderDetailShell();
    };
  const sp = $('#dSer');
  if (sp)
    sp.onclick = () => {
      const x = serResume(c);
      if (x) enterFsFor(x.ep);
    };
  $('#dFav').onclick = () => {
    toggleFav(c);
    renderDetailShell();
  };
  if (seasons.length) {
    const draw = sn => {
      $$('.seas button').forEach(b => b.classList.toggle('on', b.dataset.sn === sn));
      $('#eps').innerHTML = (S.deps[sn] || [])
        .map((e, n) => {
          const ep = epObj(c, sn, e, n),
            ps = POS[ep.key],
            dn = DUR[ep.key] || ep.dur || 2700;
          return `<button class="ep ${SEEN[ep.key] && !ps ? 'seen' : ''}" data-i="${n}">${e.info && e.info.movie_image ? `<img loading="lazy" decoding="async" src="${esc(e.info.movie_image)}" alt="" onerror="this.remove()">` : `<span class="en">${esc(e.episode_num || n + 1)}</span>`}<span class="et"><b>${t('Episode')} ${esc(e.episode_num || n + 1)}</b><span>${esc(e.title || '')}</span>${ps ? `<i class="epp" style="width:${Math.max(4, Math.min(100, Math.round((ps / dn) * 100)))}%"></i>` : ''}</span>${SEEN[ep.key] && !ps ? `<i class="epseen">${ic('check')}</i>` : ic('play')}</button>`;
        })
        .join('');
      $$('#eps .ep').forEach(
        b =>
          (b.onclick = () => {
            const e = S.deps[sn][+b.dataset.i];
            enterFsFor(epObj(c, sn, e, +b.dataset.i));
          })
      );
    };
    $$('.seas button').forEach(b => (b.onclick = () => draw(b.dataset.sn)));
    const rs = serResume(c);
    draw(rs && seasons.includes(String(rs.sn)) ? String(rs.sn) : seasons[0]);
  }
}
function epObj(c, sn, e, n) {
  const x = xbase();
  const url = `${x.base}/series/${x.q(x.s.user)}/${x.q(x.s.pass)}/${e.id}.${e.container_extension || 'mp4'}`;
  return {
    name: `${c.name} · S${sn}E${e.episode_num || n + 1}`,
    logo: c.logo,
    group: c.group,
    url,
    kind: 'vod',
    num: 0,
    key: hash(c.name + '|' + url),
    dur: (e.info && +e.info.duration_secs) || 0,
    ser: c.key,
    sn,
    n
  };
}
function enterFsFor(c) {
  if (c.kind !== 'live' && !S.byKey[c.key]) {
    S.byKey[c.key] = c;
    EPS[c.key] = c;
    const ks = Object.keys(EPS);
    if (ks.length > 60) delete EPS[ks[0]];
    LS.set('ap.eps', EPS);
  }
  const p = play(c);
  if (S.cur === c) enterFs();
  else p.then(() => S.cur === c && enterFs()); // plan still being checked: go full screen once it plays
}
