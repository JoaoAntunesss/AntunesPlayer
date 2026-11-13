/* ---------- sports agenda: the games of the next 24 hours, taken from the TV guide ---------- */
const SPORT_CH =
  /sport|desport|dazn|eleven|eurosport|benfica|\bbtv\b|porto canal|sporting tv|canal 11|\bespn|bein|\bnba\b|ufc|motor|\bf1\b|golf|t[eé]nis|tennis|arena/i;
const SPORT_WORDS =
  /futebol|football|soccer|\bliga\b|league|champions|taça|\bcup\b|copa|primeira|premier|bundesliga|serie a|laliga|ligue 1|\bnba\b|\bnfl\b|f[oó]rmula ?1|\bf1\b|motogp|\bufc\b|t[eé]nis|tennis|basquet|andebol|h[oó]quei|v[oó]lei|rugby|ciclismo|grande pr[eé]mio|grand prix|\bjogo\b|\bao vivo\b|\blive\b/i;
const NOT_GAME =
  /resumo|magazine|not[ií]ci|\bnews\b|talk|debate|replay|reposi[cç]|highlights|melhores momentos|antevis|document[aá]ri|\btop\b|golos da/i;
function sportsEvents(hours) {
  const now = Date.now(),
    until = now + hours * 3600e3,
    ev = new Map();
  for (const c of S.vis) {
    if (c.kind !== 'live') continue;
    const l = epgFor(c);
    if (!l) continue;
    const sc = SPORT_CH.test((c.name || '') + ' ' + (c.group || ''));
    for (const p of l) {
      if (p.e < now || p.s > until) continue;
      const tt = (p.t || '').trim();
      if (!tt || NOT_GAME.test(tt)) continue;
      // a game: "Team x Team" / "Team vs Team", or a sports title on a sports channel
      if (!/\S\s+(x|vs\.?|v)\s+\S/i.test(tt) && !(sc && SPORT_WORDS.test(tt + ' ' + (p.d || '')))) continue;
      const k = tt.toLowerCase().replace(/\s+/g, ' ') + '|' + Math.round(p.s / 900e3);
      let e = ev.get(k);
      if (!e) ev.set(k, (e = { t: tt, s: p.s, e: p.e, d: p.d, ch: [] }));
      if (!e.ch.includes(c)) e.ch.push(c);
    }
  }
  // the same game on many channels (SD/HD/FHD): favourites first, then HD versions
  const score = c => (S.favs.includes(c.key) ? 0 : 10) + (/\b(fhd|hd)\b/i.test(c.name || '') ? 0 : 1);
  return [...ev.values()]
    .map(e => {
      e.ch.sort((a, b) => score(a) - score(b));
      return e;
    })
    .sort((a, b) => a.s - b.s);
}
function sportsDialog() {
  const list = sportsEvents(24),
    now = Date.now(),
    today = new Date().toDateString(),
    noEpg = !Object.keys(S.epg || {}).length;
  const when = e =>
    (e.s <= now ? `<i class="splive">${t('Live')}</i> ` : '') +
    (new Date(e.s).toDateString() === today ? '' : t('tomorrow') + ' ') +
    hm(e.s);
  openDlg(
    `<div class="gh"><h2>${ic('tv')} ${t('Games')}</h2><button class="ib" id="dx" aria-label="${t('Close')}">${ic('back')}</button></div>` +
      (list.length
        ? `<p class="mut">${t('Next 24 hours, from the TV guide. Choose a game to watch it or to be reminded.')}</p>${list.some(e => e.s <= now) ? `<button class="btn" id="spMv">${ic('stack')} ${t('Watch several games at once')}</button>` : ''}<div class="catlist sports">${list
            .map(
              (e, i) =>
                `<button data-sp="${i}"><span><b>${when(e)}</b> ${esc(e.t)}<small class="mut"> · ${esc(
                  e.ch
                    .slice(0, 3)
                    .map(c => c.name)
                    .join(' · ')
                )}${e.ch.length > 3 ? ' +' + (e.ch.length - 3) : ''}</small></span></button>`
            )
            .join('')}</div>`
        : `<p class="mut">${noEpg ? t('The TV guide has not loaded yet. Try again in a moment.') : t('No games found in the TV guide for the next 24 hours.')}</p>`),
    'sportsdlg'
  );
  $('#dx').onclick = () => dlg.close();
  $$('[data-sp]', dlg).forEach(
    b =>
      (b.onclick = () => {
        const e = list[+b.dataset.sp];
        progDialog(e.ch[0], { s: e.s, e: e.e, t: e.t, d: e.d });
      })
  );
  const smv = $('#spMv');
  if (smv)
    smv.onclick = () => {
      dlg.close();
      openMulti(
        list
          .filter(e => e.s <= now)
          .slice(0, 4)
          .map(e => e.ch[0])
      );
    };
  setTimeout(() => {
    const f = $('[data-sp]', dlg) || $('#dx');
    if (f) f.focus();
  }, 40);
}
Object.assign(PT, {
  Games: 'Jogos',
  tomorrow: 'amanhã',
  'Next 24 hours, from the TV guide. Choose a game to watch it or to be reminded.':
    'Próximas 24 horas, a partir do guia de TV. Escolhe um jogo para o ver ou para seres avisado.',
  'The TV guide has not loaded yet. Try again in a moment.': 'O guia de TV ainda não carregou. Tenta daqui a pouco.',
  'No games found in the TV guide for the next 24 hours.': 'Não há jogos no guia de TV para as próximas 24 horas.'
});

/* stream info */
let infoT = 0;
function streamInfo() {
  const row = (k, val) => `<dt>${t(k)}</dt><dd>${val}</dd>`;
  const draw = () => {
    if (!dlg.open || !$('#siBox', dlg)) {
      clearInterval(infoT);
      return;
    }
    const q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null,
      lv = hls && hls.levels && hls.levels[hls.currentLevel];
    let buf = 0;
    try {
      for (let i = 0; i < v.buffered.length; i++)
        if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime)
          buf = v.buffered.end(i) - v.currentTime;
    } catch (e) {}
    $('#siBox', dlg).innerHTML =
      row('Resolution', v.videoWidth ? `${v.videoWidth}×${v.videoHeight}` : '—') +
      row('Engine', NV.on ? 'ExoPlayer (nativo)' : hls ? 'hls.js' : mpg ? 'mpegts.js' : 'HTML5') +
      (lv && lv.bitrate
        ? row(
            'Bitrate',
            (lv.bitrate / 1e6).toFixed(1) + ' Mbps' + (lv.videoCodec ? ' · ' + esc(lv.videoCodec.split('.')[0]) : '')
          )
        : '') +
      (hls && hls.bandwidthEstimate ? row('Connection', (hls.bandwidthEstimate / 1e6).toFixed(1) + ' Mbps') : '') +
      row('Buffer', buf.toFixed(1) + ' s') +
      (q ? row('Dropped frames', q.droppedVideoFrames + ' / ' + q.totalVideoFrames) : '');
  };
  const levels = hls && hls.levels && hls.levels.length > 1 ? hls.levels : null;
  openDlg(
    `<h2>${ic('signal')} ${t('Stream info')}</h2><p class="mut">${esc(S.cur ? S.cur.name : '')}</p><dl class="sinfo" id="siBox"></dl>${levels ? `<label>${t('Quality')}</label><div class="tabs"><button data-lv="-1" class="${hls.autoLevelEnabled ? 'on' : ''}">${t('Auto')}</button>${levels.map((l, i) => `<button data-lv="${i}" class="${!hls.autoLevelEnabled && hls.currentLevel === i ? 'on' : ''}">${l.height ? l.height + 'p' : Math.round(l.bitrate / 1000) + 'k'}</button>`).join('')}</div>` : ''}<div class="row"><button class="btn p" id="dx">OK</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $$('[data-lv]', dlg).forEach(
    b =>
      (b.onclick = () => {
        hls.currentLevel = +b.dataset.lv;
        $$('[data-lv]', dlg).forEach(x => x.classList.toggle('on', x === b));
      })
  );
  draw();
  clearInterval(infoT);
  infoT = setInterval(draw, 1000);
}

/* open the current stream in another app (VLC, MX Player, Just Player…) */
async function openElsewhere() {
  const c = S.cur;
  if (!c) return;
  const url = c.useTs ? c.url.replace(/\.m3u8(\?.*)?$/, '.ts$1') : c.url,
    P = window.Capacitor && Capacitor.Plugins;
  if (NATIVE && P && P.ExtPlayer) {
    try {
      await P.ExtPlayer.open({ url, title: c.name || '' });
      v.pause();
    } catch (e) {
      toast(t('No other video player installed'));
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(t('Link copied'));
  } catch (e) {
    prompt(t('Copy link'), url);
  }
}

/* guide offset, subtitle size */
function shiftEpg(data) {
  const h = +S.set.epgOff || 0;
  if (!h) return data;
  const o = {},
    d = h * 3600e3;
  Object.keys(data).forEach(k => {
    o[k] = data[k].map(p => ({ s: p.s + d, e: p.e + d, t: p.t, d: p.d }));
  });
  return o;
}
function applySubs() {
  let st = $('#subStyle');
  if (!st) {
    st = document.createElement('style');
    st.id = 'subStyle';
    document.head.appendChild(st);
  }
  const z = +S.set.subSize || 100;
  st.textContent = `#v::cue{font-size:${z}%;background:rgba(0,0,0,.6)}`;
}
applySubs();

/* per-playlist User-Agent (Android app; browsers do not allow changing it) */
const srcUA = () => {
  const s = curSrc();
  return s && s.ua ? s.ua : '';
};
function editSourceDialog(id) {
  const s = S.sources.find(x => x.id === id);
  if (!s) return;
  openDlg(
    `<h2>${ic('edit')} ${t('Edit playlist')}</h2><label>${t('Name')}</label><input id="eN" value="${esc(s.name)}"><label>${t('TV guide link (XMLTV, optional)')}</label><input id="eE" type="url" value="${esc(s.epg || '')}"><label>${t('User-Agent (optional, some providers need it)')}</label><input id="eU" value="${esc(s.ua || '')}" placeholder="VLC/3.0.20 LibVLC/3.0.20" autocomplete="off"><div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="eOk">${t('Save')}</button></div>`
  );
  $('#dx').onclick = listsDialog;
  $('#eOk').onclick = () => {
    s.name = $('#eN').value.trim() || s.name;
    s.epg = $('#eE').value.trim();
    s.ua = $('#eU').value.trim();
    LS.set('ap.sources', S.sources);
    toast(t('Saved'));
    listsDialog();
    if (s.id === S.srcId) selectSource(s.id, true);
  };
}
