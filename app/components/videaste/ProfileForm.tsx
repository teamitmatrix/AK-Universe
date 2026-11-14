"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { ProfileInput } from "@/lib/videaste/profile";
import { VID_ERRORS } from "./vidUi";

export const SPECIALTY_SUGGESTIONS = ["Montage", "Tournage", "Motion design", "Drone", "Interview", "Étalonnage", "Sound design", "UGC", "Photo"];

/**
 * Identity form (names, phone, specialties) — used by the videographer on their own profile and by an admin on the
 * videographer's detail page. `save` is the server action of the caller's space; it re-validates everything.
 */
export function ProfileForm({
  initial,
  email,
  save,
  submitLabel = "Enregistrer",
}: {
  initial: ProfileInput;
  email?: string;
  save: (input: ProfileInput) => Promise<{ success: true } | { success: false; error: string }>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const addSpecialty = (raw: string) => {
    const s = raw.trim();
    if (!s || s.length > 40 || form.specialties.length >= 12 || form.specialties.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    setForm({ ...form, specialties: [...form.specialties, s] });
    setDraft("");
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await save(form);
      if (!res.success) return setMessage({ ok: false, text: VID_ERRORS[res.error] ?? VID_ERRORS.failed });
      setMessage({ ok: true, text: "Modifications enregistrées." });
      router.refresh();
    });
  }

  return (
    <form className="vid-profile-form" onSubmit={submit}>
      <div className="vid-form-grid">
        <label className="adm-field">
          <span>Prénom</span>
          <input maxLength={80} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" />
        </label>
        <label className="adm-field">
          <span>Nom</span>
          <input maxLength={80} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" />
        </label>
        {email !== undefined && (
          <label className="adm-field">
            <span>E-mail (identifiant de connexion)</span>
            <input value={email} readOnly disabled />
          </label>
        )}
        <label className="adm-field">
          <span>Téléphone</span>
          <input type="tel" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" placeholder="06 71 48 22 05" />
        </label>
      </div>
      <fieldset className="vid-specialties">
        <legend>Spécialités</legend>
        <div className="vid-chips">
          {form.specialties.map((s) => (
            <span key={s} className="vid-chip-tag">
              {s}
              <button type="button" onClick={() => setForm({ ...form, specialties: form.specialties.filter((x) => x !== s) })} aria-label={`Retirer ${s}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {SPECIALTY_SUGGESTIONS.filter((s) => !form.specialties.includes(s)).map((s) => (
            <button key={s} type="button" className="vid-chip-add" onClick={() => addSpecialty(s)}>
              + {s}
            </button>
          ))}
        </div>
        <input
          className="adm-select vid-specialty-input"
          maxLength={40}
          value={draft}
          placeholder="Autre spécialité puis Entrée"
          aria-label="Ajouter une spécialité"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSpecialty(draft);
            }
          }}
        />
      </fieldset>
      {message && (
        <p className={message.ok ? "vid-ok" : "adm-error"} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}
      <div>
        <button type="submit" className="adm-btn" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
