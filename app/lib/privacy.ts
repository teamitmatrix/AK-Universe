import "server-only";
import { cache } from "react";
import { phoneHref } from "@/config/company";
import { PRIVACY, sanitizePrivacyHtml, type PrivacyDoc } from "@/config/privacy";
import { getCompany } from "@/lib/company";

/** Current privacy policy. The text lives in config; each acceptance stores a copy of this version. */
export const getPrivacy = cache(async (): Promise<PrivacyDoc> => ({
  version: PRIVACY.version,
  label: PRIVACY.label,
  title: PRIVACY.title,
  bodyHtml: sanitizePrivacyHtml(PRIVACY.bodyHtml),
  href: PRIVACY.href,
}));

/** Privacy policy HTML with the live company identity filled in. */
export async function renderPrivacyHtml(bodyHtml?: string): Promise<string> {
  const [privacy, company] = await Promise.all([getPrivacy(), getCompany()]);
  const html = sanitizePrivacyHtml(bodyHtml ?? privacy.bodyHtml);
  const host = company.website.replace(/^https?:\/\//, "").replace(/\/$/, "") || "www.akuniverse.com";
  const map: Record<string, string> = {
    legalName: company.legalName,
    address: company.address,
    email: company.email,
    phone: company.phone,
    phoneHref: phoneHref(company.phone),
    website: company.website,
    websiteHost: host,
  };
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => map[key] ?? "");
}
