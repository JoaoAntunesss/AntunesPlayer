/* ---------- trailer inside the app (YouTube), or a YouTube search when the provider has none ---------- */
function trailerDialog(c, tr, year) {
  const id =
    (/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(tr || '') || [])[1] || (/^[\w-]{11}$/.test(tr || '') ? tr : '');
  const q =
    'https://www.youtube.com/results?search_query=' +
    encodeURIComponent(cleanTitle(c.name) + ' ' + (year || '') + ' trailer');
  if (!id) {
    openDlg(
      `<h2>${t('Trailer')}</h2><p class="mut">${t('No trailer from the provider for this title.')}</p><div class="row"><button class="btn" id="dx">${t('Close')}</button><button class="btn p" id="tyq">${ic('search')} ${t('Search the trailer on YouTube')}</button></div>`
    );
    $('#dx').onclick = () => dlg.close();
    $('#tyq').onclick = () => {
      dlg.close();
      openExternal(q);
    };
    $('#tyq').focus();
    return;
  }
  if (S.cur && !v.paused) v.pause();
  openDlg(
    `<div class="trw"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="${t('Trailer')}"></iframe></div><div class="row"><button class="btn" id="tyo">${t('Open on YouTube')}</button><button class="btn p" id="dx">${t('Close')}</button></div>`,
    'trailer'
  );
  $('#dx').onclick = () => dlg.close();
  $('#tyo').onclick = () => {
    dlg.close();
    openExternal('https://www.youtube.com/watch?v=' + id);
  };
  $('#dx').focus();
  dlg.addEventListener(
    'close',
    () => {
      const f = $('.trw iframe', dlg);
      if (f) f.src = 'about:blank';
    },
    { once: true }
  );
}

/* ---------- "On now": every channel with what is on right now, favourites first ---------- */
function nowDialog() {
  const favs = new Set(S.favs),
    live = S.vis.filter(c => c.kind === 'live');
  const L = live
      .map(c => ({ c, nn: nowNext(c) }))
      .sort((a, b) => favs.has(b.c.key) - favs.has(a.c.key) || !!(b.nn && b.nn.now) - !!(a.nn && a.nn.now))
      .slice(0, 300),
    n = Date.now();
  openDlg(
    `<div class="shh"><h2>${t('On now')}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('close')}</button></div><div class="nowg">${
      L.map(({ c, nn }) => {
        const p = nn && nn.now,
          pr = p ? Math.round(((n - p.s) / (p.e - p.s)) * 100) : 0;
        return `<button class="nowc" data-k="${c.key}"><span class="nowl">${logoHtml(c)}</span><span class="nowt"><small>${seg(shownNum(c))} ${esc(c.name)}${favs.has(c.key) ? ' ★' : ''}</small><b>${p ? esc(p.t) : esc(c.group || '')}</b>${p ? `<i class="pb"><i style="width:${pr}%"></i></i><small>${hm(p.s)}–${hm(p.e)}${nn.next ? ` · ${t('Next')}: ${hm(nn.next.s)} ${esc(nn.next.t)}` : ''}</small>` : ''}</span></button>`;
      }).join('') || `<p class="mut">${t('Nothing found')}</p>`
    }</div>`,
    'sheet wide'
  );
  $('#dx').onclick = () => dlg.close();
  $$('.nowc', dlg).forEach(
    b =>
      (b.onclick = () => {
        const c = S.byKey[b.dataset.k];
        dlg.close();
        if (c) enterFsFor(c);
      })
  );
  const f = $('.nowc', dlg);
  if (f && S.set.tv) f.focus();
}

/* ---------- new episodes of the series you watch: checked twice a day, shown as a row and a badge ---------- */
var NEWEP = LS.get('ap.newep', {}),
  EPC = LS.get('ap.epc', {}),
  newEpBusy = false;
async function newEpCheck() {
  const x = xbase();
  if (newEpBusy || !x) return;
  const now = Date.now();
  const sers = Object.keys(SLAST)
    .map(k => S.byKey[k])
    .filter(c => c && c.seriesId && (!EPC[c.key] || now - EPC[c.key].t > 12 * 3600e3))
    .slice(0, 15);
  if (!sers.length) return;
  newEpBusy = true;
  const found = [];
  try {
    for (const c of sers) {
      if (S.cur && !v.paused) break; // leave the server alone while something plays
      try {
        const d = await fetchJson(
          `${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=get_series_info&series_id=${x.q(c.seriesId)}`
        );
        const cnt = Object.values((d && d.episodes) || {}).reduce((a, l) => a + (l || []).length, 0),
          old = EPC[c.key];
        if (old && cnt > old.n) {
          NEWEP[c.key] = { n: cnt - old.n + ((NEWEP[c.key] && NEWEP[c.key].n) || 0), at: now };
          found.push(c.name);
        }
        if (cnt) EPC[c.key] = { n: cnt, t: now };
      } catch (e) {}
      await new Promise(r => setTimeout(r, 800));
    }
  } finally {
    newEpBusy = false;
    LS.set('ap.epc', EPC);
    LS.set('ap.newep', NEWEP);
  }
  if (found.length) {
    toast(t('New episodes of') + ' ' + found.slice(0, 3).join(', '));
    if (S.view === 'flix' && S.flixTab === 'all') renderFlix();
  }
}

/* ---------- statistics: how much you watch, and what ---------- */
Object.assign(PT, {
  'This week': 'Esta semana',
  'Last 7 days': 'Últimos 7 dias',
  'Most watched channels': 'Canais que mais vês',
  'Most watched series': 'Séries que mais vês',
  'Most watched films': 'Filmes que mais vês',
  Since: 'Desde',
  'Nothing watched yet.': 'Ainda não viste nada.',
  h: 'h',
  'Daily average': 'Média por dia'
});
const STATS = Object.assign({ days: {}, items: {}, since: Date.now() }, LS.get('ap.stats', {}));
let statLast = 0,
  statSave = 0;
v.addEventListener('timeupdate', () => {
  const now = Date.now(),
    dt = (now - statLast) / 1000;
  statLast = now;
  const c = S.cur;
  if (!c || v.paused || dt <= 0 || dt > 15) return;
  const day = new Date(now - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  STATS.days[day] = (STATS.days[day] || 0) + dt;
  const base = c.ser && S.byKey[c.ser] ? S.byKey[c.ser] : c,
    k = base.key,
    it =
      STATS.items[k] ||
      (STATS.items[k] = {
        n: base.name,
        k: c.ser ? 'series' : c.kind === 'live' ? 'live' : base.kind === 'series' ? 'series' : 'vod',
        s: 0
      });
  it.s += dt;
  if (now - statSave > 30000) {
    statSave = now;
    const ds = Object.keys(STATS.days).sort();
    if (ds.length > 400) ds.slice(0, ds.length - 400).forEach(d => delete STATS.days[d]);
    const ks = Object.keys(STATS.items);
    if (ks.length > 600)
      ks.sort((a, b) => STATS.items[a].s - STATS.items[b].s)
        .slice(0, ks.length - 600)
        .forEach(x => delete STATS.items[x]);
    LS.set('ap.stats', STATS);
  }
});
const fmtDur = s => {
  s = Math.round(s / 60);
  const h = Math.floor(s / 60),
    m = s % 60;
  return h ? `${h} ${t('h')} ${m} min` : `${m} min`;
};
function statsDialog() {
  LS.set('ap.stats', STATS);
  const days = [],
    wd = new Intl.DateTimeFormat(LANG === 'pt' ? 'pt-PT' : undefined, { weekday: 'short' });
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5),
      k = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    days.push([wd.format(d).replace('.', ''), STATS.days[k] || 0]);
  }
  const week = days.reduce((a, d) => a + d[1], 0),
    max = Math.max(1, ...days.map(d => d[1])),
    items = Object.values(STATS.items);
  const top = k =>
      items
        .filter(x => x.k === k)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5),
    list = (title, l) =>
      l.length
        ? `<label>${t(title)}</label><ol class="stl">${l.map(x => `<li><span>${esc(x.n)}</span><small>${fmtDur(x.s)}</small></li>`).join('')}</ol>`
        : '';
  openDlg(
    `<div class="shh"><h2>${t('Statistics')}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('close')}</button></div>
    ${
      items.length
        ? `<div class="stbig"><div><small>${t('This week')}</small><b>${fmtDur(week)}</b></div><div><small>${t('Daily average')}</small><b>${fmtDur(week / 7)}</b></div></div>
    <label>${t('Last 7 days')}</label><div class="stbars">${days.map(d => `<div><i style="height:${Math.round((d[1] / max) * 100)}%" title="${fmtDur(d[1])}"></i><small>${esc(d[0])}</small></div>`).join('')}</div>
    ${list('Most watched channels', top('live'))}${list('Most watched series', top('series'))}${list('Most watched films', top('vod'))}<p class="mut" style="font-size:12px">${t('Since')} ${new Date(STATS.since).toLocaleDateString(LANG === 'pt' ? 'pt-PT' : undefined)}</p>`
        : `<p class="mut">${t('Nothing watched yet.')}</p>`
    }`,
    'sheet'
  );
  $('#dx').onclick = () => dlg.close();
}
