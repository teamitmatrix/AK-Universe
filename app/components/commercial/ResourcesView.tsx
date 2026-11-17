"use client";

import { Download, FileText } from "lucide-react";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import type { LibraryCategory } from "@/lib/admin/documents";
import { getResourceUrl } from "@/lib/commercial/resource-actions";
import type { Resource } from "@/lib/commercial/resources";
import { dateFrTz } from "@/lib/commercial/time";

/** commercial/ressources.html (handoff page 08): filterable grid of the shared library, real downloads. */

const CATEGORIES: { id: "" | LibraryCategory; label: string }[] = [
  { id: "", label: "Tous" },
  { id: "brochures", label: "Brochures" },
  { id: "cgv", label: "CGV" },
  { id: "presentations", label: "Présentations" },
  { id: "contrats", label: "Contrats" },
  { id: "supports", label: "Supports commerciaux" },
];
const LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<string, string>;
const size = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`);

export function ResourcesView({ resources }: { resources: Resource[] }) {
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [cat, setCat] = useState<"" | LibraryCategory>("");
  const shown = resources.filter((r) => !cat || r.category === cat);

  const download = (r: Resource) =>
    start(async () => {
      const res = await getResourceUrl(r.path);
      if (!res.success) return toast(res.error === "forbidden" ? "Accès refusé." : "Ce fichier n'est plus disponible.");
      window.location.assign(res.url);
    });

  return (
    <>
      <div className="com-chips" role="group" aria-label="Catégorie">
        {CATEGORIES.map((c) => (
          <button key={c.id || "all"} type="button" className={cat === c.id ? "is-active" : undefined} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.label}
            {c.id && <small> {resources.filter((r) => r.category === c.id).length}</small>}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="adm-empty">{resources.length === 0 ? "Aucun document pour le moment. L'administrateur les ajoute dans Admin → Documents." : "Aucun document dans cette catégorie."}</p>
      ) : (
        <ul className="com-resource-grid">
          {shown.map((r) => (
            <li key={r.path} className="adm-card com-resource">
              <div className="com-resource-top">
                <span className="adm-kpi-ic" aria-hidden="true">
                  <FileText size={16} />
                </span>
                {r.format && <span className="com-format">{r.format}</span>}
              </div>
              <strong className="com-resource-name" title={r.name}>
                {r.name.replace(/\.[^.]+$/, "")}
              </strong>
              <span className="adm-person-mail">
                {LABEL[r.category]} · {size(r.size)}
                {r.updatedAt ? ` · maj le ${dateFrTz(r.updatedAt)}` : ""}
              </span>
              <button type="button" className="adm-btn is-ghost com-download" disabled={pending} onClick={() => download(r)}>
                <Download size={15} aria-hidden="true" /> Télécharger
              </button>
            </li>
          ))}
        </ul>
      )}
      {toastNode}
    </>
  );
}
