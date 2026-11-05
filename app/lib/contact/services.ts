import "server-only";
import { DIGITAL_GROUPS, DIGITAL_WEBSITES } from "@/config/digital";
import type { QuoteServiceOption } from "@/lib/contact/quote";
import { loadDefaultConfig } from "@/lib/video-config";

export type { QuoteServiceOption };

/** Services a visitor can attach to a quote. Ids stay stable in the form and the e-mail. */
export function quoteServiceOptions(): QuoteServiceOption[] {
  const video = loadDefaultConfig().services.map((service) => ({
    id: service.slug,
    label: service.name,
  }));
  const websites = DIGITAL_WEBSITES.map((site) => ({
    id: `digital:${site.name}`,
    label: site.name,
  }));
  const digital = DIGITAL_GROUPS.flatMap((group) =>
    group.services.map((service) => ({
      id: `digital:${service.name}`,
      label: service.name,
    })),
  );
  return [...video, ...websites, ...digital];
}

export function quoteServiceLabel(id: string) {
  return quoteServiceOptions().find((service) => service.id === id)?.label ?? "";
}
