"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, X } from "lucide-react";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { addStaffMember, createCommercial, setStaffActive, updateCommercialProfile, updateCommercialSettings } from "@/lib/admin/team-actions";
import type { StaffRole } from "@/lib/admin/team";
import { dashTextFor } from "./dashText";

/** "Ajouter un commercial / vidéaste". Commercial collects name/phone/rate; vidéaste still promotes by e-mail only. */
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
  const [rate, setRate] = useState("");
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
    setRate("");
    setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res =
        role === "commercial"
          ? await createCommercial({ email, firstName, lastName, phone, targetEuros: target, ratePercent: rate })
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
              <div className="adm-form-row">
                <label className="adm-field">
                  <span>{m.target}</span>
                  <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="20000" />
                </label>
                <label className="adm-field">
                  <span>{m.rate}</span>
                  <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="12" />
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

/** Name + phone editor on the commercial detail page. */
export function CommercialProfileForm({
  id,
  firstName,
  lastName,
  phone,
  email,
}: {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const m = t.manage;
  const [form, setForm] = useState({ firstName, lastName, phone });
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateCommercialProfile(id, form);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(m.saved);
      router.refresh();
    });
  };

  return (
    <section className="adm-card" aria-labelledby="adm-com-profile">
      <header className="adm-card-head">
        <h2 id="adm-com-profile">{m.profile}</h2>
      </header>
      <form className="adm-form-row" onSubmit={save}>
        <label className="adm-field">
          <span>{m.firstName}</span>
          <input maxLength={80} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" />
        </label>
        <label className="adm-field">
          <span>{m.lastName}</span>
          <input maxLength={80} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" />
        </label>
        <label className="adm-field">
          <span>{m.email}</span>
          <input value={email} readOnly disabled />
        </label>
        <label className="adm-field">
          <span>{m.phone}</span>
          <input type="tel" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        </label>
        <button type="submit" className="adm-btn" disabled={pending}>
          {pending ? m.saving : m.save}
        </button>
      </form>
      {toastNode}
    </section>
  );
}

/** Detail page panel: sales target + commission rate (commercial) and account activation (both teams). */
export function StaffSettings({
  id,
  name,
  role,
  active,
  targetCents,
  rate,
}: {
  id: string;
  name: string;
  role: StaffRole;
  active: boolean;
  targetCents?: number | null;
  rate?: number | null;
}) {
  const [lang] = useLang();
  const t = dashTextFor(lang);
  const m = t.manage;
  const [target, setTarget] = useState(targetCents != null ? String(targetCents / 100) : "");
  const [pct, setPct] = useState(rate != null ? String(rate) : "");
  const [pending, start] = useTransition();
  const [toast, toastNode] = useToast();
  const router = useRouter();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await updateCommercialSettings(id, { targetEuros: target, ratePercent: pct });
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
    <section className="adm-card" aria-labelledby="adm-settings-title">
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
            <span>{m.rate}</span>
            <input inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="12" />
          </label>
          <button type="submit" className="adm-btn" disabled={pending}>
            {pending ? m.saving : m.save}
          </button>
        </form>
      )}
      <div>
        <button type="button" className={`adm-btn ${active ? "is-danger" : "is-ghost"}`} onClick={toggleActive} disabled={pending}>
          <Power size={15} aria-hidden="true" />
          {active ? m.deactivate : m.reactivate}
        </button>
      </div>
      {toastNode}
    </section>
  );
}
