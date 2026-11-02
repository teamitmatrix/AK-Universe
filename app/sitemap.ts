import type { MetadataRoute } from "next";
import { loadDefaultConfig } from "@/lib/video-config";
import { getSiteUrl } from "@/lib/supabase/env";

const PUBLIC_PAGES = ["/", "/marketing", "/services", "/marketing/forfaits", "/agents-ia/tarifs", "/connexion", "/inscription", "/mentions-legales", "/confidentialite", "/cgv"];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const services = loadDefaultConfig().services.map((service) => `/services/${service.slug}`);
  return [...PUBLIC_PAGES, ...services].map((p) => ({ url: `${site}${p}` }));
}
