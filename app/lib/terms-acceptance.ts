import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getTerms } from "@/lib/terms";

type SubscriptionProof = {
  userId: string;
  subscriptionId: string;
  plan: string;
  cycle: string;
  extraUsers: number;
  options: string[];
  acceptedAt?: string;
  termsVersion?: string;
  termsLabel?: string;
};

type ProjectProof = {
  userId: string | null;
  projectId: string;
  /** Free-form plan label for deposits (e.g. project reference / kind). */
  plan: string;
  options?: unknown;
  acceptedAt?: string;
  termsVersion?: string;
  termsLabel?: string;
};

/** Persists CGV acceptance proof (audit row). Failures are logged; caller still owns the checkout. */
export async function recordSubscriptionTermsAcceptance(proof: SubscriptionProof) {
  const at = proof.acceptedAt ?? new Date().toISOString();
  const terms = proof.termsVersion && proof.termsLabel ? null : await getTerms();
  const admin = createAdminClient();
  const { error } = await admin.from("terms_acceptances").insert({
    user_id: proof.userId,
    kind: "subscription",
    subscription_id: proof.subscriptionId,
    plan: proof.plan,
    cycle: proof.cycle,
    extra_users: proof.extraUsers,
    options: proof.options,
    terms_version: proof.termsVersion ?? terms!.version,
    terms_label: proof.termsLabel ?? terms!.label,
    accepted: true,
    accepted_at: at,
  });
  if (error) console.error("terms_acceptances subscription insert failed:", error.message);
  return at;
}

export async function recordProjectTermsAcceptance(proof: ProjectProof) {
  const at = proof.acceptedAt ?? new Date().toISOString();
  const terms = proof.termsVersion && proof.termsLabel ? null : await getTerms();
  const admin = createAdminClient();
  const { error } = await admin.from("terms_acceptances").insert({
    user_id: proof.userId,
    kind: "project_deposit",
    project_id: proof.projectId,
    plan: proof.plan,
    options: proof.options ?? [],
    terms_version: proof.termsVersion ?? terms!.version,
    terms_label: proof.termsLabel ?? terms!.label,
    accepted: true,
    accepted_at: at,
  });
  if (error) console.error("terms_acceptances project insert failed:", error.message);
  return at;
}
