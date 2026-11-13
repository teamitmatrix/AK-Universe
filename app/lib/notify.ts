import "server-only";
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
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationData = { reference?: string; client?: string; amountCents?: number; title?: string; dueAt?: string };

type NewNotification = { userId: string; type: NotificationType; data?: NotificationData; link?: string | null; ref: string };

const missingTable = (message: string) => /notifications/.test(message) && /(does not exist|schema cache|relation)/i.test(message);

export async function notify(rows: NewNotification[]) {
  if (!rows.length) return;
  try {
    const { error } = await createAdminClient()
      .from("notifications")
      .upsert(
        rows.map((r) => ({ user_id: r.userId, type: r.type, data: r.data ?? {}, link: r.link ?? null, ref: r.ref.slice(0, 120) })),
        { onConflict: "user_id,type,ref", ignoreDuplicates: true },
      );
    if (error && !missingTable(error.message)) console.warn("notify failed:", error.message);
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
  } catch (cause) {
    console.warn("notifyCommission failed:", cause);
  }
}

/** A task was created for this person. */
export async function notifyTaskAssigned(taskId: string, userId: string, title: string, dueAt: string) {
  await notify([{ userId, type: "task_assigned", data: { title, dueAt }, link: "/commercial/dashboard", ref: taskId }]);
}

/** Reminders for the owner's open tasks due within 24 h (or overdue): one per task, created when their feed loads. */
export async function createDueReminders(userId: string, tasks: { id: string; title: string; due_at: string; status: string }[], now = Date.now()) {
  const due = tasks.filter((t) => t.status === "a_faire" && new Date(t.due_at).getTime() <= now + 24 * 3_600_000);
  await notify(due.map((t) => ({ userId, type: "reminder_due" as const, data: { title: t.title, dueAt: t.due_at }, link: "/commercial/dashboard", ref: t.id })));
}
