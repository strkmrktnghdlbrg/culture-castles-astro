import type { Experience } from "./site";

export const experiencesEn: Experience[] = [
  {
    slug: "hochzeit-im-schloss",
    title: "Wedding at the Castle",
    teaser: "Dream settings for the most important day of your life.",
    icon: "✦",
    tag: "hochzeit",
    intro:
      "Marry where princes once held court: castles and palaces offer perhaps the most romantic setting imaginable for a wedding ceremony. Here you will find the finest venues with licensed rooms, sweeping grounds, and grand banquet halls.",
  },
  {
    slug: "familienausflug",
    title: "Family Day Out",
    teaser: "Knights, dragons and history for children of all ages.",
    icon: "❦",
    tag: "familie",
    intro:
      "Castles are the ultimate open-air classroom: jousting games, dungeons, and towers to clamber up. These destinations captivate explorers young and old in equal measure.",
  },
  {
    slug: "burgruinen",
    title: "Castle Ruins",
    teaser: "Enchanted walls and silent grandeur.",
    icon: "✧",
    tag: "ruine",
    intro:
      "Where roofs fell long ago, romance begins: castle ruins speak of vanished power and today stand as quiet, atmospheric vantage points steeped in history.",
  },
  {
    slug: "uebernachten-im-schloss",
    title: "Staying in a Castle",
    teaser: "Castle hotels for a truly regal night.",
    icon: "♛",
    tag: "uebernachten",
    intro:
      "Sleep as nobility once did: many castles and palaces are now elegant hotels. We show you where you can spend the night within historic walls – from a tower room to the piano nobile.",
  },
  {
    slug: "maerchenschloesser",
    title: "Fairy-Tale Castles",
    teaser: "Turrets, battlements, and romance in abundance.",
    icon: "♜",
    tag: "maerchen",
    intro:
      "Castles straight from a storybook: playful turrets, oriel windows, and crenellated parapets. These buildings have inspired generations of fairy tales and continue to enchant visitors today.",
  },
  {
    slug: "mittelalterliche-burgen",
    title: "Medieval Castles",
    teaser: "Formidable, imposing, and authentically preserved.",
    icon: "⚔",
    tag: "mittelalter",
    intro:
      "Keep, barbican, wall-walk: genuine medieval fortresses where history is palpable in every stone – powerful reminders of a world defined by defence and dominion.",
  },
];

export const getExperienceEn = (slug: string) => experiencesEn.find((e) => e.slug === slug);
