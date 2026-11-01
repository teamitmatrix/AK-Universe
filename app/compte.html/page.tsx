import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Mon compte — AK Universe",
  robots: { index: false, follow: false },
};

const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: "Actif",
  pending: "Paiement en attente",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  incomplete: "Paiement incomplet",
};

const euros = (cents: number) => `${(cents / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function ComptePage({ searchParams }: { searchParams: Promise<{ portal?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion.html?redirectTo=/compte.html");
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
          <p className="eyebrow">Mon compte</p>
          <h1 className="section-title">
            Bonjour{name ? <> {name}</> : null}
          </h1>

          <div className="account-grid">
            <section className="account-card">
              <h2>
                <Icon name="user" /> Profil
              </h2>
              <dl>
                <dt>E-mail</dt>
                <dd>{profile?.email ?? user.email}</dd>
                {org && (
                  <>
                    <dt>Organisation</dt>
                    <dd>
                      {org.name} — {org.sector}, {org.size}
                    </dd>
                  </>
                )}
              </dl>
              {!org && (
                <Link href="/organisation.html" className="btn btn-outline-gold">
                  Créer mon organisation <Icon name="arrow" />
                </Link>
              )}
            </section>

            <section className="account-card">
              <h2>
                <Icon name="sparkle" /> Abonnement Agents IA
              </h2>
              {subscription ? (
                <>
                  <dl>
                    <dt>Formule</dt>
                    <dd>
                      {PLAN.name} — {subscription.cycle}
                    </dd>
                    <dt>Statut</dt>
                    <dd>
                      <span className={`status status-${subscription.status}`}>
                        {SUBSCRIPTION_STATUS[subscription.status] ?? subscription.status}
                      </span>
                    </dd>
                    <dt>Montant</dt>
                    <dd className="notranslate">{euros(subscription.monthly_total_cents)} HT / mois</dd>
                    {subscription.current_period_end && (
                      <>
                        <dt>{subscription.status === "canceled" ? "Fin d'accès" : "Prochain renouvellement"}</dt>
                        <dd>{date(subscription.current_period_end)}</dd>
                      </>
                    )}
                  </dl>
                  {subscription.stripe_customer_id && (
                    <form action={openBillingPortal}>
                      <button type="submit" className="btn btn-primary">
                        Gérer mon abonnement <Icon name="arrow" />
                      </button>
                      <p className="account-hint">Changer de carte, télécharger vos factures ou résilier.</p>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <p>Vous n&apos;avez pas encore d&apos;abonnement.</p>
                  <Link href="/abonnement.html" className="btn btn-primary">
                    Choisir mon abonnement <Icon name="arrow" />
                  </Link>
                </>
              )}
              {portal === "unavailable" && (
                <p className="account-error" role="alert">
                  La gestion de l&apos;abonnement est momentanément indisponible. Contactez-nous si besoin.
                </p>
              )}
            </section>
          </div>

          <section className="account-card">
            <h2>
              <Icon name="video" /> Mes projets vidéo
            </h2>
            {projects?.length ? (
              <div className="legal-table">
                <table>
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.reference}>
                        <td className="notranslate">{p.reference}</td>
                        <td>{date(p.created_at)}</td>
                        <td>{p.kind === "acompte" ? "Réservation" : "Devis"}</td>
                        <td>{PROJECT_STATUS[p.status] ?? p.status}</td>
                        <td className="notranslate">{euros(p.total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                Aucun projet pour le moment. <a href="/services.html">Découvrir nos services vidéo</a>
              </p>
            )}
          </section>

          <form action="/auth/signout" method="post" className="account-signout">
            <button type="submit" className="btn btn-outline">
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
