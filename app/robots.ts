import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/auth/", "/paiement", "/abonnement", "/organisation", "/verification"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
