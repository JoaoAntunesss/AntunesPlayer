// Copies the web app into ./www for Capacitor (no service worker inside the app).
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
rmSync('www', { recursive: true, force: true }); mkdirSync('www', { recursive: true });
for (const f of ['index.html', 'style.css', 'manifest.json', 'icon-192.png', 'icon-512.png', 'js', 'fonts']) if (existsSync(f)) cpSync(f, 'www/' + f, { recursive: true });
console.log('www ready');
