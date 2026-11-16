import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_NOTIFICATIONS, NOTIFICATION_IDS, type NotificationId, type TeamNotifications } from "./notification-ids";

export { DEFAULT_NOTIFICATIONS, NOTIFICATION_IDS, TEAM_NOTIFICATION_IDS, PERSON_NOTIFICATION_IDS, type NotificationId, type TeamNotifications } from "./notification-ids";

/*
 * E-mail switches (Paramètres → Notifications), stored in private_settings "team_notifications".
 * Read here with the service role because e-mails are also sent from the Stripe webhook, where there is no signed-in user.
 *   team ids   → EMAIL_NOTIFY_TO (new request, deposit, lead, quote, commission, late payment, abandoned carts)
 *   person ids → the e-mail of the commercial or videographer the in-app alert is for
 *
 * Contact-form messages are deliberately NOT switchable: they are only delivered by e-mail (not stored),
 * so turning them off would silently lose them.
 */

export const NOTIFICATIONS_KEY = "team_notifications";

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
