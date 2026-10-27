# AntunesPlayer

A fast, no-install **IPTV player** for the browser, phone and TV. Bring your own playlist — AntunesPlayer comes with **no channels**.

- **Number zapping** — press `1`, `2`, `1 2` on the keyboard or remote and it jumps to that channel (or `CH+/CH−`, `↑/↓` in full screen).
- **Favourites** — star channels (`F`). Number keys can follow either the playlist's channel numbers or *your favourites in order* (so `1` is always your first favourite).
- **Last channel** (`L` / Backspace), **recent channels**, search, groups, logos.
- **TV guide** (XMLTV, plain or `.gz`) — now/next on every row and the next programmes under the player.
- **Playlists**: M3U/M3U8 link, pasted/uploaded file, or **Xtream** login (live + movies).
- **Movies** group (VOD) with download, plus a **record** button (browser capture; works only when the stream allows it).
- HLS (`hls.js`) and MPEG-TS (`mpegts.js`) playback, bundled — works offline once loaded.
- Installable **PWA**, 5 colour themes, big **TV mode** with remote-friendly focus, English and Português.
- Everything stays on your device (localStorage + IndexedDB). No accounts, no tracking.

## Use it
Open the page, press **Add playlist**, paste your link (or *Try demo channels* for free test streams).

## Good to know (honest limits)
Browsers are stricter than VLC or Kodi:
- The server must allow web pages to read it (**CORS**). If a playlist fails with a network error, use the *helper link* in Settings (a small CORS proxy you control: `https://your-helper.example/?url={url}`).
- If AntunesPlayer is served over `https`, streams must be `https` too (mixed content is blocked).
- Recording uses the browser's MediaRecorder and only works for streams the page is allowed to capture.
- AntunesPlayer only plays what you give it. Use playlists you are entitled to watch.

## Host it
Any static host works: GitHub Pages (branch `main`, root) or Firebase Hosting (`firebase deploy`).

## Run locally
    python3 -m http.server 8790    # then open http://localhost:8790

## Credits
[hls.js](https://github.com/video-dev/hls.js) (Apache-2.0), [mpegts.js](https://github.com/xqq/mpegts.js) (Apache-2.0), Bricolage Grotesque and Figtree (SIL OFL).
