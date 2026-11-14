// AWplayer para Windows (Electron).
// Serve a app web a partir de http://localhost (para o início de sessão Google funcionar)
// e desliga as restrições de CORS e de conteúdo misto, como a app Android faz com o HTTP nativo.
const { app, BrowserWindow, shell, session, Menu } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'app');
const PORT = 47219; // porta fixa: os dados guardados (listas, favoritos) ficam ligados à origem
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };

function startServer(port) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(ROOT, p));
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
      });
    });
    srv.once('error', reject);
    srv.listen(port, '127.0.0.1', () => resolve(srv.address().port));
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
let win = null;
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

const authPopup = u => /^https:\/\/(accounts\.google\.com|[a-z0-9-]+\.firebaseapp\.com|apis\.google\.com)\//i.test(u);

app.whenReady().then(async () => {
  // a Google recusa iniciar sessão em "navegadores embutidos": apresenta-te como o Chrome normal
  const ua = session.defaultSession.getUserAgent().replace(/\s(Electron|antunesplayer[^\s]*)\/\S+/gi, '');
  session.defaultSession.setUserAgent(ua);
  app.userAgentFallback = ua;

  let port;
  try { port = await startServer(PORT); } catch (e) { port = await startServer(0); }
  Menu.setApplicationMenu(null);

  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 360, minHeight: 480,
    backgroundColor: '#0b0b10', title: 'AWplayer', show: false,
    icon: path.join(ROOT, 'icon-512.png'),
    webPreferences: { webSecurity: false, allowRunningInsecureContent: true, contextIsolation: true, sandbox: true, autoplayPolicy: 'no-user-gesture-required' }
  });
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (authPopup(url)) return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 680, autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } } };
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'F5') { win.webContents.reload(); e.preventDefault(); }
    if (input.key === 'F12' && input.control && input.shift) win.webContents.toggleDevTools();
  });
  win.loadURL(`http://localhost:${port}/?desktop=1`); // ?desktop=1: o início de sessão Google abre no navegador do PC
});

app.on('window-all-closed', () => app.quit());
