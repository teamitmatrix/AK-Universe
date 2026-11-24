import Link from "next/link";
import { ArrowRight, CircleCheck, CreditCard, ExternalLink, FileText, Layers, Lightbulb, MessageCircle, Play, Puzzle, User } from "lucide-react";
import type { TicketSummary } from "@/lib/client/support";
import { RESOURCES, TICKET_STATUSES } from "@/lib/client/support-content";
import { longDate, shortDate } from "./format";

/* Server-rendered pieces of the Support pages. */

export function TicketStatusBadge({ status }: { status: TicketSummary["status"] }) {
  const s = TICKET_STATUSES[status];
  return (
    <span className={`cs-badge is-${s.tone}`}>
      {s.tone === "ok" ? <CircleCheck size={14} strokeWidth={2.2} aria-hidden="true" /> : s.tone === "warn" ? <span className="cs-dot" aria-hidden="true" /> : null}
      {s.label}
    </span>
  );
}

export function TicketRows({ tickets, showUpdated = false }: { tickets: TicketSummary[]; showUpdated?: boolean }) {
  return (
    <ul className="cs-rows cs-tickets">
      {tickets.map((t) => {
        const done = t.status === "resolu" || t.status === "ferme";
        return (
          <li key={t.id}>
            <Link href={`/client/dashboard/support/demandes/${t.reference}`} className="cs-ticket">
              <span className="cs-doc" aria-hidden="true">
                {done ? <CircleCheck size={20} strokeWidth={1.7} /> : <MessageCircle size={20} strokeWidth={1.7} />}
              </span>
              <span className="cs-ticket-main">
                <strong>{t.subject}</strong>
                <small>
                  <span className="notranslate">N° {t.reference}</span> • {longDate(t.createdAt)}
                  {showUpdated && t.lastActivityAt !== t.createdAt && <> • mise à jour le {shortDate(t.lastActivityAt)}</>}
                </small>
              </span>
              <TicketStatusBadge status={t.status} />
              <ArrowRight className="cs-ticket-arrow" size={20} aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const HELP_LINKS = [
  { cat: "offre", label: "Gérer mon offre", icon: Layers },
  { cat: "facturation", label: "Facturation et paiements", icon: CreditCard },
  { cat: "options", label: "Options et fonctionnalités", icon: Puzzle },
  { cat: "compte", label: "Mon compte et sécurité", icon: User },
] as const;

export function HelpLinks() {
  return (
    <ul className="cs-setting-list cs-help-links">
      {HELP_LINKS.map(({ cat, label, icon: Icon }) => (
        <li key={cat}>
          <Link href={`/client/dashboard/support/aide?categorie=${cat}`} className="cs-setting-btn">
            <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const RES_ICONS = { doc: FileText, play: Play, bulb: Lightbulb };

export function ResourcesList() {
  return (
    <ul className="cs-resources">
      {RESOURCES.map((r) => {
        const Icon = RES_ICONS[r.icon];
        const inner = (
          <>
            <span className="cs-doc" aria-hidden="true">
              <Icon size={20} strokeWidth={1.7} />
            </span>
            <span className="cs-ticket-main">
              <strong>{r.title}</strong>
              <small>{r.desc}</small>
            </span>
            {r.href ? <ExternalLink size={20} aria-hidden="true" /> : <span className="cs-soon">Bientôt</span>}
          </>
        );
        return (
          <li key={r.id}>
            {r.href ? (
              <Link href={r.href} className="cs-resource">
                {inner}
              </Link>
            ) : (
              <span className="cs-resource is-disabled" aria-disabled="true">
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
