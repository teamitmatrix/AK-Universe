import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { longDate } from "@/components/client/format";
import { RefreshOnFocus } from "@/components/client/RefreshOnFocus";
import { TicketReply } from "@/components/client/SupportClient";
import { TicketStatusBadge } from "@/components/client/SupportViews";
import { requireClient } from "@/lib/client/session";
import { getMyTicket } from "@/lib/client/support";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "@/lib/client/support-content";

export const metadata: Metadata = { title: { absolute: "Ma demande — AK Universe" } };

const time = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** One support request: details, conversation, reply. Only the owner can open it (404 otherwise). */
export default async function TicketPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const me = await requireClient(`/client/dashboard/support/demandes/${reference}`);
  const found = await getMyTicket(me, reference);
  if (!found) notFound();
  const { ticket, messages } = found;

  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <header className="cs-hello">
        <p className="cs-eyebrow">
          Support · <span className="notranslate">N° {ticket.reference}</span>
        </p>
        <h1>{ticket.subject}</h1>
        <p>
          Créée le {longDate(ticket.createdAt)} · dernière mise à jour le {longDate(ticket.lastActivityAt)}
        </p>
      </header>
      <section className="cs-card cs-narrow">
        <dl className="cs-ticket-meta">
          <div>
            <dt>Statut</dt>
            <dd>
              <TicketStatusBadge status={ticket.status} />
            </dd>
          </div>
          <div>
            <dt>Catégorie</dt>
            <dd>{TICKET_CATEGORIES[ticket.category]}</dd>
          </div>
          <div>
            <dt>Priorité</dt>
            <dd>{TICKET_PRIORITIES[ticket.priority]}</dd>
          </div>
        </dl>
        <ol className="cs-thread">
          {messages.map((m) => (
            <li key={m.id} className={m.role === "support" ? "is-support" : "is-client"}>
              <p className="cs-thread-who">
                {m.role === "support" ? "Support AK Universe" : "Vous"} · <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
              </p>
              <p className="cs-thread-body">{m.body}</p>
              {m.linkUrl && (
                <a href={m.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="cs-link-btn">
                  Document partagé <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ol>
        <TicketReply reference={ticket.reference} status={ticket.status} />
        <p className="cs-back">
          <Link href="/client/dashboard/support/demandes" className="cs-link-btn">
            <ArrowLeft size={14} aria-hidden="true" /> Toutes mes demandes
          </Link>
        </p>
      </section>
    </main>
  );
}
