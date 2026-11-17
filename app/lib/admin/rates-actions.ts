"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/session";
import { PRODUCT_TYPES } from "@/lib/commercial/commission-rules";
import { createClient } from "@/lib/supabase/server";
import { audit } from "./audit";

type Fail = { success: false; error: "forbidden" | "invalid" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });

/** Admin-only write of commission_rates. The sales_documents trigger reads this table on the next save. */
export async function saveCommissionRates(input: Record<string, number>): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const rows = [];
  for (const product_type of PRODUCT_TYPES) {
    const n = Number(input?.[product_type]);
    if (!Number.isFinite(n) || n < 0 || n > 100) return fail("invalid");
    rows.push({ product_type, rate: Math.round(n * 100) / 100, updated_at: new Date().toISOString() });
  }
  const supabase = await createClient();
  const { error } = await supabase.from("commission_rates").upsert(rows, { onConflict: "product_type" });
  if (error) {
    console.error("saveCommissionRates failed:", error.message);
    return fail("failed");
  }
  for (const path of ["/admin/catalogue", "/commercial/devis-factures", "/commercial", "/admin"]) revalidatePath(path);
  await audit(
    "commission.rates",
    "commission_rates",
    Object.fromEntries(rows.map((row) => [row.product_type, row.rate])),
  );
  return { success: true };
}
