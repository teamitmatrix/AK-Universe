import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth/session";
import { LEDGER_PERIODS, loadLedger, oneOf } from "@/lib/admin/crm";

/** CSV export of the sales ledger (Rapports → Exporter). Admins only, checked on every request. */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Not found", { status: 404 });
  const period = oneOf(request.nextUrl.searchParams.get("periode"), LEDGER_PERIODS) || "12m";
  const { rows } = await loadLedger({ period, commercial: "", state: "", type: "" });

  const euros = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));
  // Quote every field; neutralise spreadsheet formulas (CSV injection) in free-text cells.
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const header = ["Date", "Référence", "Type", "Client", "Produit", "Commercial", "Montant HT (€)", "Encaissé (€)", "Reste (€)", "Commission (€)"];
  const lines = rows.map((r) =>
    [r.date.slice(0, 10), r.reference, r.type === "video" ? "Vidéo" : r.type === "facture" ? "Facture" : "Abonnement", r.client, r.product, r.commercial ?? "", euros(r.amountCents), euros(r.collectedCents), euros(r.remainingCents), euros(r.commissionCents)]
      .map(cell)
      .join(";"),
  );
  // BOM + ";" separator: opens correctly in Excel (French locale).
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ak-universe-ventes-${period}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
