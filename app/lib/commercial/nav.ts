/*
 * Commercial space menu (handoff page 12). `ready` = the page exists. Items not built yet are shown
 * disabled ("bientôt") instead of linking to a 404, and search results only link to ready pages.
 * Flip `ready` to true when a screen is added under app/commercial/.
 */
export const COMMERCIAL_NAV = [
  { id: "dashboard", href: "/commercial/dashboard", ready: true },
  { id: "prospects", href: "/commercial/prospects", ready: true },
  { id: "ventes", href: "/commercial/mes-ventes", ready: true },
  { id: "devisFactures", href: "/commercial/devis-factures", ready: true },
  { id: "commissions", href: "/commercial/mes-commissions", ready: true },
  { id: "clients", href: "/commercial/mes-clients", ready: true },
  { id: "agenda", href: "/commercial/agenda", ready: true },
  { id: "documents", href: "/commercial/ressources", ready: true },
  { id: "profil", href: "/commercial/mon-profil", ready: true },
] as const;

export type CommercialNavId = (typeof COMMERCIAL_NAV)[number]["id"];

/** Link to a commercial page, or null while that page does not exist yet. */
export function commercialHref(id: CommercialNavId, query?: string) {
  const item = COMMERCIAL_NAV.find((n) => n.id === id);
  if (!item?.ready) return null;
  return query ? `${item.href}?q=${encodeURIComponent(query)}` : item.href;
}
