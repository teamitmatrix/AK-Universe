import type { Metadata } from "next";
import { ServicesList } from "@/components/video/ServicesList";
import { VideoShell } from "@/components/video/VideoShell";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Nos services vidéo — AK Universe" },
  description:
    "Découvrez nos services vidéo et composez votre projet en quelques clics : devis personnalisé ou réservation avec acompte.",
};

export default async function Page() {
  const config = await getVideoConfig();
  return (
    <VideoShell config={config} active="services">
      <ServicesList />
    </VideoShell>
  );
}
