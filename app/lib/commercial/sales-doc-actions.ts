"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/admin/team";
import { loadSalesCatalogue } from "./catalogue";
import { DOC_TRANSITIONS, VAT_RATE, isProductType, type DocKind, type DocStatus } from "./commission-rules";
import { notifyDocumentIssued } from "./document-share";
import { getCommercial } from "./session";

/*
 * Writes of the Quotes & invoices module. Each action re-checks the caller (active sales rep), validates the input and
 * writes with the rep's session + `.eq("salesperson_id", me.id)` (RLS refuses anything else).
 *   - catalogue lines: the price is re-read from the catalogue HERE, the browser only sends the item id and quantity;
 *   - custom lines: label, product type and price given by the rep (the product type decides the commission rate);
 *   - totals, VAT, commission and the document number are computed by the database (migration 012 trigger).
 * Marking an invoice "payée" records the sale's commission as "en attente" — an admin validates it before payout.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notFound" | "locked" | "transition" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });
const revalidate = () => {
  for (const path of ["/commercial/devis-factures", "/commercial/mes-ventes", "/commercial/mes-commissions", "/commercial/mes-clients", "/commercial/dashboard"]) revalidatePath(path);
};

export type LineInput = {
  catalogueId: string | null;
  label: string;
  productType: string;
  unitEuros: string;
  qty: string;
  /** Optional flat commission in euros for the line (empty = use the product-type %). */
  fixedCommissionEuros?: string;
};
export type DocInput = {
  kind: DocKind;
  clientName: string;
  clientEmail: string;
  clientSiret: string;
  clientAddress: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  status: DocStatus;
  notes: string;
  lines: LineInput[];
};

const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s.length > max ? undefined : s || null;
};
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Shared validation for commercial and admin document writes. */
export async function parseSalesDocInput(input: DocInput) {
  if (input.kind !== "devis" && input.kind !== "facture") return null;
  // A new / edited document is a draft or issued; "accepté", "payée"… are set with the status buttons.
  if (input.status !== "brouillon" && input.status !== "en_attente") return null;
  const clientName = text(input.clientName, 160);
  const clientEmail = text(input.clientEmail, 254);
  const clientAddress = text(input.clientAddress, 300);
  const notes = text(input.notes, 2000);
  const siret = text(input.clientSiret, 17);
  if (!clientName || [clientEmail, clientAddress, notes, siret].includes(undefined)) return null;
  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return null;
  if (siret && !/^[0-9 ]{9,17}$/.test(siret)) return null;
  const issueDate = String(input.issueDate ?? "");
  const dueDate = String(input.dueDate ?? "");
  if (!isDate(issueDate) || (dueDate && !isDate(dueDate))) return null;
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 50) return null;

  const catalogue = new Map((await loadSalesCatalogue()).map((i) => [i.id, i]));
  const lines = [];
  for (const l of input.lines) {
    const qty = Number(String(l.qty ?? "").replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 10000) return null;
    const fixedRaw = String(l.fixedCommissionEuros ?? "").trim().replace(/\s/g, "").replace(",", ".");
    let fixed_commission_cents: number | null = null;
    if (fixedRaw !== "") {
      const fixed = Number(fixedRaw);
      if (!Number.isFinite(fixed) || fixed < 0 || fixed > 1_000_000) return null;
      fixed_commission_cents = Math.round(fixed * 100);
    }
    if (l.catalogueId) {
      const item = catalogue.get(l.catalogueId);
      if (!item) return null;
      // Rep may lower the unit price within the admin max-discount cap; never above list price.
      const rawPrice = String(l.unitEuros ?? "").trim().replace(/\s/g, "").replace(",", ".");
      const requested = rawPrice === "" ? item.unitCents / 100 : Number(rawPrice);
      if (!Number.isFinite(requested) || requested < 0 || requested > 1_000_000) return null;
      const requestedCents = Math.round(requested * 100);
      const minCents = Math.round(item.unitCents * (1 - item.maxDiscountPercent / 100));
      if (requestedCents < minCents || requestedCents > item.unitCents) return null;
      lines.push({
        catalogue_id: item.id,
        label: item.label,
        detail: item.detail.slice(0, 300),
        product_type: item.productType,
        qty,
        unit_cents: requestedCents,
        fixed_commission_cents,
      });
    } else {
      const label = text(l.label, 200);
      const price = Number(String(l.unitEuros ?? "").replace(/\s/g, "").replace(",", "."));
      if (!label || !isProductType(l.productType) || !Number.isFinite(price) || price < 0 || price > 1_000_000) return null;
      lines.push({ catalogue_id: null, label, detail: "", product_type: l.productType, qty, unit_cents: Math.round(price * 100), fixed_commission_cents });
    }
  }
  return {
    kind: input.kind,
    client_name: clientName,
    client_email: clientEmail?.toLowerCase() ?? null,
    client_siret: siret,
    client_address: clientAddress,
    issue_date: issueDate,
    due_date: dueDate || null,
    status: input.status,
    notes,
    lines,
    vat_rate: VAT_RATE,
  };
}

/** Links the document to the rep's own customer record with the same e-mail, when there is one. */
async function customerFor(me: { id: string }, email: string | null) {
  if (!email) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id").eq("salesperson_id", me.id).ilike("email", email.replace(/[\\%_]/g, "\\$&")).limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

export async function saveSalesDocument(id: string | null, input: DocInput): Promise<{ success: true; id: string } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (id !== null && !isUuid(id)) return fail("invalid");
  const row = await parseSalesDocInput(input);
  if (!row) return fail("invalid");
  const supabase = await createClient();
  const customer_id = await customerFor(me, row.client_email);

  if (id === null) {
    const { data, error } = await supabase.from("sales_documents").insert({ ...row, customer_id, salesperson_id: me.id }).select("id, number, client_name, total_ht_cents, kind, status").single();
    if (error || !data) {
      console.error("saveSalesDocument insert failed:", error?.message);
      return fail("failed");
    }
    if (data.status === "en_attente") await notifyDocumentIssued(data.id as string);
    revalidate();
    return { success: true, id: data.id };
  }

  const { data: current } = await supabase.from("sales_documents").select("status, kind").eq("id", id).eq("salesperson_id", me.id).maybeSingle();
  if (!current) return fail("notFound");
  // Only drafts and issued (not yet accepted / paid) documents can be edited; the kind never changes.
  if (current.status !== "brouillon" && current.status !== "en_attente") return fail("locked");
  const { kind: _kind, ...changes } = row;
  void _kind;
  const { data, error } = await supabase.from("sales_documents").update({ ...changes, customer_id }).eq("id", id).eq("salesperson_id", me.id).select("id, number, client_name, total_ht_cents, kind, status");
  if (error) {
    console.error("saveSalesDocument update failed:", error.message);
    return fail(/document_locked/.test(error.message) ? "locked" : "failed");
  }
  if (!data?.length) return fail("notFound");
  const saved = data[0]!;
  if (saved.status === "en_attente" && current.status !== "en_attente") {
    await notifyDocumentIssued(saved.id as string);
  }
  revalidate();
  return { success: true, id };
}

export async function setSalesDocumentStatus(id: string, to: DocStatus): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data: current } = await supabase.from("sales_documents").select("status, kind, total_ht_cents").eq("id", id).eq("salesperson_id", me.id).maybeSingle();
  if (!current) return fail("notFound");
  const allowed = DOC_TRANSITIONS[current.kind as DocKind]?.[current.status as DocStatus] ?? [];
  if (!allowed.includes(to)) return fail("transition");
  // Full collection shortcut: marking "payee" without a partial amount means the whole HT was collected.
  const update: Record<string, unknown> = { status: to };
  if (to === "payee") update.amount_paid_cents = Number(current.total_ht_cents ?? 0);
  // `.eq("status", current.status)`: a stale screen cannot skip a step.
  const { data, error } = await supabase.from("sales_documents").update(update).eq("id", id).eq("salesperson_id", me.id).eq("status", current.status).select("id, number, client_name, total_ht_cents");
  if (error) {
    console.error("setSalesDocumentStatus failed:", error.message);
    return fail(/document_locked/.test(error.message) ? "locked" : /amount_paid/.test(error.message) ? "failed" : "failed");
  }
  if (!data?.length) return fail("transition");
  if (to === "en_attente") await notifyDocumentIssued(data[0]!.id as string);
  revalidate();
  return { success: true };
}

/**
 * Records HT collected on an invoice (partial or full). Commission is recomputed by the DB trigger on
 * amount_paid_cents (handoff: commission = amount actually collected × rate). Full collection flips status to payee.
 */
export async function collectSalesDocument(id: string, amountHtEuros: string): Promise<{ success: true; paid: boolean } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const amount = Number(String(amountHtEuros ?? "").trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return fail("invalid");
  const addCents = Math.round(amount * 100);

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("sales_documents")
    .select("status, kind, total_ht_cents, amount_paid_cents")
    .eq("id", id)
    .eq("salesperson_id", me.id)
    .maybeSingle();
  if (!current || current.kind !== "facture") return fail("notFound");
  if (current.status !== "en_attente" && current.status !== "payee") return fail("transition");

  const total = Number(current.total_ht_cents ?? 0);
  const already = Number(current.amount_paid_cents ?? 0);
  const nextPaid = Math.min(total, already + addCents);
  if (nextPaid <= already && current.status === "payee") return fail("invalid");

  const update: Record<string, unknown> = { amount_paid_cents: nextPaid };
  if (nextPaid >= total && total > 0) update.status = "payee";

  const { data, error } = await supabase
    .from("sales_documents")
    .update(update)
    .eq("id", id)
    .eq("salesperson_id", me.id)
    .eq("status", current.status)
    .select("id");
  if (error) {
    console.error("collectSalesDocument failed:", error.message);
    return fail(/amount_paid|column/.test(error.message) ? "failed" : "failed");
  }
  if (!data?.length) return fail("transition");
  revalidate();
  return { success: true, paid: nextPaid >= total && total > 0 };
}

/** Accepted (or sent) quote → new draft invoice with the same lines; the quote becomes "accepté". */
export async function invoiceFromQuote(id: string): Promise<{ success: true; id: string } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("sales_documents")
    .select("id, kind, status, client_name, client_email, client_siret, client_address, customer_id, lines, notes")
    .eq("id", id)
    .eq("salesperson_id", me.id)
    .maybeSingle();
  if (!q || q.kind !== "devis") return fail("notFound");
  if (q.status !== "en_attente" && q.status !== "validee") return fail("transition");
  const { data: existing } = await supabase.from("sales_documents").select("id").eq("quote_id", id).eq("salesperson_id", me.id).limit(1);
  if (existing?.length) return { success: true, id: existing[0].id as string };

  const { data, error } = await supabase
    .from("sales_documents")
    .insert({
      kind: "facture",
      salesperson_id: me.id,
      quote_id: q.id,
      customer_id: q.customer_id,
      client_name: q.client_name,
      client_email: q.client_email,
      client_siret: q.client_siret,
      client_address: q.client_address,
      notes: q.notes,
      // The database recomputes totals and rates from these lines.
      lines: q.lines,
      status: "brouillon",
      vat_rate: VAT_RATE,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("invoiceFromQuote failed:", error?.message);
    return fail("failed");
  }
  if (q.status === "en_attente") await supabase.from("sales_documents").update({ status: "validee" }).eq("id", q.id).eq("salesperson_id", me.id).eq("status", "en_attente");
  revalidate();
  return { success: true, id: data.id };
}

export async function deleteSalesDocument(id: string): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("sales_documents").delete().eq("id", id).eq("salesperson_id", me.id).eq("status", "brouillon").select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("locked");
  revalidate();
  return { success: true };
}
