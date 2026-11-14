/*
 * Production workflow of a video project (Espace Vidéaste handoff, page 04) and the deadline colour rule.
 * Shared by the server loaders and the client views (no server-only imports here).
 */

export const STAGES = ["brief_recu", "tournage", "montage", "a_valider", "modifications", "valide", "livre"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  brief_recu: "Brief reçu",
  tournage: "Tournage",
  montage: "Montage",
  a_valider: "À faire valider",
  modifications: "Modifications",
  valide: "Validé",
  livre: "Livré",
};

/** Badge tone of each stage (admin.css .adm-badge variants, re-themed gold in commercial.css; "is-blue" in videaste.css). */
export const STAGE_TONE: Record<Stage, string> = {
  brief_recu: "is-muted",
  tournage: "is-blue",
  montage: "is-info",
  a_valider: "is-warn",
  modifications: "is-danger",
  valide: "is-ok",
  livre: "is-ok",
};

/**
 * Progress shown on project cards, derived from the stage only (no separate "percent" is stored, so the bar can
 * never contradict the stage badge).
 */
export const STAGE_PROGRESS: Record<Stage, number> = {
  brief_recu: 10,
  tournage: 30,
  montage: 60,
  modifications: 75,
  a_valider: 85,
  valide: 95,
  livre: 100,
};

export const isStage = (v: unknown): v is Stage => typeof v === "string" && (STAGES as readonly string[]).includes(v);

/** Work is finished from the videographer's side (approved or delivered). */
export const isDoneStage = (s: Stage) => s === "valide" || s === "livre";

/**
 * Before migration 013 there is no stage column: a starting stage is derived from the commercial status
 * (same mapping as the migration's backfill). null = cancelled, not shown.
 */
export function stageFromStatus(status: string): Stage | null {
  switch (status) {
    case "nouveau":
    case "acompte_en_attente":
    case "acompte_paye":
      return "brief_recu";
    case "en_cours":
      return "montage";
    case "termine":
      return "livre";
    default:
      return null;
  }
}

/**
 * Deadline colour (handoff page 04, "stay elegant"): red ONLY for overdue or due today, orange within the next
 * 3 days, green when already done. Anything else stays neutral — no other urgency colours.
 */
export type Urgency = "late" | "soon" | "done" | "none";
export function urgencyOf(dueKey: string | null, todayKey: string, done: boolean): Urgency {
  if (done) return "done";
  if (!dueKey) return "none";
  if (dueKey <= todayKey) return "late";
  return daysBetween(todayKey, dueKey) <= 3 ? "soon" : "none";
}

/** Whole days from one "YYYY-MM-DD" key to another. */
export function daysBetween(fromKey: string, toKey: string) {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}
