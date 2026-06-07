/**
 * AWIN — Affiliate-Deeplink-Infrastruktur für culture-castles.de
 * ===============================================================
 * Ergänzt src/data/affiliate.ts (Stay22 + GetYourGuide) um das
 * Awin-Netzwerk. Hier liegen Publisher-ID, Merchant-Konfiguration und
 * der Deeplink-Helper.
 *
 * AKTIVIERUNG IN 2 SCHRITTEN, sobald angenommen:
 *   1. `awin.publisherId` setzen  → deine Awin Publisher-/Affiliate-ID
 *      (= "awinaffid", findest du im Awin-Dashboard unter Account).
 *   2. Pro Merchant, für den du angenommen wurdest, die `mid` prüfen/
 *      eintragen (= Advertiser-/Merchant-ID, "awinmid"). Die hier
 *      vorbelegten mids sind die DE-Programm-IDs aus dem Awin-Marktplatz
 *      (Stand Recherche Juni 2026) — bitte im Dashboard gegenprüfen, da
 *      regionale Programmvarianten abweichende IDs haben.
 *
 * Graceful Degradation: Solange `publisherId` leer ist ODER ein Merchant
 * keine `mid` hat, gibt awinDeeplink() die unveränderte Ziel-URL zurück.
 * Links funktionieren also schon vor der Annahme — nur eben untracked.
 * Kein Snippet, kein Tracking-Pixel nötig: Awin trackt rein über den
 * cread.php-Klick-Redirect.
 */

export type AwinMerchant = {
  /** Awin Advertiser-/Merchant-ID ("awinmid"). Leer = noch nicht angenommen. */
  mid: string;
  /** Anzeigename. */
  name: string;
  /** Shop-Startseite (Default-Ziel, falls kein Deeplink-Pfad übergeben wird). */
  homepage: string;
  /** Awin-Merchant-Profil — hier bewirbst du dich um die Annahme. */
  applyUrl: string;
  /** Thematische Einordnung im Portal. */
  category:
    | "tickets"
    | "erlebnisse"
    | "uebernachten"
    | "anreise"
    | "buecher";
  /** Warum passt der Merchant zu Burgen/Schlössern? (für interne Doku) */
  fit: string;
  /** Grobe Provision laut Marktplatz (kann variieren). */
  commission: string;
  /** Priorität für Einbau (1 = zuerst). */
  priority: number;
};

export const awin = {
  /** ← Deine Awin Publisher-/Affiliate-ID (awinaffid). Nach Annahme eintragen. */
  publisherId: "",

  /** cread.php-Redirect-Basis (Awin Standard, nicht ändern). */
  creadBase: "https://www.awin1.com/cread.php",

  /**
   * Merchant-Katalog — kuratiert für ein Burgen-/Schlösser-Reiseportal.
   * mids sind vorbelegt, wo im Awin-Marktplatz eindeutig auffindbar;
   * "" = noch eintragen, sobald du für das Programm angenommen bist.
   */
  merchants: {
    tiqets: {
      mid: "8616",
      name: "Tiqets",
      homepage: "https://www.tiqets.com/de/",
      applyUrl: "https://ui.awin.com/merchant-profile/8616",
      category: "tickets",
      fit: "Sofort-Tickets für Schlösser, Burgen, Museen & Attraktionen — Kernprodukt für jede Burg-Detailseite.",
      commission: "bis ~6 %",
      priority: 1,
    },
    mydays: {
      mid: "14087",
      name: "mydays",
      homepage: "https://www.mydays.de/",
      applyUrl: "https://ui.awin.com/merchant-profile/14087",
      category: "erlebnisse",
      fit: "Erlebnisgeschenke: Ritteressen, Übernachtung im Schloss, Schloss-Hochzeitsarrangements — perfekt für /erlebnisse/.",
      commission: "variabel",
      priority: 1,
    },
    getyourguide: {
      mid: "18925",
      name: "GetYourGuide",
      homepage: "https://www.getyourguide.de/",
      applyUrl: "https://ui.awin.com/merchant-profile/18925",
      category: "tickets",
      fit: "Touren & Führungen. HINWEIS: GYG läuft bereits über das Direkt-Widget (affiliate.ts) — Awin nur, falls du es bündeln willst.",
      commission: "variabel",
      priority: 3,
    },
    holidaycheck: {
      mid: "13877",
      name: "HolidayCheck",
      homepage: "https://www.holidaycheck.de/",
      applyUrl: "https://ui.awin.com/merchant-profile/13877",
      category: "uebernachten",
      fit: "Hotelbewertungen & -buchung rund um Schloss-Regionen.",
      commission: "variabel",
      priority: 2,
    },
    belvilla: {
      mid: "12210",
      name: "Belvilla",
      homepage: "https://www.belvilla.de/",
      applyUrl: "https://ui.awin.com/merchant-profile/12210",
      category: "uebernachten",
      fit: "Ferienhäuser/-wohnungen in Burg-Regionen — Alternative zum Hotel (ergänzt Stay22).",
      commission: "ab ~5,5 %",
      priority: 2,
    },
    edomizil: {
      mid: "9160",
      name: "e-domizil",
      homepage: "https://www.e-domizil.de/",
      applyUrl: "https://ui.awin.com/merchant-profile/9160",
      category: "uebernachten",
      fit: "Großer Ferienwohnungs-Marktplatz, gute Abdeckung ländlicher Schloss-Regionen.",
      commission: "variabel",
      priority: 3,
    },
    bahn: {
      mid: "14964",
      name: "bahn.de",
      homepage: "https://www.bahn.de/",
      applyUrl: "https://ui.awin.com/merchant-profile/14964",
      category: "anreise",
      fit: "Klimafreundliche Anreise zu Burgen — passt zu Routen-/Reiseplanung-Seiten.",
      commission: "pro Buchung",
      priority: 3,
    },
    bahncard: {
      mid: "13853",
      name: "BahnCard",
      homepage: "https://www.bahn.de/angebot/bahncard",
      applyUrl: "https://ui.awin.com/merchant-profile/13853",
      category: "anreise",
      fit: "Höhere Provision pro Abschluss; sinnvoll im Reiseplanung-Hub.",
      commission: "pro Abschluss",
      priority: 4,
    },
    thalia: {
      mid: "14158",
      name: "Thalia",
      homepage: "https://www.thalia.de/",
      applyUrl: "https://ui.awin.com/merchant-profile/14158",
      category: "buecher",
      fit: "Reiseführer, Burgen-/Geschichts- & Architekturbücher — natürlicher Fit fürs Magazin.",
      commission: "4–11 %",
      priority: 2,
    },
    jochenschweizer: {
      mid: "", // im Awin-Marktplatz suchen & eintragen, sobald angenommen
      name: "Jochen Schweizer",
      homepage: "https://www.jochen-schweizer.de/",
      applyUrl: "https://www.awin.com/de",
      category: "erlebnisse",
      fit: "Erlebnis-Marktplatz (mittelalterliche Erlebnisse, Schloss-Dinner) — Alternative/Ergänzung zu mydays.",
      commission: "variabel",
      priority: 3,
    },
  },
} satisfies {
  publisherId: string;
  creadBase: string;
  merchants: Record<string, AwinMerchant>;
};

export type AwinMerchantKey = keyof typeof awin.merchants;

/** True, sobald eine Publisher-ID hinterlegt ist. */
export const awinEnabled = awin.publisherId.length > 0;

/**
 * Baut einen Awin-Deeplink (cread.php-Redirect).
 *
 * @param merchant      Key aus awin.merchants (z.B. "tiqets")
 * @param destination   Ziel-URL beim Merchant. Optional — Default: Merchant-Homepage.
 *                      Beliebige Produkt-/Such-/Kategorie-URL des Shops möglich.
 * @param clickref      Optionale Sub-ID fürs eigene Reporting (z.B. Seiten-Slug).
 * @returns             Tracking-Deeplink, oder die unveränderte Ziel-URL als
 *                      Fallback, solange publisherId/mid fehlen (Links bleiben nutzbar).
 *
 * @example
 *   awinDeeplink("tiqets", "https://www.tiqets.com/de/neuschwanstein-c66027/", "schloss-neuschwanstein")
 */
export function awinDeeplink(
  merchant: AwinMerchantKey,
  destination?: string,
  clickref?: string,
): string {
  const m = awin.merchants[merchant];
  const dest = destination ?? m?.homepage ?? "";

  // Fallback: ohne Publisher-ID oder Merchant-ID → ungetrackte Ziel-URL.
  if (!awin.publisherId || !m || !m.mid) return dest;

  const params = new URLSearchParams({
    awinmid: m.mid,
    awinaffid: awin.publisherId,
    ued: dest,
  });
  if (clickref) params.set("clickref", clickref.slice(0, 100));

  return `${awin.creadBase}?${params.toString()}`;
}

/** Pflicht-Attribute für Affiliate-Links (rechtlich + SEO). */
export const AFFILIATE_REL = "sponsored nofollow noopener";

/**
 * Kuratierte, priorisierte Empfehlungsliste (für Doku / ein künftiges
 * "Partner"-Listing). Reihenfolge = Einbau-Priorität.
 */
export const recommendedMerchants: AwinMerchantKey[] = (
  Object.keys(awin.merchants) as AwinMerchantKey[]
).sort((a, b) => awin.merchants[a].priority - awin.merchants[b].priority);
