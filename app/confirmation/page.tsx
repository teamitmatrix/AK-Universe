import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/video/ConfirmationView";
import { VideoShell } from "@/components/video/VideoShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Confirmation — AK Universe" },
  description: "Votre commande est bien enregistrée.",
  robots: { index: false, follow: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const agents = one(params.universe) === "agents";
  const [config, user] = await Promise.all([getVideoConfig(), getCurrentUser()]);

  if (agents) {
    return (
      <>
        <SiteHeader active="agents" signedIn={!!user} />
        <Suspense fallback={null}>
          <ConfirmationView />
        </Suspense>
        <SiteFooter />
      </>
    );
  }

  return (
    <VideoShell config={config}>
      <Suspense fallback={null}>
        <ConfirmationView />
      </Suspense>
    </VideoShell>
  );
}
