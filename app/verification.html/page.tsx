import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpForm } from "@/components/auth/OtpForm";

export const metadata: Metadata = {
  title: { absolute: "Vérifiez vos e-mails — AK Universe" },
  robots: { index: false },
};

export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  // step=login: two-factor code after the password, so "back" returns to the sign-in page.
  const login = (await searchParams).step === "login";
  return (
    <AuthShell page="verification" backHref={login ? "/connexion.html" : undefined}>
      <Suspense>
        <OtpForm />
      </Suspense>
    </AuthShell>
  );
}
