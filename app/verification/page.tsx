import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OtpForm } from "@/components/auth/OtpForm";
import { getPendingLogin } from "@/lib/auth/two-factor";

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
  // The address lives in the httpOnly pending-login cookie, not the URL,
  // so the dev request log does not print it.
  const pending = await getPendingLogin();
  return (
    <AuthShell page="verification" backHref={login ? "/connexion" : undefined}>
      <Suspense>
        <OtpForm email={pending?.email ?? ""} />
      </Suspense>
    </AuthShell>
  );
}
