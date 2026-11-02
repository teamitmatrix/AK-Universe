import type { Metadata } from "next";
import { AbonnementScreen } from "@/components/billing/AbonnementScreen";

export const metadata: Metadata = {
  title: { absolute: "Personnalisez votre abonnement — AK Universe" },
  robots: { index: false },
};

export default function AbonnementPage() {
  return <AbonnementScreen />;
}
