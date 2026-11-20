import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getClientMe } from "@/lib/client/session";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/*
 * Two-factor authentication of the client space, with Supabase Auth MFA (TOTP authenticator apps). Nothing custom:
 * secrets, codes and the session assurance level are handled by Supabase. JSON route (not a server action) because
 * a verified code upgrades the session cookie to aal2 — the codebase avoids Set-Cookie from server actions (502
 * behind nginx, see /api/auth/otp).
 *   enroll    → new TOTP factor (QR code + secret to type), replacing any unfinished one
 *   activate  → first code from the app: the factor becomes verified, 2FA is on, the session is aal2
 *   challenge → sign-in step: code from the app for a session that has not passed 2FA yet
 *   disable   → current code from the app (proves possession), then the factor is removed
 */

type Body = { action?: string; factorId?: string; code?: string };

const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const isCode = (v: unknown): v is string => typeof v === "string" && /^\d{6}$/.test(v);

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ success: false, code: "invalid" }, 400);
  }

  const supabase = await createClient();
  const action = body.action;

  // The sign-in step only needs a signed-in user (who has not passed 2FA yet, so getClientMe is null by design).
  if (action === "challenge") {
    if (!(await getCurrentUser())) return json({ success: false, code: "forbidden" }, 401);
    if (!isCode(body.code)) return json({ success: false, code: "invalid" }, 400);
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (!factor) return json({ success: true });
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: body.code });
    return error ? json({ success: false, code: "code_invalid" }, 400) : json({ success: true });
  }

  // Everything else: an active customer whose session already passed 2FA when it is on.
  const me = await getClientMe();
  if (!me) return json({ success: false, code: "forbidden" }, 401);

  const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
  if (listErr) return json({ success: false, code: "failed" }, 500);
  const all = factors?.all ?? [];
  const verified = factors?.totp.find((f) => f.status === "verified");

  if (action === "enroll") {
    if (verified) return json({ success: false, code: "already_enabled" }, 409);
    // Drop unfinished enrolments so only one pending factor exists.
    for (const f of all.filter((x) => x.factor_type === "totp" && x.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `AK Universe ${Date.now()}`, issuer: "AK Universe" });
    if (error || !data) {
      console.error("MFA enroll failed:", error?.message);
      return json({ success: false, code: "failed" }, 500);
    }
    return json({ success: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  if (action === "activate") {
    if (!isCode(body.code) || typeof body.factorId !== "string") return json({ success: false, code: "invalid" }, 400);
    const factor = all.find((f) => f.id === body.factorId && f.factor_type === "totp");
    if (!factor) return json({ success: false, code: "invalid" }, 400);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: body.code });
    return error ? json({ success: false, code: "code_invalid" }, 400) : json({ success: true });
  }

  if (action === "disable") {
    if (!verified) return json({ success: true });
    if (!isCode(body.code)) return json({ success: false, code: "invalid" }, 400);
    // Prove possession of the authenticator right now (also lifts the session to aal2, required to unenroll).
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: verified.id, code: body.code });
    if (verifyErr) return json({ success: false, code: "code_invalid" }, 400);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
    if (error) {
      console.error("MFA unenroll failed:", error.message);
      return json({ success: false, code: "failed" }, 500);
    }
    return json({ success: true });
  }

  return json({ success: false, code: "invalid" }, 400);
}
