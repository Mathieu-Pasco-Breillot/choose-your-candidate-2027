#!/usr/bin/env python3
"""Résout un lien Google Actualités (news.google.com/rss/articles/...) vers l'url de l'article.
Usage : python3 /tmp/claude-0/outils/gnews.py <lien> [<lien> ...]   → une url par ligne (ou ERREUR)
        python3 /tmp/claude-0/outils/gnews.py --rss "<mots clés>"     → date | titre | url résolue (10 premiers)
"""
import json, re, sys, urllib.parse, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}

def get(url, data=None, headers=None):
    h = dict(UA); h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")

def resoudre(lien):
    m = re.search(r"/articles/([^?]+)", lien)
    if not m: return lien
    gid = m.group(1)
    html = get(f"https://news.google.com/rss/articles/{gid}")
    sg = re.search(r'data-n-a-sg="([^"]+)"', html).group(1)
    ts = re.search(r'data-n-a-ts="([^"]+)"', html).group(1)
    inner = ["garturlreq", [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None, None, None, None, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0], gid, int(ts), sg]
    payload = [[["Fbv4je", json.dumps(inner), None, "generic"]]]
    body = urllib.parse.urlencode({"f.req": json.dumps(payload)}).encode()
    txt = get("https://news.google.com/_/DotsSplashUi/data/batchexecute", body,
              {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"})
    data = json.loads(txt.split("\n\n", 1)[1])
    return json.loads(data[0][2])[1]

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--rss":
        q = urllib.parse.quote_plus(sys.argv[2])
        x = get(f"https://news.google.com/rss/search?q={q}&hl=fr&gl=FR&ceid=FR:fr")
        for it in re.findall(r"<item>(.*?)</item>", x, re.S)[:10]:
            t = re.search(r"<title>(.*?)</title>", it, re.S).group(1)
            d = re.search(r"<pubDate>(.*?)</pubDate>", it, re.S).group(1)
            l = re.search(r"<link>(.*?)</link>", it, re.S).group(1)
            try: u = resoudre(l)
            except Exception as e: u = f"ERREUR {e}"
            print(f"{d[5:16]} | {t} | {u}")
    else:
        for l in sys.argv[1:]:
            try: print(resoudre(l))
            except Exception as e: print(f"ERREUR {e}")
