"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { createVideasteEvent, deleteVideasteEvent, updateVideasteEvent, type VidEventInput } from "@/lib/videaste/agenda-actions";
import { VID_ERRORS } from "./vidUi";

const TYPES = { tournage: "Tournage", rdv: "RDV client", reunion: "Réunion", deadline: "Deadline", revue: "Revue", livraison: "Livraison" };

export type EditableEvent = {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  durationMinutes: number | null;
  projectId: string | null;
  location: string | null;
  notes: string | null;
};

type ProjectOption = { id: string; label: string };
type FormState = VidEventInput;

/** Local "YYYY-MM-DDTHH:mm" for the next round hour (default of the date field). */
function nextHourLocal() {
  const d = new Date(Date.now() + 3_600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nextHourLocal();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = (): FormState => ({
  title: "",
  type: "tournage",
  startsAt: "",
  durationMinutes: "60",
  projectId: "",
  location: "",
  notes: "",
});

function formFromEvent(event: EditableEvent): FormState {
  return {
    title: event.title,
    type: event.type in TYPES ? event.type : "reunion",
    startsAt: toLocalInput(event.startsAt),
    durationMinutes: String(event.durationMinutes && event.durationMinutes > 0 ? event.durationMinutes : 60),
    projectId: event.projectId ?? "",
    location: event.location ?? "",
    notes: event.notes ?? "",
  };
}

function EventFormFields({
  mode,
  projects,
  form,
  setForm,
  error,
  pending,
  onCancel,
}: {
  mode: "create" | "edit";
  projects: ProjectOption[];
  form: FormState;
  setForm: (f: FormState) => void;
  error: string | null;
  pending: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      <header>
        <h2 id="vid-event-title">{mode === "edit" ? "Modifier l'événement" : "Nouvel événement"}</h2>
        <button type="button" className="adm-icon-btn" onClick={onCancel} aria-label="Fermer">
          <X size={18} />
        </button>
      </header>
      <label className="adm-field">
        <span>Titre</span>
        <input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Tournage matinée 1" />
      </label>
      <div className="vid-form-grid">
        <label className="adm-field">
          <span>Type</span>
          <select className="adm-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="adm-field">
          <span>Durée (minutes)</span>
          <input type="number" min={5} max={1440} step={5} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
        </label>
        <label className="adm-field vid-span-2">
          <span>Date et heure</span>
          <input type="datetime-local" required value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
        </label>
      </div>
      <label className="adm-field">
        <span>Projet lié (facultatif)</span>
        <select className="adm-select" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
          <option value="">— Aucun —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="adm-field">
        <span>Lieu (facultatif)</span>
        <input maxLength={200} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </label>
      <label className="adm-field">
        <span>Notes (facultatif)</span>
        <textarea rows={2} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Prévoir le stabilisateur" />
      </label>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <div className="adm-modal-actions">
        <button type="button" className="adm-btn is-ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="adm-btn" disabled={pending}>
          {pending ? (mode === "edit" ? "Enregistrement…" : "Création…") : mode === "edit" ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </>
  );
}

/** "Créer un événement" — saved in the videographer's own agenda (createVideasteEvent re-checks everything). */
export function CreateEventButton({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open() {
    setForm({ ...emptyForm(), startsAt: nextHourLocal() });
    setError(null);
    dialog.current?.showModal();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const starts = new Date(form.startsAt);
    if (Number.isNaN(starts.getTime())) return setError(VID_ERRORS.invalid);
    start(async () => {
      const res = await createVideasteEvent({ ...form, startsAt: starts.toISOString() });
      if (!res.success) return setError(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      dialog.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="adm-btn" onClick={open}>
        <Plus size={16} aria-hidden="true" /> Créer un événement
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby="vid-event-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <EventFormFields mode="create" projects={projects} form={form} setForm={setForm} error={error} pending={pending} onCancel={() => dialog.current?.close()} />
        </form>
      </dialog>
    </>
  );
}

/** Pencil control: edit one of the videographer's own events. */
export function EditEventButton({ event, projects }: { event: EditableEvent; projects: ProjectOption[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(() => formFromEvent(event));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open() {
    setForm(formFromEvent(event));
    setError(null);
    dialog.current?.showModal();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const starts = new Date(form.startsAt);
    if (Number.isNaN(starts.getTime())) return setError(VID_ERRORS.invalid);
    start(async () => {
      const res = await updateVideasteEvent(event.id, { ...form, startsAt: starts.toISOString() });
      if (!res.success) return setError(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
      dialog.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className="adm-icon-btn" aria-label={`Modifier « ${event.title} »`} onClick={open}>
        <Pencil size={15} />
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby="vid-event-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <EventFormFields mode="edit" projects={projects} form={form} setForm={setForm} error={error} pending={pending} onCancel={() => dialog.current?.close()} />
        </form>
      </dialog>
    </>
  );
}

export function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="adm-icon-btn"
      disabled={pending}
      aria-label={`Supprimer « ${title} »`}
      onClick={() => {
        if (!window.confirm(`Supprimer l'événement « ${title} » ?`)) return;
        start(async () => {
          const res = await deleteVideasteEvent(id);
          if (!res.success) return window.alert(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
          router.refresh();
        });
      }}
    >
      <Trash2 size={15} />
    </button>
  );
}
