import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { sanitizeSelection } from "@/config/pricing";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { PaiementScreen, PaiementSuccess } from "@/components/billing/PaiementScreen";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Paiement — AK Universe") },
    robots: { index: false },
  };
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PaiementPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;

  if (one(params.success) === "1") return <PaiementSuccess />;

  const user = await getCurrentUser();
  const selection = sanitizeSelection({
    cycle: one(params.cycle) as "mensuel" | "annuel",
    users: Number(one(params.users)),
    options: one(params.options).split(","),
  });

  return <PaiementScreen selection={selection} email={user?.email ?? ""} pricing={await getAgentsPricing()} />;
}
