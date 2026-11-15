/* ---------- offline: whole seasons or series, with the subtitles you choose ----------
   Episodes can be downloaded one by one (the icon next to each episode) or a season / the whole series at once. The
   Android app downloads two at a time and the rest wait their turn, even with the app closed (DlService).
   Subtitles: the ones inside the video file come with it; online ones (OpenSubtitles) are saved for the languages you
   pick, so they work without internet too. OpenSubtitles has a daily limit (5, or 20 with an account): what does not
   fit today is fetched the next days by itself. Without internet the app opens straight on Downloads. */
Object.assign(PT, {
  'Download episode': 'Descarregar episódio',
  'Download for offline': 'Descarregar para ver sem internet',
  'This season': 'Esta temporada',
  'Whole series': 'Série completa',
  'Episodes to download': 'Episódios a descarregar',
  All: 'Todos',
  None: 'Nenhum',
  episodes: 'episódios',
  'Subtitles to save': 'Legendas a guardar',
  'Subtitles inside the video always come with it. Online subtitles are saved for these languages:':
    'As legendas que já vêm no vídeo descarregam sempre com ele. As legendas online ficam guardadas nestas línguas:',
  'No online subtitles': 'Sem legendas online',
  'Already downloaded': 'Já descarregados',
  Waiting: 'Em espera',
  'downloads added. Follow them in AWFLIX → Downloads.':
    'transferências adicionadas. Acompanha em AWFLIX → Descarregados.',
  'Online subtitles limit for today reached. The rest will be fetched tomorrow.':
    'Chegaste ao limite de legendas online de hoje. As que faltam vêm amanhã, sozinhas.',
  'No internet. Here is what you downloaded.': 'Sem internet. Aqui está o que descarregaste.',
  Films: 'Filmes'
});
const DLQ_KEY = 'ap.dlsubq';
// the small download button next to an episode (✓ when it is on the device, ⋯ while it downloads or waits)
function dlEpBtn(ep, n) {
  const d = DLS[ep.key],
    st = d && d.state;
  const icon = st === 'ok' ? ic('check') : st === 'run' || st === 'queue' ? '⋯' : ic('dl');
  return `<button class="nfdlb${st === 'ok' ? ' ok' : ''}" data-dle="${n}" aria-label="${esc(t('Download episode') + ' ' + ep.name)}">${icon}</button>`;
}
// ask which episodes and which subtitles to save, then download
function dlAsk(eps, title) {
  const pick = new Set(subLangs()),
    todo = eps.filter(
      e => !(DLS[e.key] && (DLS[e.key].state === 'ok' || DLS[e.key].state === 'run' || DLS[e.key].state === 'queue'))
    ),
    done = eps.length - todo.length;
  const chosen = new Set(todo.map(e => e.key)),
    multi = todo.length > 1,
    epLabel = e => esc((e.n != null ? e.n + 1 + '. ' : '') + (e.name || ''));
  const draw = () => {
    openDlg(
      `<h2>${ic('dl')} ${t('Download for offline')}</h2><p><b>${esc(title)}</b><br><small class="mut">${multi ? chosen.size + '/' + todo.length : todo.length} ${t('episodes')}${done ? ' · ' + done + ' ' + t('Already downloaded').toLowerCase() : ''}</small></p>
      ${
        multi
          ? `<label>${t('Episodes to download')}</label>
      <div class="row" style="justify-content:flex-start;gap:.5rem;margin:.1rem 0 .4rem"><button class="btn" id="dlAll">${t('All')}</button><button class="btn" id="dlNone">${t('None')}</button></div>
      <div class="chips" id="dlEps">${todo.map(e => `<button class="chip${chosen.has(e.key) ? ' on' : ''}" data-dlep="${esc(e.key)}" aria-pressed="${chosen.has(e.key)}">${epLabel(e)}</button>`).join('')}</div>`
          : ''
      }
      <label>${t('Subtitles to save')}</label><p class="mut"><small>${t('Subtitles inside the video always come with it. Online subtitles are saved for these languages:')}</small></p>
      <div class="chips" id="dlLangs">${SUBL.map(([k, n]) => `<button class="chip${pick.has(k) ? ' on' : ''}" data-dll="${k}" aria-pressed="${pick.has(k)}">${esc(n)}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="dlGo" ${chosen.size ? '' : 'disabled'}>${ic('dl')} ${t('Download')}</button></div>`
    );
    $('#dx').onclick = () => dlg.close();
    const aa = $('#dlAll');
    if (aa)
      aa.onclick = () => {
        todo.forEach(e => chosen.add(e.key));
        draw();
      };
    const an = $('#dlNone');
    if (an)
      an.onclick = () => {
        chosen.clear();
        draw();
      };
    $$('[data-dlep]', dlg).forEach(
      b =>
        (b.onclick = () => {
          const k = b.dataset.dlep;
          chosen.has(k) ? chosen.delete(k) : chosen.add(k);
          draw();
          const nb = $(`[data-dlep="${k}"]`, dlg);
          if (nb) nb.focus();
        })
    );
    $$('[data-dll]', dlg).forEach(
      b =>
        (b.onclick = () => {
          const k = b.dataset.dll;
          pick.has(k) ? pick.delete(k) : pick.add(k);
          draw();
          const nb = $(`[data-dll="${k}"]`, dlg);
          if (nb) nb.focus();
        })
    );
    $('#dlGo').onclick = async () => {
      dlg.close();
      const sel = todo.filter(e => chosen.has(e.key));
      if (!sel.length) return;
      const langs = [...pick].slice(0, 3);
      for (const e of sel) await dlStart(e, true);
      if (sel.length > 1 || eps.length > 1)
        toast(sel.length + ' ' + t('downloads added. Follow them in AWFLIX → Downloads.'));
      else toast(t('Download started. Follow it in AWFLIX → Downloads.'));
      if (langs.length && OSK()) {
        const q = LS.get(DLQ_KEY, []);
        sel.forEach(e =>
          q.push({ ep: { key: e.key, name: e.name, ser: e.ser, sn: e.sn, n: e.n, kind: 'vod', url: e.url }, langs })
        );
        LS.set(DLQ_KEY, q);
        dlSubsRun();
      }
      if (S.view === 'flix' && S.detail) renderFxDetail(S.detail);
    };
  };
  draw();
}
// the season shown, or every season
function dlSeriesAsk(c, sn) {
  const seasons = Object.keys(S.deps || {});
  const all = () => seasons.flatMap(s => (S.deps[s] || []).map((e, n) => epObj(c, s, e, n)));
  const one = () => (S.deps[sn] || []).map((e, n) => epObj(c, sn, e, n));
  if (seasons.length <= 1) return dlAsk(one(), c.name);
  openDlg(
    `<h2>${ic('dl')} ${t('Download for offline')}</h2><p><b>${esc(c.name)}</b></p>
    <div class="row" style="flex-wrap:wrap;justify-content:flex-start"><button class="btn" id="dlS1">${t('This season')} (${t('Season')} ${esc(sn)}, ${one().length} ${t('episodes')})</button><button class="btn p" id="dlSA">${t('Whole series')} (${all().length} ${t('episodes')})</button></div>
    <div class="row"><button class="btn" id="dx">${t('Cancel')}</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $('#dlS1').onclick = () => dlAsk(one(), c.name + ' · ' + t('Season') + ' ' + sn);
  $('#dlSA').onclick = () => dlAsk(all(), c.name);
}
// online subtitles for downloaded episodes: one at a time, kept on the device (IndexedDB) for offline viewing
let dlSubsBusy = false;
async function dlSubsRun() {
  if (dlSubsBusy || !navigator.onLine || !OSK()) return;
  dlSubsBusy = true;
  try {
    let q = LS.get(DLQ_KEY, []);
    while (q.length) {
      const it = q[0],
        have = (await idbGet('dlsub:' + it.ep.key)) || [];
      const want = it.langs.filter(l => !have.some(h => h.lang === l));
      if (want.length) {
        const list = await subsSearch(it.ep);
        for (const l of want) {
          const r = list.find(x => x.lang === l);
          if (!r) continue;
          await subsVtt(r); // downloads and keeps the file (counts towards the daily limit)
          have.push({ id: r.id, lang: r.lang, rel: r.rel });
          await idbSet('dlsub:' + it.ep.key, have);
          await new Promise(res => setTimeout(res, 1200));
        }
      }
      q = LS.get(DLQ_KEY, []).filter(x => x.ep.key !== it.ep.key);
      LS.set(DLQ_KEY, q);
    }
  } catch (e) {
    if (e && (e.status === 406 || /limit|quota/i.test(e.message || '')))
      toast(t('Online subtitles limit for today reached. The rest will be fetched tomorrow.'));
  } finally {
    dlSubsBusy = false;
  }
}
// a downloaded episode or film: its saved subtitles, without internet
async function dlSubsApply(c) {
  const list = (await idbGet('dlsub:' + c.key)) || [];
  if (!list.length || S.cur !== c) return;
  S.subList = { k: c.key, list };
  try {
    if (await subsLoad(list[0], c)) toast(t('Subtitles') + ': ' + langName(list[0].lang));
  } catch (e) {}
}
// no internet: straight to Downloads
function dlOffline() {
  if (navigator.onLine || !dlNative() || !Object.values(DLS).some(d => d.state === 'ok')) return;
  if (S.cur && S.cur.local) return;
  S.flixTab = 'dl';
  go('flix');
  toast(t('No internet. Here is what you downloaded.'));
}
window.addEventListener('offline', () => setTimeout(dlOffline, 1500));
window.addEventListener('online', () => setTimeout(dlSubsRun, 5000));
setTimeout(async () => {
  await dlSync();
  dlOffline();
  dlSubsRun();
}, 2500);
