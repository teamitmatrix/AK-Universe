import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/video/ConfirmationView";
import { VideoShell } from "@/components/video/VideoShell";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Projet enregistré — AK Universe" },
  description: "Votre projet vidéo est bien enregistré.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const config = await getVideoConfig();
  return (
    <VideoShell config={config}>
      <Suspense fallback={null}>
        <ConfirmationView />
      </Suspense>
    </VideoShell>
  );
}
