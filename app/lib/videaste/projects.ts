import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/lib/commercial/time";
import { STAGE_PROGRESS, isDoneStage, isStage, stageFromStatus, urgencyOf, type Stage, type Urgency } from "./stages";
import { PROVIDERS, thumbnailOf, type FileCategory, type Provider } from "./storage";
import type { VideasteMe } from "./session";

const isProvider = (v: string): v is Provider => v in PROVIDERS;

/*
 * The videographer's projects (Espace Vidéaste handoff, pages 04–09). Every query is filtered on the videographer's
 * id AND runs with their own session, so RLS (video_projects.videaste_id = auth.uid(); briefs, files, versions and
 * feedback through is_project_videaste()) re-checks it in the database: another videographer's project can never be
 * returned, even by typing its id in the URL.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

const BASE_COLUMNS =
  "id, reference, status, deadline, revision_rounds, created_at, updated_at, items, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom, email:contact->>email, phone:contact->>tel, place:contact->>lieu, wished_date:contact->>date, message:contact->>message";
const STAGE_COLUMNS = ", stage, stage_changed_at";

type ProjectRow = {
  id: string;
  reference: string;
  status: string;
  deadline: string | null;
  revision_rounds: number | null;
  created_at: string;
  updated_at: string;
  items: { service?: string; details?: string; price?: number }[] | null;
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  place: string | null;
  wished_date: string | null;
  message: string | null;
  stage?: string | null;
  stage_changed_at?: string | null;
};

export type MyProject = ReturnType<typeof toProject>;

const clientOf = (p: ProjectRow) => p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";
const servicesOf = (p: ProjectRow) => (Array.isArray(p.items) ? p.items : []).map((i) => i?.service).filter((s): s is string => Boolean(s));

function toProject(p: ProjectRow, stagesReady: boolean, todayKey: string, extra?: { videoType?: string | null; thumbUrl?: string | null; coverProvider?: Provider | null }) {
  const stage: Stage = (isStage(p.stage) ? p.stage : stageFromStatus(p.status)) ?? "brief_recu";
  const services = servicesOf(p);
  return {
    id: p.id,
    reference: p.reference,
    title: services.length ? (services.length > 1 ? `${services[0]} + ${services.length - 1}` : services[0]) : `Projet ${p.reference}`,
    services,
    client: clientOf(p),
    status: p.status,
    stage,
    // Before 013, "delivered this month" falls back to the last update of a finished project.
    stageAt: stagesReady ? (p.stage_changed_at ?? null) : p.status === "termine" ? p.updated_at : null,
    deadline: p.deadline,
    progress: STAGE_PROGRESS[stage],
    urgency: urgencyOf(p.deadline, todayKey, isDoneStage(stage)) as Urgency,
    revisionRounds: p.revision_rounds ?? 0,
    createdAt: p.created_at,
    /** Brief video type when filled; otherwise the first catalogue service name. */
    videoType: extra?.videoType || services[0] || null,
    /** Derived preview from Drive/Dropbox when possible — never a file we host. */
    thumbUrl: extra?.thumbUrl ?? null,
    coverProvider: extra?.coverProvider ?? null,
  };
}

type CoverPick = { thumbUrl: string | null; coverProvider: Provider | null };

/** Latest version first, then image/export files — pick a real preview URL when the provider exposes one. */
function pickCover(
  versions: { project_id: string; external_url: string; provider: string; number: number }[],
  files: { project_id: string; external_url: string; provider: string; category: string; created_at: string }[],
  projectId: string,
): CoverPick {
  const vRows = versions.filter((v) => v.project_id === projectId).sort((a, b) => b.number - a.number);
  const fRows = files
    .filter((f) => f.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const row of [...vRows, ...fRows]) {
    if (!isProvider(row.provider)) continue;
    const thumb = thumbnailOf(row.external_url, row.provider);
    if (thumb) return { thumbUrl: thumb, coverProvider: row.provider };
  }
  const first = vRows[0] ?? fRows[0];
  if (!first || !isProvider(first.provider)) return { thumbUrl: null, coverProvider: null };
  return { thumbUrl: null, coverProvider: first.provider };
}

/** Brief video_type + cover media for the project cards (batch, own projects only via RLS). */
async function loadCardExtras(supabase: Supabase, projectIds: string[], stagesReady: boolean) {
  const empty = new Map<string, { videoType: string | null } & CoverPick>();
  if (!stagesReady || projectIds.length === 0) return empty;
  const [briefs, versions, files] = await Promise.all([
    supabase.from("project_briefs").select("project_id, video_type").in("project_id", projectIds).limit(500),
    supabase.from("project_versions").select("project_id, external_url, provider, number").in("project_id", projectIds).order("number", { ascending: false }).limit(2000),
    supabase
      .from("project_files")
      .select("project_id, external_url, provider, category, created_at")
      .in("project_id", projectIds)
      .in("category", ["images", "exports", "versions_finales"])
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const videoTypeOf = new Map((briefs.data ?? []).map((b) => [b.project_id as string, (b.video_type as string | null) || null]));
  const vRows = (versions.error ? [] : (versions.data ?? [])) as { project_id: string; external_url: string; provider: string; number: number }[];
  const fRows = (files.error ? [] : (files.data ?? [])) as { project_id: string; external_url: string; provider: string; category: string; created_at: string }[];
  for (const id of projectIds) {
    empty.set(id, { videoType: videoTypeOf.get(id) ?? null, ...pickCover(vRows, fRows, id) });
  }
  return empty;
}

async function selectMine(supabase: Supabase, me: VideasteMe, id?: string) {
  for (const withStage of [true, false]) {
    let q = supabase
      .from("video_projects")
      .select(BASE_COLUMNS + (withStage ? STAGE_COLUMNS : ""))
      .eq("videaste_id", me.id)
      .neq("status", "annule");
    if (id) q = q.eq("id", id);
    const { data, error } = await q.order("deadline", { ascending: true, nullsFirst: false }).limit(id ? 1 : 500);
    if (!error) return { rows: (data ?? []) as unknown as ProjectRow[], stagesReady: withStage };
    if (!withStage) console.error("Videaste: video_projects failed:", error.message);
  }
  return { rows: [] as ProjectRow[], stagesReady: false };
}

/** Every project assigned to the videographer (cancelled ones excluded), soonest deadline first. */
export async function loadMyProjects(me: VideasteMe, now = new Date()) {
  const supabase = await createClient();
  const todayKey = dayKey(now);
  const { rows, stagesReady } = await selectMine(supabase, me);
  const extras = await loadCardExtras(
    supabase,
    rows.map((r) => r.id),
    stagesReady,
  );
  return {
    todayKey,
    stagesReady,
    projects: rows.map((r) => toProject(r, stagesReady, todayKey, extras.get(r.id))),
  };
}

export type Brief = {
  objective: string | null;
  main_message: string | null;
  audience: string | null;
  style: string | null;
  style_references: string | null;
  call_to_action: string | null;
  extra_notes: string | null;
  video_type: string | null;
  duration: string | null;
  format: string | null;
  resolution: string | null;
  video_count: number | null;
  platform: string | null;
  updated_at?: string;
};
export type ProjectFile = { id: string; project_id: string; category: FileCategory; name: string; external_url: string; provider: Provider; added_by: string | null; created_at: string };
export type ProjectVersion = {
  id: string;
  number: number;
  label: string | null;
  external_url: string;
  provider: Provider;
  notes: string | null;
  status: "brouillon" | "envoyee" | "validee" | "modifications";
  client_comment: string | null;
  author_id: string | null;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
};
export type Feedback = { id: string; project_id: string; version_id: string | null; comment: string; status: "a_traiter" | "en_cours" | "corrige"; deadline: string | null; created_at: string };

/**
 * One project with its brief, files, versions and client feedback — or null when it does not exist or is not
 * assigned to this videographer (the page then answers 404, never "forbidden", so ids cannot be probed).
 */
export async function loadMyProject(me: VideasteMe, id: string, now = new Date()) {
  const supabase = await createClient();
  const todayKey = dayKey(now);
  const { rows, stagesReady } = await selectMine(supabase, me, id);
  const row = rows[0];
  if (!row) return null;

  const [brief, files, versions, feedback] = stagesReady
    ? await Promise.all([
        supabase.from("project_briefs").select("*").eq("project_id", id).maybeSingle(),
        supabase.from("project_files").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(300),
        supabase.from("project_versions").select("*").eq("project_id", id).order("number", { ascending: false }).limit(100),
        supabase.from("client_feedback").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(100),
      ])
    : [null, null, null, null];
  const workspaceReady = Boolean(stagesReady && brief && !brief.error && files && !files.error && versions && !versions.error);
  const briefData = (workspaceReady ? (brief?.data as Brief | null) : null) ?? null;
  const versionRows = workspaceReady ? ((versions?.data ?? []) as ProjectVersion[]) : [];
  const fileRows = workspaceReady ? ((files?.data ?? []) as ProjectFile[]) : [];
  const cover = pickCover(
    versionRows.map((v) => ({ project_id: id, external_url: v.external_url, provider: v.provider, number: v.number })),
    fileRows.map((f) => ({ project_id: id, external_url: f.external_url, provider: f.provider, category: f.category, created_at: f.created_at })),
    id,
  );

  return {
    todayKey,
    stagesReady,
    workspaceReady,
    project: toProject(row, stagesReady, todayKey, { videoType: briefData?.video_type ?? null, ...cover }),
    request: {
      items: (Array.isArray(row.items) ? row.items : []).filter((i) => i?.service).map((i) => ({ service: String(i.service), details: i.details ? String(i.details) : null })),
      message: row.message,
      contactEmail: row.email,
      contactPhone: row.phone,
      place: row.place,
      wishedDate: row.wished_date,
    },
    brief: briefData,
    files: fileRows,
    versions: versionRows,
    feedback: workspaceReady && feedback && !feedback.error ? ((feedback.data ?? []) as Feedback[]) : [],
    meId: me.id,
  };
}
export type MyProjectDetail = NonNullable<Awaited<ReturnType<typeof loadMyProject>>>;

/** All file links of the videographer's projects (Fichiers). RLS only returns files of projects assigned to them. */
export async function loadMyFiles(me: VideasteMe) {
  const { projects, stagesReady } = await loadMyProjects(me);
  if (!stagesReady || projects.length === 0) return { ready: stagesReady, projects, files: [] as ProjectFile[] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .in(
      "project_id",
      projects.map((p) => p.id),
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  return { ready: !error, projects, files: error ? [] : ((data ?? []) as ProjectFile[]) };
}

/** Client feedback on the videographer's projects (Retours clients). */
export async function loadMyFeedback(me: VideasteMe) {
  const { projects, stagesReady, todayKey } = await loadMyProjects(me);
  if (!stagesReady || projects.length === 0) return { ready: stagesReady, todayKey, items: [] };
  const supabase = await createClient();
  const byId = new Map(projects.map((p) => [p.id, p]));
  const [fb, versions] = await Promise.all([
    supabase.from("client_feedback").select("*").in("project_id", [...byId.keys()]).order("created_at", { ascending: false }).limit(500),
    supabase.from("project_versions").select("id, number, label").in("project_id", [...byId.keys()]).limit(2000),
  ]);
  if (fb.error) return { ready: false, todayKey, items: [] };
  const versionLabel = new Map((versions.data ?? []).map((v) => [v.id as string, (v.label as string | null) || `V${v.number}`]));
  return {
    ready: true,
    todayKey,
    items: ((fb.data ?? []) as Feedback[])
      .filter((f) => byId.has(f.project_id))
      .map((f) => ({ ...f, project: byId.get(f.project_id)!, version: f.version_id ? (versionLabel.get(f.version_id) ?? null) : null })),
  };
}
