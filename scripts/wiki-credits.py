#!/usr/bin/env python3
"""
Holt Author/Lizenz-Metadaten für jedes Bild aus Wikimedia Commons und
schreibt sie als TypeScript-Modul src/data/image-credits.ts.

Hintergrund: Wir laden Bilder via wiki-fetch.py per Page-Title nach
public/images/. Für die rechtskonforme Attribution (CC-BY/BY-SA-Pflicht)
müssen wir den Autor und die Lizenz pro Bild kennen — die holen wir hier
nach via Commons-extmetadata-API.

Re-run: bei jedem Tausch / Hinzufügen eines Bildes — dieses Skript
schreibt image-credits.ts komplett neu.
"""
import json, os, re, urllib.parse, urllib.request, time

UA = "Mozilla/5.0 (top10-heidelberg-scraper; j.stark@stark.marketing)"

# slug → (wikipedia-title)
# Sonderfall COMMONS:File.jpg → direkt File-Lookup
MAPPING = [
    ("sehenswuerdigkeiten",   "Heidelberger Schloss"),
    ("hotels",                "Heidelberger Schloss"),
    ("restaurants",           "Hauptstraße (Heidelberg)"),
    ("cafes",                 "Hauptstraße (Heidelberg)"),
    ("bars-und-kneipen",      "Marktplatz (Heidelberg)"),
    ("wellness-spa",          "Heidelberger Schloss"),
    ("outdoor-aktivitaeten",  "Philosophenweg (Heidelberg)"),
    ("historische-staetten",  "Heidelberger Schloss"),
    ("architekturwunder",     "Heidelberger Schloss"),
    ("versteckte-juwelen",    "Philosophenweg (Heidelberg)"),
    ("einkaufsmoeglichkeiten","Hauptstraße (Heidelberg)"),
    ("veranstaltungen-festivals","Neckarwiese"),
    ("kinderfreundliche-orte","Zoo Heidelberg"),
    ("altstadt-hotels",       "Heiliggeistkirche (Heidelberg)"),
    ("bahnstadt-hotels",      "Heidelberger Hauptbahnhof"),
    ("bergheim-hotels",       "COMMONS:Heidelberg Stadtteil Bergheim BILD0962.jpg"),
    ("boxberg-hotels",        "Königstuhl (Odenwald)"),
    ("emmertsgrund-hotels",   "Königstuhl (Odenwald)"),
    ("handschuhsheim-hotels", "Tiefburg Handschuhsheim"),
    ("kirchheim-hotels",      "COMMONS:Heidelberg-Kirchheim Rathaus 20100623.jpg"),
    ("neuenheim-hotels",      "Philosophenweg (Heidelberg)"),
    ("pfaffengrund-hotels",   "COMMONS:Bahnhof Pfaffengrund-Wieblingen 01.jpg"),
    ("rohrbach-hotels",       "Königstuhl (Odenwald)"),
    ("schlierbach-hotels",    "Neckar"),
    ("suedstadt-hotels",      "Heidelberger Schloss"),
    ("weststadt-hotels",      "Heidelberger Hauptbahnhof"),
    ("wieblingen-hotels",     "Neckar"),
    ("ziegelhausen-hotels",   "Stift Neuburg"),
    ("baeckereien",           "Brot"),
    ("buchlaeden",            "Buchhandlung"),
    ("kunstgalerien",         "Kurpfälzisches Museum"),
    ("musikschulen",          "Klavier"),
    ("fahrradladen",          "Fahrrad"),
    ("blumenladen",           "Blumenstrauß"),
    ("apotheken",             "Apotheke"),
    ("__hero__",              "Heidelberger Schloss"),
]


def api_call(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def get_filename_from_wp_title(title):
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "titles": title,
        "prop": "pageimages", "piprop": "original", "redirects": 1,
    })
    d = api_call(f"https://de.wikipedia.org/w/api.php?{params}")
    for _, p in d.get("query", {}).get("pages", {}).items():
        src = p.get("original", {}).get("source")
        if src:
            name = src.rsplit("/", 1)[-1]
            return urllib.parse.unquote(name)
    return None


def get_imageinfo(commons_filename):
    title = f"File:{commons_filename}"
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|mime",
        "iiextmetadatalanguage": "de",
    })
    d = api_call(f"https://commons.wikimedia.org/w/api.php?{params}")
    for _, p in d.get("query", {}).get("pages", {}).items():
        ii = p.get("imageinfo", [])
        if ii:
            return ii[0]
    return None


def strip_html(s):
    if not s: return ""
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def credit_from_meta(meta):
    em = meta.get("extmetadata", {}) if meta else {}
    def gv(k):
        v = em.get(k, {}).get("value")
        return strip_html(v) if v else ""
    artist     = gv("Artist") or "Unbekannt"
    license_   = gv("LicenseShortName") or gv("License") or ""
    licenseUrl = em.get("LicenseUrl", {}).get("value") or ""
    description = gv("ImageDescription")
    return {
        "author": artist[:120],
        "license": license_[:40],
        "licenseUrl": licenseUrl,
        "description": description[:160],
    }


def main():
    out = {}
    for slug, key in MAPPING:
        if key.startswith("COMMONS:"):
            filename = key[len("COMMONS:"):]
        else:
            filename = get_filename_from_wp_title(key)
            if not filename:
                print(f"  ! {slug:<32} no filename from {key!r}")
                continue
        meta = get_imageinfo(filename)
        if not meta:
            print(f"  ! {slug:<32} no imageinfo for {filename!r}")
            continue
        cred = credit_from_meta(meta)
        cred["filename"] = filename
        cred["commonsUrl"] = f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(filename)}"
        out[slug] = cred
        print(f"  ✓ {slug:<32} {cred['author'][:40]:<40} {cred['license']}")
        time.sleep(0.3)

    ts_path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "image-credits.ts")
    with open(ts_path, "w", encoding="utf-8") as f:
        f.write("/**\n")
        f.write(" * Bildnachweise (CC-BY-SA-Pflicht).\n")
        f.write(" * Generiert via scripts/wiki-credits.py — bei Bedarf manuell verfeinern.\n")
        f.write(" * Quelle: Wikimedia Commons.\n")
        f.write(" */\n\n")
        f.write("export type ImageCreditRecord = {\n")
        f.write("  author: string;\n")
        f.write("  license: string;\n")
        f.write("  licenseUrl: string;\n")
        f.write("  commonsUrl: string;\n")
        f.write("  filename: string;\n")
        f.write("  description?: string;\n")
        f.write("};\n\n")
        f.write("export const imageCredits: Record<string, ImageCreditRecord> = ")
        f.write(json.dumps(out, ensure_ascii=False, indent=2))
        f.write(";\n")
    print(f"\nwrote {ts_path}")
    print(f"covered: {len(out)} / {len(MAPPING)}")


if __name__ == "__main__":
    main()
