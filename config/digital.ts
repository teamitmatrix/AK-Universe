/**
 * Digital catalogue (/digital) and chatbot.
 * Website setup prices are published; SEO/CRM and applications stay on quote.
 */

export const DIGITAL_SUBNAV = [
  { id: "digital", href: "/digital", label: "Toutes les solutions" },
  { id: "sites", href: "/digital#sites", label: "Sites web et applications" },
  { id: "seo", href: "/digital#seo", label: "Référencement et CRM" },
  { id: "tarifs", href: "/digital#tarifs", label: "Tarifs" },
] as const;

export type DigitalService = {
  /** Stable id for quote forms (`digital:<id>`). */
  id: string;
  name: string;
  icon: string;
  text: string;
  points: string[];
  /** Detail page when available (e.g. application mobile). */
  href?: string;
  image: string;
  imageAlt: string;
};

/**
 * Recurring-fee wording shared by /digital cards.
 * Only states what is published; commercial detail stays in the quote (do not invent terms).
 */
export const DIGITAL_RUNNING_POLICY = {
  tax: "Tous les prix affichés sont en euros hors taxes (HT).",
  starting:
    "Les frais de fonctionnement sont indiqués « à partir de » : le montant exact dépend de la formule retenue.",
  details:
    "Ce qui est inclus, le caractère obligatoire ou non, la date de début de facturation et tout engagement éventuel sont précisés dans le devis avant engagement.",
  landing:
    "Landing page : aucun frais de fonctionnement n'est affiché. S'ils s'appliquent à votre projet, ils figurent dans le devis.",
} as const;

/** Priced “Sites internet & e-commerce” cards (checklist #7). */
export type DigitalWebsite = {
  id: string;
  name: string;
  icon: string;
  points: string[];
  /** Card illustration (public path). */
  image: string;
  /** Accessible description of the illustration. */
  imageAlt: string;
  /** One-off setup price in euros HT. */
  price: number;
  /**
   * Monthly operating fees starting price (HT).
   * `null` = no published monthly fee (Landing page) — say so explicitly on the card.
   */
  runningFrom: number | null;
  /** Short card line under the running fee (or the “none published” notice). */
  runningNote: string;
};

export const DIGITAL_WEBSITES: DigitalWebsite[] = [
  {
    id: "site-vitrine",
    name: "Site vitrine",
    icon: "grid",
    points: ["5 à 8 pages", "Mobile-first, SEO, formulaires et chatbot"],
    image: "/assets/img/digital/site-vitrine.jpg",
    imageAlt: "Ordinateur portable affichant un site vitrine professionnel",
    price: 2900,
    runningFrom: 150,
    runningNote: "Indicatif. Inclus, obligation, début de facturation et engagement : au devis.",
  },
  {
    id: "site-restaurant",
    name: "Site restaurant + commande",
    icon: "utensils",
    points: ["Menu, commande ou réservation", "Avis et intégration Google"],
    image: "/assets/img/digital/site-restaurant.jpg",
    imageAlt: "Ordinateur portable affichant un site restaurant avec commande en ligne",
    price: 3900,
    runningFrom: 190,
    runningNote: "Indicatif. Inclus, obligation, début de facturation et engagement : au devis.",
  },
  {
    id: "site-ecommerce",
    name: "Site e-commerce",
    icon: "cart",
    points: ["Jusqu'à 100 produits", "Paiement, livraison et paniers abandonnés"],
    image: "/assets/img/digital/site-ecommerce.jpg",
    imageAlt: "Ordinateur portable affichant une boutique e-commerce",
    price: 6900,
    runningFrom: 290,
    runningNote: "Indicatif. Inclus, obligation, début de facturation et engagement : au devis.",
  },
  {
    id: "landing-page",
    name: "Landing page",
    icon: "target",
    points: ["Page de conversion", "Tracking et capture de leads"],
    image: "/assets/img/digital/landing-page.jpg",
    imageAlt: "Ordinateur portable affichant une landing page de conversion",
    price: 990,
    runningFrom: null,
    runningNote: "Aucun frais mensuel affiché. Tout éventuel frais récurrent est précisé au devis.",
  },
];

export function digitalWebsiteOf(id: string) {
  return DIGITAL_WEBSITES.find((site) => site.id === id);
}

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
        id: "application-mobile",
        name: "Application mobile",
        icon: "smartphone",
        text: "Une application iOS et Android au service de vos clients ou de vos équipes.",
        points: ["iOS et Android", "Notifications", "Publication sur les stores"],
        href: "/digital/application-mobile",
        image: "/assets/img/digital/app-mobile.jpg",
        imageAlt: "Smartphone affichant une interface d'application mobile",
      },
      {
        id: "developpement-sur-mesure",
        name: "Développement sur mesure",
        icon: "gear",
        text: "Plateformes, espaces clients et outils internes adaptés à vos processus.",
        points: ["Analyse de votre besoin", "Intégration à vos outils", "Maintenance et évolutions"],
        href: "/digital/developpement-sur-mesure",
        image: "/assets/img/digital/dev-sur-mesure.jpg",
        imageAlt: "Écran affichant un tableau de bord métier sur mesure",
      },
    ],
  },
  {
    id: "seo",
    title: "Référencement, Google",
    gold: "et CRM",
    text: "Référencement naturel, présence locale Google, cohérence de votre réputation en ligne, et gestion de la relation client.",
    services: [
      {
        id: "referencement-naturel",
        name: "Référencement naturel (SEO)",
        icon: "target",
        text: "Optimisez votre site pour la recherche organique et attirez des visiteurs qualifiés — sans promesse de position garantie.",
        points: ["Audit SEO", "Optimisation technique et contenus", "Suivi des positions"],
        image: "/assets/img/digital/seo-naturel.jpg",
        imageAlt: "Ordinateur portable montrant des indicateurs de référencement naturel",
      },
      {
        id: "fiche-google-business",
        name: "Fiche Google Business",
        icon: "pin",
        text: "Une fiche Google complète pour être visible localement et sur Maps.",
        points: ["Création ou optimisation", "Photos et informations", "Gestion des avis"],
        image: "/assets/img/digital/google-business.jpg",
        imageAlt: "Présentation d'une fiche Google Business et d'une carte locale",
      },
      {
        id: "presence-reputation",
        name: "Présence et réputation en ligne",
        icon: "eye",
        text: "Cohérence de vos informations sur les annuaires et suivi de votre réputation en ligne.",
        points: ["Présence sur les annuaires", "Cohérence des informations", "Suivi de la réputation"],
        image: "/assets/img/digital/presence-reputation.jpg",
        imageAlt: "Écran montrant des annuaires en ligne et des avis",
      },
      {
        id: "crm",
        name: "Gestion de la relation client (CRM)",
        icon: "users",
        text: "Centralisez vos contacts, vos ventes et vos relances dans un CRM adapté.",
        points: ["Choix et mise en place", "Import de vos données", "Automatisations et formation"],
        image: "/assets/img/digital/crm.jpg",
        imageAlt: "Tableau de bord CRM avec contacts et pipeline",
      },
    ],
  },
];

/** Summary cards in the “Formules et tarifs” block. */
export const DIGITAL_OFFERS = [
  {
    name: "Sites internet",
    icon: "grid",
    text: "Site vitrine, restaurant, e-commerce ou landing page : mise en place HT affichée ; frais de fonctionnement « à partir de » selon la formule (détail au devis). Landing page : pas de frais mensuels affichés.",
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
  phonesImage: "/assets/img/digital-app-hero.png",
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

/** Content of /digital/developpement-sur-mesure. */
export const CUSTOM_DEV = {
  title: "Développement",
  titleGold: "sur mesure",
  lead: "Concevons des plateformes, espaces clients et outils internes adaptés à vos processus.",
  cta: "Parler de mon projet",
  heroImage: "/assets/img/digital/dev-sur-mesure.jpg",
  builds: [
    {
      name: "Espace client",
      icon: "user",
      text: "Portails de suivi, documents, commandes et échanges sécurisés avec vos clients.",
    },
    {
      name: "Outils métier",
      icon: "briefcase",
      text: "Tableaux de bord, workflows et applications internes pour vos équipes.",
    },
    {
      name: "Intégrations",
      icon: "gear",
      text: "Connexion à votre CRM, paiements, stocks et autres outils déjà en place.",
    },
  ],
  steps: [
    {
      name: "Analyse du besoin",
      icon: "file-text",
      text: "Comprendre vos processus, contraintes et objectifs pour cadrer le périmètre.",
    },
    {
      name: "Conception",
      icon: "edit",
      text: "Modéliser l'expérience, les écrans clés et les parcours utilisateurs.",
    },
    {
      name: "Développement et intégrations",
      icon: "code",
      text: "Construire la solution et la connecter à vos outils existants.",
    },
    {
      name: "Maintenance et évolutions",
      icon: "rocket",
      text: "Assurer le suivi, les correctifs et les évolutions au fil de votre activité.",
    },
  ],
  pricingNote: "Mise en place et frais de fonctionnement sur devis.",
} as const;
