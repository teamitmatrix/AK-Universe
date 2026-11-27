/*
 * One-shot: apply config/supabase/migrations/026_videaste_rates.sql
 *   node --env-file=.env scripts/db/apply-026.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function verify() {
  const [after] = await sql(`
    select
      to_regclass('public.videaste_rate_cards') is not null as cards,
      to_regclass('public.videaste_rate_items') is not null as items,
      exists (
        select 1 from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'confirm_rate_item'
      ) as confirm_fn
  `);
  return after;
}

const before = await verify();
console.log("Applying 026… current state:", before);
const q = readFileSync(join(process.cwd(), "config/supabase/migrations/026_videaste_rates.sql"), "utf8");
await sql(q);
const after = await verify();
console.log("Applied 026:", after);
if (!after.cards || !after.items || !after.confirm_fn) {
  console.error("❌ Verification failed");
  process.exitCode = 1;
} else {
  console.log("✅ 026_videaste_rates applied");
  process.exitCode = 0;
}
