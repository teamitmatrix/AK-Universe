import type { CommissionStatus } from "@/lib/commercial/finance";

/** Shared bits of the rep's money screens (French: the sales space is French-only while fixed translations are off). */

export const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
export const dateFr = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR");
export const pct = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR")} %`);

const LABEL: Record<CommissionStatus, string> = { en_attente: "En attente", validee: "Validée", a_payer: "À payer", payee: "Payée" };
const CLASS: Record<CommissionStatus, string> = { en_attente: "is-muted", validee: "is-info", a_payer: "is-warn", payee: "is-ok" };

/** Commission status badge; without a commission yet: invoice not collected, or video sale not computed by the admin. */
export function CommissionBadge({ status, source, invoicePaid }: { status: CommissionStatus | null; source?: "facture" | "video"; invoicePaid?: boolean }) {
  if (status) return <span className={`adm-badge ${CLASS[status]}`}>{LABEL[status]}</span>;
  if (source === "facture" && !invoicePaid) return <span className="adm-badge is-muted" title="La commission est créée quand la facture est payée.">Non encaissée</span>;
  return (
    <span className="adm-badge is-muted" title="L'administrateur calcule la commission de cette vente.">
      À calculer
    </span>
  );
}
