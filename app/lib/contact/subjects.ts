export const QUOTE_SUBJECT = "Demande de devis";

export const CONTACT_SUBJECTS = [
  "Agents IA",
  "Marketing",
  "Digital",
  QUOTE_SUBJECT,
  "Question générale",
  "Autre",
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export function isContactSubject(value: string): value is ContactSubject {
  return (CONTACT_SUBJECTS as readonly string[]).includes(value);
}
