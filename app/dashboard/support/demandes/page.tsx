import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RefreshOnFocus } from "@/components/client/RefreshOnFocus";
import { TicketRows } from "@/components/client/SupportViews";
import { requireClient } from "@/lib/client/session";
import { listMyTickets } from "@/lib/client/support";

export const metadata: Metadata = { title: { absolute: "Mes demandes — AK Universe" } };

/** Every support request of the customer, most recently updated first. */
export default async function TicketsPage() {
  const me = await requireClient("/dashboard/support/demandes");
  const { ready, tickets } = await listMyTickets(me, 200);
  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client · Support</p>
        <h1>Mes demandes</h1>
        <p>Suivez l&apos;avancement de vos demandes auprès du support.</p>
      </header>
      <section className="cs-card cs-narrow">
        {!ready ? (
          <p className="cs-empty">Le suivi des demandes sera disponible très prochainement.</p>
        ) : tickets.length ? (
          <TicketRows tickets={tickets} showUpdated />
        ) : (
          <p className="cs-empty">Vous n&apos;avez encore aucune demande.</p>
        )}
        <div className="cs-modal-actions cs-start">
          <Link href="/dashboard/support" className="cs-btn-outline">
            <ArrowLeft size={16} aria-hidden="true" /> Retour au support
          </Link>
          <Link href="/dashboard/support?demande=1" className="cs-act is-primary cs-act-fit">
            <span>Créer une demande</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
