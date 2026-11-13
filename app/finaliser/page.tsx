import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FinaliserView } from "@/components/video/FinaliserView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocalizedVideoConfig } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Devis ou acompte — AK Universe") },
    description: t("Choisissez comment finaliser votre projet vidéo."),
    robots: { index: false, follow: false },
  };
}

export default async function Page() {
  const [config, user] = await Promise.all([getLocalizedVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="none" signedIn={!!user} />
      <VideoShell config={config} header={false}>
        <FinaliserView />
      </VideoShell>
    </>
  );
}
