// Copies the web app into ./www for Capacitor (no service worker inside the app) and minifies our own JS/CSS.
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
rmSync('www', { recursive: true, force: true }); mkdirSync('www', { recursive: true });
for (const f of ['index.html', 'style.css', 'manifest.json', 'icon-192.png', 'icon-512.png', 'js', 'fonts']) if (existsSync(f)) cpSync(f, 'www/' + f, { recursive: true });
try {
  const { transformSync } = await import('esbuild');
  for (const [f, loader] of [['www/js/app.js', 'js'], ['www/style.css', 'css']]) {
    const src = readFileSync(f, 'utf8'), out = transformSync(src, { loader, minify: true, target: loader === 'js' ? 'es2020' : undefined, legalComments: 'none' }).code;
    writeFileSync(f, out); console.log(f, src.length, '->', out.length);
  }
} catch (e) { console.warn('minify skipped:', e.message); }
console.log('www ready');
