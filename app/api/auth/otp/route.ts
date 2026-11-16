import { NextResponse } from "next/server";
import {
  resendLoginOtp,
  resendSignupOtp,
  verifyLoginOtp,
  verifySignupOtp,
} from "@/lib/auth/otp-service";

export const runtime = "nodejs";

type Body = {
  action?: "verify" | "resend";
  step?: "login" | "signup";
  code?: string;
  email?: string;
  lang?: string;
};

/**
 * JSON OTP endpoints for /verification.
 * Server Actions POST to the page URL and often get 502 Bad Gateway behind nginx
 * (RSC payload + Set-Cookie). Plain JSON API responses are reliable on IONOS.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, code: "invalid_input" }, { status: 400 });
  }

  const step = body.step === "login" ? "login" : "signup";
  const action = body.action === "resend" ? "resend" : "verify";

  try {
    if (action === "verify") {
      const code = String(body.code ?? "").trim();
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ success: false, code: "otp_invalid" }, { status: 400 });
      }
      const result =
        step === "login" ? await verifyLoginOtp(code) : await verifySignupOtp(String(body.email ?? ""), code);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    const result = step === "login" ? await resendLoginOtp(body.lang) : await resendSignupOtp(body.lang);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (cause) {
    console.error("api/auth/otp failed", cause);
    return NextResponse.json({ success: false, code: "unknown" }, { status: 500 });
  }
}
