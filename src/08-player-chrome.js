/* ---------- player chrome: gestures, channel panel (TV), channel strip (touch) ---------- */
let lastTap = 0,
  tapX = 0,
  tch = null,
  lastInput = 'touch',
  bri = 1;
const isTouch = () => lastInput === 'touch';
document.addEventListener(
  'keydown',
  () => {
    lastInput = 'key';
  },
  true
);
document.addEventListener(
  'pointerdown',
  e => {
    lastInput = e.pointerType === 'mouse' ? 'mouse' : 'touch';
  },
  true
);
/* Remote: moving onto a text field (search, category filters) must not pop up the TV keyboard.
   Reached with the arrows, a field is read-only (no keyboard) and the arrows carry on past it; OK opens the keyboard to type. */
const isTxt = el =>
  !!el && el.tagName === 'INPUT' && !/^(range|checkbox|radio|color|file|button|submit)$/i.test(el.type || 'text');
let tvTyping = null,
  tvRefocus = false;
document.addEventListener(
  'focusin',
  e => {
    const el = e.target;
    if (!isTxt(el) || el === tvTyping || lastInput !== 'key' || el.readOnly || el.inputMode === 'numeric') return;
    el.readOnly = true;
    el.dataset.tvro = '1';
  },
  true
);
document.addEventListener(
  'focusout',
  e => {
    const el = e.target;
    if (el === tvTyping && !tvRefocus) tvTyping = null;
    if (el.dataset && el.dataset.tvro) {
      el.readOnly = false;
      delete el.dataset.tvro;
    }
  },
  true
);
document.addEventListener(
  'pointerdown',
  e => {
    const el = e.target;
    if (isTxt(el) && el.dataset.tvro) {
      el.readOnly = false;
      delete el.dataset.tvro;
      tvTyping = el;
    }
  },
  true
);
document.addEventListener(
  'keydown',
  e => {
    const el = e.target,
      k = e.key;
    if (el && el.tagName === 'SELECT' && lastInput === 'key') {
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        spatial(k, dlg.open ? dlg : undefined);
      } else if (k === 'Enter') {
        try {
          if (el.showPicker) {
            e.preventDefault();
            el.showPicker();
          }
        } catch (x) {}
      }
      return;
    }
    if (!isTxt(el)) return;
    if (el.dataset.tvro) {
      if (k === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        el.readOnly = false;
        delete el.dataset.tvro;
        tvTyping = el;
        tvRefocus = true;
        el.blur();
        el.focus();
        tvRefocus = false;
      } else if (k.startsWith('Arrow')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        spatial(k, dlg.open ? dlg : undefined);
      }
      return;
    }
    // typing with the remote: ▲ ▼ leave the field (◀ ▶ still move the cursor)
    if (lastInput === 'key' && (k === 'ArrowUp' || k === 'ArrowDown')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      spatial(k, dlg.open ? dlg : undefined);
    }
  },
  true
);
const panelOpen = () => !$('#chPanel').hidden || !$('#chStrip').hidden;
v.addEventListener('click', e => {
  if (!fsOn) {
    if (S.cur) enterFs();
    return;
  }
  if (panelOpen()) {
    closeQuick();
    return;
  }
  const now = Date.now(),
    r = v.getBoundingClientRect(),
    x = (e.clientX - r.left) / r.width;
  if (isVodNow() && now - lastTap < 320 && Math.abs(x - tapX) < 0.2 && (x < 0.35 || x > 0.65)) {
    seekBy(x < 0.35 ? -10 : 10);
    toast(x < 0.35 ? '−10 s' : '+10 s');
    lastTap = 0;
    showOv();
    return;
  }
  lastTap = now;
  tapX = x;
  screenEl.classList.contains('show') ? hideOv() : showOv();
});
$('#ov').addEventListener('click', e => {
  if (e.target === $('#ov') || e.target.id === 'ovMid') {
    hideOv();
  }
});
function hideOv() {
  screenEl.classList.remove('show');
  clearTimeout(ovT);
  if (screenEl.contains(document.activeElement) && !panelOpen()) document.activeElement.blur();
}
const pill = (el, icon, val) => {
  el.querySelector('i').innerHTML = ic(icon);
  el.querySelector('b').textContent = Math.round(val * 100) + '%';
  el.style.setProperty('--lv', Math.round(val * 100) + '%');
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), 900);
};
screenEl.addEventListener(
  'touchstart',
  e => {
    if (!fsOn || panelOpen() || e.target.closest('#ovTop,#ovBot,#ovMid button,dialog')) {
      tch = null;
      return;
    }
    const t0 = e.touches[0],
      r = screenEl.getBoundingClientRect();
    tch = {
      x: t0.clientX,
      y: t0.clientY,
      side: (t0.clientX - r.left) / r.width,
      h: r.height,
      bri,
      vol: v.muted ? 0 : v.volume,
      mode: ''
    };
  },
  { passive: true }
);
screenEl.addEventListener(
  'touchmove',
  e => {
    if (!tch) return;
    const t0 = e.touches[0],
      dx = t0.clientX - tch.x,
      dy = t0.clientY - tch.y;
    if (!tch.mode) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx))
        tch.mode = tch.side < 0.38 ? 'bri' : tch.side > 0.62 ? 'vol' : 'mid';
      else return;
    }
    const d = -dy / (tch.h * 0.7);
    if (tch.mode === 'bri') {
      bri = Math.max(0.15, Math.min(1, tch.bri + d));
      $('#dim').style.opacity = String(1 - bri);
      pill($('#gBri'), 'sun', bri);
    } else if (tch.mode === 'vol') {
      const vv = Math.max(0, Math.min(1, tch.vol + d));
      v.volume = vv;
      v.muted = vv === 0;
      $('#cMute').innerHTML = ic(v.muted ? 'mute' : 'vol');
      pill($('#gVol'), v.muted ? 'mute' : 'vol', vv);
    }
  },
  { passive: true }
);
screenEl.addEventListener('touchend', e => {
  if (!tch) return;
  const dy = e.changedTouches[0].clientY - tch.y,
    m = tch.mode;
  tch = null;
  if (m === 'mid' && dy < -60 && !isVodNow()) openStrip();
});
screenEl.addEventListener('pointermove', e => {
  if (fsOn && e.pointerType === 'mouse') showOv();
});

/* resolution badge */
const resLabel = () => {
  const w = v.videoWidth,
    h = v.videoHeight;
  if (!w) return '';
  const q = h >= 2000 ? '4K' : h >= 1000 ? 'FHD' : h >= 700 ? 'HD' : 'SD';
  return `${w}×${h} · ${q}`;
};
['loadedmetadata', 'resize'].forEach(ev =>
  v.addEventListener(ev, () => {
    const l = resLabel();
    $('#resB').textContent = l;
    $('#resB').hidden = !l;
  })
);

/* left channel panel — TV remote ◀ */
let cpGroup = null,
  cpT = 0;
const liveGroups = () => catItems('live').filter(x => x.n > 0 || x.id === 'all');
function cpBump() {
  clearTimeout(cpT);
  cpT = setTimeout(() => {
    if (!$('#chPanel').hidden && !$('#chPanel').contains(document.activeElement)) closeQuick();
  }, 12000);
}
function openPanel(focusCur = true) {
  $('#chStrip').hidden = true;
  hideOv();
  const gs = liveGroups();
  if (!gs.find(g => g.id === cpGroup)) cpGroup = S.gsel.live;
  if (!gs.find(g => g.id === cpGroup)) cpGroup = 'all';
  const g = gs.find(x => x.id === cpGroup) || gs[0],
    l = groupList(cpGroup);
  $('#cpGroup').innerHTML = `${esc(g ? g.label : '')}<small>${fmtN(l.length)}</small>`;
  $('#cpList').innerHTML =
    l
      .slice(0, 400)
      .map(c => {
        const nn = nowNext(c),
          pr = nn && nn.now ? Math.round(((Date.now() - nn.now.s) / (nn.now.e - nn.now.s)) * 100) : 0;
        return `<button class="cpi ${S.cur && S.cur.key === c.key ? 'on' : ''}" data-k="${c.key}"><span class="n">${seg(shownNum(c))}</span><span class="lgw">${logoHtml(c)}</span><span class="t"><b>${esc(c.name)}</b><small>${nn && nn.now ? esc(nn.now.t) : ''}</small>${nn && nn.now ? `<i class="pb"><i style="width:${pr}%"></i></i>` : ''}</span></button>`;
      })
      .join('') || `<p class="mut" style="padding:20px">${t('Nothing found')}</p>`;
  $('#chPanel').hidden = false;
  $$('#cpList .cpi').forEach(b => {
    b.onclick = () => {
      const c = S.byKey[b.dataset.k];
      S.gsel.live = cpGroup;
      LS.set('ap.gsel', S.gsel);
      play(c);
      $$('#cpList .cpi').forEach(x => x.classList.toggle('on', x === b));
      cpBump();
    };
    b.onfocus = cpBump;
  });
  if (focusCur) {
    const on = $('#cpList .cpi.on') || $('#cpList .cpi');
    if (on) {
      on.focus({ preventScroll: true });
      on.scrollIntoView({ block: 'center' });
    }
  }
  cpBump();
}
function cpShift(d) {
  const gs = liveGroups();
  let i = gs.findIndex(x => x.id === cpGroup);
  i = (i + d + gs.length) % gs.length;
  cpGroup = gs[i].id;
  openPanel();
}
function groupList(id) {
  const m = S.mode,
    g = S.group;
  S.mode = 'live';
  S.group = id;
  const l = baseList().filter(c => c.kind === 'live');
  S.mode = m;
  S.group = g;
  return l;
}

/* bottom channel strip — touch "More channels" */
let csGroup = null;
function openStrip() {
  $('#chPanel').hidden = true;
  hideOv();
  const gs = liveGroups();
  if (!gs.find(g => g.id === csGroup)) csGroup = gs.find(g => g.id === S.gsel.live) ? S.gsel.live : 'all';
  const g = gs.find(x => x.id === csGroup),
    l = groupList(csGroup);
  $('#csTitle').innerHTML = `${t('Group')}: ${esc(g ? g.label : '')} <small>${fmtN(l.length)}</small>`;
  $('#csChips').innerHTML = gs
    .map(x => `<button data-g="${esc(x.id)}" class="${x.id === csGroup ? 'on' : ''}">${esc(x.label)}</button>`)
    .join('');
  $('#csCards').innerHTML = l
    .slice(0, 200)
    .map(c => {
      const nn = nowNext(c),
        pr = nn && nn.now ? Math.round(((Date.now() - nn.now.s) / (nn.now.e - nn.now.s)) * 100) : 0;
      return `<button class="csc ${S.cur && S.cur.key === c.key ? 'on' : ''}" data-k="${c.key}"><span class="cl">${logoHtml(c)}</span><b><em>${seg(shownNum(c))}</em>${esc(c.name)}</b><small>${nn && nn.now ? esc(nn.now.t) : esc(c.group || '')}</small><i class="pb"><i style="width:${pr}%"></i></i></button>`;
    })
    .join('');
  $('#chStrip').hidden = false;
  $$('#csChips button').forEach(
    b =>
      (b.onclick = () => {
        csGroup = b.dataset.g;
        openStrip();
      })
  );
  $$('#csCards .csc').forEach(
    b =>
      (b.onclick = () => {
        S.gsel.live = csGroup;
        LS.set('ap.gsel', S.gsel);
        play(S.byKey[b.dataset.k]);
        closeQuick();
      })
  );
  const on = $('#csCards .csc.on');
  if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  const oc = $('#csChips .on');
  if (oc) oc.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function openQuick() {
  if (isVodNow()) return;
  isTouch() ? openStrip() : openPanel();
}
function closeQuick() {
  const had = panelOpen();
  $('#chPanel').hidden = true;
  $('#chStrip').hidden = true;
  clearTimeout(cpT);
  if (had && screenEl.contains(document.activeElement)) document.activeElement.blur();
  return had;
}
$('#cpPrev').onclick = () => cpShift(-1);
$('#cpNext').onclick = () => cpShift(1);
$('#csClose').onclick = () => closeQuick();

/* info + more */
$('#cInfo').onclick = () => {
  const c = S.cur;
  if (!c) return;
  const l = epgFor(c) || [],
    n = Date.now(),
    nn = nowNext(c),
    cur = nn && nn.now;
  openDlg(
    `<h2>${c.kind === 'live' ? seg(shownNum(c)) + ' ' : ''}${esc(c.name)}</h2>${cur ? `<p class="mut">${hm(cur.s)} – ${hm(cur.e)}</p><h3 style="margin:4px 0 8px">${esc(cur.t)}</h3>${cur.d ? `<p class="plot">${esc(cur.d)}</p>` : ''}` : `<p class="mut">${esc(c.group || '')}</p>`}${l
      .filter(p => p.s > n)
      .slice(0, 5)
      .map(p => `<div class="epgl"><time>${hm(p.s)}</time><span>${esc(p.t)}</span></div>`)
      .join('')}<div class="row"><button class="btn p" id="dx">OK</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
};
$('#cMore').onclick = () => {
  const sp = [0.5, 0.75, 1, 1.25, 1.5, 2];
  openDlg(`<h2>${t('More')}</h2>${isVodNow() ? `<label>${t('Speed')}</label><div class="tabs">${sp.map(x => `<button data-sp="${x}" class="${v.playbackRate === x ? 'on' : ''}">${x}×</button>`).join('')}</div>` : ''}
  <label>${t('Picture size')}</label><div class="tabs">${ASP.map((x, i) => `<button data-as="${i}" class="${aspI === i ? 'on' : ''}">${t(x[1])}</button>`).join('')}</div>
  <label>${t('Colours')} <small class="mut">${t('Colours wrong? Try the options below (saved for this channel).')}</small></label><div class="tabs">${['Normal', 'Swap red / blue', 'Compatible'].map((x, i) => `<button data-cf="${i}" class="${((S.cur && COLFIX[S.cur.key]) || 0) === i ? 'on' : ''}">${t(x)}</button>`).join('')}</div>
  <div class="row" style="justify-content:flex-start">${document.pictureInPictureEnabled ? `<button class="btn" id="mPip">${ic('pip')} ${t('Picture in picture')}</button>` : ''}${!isVodNow() ? `<button class="btn" id="mRec">${ic('rec')} ${rec ? t('Stop recording') : t('Record')}</button><button class="btn" id="mMv">${ic('stack')} ${t('Multi-screen')}</button>` : ''}${recNative() ? `<button class="btn" id="mRecs">${ic('clock')} ${t('Scheduled recordings')}</button>` : ''}</div>${!isVodNow() ? `<div class="row" style="justify-content:flex-start"><button class="btn" id="mList">${ic('stack')} ${t('Add to list')}</button></div>` : ''}<label>${t('Sleep timer')}${sleepAt ? ' · ' + sleepLeft() + ' ' + t('min') : ''}</label><div class="tabs">${[0, 15, 30, 60, 90, 120].map(m => `<button data-sl="${m}" class="${!sleepAt && !m ? 'on' : ''}">${m ? m + ' ' + t('min') : t('Off ').trim()}</button>`).join('')}</div>
  ${castable() || (dlNative() && isVodNow() && !(S.cur && S.cur.local)) ? `<div class="row" style="justify-content:flex-start">${castable() ? `<button class="btn" id="mCast">${ic('cast')} ${t('Send to TV (Chromecast)')}</button>` : ''}${dlNative() && isVodNow() && !(S.cur && S.cur.local) ? `<button class="btn" id="mDl">${ic('dl')} ${t('Download')}</button>` : ''}</div>` : ''}
  <div class="row" style="justify-content:flex-start"><button class="btn" id="mInfo">${ic('signal')} ${t('Stream info')}</button><button class="btn" id="mExt">${ic('ext')} ${NATIVE ? t('Open in another player') : t('Copy link')}</button></div>
  <div class="row" style="justify-content:space-between"><button class="btn" id="mSet">${ic('gear')} ${t('Settings')}</button><button class="btn p" id="dx">OK</button></div>`);
  $('#dx').onclick = () => dlg.close();
  $('#mSet').onclick = settingsDialog;
  $('#mInfo').onclick = streamInfo;
  $('#mExt').onclick = () => {
    dlg.close();
    openElsewhere();
  };
  $$('[data-sl]', dlg).forEach(
    b =>
      (b.onclick = () => {
        setSleep(+b.dataset.sl);
        dlg.close();
      })
  );
  const ml = $('#mList');
  if (ml) ml.onclick = () => addToListDialog(S.cur);
  $$('[data-sp]', dlg).forEach(
    b =>
      (b.onclick = () => {
        v.playbackRate = +b.dataset.sp;
        $$('[data-sp]', dlg).forEach(x => x.classList.toggle('on', x === b));
      })
  );
  $$('[data-cf]', dlg).forEach(
    b =>
      (b.onclick = () => {
        if (!S.cur) return;
        const m = +b.dataset.cf;
        if (m) COLFIX[S.cur.key] = m;
        else delete COLFIX[S.cur.key];
        LS.set('ap.colfix', COLFIX);
        applyColor(S.cur);
        $$('[data-cf]', dlg).forEach(x => x.classList.toggle('on', x === b));
      })
  );
  $$('[data-as]', dlg).forEach(
    b =>
      (b.onclick = () => {
        aspI = +b.dataset.as;
        v.style.objectFit = ASP[aspI][0];
        $$('[data-as]', dlg).forEach(x => x.classList.toggle('on', x === b));
      })
  );
  const p = $('#mPip');
  if (p)
    p.onclick = () => {
      dlg.close();
      try {
        v.requestPictureInPicture();
      } catch (e) {}
    };
  const r = $('#mRec');
  if (r)
    r.onclick = () => {
      dlg.close();
      toggleRec();
    };
  const mm = $('#mMv');
  if (mm)
    mm.onclick = () => {
      const c = S.cur;
      dlg.close();
      openMulti([c]);
    };
  const mr = $('#mRecs');
  if (mr) mr.onclick = recsDialog;
  const mc = $('#mCast');
  if (mc)
    mc.onclick = () => {
      dlg.close();
      castCur();
    };
  const md = $('#mDl');
  if (md)
    md.onclick = () => {
      dlg.close();
      dlStart(S.cur);
    };
};
