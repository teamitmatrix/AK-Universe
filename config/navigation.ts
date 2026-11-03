/** Dropdown menus of the main header (components/layout/SiteHeader.tsx). */
export type NavMenu = {
  id: "agents" | "marketing" | "digital";
  label: string;
  /** Written out: Google Translate would turn some labels into something else. */
  labelEn: string;
  /** Page opened by a click on the menu label. */
  href: string;
  links: { href: string; label: string; text: string }[];
};

export const NAV_MENUS: NavMenu[] = [
  {
    id: "agents",
    label: "Agents IA",
    labelEn: "AI Agents",
    href: "/agents-ia",
    links: [
      {
        href: "/agents-ia#tous",
        label: "Tous les agents IA",
        text: "Le catalogue complet de nos agents IA.",
      },
      {
        href: "/agents-ia#categories",
        label: "Catégories d'agents IA",
        text: "Ventes, support client, WhatsApp, agents vocaux, RH et plus.",
      },
      {
        href: "/agents-ia#demos",
        label: "Démonstrations",
        text: "Découvrez nos agents IA en action, dans des situations réelles.",
      },
      {
        href: "/agents-ia/tarifs",
        label: "Formules et tarifs",
        text: "Abonnements et tarifs des agents IA.",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    labelEn: "Marketing",
    href: "/marketing",
    links: [
      {
        href: "/services",
        label: "Tous les services marketing",
        text: "Le catalogue complet de nos services marketing.",
      },
      {
        href: "/services/video-reseaux-sociaux",
        label: "Réseaux sociaux et publicité",
        text: "Gestion des réseaux sociaux, création de contenu et campagnes publicitaires.",
      },
      {
        href: "/marketing/realisations",
        label: "Nos réalisations",
        text: "Projets, campagnes marketing et contenus créatifs déjà réalisés.",
      },
      {
        href: "/marketing/forfaits",
        label: "Formules et tarifs",
        text: "Forfaits marketing, abonnements et tarifs des services à l'unité.",
      },
    ],
  },
  {
    id: "digital",
    label: "Digital",
    labelEn: "Digital",
    href: "/digital",
    links: [
      {
        href: "/digital",
        label: "Toutes les solutions digitales",
        text: "Le catalogue complet de nos services digitaux.",
      },
      {
        href: "/digital#sites",
        label: "Sites web et applications",
        text: "Création de sites web, applications mobiles et développement.",
      },
      {
        href: "/digital#seo",
        label: "SEO, Google et CRM",
        text: "Référencement, visibilité en ligne, fiche Google Business et solutions CRM.",
      },
      {
        href: "/digital#tarifs",
        label: "Formules et tarifs",
        text: "Offres digitales, tarifs et devis sur mesure.",
      },
    ],
  },
];
