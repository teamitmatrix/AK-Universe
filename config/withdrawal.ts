/**
 * Withdrawal (rétractation) copy for FAQ, CGV, checkout and order proof.
 * Change `EARLY_START_CONSENT.version` whenever the consent wording changes.
 */

export const WITHDRAWAL_FAQ = {
  q: "Ai-je un droit de rétractation ?",
  a: `Si vous êtes un client particulier et commandez à distance, vous disposez en principe de 14 jours à compter de la conclusion du contrat pour vous rétracter.

Si vous souhaitez que la prestation commence avant la fin de ce délai, nous recueillons votre demande expresse. En cas de rétractation après le début du travail, le montant correspondant aux prestations déjà réalisées reste dû, dans les conditions prévues par la loi.

Si la prestation est entièrement exécutée avant la fin des 14 jours, vous perdez votre droit de rétractation à condition d'avoir préalablement accepté son démarrage anticipé et reconnu cette conséquence.

La livraison de la vidéo ne fait pas démarrer un nouveau délai de 14 jours. Vos droits en cas de prestation non conforme au contrat restent applicables.`,
} as const;

/** Optional, unchecked checkout consent (must stay separate from the CGV checkbox). */
export const EARLY_START_CONSENT = {
  version: "2026-11-07",
  wording:
    "Je demande expressément que la prestation commence avant l'expiration du délai de rétractation de 14 jours. Je reconnais que je perdrai mon droit de rétractation lorsque la prestation aura été entièrement exécutée.",
} as const;

/** Shown next to the optional consent when it is not selected. */
export const EARLY_START_HINT =
  "Sans cette demande, la prestation est planifiée après l'expiration du délai de rétractation de 14 jours, sauf autre accord.";

/** Contact jsonb keys used as durable proof on video_projects. */
export const EARLY_START_CONTACT_KEYS = {
  accepted: "early_start_accepted",
  version: "early_start_version",
  at: "early_start_at",
  wording: "early_start_wording",
} as const;

export type EarlyStartRecord = {
  accepted: boolean;
  version: string;
  wording: string;
  acceptedAt: string;
};

export function buildEarlyStartRecord(accepted: boolean, at = new Date().toISOString()): EarlyStartRecord {
  return {
    accepted,
    version: EARLY_START_CONSENT.version,
    wording: EARLY_START_CONSENT.wording,
    acceptedAt: at,
  };
}

/** Flatten into contact jsonb string fields for storage without a DB migration. */
export function earlyStartContactFields(record: EarlyStartRecord): Record<string, string> {
  const keys = EARLY_START_CONTACT_KEYS;
  return {
    [keys.accepted]: record.accepted ? "oui" : "non",
    [keys.version]: record.version,
    [keys.at]: record.acceptedAt,
    [keys.wording]: record.wording,
  };
}

export function readEarlyStartFromContact(contact: Record<string, unknown> | null | undefined): EarlyStartRecord | null {
  if (!contact) return null;
  const keys = EARLY_START_CONTACT_KEYS;
  const acceptedRaw = contact[keys.accepted];
  const version = contact[keys.version];
  const at = contact[keys.at];
  const wording = contact[keys.wording];
  if (typeof acceptedRaw !== "string" || typeof version !== "string" || typeof at !== "string" || typeof wording !== "string") {
    return null;
  }
  return {
    accepted: acceptedRaw === "oui",
    version,
    acceptedAt: at,
    wording,
  };
}
