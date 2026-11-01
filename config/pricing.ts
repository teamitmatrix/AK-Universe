/** Agents IA subscription pricing (from abonnement.html / main.js). Amounts are EUR excl. VAT. */
export const PLAN = {
  id: "pro",
  name: "AK Universe Pro",
  monthlyPrice: 79.9,
  features: ["Agents IA illimités", "Toutes les fonctionnalités", "Support prioritaire", "Mises à jour incluses"],
};

export const USER_PRICE = 9.9;
export const MAX_EXTRA_USERS = 500;
export const ANNUAL_DISCOUNT = 0.2;

export type Cycle = "mensuel" | "annuel";

export const OPTIONS = [
  { id: "telephonie", label: "Téléphonie IA", icon: "phone", price: 49.9, info: "Un agent IA répond à vos appels 24h/24." },
  { id: "maj-premium", label: "Mises à jour premium", icon: "refresh", price: 12.9, info: "Accès anticipé aux nouvelles fonctionnalités." },
  { id: "statut-premium", label: "Statut premium", icon: "crown-o", price: 9.9, info: "Badge premium et priorité de traitement." },
  { id: "generateur", label: "Générateur de contenu avancé", icon: "file", price: 14.9, info: "Modèles avancés pour textes, visuels et vidéos." },
  { id: "analyse", label: "Analyse avancée", icon: "bars", price: 19.9, info: "Tableaux de bord et rapports détaillés." },
] as const;

export type OptionId = (typeof OPTIONS)[number]["id"];

export type Selection = { cycle: Cycle; users: number; options: string[] };

/** Monthly amounts after the annual discount. Used by the page and re-run on the server. */
export function computeQuote({ cycle, users, options }: Selection) {
  const k = cycle === "annuel" ? 1 - ANNUAL_DISCOUNT : 1;
  const chosen = OPTIONS.filter((o) => options.includes(o.id));
  const plan = PLAN.monthlyPrice * k;
  const usersTotal = users * USER_PRICE * k;
  const optionsTotal = chosen.reduce((sum, o) => sum + o.price, 0) * k;
  const monthly = plan + usersTotal + optionsTotal;
  return {
    plan,
    usersTotal,
    optionsTotal,
    optionsCount: chosen.length,
    monthly,
    /** Charged per billing period (12 months at once on the annual cycle). */
    due: cycle === "annuel" ? monthly * 12 : monthly,
  };
}

export function sanitizeSelection(input: Partial<Selection>): Selection {
  const users = Math.floor(Number(input.users) || 0);
  return {
    cycle: input.cycle === "annuel" ? "annuel" : "mensuel",
    users: Math.min(MAX_EXTRA_USERS, Math.max(0, users)),
    options: OPTIONS.map((o) => o.id).filter((id) => input.options?.includes(id)),
  };
}

export const eur = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export const toCents = (n: number) => Math.round(n * 100);
