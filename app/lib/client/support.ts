import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ClientMe } from "./session";
import type { TicketCategory, TicketPriority, TicketStatus } from "./support-content";

/* Support requests of the signed-in customer, read with their own session (RLS: own tickets / messages only). */

export type TicketSummary = {
  id: string;
  reference: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastActivityAt: string;
};

export type TicketMessage = { id: string; role: "client" | "support"; body: string; linkUrl: string | null; createdAt: string };

const COLS = "id, reference, subject, category, priority, status, created_at, last_activity_at";
const toSummary = (r: Record<string, unknown>): TicketSummary => ({
  id: r.id as string,
  reference: r.reference as string,
  subject: r.subject as string,
  category: r.category as TicketCategory,
  priority: r.priority as TicketPriority,
  status: r.status as TicketStatus,
  createdAt: r.created_at as string,
  lastActivityAt: r.last_activity_at as string,
});

/** `ready` = migration 019 applied. A database failure on an existing table throws (error boundary). */
export async function listMyTickets(me: ClientMe, limit = 50): Promise<{ ready: boolean; tickets: TicketSummary[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("support_tickets").select(COLS).eq("user_id", me.id).order("last_activity_at", { ascending: false }).limit(limit);
  if (error) {
    if (/support_tickets/.test(error.message) && /(does not exist|schema cache|relation)/i.test(error.message)) return { ready: false, tickets: [] };
    throw new Error(`Support: tickets query failed: ${error.message}`);
  }
  return { ready: true, tickets: (data ?? []).map(toSummary) };
}

export async function getMyTicket(me: ClientMe, reference: string): Promise<{ ticket: TicketSummary; messages: TicketMessage[] } | null> {
  if (!/^SUP-\d{1,10}$/.test(reference)) return null;
  const supabase = await createClient();
  const { data: row } = await supabase.from("support_tickets").select(COLS).eq("reference", reference).eq("user_id", me.id).maybeSingle();
  if (!row) return null;
  const { data: msgs } = await supabase.from("support_messages").select("id, author_role, body, link_url, created_at").eq("ticket_id", row.id).order("created_at", { ascending: true });
  return {
    ticket: toSummary(row),
    messages: (msgs ?? []).map((m) => ({ id: m.id as string, role: m.author_role as "client" | "support", body: m.body as string, linkUrl: (m.link_url as string | null) ?? null, createdAt: m.created_at as string })),
  };
}
