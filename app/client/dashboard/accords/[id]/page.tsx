import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { acceptedWhen, agreementKind, myAgreement } from "@/lib/client/agreements";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Accord accepté — AK Universe" } };

export default async function AgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc?: string }>;
}) {
  const me = await requireClient("/client/dashboard/accords");
  const { id } = await params;
  const { doc } = await searchParams;
  const privacy = doc === "privacy";
  const row = await myAgreement(me.id, id);
  if (!row) notFound();
  if (privacy && !row.privacy_version) notFound();

  const title = privacy ? "Politique de confidentialité" : "Conditions Générales de Vente et d'Utilisation";
  const label = privacy ? row.privacy_label : row.terms_label;
  const version = privacy ? row.privacy_version : row.terms_version;
  const at = privacy ? (row.privacy_accepted_at ?? row.accepted_at) : row.accepted_at;
  const body = privacy ? row.privacy_snapshot : row.terms_snapshot;

  return (
    <main className="cs-page cs-contract-page">
      <div className="cs-doc-bar">
        <Link href="/client/dashboard/accords" className="cs-btn-outline">
          <ArrowLeft size={16} aria-hidden="true" /> Mes accords
        </Link>
        <a className="cs-btn-outline" href={`/client/dashboard/accords/${row.id}/fichier?doc=${privacy ? "privacy" : "terms"}`}>
          <Download size={16} aria-hidden="true" /> Télécharger
        </a>
      </div>
      <article className="cs-contract">
        <header className="cs-contract-head">
          <div>
            <p className="cs-brand-doc notranslate">AK Universe</p>
            <p>{agreementKind(row.kind)}</p>
          </div>
          <div className="cs-contract-ref">
            <h1>{title}</h1>
            <p>
              <strong>Version :</strong> {label ?? version}
            </p>
            <p>
              <strong>Accepté le :</strong> {acceptedWhen(at)}
            </p>
          </div>
        </header>
        {body ? (
          <div className="legal-html" dangerouslySetInnerHTML={{ __html: body }} />
        ) : (
          <p>Le texte de cette version n&apos;a pas été conservé. La version enregistrée est : {label ?? version}.</p>
        )}
      </article>
    </main>
  );
}
