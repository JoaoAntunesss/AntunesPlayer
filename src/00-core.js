const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s =>
  String(s == null ? '' : s).replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const LS = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }
};

/* ---------- language ---------- */
const LANG = (LS.get('ap.lang', '') || navigator.language || 'en').slice(0, 2) === 'pt' ? 'pt' : 'en';
const PT = {
  'Search channels…': 'Pesquisar canais…',
  Favourites: 'Favoritos',
  Recent: 'Recentes',
  'All channels': 'Todos os canais',
  Movies: 'Filmes',
  Series: 'Séries',
  'Add playlist': 'Adicionar lista',
  Settings: 'Definições',
  Cancel: 'Cancelar',
  Save: 'Guardar',
  Add: 'Adicionar',
  Close: 'Fechar',
  Delete: 'Apagar',
  Refresh: 'Atualizar',
  'Playlist link (M3U / M3U8)': 'Link da lista (M3U / M3U8)',
  'Paste or upload': 'Colar ou carregar',
  'Xtream login': 'Login Xtream',
  Name: 'Nome',
  'Server (with http/https)': 'Servidor (com http/https)',
  Username: 'Utilizador',
  Password: 'Palavra-passe',
  'TV guide link (XMLTV, optional)': 'Link do guia de programação (XMLTV, opcional)',
  'Playlist text': 'Texto da lista',
  'or choose a file': 'ou escolhe um ficheiro',
  'Welcome to AWplayer': 'Bem-vindo ao AWplayer',
  'AWplayer plays the streams you give it — it comes with no channels. Add your own playlist, or look around with free test streams.':
    'O AWplayer reproduz as listas que lhe deres — não traz canais. Adiciona a tua lista ou experimenta com emissões de teste gratuitas.',
  'Try demo channels': 'Experimentar canais de demonstração',
  'Nothing found': 'Nada encontrado',
  'Show more': 'Mostrar mais',
  'Last channel': 'Último canal',
  'No channel': 'Sem canal',
  'Added to favourites': 'Adicionado aos favoritos',
  'Removed from favourites': 'Removido dos favoritos',
  'Loading…': 'A carregar…',
  'Could not play this': 'Não foi possível reproduzir',
  Retry: 'Tentar de novo',
  Look: 'Aspeto',
  Theme: 'Tema',
  'Number keys jump to': 'As teclas numéricas vão para',
  'Channel numbers from the playlist': 'Números dos canais da lista',
  'My favourites, in order': 'Os meus favoritos, por ordem',
  'Big TV mode': 'Modo TV (grande)',
  Network: 'Rede',
  'Helper link for blocked playlists (optional)': 'Link auxiliar para listas bloqueadas (opcional)',
  'Also use it for streams': 'Usar também nas emissões',
  Yes: 'Sim',
  No: 'Não',
  Playlists: 'Listas',
  'Keyboard & remote': 'Teclado e comando',
  Number: 'Número',
  'jump to that channel': 'ir para esse canal',
  'next / previous channel': 'canal seguinte / anterior',
  'channel list': 'lista de canais',
  'favourite on/off': 'favorito sim/não',
  'last channel': 'último canal',
  mute: 'sem som',
  'record (needs a browser that allows it)': 'gravar (precisa de navegador que permita)',
  'full screen': 'ecrã inteiro',
  'Recording saved': 'Gravação guardada',
  'Recording…': 'A gravar…',
  'Recording is not possible for this stream': 'Não é possível gravar esta emissão',
  Download: 'Descarregar',
  Now: 'Agora',
  Next: 'A seguir',
  channels: 'canais',
  Language: 'Idioma',
  'Playlist added': 'Lista adicionada',
  'Could not load the playlist': 'Não foi possível carregar a lista',
  'Fill in the fields': 'Preenche os campos',
  'No programme guide for this channel': 'Sem guia para este canal',
  Live: 'Em direto',
  'Full screen': 'Ecrã inteiro'
};
Object.assign(PT, {
  'Search movies and series…': 'Pesquisar filmes e séries…',
  'Filter categories…': 'Filtrar categorias…',
  'TV guide': 'Guia de TV',
  Play: 'Ver',
  'Search channels, movies, series…': 'Pesquisar canais, filmes, séries…',
  'No guide data yet': 'Sem dados de guia ainda',
  Favourite: 'Favorito',
  Categories: 'Categorias',
  TV: 'TV',
  Season: 'Época',
  Episodes: 'Episódios',
  'Loading…': 'A carregar…',
  'No episodes found': 'Sem episódios'
});
Object.assign(PT, {
  Audio: 'Áudio',
  Subtitles: 'Legendas',
  Off: 'Desligadas',
  'No extra audio or subtitles': 'Sem áudio ou legendas extra',
  Fit: 'Ajustar',
  Fill: 'Preencher',
  Stretch: 'Esticar',
  Resume: 'Continuar',
  'Continue watching': 'Continuar a ver'
});
const VER = 'v20';
const t = s => (LANG === 'pt' && PT[s]) || s;
const THEMES = [
  ['night', 'Signal'],
  ['ocean', 'Phosphor'],
  ['amber', 'Amber'],
  ['ember', 'Ember'],
  ['neon', 'Neon']
];

/* ---------- tiny IndexedDB key/value ---------- */
let dbp;
const idb = () =>
  dbp ||
  (dbp = new Promise((ok, no) => {
    const r = indexedDB.open('antunesplayer', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  }));
const idbGet = k =>
  idb()
    .then(
      d =>
        new Promise(ok => {
          const q = d.transaction('kv').objectStore('kv').get(k);
          q.onsuccess = () => ok(q.result);
          q.onerror = () => ok(undefined);
        })
    )
    .catch(() => undefined);
const idbSet = (k, v) =>
  idb()
    .then(
      d =>
        new Promise(ok => {
          const tx = d.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, k);
          tx.oncomplete = () => ok();
          tx.onerror = () => ok();
        })
    )
    .catch(() => {});
const idbDel = k =>
  idb()
    .then(
      d =>
        new Promise(ok => {
          const tx = d.transaction('kv', 'readwrite');
          tx.objectStore('kv').delete(k);
          tx.oncomplete = () => ok();
        })
    )
    .catch(() => {});

/* ---------- state ---------- */
const S0 = 0;
const S = {
  lists: LS.get('ap.lists', []),
  vis: [],
  unlocked: false,
  sort: {},
  sources: LS.get('ap.sources', []),
  srcId: LS.get('ap.src', ''),
  channels: [],
  favs: LS.get('ap.favs', []),
  recent: LS.get('ap.recent', []),
  set: Object.assign(
    { proxy: '', proxyStreams: false, numberMode: 'chno', theme: 'night', tv: false },
    LS.get('ap.set', {})
  ),
  group: 'all',
  q: '',
  qs: 'all',
  shown: 250,
  cur: null,
  last: null,
  epg: {},
  byNum: {},
  byKey: {}
};
const saveSet = () => LS.set('ap.set', S.set);
let toastT;
const toast = m => {
  const e = $('#toast');
  e.textContent = m;
  e.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => e.classList.remove('on'), 2400);
};
const hash = s => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
// The helper only exists for the web version on https. The Android and Windows apps talk to the servers directly (no CORS, no mixed content), so they never use it, even when the helper link came with the synced settings.
const needsHelper = () =>
  location.protocol === 'https:' && !(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
const proxied = (u, force) => {
  const p = S.set.proxy;
  if (!p || !needsHelper() || !(force || S.set.proxyStreams || /^http:/i.test(u))) return u;
  return p.includes('{url}') ? p.replace('{url}', encodeURIComponent(u)) : p + encodeURIComponent(u);
};
const NATIVE = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
// Windows app (Electron) opens the app with ?desktop=1; a browser opened by it to sign in arrives with #login-pc=CODE
const DESKTOP = (() => {
  const q = /[?&]desktop=1\b/.test(location.search);
  try {
    if (q) sessionStorage.setItem('ap.desktop', '1');
    return sessionStorage.getItem('ap.desktop') === '1';
  } catch (e) {
    return q;
  }
})();
const LOGIN_PC = (location.hash.match(/^#login-pc=([A-Z2-9]{8})$/) || [])[1] || '';
const nativeHttp = () => NATIVE && Capacitor.Plugins && Capacitor.Plugins.CapacitorHttp;
// In the Android app, hls.js loads through the native HTTP layer so servers that block web pages (CORS) still work.
// Decodes base64 with the browser's native decoder: far faster than a JS loop and keeps TV boxes from stuttering.
const b64buf = async s => {
  try {
    return await (await fetch('data:application/octet-stream;base64,' + s)).arrayBuffer();
  } catch (e) {
    const b = atob(s),
      u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u.buffer;
  }
};
class NativeLoader {
  constructor() {
    this.stats = {
      aborted: false,
      loaded: 0,
      retry: 0,
      total: 0,
      chunkCount: 0,
      bwEstimate: 0,
      loading: { start: 0, first: 0, end: 0 },
      parsing: { start: 0, end: 0 },
      buffering: { start: 0, first: 0, end: 0 }
    };
    this.dead = false;
  }
  destroy() {
    this.dead = true;
  }
  abort() {
    this.dead = true;
    this.stats.aborted = true;
  }
  load(ctx, cfg, cb) {
    const st = this.stats;
    st.loading.start = performance.now();
    const bin = ctx.responseType === 'arraybuffer',
      headers = Object.assign({}, uaHdr());
    if (ctx.rangeStart != null && ctx.rangeEnd != null) headers.Range = `bytes=${ctx.rangeStart}-${ctx.rangeEnd - 1}`;
    nativeHttp()
      .request({
        url: ctx.url,
        method: 'GET',
        headers,
        responseType: bin ? 'arraybuffer' : 'text',
        connectTimeout: 15000,
        readTimeout: 20000
      })
      .then(async r => {
        if (this.dead) return;
        if (r.status >= 400) {
          cb.onError({ code: r.status, text: 'HTTP ' + r.status }, ctx, r);
          return;
        }
        let data = r.data;
        if (bin) {
          data = await b64buf(typeof data === 'string' ? data : '');
          if (this.dead) return;
        }
        st.loading.first = st.loading.end = performance.now();
        st.loaded = st.total = bin ? data.byteLength : String(data).length;
        cb.onSuccess({ url: r.url || ctx.url, data }, st, ctx, r);
      })
      .catch(e => {
        if (!this.dead) cb.onError({ code: 0, text: String((e && e.message) || e) }, ctx, null);
      });
  }
}
const loadScript = src =>
  new Promise((ok, no) => {
    const e = document.createElement('script');
    e.src = src;
    e.onload = ok;
    e.onerror = () => no(new Error('Could not load ' + src));
    document.head.appendChild(e);
  });
