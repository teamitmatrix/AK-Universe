import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkoutPlan, sanitizeSelection } from "@/config/pricing";
import { PaiementScreen, PaiementSuccess } from "@/components/billing/PaiementScreen";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Paiement — AK Universe" },
  robots: { index: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PaiementPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;

  if (one(params.success) === "1") return <PaiementSuccess />;

  const [user, pricing] = await Promise.all([getCurrentUser(), getAgentsPricing()]);
  const plan = checkoutPlan(one(params.plan), pricing);
  if (!plan) redirect("/agents-ia#tarifs");
  const selection = sanitizeSelection({
    cycle: one(params.cycle) as "mensuel" | "annuel",
    users: Number(one(params.users)),
    options: one(params.options).split(","),
  });

  return <PaiementScreen plan={plan} selection={selection} email={user?.email ?? ""} pricing={pricing} />;
}
