"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { emailLayout, escapeHtml, sendEmail, teamAddresses } from "@/lib/email";
import { providerOf } from "@/lib/videaste/storage";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { getClientMe, type ClientMe } from "./session";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, isTicketCategory, isTicketPriority, type TicketCategory } from "./support-content";

/*
 * Support requests (migration 019). Server actions = public endpoints: each re-checks the caller (active customer,
 * getClientMe) and only touches their own tickets (ownership read with their session, writes with the service key
 * scoped to that ticket). Every request and reply is e-mailed to the AK Universe team (EMAIL_NOTIFY_TO).
 * The team answers in the admin inbox (/admin/support): that reply is what the customer sees in the thread.
 * The notification e-mail only points there. The customer gets a confirmation with their reference.
 * Files are not hosted: an optional link to a shared document (Drive, Dropbox, WeTransfer, Frame.io, OneDrive).
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "link" | "rate_limited" | "notReady" | "closed" | "notFound" | "failed"; field?: string };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const HOURLY_MAX = 5;

function checkLink(raw: unknown): { ok: true; url: string | null } | { ok: false } {
  const url = clean(raw, 2000);
  if (!url) return { ok: true, url: null };
  return providerOf(url) ? { ok: true, url } : { ok: false };
}

function teamMail(kind: "new" | "reply", me: ClientMe, ref: string, subject: string, body: string, extra: string[], link: string | null) {
  const to = teamAddresses();
  if (!to.length) {
    console.warn(`Support ${ref}: EMAIL_NOTIFY_TO not set, team not notified.`);
    return;
  }
  const head = kind === "new" ? `Nouvelle demande ${ref}` : `Nouvelle réponse client ${ref}`;
  const lines = [`Client : ${me.name} <${me.email}>`, `Sujet : ${subject}`, ...extra];
  const inbox = `${getSiteUrl()}/admin/support/${encodeURIComponent(ref)}`;
  void sendEmail({
    to,
    subject: `[Support] ${head} — ${subject}`,
    html: emailLayout(
      escapeHtml(head),
      `${lines.map((l) => `<p style="margin:0 0 6px">${escapeHtml(l)}</p>`).join("")}
<div style="margin:16px 0 0;padding:14px;border-radius:10px;background:#16110c;white-space:pre-wrap">${escapeHtml(body)}</div>
${link ? `<p style="margin:12px 0 0">Document partagé : <a href="${escapeHtml(link)}" style="color:#fdb942">${escapeHtml(link)}</a></p>` : ""}
<p style="margin:16px 0 0">Répondez dans l'espace admin pour que le client voie le message dans sa demande : <a href="${escapeHtml(inbox)}" style="color:#fdb942">Ouvrir ${escapeHtml(ref)}</a>.</p>`
    ),
    text: `${head}\n${lines.join("\n")}\n\n${body}${link ? `\n\nDocument : ${link}` : ""}\n\nRépondez dans l'espace admin : ${inbox}`,
  });
}

function customerMail(me: ClientMe, ref: string, subject: string) {
  void sendEmail({
    to: me.email,
    subject: `Demande ${ref} reçue — ${subject}`,
    html: emailLayout(
      "Votre demande a bien été reçue",
      `<p style="margin:0 0 10px">Bonjour ${escapeHtml(me.firstName)},</p>
<p style="margin:0 0 10px">Votre demande <strong>${escapeHtml(ref)}</strong> « ${escapeHtml(subject)} » a bien été enregistrée. Notre équipe vous répond du lundi au vendredi, de 9h à 18h.</p>
<p style="margin:0">Vous pouvez suivre son avancement dans votre espace client, rubrique Support.</p>`
    ),
    text: `Votre demande ${ref} « ${subject} » a bien été enregistrée. Suivez son avancement dans votre espace client, rubrique Support.`,
  });
}

export async function createSupportTicket(input: {
  subject?: string;
  category?: string;
  priority?: string;
  description?: string;
  link?: string;
}): Promise<{ success: true; reference: string } | Fail> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const subject = clean(input.subject, 150).replace(/\s+/g, " ");
  const description = clean(input.description, 5000);
  if (subject.length < 3) return { success: false, error: "invalid", field: "subject" };
  if (!isTicketCategory(input.category)) return { success: false, error: "invalid", field: "category" };
  const priority = isTicketPriority(input.priority) ? input.priority : "normale";
  if (description.length < 10) return { success: false, error: "invalid", field: "description" };
  const link = checkLink(input.link);
  if (!link.ok) return { success: false, error: "link", field: "link" };
  const category: TicketCategory = input.category;

  const supabase = await createClient();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { data: recent, error: readErr } = await supabase.from("support_tickets").select("reference, subject, created_at").eq("user_id", me.id).gte("created_at", since);
  if (readErr) return { success: false, error: /support_tickets/.test(readErr.message) ? "notReady" : "failed" };
  // Double submission (same subject within 2 minutes): return the request already created.
  const twin = (recent ?? []).find((t) => t.subject === subject && Date.now() - new Date(t.created_at as string).getTime() < 120_000);
  if (twin) return { success: true, reference: twin.reference as string };
  if ((recent ?? []).length >= HOURLY_MAX) return { success: false, error: "rate_limited" };

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({ user_id: me.id, subject, category, priority })
    .select("id, reference")
    .single();
  if (error || !ticket) {
    console.error("createSupportTicket failed:", error?.message);
    return { success: false, error: "failed" };
  }
  const { error: msgErr } = await admin.from("support_messages").insert({ ticket_id: ticket.id, author_id: me.id, author_role: "client", body: description, link_url: link.url });
  if (msgErr) {
    await admin.from("support_tickets").delete().eq("id", ticket.id);
    console.error("createSupportTicket message failed:", msgErr.message);
    return { success: false, error: "failed" };
  }

  const ref = ticket.reference as string;
  after(() => {
    teamMail("new", me, ref, subject, description, [`Catégorie : ${TICKET_CATEGORIES[category]}`, `Priorité : ${TICKET_PRIORITIES[priority]}`], link.url);
    customerMail(me, ref, subject);
  });
  revalidatePath("/dashboard/support", "layout");
  return { success: true, reference: ref };
}

/** The caller's own ticket (session read), or null. */
async function ownTicket(me: ClientMe, reference: unknown) {
  if (typeof reference !== "string" || !/^SUP-\d{1,10}$/.test(reference)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select("id, reference, subject, status").eq("reference", reference).eq("user_id", me.id).maybeSingle();
  return data as { id: string; reference: string; subject: string; status: string } | null;
}

export async function replyToTicket(input: { reference?: string; body?: string; link?: string }): Promise<{ success: true } | Fail> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const ticket = await ownTicket(me, input.reference);
  if (!ticket) return { success: false, error: "notFound" };
  if (ticket.status === "ferme") return { success: false, error: "closed" };
  const body = clean(input.body, 5000);
  if (body.length < 2) return { success: false, error: "invalid", field: "body" };
  const link = checkLink(input.link);
  if (!link.ok) return { success: false, error: "link", field: "link" };

  const admin = createAdminClient();
  const { error } = await admin.from("support_messages").insert({ ticket_id: ticket.id, author_id: me.id, author_role: "client", body, link_url: link.url });
  if (error) {
    console.error("replyToTicket failed:", error.message);
    return { success: false, error: "failed" };
  }
  // A reply re-opens a resolved request and answers a "waiting for you" one.
  const status = ticket.status === "resolu" || ticket.status === "en_attente" ? "ouvert" : ticket.status;
  await admin.from("support_tickets").update({ status, last_activity_at: new Date().toISOString() }).eq("id", ticket.id);
  after(() => teamMail("reply", me, ticket.reference, ticket.subject, body, [], link.url));
  revalidatePath("/dashboard/support", "layout");
  return { success: true };
}

export async function markTicketResolved(input: { reference?: string }): Promise<{ success: true } | Fail> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  const ticket = await ownTicket(me, input.reference);
  if (!ticket) return { success: false, error: "notFound" };
  if (ticket.status === "ferme" || ticket.status === "resolu") return { success: true };
  await createAdminClient().from("support_tickets").update({ status: "resolu", last_activity_at: new Date().toISOString() }).eq("id", ticket.id);
  revalidatePath("/dashboard/support", "layout");
  return { success: true };
}
