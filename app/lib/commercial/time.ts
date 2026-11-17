/*
 * Dates of the sales space are shown in the company's time zone (Europe/Paris), not the machine's: client components
 * are rendered on the server AND in the browser, and both must print the same day and time (no hydration mismatch,
 * no "tomorrow" turning into "today" when the server runs in UTC).
 */
export const TZ = "Europe/Paris";

const keyFmt = new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
/** "2026-11-13" — the calendar day of an instant in Paris. */
export const dayKey = (iso: string | number | Date) => keyFmt.format(new Date(iso));
/** The day after a "YYYY-MM-DD" key. */
export const nextDayKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};
export const timeFr = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const dateFrTz = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: TZ });
export const dateTimeFr = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
/** "jeudi 13 novembre" for a day key. */
export const dayLabelFr = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
/** A "YYYY-MM-DDTHH:mm" value for <input type="datetime-local">, in Paris time. */
export const toLocalInputParis = (iso: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
