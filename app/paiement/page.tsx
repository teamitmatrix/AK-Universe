import type { Metadata } from "next";
import { sanitizeSelection } from "@/config/pricing";
import { PaiementScreen, PaiementSuccess } from "@/components/billing/PaiementScreen";
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

  const user = await getCurrentUser();
  const selection = sanitizeSelection({
    cycle: one(params.cycle) as "mensuel" | "annuel",
    users: Number(one(params.users)),
    options: one(params.options).split(","),
  });

  return <PaiementScreen selection={selection} email={user?.email ?? ""} />;
}
