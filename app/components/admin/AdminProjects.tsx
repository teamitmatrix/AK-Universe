"use client";

import { useState, useTransition } from "react";
import { PROJECT_STATUS } from "@/config/projects";
import { updateProjectStatus } from "@/lib/admin/actions";
import { textLang, useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { ADMIN_TEXT } from "./adminText";

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
};

/** Quotes and bookings received from finaliser.html / acompte.html (table video_projects). */
export function AdminProjects({ projects }: { projects: AdminProject[] }) {
  const [rows, setRows] = useState(projects);
  const [filter, setFilter] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, toastNode] = useToast();
  const [lang] = useLang();
  const all = ADMIN_TEXT[textLang(lang)];
  const t = all.projects;
  const locale = textLang(lang) === "en" ? "en-GB" : "fr-FR";

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
    <main className="container admin notranslate" translate="no">
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
