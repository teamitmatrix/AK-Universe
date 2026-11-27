/*
 * One-shot: apply config/supabase/migrations/029_video_projects_universe.sql
 *   node --env-file=.env.local --env-file=.env scripts/db/apply-029.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "./lib.mjs";

async function hasUniverseColumn() {
  const [row] = await sql(`
    select exists (
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'video_projects'
         and column_name = 'universe'
    ) as has_universe
  `);
  return !!row?.has_universe;
}

async function counts() {
  const [row] = await sql(`
    select
      (select count(*)::int from public.video_projects where universe = 'agents') as agents,
      (select count(*)::int from public.video_projects where universe = 'marketing') as marketing,
      (select count(*)::int from public.video_projects where universe = 'digital') as digital,
      (select count(*)::int from public.video_projects where universe is null) as unset
  `);
  return row;
}

const before = await hasUniverseColumn();
console.log("Applying 029… universe column present:", before);
const q = readFileSync(join(process.cwd(), "config/supabase/migrations/029_video_projects_universe.sql"), "utf8");
await sql(q);
const after = await hasUniverseColumn();
const breakdown = after ? await counts() : null;
console.log("Applied 029:", { has_universe: after, ...breakdown });
if (!after || (breakdown && breakdown.unset > 0)) {
  console.error("❌ Verification failed");
  process.exitCode = 1;
} else {
  console.log("✅ 029_video_projects_universe applied");
  process.exitCode = 0;
}
