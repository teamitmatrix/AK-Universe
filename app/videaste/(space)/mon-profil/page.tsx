import Link from "next/link";
import { KeyRound, Settings, User } from "lucide-react";
import { ProfileForm } from "@/components/videaste/ProfileForm";
import { LangSwitch } from "@/components/ui/LangSwitch";
import { saveMyProfile } from "@/lib/videaste/actions";
import { requireVideaste } from "@/lib/videaste/session";

/**
 * videaste/mon-profil.html (handoff page 09): the videographer's own information and settings. Role and account
 * status are managed by the administration only (RLS forbids changing them from here).
 */
export default async function MonProfilPage() {
  const me = await requireVideaste("/videaste/mon-profil");
  const p = me.profile as typeof me.profile & { phone?: string | null; specialties?: string[] | null };

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Mon profil</h2>
          <p>Vos informations personnelles. Votre rôle et vos permissions sont gérés par l&apos;administration.</p>
        </div>
      </div>
      <div className="vid-top">
        <section className="adm-card" aria-labelledby="vid-me-h">
          <header className="adm-card-head">
            <h2 id="vid-me-h">
              <User size={17} aria-hidden="true" /> Informations
            </h2>
          </header>
          <ProfileForm initial={{ firstName: p.first_name ?? "", lastName: p.last_name ?? "", phone: p.phone ?? "", specialties: p.specialties ?? [] }} email={me.email} save={saveMyProfile} />
        </section>
        <section className="adm-card" aria-labelledby="vid-settings-h">
          <header className="adm-card-head">
            <h2 id="vid-settings-h">
              <Settings size={17} aria-hidden="true" /> Paramètres
            </h2>
          </header>
          <dl className="vid-settings">
            <div>
              <dt>Rôle</dt>
              <dd>Vidéaste</dd>
            </div>
            <div>
              <dt>Statut du compte</dt>
              <dd>
                <span className="adm-badge is-ok">Actif</span>
              </dd>
            </div>
            <div>
              <dt>Langue</dt>
              <dd>
                <LangSwitch compact />
              </dd>
            </div>
            <div>
              <dt>Notifications</dt>
              <dd className="adm-muted adm-small">Dans l&apos;espace (cloche en haut de page)</dd>
            </div>
            <div>
              <dt>Sécurité</dt>
              <dd>
                <Link href="/auth/reset-password" className="adm-btn is-ghost sm">
                  <KeyRound size={14} aria-hidden="true" /> Changer le mot de passe
                </Link>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
