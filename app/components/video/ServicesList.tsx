"use client";

import Link from "next/link";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { useVideo } from "./context";
import { Mockup } from "./Mockup";

export function ServicesList() {
  const { config, openConfig } = useVideo();

  return (
    <main id="realisations">
      <section className="page-hero stars" style={{ position: "relative" }}>
        <div className="container">
          <Link href="/marketing" className="back-link">
            <Icon name="arrow-left" /> Retour
          </Link>
          <p className="eyebrow">Services vidéo</p>
          <h1>
            Composez votre <span className="gold">projet vidéo</span>
          </h1>
          <p>Choisissez un ou plusieurs services, personnalisez-les, puis demandez un devis ou réservez avec un acompte.</p>
          <ol className="how">
            <li>Choisissez vos services</li>
            <li>Personnalisez les options</li>
            <li>Devis ou acompte</li>
          </ol>
        </div>
      </section>
      <section className="container">
        <div className="services-grid" id="services-list">
          {config.services.map((service) => (
            <article key={service.slug} className="svc-card">
              <Link href={`/services/${service.slug}`} className="svc-card-media">
                <Mockup mockup={service.mockup} region="poster" />
              </Link>
              <div className="svc-card-body">
                <h3>
                  <Link href={`/services/${service.slug}`}>{service.name}</Link>
                </h3>
                <p>{service.description}</p>
                <div className="svc-card-foot">
                  <span className="from-price">
                    À partir de <strong>{euro(service.price)}</strong> {service.unit}
                  </span>
                  <div className="svc-card-actions">
                    <Link href={`/services/${service.slug}`} className="btn btn-outline btn-sm">
                      Découvrir
                    </Link>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => openConfig(service.slug)}>
                      <Icon name="plus" /> Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
