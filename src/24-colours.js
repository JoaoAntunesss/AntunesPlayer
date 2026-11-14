/* ---------- colours chosen by the person: app accent, AWflix colour, digits, background ---------- */
Object.assign(PT, {
  Colours: 'Cores',
  'App colour (Live TV, menus, effects)': 'Cor da app (TV em direto, menus, efeitos)',
  'AWflix colour': 'Cor do AWflix',
  'Numbers (clock and channels)': 'Números (relógio e canais)',
  'Theme default': 'Do tema',
  'Same as the app colour': 'Iguais à cor da app',
  Background: 'Fundo',
  'Circuit lines': 'Linhas de circuito',
  Plain: 'Liso',
  Black: 'Preto',
  Custom: 'Personalizada',
  'Reset colours': 'Repor cores'
});
const SWATCH = [
  '#2fd8ff',
  '#3d9bff',
  '#45f5d2',
  '#3ddc84',
  '#ffd400',
  '#ffb020',
  '#ff6a3d',
  '#e50914',
  '#ff4fd8',
  '#a970ff',
  '#ffffff'
];
const TRACE_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' fill='none' stroke='%2333c6ff' stroke-opacity='.075' stroke-width='1.2'%3E%3Cpath d='M0 40h60l20 20h70l20-20h50M40 0v30l20 20M120 220v-50l20-20h40l20-20V90M0 150h40l25 25v45M220 170h-30l-15 15'/%3E%3Ccircle cx='80' cy='60' r='3'/%3E%3Ccircle cx='170' cy='40' r='3'/%3E%3Ccircle cx='140' cy='150' r='3'/%3E%3Ccircle cx='65' cy='175' r='3'/%3E%3C/svg%3E\")";
const hexRgb = h => {
  h = String(h || '').replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map(x => x + x)
      .join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const onColor = h => {
  const [r, g, b] = hexRgb(h).map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#05080c' : '#fff';
};
function applyColors() {
  const R = document.documentElement.style,
    st = S.set;
  ['--acc', '--ar', '--onacc', '--vfd', '--trace', '--fx', '--fxr', '--fxon'].forEach(k => R.removeProperty(k));
  document.documentElement.dataset.bg = st.bgStyle || 'circuit';
  if (st.accent) {
    const a = st.accent;
    R.setProperty('--acc', a);
    R.setProperty('--ar', hexRgb(a).join(','));
    R.setProperty('--onacc', onColor(a));
    R.setProperty('--trace', TRACE_SVG.replace('%2333c6ff', '%23' + a.replace('#', '')));
  }
  if (st.digits === 'accent')
    R.setProperty('--vfd', st.accent || getComputedStyle(document.documentElement).getPropertyValue('--acc').trim());
  if (st.fxColor) {
    R.setProperty('--fx', st.fxColor);
    R.setProperty('--fxr', hexRgb(st.fxColor).join(','));
    R.setProperty('--fxon', onColor(st.fxColor));
  }
}
function colorPicker(id, cur, def) {
  return `<div class="swatches" id="${id}">${SWATCH.map(c => `<button class="sw ${(cur || def) === c ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<label class="swc" title="${t('Custom')}" style="${cur && !SWATCH.includes(cur) ? `background:${cur}` : ''}">+<input type="color" value="${cur || def}"></label></div>`;
}
function wireColorPicker(id, set) {
  const box = $('#' + id, dlg);
  if (!box) return;
  $$('.sw', box).forEach(
    b =>
      (b.onclick = () => {
        $$('.sw', box).forEach(x => x.classList.toggle('on', x === b));
        set(b.dataset.c);
      })
  );
  const inp = $('input', box);
  inp.oninput = () => {
    inp.parentNode.style.background = inp.value;
    $$('.sw', box).forEach(x => x.classList.remove('on'));
    set(inp.value);
  };
}
