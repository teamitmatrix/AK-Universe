/**
 * AK Universe Privacy Policy.
 * Version is stored with each acceptance. Bump it when this text changes.
 */

import { DEFAULT_PRIVACY_BODY_HTML, DEFAULT_PRIVACY_TITLE } from "@/config/privacy-body";
import { sanitizeTermsHtml } from "@/config/terms";

export const PRIVACY = {
  version: "2026-11-07",
  label: "Politique de confidentialité AK Universe — Version 07/11/2026",
  title: DEFAULT_PRIVACY_TITLE,
  bodyHtml: DEFAULT_PRIVACY_BODY_HTML,
  href: "/confidentialite",
} as const;

export type PrivacyDoc = {
  version: string;
  label: string;
  title: string;
  bodyHtml: string;
  href: typeof PRIVACY.href;
};

export const PRIVACY_CHECKBOX = {
  fr: {
    before: "J'ai lu et j'accepte la ",
    link: "Politique de confidentialité",
    after: " d'AK Universe.",
    required: "Vous devez accepter la Politique de confidentialité pour continuer.",
  },
  en: {
    before: "I have read and accept the ",
    link: "Privacy Policy",
    after: " of AK Universe.",
    required: "You must accept the Privacy Policy to continue.",
  },
} as const;

export const LEGAL_REQUIRED = {
  fr: "Vous devez accepter les Conditions Générales de Vente et d'Utilisation et la Politique de confidentialité pour continuer.",
  en: "You must accept the Terms and Conditions of Sale and Use and the Privacy Policy to continue.",
} as const;

export const PRIVACY_CONTACT_KEYS = {
  accepted: "privacy_accepted",
  version: "privacy_version",
  label: "privacy_label",
  at: "privacy_accepted_at",
} as const;

export function privacyContactFields(privacy: Pick<PrivacyDoc, "version" | "label">, at = new Date().toISOString()) {
  return {
    [PRIVACY_CONTACT_KEYS.accepted]: "oui",
    [PRIVACY_CONTACT_KEYS.version]: privacy.version,
    [PRIVACY_CONTACT_KEYS.label]: privacy.label,
    [PRIVACY_CONTACT_KEYS.at]: at,
  };
}

export function sanitizePrivacyHtml(html: string) {
  return sanitizeTermsHtml(html);
}
