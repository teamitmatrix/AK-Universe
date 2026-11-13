/*
 * Field-by-field comparison of a backup with the live database: every backed-up row must still exist with
 * exactly the same values in every column it had (new columns added by migrations are ignored).
 *   node --env-file=.env scripts/db/compare-backup.mjs db-backups/<timestamp>
 * Read-only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ident, sql } from "./lib.mjs";

const dir = process.argv[2];
if (!dir) throw new Error("Usage: compare-backup.mjs db-backups/<timestamp>");
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Primary key of each table, read from the backup (matching rows by anything else would be wrong).
const schema = JSON.parse(readFileSync(join(dir, "schema.json"), "utf8"));
const KEYS = Object.fromEntries(
  schema.constraints
    .filter((c) => c.definition.startsWith("PRIMARY KEY"))
    .map((c) => [c.table_name.replace(/^public\./, ""), c.definition.match(/\(([^)]+)\)/)[1].split(",").map((k) => k.trim())]),
);
let problems = 0;

for (const table of Object.keys(manifest.tables)) {
  const backup = JSON.parse(readFileSync(join(dir, "data", `${table}.json`), "utf8"));
  const [{ live }] = await sql(`select coalesce(json_agg(t), '[]'::json) as live from public.${ident(table)} t`);
  const keys = KEYS[table];
  if (!keys) throw new Error(`No primary key found for ${table}`);
  const keyOf = (r) => keys.map((k) => r[k]).join("|");
  const liveByKey = new Map(live.map((r) => [keyOf(r), r]));
  let changed = 0;
  const say = (msg) => changed <= 5 && console.log(msg);
  for (const row of backup) {
    const now = liveByKey.get(keyOf(row));
    if (!now) {
      changed++;
      say(`  ❌ ${table}: row ${keyOf(row)} is missing`);
      continue;
    }
    for (const [col, value] of Object.entries(row)) {
      if (!same(value, now[col])) {
        changed++;
        say(`  ❌ ${table}.${col} changed on row ${keyOf(row)}`);
      }
    }
  }
  const extra = live.length - backup.length;
  problems += changed + Math.max(0, extra);
  console.log(`  ${changed || extra ? "❌" : "✅"} ${table.padEnd(22)} ${backup.length} rows identical${extra ? ` · ${extra} new row(s)` : ""}`);
}
console.log(problems ? `\n❌ ${problems} DIFFERENCE(S)` : "\n✅ LIVE DATA IDENTICAL TO BACKUP (all original rows and values)");
process.exitCode = problems ? 1 : 0;
