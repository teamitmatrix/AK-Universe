import type { TeamProject } from "@/lib/admin/team";
import type { DashText } from "./dashText";
import type { Fmt } from "./ui";

/** Assigned video projects (detail pages). Card layout on phones via admin.css. */
export function ProjectTable({
  t,
  f,
  projects,
  statuses,
  today,
  showDeadline = true,
  showRevisions = false,
  empty,
}: {
  t: DashText;
  f: Fmt;
  projects: TeamProject[];
  statuses: Record<string, string>;
  today: string;
  showDeadline?: boolean;
  showRevisions?: boolean;
  empty: string;
}) {
  if (projects.length === 0) return <p className="adm-empty">{empty}</p>;
  const d = t.detail;
  const active = (s: string) => s !== "termine" && s !== "annule";

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>
            <th scope="col">{d.reference}</th>
            <th scope="col">{d.client}</th>
            <th scope="col">{d.status}</th>
            {showDeadline && <th scope="col">{d.deadline}</th>}
            {showRevisions && <th scope="col" className="num">{t.videastes.detail.revisionCol}</th>}
            <th scope="col" className="num">{d.total}</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const overdue = active(p.status) && p.deadline && p.deadline < today;
            return (
              <tr key={p.id}>
                <td data-label={d.reference}>
                  <strong>{p.reference}</strong>
                  <small className="adm-muted"> · {f.date(p.created_at)}</small>
                </td>
                <td data-label={d.client}>{p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td data-label={d.status}>
                  <span className={`adm-badge ${p.status === "termine" ? "is-ok" : p.status === "annule" ? "is-muted" : p.status === "nouveau" || p.status === "acompte_en_attente" ? "is-warn" : "is-info"}`}>
                    {statuses[p.status] ?? p.status}
                  </span>
                </td>
                {showDeadline && (
                  <td data-label={d.deadline}>{p.deadline ? <span className={overdue ? "adm-badge is-danger" : undefined}>{f.date(p.deadline)}</span> : "—"}</td>
                )}
                {showRevisions && (
                  <td data-label={t.videastes.detail.revisionCol} className="num">
                    {(p.revision_rounds ?? 0) > 0 ? <span className="adm-badge is-warn">{f.num(p.revision_rounds ?? 0)}</span> : "0"}
                  </td>
                )}
                <td data-label={d.total} className="num">{f.euros(p.total_cents)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
