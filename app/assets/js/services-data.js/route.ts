import { getVideoConfig } from "@/lib/video-config";

/*
 * Replaces the static services-data.js: the legacy pages (services, projet, admin…)
 * still load /assets/js/services-data.js, now built from defaults + admin prices.
 */
export async function GET() {
  const config = await getVideoConfig();
  return new Response(`window.AKU_CONFIG = ${JSON.stringify(config)};\n`, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Admin price changes reach visitors within a minute.
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
