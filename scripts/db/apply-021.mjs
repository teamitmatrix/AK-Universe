/*
 * One-shot: apply config/supabase/migrations/021_terms_acceptance.sql
 *   node --env-file=.env.local --env-file=.env scripts/db/apply-021.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'terms_accepted'
      ) as sub_terms_accepted,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'terms_version'
      ) as sub_terms_version,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'terms_label'
      ) as sub_terms_label,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'terms_accepted_at'
      ) as sub_terms_accepted_at,
      to_regclass('public.terms_acceptances') is not null as terms_table
  `);
  return after;
}

const before = await verify();
if (
  before.sub_terms_accepted &&
  before.sub_terms_version &&
  before.sub_terms_label &&
  before.sub_terms_accepted_at &&
  before.terms_table
) {
  console.log("✅ 021 already applied", before);
  process.exitCode = 0;
} else {
  console.log("Applying 021… current state:", before);
  const q = readFileSync(join(process.cwd(), "config/supabase/migrations/021_terms_acceptance.sql"), "utf8");
  await sql(q);
  const after = await verify();
  console.log("Applied 021:", after);
  if (
    !after.sub_terms_accepted ||
    !after.sub_terms_version ||
    !after.sub_terms_label ||
    !after.sub_terms_accepted_at ||
    !after.terms_table
  ) {
    console.error("❌ Verification failed");
    process.exitCode = 1;
  } else {
    console.log("✅ 021_terms_acceptance applied");
    process.exitCode = 0;
  }
}
