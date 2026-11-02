import type { Metadata } from "next";
import { AcompteView } from "@/components/video/AcompteView";
import { VideoShell } from "@/components/video/VideoShell";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Paiement de l'acompte — AK Universe" },
  description: "Réservez votre projet vidéo avec un acompte sécurisé.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const config = await getVideoConfig();
  return (
    <VideoShell config={config}>
      <AcompteView />
    </VideoShell>
  );
}
