# culture-castles.de — BUILD CONTRACT (single source of truth)

Astro 5 + Tailwind 4, static output, `trailingSlash: "always"`. Design = "Gothic Manuscript",
Palette **Königsburgunder** (Wein-Schwarz + Champagnergold + Creme). Visual reference mockup:
`/Users/joshuastark/Documents/Claude Code/city-portal-template/culture-castles-startseite-mockup.html`
(Read it to match the look — same fonts, spacing, ghost components, 0px radius.)

## Design tokens (defined in src/styles/brand.css — USE THESE, never hardcode hex)
- `--cc-bg #2a121a` page bg · `--cc-bg-2 #341721` surface · `--cc-text #f0e6d6` text
- `--cc-text-soft #cbb6a6` secondary · `--cc-text-mute #a98b86` tertiary
- `--cc-accent #cdab6d` gold · `--cc-accent-hi #e0c489` · `--cc-line #6e3b48` borders
- Fonts: `--font-display` (Cormorant Garamond, headlines, weight 300), `--font-sans` (Lora, body),
  `--font-aux` (Old Standard TT, eyebrows/labels — uppercase + letter-spacing), `--font-serif2` (Playfair Display, italic accents)
- Radius = 0 everywhere. No box-shadows. Thin 1px gold/burgundy rules. Generous whitespace.
- Helper class `.cc-rule` (+ `<span class="mark">TEXT</span>`) renders an ornament divider with centered text.
- `.container-page` = centered max-w-7xl with padding. Use it for all page content width.

## Content Collections (already defined in src/content.config.ts) — author Markdown into these
Frontmatter is YAML. Body (after frontmatter `---`) is the long-form prose (Markdown).

### castles → src/content/castles/<slug>.md
Required: `title, region (region slug), teaser, heroImage`. Optional but author them:
`place, country, type (Burg|Schloss|Festung|Residenz|Ruine), epoch, built, lord, heroCredit{author,license,licenseUrl,sourceUrl}, gallery[], visit{duration,price,bestTime,hours}, coordinates[lat,lng], gygQuery, stayQuery, highlights[], tags[], featured, castleOfMonth, rank, faq[{q,a}]`.
Body = 4–7 German paragraphs with `##` H2 sections (Geschichte, Architektur, Besuch & Tipps).

### regions → src/content/regions/<slug>.md
`title, country, order (number, lower=first), teaser, heroImage, heroCredit`. Body = 2–3 paragraphs.

### routes → src/content/routes/<slug>.md
`title, distanceKm, stops, days, teaser, heroImage, heroCredit, featured, etappen[{title, castle?, note?}]`. Body = intro + per-stage prose.

### articles → src/content/articles/<slug>.md
`title, date (YYYY-MM-DD), category (Geschichte|Fotografie|Ratgeber|Hochzeit), teaser, heroImage, heroCredit, cluster, legacyUrl, tags[]`. Body = full article with `##` sections.

## REAL PHOTO PROTOCOL (mandatory — "echte Fotos")
For each needed image, fetch a real, hotlinkable Wikimedia photo via the German Wikipedia REST API:
1. `WebFetch` URL: `https://de.wikipedia.org/api/rest_v1/page/summary/<ARTICLE>` (ARTICLE = URL-encoded German Wikipedia article title, e.g. `Schloss_Neuschwanstein`).
2. From the JSON use `originalimage.source` (preferred) or `thumbnail.source` as the image URL — these are direct `upload.wikimedia.org` URLs that always render.
3. Set `heroCredit`: `author: "Wikimedia Commons"`, `license: "siehe Quelle"`, `sourceUrl:` the value of `content_urls.desktop.page`.
4. If a fetch fails, set `heroImage` to `""` (components fall back to a burgundy gradient automatically) — never invent a URL.

## COMPONENTS — build under src/components/ (Astro). Props are TypeScript interfaces in the frontmatter.
All must be dark-theme, token-based, 0px radius. Mobile-first responsive.

- **CastleImage.astro** — `{ src?:string; alt:string; class?:string }`. Renders a `<div class={class} style="background: var(--hue-1)">` containing `<img src={src} alt={alt} loading="lazy" onerror="this.style.display='none'" style="width:100%;height:100%;object-fit:cover" />` ONLY if `src`. So a missing/broken image gracefully shows the burgundy gradient. EVERY remote photo in other components must go through CastleImage.
- **Band.astro** — `{ id?:string; soft?:boolean; class?:string }`. `<section>` wrapper, vertical padding ~ py-20/28, optional `background: var(--cc-bg-2)` when soft. Renders `<div class="container-page"><slot/></div>`.
- **SectionHead.astro** — `{ kicker?:string; title:string; subtitle?:string; align?:"center"|"left" }`. kicker in --font-aux uppercase gold tracking-.36em; title --font-display clamp(34px,5vw,56px) weight 300; subtitle --cc-text-soft. Centered by default, max-w ~680px mx-auto.
- **OrnamentRule.astro** — `{ label?:string }`. Renders `<div class="cc-rule"><span class="mark">{label}</span></div>` (label optional).
- **CastleCard.astro** — `{ href; title; region?; teaser?; image?; imageAlt?; rank?; type? }`. Outlined card (1px --cc-line, hover gold + translateY -3px), top image via CastleImage (h-52), optional rank badge (square, 1px gold, --font-display) top-left, region eyebrow (--font-aux gold), title --font-display 27px, teaser --cc-text-soft, "Profil ansehen →" in gold --font-aux.
- **FeatureCastle.astro** ("Schloss des Monats") — `{ href; title; image; place?; epoch?; teaser; meta?:{label:string;value:string}[]; tagLabel?:string }`. 2-col (media | body) inside 1px --cc-line border. Tag chip on image (gold bg, dark text). Body: place eyebrow, title 46px, epoch in --font-serif2 italic, teaser, meta row, two buttons (".btn-ghost" + a gold-filled ghost). Stacks on mobile.
- **RegionGrid.astro** — `{ regions:{href:string;title:string;count?:number;num:string}[] }`. 4-col (2 on mobile) grid with 1px gridlines (gap:1px on --cc-line bg). Each cell: num (--font-aux gold), title --font-display 30px, count "(N Bauwerke)".
- **RouteCard.astro** — `{ href; title; image?; meta?:string; teaser? }`. min-h ~320px, full-bleed CastleImage darkened, content bottom-aligned: meta (--font-aux gold uppercase), title --font-display 38px, teaser.
- **ExperienceGrid.astro** — `{ items:{href:string;title:string;teaser:string;icon:string}[] }`. 4-col (2/1 responsive). Each: centered, big gold glyph (icon), title --font-display 25px, teaser. 1px border, hover gold.
- **MagazineCard.astro** — `{ href; title; date:string; category?:string; teaser? }`. border-top 1px --cc-line, date+category in --font-aux gold uppercase, title --font-display 28px, teaser, "Weiterlesen →".
- **Newsletter.astro** — no props. Centered block, 1px --cc-line border, soft bg, ornament glyphs "❧ ⚜ ❧", title "Der Burgbrief" --font-display, lead, email form (input + gold submit). Non-functional form ok (action="#").
- **StaySection.astro** — `{ title?; lead?; lat?:number; lng?:number }`. Two-col block, 1px gold border. Left: kicker "Übernachten am Schloss", title, lead, a `.btn-ghost` gold CTA. Right: renders `<Stay22Map>` (import from "./Stay22Map.astro") passing `lat`/`lng`/zoom=14 when given, else a styled placeholder. Heading "Schlaf, wo Könige geherrscht haben." as default title.
- **Hero.astro** — `{ eyebrow?; titleHtml:string; lead?; image?; stats?:{v:string;l:string}[]; showSearch?:boolean }`. Full-bleed (min-h ~88vh) CastleImage bg darkened by a wine veil gradient. Content in .container-page: eyebrow (--font-aux gold .42em), h1 --font-display weight 300 clamp(48px,8.5vw,108px) with `set:html={titleHtml}` (so `<em>` renders gold italic), lead, optional search bar (input + gold "Entdecken" button linking to /suche/), optional stats row (big --font-display numbers + --font-aux labels).

## PAGES — build under src/pages/. Every page uses BaseLayout. Pattern for collections:
```astro
---
import { getCollection } from "astro:content";
import BaseLayout from "../layouts/BaseLayout.astro";
const castles = await getCollection("castles");
---
```
For `[slug].astro` detail pages use:
```astro
export async function getStaticPaths() {
  const entries = await getCollection("castles");
  return entries.map((e) => ({ params: { slug: e.id }, props: { entry: e } }));
}
const { entry } = Astro.props;
const { Content } = await entry.render();  // renders the Markdown body
```
(`e.id` is the filename without extension = the slug.)

Pages to build:
1. `index.astro` — homepage. Compose: Hero (featured+castleOfMonth castle as bg) → FeatureCastle (castleOfMonth) → Band+SectionHead "Beliebte Burgen" + CastleCard grid (featured, max 6, with rank) → Band "Nach Region" + RegionGrid (regions sorted by order, count = castles in region) → Band "Routen" + RouteCard grid (featured routes) → OrnamentRule "Erlebniswelten" + ExperienceGrid (first 4 from site.experiences) → StaySection → Band "Aus dem Magazin" + MagazineCard grid (latest 3 articles) → Newsletter → ImageCreditsList (collect heroCredit of shown castles). Match the mockup section order.
2. `burgen/index.astro` — overview: Hero-lite/SectionHead "Alle Burgen & Schlösser", CastleCard grid of ALL castles (sorted: featured first then title). Simple region filter chips (anchor links to /regionen/<slug>/) optional.
3. `burgen/[slug].astro` — castle detail: breadcrumb (Start › Burgen › title), hero image, H1 title + place/epoch, intro teaser, `<Content/>` body in a readable prose column (max-w ~70ch, --cc-text), highlights list, visit info box, FAQ (details/summary), GetYourGuide via `<Stay22Map lat lng zoom=14>` for "Hotels in der Nähe" + a gold CTA to gygQuery search, "Mehr in <Region>" related CastleCard row, ImageCreditsList. Use `--font-sans` for body prose.
4. `regionen/index.astro` — RegionGrid / cards of all regions with counts + teaser.
5. `regionen/[slug].astro` — region hub: hero, intro (region body), CastleCard grid of castles where `data.region === slug`.
6. `routen/index.astro` — RouteCard grid of all routes.
7. `routen/[slug].astro` — route detail: hero, intro body, numbered etappen list (each links to its castle if `castle` slug given), StaySection.
8. `erlebnisse/index.astro` — ExperienceGrid of ALL site.experiences (import `{ experiences } from "../data/site"`).
9. `erlebnisse/[slug].astro` — getStaticPaths over `experiences` (from site.ts, not a collection): for each, show intro + CastleCard grid of castles whose `data.tags` includes `experience.tag`.
10. `magazin/index.astro` — MagazineCard grid of all non-draft articles, newest first.
11. `magazin/[slug].astro` — article detail: hero, H1, date/category, `<Content/>` prose, related (same cluster) links.
12. `reiseplanung/index.astro` — planning hub: intro, links to Routen + Regionen + Erlebnisse as cards, "beste Reisezeit" tips, StaySection. Editorial/utility page.
13. `ueber-uns.astro` — about page: manuscript intro about Culture Castles' mission (use site.description.long), values, no fake team.
14. `kontakt.astro` — contact: `noindex`, web3forms form (action `https://api.web3forms.com/submit`, keep a placeholder access_key `REPLACE_WEB3FORMS_KEY`, subject "Anfrage culture-castles.de"), styled dark. import `{ site }`.
15. `suche.astro` — search results page, `noindex`. At build, assemble a JSON index of all castles+articles+routes (title, type, href, teaser) and embed via `define:vars` or a `<script>` JSON blob; client-side filter on input, render result list. Read query from `?q=`.

Also: lightly rebrand `impressum.astro` & `datenschutz.astro` text from Heidelberg/Top10 to Culture Castles (they import `{ legal }` from data/legal — keep). Generate `public/_redirects` (Cloudflare format `OLD  NEW  301`) mapping every legacy `/burgen-und-schloesser/<slug>/` URL to its closest new target. Known legacy slugs: geschichte-deutscher-burgen, schloesser-in-bayern, europaeische-schloesser, burgfuehrungen-deutschland, mittelalterliche-burgen, burgruinen-deutschland, familienausflug-burg, schlossfuehrungen, romantische-schloesser, burgen-in-deutschland. Map article-like ones to /magazin/<slug>/, region-like to /regionen/<slug>/, theme-like to /erlebnisse/<slug>/, and the bare hub /burgen-und-schloesser/ → /burgen/.

## QUALITY BARS
- German throughout, no Lorem ipsum, no Heidelberg leftovers.
- Never hardcode hex — use `var(--cc-*)`. Square corners. No emoji as content icons except the dingbat glyphs already in site.experiences.
- Components must not crash on missing optional props (guard with `&&`).
- Return ONLY after writing the file(s). Your final message = a one-line summary of what you wrote.
