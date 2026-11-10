/**
 * Marketing landing: card tags and icons for the video services catalogue
 * from config/services-data.js.
 */

/**
 * Service card artwork with baked-in titles/subjects.
 * Use contain framing so cover crop does not cut text or key subjects.
 */
export const MARKETING_FIT_MEDIA = ["video-temoignage-client", "video-immobilier"] as const;

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
