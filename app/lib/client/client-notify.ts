import "server-only";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { parsePrefs, type NotificationCategory } from "./notification-prefs";

/*
 * E-mails to customers about their subscription and billing, sent only when the customer kept that category on in
 * "Mon compte → Notifications" (profiles.notification_prefs). Billing mails go to the billing e-mail when one is
 * saved, otherwise to the account e-mail. Never throws: a notice must not make a payment or a change fail.
 */
export async function notifyClient(userId: string, category: NotificationCategory, subject: string, lines: string[]) {
  try {
    const db = createAdminClient();
    const [{ data: profile }, { data: billing }] = await Promise.all([
      db.from("profiles").select("*").eq("id", userId).maybeSingle(),
      category === "billing" ? db.from("billing_profiles").select("email").eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (!profile) return false;
    if (!parsePrefs((profile as { notification_prefs?: unknown }).notification_prefs)[category]) return false;
    const to = (billing as { email?: string | null } | null)?.email || (profile as { email?: string | null }).email;
    if (!to) return false;

    const body = lines
      .filter(Boolean)
      .map((l) => `<p style="margin:0 0 10px">${escapeHtml(l)}</p>`)
      .join("");
    const link = `${getSiteUrl()}/dashboard`;
    const footer = `<p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="color:#fdb942">Accéder à mon espace client</a></p>
<p style="margin:16px 0 0;color:#a89c8e;font-size:12px">Vous recevez cet e-mail car les alertes « ${category === "billing" ? "Factures et paiements" : category === "subscription" ? "Alertes sur mon abonnement" : "Actualités et nouveautés"} » sont activées dans votre espace client (Mon compte → Notifications).</p>`;
    return await sendEmail({
      to,
      subject,
      html: emailLayout(escapeHtml(subject), body + footer),
      text: `${lines.filter(Boolean).join("\n")}\n\n${link}`,
    });
  } catch (cause) {
    console.error("notifyClient failed:", cause);
    return false;
  }
}
