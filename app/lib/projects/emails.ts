import "server-only";
import { emailLayout as layout, escapeHtml, sendEmail, teamAddresses } from "@/lib/email";
import { readEarlyStartFromContact, type EarlyStartRecord } from "@/config/withdrawal";

/*
 * Video project e-mails, sent when a project is confirmed:
 *   "received"     quote request, or booking paid by bank transfer (finaliser.html / acompte.html)
 *   "deposit_paid" deposit paid by card (Stripe webhook)
 * Each event sends a notification to AK Universe and a summary to the client.
 */

export type ProjectEvent = "received" | "deposit_paid";

export type ProjectMail = {
  reference: string;
  kind: "devis" | "acompte";
  contact: Record<string, string>;
  items: { service: string; details: string; price: number }[];
  /** Euros. */
  total: number;
  deposit: number;
  lang?: string;
  /** Early-start withdrawal consent recorded at acompte checkout. */
  earlyStart?: EarlyStartRecord | null;
};

const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;

const TEXT = {
  fr: {
    subject: {
      devis: (ref: string) => `Votre demande de devis ${ref} — AK Universe`,
      acompte: (ref: string) => `Votre réservation ${ref} — AK Universe`,
      deposit_paid: (ref: string) => `Acompte reçu, réservation confirmée ${ref} — AK Universe`,
    },
    hello: (name: string) => `Bonjour ${name},`,
    intro: {
      devis: "Merci pour votre demande. Notre équipe étudie votre projet et revient vers vous sous 24 h avec un devis détaillé.",
      acompte:
        "Merci pour votre réservation. Elle sera confirmée dès réception de votre virement de l'acompte. Notre équipe vous contacte rapidement pour la suite.",
      deposit_paid: "Nous avons bien reçu votre acompte : votre réservation est confirmée. Notre équipe vous contacte rapidement pour planifier le tournage.",
    },
    reference: "Référence",
    total: "Total estimé (HT)",
    deposit: "Acompte",
    paid: "Acompte payé",
    earlyStartYes:
      "Démarrage anticipé : vous avez demandé que la prestation commence avant la fin du délai de rétractation de 14 jours, et reconnu que vous perdrez ce droit lorsque la prestation aura été entièrement exécutée.",
    earlyStartNo:
      "Démarrage anticipé : non demandé. La prestation sera planifiée après l'expiration du délai de rétractation de 14 jours, sauf autre accord.",
    withdrawal:
      "Si vous êtes un client particulier ayant commandé à distance, vous disposez en principe de 14 jours à compter de la conclusion du contrat pour vous rétracter. Pour exercer ce droit lorsqu'il est ouvert, répondez à cet e-mail en indiquant votre référence. Vos droits en cas de prestation non conforme restent applicables.",
    outro: "Pour toute question, répondez simplement à cet e-mail.",
    signature: "L'équipe AK Universe",
  },
  en: {
    subject: {
      devis: (ref: string) => `Your quote request ${ref} — AK Universe`,
      acompte: (ref: string) => `Your booking ${ref} — AK Universe`,
      deposit_paid: (ref: string) => `Deposit received, booking confirmed ${ref} — AK Universe`,
    },
    hello: (name: string) => `Hello ${name},`,
    intro: {
      devis: "Thank you for your request. Our team is reviewing your project and will send you a detailed quote within 24 hours.",
      acompte:
        "Thank you for your booking. It will be confirmed as soon as we receive your bank transfer for the deposit. Our team will contact you shortly.",
      deposit_paid: "We have received your deposit: your booking is confirmed. Our team will contact you shortly to schedule the shoot.",
    },
    reference: "Reference",
    total: "Estimated total (excl. VAT)",
    deposit: "Deposit",
    paid: "Deposit paid",
    earlyStartYes:
      "Early start: you asked for the service to begin before the end of the 14-day withdrawal period, and acknowledged that you will lose that right once the service has been fully performed.",
    earlyStartNo:
      "Early start: not requested. Performance will be scheduled after the 14-day withdrawal period, unless otherwise agreed.",
    withdrawal:
      "If you are a consumer who ordered at a distance, you generally have 14 days from contract conclusion to withdraw. To exercise that right when it applies, reply to this e-mail with your reference. Your rights for non-conforming work remain available.",
    outro: "If you have any questions, simply reply to this e-mail.",
    signature: "The AK Universe team",
  },
};

const TEAM_SUBJECT = {
  devis: (ref: string, who: string) => `Nouvelle demande de devis ${ref} — ${who}`,
  acompte: (ref: string, who: string) => `Nouvelle réservation (virement en attente) ${ref} — ${who}`,
  deposit_paid: (ref: string, who: string) => `Acompte payé ${ref} — ${who}`,
};

const CONTACT_LABELS: [string, string][] = [
  ["prenom", "Prénom"],
  ["nom", "Nom"],
  ["entreprise", "Entreprise"],
  ["email", "E-mail"],
  ["tel", "Téléphone"],
  ["lieu", "Lieu du tournage"],
  ["date", "Date souhaitée"],
  ["message", "Message"],
];

function resolveEarlyStart(p: ProjectMail): EarlyStartRecord | null {
  return p.earlyStart ?? readEarlyStartFromContact(p.contact);
}

function itemsTable(p: ProjectMail, labels: { total: string; deposit: string }) {
  const rows = p.items
    .map(
      (i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #2a2118"><strong>${escapeHtml(i.service)}</strong><br>
<span style="color:#a89c8e;font-size:13px">${escapeHtml(i.details)}</span></td>
<td align="right" style="padding:10px 0;border-bottom:1px solid #2a2118;white-space:nowrap">${euros(i.price)}</td></tr>`
    )
    .join("");
  const deposit = p.deposit
    ? `<tr><td style="padding:6px 0">${labels.deposit}</td><td align="right" style="padding:6px 0">${euros(p.deposit)}</td></tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">${rows}
<tr><td style="padding:12px 0 6px;font-weight:700">${labels.total}</td><td align="right" style="padding:12px 0 6px;font-weight:700;color:#fdb942">${euros(p.total)}</td></tr>
${deposit}</table>`;
}

const itemsText = (p: ProjectMail) => p.items.map((i) => `- ${i.service} (${i.details}) : ${euros(i.price)}`).join("\n");

function withdrawalBlock(p: ProjectMail, t: (typeof TEXT)["fr"]) {
  if (p.kind !== "acompte") return { html: "", text: [] as string[] };
  const early = resolveEarlyStart(p);
  const earlyLine = early
    ? early.accepted
      ? t.earlyStartYes
      : t.earlyStartNo
    : null;
  const html = `<p style="margin:16px 0 8px;font-size:13px;color:#d6cdbf;line-height:1.5">${escapeHtml(t.withdrawal)}</p>
${earlyLine ? `<p style="margin:0 0 12px;font-size:13px;color:#d6cdbf;line-height:1.5">${escapeHtml(earlyLine)}</p>` : ""}
${early?.accepted ? `<p style="margin:0 0 12px;font-size:12px;color:#a89c8e;line-height:1.45">Consentement (v${escapeHtml(early.version)}) du ${escapeHtml(early.acceptedAt)} :<br>${escapeHtml(early.wording)}</p>` : ""}`;
  const text = [t.withdrawal, earlyLine, early?.accepted ? `Consentement (v${early.version}) du ${early.acceptedAt} : ${early.wording}` : ""]
    .filter(Boolean)
    .map(String);
  return { html, text };
}

function clientEmail(p: ProjectMail, event: ProjectEvent) {
  const t = p.lang === "en" ? TEXT.en : TEXT.fr;
  const step = event === "deposit_paid" ? "deposit_paid" : p.kind;
  const name = p.contact.prenom || p.contact.nom || "";
  const depositLabel = event === "deposit_paid" ? t.paid : t.deposit;
  const withdrawal = withdrawalBlock(p, t);
  const html = layout(
    t.subject[step](p.reference).replace(/ — AK Universe$/, ""),
    `<p style="margin:0 0 12px">${escapeHtml(t.hello(name))}</p>
<p style="margin:0 0 12px">${t.intro[step]}</p>
<p style="margin:0">${t.reference} : <strong style="color:#fdb942">${escapeHtml(p.reference)}</strong></p>
${itemsTable(p, { total: t.total, deposit: depositLabel })}
${withdrawal.html}
<p style="margin:0 0 12px">${t.outro}</p>
<p style="margin:0">${t.signature}</p>`
  );
  const text = [
    t.hello(name),
    "",
    t.intro[step],
    "",
    `${t.reference} : ${p.reference}`,
    itemsText(p),
    `${t.total} : ${euros(p.total)}`,
    p.deposit ? `${depositLabel} : ${euros(p.deposit)}` : "",
    "",
    ...withdrawal.text,
    "",
    t.outro,
    t.signature,
  ].join("\n");
  return { to: p.contact.email, subject: t.subject[step](p.reference), html, text, replyTo: teamAddresses()[0] };
}

function teamEmail(p: ProjectMail, event: ProjectEvent) {
  const step = event === "deposit_paid" ? "deposit_paid" : p.kind;
  const who = [p.contact.prenom, p.contact.nom].filter(Boolean).join(" ") + (p.contact.entreprise ? ` (${p.contact.entreprise})` : "");
  const contact = CONTACT_LABELS.filter(([key]) => p.contact[key])
    .map(([key, label]) => `<tr><td style="padding:4px 12px 4px 0;color:#a89c8e;vertical-align:top">${label}</td><td style="padding:4px 0">${escapeHtml(p.contact[key]).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");
  const early = resolveEarlyStart(p);
  const earlyHtml = early
    ? `<p style="margin:12px 0;font-size:13px;color:#d6cdbf">Démarrage anticipé : <strong>${early.accepted ? "oui" : "non"}</strong> (v${escapeHtml(early.version)}, ${escapeHtml(early.acceptedAt)})</p>`
    : "";
  const html = layout(
    escapeHtml(TEAM_SUBJECT[step](p.reference, who)),
    `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${contact}</table>
${earlyHtml}
${itemsTable(p, { total: "Total (HT)", deposit: event === "deposit_paid" ? "Acompte payé" : "Acompte" })}
<p style="margin:0;color:#a89c8e;font-size:13px">Détail complet : Supabase → table <code>video_projects</code>, référence ${escapeHtml(p.reference)}.</p>`
  );
  const text = [
    TEAM_SUBJECT[step](p.reference, who),
    "",
    ...CONTACT_LABELS.filter(([key]) => p.contact[key]).map(([key, label]) => `${label} : ${p.contact[key]}`),
    early ? `Démarrage anticipé : ${early.accepted ? "oui" : "non"} (v${early.version}, ${early.acceptedAt})` : "",
    "",
    itemsText(p),
    `Total (HT) : ${euros(p.total)}`,
    p.deposit ? `Acompte : ${euros(p.deposit)}` : "",
  ].join("\n");
  return { to: teamAddresses(), subject: TEAM_SUBJECT[step](p.reference, who), html, text, replyTo: p.contact.email };
}

export async function sendProjectEmails(project: ProjectMail, event: ProjectEvent) {
  const sends = [sendEmail(clientEmail(project, event))];
  if (teamAddresses().length) sends.push(sendEmail(teamEmail(project, event)));
  else console.warn("EMAIL_NOTIFY_TO is not set: AK Universe was not notified of", project.reference);
  await Promise.all(sends);
}
