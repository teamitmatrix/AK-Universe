/** Digital services shown on /digital (and given to the chatbot). Prices are on quote only. */
export type DigitalService = { name: string; icon: string; text: string; points: string[] };

export const DIGITAL_GROUPS: { id: "sites" | "seo"; title: string; gold: string; text: string; services: DigitalService[] }[] = [
  {
    id: "sites",
    title: "Sites web et",
    gold: "applications",
    text: "Des sites et des applications rapides, modernes et pensés pour convertir vos visiteurs en clients.",
    services: [
      {
        name: "Site vitrine",
        icon: "grid",
        text: "Un site professionnel qui présente votre activité et génère des demandes de contact.",
        points: ["Design sur mesure", "Adapté au mobile", "Formulaire de contact et devis"],
      },
      {
        name: "Site e-commerce",
        icon: "cart",
        text: "Une boutique en ligne pour vendre vos produits 24/7.",
        points: ["Catalogue produits", "Paiement en ligne sécurisé", "Gestion des commandes"],
      },
      {
        name: "Application mobile",
        icon: "smartphone",
        text: "Une application iOS et Android au service de vos clients ou de vos équipes.",
        points: ["iOS et Android", "Notifications", "Publication sur les stores"],
      },
      {
        name: "Développement sur mesure",
        icon: "gear",
        text: "Plateformes, espaces clients et outils internes adaptés à vos processus.",
        points: ["Analyse de votre besoin", "Intégration à vos outils", "Maintenance et évolutions"],
      },
    ],
  },
  {
    id: "seo",
    title: "SEO, Google",
    gold: "et CRM",
    text: "Soyez trouvé par vos clients et suivez chaque contact jusqu'à la vente.",
    services: [
      {
        name: "Référencement naturel (SEO)",
        icon: "target",
        text: "Améliorez votre position sur Google et attirez des visiteurs qualifiés.",
        points: ["Audit SEO", "Optimisation technique et contenus", "Suivi des positions"],
      },
      {
        name: "Fiche Google Business Profile",
        icon: "pin",
        text: "Une fiche Google complète pour être visible localement et sur Google Maps.",
        points: ["Création ou optimisation", "Photos et informations", "Gestion des avis"],
      },
      {
        name: "Visibilité en ligne",
        icon: "eye",
        text: "Une présence cohérente sur le web : annuaires, réseaux et plateformes.",
        points: ["Présence sur les annuaires", "Cohérence des informations", "Suivi de la réputation"],
      },
      {
        name: "Solutions CRM",
        icon: "users",
        text: "Centralisez vos contacts, vos ventes et vos relances dans un CRM adapté.",
        points: ["Choix et mise en place", "Import de vos données", "Automatisations et formation"],
      },
    ],
  },
];

/** Offers of the "Formules et tarifs" block: every price is quoted after a call. */
export const DIGITAL_OFFERS = [
  { name: "Site web", icon: "grid", text: "Site vitrine ou e-commerce, selon le nombre de pages et de fonctionnalités." },
  { name: "Application", icon: "smartphone", text: "Application mobile ou outil sur mesure, selon votre cahier des charges." },
  { name: "SEO, Google et CRM", icon: "chart", text: "Prestation ponctuelle ou accompagnement mensuel." },
];
