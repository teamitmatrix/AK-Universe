import type { Metadata } from "next";
import Link from "next/link";
import { Subnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DigitalQuoteCards } from "@/components/digital/DigitalQuoteCards";
import { DigitalWebsiteCards } from "@/components/digital/DigitalWebsiteCards";
import { Icon } from "@/components/ui/Icon";
import { DIGITAL_GROUPS, DIGITAL_OFFERS, DIGITAL_SUBNAV } from "@/config/digital";
import { quoteHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";
import { getVideoConfig } from "@/lib/video-config";

export const metadata: Metadata = {
  title: { absolute: "Solutions digitales — AK Universe" },
  description:
    "Sites web, applications mobiles, référencement naturel, fiche Google Business Profile et CRM : les solutions digitales d'AK Universe.",
};

export default async function Page() {
  const [user, config] = await Promise.all([getCurrentUser(), getVideoConfig()]);
  const sites = DIGITAL_GROUPS.find((group) => group.id === "sites");
  const seo = DIGITAL_GROUPS.find((group) => group.id === "seo");

  return (
    <>
      <SiteHeader active="digital" signedIn={!!user} />
      <Subnav label="Digital" links={DIGITAL_SUBNAV} active="digital" />
      <main>
        <section className="pricing stars agents-hero">
          <div className="container pricing-head">
            <p className="eyebrow eyebrow-lines">Digital</p>
            <h1>
              Toutes nos <span className="gold">solutions digitales</span>
            </h1>
            <p>Sites web, applications, référencement et CRM : tout pour développer votre activité en ligne.</p>
          </div>
        </section>

        <section className="section" id="sites">
          <div className="container">
            <h2 className="section-title">
              Sites internet <span className="gold">&amp; e-commerce</span>
            </h2>
            <p className="section-sub">
              {sites?.text ??
                "Des sites professionnels, rapides et pensés pour convertir vos visiteurs en clients."}
            </p>
            <DigitalWebsiteCards config={config} />

            {sites ? (
              <div id="applications" className="digital-apps-block">
                <h3 className="digital-apps-title">
                  Applications et <span className="gold">développement</span>
                </h3>
                <DigitalQuoteCards services={sites.services} layout="pair" />
              </div>
            ) : null}
          </div>
        </section>

        {seo ? (
          <section className="section" id="seo">
            <div className="container">
              <h2 className="section-title">
                {seo.title} <span className="gold">{seo.gold}</span>
              </h2>
              <p className="section-sub">{seo.text}</p>
              <DigitalQuoteCards services={seo.services} />
            </div>
          </section>
        ) : null}

        <section className="section" id="tarifs">
          <div className="container">
            <p className="eyebrow">Formules et tarifs</p>
            <h2 className="section-title">
              Des tarifs <span className="gold">clairs</span>
            </h2>
            <div className="agent-categories">
              {DIGITAL_OFFERS.map((offer) => (
                <div key={offer.name} className="dark-card agent-category">
                  <span className="icon-circle">
                    <Icon name={offer.icon} />
                  </span>
                  <h3>{offer.name}</h3>
                  <p>{offer.text}</p>
                </div>
              ))}
            </div>
            <div className="agents-cta">
              <Link href={quoteHref()} className="btn btn-primary btn-lg">
                Demander un devis gratuit <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
