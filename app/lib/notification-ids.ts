/**
 * Switches in Paramètres → Notifications.
 * Team ids mail EMAIL_NOTIFY_TO. Person ids mail the commercial or videographer the event is about.
 */

export const TEAM_NOTIFICATION_IDS = ["newRequest", "depositPaid", "lead", "quote", "commission", "latePayment", "abandonedCarts"] as const;
export const PERSON_NOTIFICATION_IDS = [
  "lead_assigned",
  "quote_accepted",
  "invoice_paid",
  "commission_validated",
  "commission_paid",
  "task_assigned",
  "reminder_due",
] as const;
export const NOTIFICATION_IDS = [...TEAM_NOTIFICATION_IDS, ...PERSON_NOTIFICATION_IDS] as const;
export type NotificationId = (typeof NOTIFICATION_IDS)[number];
export type TeamNotifications = Record<NotificationId, boolean>;

export const DEFAULT_NOTIFICATIONS: TeamNotifications = Object.fromEntries(NOTIFICATION_IDS.map((id) => [id, true])) as TeamNotifications;
