"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { createVideasteEvent, deleteVideasteEvent } from "@/lib/videaste/agenda-actions";
import { VID_ERRORS } from "./vidUi";

const TYPES = { tournage: "Tournage", rdv: "RDV client", reunion: "Réunion", deadline: "Deadline", revue: "Revue", livraison: "Livraison" };

/** Local "YYYY-MM-DDTHH:mm" for the next round hour (default of the date field). */
function nextHourLocal() {
  const d = new Date(Date.now() + 3_600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

/** "Créer un événement" — saved in the videographer's own agenda (createVideasteEvent re-checks everything). */
export function CreateEventButton({ projects }: { projects: { id: string; label: string }[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const empty = { title: "", type: "tournage", startsAt: "", durationMinutes: "60", projectId: "", location: "", notes: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
      <button
        type="button"
        className="adm-btn"
        onClick={() => {
          setForm({ ...empty, startsAt: nextHourLocal() });
          setError(null);
          dialog.current?.showModal();
        }}
      >
        <Plus size={16} aria-hidden="true" /> Créer un événement
      </button>
      <dialog ref={dialog} className="adm-modal" aria-labelledby="vid-event-title">
        <form className="adm-modal-card" onSubmit={submit}>
          <header>
            <h2 id="vid-event-title">Nouvel événement</h2>
            <button type="button" className="adm-icon-btn" onClick={() => dialog.current?.close()} aria-label="Fermer">
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
            <button type="button" className="adm-btn is-ghost" onClick={() => dialog.current?.close()}>
              Annuler
            </button>
            <button type="submit" className="adm-btn" disabled={pending}>
              {pending ? "Création…" : "Créer"}
            </button>
          </div>
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
