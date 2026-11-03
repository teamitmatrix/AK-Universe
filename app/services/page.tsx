import type { Metadata } from "next";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ServicesList } from "@/components/video/ServicesList";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Nos services vidéo — AK Universe" },
  description:
    "Découvrez nos services vidéo et composez votre projet en quelques clics : devis personnalisé ou réservation avec acompte.",
};

export default async function Page() {
  const [config, user] = await Promise.all([getVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="services" />
      <VideoShell config={config} bare>
        <ServicesList />
      </VideoShell>
      <SiteFooter />
    </>
  );
}
