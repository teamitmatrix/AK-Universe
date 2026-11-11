/*
 * Renew the Apple secret only when it expires within 30 days.
 * The IONOS container runs this once a day. `npm run apple:secret:due` does the same locally.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const stamp = process.env.APPLE_SECRET_STAMP
  || join(dirname(fileURLToPath(import.meta.url)), "..", ".apple-secret-expires");
const renewWithinDays = 30;

function daysLeft(isoDate) {
  const expires = new Date(`${isoDate}T00:00:00Z`).getTime();
  return Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000));
}

if (!existsSync(stamp)) {
  const assumed = process.env.APPLE_SECRET_EXPIRES
    || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  mkdirSync(dirname(stamp), { recursive: true });
  writeFileSync(stamp, `${assumed}\n`);
  console.log(`Apple secret was just saved. Next renewal is due 30 days before ${assumed}.`);
  process.exit(0);
}

const expiresOn = readFileSync(stamp, "utf8").trim();
const left = daysLeft(expiresOn);
if (left > renewWithinDays) {
  console.log(`Apple secret expires on ${expiresOn} (${left} days left). Nothing to do.`);
  process.exit(0);
}

console.log(`Apple secret expires on ${expiresOn} (${left} days left). Renewing.`);
const child = spawnSync(process.execPath, [fileURLToPath(new URL("./apple-secret.mjs", import.meta.url))], {
  stdio: "inherit",
  env: process.env,
});
process.exit(child.status ?? 1);
