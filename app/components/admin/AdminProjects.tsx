"use client";

import { localeOf } from "@/config/languages";
import { useState, useTransition } from "react";
import { PROJECT_STATUS } from "@/config/projects";
import { updateProjectStatus } from "@/lib/admin/actions";
import { assignProject } from "@/lib/admin/team-actions";
import { useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { adminTextFor } from "./adminText";

export type AdminProject = {
  id: string;
  reference: string;
  kind: "devis" | "acompte";
  status: string;
  contact: Record<string, string>;
  items: { service: string; details: string; price: number }[];
  total_cents: number;
  deposit_cents: number;
  created_at: string;
  /** Present once migration 005 is applied (revision_rounds after 006). */
  commercial_id?: string | null;
  videaste_id?: string | null;
  deadline?: string | null;
  revision_rounds?: number | null;
};

export type AssignableStaff = { commerciaux: { id: string; name: string }[]; videastes: { id: string; name: string }[] };

/** Quotes and bookings received from finaliser.html / acompte.html (table video_projects). */
export function AdminProjects({ projects, staff = null }: { projects: AdminProject[]; staff?: AssignableStaff | null }) {
  const [rows, setRows] = useState(projects);
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, toastNode] = useToast();
  const [lang] = useLang();
  const all = adminTextFor(lang);
  const t = all.projects;
  const locale = localeOf(lang);

  const euros = (cents: number) => `${(cents / 100).toLocaleString(locale)} €`;
  const when = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const visible = filter ? rows.filter((p) => p.status === filter) : rows;

  const changeStatus = (id: string, status: string) =>
    startTransition(async () => {
      const result = await updateProjectStatus(id, status);
      if (!result.success) return toast(all.errors[result.error]);
      setRows((current) => current.map((p) => (p.id === id ? { ...p, status } : p)));
      toast(t.updated);
    });

  return (
    <main className="container admin">
      <h1>
        {t.title[0]}
        <span className="gold">{t.title[1]}</span>
      </h1>
      <p className="admin-note">{t.note}</p>

      <section className="admin-projects">
        <div className="admin-global">
          <label>
            {t.filter}{" "}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">
                {t.all} ({rows.length})
              </option>
              {Object.keys(PROJECT_STATUS).map((value) => (
                <option key={value} value={value}>
                  {t.statuses[value]} ({rows.filter((p) => p.status === value).length})
                </option>
              ))}
            </select>
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="admin-note">{t.empty}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.reference}</th>
                <th>{t.client}</th>
                <th>{t.project}</th>
                <th>{t.total}</th>
                <th>{t.status}</th>
                {staff && <th>{t.assignment}</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>{when(p.created_at)}</td>
                  <td>
                    <strong>{p.reference}</strong>
                    <br />
                    {p.kind === "acompte" ? t.booking : t.quote}
                  </td>
                  <td>
                    {p.contact.prenom} {p.contact.nom}
                    {p.contact.entreprise && <> — {p.contact.entreprise}</>}
                    <br />
                    <a href={`mailto:${p.contact.email}`}>{p.contact.email}</a>
                    <br />
                    <a href={`tel:${p.contact.tel}`}>{p.contact.tel}</a>
                    <details>
                      <summary>{t.details}</summary>
                      {t.place} : {p.contact.lieu}
                      {p.contact.date && (
                        <>
                          {" "}
                          — {t.wishedDate} : {p.contact.date}
                        </>
                      )}
                      {p.contact.message && <p style={{ whiteSpace: "pre-wrap" }}>{p.contact.message}</p>}
                    </details>
                  </td>
                  <td>
                    {p.items.map((i, n) => (
                      <div key={n}>
                        {i.service} — {euros(i.price * 100)}
                        <br />
                        <small>{i.details}</small>
                      </div>
                    ))}
                  </td>
                  <td>
                    {euros(p.total_cents)}
                    {p.deposit_cents > 0 && (
                      <>
                        <br />
                        <small>
                          {t.deposit} {euros(p.deposit_cents)}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    <select
                      aria-label={t.statusOf(p.reference)}
                      value={p.status}
                      disabled={pending}
                      onChange={(e) => changeStatus(p.id, e.target.value)}
                    >
                      {Object.keys(PROJECT_STATUS).map((value) => (
                        <option key={value} value={value}>
                          {t.statuses[value]}
                        </option>
                      ))}
                    </select>
                  </td>
                  {staff && (
                    <td>
                      <AssignmentCell
                        project={p}
                        staff={staff}
                        onSaved={(patch) => setRows((current) => current.map((r) => (r.id === p.id ? { ...r, ...patch } : r)))}
                        toast={toast}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {toastNode}
      </section>
    </main>
  );
}

/** Sales rep, videographer, deadline and revision rounds of one project (admin space teams). */
function AssignmentCell({
  project,
  staff,
  onSaved,
  toast,
}: {
  project: AdminProject;
  staff: AssignableStaff;
  onSaved: (patch: Partial<AdminProject>) => void;
  toast: (message: string) => void;
}) {
  const [lang] = useLang();
  const all = adminTextFor(lang);
  const t = all.projects;
  const [commercial, setCommercial] = useState(project.commercial_id ?? "");
  const [videaste, setVideaste] = useState(project.videaste_id ?? "");
  const [deadline, setDeadline] = useState(project.deadline ?? "");
  const [revisions, setRevisions] = useState(String(project.revision_rounds ?? 0));
  const [pending, startTransition] = useTransition();
  const hasRevisions = project.revision_rounds !== undefined;

  // A deactivated member stays visible on projects already assigned to them.
  const withCurrent = (list: { id: string; name: string }[], current?: string | null) =>
    current && !list.some((s) => s.id === current) ? [...list, { id: current, name: t.inactiveMember }] : list;

  const save = () =>
    startTransition(async () => {
      const rounds = hasRevisions ? Number.parseInt(revisions, 10) : null;
      const revisionRounds = rounds !== null && Number.isFinite(rounds) ? rounds : null;
      const result = await assignProject(project.id, {
        commercialId: commercial || null,
        videasteId: videaste || null,
        deadline: deadline || null,
        revisionRounds,
      });
      if (!result.success) return toast(t.assignErrors[result.error] ?? all.errors.updateFailed);
      onSaved({
        commercial_id: commercial || null,
        videaste_id: videaste || null,
        deadline: deadline || null,
        ...(revisionRounds !== null ? { revision_rounds: revisionRounds } : {}),
      });
      toast(t.assigned);
    });

  return (
    <div className="admin-assign">
      <label>
        <small>{t.commercial}</small>
        <select value={commercial} onChange={(e) => setCommercial(e.target.value)} disabled={pending}>
          <option value="">{t.unassigned}</option>
          {withCurrent(staff.commerciaux, project.commercial_id).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <small>{t.videaste}</small>
        <select value={videaste} onChange={(e) => setVideaste(e.target.value)} disabled={pending}>
          <option value="">{t.unassigned}</option>
          {withCurrent(staff.videastes, project.videaste_id).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <small>{t.deadline}</small>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={pending} />
      </label>
      {hasRevisions && (
        <label>
          <small>{t.revisions}</small>
          <input type="number" min={0} max={50} value={revisions} onChange={(e) => setRevisions(e.target.value)} disabled={pending} />
        </label>
      )}
      <button type="button" className="btn btn-outline" onClick={save} disabled={pending}>
        {pending ? t.saving : t.save}
      </button>
    </div>
  );
}
