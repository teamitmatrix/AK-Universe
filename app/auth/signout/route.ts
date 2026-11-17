import { NextResponse } from "next/server";
import { safeRedirect } from "@/lib/auth/redirect";
import { publicOrigin } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const next = safeRedirect(form?.get("redirectTo")?.toString());
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL(next, publicOrigin(request)), { status: 303 });
}
