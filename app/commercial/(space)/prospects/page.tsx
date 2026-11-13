import { AlarmClock, Info, Layers, Percent, Euro } from "lucide-react";
import { Kpi, formatters } from "@/components/admin/space/ui";
import { ProspectsBoard } from "@/components/commercial/ProspectsBoard";
import { comTextFor } from "@/components/commercial/comText";
import { localeOf } from "@/config/languages";
import { getLang } from "@/i18n/server";
import { loadPipeline } from "@/lib/commercial/prospects";
import { requireCommercial } from "@/lib/commercial/session";

/**
 * commercial/prospects.html (handoff pages 05–06): the rep's own prospect pipeline as a 7-stage Kanban board.
 * requireCommercial() checks the session and role on every request; loadPipeline only returns the rep's rows.
 */
export default async function ProspectsPage() {
  const me = await requireCommercial("/commercial/prospects");
  const [lang, data] = await Promise.all([getLang(), loadPipeline(me)]);
  const t = comTextFor(lang).pipeline;
  const f = formatters(localeOf(lang));

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
      </div>

      {!data.ready ? (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          {t.notReady}
        </p>
      ) : (
        <>
          <div className="adm-kpis com-kpis">
            <Kpi Icon={Layers} label={t.kpis.active} value={f.num(data.kpis.active)} />
            <Kpi Icon={Euro} label={t.kpis.value} hint={t.hints.value} value={f.euros(data.kpis.pipelineCents)} hero />
            <Kpi Icon={Percent} label={t.kpis.conversion} hint={t.hints.conversion} value={data.kpis.conversion === null ? "—" : `${data.kpis.conversion} %`} />
            <Kpi Icon={AlarmClock} label={t.kpis.late} hint={t.hints.late} value={f.num(data.kpis.lateFollowups)} />
          </div>
          <ProspectsBoard cards={data.cards} now={data.now} />
        </>
      )}
    </div>
  );
}
