/*
 * One-shot: apply config/supabase/migrations/022_consulting_product_type.sql
 *   node --env-file=.env scripts/db/apply-022.mjs
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
if (before.consulting) {
  console.log("✅ 022 already applied", before);
  process.exitCode = 0;
} else {
  console.log("Applying 022… current state:", before);
  const q = readFileSync(join(process.cwd(), "config/supabase/migrations/022_consulting_product_type.sql"), "utf8");
  await sql(q);
  const after = await verify();
  console.log("Applied 022:", after);
  if (!after.consulting) {
    console.error("❌ Verification failed");
    process.exitCode = 1;
  } else {
    console.log("✅ 022_consulting_product_type applied");
    process.exitCode = 0;
  }
}
