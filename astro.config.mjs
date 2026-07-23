import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";

import outboundGate from './integrations/outbound-gate.mjs';
export default defineConfig({
  site: "https://culture-castles.de",
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" },
  i18n: {
    defaultLocale: "de",
    locales: ["de", "en"],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [outboundGate(), 
    sitemap({
      filter: (page) =>
        !page.includes("/impressum") &&
        !page.includes("/datenschutz") &&
        !page.includes("/kontakt") &&
        !page.includes("/suche") &&
        !page.includes("/404"),
    }),
  ],
  vite: {
    plugins: [tailwind()],
  },
});
