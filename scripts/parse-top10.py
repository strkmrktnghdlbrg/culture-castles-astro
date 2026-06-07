#!/usr/bin/env python3
"""
Parst die in /tmp/top10-scrape gespeicherten WP-Seiten von top10-heidelberg.de
und erzeugt strukturierte JSON-Records pro Top10-Liste.

Heuristiken:
 1. Pattern A — "1. Name – Beschreibung" in <p> nach "Top 10 X" H2.
 2. Pattern B — <h3>Name</h3> + folgende <p>-Beschreibungen, gruppiert
    nach <h2>-Subkategorie (z.B. Stadtteil-Hotels).
 3. Pattern C — nichts Konkretes (nur Floskel-H2 / FAQs). Wir markieren
    `weak: true` und schreiben einen leeren `items`-Array; das Template
    rendert dann einen Platzhalter-Hinweis.

Outputs:
 - /tmp/top10-extracted/_parsed.json
"""
import os, re, json, sys
from html import unescape
from html.parser import HTMLParser

SRC_DIR = "/tmp/top10-scrape"
OUT_FILE = "/tmp/top10-extracted/_parsed.json"


class StructParser(HTMLParser):
    """Erzeugt eine flache Sequenz von ('h1'|'h2'|'h3'|'h4'|'p'|'img', text)."""

    def __init__(self):
        super().__init__()
        self.skip = 0
        self.cur_tag = None
        self.buf = []
        self.flow = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style", "noscript", "svg", "nav", "footer", "iframe", "form", "aside"):
            self.skip += 1
            return
        if tag in ("h1", "h2", "h3", "h4", "p", "li"):
            self.flush()
            self.cur_tag = tag
        if tag == "img":
            src = a.get("src", "") or a.get("data-src", "")
            alt = a.get("alt", "")
            self.flow.append(("img", {"src": src, "alt": alt}))

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg", "nav", "footer", "iframe", "form", "aside"):
            if self.skip > 0:
                self.skip -= 1
            return
        if tag == self.cur_tag:
            self.flush()
            self.cur_tag = None

    def handle_data(self, data):
        if self.skip or not self.cur_tag:
            return
        self.buf.append(data)

    def flush(self):
        if not self.cur_tag:
            return
        text = "".join(self.buf).strip()
        text = re.sub(r"\s+", " ", text)
        text = unescape(text)
        if text:
            self.flow.append((self.cur_tag, text))
        self.buf = []


SKIP_TITLES = (
    "zusammenfassung", "fazit", "faqs", "über uns", "ueber uns",
    "kontakt", "impressum", "datenschutz", "weitere artikel",
    "wichtige tipps", "warum du", "was sind", "wie viele", "welche",
    "schlüsselerkenntnisse", "schluesselerkenntnisse", "key takeaways",
    "mehrwert", "vorteile", "tipps", "kriterien", "fragen und antworten",
    "rezensionen", "bewertungen", "bewertung", "feedback",
)

def looks_generic(s: str) -> bool:
    low = s.lower()
    return any(low.startswith(p) or low == p for p in SKIP_TITLES)


def parse_file(path: str):
    """Returns dict: { slug, title, intro, sections, items, weak }"""
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    # Title aus <title> ziehen (entferne " - Top 10 Heidelberg" Suffix)
    tm = re.search(r"<title>([^<]+)</title>", html)
    head_title = ""
    if tm:
        head_title = re.sub(r"\s*[-–]\s*Top\s*10\s*Heidelberg\s*$", "", tm.group(1)).strip()
    # Meta-Description
    dm = re.search(r'name="description"\s+content="([^"]+)"', html)
    meta_desc = dm.group(1).strip() if dm else ""

    m = re.search(r"<article[^>]*>(.*?)</article>", html, re.S)
    if not m:
        m = re.search(r'<main[^>]*>(.*?)</main>', html, re.S)
    body = m.group(1) if m else html
    body = re.sub(r"<script.*?</script>", "", body, flags=re.S)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.S)
    body = re.sub(r"<svg.*?</svg>", "", body, flags=re.S)

    p = StructParser()
    p.feed(body)
    p.flush()
    flow = p.flow

    # Title = first h1 (Fallback: head_title)
    title = next((t for tag, t in flow if tag == "h1"), "") or head_title

    # Intro = first substantial p that isn't breadcrumb/generic
    intro = ""
    for tag, t in flow:
        if tag in ("h2", "h3"):
            break
        if tag != "p":
            continue
        if len(t) < 60:
            continue
        if looks_generic(t):
            continue
        # Skip breadcrumb-like
        if t.startswith("Home ") or "»" in t[:20]:
            continue
        intro = t
        break

    # Pattern A: Look for "<n>. <name> – <desc>" or "<n>. <name>: <desc>" or "<n>. <name>" in <p>
    pat_a_items = []
    for tag, t in flow:
        if tag != "p":
            continue
        m2 = re.match(r"^\s*(\d{1,2})\.\s+(.+)", t)
        if not m2:
            continue
        rank = int(m2.group(1))
        rest = m2.group(2).strip()
        # split at first " – " or ": " or " - "
        split_match = re.split(r"\s[–-]\s|: ", rest, maxsplit=1)
        if len(split_match) == 2:
            name, desc = split_match
        else:
            name, desc = rest, ""
        if 1 <= rank <= 12:
            pat_a_items.append({"rank": rank, "name": name.strip(), "description": desc.strip()})

    # Deduplicate by rank (keep first) and sort
    seen = set()
    a_items = []
    for it in pat_a_items:
        if it["rank"] in seen:
            continue
        seen.add(it["rank"])
        a_items.append(it)
    a_items.sort(key=lambda x: x["rank"])

    # Pattern B: <h3>Name</h3>, collect subsequent <p>-texts until next h2/h3
    b_items = []
    i = 0
    while i < len(flow):
        tag, t = flow[i]
        if tag == "h3" and not looks_generic(t):
            name = t.strip().rstrip(".")
            descs = []
            j = i + 1
            while j < len(flow) and flow[j][0] not in ("h2", "h3"):
                if flow[j][0] == "p" and flow[j][1]:
                    descs.append(flow[j][1])
                j += 1
            desc = " ".join(descs).strip()
            # Skip if name looks like a FAQ question
            if not re.search(r"\?", name) and len(name) < 80:
                b_items.append({"name": name, "description": desc})
            i = j
        else:
            i += 1

    # Pattern D: <h2> headings als Items (Sights/Outdoor/Historisches) —
    # Collect <h2> bis zum Auftauchen von Fazit/FAQs, jeweils gefolgte <p> als description.
    d_items = []
    stop = False
    i = 0
    while i < len(flow):
        tag, t = flow[i]
        if tag == "h2":
            tl = t.strip().lower()
            if tl.startswith("fazit") or tl.startswith("faqs") or tl.startswith("zusammenfassung"):
                break
            # Imperativ-Floskel abscheiden
            name = re.sub(r"^(Entdecke|Erfahre|Erlebe|Erkunde|Genieße|Geniesse|Besuche|Schlendere|Spaziere|Tauche|Entspanne|Finde|Gönn|Goenn|Lass)(\s+\w+){0,3}\s+", "", t, flags=re.IGNORECASE).strip()
            name = name.rstrip(" .–-:")
            # Wenn nach Bereinigung zu kurz oder leer → originaltext
            if len(name) < 4:
                name = t.strip()
            descs = []
            j = i + 1
            while j < len(flow) and flow[j][0] != "h2":
                if flow[j][0] == "p":
                    descs.append(flow[j][1])
                j += 1
            desc = " ".join(descs).strip()
            d_items.append({"name": name, "description": desc})
            i = j
        else:
            i += 1

    # Decide
    h2_themes = [t for tag, t in flow if tag == "h2" and not looks_generic(t)]
    items = []
    pattern = "weak"
    weak = True
    if len(a_items) >= 5:
        items = a_items[:10]
        pattern = "rank-list"
        weak = False
    elif len(b_items) >= 5:
        items = [{"rank": idx + 1, **b} for idx, b in enumerate(b_items[:10])]
        pattern = "named-sections"
        weak = False
    elif len(d_items) >= 7:
        items = [{"rank": idx + 1, **d} for idx, d in enumerate(d_items[:10])]
        pattern = "h2-items"
        weak = False
    elif len(b_items) > 0:
        items = [{"rank": idx + 1, **b} for idx, b in enumerate(b_items)]
        pattern = "partial"
        weak = True

    slug = os.path.basename(path).replace(".html", "")

    return {
        "slug": slug,
        "title": title,
        "metaDescription": meta_desc,
        "intro": intro,
        "pattern": pattern,
        "weak": weak,
        "items": items,
        "h2_themes": h2_themes[:10],
    }


def main():
    out = []
    for fn in sorted(os.listdir(SRC_DIR)):
        if not fn.endswith(".html"):
            continue
        if fn.startswith("_"):
            continue  # impressum/datenschutz separat
        rec = parse_file(os.path.join(SRC_DIR, fn))
        out.append(rec)
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # Stats
    n_strong = sum(1 for r in out if not r["weak"])
    n_weak = sum(1 for r in out if r["weak"])
    print(f"parsed {len(out)} files: {n_strong} strong, {n_weak} weak")
    for r in out:
        print(f"  [{r['pattern']:>14}] {r['slug']:<40} items={len(r['items']):>2}  title={r['title'][:50]!r}")


if __name__ == "__main__":
    main()
