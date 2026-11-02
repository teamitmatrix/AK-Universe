import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { featuredAgents } from "@/config/agents";
import { Icon } from "@/components/ui/Icon";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getCurrentUser } from "@/lib/auth/session";

const benefits = [
  { icon: "bolt", title: "Gagnez du temps", text: "Automatisez les tâches répétitives." },
  { icon: "chart", title: "Augmentez vos revenus", text: "Plus de prospects, plus de clients." },
  { icon: "users", title: "Améliorez l'expérience client", text: "Un support toujours disponible." },
  { icon: "gear", title: "Une solution sur-mesure", text: "Adaptée à votre activité et vos objectifs." },
];

const steps = [
  { icon: "sparkle", title: "Choisissez votre agent", text: "Sélectionnez l'agent adapté à vos besoins." },
  { icon: "gear", title: "Configurez en quelques minutes", text: "Nous vous guidons pas à pas." },
  { icon: "chart", title: "Obtenez des résultats", text: "Vos agents IA travaillent pour vous 24/7." },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="home" signedIn={!!user} />

      <main>
        <section className="hero stars">
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>
                Des agents IA<br />qui travaillent<br />pour <span className="gold">votre<br />entreprise.</span>
              </h1>
              <p className="lead">
                Automatisez vos ventes, votre support et votre marketing avec des agents IA disponibles 24/7.
              </p>
              <div className="cta-row">
                <a href="#agents" className="btn btn-primary btn-lg">
                  Découvrir les agents <Icon name="arrow" />
                </a>
                <Link href="/inscription" className="btn btn-outline btn-lg">
                  Essayer gratuitement
                </Link>
              </div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <Image
                className="hero-character"
                src="/assets/img/hero-man-arms-crossed.png"
                alt=""
                width={1198}
                height={1137}
                sizes="(max-width: 980px) 90vw, 600px"
                priority
              />
              <div className="hero-note">
                <span className="icon-box">
                  <Icon name="chart" />
                </span>
                <span>Des solutions IA concrètes pour des résultats réels</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="agents">
          <div className="container">
            <p className="eyebrow">Nos solutions</p>
            <h2 className="section-title">
              Choisissez <span className="gold">votre agent IA</span>
            </h2>
            <p className="section-sub">Des agents spécialisés pour chaque besoin de votre entreprise.</p>

            <div className="agents-grid">
              {featuredAgents.map((agent) => (
                <Link key={agent.id} href="/inscription" className="agent-card">
                  <div className="media">
                    <div className={`ph ph-m3 ph-card-${agent.id}`} />
                    <span className="icon-box card-icon">
                      <Icon name={agent.icon} />
                    </span>
                  </div>
                  <div className="body">
                    <h3>{agent.name}</h3>
                    <p className="agent-desc">{agent.description}</p>
                    <span className="btn btn-outline-gold">
                      Découvrir <Icon name="arrow" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <p className="eyebrow">Pourquoi AK Universe</p>
            <h2 className="section-title">
              Des agents IA conçus pour des <span className="gold">résultats concrets.</span>
            </h2>
            <div className="home-benefits">
              {benefits.map((b) => (
                <div key={b.title} className="home-benefit">
                  <span className="icon-circle">
                    <Icon name={b.icon} />
                  </span>
                  <div>
                    <strong>{b.title}</strong>
                    <span>{b.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <p className="eyebrow">Comment ça marche ?</p>
            <h2 className="section-title">
              Une mise en place <span className="gold">simple et rapide.</span>
            </h2>
            <div className="home-steps">
              {steps.map((step, i) => (
                <Fragment key={step.title}>
                  {i > 0 && (
                    <span className="home-step-arrow" aria-hidden="true">
                      <Icon name="arrow" />
                    </span>
                  )}
                  <div className="home-step">
                    <div className="home-step-top">
                      <span className="home-step-n">{i + 1}</span>
                      <span className="icon-circle">
                        <Icon name={step.icon} />
                      </span>
                    </div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <section className="home-cta">
          <div className="container home-cta-inner">
            <div>
              <p className="eyebrow">Prêt à passer à l&apos;action ?</p>
              <h2 className="section-title">
                Testez gratuitement <span className="gold">nos agents IA.</span>
              </h2>
              <p className="section-sub">
                Découvrez comment ils peuvent transformer votre entreprise dès aujourd&apos;hui.
              </p>
            </div>
            <div className="cta-row home-cta-actions">
              <Link href="/inscription" className="btn btn-primary btn-lg">
                Essayer gratuitement <Icon name="arrow" />
              </Link>
              <a href="#agents" className="btn btn-outline btn-lg">
                Découvrir tous les agents
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
