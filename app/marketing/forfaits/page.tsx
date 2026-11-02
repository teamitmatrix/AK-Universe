import type { Metadata } from "next";
import { ForfaitsView } from "@/components/video/ForfaitsView";
import { VideoShell } from "@/components/video/VideoShell";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Forfaits Marketing — AK Universe" },
  description:
    "Des forfaits vidéo et marketing sur-mesure pour booster votre visibilité, attirer plus de clients et développer votre activité.",
};

export default async function Page() {
  const config = await getVideoConfig();
  return (
    <VideoShell config={config}>
      <ForfaitsView />
    </VideoShell>
  );
}
