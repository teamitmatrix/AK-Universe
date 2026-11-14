"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { setProjectStage } from "@/lib/videaste/project-actions";
import { VID_ERRORS } from "./vidUi";

/** "Commencer": moves the project to "Montage" (re-checked by set_project_stage), then opens it. */
export function StartEditingButton({ projectId, title }: { projectId: string; title: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="vid-card-action">
      <button
        type="button"
        className="adm-btn sm vid-card-open"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await setProjectStage(projectId, "montage");
            if (!res.success) return setError(VID_ERRORS[res.error] ?? VID_ERRORS.failed);
            router.push(`/videaste/projet?id=${projectId}`);
          })
        }
        aria-label={`Commencer le montage de « ${title} »`}
      >
        <Play size={14} aria-hidden="true" /> {pending ? "…" : "Commencer"}
      </button>
      {error && (
        <small className="vid-state-error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
