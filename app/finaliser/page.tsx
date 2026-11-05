import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FinaliserView } from "@/components/video/FinaliserView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Devis ou acompte — AK Universe" },
  description: "Choisissez comment finaliser votre projet vidéo.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const [config, user] = await Promise.all([getVideoConfig(), getCurrentUser()]);
  return (
    <>
      <SiteHeader active="none" signedIn={!!user} />
      <VideoShell config={config} header={false}>
        <FinaliserView />
      </VideoShell>
    </>
  );
}
