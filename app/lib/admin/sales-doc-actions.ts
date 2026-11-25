"use server";

import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/admin/identity";
import { isUuid } from "@/lib/admin/team";
import { notifyDocumentIssued, sendDocumentEmailToClient } from "@/lib/commercial/document-share";
import { ensureCustomerForRep } from "@/lib/commercial/ensure-customer";
import { parseSalesDocInput, type DocInput } from "@/lib/commercial/sales-doc-actions";
import { loadSalesDocById, type SalesDoc } from "@/lib/commercial/sales-docs";
import { createClient } from "@/lib/supabase/server";

/*
 * Admin create/update for devis & factures. Same validation as the commercial space; the admin
 * picks which sales rep owns the document (commission + client linkage).
 */

type Fail = {
  success: false;
  error: "forbidden" | "invalid" | "notFound" | "locked" | "failed" | "draft" | "cancelled" | "no_email" | "no_share";
};
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
    "/admin/clients",
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

/** Create a devis or facture as admin, assigned to a sales rep. */
export async function saveAdminSalesDocument(
  salespersonId: string,
  input: DocInput,
): Promise<{ success: true; id: string } | Fail> {
  if (!(await getAdminIdentity())) return fail("forbidden");
  if (!isUuid(salespersonId)) return fail("invalid");
  if (!(await assertActiveCommercial(salespersonId))) return fail("invalid");
  const row = await parseSalesDocInput(input, { allowCommercialDiscount: true });
  if (!row) return fail("invalid");

  const supabase = await createClient();
  // Same as commercial space: first save registers the client under Customers for reuse.
  const customer_id = await ensureCustomerForRep({
    salespersonId,
    name: row.client_name,
    email: row.client_email,
  });
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

/** Load a devis/facture for the admin edit modal. */
export async function getAdminSalesDocument(id: string): Promise<{ success: true; doc: SalesDoc } | Fail> {
  if (!(await getAdminIdentity())) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const doc = await loadSalesDocById(id);
  if (!doc) return fail("notFound");
  return { success: true, doc };
}

/** Update an existing devis/facture (draft or issued / awaiting). */
export async function updateAdminSalesDocument(
  id: string,
  salespersonId: string,
  input: DocInput,
): Promise<{ success: true; id: string } | Fail> {
  if (!(await getAdminIdentity())) return fail("forbidden");
  if (!isUuid(id) || !isUuid(salespersonId)) return fail("invalid");
  if (!(await assertActiveCommercial(salespersonId))) return fail("invalid");
  const row = await parseSalesDocInput(input, { allowCommercialDiscount: true });
  if (!row) return fail("invalid");

  const supabase = await createClient();
  const { data: current } = await supabase.from("sales_documents").select("status, kind").eq("id", id).maybeSingle();
  if (!current) return fail("notFound");
  if (current.status !== "brouillon" && current.status !== "en_attente") return fail("locked");
  if (current.kind !== row.kind) return fail("invalid");

  const customer_id = await ensureCustomerForRep({
    salespersonId,
    name: row.client_name,
    email: row.client_email,
  });
  const { kind: _kind, ...changes } = row;
  void _kind;
  const { data, error } = await supabase
    .from("sales_documents")
    .update({ ...changes, customer_id, salesperson_id: salespersonId })
    .eq("id", id)
    .in("status", ["brouillon", "en_attente"])
    .select("id, status");
  if (error) {
    console.error("updateAdminSalesDocument failed:", error.message);
    return fail(/document_locked/.test(error.message) ? "locked" : "failed");
  }
  if (!data?.length) return fail("locked");
  const saved = data[0]!;
  if (saved.status === "en_attente" && current.status !== "en_attente") {
    await notifyDocumentIssued(saved.id as string);
  }
  revalidate();
  return { success: true, id };
}

/** Delete a draft devis/facture (issued documents stay for accounting history). */
export async function deleteAdminSalesDocument(id: string): Promise<{ success: true } | Fail> {
  if (!(await getAdminIdentity())) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales_documents").delete().eq("id", id).eq("status", "brouillon").select("id");
  if (error) {
    console.error("deleteAdminSalesDocument failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("locked");
  revalidate();
  return { success: true };
}

/** Resend the client download link by e-mail (issued documents only). */
export async function emailAdminSalesDocument(id: string): Promise<{ success: true } | Fail> {
  if (!(await getAdminIdentity())) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const sent = await sendDocumentEmailToClient(id);
  if (!sent.ok) {
    if (sent.reason === "not_found") return fail("notFound");
    if (sent.reason === "draft") return fail("draft");
    if (sent.reason === "cancelled") return fail("cancelled");
    if (sent.reason === "no_email") return fail("no_email");
    if (sent.reason === "no_share") return fail("no_share");
    return fail("failed");
  }
  return { success: true };
}
