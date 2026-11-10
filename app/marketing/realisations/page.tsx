import type { Metadata } from "next";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RealisationsGallery } from "@/components/video/RealisationsGallery";
import { MARKETING_REALISATIONS } from "@/config/realisations";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Nos réalisations — AK Universe" },
  description: "Projets, campagnes marketing et contenus créatifs réalisés par AK Universe.",
};

export default async function Page() {
  const user = await getCurrentUser();
  const projects = MARKETING_REALISATIONS;
  const hasProjects = projects.length > 0;

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
              {hasProjects
                ? "Une sélection de projets vidéo et campagnes réalisés pour nos clients — à visionner directement sur le site."
                : "Les projets, campagnes et contenus déjà réalisés seront présentés ici dès que les médias et droits de publication seront validés."}
            </p>
          </div>
        </section>
        <RealisationsGallery projects={projects} />
      </main>
      <SiteFooter />
    </>
  );
}
