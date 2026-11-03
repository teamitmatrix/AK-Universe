import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.100.46"],

  // The video catalogue is read from disk by app/lib/video-config.ts.
  outputFileTracingIncludes: {
    "/**": ["./config/services-data.js"],
  },

  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      // Aliases kept from the static site (they were meta-refresh pages).
      { source: "/tarifs.html", destination: "/agents-ia/tarifs", permanent: true },
      { source: "/marketing/mon-projet.html", destination: "/projet", permanent: true },
      // Old typo / duplicate URLs that may already have been shared.
      { source: "/information.html", destination: "/devis", permanent: false },
      { source: "/informations", destination: "/devis", permanent: false },
      { source: "/marketing/mon-project.html", destination: "/projet", permanent: true },
      { source: "/marketing/index.html", destination: "/marketing", permanent: true },
      { source: "/marketing/services.html", destination: "/services", permanent: true },
      { source: "/agents-ia/index.html", destination: "/agents-ia", permanent: true },
      { source: "/agents-ia/marketing.html", destination: "/marketing", permanent: true },
      { source: "/agents-ia/services/:slug", destination: "/services/:slug", permanent: true },
      {
        source: "/services/video-recurutment-marque-employeur.html",
        destination: "/services/video-recrutement-marque-employeur",
        permanent: true,
      },
      // Every former .html page now lives at the same path without the suffix.
      { source: "/:path*.html", destination: "/:path*", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // No script allow-list: the static pages use inline scripts and Google Translate loads its own.
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
