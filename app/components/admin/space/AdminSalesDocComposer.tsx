"use client";

import Link from "next/link";
import { Eye, FilePlus2, FileText, Lock, Mail, Minus, Pencil, PenLine, Plus, Receipt, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import {
  deleteAdminSalesDocument,
  emailAdminSalesDocument,
  getAdminSalesDocument,
  saveAdminSalesDocument,
  updateAdminSalesDocument,
} from "@/lib/admin/sales-doc-actions";
import type { SalesCatalogueItem } from "@/lib/commercial/catalogue";
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  VAT_RATE,
  normalizeProductType,
  type DocKind,
  type DocStatus,
  type ProductType,
} from "@/lib/commercial/commission-rules";
import type { DocInput, LineInput } from "@/lib/commercial/sales-doc-actions";
import type { SalesDoc } from "@/lib/commercial/sales-docs";
import { dashTextFor } from "./dashText";

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const ERRORS: Record<string, string> = {
  forbidden: "Accès refusé.",
  invalid: "Vérifiez le commercial, le client, les dates, les lignes et la remise commerciale.",
  notFound: "Document introuvable.",
  locked: "Ce document ne peut plus être modifié ou supprimé.",
  failed: "Enregistrement impossible. Réessayez.",
  draft: "Émettez d'abord le document avant de l'envoyer par e-mail.",
  cancelled: "Un document annulé ne peut pas être envoyé.",
  no_email: "Le client n'a pas d'adresse e-mail.",
  no_share: "Lien de partage indisponible.",
};

type EditLine = LineInput & { key: number };
let lineKey = 0;
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  catalogue: SalesCatalogueItem[];
  rates: Record<ProductType, number>;
  reps: { id: string; name: string; active: boolean }[];
  clients: { id: string; name: string; email: string; phone?: string }[];
  initialNew?: DocKind | null;
  labels: {
    newQuote: string;
    newInvoice: string;
    noReps: string;
  };
};

type ModalState = { mode: "new"; kind: DocKind } | { mode: "edit"; doc: SalesDoc; salespersonId: string };

/** Header actions + modal so admins can create devis / factures assigned to a sales rep. */
export function AdminSalesDocComposer({ catalogue, rates, reps, clients, initialNew = null, labels }: Props) {
  const activeReps = reps.filter((r) => r.active);
  const [modal, setModal] = useState<ModalState | null>(initialNew ? { mode: "new", kind: initialNew } : null);
  const [toast, toastNode] = useToast();
  const router = useRouter();

  if (!activeReps.length) {
    return <p className="adm-muted adm-small">{labels.noReps}</p>;
  }

  return (
    <>
      <div className="adm-pagehead-actions">
        <button type="button" className="adm-btn is-ghost" onClick={() => setModal({ mode: "new", kind: "devis" })}>
          <FileText size={15} aria-hidden="true" /> {labels.newQuote}
        </button>
        <button type="button" className="adm-btn" onClick={() => setModal({ mode: "new", kind: "facture" })}>
          <Receipt size={15} aria-hidden="true" /> {labels.newInvoice}
        </button>
      </div>
      {modal && (
        <AdminDocumentModal
          key={modal.mode === "edit" ? modal.doc.id : `new-${modal.kind}`}
          modal={modal}
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

/** Row actions for the devis & factures list: view, edit, delete draft. */
export function AdminDocRowActions({
  id,
  number,
  kind,
  status,
  commercialId,
  catalogue,
  rates,
  reps,
  clients,
  labels,
}: {
  id: string;
  number: string;
  kind: DocKind;
  status: string;
  commercialId: string | null;
  catalogue: SalesCatalogueItem[];
  rates: Record<ProductType, number>;
  reps: { id: string; name: string; active: boolean }[];
  clients: { id: string; name: string; email: string; phone?: string }[];
  labels: {
    edit: string;
    delete: string;
    deleted: string;
    view: string;
    sendEmail: string;
    emailed: string;
  };
}) {
  const activeReps = reps.filter((r) => r.active);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();
  const [lang] = useLang();
  const quotes = dashTextFor(lang).crm.quotes;
  const editable = status === "brouillon" || status === "en_attente";
  const acceptedQuote = kind === "devis" && status === "validee";
  const deletable = status === "brouillon" || acceptedQuote;
  const emailable = status !== "brouillon" && status !== "annulee";

  const openEdit = () => {
    start(async () => {
      const res = await getAdminSalesDocument(id);
      if (!res.success) {
        toast(ERRORS[res.error] ?? ERRORS.failed);
        return;
      }
      setModal({
        mode: "edit",
        doc: res.doc,
        salespersonId: commercialId ?? activeReps[0]?.id ?? "",
      });
    });
  };

  const remove = () => {
    const confirmText = acceptedQuote ? quotes.deleteAcceptedConfirm(number) : quotes.deleteConfirm(number);
    if (!window.confirm(confirmText)) return;
    start(async () => {
      const res = await deleteAdminSalesDocument(id);
      if (!res.success) {
        toast(ERRORS[res.error] ?? ERRORS.failed);
        return;
      }
      toast(acceptedQuote ? quotes.deletedAccepted : labels.deleted);
      router.refresh();
    });
  };

  const sendEmail = () => {
    start(async () => {
      const res = await emailAdminSalesDocument(id);
      if (!res.success) {
        toast(ERRORS[res.error] ?? ERRORS.failed);
        return;
      }
      toast(labels.emailed);
    });
  };

  return (
    <>
      <span className="adm-row-actions">
        <Link className="adm-icon-btn sm" href={`/admin/document?id=${id}`} title={labels.view} aria-label={`${labels.view} ${number}`}>
          <Eye size={15} />
        </Link>
        {editable && (
          <button type="button" className="adm-icon-btn sm" title={labels.edit} aria-label={`${labels.edit} ${number}`} disabled={pending} onClick={openEdit}>
            <Pencil size={15} />
          </button>
        )}
        {emailable && (
          <button type="button" className="adm-icon-btn sm" title={labels.sendEmail} aria-label={`${labels.sendEmail} ${number}`} disabled={pending} onClick={sendEmail}>
            <Mail size={15} />
          </button>
        )}
        {deletable && (
          <button type="button" className="adm-icon-btn sm com-danger" title={labels.delete} aria-label={`${labels.delete} ${number}`} disabled={pending} onClick={remove}>
            <Trash2 size={15} />
          </button>
        )}
      </span>
      {modal && (
        <AdminDocumentModal
          key={modal.mode === "edit" ? modal.doc.id : `new-${modal.kind}`}
          modal={modal}
          catalogue={catalogue}
          rates={rates}
          reps={activeReps.length ? activeReps : reps}
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
  modal,
  catalogue,
  rates,
  reps,
  clients,
  onClose,
  onSaved,
}: {
  modal: ModalState;
  catalogue: SalesCatalogueItem[];
  rates: Record<ProductType, number>;
  reps: { id: string; name: string }[];
  clients: { id: string; name: string; email: string; phone?: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = modal.mode === "edit" ? modal.doc : null;
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [kind, setKind] = useState<DocKind>(editing?.kind ?? (modal.mode === "new" ? modal.kind : "devis"));
  const [salespersonId, setSalespersonId] = useState(
    modal.mode === "edit" ? modal.salespersonId || reps[0]?.id || "" : reps[0]?.id ?? "",
  );
  const [form, setForm] = useState({
    clientName: editing?.clientName ?? "",
    clientEmail: editing?.clientEmail ?? "",
    clientSiret: editing?.clientSiret ?? "",
    clientAddress: editing?.clientAddress ?? "",
    issueDate: editing?.issueDate ?? today(),
    dueDate: editing?.dueDate ?? "",
    status: (editing?.status ?? "brouillon") as DocStatus,
    notes: editing?.notes ?? "",
  });
  const [lines, setLines] = useState<EditLine[]>(() =>
    (editing?.lines ?? []).map((l) => ({
      key: ++lineKey,
      catalogueId: l.catalogue_id,
      label: l.label,
      productType: normalizeProductType(l.product_type) ?? "digital",
      unitEuros: String(l.unit_cents / 100),
      qty: String(l.qty),
      fixedCommissionEuros: l.fixed_commission_cents != null ? String(l.fixed_commission_cents / 100) : "",
    })),
  );
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
      { key: ++lineKey, catalogueId: null, label: "", productType: "digital", unitEuros: "", qty: "1", fixedCommissionEuros: "" },
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
    setForm((f) => ({
      ...f,
      clientName: name,
      clientEmail: c?.email || f.clientEmail,
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!salespersonId) return setError("Choisissez le commercial propriétaire du document.");
    if (lines.length === 0) return setError("Ajoutez au moins une ligne (catalogue ou personnalisée).");
    const input: DocInput = { kind, ...form, lines: lines.map(({ key: _k, ...l }) => (void _k, l)) };
    start(async () => {
      const res = editing
        ? await updateAdminSalesDocument(editing.id, salespersonId, input)
        : await saveAdminSalesDocument(salespersonId, input);
      if (!res.success) return setError(ERRORS[res.error] ?? ERRORS.failed);
      onSaved(
        editing
          ? kind === "devis"
            ? "Devis modifié."
            : "Facture modifiée."
          : kind === "devis"
            ? "Devis créé."
            : "Facture créée.",
      );
      close();
    });
  };

  const grouped = PRODUCT_TYPES.map((t) => ({ t, items: catalogue.filter((i) => i.productType === t) })).filter((g) => g.items.length);

  return (
    <dialog ref={ref} className="adm-modal com-doc-modal" aria-labelledby="adm-doc-title" onClose={onClose}>
      <form className="adm-modal-card" onSubmit={submit}>
        <header>
          <div>
            <h2 id="adm-doc-title">{editing ? `Modifier ${editing.number}` : "Nouveau devis / facture"}</h2>
            <p className="adm-muted">Le document est attribué au commercial choisi (commission et suivi client).</p>
          </div>
          <button type="button" className="adm-icon-btn" onClick={close} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div className="com-kind-toggle" role="group" aria-label="Type de document">
          <button
            type="button"
            className={kind === "devis" ? "is-active" : undefined}
            aria-pressed={kind === "devis"}
            disabled={Boolean(editing)}
            onClick={() => setKind("devis")}
          >
            <FileText size={16} aria-hidden="true" /> Devis
          </button>
          <button
            type="button"
            className={kind === "facture" ? "is-active" : undefined}
            aria-pressed={kind === "facture"}
            disabled={Boolean(editing)}
            onClick={() => setKind("facture")}
          >
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
              <span>Entreprise *</span>
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
              <small className="adm-muted">Le client est enregistré sous le nom d&apos;entreprise (un même compte pour tous les e-mails).</small>
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
                      {i.cycle === "mensuel" ? " / mois" : i.cycle === "annuel" ? " / an" : ""}
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
                // Admin commercial discount: any remise 0–100 % (server allows down to 0 €).
                const minEuros = listEuros != null ? 0 : null;
                const price = num(l.unitEuros);
                const remisePct =
                  listEuros != null && listEuros > 0
                    ? Math.round(Math.max(0, Math.min(100, (1 - price / listEuros) * 100)) * 100) / 100
                    : 0;
                const applyRemise = (raw: string) => {
                  if (listEuros == null) return;
                  const rem = Math.min(100, Math.max(0, num(raw)));
                  const next = Math.round(listEuros * (1 - rem / 100) * 100) / 100;
                  updateLine(l.key, { unitEuros: String(next), fixedCommissionEuros: "" });
                };
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
                    <label className="com-price" title={fromCatalogue ? "Prix unitaire HT après remise commerciale" : undefined}>
                      <input
                        aria-label="Prix unitaire HT (€)"
                        inputMode="decimal"
                        min={minEuros ?? undefined}
                        max={listEuros ?? undefined}
                        required
                        value={l.unitEuros}
                        onChange={(e) => updateLine(l.key, { unitEuros: e.target.value, fixedCommissionEuros: "" })}
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
                    <label
                      className="com-fixed"
                      title={
                        fromCatalogue
                          ? "Remise commerciale (%) — ajuste le prix unitaire HT"
                          : "Remise disponible uniquement pour les lignes catalogue"
                      }
                    >
                      <input
                        aria-label="Remise commerciale (%)"
                        inputMode="decimal"
                        placeholder="Discount %"
                        disabled={!fromCatalogue}
                        readOnly={!fromCatalogue}
                        min={0}
                        max={100}
                        value={fromCatalogue && remisePct > 0 ? String(remisePct) : ""}
                        onChange={(e) => applyRemise(e.target.value)}
                        onBlur={(e) => {
                          if (!fromCatalogue) return;
                          const raw = e.target.value.trim();
                          if (raw === "") {
                            applyRemise("0");
                            return;
                          }
                          applyRemise(raw);
                        }}
                      />
                      {fromCatalogue && remisePct > 0 ? <span aria-hidden="true">%</span> : null}
                    </label>
                    <span className="com-rate" title="Taux de commission selon le type de produit">
                      <Lock size={12} aria-hidden="true" /> {rates[type] ?? 10} %
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
            {pending
              ? editing
                ? "Enregistrement…"
                : "Création…"
              : editing
                ? kind === "devis"
                  ? "Enregistrer le devis"
                  : "Enregistrer la facture"
                : kind === "devis"
                  ? "Créer le devis"
                  : "Créer la facture"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
