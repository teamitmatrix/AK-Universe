"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useLang } from "@/components/ui/LangSwitch";
import { SOURCES } from "@/lib/commercial/stages";
import { createAdminCustomer, createAdminProspect } from "@/lib/admin/crm-actions";
import type { DashText } from "./dashText";
import { toolsTextFor } from "./toolsText";

type Rep = { id: string; name: string; active: boolean };

function useOpenOnMount(open: boolean, dialog: React.RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open, dialog]);
}

/** Serializable subset — never pass dashText function fields (fromSite / assign) into this client component. */
export type CreateProspectLabels = Pick<
  DashText["crm"]["prospects"],
  "create" | "createTitle" | "createSubmit" | "creating" | "created" | "close" | "noReps" | "fields" | "sources" | "createErrors"
>;

export function CreateProspectButton({
  reps,
  autoOpen = false,
  labels,
}: {
  reps: Rep[];
  autoOpen?: boolean;
  labels: CreateProspectLabels;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [lang] = useLang();
  const errors = toolsTextFor(lang).errors;
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const activeReps = reps.filter((r) => r.active);
  const empty = () => ({
    salespersonId: activeReps[0]?.id ?? "",
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "",
    need: "",
    budgetEuros: "",
    notes: "",
  });
  const [form, setForm] = useState(empty);
  useOpenOnMount(autoOpen, dialog);

  const set = (k: keyof ReturnType<typeof empty>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createAdminProspect(form);
      if (!res.success) {
        setError(labels.createErrors[res.error] ?? errors[res.error as keyof typeof errors] ?? errors.failed);
        return;
      }
      dialog.current?.close();
      setForm(empty());
      toast(labels.created);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="adm-btn" onClick={() => dialog.current?.showModal()} disabled={!activeReps.length}>
        <Plus size={16} aria-hidden="true" />
        {labels.create}
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby="adm-create-prospect-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="adm-create-prospect-title">{labels.createTitle}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label={labels.close}>
              <X size={18} />
            </button>
          </header>
          {!activeReps.length ? (
            <p className="adm-note">{labels.noReps}</p>
          ) : (
            <div className="adm-form-grid">
              <label className="adm-field is-wide">
                <span>{labels.fields.commercial}</span>
                <select required value={form.salespersonId} onChange={set("salespersonId")}>
                  {activeReps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span>{labels.fields.name}</span>
                <input required maxLength={120} value={form.name} onChange={set("name")} />
              </label>
              <label className="adm-field">
                <span>{labels.fields.company}</span>
                <input maxLength={160} value={form.company} onChange={set("company")} />
              </label>
              <label className="adm-field">
                <span>{labels.fields.email}</span>
                <input type="email" maxLength={254} value={form.email} onChange={set("email")} />
              </label>
              <label className="adm-field">
                <span>{labels.fields.phone}</span>
                <input maxLength={40} value={form.phone} onChange={set("phone")} />
              </label>
              <label className="adm-field">
                <span>{labels.fields.source}</span>
                <select value={form.source} onChange={set("source")}>
                  <option value="">—</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {labels.sources?.[s] ?? s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span>{labels.fields.budget}</span>
                <input inputMode="decimal" value={form.budgetEuros} onChange={set("budgetEuros")} placeholder="€ HT" />
              </label>
              <label className="adm-field is-wide">
                <span>{labels.fields.need}</span>
                <input maxLength={500} value={form.need} onChange={set("need")} />
              </label>
              <label className="adm-field is-wide">
                <span>{labels.fields.notes}</span>
                <textarea rows={3} maxLength={4000} value={form.notes} onChange={set("notes")} />
              </label>
            </div>
          )}
          {error ? (
            <p className="adm-error" role="alert">
              {error}
            </p>
          ) : null}
          <footer className="adm-form-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => dialog.current?.close()}>
              {labels.close}
            </button>
            <button type="submit" className="adm-btn" disabled={pending || !activeReps.length}>
              {pending ? labels.creating : labels.createSubmit}
            </button>
          </footer>
        </form>
      </dialog>
      {toastNode}
    </>
  );
}

export function CreateCustomerButton({
  reps,
  autoOpen = false,
  labels,
}: {
  reps: Rep[];
  autoOpen?: boolean;
  labels: DashText["crm"]["clients"];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [lang] = useLang();
  const errors = toolsTextFor(lang).errors;
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const activeReps = reps.filter((r) => r.active);
  const empty = () => ({
    salespersonId: activeReps[0]?.id ?? "",
    name: "",
    company: "",
    email: "",
    phone: "",
  });
  const [form, setForm] = useState(empty);
  useOpenOnMount(autoOpen, dialog);

  const set = (k: keyof ReturnType<typeof empty>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createAdminCustomer(form);
      if (!res.success) {
        setError(labels.createErrors[res.error] ?? errors[res.error as keyof typeof errors] ?? errors.failed);
        return;
      }
      dialog.current?.close();
      setForm(empty());
      toast(labels.created);
      router.push(`/admin/client-detail?id=${res.id}`);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="adm-btn" onClick={() => dialog.current?.showModal()} disabled={!activeReps.length}>
        <Plus size={16} aria-hidden="true" />
        {labels.create}
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby="adm-create-customer-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="adm-create-customer-title">{labels.createTitle}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label={labels.close}>
              <X size={18} />
            </button>
          </header>
          {!activeReps.length ? (
            <p className="adm-note">{labels.noReps}</p>
          ) : (
            <div className="adm-form-grid">
              <label className="adm-field is-wide">
                <span>{labels.fields.commercial}</span>
                <select required value={form.salespersonId} onChange={set("salespersonId")}>
                  {activeReps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span>{labels.fields.name}</span>
                <input required maxLength={160} value={form.name} onChange={set("name")} />
              </label>
              <label className="adm-field">
                <span>{labels.fields.company}</span>
                <input maxLength={160} value={form.company} onChange={set("company")} />
              </label>
              <label className="adm-field">
                <span>{labels.fields.email}</span>
                <input type="email" required maxLength={254} value={form.email} onChange={set("email")} />
              </label>
              <label className="adm-field">
                <span>{labels.fields.phone}</span>
                <input maxLength={40} value={form.phone} onChange={set("phone")} />
              </label>
            </div>
          )}
          {error ? (
            <p className="adm-error" role="alert">
              {error}
            </p>
          ) : null}
          <footer className="adm-form-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => dialog.current?.close()}>
              {labels.close}
            </button>
            <button type="submit" className="adm-btn" disabled={pending || !activeReps.length}>
              {pending ? labels.creating : labels.createSubmit}
            </button>
          </footer>
        </form>
      </dialog>
      {toastNode}
    </>
  );
}
