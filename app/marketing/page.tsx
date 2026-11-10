import type { Metadata } from "next";
import Link from "next/link";
import { MarketingSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { MarketingPacks } from "@/components/video/MarketingPacks";
import { MarketingServiceTiles } from "@/components/video/MarketingServiceTiles";
import { VideoShell } from "@/components/video/VideoShell";
import { CHATBOT_FAQ } from "@/config/chatbot-faq";
import { contactHref, quoteHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Marketing — AK Universe" },
  description:
    "Découvrez nos services marketing : vidéos et contenus conçus pour mettre en valeur votre entreprise.",
};

const FAQ = CHATBOT_FAQ.filter(
  (topic) => topic.topic.startsWith("Vidéo") || topic.topic.startsWith("Forfaits Marketing"),
).flatMap((topic) => topic.entries);

export default async function Page() {
  const [user, config] = await Promise.all([getCurrentUser(), getVideoConfig()]);

  return (
    <>
      <SiteHeader active="marketing" signedIn={!!user} />
      <MarketingSubnav active="tous" />
      <VideoShell config={config} bare>
        <main>
          <section className="pricing stars agents-hero" id="marketing">
            <div className="container pricing-head">
              <p className="eyebrow eyebrow-lines">Nos services marketing</p>
              <h1>
                Découvrez nos <span className="gold">services marketing</span>
              </h1>
              <p>Des vidéos et des contenus conçus pour mettre en valeur votre entreprise.</p>
            </div>
          </section>

          <section className="section agents-catalog" id="tous">
            <div className="container">
              <p className="eyebrow">Tous les services</p>
              <h2 className="section-title">
                Choisissez <span className="gold">votre service</span>
              </h2>
              <MarketingServiceTiles />
            </div>
          </section>

          <MarketingPacks config={config} />

          <section className="section" id="realisations">
            <div className="container">
              <p className="eyebrow">Réalisations</p>
              <h2 className="section-title">
                Nos <span className="gold">projets</span>
              </h2>
              <p className="section-sub">
                Une sélection de projets à visionner sur le site — Instagram reste un complément, pas le seul accès au
                travail.
              </p>
              <div className="agents-cta">
                <Link href="/marketing/realisations" className="btn btn-outline-gold btn-lg">
                  Voir les réalisations <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </section>

          <section className="section" id="devis">
            <div className="container">
              <p className="eyebrow">Devis</p>
              <h2 className="section-title">
                Parlons de <span className="gold">votre projet</span>
              </h2>
              <p className="section-sub">
                Demandez un devis gratuit, ou composez votre projet vidéo service par service.
              </p>
              <div className="cta-row" style={{ justifyContent: "center" }}>
                <Link href={contactHref("Demande de devis")} className="btn btn-primary btn-lg">
                  Demander un devis <Icon name="arrow" />
                </Link>
                <Link href="/services" className="btn btn-outline btn-lg">
                  Composer mon projet
                </Link>
                <Link href="/marketing/forfaits" className="btn btn-outline-gold btn-lg">
                  Voir les forfaits
                </Link>
              </div>
            </div>
          </section>

          <section className="section" id="faq">
            <div className="container agents-faq">
              <p className="eyebrow">FAQ</p>
              <h2 className="section-title">
                Questions <span className="gold">fréquentes</span>
              </h2>
              {FAQ.map((entry) => (
                <details key={entry.q} className="dark-card">
                  <summary>
                    {entry.q} <Icon name="chev-down" className="chev" />
                  </summary>
                  <p>{entry.a}</p>
                </details>
              ))}
              <div className="agents-cta">
                <Link href={quoteHref()} className="btn btn-primary btn-lg">
                  Une autre question ? Écrivez-nous <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </VideoShell>
      <SiteFooter />
    </>
  );
}
