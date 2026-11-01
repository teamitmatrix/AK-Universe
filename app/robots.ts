import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin.html", "/api/", "/auth/", "/paiement.html", "/abonnement.html", "/organisation.html", "/verification.html"],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
