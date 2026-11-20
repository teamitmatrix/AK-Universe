import type { Metadata } from "next";
import { Suspense } from "react";
import { AbonnementScreen } from "@/components/billing/AbonnementScreen";
import { OPTIONS } from "@/config/pricing";
import { parseAgentsCycle } from "@/lib/agents-cycle";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getHiddenCatalogueIds } from "@/lib/catalogue-commercial";

export const metadata: Metadata = {
  title: { absolute: "Personnalisez votre abonnement — AK Universe" },
  robots: { index: false },
};

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const params = await searchParams;
  const initialCycle = parseAgentsCycle(params.cycle) ?? undefined;
  const [pricing, hidden] = await Promise.all([getAgentsPricing(), getHiddenCatalogueIds()]);
  const hiddenOptionIds = OPTIONS.filter((o) => hidden.has(`sub:opt:${o.id}`)).map((o) => o.id);

  return (
    <Suspense fallback={null}>
      <AbonnementScreen pricing={pricing} initialCycle={initialCycle} hiddenOptionIds={hiddenOptionIds} />
    </Suspense>
  );
}
