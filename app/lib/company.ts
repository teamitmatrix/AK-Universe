import "server-only";
import { cache } from "react";
import { COMPANY } from "@/config/company";
import { createPublicClient } from "@/lib/supabase/server";

/*
 * Company legal identity = config/company.ts (defaults) merged with what the admin saves in
 * Paramètres → Entreprise (site_settings "company"). Read by the legal pages, the contact page/card,
 * contact e-mails and the chatbot, so an edit there updates every page.
 */

export const COMPANY_KEY = "company";
export type Company = typeof COMPANY;
/** Fields the admin can edit (updatedAt is set automatically on save). */
export const COMPANY_FIELDS = ["legalName", "legalForm", "address", "siren", "siret", "rcs", "vat", "publicationDirector", "email", "phone", "website", "mediator"] as const;
export type CompanyField = (typeof COMPANY_FIELDS)[number];

export const getCompany = cache(async (): Promise<Company> => {
  try {
    const { data, error } = await createPublicClient().from("site_settings").select("value").eq("key", COMPANY_KEY).maybeSingle();
    if (error) throw error;
    const saved = (data?.value ?? {}) as Partial<Record<CompanyField | "updatedAt", unknown>>;
    const merged = { ...COMPANY };
    for (const key of [...COMPANY_FIELDS, "updatedAt"] as const) {
      const v = saved[key];
      if (typeof v === "string" && v.trim()) merged[key] = v.trim();
    }
    return merged;
  } catch (cause) {
    // Never take the legal pages down because settings are unreachable: fall back to config/company.ts.
    console.error("Could not load company settings:", cause);
    return { ...COMPANY };
  }
});
