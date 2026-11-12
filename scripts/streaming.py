"""Builds data/streaming.json: which films and series each streaming service has in Portugal, from TMDB
(the "where to watch" data, provided by JustWatch). AntunesFlix matches it to the playlist by title and year
to show rows like "On Netflix". Run monthly by .github/workflows/streaming.yml; needs the TMDB_KEY secret
(a free TMDB API key or read-access token). Output, one row per title:
  [names (Portuguese title, original title), year, "m" film / "s" series, [service ids]]"""
import json, os, re, sys, time, urllib.parse, urllib.request

KEY = os.environ.get('TMDB_KEY', '').strip()
if not KEY:
    sys.exit('TMDB_KEY is not set')
REGION = 'PT'
API = 'https://api.themoviedb.org/3'
SERVICES = [  # our id, how TMDB names it
    ('p-netflix', r'^netflix'), ('p-hbo', r'^(hbo ?max|max)$'), ('p-disney', r'^disney'),
    ('p-prime', r'^amazon prime video$'), ('p-sky', r'^skyshowtime'),
    ('p-filmin', r'^filmin'), ('p-paramount', r'^paramount'),
]


def get(path, **q):
    headers = {'accept': 'application/json'}
    if len(KEY) > 40:
        headers['Authorization'] = 'Bearer ' + KEY
    else:
        q['api_key'] = KEY
    url = API + path + '?' + urllib.parse.urlencode(q)
    for tries in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
                return json.load(r)
        except Exception as e:
            if tries == 4:
                raise
            time.sleep(2 + 3 * tries)


# TMDB ids of each service in Portugal (some have several, e.g. Netflix with ads)
ids = {}
for kind in ('movie', 'tv'):
    for p in get(f'/watch/providers/{kind}', watch_region=REGION)['results']:
        name = p['provider_name'].lower()
        for ours, pat in SERVICES:
            if re.search(pat, name):
                ids.setdefault(ours, set()).add(p['provider_id'])
# Apple's subscription service is "Apple TV" since 2025, the same name as its rental store: use its id (350)
for kind in ('movie', 'tv'):
    if any(p['provider_id'] == 350 for p in get(f'/watch/providers/{kind}', watch_region=REGION)['results']):
        ids['p-apple'] = {350}
print({k: sorted(v) for k, v in ids.items()})

titles = {}  # (kind, tmdb id) -> row
for ours, tids in ids.items():
    for kind, k in (('movie', 'm'), ('tv', 's')):
        page, pages = 1, 1
        while page <= min(pages, 500):
            d = get(f'/discover/{kind}', watch_region=REGION, with_watch_providers='|'.join(map(str, sorted(tids))),
                    with_watch_monetization_types='flatrate', language='pt-PT', sort_by='popularity.desc', page=page)
            pages = d.get('total_pages', 1)
            for x in d['results']:
                name = x.get('title') or x.get('name') or ''
                orig = x.get('original_title') or x.get('original_name') or ''
                date = x.get('release_date') or x.get('first_air_date') or ''
                row = titles.setdefault((k, x['id']), [[n for n in dict.fromkeys([name, orig]) if n], int(date[:4]) if date[:4].isdigit() else 0, k, []])
                if ours not in row[3]:
                    row[3].append(ours)
            page += 1
            time.sleep(0.05)
        print(ours, kind, 'pages', pages)

out = {'region': REGION, 'source': 'TMDB / JustWatch', 't': list(titles.values())}
os.makedirs('data', exist_ok=True)
with open('data/streaming.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print('written', len(out['t']), 'titles,', os.path.getsize('data/streaming.json') // 1024, 'KB')
