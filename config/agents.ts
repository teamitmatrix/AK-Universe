export type AgentCategory = "client" | "ventes" | "operations";

export type Agent = {
  id: string;
  name: string;
  /** Short line used in the "Agents IA" mega menu. */
  menu: string;
  icon: string;
  /** Sprite used for the mega-menu avatar (ph-av-*), when the agent has none of its own. */
  avatar?: string;
  category: AgentCategory;
  /** One sentence for the cards of /agents-ia. */
  tagline: string;
  /** Intro of /agents-ia/<id>. */
  description: string;
  features: string[];
  capabilities: string[];
  integrations: string[];
  /** Sample exchange shown in the "Démos" section and on the agent page. */
  demo: { from: "client" | "agent"; text: string }[];
};

export const AGENT_CATEGORIES: { id: AgentCategory; name: string; text: string; icon: string }[] = [
  { id: "client", name: "Relation client", text: "Répondre à vos clients 24/7, au téléphone, sur WhatsApp et par e-mail.", icon: "headset" },
  { id: "ventes", name: "Ventes et croissance", text: "Trouver des prospects, les relancer et transformer plus de devis.", icon: "chart" },
  { id: "operations", name: "Opérations et équipe", text: "Automatiser les tâches internes, les rapports et le recrutement.", icon: "gear" },
];

/** Languages the agents speak, shown on every agent page. */
export const AGENT_LANGUAGES = ["Français", "Anglais", "Autres langues sur demande"];

/** All agents, in mega-menu and /agents-ia order. */
export const agents: Agent[] = [
  {
    id: "voix",
    name: "Agent Vocal IA",
    menu: "Appels entrants, standard, RDV",
    icon: "phone",
    avatar: "support",
    category: "client",
    tagline: "Répond à vos appels 24h/24 avec une voix naturelle et prend les rendez-vous.",
    description:
      "L'Agent Vocal IA décroche à votre place, comprend la demande de l'appelant, répond aux questions fréquentes, prend les rendez-vous et vous transmet un résumé de chaque appel. Plus aucun appel manqué, même le soir et le week-end.",
    features: [
      "Réponse aux appels 24h/24, 7j/7",
      "Voix naturelle et ton adapté à votre marque",
      "Prise de rendez-vous dans votre agenda",
      "Transfert vers un humain quand c'est nécessaire",
      "Résumé et transcription de chaque appel",
    ],
    capabilities: [
      "Comprend les demandes formulées librement",
      "Qualifie l'appelant (besoin, urgence, coordonnées)",
      "Répond à partir de vos informations (horaires, tarifs, services)",
      "Gère plusieurs appels en même temps",
    ],
    integrations: ["Téléphonie IA (numéro dédié ou renvoi d'appel)", "Google Agenda", "Outlook", "CRM"],
    demo: [
      { from: "client", text: "Bonjour, je voudrais un rendez-vous jeudi en fin de journée." },
      { from: "agent", text: "Bien sûr. Jeudi, j'ai un créneau à 17 h 30 ou à 18 h 15. Lequel vous convient ?" },
      { from: "client", text: "17 h 30, c'est parfait." },
      { from: "agent", text: "C'est noté pour jeudi à 17 h 30. Vous recevrez une confirmation par SMS." },
    ],
  },
  {
    id: "whatsapp",
    name: "Agent WhatsApp IA",
    menu: "Messages, commandes, relances",
    icon: "message",
    avatar: "marketing",
    category: "client",
    tagline: "Répond instantanément à vos clients sur WhatsApp, prend les demandes et relance.",
    description:
      "L'Agent WhatsApp IA répond en quelques secondes aux messages de vos clients, les renseigne sur vos produits et services, enregistre leurs demandes et assure le suivi, sur le canal qu'ils utilisent déjà au quotidien.",
    features: [
      "Réponses instantanées, de jour comme de nuit",
      "Informations produits, tarifs et disponibilités",
      "Prise de commandes et de demandes de devis",
      "Relances et rappels automatiques",
      "Reprise de la conversation par votre équipe à tout moment",
    ],
    capabilities: [
      "Comprend les messages écrits et les questions courantes",
      "Envoie liens, documents et confirmations",
      "Qualifie les contacts avant de les transmettre",
      "Garde l'historique de chaque client",
    ],
    integrations: ["WhatsApp Business", "CRM", "Google Agenda", "E-mail"],
    demo: [
      { from: "client", text: "Bonjour, vous livrez à Ivry-sur-Seine ?" },
      { from: "agent", text: "Bonjour ! Oui, nous livrons à Ivry-sur-Seine. Souhaitez-vous que je prépare un devis ?" },
      { from: "client", text: "Oui, pour 20 pièces." },
      { from: "agent", text: "Parfait, je vous envoie le devis ici même dans quelques minutes." },
    ],
  },
  {
    id: "ventes",
    name: "Agent Ventes",
    menu: "Prospection, relance, RDV",
    icon: "chart",
    category: "ventes",
    tagline: "Prospecte, relance et prend les rendez-vous pour remplir votre agenda commercial.",
    description:
      "L'Agent Ventes identifie vos prospects, leur écrit des messages personnalisés, relance au bon moment et place les rendez-vous qualifiés dans l'agenda de vos commerciaux.",
    features: [
      "Prospection et messages personnalisés",
      "Relances automatiques des prospects",
      "Prise de rendez-vous qualifiés",
      "Suivi du pipeline commercial",
    ],
    capabilities: [
      "Qualifie les leads selon vos critères",
      "Adapte le message à chaque prospect",
      "Priorise les contacts les plus chauds",
      "Rend compte des résultats chaque semaine",
    ],
    integrations: ["CRM", "E-mail", "LinkedIn", "Google Agenda"],
    demo: [
      { from: "agent", text: "Bonjour Claire, suite à votre visite sur notre site, puis-je vous proposer une démo de 15 minutes ?" },
      { from: "client", text: "Oui, mardi matin si possible." },
      { from: "agent", text: "Mardi à 10 h, c'est réservé. Je vous envoie l'invitation." },
    ],
  },
  {
    id: "support",
    name: "Agent Support Client",
    menu: "FAQ, tickets, SAV",
    icon: "chat",
    category: "client",
    tagline: "Répond aux questions de vos clients, traite les tickets et assure le SAV 24/7.",
    description:
      "L'Agent Support Client répond aux questions fréquentes, suit les commandes, ouvre et traite les tickets et transmet à votre équipe les demandes qui demandent une intervention humaine.",
    features: [
      "Assistance 24/7 sur votre site et par e-mail",
      "Réponses aux questions fréquentes",
      "Création et suivi des tickets",
      "Service après-vente et suivi de commande",
    ],
    capabilities: [
      "Apprend à partir de vos documents et de votre FAQ",
      "Détecte l'urgence et la satisfaction du client",
      "Escalade vers un humain avec tout le contexte",
      "Réduit le temps de réponse à quelques secondes",
    ],
    integrations: ["Chat du site web", "E-mail", "Outil de ticketing", "CRM"],
    demo: [
      { from: "client", text: "Où en est ma commande n° 4521 ?" },
      { from: "agent", text: "Elle a été expédiée hier et sera livrée demain avant 13 h. Voici le lien de suivi." },
    ],
  },
  {
    id: "marketing",
    name: "Agent Marketing",
    menu: "Réseaux sociaux, SEO, contenu",
    icon: "megaphone",
    category: "ventes",
    tagline: "Crée vos contenus, gère vos réseaux sociaux et améliore votre référencement.",
    description:
      "L'Agent Marketing rédige vos publications, planifie vos réseaux sociaux, optimise votre SEO et prépare vos campagnes, en gardant le ton de votre marque.",
    features: [
      "Rédaction de posts, articles et newsletters",
      "Planification sur les réseaux sociaux",
      "Optimisation SEO",
      "Préparation des campagnes",
    ],
    capabilities: [
      "Respecte votre ton et votre charte",
      "Propose un calendrier éditorial",
      "Analyse les performances des publications",
      "Décline un contenu sur plusieurs canaux",
    ],
    integrations: ["Instagram", "LinkedIn", "Facebook", "Google Analytics"],
    demo: [
      { from: "client", text: "Prépare 3 posts LinkedIn pour notre nouvelle offre." },
      { from: "agent", text: "Voici 3 propositions avec visuels suggérés et horaires de publication conseillés." },
    ],
  },
  {
    id: "commercial",
    name: "Agent Commercial",
    menu: "Devis, contrats, suivi client",
    icon: "doc",
    category: "ventes",
    tagline: "Prépare vos devis et contrats et assure le suivi de chaque client.",
    description:
      "L'Agent Commercial prépare les devis et les contrats à partir de vos modèles, relance les devis en attente et suit chaque client après la signature.",
    features: ["Création de devis", "Préparation de contrats", "Relance des devis en attente", "Suivi client après signature"],
    capabilities: [
      "Utilise vos modèles et vos tarifs",
      "Signale les devis à relancer",
      "Prépare les points de suivi client",
      "Centralise l'historique commercial",
    ],
    integrations: ["CRM", "E-mail", "Outils de facturation", "Signature électronique"],
    demo: [
      { from: "client", text: "Fais un devis pour 3 mois de l'offre Pro pour la société Martin." },
      { from: "agent", text: "Le devis est prêt. Je l'envoie à M. Martin avec une relance prévue dans 5 jours ?" },
    ],
  },
  {
    id: "productivite",
    name: "Agent Productivité",
    menu: "Planification, email, tâches",
    icon: "calendar",
    category: "operations",
    tagline: "Organise votre agenda, trie vos e-mails et gère vos tâches.",
    description:
      "L'Agent Productivité planifie vos réunions, trie et rédige vos e-mails, suit vos tâches et vous envoie chaque matin un point sur votre journée.",
    features: ["Planification des réunions", "Tri et rédaction d'e-mails", "Gestion des tâches", "Récapitulatif quotidien"],
    capabilities: [
      "Trouve les créneaux libres de chacun",
      "Résume les longs échanges d'e-mails",
      "Rappelle les échéances importantes",
      "Prépare les comptes rendus de réunion",
    ],
    integrations: ["Google Workspace", "Microsoft 365", "Outlook", "Google Agenda"],
    demo: [
      { from: "client", text: "Organise une réunion d'équipe cette semaine." },
      { from: "agent", text: "Tout le monde est disponible jeudi à 14 h. J'envoie l'invitation ?" },
    ],
  },
  {
    id: "analyse",
    name: "Agent Analyse",
    menu: "Rapports, données, performance",
    icon: "bars",
    category: "operations",
    tagline: "Transforme vos données en rapports clairs et en indicateurs de performance.",
    description:
      "L'Agent Analyse rassemble vos données, produit des rapports réguliers et répond à vos questions sur vos chiffres, en langage simple.",
    features: ["Rapports automatiques", "Tableaux de bord", "Suivi des indicateurs clés", "Alertes en cas d'écart"],
    capabilities: [
      "Répond aux questions sur vos chiffres",
      "Compare les périodes et repère les tendances",
      "Explique les résultats simplement",
      "Envoie les rapports à la bonne fréquence",
    ],
    integrations: ["Google Sheets", "Excel", "CRM", "Google Analytics"],
    demo: [
      { from: "client", text: "Comment ont évolué nos ventes ce mois-ci ?" },
      { from: "agent", text: "+12 % par rapport au mois dernier, portées surtout par l'offre Pro. Voici le détail." },
    ],
  },
  {
    id: "technique",
    name: "Agent Technique",
    menu: "Automatisations, intégrations",
    icon: "gear",
    category: "operations",
    tagline: "Connecte vos outils et automatise vos processus.",
    description:
      "L'Agent Technique relie vos logiciels entre eux, automatise les tâches répétitives entre vos outils et surveille le bon fonctionnement de vos automatisations.",
    features: ["Automatisation des processus", "Intégrations entre vos outils", "Synchronisation des données", "Suivi des automatisations"],
    capabilities: [
      "Repère les tâches à automatiser",
      "Déclenche des actions selon vos règles",
      "Alerte en cas d'erreur",
      "Documente chaque automatisation",
    ],
    integrations: ["CRM", "Outils de facturation", "Google Workspace", "Microsoft 365"],
    demo: [
      { from: "client", text: "Quand un devis est signé, crée la fiche client et préviens l'équipe." },
      { from: "agent", text: "C'est en place : fiche créée dans le CRM et message à l'équipe à chaque signature." },
    ],
  },
  {
    id: "recrutement",
    name: "Agent Recrutement",
    menu: "Sourcing, présélection, entretiens",
    icon: "bulb",
    category: "operations",
    tagline: "Trouve, présélectionne les candidats et organise les entretiens.",
    description:
      "L'Agent Recrutement rédige vos offres, présélectionne les candidatures selon vos critères et planifie les entretiens avec les meilleurs profils.",
    features: ["Rédaction des offres d'emploi", "Présélection des candidatures", "Planification des entretiens", "Suivi des candidats"],
    capabilities: [
      "Analyse les CV selon vos critères",
      "Répond aux questions des candidats",
      "Propose une liste courte de profils",
      "Tient chaque candidat informé",
    ],
    integrations: ["LinkedIn", "Job boards", "E-mail", "Google Agenda"],
    demo: [
      { from: "client", text: "Combien de candidatures pour le poste de commercial ?" },
      { from: "agent", text: "34 reçues, 6 correspondent à vos critères. Je propose des entretiens mardi et mercredi ?" },
    ],
  },
];

export const agentById = (id: string) => agents.find((agent) => agent.id === id);

/** The 4 agents shown as cards on the homepage. */
export const featuredAgents: (Agent & { description: string })[] = [
  { ...agentById("ventes")!, description: "Prospection, relance, prise de rendez-vous." },
  { ...agentById("marketing")!, description: "Réseaux sociaux, SEO, contenu, campagnes." },
  { ...agentById("support")!, description: "FAQ, tickets, SAV, assistance 24/7." },
  { ...agentById("productivite")!, description: "Planification, email, gestion des tâches." },
];
