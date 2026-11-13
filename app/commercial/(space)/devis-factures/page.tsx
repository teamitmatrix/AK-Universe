import { Clock, Euro, FileText, Info, Receipt } from "lucide-react";
import { Kpi, formatters } from "@/components/admin/space/ui";
import { DocumentsView } from "@/components/commercial/DocumentsView";
import { loadSalesCatalogue } from "@/lib/commercial/catalogue";
import { loadClientChoices, loadRates, loadSalesDocs } from "@/lib/commercial/sales-docs";
import { requireCommercial } from "@/lib/commercial/session";

/**
 * commercial/devis-factures.html (handoff pages 06 / 09): the rep's own quotes & invoices.
 * requireCommercial() checks the session and role here; every loader is scoped to the rep (filter + RLS).
 */
export default async function DevisFacturesPage({ searchParams }: { searchParams: Promise<{ nouveau?: string; q?: string }> }) {
  const me = await requireCommercial("/commercial/devis-factures");
  const sp = await searchParams;
  const [data, catalogue, rates, clients] = await Promise.all([loadSalesDocs(me), loadSalesCatalogue(), loadRates(), loadClientChoices(me)]);
  const f = formatters("fr-FR");

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>
            Devis <span className="com-gold">&amp; Factures</span>
          </h2>
          <p>Créez un devis à envoyer, ou une facture — ce qui enregistre directement la vente dans « Mes ventes ».</p>
        </div>
      </div>

      {!data.ready ? (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Les devis et factures seront actifs après l&apos;application de la migration 012 en base de données.
        </p>
      ) : (
        <>
          <div className="adm-kpis com-kpis">
            <Kpi Icon={FileText} label="Devis en cours" value={f.num(data.kpis.openQuotes)} />
            <Kpi Icon={Euro} label="CA potentiel (devis)" hint="Total TTC des devis en brouillon ou envoyés." value={f.euros(data.kpis.potentialCents)} />
            <Kpi Icon={Clock} label="Factures à encaisser" hint="Total TTC des factures émises non payées." value={f.euros(data.kpis.toCollectCents)} />
            <Kpi Icon={Receipt} label="CA facturé (total)" hint="Total TTC des factures émises ou payées." value={f.euros(data.kpis.invoicedCents)} hero />
          </div>
          <DocumentsView
            docs={data.docs}
            catalogue={catalogue}
            rates={rates}
            clients={clients}
            initialNew={sp.nouveau === "facture" ? "facture" : sp.nouveau === "devis" ? "devis" : null}
            initialQuery={String(sp.q ?? "").slice(0, 60)}
          />
        </>
      )}
    </div>
  );
}
