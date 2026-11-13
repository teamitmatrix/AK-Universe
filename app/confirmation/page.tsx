import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/video/ConfirmationView";
import { VideoShell } from "@/components/video/VideoShell";
import { getLocalizedVideoConfig } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Projet enregistré — AK Universe") },
    description: t("Votre projet vidéo est bien enregistré."),
    robots: { index: false, follow: false },
  };
}

export default async function Page() {
  const config = await getLocalizedVideoConfig();
  return (
    <VideoShell config={config}>
      <Suspense fallback={null}>
        <ConfirmationView />
      </Suspense>
    </VideoShell>
  );
}
