"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Building,
  ClipboardList,
  CreditCard,
  Download,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Pencil,
  ShieldCheck,
  Trash,
  User,
} from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { initialsOf } from "@/components/admin/space/initials";
import { useToast } from "@/components/ui/Toast";
import { PASSWORD_RULES, isStrongPassword } from "@/lib/auth/password";
import {
  cancelEmailChange,
  changePassword,
  confirmEmailChange,
  deleteMyAccount,
  saveAccountProfile,
  saveNotificationPrefs,
  sendPasswordSetupLink,
  startEmailChange,
  type ProfileInput,
} from "@/lib/client/account-actions";
import type { AccountProfile } from "@/lib/client/account";
import type { BillingProfile } from "@/lib/client/billing";
import type { NotificationPrefs } from "@/lib/client/notification-prefs";
import { BILLING_NOT_READY, BillingFormModal } from "./BillingClient";
import { Modal } from "./PlanManager";
import { Swoosh } from "./Swoosh";

/* Interactive parts of "Mon compte". Every action is re-validated and authorized on the server. */

type Country = { code: string; label: string };

const ERRORS: Record<string, string> = {
  forbidden: "Votre session a expiré. Reconnectez-vous pour continuer.",
  failed: "Une erreur est survenue. Rien n'a été modifié. Réessayez dans un instant.",
  notReady: "Cette fonctionnalité sera disponible très prochainement.",
  invalid: "Vérifiez les informations saisies.",
  password_invalid: "Mot de passe actuel incorrect.",
  reauth_required: "Par sécurité, reconnectez-vous puis recommencez (connexion de moins de 15 minutes requise).",
  weak: "Le nouveau mot de passe ne respecte pas les règles de sécurité.",
  same: "Le nouveau mot de passe doit être différent de l'actuel.",
  no_password: "Votre compte n'a pas de mot de passe.",
  taken: "Cette adresse e-mail est déjà utilisée par un autre compte.",
  rate_limited: "Un code vient d'être envoyé. Patientez une minute avant d'en demander un nouveau.",
  expired: "Le code a expiré. Recommencez la demande de changement d'adresse.",
  code_invalid: "Code incorrect. Vérifiez et réessayez.",
  too_many: "Trop d'essais. Recommencez la demande de changement d'adresse.",
  confirm: "Saisissez SUPPRIMER pour confirmer.",
  org_members: "Votre organisation compte d'autres membres : contactez le support pour la transférer avant de supprimer votre compte.",
  already_enabled: "La double authentification est déjà activée.",
};
const errorText = (code: string | undefined) => ERRORS[code ?? "failed"] ?? ERRORS.failed;

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  invalid,
  inputMode,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  invalid?: boolean;
  inputMode?: "numeric" | "email" | "tel";
  wide?: boolean;
}) {
  return (
    <label className={wide ? "cs-field cs-field-wide" : "cs-field"}>
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} autoComplete={autoComplete} aria-invalid={invalid || undefined} inputMode={inputMode} />
    </label>
  );
}

function SubmitRow({ busy, label, onCancel, danger }: { busy: boolean; label: string; onCancel: () => void; danger?: boolean }) {
  return (
    <div className="cs-modal-actions">
      <button type="button" className="cs-btn-outline" onClick={onCancel} disabled={busy}>
        Annuler
      </button>
      <button type="submit" className={danger ? "cs-btn-danger" : "cs-act is-primary cs-act-fit"} disabled={busy}>
        {busy && <LoaderCircle className="cs-spin" size={18} aria-hidden="true" />}
        <span>{busy ? "Traitement…" : label}</span>
      </button>
    </div>
  );
}

/* ================= Sign-in step: authenticator code ================= */

export function MfaChallengeForm({ target }: { target: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await fetch("/api/account/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "challenge", code: code.trim() }) });
        const data = (await res.json()) as { success: boolean; code?: string };
        if (data.success) {
          router.replace(target);
          router.refresh();
        } else setError(errorText(data.code));
      } catch {
        setError(ERRORS.failed);
      }
    });
  }
  return (
    <section className="cs-card cs-mfa-card" aria-labelledby="cs-mfa-title">
      <p className="cs-brand-doc notranslate">
        AK<span aria-hidden="true" />
        Universe
      </p>
      <ShieldCheck size={34} strokeWidth={1.6} className="cs-mfa-icon" aria-hidden="true" />
      <h1 id="cs-mfa-title" className="cs-card-title">
        Vérification en deux étapes
      </h1>
      <p className="cs-card-sub">Saisissez le code à 6 chiffres affiché par votre application d&apos;authentification.</p>
      <form onSubmit={submit} className="cs-form">
        <Field label="Code de vérification" value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} required autoComplete="one-time-code" inputMode="numeric" invalid={Boolean(error)} />
        {error && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="cs-act is-primary cs-mfa-submit" disabled={busy || code.length !== 6}>
          {busy && <LoaderCircle className="cs-spin" size={18} aria-hidden="true" />}
          <span>{busy ? "Vérification…" : "Valider"}</span>
        </button>
      </form>
      <form action="/auth/signout" method="post" className="cs-mfa-out">
        <input type="hidden" name="redirectTo" value="/connexion" />
        <button type="submit" className="cs-link-btn">
          Se déconnecter
        </button>
      </form>
    </section>
  );
}

/* ================= Profile: hero + personal information ================= */

export function ProfileBlocks({
  email,
  profile,
  countries,
  countryName,
  ready,
  hasPassword,
  pendingEmail,
}: {
  email: string;
  profile: AccountProfile;
  countries: Country[];
  countryName: string;
  ready: boolean;
  hasPassword: boolean;
  pendingEmail: string | null;
}) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [modal, setModal] = useState<"profile" | "email" | "code" | null>(null);
  const close = useCallback(() => setModal(null), []);
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || email;
  const address = [[profile.addressLine1, profile.addressLine2].filter(Boolean).join(", "), [profile.postalCode, profile.city].filter(Boolean).join(" "), profile.addressLine1 ? countryName : ""]
    .filter(Boolean)
    .join(", ");
  const [undoing, startUndo] = useTransition();

  const finished = (message: string) => {
    setModal(null);
    toast(message);
    router.refresh();
  };

  return (
    <>
      <section className="cs-account-hero" aria-label="Mon profil">
        <Swoosh className="cs-kpi-swoosh" id="cs-acc" />
        <span className="cs-account-avatar" aria-hidden="true">
          {initialsOf(name) || "?"}
        </span>
        <div className="cs-account-id">
          <h2 className="notranslate">{name}</h2>
          <p className="cs-break">{email}</p>
        </div>
        <button type="button" className="cs-btn-ghost-light" onClick={() => setModal("profile")}>
          <Pencil size={18} aria-hidden="true" /> Modifier mon profil
        </button>
      </section>

      <section className="cs-card" aria-labelledby="cs-pinfo-title">
        <h2 id="cs-pinfo-title" className="cs-card-title is-sm">
          Informations personnelles
        </h2>
        <p className="cs-card-sub">Vos informations de contact et de société.</p>
        <div className="cs-rows-edit">
          <dl className="cs-dl">
            <div>
              <dt>
                <User size={20} strokeWidth={1.7} aria-hidden="true" /> Nom complet
              </dt>
              <dd className="notranslate">{name}</dd>
            </div>
            <div>
              <dt>
                <Mail size={20} strokeWidth={1.7} aria-hidden="true" /> Adresse email
              </dt>
              <dd className="cs-break">{email}</dd>
            </div>
            <div>
              <dt>
                <Building size={20} strokeWidth={1.7} aria-hidden="true" /> Société
              </dt>
              <dd>{profile.company || <span className="cs-muted">—</span>}</dd>
            </div>
            <div>
              <dt>
                <MapPin size={20} strokeWidth={1.7} aria-hidden="true" /> Adresse
              </dt>
              <dd>{address || <span className="cs-muted">—</span>}</dd>
            </div>
          </dl>
          <button type="button" className="cs-btn-outline cs-edit-btn" onClick={() => setModal("profile")}>
            <Pencil size={17} aria-hidden="true" /> Modifier
          </button>
        </div>
        {pendingEmail && (
          <div className="cs-notice" role="status">
            <p>
              Changement d&apos;adresse en attente : <strong className="cs-break">{pendingEmail}</strong>. Saisissez le code reçu à cette adresse.
            </p>
            <p>
              <button type="button" className="cs-link-btn" onClick={() => setModal("code")}>
                Saisir le code
              </button>{" "}
              ·{" "}
              <button
                type="button"
                className="cs-link-btn"
                disabled={undoing}
                onClick={() =>
                  startUndo(async () => {
                    await cancelEmailChange().catch(() => undefined);
                    router.refresh();
                  })
                }
              >
                Annuler la demande
              </button>
            </p>
          </div>
        )}
      </section>

      {modal === "profile" && (
        <ProfileModal profile={profile} email={email} countries={countries} ready={ready} onClose={close} onEmail={() => setModal("email")} onSaved={() => finished("Vos informations ont été enregistrées.")} />
      )}
      {modal === "email" && (
        <EmailModal
          hasPassword={hasPassword}
          onClose={close}
          onSent={(mode, address) => {
            if (mode === "code") {
              toast(`Un code a été envoyé à ${address}.`);
              setModal("code");
              router.refresh();
            } else finished(`Un e-mail de confirmation a été envoyé à ${address}. Votre adresse changera après confirmation.`);
          }}
        />
      )}
      {modal === "code" && <EmailCodeModal onClose={close} onDone={(address) => finished(`Votre adresse e-mail est désormais ${address}.`)} />}
      {toastNode}
    </>
  );
}

function ProfileModal({
  profile,
  email,
  countries,
  ready,
  onClose,
  onEmail,
  onSaved,
}: {
  profile: AccountProfile;
  email: string;
  countries: Country[];
  ready: boolean;
  onClose: () => void;
  onEmail: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AccountProfile>(profile);
  const [error, setError] = useState<{ message: string; field?: keyof ProfileInput } | null>(null);
  const [busy, start] = useTransition();
  const set = (k: keyof AccountProfile) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const FIELD: Partial<Record<keyof ProfileInput, string>> = {
    firstName: "Indiquez votre prénom.",
    lastName: "Indiquez votre nom.",
    phone: "Numéro de téléphone invalide.",
    country: "Choisissez un pays.",
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveAccountProfile(form).catch(() => ({ success: false as const, error: "failed" as const, field: undefined }));
      if (res.success) onSaved();
      else setError({ message: res.error === "invalid" && res.field ? (FIELD[res.field] ?? ERRORS.invalid) : errorText(res.error), field: res.field });
    });
  }

  return (
    <Modal title="Mes informations" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <div className="cs-form-grid">
          <Field label="Prénom" value={form.firstName} onChange={set("firstName")} required autoComplete="given-name" invalid={error?.field === "firstName"} />
          <Field label="Nom" value={form.lastName} onChange={set("lastName")} required autoComplete="family-name" invalid={error?.field === "lastName"} />
          <div className="cs-field cs-field-wide">
            <span>Adresse email</span>
            <div className="cs-inline-field">
              <span className="cs-break">{email}</span>
              <button type="button" className="cs-link-btn" onClick={onEmail}>
                Changer d&apos;adresse e-mail
              </button>
            </div>
          </div>
          <Field label="Téléphone" value={form.phone} onChange={set("phone")} type="tel" autoComplete="tel" inputMode="tel" invalid={error?.field === "phone"} />
          <Field label="Société" value={form.company} onChange={set("company")} autoComplete="organization" />
          <Field label="Adresse" value={form.addressLine1} onChange={set("addressLine1")} autoComplete="address-line1" />
          <Field label="Complément d'adresse" value={form.addressLine2} onChange={set("addressLine2")} autoComplete="address-line2" />
          <Field label="Code postal" value={form.postalCode} onChange={set("postalCode")} autoComplete="postal-code" />
          <Field label="Ville" value={form.city} onChange={set("city")} autoComplete="address-level2" />
          <label className="cs-field cs-field-wide">
            <span>Pays</span>
            <select value={form.country} onChange={(e) => set("country")(e.target.value)} autoComplete="country" aria-invalid={error?.field === "country" || undefined}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!ready && <p className="cs-hint">{ERRORS.notReady}</p>}
        {error && (
          <p className="cs-form-error" role="alert">
            {error.message}
          </p>
        )}
        <SubmitRow busy={busy} label="Enregistrer" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function EmailModal({ hasPassword, onClose, onSent }: { hasPassword: boolean; onClose: () => void; onSent: (mode: "code" | "provider", email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await startEmailChange({ email, password }).catch(() => ({ success: false as const, error: "failed" as const }));
      if (res.success) onSent(res.mode, email.trim().toLowerCase());
      else setError(res.error === "invalid" ? "Saisissez une adresse e-mail valide." : res.error === "same" ? "C'est déjà votre adresse actuelle." : errorText(res.error));
    });
  }
  return (
    <Modal title="Changer d'adresse e-mail" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <p className="cs-card-sub">Un code de confirmation sera envoyé à la nouvelle adresse. Votre adresse actuelle reste active tant que le code n&apos;est pas saisi.</p>
        <div className="cs-form-grid">
          <Field label="Nouvelle adresse e-mail" value={email} onChange={setEmail} type="email" required autoComplete="email" inputMode="email" wide />
          {hasPassword && <Field label="Mot de passe actuel" value={password} onChange={setPassword} type="password" required autoComplete="current-password" wide />}
        </div>
        {error && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
        <SubmitRow busy={busy} label="Envoyer le code" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function EmailCodeModal({ onClose, onDone }: { onClose: () => void; onDone: (email: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await confirmEmailChange({ code }).catch(() => ({ success: false as const, error: "failed" as const }));
      if (res.success) onDone(res.email);
      else setError(errorText(res.error));
    });
  }
  return (
    <Modal title="Confirmer la nouvelle adresse" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <p className="cs-card-sub">Saisissez le code à 6 chiffres envoyé à votre nouvelle adresse e-mail (valable 15 minutes).</p>
        <Field label="Code de confirmation" value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} required autoComplete="one-time-code" inputMode="numeric" invalid={Boolean(error)} />
        {error && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
        <SubmitRow busy={busy} label="Confirmer" onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ================= Billing details (shared record with "Facturation") ================= */

export function AccountBillingCard({ billing, countries, countryName, ready }: { billing: BillingProfile; countries: Country[]; countryName: string; ready: boolean }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const address = [[billing.addressLine1, billing.addressLine2].filter(Boolean).join(", "), [billing.postalCode, billing.city].filter(Boolean).join(" "), billing.addressLine1 ? countryName : ""]
    .filter(Boolean)
    .join(", ");
  return (
    <section className="cs-card" aria-labelledby="cs-abill-title">
      <h2 id="cs-abill-title" className="cs-card-title is-sm">
        Informations de facturation
      </h2>
      <p className="cs-card-sub">Ces informations apparaissent sur vos factures.</p>
      <div className="cs-rows-edit">
        <dl className="cs-dl is-wide-label">
          <div>
            <dt>
              <Building size={20} strokeWidth={1.7} aria-hidden="true" /> Raison sociale
            </dt>
            <dd>{billing.company || billing.fullName}</dd>
          </div>
          <div>
            <dt>
              <ClipboardList size={20} strokeWidth={1.7} aria-hidden="true" /> Numéro de TVA
            </dt>
            <dd className="notranslate">{billing.taxId || <span className="cs-muted">—</span>}</dd>
          </div>
          <div>
            <dt>
              <CreditCard size={20} strokeWidth={1.7} aria-hidden="true" /> Adresse de facturation
            </dt>
            <dd>{address || <span className="cs-muted">À compléter</span>}</dd>
          </div>
        </dl>
        <button type="button" className="cs-btn-outline cs-edit-btn" onClick={() => setOpen(true)} disabled={!ready} title={ready ? undefined : BILLING_NOT_READY}>
          <Pencil size={17} aria-hidden="true" /> Modifier
        </button>
      </div>
      {open && (
        <BillingFormModal
          profile={billing}
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

/* ================= Security: password + 2FA ================= */

export function SecurityCard({ hasPassword, mfaEnabled }: { hasPassword: boolean; mfaEnabled: boolean }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [modal, setModal] = useState<"password" | "mfa-on" | "mfa-off" | null>(null);
  const close = useCallback(() => setModal(null), []);
  const finished = (message: string) => {
    setModal(null);
    toast(message);
    router.refresh();
  };
  return (
    <section className="cs-card" aria-labelledby="cs-sec-title">
      <h2 id="cs-sec-title" className="cs-card-title is-sm">
        Sécurité
      </h2>
      <p className="cs-card-sub">Sécurisez l&apos;accès à votre espace client.</p>
      <ul className="cs-setting-list">
        <li>
          <button type="button" className="cs-setting-btn" onClick={() => setModal("password")}>
            <Lock size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>{hasPassword ? "Modifier mon mot de passe" : "Définir un mot de passe"}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </li>
        <li>
          <ShieldCheck size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>
            Authentification à deux facteurs (2FA)
            <small>{mfaEnabled ? "Activée — application d'authentification" : "Désactivée"}</small>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={mfaEnabled}
            aria-label={`Authentification à deux facteurs : ${mfaEnabled ? "activée" : "désactivée"}`}
            className={mfaEnabled ? "cs-switch cs-switch-lg is-on" : "cs-switch cs-switch-lg"}
            onClick={() => setModal(mfaEnabled ? "mfa-off" : "mfa-on")}
          >
            <span aria-hidden="true" />
          </button>
        </li>
      </ul>
      {modal === "password" &&
        (hasPassword ? <PasswordModal onClose={close} onDone={() => finished("Votre mot de passe a été modifié.")} /> : <PasswordSetupModal onClose={close} onDone={() => finished("Un lien pour définir votre mot de passe vous a été envoyé par e-mail.")} />)}
      {modal === "mfa-on" && <MfaEnrollModal onClose={close} onDone={() => finished("La double authentification est activée.")} />}
      {modal === "mfa-off" && <MfaDisableModal onClose={close} onDone={() => finished("La double authentification est désactivée.")} />}
      {toastNode}
    </section>
  );
}

const RULE_LABELS: Record<keyof typeof PASSWORD_RULES, string> = {
  len: "8 caractères minimum",
  upper: "Une majuscule",
  lower: "Une minuscule",
  digit: "Un chiffre",
};

function PasswordModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isStrongPassword(next)) return setError(ERRORS.weak);
    if (next !== again) return setError("Les deux nouveaux mots de passe ne correspondent pas.");
    start(async () => {
      const res = await changePassword({ current, next }).catch(() => ({ success: false as const, error: "failed" as const }));
      if (res.success) onDone();
      else setError(errorText(res.error));
    });
  }
  return (
    <Modal title="Modifier mon mot de passe" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <div className="cs-form-grid">
          <Field label="Mot de passe actuel" value={current} onChange={setCurrent} type="password" required autoComplete="current-password" wide />
          <Field label="Nouveau mot de passe" value={next} onChange={setNext} type="password" required autoComplete="new-password" />
          <Field label="Confirmer le nouveau mot de passe" value={again} onChange={setAgain} type="password" required autoComplete="new-password" />
        </div>
        <ul className="cs-rules" aria-label="Règles du mot de passe">
          {(Object.keys(PASSWORD_RULES) as (keyof typeof PASSWORD_RULES)[]).map((k) => (
            <li key={k} className={PASSWORD_RULES[k](next) ? "is-ok" : undefined}>
              {RULE_LABELS[k]}
            </li>
          ))}
        </ul>
        {error && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
        <SubmitRow busy={busy} label="Modifier" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function PasswordSetupModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await sendPasswordSetupLink().catch(() => ({ success: false as const, error: "failed" as const }));
      if (res.success) onDone();
      else setError(errorText(res.error));
    });
  }
  return (
    <Modal title="Définir un mot de passe" onClose={onClose}>
      <form className="cs-form" onSubmit={submit}>
        <p className="cs-card-sub">Vous vous connectez avec Google ou Apple. Pour pouvoir aussi vous connecter par e-mail, nous vous envoyons un lien sécurisé pour choisir un mot de passe.</p>
        {error && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
        <SubmitRow busy={busy} label="Recevoir le lien" onCancel={onClose} />
      </form>
    </Modal>
  );
}

async function mfaCall(body: object) {
  try {
    const res = await fetch("/api/account/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json()) as { success: boolean; code?: string; factorId?: string; qr?: string; secret?: string };
  } catch {
    return { success: false, code: "failed" };
  }
}

function MfaEnrollModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const started = useRef(false);

  function begin() {
    if (started.current) return;
    started.current = true;
    start(async () => {
      const res = await mfaCall({ action: "enroll" });
      if (res.success && res.factorId && res.qr && res.secret) setSetup({ factorId: res.factorId, qr: res.qr, secret: res.secret });
      else {
        started.current = false;
        setError(errorText(res.code));
      }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setError(null);
    start(async () => {
      const res = await mfaCall({ action: "activate", factorId: setup.factorId, code });
      if (res.success) onDone();
      else setError(errorText(res.code));
    });
  }

  return (
    <Modal title="Activer la double authentification" onClose={onClose}>
      {!setup ? (
        <div className="cs-form">
          <p className="cs-card-sub">
            À chaque connexion, en plus de votre mot de passe, un code à 6 chiffres généré par une application d&apos;authentification (Google
            Authenticator, Microsoft Authenticator, 1Password…) vous sera demandé.
          </p>
          {error && (
            <p className="cs-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="cs-modal-actions">
            <button type="button" className="cs-btn-outline" onClick={onClose} disabled={busy}>
              Annuler
            </button>
            <button type="button" className="cs-act is-primary cs-act-fit" onClick={begin} disabled={busy}>
              {busy && <LoaderCircle className="cs-spin" size={18} aria-hidden="true" />}
              <span>Commencer</span>
            </button>
          </div>
        </div>
      ) : (
        <form className="cs-form" onSubmit={submit} noValidate>
          <ol className="cs-steps">
            <li>Scannez ce QR code avec votre application d&apos;authentification.</li>
          </ol>
          {/* QR code generated by the authentication provider (data URL). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cs-qr" src={setup.qr} alt="QR code à scanner avec votre application d'authentification" width={180} height={180} />
          <p className="cs-hint">
            Impossible de scanner ? Saisissez cette clé : <code className="cs-secret notranslate">{setup.secret}</code>
          </p>
          <ol className="cs-steps" start={2}>
            <li>Saisissez le code à 6 chiffres affiché par l&apos;application.</li>
          </ol>
          <Field label="Code de vérification" value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} required autoComplete="one-time-code" inputMode="numeric" invalid={Boolean(error)} />
          {error && (
            <p className="cs-form-error" role="alert">
              {error}
            </p>
          )}
          <SubmitRow busy={busy} label="Activer" onCancel={onClose} />
        </form>
      )}
    </Modal>
  );
}

function MfaDisableModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await mfaCall({ action: "disable", code });
      if (res.success) onDone();
      else setError(errorText(res.code));
    });
  }
  return (
    <Modal title="Désactiver la double authentification" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <p className="cs-card-sub">Pour confirmer, saisissez le code actuellement affiché par votre application d&apos;authentification. Votre compte sera alors protégé par votre seul mot de passe.</p>
        <Field label="Code de vérification" value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} required autoComplete="one-time-code" inputMode="numeric" invalid={Boolean(error)} />
        {error && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
        <SubmitRow busy={busy} label="Désactiver" onCancel={onClose} danger />
      </form>
    </Modal>
  );
}

/* ================= Notifications ================= */

const NOTIF_ROWS: { key: keyof NotificationPrefs; label: string; icon: typeof Mail }[] = [
  { key: "billing", label: "Factures et paiements", icon: Mail },
  { key: "news", label: "Actualités et nouveautés", icon: Megaphone },
  { key: "subscription", label: "Alertes sur mon abonnement", icon: Bell },
];

export function NotificationsCard({ prefs, ready }: { prefs: NotificationPrefs; ready: boolean }) {
  const [toast, toastNode] = useToast();
  const [value, setValue] = useState(prefs);
  const [saving, setSaving] = useState<keyof NotificationPrefs | null>(null);

  async function toggle(key: keyof NotificationPrefs) {
    const previous = value;
    const next = { ...value, [key]: !value[key] };
    setValue(next);
    setSaving(key);
    const res = await saveNotificationPrefs(next).catch(() => ({ success: false as const, error: "failed" as const }));
    setSaving(null);
    if (res.success) toast("Préférences enregistrées.");
    else {
      setValue(previous);
      toast(errorText(res.error));
    }
  }

  return (
    <section className="cs-card" aria-labelledby="cs-notif-title">
      <h2 id="cs-notif-title" className="cs-card-title is-sm">
        Notifications
      </h2>
      <p className="cs-card-sub">Choisissez les communications que vous souhaitez recevoir.</p>
      <ul className="cs-setting-list">
        {NOTIF_ROWS.map(({ key, label, icon: Icon }) => (
          <li key={key}>
            <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={value[key]}
              aria-label={`${label} : ${value[key] ? "activé" : "désactivé"}`}
              className={value[key] ? "cs-switch cs-switch-lg is-on" : "cs-switch cs-switch-lg"}
              disabled={!ready || saving !== null}
              onClick={() => void toggle(key)}
            >
              <span aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {!ready && <p className="cs-hint">{ERRORS.notReady}</p>}
      {toastNode}
    </section>
  );
}

/* ================= Other actions: export + deletion ================= */

export function OtherActionsCard({ hasPassword, hasSubscription }: { hasPassword: boolean; hasSubscription: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <section className="cs-card" aria-labelledby="cs-other-title">
      <h2 id="cs-other-title" className="cs-card-title is-sm">
        Autres actions
      </h2>
      <div className="cs-actions">
        <a href="/client/dashboard/mon-compte/export" className="cs-act" download>
          <Download className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>Exporter mes données</span>
          <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
        </a>
        <button type="button" className="cs-act is-danger" onClick={() => setOpen(true)}>
          <Trash className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>Supprimer mon compte</span>
          <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
        </button>
      </div>
      {open && <DeleteModal hasPassword={hasPassword} hasSubscription={hasSubscription} onClose={close} />}
    </section>
  );
}

function DeleteModal({ hasPassword, hasSubscription, onClose }: { hasPassword: boolean; hasSubscription: boolean; onClose: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const signout = useRef<HTMLFormElement>(null);
  const ready = confirm.trim().toUpperCase() === "SUPPRIMER" && (!hasPassword || password.length > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    start(async () => {
      const res = await deleteMyAccount({ confirm, password }).catch(() => ({ success: false as const, error: "failed" as const }));
      // The account no longer exists: end the session in this browser and leave the client space.
      if (res.success) signout.current?.requestSubmit();
      else setError(errorText(res.error));
    });
  }

  return (
    <Modal title="Supprimer mon compte" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <p className="cs-card-sub">Cette action est définitive. Lisez attentivement ce qui va se passer :</p>
        <ul className="cs-consequences">
          {hasSubscription && <li>Votre abonnement est résilié immédiatement : vos agents IA cessent de fonctionner, et la période en cours n&apos;est pas remboursée.</li>}
          <li>Vos informations personnelles, préférences et accès à l&apos;espace client sont supprimés.</li>
          <li>Vos factures sont conservées par notre prestataire de paiement pendant la durée légale (obligation comptable), sans accès depuis ce site.</li>
          <li>Pensez à exporter vos données avant de continuer si vous souhaitez les conserver.</li>
        </ul>
        <div className="cs-form-grid">
          <Field label="Saisissez SUPPRIMER pour confirmer" value={confirm} onChange={setConfirm} required wide autoComplete="off" />
          {hasPassword && <Field label="Mot de passe actuel" value={password} onChange={setPassword} type="password" required autoComplete="current-password" wide />}
        </div>
        {error && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="cs-modal-actions">
          <button type="button" className="cs-btn-outline" onClick={onClose} disabled={busy}>
            Conserver mon compte
          </button>
          <button type="submit" className="cs-btn-danger" disabled={busy || !ready}>
            {busy ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </form>
      <form ref={signout} action="/auth/signout" method="post" hidden>
        <input type="hidden" name="redirectTo" value="/?compte=supprime" />
      </form>
    </Modal>
  );
}
