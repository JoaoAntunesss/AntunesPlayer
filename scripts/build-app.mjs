// Builds js/app.js from the source files in src/ (one file per feature, read in name order).
// They are joined inside one function, so they share a single private scope exactly as before:
// no bundler, no imports, and the web, Android and Windows versions all keep loading js/app.js.
//   node scripts/build-app.mjs          write js/app.js
//   node scripts/build-app.mjs --check  fail if js/app.js is out of date (used by CI)
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const files = readdirSync('src').filter(f => /^\d\d-.+\.js$/.test(f)).sort();
const header = `/* AntunesPlayer — a small IPTV player. Bring your own playlist (M3U/M3U8 link or file, or Xtream login). No channels included.
   GENERATED FILE: edit the sources in src/ and run \`node scripts/build-app.mjs\`. */
(() => {
'use strict';
`;
const body = files.map(f => `// ===== src/${f} =====\n` + readFileSync('src/' + f, 'utf8').trimEnd() + '\n').join('\n');
const out = header + body + '})();\n';

if (process.argv.includes('--check')) {
  const cur = existsSync('js/app.js') ? readFileSync('js/app.js', 'utf8') : '';
  if (cur !== out) { console.error('js/app.js is out of date: run `node scripts/build-app.mjs` and commit it.'); process.exit(1); }
  console.log(`js/app.js is up to date (${files.length} source files)`);
} else {
  writeFileSync('js/app.js', out);
  console.log(`js/app.js built from ${files.length} source files (${out.length} bytes)`);
}
