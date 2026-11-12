/* ---------- voice search: the microphone button in the search box (on a TV, the system's voice screen with the remote's mic) ---------- */
const voiceNative = () => NATIVE && Capacitor.Plugins.ExtPlayer && Capacitor.Plugins.ExtPlayer.listen;
const VoiceRec = window.SpeechRecognition || window.webkitSpeechRecognition;
async function voiceSearch() {
  const done = txt => {
    txt = (txt || '').trim();
    if (!txt) return;
    if (S.view !== 'search' && S.view !== 'browse') openSearch();
    $('#q').value = txt;
    S.q = txt;
    S.shown = 250;
    S.view === 'search' ? renderSearch() : renderList();
  };
  const lang = LANG === 'pt' ? 'pt-PT' : 'en-US',
    fail = () => toast(t('Voice search is not available on this device'));
  if (voiceNative()) {
    try {
      const r = await Capacitor.Plugins.ExtPlayer.listen({ lang, prompt: t('Say what you want to watch') });
      done(r && r.text);
    } catch (e) {
      fail();
    }
    return;
  }
  if (!VoiceRec) {
    fail();
    return;
  }
  try {
    const rec = new VoiceRec();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = e => done(e.results[0][0].transcript);
    rec.onerror = fail;
    rec.start();
    toast(t('Listening…'));
  } catch (e) {
    fail();
  }
}
if (voiceNative() || VoiceRec) {
  const mb = document.createElement('button');
  mb.type = 'button';
  mb.id = 'qMic';
  mb.setAttribute('aria-label', t('Voice search'));
  mb.innerHTML = ic('mic');
  $('#qWrap').appendChild(mb);
  mb.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    voiceSearch();
  };
}
Object.assign(PT, {
  'Voice search': 'Pesquisa por voz',
  'Say what you want to watch': 'Diz o que queres ver',
  'Listening…': 'A ouvir…',
  'Voice search is not available on this device': 'A pesquisa por voz não está disponível neste aparelho'
});
let qT;
$('#q').oninput = e => {
  S.q = e.target.value;
  S.shown = 250;
  clearTimeout(qT);
  qT = setTimeout(() => (S.view === 'search' ? renderSearch() : renderList()), 150);
};
$('#cFav').onclick = () => toggleFav(S.cur);
$('#cPrev').onclick = () => zap(-1);
$('#cNext').onclick = () => zap(1);
$('#cRec').onclick = toggleRec;
$('#cMute').onclick = () => {
  v.muted = !v.muted;
  $('#cMute').innerHTML = ic(v.muted ? 'mute' : 'vol');
};
$('#pExpand').onclick = e => {
  e.stopPropagation();
  enterFs();
};
$('#cExit').onclick = e => {
  e.stopPropagation();
  if (document.activeElement) document.activeElement.blur();
  back(true);
};
$('#ovBot').addEventListener('click', () => showOv());
$('#ovTop').addEventListener('click', () => showOv());
$('#cList b').textContent = t('More channels');
$('#cList small').textContent = S.set.tv ? t('Press ◀ on the remote') : t('Tap or swipe up');
$('#cList').onclick = () => (isTouch() ? openStrip() : openPanel());
document.body.appendChild($('#num'));
$('#slot').appendChild(screenEl);

/* ---------- remote / keyboard ---------- */
function scrollerOf(el) {
  for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) {
    if (x.scrollHeight > x.clientHeight + 2) {
      const o = getComputedStyle(x).overflowY;
      if (o === 'auto' || o === 'scroll') return x;
    }
  }
  return null;
}
// Settings: ▲ ▼ go through the open tab in order (tab → its fields, top to bottom → Close) instead of guessing by position
function settingsNav(k, cur) {
  const nav = $('.stabs', dlg),
    pane = $('.spane:not([hidden])', dlg);
  if (!nav || !pane || !cur) return false;
  const ok = el => !el.disabled && !el.closest('[hidden]') && el.getBoundingClientRect().height > 0,
    sel = 'button, [tabindex="0"], input, select, textarea';
  const items = $$(sel, pane).filter(ok),
    foot = $$(sel, dlg).filter(el => ok(el) && !nav.contains(el) && !pane.contains(el) && !el.closest('.sbody')),
    tab = $('[data-st].on', nav);
  const go = el => {
    if (!el) return false;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  };
  if (nav.contains(cur)) return k === 'ArrowDown' ? go(items[0] || foot[0]) : false;
  const i = items.indexOf(cur);
  if (i > -1) {
    const a = cur.getBoundingClientRect();
    if (k === 'ArrowDown')
      return go(items.slice(i + 1).find(el => el.getBoundingClientRect().top >= a.bottom - 4) || foot[0]);
    return go(
      items
        .slice(0, i)
        .reverse()
        .find(el => el.getBoundingClientRect().bottom <= a.top + 4) || tab
    );
  }
  if (foot.includes(cur) && k === 'ArrowUp') return go(items[items.length - 1] || tab);
  return false;
}
function spatial(k, scope) {
  if (
    scope === dlg &&
    dlg.classList.contains('settings') &&
    (k === 'ArrowUp' || k === 'ArrowDown') &&
    settingsNav(k, document.activeElement)
  )
    return true;
  const cur = document.activeElement,
    els = $$('button, [tabindex="0"], input, select', scope || document).filter(el => {
      if (el.disabled || el.closest('[hidden]')) return false;
      if (!scope && dlg.contains(el)) return false;
      if (scope !== dlg && (fsOn ? !screenEl.contains(el) : screenEl.contains(el) && el.id !== 'pExpand')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  if (!cur || cur === document.body || !els.includes(cur)) {
    const vis = el => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.top < innerHeight;
    };
    const f = (!scope && !fsOn && els.find(el => el.closest('.view') && vis(el))) || els.find(vis) || els[0];
    if (f) {
      f.focus();
      return true;
    }
    return false;
  }
  const a = cur.getBoundingClientRect();
  let best = null,
    bs = 1e9,
    bestIn = null,
    bsIn = 1e9;
  const box = scrollerOf(cur);
  for (const el of els) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    let main, cross;
    // cross = gap between the boxes sideways (0 when they line up, so a wide field under a small tab is the obvious next stop); centre distance only breaks ties
    const gapX = Math.max(0, b.left - a.right, a.left - b.right),
      gapY = Math.max(0, b.top - a.bottom, a.top - b.bottom),
      cx = Math.abs((b.left + b.right) / 2 - (a.left + a.right) / 2) * 0.05,
      cy = Math.abs((b.top + b.bottom) / 2 - (a.top + a.bottom) / 2) * 0.05;
    if (k === 'ArrowRight') {
      if (b.left < a.right - 4) continue;
      main = b.left - a.right;
      cross = gapY * 4 + cy;
    } else if (k === 'ArrowLeft') {
      if (b.right > a.left + 4) continue;
      main = a.left - b.right;
      cross = gapY * 4 + cy;
    } else if (k === 'ArrowDown') {
      if (b.top < a.bottom - 4) continue;
      main = b.top - a.bottom;
      cross = gapX * 4 + cx;
    } else {
      if (b.bottom > a.top + 4) continue;
      main = a.top - b.bottom;
      cross = gapX * 4 + cx;
    }
    const sc = main + cross;
    if (sc < bs) {
      bs = sc;
      best = el;
    }
    if (box && sc < bsIn && box.contains(el)) {
      bsIn = sc;
      bestIn = el;
    }
  }
  // things further down a scrolling area (settings, lists) come before the fixed buttons under it, e.g. Close
  if (bestIn) best = bestIn;
  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }
  return false;
}
document.addEventListener('keydown', e => {
  const k = e.key;
  if (e.defaultPrevented) return;
  if (dlg.open) {
    if (k.startsWith('Arrow') && !/input|textarea|select/i.test(e.target.tagName)) {
      if (spatial(k, dlg)) e.preventDefault();
    }
    return;
  }
  if (MV.on) {
    if (k.startsWith('Arrow')) {
      e.preventDefault();
      spatial(k, $('#multi'));
    } else if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || k === 'Backspace') {
      e.preventDefault();
      back();
    }
    return;
  }
  if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack') {
    e.preventDefault();
    if (numBuf) {
      numBuf = '';
      $('#num').hidden = true;
      return;
    }
    back();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    if (k === 'ArrowDown' && e.target.id === 'q') {
      e.preventDefault();
      e.target.blur();
      spatial(k);
    }
    return;
  }
  if (/^[0-9]$/.test(k)) {
    e.preventDefault();
    numKey(k);
    return;
  }
  if (k === 'Enter' && numBuf) {
    e.preventDefault();
    commitNum();
    return;
  }
  if (k === 'ChannelUp' || k === 'PageUp') {
    e.preventDefault();
    zap(1);
    return;
  }
  if (k === 'ChannelDown' || k === 'PageDown') {
    e.preventDefault();
    zap(-1);
    return;
  }
  const lk = k.toLowerCase();
  if (fsOn) {
    const inPanel = !$('#chPanel').hidden,
      inStrip = !$('#chStrip').hidden,
      inOv = screenEl.classList.contains('show') && $('#ov').contains(document.activeElement);
    if (k === 'Backspace') {
      e.preventDefault();
      back();
      return;
    }
    if (inPanel) {
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        e.preventDefault();
        cpShift(k === 'ArrowLeft' ? -1 : 1);
        return;
      }
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        e.preventDefault();
        spatial(k, $('#cpList'));
        cpBump();
        return;
      }
    } else if (inStrip) {
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        spatial(k, $('#chStrip'));
        return;
      }
    } else if (inOv) {
      showOv();
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        spatial(k, $('#ov'));
        return;
      }
      if (k === 'Enter') return;
    } else if (isVodNow()) {
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        e.preventDefault();
        seekBy(k === 'ArrowLeft' ? -10 : 10);
        showOv();
        return;
      }
      if (k === ' ' || k === 'MediaPlayPause') {
        e.preventDefault();
        togglePlay();
        showOv();
        return;
      }
      if (k === 'Enter' || k === 'ArrowUp' || k === 'ArrowDown') {
        e.preventDefault();
        showOv();
        $('#cPlay').focus();
        return;
      }
    } else {
      if (k === 'ArrowUp') {
        e.preventDefault();
        zap(1);
        return;
      }
      if (k === 'ArrowDown') {
        e.preventDefault();
        zap(-1);
        return;
      }
      if (k === 'ArrowLeft') {
        e.preventDefault();
        openPanel();
        return;
      }
      if (k === 'Enter' || k === 'ArrowRight') {
        e.preventDefault();
        showOv();
        $('#cPlay').focus();
        return;
      }
    }
  } else if (k.startsWith('Arrow')) {
    if (spatial(k)) e.preventDefault();
    return;
  } else if (k === 'Backspace') {
    e.preventDefault();
    back();
    return;
  }
  if (lk === 'f') toggleFav(S.cur);
  else if (lk === 'l') lastChannel();
  else if (lk === 'm') $('#cMute').click();
  else if (lk === 'r') toggleRec();
  else if (lk === 'z') {
    fsOn ? back() : enterFs();
  } else if (lk === 'i' && S.cur) showOsd(S.cur);
});
