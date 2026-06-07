# culture-castles.de

Reiseportal für **Burgen, Schlösser & Festungen** — Astro 5 + Tailwind 4, statischer Build.
Design: „Gothic Manuscript" in der Palette **Königsburgunder** (Wein-Schwarz, Champagnergold, Creme).

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:4392
npm run build    # statischer Build nach dist/
```

## Architektur

- **Content Collections** (`src/content/`): `castles`, `regions`, `routes`, `articles` — Schema in `src/content.config.ts`
- **Seiten** (`src/pages/`): Startseite, `/burgen/` + `[slug]`, `/regionen/`, `/routen/`, `/erlebnisse/`, `/magazin/`, `/reiseplanung/`, `/ueber-uns/`, `/kontakt/`, `/suche/`
- **Design-Tokens**: `src/styles/brand.css` (überschreibt die neutralen Tokens aus `global.css`)
- **Affiliate**: Stay22 + GetYourGuide (`src/data/affiliate.ts`), Awin-Deeplinks (`src/data/products.ts` + `AwinButton.astro`)

## Bestandsseiten / SEO

- Legacy-301-Redirects der alten WordPress-URLs in `public/_redirects` (Cloudflare-Format)
- **7 Bestandsseiten mit bezahlten Dofollow-Outbound-Links** wurden 1:1 an identischer URL übernommen (via `src/layouts/LegacyArticle.astro`) — diese **nicht** umleiten oder entfernen.

## Vor Go-Live noch einzutragen

- `src/data/affiliate.ts` → Stay22 `lmaId` (aktuell Platzhalter)
- `src/data/products.ts` → Awin `publisherId` + Merchant-`mid`s
- `src/pages/kontakt.astro` → web3forms `access_key`
- Hosting/Deploy ist bewusst **noch nicht** eingerichtet.
