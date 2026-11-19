import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { COMPANY } from "@/config/company";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "À propos — AK Universe" },
  description:
    "AK UNIVERSE accompagne les entreprises, les entrepreneurs et les professionnels avec des solutions en intelligence artificielle, marketing et digital.",
};

const EXPERTISES = [
  {
    title: "Intelligence artificielle",
    text: "Automatisez votre activité et gagnez en efficacité.",
    items: [
      "Agents IA et assistants virtuels",
      "Standards téléphoniques intelligents",
      "Chatbots et automatisations WhatsApp",
      "CRM et automatisation des processus",
    ],
  },
  {
    title: "Marketing",
    text: "Développez votre visibilité et valorisez votre image.",
    items: [
      "Stratégie marketing et communication",
      "Gestion des réseaux sociaux",
      "Création de contenus photo et vidéo",
      "Campagnes publicitaires et acquisition de clients",
    ],
  },
  {
    title: "Digital",
    text: "Construisez une présence digitale performante.",
    items: [
      "Création de sites internet",
      "Développement de solutions digitales",
      "Optimisation de votre présence en ligne",
      "Solutions numériques adaptées à votre entreprise",
    ],
  },
] as const;

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="about" signedIn={!!user} />
      <main>
        <section className="pricing stars about-hero">
          <div className="container about-prose">
            <p className="eyebrow eyebrow-lines">AK Universe</p>
            <h1>
              À propos d&apos;<span className="gold">AK UNIVERSE</span>
            </h1>
            <p className="about-kicker">L&apos;innovation au service de votre croissance.</p>
            <p>
              AK UNIVERSE accompagne les entreprises, les entrepreneurs et les professionnels dans leur
              développement grâce à des solutions innovantes en intelligence artificielle, marketing et digital.
            </p>
            <p>
              Notre ambition est simple : rendre les technologies et les stratégies de croissance accessibles,
              efficaces et adaptées aux besoins de chaque activité.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container about-prose">
            <p className="eyebrow">Qui sommes-nous ?</p>
            <h2 className="about-statement">
              AK UNIVERSE, votre partenaire en innovation et développement.
            </h2>
            <p>
              AK UNIVERSE est une entreprise spécialisée dans la création de solutions destinées à simplifier,
              automatiser et accélérer le développement des entreprises.
            </p>
            <p>
              Nous réunissons trois expertises complémentaires : l&apos;intelligence artificielle, le marketing et le
              digital.
            </p>
            <p>
              De la conception d&apos;une stratégie à sa mise en œuvre, nous proposons un accompagnement personnalisé
              et des solutions adaptées aux objectifs de nos clients.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <p className="eyebrow">Expertises</p>
            <h2 className="section-title about-title">Nos expertises</h2>
            <div className="about-grid">
              {EXPERTISES.map((expertise) => (
                <article key={expertise.title} className="about-card">
                  <h3>{expertise.title}</h3>
                  <p>{expertise.text}</p>
                  <ul className="feature-list">
                    {expertise.items.map((item) => (
                      <li key={item}>
                        <Icon name="check" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container about-duo">
            <article className="about-card">
              <p className="eyebrow">Notre mission</p>
              <h2>Simplifier la technologie. Accélérer votre croissance.</h2>
              <p>
                Notre mission est d&apos;accompagner chaque entreprise dans sa transformation et son développement, en
                combinant innovation, créativité et performance.
              </p>
              <p>Nous privilégions des solutions pratiques, évolutives et adaptées aux réalités de chaque activité.</p>
            </article>
            <article className="about-card">
              <p className="eyebrow">Notre engagement</p>
              <h2>Chez AK UNIVERSE, chaque projet est unique.</h2>
              <p>
                Nous plaçons l&apos;écoute, la transparence, la qualité et l&apos;innovation au cœur de notre approche,
                avec un objectif : construire des collaborations durables et contribuer au développement de nos
                clients.
              </p>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta-box about-cta">
              <h2>Construisons votre avenir ensemble</h2>
              <p>
                Vous souhaitez développer votre visibilité, moderniser votre activité ou intégrer l&apos;intelligence
                artificielle dans votre entreprise ?
              </p>
              <p className="about-kicker">AK UNIVERSE vous accompagne dans vos projets.</p>
              <div className="about-cta-actions">
                <Link href="/contact" className="btn btn-primary btn-lg">
                  Contactez-nous pour échanger sur vos besoins. <Icon name="arrow" />
                </Link>
              </div>
              <p className="about-contacts">
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
                  www.akuniverse.com
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
