import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("À propos — AK Universe") },
    description: t("Présentation d'AK Universe."),
    robots: { index: false, follow: false },
  };
}

export default async function Page() {
  const [user, t] = await Promise.all([getCurrentUser(), getT()]);

  return (
    <>
      <SiteHeader active="about" signedIn={!!user} />
      <main>
        <section className="pricing stars agents-hero">
          <div className="container pricing-head">
            <p className="eyebrow eyebrow-lines">AK Universe</p>
            <h1>{t.rich("À <gold>propos</gold>")}</h1>
            <p>{t("Cette page présentera AK Universe. Le contenu sera ajouté prochainement.")}</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
