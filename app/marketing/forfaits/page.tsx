import type { Metadata } from "next";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ForfaitsView } from "@/components/video/ForfaitsView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Forfaits Marketing — AK Universe" },
  description:
    "Des forfaits vidéo et marketing sur-mesure pour booster votre visibilité, attirer plus de clients et développer votre activité.",
};

export default async function Page() {
  const [config, user] = await Promise.all([getVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="devis" />
      <VideoShell config={config} bare>
        <ForfaitsView />
      </VideoShell>
      <SiteFooter />
    </>
  );
}
