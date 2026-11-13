/*
 * Read-only logical backup of the live database, BEFORE any admin-space migration:
 *   node --env-file=.env scripts/db/backup.mjs
 *
 * Writes db-backups/<timestamp>/ (git-ignored — it contains personal data):
 *   data/<table>.json      every row of every table in the public schema
 *   schema.json            columns, constraints, indexes, RLS policies (public + storage), functions, triggers
 *   storage.json           storage buckets and the list of stored files (not their contents)
 *   manifest.json          row counts + SHA-256 of each file, used by verify-backup.mjs
 * auth.users is NOT exported (password hashes; no migration touches it) — only its row count is recorded.
 * Nothing is written to the database.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ident, projectRef, sql } from "./lib.mjs";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(process.cwd(), "db-backups", stamp);
mkdirSync(join(dir, "data"), { recursive: true });
const manifest = { project: projectRef, createdAt: new Date().toISOString(), tables: {}, files: {} };
const save = (name, value) => {
  const body = JSON.stringify(value, null, 2);
  writeFileSync(join(dir, name), body);
  manifest.files[name] = { bytes: Buffer.byteLength(body), sha256: createHash("sha256").update(body).digest("hex") };
};

console.log(`Backup of project ${projectRef} → ${dir}`);

// ---------- Data: every public table, paged ----------
const tables = await sql(
  "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name"
);
const PAGE = 500;
for (const { table_name: t } of tables) {
  const [{ n }] = await sql(`select count(*)::int as n from public.${ident(t)}`);
  const rows = [];
  for (let offset = 0; offset < n; offset += PAGE) {
    // ctid order = stable physical order within this read; fine for a one-shot export.
    const [{ page }] = await sql(
      `select coalesce(json_agg(t), '[]'::json) as page from (select * from public.${ident(t)} order by ctid offset ${offset} limit ${PAGE}) t`
    );
    rows.push(...page);
  }
  if (rows.length !== n) throw new Error(`Row count mismatch on ${t}: expected ${n}, got ${rows.length}`);
  manifest.tables[t] = n;
  save(`data/${t}.json`, rows);
  console.log(`  ✅ ${t.padEnd(24)} ${n} rows`);
}

// ---------- Schema ----------
const q = async (label, query) => {
  const rows = await sql(query);
  console.log(`  ✅ schema: ${label.padEnd(18)} ${rows.length}`);
  return rows;
};
const schema = {
  columns: await q(
    "columns",
    "select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position"
  ),
  constraints: await q(
    "constraints",
    "select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2"
  ),
  indexes: await q("indexes", "select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2"),
  policies: await q(
    "policies",
    "select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname in ('public', 'storage') order by 1, 2, 3"
  ),
  functions: await q(
    "functions",
    "select p.proname, pg_get_function_identity_arguments(p.oid) as args, pg_get_functiondef(p.oid) as definition from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1"
  ),
  triggers: await q(
    "triggers",
    "select tgrelid::regclass::text as table_name, tgname, pg_get_triggerdef(oid) as definition from pg_trigger where not tgisinternal and tgrelid::regclass::text not like 'storage.%' order by 1, 2"
  ),
  rls: await q("rls flags", "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1"),
};
save("schema.json", schema);

// ---------- Storage (metadata only) + auth count ----------
const storage = {
  buckets: await sql("select id, name, public, file_size_limit, allowed_mime_types, created_at from storage.buckets order by id"),
  objects: await sql("select bucket_id, name, metadata->>'size' as size, created_at from storage.objects order by bucket_id, name"),
};
save("storage.json", storage);
const [{ n: authUsers }] = await sql("select count(*)::int as n from auth.users");
manifest.authUsers = authUsers;
console.log(`  ✅ storage: ${storage.buckets.length} bucket(s), ${storage.objects.length} file(s) · auth.users: ${authUsers} (count only)`);

writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nBackup complete: ${Object.keys(manifest.tables).length} tables, ${Object.values(manifest.tables).reduce((a, b) => a + b, 0)} rows.`);
console.log(dir);
