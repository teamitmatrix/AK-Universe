import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getCurrentUser } from "@/lib/auth/session";

const pillars = [
  {
    id: "agents",
    number: "01",
    title: "Agents IA",
    description:
      "Automatisez vos appels, vos messages WhatsApp et les demandes courantes de vos clients.",
    href: "/agents-ia",
    cta: "Découvrir les agents IA",
    image: "/assets/img/home-service-agents.png",
    imageAlt: "Portrait d’un agent IA AK Universe",
  },
  {
    id: "marketing",
    number: "02",
    title: "Marketing",
    description:
      "Présentez votre offre avec des vidéos, des contenus pour les réseaux sociaux et des campagnes publicitaires.",
    href: "/marketing",
    cta: "Découvrir le marketing",
    image: "/assets/img/home-service-marketing.png",
    imageAlt: "Tournage et production de contenus marketing",
  },
  {
    id: "digital",
    number: "03",
    title: "Digital",
    description:
      "Créez un site vitrine, une boutique en ligne ou une application mobile sur mesure.",
    href: "/digital",
    cta: "Découvrir le digital",
    image: "/assets/img/home-service-digital.png",
    imageAlt: "Illustration site web, application et SaaS",
  },
] as const;

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="home" signedIn={!!user} />

      <main>
        <section className="home-hero stars">
          <div className="container home-hero-inner">
            <h1>Agents IA, Marketing et Digital</h1>
            <p className="home-hero-lead">
              Automatisez vos échanges, faites connaître votre activité et créez les outils dont
              votre entreprise a besoin.
            </p>
            <Link href="/contact" className="btn btn-primary btn-lg">
              Parlons de votre projet
            </Link>

            <div className="home-pillars">
              {pillars.map((pillar) => (
                <article key={pillar.id} className="home-pillar">
                  <div className="home-pillar-media">
                    <Image
                      src={pillar.image}
                      alt={pillar.imageAlt}
                      width={876}
                      height={312}
                      sizes="(max-width: 900px) 100vw, 33vw"
                      priority={pillar.id === "agents"}
                    />
                  </div>
                  <p className="home-pillar-n">{pillar.number}</p>
                  <h2>{pillar.title}</h2>
                  <p className="home-pillar-desc">{pillar.description}</p>
                  <Link href={pillar.href} className="btn btn-outline-gold">
                    {pillar.cta} <Icon name="arrow" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
