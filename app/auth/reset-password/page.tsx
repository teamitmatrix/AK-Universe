import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: { absolute: "Réinitialiser le mot de passe — AK Universe" },
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell page="reset">
      <ResetPasswordForm />
    </AuthShell>
  );
}
