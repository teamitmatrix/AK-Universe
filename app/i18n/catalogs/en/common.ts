import type { Catalog } from "../../translate";

/** Shared texts: header, footer, menus, language switch, cookie notice, error pages. */
const en: Catalog = {
  // Language switch
  "Langue : {name}": "Language: {name}",

  // Main header
  "AK Universe — accueil": "AK Universe — home",
  "AK Universe — retour à l'accueil": "AK Universe — back to home",
  "Fermer le menu": "Close menu",
  "Ouvrir le menu": "Open menu",
  Accueil: "Home",
  "À propos": "About us",
  Contact: "Contact",
  "Mes projets": "My projects",
  "Sous-menu {name}": "{name} submenu",
  "Se déconnecter": "Sign out",
  "Se connecter": "Sign in",
  "Mon compte": "My account",
  "Essayer gratuitement": "Try for free",

  // Header menus (config/navigation.ts)
  "Agents IA": "AI Agents",
  Marketing: "Marketing",
  Digital: "Digital",
  "Tous les agents IA": "All AI agents",
  "Le catalogue complet de nos agents IA.": "Our complete catalogue of AI agents.",
  "Catégories d'agents IA": "AI agent categories",
  "Relation client, ventes, opérations et équipe.": "Customer relations, sales, operations and team.",
  Démonstrations: "Demos",
  "Découvrez nos agents IA en action, dans des situations réelles.":
    "See our AI agents in action, in real-life situations.",
  "Formules et tarifs": "Plans and pricing",
  "Abonnements et tarifs des agents IA.": "AI agent subscriptions and pricing.",
  "Tous les services marketing": "All marketing services",
  "Le catalogue complet de nos services marketing.": "Our complete catalogue of marketing services.",
  "Réseaux sociaux et publicité": "Social media and advertising",
  "Gestion des réseaux sociaux, création de contenu et campagnes publicitaires.":
    "Social media management, content creation and advertising campaigns.",
  "Nos réalisations": "Our work",
  "Projets, campagnes marketing et contenus créatifs déjà réalisés.":
    "Projects, marketing campaigns and creative content we have delivered.",
  "Forfaits marketing, abonnements et tarifs des services à l'unité.":
    "Marketing packages, subscriptions and pricing for individual services.",
  "Toutes les solutions digitales": "All digital solutions",
  "Le catalogue complet de nos services digitaux.": "Our complete catalogue of digital services.",
  "Sites web et applications": "Websites and apps",
  "Création de sites web, applications mobiles et développement.":
    "Website creation, mobile apps and development.",
  "SEO, Google et CRM": "SEO, Google and CRM",
  "Référencement, visibilité en ligne, fiche Google Business et solutions CRM.":
    "Search engine optimization, online visibility, Google Business Profile and CRM solutions.",
  "Offres digitales, tarifs et devis sur mesure.": "Digital offers, pricing and tailored quotes.",

  // Section bars (AgentsSubnav, config/digital.ts)
  "Tous les agents": "All agents",
  Catégories: "Categories",
  Démos: "Demos",
  Tarifs: "Pricing",
  FAQ: "FAQ",
  "Notre marketing": "Our marketing",
  "Tous les services": "All services",
  Réalisations: "Our work",
  Devis: "Quote",
  "Toutes les solutions": "All solutions",

  // Footer
  "L'intelligence au service de votre ambition.": "Intelligence serving your ambition.",
  "Pied de page": "Footer",
  Expertises: "Expertise",
  "Informations légales": "Legal information",
  "Mentions légales": "Legal notice",
  Confidentialité: "Privacy",
  CGV: "Terms of sale",

  // Cookie notice
  "Uniquement les cookies essentiels au fonctionnement du site.": "Only the cookies the site needs to work.",
  "En savoir plus": "Learn more",
  Compris: "Got it",

  // Error pages
  "Erreur 404": "Error 404",
  "Page <gold>introuvable</gold>": "Page <gold>not found</gold>",
  "La page que vous cherchez n'existe pas ou a été déplacée.":
    "The page you are looking for does not exist or has been moved.",
  "Retour à l'accueil": "Back to home",
  "Une erreur est <gold>survenue</gold>": "Something <gold>went wrong</gold>",
  "Veuillez réessayer dans un instant.": "Please try again in a moment.",
  Réessayer: "Try again",
  "Le paiement en ligne n'est pas encore configuré. Aucun paiement n'a été effectué.": "Online payment is not set up yet. No payment has been made.",
  "Découvrir": "Discover",
  "Le plus populaire": "Most popular",
};

export default en;
