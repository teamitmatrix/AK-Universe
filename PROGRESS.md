# AK Universe — Production progress

Static site (`legacy-source/`) → **Next.js + TypeScript + Tailwind**, **Supabase** (DB + Auth), **Stripe**, hosted on **Vercel**.
Reference: *AK Universe — Developer handoff* (5 workstreams) + the static HTML pages.

_Last updated: 2026-10-30_

---

## 1. Summary

| Area | Status |
|---|---|
| Requirement doc — 5 workstreams | ✅ Done (built, visually checked) |
| Signup / login funnel on Supabase | ✅ Built — ⏳ needs Supabase setup to test end-to-end |
| Subscription payment (Stripe) | ✅ Built — ⏳ needs Stripe keys to test |
| Video quotes & deposits saved in DB | ✅ Built — ⏳ needs migration + Stripe to test |
| Admin video prices in DB | ✅ Built — ⏳ needs migration + an admin account to test |
| 24 EU languages on every page (switch + translation) | ✅ Done |
| Security hardening (redirects, API limits, headers) | ✅ Done |
| "Tarifs" dropdown (Forfaits IA + Forfaits Marketing) | ✅ Done |
| E-mail notifications when a video project is confirmed | ✅ Built — ⏳ needs a Resend account + verified domain |
| Legal pages (mentions légales, confidentialité, CGV) + cookie notice | ✅ Built — ⏳ company details to fill in `config/company.ts` |
| "Mon compte" page + Stripe customer portal | ✅ Built — ⏳ needs DB + Stripe portal setup to test |
| Admin: list of received video requests + status | ✅ Built — ⏳ needs DB to test |
| Apple / Microsoft login | ✅ Wired — off until enabled in Supabase (`NEXT_PUBLIC_OAUTH_PROVIDERS`) |
| Setup guide + automatic setup check | ✅ `SETUP.md`, `npm run check:setup` |
| Remaining pages rebuilt in React | ✅ Marketing, services, forfaits, tarifs and the quote flow are React pages |

Legend: ✅ done · ⏳ done in code, waiting for setup/testing · ❌ to do

---

## 2. Requirement doc — workstreams

| # | Workstream | Status | Where |
|---|---|---|---|
| 1 | Homepage (hero, 4 agents, why, 3 steps, final CTA) | ✅ | `app/page.tsx`, `config/agents.ts` |
| 2 | Login page (2 columns, account switch, remember me, Google/Apple/Microsoft, mobile band) | ✅ | `app/connexion.html/page.tsx`, `app/components/auth/LoginScreen.tsx` |
| 3 | Marketing navigation ("Accueil" link + logo → homepage) | ✅ | `public/assets/js/projet.js` → `renderHeader()` |
| 4 | Official logo, site-wide | ✅ | `public/assets/img/logo.svg` (single copy) |
| 5 | "Arms-crossed" character, transparent | ✅ | `public/assets/img/hero-man-arms-crossed.png` |

Doc constraints respected: routes unchanged (all `.html` URLs kept), login IDs kept (`#login-form`, `#email`, `#pw`, `#forgot`, `.pw-toggle`, `.google-btn`), existing design system reused (`app/styles/style.css`, `services.css`), checked on desktop + mobile.

Apple / Microsoft buttons show a "coming soon" toast, as the doc specifies (real OAuth = pending).

---

## 3. Page-by-page status

**React** = rebuilt in React. **Legacy** = original HTML + JS rendered by the bridge (`app/components/legacy/`), same look and behaviour.

| Page (static file) | Rendering | Backend | Notes |
|---|---|---|---|
| `index.html` | React | — | Workstream 1 |
| `connexion.html` | React | Supabase Auth | Password, Google, password reset, FR/EN |
| `inscription.html` | React | Supabase `signUp` | Password rules as in static page, FR/EN |
| `verification.html` | React | Supabase `verifyOtp` / `resend` | 6-digit code (needs e-mail template, see §6), FR/EN |
| `organisation.html` | React | `create_organization()` | Login required, FR/EN |
| `abonnement.html` | React | Prices in `config/pricing.ts` | Login required, FR/EN |
| `paiement.html` | React | Stripe Checkout (subscription) + promo codes | Login required, price recomputed on server, FR/EN (Stripe page opens in the same language) |
| `agents-ia/tarifs.html` | React | — | Same plans as the static page |
| `marketing.html` | React | — | |
| `marketing/forfaits.html` | React | — | Adds the chosen plan to the project |
| `services.html` + 17 `services/*.html` | React | Prices from DB (admin) | |
| `projet.html` | React | localStorage cart | Public (no login) |
| `informations.html` | React | — | Public |
| `finaliser.html` | React | `POST /api/projects` (devis) | Saved in `video_projects` |
| `acompte.html` | React | `POST /api/projects` → Stripe Checkout (deposit) or bank transfer | |
| `confirmation.html` | React | Reads `?paid=1` after Stripe | |
| `admin.html` | React | `site_settings` (Supabase) | Admins only |
| `tarifs.html`, `marketing/mon-projet.html` | Redirects | — | Were meta-refresh pages |

---

## 4. Completed steps (log)

### Step 1 — Cleanup & foundation (2026-10-28)
- [x] Git repository + snapshot commit
- [x] Removed backups (`*.bak`, `*.before-*`, `*.backup`, `*.txt`), empty files, 0-byte images, duplicate `public/images/`
- [x] Fixed broken encoding in `projet.js` (`â‚¬` → `€`, accents)
- [x] One legacy bridge instead of two; it now keeps `<body class="light">` and `data-service` (service pages were empty) and sets `<base href="/">` (links from `/services/*` were broken)
- [x] Server-side `<title>` / description / `noindex` for every page
- [x] Typo & duplicate routes → permanent redirects (`next.config.ts`)
- [x] Tailwind v4 without Preflight (keeps the static design pixel-identical), Figtree via `next/font`
- [x] Security headers, `robots.txt`, `sitemap.xml`, 404 and error pages

### Step 2 — Requirement doc workstreams (2026-10-28)
- [x] Homepage in React (exact copy of `index.html`)
- [x] Login in React (exact copy of `connexion.html`, FR/EN switch)
- [x] Shared `SiteHeader`, `SiteFooter`, `Icon` (generated from `main.js` icons), `Toast`, `LangSwitch`

### Step 3 — Auth & account funnel (2026-10-28)
- [x] Sign-up, OTP verification, resend code, organisation, sign-out (`/auth/signout`)
- [x] Password reset page in the same layout
- [x] `proxy.ts`: session refresh, protected pages, signed-in users redirected away from login/sign-up

### Step 4 — Database (2026-10-28)
- [x] `config/supabase/migrations/001_initial_schema.sql`: profiles (+ auto-create trigger), organisations, members, subscriptions, video_projects, payments, site_settings — all with RLS
- [x] `002_site_settings_delete.sql`: lets admins reset prices

### Step 5 — Payments (2026-10-28)
- [x] Subscription checkout (`app/lib/billing/actions.ts`) — card, SEPA, PayPal, Revolut Pay, Satispay, promo codes
- [x] Deposit checkout + bank-transfer option (`app/api/projects/route.ts`)
- [x] Webhook `app/api/stripe/webhook/route.ts` → subscription status, deposit paid, payments ledger

### Step 6 — Admin prices in the database (2026-10-28)
- [x] `admin.html` rebuilt in React: same tables, **Enregistrer les prix** saves to Supabase instead of downloading a file; **Réinitialiser** restores defaults
- [x] Texts + default prices stay in `config/services-data.js`; admin overrides (deposit %, quantity discounts, option prices, service prices, duration extras) are stored in `site_settings` key `video_pricing` and merged on top
- [x] `/assets/js/services-data.js` is now generated by `app/assets/js/services-data.js/route.ts` (CDN cache 60 s) → admin changes reach visitors within a minute
- [x] Quote/deposit amounts on the server use the same merged prices
- [x] If the database is unreachable the site falls back to default prices (verified)

### Step 7 — English on every page with the language switch (2026-10-29)
- [x] The FR/EN switch now translates inscription, verification, organisation, abonnement, paiement (+ success view) and the password reset page — before, only the login page changed language
- [x] One shared language store (`useLang` in `app/components/ui/LangSwitch.tsx`): the left column and the form switch together, the choice is kept across pages (same `aku-language` key as the static pages)
- [x] Server actions return error codes instead of French sentences, so errors also show in the chosen language
- [x] Organisation sector/size show English labels but still store the French value
- [x] Stripe Checkout opens in English when the site is in English
- [x] Checked in the browser: signup → verification → reset stay in English, switching back to French works, 0 console errors

### Step 8 — 24 languages site-wide + security hardening (2026-10-29)
- [x] Language switch with the 24 official EU languages (native names + flags), on **every** page: inline on the account/payment pages, a small floating button (bottom-right) everywhere else; admin stays French
- [x] French = original; English = hand-written texts on the React pages; all other languages (and English on the static pages) = Google Translate, loaded only after a visitor picks another language
- [x] Choice remembered across pages and visits; back to Français restores the original page
- [x] Brand "AK Universe" protected from translation; prices/counters marked `notranslate` and changing texts keyed so live updates still show when translated; DOM guard so React does not crash under Google Translate
- [x] Stripe Checkout (subscription + deposit) opens in the visitor's language (Irish → English, Stripe has no Irish)
- [x] Security: fixed an open redirect after login (`/\evil.com` was accepted); `/api/projects` now rejects bodies > 64 KB (413) and more than 5 requests per e-mail per 15 min (429); Stripe errors return a clean message instead of a crash
- [x] Headers added: HSTS, Content-Security-Policy (`base-uri`, `object-src`, `frame-ancestors`, `form-action`), Cross-Origin-Opener-Policy
- [x] `npm audit`: 0 vulnerabilities
- [x] Checked in the browser (desktop + mobile 390 px): French → German → Spanish → French on home, service page, signup, login; 0 console errors from the site; no horizontal scroll

### Step 9 — "Tarifs" dropdown (2026-10-29, client request)
- [x] "Tarifs" is now a dropdown with **Forfaits IA** (`/agents-ia/tarifs.html`) and **Forfaits Marketing** (`/marketing/forfaits.html`)
- [x] Same dropdown in the three headers: homepage (`SiteHeader.tsx`), Agents IA prices page (`legacy-source/agents-ia/tarifs.html`), marketing/video pages (`projet.js` → `renderHeader()`)
- [x] Marketing menu: the separate "Forfaits" link was replaced by this "Tarifs" dropdown (marketing packages moved under Tarifs); the current page is highlighted in gold
- [x] URLs unchanged; checked on desktop (hover) and mobile (burger menu), 0 console errors

---

### Step 10 — E-mail notifications for video projects (2026-10-30)
- [x] Sent through Resend's REST API (no new package): `app/lib/email.ts`, templates in `app/lib/projects/emails.ts`
- [x] Quote request (`finaliser.html`) or booking by bank transfer (`acompte.html`) → e-mail to AK Universe (client details, items, total) + summary e-mail to the client
- [x] Deposit paid by card → sent by the Stripe webhook after payment ("acompte payé" to AK Universe, "réservation confirmée" to the client); a repeated Stripe event never sends twice
- [x] Client e-mail in English if the visitor browsed in English, otherwise French; AK Universe e-mails in French; reply-to set both ways (client ↔ team)
- [x] Same dark/gold look as the site; everything the visitor typed is HTML-escaped
- [x] Sent after the response (`after()`): a failed or missing e-mail setup never blocks or loses a request (it is logged)
- [x] Checked: rendered previews, mocked Resend call, typecheck, lint, production build

### Step 11 — Go-live readiness (2026-10-30)
- [x] `SETUP.md`: step-by-step setup of Supabase, Resend, Stripe, GitHub/Vercel, domain, legal content, and a 12-point end-to-end test
- [x] `npm run check:setup` (`scripts/check-setup.mjs`): checks env vars, Supabase tables + admin, Stripe key/webhook/portal, Resend domain, company details; prints no secrets
  - First run on the current `.env`: Supabase connected but **tables missing** (migrations not run), Stripe test key valid, no webhook / portal / Resend yet
- [x] Legal pages `/mentions-legales.html`, `/confidentialite.html`, `/cgv.html` (`config/company.ts` holds the company details; missing ones show highlighted "À COMPLÉTER"); deposit % in the CGV comes from the admin prices
- [x] Legal links in every footer (homepage, marketing/video pages, Agents IA prices); footer added to `marketing.html` and `agents-ia/tarifs.html`; the CGV checkbox on `acompte.html` links to `/cgv.html`
- [x] Cookie notice (information only: the site sets only necessary cookies, no consent needed under CNIL rules); shown once, hidden on admin
- [x] `/compte.html` (signed-in only): profile, organisation, subscription status/renewal, **Gérer mon abonnement** → Stripe customer portal (cancel, card, invoices), my video projects; header shows "Mon compte" when signed in
- [x] `/admin.html?vue=demandes`: received quotes/bookings with client details, items, totals, status change and filter
- [x] Apple / Microsoft buttons call Supabase OAuth once listed in `NEXT_PUBLIC_OAUTH_PROVIDERS`; otherwise "bientôt disponible" as before
- [x] Supabase e-mail templates ready to paste: `config/supabase/email-templates/`
- [x] `npm run setup:supabase` (`scripts/setup-supabase.mjs`): applies migrations, auth URLs, e-mail templates, Resend SMTP and Google sign-in via the Management API (needs `SUPABASE_ACCESS_TOKEN`); no wildcard redirect domains
- [x] Checked: typecheck, lint, production build; legal pages, footers, cookie notice (desktop + mobile), redirects of `/compte.html` and `/admin.html` when signed out. `/compte.html` and the admin requests tab could not be tested signed in until the migrations are run

### Step 12 — Account e-mails through Resend + two-factor sign-in (2026-10-30)
- [x] Sign-up code, sign-in code, password reset link and "password changed" notice are sent with Resend (`app/lib/auth/emails.ts`); Supabase only generates/checks the codes (`auth.admin.generateLink` sends nothing), so no Supabase e-mail setup is needed
- [x] **Two-factor sign-in**: a correct password no longer opens a session; a 6-digit code is e-mailed and entered on `verification.html?step=login` (`app/lib/auth/login.ts`, `two-factor.ts`)
- [x] "Se souvenir de moi" now works: after a code, that browser skips the code for 30 days (signed httpOnly cookie)
- [x] Anti-abuse: 1 e-mail/min and 5/hour per user; "resend code" only from the browser that passed the password; reset answers the same for unknown addresses
- [x] Reset link is checked on the page in the browser, so mail scanners that open links cannot use it up
- [x] Without `RESEND_API_KEY` the previous Supabase flow is used (site keeps working)
- [x] Tested against the real Supabase Auth with Resend mocked: sign-up → code → confirmed; no session before the 2FA code; wrong/reused codes rejected; rate limit; trusted device; reset link single-use; unknown e-mail sends nothing; test user deleted

### Step 13 — Real services connected and tested (2026-10-30)
- [x] Supabase tables created (by AK Universe); Resend domain `notify.akuniverse.com` verified, real e-mails accepted (status 200)
- [x] Stripe test mode: customer portal configured via API; local webhook through Stripe CLI (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
- [x] End-to-end in the browser with test card 4242: video deposit → webhook → `acompte_paye` + payment row; sign-up → e-mail code → organisation → subscription 79,90 €/mois → "abonnement confirmé" → `/compte.html` "Actif" → Stripe portal opens; sign-out → sign-in → 2FA code → signed in; cancel → webhook → "canceled"
- [x] Fix: renewal date now saved on the first payment (webhook reads the subscription period)
- [x] Test users, projects, payments and Stripe test customer removed afterwards

### Step 14 — Admin in French and English (2026-10-30)
- [x] `/admin.html` (both tabs) has a Français / English switch in the tab bar (same language choice as the site; other languages show French); all labels, buttons, messages, statuses and errors translated (`app/components/admin/adminText.ts`)
- [x] Service and option names stay as in the catalogue (`config/services-data.js`), like on the site
- [x] Fix: accounts created before the database migration had no `profiles` row, so creating an organisation or paying failed ("Unable to create the organization"); the row is now created on demand (`ensureProfile`) and the existing account was backfilled
- [x] Checked in the browser with a temporary admin (deleted afterwards)

---

## 5. Remaining work

### Must do before go-live
- [ ] **Setup** — follow `SETUP.md`; `npm run check:setup` must pass. Required for everything marked ⏳
- [ ] **End-to-end test** on a preview deployment: sign-up → OTP → organisation → abonnement → Stripe test card → `subscriptions.status = active`; quote + deposit → `video_projects`; admin price change visible on `/services.html`
- [ ] **Company details** in `config/company.ts` + client review of the CGV text
- [ ] "Nous contacter" button of the "Sur devis" plan on `agents-ia/tarifs.html` still points to `#` (as in the static site) — needs the client's contact e-mail

### Should do
- [ ] Marketing forfaits prices editable in admin (still edited in `config/services-data.js`, as in the static site)
- [ ] Apple and Microsoft OAuth: enable in Supabase if the client wants them (code ready)
- [ ] "Remember me" checkbox is visual only (as in the static site)

### Could do later (not required by the doc)
- [x] Rebuild the legacy pages in React (marketing, services, projet flow, tarifs)
- [ ] Hand-written translations (instead of Google) for the static pages, if the client wants better quality than machine translation

---

## 6. Setup checklist (one-time)

Short version below — the full click-by-click guide is in **`SETUP.md`**.

1. **Supabase → SQL Editor**: run `001_initial_schema.sql`, then `002_site_settings_delete.sql`.
2. **Supabase → Auth → Email templates → Confirm signup**: include `{{ .Token }}` so the e-mail contains the 6-digit code used on `verification.html`.
3. **Supabase → Auth → URL configuration**: site URL = production domain; redirect URLs = `https://<domain>/auth/callback`, `https://<domain>/auth/reset-password`.
4. **Google OAuth**: add the production callback URL in Google Cloud + Supabase.
5. **Admin account**: sign up, then run `update public.profiles set role = 'admin' where email = '…';`
6. **Stripe**: set `STRIPE_SECRET_KEY`; create webhook `https://<domain>/api/stripe/webhook` with events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; set `STRIPE_WEBHOOK_SECRET`; enable SEPA / PayPal / Revolut Pay / Satispay in the dashboard if offered.
7. **Vercel**: add every variable from `.env.example` (`NEXT_PUBLIC_SITE_URL` = real domain).
8. **Resend** (resend.com): add and verify the client's domain (DNS records), create an API key, then set `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `AK Universe <contact@domain>`) and `EMAIL_NOTIFY_TO` (who gets the notifications) in Vercel. Optional: use the same SMTP in Supabase → Auth → SMTP so sign-up codes come from the same domain.

---

## 7. Decisions taken

| Decision | Why | How to change |
|---|---|---|
| Video project flow (`projet`, `informations`, `finaliser`, `acompte`, `confirmation`) is public | On the static site visitors request quotes without an account | Add the routes to `PROTECTED_ROUTES` in `proxy.ts` |
| Prices are always recomputed on the server | Client totals can be tampered with | — |
| Admin stores only price overrides, not the whole catalogue | Texts keep living in one file; a later text edit is never hidden by an old DB copy | — |
| Languages other than FR/EN use Google Translate | 24 languages × all pages cannot be hand-translated in the deadline; Google loads only when a visitor asks for it | Replace with hand-written dictionaries page by page |
| Card deposits are e-mailed only once paid (webhook) | An unpaid Stripe checkout is not a confirmed project | — |
| Video pages are React, with the same URLs and the same cart in localStorage | The static HTML bridge is gone | — |

---

## 8. Key files

| File | Role |
|---|---|
| `app/components/video/` | Marketing, services, forfaits and the quote flow |
| `config/services-data.js` | Video services catalogue (texts + default prices) |
| `app/lib/video-config.ts` | Defaults + admin price overrides |
| `config/pricing.ts` | Agents IA subscription prices |
| `proxy.ts` | Session refresh + protected routes |
| `config/languages.ts` | The 24 languages (names, flags) |
| `app/components/ui/SiteTranslator.tsx` | Floating switch + Google Translate loader |
| `config/supabase/migrations/` | Database schema |
| `app/lib/projects/emails.ts` | Project e-mails (texts + layout) |
