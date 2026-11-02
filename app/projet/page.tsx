import type { Metadata } from "next";
import { ProjetView } from "@/components/video/ProjetView";
import { VideoShell } from "@/components/video/VideoShell";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Mon projet — AK Universe" },
  description: "Votre projet vidéo AK Universe.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const config = await getVideoConfig();
  return (
    <VideoShell config={config} active="projet">
      <ProjetView />
    </VideoShell>
  );
}
