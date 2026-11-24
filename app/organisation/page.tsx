import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { OrganisationForm } from "@/components/auth/OrganisationForm";
import { subscriptionResumePath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: { absolute: "Créez votre organisation — AK Universe" },
  robots: { index: false },
};

export default async function OrganisationPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = subscriptionResumePath((await searchParams).next) ?? undefined;
  return (
    <AuthShell page="organisation" backHref="/verification">
      <OrganisationForm next={next} />
    </AuthShell>
  );
}
