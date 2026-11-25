/*
 * One-shot: apply config/supabase/migrations/024_commission_three_lines.sql
 *   node --env-file=.env scripts/db/apply-024.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select exists (
      select 1 from public.commission_rates where product_type = 'digital'
    ) as digital
  `);
  return after;
}

const before = await verify();
console.log("Applying 024… current state:", before);
const q = readFileSync(join(process.cwd(), "config/supabase/migrations/024_commission_three_lines.sql"), "utf8");
await sql(q);
const after = await verify();
console.log("Applied 024:", after);
if (!after.digital) {
  console.error("❌ Verification failed");
  process.exitCode = 1;
} else {
  console.log("✅ 024_commission_three_lines applied");
  process.exitCode = 0;
}
