/**
 * Zentrale Site-Konfiguration für culture-castles.de.
 * Ersetzt das city.ts/categories.ts-Modell des Heidelberg-Templates.
 */

export const site = {
  brandName: "Culture Castles",
  tagline: "Burgen & Schlösser erleben",
  slug: "culture-castles",
  country: "Deutschland",
  defaultLocale: "de",
  domain: "https://culture-castles.de",
  email: "info@culture-castles.de",
  description: {
    short:
      "Culture Castles — dein kuratierter Reiseführer durch die schönsten Burgen, Schlösser und Festungen Europas: Geschichte, Besuchstipps, Führungen und Hotels in der Nähe.",
    long:
      "Culture Castles ist der kuratierte Reiseführer durch die schönsten Burgen, Schlösser und Festungen Europas. Wir verbinden Geschichte und Architektur mit handfesten Besuchstipps — beste Reisezeit, Führungen, Tickets und passende Hotels in Gehweite. Entdecke nach Region, folge fertig geplanten Routen oder lass dich von Erlebniswelten wie Schlosshochzeit, Familienausflug oder Übernachten im Schloss inspirieren.",
  },
};

/** Hauptnavigation — entspricht den Content-Clustern. */
export const nav = [
  { href: "/burgen/", label: "Burgen & Schlösser" },
  { href: "/regionen/", label: "Regionen" },
  { href: "/routen/", label: "Routen" },
  { href: "/erlebnisse/", label: "Erlebnisse" },
  { href: "/reiseplanung/", label: "Reiseplanung" },
  { href: "/magazin/", label: "Magazin" },
];

/** Erlebniswelten — Themen-Cluster über Burg-Tags (kein eigenes Collection). */
export type Experience = {
  slug: string;
  title: string;
  teaser: string;
  icon: string; // dekoratives Glyph
  tag: string; // Filter-Tag in castles.tags
  intro: string;
};

export const experiences: Experience[] = [
  {
    slug: "hochzeit-im-schloss",
    title: "Hochzeit im Schloss",
    teaser: "Traumkulissen für den schönsten Tag.",
    icon: "✦",
    tag: "hochzeit",
    intro:
      "Heiraten, wo einst Fürsten residierten: Schlösser und Burgen bieten die wohl romantischste Kulisse für die Trauung. Hier findest du die schönsten Häuser mit Trauzimmer, Park und Festsaal.",
  },
  {
    slug: "familienausflug",
    title: "Familienausflug",
    teaser: "Ritter, Drachen & Geschichte für Kinder.",
    icon: "❦",
    tag: "familie",
    intro:
      "Burgen sind das beste Freilicht-Klassenzimmer: Ritterspiele, Verliese, Türme zum Erklimmen. Diese Ziele begeistern große und kleine Entdecker gleichermaßen.",
  },
  {
    slug: "burgruinen",
    title: "Burgruinen",
    teaser: "Verwunschene Mauern und stille Pracht.",
    icon: "✧",
    tag: "ruine",
    intro:
      "Wo das Dach längst fehlt, beginnt die Romantik: Burgruinen erzählen von vergangener Macht und sind heute stille, atmosphärische Aussichtspunkte.",
  },
  {
    slug: "uebernachten-im-schloss",
    title: "Im Schloss übernachten",
    teaser: "Schlosshotels für eine königliche Nacht.",
    icon: "♛",
    tag: "uebernachten",
    intro:
      "Einmal schlafen wie Adel: Viele Schlösser sind heute stilvolle Hotels. Wir zeigen, wo du in historischen Mauern übernachten kannst — vom Turmzimmer bis zur Beletage.",
  },
  {
    slug: "maerchenschloesser",
    title: "Märchenschlösser",
    teaser: "Türmchen, Zinnen und Romantik pur.",
    icon: "♜",
    tag: "maerchen",
    intro:
      "Schlösser wie aus dem Bilderbuch: verspielte Türmchen, Erker und Zinnen. Diese Bauten haben Generationen von Märchen inspiriert.",
  },
  {
    slug: "mittelalterliche-burgen",
    title: "Mittelalterliche Burgen",
    teaser: "Wehrhaft, wuchtig, original erhalten.",
    icon: "⚔",
    tag: "mittelalter",
    intro:
      "Bergfried, Zwinger, Wehrgang: echte mittelalterliche Wehrbauten, in denen die Geschichte noch in jedem Stein spürbar ist.",
  },
];

export const getExperience = (slug: string) => experiences.find((e) => e.slug === slug);
