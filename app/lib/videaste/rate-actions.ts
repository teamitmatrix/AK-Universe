"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/admin/team";
import { createClient } from "@/lib/supabase/server";
import { getVideaste } from "./session";

type Result = { success: true } | { success: false; error: "forbidden" | "invalid" | "notFound" | "notReady" | "failed" };

/** Videographer confirms one pending rate line on their own card. */
export async function confirmMyRateItem(id: string): Promise<Result> {
  const me = await getVideaste();
  if (!me) return { success: false, error: "forbidden" };
  if (!isUuid(id)) return { success: false, error: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_rate_item", { p_item: id });
  if (error) {
    if (/(does not exist|schema cache|Could not find)/i.test(error.message)) return { success: false, error: "notReady" };
    console.error("confirmMyRateItem failed:", error.message);
    return { success: false, error: "failed" };
  }
  if (!data) return { success: false, error: "notFound" };
  revalidatePath("/videaste/tarifs");
  revalidatePath("/admin/videaste-detail");
  revalidatePath("/admin/videastes");
  return { success: true };
}
