/*
 * Legal identity of the company, shown on /mentions-legales, /confidentialite and /cgv.
 * Every value marked "À COMPLÉTER" must be filled in by AK Universe before going live
 * (French law: LCEN art. 6 for the legal notice, GDPR art. 13 for the privacy policy).
 */

export const TODO = "À COMPLÉTER";

export const COMPANY = {
  /** Registered name, e.g. "AK Universe SAS". */
  legalName: TODO,
  /** Legal form and share capital, e.g. "SAS au capital de 1 000 €" or "Entrepreneur individuel". */
  legalForm: TODO,
  /** Head office address. */
  address: "8 rue Pierre Moulie, 94200 Ivry-sur-Seine",
  /** SIRET (14 digits). */
  siret: TODO,
  /** RCS city + number, e.g. "RCS Paris 123 456 789" (leave TODO if not registered at the RCS). */
  rcs: TODO,
  /** Intra-community VAT number, e.g. "FR12 123456789". */
  vat: TODO,
  /** Person legally responsible for the content of the site. */
  publicationDirector: TODO,
  email: "Contact@akuniverse.com",
  phone: "+33 6 50 92 86 38",
  /** Last time the legal texts were reviewed (shown at the top of each page). */
  updatedAt: "30 octobre 2026",
  /** Consumer mediator (mandatory in France when selling to individuals), e.g. "CM2C, 49 rue de Ponthieu, 75008 Paris — www.cm2c.net". */
  mediator: TODO,
};

/** tel: link for COMPANY.phone ("+33 06 …" → "+336…": the trunk 0 is dropped after a country code). */
export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "").replace(/^(\+\d{2})0/, "$1")}`;

/** The site host (fixed: the site is deployed on Vercel). */
export const HOST = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
};

/** Processors listed in the privacy policy. */
export const PROCESSORS = [
  { name: "Vercel Inc.", role: "Hébergement du site", country: "États-Unis (clauses contractuelles types)" },
  { name: "Supabase Inc.", role: "Base de données et comptes clients", country: "Union européenne (région choisie à la création du projet)" },
  { name: "Stripe Payments Europe Ltd.", role: "Paiements en ligne", country: "Irlande / Union européenne" },
  { name: "Resend (Plus Five Five Inc.)", role: "Envoi des e-mails", country: "États-Unis (clauses contractuelles types)" },
  { name: "Google LLC", role: "Traduction de la page (seulement si vous choisissez une autre langue) et connexion avec Google", country: "États-Unis (Data Privacy Framework)" },
];

export const missingCompanyFields = () =>
  Object.entries(COMPANY)
    .filter(([, value]) => value === TODO)
    .map(([key]) => key);
