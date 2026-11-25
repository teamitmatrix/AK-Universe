import { NextResponse } from "next/server";
import { signQuoteByToken } from "@/lib/commercial/sign-quote";

const MAX_BODY_BYTES = 220 * 1024;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let body: { token?: string; signerName?: string; signature?: string };
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const result = await signQuoteByToken({
    token: body.token ?? "",
    signerName: body.signerName ?? "",
    signatureDataUrl: body.signature ?? "",
  });
  if (!result.success) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "already_signed" || result.error === "not_open" || result.error === "not_quote"
          ? 409
          : result.error === "too_large"
            ? 413
            : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ success: true });
}
