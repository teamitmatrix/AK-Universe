/*
 * Support content of the client space, shared by server and client code (no server-only imports):
 * ticket categories / priorities / statuses (same values as the database checks, migration 019), help-centre
 * articles and resources. Help articles describe how the client space actually works — update them when a rule
 * changes (billing rules live in app/lib/client/plan-actions.ts).
 */

export const TICKET_CATEGORIES = {
  offre: "Mon offre",
  facturation: "Facturation et paiements",
  options: "Options et fonctionnalités",
  compte: "Mon compte et sécurité",
  technique: "Problème technique",
  autre: "Autre demande",
} as const;
export type TicketCategory = keyof typeof TICKET_CATEGORIES;
export const isTicketCategory = (v: unknown): v is TicketCategory => typeof v === "string" && v in TICKET_CATEGORIES;

export const TICKET_PRIORITIES = { normale: "Normale", haute: "Haute", urgente: "Urgente" } as const;
export type TicketPriority = keyof typeof TICKET_PRIORITIES;
export const isTicketPriority = (v: unknown): v is TicketPriority => typeof v === "string" && v in TICKET_PRIORITIES;

export const TICKET_STATUSES = {
  ouvert: { label: "Ouvert", tone: "info" },
  en_cours: { label: "En cours", tone: "warn" },
  en_attente: { label: "En attente de votre réponse", tone: "warn" },
  resolu: { label: "Résolu", tone: "ok" },
  ferme: { label: "Fermé", tone: "muted" },
} as const;
export type TicketStatus = keyof typeof TICKET_STATUSES;
export const isTicketStatus = (v: unknown): v is TicketStatus => typeof v === "string" && v in TICKET_STATUSES;

export const SUPPORT_HOURS = "du lundi au vendredi, de 9h à 18h";

/* ---------------- Help centre ---------------- */

export const HELP_CATEGORIES = {
  demarrage: "Bien démarrer",
  offre: "Gérer mon offre",
  facturation: "Facturation et paiements",
  options: "Options et fonctionnalités",
  compte: "Mon compte et sécurité",
} as const;
export type HelpCategory = keyof typeof HELP_CATEGORIES;
export const isHelpCategory = (v: unknown): v is HelpCategory => typeof v === "string" && v in HELP_CATEGORIES;

export type HelpArticle = { id: string; category: HelpCategory; q: string; a: string; link?: { href: string; label: string } };

export const HELP_ARTICLES: HelpArticle[] = [
  // Bien démarrer
  {
    id: "espace-client",
    category: "demarrage",
    q: "À quoi sert mon espace client ?",
    a: "Votre espace client regroupe votre abonnement Agents IA : l'accueil résume votre offre et vos prochains prélèvements, « Mon offre » permet de la faire évoluer, « Facturation » réunit vos factures et votre moyen de paiement, « Options » vos fonctionnalités supplémentaires, et « Mon compte » vos informations et votre sécurité.",
    link: { href: "/client/dashboard", label: "Aller à l'accueil" },
  },
  {
    id: "premiers-pas",
    category: "demarrage",
    q: "Quelles sont les premières étapes après ma souscription ?",
    a: "1. Vérifiez vos informations de facturation (Facturation → Informations de facturation) pour qu'elles figurent sur vos factures. 2. Activez la double authentification (Mon compte → Sécurité). 3. Ajoutez les options utiles à votre activité (Options). 4. Pour la configuration de vos agents, créez une demande au support : notre équipe vous accompagne.",
    link: { href: "/client/dashboard/mon-compte", label: "Ouvrir Mon compte" },
  },
  {
    id: "contacter",
    category: "demarrage",
    q: "Comment contacter le support ?",
    a: `Créez une demande depuis la page Support : elle reçoit un numéro (SUP-…). La réponse de l'équipe apparaît dans cette demande, rubrique « Mes demandes ». Notre équipe répond ${SUPPORT_HOURS}. Pour une question rapide, l'assistant « Discuter en direct » répond immédiatement.`,
  },
  // Offre
  {
    id: "changer-offre",
    category: "offre",
    q: "Comment passer à une offre supérieure ?",
    a: "Dans « Mon offre », cliquez sur « Améliorer mon offre » et choisissez la nouvelle offre. Le changement est immédiat : seule la différence, calculée au prorata de la période en cours, est prélevée. Le montant exact vous est indiqué avant confirmation.",
    link: { href: "/client/dashboard/mon-offre", label: "Ouvrir Mon offre" },
  },
  {
    id: "offre-inferieure",
    category: "offre",
    q: "Que se passe-t-il si je passe à une offre inférieure ?",
    a: "Le changement est programmé pour votre prochaine échéance : vous conservez votre offre actuelle jusqu'à cette date, sans remboursement de la période en cours. Vous pouvez annuler un changement programmé à tout moment avant son application.",
    link: { href: "/client/dashboard/mon-offre", label: "Ouvrir Mon offre" },
  },
  {
    id: "resilier",
    category: "offre",
    q: "Comment résilier mon abonnement ?",
    a: "Dans « Mon offre », cliquez sur « Résilier mon abonnement » puis confirmez. Votre accès reste actif jusqu'à la fin de la période déjà payée et aucun nouveau prélèvement n'est effectué. Vous pouvez réactiver votre abonnement avant cette date.",
    link: { href: "/client/dashboard/mon-offre?resilier=1", label: "Résilier" },
  },
  // Facturation
  {
    id: "factures",
    category: "facturation",
    q: "Où trouver mes factures ?",
    a: "Toutes vos factures sont dans « Facturation » → Historique des factures : l'icône œil les affiche, l'icône de téléchargement fournit le PDF.",
    link: { href: "/client/dashboard/facturation", label: "Ouvrir Facturation" },
  },
  {
    id: "moyen-paiement",
    category: "facturation",
    q: "Comment changer de carte ou de moyen de paiement ?",
    a: "Dans « Facturation », cliquez sur « Modifier » dans la carte Moyen de paiement. Vous êtes redirigé vers la page sécurisée de notre prestataire de paiement : AK Universe ne voit ni ne conserve vos numéros de carte.",
    link: { href: "/client/dashboard/facturation", label: "Ouvrir Facturation" },
  },
  {
    id: "annuel",
    category: "facturation",
    q: "Puis-je passer à la facturation annuelle ?",
    a: "Oui, depuis la carte Montant de la page Facturation. La remise annuelle s'applique, une nouvelle période commence le jour du changement et le temps non utilisé de la période en cours est déduit. Le montant à régler (ou le crédit) est affiché avant confirmation.",
    link: { href: "/client/dashboard/facturation", label: "Ouvrir Facturation" },
  },
  {
    id: "echec-paiement",
    category: "facturation",
    q: "Mon paiement a échoué, que faire ?",
    a: "Mettez à jour votre moyen de paiement (Facturation → Moyen de paiement → Modifier), puis réglez la facture en attente depuis le lien « Régler la facture » affiché en haut de la page Facturation.",
    link: { href: "/client/dashboard/facturation", label: "Ouvrir Facturation" },
  },
  {
    id: "infos-facture",
    category: "facturation",
    q: "Comment modifier le nom, l'adresse ou le numéro de TVA de mes factures ?",
    a: "Dans « Facturation » ou « Mon compte », section Informations de facturation, cliquez sur « Modifier ». Les changements s'appliquent à vos prochaines factures ; les factures déjà émises ne sont pas modifiées.",
    link: { href: "/client/dashboard/facturation", label: "Ouvrir Facturation" },
  },
  // Options
  {
    id: "ajouter-option",
    category: "options",
    q: "Comment ajouter une option ?",
    a: "Dans « Options », cliquez sur « Ajouter » à côté de l'option, vérifiez le nouveau total puis « Mettre à jour mon abonnement ». L'option est active immédiatement ; seul le prorata de la période en cours est facturé.",
    link: { href: "/client/dashboard/options", label: "Ouvrir Options" },
  },
  {
    id: "retirer-option",
    category: "options",
    q: "Comment retirer une option ?",
    a: "Désactivez l'option dans « Options » puis confirmez. Le retrait prend effet à votre prochaine échéance : l'option reste disponible jusque-là.",
    link: { href: "/client/dashboard/options", label: "Ouvrir Options" },
  },
  // Compte
  {
    id: "2fa",
    category: "compte",
    q: "Comment activer la double authentification ?",
    a: "Dans « Mon compte » → Sécurité, activez « Authentification à deux facteurs », scannez le QR code avec une application d'authentification (Google Authenticator, Microsoft Authenticator…) et saisissez le code affiché. Il vous sera demandé à chaque connexion.",
    link: { href: "/client/dashboard/mon-compte", label: "Ouvrir Mon compte" },
  },
  {
    id: "email",
    category: "compte",
    q: "Comment changer mon adresse e-mail ?",
    a: "Dans « Mon compte », cliquez sur « Modifier » puis « Changer d'adresse e-mail ». Un code est envoyé à la nouvelle adresse : votre adresse ne change qu'une fois ce code saisi.",
    link: { href: "/client/dashboard/mon-compte", label: "Ouvrir Mon compte" },
  },
  {
    id: "mot-de-passe",
    category: "compte",
    q: "J'ai oublié mon mot de passe.",
    a: "Sur la page de connexion, cliquez sur « Mot de passe oublié » : un lien de réinitialisation vous est envoyé par e-mail. Une fois connecté, vous pouvez aussi le modifier dans Mon compte → Sécurité.",
    link: { href: "/connexion", label: "Page de connexion" },
  },
  {
    id: "donnees",
    category: "compte",
    q: "Comment récupérer ou supprimer mes données ?",
    a: "Dans « Mon compte » → Autres actions : « Exporter mes données » télécharge l'ensemble de vos informations ; « Supprimer mon compte » supprime définitivement votre compte (après confirmation) et résilie votre abonnement.",
    link: { href: "/client/dashboard/mon-compte", label: "Ouvrir Mon compte" },
  },
];

/** Accent-insensitive search over questions and answers. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export function searchHelp(query: string, category?: HelpCategory | null) {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
  return HELP_ARTICLES.filter((a) => (!category || a.category === category) && words.every((w) => fold(`${a.q} ${a.a}`).includes(w)));
}

/* ---------------- Resources ---------------- */

/** "Ressources et guides". `href: null` = not published yet (shown as "Bientôt"). */
export const RESOURCES: { id: string; title: string; desc: string; href: string | null; icon: "doc" | "play" | "bulb" }[] = [
  { id: "guide", title: "Guide de démarrage", desc: "Configurez rapidement votre environnement.", href: "/client/dashboard/support/aide?categorie=demarrage", icon: "doc" },
  { id: "webinaires", title: "Webinaires et formations", desc: "Découvrez les bonnes pratiques en vidéo.", href: null, icon: "play" },
  { id: "nouveautes", title: "Nouveautés produit", desc: "Toutes les dernières mises à jour et améliorations.", href: null, icon: "bulb" },
];
