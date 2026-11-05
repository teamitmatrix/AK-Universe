/**
 * Marketing landing (Agents IA–style layout): categories, card tags and icons
 * for the video services catalogue from config/services-data.js.
 */

export type MarketingCategory = {
  id: string;
  name: string;
  text: string;
  icon: string;
  /** Service slugs belonging to this category. */
  slugs: string[];
};

/** Short pill label shown on catalog cards (approved mockup style). */
export const SERVICE_TAGS: Record<string, string> = {
  "video-entreprise": "Vidéo entreprise",
  "video-evenementielle": "Événementiel",
  "video-reseaux-sociaux": "Réseaux sociaux",
  "video-promotionnelle": "Promotion",
  "video-motion-design": "Motion design",
  "video-interview": "Interview",
  "video-tutoriels": "Tutoriels",
  "video-drone": "Drone",
  "video-food": "Food",
  "video-formation": "Formation",
  "video-mariage": "Mariage",
  "video-immobilier": "Immobilier",
  "video-automobile": "Automobile",
  "video-produit-e-commerce": "E-commerce",
  "video-ugc-publicite-ads": "UGC & Ads",
  "video-temoignage-client": "Témoignage",
  "video-recrutement-marque-employeur": "Recrutement",
};

/** Icon for each service card (from the design system). */
export const SERVICE_ICONS: Record<string, string> = {
  "video-entreprise": "video",
  "video-evenementielle": "clapper",
  "video-reseaux-sociaux": "play",
  "video-promotionnelle": "megaphone",
  "video-motion-design": "sparkle",
  "video-interview": "mic",
  "video-tutoriels": "cap",
  "video-drone": "drone",
  "video-food": "utensils",
  "video-formation": "cap",
  "video-mariage": "heart",
  "video-immobilier": "home",
  "video-automobile": "car",
  "video-produit-e-commerce": "cart",
  "video-ugc-publicite-ads": "target",
  "video-temoignage-client": "message",
  "video-recrutement-marque-employeur": "users",
};

export const MARKETING_CATEGORIES: MarketingCategory[] = [
  {
    id: "marque",
    name: "Image de marque",
    text: "Présentez votre entreprise, vos événements et vos équipes avec des films professionnels.",
    icon: "diamond",
    slugs: [
      "video-entreprise",
      "video-evenementielle",
      "video-interview",
      "video-temoignage-client",
      "video-recrutement-marque-employeur",
    ],
  },
  {
    id: "acquisition",
    name: "Réseaux sociaux et publicité",
    text: "Contenus courts, campagnes et UGC pour gagner en visibilité et en conversions.",
    icon: "megaphone",
    slugs: ["video-reseaux-sociaux", "video-promotionnelle", "video-ugc-publicite-ads"],
  },
  {
    id: "contenu",
    name: "Contenu et pédagogie",
    text: "Motion design, tutoriels et modules de formation pour expliquer et former.",
    icon: "bulb",
    slugs: ["video-motion-design", "video-tutoriels", "video-formation"],
  },
  {
    id: "secteurs",
    name: "Secteurs spécialisés",
    text: "Food, immobilier, automobile, drone, mariage et e-commerce : des formats adaptés à votre métier.",
    icon: "grid",
    slugs: [
      "video-drone",
      "video-food",
      "video-mariage",
      "video-immobilier",
      "video-automobile",
      "video-produit-e-commerce",
    ],
  },
];
