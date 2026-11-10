"use client";

import Image from "next/image";
import Link from "next/link";
import { MARKETING_FIT_MEDIA, SERVICE_TAGS } from "@/config/marketing";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { useVideo } from "./context";

const FIT_MEDIA = new Set<string>(MARKETING_FIT_MEDIA);

/** Marketing catalogue cards: Discover + add-to-cart (opens the configurator). */
export function MarketingServiceTiles() {
  const { config, openConfig } = useVideo();

  return (
    <div className="agent-tiles marketing-tiles">
      {config.services.map((service) => {
        const tag = SERVICE_TAGS[service.slug] ?? service.gold ?? service.name;
        const fitMedia = FIT_MEDIA.has(service.slug);
        return (
          <article key={service.slug} className="agent-tile marketing-tile">
            <Link
              href={`/services/${service.slug}`}
              className={`agent-tile-media${fitMedia ? " agent-tile-media-fit" : ""}`}
              aria-label={service.name}
            >
              <Image
                src={`/assets/img/marketing/${service.slug}.jpeg`}
                alt=""
                width={960}
                height={600}
                sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
              />
            </Link>
            <span className="agent-tile-top">
              <span className="tag">{tag}</span>
            </span>
            <strong>
              <Link href={`/services/${service.slug}`}>{service.name}</Link>
            </strong>
            <span className="agent-tile-text">{service.description}</span>
            <span className="agent-tile-price">
              À partir de <strong>{euro(service.price)}</strong> {service.unit}
            </span>
            <div className="agent-tile-actions">
              <Link href={`/services/${service.slug}`} className="btn btn-outline btn-sm">
                Découvrir
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openConfig(service.slug)}
              >
                <Icon name="plus" /> Ajouter au panier
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
