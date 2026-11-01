import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/*
 * Two-factor sign-in by e-mail. After a correct password no session is created yet:
 *   aku-2fa      (15 min)  the password was checked for this user; allows "resend code" and remembers "Se souvenir de moi"
 *   aku-trusted  (30 days) set after a code was entered with "Se souvenir de moi": this browser skips the code
 * Both are httpOnly and HMAC-signed, so they cannot be forged or read by page scripts.
 */

const PENDING = "aku-2fa";
const TRUSTED = "aku-trusted";
const PENDING_TTL = 15 * 60;
const TRUSTED_TTL = 30 * 24 * 3600;

function secret() {
  const base = process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Missing AUTH_SECRET (or SUPABASE_SERVICE_ROLE_KEY).");
  return createHmac("sha256", "aku-auth-cookies").update(base).digest();
}

function sign(payload: object) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${createHmac("sha256", secret()).update(data).digest("base64url")}`;
}

function verify<T extends { exp: number }>(value: string | undefined): T | null {
  if (!value) return null;
  const [data, mac] = value.split(".");
  if (!data || !mac) return null;
  const expected = createHmac("sha256", secret()).update(data).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as T;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

type Pending = { uid: string; email: string; remember: boolean; exp: number };

export async function setPendingLogin(uid: string, email: string, remember: boolean) {
  const exp = Math.floor(Date.now() / 1000) + PENDING_TTL;
  (await cookies()).set(PENDING, sign({ uid, email, remember, exp }), cookieOptions(PENDING_TTL));
}

export async function getPendingLogin() {
  return verify<Pending>((await cookies()).get(PENDING)?.value);
}

export async function clearPendingLogin() {
  (await cookies()).delete(PENDING);
}

export async function trustThisDevice(uid: string) {
  const exp = Math.floor(Date.now() / 1000) + TRUSTED_TTL;
  (await cookies()).set(TRUSTED, sign({ uid, exp }), cookieOptions(TRUSTED_TTL));
}

export async function isTrustedDevice(uid: string) {
  return verify<{ uid: string; exp: number }>((await cookies()).get(TRUSTED)?.value)?.uid === uid;
}
