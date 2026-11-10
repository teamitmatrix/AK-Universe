"use client";

import Image from "next/image";
import Link from "next/link";
import { DIGITAL_RUNNING_POLICY, DIGITAL_WEBSITES } from "@/config/digital";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { quoteHref } from "@/lib/contact/quote";
import { useCart } from "@/components/video/cart";
import type { VideoConfig } from "@/lib/video-config";

const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;

/** Priced website offers on /digital#sites — illustrations, HT prices, discover + cart. */
export function DigitalWebsiteCards({ config }: { config: VideoConfig }) {
  const [toast, toastNode] = useToast();
  const cart = useCart(config);

  return (
    <>
      <div className="agent-tiles digital-website-tiles">
        {DIGITAL_WEBSITES.map((site) => (
          <article key={site.id} className="agent-tile marketing-tile digital-website-card" id={site.id}>
            <Link
              href={quoteHref(`digital:${site.id}`)}
              className="agent-tile-media"
              aria-label={`${site.name} — découvrir`}
            >
              <Image
                src={site.image}
                alt={site.imageAlt}
                width={960}
                height={540}
                sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
              />
            </Link>
            <strong>
              <Link href={quoteHref(`digital:${site.id}`)}>{site.name}</Link>
            </strong>
            <ul className="feature-list digital-points">
              {site.points.map((point) => (
                <li key={point}>
                  <Icon name="check-circle" /> {point}
                </li>
              ))}
            </ul>
            <div className="digital-website-price">
              <span className="digital-setup-price">
                À partir de <strong>{euros(site.price)}</strong> HT
              </span>
              <span className="digital-running">
                {site.runningFrom !== null ? (
                  <>
                    Frais de fonctionnement
                    <br />
                    À partir de {euros(site.runningFrom)} HT / mois
                  </>
                ) : (
                  <>Pas de frais de fonctionnement affichés</>
                )}
              </span>
              <span className="digital-running-note">{site.runningNote}</span>
            </div>
            <div className="agent-tile-actions digital-website-actions">
              <Link href={quoteHref(`digital:${site.id}`)} className="btn btn-outline btn-sm">
                Découvrir
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  cart.add({ type: "digital", key: site.id });
                  toast(`${site.name} ajouté à mon projet`);
                }}
              >
                <Icon name="plus" /> Ajouter au panier
              </button>
            </div>
          </article>
        ))}
      </div>
      <aside className="digital-running-policy" aria-label="Frais de fonctionnement">
        <p>{DIGITAL_RUNNING_POLICY.tax}</p>
        <p>{DIGITAL_RUNNING_POLICY.starting}</p>
        <p>{DIGITAL_RUNNING_POLICY.details}</p>
        <p>{DIGITAL_RUNNING_POLICY.landing}</p>
      </aside>
      {toastNode}
    </>
  );
}
