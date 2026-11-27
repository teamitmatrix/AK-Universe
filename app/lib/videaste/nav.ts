/*
 * Videographer space menu (Espace Vidéaste handoff, page 11). `ready` = the page exists. Items not built yet are
 * shown disabled ("bientôt") instead of linking to a 404. Flip `ready` to true when a screen is added under
 * app/videaste/(space)/.
 */
export const VIDEASTE_NAV = [
  { id: "dashboard", label: "Dashboard", href: "/videaste/dashboard", ready: true },
  { id: "projets", label: "Mes projets", href: "/videaste/mes-projets", ready: true },
  { id: "aMonter", label: "À monter", href: "/videaste/a-monter", ready: true },
  { id: "retours", label: "Retours clients", href: "/videaste/retours-clients", ready: true },
  { id: "fichiers", label: "Fichiers", href: "/videaste/fichiers", ready: true },
  { id: "tarifs", label: "Tarifs", href: "/videaste/tarifs", ready: true },
  { id: "agenda", label: "Agenda", href: "/videaste/agenda", ready: true },
  { id: "profil", label: "Mon profil", href: "/videaste/mon-profil", ready: true },
] as const;

export type VideasteNavId = (typeof VIDEASTE_NAV)[number]["id"];

/** Link to a videographer page, or null while that page does not exist yet. */
export function videasteHref(id: VideasteNavId, query?: string) {
  const item = VIDEASTE_NAV.find((n) => n.id === id);
  if (!item?.ready) return null;
  return query ? `${item.href}?${query}` : item.href;
}
