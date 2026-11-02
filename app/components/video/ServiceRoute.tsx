import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceView } from "@/components/video/ServiceView";
import { VideoShell } from "@/components/video/VideoShell";
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
  const config = await getVideoConfig();
  if (!config.services.some((service) => service.slug === slug)) notFound();
  return (
    <VideoShell config={config} active="services" currentSlug={slug}>
      <ServiceView slug={slug} />
    </VideoShell>
  );
}
