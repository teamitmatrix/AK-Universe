import type { Metadata } from "next";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MarketingView } from "@/components/video/MarketingView";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Marketing Digital — AK Universe" },
  description:
    "Vidéos et outils marketing propulsés par l'IA pour attirer plus de clients et développer votre visibilité.",
};

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="marketing" />
      <MarketingView />
      <SiteFooter />
    </>
  );
}
