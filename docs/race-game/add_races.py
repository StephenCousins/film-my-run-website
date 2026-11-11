"""Add a batch of races to races.json (11 Nov 2026: +~75 for Know the Course).

Ultras reuse ultra-course-data's GPX. Road and mountain races come from goandrace.com
course pages: the page is fetched for its GPX link and race date (month).
Month is only filled where it is known; route and hook are left empty for now.

    python3 add_races.py
"""

import json, re, sys, time, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(Path.home() / 'Developer/ultra-course-data'))
from ultracourse import geo  # noqa: E402

U = Path.home() / 'Developer/ultra-course-data/out'
UA = {"User-Agent": "Mozilla/5.0 (race-quiz research)"}

# id, name, country, type, month or None, ultra-course-data race/course
ULTRAS = [
    ("bear-100", "Bear 100", "USA", "trail ultra", "Sep", "bear-100-mile-endurance-run/main"),
    ("canyons", "Canyons 100", "USA", "trail ultra", "Apr", "utmb-canyons/100m"),
    ("ndw100", "North Downs Way 100", "UK", "trail ultra", "Aug", "centurion-north-downs-way-100/main"),
    ("tp100", "Thames Path 100", "UK", "trail ultra", "May", "centurion-thames-path-100/main"),
    ("winter-downs", "Winter Downs 100", "UK", "trail ultra", None, "centurion-winter-downs-100/main"),
    ("doi-inthanon", "Doi Inthanon by UTMB", "Thailand", "trail ultra", "Dec", "doi-inthanon-thailand-by-utmb/main"),
    ("ehunmilak", "Ehunmilak", "Spain", "trail ultra", "Jul", "ehunmilak-ultra-trail/main"),
    ("glen-coe-skyline", "Glen Coe Skyline", "UK", "skyrace", "Sep", "glen-coe-skyline/main"),
    ("gorge-waterfalls", "Gorge Waterfalls 100K", "USA", "trail ultra", None, "gorge-waterfalls/main"),
    ("grindstone", "Grindstone 100", "USA", "trail ultra", "Sep", "grindstone-100/main"),
    ("hardmoors-110", "Hardmoors 110", "UK", "trail ultra", None, "hardmoors-110/main"),
    ("high-lonesome", "High Lonesome 100", "USA", "trail ultra", "Jul", "high-lonesome-100/main"),
    ("mozart-100", "Mozart 100", "Austria", "trail ultra", "Jun", "mozart-100-by-utmb/main"),
    ("mt-fuji-100", "Mt. Fuji 100", "Japan", "trail ultra", None, "mt-fuji-100/main"),
    ("oman", "Oman by UTMB", "Oman", "trail ultra", None, "utmb-oman/hajar-ultra"),
    ("san-juan-solstice", "San Juan Solstice 50", "USA", "trail ultra", "Jun", "san-juan-solstice/main"),
    ("speedgoat", "Speedgoat 50K", "USA", "mountain race", "Jul", "speedgoat-mountain-races/main"),
    ("squamish-50", "Squamish 50", "Canada", "trail ultra", "Aug", "squamish-50/main"),
    ("swiss-canyon", "Swiss Canyon Trail", "Switzerland", "trail ultra", "Jun", "swiss-canyon-trail/main"),
    ("tarawera", "Tarawera 100 Mile", "New Zealand", "trail ultra", "Feb", "utmb-tarawera/tmiler"),
    ("uta", "Ultra-Trail Australia 100", "Australia", "trail ultra", "May", "ultra-trail-australia/main"),
    ("uts-100", "Ultra-Trail Snowdonia 100M", "UK", "trail ultra", "May", "ultra-trail-snowdonia-by-utmb/main"),
    ("alsace", "Trail Alsace", "France", "trail ultra", None, "utmb-alsace/ultra-trail-des-chevaliers"),
    ("andorra", "Andorra 105K", "Andorra", "trail ultra", "Jun", "utmb-andorra/ultra-105k"),
    ("bariloche", "Patagonia Bariloche 130K", "Argentina", "trail ultra", None, "utmb-bariloche/tronador-130k"),
    ("chianti", "Chianti Ultra Trail", "Italy", "trail ultra", "Mar", "utmb-chianti/ultra-trail-chianti-castles"),
    ("great-wall", "Ultra-Trail Great Wall", "China", "trail ultra", None, "utmb-dajingmen/dgw100"),
    ("istria", "Istria 100", "Croatia", "trail ultra", "Apr", "utmb-istria/168k"),
    ("julian-alps", "Julian Alps Trail Run", "Slovenia", "trail ultra", None, "utmb-julianalps/i-feel-slovenia-120k"),
    ("kat100", "KAT100", "Austria", "trail ultra", "Aug", "utmb-kat/100-miles"),
    ("kodiak", "Kodiak 100", "USA", "trail ultra", "Oct", "utmb-kodiak/100m"),
    ("kosciuszko", "Ultra-Trail Kosciuszko", "Australia", "trail ultra", None, "utmb-kosciuszko/koscimiler"),
    ("kullamannen", "Kullamannen 100 Mile", "Sweden", "trail ultra", None, "utmb-kullamannen/ultra-100-miles"),
    ("mallorca", "Mallorca Serra de Tramuntana", "Spain", "trail ultra", None, "utmb-mallorca/serra-de-tramuntana-sdt"),
    ("mut", "Mountain Ultra Trail Miler", "South Africa", "trail ultra", None, "utmb-mut/mut-miler-by-utmb"),
    ("nice", "Nice Côte d'Azur 100M", "France", "trail ultra", None, "utmb-nice/ultra-trail-m-tropole-nice-c-te-d-azur-100m"),
    ("restonica", "Restonica Trail 100M", "France (Corsica)", "trail ultra", "Jul", "utmb-restonica/utc100m"),
    ("transjeju", "TransJeju 100M", "South Korea", "trail ultra", "Oct", "utmb-transjeju/jeju100m"),
    ("translantau", "Translantau 100", "Hong Kong", "trail ultra", None, "utmb-translantau/translantau100"),
    ("verbier", "Verbier St-Bernard X-Alpine", "Switzerland", "trail ultra", "Jul", "utmb-verbier/x-alpine"),
    ("wildstrubel", "Wildstrubel 110", "Switzerland", "trail ultra", None, "utmb-wildstrubel/wild-110-crans-montana"),
    ("zugspitz", "Zugspitz Ultratrail", "Germany", "trail ultra", "Jun", "zugspitz-ultratrail/main"),
    ("val-d-aran", "Val d'Aran 100M", "Spain", "trail ultra", "Jul", "val-d-aran-by-utmb/main"),
    ("arc-50", "Arc 50", "UK", "trail ultra", "Feb", "arc-50/main"),
    ("chihuahua", "Chihuahua Rarámuri 100M", "Mexico", "trail ultra", None, "utmb-chihuahua/rar-muri-100m"),
    ("ushuaia", "Ushuaia Epic 130K", "Argentina", "trail ultra", None, "utmb-ushuaia/epic-130k"),
    ("whistler", "Ultra Trail Whistler 100K", "Canada", "trail ultra", None, "utmb-whistler/100k"),
    ("desert-rats", "Desert RATS 100K", "USA", "trail ultra", None, "utmb-desertrats/100k"),
]

GR = "https://www.goandrace.com/en/map/"
# id, name, country, type, goandrace course page (relative to GR)
ROAD = [
    ("paris", "Paris Marathon", "France", "road marathon", "2026/marathon-de-paris-2026-course-map-1.php"),
    ("amsterdam", "Amsterdam Marathon", "Netherlands", "road marathon", "2025/tcs-amsterdam-marathon-2025-course-map-1.php"),
    ("valencia", "Valencia Marathon", "Spain", "road marathon", "2025/valencia-marathon-2025-valencia-course-map-1.php"),
    ("great-north-run", "Great North Run", "UK", "road half marathon", "2025/aj-bell-great-north-run-2025-newcastle-upon-tyne-course-map-1.php"),
    ("brighton", "Brighton Marathon", "UK", "road marathon", "2026/brighton-marathon-2026-brighton-and-hove-course-map-1.php"),
    ("athens", "Athens Authentic Marathon", "Greece", "road marathon", "2025/athens-marathon-2025-athens-course-map-1.php"),
    ("comrades", None, None, None, "2025/comrades-marathon-2025-pietermaritzburg-course-map-1.php"),
    ("two-oceans", None, None, None, "2026/totalsports-two-oceans-marathon-2026-cape-town-course-map-1.php"),
    ("big-sur", "Big Sur Marathon", "USA", "road marathon", "2026/04/big-sur-international-marathon-2026-course-map-1.php"),
    ("edinburgh", "Edinburgh Marathon", "UK", "road marathon", "2026/05/edinburgh-marathon-festival-2026-course-map-1.php"),
    ("sydney", "Sydney Marathon", "Australia", "road marathon", "2026/08/tcs-sydney-marathon-2026-course-map-1.php"),
    ("honolulu", "Honolulu Marathon", "USA", "road marathon", "2026/12/honolulu-marathon-2026-course-map-1.php"),
    ("los-angeles", "Los Angeles Marathon", "USA", "road marathon", "2026/los-angeles-marathon-2026-los-angeles-course-map-1.php"),
    ("stockholm", "Stockholm Marathon", "Sweden", "road marathon", "2026/05/adidas-stockholm-marathon-2026-course-map-1.php"),
    ("san-francisco", "San Francisco Marathon", "USA", "road marathon", "2026/07/san-francisco-marathon-2026-course-map-1.php"),
    ("gold-coast", "Gold Coast Marathon", "Australia", "road marathon", "2026/07/asics-gold-coast-marathon-2026-southport-course-map-1.php"),
    ("rio", "Rio de Janeiro Marathon", "Brazil", "road marathon", "2026/06/maratona-da-cidade-do-rio-de-janeiro-2026-course-map-1.php"),
    ("victoria-falls", "Victoria Falls Marathon", "Zimbabwe", "road marathon", "2026/07/victoria-falls-marathon-2026-course-map-1.php"),
    ("knysna", "Knysna Forest Marathon", "South Africa", "trail marathon", "2026/07/knysna-forest-marathon-2026-course-map-1.php"),
    ("windermere", "Windermere Marathon", "UK", "road marathon", "2026/06/windermere-marathon-2026-ambleside-course-map-1.php"),
    ("pikes-peak", "Pikes Peak Marathon", "USA", "mountain marathon", "2025/pikes-peak-marathon-2025-manitou-springs-course-map-1.php"),
    ("mont-blanc-marathon", "Marathon du Mont-Blanc", "France", "mountain marathon", "2025/marathon-du-mont-blanc-2025-chamonix-course-map-1.php"),
    ("zermatt", "Zermatt Marathon", "Switzerland", "mountain marathon", "2025/gornergrat-zermatt-marathon-2025-course-map-1.php"),
    ("passatore", "100 km del Passatore", "Italy", "road ultra", "2026/05/100-km-del-passatore-2026-firenze-course-map-1.php"),
    ("biel", "Biel 100 km", "Switzerland", "road ultra", "2025/06/biel-running-days-2025-bienne-course-map-1.php"),
    ("endurancelife-sussex", "Endurancelife Sussex", "UK", "trail marathon", "2025/endurancelife-sussex-2025-eastbourne-course-map-1.php"),
    ("chiltern-ridge", "Chiltern Ridge 50K", "UK", "trail ultra", "2025/chiltern-ridge-classic-50k-2025-berkhamsted-course-map-1.php"),
]

MONTHS = "January February March April May June July August September October November December".split()


def fetch(url: str) -> bytes:
    time.sleep(1.5)
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()


def main() -> None:
    path = HERE / 'races.json'
    races = json.loads(path.read_text())
    by_id = {r['id']: r for r in races}
    (HERE / 'courses').mkdir(exist_ok=True)

    for rid, name, country, typ, month, src in ULTRAS:
        if rid in by_id:
            continue
        race, course = src.split('/')
        d = json.loads((U / race / course / 'course.json').read_text())
        races.append({"id": rid, "name": name, "country": country, "type": typ, "month": month,
                      "km": round(d.get('advertised_km') or d['gpx_km']), "gain_m": d.get('gpx_gain_m'),
                      "route": None, "hook": None, "photos": [],
                      "course": {"source": "ultra-course-data", "path": f"out/{race}/{course}/course.gpx",
                                 "gpx_km": d['gpx_km'], "gpx_gain_m": d.get('gpx_gain_m'), "partial": False,
                                 "origin": d.get('gpx_source_url')}})
        print('ultra', rid)

    for rid, name, country, typ, page in ROAD:
        r = by_id.get(rid)
        if r and r.get('course') and not r['course'].get('partial'):
            continue
        try:
            html = fetch(GR + page).decode('utf-8', 'replace')
            href = re.search(r'href="([^"]*track\.gpx)[^"]*"', html).group(1)
            gpx_url = "https://www.goandrace.com/" + re.sub(r'^(\.\./)+', '', href)
            pts = geo.parse_gpx(fetch(gpx_url))
        except Exception as e:  # one bad page shouldn't stop the batch
            print('FAIL', rid, e)
            continue
        m = re.search(r'(' + '|'.join(MONTHS) + r') \d{1,2}, 20\d\d', html)
        (HERE / 'courses' / f'{rid}.gpx').write_text(geo.write_gpx(pts, rid))
        km, gain = round(geo.total_km(pts), 2), round(geo.total_gain_m(pts)) if any(p.ele for p in pts) else None
        course = {"source": "goandrace", "urls": [gpx_url], "path": f"courses/{rid}.gpx", "gpx_km": km,
                  "gpx_gain_m": gain, "partial": False, "page": GR + page}
        if r:  # existing race that had no course (Comrades, Two Oceans)
            r['course'] = course
            r.pop('course_todo', None)
        else:
            races.append({"id": rid, "name": name, "country": country, "type": typ,
                          "month": m.group(1)[:3] if m else None, "km": km, "gain_m": gain,
                          "route": None, "hook": None, "photos": [], "course": course})
        print('road', rid, km, 'km', gain, 'm', m.group(0) if m else '')
        path.write_text(json.dumps(races, indent=1, ensure_ascii=False))

    path.write_text(json.dumps(races, indent=1, ensure_ascii=False))
    print(len(races), 'races in races.json')


if __name__ == '__main__':
    main()
