import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AbonnementScreen } from "@/components/billing/AbonnementScreen";
import { getAgentsPricing } from "@/lib/agents-pricing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Personnalisez votre abonnement — AK Universe") },
    robots: { index: false },
  };
}

export default async function AbonnementPage() {
  return <AbonnementScreen pricing={await getAgentsPricing()} />;
}
