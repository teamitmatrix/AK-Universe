import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaChallengeForm } from "@/components/client/AccountClient";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirect } from "@/lib/auth/redirect";
import { mfaPending } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Vérification en deux étapes — AK Universe" } };

/**
 * Second sign-in step for customers who enabled two-factor authentication: the 6-digit code of their
 * authenticator app (checked by Supabase MFA through /api/account/mfa). Until then the client space refuses them.
 */
export default async function MfaVerificationPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const { redirectTo } = await searchParams;
  const target = safeRedirect(redirectTo, "/dashboard");
  if (!(await getCurrentUser())) redirect(`/connexion?redirectTo=${encodeURIComponent(target)}`);
  if (!(await mfaPending())) redirect(target);
  return (
    <div className="cs cs-solo">
      <main className="cs-solo-main">
        <MfaChallengeForm target={target} />
      </main>
    </div>
  );
}
