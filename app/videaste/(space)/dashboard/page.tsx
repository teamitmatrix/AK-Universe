import { VideasteDashboardView } from "@/components/videaste/VideasteDashboardView";
import { loadVideasteDashboard } from "@/lib/videaste/dashboard";
import { requireVideaste } from "@/lib/videaste/session";

/**
 * videaste/dashboard.html (Espace Vidéaste handoff, page 05): the videographer's day at a glance. Only their own
 * projects and tasks: requireVideaste() checks the session, the role and the active flag here, on every request.
 */
export default async function VideasteDashboardPage() {
  const me = await requireVideaste("/videaste/dashboard");
  return <VideasteDashboardView data={await loadVideasteDashboard(me)} />;
}
