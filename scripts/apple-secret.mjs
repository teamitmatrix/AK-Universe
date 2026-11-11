/*
 * Renew the Sign in with Apple client secret and save it in Supabase.
 *   npm run apple:secret
 * Apple secrets expire after 6 months. The .p8 file stays on this machine; nothing secret is printed.
 * Requires in .env: SUPABASE_ACCESS_TOKEN, NEXT_PUBLIC_SUPABASE_URL,
 *   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_PRIVATE_KEY_PATH
 */
import { createPrivateKey, createSign } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const env = process.env;
const missing = ["SUPABASE_ACCESS_TOKEN", "NEXT_PUBLIC_SUPABASE_URL", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_SERVICES_ID", "APPLE_PRIVATE_KEY_PATH"].filter(
  (name) => !env[name]
);
if (missing.length) {
  console.error(`❌ Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not a supabase.co project URL");
  process.exit(1);
}

/** JOSE ES256 needs raw R||S. Node's signer returns DER. */
function derToRaw(der) {
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error("The .p8 signature was not DER");
  if (der[offset] & 0x80) offset += 1 + (der[offset] & 0x7f);
  else offset += 1;
  const read = () => {
    if (der[offset++] !== 0x02) throw new Error("The .p8 signature was not DER");
    const length = der[offset++];
    let data = der.subarray(offset, offset + length);
    offset += length;
    if (data[0] === 0x00) data = data.subarray(1);
    if (data.length > 32) throw new Error("Unexpected ECDSA integer length");
    const out = Buffer.alloc(32);
    data.copy(out, 32 - data.length);
    return out;
  };
  return Buffer.concat([read(), read()]);
}

const b64url = (value) => Buffer.from(value).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const exp = now + 180 * 24 * 60 * 60;
const header = b64url(JSON.stringify({ alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" }));
const payload = b64url(
  JSON.stringify({
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp,
    aud: "https://appleid.apple.com",
    sub: env.APPLE_SERVICES_ID,
  })
);
const signingInput = `${header}.${payload}`;
const signer = createSign("SHA256");
signer.update(signingInput);
const signature = derToRaw(signer.sign(createPrivateKey(readFileSync(env.APPLE_PRIVATE_KEY_PATH))));
const secret = `${signingInput}.${b64url(signature)}`;

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    external_apple_enabled: true,
    external_apple_client_id: env.APPLE_SERVICES_ID,
    external_apple_secret: secret,
  }),
});
if (!res.ok) {
  console.error(`❌ Supabase rejected the update (${res.status})`);
  process.exit(1);
}

const expiresOn = new Date(exp * 1000).toISOString().slice(0, 10);
const stamp = process.env.APPLE_SECRET_STAMP
  || join(dirname(fileURLToPath(import.meta.url)), "..", ".apple-secret-expires");
mkdirSync(dirname(stamp), { recursive: true });
writeFileSync(stamp, `${expiresOn}\n`);
console.log(`✅ Apple secret saved in Supabase. It expires on ${expiresOn}. Run this again before that date.`);
