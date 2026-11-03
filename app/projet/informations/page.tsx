import type { Metadata } from "next";
import { ContactCard } from "@/components/layout/ContactCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { InfosView } from "@/components/video/InfosView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Vos informations — AK Universe" },
  description: "Vos coordonnées pour finaliser votre projet vidéo.",
  robots: { index: false, follow: false },
};

/** Checkout step after /projet. The public quote page is the placeholder at /devis. */
export default async function Page() {
  const [config, user] = await Promise.all([getVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="none" signedIn={!!user} />
      <VideoShell config={config} header={false}>
        <InfosView />
        <ContactCard />
      </VideoShell>
    </>
  );
}
