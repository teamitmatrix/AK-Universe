"use client";

import { FilePlus2, FileText, Lock, Minus, PenLine, Plus, Receipt, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { saveAdminSalesDocument } from "@/lib/admin/sales-doc-actions";
import type { SalesCatalogueItem } from "@/lib/commercial/catalogue";
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  VAT_RATE,
  type DocKind,
  type DocStatus,
  type ProductType,
} from "@/lib/commercial/commission-rules";
import type { DocInput, LineInput } from "@/lib/commercial/sales-doc-actions";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const ERRORS: Record<string, string> = {
  forbidden: "Accès refusé.",
  invalid: "Vérifiez le commercial, le client, les dates, les lignes et les remises catalogue.",
  failed: "Création impossible. Réessayez.",
};

type EditLine = LineInput & { key: number };
let lineKey = 0;
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  catalogue: SalesCatalogueItem[];
  rates: Record<ProductType, number>;
  reps: { id: string; name: string; active: boolean }[];
  clients: { id: string; name: string; email: string }[];
  initialNew?: DocKind | null;
  labels: {
    newQuote: string;
    newInvoice: string;
    noReps: string;
  };
};

/** Header actions + modal so admins can create devis / factures assigned to a sales rep. */
export function AdminSalesDocComposer({ catalogue, rates, reps, clients, initialNew = null, labels }: Props) {
  const activeReps = reps.filter((r) => r.active);
  const [modal, setModal] = useState<DocKind | null>(initialNew);
  const [toast, toastNode] = useToast();
  const router = useRouter();

  if (!activeReps.length) {
    return <p className="adm-muted adm-small">{labels.noReps}</p>;
  }

  return (
    <>
      <div className="adm-pagehead-actions">
        <button type="button" className="adm-btn is-ghost" onClick={() => setModal("devis")}>
          <FileText size={15} aria-hidden="true" /> {labels.newQuote}
        </button>
        <button type="button" className="adm-btn" onClick={() => setModal("facture")}>
          <Receipt size={15} aria-hidden="true" /> {labels.newInvoice}
        </button>
      </div>
      {modal && (
        <AdminDocumentModal
          key={modal}
          initialKind={modal}
          catalogue={catalogue}
          rates={rates}
          reps={activeReps}
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

function AdminDocumentModal({
  initialKind,
  catalogue,
  rates,
  reps,
  clients,
  onClose,
  onSaved,
}: {
  initialKind: DocKind;
  catalogue: SalesCatalogueItem[];
  rates: Record<ProductType, number>;
  reps: { id: string; name: string }[];
  clients: { id: string; name: string; email: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [kind, setKind] = useState<DocKind>(initialKind);
  const [salespersonId, setSalespersonId] = useState(reps[0]?.id ?? "");
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    clientSiret: "",
    clientAddress: "",
    issueDate: today(),
    dueDate: "",
    status: "brouillon" as DocStatus,
    notes: "",
  });
  const [lines, setLines] = useState<EditLine[]>([]);
  const [pick, setPick] = useState("");
  const byId = useMemo(() => new Map(catalogue.map((i) => [i.id, i])), [catalogue]);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
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
    setLines((ls) => [
      ...ls,
      {
        key: ++lineKey,
        catalogueId: item.id,
        label: item.label,
        productType: item.productType,
        unitEuros: String(item.unitCents / 100),
        qty: "1",
        fixedCommissionEuros: "",
      },
    ]);
    setPick("");
  };
  const addCustom = () =>
    setLines((ls) => [
      ...ls,
      { key: ++lineKey, catalogueId: null, label: "", productType: "prestations", unitEuros: "", qty: "1", fixedCommissionEuros: "" },
    ]);

  const htCents = lines.reduce((s, l) => s + Math.round(num(l.qty) * num(l.unitEuros) * 100), 0);
  const vatCents = Math.round((htCents * VAT_RATE) / 100);
  const commissionCents = Math.round(
    lines.reduce((s, l) => {
      const fixedRaw = String(l.fixedCommissionEuros ?? "").trim();
      if (fixedRaw !== "") return s + Math.round(num(fixedRaw) * 100);
      return s + num(l.qty) * num(l.unitEuros) * 100 * ((rates[l.productType as ProductType] ?? 10) / 100);
    }, 0),
  );

  const chooseClient = (name: string) => {
    const c = clients.find((x) => x.name === name);
    setForm((f) => ({ ...f, clientName: name, clientEmail: c?.email || f.clientEmail }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!salespersonId) return setError("Choisissez le commercial propriétaire du document.");
    if (lines.length === 0) return setError("Ajoutez au moins une ligne (catalogue ou personnalisée).");
    const input: DocInput = { kind, ...form, lines: lines.map(({ key: _k, ...l }) => (void _k, l)) };
    start(async () => {
      const res = await saveAdminSalesDocument(salespersonId, input);
      if (!res.success) return setError(ERRORS[res.error] ?? ERRORS.failed);
      onSaved(kind === "devis" ? "Devis créé." : "Facture créée.");
      close();
    });
  };

  const grouped = PRODUCT_TYPES.map((t) => ({ t, items: catalogue.filter((i) => i.productType === t) })).filter((g) => g.items.length);

  return (
    <dialog ref={ref} className="adm-modal com-doc-modal" aria-labelledby="adm-doc-title" onClose={onClose}>
      <form className="adm-modal-card" onSubmit={submit}>
        <header>
          <div>
            <h2 id="adm-doc-title">Nouveau devis / facture</h2>
            <p className="adm-muted">Le document est attribué au commercial choisi (commission et suivi client).</p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={close} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="com-kind-toggle" role="group" aria-label="Type de document">
          <button type="button" className={kind === "devis" ? "is-active" : undefined} aria-pressed={kind === "devis"} onClick={() => setKind("devis")}>
            <FileText size={16} aria-hidden="true" /> Devis
          </button>
          <button type="button" className={kind === "facture" ? "is-active" : undefined} aria-pressed={kind === "facture"} onClick={() => setKind("facture")}>
            <Receipt size={16} aria-hidden="true" /> Facture
          </button>
        </div>

        <label className="adm-field">
          <span>Commercial *</span>
          <select className="adm-select" required value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)}>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="com-fieldset">
          <legend>Client</legend>
          <div className="adm-form-grid">
            <label className="adm-field">
              <span>Nom du client *</span>
              <input required maxLength={160} list="adm-client-list" value={form.clientName} onChange={(e) => chooseClient(e.target.value)} />
              <datalist id="adm-client-list">
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
                const catItem = fromCatalogue ? byId.get(l.catalogueId!) : undefined;
                const listEuros = catItem ? catItem.unitCents / 100 : null;
                const maxDisc = catItem?.maxDiscountPercent ?? 0;
                const minEuros = listEuros != null ? Math.round(listEuros * (1 - maxDisc / 100) * 100) / 100 : null;
                const priceLocked = fromCatalogue && maxDisc <= 0;
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
                        <input
                          aria-label="Désignation"
                          placeholder="Désignation *"
                          required
                          maxLength={200}
                          value={l.label}
                          onChange={(e) => updateLine(l.key, { label: e.target.value })}
                        />
                        <select
                          className="adm-select"
                          aria-label="Type de prestation"
                          value={l.productType}
                          onChange={(e) => updateLine(l.key, { productType: e.target.value })}
                        >
                          {PRODUCT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {PRODUCT_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </span>
                    )}
                    <span className="com-qty">
                      <button type="button" aria-label="Diminuer" onClick={() => updateLine(l.key, { qty: String(Math.max(1, num(l.qty) - 1)) })}>
                        <Minus size={14} />
                      </button>
                      <input aria-label="Quantité" inputMode="decimal" value={l.qty} onChange={(e) => updateLine(l.key, { qty: e.target.value })} />
                      <button type="button" aria-label="Augmenter" onClick={() => updateLine(l.key, { qty: String(num(l.qty) + 1) })}>
                        <Plus size={14} />
                      </button>
                    </span>
                    <label className="com-price">
                      <input
                        aria-label="Prix unitaire HT (€)"
                        inputMode="decimal"
                        readOnly={priceLocked}
                        min={minEuros ?? undefined}
                        max={listEuros ?? undefined}
                        required
                        value={l.unitEuros}
                        onChange={(e) => updateLine(l.key, { unitEuros: e.target.value })}
                        onBlur={() => {
                          if (!fromCatalogue || listEuros == null || minEuros == null) return;
                          const p = num(l.unitEuros);
                          if (!Number.isFinite(p)) return;
                          const clamped = Math.min(listEuros, Math.max(minEuros, p));
                          if (clamped !== p) updateLine(l.key, { unitEuros: String(clamped) });
                        }}
                      />
                      <span>€</span>
                    </label>
                    <label className="com-fixed" title="Commission fixe (€)">
                      <input
                        aria-label="Commission fixe (€)"
                        inputMode="decimal"
                        placeholder="Fixe €"
                        value={l.fixedCommissionEuros ?? ""}
                        onChange={(e) => updateLine(l.key, { fixedCommissionEuros: e.target.value })}
                      />
                    </label>
                    <span className="com-rate">
                      <Lock size={12} aria-hidden="true" /> {String(l.fixedCommissionEuros ?? "").trim() ? "Fixe" : `${rates[type] ?? 10} %`}
                    </span>
                    <button
                      type="button"
                      className="adm-icon-btn sm com-danger"
                      aria-label="Retirer la ligne"
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                    >
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
          <Lock size={13} aria-hidden="true" /> Commission estimée pour le commercial : <strong>{euros(commissionCents)}</strong>
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
          <button type="button" className="adm-btn is-ghost" onClick={close} disabled={pending}>
            Annuler
          </button>
          <button type="submit" className="adm-btn" disabled={pending}>
            {pending ? "Création…" : kind === "devis" ? "Créer le devis" : "Créer la facture"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
