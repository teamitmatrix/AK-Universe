import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProjetView } from "@/components/video/ProjetView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Mon projet — AK Universe" },
  description: "Votre projet vidéo AK Universe.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const [config, user] = await Promise.all([getVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="none" signedIn={!!user} />
      <VideoShell config={config} header={false}>
        <ProjetView />
      </VideoShell>
    </>
  );
}
