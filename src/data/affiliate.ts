/**
 * Affiliate-Konfiguration für culture-castles.de.
 * --------------------------------------------------
 * Hier landen alle Affiliate-IDs für dieses Stadtportal. Aktivierungs-
 * Flags lassen Snippets bewusst NICHT laden, solange enabled=false
 * (Dev/Staging-Schutz, DSGVO-Hygiene).
 *
 * Stay22 lmaID ist pro Projekt individuell und MUSS vor Aktivierung
 * vom Projekt-Owner eingeholt werden. Niemals eine lmaID aus einem
 * anderen Portal übernehmen.
 *
 * Stay22 Direct Travel API (Live-Hotel-Blocks): Zusätzlich zur lmaID
 * wird die env-Var STAY22_API_KEY gebraucht. Die liest src/lib/stay22.ts.
 * Lokal: .env-Datei (siehe .env.example). Build-CI: GitHub-Secrets.
 */

export const affiliate = {
  stay22: {
    /** Affiliate-ID aus dem Stay22-Dashboard. Vor Go-Live setzen. */
    lmaId: "687915d20d1617d25ef7787e",
    enabled: true,
    /**
     * Optionale, im Stay22-Dashboard vorgebaute Widget-ID für die
     * Hotel-Karte. Wenn gesetzt, nutzt <Stay22Map> das vorkonfigurierte
     * Embed (https://stay22.com/embed/<id>) statt die Parameter-URL.
     * Vorgefertigte Widgets erlauben Branding/Pin-Konfiguration im
     * Dashboard und sind robuster als das Parameter-Schema.
     */
    mapEmbedId: "",
  },
  getYourGuide: {
    /** Partner-ID aus dem GYG-Partner-Dashboard. */
    partnerId: "1UPZQQB",
    locale: "de-DE",
    enabled: true,
    /**
     * Default-Query für das Touren-Widget, falls eine Seite keinen
     * spezifischeren Begriff übergibt. Die eigentlichen Tour-Feeds laufen
     * pro Seite über gygQuery (Burg-Detailseiten) bzw. die Städte-Namen
     * in den "Burgen um <Stadt>"-Artikeln.
     */
    cityQuery: "Burgen und Schlösser",
  },
};

export const stay22Enabled =
  affiliate.stay22.enabled && affiliate.stay22.lmaId.length > 0;

export const gygEnabled =
  affiliate.getYourGuide.enabled && affiliate.getYourGuide.partnerId.length > 0;
