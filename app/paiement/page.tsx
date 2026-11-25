import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { checkoutPlan, sanitizeSelection } from "@/config/pricing";
import { PaiementScreen, PaiementSuccess } from "@/components/billing/PaiementScreen";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getCurrentUser } from "@/lib/auth/session";
import { isCountry } from "@/lib/client/countries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "Paiement — AK Universe" },
  robots: { index: false },
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function billingCountry(userId: string | undefined): Promise<string> {
  if (!userId) return "FR";
  const supabase = await createClient();
  const { data: billing } = await supabase.from("billing_profiles").select("country").eq("user_id", userId).maybeSingle();
  if (isCountry(billing?.country)) return String(billing.country).toUpperCase();
  const { data: profile } = await supabase.from("profiles").select("country").eq("id", userId).maybeSingle();
  if (isCountry(profile?.country)) return String(profile.country).toUpperCase();
  return "FR";
}

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
  const country = await billingCountry(user?.id);

  return <PaiementScreen plan={plan} selection={selection} email={user?.email ?? ""} pricing={pricing} country={country} />;
}
