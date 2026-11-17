"use server";

import { isUuid } from "@/lib/admin/team";
import { loadMyNotifications, markMine, type Feed } from "./notifications";
import { searchMine } from "./search";
import { getCommercial } from "./session";

/*
 * Server actions used by the Commercial header (search bar, notification bell). Server actions are public
 * HTTP endpoints, so each one re-checks the caller itself: an active sales rep, read from the database.
 * Nothing the browser sends decides whose data is returned — only the verified session does.
 */

export async function searchCommercial(q: string) {
  const me = await getCommercial();
  if (!me) return { success: false as const, error: "forbidden" as const };
  return { success: true as const, ...(await searchMine(me, q)) };
}

export async function getMyNotifications(): Promise<{ success: true; feed: Feed } | { success: false; error: "forbidden" }> {
  const me = await getCommercial();
  if (!me) return { success: false, error: "forbidden" };
  return { success: true, feed: await loadMyNotifications(me) };
}

export async function markNotificationsRead(ids: string[] | null) {
  const me = await getCommercial();
  if (!me) return { success: false as const, error: "forbidden" as const };
  if (ids !== null && (!Array.isArray(ids) || ids.length > 100 || !ids.every(isUuid))) return { success: false as const, error: "invalid" as const };
  return (await markMine(ids)) ? { success: true as const } : { success: false as const, error: "failed" as const };
}
