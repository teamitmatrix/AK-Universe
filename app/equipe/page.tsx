import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Film, ListChecks } from "lucide-react";
import { initialsOf } from "@/components/admin/space/initials";
import { TaskActions } from "@/components/admin/space/ToolsClient";
import { toolsTextFor } from "@/components/admin/space/toolsText";
import { localeOf } from "@/config/languages";
import { loadMyWork } from "@/lib/admin/agenda";
import { displayName } from "@/lib/admin/team";
import { adminTextFor } from "@/components/admin/adminText";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { getLang } from "@/i18n/server";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: { absolute: "Mon espace — AK Universe" },
  robots: { index: false, follow: false },
};

/**
 * Staff space (commerciaux / vidéastes): the tasks assigned to them — the same rows the admin creates in
 * /admin/agenda, from the shared tasks table — and their assigned projects. Role checked on the server.
 */
export default async function EquipePage() {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);
  const t = toolsTextFor(lang).equipe;
  const kinds = toolsTextFor(lang).agenda.kinds;
  const statuses = adminTextFor(lang).projects.statuses;
  const locale = localeOf(lang);

  const supabase = await createClient();
  const { data: profile } = user ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle() : { data: null };
  const allowed = profile && (profile.role === "commercial" || profile.role === "videaste") && profile.active !== false;

  if (!user || !allowed) {
    return (
      <div className="adm adm-staff">
        <main className="adm-main">
          <div className="adm-content">
            <p className="adm-note">{t.forbidden}</p>
            <Link href="/" className="adm-btn is-ghost">
              {t.back}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const name = displayName(profile);
  const { tasksReady, tasks, projects } = await loadMyWork(user.id);
  const open = tasks.filter((x) => x.status === "a_faire");
  const done = tasks.filter((x) => x.status === "fait").slice(-20).reverse();
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="adm adm-staff">
      <main className="adm-main">
        <header className="adm-head">
          <div className="adm-profile">
            <span className="adm-avatar lg" aria-hidden="true">
              {initialsOf(name)}
            </span>
            <div>
              <h1>{t.hello(name.split(" ")[0] ?? name)} 👋</h1>
              <p>{t.intro}</p>
            </div>
          </div>
          <div className="adm-head-tools">
            <LangSwitch compact />
          </div>
        </header>
        <div className="adm-content">
          <div className="adm-split">
            <section className="adm-card" aria-labelledby="eq-tasks">
              <header className="adm-card-head">
                <h2 id="eq-tasks">
                  <ListChecks size={17} aria-hidden="true" />
                  {t.tasks}
                </h2>
              </header>
              {!tasksReady || tasks.length === 0 ? (
                <p className="adm-empty">{t.noTasks}</p>
              ) : (
                <>
                  <h3 className="adm-subhead">{t.upcoming}</h3>
                  {open.length === 0 ? (
                    <p className="adm-empty">{t.noTasks}</p>
                  ) : (
                    <ul className="adm-list">
                      {open.map((task) => (
                        <li key={task.id} className={task.overdue ? "is-overdue" : undefined}>
                          <CalendarClock size={16} aria-hidden="true" />
                          <span className="adm-stack">
                            <strong>{task.title}</strong>
                            <span className="adm-person-mail">
                              {kinds[task.type]} · {when(task.due_at)}
                              {task.notes ? ` · ${task.notes}` : ""}
                            </span>
                          </span>
                          <TaskActions id={task.id} title={task.title} done={false} canDelete={false} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {done.length > 0 && (
                    <>
                      <h3 className="adm-subhead">{t.done}</h3>
                      <ul className="adm-list">
                        {done.map((task) => (
                          <li key={task.id} className="is-done">
                            <span className="adm-stack">
                              <strong>{task.title}</strong>
                              <span className="adm-person-mail">{when(task.due_at)}</span>
                            </span>
                            <TaskActions id={task.id} title={task.title} done canDelete={false} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </section>
            <section className="adm-card" aria-labelledby="eq-projects">
              <header className="adm-card-head">
                <h2 id="eq-projects">
                  <Film size={17} aria-hidden="true" />
                  {t.projects}
                </h2>
              </header>
              {projects.length === 0 ? (
                <p className="adm-empty">{t.noProjects}</p>
              ) : (
                <ul className="adm-list">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Film size={16} aria-hidden="true" />
                      <span className="adm-stack">
                        <strong>
                          {p.reference} — {p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}
                        </strong>
                        <span className="adm-person-mail">
                          {statuses[p.status] ?? p.status}
                          {p.deadline ? ` · ${new Date(`${p.deadline}T12:00:00`).toLocaleDateString(locale)}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
