"""Builds data/imdb.json: IMDb ratings of well-known films and series, so AntunesFlix can show the
IMDb score and the "Top IMDb" tabs. Uses IMDb's public datasets (personal, non-commercial use):
https://developer.imdb.com/non-commercial-datasets/
Run by .github/workflows/imdb.yml once a month. Output, one row per title:
  [names (original first, then other titles, incl. Portuguese/Brazilian), year, "m" film / "s" series, rating, votes]
"""
import csv, gzip, io, json, os, sys, urllib.request

BASE = "https://datasets.imdbws.com/"
MIN_VOTES = int(os.environ.get("MIN_VOTES", "15000"))
csv.field_size_limit(sys.maxsize)


def rows(name):
    req = urllib.request.Request(BASE + name, headers={"User-Agent": "AntunesPlayer-imdb/1.0"})
    with urllib.request.urlopen(req) as r, gzip.GzipFile(fileobj=r) as g:
        f = io.TextIOWrapper(g, encoding="utf-8")
        head = f.readline().rstrip("\n").split("\t")
        for line in f:
            yield dict(zip(head, line.rstrip("\n").split("\t")))


ratings = {}
for r in rows("title.ratings.tsv.gz"):
    v = int(r["numVotes"])
    if v >= MIN_VOTES:
        ratings[r["tconst"]] = (float(r["averageRating"]), v)
print("rated:", len(ratings))

KIND = {"movie": "m", "tvMovie": "m", "tvSeries": "s", "tvMiniSeries": "s"}
titles = {}
for r in rows("title.basics.tsv.gz"):
    t = r["tconst"]
    if t in ratings and r["titleType"] in KIND:
        names = [r["originalTitle"]] + ([r["primaryTitle"]] if r["primaryTitle"] != r["originalTitle"] else [])
        y = r["startYear"]
        titles[t] = [names, int(y) if y.isdigit() else 0, KIND[r["titleType"]], *ratings[t]]
print("titles:", len(titles))

# the names people see in Portugal / Brazil / English-speaking lists
for r in rows("title.akas.tsv.gz"):
    t = titles.get(r["titleId"])
    if t and r["region"] in ("PT", "BR", "US", "GB") and r["title"] not in t[0] and len(t[0]) < 6:
        t[0].append(r["title"])

out = sorted(titles.values(), key=lambda x: -x[4])
os.makedirs("data", exist_ok=True)
with open("data/imdb.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print("written:", len(out), "titles,", os.path.getsize("data/imdb.json") // 1024, "KB")
