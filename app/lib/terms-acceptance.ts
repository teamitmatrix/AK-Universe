import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getPrivacy, renderPrivacyHtml } from "@/lib/privacy";
import { getTerms, renderTermsHtml } from "@/lib/terms";

type LegalProof = {
  userId: string | null;
  plan: string;
  acceptedAt?: string;
  termsVersion?: string;
  termsLabel?: string;
  privacyVersion?: string;
  privacyLabel?: string;
  termsSnapshot?: string;
  privacySnapshot?: string;
};

type SubscriptionProof = LegalProof & {
  userId: string;
  subscriptionId: string;
  cycle: string;
  extraUsers: number;
  options: string[];
  kind?: "subscription" | "plan_change";
};

type ProjectProof = LegalProof & {
  projectId: string;
  options?: unknown;
};

async function snapshots(proof: LegalProof) {
  const at = proof.acceptedAt ?? new Date().toISOString();
  const [terms, privacy, termsHtml, privacyHtml] = await Promise.all([
    proof.termsVersion && proof.termsLabel ? null : getTerms(),
    proof.privacyVersion && proof.privacyLabel ? null : getPrivacy(),
    proof.termsSnapshot ? Promise.resolve(proof.termsSnapshot) : renderTermsHtml(),
    proof.privacySnapshot ? Promise.resolve(proof.privacySnapshot) : renderPrivacyHtml(),
  ]);
  return {
    at,
    termsVersion: proof.termsVersion ?? terms!.version,
    termsLabel: proof.termsLabel ?? terms!.label,
    privacyVersion: proof.privacyVersion ?? privacy!.version,
    privacyLabel: proof.privacyLabel ?? privacy!.label,
    termsSnapshot: termsHtml,
    privacySnapshot: privacyHtml,
  };
}

/** Stores the terms and privacy acceptance. Returns false when the row could not be saved. */
export async function recordSubscriptionTermsAcceptance(proof: SubscriptionProof) {
  const snap = await snapshots(proof);
  const admin = createAdminClient();
  const { error } = await admin.from("terms_acceptances").insert({
    user_id: proof.userId,
    kind: proof.kind ?? "subscription",
    subscription_id: proof.subscriptionId,
    plan: proof.plan,
    cycle: proof.cycle,
    extra_users: proof.extraUsers,
    options: proof.options,
    terms_version: snap.termsVersion,
    terms_label: snap.termsLabel,
    terms_snapshot: snap.termsSnapshot,
    privacy_version: snap.privacyVersion,
    privacy_label: snap.privacyLabel,
    privacy_snapshot: snap.privacySnapshot,
    privacy_accepted_at: snap.at,
    accepted: true,
    accepted_at: snap.at,
  });
  if (error) {
    console.error("terms_acceptances subscription insert failed:", error.message);
    return false;
  }
  return true;
}

export async function recordProjectTermsAcceptance(proof: ProjectProof) {
  const snap = await snapshots(proof);
  const admin = createAdminClient();
  const { error } = await admin.from("terms_acceptances").insert({
    user_id: proof.userId,
    kind: "project_deposit",
    project_id: proof.projectId,
    plan: proof.plan,
    options: proof.options ?? [],
    terms_version: snap.termsVersion,
    terms_label: snap.termsLabel,
    terms_snapshot: snap.termsSnapshot,
    privacy_version: snap.privacyVersion,
    privacy_label: snap.privacyLabel,
    privacy_snapshot: snap.privacySnapshot,
    privacy_accepted_at: snap.at,
    accepted: true,
    accepted_at: snap.at,
  });
  if (error) {
    console.error("terms_acceptances project insert failed:", error.message);
    return false;
  }
  return true;
}
