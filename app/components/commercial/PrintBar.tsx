"use client";

import Link from "next/link";
import { Printer, X } from "lucide-react";

/** Top bar of the printable document (hidden when printing). "Télécharger en PDF" = the browser's own print-to-PDF. */
export function PrintBar({
  title,
  closeHref = "/commercial/devis-factures",
  closeLabel = "Fermer",
}: {
  title: string;
  closeHref?: string;
  closeLabel?: string;
}) {
  return (
    <div className="doc-bar" aria-label={title}>
      <div>
        <Link href={closeHref} className="doc-btn is-ghost">
          <X size={15} aria-hidden="true" /> {closeLabel}
        </Link>
        <button type="button" className="doc-btn" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" /> Télécharger en PDF / Imprimer
        </button>
      </div>
    </div>
  );
}
