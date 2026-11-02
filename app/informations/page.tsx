import type { Metadata } from "next";
import { ContactCard } from "@/components/layout/ContactCard";
import { InfosView } from "@/components/video/InfosView";
import { VideoShell } from "@/components/video/VideoShell";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Vos informations — AK Universe" },
  description: "Vos coordonnées pour finaliser votre projet vidéo.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const config = await getVideoConfig();
  return (
    <VideoShell config={config}>
      <InfosView />
      <ContactCard />
    </VideoShell>
  );
}
