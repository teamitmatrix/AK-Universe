/*
 * Applies the admin-space migrations ONE AT A TIME, with verification.
 *
 *   node --env-file=.env scripts/db/migrate-step.mjs rehearse 005  # up + checks + rollback + checks, then everything is undone
 *   node --env-file=.env scripts/db/migrate-step.mjs apply 005     # up + checks in ONE transaction: any failed check = nothing applied
 *   node --env-file=.env scripts/db/migrate-step.mjs test          # behaviour tests on the applied migrations (always rolled back)
 *   node --env-file=.env scripts/db/migrate-step.mjs rollback 005  # down + checks in one transaction
 *   node --env-file=.env scripts/db/migrate-step.mjs status
 *
 * Needs a backup first (scripts/db/backup.mjs): its row counts are the reference that must not change.
 * Every action is appended to db-backups/migration-log.json.
 */
import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CHECKS, behaviourTests } from "./checks.mjs";
import { sql } from "./lib.mjs";

const MIGRATIONS = {
  "005": "005_admin_space",
  "006": "006_revision_rounds",
  "007": "007_finance",
  "008": "008_tasks_documents",
  "009": "009_audit_log",
  "010": "010_notifications",
  "011": "011_prospects",
  "012": "012_sales_tools",
};
const [action, num] = process.argv.slice(2);
const root = process.cwd();
const log = (entry) => appendFileSync(join(root, "db-backups", "migration-log.json"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");

// Reference = the most recent backup.
const backups = readdirSync(join(root, "db-backups"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
if (!backups.length) throw new Error("No backup found: run scripts/db/backup.mjs first.");
const backupDir = join(root, "db-backups", backups.at(-1));
const manifest = JSON.parse(readFileSync(join(backupDir, "manifest.json"), "utf8"));
const profiles = JSON.parse(readFileSync(join(backupDir, "data", "profiles.json"), "utf8"));
const ctx = {
  counts: manifest.tables,
  adminId: profiles.find((p) => p.role === "admin")?.id,
  userId: profiles.find((p) => p.role !== "admin")?.id,
};
if (!ctx.adminId || !ctx.userId) throw new Error("Backup must contain one admin and one non-admin profile for the checks.");

async function status() {
  const [s] = await sql(`select
    exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='active') as "005",
    exists (select 1 from information_schema.columns where table_schema='public' and table_name='video_projects' and column_name='revision_rounds') as "006",
    exists (select 1 from pg_policies where tablename='payments' and policyname='payments: admin insert') as "007",
    to_regclass('public.tasks') is not null as "008",
    to_regclass('public.audit_log') is not null as "009",
    to_regclass('public.notifications') is not null as "010",
    to_regclass('public.prospects') is not null as "011",
    to_regclass('public.sales_documents') is not null as "012"`);
  return s;
}

const up = (n) => readFileSync(join(root, "config", "supabase", "migrations", `${MIGRATIONS[n]}.sql`), "utf8");
const down = (n) => readFileSync(join(root, "config", "supabase", "rollbacks", `${MIGRATIONS[n]}_down.sql`), "utf8");
const reason = (e) => (String(e.message).match(/CHECK_FAILED: ([^"\\]+)/)?.[1] ?? String(e.message).slice(0, 500));

// process.exit() crashes Node on Windows after fetch (libuv assertion): use exitCode + return instead.
async function main() {
  const st = await status();
  if (action === "status") {
    console.log(st);
    { process.exitCode = 0; return; }
  }
  if (!["test", "rehearse-all"].includes(action) && !MIGRATIONS[num]) throw new Error(`Unknown migration "${num}" (005–009).`);
  const order = Object.keys(MIGRATIONS);

  if (action === "rehearse-all") {
    // Whole chain in one transaction that is always undone: (A) all ups + checks + behaviour tests,
    // (B) all ups, then all downs in reverse order + down checks.
    if (order.some((n) => st[n])) throw new Error("rehearse-all expects no admin-space migration applied yet.");
    const ups = order.map((n) => `${up(n)}\n${CHECKS[n].up(ctx)}`).join("\n");
    try {
      await sql(`begin;\n${ups}\n${behaviourTests(ctx, order)}`);
      console.log("❌ unexpected: (A) did not abort");
      { process.exitCode = 1; return; }
    } catch (e) {
      const m = String(e.message).match(/TEST_RESULT:(\d+):([A-Za-z0-9+/=]+)/);
      if (!m) {
        console.log(`❌ (A) FAILED: ${reason(e)}`);
        log({ action, part: "A", result: "failed", reason: reason(e) });
        { process.exitCode = 1; return; }
      }
      const results = JSON.parse(Buffer.from(m[2], "base64").toString("utf8"));
      for (const [label, res] of Object.entries(results).sort()) console.log(`  ${String(res).startsWith("ok") ? "✅" : "❌"} ${label} — ${res}`);
      console.log(`(A) all 4 migrations + checks + ${Object.keys(results).length} behaviour tests: ${m[1] === "0" ? "✅ PASSED" : `❌ ${m[1]} FAILED`}`);
      log({ action, part: "A", failures: Number(m[1]) });
      if (m[1] !== "0") { process.exitCode = 1; return; }
    }
    const downs = [...order].reverse().map((n) => `${down(n)}\n${CHECKS[n].down(ctx)}`).join("\n");
    try {
      await sql(`begin;\n${order.map((n) => up(n)).join("\n")}\n${downs}\ndo $$ begin raise exception 'REHEARSAL_PASSED'; end $$;`);
      console.log("❌ unexpected: (B) did not abort");
      { process.exitCode = 1; return; }
    } catch (e) {
      if (!String(e.message).includes("REHEARSAL_PASSED")) {
        console.log(`❌ (B) FAILED: ${reason(e)}`);
        log({ action, part: "B", result: "failed", reason: reason(e) });
        { process.exitCode = 1; return; }
      }
      console.log("(B) all 4 migrations then all 4 rollbacks + checks: ✅ PASSED");
      log({ action, part: "B", result: "passed" });
    }
    const after = await status();
    const [{ n }] = await sql("select count(*)::int as n from auth.users where email like 'test-%@test.invalid'");
    console.log(Object.values(after).some(Boolean) || n ? "❌ something was left behind!" : "✅ Nothing was kept: database unchanged.");
    return;
  }

  if (action === "rehearse") {
    if (st[num]) throw new Error(`${num} is already applied.`);
    const missing = order.slice(0, order.indexOf(num)).filter((n) => !st[n]);
    if (missing.length) throw new Error(`Apply ${missing.join(", ")} first.`);
    // The final exception guarantees the rollback even if every step succeeded.
    const script = `begin;\n${up(num)}\n${CHECKS[num].up(ctx)}\n${down(num)}\n${CHECKS[num].down(ctx)}\ndo $$ begin raise exception 'REHEARSAL_PASSED'; end $$;`;
    try {
      await sql(script);
      console.log("❌ unexpected: rehearsal did not abort");
      { process.exitCode = 1; return; }
    } catch (e) {
      if (String(e.message).includes("REHEARSAL_PASSED")) {
        const after = await status();
        if (after[num]) throw new Error("Rehearsal left changes behind!");
        console.log(`✅ REHEARSAL ${num}: migration + checks + rollback + checks all passed — nothing was kept.`);
        log({ action, num, result: "passed" });
      } else {
        console.log(`❌ REHEARSAL ${num} FAILED: ${reason(e)}`);
        log({ action, num, result: "failed", reason: reason(e) });
        { process.exitCode = 1; return; }
      }
    }
  } else if (action === "apply") {
    if (st[num]) throw new Error(`${num} is already applied.`);
    const missing = order.slice(0, order.indexOf(num)).filter((n) => !st[n]);
    if (missing.length) throw new Error(`Apply ${missing.join(", ")} first.`);
    try {
      await sql(`begin;\n${up(num)}\n${CHECKS[num].up(ctx)}\ncommit;`);
    } catch (e) {
      console.log(`❌ APPLY ${num} FAILED — nothing applied: ${reason(e)}`);
      log({ action, num, result: "failed", reason: reason(e) });
      { process.exitCode = 1; return; }
    }
    const after = await status();
    if (!after[num]) throw new Error(`${num} not visible after commit.`);
    // Re-run the checks outside the transaction (read-only).
    await sql(CHECKS[num].up(ctx));
    console.log(`✅ APPLIED ${num} — post-commit checks passed.`);
    log({ action, num, result: "applied" });
  } else if (action === "rollback") {
    if (!st[num]) throw new Error(`${num} is not applied.`);
    const later = order.slice(order.indexOf(num) + 1).filter((n) => st[n]);
    if (later.length) throw new Error(`Roll back ${later.reverse().join(", ")} first.`);
    try {
      await sql(`begin;\n${down(num)}\n${CHECKS[num].down(ctx)}\ncommit;`);
    } catch (e) {
      console.log(`❌ ROLLBACK ${num} FAILED — nothing changed: ${reason(e)}`);
      { process.exitCode = 1; return; }
    }
    if (num === "008") {
      // Storage rows cannot be deleted in SQL: remove the bucket through the Storage API, only if empty.
      const [{ files }] = await sql("select count(*)::int as files from storage.objects where bucket_id = 'documents'");
      if (files > 0) console.log(`⚠️  Bucket "documents" kept: it still holds ${files} file(s). Delete them in the Supabase dashboard, then the bucket.`);
      else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket/documents`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" },
        });
        console.log(res.ok || res.status === 404 ? "  ✅ empty bucket \"documents\" removed" : `  ⚠️  could not remove bucket (HTTP ${res.status}): remove it in the dashboard`);
      }
    }
    console.log(`✅ ROLLED BACK ${num}.`);
    log({ action, num, result: "rolled back" });
  } else if (action === "test") {
    const applied = order.filter((n) => st[n]);
    if (!applied.includes("005")) throw new Error("Behaviour tests need 005 applied.");
    try {
      await sql(behaviourTests(ctx, applied));
      console.log("❌ unexpected: tests did not abort");
      { process.exitCode = 1; return; }
    } catch (e) {
      const m = String(e.message).match(/TEST_RESULT:(\d+):([A-Za-z0-9+/=]+)/);
      if (!m) {
        console.log(`❌ TESTS CRASHED: ${String(e.message).slice(0, 800)}`);
        { process.exitCode = 1; return; }
      }
      const results = JSON.parse(Buffer.from(m[2], "base64").toString("utf8"));
      for (const [label, res] of Object.entries(results).sort()) console.log(`  ${String(res).startsWith("ok") ? "✅" : "❌"} ${label} — ${res}`);
      const [{ n }] = await sql("select count(*)::int as n from auth.users where email like 'test-%@test.invalid'");
      console.log(`\n${m[1] === "0" ? "✅ ALL TESTS PASSED" : `❌ ${m[1]} TEST(S) FAILED`} (${Object.keys(results).length} checks, migrations ${applied.join(", ")}) · leftover test users: ${n}`);
      log({ action, applied, failures: Number(m[1]) });
      { process.exitCode = m[1] === "0" && n === 0 ? 0 : 1; return; }
    }
  } else {
    console.log("Usage: migrate-step.mjs status | rehearse <n> | apply <n> | test | rollback <n>");
  }

}
await main();
