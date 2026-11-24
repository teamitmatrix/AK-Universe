"use server";

import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/admin/identity";
import { isUuid } from "@/lib/admin/team";
import { notifyDocumentIssued } from "@/lib/commercial/document-share";
import { parseSalesDocInput, type DocInput } from "@/lib/commercial/sales-doc-actions";
import { createClient } from "@/lib/supabase/server";

/*
 * Admin create/update for devis & factures. Same validation as the commercial space; the admin
 * picks which sales rep owns the document (commission + client linkage).
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notFound" | "locked" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });

const revalidate = () => {
  for (const path of [
    "/admin/devis-factures",
    "/admin/ventes",
    "/admin/documents",
    "/admin/document",
    "/commercial/devis-factures",
    "/commercial/mes-ventes",
    "/commercial/mes-commissions",
    "/commercial/mes-clients",
    "/commercial/dashboard",
  ]) {
    revalidatePath(path);
  }
};

async function assertActiveCommercial(salespersonId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", salespersonId)
    .eq("role", "commercial")
    .neq("active", false)
    .maybeSingle();
  return !!data;
}

async function customerForRep(salespersonId: string, email: string | null) {
  if (!email) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id")
    .eq("salesperson_id", salespersonId)
    .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
    .limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

/** Create a devis or facture as admin, assigned to a sales rep. */
export async function saveAdminSalesDocument(
  salespersonId: string,
  input: DocInput,
): Promise<{ success: true; id: string } | Fail> {
  if (!(await getAdminIdentity())) return fail("forbidden");
  if (!isUuid(salespersonId)) return fail("invalid");
  if (!(await assertActiveCommercial(salespersonId))) return fail("invalid");
  const row = await parseSalesDocInput(input);
  if (!row) return fail("invalid");

  const supabase = await createClient();
  const customer_id = await customerForRep(salespersonId, row.client_email);
  const { data, error } = await supabase
    .from("sales_documents")
    .insert({ ...row, customer_id, salesperson_id: salespersonId })
    .select("id, status")
    .single();
  if (error || !data) {
    console.error("saveAdminSalesDocument insert failed:", error?.message);
    return fail("failed");
  }
  if (data.status === "en_attente") await notifyDocumentIssued(data.id as string);
  revalidate();
  return { success: true, id: data.id as string };
}
