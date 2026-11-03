import type { Metadata } from "next";
import Link from "next/link";
import { Subnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { DIGITAL_GROUPS, DIGITAL_OFFERS } from "@/config/digital";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Solutions digitales — AK Universe" },
  description:
    "Sites web, applications mobiles, SEO, fiche Google Business Profile et CRM : les solutions digitales d'AK Universe, sur devis.",
};

const LINKS = [
  { id: "digital", href: "/digital", label: "Toutes les solutions" },
  { id: "sites", href: "/digital#sites", label: "Sites web et applications" },
  { id: "seo", href: "/digital#seo", label: "SEO, Google et CRM" },
  { id: "tarifs", href: "/digital#tarifs", label: "Tarifs" },
];

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="digital" signedIn={!!user} />
      <Subnav label="Digital" links={LINKS} active="digital" />
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

        {DIGITAL_GROUPS.map((group) => (
          <section key={group.id} className="section" id={group.id}>
            <div className="container">
              <h2 className="section-title">
                {group.title} <span className="gold">{group.gold}</span>
              </h2>
              <p className="section-sub">{group.text}</p>
              <div className="agent-tiles">
                {group.services.map((service) => (
                  <Link key={service.name} href="/devis" className="agent-tile">
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
        ))}

        <section className="section" id="tarifs">
          <div className="container">
            <p className="eyebrow">Formules et tarifs</p>
            <h2 className="section-title">
              Un devis <span className="gold">adapté à votre projet</span>
            </h2>
            <div className="agent-categories">
              {DIGITAL_OFFERS.map((offer) => (
                <div key={offer.name} className="dark-card agent-category">
                  <span className="icon-circle">
                    <Icon name={offer.icon} />
                  </span>
                  <h3>{offer.name}</h3>
                  <p>{offer.text}</p>
                  <span className="agent-price">Sur devis</span>
                </div>
              ))}
            </div>
            <div className="agents-cta">
              <Link href="/devis" className="btn btn-primary btn-lg">
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
