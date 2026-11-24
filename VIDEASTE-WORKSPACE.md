# AK Universe — Videographer workspace (Espace Vidéaste)

Implementation of the handoff *"AK Universe — Videographer Workspace (Espace Vidéaste)"* (static prototype, 4 Nov 2026)
in the real site: Next.js 16 + Supabase. Built, migrated and tested on **2026-11-14**.

The prototype kept everything in a browser object (`AKU_VIDEASTE` + `sessionStorage`). Here every screen reads and
writes real Supabase tables, every check runs on the server, and the database re-checks it again (RLS + SQL functions).

---

## 1. Summary

| Area | Status |
|---|---|
| Login: `videaste` role routed to `/videaste/dashboard` | ✅ Done |
| Videographer space: 8 screens (dashboard, projects, project detail, à monter, retours clients, fichiers, agenda, mon profil) | ✅ Done |
| Project workflow Brief reçu → … → Livré, re-validated in the database | ✅ Done |
| External file links (Drive, Dropbox, WeTransfer, Frame.io, OneDrive): no file hosting | ✅ Done |
| Video versions + "Envoyer à validation" + client answer (recorded by an admin) | ✅ Done |
| Admin: videographer roster (add / edit / deactivate, workload) + company-wide project table | ✅ Done |
| Notifications (project assigned, version reviewed, task reminders) | ✅ Done |
| Migration `013_videaste_workspace.sql` | ✅ **Applied to the live database** (backup first) |
| Database security tests | ✅ 145 / 145 (57 new for 013) |
| End-to-end test through the website | ✅ 69 / 69 |

---

## 2. Login and roles

Same site, same sign-in page, same session: the videographer is one more role, not a second app.

| Role | After sign-in | Can access |
|---|---|---|
| Client | `/client/dashboard` | Own account |
| Entreprise | `/entreprise/dashboard` | Organisation account |
| Commercial | `/commercial/dashboard` | Own sales and commissions |
| **Vidéaste** | **`/videaste/dashboard`** | **Only their own assigned projects, files, tasks, client feedback** |
| Admin | `/admin/dashboard` | Everything (re-verified on every request) |

- Sign-in (password + 2FA code, or Google) always goes through `/espace`, which reads the role from `profiles` on
  the server (`app/lib/auth/account.ts` → `homePathFor`).
- **Not done on purpose:** the prototype's keyword guessing (`detectRoleFromIdentifier` with "video", "monteur"…).
  Anyone could put "video" in an e-mail address; the handoff itself (page 01) says to replace it with a real role lookup.
- `/videaste` is in the signed-in-only routes (`proxy.ts`); `.html` URLs (`/videaste/agenda.html`…) redirect to the clean URL.

---

## 3. Security (handoff page 03)

| Requirement | How it is met |
|---|---|
| Role verified on the backend for every request | `requireVideaste()` / `getVideaste()` (`app/lib/videaste/session.ts`) in every page and every server action; reads `profiles` on each call |
| Never rely on hiding buttons | Every action re-checks the caller; the database refuses anything else (RLS + `SECURITY DEFINER` functions) |
| A videographer only sees their own data | Queries filter on their id **and** run with their own session, so RLS (`videaste_id = auth.uid()`, `is_project_videaste()`) applies |
| No access by typing an ID in the URL | `/videaste/projet?id=` answers **404** for a project that is not theirs (same answer as "does not exist") |
| Never trust browser data | IDs, stages, links and texts are validated on the server; version numbers are set by the database |
| Admin access re-verified server-side | `getAdminIdentity()` / `isAdmin()` on every admin page and action; non-admin → 404 |
| Deactivated account blocked immediately | Pages and actions refuse an inactive profile; **013 also closes the direct-API path** (policy "staff read assigned" now requires an active account) |
| Client answer never from the videographer's session | `respond_to_version()` is **admin-only** in the database |

---

## 4. Project workflow

```
Brief reçu → Tournage → Montage → À faire valider → Modifications → Validé → Livré
```

- `video_projects.stage` (production) is separate from `video_projects.status` (commercial / payment).
  For **paid** projects the status follows: work started → `en_cours`, delivered → `termine`. Unpaid requests keep their status.
- Who can set what (checked in `set_project_stage()`, whatever the browser sends):

| Change | Videographer | Admin |
|---|---|---|
| Brief reçu / Tournage / Montage | ✅ (before delivery) | ✅ |
| À faire valider | Only by sending a version | ✅ |
| Validé / Modifications | ❌ only the client's answer | ✅ |
| Livré | ✅ only once Validé | ✅ |

- **Version loop:** videographer adds a version (link) → "Envoyer à validation" (project → À faire valider; one version
  waits at a time) → admin records the client's answer:
  - **Valider** → project Validé
  - **Demander des modifications** (comment required) → project Modifications, +1 revision round, a client feedback
    appears in "Retours clients" (À traiter / En cours / Corrigé)
- **Deadline colours** (handoff "stay elegant"): red = overdue or due today, orange = within 3 days, green = done. Nothing else.
- **Progress bar** is derived from the stage (no separate percentage that could contradict the badge).

---

## 5. Screens

### Videographer space (`/videaste/*`, black & gold like the Commercial space)

| Screen | What it does |
|---|---|
| `dashboard` | Greeting, 4 KPI tiles (projets en cours, à livrer cette semaine, retours clients à traiter, terminés ce mois), "À faire aujourd'hui" with inline status (À faire / En cours / Fait), "Prochaines deadlines" grouped by day, active project cards. No charts |
| `mes-projets` | Tabs Tous / En cours / À valider / Modifications / Validés / Livrés with counts, search, card grid. The header search lands here |
| `projet?id=` | Stage dropdown, deadline, progress, technical spec, structured brief (or the client's original website request until the brief is filled), file links by category, version history + "Envoyer à validation", client feedback |
| `a-monter` | Only projects still needing edit work; priority tag; "Commencer" (→ Montage) / "Continuer" |
| `retours-clients` | Requested changes with the client's comment, version, deadline and a status selector |
| `fichiers` | Every file link of every assigned project, grouped by project, category filter + search |
| `agenda` | Shoots, client meetings, meetings, reviews, deliveries and project deadlines grouped by day; "Créer un événement"; task side panel |
| `mon-profil` | Name, phone, specialties; role and status are read-only; password change |

### Admin

| Screen | What changed |
|---|---|
| `/admin/projets-video` | Inline videographer reassignment, inline stage change, **"Vx à valider"** dialog (client answer), filters by videographer / client / status + "Projets en retard uniquement", KPIs incl. versions waiting and active videographers |
| `/admin/videastes` | Roster with phone, specialties, active status and workload; link to all projects; "Ajouter un vidéaste" (gives an existing account the role) |
| `/admin/videaste-detail?id=` | Edit form (name, phone, specialties) + deactivate / reactivate |

---

## 6. Database: migration 013

File: `config/supabase/migrations/013_videaste_workspace.sql`; rollback: `config/supabase/rollbacks/013_videaste_workspace_down.sql`.

| Object | Purpose |
|---|---|
| `video_projects.stage`, `stage_changed_at` | Production workflow; existing rows backfilled from their status (`updated_at` left untouched) |
| `set_project_stage()` | The only way to change a stage (transition rules above) |
| `project_briefs` | Structured brief + technical spec (one row per project) |
| `project_files` | **Links** to existing storage: only `https` on Drive / Dropbox / WeTransfer / Frame.io / OneDrive domains (checked in code and by `is_storage_link()` in the database) |
| `project_versions` | V1, V2… (numbered by the database); `send_version_for_validation()`; `respond_to_version()` (admin only) |
| `client_feedback` | Requested changes + `set_feedback_status()` |
| `agenda_events` | Existing agenda table reused for videographers (+ types tournage / réunion / deadline / revue / livraison, + `project_id`) |
| `tasks.started_at` + `set_task_progress()` | "En cours" on a task without a new status value, so existing code keeps working |
| `profiles.phone`, `profiles.specialties` | Videographer roster |
| `notifications` types | `project_assigned`, `version_reviewed` |
| Policy "video_projects: staff read assigned" | Now requires an **active** account |

No parallel system was created: same database, same auth, same tasks / agenda / notifications tables.

---

## 7. How it was applied and tested (2026-11-14)

| Step | Result |
|---|---|
| Backup of the live database (`scripts/db/backup.mjs`) | ✅ 20 tables, 167 rows (`db-backups/2026-11-14T15-05-32-183Z`, git-ignored) |
| Backup verification (`verify-backup.mjs`) | ✅ checksums OK, rows = live |
| Rehearsal (`migrate-step.mjs rehearse 013`): migration + checks + rollback + checks, nothing kept | ✅ |
| Dry run: all behaviour tests with 013 in a rolled-back transaction | ✅ 145 / 145 |
| Apply (`migrate-step.mjs apply 013`), one transaction with checks | ✅ |
| Behaviour tests on the live database (`migrate-step.mjs test`) | ✅ 145 / 145, no test user left |
| Field-by-field comparison with the backup (`compare-backup.mjs`) | ✅ every original row and value identical |
| End-to-end through the website (temporary `test-e2e-*` accounts + `TEST-E2E-*` projects, deleted afterwards) | ✅ 69 / 69 |
| Regression: admin dashboard / agenda, commercial dashboard / agenda / prospects | ✅ all 200 |

The 57 new database tests (in `scripts/db/checks.mjs`) cover, among others: another videographer cannot read or
change a project, brief, file, version, feedback, event or task; a videographer cannot validate their own work, set
"À faire valider" by hand or deliver before validation; non-storage and `http` links are refused; only an admin can
record the client's answer; a deactivated videographer sees nothing, even through the API.

**Bug found and fixed during testing:** `/admin/videastes` returned a 500 after a profile edit. Cause: the running
`next dev` kept an old compiled copy of `app/lib/admin/team.ts`. The roster now also tolerates a missing value.
If an unexpected 500 appears in development, restart `next dev`.

To re-run the database tests at any time:

```bash
node --env-file=.env scripts/db/migrate-step.mjs test
```

---

## 8. Manual test checklist

Preparation: create a normal account, then Admin → **Vidéastes** → "Ajouter un vidéaste" with its e-mail.

1. **Login:** sign in with the videographer → lands on `/videaste/dashboard`.
2. **Assignment (admin):** Projets vidéo → choose the videographer in "Vidéaste assigné" → the videographer gets
   "Nouveau projet attribué" in the bell and sees the project; a deadline today shows a red dot.
3. **Project page (videographer):** fill the brief; link a Google Drive file (provider detected); try `https://google.com`
   → refused; add a version → "Envoyer à validation" → stage À faire valider.
4. **Client answer (admin):** "V1 à valider" → comment → "Demander des modifications" → videographer sees it in the
   bell and in Retours clients → set "Corrigé" → send V2 → admin "Valider" → videographer sets "Livré".
5. **Other screens:** À monter, Agenda ("Créer un événement"), Fichiers, Mon profil.
6. **Security:** videographer opens `/admin/projets-video` → 404; admin deactivates the videographer → their next page
   load signs them out; reactivate afterwards.

---

## 9. Decisions (differences from the prototype)

| Prototype | Real site | Why |
|---|---|---|
| Role guessed from keywords in the identifier | Role read from `profiles` | Security; the handoff asks for it in production |
| OTP-only login | Password + 2FA code (unchanged) | OTP-only login was rejected earlier for the whole site |
| "Valider / Demander des modifications" demo panel on the videographer's page | Recorded by an admin in `/admin/projets-video` | Handoff page 07: never from the videographer's session; there is no client portal yet |
| Files "uploaded" | Links only, validated | Client instruction: do not build a parallel storage system |
| Separate `videographers` / `events` / `tasks` tables | `profiles` (role videaste), existing `agenda_events` and `tasks` | No parallel systems |
| Priority tag on projects | Derived from the deadline (and pending changes) | No priority field exists; it can never disagree with the dates |
| "Add videographer" creates an account | Gives an existing account the role | Same rule as the Commercial space (no accounts created by admins) |
| Google Calendar / Outlook sync | Not built | Out of scope in the handoff; data model allows it later |
| Texts | French only | Same as the latest Commercial screens; other languages via the site's translator |

---

## 10. Key files

| File | Role |
|---|---|
| `app/videaste/(space)/` | The 8 videographer pages + layout |
| `app/components/videaste/` | Frame, nav, dashboard, cards, stage / task / feedback selects, brief editor, files, versions, agenda, profile form |
| `app/lib/videaste/session.ts` | Access check (`requireVideaste`, `getVideaste`) |
| `app/lib/videaste/projects.ts`, `dashboard.ts`, `agenda.ts` | Loaders (own data only) |
| `app/lib/videaste/project-actions.ts`, `actions.ts`, `agenda-actions.ts` | Server actions |
| `app/lib/videaste/stages.ts`, `storage.ts`, `nav.ts`, `profile.ts` | Workflow + colour rule, storage providers, menu, profile validation |
| `app/lib/admin/videaste-actions.ts` | Admin actions (reassign, stage, client answer, profile) |
| `app/lib/admin/projects.ts`, `app/components/admin/space/ProjectsView.tsx`, `VideasteProjectControls.tsx` | Admin project table |
| `app/styles/videaste.css` | Scoped `.vid-*` styles on top of the Commercial theme |
| `config/supabase/migrations/013_videaste_workspace.sql` | Migration (rollback in `config/supabase/rollbacks/`) |
| `scripts/db/checks.mjs`, `scripts/db/migrate-step.mjs` | 013 checks + behaviour tests |
