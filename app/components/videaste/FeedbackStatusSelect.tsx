"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setFeedbackStatus } from "@/lib/videaste/project-actions";
import { VID_ERRORS } from "./vidUi";

export type FeedbackStatus = "a_traiter" | "en_cours" | "corrige";
export const FEEDBACK_LABEL: Record<FeedbackStatus, string> = { a_traiter: "À traiter", en_cours: "En cours", corrige: "Corrigé" };

/** Quick handling status of a client feedback (À traiter / En cours / Corrigé), saved through set_feedback_status. */
export function FeedbackStatusSelect({ id, status, label }: { id: string; status: FeedbackStatus; label: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function change(next: FeedbackStatus) {
    const previous = value;
    setValue(next);
    setError(null);
    start(async () => {
      const res = await setFeedbackStatus(id, next);
      if (!res.success) {
        setValue(previous);
        setError(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="vid-state">
      <select className={`adm-select sm vid-state-select is-fb-${value}`} value={value} disabled={pending} aria-label={`Statut du retour « ${label} »`} onChange={(e) => change(e.target.value as FeedbackStatus)}>
        {(Object.keys(FEEDBACK_LABEL) as FeedbackStatus[]).map((s) => (
          <option key={s} value={s}>
            {FEEDBACK_LABEL[s]}
          </option>
        ))}
      </select>
      {error && (
        <small className="vid-state-error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
