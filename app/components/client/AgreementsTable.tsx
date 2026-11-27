"use client";

import Link from "next/link";
import { Download, FileText, Layers, Search, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import {
  acceptedStamp,
  agreementReference,
  agreementType,
  versionChip,
  type AgreementSummary,
} from "@/lib/client/agreement-format";

const TYPES = [
  { id: "all", label: "Tous les types" },
  { id: "commande", label: "Commande" },
  { id: "abonnement", label: "Abonnement" },
] as const;

const DATES = [
  { id: "all", label: "Toutes les dates" },
  { id: "7", label: "7 derniers jours" },
  { id: "30", label: "30 derniers jours" },
  { id: "365", label: "12 derniers mois" },
] as const;

export function AgreementsTable({ rows }: { rows: AgreementSummary[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("all");
  const [period, setPeriod] = useState<(typeof DATES)[number]["id"]>("all");
  const [now] = useState(() => Date.now());

  const orders = rows.filter((row) => agreementType(row.kind) === "commande").length;
  const plans = rows.length - orders;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const cutoff = period === "all" ? null : now - Number(period) * 24 * 60 * 60 * 1000;
    return rows.filter((row) => {
      if (type !== "all" && agreementType(row.kind) !== type) return false;
      if (cutoff !== null && new Date(row.accepted_at).getTime() < cutoff) return false;
      if (!needle) return true;
      return agreementReference(row).toLowerCase().includes(needle);
    });
  }, [rows, query, type, period, now]);

  return (
    <div className="cs-contracts">
      <header className="cs-contracts-head">
        <h1>Acceptations enregistrées</h1>
        <p>Historique des documents que vous avez acceptés.</p>
      </header>

      <div className="cs-contracts-stats">
        <article>
          <span className="cs-contracts-ic">
            <FileText size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p>Acceptations</p>
            <strong>{rows.length}</strong>
          </div>
        </article>
        <article>
          <span className="cs-contracts-ic">
            <ShoppingCart size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p>Commandes</p>
            <strong>{orders}</strong>
          </div>
        </article>
        <article>
          <span className="cs-contracts-ic">
            <Layers size={20} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p>Abonnements</p>
            <strong>{plans}</strong>
          </div>
        </article>
      </div>

      <div className="cs-contracts-toolbar">
        <label className="cs-contracts-search">
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="sr-only">Rechercher une référence</span>
          <input
            type="search"
            value={query}
            placeholder="Rechercher une référence..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Type</span>
          <select value={type} onChange={(event) => setType(event.target.value as (typeof TYPES)[number]["id"])}>
            {TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Période</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value as (typeof DATES)[number]["id"])}>
            {DATES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cs-contracts-table">
        {rows.length === 0 ? (
          <p className="cs-contracts-empty">Aucun document enregistré pour le moment. Ils apparaissent ici après un paiement.</p>
        ) : visible.length === 0 ? (
          <p className="cs-contracts-empty">Aucun document ne correspond à cette recherche.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Référence</th>
                <th>Accepté le</th>
                <th>CGV</th>
                <th>Politique de confidentialité</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const kind = agreementType(row.kind);
                const privacy = versionChip(row.privacy_version);
                return (
                  <tr key={row.id}>
                    <td data-label="Type">
                      <span className={`cs-contracts-type is-${kind}`}>{kind === "commande" ? "Commande" : "Abonnement"}</span>
                    </td>
                    <td data-label="Référence" className="notranslate">
                      {agreementReference(row)}
                    </td>
                    <td data-label="Accepté le">{acceptedStamp(row.accepted_at)}</td>
                    <td data-label="CGV">
                      <span className="cs-contracts-version">{versionChip(row.terms_version)}</span>
                    </td>
                    <td data-label="Politique de confidentialité">
                      {privacy ? (
                        <span className="cs-contracts-version">{privacy}</span>
                      ) : (
                        <span className="cs-contracts-missing">Non enregistrée</span>
                      )}
                    </td>
                    <td data-label="Actions">
                      <div className="cs-contracts-actions">
                        <Link href={`/client/dashboard/accords/${row.id}?doc=terms`}>Voir CGV</Link>
                        {privacy ? (
                          <Link href={`/client/dashboard/accords/${row.id}?doc=privacy`}>Voir politique</Link>
                        ) : (
                          <span className="is-disabled">Voir politique</span>
                        )}
                        <a
                          className="cs-contracts-download"
                          href={`/client/dashboard/accords/${row.id}/fichier?doc=all`}
                          aria-label={`Télécharger les documents ${agreementReference(row)}`}
                        >
                          <Download size={16} strokeWidth={1.8} aria-hidden="true" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
