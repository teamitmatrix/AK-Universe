import type { Metadata } from "next";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Nos réalisations — AK Universe") },
    description: t(
      "Projets, campagnes marketing et contenus créatifs réalisés par AK Universe.",
    ),
  };
}

export default async function Page() {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);

  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="realisations" />
      <main>
        <section className="pricing stars agents-hero">
          <div className="container pricing-head">
            <p className="eyebrow eyebrow-lines">{t("Marketing")}</p>
            <h1>{t.rich("Nos <gold>réalisations</gold>")}</h1>
            <p>
              {t(
                "Les projets, campagnes et contenus déjà réalisés seront présentés ici. Cette sélection n'est pas encore disponible.",
              )}
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
