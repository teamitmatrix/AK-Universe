/*
 * Shared helper for the scripts/db/* tools: runs SQL through the Supabase Management API
 * (same access as scripts/setup-supabase.mjs). Prints no secret value.
 */
export const env = process.env;
const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!env.SUPABASE_ACCESS_TOKEN || !ref) {
  console.error("❌ SUPABASE_ACCESS_TOKEN and NEXT_PUBLIC_SUPABASE_URL are required in .env");
  process.exit(1);
}
export const projectRef = ref;

export async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    // Not truncated: test results travel inside the error message.
    const err = new Error(text);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

/** Quoted identifier (table names come from the catalog, never from user input). */
export const ident = (name) => `"${String(name).replace(/"/g, '""')}"`;
