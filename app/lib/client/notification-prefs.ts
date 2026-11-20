/*
 * Communication preferences of a customer (profiles.notification_prefs, migration 018), as shown in
 * "Mon compte → Notifications":
 *   billing       — Factures et paiements (payment received / failed, invoice issued)
 *   news          — Actualités et nouveautés (marketing: opt-in, off by default)
 *   subscription  — Alertes sur mon abonnement (plan / option changes, cancellation, renewal)
 * Messages that are required to run the account (sign-in codes, password / e-mail changes, legal notices) are not
 * optional and ignore these preferences.
 */

export type NotificationPrefs = { billing: boolean; news: boolean; subscription: boolean };
export type NotificationCategory = keyof NotificationPrefs;

export const DEFAULT_PREFS: NotificationPrefs = { billing: true, news: false, subscription: true };

export function parsePrefs(value: unknown): NotificationPrefs {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    billing: typeof v.billing === "boolean" ? v.billing : DEFAULT_PREFS.billing,
    news: typeof v.news === "boolean" ? v.news : DEFAULT_PREFS.news,
    subscription: typeof v.subscription === "boolean" ? v.subscription : DEFAULT_PREFS.subscription,
  };
}
