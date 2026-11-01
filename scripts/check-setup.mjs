/*
 * Production setup check: `npm run check:setup` (reads .env; on Vercel copy the same values).
 * Verifies Supabase (tables, admin), Stripe (key, webhook, customer portal) and Resend (domain).
 * Prints only ✅ / ⚠️ / ❌ lines, never a secret value.
 */

const env = process.env;
let failures = 0;
let warnings = 0;
const ok = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => (warnings++, console.log(`  ⚠️  ${msg}`));
const fail = (msg) => (failures++, console.log(`  ❌ ${msg}`));
const section = (title) => console.log(`\n${title}`);

async function getJson(url, headers) {
  try {
    const res = await fetch(url, { headers });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch (cause) {
    return { status: 0, body: { message: String(cause?.message ?? cause) } };
  }
}

// ---------- Variables ----------
section("Variables d'environnement");
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_NOTIFY_TO",
];
for (const name of REQUIRED) (env[name] ? ok : fail)(`${name}${env[name] ? "" : " manquant"}`);

const site = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (site && !site.startsWith("https://")) warn(`NEXT_PUBLIC_SITE_URL = ${site} (en production : https://votre-domaine)`);

// ---------- Supabase ----------
section("Supabase");
if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const tables = ["profiles", "organizations", "organization_members", "subscriptions", "video_projects", "payments", "site_settings"];
  let reachable = true;
  for (const table of tables) {
    const { status, body } = await getJson(`${base}/rest/v1/${table}?select=*&limit=1`, headers);
    if (status === 200) ok(`table ${table}`);
    else if (status === 0) {
      fail(`Supabase injoignable (${body?.message})`);
      reachable = false;
      break;
    } else if (status === 401) {
      fail("clé SUPABASE_SERVICE_ROLE_KEY refusée");
      reachable = false;
      break;
    } else fail(`table ${table} absente → exécuter config/supabase/migrations/001_initial_schema.sql puis 002`);
  }
  if (reachable) {
    const { status, body } = await getJson(`${base}/rest/v1/profiles?select=id&role=eq.admin&limit=1`, headers);
    if (status === 200 && body?.length) ok("au moins un compte admin");
    else if (status === 200) warn("aucun admin → update public.profiles set role = 'admin' where email = '…';");
  }
} else fail("non configuré");

// ---------- Stripe ----------
section("Stripe");
if (env.STRIPE_SECRET_KEY) {
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  const live = env.STRIPE_SECRET_KEY.startsWith("sk_live_");
  const { status } = await getJson("https://api.stripe.com/v1/balance", headers);
  if (status !== 200) fail("clé STRIPE_SECRET_KEY refusée");
  else {
    ok(`clé valide (mode ${live ? "LIVE" : "TEST"})`);
    if (!live) warn("mode test : passer aux clés sk_live_ pour encaisser de vrais paiements");

    const hooks = await getJson("https://api.stripe.com/v1/webhook_endpoints?limit=100", headers);
    const target = `${site}/api/stripe/webhook`;
    const hook = hooks.body?.data?.find((h) => h.url === target);
    const needed = ["checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"];
    if (!hook) fail(`aucun webhook vers ${target}`);
    else {
      const missing = hook.enabled_events.includes("*") ? [] : needed.filter((e) => !hook.enabled_events.includes(e));
      if (hook.status !== "enabled") fail("webhook désactivé");
      else if (missing.length) fail(`webhook sans les événements : ${missing.join(", ")}`);
      else ok("webhook configuré (3 événements)");
    }

    const portal = await getJson("https://api.stripe.com/v1/billing_portal/configurations?limit=1", headers);
    if (portal.body?.data?.length) ok("portail client configuré");
    else warn("portail client non configuré → Stripe → Paramètres → Billing → Portail client → Enregistrer");
  }
} else fail("non configuré");

// ---------- Resend ----------
section("E-mails (Resend)");
if (env.RESEND_API_KEY) {
  const domain = (env.EMAIL_FROM ?? "").match(/@([^>\s]+)/)?.[1];
  const { status, body } = await getJson("https://api.resend.com/domains", { Authorization: `Bearer ${env.RESEND_API_KEY}` });
  if (status === 200) {
    const found = body?.data?.find((d) => d.name === domain);
    if (!domain) fail("EMAIL_FROM sans adresse, ex. AK Universe <contact@domaine.fr>");
    else if (!found) fail(`domaine ${domain} non ajouté dans Resend`);
    else if (found.status !== "verified") fail(`domaine ${domain} non vérifié (statut : ${found.status}) → ajouter les DNS`);
    else ok(`domaine ${domain} vérifié`);
  } else if (status === 401 || status === 403) {
    warn("clé « sending access » : impossible de vérifier le domaine ici, vérifiez-le dans resend.com → Domains");
  } else fail("clé RESEND_API_KEY refusée");
} else fail("non configuré (les e-mails de projet ne partiront pas)");

// ---------- Contenu ----------
section("Contenu légal");
const company = await import("node:fs").then((fs) => fs.readFileSync(new URL("../config/company.ts", import.meta.url), "utf8"));
const todo = [...company.matchAll(/^\s+(\w+): TODO,/gm)].map((m) => m[1]);
if (todo.length) warn(`config/company.ts à compléter : ${todo.join(", ")}`);
else ok("informations société complètes");

console.log(`\n${failures ? `❌ ${failures} problème(s)` : "✅ Aucun problème bloquant"}${warnings ? `, ⚠️ ${warnings} avertissement(s)` : ""}\n`);
process.exitCode = failures ? 1 : 0;
