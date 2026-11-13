"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FilePlus2, FileText, Lock, Minus, Pencil, PenLine, Plus, Receipt, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import type { SalesCatalogueItem } from "@/lib/commercial/catalogue";
import {
  DOC_STATUS_LABELS,
  DOC_TRANSITIONS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  VAT_RATE,
  type DocKind,
  type DocStatus,
  type ProductType,
} from "@/lib/commercial/commission-rules";
import { deleteSalesDocument, invoiceFromQuote, saveSalesDocument, setSalesDocumentStatus, type DocInput, type LineInput } from "@/lib/commercial/sales-doc-actions";
import type { SalesDoc } from "@/lib/commercial/sales-docs";

/*
 * commercial/devis-factures.html (handoff pages 06 / 09): the rep's quotes & invoices, filterable by type and status,
 * and the redesigned "Nouveau devis / facture" modal — catalogue-first lines, locked commission rate per product
 * type, 3-column totals recap. The server re-reads catalogue prices and the database recomputes totals / commission.
 * Texts are French (the sales space is French-only while fixed translations are off).
 */

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateFr = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR");
const STATUS_FILTERS: { id: "" | DocStatus; label: string }[] = [
  { id: "", label: "Tous les statuts" },
  { id: "brouillon", label: "Brouillon" },
  { id: "en_attente", label: "En attente" },
  { id: "validee", label: "Validée" },
  { id: "payee", label: "Payée" },
  { id: "annulee", label: "Annulée" },
];
const STATUS_CLASS: Record<DocStatus, string> = { brouillon: "is-muted", en_attente: "is-info", validee: "is-ok", payee: "is-ok", annulee: "is-danger" };
const ACTION_LABEL: Record<DocKind, Partial<Record<DocStatus, string>>> = {
  devis: { en_attente: "Marquer envoyé", validee: "Marquer accepté", annulee: "Marquer refusé", brouillon: "Repasser en brouillon" },
  facture: { en_attente: "Émettre", payee: "Marquer payée", brouillon: "Repasser en brouillon" },
};
const ERRORS: Record<string, string> = {
  forbidden: "Accès refusé.",
  invalid: "Vérifiez les champs : client, date et au moins une ligne valide.",
  notFound: "Ce document n'existe plus.",
  locked: "Ce document est verrouillé (accepté, payé ou annulé).",
  transition: "Ce changement de statut n'est pas possible.",
  failed: "L'opération a échoué. Réessayez.",
};

type Props = {
  docs: SalesDoc[];
  catalogue: SalesCatalogueItem[];
  rates: Record<ProductType, number>;
  clients: { id: string; name: string; email: string }[];
  initialNew: DocKind | null;
  initialQuery: string;
};

export function DocumentsView({ docs, catalogue, rates, clients, initialNew, initialQuery }: Props) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<"" | DocKind>("");
  const [status, setStatus] = useState<"" | DocStatus>("");
  const [q, setQ] = useState(initialQuery);
  const [modal, setModal] = useState<{ kind: DocKind; doc: SalesDoc | null } | null>(initialNew ? { kind: initialNew, doc: null } : null);

  const shown = docs.filter(
    (d) =>
      (!kind || d.kind === kind) &&
      (!status || d.status === status) &&
      (!q.trim() || `${d.number} ${d.clientName} ${d.clientEmail ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const run = (fn: () => Promise<{ success: boolean; error?: string; id?: string }>, done: string) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return toast(ERRORS[res.error ?? "failed"] ?? ERRORS.failed);
      toast(done);
      router.refresh();
    });

  const changeStatus = (d: SalesDoc, to: DocStatus) => {
    if (to === "payee" && !window.confirm(`Confirmer que la facture ${d.number} (${euros(d.totalTtcCents)}) est encaissée ? La commission sera enregistrée « en attente » de validation par l'administrateur.`)) return;
    run(() => setSalesDocumentStatus(d.id, to), "Statut mis à jour.");
  };

  return (
    <>
      <div className="com-board-bar">
        <div className="com-chips" role="group" aria-label="Type de document">
          {(["", "devis", "facture"] as const).map((k) => (
            <button key={k || "all"} type="button" className={kind === k ? "is-active" : undefined} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === "" ? "Tous" : k === "devis" ? "Devis" : "Factures"}
            </button>
          ))}
        </div>
        <button type="button" className="adm-btn" onClick={() => setModal({ kind: "devis", doc: null })}>
          <Plus size={16} aria-hidden="true" /> Nouveau devis / facture
        </button>
      </div>
      <div className="com-board-bar">
        <div className="com-chips" role="group" aria-label="Statut">
          {STATUS_FILTERS.map((s) => (
            <button key={s.id || "all"} type="button" className={status === s.id ? "is-active" : undefined} aria-pressed={status === s.id} onClick={() => setStatus(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="adm-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un devis, un client…" aria-label="Rechercher un devis ou un client" />
        </label>
      </div>

      <section className="adm-card">
        {shown.length === 0 ? (
          <p className="adm-empty">{docs.length === 0 ? "Aucun devis ni facture pour le moment. Créez votre premier document." : "Aucun document ne correspond à ces filtres."}</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table" aria-busy={pending}>
              <thead>
                <tr>
                  <th scope="col">N°</th>
                  <th scope="col">Type</th>
                  <th scope="col">Client</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">Total TTC</th>
                  <th scope="col" className="num">Commission</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => {
                  const next = DOC_TRANSITIONS[d.kind][d.status] ?? [];
                  const editable = d.status === "brouillon" || d.status === "en_attente";
                  return (
                    <tr key={d.id}>
                      <td data-label="N°">
                        <strong className="com-mono">{d.number}</strong>
                      </td>
                      <td data-label="Type">
                        <span className={`adm-badge ${d.kind === "devis" ? "is-info" : "is-warn"}`}>{d.kind === "devis" ? "Devis" : "Facture"}</span>
                      </td>
                      <td data-label="Client">{d.clientName}</td>
                      <td data-label="Date">{dateFr(d.issueDate)}</td>
                      <td data-label="Total TTC" className="num">
                        {euros(d.totalTtcCents)}
                      </td>
                      <td data-label="Commission" className="num">
                        {euros(d.commissionCents)}
                      </td>
                      <td data-label="Statut">
                        <span className={`adm-badge ${STATUS_CLASS[d.status]}`}>{DOC_STATUS_LABELS[d.kind][d.status]}</span>
                      </td>
                      <td data-label="Actions">
                        <span className="com-row-actions">
                          <Link className="adm-icon-btn sm" href={`/commercial/document?id=${d.id}`} title="Voir / télécharger" aria-label={`Voir / télécharger ${d.number}`}>
                            <Eye size={15} />
                          </Link>
                          {editable && (
                            <button type="button" className="adm-icon-btn sm" title="Modifier" aria-label={`Modifier ${d.number}`} onClick={() => setModal({ kind: d.kind, doc: d })}>
                              <Pencil size={15} />
                            </button>
                          )}
                          {next
                            .filter((s) => s !== "brouillon")
                            .map((s) => (
                              <button key={s} type="button" className={`adm-btn sm${s === "payee" || s === "validee" ? "" : " is-ghost"}`} disabled={pending} onClick={() => changeStatus(d, s)}>
                                {ACTION_LABEL[d.kind][s]}
                              </button>
                            ))}
                          {d.kind === "devis" && (d.status === "en_attente" || d.status === "validee") && (
                            <button type="button" className="adm-btn sm is-ghost" disabled={pending} onClick={() => run(() => invoiceFromQuote(d.id), "Facture brouillon créée depuis le devis.")}>
                              <Receipt size={14} aria-hidden="true" /> Facturer
                            </button>
                          )}
                          {d.status === "brouillon" && (
                            <button
                              type="button"
                              className="adm-icon-btn sm com-danger"
                              title="Supprimer le brouillon"
                              aria-label={`Supprimer ${d.number}`}
                              disabled={pending}
                              onClick={() => window.confirm(`Supprimer le brouillon ${d.number} ?`) && run(() => deleteSalesDocument(d.id), "Brouillon supprimé.")}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <DocumentModal
          key={modal.doc?.id ?? `new-${modal.kind}`}
          initialKind={modal.kind}
          doc={modal.doc}
          catalogue={catalogue}
          rates={rates}
          clients={clients}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            toast(msg);
            router.refresh();
          }}
        />
      )}
      {toastNode}
    </>
  );
}

type EditLine = LineInput & { key: number };
let lineKey = 0;
const today = () => new Date().toISOString().slice(0, 10);

function DocumentModal({
  initialKind,
  doc,
  catalogue,
  rates,
  clients,
  onClose,
  onSaved,
}: {
  initialKind: DocKind;
  doc: SalesDoc | null;
  catalogue: SalesCatalogueItem[];
  rates: Record<ProductType, number>;
  clients: { id: string; name: string; email: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [kind, setKind] = useState<DocKind>(doc?.kind ?? initialKind);
  const [form, setForm] = useState({
    clientName: doc?.clientName ?? "",
    clientEmail: doc?.clientEmail ?? "",
    clientSiret: doc?.clientSiret ?? "",
    clientAddress: doc?.clientAddress ?? "",
    issueDate: doc?.issueDate ?? today(),
    dueDate: doc?.dueDate ?? "",
    status: (doc?.status === "en_attente" ? "en_attente" : "brouillon") as DocStatus,
    notes: doc?.notes ?? "",
  });
  const [lines, setLines] = useState<EditLine[]>(() =>
    (doc?.lines ?? []).map((l) => ({
      key: ++lineKey,
      catalogueId: l.catalogue_id,
      label: l.label,
      productType: l.product_type,
      unitEuros: String(l.unit_cents / 100),
      qty: String(l.qty),
    })),
  );
  const [pick, setPick] = useState("");
  const byId = useMemo(() => new Map(catalogue.map((i) => [i.id, i])), [catalogue]);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const close = () => {
    ref.current?.close();
    onClose();
  };
  const updateLine = (key: number, patch: Partial<EditLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const num = (v: string) => {
    const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const addCatalogue = () => {
    const item = byId.get(pick);
    if (!item) return;
    setLines((ls) => [...ls, { key: ++lineKey, catalogueId: item.id, label: item.label, productType: item.productType, unitEuros: String(item.unitCents / 100), qty: "1" }]);
    setPick("");
  };
  const addCustom = () => setLines((ls) => [...ls, { key: ++lineKey, catalogueId: null, label: "", productType: "prestations", unitEuros: "", qty: "1" }]);

  // Preview only — the database recomputes the same figures from commission_rates when saving.
  const htCents = lines.reduce((s, l) => s + Math.round(num(l.qty) * num(l.unitEuros) * 100), 0);
  const vatCents = Math.round((htCents * VAT_RATE) / 100);
  const commissionCents = Math.round(lines.reduce((s, l) => s + num(l.qty) * num(l.unitEuros) * 100 * ((rates[l.productType as ProductType] ?? 10) / 100), 0));

  const chooseClient = (name: string) => {
    const c = clients.find((x) => x.name === name);
    setForm((f) => ({ ...f, clientName: name, clientEmail: c?.email || f.clientEmail }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (lines.length === 0) return setError("Ajoutez au moins une ligne (catalogue ou personnalisée).");
    const input: DocInput = { kind, ...form, lines: lines.map(({ key: _k, ...l }) => (void _k, l)) };
    start(async () => {
      const res = await saveSalesDocument(doc?.id ?? null, input);
      if (!res.success) return setError(ERRORS[res.error] ?? ERRORS.failed);
      onSaved(doc ? "Document enregistré." : kind === "devis" ? "Devis créé." : "Facture créée.");
      close();
    });
  };

  const grouped = PRODUCT_TYPES.map((t) => ({ t, items: catalogue.filter((i) => i.productType === t) })).filter((g) => g.items.length);

  return (
    <dialog ref={ref} className="adm-modal com-doc-modal" aria-labelledby="com-doc-title" onClose={onClose}>
      <form className="adm-modal-card" onSubmit={submit}>
        <header>
          <div>
            <h2 id="com-doc-title">{doc ? `Modifier ${doc.number}` : "Nouveau devis / facture"}</h2>
            <p className="adm-muted">Créez un devis ou une facture en quelques secondes.</p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={close} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="com-kind-toggle" role="group" aria-label="Type de document">
          <button type="button" className={kind === "devis" ? "is-active" : undefined} aria-pressed={kind === "devis"} disabled={!!doc} onClick={() => setKind("devis")}>
            <FileText size={16} aria-hidden="true" /> Devis
          </button>
          <button type="button" className={kind === "facture" ? "is-active" : undefined} aria-pressed={kind === "facture"} disabled={!!doc} onClick={() => setKind("facture")}>
            <Receipt size={16} aria-hidden="true" /> Facture (= vente)
          </button>
        </div>

        <fieldset className="com-fieldset">
          <legend>Client</legend>
          <div className="adm-form-grid">
            <label className="adm-field">
              <span>Nom du client *</span>
              <input required maxLength={160} list="com-client-list" value={form.clientName} onChange={(e) => chooseClient(e.target.value)} />
              <datalist id="com-client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </label>
            <label className="adm-field">
              <span>E-mail du client</span>
              <input type="email" maxLength={254} value={form.clientEmail} onChange={set("clientEmail")} />
            </label>
            <label className="adm-field">
              <span>SIRET</span>
              <input inputMode="numeric" maxLength={17} value={form.clientSiret} onChange={set("clientSiret")} />
            </label>
            <label className="adm-field">
              <span>Date *</span>
              <input type="date" required value={form.issueDate} onChange={set("issueDate")} />
            </label>
            <label className="adm-field">
              <span>Statut *</span>
              <select className="adm-select" value={form.status} onChange={set("status")}>
                <option value="brouillon">Brouillon</option>
                <option value="en_attente">{kind === "devis" ? "Envoyé (en attente)" : "Émise (à encaisser)"}</option>
              </select>
            </label>
            {kind === "facture" && (
              <label className="adm-field">
                <span>Échéance</span>
                <input type="date" value={form.dueDate} onChange={set("dueDate")} />
              </label>
            )}
            <label className="adm-field is-wide">
              <span>Adresse</span>
              <input maxLength={300} value={form.clientAddress} onChange={set("clientAddress")} />
            </label>
          </div>
        </fieldset>

        <fieldset className="com-fieldset">
          <legend>Lignes</legend>
          <div className="com-line-add">
            <select className="adm-select" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Prestation du catalogue">
              <option value="">Choisir dans le catalogue…</option>
              {grouped.map((g) => (
                <optgroup key={g.t} label={`${PRODUCT_TYPE_LABELS[g.t]} — ${rates[g.t]} %`}>
                  {g.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label} — {euros(i.unitCents)}
                      {i.recurring ? " / mois" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button type="button" className="adm-btn" disabled={!pick} onClick={addCatalogue}>
              <FilePlus2 size={15} aria-hidden="true" /> Ajouter depuis le catalogue
            </button>
            <button type="button" className="adm-btn is-ghost" onClick={addCustom}>
              <PenLine size={15} aria-hidden="true" /> Ligne personnalisée
            </button>
          </div>

          {lines.length === 0 ? (
            <p className="adm-empty">Aucune ligne. Ajoutez une prestation du catalogue ou une ligne personnalisée.</p>
          ) : (
            <ul className="com-lines">
              {lines.map((l) => {
                const fromCatalogue = !!l.catalogueId;
                const type = l.productType as ProductType;
                return (
                  <li key={l.key} className="com-line">
                    <span className="com-line-badge" title={PRODUCT_TYPE_LABELS[type]}>
                      AK
                    </span>
                    {fromCatalogue ? (
                      <span className="com-line-label">
                        <strong>{l.label}</strong>
                        <small>{byId.get(l.catalogueId!)?.detail ?? ""}</small>
                      </span>
                    ) : (
                      <span className="com-line-label">
                        <input aria-label="Désignation" placeholder="Désignation *" required maxLength={200} value={l.label} onChange={(e) => updateLine(l.key, { label: e.target.value })} />
                        <select className="adm-select" aria-label="Type de prestation" value={l.productType} onChange={(e) => updateLine(l.key, { productType: e.target.value })}>
                          {PRODUCT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {PRODUCT_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </span>
                    )}
                    <span className="com-qty">
                      <button type="button" aria-label="Diminuer la quantité" onClick={() => updateLine(l.key, { qty: String(Math.max(1, num(l.qty) - 1)) })}>
                        <Minus size={14} />
                      </button>
                      <input aria-label="Quantité" inputMode="decimal" value={l.qty} onChange={(e) => updateLine(l.key, { qty: e.target.value })} />
                      <button type="button" aria-label="Augmenter la quantité" onClick={() => updateLine(l.key, { qty: String(num(l.qty) + 1) })}>
                        <Plus size={14} />
                      </button>
                    </span>
                    <label className="com-price">
                      <input
                        aria-label="Prix unitaire HT (€)"
                        inputMode="decimal"
                        readOnly={fromCatalogue}
                        title={fromCatalogue ? "Prix du catalogue" : undefined}
                        required
                        value={l.unitEuros}
                        onChange={(e) => updateLine(l.key, { unitEuros: e.target.value })}
                      />
                      <span>€</span>
                    </label>
                    <span className="com-rate" title="Taux de commission calculé automatiquement selon le type de produit (non modifiable)">
                      <Lock size={12} aria-hidden="true" /> {rates[type] ?? 10} %
                    </span>
                    <button type="button" className="adm-icon-btn sm com-danger" aria-label={`Retirer la ligne ${l.label || ""}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <div className="com-recap" aria-live="polite">
          <div>
            <span>Total HT</span>
            <strong>{euros(htCents)}</strong>
          </div>
          <div>
            <span>TVA {VAT_RATE} %</span>
            <strong>{euros(vatCents)}</strong>
          </div>
          <div className="is-total">
            <span>Total TTC</span>
            <strong>{euros(htCents + vatCents)}</strong>
          </div>
        </div>
        <p className="com-commission-note">
          <Lock size={13} aria-hidden="true" /> Commission estimée : <strong>{euros(commissionCents)}</strong> — taux verrouillé par type de produit, versée sur le montant réellement encaissé.
        </p>

        <label className="adm-field">
          <span>Notes (visibles sur le document)</span>
          <textarea rows={2} maxLength={2000} value={form.notes} onChange={set("notes")} />
        </label>

        {error && (
          <p className="adm-note" role="alert">
            {error}
          </p>
        )}
        <div className="adm-form-actions">
          <button type="button" className="adm-btn is-ghost" onClick={close}>
            Annuler
          </button>
          <button type="submit" className="adm-btn" disabled={pending}>
            {doc ? "Enregistrer" : kind === "devis" ? "Créer le devis" : "Créer la facture"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
