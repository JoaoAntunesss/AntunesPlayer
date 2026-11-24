/* ---------- abrir um filme ou uma série vindos do ReelPick ----------
   O ReelPick abre  player.awdigital.pt/?ver=movie|tv&t=Título&o=Título original&y=Ano
   e o AWplayer procura esse título nas listas da própria pessoa (só filmes e séries, nunca canais).
   Encontrado sem dúvidas → abre a página do título no AWflix; com dúvidas → abre a pesquisa já escrita.
   Não há listas incluídas: se a pessoa não tiver nenhuma, é só avisada. */
Object.assign(PT, {
  'Looking for it in your playlists…': 'A procurar nas tuas listas…',
  'Add a playlist first to watch titles chosen in ReelPick.':
    'Adiciona primeiro uma lista para veres os títulos escolhidos no ReelPick.',
  'Not found in your playlists': 'Não encontrado nas tuas listas'
});
function rpAnoDe(c) {
  return (/\b(19|20)\d\d\b/.exec(c.name) || [])[0] || '';
}
function rpAbrir(ped) {
  const semAno = s =>
    s
      .replace(/\b(19|20)\d\d\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const alvos = [ped.t, ped.o].filter(Boolean).map(x => semAno(skey(x)));
  let cand = [];
  for (const q of [ped.t, ped.o]) {
    if (!q) continue;
    cand = searchItems(q, [ped.kind]);
    if (cand.length) break;
  }
  // títulos exatamente iguais (sem qualidade, ano ou prefixo de país) valem mais que parecidos
  const exatos = cand.filter(c => alvos.includes(semAno(searchKey(c).s)));
  let pool = exatos;
  if (ped.y && pool.length) {
    const ano = pool.filter(c => {
      const a = rpAnoDe(c);
      return !a || Math.abs(+a - +ped.y) <= 1;
    });
    pool = ano.length ? ano : ped.y && pool.every(c => rpAnoDe(c)) ? [] : pool;
  }
  // várias versões do mesmo título (4K, HD, PT…) contam como uma: abre-se a primeira
  if (pool.length && new Set(pool.map(c => semAno(searchKey(c).s))).size === 1) {
    S.fx = true;
    document.body.classList.add('fx');
    openDetail(pool[0]);
    return;
  }
  openSearch('flix');
  $('#q').value = ped.t || ped.o;
  S.q = ped.t || ped.o;
  S.shown = 250;
  renderSearch();
  if (!cand.length) toast(t('Not found in your playlists') + ': ' + (ped.t || ped.o));
}
{
  const p = new URLSearchParams(location.search),
    ver = p.get('ver');
  if (ver === 'movie' || ver === 'tv') {
    const ped = {
      kind: ver === 'tv' ? 'series' : 'vod',
      t: (p.get('t') || '').trim().slice(0, 150),
      o: (p.get('o') || '').trim().slice(0, 150),
      y: /^(19|20)\d\d$/.test(p.get('y') || '') ? p.get('y') : ''
    };
    // tira o pedido do endereço, para não se repetir ao recarregar
    history.replaceState(history.state, '', location.pathname + location.hash);
    if (ped.t || ped.o) {
      const t0 = Date.now();
      let avisou = false;
      const tentar = () => {
        if (!S.sources.length) {
          // à espera do início de sessão (as listas podem vir da conta Google)
          if (Date.now() - t0 < 15000) return setTimeout(tentar, 700);
          toast(t('Add a playlist first to watch titles chosen in ReelPick.'));
          return;
        }
        if (!S.vis || !S.vis.some(c => c.kind === ped.kind)) {
          if (!avisou) {
            toast(t('Looking for it in your playlists…'));
            avisou = true;
          }
          if (Date.now() - t0 < 90000) return setTimeout(tentar, 700);
        }
        imdbLoad();
        rpAbrir(ped);
      };
      setTimeout(tentar, 600);
    }
  }
}
