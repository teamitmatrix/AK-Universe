"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
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
  const t = useT();
  return (
    <div className={className}>
      <article className="example">
        <div className="example-media">
          <Mockup mockup={service.mockup} region="poster" />
          <span className="example-play">
            <Icon name="play" />
          </span>
        </div>
        <h3>{t("{name} — extrait", { name: service.name })}</h3>
        <p>{t("Aperçu du rendu final")}</p>
      </article>
      <article className="example">
        <div className="example-media">
          <Mockup mockup={service.mockup} region="side" />
        </div>
        <h3>{t("Coulisses du tournage")}</h3>
        <p>{t("Matériel et équipe professionnels")}</p>
      </article>
      <button type="button" className="example example-cta" onClick={onAdd}>
        <span className="icon-circle">
          <Icon name="plus" />
        </span>
        <h3>{t("Votre projet ici ?")}</h3>
        <p>{t("Configurez votre {name} en quelques clics.", { name: t.lang === "de" ? service.name : service.name.toLowerCase() })}</p>
      </button>
    </div>
  );
}
