import { CommercialDashboardView } from "@/components/commercial/CommercialDashboardView";
import { getLang } from "@/i18n/server";
import { loadCommercialDashboard } from "@/lib/commercial/dashboard";
import { requireCommercial } from "@/lib/commercial/session";

/**
 * commercial/dashboard.html (handoff pages 07 / 09): month KPIs, monthly target progress and the widget row
 * "Devis à relancer" · "Prochains rendez-vous" · "Mes tâches du jour". Only the signed-in rep's own data:
 * requireCommercial() checks the session and role here, on every request.
 */
export default async function CommercialDashboardPage() {
  const me = await requireCommercial("/commercial/dashboard");
  const [lang, data] = await Promise.all([getLang(), loadCommercialDashboard(me)]);
  return <CommercialDashboardView lang={lang} data={data} />;
}
