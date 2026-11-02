/*
 * One-shot Supabase setup through the Management API: `npm run setup:supabase`
 *   1. database migrations (skipped when already applied)
 *   2. Auth URLs (site URL + allowed redirects)
 *   3. Auth e-mail templates (6-digit signup code, password reset)
 *   4. SMTP through Resend           (when RESEND_API_KEY + EMAIL_FROM are set)
 *   5. Google sign-in                (when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set)
 * Needs SUPABASE_ACCESS_TOKEN (supabase.com → Account → Access Tokens) in .env. Safe to run again.
 * Prints no secret value.
 */
import { readFileSync } from "node:fs";

const env = process.env;
const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!env.SUPABASE_ACCESS_TOKEN || !ref) {
  console.error("❌ SUPABASE_ACCESS_TOKEN et NEXT_PUBLIC_SUPABASE_URL sont requis dans .env");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${ref}`;
async function api(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const sql = (query) => api("POST", "/database/query", { query });

// ---------- 1. Migrations ----------
console.log("\n1. Base de données");
const [{ exists: hasSchema }] = await sql("select to_regclass('public.profiles') is not null as exists");
if (hasSchema) console.log("  ✅ 001_initial_schema déjà appliquée");
else {
  await sql(read("config/supabase/migrations/001_initial_schema.sql"));
  console.log("  ✅ 001_initial_schema appliquée");
}
const [{ exists: hasDelete }] = await sql(
  "select exists (select 1 from pg_policies where tablename = 'site_settings' and policyname = 'site_settings: admin delete') as exists"
);
if (hasDelete) console.log("  ✅ 002_site_settings_delete déjà appliquée");
else {
  await sql(read("config/supabase/migrations/002_site_settings_delete.sql"));
  console.log("  ✅ 002_site_settings_delete appliquée");
}
const [{ exists: hasPrivate }] = await sql("select to_regclass('public.private_settings') is not null as exists");
if (hasPrivate) console.log("  ✅ 003_private_settings déjà appliquée");
else {
  await sql(read("config/supabase/migrations/003_private_settings.sql"));
  console.log("  ✅ 003_private_settings appliquée");
}
const [{ exists: hasChunks }] = await sql("select to_regclass('public.chatbot_chunks') is not null as exists");
if (hasChunks) console.log("  ✅ 004_chatbot_rag déjà appliquée");
else {
  await sql(read("config/supabase/migrations/004_chatbot_rag.sql"));
  console.log("  ✅ 004_chatbot_rag appliquée");
}

// ---------- 2–5. Auth ----------
const site = (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const redirects = [`${site}/auth/callback`, `${site}/auth/reset-password`, "http://localhost:3000/**"];
// Extra exact URLs (e.g. the Vercel preview), comma-separated. No wildcard domains: they would accept any *.vercel.app site.
for (const url of (env.SUPABASE_EXTRA_REDIRECTS ?? "").split(",").map((u) => u.trim()).filter(Boolean)) redirects.push(url);

const template = (file) => read(`config/supabase/email-templates/${file}`).replace(/^<!--[\s\S]*?-->\s*/, "");
const auth = {
  site_url: site,
  uri_allow_list: [...new Set(redirects)].join(","),
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_otp_length: 6,
  mailer_subjects_confirmation: "Votre code AK Universe : {{ .Token }}",
  mailer_templates_confirmation_content: template("confirm-signup.html"),
  mailer_subjects_recovery: "Réinitialisez votre mot de passe AK Universe",
  mailer_templates_recovery_content: template("reset-password.html"),
};

const from = env.EMAIL_FROM?.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
const smtp = Boolean(env.RESEND_API_KEY && from);
if (smtp) {
  Object.assign(auth, {
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: env.RESEND_API_KEY,
    smtp_admin_email: from[2],
    smtp_sender_name: from[1] || "AK Universe",
    rate_limit_email_sent: 100,
  });
}

const google = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
if (google) {
  Object.assign(auth, {
    external_google_enabled: true,
    external_google_client_id: env.GOOGLE_CLIENT_ID,
    external_google_secret: env.GOOGLE_CLIENT_SECRET,
  });
}

await api("PATCH", "/config/auth", auth);

console.log("\n2. URLs d'authentification");
console.log(`  ✅ Site URL : ${site}`);
for (const url of auth.uri_allow_list.split(",")) console.log(`  ✅ Redirection autorisée : ${url}`);
if (!site.startsWith("https://")) console.log("  ⚠️  Site URL en localhost : relancer ce script une fois NEXT_PUBLIC_SITE_URL = https://domaine");

console.log("\n3. Modèles d'e-mail");
console.log("  ✅ Inscription : code à 6 chiffres ({{ .Token }})");
console.log("  ✅ Mot de passe oublié : lien de réinitialisation");

console.log("\n4. SMTP (Resend)");
console.log(smtp ? `  ✅ smtp.resend.com, expéditeur ${from[2]}` : "  ⏭️  ignoré : RESEND_API_KEY / EMAIL_FROM manquants (expéditeur Supabase limité en attendant)");

console.log("\n5. Connexion Google");
console.log(
  google
    ? `  ✅ activée. Dans Google Cloud, URI de redirection autorisée : https://${ref}.supabase.co/auth/v1/callback`
    : "  ⏭️  ignorée : GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants"
);
console.log("");
