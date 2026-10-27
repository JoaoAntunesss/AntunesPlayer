const CACHE='antunesplayer-v34';
const FILES=['./','./index.html','./style.css','./js/app.js','./manifest.json','./fonts/bricolage-grotesque-latin-wght-normal.woff2','./fonts/figtree-latin-wght-normal.woff2','./fonts/dseg7-bold.woff2','./fonts/chakra-petch-latin-500-normal.woff2','./fonts/chakra-petch-latin-600-normal.woff2','./fonts/chakra-petch-latin-700-normal.woff2','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin)return;   // never touch streams, playlists or EPG
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
});
