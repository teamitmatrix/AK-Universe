import Link from "next/link";
import { CalendarX, CircleCheck, Film, Hourglass, Layers, Pencil, Users } from "lucide-react";
import { localeOf, type Lang } from "@/config/languages";
import type { loadVideoProjects, ProjectFilter } from "@/lib/admin/projects";
import { UNASSIGNED } from "@/lib/admin/projects";
import { STAGES, STAGE_LABEL } from "@/lib/videaste/stages";
import { adminTextFor } from "../adminText";
import { AdmShell } from "./AdmShell";
import { FilterBar } from "./CrmClient";
import { dashTextFor } from "./dashText";
import { toolsTextFor } from "./toolsText";
import { Kpi, MigrationNote, PageHead, formatters } from "./ui";
import { AdminStageSelect, LateOnlyToggle, ReassignSelect, VersionReviewButton } from "./VideasteProjectControls";

const STATUS_CLASS: Record<string, string> = {
  nouveau: "is-warn",
  acompte_en_attente: "is-warn",
  acompte_paye: "is-info",
  en_cours: "is-info",
  termine: "is-ok",
  annule: "is-muted",
};

export function ProjectsView({
  lang,
  admin,
  data,
  filter,
}: {
  lang: Lang;
  admin: { name: string; email: string };
  data: Awaited<ReturnType<typeof loadVideoProjects>>;
  filter: ProjectFilter;
}) {
  const dt = dashTextFor(lang);
  const p = toolsTextFor(lang).projets;
  const statuses = adminTextFor(lang).projects.statuses;
  const f = formatters(localeOf(lang));

  return (
    <AdmShell t={dt} active="projets" admin={admin}>
      <div className="adm-content">
        <PageHead title={p.title} subtitle={p.subtitle}>
          <Link href="/admin?vue=demandes" className="adm-btn is-ghost">
            <Pencil size={15} aria-hidden="true" />
            {p.edit}
          </Link>
        </PageHead>
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={Layers} label={p.kpi.active} value={f.num(data.kpis.active)} />
          <Kpi Icon={CircleCheck} label={p.kpi.delivered} value={f.num(data.kpis.delivered)} />
          <Kpi Icon={CalendarX} label={p.kpi.late} value={f.num(data.kpis.late)} />
          <Kpi Icon={Hourglass} label="Versions à valider" hint="Versions envoyées par les vidéastes, en attente de la réponse du client." value={data.stagesReady ? f.num(data.kpis.pending) : "—"} />
          <Kpi Icon={Users} label="Vidéastes actifs" value={`${data.kpis.activeVideastes} / ${data.kpis.totalVideastes}`} />
          <Kpi Icon={Film} label={p.kpi.total} value={f.num(data.kpis.total)} />
        </section>
        {!data.assignment && <MigrationNote t={dt} />}
        {data.assignment && !data.stagesReady && (
          <p className="adm-note">Étapes de production, réassignation en ligne et validation des versions : disponibles après l&apos;application de la migration 013.</p>
        )}
        <section className="adm-card" aria-labelledby="adm-projects">
          <header className="adm-card-head">
            <h2 id="adm-projects">
              <Film size={17} aria-hidden="true" />
              {p.list}
            </h2>
            <span className="adm-muted adm-small">{dt.crm.results(data.rows.length)}</span>
          </header>
          <FilterBar
            fields={[
              {
                name: "videaste",
                label: p.allVideastes,
                value: filter.videaste,
                options: [
                  { value: "", label: p.allVideastes },
                  { value: UNASSIGNED, label: dt.crm.filters.unassigned },
                  ...data.videastes.map((v) => ({ value: v.id, label: v.active ? v.name : `${v.name} (${dt.team.inactive})` })),
                ],
              },
              {
                name: "client",
                label: "Tous les clients",
                value: filter.client,
                options: [{ value: "", label: "Tous les clients" }, ...data.clients.map((c) => ({ value: c, label: c }))],
              },
              {
                name: "statut",
                label: p.allStatuses,
                value: filter.status,
                options: [
                  { value: "", label: p.allStatuses },
                  ...(data.stagesReady ? STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] })) : []),
                  ...data.statuses.map((s) => ({ value: s, label: `${data.stagesReady ? "Paiement : " : ""}${statuses[s] ?? s}` })),
                ],
              },
            ]}
          />
          <LateOnlyToggle checked={filter.late} />
          {data.rows.length === 0 ? (
            <p className="adm-empty">{p.empty}</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{p.cols.project}</th>
                    <th scope="col">{p.cols.client}</th>
                    <th scope="col">{p.cols.videaste}</th>
                    <th scope="col">{p.cols.deadline}</th>
                    {data.stagesReady && <th scope="col">Étape</th>}
                    <th scope="col">{data.stagesReady ? "Paiement" : p.cols.status}</th>
                    {data.hasRevisions && <th scope="col" className="num">{p.cols.revisions}</th>}
                    <th scope="col" className="num">{p.cols.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label={p.cols.project}>
                        <span className="adm-stack">
                          <strong>{r.title}</strong>
                          <span className="adm-person-mail">
                            {r.reference}
                            {r.commercial ? ` · ${r.commercial}` : ""}
                          </span>
                        </span>
                      </td>
                      <td data-label={p.cols.client}>{r.client}</td>
                      <td data-label={p.cols.videaste}>
                        {data.stagesReady ? (
                          <span className="adm-stack">
                            <ReassignSelect projectId={r.id} value={r.videasteId} videastes={data.videastes} label={r.title} />
                            {r.videasteId && (
                              <Link href={`/admin/videaste-detail?id=${r.videasteId}`} className="adm-person-mail">
                                Voir la fiche
                              </Link>
                            )}
                          </span>
                        ) : r.videaste && r.videasteId ? (
                          <Link href={`/admin/videaste-detail?id=${r.videasteId}`} className="adm-person">
                            {r.videaste}
                          </Link>
                        ) : (
                          <span className="adm-muted">{dt.crm.filters.unassigned}</span>
                        )}
                      </td>
                      <td data-label={p.cols.deadline}>{r.deadline ? <span className={r.late ? "adm-badge is-danger" : undefined}>{f.date(r.deadline)}</span> : "—"}</td>
                      {data.stagesReady && (
                        <td data-label="Étape">
                          <span className="adm-stack">
                            {r.stage && <AdminStageSelect projectId={r.id} stage={r.stage} label={r.title} />}
                            {r.pending && <VersionReviewButton version={r.pending} project={`${r.title} — ${r.client}`} />}
                          </span>
                        </td>
                      )}
                      <td data-label={data.stagesReady ? "Paiement" : p.cols.status}>
                        <span className={`adm-badge ${STATUS_CLASS[r.status] ?? "is-info"}`}>{statuses[r.status] ?? r.status}</span>
                      </td>
                      {data.hasRevisions && (
                        <td data-label={p.cols.revisions} className="num">
                          {(r.revisions ?? 0) > 0 ? <span className="adm-badge is-warn">{f.num(r.revisions ?? 0)}</span> : "0"}
                        </td>
                      )}
                      <td data-label={p.cols.total} className="num">{f.euros(r.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdmShell>
  );
}
