"use server";

import { isUuid } from "@/lib/admin/team";
import { loadMyNotifications, markMine, type Feed } from "@/lib/commercial/notifications";
import { getClientMe } from "./session";

/*
 * Server actions of the Client space. Server actions are public HTTP endpoints, so each one re-checks the caller
 * (an active, non-staff account read from the database) and only touches the caller's own rows (RLS auth.uid()).
 */

export async function getMyNotifications(): Promise<{ success: true; feed: Feed } | { success: false; error: "forbidden" }> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };
  return { success: true, feed: await loadMyNotifications(me, "/client/dashboard") };
}

export async function markNotificationsRead(ids: string[] | null) {
  const me = await getClientMe();
  if (!me) return { success: false as const, error: "forbidden" as const };
  if (ids !== null && (!Array.isArray(ids) || ids.length > 100 || !ids.every(isUuid))) return { success: false as const, error: "invalid" as const };
  return (await markMine(ids)) ? { success: true as const } : { success: false as const, error: "failed" as const };
}
