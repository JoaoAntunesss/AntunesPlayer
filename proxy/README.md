# Helper for the web version (optional)

Browsers block pages on `https://` from opening `http://` IPTV servers, and many servers also refuse web pages (CORS).
The Android APK has no such limits. For the **web** version, deploy this tiny helper in your own free Cloudflare account:

1. Create a free account at <https://dash.cloudflare.com>.
2. **Workers & Pages → Create → Create Worker** → name it e.g. `antunes-helper` → **Deploy**.
3. **Edit code** → delete the sample → paste the contents of `worker.js` → **Deploy**.
4. Copy the address, e.g. `https://antunes-helper.<you>.workers.dev`.
5. In AntunesPlayer → Settings:
   - *Helper link*: `https://antunes-helper.<you>.workers.dev/?url={url}`
   - *Also use it for streams*: **Yes**

Your IPTV login passes only through your own worker. Only `https://joaoantunesss.github.io` may use it (edit `ALLOWED` at the top of the file if your site address differs).
Note: streaming video through a free worker counts toward Cloudflare's request limits and is best for personal use.
