/* ---------- report a problem: goes straight to the AWplayer support list (AW panel) and to João on Telegram ----------
   Sends what the person wrote plus a short diagnosis of the app. Never the playlist links or logins. */
Object.assign(PT, {
  'Report a problem': 'Reportar um problema',
  'What happened? Tell us what you were doing and what went wrong.':
    'O que aconteceu? Diz o que estavas a fazer e o que correu mal.',
  'How can we reply? (optional)': 'Como te respondemos? (opcional)',
  'Email or phone': 'Email ou telemóvel',
  'Sent with it: app version, device, the screen you were on and the last error. Never your playlist links or logins.':
    'Vai junto: versão da app, aparelho, o ecrã onde estavas e o último erro. Nunca os links nem os logins das tuas listas.',
  Send: 'Enviar',
  'Sending…': 'A enviar…',
  'Thank you! We will look into it.': 'Obrigado! Vamos ver o que se passa.',
  'Could not send. Check the internet and try again.': 'Não deu para enviar. Confirma a internet e tenta outra vez.',
  'Write a little more about the problem.': 'Escreve um pouco mais sobre o problema.'
});
function bugDiag() {
  const c = S.cur,
    src = typeof curSrc === 'function' ? curSrc() : null;
  return {
    app:
      'AWplayer build ' +
      (BUILD || 'web') +
      (NATIVE ? ' · Android' : DESKTOP ? ' · Windows' : ' · web') +
      (S.set.tv ? ' · TV' : ''),
    aparelho: planoDevName(),
    navegador: navigator.userAgent.slice(0, 160),
    ecra: (S.view || '') + (fsOn ? ' · ecrã inteiro' : ''),
    lista: src ? (src.type === 'xtream' ? 'Xtream' : 'M3U') : 'nenhuma',
    a_ver: c ? `${c.kind || ''}: ${String(c.name || '').slice(0, 80)}${c.local ? ' (descarregado)' : ''}` : '',
    motor: typeof NV !== 'undefined' && NV.on ? 'nativo (ExoPlayer)' : 'web',
    erro: S.lastErr || '',
    rede: navigator.onLine ? 'online' : 'sem internet',
    subscricao: PLANO ? PLANO.estado || '' : ''
  };
}
function bugDialog() {
  const d = bugDiag();
  openDlg(
    `<h2>${ic('info')} ${t('Report a problem')}</h2>
    <label for="bgTx">${t('What happened? Tell us what you were doing and what went wrong.')}</label>
    <textarea id="bgTx" rows="5" maxlength="3000" style="width:100%"></textarea>
    <label for="bgCt">${t('How can we reply? (optional)')}</label>
    <input id="bgCt" maxlength="120" placeholder="${t('Email or phone')}" value="${esc((C.user && C.user.email) || '')}">
    <p class="mut"><small>${t('Sent with it: app version, device, the screen you were on and the last error. Never your playlist links or logins.')}</small></p>
    <p class="mut" id="bgSt" aria-live="polite">${d.erro ? '<small>' + esc(d.erro) + '</small>' : ''}</p>
    <div class="row"><button class="btn" id="dx">${t('Cancel')}</button><button class="btn p" id="bgGo">${t('Send')}</button></div>`
  );
  $('#dx').onclick = () => dlg.close();
  $('#bgTx').focus();
  $('#bgGo').onclick = async () => {
    const tx = $('#bgTx').value.trim(),
      st = $('#bgSt');
    if (tx.length < 5) {
      st.textContent = t('Write a little more about the problem.');
      return;
    }
    $('#bgGo').disabled = true;
    st.textContent = t('Sending…');
    try {
      const h = { 'Content-Type': 'application/json' };
      if (C.user) h.Authorization = 'Bearer ' + (await C.user.getIdToken());
      const r = await fetch(PLANO_API + 'playerSuporte', {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ texto: tx, contacto: $('#bgCt').value.trim(), dev: C.dev, diag: d })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || 'HTTP ' + r.status);
      dlg.close();
      toast(t('Thank you! We will look into it.'));
    } catch (e) {
      $('#bgGo').disabled = false;
      st.textContent =
        (e && e.message && !/fetch|network/i.test(e.message) ? e.message + ' · ' : '') +
        t('Could not send. Check the internet and try again.');
    }
  };
}
