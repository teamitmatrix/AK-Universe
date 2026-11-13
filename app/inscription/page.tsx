import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Créer votre compte — AK Universe") },
  };
}

export default function SignupPage() {
  return (
    <AuthShell page="signup">
      <SignupForm />
    </AuthShell>
  );
}
