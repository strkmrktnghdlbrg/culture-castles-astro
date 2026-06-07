/**
 * Stay22 Direct Travel API — Helper
 * ----------------------------------
 * Build-Time-Fetch von Live-Hotel-Daten via /v1/accommodations.
 *
 * Patterns aus dem Stay22 Playbook:
 *   - X-API-Key Header
 *   - 60min HTTP-Caching erlaubt (KEIN persistenter DB-Storage)
 *   - Build-Time + GitHub-Action-Cron-Rebuild alle 6h (siehe
 *     .github/workflows/rebuild.yml für die Vorlage)
 *
 * WICHTIG: Die API antwortet HTTP 400, wenn `address` Umlaute enthält.
 * Wir transliterieren automatisch (ä→ae, ö→oe, ü→ue, ß→ss).
 *
 * Env-Var: STAY22_API_KEY
 *   Wenn nicht gesetzt: Helper gibt null zurück (graceful degradation),
 *   alle Stay22-Live-Komponenten verstecken sich dann automatisch.
 *
 * Schema-Normalisierung:
 *   Die Roh-Antwort hat verschachtelte Felder (location.coordinates.lat,
 *   rating.value, media.thumbnail, links.url). Wir flachen das im Helper
 *   zu einer einheitlichen `Stay22Accommodation` ab, damit Components
 *   nicht die Schema-Quirks kennen müssen.
 */

export interface Stay22Accommodation {
  id?: string;
  name: string;
  type?: string;
  image?: string;
  /** Vollständige Affiliate-URL inkl. lmaID — direkt im href verwenden. */
  link?: string;
  rating?: {
    /** 0–10. */
    score?: number;
    count?: number;
  };
  starRating?: number;
  price?: {
    /** Gesamtpreis für den Zeitraum, in der angefragten Währung. */
    total?: number;
    /** Preis pro Nacht (errechnet). */
    perNight?: number;
    currency?: string;
    formattedTotal?: string;
    formattedPerNight?: string;
  };
  address?: {
    full?: string;
    cityName?: string;
    areaName?: string;
  };
  distance?: number;
  geo?: { lat?: number; lng?: number };
  policies?: { freeCancellation?: boolean; instantBook?: boolean };
}

export interface Stay22SearchOptions {
  provider?: "booking" | "expedia" | "vrbo" | "hotelscom";
  /**
   * Volltext-Adresse für Geo-Lookup. Keine Umlaute — die API antwortet
   * sonst mit HTTP 400 (empty body). Beispiel: "Heidelberg, Germany".
   */
  address?: string;
  lat?: number;
  lng?: number;
  /** Suchradius in Metern (nur mit lat/lng). Default 10000. */
  radius?: number;
  /** "hotel" | "rental" */
  type?: string;
  minguestrating?: number;
  /** 0–5. */
  minstarrating?: number;
  /** Min-/Max-Preis pro Nacht. API erwartet USD-Range, EUR-Konvertierung erfolgt danach. */
  min?: number;
  max?: number;
  limit?: number;
  currency?: string;
  lang?: string;
  checkin?: string;
  checkout?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  campaign?: string;
  /** lmaID — Pflicht für Affiliate-Attribution. */
  aid?: string;
}

const API_BASE = "https://api.stay22.com/v1";

function getApiKey(): string | null {
  // @ts-expect-error — import.meta.env existiert in Astro/Vite
  const viteKey = typeof import.meta !== "undefined" ? import.meta.env?.STAY22_API_KEY : undefined;
  const nodeKey = typeof process !== "undefined" ? process.env?.STAY22_API_KEY : undefined;
  const key = viteKey || nodeKey;
  return typeof key === "string" && key.length > 0 ? key : null;
}

/**
 * Formatiert einen Betrag als deutsches Preis-Label.
 * Beispiel: 478 → "478 €", 478.5 → "478,50 €".
 */
function formatPrice(amount: number | undefined, currency: string = "EUR"): string | undefined {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return undefined;
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString("de-DE")} ${symbol}`;
}

/**
 * Normalisiert die verschachtelte API-Antwort in unsere flache
 * Stay22Accommodation. Defensive Casts für jeden Pfad.
 */
function normalize(
  raw: any,
  meta: { nights?: number; currency?: string } = {},
): Stay22Accommodation {
  const currency = meta.currency || raw?.price?.currency || "EUR";
  const total: number | undefined = raw?.price?.total;
  const perNight =
    total !== undefined && meta.nights && meta.nights > 0
      ? total / meta.nights
      : undefined;

  return {
    id: raw?.id ? String(raw.id) : undefined,
    name: raw?.name ?? "",
    type: raw?.type,
    image: raw?.media?.thumbnail,
    link: raw?.links?.url,
    rating: raw?.rating
      ? { score: raw.rating.value, count: raw.rating.count }
      : undefined,
    starRating: raw?.rating?.hotelStars,
    price: {
      total,
      perNight,
      currency,
      formattedTotal: formatPrice(total, currency),
      formattedPerNight: formatPrice(perNight, currency),
    },
    address: raw?.location
      ? {
          full: raw.location.address,
          cityName: raw.location.cityName,
          areaName: raw.location.areaName,
        }
      : undefined,
    distance: raw?.location?.distanceInMeters,
    geo: raw?.location?.coordinates
      ? { lat: raw.location.coordinates.lat, lng: raw.location.coordinates.lng }
      : undefined,
    policies: raw?.policies,
  };
}

/**
 * Sucht Live-Accommodations via Stay22 API.
 *
 * Returns null wenn STAY22_API_KEY fehlt — Caller muss das defensiv
 * handhaben (Component versteckt sich, Page zeigt nur statische Hotels).
 *
 * Quirk: Die API-Parameter minguestrating und minstarrating liefern in
 * der Praxis 0 Treffer für City-Searches, auch wenn die Roh-Daten passen
 * würden. Wir filtern deshalb CLIENT-SEITE nach dem Fetch — Reihenfolge:
 *   1. API-Call ohne Rating-Filter (bekommt alle Hotels)
 *   2. Lokales Filtern via minguestrating-/minstarrating-Optionen
 *   3. Slice auf limit
 */
export async function searchAccommodations(
  options: Stay22SearchOptions,
): Promise<Stay22Accommodation[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[stay22] STAY22_API_KEY env var fehlt — Live-Hotels werden übersprungen.");
    return null;
  }

  // Rating-Filter clientseitig anwenden — die API-Variante scheint
  // 0 Treffer für City-Searches zu liefern. Wir merken sie hier vor
  // und entfernen sie aus den URL-Params unten.
  const minGuest = options.minguestrating;
  const minStar = options.minstarrating;
  const userLimit = options.limit ?? 10;

  const safeOptions: Stay22SearchOptions = { ...options };
  delete safeOptions.minguestrating;
  delete safeOptions.minstarrating;
  if (minGuest || minStar) {
    safeOptions.limit = Math.max(userLimit * 4, 40);
  }
  if (typeof safeOptions.address === "string") {
    safeOptions.address = safeOptions.address
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/Ä/g, "Ae")
      .replace(/Ö/g, "Oe")
      .replace(/Ü/g, "Ue")
      .replace(/ß/g, "ss");
  }

  const params = new URLSearchParams();
  Object.entries(safeOptions).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  });

  const url = `${API_BASE}/accommodations?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[stay22] API ${res.status} für ${options.address ?? "lat/lng-search"}: ${body.slice(0, 200)}`,
      );
      return null;
    }

    const data = (await res.json()) as
      | { results?: any[]; meta?: { nights?: number; currency?: string } }
      | any[];

    const results = Array.isArray(data) ? data : data.results ?? [];
    const meta = !Array.isArray(data) ? data.meta : undefined;

    let normalized = results.map((r) => normalize(r, meta || {}));

    if (minGuest !== undefined) {
      normalized = normalized.filter((h) => (h.rating?.score ?? 0) >= minGuest);
    }
    if (minStar !== undefined) {
      normalized = normalized.filter((h) => (h.starRating ?? 0) >= minStar);
    }

    return normalized.slice(0, userLimit);
  } catch (err) {
    console.error("[stay22] Fetch fehlgeschlagen:", err);
    return null;
  }
}

/**
 * Convenience: Top-Hotels nach Adresse + Bewertung.
 * Default-Filter: ab 8.0 Gäste-Score, 3+ Sterne.
 */
export async function getTopHotels(
  address: string,
  lmaId: string,
  opts: Partial<Stay22SearchOptions> = {},
): Promise<Stay22Accommodation[] | null> {
  return searchAccommodations({
    provider: "booking",
    address,
    type: "hotel",
    minguestrating: 8.0,
    minstarrating: 3,
    limit: 12,
    currency: "EUR",
    lang: "de",
    aid: lmaId,
    campaign: lmaId,
    ...opts,
  });
}
