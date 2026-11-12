/* ---------- scheduled recording (Android app): records a programme from the TV guide, even with the app closed ----------
   The recording runs in the background on the device (Rec / RecService) and is saved in Movies / AntunesPlayer. */
const recNative = () => NATIVE && Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.recSchedule;
let RECS = LS.get('ap.recs', []);
const saveRecs = () => LS.set('ap.recs', RECS);
const recId = (c, p) => 'r' + hash(c.key + '|' + p.s);
const recUrl = c => (c.sid && /\.m3u8(\?|$)/i.test(c.url) ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url); // Xtream: the direct stream is easier to save
async function recSync() {
  if (!recNative()) return;
  try {
    const r = await Capacitor.Plugins.ExtPlayer.recList();
    RECS = (r && r.list) || [];
    saveRecs();
  } catch (e) {}
}
async function recToggle(c, p) {
  const id = recId(c, p),
    has = RECS.some(r => r.id === id);
  try {
    if (has) {
      await Capacitor.Plugins.ExtPlayer.recCancel({ id });
      RECS = RECS.filter(r => r.id !== id);
      toast(t('Recording cancelled'));
    } else {
      const r = {
        id,
        url: recUrl(c),
        ua: uaHdr()['User-Agent'] || '',
        name: `${p.t} - ${c.name}`,
        start: p.s,
        end: p.e + 120e3
      };
      await Capacitor.Plugins.ExtPlayer.recSchedule(r);
      RECS.push(r);
      toast(t('Recording scheduled') + ' · ' + hm(p.s));
    }
    saveRecs();
  } catch (e) {
    toast(t('Could not schedule the recording'));
  }
}
async function recsDialog() {
  await recSync();
  const n = Date.now(),
    L = RECS.filter(r => r.end > n).sort((a, b) => a.start - b.start),
    day = s => new Date(s).toLocaleDateString(LOC, { weekday: 'short', day: 'numeric', month: 'short' });
  openDlg(
    `<h2>${ic('rec')} ${t('Scheduled recordings')}</h2><p class="mut">${t('Saved in Movies / AntunesPlayer on this device. Each recording uses one connection of your IPTV account.')}</p>${L.length ? `<div class="catlist">${L.map((r, i) => `<button data-rc="${i}"><span><b>${r.start <= n ? `<i class="splive">${t('Recording')}</i> ` : ''}${day(r.start)} ${hm(r.start)}–${hm(r.end - 120e3)}</b> ${esc(r.name)}<small class="mut"> · ${t('Cancel')}</small></span></button>`).join('')}</div>` : `<p>${t('Nothing scheduled. Open a programme in the TV guide or in Games and choose Record.')}</p>`}<div class="row"><button class="btn p" id="dx">OK</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $$('[data-rc]', dlg).forEach(
    b =>
      (b.onclick = async () => {
        const r = L[+b.dataset.rc];
        try {
          await Capacitor.Plugins.ExtPlayer.recCancel({ id: r.id });
        } catch (e) {}
        RECS = RECS.filter(x => x.id !== r.id);
        saveRecs();
        toast(t('Recording cancelled'));
        recsDialog();
      })
  );
}
recSync();
Object.assign(PT, {
  Record: 'Gravar',
  'Cancel recording': 'Cancelar gravação',
  'Recording scheduled': 'Gravação agendada',
  'Recording cancelled': 'Gravação cancelada',
  'Could not schedule the recording': 'Não foi possível agendar a gravação',
  'Scheduled recordings': 'Gravações agendadas',
  Recording: 'A gravar',
  'Saved in Movies / AntunesPlayer on this device. Each recording uses one connection of your IPTV account.':
    'Ficam guardadas em Filmes / AntunesPlayer neste aparelho. Cada gravação usa uma ligação da tua conta de IPTV.',
  'Nothing scheduled. Open a programme in the TV guide or in Games and choose Record.':
    'Nada agendado. Abre um programa no Guia de TV ou em Jogos e escolhe Gravar.'
});
