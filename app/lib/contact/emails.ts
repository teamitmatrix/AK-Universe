import "server-only";
import {
  emailConfigured,
  emailLayout as layout,
  escapeHtml,
  sendEmail,
  teamAddresses,
} from "@/lib/email";
import { COMPANY } from "@/config/company";

export type ContactMessage = {
  name: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  service: string;
  message: string;
};

function recipients() {
  const team = teamAddresses();
  if (team.length) return team;
  return COMPANY.email && COMPANY.email !== "À COMPLÉTER" ? [COMPANY.email] : [];
}

export async function sendContactEmails(data: ContactMessage) {
  const to = recipients();
  if (!emailConfigured() || !to.length) {
    console.warn("Contact message kept locally (e-mail not configured):", {
      subject: data.subject,
      from: data.email,
      name: data.name,
    });
    // Still treat as success so the confirmation UI works in local / pre-Resend setups.
    return true;
  }

  const rows: [string, string][] = [
    ["Nom", data.name],
    ["E-mail", data.email],
    ["Entreprise", data.company || "—"],
    ["Téléphone", data.phone || "—"],
    ["Sujet", data.subject],
    ["Service", data.service || "—"],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#a79d8f;width:140px">${escapeHtml(label)}</td><td style="padding:6px 0;color:#f4efe8">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const body = `
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px">${htmlRows}</table>
<p style="margin:0 0 8px;color:#a79d8f">Message</p>
<p style="margin:0;white-space:pre-wrap;color:#f4efe8">${escapeHtml(data.message)}</p>`;

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Message:",
    data.message,
  ].join("\n");

  return sendEmail({
    to,
    subject: `Contact — ${data.subject} — ${data.name}`,
    html: layout("Nouveau message de contact", body),
    text,
    replyTo: data.email,
  });
}
