"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useCart, useClientDraft, writeClient } from "./cart";
import { useVideo } from "./context";
import { EmptyProject, Stepper, Summary, useMounted } from "./flow";

export function InfosView() {
  const router = useRouter();
  const mounted = useMounted();
  const { config } = useVideo();
  const cart = useCart(config);
  const [client, update] = useClientDraft();
  const today = mounted ? new Date().toISOString().slice(0, 10) : undefined;

  return (
    <main className="flow">
      <div className="container">
        <Stepper step={2} />
        {!mounted ? null : cart.items.length === 0 ? (
          <EmptyProject />
        ) : (
          <div className="flow-grid">
            <aside className="dark-card recap">
              <Summary editable />
            </aside>
            <form
              className="dark-card"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                if (!form.reportValidity()) return;
                writeClient(client);
                router.push("/finaliser");
              }}
            >
              <h2>Vos informations</h2>
              <div className="d-row">
                <label className="d-field">
                  <span>Prénom *</span>
                  <input
                    name="prenom"
                    required
                    autoComplete="given-name"
                    value={client.prenom}
                    placeholder="Jean"
                    onChange={(event) => update({ prenom: event.target.value })}
                  />
                </label>
                <label className="d-field">
                  <span>Nom *</span>
                  <input
                    name="nom"
                    required
                    autoComplete="family-name"
                    value={client.nom}
                    placeholder="Dupont"
                    onChange={(event) => update({ nom: event.target.value })}
                  />
                </label>
              </div>
              <label className="d-field">
                <span>Entreprise</span>
                <input
                  name="entreprise"
                  autoComplete="organization"
                  value={client.entreprise}
                  placeholder="Nom de votre société (facultatif)"
                  onChange={(event) => update({ entreprise: event.target.value })}
                />
              </label>
              <div className="d-row">
                <label className="d-field">
                  <span>E-mail *</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={client.email}
                    placeholder="jean@entreprise.fr"
                    onChange={(event) => update({ email: event.target.value })}
                  />
                </label>
                <label className="d-field">
                  <span>Téléphone *</span>
                  <input
                    name="tel"
                    type="tel"
                    required
                    autoComplete="tel"
                    pattern={"\\+?[0-9 .]{8,}"}
                    value={client.tel}
                    placeholder="06 12 34 56 78"
                    onChange={(event) => update({ tel: event.target.value })}
                  />
                </label>
              </div>
              <div className="d-row">
                <label className="d-field">
                  <span>Ville / lieu du tournage *</span>
                  <input
                    name="lieu"
                    required
                    autoComplete="address-level2"
                    value={client.lieu}
                    placeholder="Paris"
                    onChange={(event) => update({ lieu: event.target.value })}
                  />
                </label>
                <label className="d-field">
                  <span>Date souhaitée</span>
                  <input
                    name="date"
                    type="date"
                    min={today}
                    value={client.date}
                    onChange={(event) => update({ date: event.target.value })}
                  />
                </label>
              </div>
              <label className="d-field">
                <span>Votre message (optionnel)</span>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Décrivez votre projet, vos objectifs, etc."
                  value={client.message}
                  onChange={(event) => update({ message: event.target.value })}
                />
              </label>
              <button className="btn btn-primary btn-block">
                Continuer <Icon name="arrow" />
              </button>
              <p className="muted-note">* Champs obligatoires. Vos données servent uniquement à traiter votre demande.</p>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
