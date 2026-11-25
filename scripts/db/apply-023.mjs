/*
 * One-shot: apply config/supabase/migrations/023_quote_signature.sql
 *   node --env-file=.env scripts/db/apply-023.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'sales_documents' and column_name = 'client_signature'
      ) as client_signature,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'sales_documents' and column_name = 'signer_name'
      ) as signer_name,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'sales_documents' and column_name = 'signed_at'
      ) as signed_at
  `);
  return after;
}

const before = await verify();
if (before.client_signature && before.signer_name && before.signed_at) {
  console.log("✅ 023 already applied", before);
  process.exitCode = 0;
} else {
  console.log("Applying 023… current state:", before);
  const q = readFileSync(join(process.cwd(), "config/supabase/migrations/023_quote_signature.sql"), "utf8");
  await sql(q);
  const after = await verify();
  console.log("Applied 023:", after);
  if (!after.client_signature || !after.signer_name || !after.signed_at) {
    console.error("❌ Verification failed");
    process.exitCode = 1;
  } else {
    console.log("✅ 023_quote_signature applied");
    process.exitCode = 0;
  }
}
