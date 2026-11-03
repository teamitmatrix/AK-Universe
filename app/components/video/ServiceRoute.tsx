import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ServiceView } from "@/components/video/ServiceView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export async function serviceMetadata(slug: string): Promise<Metadata> {
  const config = await getVideoConfig();
  const service = config.services.find((item) => item.slug === slug);
  if (!service) return { title: { absolute: "Service — AK Universe" } };
  return {
    title: { absolute: `${service.name} — AK Universe` },
    description: service.description,
  };
}

export async function ServiceRoute({ slug }: { slug: string }) {
  const [config, user] = await Promise.all([getVideoConfig(), getCurrentUser()]);
  if (!config.services.some((service) => service.slug === slug)) notFound();
  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active={slug === "video-reseaux-sociaux" ? "social" : "services"} />
      <VideoShell config={config} bare>
        <ServiceView slug={slug} />
      </VideoShell>
      <SiteFooter />
    </>
  );
}
