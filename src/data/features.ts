/**
 * Feature-Flags für top10-heidelberg.de.
 * Default: alles an. News/Reiseplaner/Branchenbuch-Phase2 sind aus.
 */
export const features = {
  tourismus: { enabled: true },
  stadtteilHotels: { enabled: true },
  branchen: { enabled: true },
  blog: { enabled: true },
  news: { enabled: false },
  werben: { enabled: true },
  reiseplaner: { enabled: false },
};
