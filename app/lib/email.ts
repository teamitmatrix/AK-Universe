import "server-only";
import { getSiteUrl } from "@/lib/supabase/env";

/*
 * Transactional e-mail through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Without RESEND_API_KEY nothing is sent: the request is still saved, only the notification is skipped.
 */

export type Email = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Address that receives the notifications for AK Universe (comma-separated list allowed). */
export function teamAddresses() {
  return (process.env.EMAIL_NOTIFY_TO ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

/** Never throws: a failed e-mail must not break a saved request or a Stripe webhook. */
export async function sendEmail(email: Email) {
  if (!emailConfigured()) {
    console.warn(`E-mail not sent (RESEND_API_KEY / EMAIL_FROM missing): ${email.subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: email.replyTo,
      }),
    });
    if (!res.ok) {
      console.error(`E-mail failed (${res.status}): ${email.subject}`, await res.text());
      return false;
    }
    return true;
  } catch (cause) {
    console.error(`E-mail failed: ${email.subject}`, cause);
    return false;
  }
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Same dark/gold look as the site; inline styles because e-mail clients ignore stylesheets. */
export function emailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#070504;font-family:Figtree,Arial,sans-serif;color:#f4efe8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070504;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0e0a07;border:1px solid #2a2118;border-radius:16px">
<tr><td style="padding:28px 28px 8px;font-size:20px;font-weight:800;letter-spacing:.5px"><span style="color:#fdb942">AK</span> UNIVERSE</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6">
<h1 style="margin:0 0 16px;font-size:20px;color:#fdb942">${title}</h1>
${body}
</td></tr></table>
<p style="color:#8a7f73;font-size:12px;margin:16px 0 0">${escapeHtml(getSiteUrl())}</p>
</td></tr></table></body></html>`;
}
