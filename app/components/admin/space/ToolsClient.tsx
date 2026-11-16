"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ExternalLink, Eye, Plus, Power, RotateCcw, Search, Trash2, Upload, X } from "lucide-react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { saveCatalogue } from "@/lib/admin/catalogue-actions";
import { saveCommissionRates } from "@/lib/admin/rates-actions";
import { PRODUCT_TYPES } from "@/lib/commercial/commission-rules";
import { PERSON_NOTIFICATION_IDS, TEAM_NOTIFICATION_IDS, type TeamNotifications } from "@/lib/notification-ids";
import { createPromotion, setPromotionActive, type NewPromotion } from "@/lib/admin/promotions-actions";
import { changeMyPassword, saveCompany, saveNotifications, updateMyProfile } from "@/lib/admin/settings-actions";
import { createTask, deleteTask, setTaskDone } from "@/lib/admin/tasks-actions";
import { toolsTextFor } from "./toolsText";

const useT = () => {
  const [lang] = useLang();
  return { t: toolsTextFor(lang), locale: localeOf(lang) };
};

// =========================================================
// "+ Créer" (header, every admin page) and the task modal
// =========================================================

export type TaskOptions = {
  assignees: { id: string; name: string; role: "commercial" | "videaste" }[];
  projects: { id: string; label: string }[];
};
const TASK_TYPES = ["appel", "rdv", "relance", "reunion", "tournage", "montage", "livraison", "tache"] as const;

export function CreateMenu({ options }: { options: TaskOptions | null }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const modal = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="adm-create" ref={ref}>
      <button type="button" className="adm-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus size={16} aria-hidden="true" />
        {t.create.button}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="adm-menu" role="menu" aria-label={t.create.menu}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              modal.current?.showModal();
            }}
          >
            {t.create.task}
          </button>
          <Link role="menuitem" href="/admin/promotions?nouveau=1" onClick={() => setOpen(false)}>
            {t.create.promotion}
          </Link>
          <Link role="menuitem" href="/admin/parametres?onglet=equipe" onClick={() => setOpen(false)}>
            {t.create.member}
          </Link>
        </div>
      )}
      <TaskModal dialogRef={modal} options={options} />
    </div>
  );
}

/** The one task-assignment modal: used by the header menu and the agenda page. */
export function TaskModal({
  dialogRef,
  options,
  presetAssignee = "",
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  options: TaskOptions | null;
  presetAssignee?: string;
}) {
  const { t } = useT();
  const m = t.agenda.modal;
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const tomorrow = () => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
  };
  const empty = () => ({ assignedTo: presetAssignee, title: "", type: "tache" as (typeof TASK_TYPES)[number], dueAt: tomorrow(), projectId: "", notes: "" });
  const [form, setForm] = useState(empty);
  const set = (k: keyof ReturnType<typeof empty>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createTask({
        assignedTo: form.assignedTo,
        title: form.title,
        type: form.type,
        // datetime-local is the admin's local time: send an absolute instant.
        dueAt: new Date(form.dueAt).toISOString(),
        projectId: form.projectId || null,
        notes: form.notes,
      });
      if (!res.success) return setError(t.errors[res.error] ?? t.errors.failed);
      dialogRef.current?.close();
      setForm(empty());
      toast(m.created);
      router.refresh();
    });
  };

  const commerciaux = options?.assignees.filter((a) => a.role === "commercial") ?? [];
  const videastes = options?.assignees.filter((a) => a.role === "videaste") ?? [];

  return (
    <>
      <dialog ref={dialogRef} className="adm-modal" aria-labelledby="adm-task-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="adm-task-title">{m.title}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialogRef.current?.close()} aria-label={t.common.close}>
              <X size={18} />
            </button>
          </header>
          {!options ? (
            <p className="adm-note">{t.agenda.tasksMissing}</p>
          ) : !options.assignees.length ? (
            <p className="adm-note">{m.noStaff}</p>
          ) : (
            <>
              <p className="adm-muted">{m.intro}</p>
              <label className="adm-field">
                <span>{m.assignee}</span>
                <select id="task-assignee" name="assignedTo" className="adm-select" required value={form.assignedTo} onChange={set("assignedTo")}>
                  <option value="">{m.choose}</option>
                  {commerciaux.length > 0 && (
                    <optgroup label={m.commercial}>
                      {commerciaux.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {videastes.length > 0 && (
                    <optgroup label={m.videaste}>
                      {videastes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <label className="adm-field">
                <span>{m.taskTitle}</span>
                <input id="task-title" name="title" required maxLength={160} value={form.title} onChange={set("title")} />
              </label>
              <div className="adm-form-grid">
                <label className="adm-field">
                  <span>{m.type}</span>
                  <select id="task-type" name="type" className="adm-select" value={form.type} onChange={set("type")}>
                    {TASK_TYPES.map((k) => (
                      <option key={k} value={k}>
                        {t.agenda.kinds[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adm-field">
                  <span>{m.due}</span>
                  <input id="task-due" name="dueAt" type="datetime-local" required value={form.dueAt} onChange={set("dueAt")} />
                </label>
              </div>
              <label className="adm-field">
                <span>{m.project}</span>
                <select id="task-project" name="projectId" className="adm-select" value={form.projectId} onChange={set("projectId")}>
                  <option value="">{m.none}</option>
                  {options.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span>{m.notes}</span>
                <textarea id="task-notes" name="notes" rows={3} maxLength={2000} value={form.notes} onChange={set("notes")} />
              </label>
            </>
          )}
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => dialogRef.current?.close()}>
              {t.common.cancel}
            </button>
            {options && options.assignees.length > 0 && (
              <button type="submit" className="adm-btn" disabled={pending}>
                {pending ? m.creating : m.create}
              </button>
            )}
          </div>
        </form>
      </dialog>
      {toastNode}
    </>
  );
}

export function NewTaskButton({ options, presetAssignee, label, ghost }: { options: TaskOptions | null; presetAssignee?: string; label?: string; ghost?: boolean }) {
  const { t } = useT();
  const modal = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={`adm-btn${ghost ? " is-ghost" : ""}`} onClick={() => modal.current?.showModal()}>
        <Plus size={16} aria-hidden="true" />
        {label ?? t.create.task}
      </button>
      <TaskModal dialogRef={modal} options={options} presetAssignee={presetAssignee} />
    </>
  );
}

/** Done / reopen / delete on a task row (admin agenda) — or done / reopen only (staff space). */
export function TaskActions({ id, title, done, canDelete = true }: { id: string; title: string; done: boolean; canDelete?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ success: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return toast(t.errors[res.error ?? "failed"] ?? t.errors.failed);
      router.refresh();
    });
  return (
    <span className="adm-row-actions">
      <button type="button" className={`adm-btn sm ${done ? "is-ghost" : ""}`} disabled={pending} onClick={() => run(() => setTaskDone(id, !done))}>
        {done ? <RotateCcw size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
        {done ? t.agenda.reopen : t.agenda.markDone}
      </button>
      {canDelete && (
        <button
          type="button"
          className="adm-icon-btn sm"
          disabled={pending}
          aria-label={t.agenda.remove}
          title={t.agenda.remove}
          onClick={() => window.confirm(t.agenda.removeConfirm(title)) && run(() => deleteTask(id))}
        >
          <Trash2 size={14} />
        </button>
      )}
      {toastNode}
    </span>
  );
}

// =========================================================
// Catalogue
// =========================================================

type CatalogueRow = {
  id: string;
  category: string;
  name: string;
  detail: string;
  href?: string;
  fields: { key: string; label: string; value: number; default: number; unit: string }[];
};

export function CatalogueEditor({ rows }: { rows: CatalogueRow[] }) {
  const { t, locale } = useT();
  const c = t.catalogue;
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const original = useMemo(() => Object.fromEntries(rows.flatMap((r) => r.fields.map((f) => [f.key, f.value]))), [rows]);
  const changed = Object.entries(values).filter(([k, v]) => v.trim() !== "" && Number(v.replace(",", ".")) !== original[k]);

  // Warn before leaving with unsaved prices.
  useEffect(() => {
    if (!changed.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed.length]);

  const fmt = (v: number, unit: string) =>
    unit === "pct" ? `${v.toLocaleString(locale)} %` : `${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.units[unit]}`;
  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => (!category || r.category === category) && (!q || r.name.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q)));

  const save = () =>
    start(async () => {
      const payload = Object.fromEntries(changed.map(([k, v]) => [k, Number(v.replace(",", "."))]));
      const res = await saveCatalogue(payload);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      setValues({});
      toast(c.saved);
      router.refresh();
    });

  return (
    <>
      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.common.search} aria-label={t.common.search} />
        </label>
        <select className="adm-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={c.categories[""]}>
          {Object.entries(c.categories).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="adm-empty">{c.empty}</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-catalogue">
            <thead>
              <tr>
                <th scope="col">{c.cols.product}</th>
                <th scope="col">{c.cols.category}</th>
                <th scope="col">{c.cols.price}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td data-label={c.cols.product}>
                    <span className="adm-stack">
                      <strong>
                        {r.name}
                        {r.href && (
                          <a href={r.href} target="_blank" rel="noopener noreferrer" className="adm-inline-link" aria-label={c.view} title={c.view}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </strong>
                      <span className="adm-person-mail">{r.detail}</span>
                    </span>
                  </td>
                  <td data-label={c.cols.category}>
                    <span className="adm-badge is-info">{c.categories[r.category]}</span>
                  </td>
                  <td data-label={c.cols.price}>
                    <span className="adm-price-fields">
                      {r.fields.map((f) => {
                        const v = values[f.key] ?? String(f.value);
                        const dirty = values[f.key] !== undefined && Number(v.replace(",", ".")) !== f.value;
                        const isDefault = f.value === f.default;
                        return (
                          <label key={f.key} className={`adm-price${dirty ? " is-dirty" : ""}`}>
                            {r.fields.length > 1 && <small>{c.labels[f.label]}</small>}
                            <span className="adm-price-input">
                              <input
                                inputMode="decimal"
                                value={v}
                                onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                                aria-label={`${r.name} — ${c.labels[f.label]}`}
                              />
                              <em>{c.units[f.unit]}</em>
                            </span>
                            {!isDefault && !dirty && (
                              <button
                                type="button"
                                className="adm-mini-link"
                                title={c.reset}
                                onClick={() => setValues((s) => ({ ...s, [f.key]: String(f.default) }))}
                              >
                                {c.default(fmt(f.default, f.unit))}
                              </button>
                            )}
                          </label>
                        );
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={`adm-savebar${changed.length ? " is-on" : ""}`} aria-live="polite">
        <span>{changed.length ? c.changes(changed.length) : ""}</span>
        <button type="button" className="adm-btn is-ghost" onClick={() => setValues({})} disabled={!changed.length || pending}>
          {c.discard}
        </button>
        <button type="button" className="adm-btn" onClick={save} disabled={!changed.length || pending}>
          {pending ? t.common.saving : c.save}
        </button>
      </div>
      {toastNode}
    </>
  );
}

// =========================================================
// Promotions
// =========================================================

export function NewPromotionButton({ openOnLoad }: { openOnLoad?: boolean }) {
  const { t } = useT();
  const p = t.promotions;
  const f = p.form;
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const empty = (): NewPromotion => ({ name: "", code: "", kind: "percent", value: 10, target: "tous", duration: "once", startsOn: null, endsOn: null, maxRedemptions: null });
  const [form, setForm] = useState<NewPromotion>(empty);

  useEffect(() => {
    if (openOnLoad) dialog.current?.showModal();
  }, [openOnLoad]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await createPromotion(form);
      if (!res.success) return setError(t.errors[res.error] ?? t.errors.failed);
      dialog.current?.close();
      setForm(empty());
      toast(p.created);
      router.replace("/admin/promotions");
      router.refresh();
    });
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <button type="button" className="adm-btn" onClick={() => dialog.current?.showModal()}>
        <Plus size={16} aria-hidden="true" />
        {p.new}
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby="adm-promo-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="adm-promo-title">{p.new}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label={t.common.close}>
              <X size={18} />
            </button>
          </header>
          <p className="adm-muted adm-small">{p.scope}</p>
          <div className="adm-form-grid">
            <label className="adm-field">
              <span>{f.name}</span>
              <input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Black Friday" />
            </label>
            <label className="adm-field">
              <span>{f.code}</span>
              <input
                required
                pattern="[A-Za-z0-9-]{3,40}"
                title={f.codeHint}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })}
                placeholder="BLACKFRIDAY"
              />
            </label>
            <label className="adm-field">
              <span>{f.kind}</span>
              <select className="adm-select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as NewPromotion["kind"] })}>
                <option value="percent">{f.percent}</option>
                <option value="amount">{f.amount}</option>
              </select>
            </label>
            <label className="adm-field">
              <span>{f.value}</span>
              <input
                required
                type="number"
                min={0.01}
                max={form.kind === "percent" ? 100 : 100000}
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </label>
            <label className="adm-field">
              <span>{f.target}</span>
              <select className="adm-select" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as NewPromotion["target"] })}>
                {Object.entries(p.targets).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>{f.duration}</span>
              <select className="adm-select" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value as NewPromotion["duration"] })}>
                <option value="once">{p.durations.once}</option>
                <option value="forever">{p.durations.forever}</option>
              </select>
            </label>
            <label className="adm-field">
              <span>{f.start}</span>
              <input type="date" min={today} value={form.startsOn ?? ""} onChange={(e) => setForm({ ...form, startsOn: e.target.value || null })} />
            </label>
            <label className="adm-field">
              <span>{f.end}</span>
              <input type="date" min={form.startsOn ?? today} value={form.endsOn ?? ""} onChange={(e) => setForm({ ...form, endsOn: e.target.value || null })} />
            </label>
            <label className="adm-field">
              <span>{f.max}</span>
              <input
                type="number"
                min={1}
                step={1}
                value={form.maxRedemptions ?? ""}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
          </div>
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => dialog.current?.close()}>
              {t.common.cancel}
            </button>
            <button type="submit" className="adm-btn" disabled={pending}>
              {pending ? f.creating : f.create}
            </button>
          </div>
        </form>
      </dialog>
      {toastNode}
    </>
  );
}

export function PromotionToggle({ id, active }: { id: string; active: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  return (
    <>
      <button
        type="button"
        className={`adm-btn sm ${active ? "is-danger" : "is-ghost"}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setPromotionActive(id, !active);
            if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
            toast(active ? t.promotions.disabled : t.promotions.enabled);
            router.refresh();
          })
        }
      >
        <Power size={14} aria-hidden="true" />
        {active ? t.promotions.disable : t.promotions.enable}
      </button>
      {toastNode}
    </>
  );
}

// =========================================================
// Documents (uploads go straight to the private bucket; RLS = admins only)
// =========================================================

const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.mov,.m4v,.webm,.mp3,.wav,.m4a,.zip";
const MAX_BYTES = 50 * 1024 * 1024;
const safeName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-120) || "fichier";

export function UploadButton({
  mode,
  categories,
  projects,
}: {
  mode: "library" | "project";
  categories?: { value: string; label: string }[];
  projects?: { id: string; label: string }[];
}) {
  const { t } = useT();
  const d = t.documents;
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [folder, setFolder] = useState(mode === "library" ? (categories?.[0]?.value ?? "brochures") : "");
  const [file, setFile] = useState<File | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file || !folder) return;
    if (file.size > MAX_BYTES) return setError(d.tooBig);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPT.split(",").includes(`.${ext}`)) return setError(d.badType);
    start(async () => {
      const path = `${mode === "library" ? `library/${folder}` : `projects/${folder}`}/${safeName(file.name)}`;
      const { error: upErr } = await createClient().storage.from("documents").upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) return setError(t.errors.failed);
      dialog.current?.close();
      setFile(null);
      toast(d.uploaded);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className={mode === "library" ? "adm-btn" : "adm-btn is-ghost sm"} onClick={() => dialog.current?.showModal()}>
        <Upload size={15} aria-hidden="true" />
        {mode === "library" ? d.add : d.addFile}
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby={`adm-up-${mode}`}>
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id={`adm-up-${mode}`}>{mode === "library" ? d.add : d.addFile}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label={t.common.close}>
              <X size={18} />
            </button>
          </header>
          <label className="adm-field">
            <span>{mode === "library" ? d.category : d.project}</span>
            <select className="adm-select" required value={folder} onChange={(e) => setFolder(e.target.value)}>
              {mode === "project" && <option value="">—</option>}
              {(mode === "library" ? (categories ?? []) : (projects ?? []).map((p) => ({ value: p.id, label: p.label }))).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>{d.file}</span>
            <input type="file" required accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => dialog.current?.close()}>
              {t.common.cancel}
            </button>
            <button type="submit" className="adm-btn" disabled={pending || !file || !folder}>
              {pending ? d.uploading : d.upload}
            </button>
          </div>
        </form>
      </dialog>
      {toastNode}
    </>
  );
}

/** Open (short-lived signed link) / delete a stored file. */
export function FileActions({ path, name, canDelete = true }: { path: string; name: string; canDelete?: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const open = () =>
    start(async () => {
      const { data, error } = await createClient().storage.from("documents").createSignedUrl(path, 120);
      if (error || !data) return toast(t.errors.failed);
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    });
  const remove = () => {
    if (!window.confirm(t.documents.removeConfirm(name))) return;
    start(async () => {
      const { error } = await createClient().storage.from("documents").remove([path]);
      if (error) return toast(t.errors.failed);
      toast(t.documents.removed);
      router.refresh();
    });
  };
  return (
    <span className="adm-row-actions">
      <button type="button" className="adm-icon-btn sm" onClick={open} disabled={pending} aria-label={`${t.documents.open} ${name}`} title={t.documents.open}>
        <Eye size={14} />
      </button>
      {canDelete && (
        <button type="button" className="adm-icon-btn sm" onClick={remove} disabled={pending} aria-label={`${t.documents.remove} ${name}`} title={t.documents.remove}>
          <Trash2 size={14} />
        </button>
      )}
      {toastNode}
    </span>
  );
}

/** Library category chips (client-side filter of the grid). */
export function LibraryGrid({
  files,
  categories,
}: {
  files: { path: string; name: string; size: number; updatedAt: string; category: string }[];
  categories: Record<string, string>;
}) {
  const { t, locale } = useT();
  const [cat, setCat] = useState("");
  const visible = files.filter((f) => !cat || f.category === cat);
  const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);
  const ext = (n: string) => n.split(".").pop()?.toUpperCase() ?? "";
  return (
    <>
      <div className="adm-chips" role="tablist">
        {Object.entries(categories).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={cat === k} className={cat === k ? "is-active" : undefined} onClick={() => setCat(k)}>
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="adm-empty">{t.documents.emptyLibrary}</p>
      ) : (
        <ul className="adm-files">
          {visible.map((f) => (
            <li key={f.path} className="adm-file">
              <span className="adm-file-ext" aria-hidden="true">
                {ext(f.name)}
              </span>
              <strong title={f.name}>{f.name}</strong>
              <small>
                {categories[f.category]} · {ext(f.name)} · {size(f.size)}
              </small>
              <small>{f.updatedAt ? t.documents.updated(new Date(f.updatedAt).toLocaleDateString(locale)) : ""}</small>
              <FileActions path={f.path} name={f.name} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// =========================================================
// Paramètres
// =========================================================

export function ProfileForm({ firstName, lastName, phone: initialPhone }: { firstName: string; lastName: string; phone: string }) {
  const { t } = useT();
  const p = t.parametres.profil;
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [phone, setPhone] = useState(initialPhone);
  return (
    <form
      className="adm-form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateMyProfile({ firstName: first, lastName: last, phone });
          if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
          toast(t.common.saved);
          router.refresh();
        });
      }}
    >
      <label className="adm-field">
        <span>{p.first}</span>
        <input value={first} maxLength={80} autoComplete="given-name" onChange={(e) => setFirst(e.target.value)} />
      </label>
      <label className="adm-field">
        <span>{p.last}</span>
        <input value={last} maxLength={80} autoComplete="family-name" onChange={(e) => setLast(e.target.value)} />
      </label>
      <label className="adm-field">
        <span>{p.phone}</span>
        <input type="tel" value={phone} maxLength={40} autoComplete="tel" onChange={(e) => setPhone(e.target.value)} />
      </label>
      <div className="adm-form-actions">
        <button type="submit" className="adm-btn" disabled={pending}>
          <Check size={15} aria-hidden="true" />
          {pending ? t.common.saving : t.common.save}
        </button>
      </div>
      {toastNode}
    </form>
  );
}

export function PasswordForm() {
  const { t } = useT();
  const p = t.parametres.profil.password;
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  return (
    <form
      className="adm-form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== confirm) return toast(p.mismatch);
        start(async () => {
          const res = await changeMyPassword({ current, next });
          if (!res.success) {
            const { error } = res;
            return toast(error === "wrongCurrent" || error === "weak" || error === "same" ? p[error] : (t.errors[error] ?? t.errors.failed));
          }
          setCurrent("");
          setNext("");
          setConfirm("");
          toast(p.done);
        });
      }}
    >
      <label className="adm-field is-wide">
        <span>{p.current}</span>
        <input type="password" required value={current} autoComplete="current-password" onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="adm-field">
        <span>{p.next}</span>
        <input type="password" required minLength={8} maxLength={72} value={next} autoComplete="new-password" onChange={(e) => setNext(e.target.value)} />
      </label>
      <label className="adm-field">
        <span>{p.confirm}</span>
        <input type="password" required minLength={8} maxLength={72} value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <p className="adm-muted adm-small is-wide">{p.rules}</p>
      <div className="adm-form-actions">
        <button type="submit" className="adm-btn" disabled={pending}>
          <Check size={15} aria-hidden="true" />
          {pending ? t.common.saving : p.submit}
        </button>
      </div>
      {toastNode}
    </form>
  );
}

export function CompanyForm({ values, defaults }: { values: Record<string, string>; defaults: Record<string, string> }) {
  const { t } = useT();
  const e = t.parametres.entreprise;
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(values);
  const [bad, setBad] = useState("");
  const long = new Set(["legalForm", "address", "publicationDirector", "mediator"]);
  return (
    <form
      className="adm-form-grid"
      onSubmit={(ev) => {
        ev.preventDefault();
        setBad("");
        start(async () => {
          const res = await saveCompany(form);
          if (!res.success) {
            if ("field" in res && res.field) {
              setBad(res.field);
              return toast(e.invalidField(e.fields[res.field] ?? res.field));
            }
            return toast(t.errors[res.error] ?? t.errors.failed);
          }
          toast(e.saved);
          router.refresh();
        });
      }}
    >
      {Object.keys(e.fields).map((k) => (
        <label key={k} className={`adm-field${long.has(k) ? " is-wide" : ""}${bad === k ? " is-bad" : ""}`}>
          <span>{e.fields[k]}</span>
          <input value={form[k] ?? ""} maxLength={300} placeholder={defaults[k]} onChange={(ev) => setForm({ ...form, [k]: ev.target.value })} aria-invalid={bad === k} />
        </label>
      ))}
      <div className="adm-form-actions">
        <button type="submit" className="adm-btn" disabled={pending}>
          <Check size={15} aria-hidden="true" />
          {pending ? t.common.saving : t.common.save}
        </button>
      </div>
      {toastNode}
    </form>
  );
}

export function NotificationsForm({ initial }: { initial: TeamNotifications }) {
  const { t } = useT();
  const n = t.parametres.notifications;
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [prefs, setPrefs] = useState(initial);
  const toggle = (id: keyof TeamNotifications) => {
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next);
    start(async () => {
      const res = await saveNotifications(next);
      if (!res.success) {
        setPrefs(prefs);
        return toast(t.errors[res.error] ?? t.errors.failed);
      }
      toast(n.saved);
    });
  };
  const rows = (ids: readonly (keyof TeamNotifications)[]) =>
    ids.map((id) => (
      <li key={id}>
        <span>
          <strong>{n.items[id]![0]}</strong>
          <small>{n.items[id]![1]}</small>
        </span>
        <label className="adm-switch">
          <input type="checkbox" checked={prefs[id]} onChange={() => toggle(id)} disabled={pending} aria-label={n.items[id]![0]} />
          <span aria-hidden="true" />
        </label>
      </li>
    ));
  return (
    <>
      <h3 className="adm-subhead">{n.groups.team}</h3>
      <ul className="adm-toggles">
        {rows(TEAM_NOTIFICATION_IDS)}
        <li>
          <span>
            <strong>{n.contact[0]}</strong>
            <small>{n.contact[1]}</small>
          </span>
          <span className="adm-badge is-ok">{n.locked}</span>
        </li>
      </ul>
      <h3 className="adm-subhead">{n.groups.person}</h3>
      <ul className="adm-toggles">{rows(PERSON_NOTIFICATION_IDS)}</ul>
      {toastNode}
    </>
  );
}

export function CommissionRatesForm({ initial, ready }: { initial: Record<string, number>; ready: boolean }) {
  const { t } = useT();
  const r = t.catalogue.rates;
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [values, setValues] = useState(initial);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      const res = await saveCommissionRates(values);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(r.saved);
    });
  };
  return (
    <form onSubmit={save}>
      <div className="adm-form-row">
        {PRODUCT_TYPES.map((id) => (
          <label key={id} className="adm-field">
            <span>{r.names[id]}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              required
              disabled={!ready || pending}
              value={values[id] ?? ""}
              onChange={(ev) => setValues({ ...values, [id]: Number(ev.target.value) })}
            />
          </label>
        ))}
      </div>
      <div className="adm-form-actions">
        <button type="submit" className="adm-btn" disabled={!ready || pending}>
          <Check size={15} aria-hidden="true" />
          {pending ? t.common.saving : r.save}
        </button>
      </div>
      {toastNode}
    </form>
  );
}
