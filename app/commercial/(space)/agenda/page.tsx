import { BellRing, CalendarDays, Info, ListChecks, Phone } from "lucide-react";
import { Kpi } from "@/components/admin/space/ui";
import { AgendaView } from "@/components/commercial/AgendaView";
import { loadMyAgenda, type AgendaFilter } from "@/lib/commercial/agenda";
import { requireCommercial } from "@/lib/commercial/session";

const FILTERS: AgendaFilter[] = ["", "rdv", "appel", "rappel", "visite"];

/**
 * commercial/agenda.html (handoff pages 05–06): the rep's own calendar and tasks.
 * requireCommercial() checks the role here; loadMyAgenda is filtered on the rep's id and runs with their session (RLS).
 */
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const me = await requireCommercial("/commercial/agenda");
  const raw = (await searchParams).type ?? "";
  const filter = (FILTERS.includes(raw as AgendaFilter) ? raw : "") as AgendaFilter;
  const data = await loadMyAgenda(me, filter);

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Agenda</h2>
          <p>Rendez-vous, appels, relances et tâches à venir.</p>
        </div>
      </div>
      {!data.eventsReady && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Vos propres événements seront disponibles après l&apos;application de la migration 012. Les tâches données par l&apos;administrateur s&apos;affichent déjà.
        </p>
      )}
      <div className="adm-kpis com-kpis">
        <Kpi Icon={CalendarDays} label="RDV cette semaine" value={String(data.kpis.meetingsWeek)} hero />
        <Kpi Icon={Phone} label="Appels prévus" value={String(data.kpis.calls)} />
        <Kpi Icon={BellRing} label="Relances à faire" value={String(data.kpis.followUps)} />
        <Kpi Icon={ListChecks} label="Tâches en cours" value={String(data.kpis.openTasks)} />
      </div>
      <AgendaView items={data.items} panel={data.panel} filter={filter} today={data.todayKey} eventsReady={data.eventsReady} ownTasksReady={data.ownTasksReady} />
    </div>
  );
}
