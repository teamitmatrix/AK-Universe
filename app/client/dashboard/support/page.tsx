import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RefreshOnFocus } from "@/components/client/RefreshOnFocus";
import { HelpSearch, SupportHero } from "@/components/client/SupportClient";
import { HelpLinks, ResourcesList, TicketRows } from "@/components/client/SupportViews";
import { Swoosh } from "@/components/client/Swoosh";
import { requireClient } from "@/lib/client/session";
import { listMyTickets } from "@/lib/client/support";
import { isTicketCategory } from "@/lib/client/support-content";

export const metadata: Metadata = { title: { absolute: "Support — AK Universe" } };

const PREVIEW = 3;

/** Support home (approved mockup). `?demande=1&categorie=<cat>` opens the request form, prefilled. */
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ demande?: string; categorie?: string }> }) {
  const me = await requireClient("/dashboard/support");
  const [{ demande, categorie }, { ready, tickets }] = await Promise.all([searchParams, listMyTickets(me, PREVIEW + 1)]);

  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <Swoosh className="cs-page-swoosh" id="cs-page" />
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <h1>Support</h1>
        <p>Une question, un besoin, un problème ? Notre équipe est là pour vous aider.</p>
      </header>

      <div className="cs-grid cs-grid-support">
        <SupportHero ready={ready} openInitially={demande === "1"} defaultCategory={isTicketCategory(categorie) ? categorie : null} />

        <section className="cs-card" aria-labelledby="cs-help-title">
          <h2 id="cs-help-title" className="cs-card-title is-sm">
            Centre d&apos;aide
          </h2>
          <p className="cs-card-sub">Trouvez rapidement une réponse à vos questions.</p>
          <HelpSearch />
          <HelpLinks />
        </section>

        <section className="cs-card" aria-labelledby="cs-tickets-title">
          <h2 id="cs-tickets-title" className="cs-card-title">
            Mes demandes
          </h2>
          <p className="cs-card-sub">Suivez l&apos;avancement de vos demandes auprès du support.</p>
          {!ready ? (
            <p className="cs-empty">Le suivi des demandes sera disponible très prochainement.</p>
          ) : tickets.length ? (
            <TicketRows tickets={tickets.slice(0, PREVIEW)} />
          ) : (
            <p className="cs-empty">Vous n&apos;avez encore aucune demande. Utilisez « Créer une demande » pour contacter notre équipe.</p>
          )}
          {ready && tickets.length > 0 && (
            <Link href="/dashboard/support/demandes" className="cs-btn-outline cs-more">
              Voir toutes mes demandes <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
        </section>

        <section className="cs-card" aria-labelledby="cs-res-title">
          <h2 id="cs-res-title" className="cs-card-title is-sm">
            Ressources et guides
          </h2>
          <p className="cs-card-sub">Des contenus pratiques pour tirer le meilleur d&apos;AK Universe.</p>
          <ResourcesList />
        </section>
      </div>
    </main>
  );
}
