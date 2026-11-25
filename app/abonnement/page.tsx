import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { subscriptionResumePath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: { absolute: "Offres Agents IA — AK Universe" },
  robots: { index: false },
};

/** Retired product page. A saved plan continues to its checkout; otherwise the public price list. */
export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.plan) query.set("plan", params.plan);
  if (params.cycle) query.set("cycle", params.cycle);
  const resume = params.plan ? subscriptionResumePath(`/paiement?${query}`) : null;
  redirect(resume ?? "/agents-ia#tarifs");
}
