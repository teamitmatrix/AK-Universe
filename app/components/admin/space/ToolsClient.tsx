"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ExternalLink, Eye, Pencil, Plus, Power, RotateCcw, Search, Trash2, Upload, X } from "lucide-react";
import { localeOf } from "@/config/languages";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  createAgentService,
  deleteAgentService,
  updateAgentService,
  type AgentServiceInput,
} from "@/lib/admin/agents-catalog-actions";
import { saveCatalogue, setCatalogueItemHidden, updateCatalogueItem } from "@/lib/admin/catalogue-actions";
import { saveCommissionRates } from "@/lib/admin/rates-actions";
import { AGENT_ICON_CHOICES, type CatalogAgent } from "@/config/agents-catalog";
import type { AgentCategory } from "@/config/agents";
import { DEFAULT_RATES, PRODUCT_TYPES, type ProductType } from "@/lib/commercial/commission-rules";
import { PERSON_NOTIFICATION_IDS, TEAM_NOTIFICATION_IDS, type TeamNotifications } from "@/lib/notification-ids";
import { createPromotion, setPromotionActive, type NewPromotion } from "@/lib/admin/promotions-actions";
import { changeMyPassword, saveCompany, saveNotifications, updateMyProfile } from "@/lib/admin/settings-actions";
import { createTask, deleteTask, setTaskDone } from "@/lib/admin/tasks-actions";
import { toolsTextFor } from "./toolsText";

const emptyAgentForm = (): AgentServiceInput => ({
  name: "",
  role: "",
  headline: "",
  description: "",
  example: "",
  category: "client",
  icon: "sparkle",
  portrait: "/assets/img/agents/milo-card.jpg",
  heroPortrait: "/assets/img/agents/milo-hero.jpg",
  task1: "",
  task2: "",
  task3: "",
  action: "",
  integrations: "E-mail, CRM",
  demoClient: "",
  demoAgent: "",
  priceMonthly: "",
  setupFrom: "",
  published: true,
});

function agentToForm(agent: CatalogAgent): AgentServiceInput {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    headline: agent.headline,
    description: agent.description,
    example: agent.example,
    category: agent.category,
    icon: agent.icon,
    portrait: agent.portrait,
    heroPortrait: agent.heroPortrait,
    task1: agent.tasks[0]?.label ?? "",
    task2: agent.tasks[1]?.label ?? "",
    task3: agent.tasks[2]?.label ?? "",
    action: agent.action,
    integrations: agent.integrations.join(", "),
    demoClient: agent.demo.find((d) => d.from === "client")?.text ?? "",
    demoAgent: agent.demo.find((d) => d.from === "agent")?.text ?? "",
    priceMonthly: agent.priceMonthly != null ? String(agent.priceMonthly) : "",
    setupFrom: agent.setupFrom != null ? String(agent.setupFrom) : "",
    published: agent.published,
  };
}

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

type CatalogueField = { key: string; label: string; value: number; default: number; unit: string };
type CatalogueCommercial = {
  hasMonthly: boolean;
  hasSetup: boolean;
  costMonthly: number | null;
  costSetup: number | null;
  maxDiscountMonthly: number;
  maxDiscountSetup: number;
};
type CatalogueRow = {
  id: string;
  category: string;
  name: string;
  detail: string;
  defaultName: string;
  defaultDetail: string;
  href?: string;
  fields: CatalogueField[];
  commercial: CatalogueCommercial | null;
  hidden: boolean;
  canDelete: boolean;
};

const parseNum = (v: string) => Number(String(v).replace(",", "."));
const fieldOf = (r: CatalogueRow, kind: "monthly" | "setup") =>
  r.fields.find((f) => (kind === "monthly" ? f.label === "monthly" : f.label === "setup" || f.label === "price"));
const commercialKey = (rowId: string, part: string) => `c:${rowId}:${part}`;

function marginEuro(sell: number, cost: number | null): number | null {
  if (cost == null || !Number.isFinite(cost) || !Number.isFinite(sell)) return null;
  return Math.round((sell - cost) * 100) / 100;
}
function marginPct(sell: number, cost: number | null): number | null {
  if (cost == null || !(cost > 0) || !Number.isFinite(sell)) return null;
  return Math.round(((sell - cost) / cost) * 10000) / 100;
}

/** Same mapping as sales catalogue: monthly AI → abonnements, setup AI → agents, etc. */
function productTypeFor(category: string, monthly: boolean): ProductType | null {
  if (category === "regles") return null;
  if (category === "agents") return monthly ? "abonnements" : "agents";
  if (category === "abonnement") return "abonnements";
  if (category === "marketing") return "marketing";
  if (category === "videos") return "videos";
  return "options";
}

export function CatalogueEditor({
  rows,
  customAgents = [],
  rates = DEFAULT_RATES,
}: {
  rows: CatalogueRow[];
  customAgents?: CatalogAgent[];
  rates?: Record<ProductType, number>;
}) {
  const { t, locale } = useT();
  const c = t.catalogue;
  const af = c.agentForm;
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [editing, setEditing] = useState<CatalogueRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [agentForm, setAgentForm] = useState<AgentServiceInput>(emptyAgentForm());
  const [agentEditId, setAgentEditId] = useState<string | null>(null);
  const editDialog = useRef<HTMLDialogElement>(null);
  const agentDialog = useRef<HTMLDialogElement>(null);
  const customById = useMemo(() => new Map(customAgents.map((a) => [a.id, a])), [customAgents]);

  const original = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const r of rows) {
      for (const f of r.fields) map[f.key] = f.value;
      if (!r.commercial) continue;
      if (r.commercial.hasMonthly) {
        map[commercialKey(r.id, "costMonthly")] = r.commercial.costMonthly;
        map[commercialKey(r.id, "maxDiscountMonthly")] = r.commercial.maxDiscountMonthly;
      }
      if (r.commercial.hasSetup) {
        map[commercialKey(r.id, "costSetup")] = r.commercial.costSetup;
        map[commercialKey(r.id, "maxDiscountSetup")] = r.commercial.maxDiscountSetup;
      }
    }
    return map;
  }, [rows]);

  const changed = Object.entries(values).filter(([k, v]) => {
    const trimmed = v.trim();
    const orig = original[k];
    // Clearing a previously unset cost back to empty is not a change.
    if (trimmed === "") return orig != null && !k.includes(":maxDiscount");
    const n = parseNum(trimmed);
    if (!Number.isFinite(n)) return false;
    return n !== (orig ?? (k.includes(":cost") ? null : 0));
  });

  useEffect(() => {
    if (!changed.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed.length]);

  const fmt = (v: number, unit: string) =>
    unit === "pct" ? `${v.toLocaleString(locale)} %` : `${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.units[unit]}`;
  const fmtEuro = (v: number | null) =>
    v == null ? "—" : `${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  const fmtPct = (v: number | null) => (v == null ? "—" : `${v.toLocaleString(locale, { maximumFractionDigits: 2 })} %`);

  const hiddenCount = rows.filter((r) => r.hidden).length;
  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (showHidden || !r.hidden) &&
      (!category || r.category === category) &&
      (!q || r.name.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q)),
  );

  const setVal = (key: string, value: string) => setValues((s) => ({ ...s, [key]: value }));
  const live = (key: string, fallback: number | null): number | null => {
    const raw = values[key];
    if (raw === undefined) return fallback;
    if (raw.trim() === "") return null;
    const n = parseNum(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const dirty = (key: string, fallback: number | null) => {
    if (values[key] === undefined) return false;
    const raw = values[key].trim();
    if (raw === "") return fallback != null;
    return parseNum(raw) !== fallback;
  };

  const openEdit = (row: CatalogueRow) => {
    if (row.id.startsWith("agent:")) {
      const agent = customById.get(row.id.slice("agent:".length));
      if (!agent) return toast(t.errors.notFound);
      setAgentEditId(agent.id);
      setAgentForm(agentToForm(agent));
      agentDialog.current?.showModal();
      return;
    }
    setEditing(row);
    setEditName(row.name);
    setEditDetail(row.detail);
    editDialog.current?.showModal();
  };

  const saveMeta = () =>
    start(async () => {
      if (!editing) return;
      const name = editName.trim();
      if (!name) return toast(t.errors.invalid);
      let res: Awaited<ReturnType<typeof updateCatalogueItem>>;
      try {
        res = await updateCatalogueItem(editing.id, { name, detail: editDetail.trim() });
      } catch (cause) {
        console.error("Catalogue meta save failed:", cause);
        return toast(t.errors.failed);
      }
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      editDialog.current?.close();
      setEditing(null);
      toast(c.editSaved);
      router.refresh();
    });

  const saveAgent = () =>
    start(async () => {
      try {
        const res = agentEditId ? await updateAgentService(agentEditId, agentForm) : await createAgentService(agentForm);
        if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      } catch (cause) {
        console.error("Agent service save failed:", cause);
        return toast(t.errors.failed);
      }
      agentDialog.current?.close();
      setAgentEditId(null);
      setAgentForm(emptyAgentForm());
      toast(agentEditId ? af.updated : af.created);
      router.refresh();
    });

  const toggleHidden = (row: CatalogueRow) =>
    start(async () => {
      if (!row.canDelete) return;
      if (row.id.startsWith("agent:")) {
        const agentId = row.id.slice("agent:".length);
        if (!window.confirm(af.deleteConfirm(row.name))) return;
        let res: Awaited<ReturnType<typeof deleteAgentService>>;
        try {
          res = await deleteAgentService(agentId);
        } catch (cause) {
          console.error("Agent delete failed:", cause);
          return toast(t.errors.failed);
        }
        if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
        toast(af.deleted);
        router.refresh();
        return;
      }
      if (!row.hidden && !window.confirm(c.deleteConfirm(row.name))) return;
      let res: Awaited<ReturnType<typeof setCatalogueItemHidden>>;
      try {
        res = await setCatalogueItemHidden(row.id, !row.hidden);
      } catch (cause) {
        console.error("Catalogue hide failed:", cause);
        return toast(t.errors.failed);
      }
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(row.hidden ? c.restored : c.deleted);
      router.refresh();
    });

  const save = () =>
    start(async () => {
      const payload: Record<string, number> = {};
      for (const [k, v] of changed) {
        const n = parseNum(v);
        if (!Number.isFinite(n)) return toast(t.errors.invalid);
        if (k.includes(":maxDiscount") && (n < 0 || n > 100)) return toast(t.errors.invalid);
        payload[k] = n;
      }
      let res: Awaited<ReturnType<typeof saveCatalogue>>;
      try {
        res = await saveCatalogue(payload);
      } catch (cause) {
        console.error("Catalogue save failed:", cause);
        return toast(t.errors.failed);
      }
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      setValues({});
      toast(c.saved);
      router.refresh();
    });

  const priceInput = (opts: {
    key: string;
    label: string;
    value: number | null;
    unitKey: "eur" | "eurMonth" | "pct";
    aria: string;
    showLabel?: boolean;
    defaultValue?: number;
    max?: number;
    allowEmpty?: boolean;
  }) => {
    const display = values[opts.key] ?? (opts.value == null ? "" : String(opts.value));
    const isDirty = dirty(opts.key, opts.value);
    return (
      <label className={`adm-price${isDirty ? " is-dirty" : ""}`}>
        {opts.showLabel !== false && <small>{opts.label}</small>}
        <span className="adm-price-input">
          <input
            inputMode="decimal"
            value={display}
            max={opts.max}
            placeholder={opts.allowEmpty ? "—" : undefined}
            onChange={(e) => setVal(opts.key, e.target.value)}
            aria-label={opts.aria}
          />
          <em>{c.units[opts.unitKey]}</em>
        </span>
        {opts.defaultValue != null && opts.value !== opts.defaultValue && !isDirty && (
          <button type="button" className="adm-mini-link" title={c.reset} onClick={() => setVal(opts.key, String(opts.defaultValue))}>
            {c.default(fmt(opts.defaultValue, opts.unitKey))}
          </button>
        )}
      </label>
    );
  };

  const readOnlyStack = (monthly: number | null, setup: number | null, format: (n: number | null) => string, showMonthly: boolean, showSetup: boolean) => (
    <span className="adm-price-fields adm-margin-stack">
      {showMonthly && (
        <span className="adm-price is-readonly">
          <small>{c.labels.monthly}</small>
          <strong className="notranslate">{format(monthly)}</strong>
        </span>
      )}
      {showSetup && (
        <span className="adm-price is-readonly">
          <small>{c.labels.setup}</small>
          <strong className="notranslate">{format(setup)}</strong>
        </span>
      )}
    </span>
  );

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
        {hiddenCount > 0 && (
          <button type="button" className="adm-btn is-ghost" onClick={() => setShowHidden((v) => !v)}>
            {showHidden ? c.hideHidden : c.showHidden} ({hiddenCount})
          </button>
        )}
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
                <th scope="col">{c.cols.costMonthly}</th>
                <th scope="col">{c.cols.costSetup}</th>
                <th scope="col">{c.cols.sellPrice}</th>
                <th scope="col">{c.cols.maxDiscount}</th>
                <th scope="col">{c.cols.commission}</th>
                <th scope="col">{c.cols.marginEuro}</th>
                <th scope="col">{c.cols.marginRate}</th>
                <th scope="col">{c.actions}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const com = r.commercial;
                const monthlyField = fieldOf(r, "monthly");
                const setupField = fieldOf(r, "setup");
                const rateFields = r.fields.filter((f) => f.label === "percent");
                const sellMonthly = monthlyField ? live(monthlyField.key, monthlyField.value) : null;
                const sellSetup = setupField ? live(setupField.key, setupField.value) : null;
                const costM = com?.hasMonthly ? live(commercialKey(r.id, "costMonthly"), com.costMonthly) : null;
                const costS = com?.hasSetup ? live(commercialKey(r.id, "costSetup"), com.costSetup) : null;
                const showMonthly = !!(com?.hasMonthly || monthlyField);
                const showSetup = !!(com?.hasSetup || setupField);
                const typeMonthly = productTypeFor(r.category, true);
                const typeSetup = productTypeFor(r.category, false);
                const commissionMonthly = showMonthly && typeMonthly ? rates[typeMonthly] : null;
                const commissionSetup = showSetup && typeSetup ? rates[typeSetup] : null;

                return (
                  <tr key={r.id} className={r.hidden ? "is-muted" : undefined}>
                    <td data-label={c.cols.product}>
                      <span className="adm-stack">
                        <strong>
                          {r.name}
                          {r.hidden && <span className="adm-badge is-muted">{c.hiddenBadge}</span>}
                          {r.href && !r.hidden && (
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
                    <td data-label={c.cols.costMonthly}>
                      {com?.hasMonthly ? (
                        priceInput({
                          key: commercialKey(r.id, "costMonthly"),
                          label: c.cols.costMonthly,
                          value: com.costMonthly,
                          unitKey: "eur",
                          aria: `${r.name} — ${c.cols.costMonthly}`,
                          showLabel: false,
                          allowEmpty: true,
                        })
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td data-label={c.cols.costSetup}>
                      {com?.hasSetup ? (
                        priceInput({
                          key: commercialKey(r.id, "costSetup"),
                          label: c.cols.costSetup,
                          value: com.costSetup,
                          unitKey: "eur",
                          aria: `${r.name} — ${c.cols.costSetup}`,
                          showLabel: false,
                          allowEmpty: true,
                        })
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td data-label={c.cols.sellPrice}>
                      {monthlyField || setupField || rateFields.length ? (
                        <span className="adm-price-fields">
                          {monthlyField &&
                            priceInput({
                              key: monthlyField.key,
                              label: c.labels.monthly,
                              value: monthlyField.value,
                              unitKey: (monthlyField.unit === "pct" || monthlyField.unit === "eurMonth" ? monthlyField.unit : "eur") as
                                | "eur"
                                | "eurMonth"
                                | "pct",
                              aria: `${r.name} — ${c.labels.monthly}`,
                              showLabel: !!(monthlyField && setupField),
                              defaultValue: monthlyField.default,
                            })}
                          {setupField &&
                            priceInput({
                              key: setupField.key,
                              label: c.labels.setup,
                              value: setupField.value,
                              unitKey: (setupField.unit === "pct" || setupField.unit === "eurMonth" ? setupField.unit : "eur") as
                                | "eur"
                                | "eurMonth"
                                | "pct",
                              aria: `${r.name} — ${c.labels.setup}`,
                              showLabel: !!(monthlyField && setupField),
                              defaultValue: setupField.default,
                            })}
                          {!monthlyField &&
                            !setupField &&
                            rateFields.map((f) =>
                              priceInput({
                                key: f.key,
                                label: c.labels.percent,
                                value: f.value,
                                unitKey: "pct",
                                aria: `${r.name} — ${c.labels.percent}`,
                                showLabel: false,
                                defaultValue: f.default,
                                max: 100,
                              }),
                            )}
                        </span>
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td data-label={c.cols.maxDiscount}>
                      {com ? (
                        <span className="adm-price-fields">
                          {com.hasMonthly &&
                            priceInput({
                              key: commercialKey(r.id, "maxDiscountMonthly"),
                              label: c.labels.monthly,
                              value: com.maxDiscountMonthly,
                              unitKey: "pct",
                              aria: `${r.name} — ${c.cols.maxDiscount} (${c.labels.monthly})`,
                              showLabel: com.hasMonthly && com.hasSetup,
                              max: 100,
                            })}
                          {com.hasSetup &&
                            priceInput({
                              key: commercialKey(r.id, "maxDiscountSetup"),
                              label: c.labels.setup,
                              value: com.maxDiscountSetup,
                              unitKey: "pct",
                              aria: `${r.name} — ${c.cols.maxDiscount} (${c.labels.setup})`,
                              showLabel: com.hasMonthly && com.hasSetup,
                              max: 100,
                            })}
                        </span>
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td data-label={c.cols.commission}>
                      {commissionMonthly != null || commissionSetup != null ? (
                        readOnlyStack(commissionMonthly, commissionSetup, fmtPct, commissionMonthly != null, commissionSetup != null)
                      ) : (
                        <span className="adm-muted">—</span>
                      )}
                    </td>
                    <td data-label={c.cols.marginEuro}>
                      {com
                        ? readOnlyStack(
                            sellMonthly != null ? marginEuro(sellMonthly, costM) : null,
                            sellSetup != null ? marginEuro(sellSetup, costS) : null,
                            fmtEuro,
                            !!com.hasMonthly,
                            !!com.hasSetup,
                          )
                        : (
                          <span className="adm-muted">—</span>
                        )}
                    </td>
                    <td data-label={c.cols.marginRate}>
                      {com
                        ? readOnlyStack(
                            sellMonthly != null ? marginPct(sellMonthly, costM) : null,
                            sellSetup != null ? marginPct(sellSetup, costS) : null,
                            fmtPct,
                            !!com.hasMonthly,
                            !!com.hasSetup,
                          )
                        : (
                          <span className="adm-muted">—</span>
                        )}
                    </td>
                    <td data-label={c.actions}>
                      <span className="adm-row-actions">
                        <button
                          type="button"
                          className="adm-icon-btn sm"
                          onClick={() => openEdit(r)}
                          disabled={pending}
                          aria-label={c.edit}
                          title={c.edit}
                        >
                          <Pencil size={14} />
                        </button>
                        {r.canDelete && (
                          <button
                            type="button"
                            className="adm-icon-btn sm"
                            onClick={() => toggleHidden(r)}
                            disabled={pending}
                            aria-label={r.hidden ? c.restore : c.delete}
                            title={r.hidden ? c.restore : c.delete}
                          >
                            {r.hidden ? <RotateCcw size={14} /> : <Trash2 size={14} />}
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
      <div className={`adm-savebar${changed.length ? " is-on" : ""}`} aria-live="polite">
        <span>{changed.length ? c.changes(changed.length) : ""}</span>
        <button type="button" className="adm-btn is-ghost" onClick={() => setValues({})} disabled={!changed.length || pending}>
          {c.discard}
        </button>
        <button type="button" className="adm-btn" onClick={save} disabled={!changed.length || pending}>
          {pending ? t.common.saving : c.save}
        </button>
      </div>
      <dialog ref={editDialog} className="adm-modal" aria-labelledby="adm-catalogue-edit-title" onClose={() => setEditing(null)}>
        <form
          className="adm-modal-card"
          onSubmit={(e) => {
            e.preventDefault();
            saveMeta();
          }}
        >
          <header>
            <h2 id="adm-catalogue-edit-title">{c.editTitle}</h2>
            <button type="button" className="adm-icon-btn" onClick={() => editDialog.current?.close()} aria-label={t.common.close}>
              <X size={18} />
            </button>
          </header>
          <label className="adm-field">
            <span>{c.editName}</span>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={160} required autoFocus />
          </label>
          <label className="adm-field">
            <span>{c.editDetail}</span>
            <textarea value={editDetail} onChange={(e) => setEditDetail(e.target.value)} maxLength={300} rows={3} />
          </label>
          {editing && (editName !== editing.defaultName || editDetail !== editing.defaultDetail) && (
            <button
              type="button"
              className="adm-mini-link"
              onClick={() => {
                setEditName(editing.defaultName);
                setEditDetail(editing.defaultDetail);
              }}
            >
              {c.reset}
            </button>
          )}
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn is-ghost" onClick={() => editDialog.current?.close()} disabled={pending}>
              {t.common.cancel}
            </button>
            <button type="submit" className="adm-btn" disabled={pending || !editName.trim()}>
              {pending ? t.common.saving : c.editSave}
            </button>
          </div>
        </form>
      </dialog>
      <AgentServiceDialog
        dialogRef={agentDialog}
        form={agentForm}
        setForm={setAgentForm}
        editing={!!agentEditId}
        pending={pending}
        onClose={() => {
          setAgentEditId(null);
          setAgentForm(emptyAgentForm());
        }}
        onSubmit={saveAgent}
      />
      {toastNode}
    </>
  );
}

function AgentServiceDialog({
  dialogRef,
  form,
  setForm,
  editing,
  pending,
  onClose,
  onSubmit,
  createMode,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  form: AgentServiceInput;
  setForm: React.Dispatch<React.SetStateAction<AgentServiceInput>>;
  editing: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  createMode?: boolean;
}) {
  const { t } = useT();
  const c = t.catalogue;
  const af = c.agentForm;
  const set = (key: keyof AgentServiceInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((s) => ({ ...s, [key]: value }));
  };

  return (
    <dialog
      ref={dialogRef}
      className="adm-modal"
      aria-labelledby="adm-agent-service-title"
      onClose={onClose}
    >
      <form
        className="adm-modal-card"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <header>
          <h2 id="adm-agent-service-title">{editing ? af.save : c.newAgent}</h2>
          <button type="button" className="adm-icon-btn" onClick={() => dialogRef.current?.close()} aria-label={t.common.close}>
            <X size={18} />
          </button>
        </header>
        <p className="adm-muted adm-small">{af.intro}</p>
        <div className="adm-form-grid">
          <label className="adm-field">
            <span>{af.name}</span>
            <input required maxLength={80} value={form.name} onChange={set("name")} />
          </label>
          <label className="adm-field">
            <span>{af.role}</span>
            <input required maxLength={80} value={form.role} onChange={set("role")} />
          </label>
          <label className="adm-field">
            <span>{af.headline}</span>
            <input maxLength={120} value={form.headline} onChange={set("headline")} />
          </label>
          <label className="adm-field">
            <span>{af.category}</span>
            <select className="adm-select" value={form.category} onChange={set("category")}>
              {(Object.keys(af.categories) as AgentCategory[]).map((k) => (
                <option key={k} value={k}>
                  {af.categories[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
            <span>{af.description}</span>
            <textarea required maxLength={600} rows={3} value={form.description} onChange={set("description")} />
          </label>
          <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
            <span>{af.example}</span>
            <textarea maxLength={220} rows={2} value={form.example} onChange={set("example")} />
          </label>
          <label className="adm-field">
            <span>{af.icon}</span>
            <select className="adm-select" value={form.icon} onChange={set("icon")}>
              {AGENT_ICON_CHOICES.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-field">
            <span>{af.portrait}</span>
            <input required maxLength={300} value={form.portrait} onChange={set("portrait")} placeholder="/assets/img/agents/…" />
          </label>
          <label className="adm-field">
            <span>{af.heroPortrait}</span>
            <input required maxLength={300} value={form.heroPortrait} onChange={set("heroPortrait")} placeholder="/assets/img/agents/…" />
          </label>
          <label className="adm-field">
            <span>{af.task1}</span>
            <input required maxLength={80} value={form.task1} onChange={set("task1")} />
          </label>
          <label className="adm-field">
            <span>{af.task2}</span>
            <input required maxLength={80} value={form.task2} onChange={set("task2")} />
          </label>
          <label className="adm-field">
            <span>{af.task3}</span>
            <input required maxLength={80} value={form.task3} onChange={set("task3")} />
          </label>
          <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
            <span>{af.action}</span>
            <textarea maxLength={500} rows={2} value={form.action} onChange={set("action")} />
          </label>
          <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
            <span>{af.integrations}</span>
            <input maxLength={300} value={form.integrations} onChange={set("integrations")} />
          </label>
          <label className="adm-field">
            <span>{af.demoClient}</span>
            <input maxLength={280} value={form.demoClient} onChange={set("demoClient")} />
          </label>
          <label className="adm-field">
            <span>{af.demoAgent}</span>
            <input maxLength={280} value={form.demoAgent} onChange={set("demoAgent")} />
          </label>
          <label className="adm-field">
            <span>{af.priceMonthly}</span>
            <input inputMode="decimal" value={form.priceMonthly} onChange={set("priceMonthly")} />
          </label>
          <label className="adm-field">
            <span>{af.setupFrom}</span>
            <input inputMode="decimal" value={form.setupFrom} onChange={set("setupFrom")} />
          </label>
          <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
            <span className="adm-check">
              <input type="checkbox" checked={form.published} onChange={set("published")} /> {af.published}
            </span>
          </label>
        </div>
        <div className="adm-modal-actions">
          <button type="button" className="adm-btn is-ghost" onClick={() => dialogRef.current?.close()} disabled={pending}>
            {t.common.cancel}
          </button>
          <button type="submit" className="adm-btn" disabled={pending}>
            {pending ? t.common.saving : editing || !createMode ? af.save : af.create}
          </button>
        </div>
      </form>
    </dialog>
  );
}

/** Catalogue & prix — create a full Agents IA service (lands on /agents-ia only). */
export function NewAgentServiceButton() {
  const { t } = useT();
  const c = t.catalogue;
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<AgentServiceInput>(emptyAgentForm());

  const submit = () =>
    start(async () => {
      try {
        const res = await createAgentService(form);
        if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      } catch (cause) {
        console.error("createAgentService failed:", cause);
        return toast(t.errors.failed);
      }
      dialog.current?.close();
      setForm(emptyAgentForm());
      toast(c.agentForm.created);
      router.refresh();
    });

  return (
    <>
      <button type="button" className="adm-btn" onClick={() => dialog.current?.showModal()}>
        <Plus size={16} aria-hidden="true" />
        {c.newAgent}
      </button>
      <AgentServiceDialog
        dialogRef={dialog}
        form={form}
        setForm={setForm}
        editing={false}
        pending={pending}
        createMode
        onClose={() => setForm(emptyAgentForm())}
        onSubmit={submit}
      />
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
  const [prevInitial, setPrevInitial] = useState(initial);
  // Sync during render (no one-frame lag from useEffect) when the server refreshes rates.
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setValues(initial);
  }
  const router = useRouter();
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      const res = await saveCommissionRates(values);
      if (!res.success) return toast(t.errors[res.error] ?? t.errors.failed);
      toast(r.saved);
      router.refresh();
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
