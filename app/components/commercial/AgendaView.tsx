"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, CalendarClock, Check, Footprints, ListChecks, MapPin, Pencil, Phone, Plus, RotateCcw, Trash2, Users, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { createOwnTask, deleteEvent, deleteOwnTask, saveEvent, setEventStatus, type EventInput } from "@/lib/commercial/agenda-actions";
import type { AgendaFilter, CalendarItem, PanelTask } from "@/lib/commercial/agenda";
import { setTaskDone } from "@/lib/admin/tasks-actions";
import { dateFrTz, dateTimeFr, dayKey, dayLabelFr, nextDayKey, timeFr } from "@/lib/commercial/time";

/*
 * commercial/agenda.html (handoff pages 05–06): day-grouped calendar with type filters + "Tâches & relances" panel.
 * Everything comes from the server already scoped to the signed-in rep; every action re-checks ownership server-side.
 */

const TYPE: Record<string, { label: string; Icon: LucideIcon }> = {
  appel: { label: "Appel", Icon: Phone },
  rdv: { label: "Rendez-vous", Icon: Users },
  reunion: { label: "Réunion", Icon: Users },
  rappel: { label: "Rappel", Icon: BellRing },
  visite: { label: "Visite", Icon: Footprints },
};
const FILTERS: { id: AgendaFilter; label: string }[] = [
  { id: "", label: "Tous" },
  { id: "rdv", label: "RDV" },
  { id: "appel", label: "Appels" },
  { id: "rappel", label: "Relances" },
  { id: "visite", label: "Visites" },
];
const ERRORS: Record<string, string> = {
  forbidden: "Accès refusé.",
  invalid: "Vérifiez les champs (titre, type et date obligatoires).",
  notFound: "Cet élément n'existe plus.",
  failed: "L'opération a échoué. Réessayez.",
};
const time = timeFr;

function dayLabel(key: string, today: string) {
  if (key === today) return "Aujourd'hui";
  if (key === nextDayKey(today)) return "Demain";
  return dayLabelFr(key);
}

export function AgendaView({
  items,
  panel,
  filter,
  today,
  eventsReady,
  ownTasksReady,
}: {
  items: CalendarItem[];
  panel: PanelTask[];
  filter: AgendaFilter;
  /** Today in Paris ("YYYY-MM-DD"), computed once on the server. */
  today: string;
  eventsReady: boolean;
  ownTasksReady: boolean;
}) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [pending, start] = useTransition();
  const [modal, setModal] = useState<{ item: CalendarItem | null } | null>(null);

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, done: string) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return toast(ERRORS[res.error ?? "failed"] ?? ERRORS.failed);
      toast(done);
      router.refresh();
    });

  // Day groups; still-planned items from before today are grouped as "En retard".
  const groups = new Map<string, { label: string; late: boolean; items: CalendarItem[] }>();
  for (const it of items) {
    const day = dayKey(it.startsAt);
    const late = day < today;
    const key = late ? "late" : day;
    if (!groups.has(key)) groups.set(key, { label: late ? "En retard" : dayLabel(day, today), late, items: [] });
    groups.get(key)!.items.push(it);
  }

  return (
    <div className="com-agenda">
      <section className="adm-card com-agenda-main" aria-labelledby="com-agenda-title">
        <header className="com-board-bar">
          <div className="com-chips" role="group" aria-label="Type d'événement">
            {FILTERS.map((f) => (
              <Link key={f.id || "all"} href={f.id ? `/commercial/agenda?type=${f.id}` : "/commercial/agenda"} className={filter === f.id ? "is-active" : undefined} aria-current={filter === f.id ? "true" : undefined}>
                {f.label}
              </Link>
            ))}
          </div>
          <button type="button" className="adm-btn" disabled={!eventsReady} onClick={() => setModal({ item: null })}>
            <Plus size={16} aria-hidden="true" /> Nouvel événement
          </button>
        </header>
        <h2 id="com-agenda-title" className="adm-sr">
          Agenda
        </h2>
        {groups.size === 0 ? (
          <p className="adm-empty">{filter ? "Aucun événement de ce type à venir." : "Aucun événement à venir. Planifiez un appel, un rendez-vous ou une visite."}</p>
        ) : (
          [...groups.entries()].map(([key, g]) => (
            <div key={key} className={`com-day${g.late ? " is-late" : ""}`}>
              <h3>{g.label}</h3>
              <ul className="adm-list">
                {g.items.map((it) => {
                  const { label, Icon } = TYPE[it.type] ?? { label: it.type, Icon: CalendarClock };
                  return (
                    <li key={`${it.source}:${it.id}`} className={it.status === "fait" ? "is-done" : it.status === "annule" ? "is-cancelled" : g.late ? "is-overdue" : undefined}>
                      <Icon size={16} aria-hidden="true" />
                      <span className="adm-stack">
                        <strong>{it.title}</strong>
                        <span className="adm-person-mail">
                          {g.late ? dateFrTz(it.startsAt) + " · " : ""}
                          {time(it.startsAt)}
                          {it.durationMinutes ? ` (${it.durationMinutes} min)` : ""} · {label}
                          {it.clientName ? ` · ${it.clientName}` : ""}
                          {it.location ? (
                            <>
                              {" · "}
                              <MapPin size={11} aria-hidden="true" /> {it.location}
                            </>
                          ) : null}
                        </span>
                        {it.notes && <span className="adm-person-mail">{it.notes}</span>}
                      </span>
                      {it.source === "task" && <span className="adm-badge is-muted" title="Tâche donnée par l'administrateur">Tâche</span>}
                      {it.status === "annule" && <span className="adm-badge is-danger">Annulé</span>}
                      <span className="com-row-actions">
                        {it.source === "event" ? (
                          <>
                            {it.status === "prevu" ? (
                              <button type="button" className="adm-icon-btn sm" title="Marquer fait" aria-label={`Marquer fait : ${it.title}`} disabled={pending} onClick={() => run(() => setEventStatus(it.id, "fait"), "Événement marqué fait.")}>
                                <Check size={15} />
                              </button>
                            ) : (
                              <button type="button" className="adm-icon-btn sm" title="Remettre à prévu" aria-label={`Remettre à prévu : ${it.title}`} disabled={pending} onClick={() => run(() => setEventStatus(it.id, "prevu"), "Événement remis à prévu.")}>
                                <RotateCcw size={15} />
                              </button>
                            )}
                            {it.status === "prevu" && (
                              <button type="button" className="adm-icon-btn sm" title="Annuler" aria-label={`Annuler : ${it.title}`} disabled={pending} onClick={() => run(() => setEventStatus(it.id, "annule"), "Événement annulé.")}>
                                <X size={15} />
                              </button>
                            )}
                            <button type="button" className="adm-icon-btn sm" title="Modifier" aria-label={`Modifier : ${it.title}`} onClick={() => setModal({ item: it })}>
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="adm-icon-btn sm com-danger"
                              title="Supprimer"
                              aria-label={`Supprimer : ${it.title}`}
                              disabled={pending}
                              onClick={() => window.confirm(`Supprimer « ${it.title} » ?`) && run(() => deleteEvent(it.id), "Événement supprimé.")}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="adm-icon-btn sm"
                            title={it.status === "fait" ? "Rouvrir" : "Marquer fait"}
                            aria-label={`${it.status === "fait" ? "Rouvrir" : "Marquer fait"} : ${it.title}`}
                            disabled={pending}
                            onClick={() => run(() => setTaskDone(it.id, it.status !== "fait"), "Tâche mise à jour.")}
                          >
                            {it.status === "fait" ? <RotateCcw size={15} /> : <Check size={15} />}
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      <TasksPanel tasks={panel} ownTasksReady={ownTasksReady} run={run} pending={pending} defaultDue={`${nextDayKey(today)}T10:00`} />

      {modal && <EventModal key={modal.item?.id ?? "new"} item={modal.item} onClose={() => setModal(null)} onSaved={(m) => (toast(m), router.refresh())} />}
      {toastNode}
    </div>
  );
}

function TasksPanel({
  tasks,
  ownTasksReady,
  run,
  pending,
  defaultDue,
}: {
  /** Tomorrow 10:00 (Paris), from the server's "today". */
  defaultDue: string;
  tasks: PanelTask[];
  ownTasksReady: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>, done: string) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState({ title: "", clientName: "", dueAt: defaultDue, priority: "normale" });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    run(() => createOwnTask({ ...form, dueAt: new Date(form.dueAt).toISOString() }), "Tâche ajoutée.");
    setForm((f) => ({ ...f, title: "", clientName: "" }));
  };

  return (
    <aside className="adm-card com-tasks" aria-labelledby="com-tasks-title">
      <header className="adm-card-head">
        <h2 id="com-tasks-title">
          <ListChecks size={17} aria-hidden="true" /> Tâches &amp; relances
        </h2>
      </header>
      {ownTasksReady ? (
        <form className="com-task-form" onSubmit={add}>
          <input aria-label="Nouvelle tâche" placeholder="Ajouter une tâche…" maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input aria-label="Client (facultatif)" placeholder="Client (facultatif)" maxLength={160} value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          <div>
            <input type="datetime-local" aria-label="Échéance" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} required />
            <select className="adm-select" aria-label="Priorité" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="haute">Haute</option>
              <option value="normale">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
            <button type="submit" className="adm-icon-btn" aria-label="Ajouter la tâche" disabled={pending}>
              <Plus size={16} />
            </button>
          </div>
        </form>
      ) : (
        <p className="adm-muted">L&apos;ajout de vos propres tâches sera actif après la migration 012.</p>
      )}
      {tasks.length === 0 ? (
        <p className="adm-empty">Aucune tâche.</p>
      ) : (
        <ul className="com-task-list">
          {tasks.map((t) => (
            <li key={t.id} className={t.done ? "is-done" : t.overdue ? "is-overdue" : undefined}>
              <label>
                <input type="checkbox" checked={t.done} disabled={pending} onChange={() => run(() => setTaskDone(t.id, !t.done), t.done ? "Tâche rouverte." : "Tâche terminée.")} />
                <span className="adm-stack">
                  <strong>{t.title}</strong>
                  <span className="adm-person-mail">
                    {[t.clientName, dateTimeFr(t.dueAt)].filter(Boolean).join(" · ")}
                    {!t.mine && " · donnée par l'administrateur"}
                  </span>
                </span>
              </label>
              <span className={`adm-badge ${t.overdue ? "is-danger" : t.priority === "haute" ? "is-warn" : "is-muted"}`}>{t.overdue ? "En retard" : t.priority === "haute" ? "Haute" : t.priority === "basse" ? "Basse" : "Moyenne"}</span>
              {t.mine && (
                <button type="button" className="adm-icon-btn sm com-danger" aria-label={`Supprimer la tâche ${t.title}`} disabled={pending} onClick={() => run(() => deleteOwnTask(t.id), "Tâche supprimée.")}>
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

const toLocal = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3_600_000);
  if (!iso) d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function EventModal({ item, onClose, onSaved }: { item: CalendarItem | null; onClose: () => void; onSaved: (message: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<EventInput>({
    title: item?.title ?? "",
    clientName: item?.clientName ?? "",
    type: item?.type ?? "rdv",
    startsAt: toLocal(item?.startsAt ?? null),
    durationMinutes: String(item?.durationMinutes ?? 30),
    location: item?.location ?? "",
    notes: item?.notes ?? "",
  });
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const set = (k: keyof EventInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const close = () => {
    ref.current?.close();
    onClose();
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await saveEvent(item?.id ?? null, { ...form, startsAt: new Date(form.startsAt).toISOString() });
      if (!res.success) return setError(ERRORS[res.error] ?? ERRORS.failed);
      onSaved(item ? "Événement modifié." : "Événement ajouté.");
      close();
    });
  };
  return (
    <dialog ref={ref} className="adm-modal" aria-labelledby="com-event-title" onClose={onClose}>
      <form className="adm-modal-card" onSubmit={submit}>
        <header>
          <h2 id="com-event-title">{item ? "Modifier l'événement" : "Nouvel événement"}</h2>
          <button type="button" className="adm-icon-btn" onClick={close} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        <label className="adm-field">
          <span>Titre *</span>
          <input required maxLength={160} value={form.title} onChange={set("title")} />
        </label>
        <div className="adm-form-grid">
          <label className="adm-field">
            <span>Type *</span>
            <select className="adm-select" value={form.type} onChange={set("type")}>
              <option value="rdv">Rendez-vous</option>
              <option value="appel">Appel</option>
              <option value="rappel">Rappel / relance</option>
              <option value="visite">Visite</option>
            </select>
          </label>
          <label className="adm-field">
            <span>Client</span>
            <input maxLength={160} value={form.clientName} onChange={set("clientName")} />
          </label>
          <label className="adm-field">
            <span>Date et heure *</span>
            <input type="datetime-local" required value={form.startsAt} onChange={set("startsAt")} />
          </label>
          <label className="adm-field">
            <span>Durée (minutes)</span>
            <input type="number" min={5} max={1440} step={5} value={form.durationMinutes} onChange={set("durationMinutes")} />
          </label>
          <label className="adm-field is-wide">
            <span>Lieu</span>
            <input maxLength={200} value={form.location} onChange={set("location")} />
          </label>
          <label className="adm-field is-wide">
            <span>Notes</span>
            <textarea rows={2} maxLength={2000} value={form.notes} onChange={set("notes")} />
          </label>
        </div>
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
            {item ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
