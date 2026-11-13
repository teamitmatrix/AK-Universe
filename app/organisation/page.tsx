import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { OrganisationForm } from "@/components/auth/OrganisationForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Créez votre organisation — AK Universe") },
    robots: { index: false },
  };
}

export default function OrganisationPage() {
  return (
    <AuthShell page="organisation" backHref="/verification">
      <OrganisationForm />
    </AuthShell>
  );
}
