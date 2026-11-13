import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { PLAN } from "@/config/pricing";
import { PROJECT_STATUS } from "@/config/projects";
import { getCurrentUser } from "@/lib/auth/session";
import { openBillingPortal } from "@/lib/billing/actions";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Mon compte — AK Universe"),
    robots: { index: false, follow: false },
  };
}

const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: "Actif",
  pending: "Paiement en attente",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  incomplete: "Paiement incomplet",
};


export default async function ComptePage({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);
  if (!user) redirect("/connexion?redirectTo=/compte");
  const euros = (cents: number) => `${(cents / 100).toLocaleString(t.locale, { maximumFractionDigits: 2 })} €`;
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(t.locale, { day: "numeric", month: "long", year: "numeric" });
  const { portal } = await searchParams;

  // User-scoped client: RLS only returns this user's rows.
  const supabase = await createClient();
  const [{ data: profile }, { data: membership }, { data: subscription }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, email").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("organizations (name, sector, size)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("cycle, status, monthly_total_cents, current_period_end, stripe_customer_id")
      .eq("user_id", user.id)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("video_projects")
      .select("reference, kind, status, total_cents, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const org = membership?.organizations as unknown as { name: string; sector: string; size: string } | null;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <>
      <SiteHeader active="none" signedIn />
      <main className="section stars account">
        <div className="container account-body">
          <p className="eyebrow">{t("Mon compte")}</p>
          <h1 className="section-title">
            {name ? t("Bonjour {name}", { name }) : t("Bonjour")}
          </h1>

          <div className="account-grid">
            <section className="account-card">
              <h2>
                <Icon name="user" /> {t("Profil")}
              </h2>
              <dl>
                <dt>{t("E-mail")}</dt>
                <dd>{profile?.email ?? user.email}</dd>
                {org && (
                  <>
                    <dt>{t("Organisation")}</dt>
                    <dd>
                      {org.name} — {t.data(org.sector)}, {t.data(org.size)}
                    </dd>
                  </>
                )}
              </dl>
              {!org && (
                <Link href="/organisation" className="btn btn-outline-gold">
                  {t("Créer mon organisation")} <Icon name="arrow" />
                </Link>
              )}
            </section>

            <section className="account-card">
              <h2>
                <Icon name="sparkle" /> {t("Abonnement Agents IA")}
              </h2>
              {subscription ? (
                <>
                  <dl>
                    <dt>{t("Formule")}</dt>
                    <dd>
                      {PLAN.name} — {t(subscription.cycle === "annuel" ? "annuel" : "mensuel")}
                    </dd>
                    <dt>{t("Statut")}</dt>
                    <dd>
                      <span className={`status status-${subscription.status}`}>
                        {SUBSCRIPTION_STATUS[subscription.status] ? t(SUBSCRIPTION_STATUS[subscription.status]) : subscription.status}
                      </span>
                    </dd>
                    <dt>{t("Montant")}</dt>
                    <dd>
                      {euros(subscription.monthly_total_cents)} {t("HT / mois")}
                    </dd>
                    {subscription.current_period_end && (
                      <>
                        <dt>{subscription.status === "canceled" ? t("Fin d'accès") : t("Prochain renouvellement")}</dt>
                        <dd>{date(subscription.current_period_end)}</dd>
                      </>
                    )}
                  </dl>
                  {subscription.stripe_customer_id && (
                    <form action={openBillingPortal}>
                      <button type="submit" className="btn btn-primary">
                        {t("Gérer mon abonnement")} <Icon name="arrow" />
                      </button>
                      <p className="account-hint">{t("Changer de carte, télécharger vos factures ou résilier.")}</p>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <p>{t("Vous n'avez pas encore d'abonnement.")}</p>
                  <Link href="/abonnement" className="btn btn-primary">
                    {t("Choisir mon abonnement")} <Icon name="arrow" />
                  </Link>
                </>
              )}
              {portal === "unavailable" && (
                <p className="account-error" role="alert">
                  {t("La gestion de l'abonnement est momentanément indisponible. Contactez-nous si besoin.")}
                </p>
              )}
            </section>
          </div>

          <section className="account-card">
            <h2>
              <Icon name="video" /> {t("Mes projets vidéo")}
            </h2>
            {projects?.length ? (
              <div className="legal-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t("Référence")}</th>
                      <th>{t("Date")}</th>
                      <th>{t("Type")}</th>
                      <th>{t("Statut")}</th>
                      <th>{t("Total HT")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.reference}>
                        <td>{p.reference}</td>
                        <td>{date(p.created_at)}</td>
                        <td>{p.kind === "acompte" ? t("Réservation") : t("Devis")}</td>
                        <td>{PROJECT_STATUS[p.status] ? t.data(PROJECT_STATUS[p.status]) : p.status}</td>
                        <td>{euros(p.total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                {t("Aucun projet pour le moment.")} <a href="/services">{t("Découvrir nos services vidéo")}</a>
              </p>
            )}
          </section>

          <form action="/auth/signout" method="post" className="account-signout">
            <button type="submit" className="btn btn-outline">
              {t("Se déconnecter")}
            </button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
