import { Info } from "lucide-react";
import { RatesView } from "@/components/videaste/RatesView";
import { loadMyRates } from "@/lib/videaste/rates";
import { requireVideaste } from "@/lib/videaste/session";

/** Videographer Rates: review admin-proposed rate cards and confirm each line individually. */
export default async function TarifsPage() {
  const me = await requireVideaste("/videaste/tarifs");
  const data = await loadMyRates(me);
  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Tarifs</h2>
          <p>Consultez les grilles proposées par l&apos;administration et confirmez chaque prix individuellement.</p>
        </div>
      </div>
      {!data.ready ? (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Les tarifs seront disponibles après l&apos;application de la migration 026.
        </p>
      ) : (
        <RatesView cards={data.cards} />
      )}
    </div>
  );
}
