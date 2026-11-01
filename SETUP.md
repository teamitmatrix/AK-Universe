# AK Universe — Go-live setup guide

Step-by-step setup of the accounts the site needs: **Supabase** (database + logins), **Stripe** (payments), **Resend** (e-mails), **Vercel** (hosting) and the **domain**.
Do the steps in order. Each one says exactly where to click and which value to copy into which variable.

> At any time run `npm run check:setup`. It checks every step below with the keys in `.env` and lists what is still missing (it never prints a key).

---

## 0. What to ask the client for

| What | Used for |
|---|---|
| Company details: legal name, legal form + capital, address, SIRET, RCS, VAT number, publication director, contact e-mail, phone, consumer mediator | Legal pages → fill `config/company.ts` |
| Access to the **domain DNS** (OVH, GoDaddy, Hostinger, Cloudflare…) or someone who can add records | Site domain + e-mail sending |
| The e-mail address that must receive "new project" notifications | `EMAIL_NOTIFY_TO` |
| A Stripe account **in the client's name** (business details + bank IBAN) | Receiving payments |
| Review of the CGV text (cancellation, delivery terms) | `app/cgv.html/page.tsx` |

Accounts (Supabase, Stripe, Resend, Vercel, GitHub) should be created with an e-mail address the client controls, so the business keeps ownership.

---

## 1. Supabase — database and logins

> **Shortcut:** after step 2, run `npm run setup:supabase` instead of steps 3–7 by hand.
> - **What it applies:** the migrations, the URLs, the e-mail templates, the Resend SMTP and Google sign-in, through the Supabase Management API.
> - **What it needs in `.env`:** `SUPABASE_ACCESS_TOKEN`, created at supabase.com → Account → Access Tokens.
> - **Optional:** SMTP needs the Resend variables, and Google sign-in needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Without them, those parts are skipped.
> - **Safe to run again:** re-run it after adding them, or after changing `NEXT_PUBLIC_SITE_URL`.

1. **Create the project.** Go to [supabase.com](https://supabase.com) → **New project**. Choose region **West EU (Paris)** or **Central EU (Frankfurt)**, which the privacy policy relies on. Save the database password somewhere safe.
2. **Copy the keys.** Go to **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY`. **Secret: never share it, never put it in front-end code.**
3. **Create the tables.** Go to **SQL Editor → New query**:
   - Paste the whole of `config/supabase/migrations/001_initial_schema.sql` → **Run**.
   - Then paste `002_site_settings_delete.sql` → **Run**.
4. **Set the URLs.** Go to **Authentication → URL Configuration**:
   - Site URL: `https://<domain>`
   - Redirect URLs: add `https://<domain>/auth/callback` and `https://<domain>/auth/reset-password`. For testing, also add `http://localhost:3000/**` and the exact Vercel URL of the project (e.g. `https://ak-universe.vercel.app/**`). Never add a wildcard domain such as `https://*.vercel.app/**`: it would let any Vercel site receive sign-in redirects.
5. **E-mail templates.** Go to **Authentication → Emails → Templates**:
   - **Confirm signup**: subject `Votre code AK Universe : {{ .Token }}`; body = contents of `config/supabase/email-templates/confirm-signup.html`. The site asks for a **6-digit code**, so the template must contain `{{ .Token }}`.
   - **Reset password**: subject `Réinitialisez votre mot de passe AK Universe`; body = `config/supabase/email-templates/reset-password.html`.
   - In **Authentication → Providers → Email**, keep "Confirm email" **on** and set the OTP length to **6**.
6. **Send the auth e-mails through Resend.** Do this after step 3 (Resend).
   - **Why:** Supabase's built-in sender is limited to a few e-mails per hour, which is not enough for production.
   - **Where:** **Authentication → Emails → SMTP Settings** → enable custom SMTP.
   - **Values:** host `smtp.resend.com`, port `465`, username `resend`, password = the Resend API key, sender = the same address as `EMAIL_FROM`.
7. **Google login.**
   - In [Google Cloud Console](https://console.cloud.google.com): **APIs & Services → Credentials → Create OAuth client ID** (type *Web application*).
   - Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase shows this exact URL on its Google provider page.
   - Copy the Client ID and Secret into **Supabase → Authentication → Providers → Google** and enable it.
   - Also fill **OAuth consent screen**: app name "AK Universe", logo, and links to `/confidentialite.html` and `/mentions-legales.html`.
8. **Apple / Microsoft login (optional).**
   - Enable them in **Authentication → Providers** (Apple needs a paid Apple Developer account; Microsoft = "Azure" with an Azure app registration).
   - Then set `NEXT_PUBLIC_OAUTH_PROVIDERS=apple,azure`, or only the one(s) you enabled. Until then the buttons say "bientôt disponible".
9. **Admin account.**
   - Sign up on the live site with the client's e-mail.
   - Then in the **SQL Editor** run:
     ```sql
     update public.profiles set role = 'admin' where email = 'client@domain.fr';
     ```
   - `/admin.html` then shows two tabs: **Prix des services vidéo** and **Demandes vidéo** (received quotes/bookings with status).

---

## 2. Domain

Buy or use the client's domain. You will add DNS records in two places:
- **Vercel** (step 5) for the website
- **Resend** (step 3) for e-mails

Both show the exact records to copy.

---

## 3. Resend — e-mails (project notifications)

1. Create an account at [resend.com](https://resend.com).
2. **Domains → Add domain** → enter the client's domain, region **EU (Ireland)**.
3. Resend shows 3–4 DNS records (MX, TXT/SPF, TXT/DKIM, optionally DMARC). Add them **exactly** in the domain's DNS panel, then click **Verify**. It can take from a few minutes to a few hours.
4. **API Keys → Create API key** (permission: *Sending access*, domain: this domain) → `RESEND_API_KEY`.
5. Set:
   - `EMAIL_FROM=AK Universe <contact@domain.fr>`. The address must be on the verified domain; the mailbox doesn't have to exist, but replies go to `EMAIL_NOTIFY_TO`.
   - `EMAIL_NOTIFY_TO=` the client's e-mail address. Several addresses are allowed, separated by commas.

Account e-mails also go through Resend, sent by the site itself. Supabase only creates and checks the codes, so Supabase's own e-mail templates and SMTP are not used:

| Account e-mail | When |
|---|---|
| 6-digit verification code | Sign-up |
| 6-digit sign-in code (**two-factor**) | Every password sign-in, except on a browser where "Se souvenir de moi" was ticked with a code in the last 30 days |
| Password reset link (single use) | "Mot de passe oublié ?" |
| "Password changed" security notice | After a reset |

Limits: at most 1 account e-mail per minute and 5 per hour per user. Google/Apple/Microsoft sign-in relies on the provider's own security, so no code is sent for those.
Until `RESEND_API_KEY` is set, the site falls back to Supabase's own e-mails and has no two-factor step.

Project e-mails (what is sent):

| Event | AK Universe receives | Client receives |
|---|---|---|
| Quote request | New quote + all details | Confirmation + summary |
| Booking by bank transfer | New booking (transfer pending) | Confirmation + summary |
| Deposit paid by card | Deposit paid | Booking confirmed |

---

## 4. Stripe — payments

Work in **Test mode** first (toggle at the top of the dashboard), then repeat steps 2–4 in **Live mode**.

1. **Activate the account** (Live mode only): business details, representative, bank IBAN.
2. **Developers → API keys**: copy the **Secret key** (`sk_test_…` then `sk_live_…`) → `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<domain>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - After saving, reveal the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal**:
   - Enable "Cancel subscription", "Update payment method" and "Invoice history".
   - Add the links to `/cgv.html` and `/confidentialite.html` → **Save**.
   - This powers the "Gérer mon abonnement" button on `/compte.html`.
5. **Settings → Payment methods**: enable Cards and SEPA Direct Debit, plus PayPal / Revolut Pay / Satispay if the client wants them. The payment page offers all five, and Stripe refuses any method that is not enabled.
6. **Settings → Business → Public details**: name, support e-mail, logo, and brand colour `#fdb942`. These appear on Stripe's payment page and receipts.
7. **Settings → Customer emails**: enable "Successful payments" so clients get Stripe receipts.

---

## 5. GitHub + Vercel — hosting

1. **Push the code to GitHub.** The repo currently has no remote. Create a **private** GitHub repo, then:
   ```bash
   git remote add origin https://github.com/<account>/ak-universe.git
   git push -u origin main
   ```
   `.env` is git-ignored and is never pushed.
2. **Create the project.** On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. The framework is detected as Next.js; keep the defaults.
3. **Add the variables.** Go to **Settings → Environment Variables** and add every variable from `.env.example` with the production values:

   | Variable | Where it comes from |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase step 2 |
   | `NEXT_PUBLIC_SITE_URL` | `https://<domain>` (no trailing slash) |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe steps 2–3 |
   | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_TO` | Resend steps 4–5 |
   | `NEXT_PUBLIC_OAUTH_PROVIDERS` | Optional (Supabase step 8) |

4. **Connect the domain.** Go to **Settings → Domains** → add `domain.fr` and `www.domain.fr`, then copy the A / CNAME records Vercel shows into the domain's DNS. HTTPS is automatic.
5. **Redeploy.** Go to **Deployments → ⋯ → Redeploy**. Variables only apply to new deployments.

---

## 6. Legal content

Fill in every `À COMPLÉTER` value in `config/company.ts`, then commit and push (Vercel redeploys automatically).
Until then, the legal pages show the missing fields highlighted in gold.

Also have the client read `/cgv.html` (deposit, cancellation within 7 days, retouches, rights of use). Adjust the text in `app/cgv.html/page.tsx` if their terms differ.

---

## 7. Check and test end to end

1. `npm run check:setup` → must end with **✅ Aucun problème bloquant**.
2. On the live site, with Stripe in **Test mode**, run these tests:

| # | Test | Expected |
|---|---|---|
| 1 | Sign up | E-mail with a 6-digit code arrives, from your domain |
| 2 | Enter the code → organisation | Account + organisation created (Supabase → Table editor → `profiles`, `organizations`) |
| 3 | Abonnement → pay with card `4242 4242 4242 4242`, any future date, any CVC | Back on the site with "paiement réussi"; `subscriptions.status = active` |
| 4 | `/compte.html` → **Gérer mon abonnement** | Stripe portal opens; cancel → status changes after the webhook |
| 5 | Mot de passe oublié | Reset e-mail arrives, new password works |
| 6 | Google login | Signed in, redirected back |
| 7 | Services → add a video → finaliser → **Demander mon devis** | Confirmation page; client and team e-mails received; row in `/admin.html?vue=demandes` |
| 8 | Same with **acompte** by card `4242…` | "Acompte payé" e-mails; status "Acompte payé" in admin |
| 9 | Acompte by **virement** | E-mails "virement en attente"; status "Acompte en attente" |
| 10 | Admin: change a video price | The new price shows on `/services.html` and in the project total |
| 11 | Card `4000 0000 0000 9995` (declined) | Clear error, nothing marked paid |
| 12 | Language switch → Deutsch, then back to Français | Page translated, then original French |

3. **Go live.** In Stripe **Live mode**, redo Stripe steps 2–4 and replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel with the live values. Then **Redeploy**.
