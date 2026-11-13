import { Info } from "lucide-react";
import { ResourcesView } from "@/components/commercial/ResourcesView";
import { loadResources } from "@/lib/commercial/resources";
import { requireCommercial } from "@/lib/commercial/session";

/**
 * commercial/ressources.html (handoff page 08): brochures, T&Cs, decks, contract templates and sales aids to share
 * with clients. requireCommercial() checks the role; the storage policy lets only active staff read the library.
 */
export default async function RessourcesPage() {
  await requireCommercial("/commercial/ressources");
  const { ready, resources } = await loadResources();

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Documents &amp; ressources</h2>
          <p>Brochures, CGV, présentations, contrats et supports commerciaux à partager avec vos clients.</p>
        </div>
      </div>
      {!ready && (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          La bibliothèque est momentanément indisponible.
        </p>
      )}
      <ResourcesView resources={resources} />
    </div>
  );
}
