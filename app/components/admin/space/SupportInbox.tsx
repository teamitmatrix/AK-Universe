import Link from "next/link";
import { ArrowLeft, CircleCheck, Clock, Headphones, MessageCircle } from "lucide-react";
import { localeOf, type Lang } from "@/config/languages";
import type { SupportListItem, SupportTicketDetail } from "@/lib/admin/support";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/client/support-content";
import { AdmShell } from "./AdmShell";
import { dashTextFor } from "./dashText";
import { SupportReply, type SupportFormLabels } from "./SupportReply";
import { Kpi, PageHead, formatters } from "./ui";

type Admin = { name: string; email: string };

const TONE: Record<TicketStatus, string> = {
  ouvert: "is-info",
  en_cours: "is-warn",
  en_attente: "is-warn",
  resolu: "is-ok",
  ferme: "is-muted",
};

const COPY = {
  fr: {
    title: "Support clients",
    subtitle: "Répondez ici : le message apparaît dans la demande du client, et il reçoit le lien par e-mail.",
    missing: "Exécutez la migration 019_client_support.sql pour activer les demandes.",
    empty: "Aucune demande pour ces filtres.",
    search: "Recherche",
    status: "Statut",
    all: "Tous les statuts",
    filter: "Filtrer",
    kpi: { open: "À traiter", waiting: "En attente du client", resolved: "Résolues" },
    cols: { ref: "Demande", customer: "Client", subject: "Sujet", status: "Statut", updated: "Mise à jour" },
    back: "Toutes les demandes",
    thread: "Conversation",
    you: "Support AK Universe",
    client: "Client",
    document: "Document partagé",
    categories: {
      offre: "Mon offre",
      facturation: "Facturation",
      options: "Options",
      compte: "Compte",
      technique: "Technique",
      autre: "Autre",
    } as Record<TicketCategory, string>,
    priorities: { normale: "Normale", haute: "Haute", urgente: "Urgente" } as Record<TicketPriority, string>,
    statuses: {
      ouvert: "Ouvert",
      en_cours: "En cours",
      en_attente: "En attente du client",
      resolu: "Résolu",
      ferme: "Fermé",
    } as Record<TicketStatus, string>,
    form: {
      replyTitle: "Répondre au client",
      hint: "Le client voit ce message dans sa demande. Un e-mail lui envoie le lien.",
      body: "Message",
      link: "Lien de partage (facultatif)",
      status: "Statut après l'envoi",
      send: "Envoyer la réponse",
      sending: "Envoi…",
      sent: "Réponse envoyée. Le client la voit dans sa demande.",
      statusTitle: "Changer le statut",
      saveStatus: "Enregistrer le statut",
      saved: "Statut mis à jour.",
      errors: {
        forbidden: "Accès réservé aux administrateurs.",
        invalid: "Vérifiez le message.",
        link: "Lien refusé : uniquement Drive, Dropbox, WeTransfer, Frame.io ou OneDrive.",
        notReady: "Les demandes ne sont pas encore disponibles.",
        notFound: "Demande introuvable.",
        failed: "Enregistrement impossible. Réessayez.",
      } as Record<string, string>,
    },
  },
  en: {
    title: "Client support",
    subtitle: "Reply here: the message appears in the client's request, and they receive the link by e-mail.",
    missing: "Run migration 019_client_support.sql to enable requests.",
    empty: "No request for these filters.",
    search: "Search",
    status: "Status",
    all: "All statuses",
    filter: "Filter",
    kpi: { open: "To handle", waiting: "Waiting for the client", resolved: "Resolved" },
    cols: { ref: "Request", customer: "Client", subject: "Subject", status: "Status", updated: "Updated" },
    back: "All requests",
    thread: "Conversation",
    you: "AK Universe support",
    client: "Client",
    document: "Shared document",
    categories: {
      offre: "Plan",
      facturation: "Billing",
      options: "Options",
      compte: "Account",
      technique: "Technical",
      autre: "Other",
    } as Record<TicketCategory, string>,
    priorities: { normale: "Normal", haute: "High", urgente: "Urgent" } as Record<TicketPriority, string>,
    statuses: {
      ouvert: "Open",
      en_cours: "In progress",
      en_attente: "Waiting for the client",
      resolu: "Resolved",
      ferme: "Closed",
    } as Record<TicketStatus, string>,
    form: {
      replyTitle: "Reply to the client",
      hint: "The client sees this message in their request. An e-mail sends them the link.",
      body: "Message",
      link: "Share link (optional)",
      status: "Status after sending",
      send: "Send the reply",
      sending: "Sending…",
      sent: "Reply sent. The client sees it in their request.",
      statusTitle: "Change the status",
      saveStatus: "Save status",
      saved: "Status updated.",
      errors: {
        forbidden: "Admins only.",
        invalid: "Check the message.",
        link: "Link refused: Drive, Dropbox, WeTransfer, Frame.io or OneDrive only.",
        notReady: "Requests are not available yet.",
        notFound: "Request not found.",
        failed: "Could not save. Please retry.",
      } as Record<string, string>,
    },
  },
};

const textOf = (lang: Lang) => COPY[lang === "en" ? "en" : "fr"];

function Badge({ status, label }: { status: TicketStatus; label: string }) {
  return <span className={`adm-badge ${TONE[status]}`}>{label}</span>;
}

export function SupportListView({
  lang,
  admin,
  ready,
  tickets,
  counts,
  filter,
}: {
  lang: Lang;
  admin: Admin;
  ready: boolean;
  tickets: SupportListItem[];
  counts: Record<TicketStatus, number>;
  filter: { status: TicketStatus | ""; q: string };
}) {
  const t = textOf(lang);
  const f = formatters(localeOf(lang));
  const statuses = Object.keys(t.statuses) as TicketStatus[];

  return (
    <AdmShell t={dashTextFor(lang)} active="support" admin={admin}>
      <div className="adm-content">
        <PageHead title={t.title} subtitle={t.subtitle} />
        <section className="adm-kpis" aria-label="KPI">
          <Kpi hero Icon={Headphones} label={t.kpi.open} value={f.num(counts.ouvert + counts.en_cours)} />
          <Kpi Icon={Clock} label={t.kpi.waiting} value={f.num(counts.en_attente)} />
          <Kpi Icon={CircleCheck} label={t.kpi.resolved} value={f.num(counts.resolu)} />
        </section>
        {!ready ? (
          <p className="adm-note">{t.missing}</p>
        ) : (
          <section className="adm-card">
            <form className="adm-toolbar" action="/admin/support" method="get">
              <label className="adm-field">
                <span>{t.status}</span>
                <select name="statut" defaultValue={filter.status}>
                  <option value="">{t.all}</option>
                  {statuses.map((id) => (
                    <option key={id} value={id}>
                      {t.statuses[id]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span>{t.search}</span>
                <input type="search" name="q" defaultValue={filter.q} maxLength={100} />
              </label>
              <button type="submit" className="adm-btn">
                {t.filter}
              </button>
            </form>
            {tickets.length === 0 ? (
              <p className="adm-empty">{t.empty}</p>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>{t.cols.ref}</th>
                      <th>{t.cols.customer}</th>
                      <th>{t.cols.subject}</th>
                      <th>{t.cols.status}</th>
                      <th>{t.cols.updated}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((row) => (
                      <tr key={row.id}>
                        <td data-label={t.cols.ref}>
                          <Link className="adm-person" href={`/admin/support/${row.reference}`}>
                            <strong>{row.reference}</strong>
                          </Link>
                        </td>
                        <td data-label={t.cols.customer}>
                          <span className="adm-stack">
                            <strong>{row.customerName}</strong>
                            {row.customerEmail && <span className="adm-person-mail">{row.customerEmail}</span>}
                          </span>
                        </td>
                        <td data-label={t.cols.subject}>
                          <span className="adm-stack">
                            <Link href={`/admin/support/${row.reference}`}>{row.subject}</Link>
                            <span className="adm-person-mail">
                              {t.categories[row.category]} · {t.priorities[row.priority]}
                            </span>
                          </span>
                        </td>
                        <td data-label={t.cols.status}>
                          <Badge status={row.status} label={t.statuses[row.status]} />
                        </td>
                        <td data-label={t.cols.updated}>{f.date(row.lastActivityAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </AdmShell>
  );
}

export function SupportTicketView({ lang, admin, data }: { lang: Lang; admin: Admin; data: SupportTicketDetail }) {
  const t = textOf(lang);
  const locale = localeOf(lang);
  const when = (iso: string) => new Date(iso).toLocaleString(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const { ticket, messages } = data;
  const labels: SupportFormLabels = { ...t.form, statuses: t.statuses };

  return (
    <AdmShell t={dashTextFor(lang)} active="support" admin={admin}>
      <div className="adm-content">
        <PageHead title={`${ticket.reference} — ${ticket.subject}`} subtitle={`${ticket.customerName}${ticket.customerEmail ? ` · ${ticket.customerEmail}` : ""} · ${t.categories[ticket.category]} · ${t.priorities[ticket.priority]}`}>
          <Badge status={ticket.status} label={t.statuses[ticket.status]} />
        </PageHead>
        <p>
          <Link href="/admin/support" className="adm-link">
            <ArrowLeft size={14} aria-hidden="true" /> {t.back}
          </Link>
        </p>
        <section className="adm-card" aria-labelledby="adm-thread">
          <header className="adm-card-head">
            <h2 id="adm-thread">
              <MessageCircle size={17} aria-hidden="true" />
              {t.thread}
            </h2>
          </header>
          <ol className="adm-thread">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "support" ? "is-support" : "is-client"}>
                <p className="adm-thread-who">
                  {m.role === "support" ? t.you : t.client} · <time dateTime={m.createdAt}>{when(m.createdAt)}</time>
                </p>
                <p className="adm-thread-body">{m.body}</p>
                {m.linkUrl && (
                  <a href={m.linkUrl} target="_blank" rel="noopener noreferrer nofollow">
                    {t.document}
                  </a>
                )}
              </li>
            ))}
          </ol>
          <SupportReply reference={ticket.reference} status={ticket.status} labels={labels} />
        </section>
      </div>
    </AdmShell>
  );
}
