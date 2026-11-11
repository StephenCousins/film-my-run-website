"""Download Commons thumbnails (800 px) for the first 4 photos of each race in races.json that has none on disk yet.
Appends to thumbs.json. Usage: python3 -I download_thumbs.py"""
import json, time, urllib.request, urllib.parse
from pathlib import Path

HERE = Path(__file__).parent
UA = {"User-Agent": "race-quiz-research/0.1 (personal research script)"}
races = json.load(open(Path.home() / 'Developer/film-my-run-website/docs/race-game/races.json'))
man = json.load(open(HERE / 'thumbs.json'))
done = {m['file'] for m in man}

pick = {}
for r in races:
    for n, p in enumerate(r['photos'][:4]):
        fn = f"thumbs/{r['id']}-{n}.jpg"
        if fn not in done and not (HERE / fn).exists():
            pick['File:' + p['file']] = (r['id'], fn, p)


def get(url):
    for a in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
        except Exception as e:
            print('retry', e, flush=True)
            time.sleep(30 * (a + 1))
    return None


titles = list(pick)
urls = {}
for i in range(0, len(titles), 40):
    q = urllib.parse.urlencode({"action": "query", "format": "json", "titles": "|".join(titles[i:i + 40]),
                                "prop": "imageinfo", "iiprop": "url", "iiurlwidth": 800})
    d = json.loads(get("https://commons.wikimedia.org/w/api.php?" + q) or b'{}')
    norm = {n['to']: n['from'] for n in d.get('query', {}).get('normalized', [])}
    for pg in d.get('query', {}).get('pages', {}).values():
        if 'imageinfo' in pg:
            urls[norm.get(pg['title'], pg['title'])] = pg['imageinfo'][0]['thumburl']
    time.sleep(3)
print(len(titles), 'wanted', len(urls), 'urls', flush=True)

for t, u in urls.items():
    rid, fn, p = pick[t]
    b = get(u)
    if not b:
        continue
    (HERE / fn).write_bytes(b)
    man.append({"race": rid, "file": fn, "page": p['page'], "license": p['license'], "credit": p['credit']})
    json.dump(man, open(HERE / 'thumbs.json', 'w'), indent=1, ensure_ascii=False)
    time.sleep(1.5)
print(len(man), 'in manifest')
