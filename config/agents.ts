export type Agent = {
  id: string;
  name: string;
  /** Short line used in the "Agents IA" mega menu. */
  menu: string;
  icon: string;
};

/** All agents, in mega-menu order. */
export const agents: Agent[] = [
  { id: "ventes", name: "Agent Ventes", menu: "Prospection, relance, RDV", icon: "chart" },
  { id: "marketing", name: "Agent Marketing", menu: "Réseaux sociaux, SEO, contenu", icon: "megaphone" },
  { id: "support", name: "Agent Support Client", menu: "FAQ, tickets, SAV", icon: "chat" },
  { id: "productivite", name: "Agent Productivité", menu: "Planification, email, tâches", icon: "calendar" },
  { id: "commercial", name: "Agent Commercial", menu: "Devis, contrats, suivi client", icon: "doc" },
  { id: "analyse", name: "Agent Analyse", menu: "Rapports, données, performance", icon: "chart" },
  { id: "technique", name: "Agent Technique", menu: "Automatisations, intégrations", icon: "gear" },
  { id: "recrutement", name: "Agent Recrutement", menu: "Sourcing, présélection, entretiens", icon: "bulb" },
];

/** The 4 agents shown as cards on the homepage. */
export const featuredAgents: (Agent & { description: string })[] = [
  { ...agents[0], description: "Prospection, relance, prise de rendez-vous." },
  { ...agents[1], description: "Réseaux sociaux, SEO, contenu, campagnes." },
  { ...agents[2], description: "FAQ, tickets, SAV, assistance 24/7." },
  { ...agents[3], description: "Planification, email, gestion des tâches." },
];
