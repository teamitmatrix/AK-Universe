import type { MetadataRoute } from "next";
import { agents } from "@/config/agents";
import { loadDefaultConfig } from "@/lib/video-config";
import { getSiteUrl } from "@/lib/supabase/env";

const PUBLIC_PAGES = ["/", "/marketing", "/services", "/marketing/forfaits", "/agents-ia", "/agents-ia/tarifs", "/digital", "/connexion", "/inscription", "/mentions-legales", "/confidentialite", "/cgv"];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const services = loadDefaultConfig().services.map((service) => `/services/${service.slug}`);
  const agentPages = agents.map((agent) => `/agents-ia/${agent.id}`);
  return [...PUBLIC_PAGES, ...agentPages, ...services].map((p) => ({ url: `${site}${p}` }));
}
