import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AcompteView } from "@/components/video/AcompteView";
import { VideoShell } from "@/components/video/VideoShell";
import { getLocalizedVideoConfig } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Paiement de l'acompte — AK Universe") },
    description: t("Réservez votre projet vidéo avec un acompte sécurisé."),
    robots: { index: false, follow: false },
  };
}

export default async function Page() {
  const config = await getLocalizedVideoConfig();
  return (
    <VideoShell config={config}>
      <AcompteView />
    </VideoShell>
  );
}
