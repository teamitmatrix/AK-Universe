import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { VideasteMe } from "./session";

export type RateStatus = "pending" | "confirmed";
export type RateItem = {
  id: string;
  cardId: string;
  label: string;
  description: string | null;
  amountCents: number;
  currency: string;
  sortOrder: number;
  status: RateStatus;
  confirmedAt: string | null;
};
export type RateCard = {
  id: string;
  title: string;
  notes: string | null;
  createdAt: string;
  items: RateItem[];
  pendingCount: number;
  confirmedCount: number;
};

function mapItem(row: {
  id: string;
  card_id: string;
  label: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  sort_order: number;
  status: string;
  confirmed_at: string | null;
}): RateItem {
  return {
    id: row.id,
    cardId: row.card_id,
    label: row.label,
    description: row.description,
    amountCents: row.amount_cents,
    currency: row.currency,
    sortOrder: row.sort_order,
    status: row.status === "confirmed" ? "confirmed" : "pending",
    confirmedAt: row.confirmed_at,
  };
}

/** Rate cards sent to this videographer (newest first), with line items. */
export async function loadMyRates(me: VideasteMe): Promise<{ ready: boolean; cards: RateCard[] }> {
  const supabase = await createClient();
  const { data: cards, error } = await supabase
    .from("videaste_rate_cards")
    .select("id, title, notes, created_at")
    .eq("videaste_id", me.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (/(does not exist|schema cache)/i.test(error.message)) return { ready: false, cards: [] };
    console.error("loadMyRates cards failed:", error.message);
    return { ready: false, cards: [] };
  }
  if (!cards?.length) return { ready: true, cards: [] };

  const ids = cards.map((c) => c.id as string);
  const { data: items, error: itemsErr } = await supabase
    .from("videaste_rate_items")
    .select("id, card_id, label, description, amount_cents, currency, sort_order, status, confirmed_at")
    .in("card_id", ids)
    .order("sort_order", { ascending: true })
    .limit(2000);
  if (itemsErr) {
    console.error("loadMyRates items failed:", itemsErr.message);
    return { ready: false, cards: [] };
  }

  const byCard = new Map<string, RateItem[]>();
  for (const row of items ?? []) {
    const item = mapItem(row as Parameters<typeof mapItem>[0]);
    const list = byCard.get(item.cardId) ?? [];
    list.push(item);
    byCard.set(item.cardId, list);
  }

  return {
    ready: true,
    cards: cards.map((c) => {
      const list = byCard.get(c.id as string) ?? [];
      return {
        id: c.id as string,
        title: c.title as string,
        notes: (c.notes as string | null) ?? null,
        createdAt: c.created_at as string,
        items: list,
        pendingCount: list.filter((i) => i.status === "pending").length,
        confirmedCount: list.filter((i) => i.status === "confirmed").length,
      };
    }),
  };
}

/** Admin: rate cards for one videographer. */
export async function loadVideasteRates(videasteId: string): Promise<{ ready: boolean; cards: RateCard[] }> {
  const supabase = await createClient();
  const { data: cards, error } = await supabase
    .from("videaste_rate_cards")
    .select("id, title, notes, created_at")
    .eq("videaste_id", videasteId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (/(does not exist|schema cache)/i.test(error.message)) return { ready: false, cards: [] };
    console.error("loadVideasteRates failed:", error.message);
    return { ready: false, cards: [] };
  }
  if (!cards?.length) return { ready: true, cards: [] };

  const ids = cards.map((c) => c.id as string);
  const { data: items, error: itemsErr } = await supabase
    .from("videaste_rate_items")
    .select("id, card_id, label, description, amount_cents, currency, sort_order, status, confirmed_at")
    .in("card_id", ids)
    .order("sort_order", { ascending: true })
    .limit(2000);
  if (itemsErr) return { ready: false, cards: [] };

  const byCard = new Map<string, RateItem[]>();
  for (const row of items ?? []) {
    const item = mapItem(row as Parameters<typeof mapItem>[0]);
    const list = byCard.get(item.cardId) ?? [];
    list.push(item);
    byCard.set(item.cardId, list);
  }

  return {
    ready: true,
    cards: cards.map((c) => {
      const list = byCard.get(c.id as string) ?? [];
      return {
        id: c.id as string,
        title: c.title as string,
        notes: (c.notes as string | null) ?? null,
        createdAt: c.created_at as string,
        items: list,
        pendingCount: list.filter((i) => i.status === "pending").length,
        confirmedCount: list.filter((i) => i.status === "confirmed").length,
      };
    }),
  };
}
