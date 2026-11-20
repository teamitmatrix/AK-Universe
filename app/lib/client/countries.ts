/*
 * Countries offered in the billing form (ISO 3166-1 alpha-2). Labels come from the browser / Node Intl data in
 * French, so nothing is hand-translated. `taxType` = the Stripe tax id type used to put the customer's VAT
 * number on their invoices (null: the number is kept in the billing profile only).
 */

const EU = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
const OTHERS = ["GB", "CH", "NO", "MC", "AD", "LI", "MA", "TN", "DZ", "SN", "CI", "CM", "CA", "US", "AE"];

const TAX_TYPES: Record<string, "eu_vat" | "gb_vat" | "ch_vat" | "no_vat"> = {
  ...Object.fromEntries(EU.map((c) => [c, "eu_vat" as const])),
  // Monaco uses the French VAT system.
  MC: "eu_vat",
  GB: "gb_vat",
  CH: "ch_vat",
  NO: "no_vat",
};

const names = new Intl.DisplayNames(["fr"], { type: "region" });

export const COUNTRIES = [...EU, ...OTHERS]
  .map((code) => ({ code, label: names.of(code) ?? code }))
  .sort((a, b) => a.label.localeCompare(b.label, "fr"));

export const isCountry = (code: unknown): code is string => typeof code === "string" && COUNTRIES.some((c) => c.code === code);
export const countryLabel = (code: string | null | undefined) => (code ? (names.of(code) ?? code) : "");
export const taxTypeFor = (country: string | null | undefined) => (country ? (TAX_TYPES[country] ?? null) : null);
