/* ---------- online subtitles (OpenSubtitles.com): search by film/episode, pick a language, switch on by itself ---------- */
Object.assign(PT, {
  'Online subtitles': 'Legendas online',
  'Search online': 'Procurar online',
  'Searching subtitles…': 'A procurar legendas…',
  'No subtitles found online': 'Não foram encontradas legendas online',
  Subtitles: 'Legendas',
  'Subtitle languages (in order)': 'Idiomas das legendas (por ordem)',
  'Turn on subtitles automatically': 'Ligar legendas automaticamente',
  'OpenSubtitles API key': 'Chave da API do OpenSubtitles',
  'OpenSubtitles account (optional: 20 a day instead of 5)': 'Conta OpenSubtitles (opcional: 20 por dia em vez de 5)',
  Username: 'Utilizador',
  Password: 'Palavra-passe',
  'Daily download limit reached': 'Limite diário de downloads atingido',
  'Add the OpenSubtitles key in Settings': 'Põe a chave do OpenSubtitles nas Definições',
  'Could not get subtitles': 'Não foi possível obter as legendas',
  'left today': 'restantes hoje',
  downloads: 'downloads',
  'Built in (optional: your own key)': 'Já incluída (opcional: a tua chave)'
});
const SUBL = [
  ['pt-pt', 'Português (PT)'],
  ['pt-br', 'Português (BR)'],
  ['en', 'English'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['it', 'Italiano'],
  ['de', 'Deutsch'],
  ['nl', 'Nederlands'],
  ['ro', 'Română'],
  ['pl', 'Polski'],
  ['tr', 'Türkçe'],
  ['ar', 'العربية']
];
const subLangs = () => {
  // once: Portuguese users get PT-PT, PT-BR, English (an older remote bug could leave English alone in the first box)
  if (!S.set.subMig && LANG === 'pt') {
    S.set.subLangs = 'pt-pt,pt-br,en';
    S.set.subMig = 1;
    saveSet();
  }
  return (S.set.subLangs || (LANG === 'pt' ? 'pt-pt,pt-br,en' : 'en')).split(',').filter(Boolean);
};
const OS_APP_KEY = 'PK4BCOwRA0rHjsuJ9VKLY0OaTMZMx0oJ'; // AntunesPlayer's OpenSubtitles consumer (identifies the app, not a password)
const OSK = () => (S.set.osKey || '').trim() || OS_APP_KEY;
let osBase = 'https://api.opensubtitles.com/api/v1';
async function osFetch(path, opt) {
  const tok = LS.get('ap.ost', null),
    h = {
      'Api-Key': OSK(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'AntunesPlayer v1.0',
      'X-User-Agent': 'AntunesPlayer v1.0'
    };
  if (tok && tok.exp > Date.now()) {
    h.Authorization = 'Bearer ' + tok.t;
    if (tok.b) osBase = 'https://' + tok.b + '/api/v1';
  }
  const r = await fetch(osBase + path, Object.assign({ headers: h }, opt || {}));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.message || (j.errors && j.errors[0]) || 'HTTP ' + r.status);
    e.status = r.status;
    e.j = j;
    throw e;
  }
  return j;
}
async function osLogin() {
  const a = LS.get('ap.osu', null);
  if (!a || !a.u || !a.p) return;
  const tok = LS.get('ap.ost', null);
  if (tok && tok.exp > Date.now()) return;
  try {
    const j = await osFetch('/login', { method: 'POST', body: JSON.stringify({ username: a.u, password: a.p }) });
    LS.set('ap.ost', { t: j.token, b: j.base_url, exp: Date.now() + 20 * 3600e3 });
  } catch (e) {}
}
const cleanTitle = n =>
  String(n || '')
    .replace(/\s*·\s*S\d+E\d+.*$/, '')
    .replace(/^[A-Z]{2,3}\s*[:|\-]\s*/, '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/\b(19|20)\d\d\b/g, ' ')
    .replace(/\b(4k|uhd|fhd|hd|sd|multi|legendado|dublado|pt|vo)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
async function subsTarget(c) {
  // what to search for: TMDB id when the provider gives it, otherwise the title (+ year)
  const o = { name: cleanTitle(c.name), year: '', tmdb: '', sn: 0, ep: 0, type: 'movie' };
  if (c.ser) {
    const s = S.byKey[c.ser];
    o.name = cleanTitle(s ? s.name : c.name);
    o.sn = +c.sn || 0;
    o.ep = +(/E(\d+)/.exec(c.name) || [])[1] || 0;
    o.type = 'episode';
    const i = S.detail && S.detail.key === c.ser ? S.dinfo || {} : {};
    o.tmdb = i.tmdb || i.tmdb_id || '';
    o.year = (i.releaseDate || i.releasedate || '').slice(0, 4);
    return o;
  }
  let i = S.detail === c ? S.dinfo || {} : null;
  if (!i && c.vodId) {
    try {
      const x = xbase();
      const d = await fetchJson(
        `${x.base}/player_api.php?username=${x.q(x.s.user)}&password=${x.q(x.s.pass)}&action=get_vod_info&vod_id=${x.q(c.vodId)}`
      );
      i = d.info || {};
    } catch (e) {
      i = {};
    }
  }
  i = i || {};
  o.tmdb = i.tmdb_id || i.tmdb || '';
  o.year = (i.releasedate || i.release_date || '').slice(0, 4) || (/\b(19|20)\d\d\b/.exec(c.name) || [])[0] || '';
  return o;
}
async function subsSearch(c) {
  const o = await subsTarget(c),
    L = subLangs(),
    q = new URLSearchParams({ order_by: 'download_count' });
  if (o.type === 'episode') {
    if (o.tmdb) q.set('parent_tmdb_id', o.tmdb);
    else q.set('query', o.name);
    if (o.sn) q.set('season_number', o.sn);
    if (o.ep) q.set('episode_number', o.ep);
    q.set('type', 'episode');
  } else {
    if (o.tmdb) q.set('tmdb_id', o.tmdb);
    else {
      q.set('query', o.name);
      if (o.year) q.set('year', o.year);
    }
    q.set('type', 'movie');
  }
  // two searches: the chosen languages (so they are always there) and every language (to choose from all that exist)
  const qp = new URLSearchParams(q);
  qp.set('languages', L.join(','));
  qp.sort();
  q.sort();
  const [jp, ja] = await Promise.all([
    osFetch('/subtitles?' + qp.toString()),
    osFetch('/subtitles?' + q.toString()).catch(() => ({ data: [] }))
  ]);
  const rank = l => {
      const i = L.indexOf(String(l).toLowerCase());
      return i < 0 ? 99 : i;
    },
    seen = new Set();
  return (jp.data || [])
    .concat(ja.data || [])
    .map(d => {
      const a = d.attributes || {},
        f = (a.files || [])[0] || {};
      return {
        id: f.file_id,
        lang: String(a.language || '').toLowerCase(),
        rel: a.release || f.file_name || '',
        dl: a.download_count || 0,
        hi: !!a.hearing_impaired
      };
    })
    .filter(x => x.id && !seen.has(x.id) && seen.add(x.id))
    .sort((a, b) => rank(a.lang) - rank(b.lang) || a.lang.localeCompare(b.lang) || a.hi - b.hi || b.dl - a.dl)
    .slice(0, 80);
}
const langName = l => (SUBL.find(x => x[0] === l) || [0, l.toUpperCase()])[1];
// the subtitle file as WebVTT text (cached, so each one is downloaded once)
async function subsVtt(r) {
  let vtt = await idbGet('sub:' + r.id);
  if (!vtt) {
    await osLogin();
    const j = await osFetch('/download', {
      method: 'POST',
      body: JSON.stringify({ file_id: r.id, sub_format: 'webvtt' })
    });
    const tx = await (await fetch(j.link)).text();
    vtt = /^\uFEFF?WEBVTT/.test(tx)
      ? tx
      : 'WEBVTT\n\n' + tx.replace(/\r/g, '').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
    idbSet('sub:' + r.id, vtt);
    if (j.remaining != null) S.subLeft = j.remaining;
  }
  return vtt;
}
async function subsLoad(r, c) {
  const vtt = await subsVtt(r);
  if (S.cur !== c) return false;
  if (NV.on) {
    await nvSub(vtt, r.lang, langName(r.lang) + ' · online');
    return true;
  }
  $$('#v track[data-os]').forEach(x => x.remove());
  const tr = document.createElement('track');
  tr.kind = 'subtitles';
  tr.label = langName(r.lang) + ' · online';
  tr.srclang = r.lang.slice(0, 2);
  tr.dataset.os = r.id;
  tr.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  v.appendChild(tr);
  const show = () =>
    [...v.textTracks].forEach(x => {
      x.mode = x.label === tr.label ? 'showing' : 'disabled';
    });
  show();
  tr.addEventListener('load', show);
  setTimeout(show, 300);
  return true;
}
function subsErr(e) {
  if (e && (e.status === 406 || /limit|quota/i.test(e.message || ''))) toast(t('Daily download limit reached'));
  else toast(t('Could not get subtitles') + (e && e.message ? ': ' + e.message : ''));
}
async function autoSubs(c) {
  if (!c || c.kind === 'live' || c.kind === 'catchup' || S.set.subAuto === false || !OSK()) return;
  try {
    const list = await subsSearch(c);
    if (S.cur !== c) return;
    S.subList = { k: c.key, list };
    if (!list.length) return;
    const ok = await subsLoad(list[0], c);
    if (ok) toast(t('Subtitles') + ': ' + langName(list[0].lang));
  } catch (e) {
    if (S.cur === c) subsErr(e);
  }
}
function onlineSubsHtml(c) {
  if (!c || c.kind === 'live') return '';
  const L = S.subList && S.subList.k === c.key ? S.subList.list : null;
  return (
    `<label>${t('Online subtitles')}${S.subLeft != null ? ` <small class="mut">· ${S.subLeft} ${t('left today')}</small>` : ''}</label>` +
    (L
      ? L.length
        ? `<div class="catlist">${L.map((r, i) => `${!i || L[i - 1].lang !== r.lang ? `<p class="mut oslang">${esc(langName(r.lang))}</p>` : ''}<button data-os="${i}"><span>${esc(langName(r.lang))}${r.hi ? ' · CC' : ''} <small class="mut">${esc(r.rel).slice(0, 60)} · ${r.dl} ${t('downloads')}</small></span></button>`).join('')}</div>`
        : `<p class="mut">${t('No subtitles found online')}</p>`
      : `<div class="row" style="justify-content:flex-start"><button class="btn" id="osGo">${ic('search')} ${t('Search online')}</button></div>`)
  );
}
function wireOnlineSubs(c, reopen) {
  const g = $('#osGo', dlg);
  if (g)
    g.onclick = async () => {
      if (!OSK()) {
        toast(t('Add the OpenSubtitles key in Settings'));
        return;
      }
      g.disabled = true;
      g.textContent = t('Searching subtitles…');
      try {
        S.subList = { k: c.key, list: await subsSearch(c) };
      } catch (e) {
        subsErr(e);
      }
      S.osFocus = true;
      reopen();
    };
  if (S.osFocus) {
    S.osFocus = false;
    const f0 = $('[data-os]', dlg);
    if (f0)
      setTimeout(() => {
        f0.focus();
        f0.scrollIntoView({ block: 'nearest' });
      }, 30);
  }
  $$('[data-os]', dlg).forEach(
    b =>
      (b.onclick = async () => {
        const r = S.subList.list[+b.dataset.os];
        dlg.close();
        try {
          if (await subsLoad(r, c)) toast(t('Subtitles') + ': ' + langName(r.lang));
        } catch (e) {
          subsErr(e);
        }
      })
  );
}
