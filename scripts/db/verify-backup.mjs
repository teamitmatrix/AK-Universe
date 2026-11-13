/*
 * Checks a backup made by backup.mjs: every file is intact (SHA-256) and parses, and the row counts still
 * match the live database (i.e. nothing changed since the backup).
 *   node --env-file=.env scripts/db/verify-backup.mjs db-backups/<timestamp>
 * Read-only.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ident, sql } from "./lib.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: verify-backup.mjs db-backups/<timestamp>");
  throw new Error("missing backup directory");
}
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
let ok = true;
const fail = (msg) => {
  ok = false;
  console.log(`  ❌ ${msg}`);
};

for (const [name, meta] of Object.entries(manifest.files)) {
  const body = readFileSync(join(dir, name), "utf8");
  const sha = createHash("sha256").update(body).digest("hex");
  if (sha !== meta.sha256) fail(`${name}: checksum differs`);
  else JSON.parse(body);
}
console.log(`  ✅ ${Object.keys(manifest.files).length} files: checksums OK, JSON parses`);

for (const [table, n] of Object.entries(manifest.tables)) {
  const rows = JSON.parse(readFileSync(join(dir, "data", `${table}.json`), "utf8"));
  const [{ live }] = await sql(`select count(*)::int as live from public.${ident(table)}`);
  if (rows.length !== n) fail(`${table}: file has ${rows.length} rows, manifest says ${n}`);
  else if (live !== n) fail(`${table}: live has ${live} rows, backup has ${n} (data changed since backup)`);
}
if (ok) console.log(`  ✅ ${Object.keys(manifest.tables).length} tables: file rows = manifest = live`);
console.log(ok ? "\nBACKUP VERIFIED" : "\nBACKUP CHECK FAILED");
process.exitCode = ok ? 0 : 1;
