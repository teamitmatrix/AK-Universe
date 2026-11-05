export type AgentCategory = "client" | "ventes" | "operations";

export type AgentTask = {
  icon: string;
  label: string;
};

export type Agent = {
  id: string;
  name: string;
  /** Role shown under the name on catalog cards (French). */
  role: string;
  /** Profile subtitle, e.g. "Votre agent d'accueil téléphonique". */
  headline: string;
  /** Short line used in menus / chatbot listings. */
  menu: string;
  icon: string;
  category: AgentCategory;
  /** Portrait used on catalog cards. */
  portrait: string;
  /** Wider portrait used on the profile hero. */
  heroPortrait: string;
  /** Realistic example the customer can delegate (French). */
  example: string;
  /** One sentence for listings that still use a short blurb. */
  tagline: string;
  /** Intro of /agents-ia/<id>. */
  description: string;
  /** Three main tasks on the profile ("Ce que X peut faire"). */
  tasks: AgentTask[];
  /** Practical scenario ("X en action"). */
  action: string;
  /** Kept for chatbot / listings — mirrors task labels. */
  features: string[];
  capabilities: string[];
  integrations: string[];
  /** Sample exchange shown in the "Démos" section. */
  demo: { from: "client" | "agent"; text: string }[];
};

export const AGENT_CATEGORIES: { id: AgentCategory; name: string; text: string; icon: string }[] = [
  {
    id: "client",
    name: "Relation client",
    text: "Accueil téléphonique et service client, y compris via WhatsApp.",
    icon: "headset",
  },
  {
    id: "ventes",
    name: "Ventes et croissance",
    text: "Prospection, suivi des ventes, marketing et SEO.",
    icon: "chart",
  },
  {
    id: "operations",
    name: "Opérations et équipe",
    text: "Assistance de direction, recrutement, facturation, knowledge et juridique.",
    icon: "gear",
  },
];

/** Languages the agents speak, shown where needed. */
export const AGENT_LANGUAGES = ["Français", "Anglais", "Autres langues sur demande"];

function withFeatures(agent: Omit<Agent, "features">): Agent {
  return { ...agent, features: agent.tasks.map((task) => task.label) };
}

/**
 * Named specialists for the Agents IA catalog and profile pages.
 * Copy matches the approved profile mockups. WhatsApp is a channel, not an agent.
 */
export const agents: Agent[] = [
  withFeatures({
    id: "milo",
    name: "Milo",
    role: "Accueil téléphonique",
    headline: "Votre agent d'accueil téléphonique",
    menu: "Accueil téléphonique",
    icon: "phone",
    category: "client",
    portrait: "/assets/img/agents/milo.jpg",
    heroPortrait: "/assets/img/agents/milo-hero.jpg",
    example: "Réponds à mes appels pendant que je suis en réunion et envoie-moi un résumé.",
    tagline: "Répond à vos appels, identifie le besoin et vous transmet un résumé.",
    description:
      "Milo répond à vos appels, identifie le besoin de chaque interlocuteur et transmet un résumé à votre équipe.",
    tasks: [
      { icon: "phone", label: "Répondre aux appels" },
      { icon: "file-text", label: "Recueillir les informations" },
      { icon: "check-circle", label: "Transmettre un résumé" },
    ],
    action:
      "Pendant que votre équipe est occupée, Milo prend le nom, le numéro et le motif de l'appel pour faciliter le rappel.",
    capabilities: [
      "Décroche à votre place pendant les réunions et hors horaires",
      "Qualifie l'appelant (nom, motif, urgence)",
      "Transfère vers un humain quand c'est nécessaire",
    ],
    integrations: ["Téléphonie IA", "Google Agenda", "CRM", "SMS"],
    demo: [
      { from: "client", text: "Bonjour, je voudrais un rendez-vous jeudi en fin de journée." },
      { from: "agent", text: "Bien sûr. Jeudi, j'ai un créneau à 17 h 30 ou à 18 h 15. Lequel vous convient ?" },
      { from: "client", text: "17 h 30, c'est parfait." },
      { from: "agent", text: "C'est noté pour jeudi à 17 h 30. Vous recevrez une confirmation par SMS." },
    ],
  }),
  withFeatures({
    id: "nora",
    name: "Nora",
    role: "Service client",
    headline: "Votre agente de service client",
    menu: "Service client",
    icon: "chat",
    category: "client",
    portrait: "/assets/img/agents/nora.jpg",
    heroPortrait: "/assets/img/agents/nora-hero.jpg",
    example:
      "Réponds aux questions sur les commandes, les livraisons et les retours. Transmets-moi les demandes sensibles.",
    tagline: "Répond aux questions clients et transmet les demandes sensibles.",
    description:
      "Nora répond aux questions de vos clients, suit leurs commandes et transmet les demandes complexes à votre équipe.",
    tasks: [
      { icon: "chat", label: "Répondre aux questions fréquentes" },
      { icon: "box", label: "Suivre les commandes" },
      { icon: "users", label: "Transmettre les demandes complexes" },
    ],
    action:
      "Un client signale un colis perdu. Nora vérifie le suivi et transmet le dossier à votre équipe.",
    capabilities: [
      "Assistance sur le site, par e-mail ou WhatsApp",
      "Apprend à partir de votre FAQ et de vos documents",
      "Escalade vers un humain avec tout le contexte",
    ],
    integrations: ["WhatsApp Business", "E-mail", "Chat du site", "Outil de ticketing", "CRM"],
    demo: [
      { from: "client", text: "Où en est ma commande n° 4521 ?" },
      {
        from: "agent",
        text: "Elle a été expédiée hier et sera livrée demain avant 13 h. Voici le lien de suivi.",
      },
    ],
  }),
  withFeatures({
    id: "lea",
    name: "Léa",
    role: "Assistante de direction",
    headline: "Votre assistante de direction",
    menu: "Assistante de direction",
    icon: "calendar",
    category: "operations",
    portrait: "/assets/img/agents/lea.jpg",
    heroPortrait: "/assets/img/agents/lea-hero.jpg",
    example: "Résume mes e-mails importants, rédige des réponses et organise mon agenda.",
    tagline: "Résume vos e-mails, rédige des réponses et organise votre agenda.",
    description:
      "Léa résume vos e-mails importants, prépare vos réponses et organise votre agenda.",
    tasks: [
      { icon: "mail", label: "Résumer vos e-mails" },
      { icon: "message", label: "Préparer vos réponses" },
      { icon: "calendar", label: "Organiser votre agenda" },
    ],
    action:
      "Avant votre réunion, Léa résume vos e-mails prioritaires et prépare les réponses à valider.",
    capabilities: [
      "Trie et priorise votre boîte de réception",
      "Propose des créneaux et envoie les invitations",
      "Prépare les comptes rendus de réunion",
    ],
    integrations: ["Google Workspace", "Microsoft 365", "Outlook", "Google Agenda"],
    demo: [
      { from: "client", text: "Organise une réunion d'équipe cette semaine." },
      { from: "agent", text: "Tout le monde est disponible jeudi à 14 h. J'envoie l'invitation ?" },
    ],
  }),
  withFeatures({
    id: "adam",
    name: "Adam",
    role: "Prospection commerciale",
    headline: "Votre agent de prospection commerciale",
    menu: "Prospection commerciale",
    icon: "chart",
    category: "ventes",
    portrait: "/assets/img/agents/adam.jpg",
    heroPortrait: "/assets/img/agents/adam-hero.jpg",
    example:
      "Trouve des entreprises qui correspondent à ma cible et rédige un premier message personnalisé pour chacune.",
    tagline: "Trouve des prospects et rédige des premiers messages personnalisés.",
    description:
      "Adam repère les entreprises qui correspondent à votre cible et prépare un premier message personnalisé pour chacune.",
    tasks: [
      { icon: "eye", label: "Identifier les prospects" },
      { icon: "target", label: "Vérifier leur adéquation" },
      { icon: "mail", label: "Préparer les premiers messages" },
    ],
    action:
      "Vous ciblez les agences immobilières de votre région. Adam prépare une liste de prospects et un premier message à valider pour chacun.",
    capabilities: [
      "Qualifie les leads selon vos critères",
      "Adapte le message à chaque prospect",
      "Priorise les contacts les plus prometteurs",
    ],
    integrations: ["CRM", "E-mail", "LinkedIn", "Google Agenda"],
    demo: [
      {
        from: "agent",
        text: "Bonjour Claire, suite à votre visite sur notre site, puis-je vous proposer une démo de 15 minutes ?",
      },
      { from: "client", text: "Oui, mardi matin si possible." },
      { from: "agent", text: "Mardi à 10 h, c'est réservé. Je vous envoie l'invitation." },
    ],
  }),
  withFeatures({
    id: "hugo",
    name: "Hugo",
    role: "Suivi des ventes",
    headline: "Votre agent de suivi des ventes",
    menu: "Suivi des ventes",
    icon: "doc",
    category: "ventes",
    portrait: "/assets/img/agents/hugo.jpg",
    heroPortrait: "/assets/img/agents/hugo-hero.jpg",
    example: "Repère les devis sans réponse, rédige des relances et mets à jour mon CRM.",
    tagline: "Relance les devis sans réponse et met à jour votre CRM.",
    description:
      "Hugo repère les devis sans réponse, prépare vos relances et met à jour votre CRM.",
    tasks: [
      { icon: "doc", label: "Repérer les devis en attente" },
      { icon: "mail", label: "Préparer les relances" },
      { icon: "refresh", label: "Mettre à jour le CRM" },
    ],
    action:
      "Un devis est resté sans réponse. Hugo prépare un message de relance à valider et consigne le suivi dans votre CRM.",
    capabilities: [
      "Signale les devis à relancer au bon moment",
      "Centralise l'historique commercial",
      "Prépare les points de suivi client",
    ],
    integrations: ["CRM", "E-mail", "Outils de facturation", "Signature électronique"],
    demo: [
      { from: "client", text: "Quels devis n'ont pas eu de réponse cette semaine ?" },
      {
        from: "agent",
        text: "Trois devis sont en attente. J'ai préparé une relance pour chacun — je les envoie ?",
      },
    ],
  }),
  withFeatures({
    id: "jade",
    name: "Jade",
    role: "Marketing et réseaux sociaux",
    headline: "Votre agente marketing et réseaux sociaux",
    menu: "Marketing et réseaux sociaux",
    icon: "megaphone",
    category: "ventes",
    portrait: "/assets/img/agents/jade.jpg",
    heroPortrait: "/assets/img/agents/jade-hero.jpg",
    example: "Prépare le calendrier de contenu du mois et envoie-moi les posts pour validation.",
    tagline: "Prépare votre calendrier de contenu et vos posts pour validation.",
    description:
      "Jade prépare votre calendrier éditorial et rédige vos publications pour validation.",
    tasks: [
      { icon: "calendar", label: "Planifier vos contenus" },
      { icon: "edit", label: "Rédiger vos publications" },
      { icon: "check-circle", label: "Préparer les contenus à valider" },
    ],
    action:
      "Pour un lancement, Jade propose un calendrier de publications et prépare les textes à valider.",
    capabilities: [
      "Respecte votre ton et votre charte",
      "Décline un contenu sur plusieurs canaux",
      "Propose des horaires de publication",
    ],
    integrations: ["Instagram", "LinkedIn", "Facebook", "Google Analytics"],
    demo: [
      { from: "client", text: "Prépare 3 posts LinkedIn pour notre nouvelle offre." },
      {
        from: "agent",
        text: "Voici 3 propositions avec visuels suggérés et horaires de publication conseillés.",
      },
    ],
  }),
  withFeatures({
    id: "sacha",
    name: "Sacha",
    role: "SEO et rédaction web",
    headline: "Votre agent SEO et rédaction web",
    menu: "SEO et rédaction web",
    icon: "bars",
    category: "ventes",
    portrait: "/assets/img/agents/sacha.jpg",
    heroPortrait: "/assets/img/agents/sacha-hero.jpg",
    example:
      "Trouve les questions que recherchent mes clients et propose des pages ou articles qui y répondent.",
    tagline: "Améliore votre visibilité avec des pages et articles utiles.",
    description:
      "Sacha repère les questions que vos clients recherchent et propose des contenus pour y répondre.",
    tasks: [
      { icon: "eye", label: "Rechercher des mots-clés" },
      { icon: "bulb", label: "Proposer des sujets" },
      { icon: "file-text", label: "Préparer des contenus web" },
    ],
    action:
      "Pour un artisan, Sacha repère les recherches locales et propose une page de service ainsi que des idées d'articles.",
    capabilities: [
      "Identifie les intentions de recherche",
      "Propose une structure d'article claire",
      "Suit les performances de vos pages",
    ],
    integrations: ["Google Search Console", "Google Analytics", "CMS"],
    demo: [
      { from: "client", text: "Quelles pages créer pour répondre aux questions de nos clients ?" },
      {
        from: "agent",
        text: "Voici 5 sujets prioritaires avec un plan pour chaque page et les mots-clés associés.",
      },
    ],
  }),
  withFeatures({
    id: "ines",
    name: "Inès",
    role: "Recrutement",
    headline: "Votre agente de recrutement",
    menu: "Recrutement",
    icon: "users",
    category: "operations",
    portrait: "/assets/img/agents/ines.jpg",
    heroPortrait: "/assets/img/agents/ines-hero.jpg",
    example:
      "Réponds aux questions sur le poste, collecte les candidatures et planifie les entretiens.",
    tagline: "Répond aux candidats, collecte les CV et planifie les entretiens.",
    description:
      "Inès répond aux questions sur vos postes, rassemble les candidatures et organise les entretiens.",
    tasks: [
      { icon: "chat", label: "Répondre aux candidats" },
      { icon: "users", label: "Rassembler les candidatures" },
      { icon: "calendar", label: "Planifier les entretiens" },
    ],
    action:
      "Pour un poste ouvert, Inès répond aux questions des candidats et recueille leurs disponibilités avant de proposer des créneaux d'entretien.",
    capabilities: [
      "Analyse les CV selon vos critères",
      "Propose une liste courte de profils",
      "Tient chaque candidat informé",
    ],
    integrations: ["LinkedIn", "Job boards", "E-mail", "Google Agenda"],
    demo: [
      { from: "client", text: "Combien de candidatures pour le poste de commercial ?" },
      {
        from: "agent",
        text: "34 reçues, 6 correspondent à vos critères. Je propose des entretiens mardi et mercredi ?",
      },
    ],
  }),
  withFeatures({
    id: "noe",
    name: "Noé",
    role: "Facturation",
    headline: "Votre agent de facturation et de suivi administratif",
    menu: "Facturation",
    icon: "doc",
    category: "operations",
    portrait: "/assets/img/agents/noe.jpg",
    heroPortrait: "/assets/img/agents/noe-hero.jpg",
    example: "Prépare les factures pour validation et signale les paiements en retard.",
    tagline: "Prépare les factures et signale les paiements en retard.",
    description:
      "Noé prépare vos factures pour validation et vous signale les paiements en retard.",
    tasks: [
      { icon: "doc", label: "Préparer les factures" },
      { icon: "calendar", label: "Suivre les échéances" },
      { icon: "bolt", label: "Signaler les retards" },
    ],
    action:
      "Une facture arrive à échéance sans paiement. Noé vous le signale et prépare un rappel à valider.",
    capabilities: [
      "Utilise vos modèles et vos tarifs",
      "Relance les paiements en retard",
      "Centralise le suivi administratif",
    ],
    integrations: ["Outils de facturation", "E-mail", "CRM", "Comptabilité"],
    demo: [
      { from: "client", text: "Quelles factures sont en retard de plus de 15 jours ?" },
      {
        from: "agent",
        text: "Deux factures : Dupont (1 200 €) et Martin (890 €). Je prépare les relances ?",
      },
    ],
  }),
  withFeatures({
    id: "eva",
    name: "Éva",
    role: "Assistante interne",
    headline: "Votre assistante interne",
    menu: "Assistante interne",
    icon: "sparkle",
    category: "operations",
    portrait: "/assets/img/agents/eva.jpg",
    heroPortrait: "/assets/img/agents/eva-hero.jpg",
    example:
      "Trouve la politique de remboursement des notes de frais et donne-moi le lien vers le bon formulaire.",
    tagline: "Retrouve vos procédures internes et les bons formulaires.",
    description:
      "Éva aide vos équipes à retrouver des réponses dans vos documents et procédures internes.",
    tasks: [
      { icon: "file-text", label: "Rechercher dans vos documents" },
      { icon: "info", label: "Expliquer vos procédures" },
      { icon: "share", label: "Partager les liens utiles" },
    ],
    action:
      "Un nouveau salarié cherche comment se faire rembourser ses frais. Éva lui indique la procédure et lui donne le lien vers le formulaire.",
    capabilities: [
      "Interroge votre documentation interne",
      "Répond aux questions RH et process",
      "Oriente vers le bon interlocuteur si besoin",
    ],
    integrations: ["Notion", "Google Drive", "Confluence", "Intranet"],
    demo: [
      { from: "client", text: "Où est la politique de remboursement des notes de frais ?" },
      {
        from: "agent",
        text: "Voici le document et le lien vers le formulaire à remplir avant le 5 du mois.",
      },
    ],
  }),
  withFeatures({
    id: "clara",
    name: "Clara",
    role: "Assistante juridique",
    headline: "Votre assistante juridique IA",
    menu: "Assistante juridique",
    icon: "shield",
    category: "operations",
    portrait: "/assets/img/agents/clara.jpg",
    heroPortrait: "/assets/img/agents/clara-hero.jpg",
    example:
      "Résume ce contrat fournisseur, relève les échéances et liste les points à faire valider par mon juriste.",
    tagline: "Résume vos contrats et prépare les points à faire vérifier.",
    description:
      "Clara résume vos contrats et prépare les points à faire vérifier par votre juriste.",
    tasks: [
      { icon: "file-text", label: "Résumer vos contrats" },
      { icon: "calendar", label: "Repérer les clauses et échéances" },
      { icon: "check-circle", label: "Préparer les points à vérifier" },
    ],
    action:
      "Clara résume un contrat fournisseur, relève les conditions de renouvellement et de résiliation, puis liste les points à faire valider par votre juriste.",
    capabilities: [
      "Repère les conditions de renouvellement et de résiliation",
      "Liste les points à valider par un juriste",
      "Ne remplace pas un conseil juridique professionnel",
    ],
    integrations: ["Google Drive", "E-mail", "Outils de signature"],
    demo: [
      { from: "client", text: "Peux-tu résumer ce contrat fournisseur ?" },
      {
        from: "agent",
        text: "Voici le résumé, les échéances clés et 4 points à faire valider par votre juriste.",
      },
    ],
  }),
];

export const agentById = (id: string) => agents.find((agent) => agent.id === id);

/** Featured agents for surfaces that still need a short shortlist. */
export const featuredAgents: Agent[] = [
  agentById("milo")!,
  agentById("nora")!,
  agentById("adam")!,
  agentById("jade")!,
];

/** Old public URLs → new named agents (catalog refresh). */
export const AGENT_ID_REDIRECTS: Record<string, string> = {
  voix: "milo",
  whatsapp: "nora",
  support: "nora",
  ventes: "adam",
  marketing: "jade",
  commercial: "hugo",
  productivite: "lea",
  recrutement: "ines",
  analyse: "eva",
  technique: "sacha",
};
