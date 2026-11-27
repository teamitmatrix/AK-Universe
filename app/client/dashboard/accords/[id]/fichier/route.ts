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

  const asked = new URL(request.url).searchParams.get("doc");
  const doc = asked === "privacy" || asked === "all" ? asked : "terms";
  const row = await myAgreement(me.id, id);
  if (!row) return new NextResponse("Document introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } });

  const privacy = doc === "privacy";
  if (privacy && !row.privacy_version) {
    return new NextResponse("Document introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const section = (title: string, label: string, version: string, at: string, body: string) => `
  <h1>${escapeHtml(title)}</h1>
  <p><strong>Version :</strong> ${escapeHtml(label || version)}</p>
  <p><strong>Accepté le :</strong> ${escapeHtml(acceptedWhen(at))} (heure de Paris)</p>
  <hr />
  ${body}`;

  const termsBlock = section(
    "Conditions Générales de Vente et d'Utilisation",
    row.terms_label ?? "",
    row.terms_version,
    row.accepted_at,
    row.terms_snapshot ?? `<p>${escapeHtml(row.terms_label ?? "")}</p>`
  );
  const privacyBlock = row.privacy_version
    ? section(
        "Politique de confidentialité",
        row.privacy_label ?? "",
        row.privacy_version,
        row.privacy_accepted_at ?? row.accepted_at,
        row.privacy_snapshot ?? `<p>${escapeHtml(row.privacy_label ?? "")}</p>`
      )
    : "";

  const title =
    doc === "all"
      ? "Documents acceptés"
      : privacy
        ? "Politique de confidentialité"
        : "Conditions Générales de Vente et d'Utilisation";
  const version = privacy ? row.privacy_version : row.terms_version;
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — AK Universe</title>
</head>
<body>
  <p>AK Universe</p>
  ${doc === "privacy" ? privacyBlock : doc === "all" ? `${termsBlock}${privacyBlock}` : termsBlock}
</body>
</html>`;

  const filename =
    doc === "all"
      ? `documents-acceptes-ak-universe-${row.terms_version}.html`
      : `${privacy ? "politique-confidentialite" : "cgv"}-ak-universe-${version}.html`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
