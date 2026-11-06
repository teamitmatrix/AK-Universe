"use client";

import Image from "next/image";
import Link from "next/link";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { quoteHref } from "@/lib/contact/quote";
import { useVideo } from "./context";

export function ServicesList() {
  const { config, openConfig } = useVideo();

  return (
    <main>
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
                <Image
                  src={`/assets/img/marketing/${service.slug}.jpeg`}
                  alt=""
                  width={960}
                  height={480}
                  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  className="svc-card-img"
                />
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
                    <Link href={quoteHref(service.slug)} className="btn btn-outline btn-sm">
                      Devis
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
