/** Pipeline of the Commercial space (handoff page 05) — same values as the CHECK constraint of migration 011. */
export const STAGES = ["nouveau", "contacte", "qualifie", "devis_envoye", "negociation", "gagne", "perdu"] as const;
export type Stage = (typeof STAGES)[number];
/** Stages still in progress (counted in the pipeline value and the follow-up reminders). */
export const OPEN_STAGES: readonly Stage[] = ["nouveau", "contacte", "qualifie", "devis_envoye", "negociation"];
export const isStage = (v: unknown): v is Stage => STAGES.includes(v as Stage);

/** Where a lead came from (free text in the database, these are the choices offered in the form). */
export const SOURCES = ["site_web", "recommandation", "appel_entrant", "salon", "reseaux_sociaux", "prospection", "autre"] as const;
export type Source = (typeof SOURCES)[number];

export type ProspectCard = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  need: string | null;
  budgetCents: number | null;
  stage: Stage;
  nextAction: string | null;
  nextFollowupAt: string | null;
  notes: string | null;
  lostReason: string | null;
  projectReference: string | null;
  customerId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProspectEvent = { id: number; kind: "created" | "stage" | "converted" | "reassigned"; fromStage: string | null; toStage: string | null; actor: string | null; at: string };
