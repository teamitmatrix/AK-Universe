"use client";

import Link from "next/link";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { HomeLabel } from "@/components/ui/LangSwitch";
import { serviceOf } from "./cart";
import { useVideo } from "./context";
import { Examples } from "./Examples";
import { Mockup } from "./Mockup";
import { VideoPlayer } from "./VideoPlayer";

export function ServiceView({ slug }: { slug: string }) {
  const { config, openConfig } = useVideo();
  const service = serviceOf(config, slug);

  if (!service) {
    return (
      <main id="service-root">
        <div className="container empty-state">
          <h1>Service introuvable</h1>
          <Link className="btn btn-primary" href="/services">
            Voir tous les services
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="service-root">
      <section className="svc-hero stars">
        <div className="container svc-hero-grid">
          <div className="svc-copy">
            <Link href="/marketing" className="back-link">
              <Icon name="arrow-left" /> Retour
            </Link>
            <nav className="crumbs" aria-label="Fil d'Ariane">
              <Link href="/marketing">
                <HomeLabel />
              </Link>
              <Icon name="chev-right" />
              <Link href="/services">Services</Link>
              <Icon name="chev-right" />
              <span aria-current="page">{service.name}</span>
            </nav>
            <h1 className="svc-title">
              {service.titleTop || "Vidéo"}
              <br />
              <span className="gold">{service.gold}</span>
            </h1>
            <p className="svc-lead">{service.description}</p>
            <ul className="benefits">
              {(service.benefits ?? []).map(([icon, text]) => (
                <li key={text}>
                  <span className="benefit-ic">
                    <Icon name={icon} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <div className="cta-row">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => openConfig(service.slug)}>
                <Icon name="plus" /> Ajouter à mon projet
              </button>
              <button type="button" className="btn btn-outline-gold btn-lg" onClick={() => openConfig(service.slug, { mode: "quote" })}>
                Demander un devis
              </button>
            </div>
          </div>
          <VideoPlayer
            src={`/assets/video/${service.slug}.mp4`}
            duration={service.duration || "0:00"}
            playClassName="svc-play"
            poster={<Mockup mockup={service.mockup} region="poster" className="svc-poster" />}
          />
        </div>
      </section>

      {!!config.clients?.length && (
        <section className="clients" aria-label="Ils nous font confiance">
          <div className="container clients-row">
            <span className="clients-title">Ils nous font confiance</span>
            {config.clients.map((client) => (
              <span key={client} className="client">
                {client}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="container svc-included">
        <Mockup mockup={service.mockup} region="side" className="svc-side" />
        <div className="included-copy">
          <h2>
            {service.includesTitle?.[0]} <span className="gold">{service.includesTitle?.[1]}</span>
          </h2>
          <p>{service.includesText}</p>
          <ul className="gold-checks">
            {(service.includes ?? []).map((line) => (
              <li key={line}>
                <Icon name="check-circle" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <aside className="price-card">
          <span className="from">À partir de</span>
          <div className="price-line">
            <strong>{euro(service.price)}</strong> <span>{service.unit}</span>
          </div>
          <p className="price-note">{service.priceNote} Prix indicatif selon les besoins du projet.</p>
          <ul className="gold-checks small">
            {(service.priceList ?? []).map((line) => (
              <li key={line}>
                <Icon name="check-circle" />
                {line}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary btn-block" onClick={() => openConfig(service.slug)}>
            Ajouter à mon projet <Icon name="arrow" />
          </button>
          <button type="button" className="btn btn-outline-gold btn-block" onClick={() => openConfig(service.slug, { mode: "quote" })}>
            Demander un devis
          </button>
        </aside>
      </section>

      <section className="container svc-examples" id="realisations">
        <div className="examples-head">
          <h2>
            Nos réalisations <span className="gold">{service.realisations}</span>
          </h2>
          <Link href="/marketing/realisations" className="link-gold">
            Voir toutes les réalisations <Icon name="arrow" />
          </Link>
        </div>
        <Examples service={service} className="examples-grid" onAdd={() => openConfig(service.slug)} />
      </section>
    </main>
  );
}
