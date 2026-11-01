import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: { absolute: "Créer votre compte — AK Universe" },
};

export default function SignupPage() {
  return (
    <AuthShell page="signup">
      <SignupForm />
    </AuthShell>
  );
}
