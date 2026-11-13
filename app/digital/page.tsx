import type { Metadata } from "next";
import Link from "next/link";
import { Subnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { DIGITAL_GROUPS, DIGITAL_OFFERS, DIGITAL_SUBNAV, DIGITAL_WEBSITES } from "@/config/digital";
import { quoteHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";
import { localized } from "@/i18n/data";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Solutions digitales — AK Universe") },
    description: t(
      "Sites web, applications mobiles, SEO, fiche Google Business Profile et CRM : les solutions digitales d'AK Universe.",
    ),
  };
}

export default async function Page() {
  const [user, t, data] = await Promise.all([
    getCurrentUser(),
    getT(),
    localized({ groups: DIGITAL_GROUPS, offers: DIGITAL_OFFERS, websites: DIGITAL_WEBSITES }),
  ]);
  const euros = (n: number) => `${n.toLocaleString(t.locale)} €`;
  const sites = data.groups.find((group) => group.id === "sites");
  const seo = data.groups.find((group) => group.id === "seo");
  /** Quote links keep the French service name: it is the id the contact form expects. */
  const frName = (group: "sites" | "seo", index: number) =>
    DIGITAL_GROUPS.find((g) => g.id === group)!.services[index].name;

  return (
    <>
      <SiteHeader active="digital" signedIn={!!user} />
      <Subnav label="Digital" links={DIGITAL_SUBNAV} active="digital" />
      <main>
        <section className="pricing stars agents-hero">
          <div className="container pricing-head">
            <p className="eyebrow eyebrow-lines">{t("Digital")}</p>
            <h1>{t.rich("Toutes nos <gold>solutions digitales</gold>")}</h1>
            <p>{t("Sites web, applications, référencement et CRM : tout pour développer votre activité en ligne.")}</p>
          </div>
        </section>

        <section className="section" id="sites">
          <div className="container">
            <h2 className="section-title">
              {t.rich("Sites internet <gold>& e-commerce</gold>")}
            </h2>
            <p className="section-sub">
              {sites?.text ??
                t("Des sites professionnels, rapides et pensés pour convertir vos visiteurs en clients.")}
            </p>
            <div className="agent-tiles digital-website-tiles">
              {data.websites.map((site) => (
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
                        {t.rich("Frais de fonctionnement<br/>À partir de {amount} / mois", {}, {
                          amount: euros(site.runningFrom),
                        })}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {sites ? (
              <>
                <h3 className="digital-apps-title">
                  {t.rich("Applications et <gold>développement</gold>")}
                </h3>
                <div className="agent-tiles">
                  {sites.services.map((service, index) => {
                    const href = service.href ?? quoteHref(`digital:${frName("sites", index)}`);
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
                          {service.href ? t("Découvrir") : t("Demander un devis")} <Icon name="arrow" />
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
                {seo.services.map((service, index) => (
                  <Link
                    key={service.name}
                    href={quoteHref(`digital:${frName("seo", index)}`)}
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
                      {t("Demander un devis")} <Icon name="arrow" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="section" id="tarifs">
          <div className="container">
            <p className="eyebrow">{t("Formules et tarifs")}</p>
            <h2 className="section-title">
              {t.rich("Des tarifs <gold>clairs</gold>")}
            </h2>
            <div className="agent-categories">
              {data.offers.map((offer) => (
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
                {t("Demander un devis gratuit")} <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
