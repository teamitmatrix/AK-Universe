import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Réinitialiser le mot de passe — AK Universe") },
    robots: { index: false },
  };
}

export default function ResetPasswordPage() {
  return (
    <AuthShell page="reset">
      <ResetPasswordForm />
    </AuthShell>
  );
}
