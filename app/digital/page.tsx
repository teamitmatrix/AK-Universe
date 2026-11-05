import type { Metadata } from "next";
import Link from "next/link";
import { Subnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { DIGITAL_GROUPS, DIGITAL_OFFERS, DIGITAL_SUBNAV, DIGITAL_WEBSITES } from "@/config/digital";
import { quoteHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Solutions digitales — AK Universe" },
  description:
    "Sites web, applications mobiles, SEO, fiche Google Business Profile et CRM : les solutions digitales d'AK Universe.",
};

const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;

export default async function Page() {
  const user = await getCurrentUser();
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
            <div className="agent-tiles digital-website-tiles">
              {DIGITAL_WEBSITES.map((site) => (
                <article key={site.id} className="agent-tile marketing-tile digital-website-card">
                  <span className="agent-tile-top">
                    <span className="icon-box">
                      <Icon name={site.icon} />
                    </span>
                  </span>
                  <strong>{site.name}</strong>
                  <ul className="feature-list digital-points">
                    {site.points.map((point) => (
                      <li key={point}>
                        <Icon name="check-circle" /> {point}
                      </li>
                    ))}
                  </ul>
                  <div className="digital-website-price">
                    <span className="digital-setup-price">{euros(site.price)}</span>
                    {site.runningFrom !== null ? (
                      <span className="digital-running">
                        Frais de fonctionnement
                        <br />
                        À partir de {euros(site.runningFrom)} / mois
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {sites ? (
              <>
                <h3 className="digital-apps-title">
                  Applications et <span className="gold">développement</span>
                </h3>
                <div className="agent-tiles">
                  {sites.services.map((service) => {
                    const href = service.href ?? quoteHref(`digital:${service.name}`);
                    return (
                      <Link
                        key={service.name}
                        href={href}
                        className="agent-tile marketing-tile digital-service-card"
                      >
                        <span className="agent-tile-top">
                          <span className="icon-box">
                            <Icon name={service.icon} />
                          </span>
                        </span>
                        <strong>{service.name}</strong>
                        <span className="agent-tile-text">{service.text}</span>
                        <ul className="feature-list digital-points">
                          {service.points.map((point) => (
                            <li key={point}>
                              <Icon name="check-circle" /> {point}
                            </li>
                          ))}
                        </ul>
                        <span className="agent-tile-cta">
                          {service.href ? "Découvrir" : "Demander un devis"} <Icon name="arrow" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </>
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
              <div className="agent-tiles">
                {seo.services.map((service) => (
                  <Link
                    key={service.name}
                    href={quoteHref(`digital:${service.name}`)}
                    className="agent-tile marketing-tile digital-service-card"
                  >
                    <span className="agent-tile-top">
                      <span className="icon-box">
                        <Icon name={service.icon} />
                      </span>
                    </span>
                    <strong>{service.name}</strong>
                    <span className="agent-tile-text">{service.text}</span>
                    <ul className="feature-list digital-points">
                      {service.points.map((point) => (
                        <li key={point}>
                          <Icon name="check-circle" /> {point}
                        </li>
                      ))}
                    </ul>
                    <span className="agent-tile-cta">
                      Demander un devis <Icon name="arrow" />
                    </span>
                  </Link>
                ))}
              </div>
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
