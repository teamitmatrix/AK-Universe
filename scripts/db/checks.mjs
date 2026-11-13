/*
 * Verification SQL for the admin-space migrations. Every check is a DO block that raises
 * "CHECK_FAILED: <reason>" on the first problem, so it can abort the surrounding transaction.
 * `ctx` = { counts: {table: rows} from the backup, adminId, userId } — existing data must be untouched.
 */

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const assert = (cond, msg) => `if not (${cond}) then raise exception 'CHECK_FAILED: %', ${sqlStr(msg)}; end if;`;
const col = (table, column) => `exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = ${sqlStr(table)} and column_name = ${sqlStr(column)})`;
const policy = (schema, table, name) => `exists (select 1 from pg_policies where schemaname = ${sqlStr(schema)} and tablename = ${sqlStr(table)} and policyname = ${sqlStr(name)})`;
const conDef = (name) => `(select pg_get_constraintdef(oid) from pg_constraint where conname = ${sqlStr(name)} and connamespace = 'public'::regnamespace)`;
const fnDef = (name) => `(select pg_get_functiondef(oid) from pg_proc where proname = ${sqlStr(name)} and pronamespace = 'public'::regnamespace limit 1)`;
const rls = (table) => `(select relrowsecurity from pg_class where oid = ${sqlStr(`public.${table}`)}::regclass)`;
const tableExists = (table) => `(to_regclass(${sqlStr(`public.${table}`)}) is not null)`;

/** Existing rows are untouched, and the real admin is still admin / the real user is not. */
function invariants(ctx) {
  const counts = Object.entries(ctx.counts)
    .map(([t, n]) => assert(`(select count(*) from public."${t}") = ${n}`, `row count of ${t} changed (expected ${n})`))
    .join("\n  ");
  return `
  ${counts}
  perform set_config('request.jwt.claims', json_build_object('sub', ${sqlStr(ctx.adminId)}, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  ${assert("public.is_admin()", "the existing admin is no longer admin")}
  perform set_config('request.jwt.claims', json_build_object('sub', ${sqlStr(ctx.userId)}, 'role', 'authenticated')::text, true);
  ${assert("not public.is_admin()", "the existing non-admin user became admin")}
  perform set_config('role', session_user, true);
  perform set_config('request.jwt.claims', '', true);`;
}

const block = (body) => `do $chk$\nbegin\n${body}\nend $chk$;`;

export const CHECKS = {
  "012": {
    up: (ctx) =>
      block(`
  ${assert(["commission_rates", "sales_documents", "agenda_events", "document_counters"].map((t) => tableExists(t) + " and " + rls(t)).join(" and "), "012 tables missing or RLS off")}
  ${assert("(select count(*) from public.commission_rates) = 6 and (select rate from public.commission_rates where product_type = 'agents') = 15", "commission rates not seeded as in the handoff")}
  ${assert(col("commissions", "document_id") + " and " + col("tasks", "priority") + " and " + col("tasks", "client_name"), "new columns missing")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname like 'tasks: rep %') = 3", "tasks: rep policies missing")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'document_counters') = 0", "document_counters must have no policy")}
  ${invariants(ctx)}`),
    down: (ctx) => block(`  ${assert("not " + tableExists("sales_documents") + " and not " + tableExists("agenda_events") + " and not " + col("commissions", "document_id") + " and not " + col("tasks", "priority"), "012 objects still present")}\n  ${invariants(ctx)}`),
  },
  "011": {
    up: (ctx) =>
      block(`
  ${assert(["prospects", "customers", "prospect_events"].map((t) => tableExists(t) + " and " + rls(t)).join(" and "), "prospects / customers / prospect_events missing or RLS off")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'prospects') = 4", "prospects must have 4 policies")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'customers') = 1", "customers must only be readable (1 policy)")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'prospect_events') = 1", "prospect_events must only be readable (1 policy)")}
  ${assert(fnDef("convert_prospect") + " like '%auth.uid()%'", "convert_prospect must check the caller")}
  ${assert("(select count(*) from public.prospects) = (select count(*) from public.video_projects where commercial_id is not null and status in ('nouveau', 'acompte_en_attente'))", "backfill: one prospect per open assigned request")}
  ${assert("(select count(*) from public.prospect_events) = (select count(*) from public.prospects)", "backfill: one 'created' event per prospect")}
  ${invariants(ctx)}`),
    down: (ctx) => block(`  ${assert("not " + tableExists("prospects") + " and not " + tableExists("customers") + " and not " + tableExists("prospect_events"), "prospect tables still present")}\n  ${invariants(ctx)}`),
  },
  "010": {
    up: (ctx) =>
      block(`
  ${assert(tableExists("notifications") + " and " + rls("notifications"), "notifications missing or RLS off")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'notifications') = 1", "notifications must have exactly 1 policy (read own)")}
  ${assert(fnDef("mark_notifications_read") + " like '%auth.uid()%'", "mark_notifications_read must be limited to the caller")}
  ${invariants(ctx)}`),
    down: (ctx) => block(`  ${assert("not " + tableExists("notifications"), "notifications still present")}\n  ${invariants(ctx)}`),
  },
  "009": {
    up: (ctx) =>
      block(`
  ${assert(tableExists("audit_log") + " and " + rls("audit_log"), "audit_log missing or RLS off")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'audit_log') = 2", "audit_log must have exactly 2 policies (read, insert)")}
  ${invariants(ctx)}`),
    down: (ctx) => block(`  ${assert("not " + tableExists("audit_log"), "audit_log still present")}\n  ${invariants(ctx)}`),
  },
  "005": {
    up: (ctx) =>
      block(`
  ${assert(col("profiles", "active") + " and " + col("profiles", "commission_rate") + " and " + col("profiles", "monthly_target_cents"), "profiles: new columns missing")}
  ${assert("not exists (select 1 from public.profiles where active is distinct from true)", "existing profiles must all be active")}
  ${assert(`${conDef("profiles_role_check")} like '%commercial%' and ${conDef("profiles_role_check")} like '%videaste%'`, "role check does not allow commercial/videaste")}
  ${assert(col("video_projects", "commercial_id") + " and " + col("video_projects", "videaste_id") + " and " + col("video_projects", "deadline"), "video_projects: assignment columns missing")}
  ${assert("not exists (select 1 from public.video_projects where commercial_id is not null or videaste_id is not null or deadline is not null)", "existing projects must be unassigned")}
  ${assert(tableExists("commissions") + " and " + rls("commissions"), "commissions table missing or RLS off")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'commissions') = 4", "commissions must have 4 policies")}
  ${assert(policy("public", "profiles", "profiles: update own") + " and " + policy("public", "profiles", "profiles: admin updates") + " and " + policy("public", "profiles", "profiles: read own or admin"), "profiles policies incomplete")}
  ${assert(policy("public", "video_projects", "video_projects: staff read assigned"), "staff read policy missing")}
  ${assert(`${fnDef("is_admin")} like '%active%'`, "is_admin does not check active")}
  ${invariants(ctx)}`),
    down: (ctx) =>
      block(`
  ${assert("not " + col("profiles", "active") + " and not " + col("profiles", "commission_rate"), "profiles columns still present")}
  ${assert(`${conDef("profiles_role_check")} = 'CHECK ((role = ANY (ARRAY[''user''::text, ''admin''::text])))'`, "role check not restored")}
  ${assert("not " + col("video_projects", "commercial_id") + " and not " + col("video_projects", "deadline"), "assignment columns still present")}
  ${assert("not " + tableExists("commissions"), "commissions still present")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles') = 2", "profiles must be back to 2 policies")}
  ${assert("not " + policy("public", "video_projects", "video_projects: staff read assigned"), "staff read policy still present")}
  ${assert(`${fnDef("is_admin")} not like '%active%'`, "is_admin not restored")}
  ${invariants(ctx)}`),
  },
  "006": {
    up: (ctx) =>
      block(`
  ${assert(col("video_projects", "revision_rounds"), "revision_rounds missing")}
  ${assert("not exists (select 1 from public.video_projects where revision_rounds <> 0)", "existing projects must have 0 revision rounds")}
  ${invariants(ctx)}`),
    down: (ctx) => block(`  ${assert("not " + col("video_projects", "revision_rounds"), "revision_rounds still present")}\n  ${invariants(ctx)}`),
  },
  "007": {
    up: (ctx) =>
      block(`
  ${assert(`${conDef("payments_kind_check")} like '%balance%'`, "payments kind does not allow balance")}
  ${assert(policy("public", "payments", "payments: admin insert"), "payments admin insert policy missing")}
  ${assert("exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'commissions_project_unique' and indexdef like 'CREATE UNIQUE%')", "unique index on commissions.project_id missing")}
  ${invariants(ctx)}`),
    down: (ctx) =>
      block(`
  ${assert(`${conDef("payments_kind_check")} = 'CHECK ((kind = ANY (ARRAY[''subscription''::text, ''deposit''::text])))'`, "payments kind check not restored")}
  ${assert("not " + policy("public", "payments", "payments: admin insert"), "payments admin insert policy still present")}
  ${assert("not exists (select 1 from pg_indexes where indexname = 'commissions_project_unique')", "unique index still present")}
  ${invariants(ctx)}`),
  },
  "008": {
    up: (ctx) =>
      block(`
  ${assert(tableExists("tasks") + " and " + rls("tasks"), "tasks table missing or RLS off")}
  ${assert("(select count(*) from pg_policies where schemaname = 'public' and tablename = 'tasks') = 4", "tasks must have 4 policies")}
  ${assert("exists (select 1 from pg_proc where proname = 'set_task_done' and pronamespace = 'public'::regnamespace)", "set_task_done missing")}
  ${assert("exists (select 1 from storage.buckets where id = 'documents' and public = false)", "private documents bucket missing")}
  ${assert("(select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'documents:%') = 5", "documents storage policies incomplete")}
  ${invariants(ctx)}`),
    down: (ctx) =>
      block(`
  ${assert("not " + tableExists("tasks"), "tasks still present")}
  ${assert("not exists (select 1 from pg_proc where proname = 'set_task_done')", "set_task_done still present")}
  ${assert("not exists (select 1 from pg_policies where schemaname = 'storage' and policyname like 'documents:%')", "documents policies still present")}
  ${invariants(ctx)}`),
  },
};

/*
 * Behaviour tests, run in a transaction that is always rolled back. Creates throw-away users
 * (commercial A, videographer B, plain user C, deactivated admin D), then checks what each one can do.
 * Returns base64(JSON) through the final exception so the result survives the rollback.
 */
export function behaviourTests(ctx, applied) {
  const as = (who) => `perform set_config('request.jwt.claims', json_build_object('sub', ${who}, 'role', 'authenticated')::text, true); perform set_config('role', 'authenticated', true);`;
  const back = `perform set_config('role', session_user, true); perform set_config('request.jwt.claims', '', true);`;
  const ok = (label, cond) => `if ${cond} then r := r || jsonb_build_object(${sqlStr(label)}, 'ok'); else r := r || jsonb_build_object(${sqlStr(label)}, 'FAIL'); fails := fails + 1; end if;`;
  const blocked = (label, who, stmt) => `
  begin
    ${as(who)}
    ${stmt};
    ${back}
    r := r || jsonb_build_object(${sqlStr(label)}, 'FAIL: was allowed'); fails := fails + 1;
  exception when others then
    r := r || jsonb_build_object(${sqlStr(label)}, 'ok (blocked)');
  end;
  ${back}`;
  const allowed = (label, who, stmt) => `
  begin
    ${as(who)}
    ${stmt};
    ${back}
    r := r || jsonb_build_object(${sqlStr(label)}, 'ok');
  exception when others then
    r := r || jsonb_build_object(${sqlStr(label)}, 'FAIL: ' || sqlerrm); fails := fails + 1;
  end;
  ${back}`;
  const has = (n) => applied.includes(n);
  const admin = sqlStr(ctx.adminId);

  return `do $t$
declare
  r jsonb := '{}'; fails int := 0; n int; b boolean;
  a uuid := gen_random_uuid(); v uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid();
  p uuid; t uuid;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'test-a-' || a || '@test.invalid', 'authenticated', 'authenticated'),
    (v, 'test-v-' || v || '@test.invalid', 'authenticated', 'authenticated'),
    (c, 'test-c-' || c || '@test.invalid', 'authenticated', 'authenticated'),
    (d, 'test-d-' || d || '@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set role = 'commercial' where id = a;
  update public.profiles set role = 'videaste' where id = v;
  update public.profiles set role = 'admin', active = false where id = d;
  select id into p from public.video_projects order by created_at limit 1;
  update public.video_projects set commercial_id = a, videaste_id = v where id = p;
  insert into public.commissions (commercial_id, project_id, amount_cents) values (a, p, 1000);

  -- 005: roles, deactivation, project visibility, commissions
  ${as(admin)} ${ok("005 real admin is admin", "public.is_admin()")} ${back}
  ${as("d")} ${ok("005 deactivated admin is NOT admin", "not public.is_admin()")} ${back}
  ${as("a")} select count(*) into n from public.video_projects; ${back}
  ${ok("005 commercial sees only his assigned project", "n = 1")}
  ${as("c")} select count(*) into n from public.video_projects; ${back}
  ${ok("005 plain user sees no project of others", "n = 0")}
  ${as("a")} select count(*) into n from public.commissions; ${back}
  ${ok("005 commercial sees his own commission", "n = 1")}
  ${as("c")} select count(*) into n from public.commissions; ${back}
  ${ok("005 plain user sees no commission", "n = 0")}
  ${blocked("005 commercial cannot make himself admin", "a", "update public.profiles set role = 'admin' where id = a")}
  ${blocked("005 commercial cannot reactivate/deactivate himself", "a", "update public.profiles set active = false where id = a")}
  ${blocked("005 commercial cannot create commissions", "a", "insert into public.commissions (commercial_id, amount_cents) values (a, 99999)")}
  ${blocked("005 deactivated admin cannot create commissions", "d", "insert into public.commissions (commercial_id, amount_cents) values (a, 1)")}
  ${allowed("005 admin can set a sales target", admin, "update public.profiles set monthly_target_cents = 100 where id = a")}
  ${as("a")} update public.profiles set first_name = 'Test' where id = a; get diagnostics n = row_count; ${back}
  ${ok("005 commercial can still edit his own name", "n = 1")}
  ${as(admin)} select count(*) into n from public.video_projects; ${back}
  ${ok("005 admin still sees every project", `n = ${ctx.counts.video_projects}`)}

  ${
    has("006")
      ? `-- 006: revision rounds
  ${allowed("006 admin can set revision rounds", admin, "update public.video_projects set revision_rounds = 2 where id = p")}
  ${blocked("006 revision rounds above 50 rejected", admin, "update public.video_projects set revision_rounds = 51 where id = p")}`
      : ""
  }

  ${
    has("007")
      ? `-- 007: balances and unique commissions
  ${allowed("007 admin can record a balance", admin, "insert into public.payments (kind, project_id, amount_cents, status) values ('balance', p, 100, 'paid')")}
  ${blocked("007 admin cannot fake a Stripe deposit", admin, "insert into public.payments (kind, project_id, amount_cents, status) values ('deposit', p, 100, 'paid')")}
  ${blocked("007 commercial cannot record a balance", "a", "insert into public.payments (kind, project_id, amount_cents, status) values ('balance', p, 100, 'paid')")}
  ${blocked("007 second commission on the same sale rejected", admin, "insert into public.commissions (commercial_id, project_id, amount_cents) values (a, p, 5)")}`
      : ""
  }

  ${
    has("008")
      ? `-- 008: tasks and documents
  ${allowed("008 admin can assign a task", admin, "insert into public.tasks (assigned_to, assigned_by, title, due_at) values (a, " + admin + "::uuid, 'Test task', now())")}
  select id into t from public.tasks where assigned_to = a limit 1;
  ${as("a")} select count(*) into n from public.tasks; ${back}
  ${ok("008 assignee sees his task", "n = 1")}
  ${as("c")} select count(*) into n from public.tasks; ${back}
  ${ok("008 other user does not see it", "n = 0")}
  ${blocked("008 commercial cannot create tasks", "a", "insert into public.tasks (assigned_to, title, due_at) values (c, 'x', now())")}
  ${as("c")} b := public.set_task_done(t, true); ${back}
  ${ok("008 other user cannot tick the task", "not b")}
  ${as("d")} b := public.set_task_done(t, true); ${back}
  ${ok("008 deactivated admin cannot tick the task", "not b")}
  ${as("a")} b := public.set_task_done(t, true); ${back}
  ${ok("008 assignee can tick his task", "b and (select status from public.tasks where id = t) = 'fait'")}
  ${as("a")} select count(*) into n from storage.objects where bucket_id = 'documents'; ${back}
  ${ok("008 storage read for staff does not error", "n >= 0")}`
      : ""
  }

  ${
    has("009")
      ? `-- 009: audit log (append-only, in the caller's own name)
  ${allowed("009 admin can write an audit entry", admin, "insert into public.audit_log (actor_id, action) values (" + admin + "::uuid, 'test.entry')")}
  ${blocked("009 admin cannot write an entry in someone else's name", admin, "insert into public.audit_log (actor_id, action) values (a, 'forged')")}
  ${blocked("009 commercial cannot write audit entries", "a", "insert into public.audit_log (actor_id, action) values (a, 'x')")}
  ${as("a")} select count(*) into n from public.audit_log; ${back}
  ${ok("009 commercial cannot read the audit log", "n = 0")}
  ${as(admin)} update public.audit_log set action = 'tampered' where action = 'test.entry'; get diagnostics n = row_count; ${back}
  ${ok("009 audit entries cannot be modified", "n = 0")}
  ${as(admin)} delete from public.audit_log where action = 'test.entry'; get diagnostics n = row_count; ${back}
  ${ok("009 audit entries cannot be deleted", "n = 0")}`
      : ""
  }

  ${
    has("010")
      ? `-- 010: notifications (each user reads and marks only their own)
  insert into public.notifications (user_id, type, ref) values (a, 'lead_assigned', 'test-a'), (c, 'task_assigned', 'test-c');
  ${as("a")} select count(*) into n from public.notifications where ref like 'test-%'; ${back}
  ${ok("010 commercial reads only his own notification", "n = 1")}
  ${as("c")} select count(*) into n from public.notifications where user_id = a; ${back}
  ${ok("010 another user cannot read it", "n = 0")}
  ${blocked("010 users cannot create notifications", "a", "insert into public.notifications (user_id, type) values (a, 'invoice_paid')")}
  ${as("c")} select public.mark_notifications_read(array(select id from public.notifications where user_id = a)) into n; ${back}
  ${ok("010 another user cannot mark it read", "n = 0 and exists (select 1 from public.notifications where user_id = a and read_at is null)")}
  ${as("a")} update public.notifications set data = '{"x":1}' where user_id = a; get diagnostics n = row_count; ${back}
  ${ok("010 notifications cannot be edited directly", "n = 0")}
  ${as("a")} select public.mark_notifications_read(null) into n; ${back}
  ${ok("010 owner can mark his notifications read", "n = 1")}`
      : ""
  }

  ${
    has("011")
      ? `-- 011: prospects pipeline, customers, history
  ${allowed("011 commercial creates his own prospect", "a", "insert into public.prospects (salesperson_id, name, email, budget_cents) values (a, 'TestP1', 'test-p@test.invalid', 1000)")}
  ${blocked("011 commercial cannot create a prospect for someone else", "a", "insert into public.prospects (salesperson_id, name) values (v, 'TestForged')")}
  ${as("c")} select count(*) into n from public.prospects where name like 'TestP%'; ${back}
  ${ok("011 plain user sees no prospect", "n = 0")}
  ${as("v")} select count(*) into n from public.prospects where name like 'TestP%'; ${back}
  ${ok("011 other staff member sees no prospect", "n = 0")}
  ${blocked("011 commercial cannot hand his prospect to someone else", "a", "update public.prospects set salesperson_id = v where name = 'TestP1'")}
  ${allowed("011 commercial moves his prospect to contacté", "a", "update public.prospects set stage = 'contacte' where name = 'TestP1'")}
  ${ok("011 stage change is logged server-side", "exists (select 1 from public.prospect_events e join public.prospects p on p.id = e.prospect_id where p.name = 'TestP1' and e.kind = 'stage' and e.from_stage = 'nouveau' and e.to_stage = 'contacte' and e.actor_id = a)")}
  ${blocked("011 commercial cannot link a customer by hand", "a", "update public.prospects set customer_id = gen_random_uuid() where name = 'TestP1'")}
  ${blocked("011 commercial cannot write history", "a", "insert into public.prospect_events (prospect_id, kind) select id, 'converted' from public.prospects where name = 'TestP1'")}
  ${blocked("011 commercial cannot create a customer directly", "a", "insert into public.customers (salesperson_id, name) values (a, 'TestForged')")}
  ${blocked("011 other user cannot convert it", "c", "perform public.convert_prospect((select id from public.prospects where name = 'TestP1'))")}
  ${allowed("011 commercial converts his prospect", "a", "perform public.convert_prospect((select id from public.prospects where name = 'TestP1'))")}
  ${ok("011 conversion: customer created and linked both ways", "exists (select 1 from public.prospects p join public.customers cu on cu.id = p.customer_id where p.name = 'TestP1' and p.stage = 'gagne' and p.converted_at is not null and cu.source_prospect_id = p.id and cu.salesperson_id = a and cu.email = 'test-p@test.invalid')")}
  ${ok("011 conversion is logged", "exists (select 1 from public.prospect_events e join public.prospects p on p.id = e.prospect_id where p.name = 'TestP1' and e.kind = 'converted' and e.from_stage = 'contacte')")}
  ${allowed("011 converting twice is harmless", "a", "perform public.convert_prospect((select id from public.prospects where name = 'TestP1'))")}
  ${allowed("011 commercial creates a 2nd prospect, same e-mail", "a", "insert into public.prospects (salesperson_id, name, email) values (a, 'TestP2', 'TEST-P@test.invalid')")}
  ${allowed("011 converting it merges into the same customer", "a", "perform public.convert_prospect((select id from public.prospects where name = 'TestP2'))")}
  ${ok("011 one customer for the same rep + e-mail (merge)", "(select count(*) from public.customers where salesperson_id = a) = 1 and (select count(distinct customer_id) from public.prospects where name in ('TestP1', 'TestP2')) = 1")}
  ${as("a")} select count(*) into n from public.customers; ${back}
  ${ok("011 commercial sees his customer", "n = 1")}
  ${as("c")} select count(*) into n from public.customers; ${back}
  ${ok("011 plain user sees no customer", "n = 0")}
  ${blocked("011 converted prospect cannot go back in the pipeline", "a", "update public.prospects set stage = 'negociation' where name = 'TestP1'")}
  ${as("a")} delete from public.prospects where name = 'TestP1'; get diagnostics n = row_count; ${back}
  ${ok("011 converted prospect cannot be deleted", "n = 0")}
  ${as(admin)} select count(*) into n from public.prospects where name like 'TestP%'; ${back}
  ${ok("011 admin sees every prospect", "n = 2")}
  update public.profiles set active = false where id = a;
  ${as("a")} select count(*) into n from public.prospects where name like 'TestP%'; ${back}
  ${ok("011 deactivated rep sees nothing any more", "n = 0")}
  ${blocked("011 deactivated rep cannot create prospects", "a", "insert into public.prospects (salesperson_id, name) values (a, 'TestP3')")}
  update public.profiles set active = true where id = a;`
      : ""
  }

  ${
    has("012")
      ? `-- 012: quotes / invoices, commissions from paid invoices, agenda, own tasks
  ${allowed("012 commercial creates a quote", "a", "insert into public.sales_documents (kind, salesperson_id, client_name, lines, commission_cents, total_ht_cents) values ('devis', a, 'TestClientQ', jsonb_build_array(jsonb_build_object('label', 'Test line', 'product_type', 'agents', 'qty', 1, 'unit_cents', 100000, 'rate', 90)), 999999, 1)")}
  ${ok("012 totals and commission recomputed by the database (forged rate ignored)", "exists (select 1 from public.sales_documents where client_name = 'TestClientQ' and total_ht_cents = 100000 and total_ttc_cents = 120000 and commission_cents = 15000 and (lines -> 0 ->> 'rate')::numeric = 15 and number like 'DEV-%')")}
  ${blocked("012 unknown product type rejected", "a", "insert into public.sales_documents (kind, salesperson_id, client_name, lines) values ('devis', a, 'TestBad', jsonb_build_array(jsonb_build_object('label', 'Test line', 'product_type', 'hack', 'qty', 1, 'unit_cents', 100)))")}
  ${blocked("012 commercial cannot create a document for someone else", "a", "insert into public.sales_documents (kind, salesperson_id, client_name, lines) values ('devis', v, 'TestForged', jsonb_build_array(jsonb_build_object('label', 'Test line', 'product_type', 'videos', 'qty', 1, 'unit_cents', 100)))")}
  ${as("c")} select count(*) into n from public.sales_documents where client_name like 'Test%'; ${back}
  ${ok("012 plain user sees no document", "n = 0")}
  ${as("v")} select count(*) into n from public.sales_documents where client_name like 'Test%'; ${back}
  ${ok("012 other staff member sees no document", "n = 0")}
  ${as("v")} update public.sales_documents set client_name = 'Hacked' where client_name = 'TestClientQ'; get diagnostics n = row_count; ${back}
  ${ok("012 other staff member cannot edit it", "n = 0")}
  ${allowed("012 commercial issues an invoice", "a", "insert into public.sales_documents (kind, salesperson_id, client_name, status, lines) values ('facture', a, 'TestClientF', 'en_attente', jsonb_build_array(jsonb_build_object('label', 'Test line', 'product_type', 'abonnements', 'qty', 1, 'unit_cents', 50000)))")}
  ${allowed("012 commercial marks it paid", "a", "update public.sales_documents set status = 'payee' where client_name = 'TestClientF'")}
  ${ok("012 paid invoice creates one pending commission (10 %)", "(select count(*) from public.commissions c join public.sales_documents d on d.id = c.document_id where d.client_name = 'TestClientF' and c.commercial_id = a and c.status = 'en_attente' and c.amount_cents = 5000) = 1")}
  ${blocked("012 paid invoice is locked for the rep", "a", "update public.sales_documents set client_name = 'Changed' where client_name = 'TestClientF'")}
  ${as("a")} delete from public.sales_documents where client_name = 'TestClientF'; get diagnostics n = row_count; ${back}
  ${ok("012 issued invoice cannot be deleted", "n = 0")}
  ${blocked("012 a quote cannot be 'paid'", "a", "update public.sales_documents set status = 'payee' where client_name = 'TestClientQ'")}
  ${blocked("012 commercial cannot add a commission rate", "a", "insert into public.commission_rates (product_type, rate) values ('hack', 90)")}
  ${as("a")} update public.commission_rates set rate = 90 where product_type = 'agents'; get diagnostics n = row_count; ${back}
  ${ok("012 commission rates unchanged by a rep", "n = 0 and (select rate from public.commission_rates where product_type = 'agents') = 15")}
  ${allowed("012 commercial creates an agenda event", "a", "insert into public.agenda_events (salesperson_id, title, type, starts_at) values (a, 'TestEvent', 'rdv', now() + interval '1 day')")}
  ${blocked("012 commercial cannot create an event for someone else", "a", "insert into public.agenda_events (salesperson_id, title, type, starts_at) values (v, 'TestForged', 'rdv', now())")}
  ${as("c")} select count(*) into n from public.agenda_events where title like 'Test%'; ${back}
  ${ok("012 plain user sees no event", "n = 0")}
  ${as("v")} delete from public.agenda_events where title = 'TestEvent'; get diagnostics n = row_count; ${back}
  ${ok("012 other staff member cannot delete the event", "n = 0")}
  ${allowed("012 commercial creates his own task", "a", "insert into public.tasks (assigned_to, assigned_by, title, due_at, priority) values (a, a, 'TestOwnTask', now(), 'haute')")}
  ${blocked("012 commercial cannot create a task for someone else", "a", "insert into public.tasks (assigned_to, assigned_by, title, due_at) values (v, a, 'TestForged', now())")}
  ${as("a")} update public.tasks set title = 'Hacked' where assigned_to = a and assigned_by is distinct from a; get diagnostics n = row_count; ${back}
  ${ok("012 commercial cannot edit a task given by an admin", "n = 0")}
  ${as("a")} delete from public.tasks where title = 'TestOwnTask'; get diagnostics n = row_count; ${back}
  ${ok("012 commercial can delete his own task", "n = 1")}
  update public.profiles set active = false where id = a;
  ${as("a")} select (select count(*) from public.sales_documents where client_name like 'Test%') + (select count(*) from public.agenda_events where title like 'Test%') into n; ${back}
  ${ok("012 deactivated rep sees no document or event", "n = 0")}
  update public.profiles set active = true where id = a;`
      : ""
  }

  raise exception 'TEST_RESULT:%:%', fails, replace(encode(convert_to(r::text, 'UTF8'), 'base64'), E'\\n', '');
end $t$;`;
}
