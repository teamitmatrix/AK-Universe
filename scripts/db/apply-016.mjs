/*
 * One-shot: apply config/supabase/migrations/016_sales_document_share.sql
 *   node --env-file=.env scripts/db/apply-016.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'sales_documents' and column_name = 'share_token'
      ) as share_token,
      exists (
        select 1 from pg_indexes
        where schemaname = 'public' and indexname = 'sales_documents_share_token_key'
      ) as share_index
  `);
  return after;
}

const before = await verify();
if (before.share_token && before.share_index) {
  console.log("✅ 016 already applied", before);
  process.exitCode = 0;
} else {
  console.log("Applying 016… current state:", before);
  const q = readFileSync(join(process.cwd(), "config/supabase/migrations/016_sales_document_share.sql"), "utf8");
  await sql(q);
  const after = await verify();
  console.log("Applied 016:", after);
  if (!after.share_token || !after.share_index) {
    console.error("❌ Verification failed");
    process.exitCode = 1;
  } else {
    console.log("✅ 016_sales_document_share applied");
    process.exitCode = 0;
  }
}
