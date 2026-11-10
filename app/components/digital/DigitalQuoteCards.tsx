import Image from "next/image";
import Link from "next/link";
import type { DigitalService } from "@/config/digital";
import { Icon } from "@/components/ui/Icon";
import { quoteHref } from "@/lib/contact/quote";

/** Quote-based digital offers (apps or SEO/CRM): illustration, Sur devis, discover + quote CTAs. */
export function DigitalQuoteCards({
  services,
  layout = "grid",
}: {
  services: DigitalService[];
  /** `pair` = two centered equal-width cards (applications). */
  layout?: "grid" | "pair";
}) {
  return (
    <div className={`agent-tiles digital-quote-tiles${layout === "pair" ? " digital-quote-tiles-pair" : ""}`}>
      {services.map((service) => {
        const quote = quoteHref(`digital:${service.id}`);
        const discoverHref = service.href ?? quote;
        return (
          <article key={service.id} className="agent-tile marketing-tile digital-quote-card" id={service.id}>
            <Link href={discoverHref} className="agent-tile-media" aria-label={`${service.name} — découvrir`}>
              <Image
                src={service.image}
                alt={service.imageAlt}
                width={960}
                height={540}
                sizes={
                  layout === "pair"
                    ? "(max-width: 900px) 100vw, 50vw"
                    : "(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
                }
              />
            </Link>
            <strong>
              <Link href={discoverHref}>{service.name}</Link>
            </strong>
            <span className="agent-tile-text">{service.text}</span>
            <ul className="feature-list digital-points">
              {service.points.map((point) => (
                <li key={point}>
                  <Icon name="check-circle" /> {point}
                </li>
              ))}
            </ul>
            <span className="digital-quote-price">Sur devis</span>
            <div className="agent-tile-actions digital-quote-actions">
              <Link href={quote} className="btn btn-primary btn-sm">
                Demander un devis <Icon name="arrow" />
              </Link>
              <Link href={discoverHref} className="btn btn-outline btn-sm">
                Découvrir
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
