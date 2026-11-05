import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Subnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { DIGITAL_SUBNAV, MOBILE_APP } from "@/config/digital";
import { quoteHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Application mobile sur mesure — AK Universe" },
  description: MOBILE_APP.lead,
};

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="digital" signedIn={!!user} />
      <Subnav label="Digital" links={DIGITAL_SUBNAV} active="sites" />
      <main>
        <section className="agent-profile stars digital-app-hero">
          <div className="container agent-profile-hero">
            <div className="agent-profile-copy">
              <p className="agent-profile-crumb">
                <Link href="/digital#sites">Sites web et applications</Link>
                <span aria-hidden="true"> / </span>
                <span>Application mobile</span>
              </p>
              <h1>
                {MOBILE_APP.title} <span className="gold">{MOBILE_APP.titleGold}</span>
              </h1>
              <p className="agent-profile-lead">{MOBILE_APP.lead}</p>
              <Link href={quoteHref("digital:Application mobile")} className="btn btn-primary btn-lg">
                {MOBILE_APP.cta} <Icon name="arrow" />
              </Link>
            </div>
            <div className="agent-profile-visual digital-app-phones">
              <Image
                src={MOBILE_APP.phonesImage}
                alt="Aperçus d'applications : réservation et espace client"
                width={1400}
                height={1050}
                sizes="(max-width: 980px) 100vw, 48vw"
                priority
              />
            </div>
          </div>
        </section>

        <section className="section" id="developper">
          <div className="container">
            <h2 className="section-title">
              Ce que nous pouvons <span className="gold">développer</span>
            </h2>
            <div className="agent-categories digital-app-builds">
              {MOBILE_APP.builds.map((item) => (
                <div key={item.name} className="dark-card agent-category">
                  <span className="icon-circle">
                    <Icon name={item.icon} />
                  </span>
                  <h3>{item.name}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="methode">
          <div className="container">
            <h2 className="section-title">
              Comment nous développons <span className="gold">votre application</span>
            </h2>
            <ol className="digital-app-steps">
              {MOBILE_APP.steps.map((step, index) => (
                <li key={step.name} className="dark-card digital-app-step">
                  <span className="digital-app-step-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="icon-circle">
                    <Icon name={step.icon} />
                  </span>
                  <h3>{step.name}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
            <p className="digital-app-pricing">{MOBILE_APP.pricingNote}</p>
            <div className="agents-cta">
              <Link href={quoteHref("digital:Application mobile")} className="btn btn-primary btn-lg">
                {MOBILE_APP.cta} <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
