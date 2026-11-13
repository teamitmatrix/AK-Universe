import type { Metadata } from "next";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ServicesList } from "@/components/video/ServicesList";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocalizedVideoConfig } from "@/i18n/data";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Nos services vidéo — AK Universe") },
    description: t(
      "Découvrez nos services vidéo et composez votre projet en quelques clics : devis personnalisé ou réservation avec acompte.",
    ),
  };
}

export default async function Page() {
  const [config, user] = await Promise.all([getLocalizedVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="tous" />
      <VideoShell config={config} bare>
        <ServicesList />
      </VideoShell>
      <SiteFooter />
    </>
  );
}
