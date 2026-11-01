import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { OrganisationForm } from "@/components/auth/OrganisationForm";

export const metadata: Metadata = {
  title: { absolute: "Créez votre organisation — AK Universe" },
  robots: { index: false },
};

export default function OrganisationPage() {
  return (
    <AuthShell page="organisation" backHref="/verification.html">
      <OrganisationForm />
    </AuthShell>
  );
}
