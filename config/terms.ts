/**
 * AK Universe Terms of Sale and Use (CGV / CGU).
 * Defaults live here; live version/content are loaded from site_settings via lib/terms.ts
 * (admin: Paramètres → CGV). Bump version whenever legal content changes so past acceptances stay auditable.
 */

import { DEFAULT_TERMS_BODY_HTML, DEFAULT_TERMS_TITLE } from "@/config/terms-default-body";

export const TERMS_KEY = "terms_of_sale";

export const TERMS = {
  /** Machine id stored on acceptances — change when legal content changes. */
  version: "2026-11-21",
  /** Human-readable label shown to customers and stored as proof. */
  label: "AK Universe Terms and Conditions of Sale and Use — Version 21/11/2026",
  title: DEFAULT_TERMS_TITLE,
  bodyHtml: DEFAULT_TERMS_BODY_HTML,
  /** Public page for the current terms. */
  href: "/cgv",
} as const;

export type TermsDoc = {
  version: string;
  label: string;
  title: string;
  bodyHtml: string;
  href: typeof TERMS.href;
};

/** Build the public acceptance label from an ISO date version (YYYY-MM-DD). */
export function formatTermsLabel(versionIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(versionIso.trim());
  if (!m) return `AK Universe Terms and Conditions of Sale and Use — Version ${versionIso}`;
  return `AK Universe Terms and Conditions of Sale and Use — Version ${m[3]}/${m[2]}/${m[1]}`;
}

/** Today's date as YYYY-MM-DD (UTC calendar date — stable for version ids). */
export function todayTermsVersion(at = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export const TERMS_CHECKBOX = {
  fr: {
    /** Full sentence; the linkable segment is rendered separately in the UI. */
    before: "J'ai lu et j'accepte les ",
    link: "Conditions Générales de Vente et d'Utilisation",
    after: " d'AK Universe.",
    required: "Vous devez accepter les Conditions Générales de Vente et d'Utilisation pour continuer.",
    recurring:
      "En confirmant votre abonnement, vous acceptez la facturation récurrente correspondant à la formule sélectionnée jusqu'à sa résiliation, conformément aux Conditions Générales de Vente et d'Utilisation d'AK Universe.",
  },
  en: {
    before: "I have read and accept the ",
    link: "Terms and Conditions of Sale and Use",
    after: " of AK Universe.",
    required: "You must accept the Terms and Conditions of Sale and Use to continue.",
    recurring:
      "By confirming your subscription, you accept recurring billing for the selected plan until cancellation, in accordance with AK Universe’s Terms and Conditions of Sale and Use.",
  },
} as const;

/** Flattened proof fields stored on video_projects.contact (acompte) and mirrored in terms_acceptances. */
export const TERMS_CONTACT_KEYS = {
  accepted: "terms_accepted",
  version: "terms_version",
  label: "terms_label",
  at: "terms_accepted_at",
} as const;

export function termsContactFields(
  terms: Pick<TermsDoc, "version" | "label">,
  at = new Date().toISOString()
): Record<string, string> {
  return {
    [TERMS_CONTACT_KEYS.accepted]: "oui",
    [TERMS_CONTACT_KEYS.version]: terms.version,
    [TERMS_CONTACT_KEYS.label]: terms.label,
    [TERMS_CONTACT_KEYS.at]: at,
  };
}

/** Strip obvious XSS vectors from admin-authored CGV HTML. */
export function sanitizeTermsHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?script\b[^>]*>/gi, "")
    .replace(/<iframe\b[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<\/?iframe\b[^>]*>/gi, "")
    .replace(/<object\b[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}
