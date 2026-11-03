import type { Metadata } from "next";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Nos réalisations — AK Universe" },
  description: "Projets, campagnes marketing et contenus créatifs réalisés par AK Universe.",
};

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="realisations" />
      <main>
        <section className="pricing stars agents-hero">
          <div className="container pricing-head">
            <p className="eyebrow eyebrow-lines">Marketing</p>
            <h1>
              Nos <span className="gold">réalisations</span>
            </h1>
            <p>
              Les projets, campagnes et contenus déjà réalisés seront présentés ici. Cette sélection n&apos;est pas encore
              disponible.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
