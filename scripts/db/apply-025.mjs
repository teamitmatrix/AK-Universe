/*
 * One-shot: apply config/supabase/migrations/025_agreement_acceptance.sql
 *   node --env-file=.env scripts/db/apply-025.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'terms_acceptances' and column_name = 'privacy_version'
      ) as privacy_version,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'terms_acceptances' and column_name = 'terms_snapshot'
      ) as terms_snapshot
  `);
  return after;
}

const before = await verify();
console.log("Applying 025… current state:", before);
const q = readFileSync(join(process.cwd(), "config/supabase/migrations/025_agreement_acceptance.sql"), "utf8");
await sql(q);
const after = await verify();
console.log("Applied 025:", after);
if (!after.privacy_version || !after.terms_snapshot) {
  console.error("Verification failed");
  process.exitCode = 1;
} else {
  console.log("025_agreement_acceptance applied");
  process.exitCode = 0;
}
