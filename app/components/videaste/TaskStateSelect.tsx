"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setMyTaskState } from "@/lib/videaste/actions";
import type { TaskState } from "@/lib/videaste/dashboard";

const LABEL: Record<TaskState, string> = { a_faire: "À faire", en_cours: "En cours", fait: "Fait" };
const ERRORS: Record<string, string> = {
  forbidden: "Accès refusé.",
  invalid: "Statut invalide.",
  notFound: "Cette tâche n'existe plus ou ne vous est pas attribuée.",
  notReady: "Le statut « En cours » sera disponible après la migration 013.",
  failed: "La mise à jour a échoué. Réessayez.",
};

/**
 * Inline status of a task (dashboard "À faire aujourd'hui"). The server action re-checks the videographer and the
 * database only updates a task assigned to them; the page then re-renders from the server (source of truth).
 */
export function TaskStateSelect({ id, title, state, progressReady }: { id: string; title: string; state: TaskState; progressReady: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(state);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const options: TaskState[] = progressReady || state === "en_cours" ? ["a_faire", "en_cours", "fait"] : ["a_faire", "fait"];

  function change(next: TaskState) {
    const previous = value;
    setValue(next);
    setError(null);
    start(async () => {
      const res = await setMyTaskState(id, next);
      if (!res.success) {
        setValue(previous);
        setError(ERRORS[res.error] ?? ERRORS.failed);
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="vid-state">
      <select
        className={`adm-select sm vid-state-select is-${value}`}
        value={value}
        disabled={pending}
        aria-label={`Statut de la tâche « ${title} »`}
        onChange={(e) => change(e.target.value as TaskState)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {LABEL[o]}
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
