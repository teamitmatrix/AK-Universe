import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createDueReminders, type NotificationData, type NotificationType } from "@/lib/notify";
import type { CommercialMe } from "./session";

/*
 * The rep's notification feed (handoff page 03: "scope the notification feed server-side to the authenticated
 * user — never send the full notifications table to the client"). Read with the rep's session: RLS returns only
 * rows where user_id = auth.uid(), and the query filters on the same id. At most 20 rows leave the server.
 */

export type FeedItem = { id: string; type: NotificationType; data: NotificationData; link: string | null; createdAt: string; read: boolean };
export type Feed = { ready: boolean; unread: number; items: FeedItem[] };

export async function loadMyNotifications(me: CommercialMe): Promise<Feed> {
  const supabase = await createClient();

  // "Reminder due" notifications for the rep's own open tasks due within 24 h (idempotent, one per task).
  const horizon = new Date(Date.now() + 24 * 3_600_000).toISOString();
  const { data: dueTasks } = await supabase.from("tasks").select("id, title, due_at, status").eq("assigned_to", me.id).eq("status", "a_faire").lte("due_at", horizon).limit(50);
  if (dueTasks?.length) await createDueReminders(me.id, dueTasks);

  const [list, unread] = await Promise.all([
    supabase.from("notifications").select("id, type, data, link, created_at, read_at").eq("user_id", me.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("notifications").select("id").eq("user_id", me.id).is("read_at", null).limit(100),
  ]);
  // Before migration 010 the table does not exist: the bell says so instead of showing fake items.
  if (list.error) return { ready: false, unread: 0, items: [] };
  return {
    ready: true,
    unread: unread.data?.length ?? 0,
    items: (list.data ?? []).map((n) => ({
      id: n.id as string,
      type: n.type as NotificationType,
      data: (n.data ?? {}) as NotificationData,
      link: (n.link as string | null) ?? null,
      createdAt: n.created_at as string,
      read: n.read_at !== null,
    })),
  };
}

/** Marks the rep's own notifications read (the given ids, or all). The database function only touches the caller's rows. */
export async function markMine(ids: string[] | null) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: ids });
  return !error;
}
