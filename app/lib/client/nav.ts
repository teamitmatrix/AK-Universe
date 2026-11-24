/*
 * Client space menu (approved "Espace client" mockup). `ready` = the page exists. Items not built yet are shown
 * disabled ("Bientôt") instead of linking to a 404 — same rule as the Commercial / Videographer spaces. Flip
 * `ready` to true when a screen is added under app/client/dashboard/; every dashboard button pointing at it then
 * becomes a link to it automatically (see clientHref).
 */
export const CLIENT_NAV = [
  { id: "accueil", label: "Accueil", href: "/client/dashboard", ready: true },
  { id: "offre", label: "Mon offre", href: "/client/dashboard/mon-offre", ready: true },
  { id: "facturation", label: "Facturation", href: "/client/dashboard/facturation", ready: true },
  { id: "options", label: "Options", href: "/client/dashboard/options", ready: true },
  { id: "compte", label: "Mon compte", href: "/client/dashboard/mon-compte", ready: true },
  { id: "support", label: "Support", href: "/client/dashboard/support", ready: true },
] as const;

export type ClientNavId = (typeof CLIENT_NAV)[number]["id"];

/** Link to a client page, or null while that page does not exist yet. */
export function clientHref(id: ClientNavId, query?: string): string | null {
  const item = CLIENT_NAV.find((n) => n.id === id);
  if (!item?.ready) return null;
  return query ? `${item.href}?${query}` : item.href;
}
