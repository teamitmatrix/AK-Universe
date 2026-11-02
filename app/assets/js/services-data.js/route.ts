import { getVideoConfig } from "@/lib/video-config";

/*
 * Catalogue endpoint kept for anything that still requests /assets/js/services-data.js.
 * The React pages read the same config on the server (defaults + admin prices).
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
