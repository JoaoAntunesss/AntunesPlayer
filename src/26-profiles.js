/* ---------- profiles: each person has their own favourites, lists, "continue watching" and progress ----------
   The active profile's data lives in the normal keys; the others are kept aside and swapped in when you change profile.
   A kids profile only shows children's channels, cartoons and family films; leaving it asks for the parental PIN, if set. */
const PROF_KEYS = [
  'ap.favs',
  'ap.recent',
  'ap.lists',
  'ap.pos',
  'ap.dur',
  'ap.seen',
  'ap.wts',
  'ap.slast',
  'ap.eps',
  'ap.cur',
  'ap.last',
  'ap.gsel',
  'ap.rem'
];
const PROF_COLORS = ['#2fd8ff', '#e50914', '#f5a623', '#7ed321', '#bd10e0', '#ff6fb5', '#50e3c2', '#ffd400'];
const PROFS = LS.get('ap.profiles', null) || {
  list: [{ id: 'p1', name: LANG === 'pt' ? 'Principal' : 'Main', color: PROF_COLORS[0] }],
  cur: 'p1'
};
const KIDS_RX =
  /kids|infantil|crian[cç]|anima[cç]|cartoon|disney|nick|panda|baby|j[uú]nior|boomerang|cartoonito|\bclan\b|kika|toons|animados|desenhos|fam[ií]l/i;
function profCur() {
  return PROFS.list.find(p => p.id === PROFS.cur) || PROFS.list[0];
}
function profIsMain() {
  return profCur().id === PROFS.list[0].id;
}
function kidsOn() {
  return !!profCur().kids;
}
function kidsOk(c) {
  return (
    KIDS_RX.test((c.group || '') + ' ' + (c.name || '')) ||
    (c.kind !== 'live' && genreOf(c).some(g => g === 'animation' || g === 'family'))
  );
}
const profSave = () => {
  localStorage.setItem('ap.profiles', JSON.stringify(PROFS));
  schedulePush();
};
const PROF_MAX = 6;
function profUnpack(o) {
  const g = (k, d) => {
    try {
      return o && o[k] != null ? JSON.parse(o[k]) : d;
    } catch (e) {
      return d;
    }
  };
  return {
    favs: g('ap.favs', []),
    lists: g('ap.lists', []),
    watch: {
      pos: g('ap.pos', {}),
      dur: g('ap.dur', {}),
      seen: g('ap.seen', {}),
      wts: g('ap.wts', {}),
      slast: g('ap.slast', {}),
      eps: g('ap.eps', {})
    }
  };
}
function profSnapObj() {
  const o = {};
  PROF_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v != null) o[k] = v;
  });
  return o;
}
// what goes to the Google account: the profiles and the lists/progress of each one
function profBundle() {
  const data = {};
  PROFS.list.forEach(p => {
    if (p.id === PROFS.cur) data[p.id] = profSnapObj();
    else {
      try {
        data[p.id] = JSON.parse(localStorage.getItem('ap.prof.' + p.id) || '{}');
      } catch (e) {
        data[p.id] = {};
      }
    }
  });
  return { list: PROFS.list, data };
}
// what comes from the account; returns the active profile's lists/progress to apply now
function profApply(bp, mode) {
  if (!bp || !Array.isArray(bp.list) || !bp.list.length) return null;
  if (mode === 'replace') PROFS.list = bp.list.map(p => Object.assign({}, p));
  else
    bp.list.forEach(p => {
      if (!PROFS.list.some(x => x.id === p.id)) PROFS.list.push(Object.assign({}, p));
    });
  if (!PROFS.list.some(p => p.id === PROFS.cur)) PROFS.cur = PROFS.list[0].id;
  localStorage.setItem('ap.profiles', JSON.stringify(PROFS));
  Object.keys(bp.data || {}).forEach(id => {
    if (
      id !== PROFS.cur &&
      PROFS.list.some(p => p.id === id) &&
      (mode === 'replace' || localStorage.getItem('ap.prof.' + id) == null)
    )
      localStorage.setItem('ap.prof.' + id, JSON.stringify(bp.data[id] || {}));
  });
  return bp.data && bp.data[PROFS.cur] ? profUnpack(bp.data[PROFS.cur]) : null;
}
function profSnap(id) {
  const o = {};
  PROF_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v != null) o[k] = v;
  });
  localStorage.setItem('ap.prof.' + id, JSON.stringify(o));
}
function profMainData() {
  if (profIsMain()) return null;
  try {
    const o = JSON.parse(localStorage.getItem('ap.prof.' + PROFS.list[0].id) || '{}'),
      g = (k, d) => (o[k] != null ? JSON.parse(o[k]) : d);
    return {
      favs: g('ap.favs', []),
      lists: g('ap.lists', []),
      watch: {
        pos: g('ap.pos', {}),
        dur: g('ap.dur', {}),
        seen: g('ap.seen', {}),
        wts: g('ap.wts', {}),
        slast: g('ap.slast', {}),
        eps: g('ap.eps', {})
      }
    };
  } catch (e) {
    return null;
  }
}
function switchProfile(id) {
  if (id === PROFS.cur) {
    dlg.close();
    return;
  }
  try {
    if (S.cur) stopPlayback();
    LS.set('ap.pos', POS);
    LS.set('ap.dur', DUR);
    saveWatch();
  } catch (e) {}
  profSnap(PROFS.cur);
  let o = {};
  try {
    o = JSON.parse(localStorage.getItem('ap.prof.' + id) || '{}');
  } catch (e) {}
  PROF_KEYS.forEach(k => {
    if (o[k] != null) localStorage.setItem(k, o[k]);
    else localStorage.removeItem(k);
  });
  PROFS.cur = id;
  profSave();
  localStorage.removeItem('ap.prof.' + id);
  location.hash = '#home';
  location.reload();
}
const leaveKids = go => (kidsOn() && S.set.pin ? askPin(go) : go());
function profilesDialog() {
  const cur = profCur();
  openDlg(`<h2>${ic('user')} ${t('Who is watching?')}</h2><div class="profs">${PROFS.list.map(p => `<button class="prof ${p.id === cur.id ? 'on' : ''}" data-pf="${p.id}"><span class="pfav" style="background:${p.color}">${esc((p.name || '?').charAt(0).toUpperCase())}</span><b>${esc(p.name)}</b><small>${p.kids ? t('Kids') : p.id === cur.id ? t('In use') : '&nbsp;'}</small></button>`).join('')}</div>
    <div class="row">${PROFS.list.length < PROF_MAX ? `<button class="btn" id="pfAdd">${ic('plus')} ${t('Add profile')}</button>` : ''}<button class="btn" id="pfEd">${ic('gear')} ${t('Edit profile')}</button><button class="btn p" id="dx">${t('Close')}</button></div>`);
  $$('[data-pf]', dlg).forEach(
    b =>
      (b.onclick = () => {
        const id = b.dataset.pf;
        if (id === PROFS.cur) {
          dlg.close();
          return;
        }
        leaveKids(() => switchProfile(id));
      })
  );
  const pa = $('#pfAdd');
  if (pa) pa.onclick = () => leaveKids(() => profEdit(null));
  $('#pfEd').onclick = () => leaveKids(() => profEdit(cur.id));
  $('#dx').onclick = () => dlg.close();
  setTimeout(() => {
    const f = $('.prof.on', dlg);
    if (f) f.focus();
  }, 40);
}
function profEdit(id) {
  const p = id
      ? PROFS.list.find(x => x.id === id)
      : { name: '', kids: false, color: PROF_COLORS[PROFS.list.length % PROF_COLORS.length] },
    main = id && id === PROFS.list[0].id;
  openDlg(`<h2>${ic('user')} ${id ? t('Edit profile') : t('Add profile')}</h2><label>${t('Name')}</label><input id="pfN" maxlength="20" value="${esc(p.name)}" autocomplete="off">
    <label>${t('Colour')}</label><div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap">${PROF_COLORS.map(c => `<button class="pfc ${c === p.color ? 'on' : ''}" data-pc="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
    ${main ? '' : `<label>${t('Kids profile')}</label><select id="pfK"><option value="0" ${p.kids ? '' : 'selected'}>${t('No')}</option><option value="1" ${p.kids ? 'selected' : ''}>${t('Yes: only cartoons and family content')}</option></select>`}
    <div class="row">${id && !main ? `<button class="btn" id="pfDel">${ic('close')} ${t('Delete profile')}</button>` : ''}<button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="pfOk">${t('Save')}</button></div>`);
  let color = p.color;
  $$('[data-pc]', dlg).forEach(
    b =>
      (b.onclick = () => {
        color = b.dataset.pc;
        $$('[data-pc]', dlg).forEach(x => x.classList.toggle('on', x === b));
      })
  );
  $('#dx').onclick = profilesDialog;
  $('#pfOk').onclick = () => {
    const name = $('#pfN').value.trim();
    if (!name) {
      toast(t('Fill in the fields'));
      return;
    }
    const kids = $('#pfK') ? $('#pfK').value === '1' : false;
    if (id) {
      const wasKids = !!p.kids;
      Object.assign(p, { name, color, kids });
      profSave();
      if (id === PROFS.cur && wasKids !== kids) {
        refreshVis();
        render();
      }
    } else PROFS.list.push({ id: 'p' + Date.now().toString(36), name, color, kids }), profSave();
    toast(t('Saved'));
    render();
    profilesDialog();
  };
  const del = $('#pfDel');
  if (del)
    del.onclick = () => {
      if (!confirm(t('Delete this profile and its lists and progress?'))) return;
      const wasCur = id === PROFS.cur;
      PROFS.list = PROFS.list.filter(x => x.id !== id);
      localStorage.removeItem('ap.prof.' + id);
      if (wasCur) {
        const m = PROFS.list[0].id;
        let o = {};
        try {
          o = JSON.parse(localStorage.getItem('ap.prof.' + m) || '{}');
        } catch (e) {}
        PROF_KEYS.forEach(k => {
          if (o[k] != null) localStorage.setItem(k, o[k]);
          else localStorage.removeItem(k);
        });
        PROFS.cur = m;
        profSave();
        localStorage.removeItem('ap.prof.' + m);
        location.hash = '#home';
        location.reload();
        return;
      }
      profSave();
      profilesDialog();
    };
  setTimeout(() => $('#pfN').focus(), 50);
}
Object.assign(PT, {
  'Who is watching?': 'Quem está a ver?',
  'Add profile': 'Adicionar perfil',
  'Edit profile': 'Editar perfil',
  'Delete profile': 'Apagar perfil',
  'Kids profile': 'Perfil infantil',
  Kids: 'Infantil',
  Colour: 'Cor',
  'Yes: only cartoons and family content': 'Sim: só desenhos animados e conteúdo para a família',
  'Delete this profile and its lists and progress?': 'Apagar este perfil, com as listas e o progresso dele?',
  'In use': 'Em uso'
});
