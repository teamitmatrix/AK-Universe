"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { TICKET_STATUSES, isTicketStatus, type TicketStatus } from "@/lib/client/support-content";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { providerOf } from "@/lib/videaste/storage";
import { audit } from "./audit";

/*
 * Replies from the admin inbox (/admin/support). A server action is a public endpoint, so each call re-checks that
 * the caller is an active admin, then writes with the service role (RLS is select-only). The message is stored as
 * author_role "support": that is the row the client space shows in the thread. The customer is e-mailed a link to it.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "link" | "notReady" | "notFound" | "failed"; field?: string };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function adminActor() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role, active").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin" || data.active === false) return null;
  return { id: user.id };
}

function parseLink(raw: unknown): { ok: true; url: string | null } | { ok: false } {
  const url = clean(raw, 2000);
  if (!url) return { ok: true, url: null };
  return providerOf(url) ? { ok: true, url } : { ok: false };
}

type TicketRow = { id: string; reference: string; subject: string; status: string; user_id: string };

async function ownTicket(reference: unknown): Promise<{ fail: Fail["error"] } | { row: TicketRow }> {
  if (typeof reference !== "string" || !/^SUP-\d{1,10}$/.test(reference)) return { fail: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("support_tickets").select("id, reference, subject, status, user_id").eq("reference", reference).maybeSingle();
  if (error) return { fail: /support_tickets/.test(error.message) && /(does not exist|schema cache|relation)/i.test(error.message) ? "notReady" : "failed" };
  if (!data) return { fail: "notFound" };
  return { row: data as TicketRow };
}

function done(reference: string) {
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${reference}`);
  revalidatePath("/dashboard/support", "layout");
}

const ticketHref = (reference: string) => `${getSiteUrl()}/dashboard/support/demandes/${encodeURIComponent(reference)}`;

async function customerOf(userId: string) {
  const { data } = await createAdminClient().from("profiles").select("email, first_name").eq("id", userId).maybeSingle();
  const row = data as { email?: string | null; first_name?: string | null } | null;
  return { email: row?.email ?? "", firstName: (row?.first_name ?? "").trim() };
}

function mailReply(to: string, firstName: string, reference: string, subject: string, body: string) {
  const href = ticketHref(reference);
  const hello = firstName ? `Bonjour ${escapeHtml(firstName)},` : "Bonjour,";
  void sendEmail({
    to,
    subject: `Réponse à votre demande ${reference} — ${subject}`,
    html: emailLayout(
      "Le support vous a répondu",
      `<p style="margin:0 0 10px">${hello}</p>
<p style="margin:0 0 10px">Nous avons répondu à votre demande <strong>${escapeHtml(reference)}</strong> « ${escapeHtml(subject)} ». La réponse est aussi dans votre espace client :</p>
<div style="margin:0 0 16px;padding:14px;border-radius:10px;background:#16110c;white-space:pre-wrap">${escapeHtml(body)}</div>
<p style="margin:0"><a href="${escapeHtml(href)}" style="color:#fdb942">Ouvrir la demande</a></p>`
    ),
    text: `${firstName ? `Bonjour ${firstName},` : "Bonjour,"}\n\nNous avons répondu à votre demande ${reference} « ${subject} ».\n\n${body}\n\nOuvrir la demande : ${href}`,
  });
}

function mailClosed(to: string, firstName: string, reference: string, subject: string, status: "resolu" | "ferme") {
  const href = ticketHref(reference);
  const hello = firstName ? `Bonjour ${escapeHtml(firstName)},` : "Bonjour,";
  const line = status === "resolu" ? `Votre demande ${reference} « ${subject} » est marquée comme résolue.` : `Votre demande ${reference} « ${subject} » est fermée.`;
  void sendEmail({
    to,
    subject: `${status === "resolu" ? "Demande résolue" : "Demande fermée"} ${reference} — ${subject}`,
    html: emailLayout(
      status === "resolu" ? "Demande résolue" : "Demande fermée",
      `<p style="margin:0 0 10px">${hello}</p>
<p style="margin:0 0 10px">${escapeHtml(line)}</p>
<p style="margin:0"><a href="${escapeHtml(href)}" style="color:#fdb942">Voir la demande</a></p>`
    ),
    text: `${firstName ? `Bonjour ${firstName},` : "Bonjour,"}\n\n${line}\n\n${href}`,
  });
}

/** Writes the team's answer into the thread the customer reads, then tells them by e-mail. */
export async function replyAsSupport(input: { reference?: string; body?: string; link?: string; status?: string }): Promise<{ success: true } | Fail> {
  const me = await adminActor();
  if (!me) return { success: false, error: "forbidden" };
  const found = await ownTicket(input.reference);
  if ("fail" in found) return { success: false, error: found.fail };

  const body = clean(input.body, 5000);
  if (body.length < 2) return { success: false, error: "invalid", field: "body" };
  const link = parseLink(input.link);
  if (!link.ok) return { success: false, error: "link", field: "link" };
  // A reply waits for the customer unless the admin picks another status in the same step (for example "Résolu").
  const status: TicketStatus = isTicketStatus(input.status) ? input.status : "en_attente";
  const ticket = found.row;

  const admin = createAdminClient();
  const { error } = await admin.from("support_messages").insert({ ticket_id: ticket.id, author_id: me.id, author_role: "support", body, link_url: link.url });
  if (error) {
    console.error("replyAsSupport failed:", error.message);
    return { success: false, error: "failed" };
  }
  const { error: statusErr } = await admin.from("support_tickets").update({ status, last_activity_at: new Date().toISOString() }).eq("id", ticket.id);
  if (statusErr) console.error("replyAsSupport status failed:", statusErr.message);

  after(async () => {
    const customer = await customerOf(ticket.user_id);
    if (customer.email) mailReply(customer.email, customer.firstName, ticket.reference, ticket.subject, body);
  });
  done(ticket.reference);
  await audit("support.reply", ticket.reference, { status });
  return { success: true };
}

/** Status only (no new message). Resolving or closing also e-mails the customer a link to the request. */
export async function setSupportStatus(input: { reference?: string; status?: string }): Promise<{ success: true } | Fail> {
  const me = await adminActor();
  if (!me) return { success: false, error: "forbidden" };
  if (!isTicketStatus(input.status)) return { success: false, error: "invalid", field: "status" };
  const found = await ownTicket(input.reference);
  if ("fail" in found) return { success: false, error: found.fail };
  if (found.row.status === input.status) return { success: true };

  const status = input.status;
  const { error } = await createAdminClient().from("support_tickets").update({ status, last_activity_at: new Date().toISOString() }).eq("id", found.row.id);
  if (error) {
    console.error("setSupportStatus failed:", error.message);
    return { success: false, error: "failed" };
  }
  const ticket = found.row;
  if (status === "resolu" || status === "ferme") {
    after(async () => {
      const customer = await customerOf(ticket.user_id);
      if (customer.email) mailClosed(customer.email, customer.firstName, ticket.reference, ticket.subject, status);
    });
  }
  done(ticket.reference);
  await audit("support.status", ticket.reference, { status, label: TICKET_STATUSES[status].label });
  return { success: true };
}
