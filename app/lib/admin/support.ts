import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/client/support-content";

/*
 * Admin support inbox. Read with the signed-in admin's session: RLS ("read own" includes is_admin()) returns every
 * ticket. Writes live in support-actions.ts and go through the service role after the admin check.
 */

export type SupportListItem = {
  id: string;
  reference: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastActivityAt: string;
  customerName: string;
  customerEmail: string;
};

export type SupportMessage = { id: string; role: "client" | "support"; body: string; linkUrl: string | null; createdAt: string };

export type SupportTicketDetail = {
  ticket: SupportListItem & { userId: string };
  messages: SupportMessage[];
};

const COLS = "id, reference, subject, category, priority, status, created_at, last_activity_at, user_id";

const missing = (message: string) => /support_tickets|support_messages/.test(message) && /(does not exist|schema cache|relation)/i.test(message);

function personName(row: { first_name?: string | null; last_name?: string | null; email?: string | null } | undefined) {
  const name = [row?.first_name, row?.last_name].filter(Boolean).join(" ");
  return { name: name || row?.email || "—", email: row?.email ?? "" };
}

export async function loadSupportBoard(opts: { status: TicketStatus | null; q: string }): Promise<{ ready: boolean; tickets: SupportListItem[]; counts: Record<TicketStatus, number> }> {
  const empty = { ouvert: 0, en_cours: 0, en_attente: 0, resolu: 0, ferme: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.from("support_tickets").select(COLS).order("last_activity_at", { ascending: false }).limit(500);
  if (error) {
    if (missing(error.message)) return { ready: false, tickets: [], counts: empty };
    throw new Error(`Support inbox: ${error.message}`);
  }
  const ids = [...new Set((data ?? []).map((r) => r.user_id as string))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, first_name, last_name, email").in("id", ids) : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id as string, personName(p)]));

  const counts = { ...empty };
  const all: SupportListItem[] = (data ?? []).map((r) => {
    const status = r.status as TicketStatus;
    if (status in counts) counts[status] += 1;
    const who = byId.get(r.user_id as string);
    return {
      id: r.id as string,
      reference: r.reference as string,
      subject: r.subject as string,
      category: r.category as TicketCategory,
      priority: r.priority as TicketPriority,
      status,
      createdAt: r.created_at as string,
      lastActivityAt: r.last_activity_at as string,
      customerName: who?.name ?? "—",
      customerEmail: who?.email ?? "",
    };
  });

  const q = opts.q.trim().toLowerCase();
  const tickets = all.filter((t) => {
    if (opts.status && t.status !== opts.status) return false;
    if (!q) return true;
    return [t.reference, t.subject, t.customerName, t.customerEmail].some((v) => v.toLowerCase().includes(q));
  });
  return { ready: true, tickets, counts };
}

export async function loadSupportTicket(reference: string): Promise<{ ready: boolean; ticket: SupportTicketDetail | null }> {
  if (!/^SUP-\d{1,10}$/.test(reference)) return { ready: true, ticket: null };
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("support_tickets").select(COLS).eq("reference", reference).maybeSingle();
  if (error) {
    if (missing(error.message)) return { ready: false, ticket: null };
    throw new Error(`Support inbox: ${error.message}`);
  }
  if (!row) return { ready: true, ticket: null };

  const [{ data: msgs, error: msgErr }, { data: profile }] = await Promise.all([
    supabase.from("support_messages").select("id, author_role, body, link_url, created_at").eq("ticket_id", row.id).order("created_at", { ascending: true }),
    supabase.from("profiles").select("first_name, last_name, email").eq("id", row.user_id).maybeSingle(),
  ]);
  if (msgErr) throw new Error(`Support inbox: ${msgErr.message}`);

  const who = personName(profile ?? undefined);
  return {
    ready: true,
    ticket: {
      ticket: {
        id: row.id as string,
        reference: row.reference as string,
        subject: row.subject as string,
        category: row.category as TicketCategory,
        priority: row.priority as TicketPriority,
        status: row.status as TicketStatus,
        createdAt: row.created_at as string,
        lastActivityAt: row.last_activity_at as string,
        customerName: who.name,
        customerEmail: who.email,
        userId: row.user_id as string,
      },
      messages: (msgs ?? []).map((m) => ({
        id: m.id as string,
        role: m.author_role as "client" | "support",
        body: m.body as string,
        linkUrl: (m.link_url as string | null) ?? null,
        createdAt: m.created_at as string,
      })),
    },
  };
}
