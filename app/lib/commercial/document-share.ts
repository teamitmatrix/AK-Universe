import "server-only";
import { randomBytes } from "node:crypto";
import { escapeHtml, sendEmail } from "@/lib/email";
import { notifyQuoteSent, sendTeamNotice } from "@/lib/notify-mail";
import { getSiteUrl } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/server";
import { toDoc, type SalesDoc } from "./sales-docs";

const SHARE_COLUMNS =
  "id, number, kind, status, client_name, client_email, client_siret, client_address, issue_date, due_date, lines, vat_rate, total_ht_cents, total_ttc_cents, commission_cents, amount_paid_cents, notes, quote_id, paid_at, created_at, share_token, client_signature, signer_name, signed_at";
const SHARE_COLUMNS_FALLBACK =
  "id, number, kind, status, client_name, client_email, client_siret, client_address, issue_date, due_date, lines, vat_rate, total_ht_cents, total_ttc_cents, commission_cents, notes, quote_id, paid_at, created_at, share_token";

export function isShareToken(token: string) {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}

function newShareToken() {
  return randomBytes(24).toString("base64url");
}

/** Load a non-draft document by its public share token (service role). */
export async function loadSalesDocByShareToken(token: string): Promise<SalesDoc | null> {
  if (!isShareToken(token)) return null;
  try {
    const admin = createAdminClient();
    let { data, error } = await admin.from("sales_documents").select(SHARE_COLUMNS).eq("share_token", token).maybeSingle();
    if (error && /amount_paid_cents|share_token|client_signature|signer_name|signed_at/.test(error.message)) {
      ({ data, error } = await admin.from("sales_documents").select(SHARE_COLUMNS_FALLBACK).eq("share_token", token).maybeSingle());
    }
    if (error || !data) return null;
    if (data.status === "brouillon" || data.status === "annulee") return null;
    return toDoc(data as Record<string, unknown>);
  } catch (cause) {
    console.error("loadSalesDocByShareToken failed:", cause);
    return null;
  }
}

async function ensureShareToken(docId: string, existing: string | null): Promise<string | null> {
  if (existing) return existing;
  const token = newShareToken();
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("sales_documents").update({ share_token: token }).eq("id", docId);
    if (error) {
      console.error("ensureShareToken failed:", error.message);
      return null;
    }
    return token;
  } catch (cause) {
    console.error("ensureShareToken failed:", cause);
    return null;
  }
}

async function sendClientDocumentEmail(input: {
  kind: "devis" | "facture";
  number: string | null;
  clientName: string;
  clientEmail: string;
  totalHtCents: number;
  shareUrl: string;
}) {
  const isQuote = input.kind === "devis";
  const label = isQuote ? "Devis" : "Facture";
  const ref = (input.number ?? "").trim() || label;
  const amount = `${(input.totalHtCents / 100).toLocaleString("fr-FR")} € HT`;
  const firstName = input.clientName.trim().split(/\s+/)[0] || "Bonjour";
  const subject = `Votre ${label.toLowerCase()} ${ref} — AK Universe`;
  const intro = isQuote
    ? "Veuillez trouver ci-dessous le lien pour consulter et télécharger votre devis."
    : "Veuillez trouver ci-dessous le lien pour consulter et télécharger votre facture.";
  const site = getSiteUrl();
  const body = `
<p style="margin:0 0 12px">Bonjour ${escapeHtml(firstName)},</p>
<p style="margin:0 0 12px">${escapeHtml(intro)}</p>
<p style="margin:0 0 8px"><strong>${escapeHtml(ref)}</strong> — ${escapeHtml(amount)}</p>
<p style="margin:20px 0 8px;text-align:center">
  <a href="${escapeHtml(input.shareUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:linear-gradient(180deg,#ffc95a,#f7ac2c);color:#1b1206;font-weight:800;text-decoration:none">
    Télécharger ${escapeHtml(label.toLowerCase())}
  </a>
</p>
<p style="margin:16px 0 0;color:#bdb3a4;font-size:13px;text-align:center">
  <a href="${escapeHtml(input.shareUrl)}" style="color:#fdb942">${escapeHtml(input.shareUrl)}</a>
</p>
<p style="margin:20px 0 0">Cordialement,<br/>L&apos;équipe AK Universe</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#070504;font-family:Figtree,Arial,sans-serif;color:#f4efe8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070504;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0e0a07;border:1px solid #2a2118;border-radius:16px">
<tr><td align="center" style="padding:28px 28px 8px">
  <img src="${escapeHtml(site)}/assets/img/logo.svg" alt="AK Universe" width="64" height="64" style="display:block;margin:0 auto 10px;border:0" />
  <div style="font-size:20px;font-weight:800;letter-spacing:.5px"><span style="color:#fdb942">AK</span> UNIVERSE</div>
</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6">
<h1 style="margin:0 0 16px;font-size:20px;color:#fdb942;text-align:center">${escapeHtml(subject)}</h1>
${body}
</td></tr></table>
<p style="color:#8a7f73;font-size:12px;margin:16px 0 0">${escapeHtml(site)}</p>
</td></tr></table></body></html>`;

  return sendEmail({
    to: input.clientEmail,
    subject,
    html,
    text: [`Bonjour ${firstName},`, "", intro, `${ref} — ${amount}`, "", input.shareUrl, "", "L'équipe AK Universe"].join("\n"),
  });
}

/**
 * After a devis/facture is issued (status en_attente): ensure a share token, mail the client
 * a download link, and keep the existing team “envoyé” notice for devis.
 */
export async function notifyDocumentIssued(docId: string) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("sales_documents").select(SHARE_COLUMNS).eq("id", docId).maybeSingle();
    if (error || !data) {
      if (error) console.error("notifyDocumentIssued load failed:", error.message);
      return;
    }
    if (data.status !== "en_attente") return;

    const kind = data.kind as "devis" | "facture";
    const number = (data.number as string | null) ?? null;
    const clientName = String(data.client_name ?? "");
    const clientEmail = (data.client_email as string | null)?.trim().toLowerCase() || null;
    const totalHtCents = Number(data.total_ht_cents ?? 0);

    const token = await ensureShareToken(docId, (data.share_token as string | null) ?? null);
    const shareUrl = token ? `${getSiteUrl()}/d/${token}` : null;

    if (kind === "devis") {
      await notifyQuoteSent({ number, clientName, totalHtCents });
    } else {
      const amount = `${(totalHtCents / 100).toLocaleString("fr-FR")} € HT`;
      await sendTeamNotice("quote", `Facture émise ${number ?? ""}`.trim(), [clientName, amount]);
    }

    if (clientEmail && shareUrl) {
      await sendClientDocumentEmail({
        kind,
        number,
        clientName,
        clientEmail,
        totalHtCents,
        shareUrl,
      });
    } else if (!clientEmail) {
      console.warn(`Document ${number ?? docId} issued without client e-mail: download link not sent`);
    } else if (!shareUrl) {
      console.warn(`Document ${number ?? docId}: share_token unavailable (apply migration 016?)`);
    }
  } catch (cause) {
    console.error("notifyDocumentIssued failed:", cause);
  }
}
