/**
 * localize-images.mjs
 * -------------------
 * Lädt alle als heroImage hotgelinkten Wikimedia-Bilder herunter, skaliert
 * sie über die Wikimedia-Thumbnail-API auf max. 1600px Breite und legt sie
 * selbst gehostet unter public/images/<bucket>/<slug>.<ext> ab. Danach wird
 * die heroImage-Frontmatter-Zeile jeder .md-Datei auf den lokalen Pfad
 * umgeschrieben.
 *
 * Warum 1600px: Hero-/OG-Bilder brauchen keine 3840px. 1600px deckt Retina-
 * Hero und OG (1200px empfohlen) ab und spart LCP/Bandbreite drastisch.
 *
 * DE- und EN-Kollektionen teilen Slug + Bild → gemeinsamer Ziel-Bucket,
 * das Bild wird nur einmal geladen.
 *
 * Nutzung:  node scripts/localize-images.mjs
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT = join(ROOT, "src", "content");
const PUBLIC_IMG = join(ROOT, "public", "images");

const MAX_WIDTH = 1600;
const UA = "culture-castles-image-localizer/1.0 (info@culture-castles.de) self-hosting";

// content-Unterordner → Ziel-Bucket (DE/EN teilen sich einen Bucket)
const BUCKET = {
  castles: "castles",
  "castles-en": "castles",
  regions: "regions",
  "regions-en": "regions",
  routes: "routes",
  "routes-en": "routes",
  articles: "magazin",
  "articles-en": "magazin",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Robuste, auf MAX_WIDTH skalierte URL über Special:FilePath.
 * commons.wikimedia.org/wiki/Special:FilePath/<File>?width=1600 leitet
 * zuverlässig auf das passende Thumbnail um (das direkte /thumb/-URL-Raten
 * liefert je nach vorab generierten Größen HTTP 400).
 */
function thumbUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("upload.wikimedia.org")) return null;
    const parts = u.pathname.split("/");
    const ci = parts.indexOf("commons");
    if (ci === -1) return null;
    const rest = parts.slice(ci + 1);
    // Dateiname ermitteln: bei /thumb/ ist es das vorletzte Segment,
    // sonst das letzte.
    const file = rest[0] === "thumb" ? rest[rest.length - 2] : rest[rest.length - 1];
    if (!file) return null;
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=${MAX_WIDTH}`;
  } catch {
    return null;
  }
}

function extFor(url) {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "png";
  return "jpg"; // jpg/jpeg/JPG → als jpg speichern (Inhalt ist JPEG)
}

function download(url, depth = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (depth > 5) return reject(new Error("zu viele Redirects"));
        download(new URL(res.headers.location, url).toString(), depth + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        const err = new Error(`HTTP ${res.statusCode}`);
        err.status = res.statusCode;
        reject(err);
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.setTimeout(45000, () => req.destroy(new Error("timeout")));
  });
}

/** Download mit Retry/Backoff bei 429 (Rate-Limit). */
async function downloadRetry(url) {
  let wait = 800;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await download(url);
    } catch (err) {
      if (err.status === 429 && attempt < 3) {
        await sleep(wait);
        wait *= 2;
        continue;
      }
      throw err;
    }
  }
}

async function fetchImage(originalUrl) {
  const thumb = thumbUrl(originalUrl);
  const candidates = [thumb, originalUrl].filter(Boolean);
  let lastErr;
  for (const c of candidates) {
    try {
      return await downloadRetry(c);
    } catch (err) {
      lastErr = err;
      console.warn(`  ↪ Fehlschlag ${c}: ${err.message}`);
    }
  }
  throw new Error(`Kein Kandidat lud (${lastErr?.message}): ${originalUrl}`);
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const heroRe = /^heroImage:\s*["']?(https?:\/\/[^"'\s]+)["']?\s*$/m;

const cache = new Map(); // remoteUrl -> localPath
let downloaded = 0,
  rewritten = 0,
  skipped = 0;

const files = await walk(CONTENT);
for (const file of files) {
  const rel = file.slice(CONTENT.length + 1).replace(/\\/g, "/");
  const topDir = rel.split("/")[0];
  const bucket = BUCKET[topDir];
  if (!bucket) continue;
  const id = rel.split("/").pop().replace(/\.md$/, "");

  let text = await readFile(file, "utf8");
  const m = text.match(heroRe);
  if (!m) {
    skipped++;
    continue;
  }
  const remote = m[1];
  if (!remote.includes("upload.wikimedia.org")) {
    skipped++;
    continue;
  }

  const ext = extFor(remote);
  const localPath = `/images/${bucket}/${id}.${ext}`;
  const diskPath = join(PUBLIC_IMG, bucket, `${id}.${ext}`);

  if (!existsSync(diskPath)) {
    if (cache.has(remote) && existsSync(join(ROOT, "public", cache.get(remote)))) {
      // gleiches Remote-Bild bereits geladen (anderer Bucket) – überspringen
    } else {
      await mkdir(dirname(diskPath), { recursive: true });
      const buf = await fetchImage(remote);
      await writeFile(diskPath, buf);
      downloaded++;
      console.log(`⬇ ${bucket}/${id}.${ext}  (${(buf.length / 1024).toFixed(0)} KB)`);
      await sleep(350); // sanft gegen das Wikimedia-Rate-Limit
    }
  }
  cache.set(remote, localPath);

  const next = text.replace(heroRe, `heroImage: "${localPath}"`);
  if (next !== text) {
    await writeFile(file, next, "utf8");
    rewritten++;
  }
}

console.log(
  `\nFertig. Heruntergeladen: ${downloaded} · Frontmatter umgeschrieben: ${rewritten} · Übersprungen: ${skipped}`
);
