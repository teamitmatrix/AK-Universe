import { ClientDashboardView } from "@/components/client/ClientDashboardView";
import { loadClientDashboard } from "@/lib/client/dashboard";
import { requireClient } from "@/lib/client/session";

/** Client space home: current plan, next payment, billing summary and plan management (approved mockup). */
export default async function ClientDashboardPage({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const me = await requireClient("/dashboard");
  const [{ portal }, data] = await Promise.all([searchParams, loadClientDashboard(me)]);
  return <ClientDashboardView me={me} data={data} portalUnavailable={portal === "unavailable"} />;
}
