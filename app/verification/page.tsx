import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpForm } from "@/components/auth/OtpForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Vérifiez vos e-mails — AK Universe") },
    robots: { index: false },
  };
}

export default async function VerificationPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  // step=login: two-factor code after the password, so "back" returns to the sign-in page.
  const login = (await searchParams).step === "login";
  return (
    <AuthShell page="verification" backHref={login ? "/connexion" : undefined}>
      <Suspense>
        <OtpForm />
      </Suspense>
    </AuthShell>
  );
}
