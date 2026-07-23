/**
 * outbound-gate - Astro-Integration
 *
 * Zweck: Bots (Crawler, Link-Checker, SEO-Tools, Scraper) sollen Affiliate-Links
 * nicht mehr aufrufen. Bot-Klicks verwaessern die Conversion-Rate in den Netzwerken
 * und koennen Partnerprogramme kosten. Echte Nutzer sollen dagegen voellig
 * unveraendert konvertieren.
 *
 * Mechanik (laeuft komplett auf dem fertigen Build, `astro:build:done`):
 *  1. Jeder <a href> auf einen Partner-/Tracking-Host wird zu `/go/?u=<base64url>`.
 *     Die echte Ziel-URL steht danach nirgends mehr als crawlbarer href im HTML.
 *  2. `/go/index.html` leitet AUSSCHLIESSLICH per JavaScript weiter - kein
 *     Meta-Refresh, kein 301. Simple Scraper und Link-Checker folgen dem nicht.
 *     Eine eingebettete Host-Allowlist verhindert, dass /go/ ein offener
 *     Redirector wird.
 *  3. robots.txt bekommt `Disallow: /go/`.
 *  4. Ein `affiliate_click`-Listener wird injiziert, der das Ziel clientseitig
 *     wieder dekodiert und in den dataLayer pusht - das Tracking bleibt also
 *     exakt so erhalten wie vorher (GTM-Trigger `affiliate_click`).
 *  5. Alte Gates werden mitgenommen: bestehende /r/- oder /go/-Slug-Seiten mit
 *     Meta-Refresh werden auf denselben JS-only-Redirect gehaertet, und interne
 *     Links darauf laufen ueber das neue Gate, damit sie getrackt werden.
 *
 * Bewusst NICHT angefasst: iframe-/script-/img-src. Rechner, Karten und Widgets
 * (FinanceAds, Stay22, GetYourGuide, AdSense) bleiben unveraendert.
 *
 * Einbau in astro.config.mjs:
 *   import outboundGate from './integrations/outbound-gate.mjs';
 *   integrations: [sitemap(), outboundGate()]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Partner-/Tracking-Hosts. Amazon wird zusaetzlich ueber `tag=` erkannt. */
export const AFFILIATE_HOSTS = [
  'awin1.com', 'awin.com', 'zenaps.com',
  'adcell.com', 'adcell.de',
  'financeads.net', 'financeads.com',
  'neqty.net',
  'performancehero.de',
  'digidip.net',
  'amzn.to', 'amazon-adsystem.com',
  'digistore24.com', 'digistore24.eu',
  'joturl.com', 'jo.my',
  'tradedoubler.com', 'clk.tradedoubler.com',
  'belboon.de', 'belboon.com',
  'webgains.com', 'track.webgains.com',
  'partner-ads.com',
  'shareasale.com', 'linksynergy.com',
  'tradetracker.net', 'adtraction.com', 'daisycon.io',
  'zanox.com', 'affilinet.de',
  'clickbank.net', 'hop.clickbank.net',
  'anrdoezrs.net', 'dpbolvw.net', 'jdoqocy.com', 'kqzyfj.com', 'tkqlhce.com',
  'awin1.de',
];

/** Amazon-Storefronts: nur mit Partner-Tag ist es ein Affiliate-Link. */
const AMAZON_RE = /^(?:www\.)?amazon\.(?:de|com|co\.uk|fr|it|es|nl|se|pl|at|ch|ca)$/i;

const B64 = { '+': '-', '/': '_' };

function encodeTarget(url) {
  return Buffer.from(encodeURIComponent(url), 'utf8')
    .toString('base64')
    .replace(/[+/]/g, (c) => B64[c])
    .replace(/=+$/, '');
}

/** HTML-Entities aus einem Attributwert zurueckdrehen (`&amp;` -> `&`). */
function unescapeAttr(v) {
  return v
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function makeMatcher(hosts) {
  return function isAffiliate(url) {
    let u;
    try {
      u = new URL(url);
    } catch {
      return false;
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.replace(/^www\./, '');
    if (hosts.some((h) => host === h || host.endsWith('.' + h))) return true;
    // Amazon nur als Partnerlink werten, wenn ein Tag dranhaengt.
    if (AMAZON_RE.test(u.hostname) && u.searchParams.has('tag')) return true;
    return false;
  };
}

const TRACKER_MARKER = 'outbound-gate:tracker';

function trackerSnippet(eventName, goPath) {
  return `<script>/* ${TRACKER_MARKER} */(function(){if(window.__outboundGate)return;window.__outboundGate=1;` +
    `var P=${JSON.stringify(goPath + '?u=')};` +
    `function d(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';try{return decodeURIComponent(atob(s))}catch(e){return null}}` +
    `function h(u){try{return new URL(u,location.href).hostname.replace(/^www\\./,'')}catch(e){return null}}` +
    `function t(ev){var a=ev.target&&ev.target.closest?ev.target.closest('a[href]'):null;if(!a)return;` +
    `var r=a.getAttribute('href')||'';if(r.indexOf(P)!==0)return;var g=d(r.slice(P.length));if(!g)return;` +
    `window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:${JSON.stringify(eventName)},` +
    `affiliate_host:h(g),affiliate_url:g,affiliate_label:(a.textContent||'').trim().slice(0,120),page_path:location.pathname});}` +
    `document.addEventListener('click',t,true);document.addEventListener('auxclick',function(e){if(e.button===1)t(e)},true);})();</script>`;
}

function gatePage(hosts, goPath, siteName) {
  const allow = JSON.stringify(hosts);
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="origin">
<title>Weiterleitung${siteName ? ' – ' + siteName : ''}</title>
<style>body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#4a5568;background:#f7fafc;text-align:center;padding:1.5rem}</style>
</head>
<body>
<p id="m">Weiterleitung zum Anbieter …</p>
<noscript><p>Für die Weiterleitung wird JavaScript benötigt. Bitte aktiviere JavaScript und lade die Seite neu.</p></noscript>
<script>
(function(){
var H=${allow};
var AMZ=/^(?:www\\.)?amazon\\.(?:de|com|co\\.uk|fr|it|es|nl|se|pl|at|ch|ca)$/i;
function d(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return decodeURIComponent(atob(s));}
function ok(u){try{var x=new URL(u);if(x.protocol!=='https:'&&x.protocol!=='http:')return false;
var h=x.hostname.replace(/^www\\./,'');
for(var i=0;i<H.length;i++){if(h===H[i]||h.endsWith('.'+H[i]))return true;}
if(AMZ.test(x.hostname)&&x.searchParams.get('tag'))return true;}catch(e){}return false;}
var raw=new URLSearchParams(location.search).get('u'),t='';
try{t=raw?d(raw):'';}catch(e){t='';}
if(t&&ok(t)){location.replace(t);}else{document.getElementById('m').textContent='Ungültiger Link – zurück zur Startseite …';location.replace('/');}
})();
</script>
</body>
</html>
`;
}

function walkHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, out);
    else if (e.isFile() && p.endsWith('.html')) out.push(p);
  }
  return out;
}

export default function outboundGate(options = {}) {
  const goPath = options.goPath ?? '/go/';
  const eventName = options.event ?? 'affiliate_click';
  const hosts = [...AFFILIATE_HOSTS, ...(options.extraHosts ?? [])];
  const legacyDirs = options.legacyDirs ?? ['r', 'go', 'out', 'link'];
  const injectTracker = options.injectTracker !== false;
  const isAffiliate = makeMatcher(hosts);

  return {
    name: 'outbound-gate',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const files = walkHtml(outDir);

        // --- 1. Alte Slug-Gates (/r/<slug>, /go/<slug>) einsammeln und haerten.
        //        Die Slug->Ziel-Map erlaubt es, interne Links darauf spaeter auf
        //        das neue Gate umzubiegen, damit sie wieder getrackt werden.
        const legacy = new Map();
        const legacyRe = /(?:content\s*=\s*["']\s*\d+\s*;\s*url=([^"']+)["']|location\.replace\(\s*["']([^"']+)["'])/i;
        for (const f of files) {
          const rel = '/' + path.relative(outDir, f).split(path.sep).join('/');
          const seg = rel.split('/')[1];
          if (!legacyDirs.includes(seg)) continue;
          if (rel === goPath + 'index.html') continue;
          const html = fs.readFileSync(f, 'utf8');
          const m = legacyRe.exec(html);
          if (!m) continue;
          const target = unescapeAttr(m[1] || m[2] || '').trim();
          if (!isAffiliate(target)) continue;
          const slug = rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
          legacy.set(slug, target);
          fs.writeFileSync(f, gatePage(hosts, goPath, options.siteName), 'utf8');
        }

        // --- 2. Affiliate-hrefs (und Links auf alte Slug-Gates) umschreiben.
        const hrefRe = /href\s*=\s*"([^"]+)"/gi;
        let rewritten = 0, legacyLinks = 0, touched = 0, withOwnTracker = 0;

        for (const f of files) {
          const rel = '/' + path.relative(outDir, f).split(path.sep).join('/');
          const seg = rel.split('/')[1];
          const isGate = legacyDirs.includes(seg) || rel === goPath + 'index.html';
          let html = fs.readFileSync(f, 'utf8');
          const before = html;

          if (!isGate) {
            html = html.replace(hrefRe, (match, rawValue) => {
              const value = unescapeAttr(rawValue).trim();
              if (isAffiliate(value)) {
                rewritten++;
                return `href="${goPath}?u=${encodeTarget(value)}"`;
              }
              const key = value.endsWith('/') || value.includes('.') ? value : value + '/';
              const target = legacy.get(key) ?? legacy.get(value + '/') ?? legacy.get(value);
              if (target) {
                legacyLinks++;
                return `href="${goPath}?u=${encodeTarget(target)}"`;
              }
              return match;
            });
          }

          // --- 3. Tracker injizieren (nur wenn die Seite nicht schon einen
          //        eigenen affiliate_click-Listener mitbringt -> kein Doppelzaehlen).
          if (injectTracker && !isGate && html.includes('</body>')) {
            if (html.includes(TRACKER_MARKER)) {
              // schon drin
            } else if (html.includes(eventName)) {
              withOwnTracker++;
            } else {
              html = html.replace('</body>', trackerSnippet(eventName, goPath) + '</body>');
            }
          }

          if (html !== before) {
            fs.writeFileSync(f, html, 'utf8');
            touched++;
          }
        }

        // --- 4. Gate-Seite schreiben.
        const gateDir = path.join(outDir, goPath.replace(/^\/|\/$/g, ''));
        fs.mkdirSync(gateDir, { recursive: true });
        fs.writeFileSync(path.join(gateDir, 'index.html'), gatePage(hosts, goPath, options.siteName), 'utf8');

        // --- 5. robots.txt: Disallow ergaenzen.
        const robots = path.join(outDir, 'robots.txt');
        if (fs.existsSync(robots)) {
          let txt = fs.readFileSync(robots, 'utf8');
          if (!new RegExp(`^\\s*Disallow:\\s*${goPath}`, 'mi').test(txt)) {
            if (/^User-agent:\s*\*/mi.test(txt)) {
              txt = txt.replace(/^(User-agent:\s*\*.*)$/mi, `$1\nDisallow: ${goPath}`);
            } else {
              txt = `User-agent: *\nDisallow: ${goPath}\n\n` + txt;
            }
            fs.writeFileSync(robots, txt, 'utf8');
          }
        } else {
          logger.warn(`keine robots.txt in dist - "Disallow: ${goPath}" bitte manuell/ueber den Host setzen`);
        }

        // --- 6. Sitemap: /go/ darf nicht drin stehen.
        for (const f of fs.readdirSync(outDir)) {
          if (!/^sitemap.*\.xml$/.test(f)) continue;
          const p = path.join(outDir, f);
          const xml = fs.readFileSync(p, 'utf8');
          const cleaned = xml.replace(new RegExp(`<url>(?:(?!<\\/url>)[\\s\\S])*?<loc>[^<]*${goPath}[^<]*<\\/loc>[\\s\\S]*?<\\/url>`, 'g'), '');
          if (cleaned !== xml) fs.writeFileSync(p, cleaned, 'utf8');
        }

        logger.info(
          `${rewritten} Affiliate-Links -> ${goPath}` +
          (legacyLinks ? `, ${legacyLinks} Alt-Gate-Links umgebogen` : '') +
          (legacy.size ? `, ${legacy.size} Alt-Gate-Seiten gehaertet` : '') +
          `, ${touched} Dateien angefasst` +
          (withOwnTracker ? `, ${withOwnTracker} Seiten mit eigenem ${eventName}-Listener (Tracker nicht injiziert)` : '')
        );
      },
    },
  };
}
