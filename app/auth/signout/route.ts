import { cookies } from "next/headers";
import { safeRedirect } from "@/lib/auth/redirect";
import { redirectToPath } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  // Staff logout should land on sign-in; bare "/" keeps a soft-cached portal view on some browsers.
  // safeRedirect already accepts undefined; keep an explicit string fallback for the Location header.
  const next = safeRedirect(form?.get("redirectTo")?.toString(), "/connexion") || "/connexion";

  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = redirectToPath(next, 303);

  // Ensure auth cookies are cleared on this redirect response (not only on the cookie store).
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (name.startsWith("sb-") || name.includes("auth-token")) {
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      );
    }
  }

  return response;
}
