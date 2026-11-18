/*
 * One-shot: apply config/supabase/migrations/015_commercial_line_rates.sql
 *   node --env-file=.env scripts/db/apply-015.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'commission_rate_ai'
      ) as ai,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'commission_rate_marketing'
      ) as marketing,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'commission_rate_digital'
      ) as digital
  `);
  return after;
}

const before = await verify();
if (before.ai && before.marketing && before.digital) {
  console.log("✅ 015 already applied", before);
  process.exitCode = 0;
} else {
  console.log("Applying 015… current state:", before);
  const q = readFileSync(join(process.cwd(), "config/supabase/migrations/015_commercial_line_rates.sql"), "utf8");
  await sql(q);
  const after = await verify();
  console.log("Applied 015:", after);
  if (!after.ai || !after.marketing || !after.digital) {
    console.error("❌ Verification failed");
    process.exitCode = 1;
  } else {
    console.log("✅ 015_commercial_line_rates applied");
    process.exitCode = 0;
  }
}
