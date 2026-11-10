/*
 * Legal identity of the company, shown on /mentions-legales, /confidentialite and /cgv.
 */

export const TODO = "À COMPLÉTER";

export const COMPANY = {
  /** Registered name, e.g. "AK Universe SAS". */
  legalName: "AK UNIVERSE",
  /** Legal form and share capital. */
  legalForm: "société par actions simplifiée (SAS), au capital social de 6 000 euros",
  /** Head office address. */
  address: "41 avenue Henri Barbusse, 92700 Colombes, France",
  /** SIREN (9 digits). */
  siren: "934 762 360",
  /** SIRET (14 digits). */
  siret: "934 762 360 00014",
  /** RCS city + number. */
  rcs: "Nanterre 934 762 360",
  /** Intra-community VAT number. */
  vat: "FR20934762360",
  /** Person legally responsible for the content of the site. */
  publicationDirector: "Monsieur Sardar Aqil Iqbal, président de la société AK UNIVERSE",
  email: "contact@akuniverse.com",
  phone: "+33 6 50 92 86 38",
  website: "https://www.akuniverse.com",
  /** Last time the legal texts were reviewed (shown at the top of each page). */
  updatedAt: "10 novembre 2026",
  /** Consumer mediator (mandatory in France when selling to individuals). */
  mediator: TODO,
};

/** tel: link for COMPANY.phone ("+33 06 …" → "+336…": the trunk 0 is dropped after a country code). */
export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "").replace(/^(\+\d{2})0/, "$1")}`;

/** The site host (IONOS production server). */
export const HOST = {
  name: "IONOS SARL",
  address: "7 place de la Gare, BP 70109, 57200 Sarreguemines Cedex, France",
  rcs: "Sarreguemines 431 303 775",
  phone: "+33 9 70 80 89 11",
  email: "info@ionos.fr",
  website: "https://www.ionos.fr",
};

/** Processors listed in the privacy policy. */
export const PROCESSORS = [
  { name: "IONOS SARL", role: "Hébergement du site", country: "France / Union européenne" },
  { name: "Supabase Inc.", role: "Base de données et comptes clients", country: "Union européenne (région choisie à la création du projet)" },
  { name: "Stripe Payments Europe Ltd.", role: "Paiements en ligne", country: "Irlande / Union européenne" },
  { name: "Resend (Plus Five Five Inc.)", role: "Envoi des e-mails", country: "États-Unis (clauses contractuelles types)" },
  { name: "Google LLC", role: "Traduction de la page (seulement si vous choisissez une autre langue) et connexion avec Google", country: "États-Unis (Data Privacy Framework)" },
];

export const missingCompanyFields = () =>
  Object.entries(COMPANY)
    .filter(([, value]) => value === TODO)
    .map(([key]) => key);
