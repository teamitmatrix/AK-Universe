/* Formatting shared by the client space (French, amounts in cents, excl. VAT). Safe on server and client. */

export const money = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export const monthLabel = (iso: string) => {
  const s = new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Whole days left until `iso` (0 once passed). */
export const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/** "15 janv. 2025" — compact date for tables. */
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
