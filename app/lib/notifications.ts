import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Team e-mail notifications (sent to EMAIL_NOTIFY_TO), switched on/off in Paramètres → Notifications.
 * Stored in private_settings "team_notifications" (admins only); read here with the service role because
 * e-mails are also sent from the Stripe webhook, where there is no signed-in user.
 *
 * Contact-form messages are deliberately NOT switchable: they are only delivered by e-mail (not stored),
 * so turning them off would silently lose them.
 */

export const NOTIFICATIONS_KEY = "team_notifications";
export const NOTIFICATION_IDS = ["newRequest", "depositPaid"] as const;
export type NotificationId = (typeof NOTIFICATION_IDS)[number];
export type TeamNotifications = Record<NotificationId, boolean>;
export const DEFAULT_NOTIFICATIONS: TeamNotifications = { newRequest: true, depositPaid: true };

export async function getTeamNotifications(): Promise<TeamNotifications> {
  try {
    const { data, error } = await createAdminClient().from("private_settings").select("value").eq("key", NOTIFICATIONS_KEY).maybeSingle();
    if (error) throw error;
    const saved = (data?.value ?? {}) as Partial<Record<NotificationId, unknown>>;
    return Object.fromEntries(NOTIFICATION_IDS.map((id) => [id, typeof saved[id] === "boolean" ? saved[id] : DEFAULT_NOTIFICATIONS[id]])) as TeamNotifications;
  } catch (cause) {
    // When in doubt, keep notifying: a missed request costs more than an extra e-mail.
    console.error("Could not load team notification settings:", cause);
    return { ...DEFAULT_NOTIFICATIONS };
  }
}
