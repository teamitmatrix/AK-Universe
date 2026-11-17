import type { Metadata } from "next";
import { AbonnementScreen } from "@/components/billing/AbonnementScreen";
import { getAgentsPricing } from "@/lib/agents-pricing";

export const metadata: Metadata = {
  title: { absolute: "Personnalisez votre abonnement — AK Universe" },
  robots: { index: false },
};

export default async function AbonnementPage() {
  return <AbonnementScreen pricing={await getAgentsPricing()} />;
}
