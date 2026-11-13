import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProjetView } from "@/components/video/ProjetView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocalizedVideoConfig } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Mon projet — AK Universe") },
    description: t("Votre projet vidéo AK Universe."),
    robots: { index: false, follow: false },
  };
}

export default async function Page() {
  const [config, user] = await Promise.all([getLocalizedVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="none" signedIn={!!user} />
      <VideoShell config={config} header={false}>
        <ProjetView />
      </VideoShell>
    </>
  );
}
