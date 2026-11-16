import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth/session";
import { COMMISSION_PERIODS, loadCommissionBoard, oneOf, repParam, type CommissionFilter } from "@/lib/admin/crm";

/** CSV export of the commission board. Admins only; filters mirror /admin/commissions. */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Not found", { status: 404 });
  const sp = request.nextUrl.searchParams;
  const filter: CommissionFilter = {
    status: oneOf(sp.get("statut"), ["en_attente", "validee", "a_payer", "payee"] as const),
    commercial: repParam(sp.get("commercial")),
    period: oneOf(sp.get("mois"), COMMISSION_PERIODS.filter(Boolean) as ["mois", "mois-precedent", "30j", "12m"]),
  };
  const data = await loadCommissionBoard(filter);
  if (!data.migrated) return new NextResponse("Not ready", { status: 503 });

  const euros = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));
  const statusLabel: Record<string, string> = {
    en_attente: "En attente",
    validee: "Validée",
    a_payer: "À payer",
    payee: "Payée",
  };
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const header = ["Date", "Commercial", "Référence", "Client", "Montant vente (€)", "Commission (€)", "Statut", "Validée le", "Payée le"];
  const lines = data.rows.map((r) =>
    [
      r.date.slice(0, 10),
      r.commercial,
      r.reference,
      r.client,
      euros(r.saleCents),
      euros(r.amountCents),
      statusLabel[r.status] ?? r.status,
      r.validatedAt ? r.validatedAt.slice(0, 10) : "",
      r.paidAt ? r.paidAt.slice(0, 10) : "",
    ]
      .map(cell)
      .join(";"),
  );
  const csv = "\uFEFF" + [header.map(cell).join(";"), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ak-universe-commissions-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
