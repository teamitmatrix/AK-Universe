/*
 * Create or update a commercial login (service role).
 *   node --env-file=.env scripts/db/bootstrap-commercial.mjs <email> <password> [first] [last]
 * Password may also come from COMMERCIAL_BOOTSTRAP_PASSWORD (preferred).
 * Prints no password.
 */
import { createClient } from "@supabase/supabase-js";

const email = String(process.argv[2] ?? "").trim().toLowerCase();
const password = process.env.COMMERCIAL_BOOTSTRAP_PASSWORD || process.argv[3] || "";
const first = String(process.argv[4] ?? "Commercial").trim() || "Commercial";
const last = String(process.argv[5] ?? "AK").trim() || "AK";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exitCode = 1;
} else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  console.error("❌ Valid email required as argv[2]");
  process.exitCode = 1;
} else if (!password || password.length < 8) {
  console.error("❌ Password required (COMMERCIAL_BOOTSTRAP_PASSWORD or argv[3], min 8 chars)");
  process.exitCode = 1;
} else {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) {
    console.error("❌ listUsers failed:", listErr.message);
    process.exitCode = 1;
  } else {
    let user = listed.users.find((u) => (u.email || "").toLowerCase() === email) ?? null;

    if (user) {
      const { data, error } = await admin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
        user_metadata: { first_name: first, last_name: last },
      });
      if (error) {
        console.error("❌ updateUser failed:", error.message);
        process.exitCode = 1;
      } else {
        user = data.user;
        console.log("Updated auth user:", email);
      }
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: first, last_name: last },
      });
      if (error || !data.user) {
        console.error("❌ createUser failed:", error?.message ?? "no user");
        process.exitCode = 1;
      } else {
        user = data.user;
        console.log("Created auth user:", email);
      }
    }

    if (user && process.exitCode !== 1) {
      const patch = {
        role: "commercial",
        active: true,
        email,
        first_name: first,
        last_name: last,
      };
      const { error: profileErr } = await admin.from("profiles").upsert({ id: user.id, ...patch }, { onConflict: "id" });
      if (profileErr) {
        // profiles may already exist from trigger — fall back to update
        const { error: updErr } = await admin.from("profiles").update(patch).eq("id", user.id);
        if (updErr) {
          console.error("❌ profile update failed:", updErr.message);
          process.exitCode = 1;
        }
      }

      if (process.exitCode !== 1) {
        const { data: profile, error: readErr } = await admin.from("profiles").select("id, role, active, email").eq("id", user.id).maybeSingle();
        if (readErr || !profile || profile.role !== "commercial" || profile.active === false) {
          console.error("❌ profile verify failed:", readErr?.message ?? profile);
          process.exitCode = 1;
        } else {
          // Smoke-check password without leaving a lasting session
          const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: signed, error: signErr } = await anon.auth.signInWithPassword({ email, password });
          if (signErr || !signed.user) {
            console.error("❌ password sign-in check failed:", signErr?.message ?? "no session");
            process.exitCode = 1;
          } else {
            await admin.auth.admin.signOut(signed.session.access_token, "local");
            console.log("✅ Commercial ready");
            console.log(`   email:  ${email}`);
            console.log(`   role:   commercial → ${site}/commercial/dashboard`);
            console.log(`   login:  ${site}/connexion`);
            console.log("   note:   Resend is configured — after password, a 6-digit e-mail OTP is required.");
            process.exitCode = 0;
          }
        }
      }
    }
  }
}
