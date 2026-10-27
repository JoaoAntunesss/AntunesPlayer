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

## v3 — player, catch-up, parental control, Google TV

- **Full-screen player like iMPlayer**: top bar (info, favourite, audio/subtitles, picture size, more), big centre controls, resolution badge, now/next bar.
- **Channel list without leaving the video**: press ◀ on the remote for a see-through panel on the left (◀ ▶ change group, ▲ ▼ move, OK plays); on phones swipe up or tap *More channels* for a strip of group chips and channel cards.
- **Gestures**: swipe up/down on the left for brightness, on the right for volume; double-tap the sides to skip ±10 s in films.
- **Movies & series home**: Top 10 carousel, rows for continue watching, favourites, recently added and each category, rating badges, sort A–Z / newest / rating.
- **Catch-up** (Xtream channels with archive): past programmes in the side guide and the TV guide play from the server's archive.
- **Parental control**: a PIN, hide categories, lock categories (adult categories are locked automatically when you set a PIN).
- **Series**: the next episode starts by itself.
- **Google TV / Android TV**: launcher banner, D-pad navigation everywhere, the back button closes panels before leaving.

## Layout (v2)

Built like the IPTV apps people already know (IPTV Smarters, TiviMate, iMPlayer):

- **Home**: big tiles for Live TV, Movies and Series, plus TV guide, favourites, search, playlists and the Xtream account (expiry date, connections). Continue watching and recent channels below.
- **Live TV**: categories · channel list · preview player with the programme guide. Tap a channel to preview, tap again for full screen.
- **Movies / Series**: categories and a poster grid. A detail page shows poster, year, genre, rating and plot; series have seasons and episodes.
- **Full screen player**: channel number and name, now/next bar, zapping with ↑/↓ or swipes, quick channel list, audio/subtitles, picture size, double-tap to skip ±10 s in films.
- Remote / D-pad navigation on Android TV, number keys jump to a channel. The Android app runs full screen and the back button works as expected.

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

## Android app (APK) and Android TV

The same code ships as an Android app, built automatically on GitHub (no PC tools needed).

1. Open the repo's **Releases** page and download `AntunesPlayer.apk` from the `latest` release (or run the *Build Android APK* workflow under **Actions**).
2. On the phone / TV box, open the file and allow "install from this source".
3. On Android TV it appears in the launcher; the remote's number keys switch channels.

In the app, streams load through the native HTTP layer, so servers that block browsers (CORS) and plain `http://` streams work. Status: built by CI, not yet tested on a real device.

## Web version

Enable **Settings → Pages → Deploy from branch → main / root** and open `https://<user>.github.io/AntunesPlayer/`.
