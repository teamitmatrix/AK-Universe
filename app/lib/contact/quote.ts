import { QUOTE_SUBJECT } from "@/lib/contact/subjects";

export type QuoteServiceOption = { id: string; label: string };

/** Opens the contact form on a chosen subject, with an optional service already selected. */
export function contactHref(subject: string, serviceId?: string) {
  const params = new URLSearchParams({ sujet: subject });
  if (serviceId) params.set("service", serviceId);
  return `/contact?${params.toString()}`;
}

/** Contact form opened as a quote, with an optional service already chosen. */
export function quoteHref(serviceId?: string) {
  return contactHref(QUOTE_SUBJECT, serviceId);
}
