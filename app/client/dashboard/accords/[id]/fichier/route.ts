import { NextResponse } from "next/server";
import { acceptedWhen, myAgreement } from "@/lib/client/agreements";
import { getClientMe } from "@/lib/client/session";
import { redirectToPath } from "@/lib/supabase/env";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

/** Download of the exact terms or privacy text this customer accepted. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getClientMe();
  const { id } = await params;
  if (!me) return redirectToPath(`/connexion?redirectTo=${encodeURIComponent(`/client/dashboard/accords/${id}`)}`, 303);

  const doc = new URL(request.url).searchParams.get("doc") === "privacy" ? "privacy" : "terms";
  const row = await myAgreement(me.id, id);
  if (!row) return new NextResponse("Document introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } });

  const privacy = doc === "privacy";
  if (privacy && !row.privacy_version) {
    return new NextResponse("Document introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const title = privacy ? "Politique de confidentialité" : "Conditions Générales de Vente et d'Utilisation";
  const label = (privacy ? row.privacy_label : row.terms_label) ?? "";
  const version = (privacy ? row.privacy_version : row.terms_version) ?? "document";
  const at = privacy ? (row.privacy_accepted_at ?? row.accepted_at) : row.accepted_at;
  const body = (privacy ? row.privacy_snapshot : row.terms_snapshot) ?? `<p>${escapeHtml(label)}</p>`;
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — AK Universe</title>
</head>
<body>
  <p>AK Universe</p>
  <h1>${escapeHtml(title)}</h1>
  <p><strong>Version :</strong> ${escapeHtml(label || version)}</p>
  <p><strong>Accepté le :</strong> ${escapeHtml(acceptedWhen(at))} (heure de Paris)</p>
  <hr />
  ${body}
</body>
</html>`;

  const filename = `${privacy ? "politique-confidentialite" : "cgv"}-ak-universe-${version}.html`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
