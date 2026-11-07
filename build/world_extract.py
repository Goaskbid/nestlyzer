#!/usr/bin/env python3
"""One-off extraction of the source files for the countries outside Europe (run when refreshing them, not on every build).

Inputs (open data, fetched from the package registries and GitHub):
  - GeoNames cities500 as bundled in the PyPI package geonamescache (GeoNames, CC BY 4.0): every populated place with
    at least 500 residents, with coordinates, population, first-level region code, time zone and alternate names.
  - GeoNames feature codes as bundled in the npm package all-the-cities (CC BY 4.0), joined by GeoNames id.
  - OurAirports (public domain), github.com/davidmegginson/ourairports-data: large and medium airports with
    scheduled passenger service, worldwide.

    pip install geonamescache==3.0.2 ; npm i all-the-cities@3.1.0   (in a scratch folder)
    python3 build/world_extract.py <path to geonamescache/data> <path to all-the-cities feature-code json>

Outputs (kept in the repository, read by build/build_world.py):
  build/source/world_places.json.gz   rows: [cc, geonameid, name, lat, lon, population, admin1, feature, native, tz]
  build/source/airports_world.json    rows like airports_scheduled_europe.json
"""
import csv, gzip, io, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', 'source')
WORLD = ['US', 'CA', 'JP', 'KR', 'TW', 'HK', 'SG', 'AU', 'NZ', 'IL', 'BR', 'MX', 'MY', 'ID', 'MA', 'ZA', 'IN', 'CN', 'AE'] + ['RU', 'TR', 'VN', 'TH', 'SA', 'PH', 'AR', 'CO', 'EG']   # 2.12: nine new countries (BRICS); 2.14: nine more (owner request 7 Nov 2026: high human development, large FDI and B2B markets). HELD until district data: CL, QA, KZ, UY, CR, PA, GE (GeoNames lists their capitals as one place, so the capital won most households; config kept below)

KANA = re.compile(r'[぀-ヿ]')
CJK = re.compile(r'[一-鿿]')
HANGUL = re.compile(r'[가-힣]')
HEBREW = re.compile(r'[א-ת]')
NIQQUD = re.compile(r'[֑-ׇ]')
ONLY = re.compile(r'^[぀-ヿ一-鿿々ー\s\-・ヶ]+$')
# characters that give the wrong variant away: simplified Chinese, traditional Chinese and Japanese (shinjitai) forms
SIMP = set('东车门马鸟龙乐兰阳冈岛县广湾庆华丰业泽场汉吴尔齐罗张刘陈滨荣叶历宁实宫归卫应开关兴长鱼鸡贺赖远连进过边达际陆险顺须领风飞饭馆驿户丽临义乌书买乱亚产园围图圆圣坛坝报护担损换据摄无旧时显晋杀杂权条杨极构标树样桥档梦欢汇沟沪浅济浏涂涛润渊渔满灯灵灾炉炼烟热爱状独猎献环现电画盖盘矿码础确礼离种积称稳穷竞笔筑签简类粮红约级纪线练组细织终经结绕给络统继续维绿缘网罗职联艺节苏范药莱获营萧蓝规视觉计认议记讲许论设证评词译试话该语说请读调谈谢谷贝负贡财责贤货质贵费贸资赛赵趋转轮轻载较辆辉辽运还这违选递遗邓邮邻郑钟钢钱铁银锦镇长闭问间闸阁阳队阶陇陕隐难韩页顶项顾预领题额风饶馆首驻验骑鲁鲜鸣鸭鸿鹤麦黄齐龄龟区')
TRAD = set('區縣廣灣澤濱榮豐樂關鄉臺國戶黃歸舊圓驛實寶邊鐵體學會傳點號發龜櫻濟澀齋龍鳥馬門車陽華業場漢吳爾齊羅張劉陳寧宮衛應開興長魚雞賀賴遠連進過達際陸險順須領風飛飯館麗臨義烏書買亂亞產園圍圖聖壇壩報護擔損換據攝無時顯晉殺雜權條楊極構標樹樣橋檔夢歡匯溝滬淺測燈靈災爐煉煙熱愛狀獨獵獻環現電畫蓋盤礦碼礎確禮離種積稱穩窮競筆築簽簡類糧紅約級紀線練組細織終經結繞給絡統繼續維綠緣網職聯藝節蘇範藥萊獲營蕭藍規視覺計認議記講許論設證評詞譯試話該語說請讀調談謝貝負貢財責賢貨質貴費貿資賽趙趨轉輪輕載較輛輝遼運還這違選遞遺鄧郵鄰鄭鐘鋼錢銀錦鎮閉問間閘閣隊階隴陝隱難韓頁頂項顧預題額饒驗騎魯鮮鳴鴨鴻鶴麥齡龜')
SHIN = set('区県広沢浜栄豊楽関郷戸帰旧円駅実辺鉄体学会伝発亀桜済渋斎黄団豊竜')
JP_BAD = SIMP | (TRAD - set('島東宮長陽華業場漢張陳鳥馬門車魚開興間鎮龍岡'))
TWHK_BAD = SIMP | SHIN
HEB = {'א': '', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': '', 'ז': 'z', 'ח': 'h', 'ט': 't', 'י': '', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'p', 'ף': 'p', 'צ': 's', 'ץ': 's', 'ק': 'k', 'ר': 'r', 'ש': 's', 'ת': 't'}


def skel_en(s):
    import unicodedata
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    for a, b in (('ph', 'p'), ('sh', 's'), ('ts', 's'), ('tz', 's'), ('kh', 'h'), ('ch', 'h'), ('v', 'b'), ('f', 'p'), ('c', 'k'), ('q', 'k'), ('w', ''), ('j', 'y')):
        s = s.replace(a, b)
    return re.sub(r'[^bdghklmnprstz]', '', s)


def skel_he(s):
    return ''.join(HEB.get(ch, '') for ch in s)


def native_name(cc, alts, name):
    """The place name in its own script, chosen from GeoNames alternate names (no language tags there, so by script)."""
    alts = [a.strip() for a in alts if a and a.strip() and a.strip() != name]
    if cc == 'KR':
        c = [a for a in alts if HANGUL.search(a) and not CJK.search(a) and not re.search(r'[A-Za-z]', a)]
        c.sort(key=lambda a: (not re.search(r'(시|군|구|동|읍|면|도)$', a), len(a)))
        return c[0] if c else ''
    if cc == 'IL':
        c = [a for a in alts if HEBREW.search(a) and not NIQQUD.search(a) and not re.search(r'[A-Za-z0-9]', a)]
        import difflib
        en = skel_en(name)
        c.sort(key=lambda a: (-round(difflib.SequenceMatcher(None, en, skel_he(a)).ratio(), 2), -len(a), a))
        return c[0] if c else ''
    if cc == 'JP':
        c = [a for a in alts if (CJK.search(a) or KANA.search(a)) and ONLY.match(a)]
        def score(a):
            s = 0
            if KANA.search(a) and not CJK.search(a): s -= 2           # kana-only spellings are readings, not the written name
            if re.search(r'(市|町|村|区|郡)$', a): s += 3
            if any(ch in JP_BAD for ch in a): s -= 10
            return -s
        c.sort(key=lambda a: (score(a), len(a)))
        return c[0] if c and score(c[0]) <= 0 else ''
    if cc in ('TW', 'HK'):
        c = [a for a in alts if CJK.search(a) and not KANA.search(a) and ONLY.match(a)]
        def score(a):
            s = 0
            if re.search(r'(市|區|鄉|鎮|縣|里|村)$', a): s += 3
            if any(ch in TWHK_BAD for ch in a): s -= 10
            if any(ch in TRAD for ch in a): s += 1
            return -s
        c.sort(key=lambda a: (score(a), len(a)))
        return c[0] if c and score(c[0]) <= 0 else ''
    return ''


def main():
    gdir, fcfile = sys.argv[1], sys.argv[2]
    fc = {int(k): v for k, v in json.load(open(fcfile)).items()}
    d = json.load(open(os.path.join(gdir, 'cities500.json')))
    rows = []
    for x in d.values():
        cc = x['countrycode']
        if cc not in WORLD: continue
        rows.append([cc, x['geonameid'], x['name'], round(x['latitude'], 5), round(x['longitude'], 5), int(x.get('population') or 0),
                     x.get('admin1code') or '', fc.get(x['geonameid'], ''), native_name(cc, x.get('alternatenames') or [], x['name']), x.get('timezone') or ''])
    rows.sort(key=lambda r: (r[0], r[1]))
    with gzip.open(os.path.join(SRC, 'world_places.json.gz'), 'wt', encoding='utf-8') as f:
        json.dump({'source': 'GeoNames cities500 (CC BY 4.0) via geonamescache 3.0.2; feature codes via all-the-cities 3.1.0', 'countries': WORLD, 'rows': rows}, f, ensure_ascii=False, separators=(',', ':'))
    print('places', len(rows))
    if os.environ.get('NZ_NO_AIRPORTS'): return   # 2.14: airports_world.json already covers every country
    url = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv'
    txt = urllib.request.urlopen(url, timeout=60).read().decode('utf-8')
    ap = []
    for r in csv.DictReader(io.StringIO(txt)):
        if r['type'] in ('large_airport', 'medium_airport') and r['scheduled_service'] == 'yes':
            ap.append([r['ident'], r['iata_code'], r['name'], r['type'], round(float(r['latitude_deg']), 5), round(float(r['longitude_deg']), 5), r['iso_country'], r['municipality']])
    json.dump({'source': 'OurAirports (public domain), github.com/davidmegginson/ourairports-data, large/medium airports with scheduled service, worldwide', 'rows': ap},
              open(os.path.join(SRC, 'airports_world.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('airports', len(ap))


if __name__ == '__main__':
    main()
