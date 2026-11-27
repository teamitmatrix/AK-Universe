export type AgreementSummary = {
  id: string;
  kind: string;
  plan: string | null;
  subscription_id: string | null;
  project_id: string | null;
  terms_version: string;
  terms_label: string;
  accepted_at: string;
  privacy_version: string | null;
  privacy_label: string | null;
  privacy_accepted_at: string | null;
};

/** Commande for a basket payment, Abonnement for a plan acceptance. */
export function agreementType(kind: string): "commande" | "abonnement" {
  return kind === "project_deposit" ? "commande" : "abonnement";
}

/** Short reference shown in the contracts table. Project payments already store an AKU code. */
export function agreementReference(row: Pick<AgreementSummary, "id" | "plan" | "project_id" | "subscription_id">) {
  if (row.plan && /^AKU-/i.test(row.plan)) return row.plan.toUpperCase();
  const source = (row.project_id || row.subscription_id || row.id).replace(/-/g, "");
  return `AKU-${source.slice(0, 8).toUpperCase()}`;
}

/** "Version 21/11/2026" from a stored YYYY-MM-DD version. */
export function versionChip(version: string | null) {
  if (!version) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(version);
  if (!match) return `Version ${version}`;
  return `Version ${match[3]}/${match[2]}/${match[1]}`;
}

/** "26 nov. 2026 · 02:18" in Paris time. */
export function acceptedStamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  return `${day} · ${time}`;
}
