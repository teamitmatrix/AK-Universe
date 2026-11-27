import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AgreementSummary } from "@/lib/client/agreement-format";

export type { AgreementSummary };

export type AgreementDocument = AgreementSummary & {
  terms_snapshot: string | null;
  privacy_snapshot: string | null;
};

const KIND_LABEL: Record<string, string> = {
  subscription: "Abonnement",
  plan_change: "Modification d'offre",
  project_deposit: "Commande",
};

export function agreementKind(kind: string) {
  return KIND_LABEL[kind] ?? "Accord";
}

/** Date and time of an acceptance, in Paris local time. */
export function acceptedWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
}

export async function listMyAgreements(userId: string): Promise<AgreementSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms_acceptances")
    .select(
      "id, kind, plan, subscription_id, project_id, terms_version, terms_label, accepted_at, privacy_version, privacy_label, privacy_accepted_at"
    )
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false });
  if (error) {
    console.error("terms_acceptances list failed:", error.message);
    return [];
  }
  return (data ?? []) as AgreementSummary[];
}

export async function myAgreement(userId: string, id: string): Promise<AgreementDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms_acceptances")
    .select(
      "id, kind, plan, subscription_id, project_id, terms_version, terms_label, accepted_at, privacy_version, privacy_label, privacy_accepted_at, terms_snapshot, privacy_snapshot"
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("terms_acceptances read failed:", error.message);
    return null;
  }
  return (data as AgreementDocument | null) ?? null;
}
