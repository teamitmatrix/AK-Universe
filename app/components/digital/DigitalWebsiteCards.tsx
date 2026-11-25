"use client";

import Image from "next/image";
import Link from "next/link";
import { DIGITAL_RUNNING_POLICY, DIGITAL_WEBSITES, type DigitalWebsite } from "@/config/digital";
import { Icon } from "@/components/ui/Icon";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useCart } from "@/components/video/cart";
import type { VideoConfig } from "@/lib/video-config";

const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;

/** Priced website offers on /digital#sites — illustrations, HT prices, discover + cart. */
export function DigitalWebsiteCards({ config, websites }: { config: VideoConfig; websites?: DigitalWebsite[] }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const sites = websites?.length ? websites : config.digitalWebsites?.length ? config.digitalWebsites : DIGITAL_WEBSITES;
  const cart = useCart({ ...config, digitalWebsites: [...sites] });

  return (
    <>
      <div className="agent-tiles digital-website-tiles">
        {sites.map((site) => (
          <article key={site.id} className="agent-tile marketing-tile digital-website-card" id={site.id}>
            <Link href={`#${site.id}`} className="agent-tile-media" aria-label={site.name}>
              <Image
                src={site.image}
                alt={site.imageAlt}
                width={960}
                height={540}
                sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
              />
            </Link>
            <strong>
              <Link href={`#${site.id}`}>{site.name}</Link>
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
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  cart.add({ type: "digital", key: site.id });
                  toast(`${site.name} ajouté au panier`);
                  router.push("/projet");
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
