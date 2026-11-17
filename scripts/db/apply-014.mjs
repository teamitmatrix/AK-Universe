/*
 * One-shot: apply config/supabase/migrations/014_commission_enhancements.sql
 *   node --env-file=.env scripts/db/apply-014.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'sales_documents' and column_name = 'amount_paid_cents'
      ) as amount_paid,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'commercial_id'
      ) as sub_commercial,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'commissions' and column_name = 'payment_id'
      ) as payment_id,
      exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'ensure_subscription_commission'
      ) as rpc,
      exists (
        select 1 from pg_policies
        where tablename = 'subscriptions' and policyname = 'subscriptions: admin update commercial'
      ) as policy
  `);
  return after;
}

const before = await verify();
if (before.amount_paid && before.sub_commercial && before.payment_id && before.rpc && before.policy) {
  console.log("✅ 014 already applied", before);
  process.exitCode = 0;
} else {
  console.log("Applying 014… current state:", before);
  const q = readFileSync(join(process.cwd(), "config/supabase/migrations/014_commission_enhancements.sql"), "utf8");
  await sql(q);
  const after = await verify();
  console.log("Applied 014:", after);
  if (!after.amount_paid || !after.sub_commercial || !after.payment_id || !after.rpc || !after.policy) {
    console.error("❌ Verification failed");
    process.exitCode = 1;
  } else {
    console.log("✅ 014_commission_enhancements applied");
    process.exitCode = 0;
  }
}
