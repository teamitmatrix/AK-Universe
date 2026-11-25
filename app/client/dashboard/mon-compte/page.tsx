import type { Metadata } from "next";
import Link from "next/link";
import { AccountBillingCard, NotificationsCard, OtherActionsCard, ProfileBlocks, SecurityCard } from "@/components/client/AccountClient";
import { RefreshOnFocus } from "@/components/client/RefreshOnFocus";
import { Swoosh } from "@/components/client/Swoosh";
import { loadClientAccount } from "@/lib/client/account";
import { COUNTRIES, countryLabel } from "@/lib/client/countries";
import { loadClientSubscription } from "@/lib/client/dashboard";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Mon compte — AK Universe" } };

/** "Mon compte": personal and company details, billing details, security (password, 2FA), notifications, data. */
export default async function AccountPage() {
  const me = await requireClient("/client/dashboard/mon-compte");
  const [account, { plan }] = await Promise.all([loadClientAccount(me), loadClientSubscription(me, { history: false })]);
  const hasSubscription = Boolean(plan && plan.status !== "canceled");

  return (
    <main className="cs-page">
      <RefreshOnFocus />
      <Swoosh className="cs-page-swoosh" id="cs-page" />
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <h1>Mon compte</h1>
        <p>Gérez vos informations personnelles, votre sécurité et vos préférences.</p>
      </header>

      <div className="cs-account">
        <div className="cs-stack">
          <ProfileBlocks
            email={account.email}
            profile={account.profile}
            countries={COUNTRIES}
            countryName={countryLabel(account.profile.country)}
            ready={account.profileReady}
            hasPassword={account.hasPassword}
            pendingEmail={account.pendingEmail}
          />
          <AccountBillingCard billing={account.billing} countries={COUNTRIES} countryName={countryLabel(account.billing.country)} ready={account.billingReady} />
        </div>
        <div className="cs-stack">
          <SecurityCard hasPassword={account.hasPassword} mfaEnabled={account.mfaEnabled} />
          <NotificationsCard key={JSON.stringify(account.prefs)} prefs={account.prefs} ready={account.profileReady} />
          <OtherActionsCard hasPassword={account.hasPassword} hasSubscription={hasSubscription} />
          <section className="cs-card">
            <h2 className="cs-card-title is-sm">Mes accords</h2>
            <p className="cs-card-sub">
              Conditions Générales de Vente et d&apos;Utilisation, Politique de confidentialité et contrat d&apos;abonnement acceptés
              lors de vos paiements.
            </p>
            <Link href="/client/dashboard/accords" className="cs-act">
              Consulter et télécharger
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
