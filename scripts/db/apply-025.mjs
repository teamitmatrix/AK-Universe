/*
 * One-shot: apply config/supabase/migrations/025_consulting_product_line.sql
 *   node --env-file=.env scripts/db/apply-025.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select exists (
      select 1 from public.commission_rates where product_type = 'consulting'
    ) as consulting
  `);
  return after;
}

const before = await verify();
console.log("Applying 025… current state:", before);
const q = readFileSync(join(process.cwd(), "config/supabase/migrations/025_consulting_product_line.sql"), "utf8");
await sql(q);
const after = await verify();
console.log("Applied 025:", after);
if (!after.consulting) {
  console.error("❌ Verification failed");
  process.exitCode = 1;
} else {
  console.log("✅ 025_consulting_product_line applied");
  process.exitCode = 0;
}
