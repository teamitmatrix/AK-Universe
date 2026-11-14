import { Info } from "lucide-react";
import { FilesView } from "@/components/videaste/FilesView";
import { loadMyFiles } from "@/lib/videaste/projects";
import { requireVideaste } from "@/lib/videaste/session";

/** videaste/fichiers.html (handoff page 09). Only links of projects assigned to the signed-in videographer (RLS). */
export default async function FichiersPage() {
  const me = await requireVideaste("/videaste/fichiers");
  const data = await loadMyFiles(me);
  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Fichiers</h2>
          <p>Retrouvez un fichier par projet, client ou type, tous vos projets confondus.</p>
        </div>
      </div>
      {!data.ready ? (
        <p className="adm-note">
          <Info size={15} aria-hidden="true" />
          Les fichiers liés seront disponibles après l&apos;application de la migration 013.
        </p>
      ) : (
        <FilesView projects={data.projects.map((p) => ({ id: p.id, title: p.title, client: p.client }))} files={data.files} meId={me.id} />
      )}
      <p className="vid-hint">
        <Info size={13} aria-hidden="true" />
        Les fichiers restent sur votre stockage habituel (Drive, Dropbox, WeTransfer, Frame.io, OneDrive…) — AK Universe conserve simplement le lien.
      </p>
    </div>
  );
}
