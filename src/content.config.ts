/**
 * Content Collections für culture-castles.de (Astro 5, glob loader).
 *
 *   castles   → src/content/castles/*.md     Burg-/Schloss-Profile
 *   regions   → src/content/regions/*.md      Regions-Hubs
 *   routes    → src/content/routes/*.md       Reiserouten / Roadtrips
 *   articles  → src/content/articles/*.md     Magazin / Ratgeber (SEO-Cluster)
 *
 * Schemas sind bewusst tolerant (Defaults), damit fan-out-authored
 * Content auch bei kleinen Auslassungen baut.
 */
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const credit = z
  .object({
    author: z.string().default("Unbekannt"),
    license: z.string().optional(),
    licenseUrl: z.string().optional(),
    sourceUrl: z.string().optional(),
  })
  .optional();

const castleSchema = z.object({
    title: z.string(),
    region: z.string(), // Region-Slug (→ regions collection)
    place: z.string().optional(), // Ort/Landstrich für Eyebrow
    country: z.string().default("Deutschland"),
    type: z.string().default("Schloss"), // Burg | Schloss | Festung | Residenz | Ruine
    epoch: z.string().optional(), // z.B. "Romantik, 19. Jh."
    built: z.string().optional(), // z.B. "1869–1886"
    lord: z.string().optional(), // Bauherr / Dynastie
    teaser: z.string(),
    heroImage: z.string(),
    heroCredit: credit,
    gallery: z.array(z.string()).default([]),
    visit: z
      .object({
        duration: z.string().optional(),
        price: z.string().optional(),
        bestTime: z.string().optional(),
        hours: z.string().optional(),
      })
      .default({}),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
    gygQuery: z.string().optional(), // GetYourGuide-Suchbegriff
    stayQuery: z.string().optional(), // Stay22-Ort für Hotels in der Nähe
    highlights: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]), // hochzeit, familie, ruine, maerchen, mittelalter, uebernachten …
    featured: z.boolean().default(false),
    castleOfMonth: z.boolean().default(false),
    rank: z.number().optional(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
});

const castles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/castles" }),
  schema: castleSchema,
});

// Englische Übersetzungen (gleiche Slugs wie de). Top-Burgen zuerst.
const castlesEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/castles-en" }),
  schema: castleSchema,
});

const regionSchema = z.object({
    title: z.string(),
    country: z.string().default("Deutschland"),
    order: z.number().default(99),
    teaser: z.string(),
    heroImage: z.string(),
    heroCredit: credit,
});

const regions = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/regions" }),
  schema: regionSchema,
});
const regionsEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/regions-en" }),
  schema: regionSchema,
});

const routeSchema = z.object({
    title: z.string(),
    distanceKm: z.number().optional(),
    stops: z.number().optional(),
    days: z.string().optional(),
    teaser: z.string(),
    heroImage: z.string(),
    heroCredit: credit,
    featured: z.boolean().default(false),
    etappen: z
      .array(z.object({ title: z.string(), castle: z.string().optional(), note: z.string().optional() }))
      .default([]),
});

const routes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/routes" }),
  schema: routeSchema,
});
const routesEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/routes-en" }),
  schema: routeSchema,
});

const articleSchema = z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.string().default("Ratgeber"), // Geschichte | Fotografie | Ratgeber | Hochzeit
    teaser: z.string(),
    heroImage: z.string(),
    heroCredit: credit,
    cluster: z.string().optional(), // Pillar-Cluster-Zuordnung
    legacyUrl: z.string().optional(), // alte WP-URL für 301
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: articleSchema,
});
const articlesEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles-en" }),
  schema: articleSchema,
});

export const collections = { castles, castlesEn, regions, regionsEn, routes, routesEn, articles, articlesEn };
