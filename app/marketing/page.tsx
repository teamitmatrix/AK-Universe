import type { Metadata } from "next";
import { MarketingView } from "@/components/video/MarketingView";
import { VideoShell } from "@/components/video/VideoShell";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Marketing Digital — AK Universe" },
  description:
    "Vidéos et outils marketing propulsés par l'IA pour attirer plus de clients et développer votre visibilité.",
};

export default async function Page() {
  const config = await getVideoConfig();
  return (
    <VideoShell config={config}>
      <MarketingView />
    </VideoShell>
  );
}
