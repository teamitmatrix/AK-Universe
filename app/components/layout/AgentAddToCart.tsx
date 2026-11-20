"use client";

import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { saveAgentSubscription } from "@/components/video/cart";

const euros = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Price + add-to-cart block for /agents-ia/[id]. */
export function AgentAddToCart({
  agentId,
  name,
  priceMonthly,
  priceAnnual,
  capacityLabel,
}: {
  agentId: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;
  capacityLabel?: string;
}) {
  const [toast, toastNode] = useToast();

  return (
    <>
      <div className="agent-profile-buy">
        <div className="agent-profile-price">
          <strong>{euros(priceMonthly)} €</strong>
          <span>HT / mois</span>
          {priceAnnual != null ? <span className="agent-profile-price-annual">soit {euros(priceAnnual)} € / an</span> : null}
          {capacityLabel ? <span className="agent-profile-capacity">{capacityLabel}</span> : null}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => {
            saveAgentSubscription(agentId);
            toast(`${name} ajouté à mon projet`);
          }}
        >
          <Icon name="plus" /> Ajouter au panier
        </button>
      </div>
      {toastNode}
    </>
  );
}
