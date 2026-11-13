/*
 * Smoke test of the running site after a migration step:
 *   node scripts/db/site-check.mjs http://localhost:3123
 * Public pages must answer 200 and still show the same prices / company details; protected pages must
 * redirect a logged-out visitor to /connexion. Read-only (plain GET requests).
 */
const base = process.argv[2] ?? "http://localhost:3000";
const PUBLIC = [
  ["/", []],
  ["/agents-ia", ["139"]],
  ["/marketing/forfaits", ["390"]],
  ["/services", []],
  ["/mentions-legales", ["934 762 360 00014", "41 avenue Henri Barbusse"]],
  ["/cgv", ["contact@akuniverse.com"]],
  ["/confidentialite", []],
  ["/contact", ["contact@akuniverse.com"]],
];
const PROTECTED = ["/admin", "/admin/dashboard", "/admin/commerciaux", "/admin/commissions", "/admin/catalogue", "/admin/agenda", "/admin/parametres", "/admin/rapports/export", "/equipe", "/compte", "/abonnement", "/commercial/dashboard"];

let failures = 0;
for (const [path, must] of PUBLIC) {
  const res = await fetch(base + path, { redirect: "manual" });
  const html = await res.text();
  const missing = must.filter((m) => !html.includes(m));
  const ok = res.status === 200 && !missing.length;
  if (!ok) failures++;
  console.log(`  ${ok ? "✅" : "❌"} ${path.padEnd(22)} ${res.status}${missing.length ? `  missing: ${missing.join(", ")}` : ""}`);
}
for (const path of PROTECTED) {
  const res = await fetch(base + path, { redirect: "manual" });
  const to = res.headers.get("location") ?? "";
  const ok = res.status >= 300 && res.status < 400 && to.includes("/connexion");
  if (!ok) failures++;
  console.log(`  ${ok ? "✅" : "❌"} ${path.padEnd(22)} ${res.status} → ${to.replace(base, "") || "(no redirect)"}`);
}
console.log(failures ? `\n❌ ${failures} SITE CHECK(S) FAILED` : "\n✅ SITE CHECKS PASSED");
process.exitCode = failures ? 1 : 0;
