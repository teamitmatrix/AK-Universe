import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ServiceView } from "@/components/video/ServiceView";
import { VideoShell } from "@/components/video/VideoShell";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocalizedVideoConfig } from "@/i18n/data";
import { getT } from "@/i18n/server";

export async function serviceMetadata(slug: string): Promise<Metadata> {
  const [config, t] = await Promise.all([getLocalizedVideoConfig(), getT()]);
  const service = config.services.find((item) => item.slug === slug);
  if (!service) return { title: { absolute: t("Service — AK Universe") } };
  return {
    title: { absolute: `${service.name} — AK Universe` },
    description: service.description,
  };
}

export async function ServiceRoute({ slug }: { slug: string }) {
  const [config, user] = await Promise.all([getLocalizedVideoConfig(), getCurrentUser()]);
  if (!config.services.some((service) => service.slug === slug)) notFound();
  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="tous" />
      <VideoShell config={config} bare>
        <ServiceView slug={slug} />
      </VideoShell>
      <SiteFooter />
    </>
  );
}
