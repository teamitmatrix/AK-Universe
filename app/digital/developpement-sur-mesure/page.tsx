import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Subnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { CUSTOM_DEV, DIGITAL_SUBNAV } from "@/config/digital";
import { quoteHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Développement sur mesure — AK Universe" },
  description: CUSTOM_DEV.lead,
};

const quote = quoteHref("digital:developpement-sur-mesure");

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
                <Link href="/digital#applications">Applications et développement</Link>
                <span aria-hidden="true"> / </span>
                <span>Développement sur mesure</span>
              </p>
              <h1>
                {CUSTOM_DEV.title} <span className="gold">{CUSTOM_DEV.titleGold}</span>
              </h1>
              <p className="agent-profile-lead">{CUSTOM_DEV.lead}</p>
              <Link href={quote} className="btn btn-primary btn-lg">
                {CUSTOM_DEV.cta} <Icon name="arrow" />
              </Link>
            </div>
            <div className="agent-profile-visual">
              <Image
                src={CUSTOM_DEV.heroImage}
                alt="Tableau de bord métier sur mesure"
                width={1400}
                height={900}
                sizes="(max-width: 980px) 100vw, 48vw"
                priority
              />
            </div>
          </div>
        </section>

        <section className="section" id="developper">
          <div className="container">
            <h2 className="section-title">
              Ce que nous pouvons <span className="gold">construire</span>
            </h2>
            <div className="agent-categories digital-app-builds">
              {CUSTOM_DEV.builds.map((item) => (
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
              Comment nous menons <span className="gold">votre projet</span>
            </h2>
            <ol className="digital-app-steps">
              {CUSTOM_DEV.steps.map((step, index) => (
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
            <p className="digital-app-pricing">{CUSTOM_DEV.pricingNote}</p>
            <div className="agents-cta">
              <Link href={quote} className="btn btn-primary btn-lg">
                {CUSTOM_DEV.cta} <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
