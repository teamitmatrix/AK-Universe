/**
 * Digital catalogue (/digital) and chatbot.
 * Website setup prices are published; SEO/CRM and applications stay on quote.
 */

export const DIGITAL_SUBNAV = [
  { id: "digital", href: "/digital", label: "Toutes les solutions" },
  { id: "sites", href: "/digital#sites", label: "Sites web et applications" },
  { id: "seo", href: "/digital#seo", label: "SEO, Google et CRM" },
  { id: "tarifs", href: "/digital#tarifs", label: "Tarifs" },
] as const;

export type DigitalService = { name: string; icon: string; text: string; points: string[]; href?: string };

/** Priced “Sites internet & e-commerce” cards (checklist #7). */
export type DigitalWebsite = {
  id: string;
  name: string;
  icon: string;
  points: string[];
  /** One-off setup price in euros (displayed alone — no “Mise en place dès”). */
  price: number;
  /**
   * Monthly operating fees starting price.
   * `null` = hide the “Frais de fonctionnement” label (Landing page).
   */
  runningFrom: number | null;
};

export const DIGITAL_WEBSITES: DigitalWebsite[] = [
  {
    id: "site-vitrine",
    name: "Site vitrine",
    icon: "grid",
    points: ["5 à 8 pages", "Mobile-first, SEO, formulaires et chatbot"],
    price: 2900,
    runningFrom: 150,
  },
  {
    id: "site-restaurant",
    name: "Site restaurant + commande",
    icon: "utensils",
    points: ["Menu, commande ou réservation", "Avis et intégration Google"],
    price: 3900,
    runningFrom: 190,
  },
  {
    id: "site-ecommerce",
    name: "Site e-commerce",
    icon: "cart",
    points: ["Jusqu'à 100 produits", "Paiement, livraison et paniers abandonnés"],
    price: 6900,
    runningFrom: 290,
  },
  {
    id: "landing-page",
    name: "Landing page",
    icon: "target",
    points: ["Page de conversion", "Tracking et capture de leads"],
    price: 990,
    runningFrom: null,
  },
];

/** Non-website digital offers (apps + SEO) shown as quote cards. */
export const DIGITAL_GROUPS: {
  id: "sites" | "seo";
  title: string;
  gold: string;
  text: string;
  services: DigitalService[];
}[] = [
  {
    id: "sites",
    title: "Sites internet",
    gold: "& e-commerce",
    text: "Des sites professionnels, rapides et pensés pour convertir vos visiteurs en clients.",
    services: [
      {
        name: "Application mobile",
        icon: "smartphone",
        text: "Une application iOS et Android au service de vos clients ou de vos équipes.",
        points: ["iOS et Android", "Notifications", "Publication sur les stores"],
        href: "/digital/application-mobile",
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

/** Summary cards in the “Formules et tarifs” block. */
export const DIGITAL_OFFERS = [
  {
    name: "Sites internet",
    icon: "grid",
    text: "Site vitrine, restaurant, e-commerce ou landing page : prix de mise en place affichés, frais de fonctionnement selon la formule.",
  },
  {
    name: "Application",
    icon: "smartphone",
    text: "Application mobile ou outil sur mesure : mise en place et frais de fonctionnement sur devis.",
  },
  {
    name: "SEO, Google et CRM",
    icon: "chart",
    text: "Prestation ponctuelle ou accompagnement mensuel, sur devis.",
  },
];

/** Content of /digital/application-mobile (checklist #8). */
export const MOBILE_APP = {
  title: "Application mobile",
  titleGold: "sur mesure",
  lead: "Concevons une application iOS et Android adaptée à vos clients ou à vos équipes.",
  cta: "Parler de mon projet",
  phonesImage: "/assets/img/digital-app-phones.png",
  builds: [
    {
      name: "Réservation et commande",
      icon: "calendar-o",
      text: "Prise de rendez-vous, commandes de produits et paiements en ligne sécurisés.",
    },
    {
      name: "Espace client",
      icon: "user",
      text: "Suivi des commandes et réservations, documents, notifications et profil personnalisé.",
    },
    {
      name: "Application métier",
      icon: "briefcase",
      text: "Outils internes pour vos équipes : interventions terrain, suivi d'activité et reporting.",
    },
  ],
  steps: [
    {
      name: "Cadrage",
      icon: "file-text",
      text: "Définir les objectifs, les besoins et le périmètre du projet.",
    },
    {
      name: "Design et prototype",
      icon: "edit",
      text: "Concevoir l'expérience utilisateur et valider le prototype.",
    },
    {
      name: "Développement et intégrations API",
      icon: "code",
      text: "Développer l'application iOS et Android, et connecter vos outils (CRM, paiement…).",
    },
    {
      name: "Tests et publication",
      icon: "rocket",
      text: "Tester, corriger et publier sur l'App Store et Google Play.",
    },
  ],
  pricingNote: "Mise en place et frais de fonctionnement sur devis.",
} as const;
