"""Build the Know the Course page: races.json + course GPX + graded photos -> game/index.html + game/photos/."""
import json, sys, math, os, re, subprocess
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(Path.home() / 'Developer/ultra-course-data'))
from ultracourse import geo

G = Path.home() / 'Developer/film-my-run-website/docs/race-game'
U = Path.home() / 'Developer/ultra-course-data'

# Per photo: q = quiz round, r = answer screen only (race name/logo in shot), x = drop. Ungraded photos are skipped.
grades = json.load(open(HERE / 'grades.json'))
man = {Path(m['file']).name: m for m in json.load(open(HERE / 'thumbs.json'))}

pub = HERE / 'game/photos'
pub.mkdir(parents=True, exist_ok=True)
photos = {}
for f, g in sorted(grades.items()):
    if g == 'x' or not (HERE / 'thumbs' / f).exists():
        continue
    m = man[f]
    if not (pub / f).exists():  # macOS sips: 720 px long edge, JPEG q55 (~85 KB each)
        subprocess.run(['sips', '-Z', '720', '-s', 'format', 'jpeg', '-s', 'formatOptions', '55',
                        str(HERE / 'thumbs' / f), '--out', str(pub / f)], check=True, capture_output=True)
    photos.setdefault(m['race'], []).append({"src": f"photos/{f}", "quiz": g == 'q', "page": m['page'],
                                            "license": m['license'], "credit": m['credit']})

races = json.load(open(G / 'races.json'))
out = []
for r in races:
    c = r.get('course')
    outline = prof = None
    if c and not c.get('partial'):
        p = (U / c['path']) if c.get('source') == 'ultra-course-data' else (G / c['path'])
        pts = geo.parse_gpx(p.read_bytes())
        cum = geo.cumulative_distances_m(pts)
        tot = cum[-1]
        step = max(1, len(pts) // 300)
        sel = pts[::step] + [pts[-1]]
        k = math.cos(math.radians(sum(q.lat for q in sel) / len(sel)))
        xs = [q.lon * k for q in sel]
        ys = [-q.lat for q in sel]
        mnx, mny = min(xs), min(ys)
        s = max(max(xs) - mnx, max(ys) - mny) or 1
        outline = [[round((x - mnx) / s, 4), round((y - mny) / s, 4)] for x, y in zip(xs, ys)]
        if r['type'] != 'road marathon' and any(q.ele for q in pts):
            prof, j = [], 0
            for i in range(161):
                d = tot * i / 160
                while j < len(cum) - 1 and cum[j + 1] < d:
                    j += 1
                prof.append(pts[j].ele)
            last = next(v for v in prof if v is not None)
            prof = [round(last := v if v is not None else last) for v in prof]
    ph = photos.get(r['id'], [])
    if not (outline or prof or any(p['quiz'] for p in ph)):
        continue
    out.append({"id": r['id'], "name": r['name'], "country": r['country'], "type": r['type'], "month": r['month'],
                "km": r['km'], "gain": r['gain_m'] if r['type'] != 'road marathon' else None, "route": r['route'],
                "hook": r['hook'], "outline": outline, "profile": prof, "photos": ph})

data = json.dumps({"courses": out, "all": [{"id": r['id'], "name": r['name']} for r in races]}, separators=(',', ':'))
(HERE / 'game-data.json').write_text(data)
page = (HERE / 'game-template.html').read_text().replace('__DATA__', data)
(HERE / 'game/index.html').write_text(page)
(HERE / 'check.js').write_text(re.findall(r'<script>(.*?)</script>', page, re.S)[0])
print(len(out), 'races;', sum(1 for o in out if o['outline']), 'outlines;', sum(1 for o in out if o['profile']), 'profiles;',
      sum(1 for o in out if any(p['quiz'] for p in o['photos'])), 'with quiz photos;',
      sum(len(v) for v in photos.values()), 'photos kept')
