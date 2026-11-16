import "server-only";
import { PERSON_NOTIFICATION_IDS, getTeamNotifications, type NotificationId } from "@/lib/notifications";
import { sendPersonNotice, sendTeamNotice } from "@/lib/notify-mail";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Producers of the per-user notification center (migration 010). Rows are written with the service key by
 * the server events that trigger them — never by the browser:
 *   lead_assigned         admin assigns a request / prospect to a sales rep
 *   quote_accepted        the client pays the deposit (Stripe webhook)
 *   invoice_paid          the balance of a sale is recorded as collected
 *   commission_validated  / commission_paid  — admin moves a commission along its workflow
 *   task_assigned         admin creates a task for someone
 *   reminder_due          an open task is due within 24 h (created when the owner's feed is loaded)
 *   project_assigned      admin assigns a video project to a videographer (migration 013)
 *   version_reviewed      the client's answer on a sent version (validated / changes requested), recorded by an admin
 * `data` holds only what the bell displays (reference, client, amount…); texts are rendered in the reader's language.
 * Every function swallows its errors: a notification must never make the real action fail. Before migration 010
 * the table does not exist and nothing is written.
 */

export const NOTIFICATION_TYPES = [
  "lead_assigned",
  "quote_accepted",
  "invoice_paid",
  "commission_validated",
  "commission_paid",
  "task_assigned",
  "reminder_due",
  "project_assigned",
  "version_reviewed",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationData = { reference?: string; client?: string; amountCents?: number; title?: string; dueAt?: string; decision?: "validee" | "modifications" };

type NewNotification = { userId: string; type: NotificationType; data?: NotificationData; link?: string | null; ref: string };

const missingTable = (message: string) => /notifications/.test(message) && /(does not exist|schema cache|relation)/i.test(message);

const personIds = new Set<string>(PERSON_NOTIFICATION_IDS);

const noticeCopy = (type: NotificationType, data: NotificationData): { subject: string; lines: string[] } | null => {
  const who = [data.reference, data.client].filter(Boolean).join(" — ");
  const amount = data.amountCents != null ? `${(data.amountCents / 100).toLocaleString("fr-FR")} €` : "";
  switch (type) {
    case "lead_assigned":
      return { subject: `Lead assigné ${data.reference ?? ""}`.trim(), lines: [who] };
    case "quote_accepted":
      return { subject: `Devis accepté ${data.reference ?? ""}`.trim(), lines: [who, amount && `Acompte ${amount}`] };
    case "invoice_paid":
      return { subject: `Facture encaissée ${data.reference ?? ""}`.trim(), lines: [who, amount] };
    case "commission_validated":
      return { subject: "Commission validée", lines: [amount, who] };
    case "commission_paid":
      return { subject: "Commission payée", lines: [amount, who] };
    case "task_assigned":
      return { subject: `Tâche attribuée${data.title ? ` — ${data.title}` : ""}`, lines: [data.title ?? "", data.dueAt ? `Échéance ${data.dueAt}` : ""] };
    case "reminder_due":
      return { subject: `Rappel${data.title ? ` — ${data.title}` : ""}`, lines: [data.title ?? "", data.dueAt ? `Échéance ${data.dueAt}` : ""] };
    default:
      return null;
  }
};

export async function notify(rows: NewNotification[]) {
  if (!rows.length) return;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notifications")
      .upsert(
        rows.map((r) => ({ user_id: r.userId, type: r.type, data: r.data ?? {}, link: r.link ?? null, ref: r.ref.slice(0, 120) })),
        { onConflict: "user_id,type,ref", ignoreDuplicates: true },
      )
      .select("user_id, type, data");
    if (error) {
      if (!missingTable(error.message)) console.warn("notify failed:", error.message);
      return;
    }
    const fresh = (data ?? []).filter((row) => personIds.has(row.type as string));
    if (!fresh.length) return;
    const prefs = await getTeamNotifications();
    const ids = [...new Set(fresh.map((row) => row.user_id as string))];
    const { data: people } = await admin.from("profiles").select("id, email").in("id", ids);
    const emailOf = new Map((people ?? []).map((p) => [p.id as string, (p.email as string) ?? ""]));
    await Promise.all(
      fresh.map((row) => {
        const type = row.type as NotificationId;
        if (!prefs[type]) return Promise.resolve(false);
        const copy = noticeCopy(type as NotificationType, (row.data ?? {}) as NotificationData);
        const to = emailOf.get(row.user_id as string) ?? "";
        return copy ? sendPersonNotice(to, copy.subject, copy.lines) : Promise.resolve(false);
      }),
    );
  } catch (cause) {
    console.warn("notify failed:", cause);
  }
}

type ProjectInfo = { id: string; reference: string; commercial_id: string | null; company: string | null; first_name: string | null; last_name: string | null; email: string | null };

async function projectInfo(projectId: string) {
  const { data } = await createAdminClient()
    .from("video_projects")
    .select("id, reference, commercial_id, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom, email:contact->>email")
    .eq("id", projectId)
    .maybeSingle();
  return (data as ProjectInfo | null) ?? null;
}
const clientOf = (p: ProjectInfo) => p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";

/** A request / prospect was assigned to this sales rep. One notification per rep and project. */
export async function notifyLeadAssigned(projectId: string, commercialId: string | null) {
  if (!commercialId) return;
  try {
    const p = await projectInfo(projectId);
    if (!p || p.commercial_id !== commercialId) return;
    await notify([{ userId: commercialId, type: "lead_assigned", data: { reference: p.reference, client: clientOf(p) }, link: "/commercial/dashboard", ref: projectId }]);
    await sendTeamNotice("lead", `Lead assigné ${p.reference}`, [clientOf(p), `Référence ${p.reference}`]);
  } catch (cause) {
    console.warn("notifyLeadAssigned failed:", cause);
  }
}

/** Deposit paid (quote accepted) or balance collected (invoice paid) on a project that has a sales rep. */
export async function notifyProjectPayment(type: "quote_accepted" | "invoice_paid", projectId: string, amountCents: number, ref: string) {
  try {
    const p = await projectInfo(projectId);
    if (!p?.commercial_id) return;
    await notify([{ userId: p.commercial_id, type, data: { reference: p.reference, client: clientOf(p), amountCents }, link: "/commercial/dashboard", ref }]);
  } catch (cause) {
    console.warn("notifyProjectPayment failed:", cause);
  }
}

/** A commission was validated or paid by an admin. */
export async function notifyCommission(commissionId: string, status: "validee" | "payee") {
  try {
    const { data: c } = await createAdminClient().from("commissions").select("id, commercial_id, project_id, amount_cents").eq("id", commissionId).maybeSingle();
    if (!c) return;
    const p = c.project_id ? await projectInfo(c.project_id) : null;
    await notify([
      {
        userId: c.commercial_id,
        type: status === "validee" ? "commission_validated" : "commission_paid",
        data: { amountCents: c.amount_cents, reference: p?.reference, client: p ? clientOf(p) : undefined },
        link: "/commercial/dashboard",
        ref: commissionId,
      },
    ]);
    const amount = `${(Number(c.amount_cents) / 100).toLocaleString("fr-FR")} €`;
    await sendTeamNotice("commission", status === "validee" ? "Commission validée" : "Commission payée", [amount, p?.reference ?? "", p ? clientOf(p) : ""]);
  } catch (cause) {
    console.warn("notifyCommission failed:", cause);
  }
}

/** A task was created for this person. */
export async function notifyTaskAssigned(taskId: string, userId: string, title: string, dueAt: string) {
  // The link opens the assignee's own space (sales rep or videographer).
  let link = "/commercial/dashboard";
  try {
    const { data } = await createAdminClient().from("profiles").select("role").eq("id", userId).maybeSingle();
    if (data?.role === "videaste") link = "/videaste/dashboard";
  } catch {
    // Keep the default link: a notification must never make the real action fail.
  }
  await notify([{ userId, type: "task_assigned", data: { title, dueAt }, link, ref: taskId }]);
}

/** Reminders for the owner's open tasks due within 24 h (or overdue): one per task, created when their feed loads. */
export async function createDueReminders(userId: string, tasks: { id: string; title: string; due_at: string; status: string }[], link = "/commercial/dashboard", now = Date.now()) {
  const due = tasks.filter((t) => t.status === "a_faire" && new Date(t.due_at).getTime() <= now + 24 * 3_600_000);
  await notify(due.map((t) => ({ userId, type: "reminder_due" as const, data: { title: t.title, dueAt: t.due_at }, link, ref: t.id })));
}

/** A video project was assigned to this videographer (one notification per project and videographer). */
export async function notifyProjectAssigned(projectId: string, videasteId: string | null) {
  if (!videasteId) return;
  try {
    const p = await projectInfo(projectId);
    if (!p) return;
    await notify([{ userId: videasteId, type: "project_assigned", data: { reference: p.reference, client: clientOf(p) }, link: `/videaste/projet?id=${projectId}`, ref: projectId }]);
  } catch (cause) {
    console.warn("notifyProjectAssigned failed:", cause);
  }
}

/** The client's answer on a version reached the assigned videographer. */
export async function notifyVersionReviewed(versionId: string, projectId: string, videasteId: string | null, decision: "validee" | "modifications", versionLabel: string) {
  if (!videasteId) return;
  try {
    const p = await projectInfo(projectId);
    if (!p) return;
    await notify([
      { userId: videasteId, type: "version_reviewed", data: { reference: p.reference, client: clientOf(p), title: versionLabel, decision }, link: `/videaste/projet?id=${projectId}`, ref: versionId },
    ]);
  } catch (cause) {
    console.warn("notifyVersionReviewed failed:", cause);
  }
}
