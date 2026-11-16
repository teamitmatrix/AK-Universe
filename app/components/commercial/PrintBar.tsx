"use client";

import Link from "next/link";
import { Printer, X } from "lucide-react";

/** Top bar of the printable document (hidden when printing). "Télécharger en PDF" = the browser's own print-to-PDF. */
export function PrintBar({ title, closeHref = "/commercial/devis-factures" }: { title: string; closeHref?: string }) {
  return (
    <div className="doc-bar">
      <p>
        <span className="doc-bar-brand notranslate" translate="no">
          <span>AK</span> UNIVERSE
        </span>{" "}
        — Aperçu du document · {title}
      </p>
      <div>
        <Link href={closeHref} className="doc-btn is-ghost">
          <X size={15} aria-hidden="true" /> Fermer
        </Link>
        <button type="button" className="doc-btn" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" /> Télécharger en PDF / Imprimer
        </button>
      </div>
    </div>
  );
}
