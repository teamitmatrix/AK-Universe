"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Power, Trash2, X } from "lucide-react";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import {
  addStaffMember,
  createCommercial,
  removeStaffMember,
  setStaffActive,
  updateCommercialIdentity,
  updateCommercialSettings,
} from "@/lib/admin/team-actions";
import type { StaffRole } from "@/lib/admin/team";
import { dashTextFor } from "./dashText";

/** "Ajouter un commercial / vidéaste". Commercial can invite + set name/phone/rate; vidéaste promotes by e-mail. */
export function AddStaffButton({ role, label }: { role: StaffRole; label: string }) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const m = t.manage;
  const dialog = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [target, setTarget] = useState("");
  const [rateAi, setRateAi] = useState("");
  const [rateMarketing, setRateMarketing] = useState("");
  const [rateDigital, setRateDigital] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const reset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setTarget("");
    setRateAi("");
    setRateMarketing("");
    setRateDigital("");
    setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res =
        role === "commercial"
          ? await createCommercial({
              email,
              firstName,
              lastName,
              phone,
              targetEuros: target,
              rateAi,
              rateMarketing,
              rateDigital,
            })
          : await addStaffMember(email, role);
      if (!res.success) return setError(t.errors[res.error] ?? t.errors.failed);
      dialog.current?.close();
      reset();
      toast(m.added);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="adm-btn" onClick={() => dialog.current?.showModal()}>
        <Plus size={16} aria-hidden="true" />
        {label}
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby={`adm-add-${role}`}>
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id={`adm-add-${role}`}>{m.addTitle(role === "commercial" ? m.roleCommercial : m.roleVideaste)}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label={m.cancel}>
              <X size={18} />
            </button>
          </header>
          <p className="adm-muted">{role === "commercial" ? m.addIntroCommercial : m.addIntro}</p>
          {role === "commercial" && (
            <div className="adm-form-row">
              <label className="adm-field">
                <span>{m.firstName}</span>
                <input required autoComplete="given-name" maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="adm-field">
                <span>{m.lastName}</span>
                <input required autoComplete="family-name" maxLength={80} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
            </div>
          )}
          <label className="adm-field">
            <span>{m.email}</span>
            <input type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          </label>
          {role === "commercial" && (
            <>
              <label className="adm-field">
                <span>{m.phone}</span>
                <input type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
              </label>
              <label className="adm-field">
                <span>{m.target}</span>
                <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="20000" />
              </label>
              <div className="adm-form-row">
                <label className="adm-field">
                  <span>{m.rateAi}</span>
                  <input inputMode="decimal" value={rateAi} onChange={(e) => setRateAi(e.target.value)} placeholder="12" />
                </label>
                <label className="adm-field">
                  <span>{m.rateMarketing}</span>
                  <input inputMode="decimal" value={rateMarketing} onChange={(e) => setRateMarketing(e.target.value)} placeholder="12" />
                </label>
                <label className="adm-field">
                  <span>{m.rateDigital}</span>
                  <input inputMode="decimal" value={rateDigital} onChange={(e) => setRateDigital(e.target.value)} placeholder="12" />
                </label>
              </div>
            </>
          )}
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => dialog.current?.close()}>
              {m.cancel}
            </button>
            <button type="submit" className="adm-btn" disabled={pending}>
              {pending ? m.adding : m.add}
            </button>
          </div>
        </form>
      </dialog>
      {toastNode}
    </>
  );
}

/** Header shortcuts on the staff detail page: jump to edit + remove from team. */
export function StaffDetailActions({
  id,
  name,
  role,
  listHref,
}: {
  id: string;
  name: string;
  role: StaffRole;
  listHref: string;
}) {
  const [lang] = useLang();
  const m = dashTextFor(lang).manage;

  return (
    <div className="adm-row-actions">
      <a href="#adm-staff-edit" className="adm-btn is-ghost sm">
        <Pencil size={14} aria-hidden="true" />
        {m.edit}
      </a>
      <StaffRemoveButton id={id} name={name} role={role} listHref={listHref} />
    </div>
  );
}

function StaffRemoveButton({
  id,
  name,
  role,
  listHref,
}: {
  id: string;
  name: string;
  role: StaffRole;
  listHref: string;
}) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const m = t.manage;
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const remove = () => {
    if (!window.confirm(m.deleteConfirm(name))) return;
    start(async () => {
      const res = await removeStaffMember(id);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(m.deleted);
      router.push(listHref);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="adm-btn is-danger sm" onClick={remove} disabled={pending} data-role={role}>
        <Trash2 size={14} aria-hidden="true" />
        {pending ? m.deleting : m.delete}
      </button>
      {toastNode}
    </>
  );
}

/** Sales-rep name (+ phone) fields on the commercial detail page. */
export function CommercialIdentityForm({
  id,
  firstName,
  lastName,
  phone: initialPhone = "",
  email,
}: {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;
}) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const m = t.manage;
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateCommercialIdentity(id, { firstName: first, lastName: last, phone });
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(m.saved);
      router.refresh();
    });
  };

  return (
    <section className="adm-card" id="adm-staff-edit" aria-labelledby="adm-identity-title">
      <header className="adm-card-head">
        <h2 id="adm-identity-title">{m.profile}</h2>
      </header>
      <form className="adm-form-row" onSubmit={save}>
        <label className="adm-field">
          <span>{m.firstName}</span>
          <input maxLength={80} value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
        </label>
        <label className="adm-field">
          <span>{m.lastName}</span>
          <input maxLength={80} value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
        </label>
        <label className="adm-field">
          <span>{m.email}</span>
          <input value={email} readOnly disabled />
        </label>
        <label className="adm-field">
          <span>{m.phone}</span>
          <input type="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </label>
        <button type="submit" className="adm-btn" disabled={pending}>
          {pending ? m.saving : m.save}
        </button>
      </form>
      {toastNode}
    </section>
  );
}

/** Detail page panel: sales target + IA/Marketing/Digital rates (commercial) and account activation (both teams). */
export function StaffSettings({
  id,
  name,
  role,
  active,
  targetCents,
  rateAi,
  rateMarketing,
  rateDigital,
  listHref,
  anchorEdit,
}: {
  id: string;
  name: string;
  role: StaffRole;
  active: boolean;
  targetCents?: number | null;
  rateAi?: number | null;
  rateMarketing?: number | null;
  rateDigital?: number | null;
  listHref: string;
  /** When true, this card is the #adm-staff-edit target (videographers: profile form is separate). */
  anchorEdit?: boolean;
}) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const m = t.manage;
  const [target, setTarget] = useState(targetCents != null ? String(targetCents / 100) : "");
  const [ai, setAi] = useState(rateAi != null ? String(rateAi) : "");
  const [marketing, setMarketing] = useState(rateMarketing != null ? String(rateMarketing) : "");
  const [digital, setDigital] = useState(rateDigital != null ? String(rateDigital) : "");
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateCommercialSettings(id, {
        targetEuros: target,
        rateAi: ai,
        rateMarketing: marketing,
        rateDigital: digital,
      });
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(m.saved);
      router.refresh();
    });
  };

  const toggleActive = () => {
    if (active && !window.confirm(m.deactivateConfirm(name))) return;
    start(async () => {
      const res = await setStaffActive(id, !active);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(active ? m.deactivated : m.reactivated);
      router.refresh();
    });
  };

  return (
    <section className="adm-card" id={anchorEdit ? "adm-staff-edit" : undefined} aria-labelledby="adm-settings-title">
      <header className="adm-card-head">
        <h2 id="adm-settings-title">{m.settings}</h2>
      </header>
      {role === "commercial" && (
        <form className="adm-form-row" onSubmit={save}>
          <label className="adm-field">
            <span>{m.target}</span>
            <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="20000" />
          </label>
          <label className="adm-field">
            <span>{m.rateAi}</span>
            <input inputMode="decimal" value={ai} onChange={(e) => setAi(e.target.value)} placeholder="12" />
          </label>
          <label className="adm-field">
            <span>{m.rateMarketing}</span>
            <input inputMode="decimal" value={marketing} onChange={(e) => setMarketing(e.target.value)} placeholder="12" />
          </label>
          <label className="adm-field">
            <span>{m.rateDigital}</span>
            <input inputMode="decimal" value={digital} onChange={(e) => setDigital(e.target.value)} placeholder="12" />
          </label>
          <button type="submit" className="adm-btn" disabled={pending}>
            {pending ? m.saving : m.save}
          </button>
        </form>
      )}
      <div className="adm-row-actions">
        <button type="button" className={`adm-btn ${active ? "is-danger" : "is-ghost"}`} onClick={toggleActive} disabled={pending}>
          <Power size={15} aria-hidden="true" />
          {active ? m.deactivate : m.reactivate}
        </button>
        <StaffRemoveButton id={id} name={name} role={role} listHref={listHref} />
      </div>
      {toastNode}
    </section>
  );
}

/** Compact roster / settings-table links to the staff detail page. */
export function StaffOpenLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="adm-btn is-ghost sm">
      <Pencil size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
