"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Building, FileText, LoaderCircle, Mail, Pencil, Printer, Receipt } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { saveBillingProfile, type BillingInput } from "@/lib/client/billing-actions";
import type { BillingProfile } from "@/lib/client/billing";
import { ChangeReview, Modal } from "./PlanManager";

/* Interactive parts of "Facturation". Amounts in the cycle review come from the server (previewPlanChange). */

/** "Passer à la facturation annuelle / mensuelle" in the Montant card. */
export function CycleSwitch({ cycle, discountLabel, disabledReason }: { cycle: "mensuel" | "annuel"; discountLabel: string | null; disabledReason: string | null }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const target = cycle === "annuel" ? "mensuel" : "annuel";
  const label = target === "annuel" ? `Passer à l'annuel${discountLabel ? ` (${discountLabel})` : ""}` : "Passer au mensuel";
  return (
    <>
      <p className="cs-kpi-sub">
        {cycle === "annuel" ? "Facturation annuelle" : "Facturation mensuelle"} ·{" "}
        <button type="button" className="cs-link-btn" disabled={Boolean(disabledReason)} title={disabledReason ?? undefined} onClick={() => setOpen(true)}>
          {label}
        </button>
      </p>
      {open && (
        <Modal title="Changer de cycle de facturation" onClose={close}>
          <ChangeReview
            target={{ cycle: target, label: target === "annuel" ? "Facturation mensuelle → annuelle" : "Facturation annuelle → mensuelle" }}
            onDone={(message) => {
              setOpen(false);
              toast(message);
              router.refresh();
            }}
          />
        </Modal>
      )}
      {toastNode}
    </>
  );
}

const FIELD_ERRORS: Partial<Record<keyof BillingInput, string>> = {
  fullName: "Indiquez le nom de facturation.",
  addressLine1: "Indiquez l'adresse.",
  postalCode: "Indiquez le code postal.",
  city: "Indiquez la ville.",
  country: "Choisissez un pays.",
  email: "Indiquez une adresse e-mail valide.",
  taxId: "Numéro de TVA invalide (lettres et chiffres, ex. FR12345678901).",
};
const ERRORS: Record<string, string> = {
  forbidden: "Votre session a expiré. Reconnectez-vous pour continuer.",
  notReady: "La modification des informations de facturation sera disponible très prochainement.",
  tax_invalid: "Ce numéro de TVA n'est pas reconnu pour le pays choisi.",
  failed: "Une erreur est survenue. Vos informations n'ont pas été modifiées. Réessayez dans un instant.",
};

/**
 * Billing details form (modal), shared by "Facturation" and "Mon compte": one record (billing_profiles), saved and
 * mirrored to Stripe by saveBillingProfile — the two pages can never disagree.
 */
export function BillingFormModal({
  profile,
  countries,
  onClose,
  onSaved,
}: {
  profile: BillingProfile;
  countries: { code: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<BillingProfile>(profile);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [saving, startSave] = useTransition();
  const set = (k: keyof BillingProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      const res = await saveBillingProfile(form).catch(() => ({ success: false as const, error: "failed" as const, field: undefined }));
      if (res.success) {
        onSaved();
        return;
      }
      const message = res.error === "invalid" && res.field ? (FIELD_ERRORS[res.field] ?? ERRORS.failed) : (ERRORS[res.error] ?? ERRORS.failed);
      setError({ message, field: res.field });
    });
  }

  const field = (k: keyof BillingProfile, label: string, opts: { type?: string; required?: boolean; autoComplete?: string; placeholder?: string } = {}) => (
    <label className="cs-field">
      <span>
        {label}
        {opts.required && <em aria-hidden="true"> *</em>}
      </span>
      <input
        type={opts.type ?? "text"}
        value={form[k]}
        onChange={set(k)}
        required={opts.required}
        autoComplete={opts.autoComplete}
        placeholder={opts.placeholder}
        aria-invalid={error?.field === k || undefined}
      />
    </label>
  );

  return (
    <Modal title="Informations de facturation" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <p className="cs-card-sub">Ces informations figurent sur vos prochaines factures. Les factures déjà émises ne sont pas modifiées.</p>
        <div className="cs-form-grid">
          {field("fullName", "Nom de facturation", { required: true, autoComplete: "name" })}
          {field("company", "Raison sociale", { autoComplete: "organization" })}
          {field("addressLine1", "Adresse", { required: true, autoComplete: "address-line1" })}
          {field("addressLine2", "Complément d'adresse", { autoComplete: "address-line2" })}
          {field("postalCode", "Code postal", { required: true, autoComplete: "postal-code" })}
          {field("city", "Ville", { required: true, autoComplete: "address-level2" })}
          <label className="cs-field">
            <span>
              Pays<em aria-hidden="true"> *</em>
            </span>
            <select value={form.country} onChange={set("country")} required autoComplete="country" aria-invalid={error?.field === "country" || undefined}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {field("taxId", "N° de TVA intracommunautaire", { placeholder: "FR12345678901" })}
          <div className="cs-field-wide">{field("email", "E-mail de facturation", { type: "email", required: true, autoComplete: "email" })}</div>
        </div>
        {error && (
          <p className="cs-form-error" role="alert">
            {error.message}
          </p>
        )}
        <div className="cs-modal-actions">
          <button type="button" className="cs-btn-outline" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button type="submit" className="cs-act is-primary cs-act-fit" disabled={saving}>
            {saving && <LoaderCircle className="cs-spin" size={18} aria-hidden="true" />}
            <span>{saving ? "Enregistrement…" : "Enregistrer"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export const BILLING_NOT_READY = ERRORS.notReady;

/** "Informations de facturation" card of the Billing page + edit form. */
export function BillingInfoCard({
  profile,
  countries,
  countryName,
  ready,
}: {
  profile: BillingProfile;
  countries: { code: string; label: string }[];
  countryName: string;
  ready: boolean;
}) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const address = [profile.addressLine1, profile.addressLine2].filter(Boolean).join(", ");
  const cityLine = [profile.postalCode, profile.city].filter(Boolean).join(" ");
  return (
    <section className="cs-card" aria-labelledby="cs-binfo-title">
      <h2 id="cs-binfo-title" className="cs-card-title is-sm">
        Informations de facturation
      </h2>
      <ul className="cs-info">
        <li>
          <Building size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>
            <strong>{profile.company || profile.fullName}</strong>
            {profile.company && <small>{profile.fullName}</small>}
          </span>
        </li>
        <li>
          <FileText size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>
            {address || <em className="cs-muted">Adresse à compléter</em>}
            {(cityLine || countryName) && (
              <>
                <br />
                {[cityLine, countryName].filter(Boolean).join(", ")}
              </>
            )}
          </span>
        </li>
        <li>
          <Mail size={20} strokeWidth={1.7} aria-hidden="true" />
          <span className="cs-break">{profile.email}</span>
        </li>
        {profile.taxId && (
          <li>
            <Receipt size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>TVA : {profile.taxId}</span>
          </li>
        )}
        <li>
          <button type="button" className="cs-info-btn" onClick={() => setOpen(true)} disabled={!ready} title={ready ? undefined : ERRORS.notReady}>
            <Pencil size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>Modifier mes informations</span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </li>
      </ul>
      {open && (
        <BillingFormModal
          profile={profile}
          countries={countries}
          onClose={close}
          onSaved={() => {
            setOpen(false);
            toast("Vos informations de facturation ont été enregistrées.");
            router.refresh();
          }}
        />
      )}
      {toastNode}
    </section>
  );
}

/** "Télécharger en PDF / Imprimer" on the contract page: the browser's own print-to-PDF. */
export function PrintButton() {
  return (
    <button type="button" className="cs-act is-primary cs-act-fit" onClick={() => window.print()}>
      <Printer size={18} aria-hidden="true" />
      <span>Télécharger en PDF / Imprimer</span>
    </button>
  );
}
