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
      // Short edge cache; catalogue save revalidates this path so admin edits land quickly.
      "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
