import "server-only";
import { emailConfigured, emailLayout, escapeHtml, sendEmail, teamAddresses } from "@/lib/email";
import { getTeamNotifications, type NotificationId } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/server";

/** Team inbox mail. Returns false when the switch is off, there is no recipient, or sending fails. */
export async function sendTeamNotice(id: NotificationId, subject: string, lines: string[]) {
  const prefs = await getTeamNotifications();
  if (!prefs[id]) return false;
  const to = teamAddresses();
  if (!to.length) {
    console.warn(`EMAIL_NOTIFY_TO is not set: team notice skipped (${id})`);
    return false;
  }
  const body = lines.filter(Boolean).map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`).join("");
  return sendEmail({
    to,
    subject,
    html: emailLayout(escapeHtml(subject), body),
    text: [subject, "", ...lines.filter(Boolean)].join("\n"),
  });
}

export async function sendPersonNotice(to: string, subject: string, lines: string[]) {
  if (!to) return false;
  const body = lines.filter(Boolean).map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`).join("");
  return sendEmail({
    to,
    subject,
    html: emailLayout(escapeHtml(subject), body),
    text: [subject, "", ...lines.filter(Boolean)].join("\n"),
  });
}

const DIGEST_KEY = "notification_digests";

/** A sent quote (commercial devis moved to "envoyé") mails the team when that switch is on. */
export async function notifyQuoteSent(doc: { number: string | null; clientName: string; totalHtCents: number }) {
  const amount = `${(Number(doc.totalHtCents) / 100).toLocaleString("fr-FR")} € HT`;
  await sendTeamNotice("quote", `Devis envoyé ${doc.number ?? ""}`.trim(), [doc.clientName, amount]);
}
const euros = (cents: number) => `${(cents / 100).toLocaleString("fr-FR")} €`;

/**
 * One team e-mail per day for late payments and abandoned carts, and only while that switch is on.
 * Abandoned carts stay aggregate: counts and amounts, never a visitor name or e-mail.
 */
export async function sendOpsDigests(input: {
  lateCount: number;
  lateRefs: string[];
  abandonedDeposits: number;
  abandonedDepositCents: number;
  abandonedSubs: number;
  abandonedSubCents: number;
}) {
  try {
    const prefs = await getTeamNotifications();
    const admin = createAdminClient();
    const { data } = await admin.from("private_settings").select("value").eq("key", DIGEST_KEY).maybeSingle();
    const sent = { ...((data?.value ?? {}) as { latePayment?: string; abandonedCarts?: string }) };
    const today = new Date().toISOString().slice(0, 10);
    let changed = false;

    // No address, or e-mail not configured: record the day so the dashboard does not retry on every visit.
    const quiet = teamAddresses().length === 0 || !emailConfigured();
    if (prefs.latePayment && input.lateCount > 0 && sent.latePayment !== today) {
      const ok = await sendTeamNotice("latePayment", `${input.lateCount} paiement${input.lateCount > 1 ? "s" : ""} en retard`, [
        "Acomptes impayés depuis plus de 7 jours et abonnements en défaut de paiement.",
        input.lateRefs.length ? `Références : ${input.lateRefs.join(", ")}` : "",
      ]);
      if (ok || quiet) {
        sent.latePayment = today;
        changed = true;
      }
    }

    const abandoned = input.abandonedDeposits + input.abandonedSubs;
    if (prefs.abandonedCarts && abandoned > 0 && sent.abandonedCarts !== today) {
      const ok = await sendTeamNotice("abandonedCarts", `${abandoned} panier${abandoned > 1 ? "s" : ""} abandonné${abandoned > 1 ? "s" : ""}`, [
        "Totaux uniquement : aucune identité de visiteur.",
        `Acomptes non payés : ${input.abandonedDeposits} · ${euros(input.abandonedDepositCents)}`,
        `Abonnements non finalisés : ${input.abandonedSubs} · ${euros(input.abandonedSubCents)} / mois`,
      ]);
      if (ok || quiet) {
        sent.abandonedCarts = today;
        changed = true;
      }
    }

    if (changed) {
      await admin.from("private_settings").upsert({ key: DIGEST_KEY, value: sent, updated_at: new Date().toISOString() });
    }
  } catch (cause) {
    console.error("sendOpsDigests failed:", cause);
  }
}
