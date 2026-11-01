import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/supabase/env";

const PUBLIC_PAGES = ["/", "/marketing.html", "/services.html", "/marketing/forfaits.html", "/agents-ia/tarifs.html", "/connexion.html", "/inscription.html", "/mentions-legales.html", "/confidentialite.html", "/cgv.html"];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const services = fs
    .readdirSync(path.join(process.cwd(), "legacy-source", "services"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => `/services/${f}`);
  return [...PUBLIC_PAGES, ...services].map((p) => ({ url: `${site}${p}` }));
}
