import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "À propos — AK Universe" },
  description: "Présentation d'AK Universe.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="about" signedIn={!!user} />
      <main>
        <section className="pricing stars agents-hero">
          <div className="container pricing-head">
            <p className="eyebrow eyebrow-lines">AK Universe</p>
            <h1>
              À <span className="gold">propos</span>
            </h1>
            <p>Cette page présentera AK Universe. Le contenu sera ajouté prochainement.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
