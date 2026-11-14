# Photos des aliments : Wikidata (libellé français + description qui parle de nourriture) -> image Commons (licence libre).
# Vignettes 240 px dans web/food-img/<id>.jpg, crédits dans web/food-img/credits.json
# Usage : python3 fetch-food-photos.py [--redo] [id ...]
import json, os, re, sys, time, urllib.parse, urllib.request, urllib.error, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, 'web'); OUT = os.path.join(WEB, 'food-img'); os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'ParcoursApp/1.0 (application personnelle de suivi sportif)'}
FOOD = re.compile(r"(?i)plat|aliment|nourriture|mets|cuisine|recette|spécialité|boisson|soda|jus|bière|vin|thé|café|lait|dessert|pâtiss|gâteau|biscuit|confiserie|bonbon|chocolat|barre|friandise|glace|crème|fromage|yaourt|fruit|légume|céréale|pain|viennoiserie|sandwich|sauce|condiment|épice|viande|volaille|charcuterie|saucisse|poisson|crustacé|soupe|salade|pâtes|riz|tarte|snack|en-cas|marque de|graine|noix|huile|beurre|sucre|farine|food|dish|drink|beverage|confection|pastry|cheese|bread|vegetable|meat")
BAD = re.compile(r"(?i)chanteu|musicien|footbal|basket|équipe|club|film|album|chanson|série|personnage|commune|ville|village|rivière|logiciel|jeu vidéo|famille de|genre de|espèce d")

def get(url, js=True):
    for k in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
                b = r.read(); time.sleep(0.8); return json.loads(b) if js else b
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            print('HTTP', e.code, url[:80], flush=True); time.sleep(20 if e.code == 429 else 3 * (k + 1))
        except Exception:
            time.sleep(3 * (k + 1))
    return None

def wikidata(name):  # en fait : Wikipédia FR (1 requête), image libre + courte description Wikidata pour vérifier que c'est bien de la nourriture
    r = get('https://fr.wikipedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': name, 'gsrlimit': 6, 'gsrnamespace': 0,
        'prop': 'pageimages|description', 'piprop': 'name', 'pilicense': 'free', 'redirects': 1}))
    pages = sorted(((r or {}).get('query') or {}).get('pages', {}).values(), key=lambda x: x.get('index', 99))
    nm = name.lower().strip()
    ok = lambda p: p.get('pageimage') and not BAD.search(p.get('description', '')) and not re.search(r'(?i)\.(svg|gif)$|logo|blason|drapeau|carte', p['pageimage'])
    food = lambda p: FOOD.search(p.get('description', '') + ' ' + p.get('title', '')) or re.search(r"(?i)pomme de terre|frit|grill|rôti|farci|sucr|cuit|boulette|brochette|galette|beignet|crêpe|omelette|bouillon|purée", p.get('description', ''))
    exact = [p for p in pages if ok(p) and re.sub(r'\s*\(.*\)', '', p['title']).lower() in (nm, nm.rstrip('s'), nm + 's') and (not p.get('description') or food(p))]
    rest = [p for p in pages if ok(p) and food(p) and p.get('description')]
    p = (exact or rest or [None])[0]
    return {'file': p['pageimage'], 'via': p['title'] + ' (' + p.get('description', '') + ')'} if p else None

def commons(name):
    r = get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'list': 'search', 'srsearch': name + ' filetype:bitmap', 'srnamespace': 6, 'srlimit': 3}))
    for x in (r or {}).get('query', {}).get('search', []):
        t = re.sub(r'^(File|Fichier):', '', x['title'])
        if not re.search(r'(?i)logo|map|carte|flag|drapeau|\.(svg|gif|tif)', t): return {'file': t, 'via': 'commons: ' + name}
    return None

def thumb(file):
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(file.replace(' ', '_')) + '?width=250'

if __name__ == '__main__':
    args = sys.argv[1:]; redo = '--redo' in args; part = next((a for a in args if a.startswith('--part=')), None); args = [a for a in args if a != '--redo' and not a.startswith('--part=')]
    data = json.load(open(os.path.join(WEB, 'foods-data.json')))
    src = open(os.path.join(WEB, 'index.html')).read(); i = src.index('const INGR = ['); j = src.index('];', i)
    items = [(f['id'], f['fr']) for f in data['foods']] + [('i-' + a, b) for a, b in re.findall(r"\['([^']+)', '([^']+)'", src[i:j])]
    qp = os.path.join(ROOT, 'scripts', 'food-photo-queries.json'); over = json.load(open(qp)) if os.path.exists(qp) else {}
    cp = os.path.join(OUT, 'credits.json'); credits = json.load(open(cp)) if os.path.exists(cp) and not (redo and not args) else {}
    todo = [it for it in items if (args and it[0] in args) or (not args and (redo or it[0] not in credits))]
    if part: k, m = map(int, part[7:].split('/')); todo = todo[k::m]; cp = os.path.join(OUT, 'credits-%d.json' % k); credits = json.load(open(cp)) if os.path.exists(cp) else {}; todo = [t for t in todo if t[0] not in credits]
    print('à traiter :', len(todo), flush=True)
    for n, (fid, fr) in enumerate(todo):
        name = re.sub(r'\s*\([^)]*\)', '', fr).strip()
        q = over.get(fid) or name
        if q == '-': hit = None
        elif q.startswith('File:'): hit = {'file': q[5:], 'via': 'choisi à la main'}
        else: hit = wikidata(q) or commons(q)
        ok = False
        if hit:
            img = get(thumb(hit['file']), js=False)
            if img and len(img) > 1500:
                tmp = os.path.join(OUT, fid + '.tmp'); open(tmp, 'wb').write(img)
                subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '68', '-Z', '240', tmp, '--out', os.path.join(OUT, fid + '.jpg')], capture_output=True)
                os.remove(tmp); ok = True
        credits[fid] = hit if ok else None
        if not ok and os.path.exists(os.path.join(OUT, fid + '.jpg')): os.remove(os.path.join(OUT, fid + '.jpg'))
        if n % 20 == 0 or args:
            json.dump(credits, open(cp, 'w'), ensure_ascii=False, indent=0)
            print(n, fr, '->', hit and hit['via'], flush=True)
    json.dump(credits, open(cp, 'w'), ensure_ascii=False, indent=0)
    print('fini', sum(1 for v in credits.values() if v), '/', len(credits), flush=True)
