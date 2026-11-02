"use client";

import { Icon } from "@/components/ui/Icon";
import type { Service } from "@/lib/video-config";
import { Mockup } from "./Mockup";

export function Examples({
  service,
  onAdd,
  className,
}: {
  service: Service;
  onAdd: () => void;
  className: string;
}) {
  return (
    <div className={className}>
      <article className="example">
        <div className="example-media">
          <Mockup mockup={service.mockup} region="poster" />
          <span className="example-play">
            <Icon name="play" />
          </span>
        </div>
        <h3>
          {service.name} — extrait
        </h3>
        <p>Aperçu du rendu final</p>
      </article>
      <article className="example">
        <div className="example-media">
          <Mockup mockup={service.mockup} region="side" />
        </div>
        <h3>Coulisses du tournage</h3>
        <p>Matériel et équipe professionnels</p>
      </article>
      <button type="button" className="example example-cta" onClick={onAdd}>
        <span className="icon-circle">
          <Icon name="plus" />
        </span>
        <h3>Votre projet ici ?</h3>
        <p>Configurez votre {service.name.toLowerCase()} en quelques clics.</p>
      </button>
    </div>
  );
}
