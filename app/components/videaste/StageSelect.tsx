"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setProjectStage } from "@/lib/videaste/project-actions";
import { STAGES, STAGE_LABEL, type Stage } from "@/lib/videaste/stages";
import { VID_ERRORS } from "./vidUi";

/**
 * Stage dropdown of a project. Options the videographer may not pick are shown disabled (À faire valider comes from
 * sending a version; Validé / Modifications only from the client's answer; Livré only once validated) — but the real
 * check is in the database (set_project_stage), whatever this list shows.
 */
export function allowedStages(current: Stage): Set<Stage> {
  if (current === "livre") return new Set([current]);
  const ok = new Set<Stage>(["brief_recu", "tournage", "montage", current]);
  if (current === "valide") ok.add("livre");
  return ok;
}

export function StageSelect({ projectId, stage, title }: { projectId: string; stage: Stage; title: string }) {
  const router = useRouter();
  const [value, setValue] = useState(stage);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const allowed = allowedStages(stage);

  function change(next: Stage) {
    const previous = value;
    setValue(next);
    setError(null);
    start(async () => {
      const res = await setProjectStage(projectId, next);
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
      <select
        className="adm-select vid-stage-select"
        value={value}
        disabled={pending || stage === "livre"}
        aria-label={`Étape du projet « ${title} »`}
        onChange={(e) => change(e.target.value as Stage)}
      >
        {STAGES.map((s) => (
          <option key={s} value={s} disabled={!allowed.has(s)}>
            {STAGE_LABEL[s]}
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
