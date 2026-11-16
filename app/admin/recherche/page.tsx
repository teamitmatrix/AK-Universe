import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Building2, FileText, Film, Tags, UserPlus, Users } from "lucide-react";
import { adminTextFor } from "@/components/admin/adminText";
import { AdmShell } from "@/components/admin/space/AdmShell";
import { dashTextFor } from "@/components/admin/space/dashText";
import { toolsTextFor } from "@/components/admin/space/toolsText";
import { PageHead, formatters } from "@/components/admin/space/ui";
import { localeOf } from "@/config/languages";
import { getAdminIdentity } from "@/lib/admin/identity";
import { searchAdmin } from "@/lib/admin/search";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Recherche — Admin AK Universe" },
  robots: { index: false, follow: false },
};

const OPEN = new Set(["nouveau", "acompte_en_attente"]);

export default async function RecherchePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const [lang, sp] = await Promise.all([getAdminLang(), searchParams]);
  const t = toolsTextFor(lang).search;
  const dt = dashTextFor(lang);
  const statuses = adminTextFor(lang).projects.statuses;
  const f = formatters(localeOf(lang));
  const res = await searchAdmin(String(sp.q ?? ""));
  const total = res.tooShort ? 0 : res.team.length + res.accounts.length + res.prospects.length + res.customers.length + res.documents.length + res.projects.length + res.catalogue.length;
  const quotes = dashTextFor(lang).crm.quotes;

  return (
    <AdmShell t={dt} active={null} admin={admin} query={res.q}>
      <div className="adm-content">
        <PageHead title={res.q ? t.title(res.q) : t.label} subtitle={t.subtitle} />
        {res.tooShort ? (
          <p className="adm-empty">{t.tooShort}</p>
        ) : total === 0 ? (
          <p className="adm-empty">{t.none}</p>
        ) : (
          <div className="adm-split">
            {res.team.length > 0 && (
              <section className="adm-card">
                <header className="adm-card-head">
                  <h2>
                    <Briefcase size={17} aria-hidden="true" />
                    {t.groups.team}
                  </h2>
                </header>
                <ul className="adm-list">
                  {res.team.map((p) => (
                    <li key={p.id}>
                      <span className="adm-stack">
                        {p.role === "admin" ? (
                          <strong>{p.name}</strong>
                        ) : (
                          <Link className="adm-person" href={`/admin/${p.role === "commercial" ? "commercial" : "videaste"}-detail?id=${p.id}`}>
                            {p.name}
                          </Link>
                        )}
                        <span className="adm-person-mail">{p.email}</span>
                      </span>
                      <span className={`adm-badge ${p.active ? "is-info" : "is-muted"}`}>{t.roles[p.role]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {res.accounts.length > 0 && (
              <section className="adm-card">
                <header className="adm-card-head">
                  <h2>
                    <Users size={17} aria-hidden="true" />
                    {t.groups.accounts}
                  </h2>
                </header>
                <ul className="adm-list">
                  {res.accounts.map((p) => (
                    <li key={p.id}>
                      <span className="adm-stack">
                        <Link className="adm-person" href={`/admin/clients?q=${encodeURIComponent(p.email)}`}>
                          {p.name}
                        </Link>
                        <span className="adm-person-mail">{p.email}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {res.prospects.length > 0 && (
              <section className="adm-card">
                <header className="adm-card-head">
                  <h2>
                    <UserPlus size={17} aria-hidden="true" />
                    {t.groups.prospects}
                  </h2>
                </header>
                <ul className="adm-list">
                  {res.prospects.map((p) => (
                    <li key={p.id}>
                      <span className="adm-stack">
                        <Link className="adm-person" href={`/admin/prospect-detail?id=${p.id}`}>
                          {p.name}
                        </Link>
                        <span className="adm-person-mail">{[p.company, p.email].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                      <span className="adm-badge is-info">{dt.crm.prospects.stages[p.stage] ?? p.stage}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {res.customers.length > 0 && (
              <section className="adm-card">
                <header className="adm-card-head">
                  <h2>
                    <Building2 size={17} aria-hidden="true" />
                    {t.groups.clients}
                  </h2>
                </header>
                <ul className="adm-list">
                  {res.customers.map((c) => (
                    <li key={c.id}>
                      <span className="adm-stack">
                        <Link className="adm-person" href={`/admin/client-detail?id=${c.id}`}>
                          {c.name}
                        </Link>
                        <span className="adm-person-mail">{[c.contact, c.email].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {res.documents.length > 0 && (
              <section className="adm-card">
                <header className="adm-card-head">
                  <h2>
                    <FileText size={17} aria-hidden="true" />
                    {t.groups.documents}
                  </h2>
                </header>
                <ul className="adm-list">
                  {res.documents.map((d) => (
                    <li key={d.id}>
                      <span className="adm-stack">
                        <Link className="adm-person" href={`/admin/document?id=${d.id}`}>
                          {d.number} — {d.client}
                        </Link>
                        <span className="adm-person-mail">{quotes.types[d.kind] ?? d.kind}</span>
                      </span>
                      <span className={`adm-badge ${d.kind === "facture" ? "is-ok" : "is-info"}`}>{quotes.statuses[d.status] ?? d.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {res.projects.length > 0 && (
              <section className="adm-card">
                <header className="adm-card-head">
                  <h2>
                    <Film size={17} aria-hidden="true" />
                    {t.groups.projects}
                  </h2>
                </header>
                <ul className="adm-list">
                  {res.projects.map((p) => (
                    <li key={p.id}>
                      <span className="adm-stack">
                        <Link
                          className="adm-person"
                          href={OPEN.has(p.status) ? `/admin/prospects?q=${encodeURIComponent(p.reference)}` : `/admin/ventes?periode=tout`}
                        >
                          {p.reference} — {p.client}
                        </Link>
                        <span className="adm-person-mail">
                          {f.date(p.createdAt)} · {f.euros(p.totalCents)}
                        </span>
                      </span>
                      <span className="adm-badge is-info">{statuses[p.status] ?? p.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {res.catalogue.length > 0 && (
              <section className="adm-card">
                <header className="adm-card-head">
                  <h2>
                    <Tags size={17} aria-hidden="true" />
                    {t.groups.catalogue}
                  </h2>
                </header>
                <ul className="adm-list">
                  {res.catalogue.map((r) => (
                    <li key={r.id}>
                      <span className="adm-stack">
                        <Link className="adm-person" href="/admin/catalogue">
                          {r.name}
                        </Link>
                        <span className="adm-person-mail">{r.detail}</span>
                      </span>
                      <span className="adm-muted adm-small">
                        {r.fields[0]?.unit === "pct" ? `${r.fields[0]?.value} %` : f.euros(Math.round((r.fields[0]?.value ?? 0) * 100))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </AdmShell>
  );
}
