import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { ContactCard } from "@/components/layout/ContactCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { InfosView } from "@/components/video/InfosView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocalizedVideoConfig } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Vos informations — AK Universe") },
    description: t("Vos coordonnées pour finaliser votre projet vidéo."),
    robots: { index: false, follow: false },
  };
}

/** Checkout step after /projet. A quote request uses the contact form instead. */
export default async function Page() {
  const [config, user] = await Promise.all([getLocalizedVideoConfig(), getCurrentUser()]);
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
