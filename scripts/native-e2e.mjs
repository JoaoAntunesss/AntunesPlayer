// End-to-end test of the native video engine inside the real app, run on an Android emulator by
// .github/workflows/native-player-test.yml (through Chrome DevTools on the app's WebView, test builds only).
// Usage: node scripts/native-e2e.mjs <step>   steps: setup | play <name> | sub | seek | pause | tracks | stop
// Prints one JSON line with what it saw; exits 1 when a check fails.
const step = process.argv[2],
  arg = process.argv[3] || '';
const list = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = list.find(x => x.type === 'page' && /localhost/.test(x.url)) || list[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, no) => ((ws.onopen = ok), (ws.onerror = no)));
let id = 0;
const pend = new Map();
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) pend.get(m.id)(m);
};
async function ev(expr) {
  const n = ++id;
  ws.send(JSON.stringify({ id: n, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } }));
  const m = await new Promise(r => pend.set(n, r));
  if (m.result && m.result.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 400));
  return m.result && m.result.result ? m.result.result.value : undefined;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const M3U = `#EXTM3U
#EXTINF:-1 group-title="Filmes",Teste AC3 (2024)
http://10.0.2.2:8000/movie/test-ac3.mkv
#EXTINF:-1 group-title="Filmes",Teste DTS (2024)
http://10.0.2.2:8000/movie/test-dca.mkv
#EXTINF:-1 group-title="Filmes",Teste EAC3 (2024)
http://10.0.2.2:8000/movie/test-eac3.mkv
#EXTINF:-1 group-title="Desporto",Canal Teste Futebol
http://10.0.2.2:8000/live/canal.m3u8
`;
const state = `(() => { const n = __ap.NV(), v = __ap.v; return { on: n.on, t: +v.currentTime.toFixed(2), d: v.duration, paused: v.paused, st: n.st, w: n.w, h: n.h, nvClass: document.documentElement.classList.contains('nv'), fs: document.querySelector('#screen').classList.contains('fs'), msg: document.querySelector('#msg').hidden ? '' : document.querySelector('#msg').innerText.slice(0, 200) }; })()`;
let out = {},
  ok = true;
try {
  if (step === 'setup') {
    await ev(`localStorage.setItem('ap.devhook','true'); localStorage.setItem('ap.nvdebug','true'); localStorage.setItem('ap.tour','"done"');
      localStorage.setItem('ap.set', JSON.stringify({ osKey: 'test-no-online-search', subLangs: 'pt-pt,en' }));
      localStorage.setItem('ap.sources', JSON.stringify([{ id: 's1', name: 'Teste', type: 'm3u', text: ${JSON.stringify(M3U)} }]));
      localStorage.setItem('ap.src','"s1"'); location.reload(); 1`);
    out = { done: true };
  } else if (step === 'play') {
    out.items = await ev(`__ap.S.channels.filter(c => c.kind === 'vod').map(c => c.name)`);
    out.started = await ev(`(() => { const c = __ap.S.channels.find(c => c.name.includes(${JSON.stringify(arg)})); if (!c) return 'not found'; __ap.enterFsFor(c); return c.name; })()`);
    await sleep(12000);
    out.state = await ev(state);
    ok = out.state.on && out.state.nvClass && out.state.fs && out.state.t > 3 && !out.state.paused && out.state.d > 20 && !out.state.msg;
  } else if (step === 'sub') {
    // a real subtitle: short lines, one every 2 seconds
    out.r = await ev(`(async () => { let vtt = 'WEBVTT\\n\\n'; const p = n => String(n).padStart(2, '0');
      for (let i = 0; i < 30; i++) vtt += '00:00:' + p(i * 2) + '.000 --> 00:00:' + p(i * 2 + 1) + '.900\\nLegenda online de teste\\n\\n';
      await __ap.idbSet('sub:e2e', vtt); return __ap.subsLoad({ id: 'e2e', lang: 'pt-pt' }, __ap.S.cur); })()`);
    await sleep(5000);
    out.state = await ev(state);
    ok = out.r === true && out.state.on && !out.state.paused;
  } else if (step === 'seek') {
    const before = await ev(state);
    await ev(`__ap.v.currentTime = 18; 1`);
    await sleep(3000);
    out.state = await ev(state);
    out.before = before.t;
    ok = out.state.t >= 18 && out.state.t < 24 && !out.state.paused;
  } else if (step === 'pause') {
    await ev(`__ap.v.pause(); 1`);
    await sleep(2000);
    const a = await ev(state);
    await sleep(2000);
    const b = await ev(state);
    await ev(`__ap.v.play(); 1`);
    await sleep(2500);
    const c = await ev(state);
    out = { pausedAt: a.t, stillAt: b.t, paused: b.paused, resumedAt: c.t, playing: !c.paused };
    ok = a.paused && b.paused && Math.abs(b.t - a.t) < 0.3 && !c.paused && c.t > b.t;
  } else if (step === 'tracks') {
    out = await ev(`Capacitor.Plugins.ExtPlayer.nvTracks()`);
    ok = out.audio && out.audio.length >= 1 && out.text && out.text.length >= 1;
  } else if (step === 'live') {
    out.started = await ev(`(() => { const c = __ap.S.channels.find(c => c.name.includes('Futebol')); if (!c) return 'not found'; __ap.enterFsFor(c); return c.name + ' / ' + c.kind; })()`);
    await sleep(15000);
    const a = await ev(state);
    await sleep(4000);
    const b = await ev(state);
    out = { started: out.started, a, tNow: b.t, msg: b.msg };
    ok = a.on && a.fs && a.nvClass && !b.paused && b.t > a.t + 2 && !b.msg;
  } else if (step === 'check') {
    // still playing (after the server came back): the picture moves and there is no error
    const a = await ev(state);
    await sleep(4000);
    const b = await ev(state);
    out = { a, tNow: b.t };
    ok = b.on && !b.paused && b.t > a.t + 2 && !b.msg;
  } else if (step === 'preview') {
    // leaving full screen on a live channel: back to the small preview, on the web player
    await ev(`history.back(); 1`);
    await sleep(10000);
    out = await ev(`(() => { const v = __ap.v; return { on: __ap.NV().on, fs: document.querySelector('#screen').classList.contains('fs'), cur: !!__ap.S.cur, t: v.currentTime, paused: v.paused }; })()`);
    await sleep(3000);
    out.tNow = await ev(`__ap.v.currentTime`);
    ok = !out.on && !out.fs && out.cur && out.tNow > out.t;
  } else if (step === 'stop') {
    await ev(`history.back(); 1`);
    await sleep(3000);
    out.state = await ev(`({ on: __ap.NV().on, nvClass: document.documentElement.classList.contains('nv'), fs: document.querySelector('#screen').classList.contains('fs'), cur: !!__ap.S.cur })`);
    ok = !out.state.on && !out.state.nvClass && !out.state.fs;
  }
} catch (e) {
  out.error = String(e.message || e);
  ok = false;
}
console.log(step + (arg ? ' ' + arg : '') + ': ' + (ok ? 'OK ' : 'FAILED ') + JSON.stringify(out));
ws.close();
process.exit(ok ? 0 : 1);
