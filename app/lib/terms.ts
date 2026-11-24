import "server-only";
import { cache } from "react";
import { phoneHref } from "@/config/company";
import { TERMS, TERMS_KEY, type TermsDoc, sanitizeTermsHtml } from "@/config/terms";
import { getCompany } from "@/lib/company";
import { createPublicClient } from "@/lib/supabase/server";

/*
 * Live CGV = config/terms.ts defaults merged with Paramètres → CGV
 * (site_settings "terms_of_sale"). Checkout proof and /cgv both read here.
 */

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const getTerms = cache(async (): Promise<TermsDoc> => {
  try {
    const { data, error } = await createPublicClient().from("site_settings").select("value").eq("key", TERMS_KEY).maybeSingle();
    if (error) throw error;
    const saved = (data?.value ?? {}) as Partial<Record<"version" | "label" | "title" | "bodyHtml", unknown>>;
    return {
      version: asString(saved.version, TERMS.version),
      label: asString(saved.label, TERMS.label),
      title: asString(saved.title, TERMS.title),
      bodyHtml: sanitizeTermsHtml(asString(saved.bodyHtml, TERMS.bodyHtml)),
      href: TERMS.href,
    };
  } catch (cause) {
    console.error("Could not load terms settings:", cause);
    return {
      version: TERMS.version,
      label: TERMS.label,
      title: TERMS.title,
      bodyHtml: TERMS.bodyHtml,
      href: TERMS.href,
    };
  }
});

/** Replace {{placeholders}} in CGV HTML with the live company identity. */
export async function renderTermsHtml(bodyHtml?: string): Promise<string> {
  const [terms, company] = await Promise.all([getTerms(), getCompany()]);
  const html = sanitizeTermsHtml(bodyHtml ?? terms.bodyHtml);
  const host = company.website.replace(/^https?:\/\//, "").replace(/\/$/, "") || "www.akuniverse.com";
  const map: Record<string, string> = {
    legalName: company.legalName,
    address: company.address,
    siren: company.siren,
    email: company.email,
    phone: company.phone,
    phoneHref: phoneHref(company.phone),
    website: company.website,
    websiteHost: host,
    year: String(new Date().getFullYear()),
  };
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => map[key] ?? "");
}
