import "server-only";
import { DIGITAL_GROUPS, DIGITAL_WEBSITES } from "@/config/digital";
import type { QuoteServiceOption } from "@/lib/contact/quote";
import { loadDefaultConfig } from "@/lib/video-config";

export type { QuoteServiceOption };

/** Services a visitor can attach to a quote. Ids stay stable in the form and the e-mail. */
export function quoteServiceOptions(): QuoteServiceOption[] {
  const config = loadDefaultConfig();
  const video = config.services.map((service) => ({
    id: service.slug,
    label: service.name,
  }));
  const marketing = (config.marketing?.plans ?? []).map((plan) => ({
    id: `marketing:${plan.key}`,
    label: `Forfait ${plan.name}`,
  }));
  const websites = DIGITAL_WEBSITES.map((site) => ({
    id: `digital:${site.id}`,
    label: site.name,
  }));
  const digital = DIGITAL_GROUPS.flatMap((group) =>
    group.services.map((service) => ({
      id: `digital:${service.id}`,
      label: service.name,
    })),
  );
  return [...video, ...marketing, ...websites, ...digital];
}

/** Older quote links used `digital:<display name>` — still resolve for open e-mails/bookmarks. */
const LEGACY_DIGITAL_LABELS: Record<string, string> = {
  "digital:Site vitrine": "Site vitrine",
  "digital:Site restaurant + commande": "Site restaurant + commande",
  "digital:Site e-commerce": "Site e-commerce",
  "digital:Landing page": "Landing page",
  "digital:Application mobile": "Application mobile",
  "digital:Développement sur mesure": "Développement sur mesure",
  "digital:Référencement SEO": "Référencement naturel (SEO)",
  "digital:Fiche Google Business": "Fiche Google Business",
  "digital:Visibilité en ligne": "Présence et réputation en ligne",
  "digital:Solutions CRM": "Gestion de la relation client (CRM)",
};

export function quoteServiceLabel(id: string) {
  return quoteServiceOptions().find((service) => service.id === id)?.label ?? LEGACY_DIGITAL_LABELS[id] ?? "";
}
