"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createOrganization } from "@/lib/account/actions";
import { SECTORS, SECTORS_EN, SIZES, SIZES_EN } from "@/config/organisation";
import { Icon } from "@/components/ui/Icon";
import { textLang, useLang } from "@/components/ui/LangSwitch";

const TEXT = {
  fr: {
    steps: ["Compte", "Organisation", "Équipe", "Confirmation"],
    stepsLabel: "Étapes",
    heading: ["Créez votre ", "organisation"],
    subtitle: "Créez une organisation pour organiser vos agents IA et collaborer avec votre équipe.",
    name: "Nom de l'organisation",
    namePlaceholder: "Ex. Ma Société, AK Consulting…",
    sector: "Secteur d'activité",
    sectorPlaceholder: "Sélectionnez un secteur d'activité",
    sectors: SECTORS,
    size: "Taille de l'organisation",
    sizePlaceholder: "Sélectionnez une taille",
    sizes: SIZES,
    submit: "Créer l'organisation",
    submitting: "Création…",
    errors: {
      invalid_input: "Vérifiez les informations saisies.",
      failed: "Impossible de créer l'organisation. Veuillez réessayer.",
    },
  },
  en: {
    steps: ["Account", "Organization", "Team", "Confirmation"],
    stepsLabel: "Steps",
    heading: ["Create your ", "organization"],
    subtitle: "Create an organization to organize your AI agents and collaborate with your team.",
    name: "Organization name",
    namePlaceholder: "E.g. My Company, AK Consulting…",
    sector: "Industry",
    sectorPlaceholder: "Select an industry",
    sectors: SECTORS_EN,
    size: "Organization size",
    sizePlaceholder: "Select a size",
    sizes: SIZES_EN,
    submit: "Create the organization",
    submitting: "Creating…",
    errors: {
      invalid_input: "Please check the information you entered.",
      failed: "Unable to create the organization. Please try again.",
    },
  },
};

export function OrganisationForm() {
  const [lang] = useLang();
  const t = TEXT[textLang(lang)];
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [size, setSize] = useState("");
  const [error, setError] = useState<keyof typeof TEXT.fr.errors | "">("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      // Redirects to /abonnement.html on success.
      const result = await createOrganization({ name, sector, size });
      if (result && !result.success) setError(result.code);
    });
  }

  return (
    <form className="auth-form" id="org-form" onSubmit={handleSubmit}>
      <ol className="steps" aria-label={t.stepsLabel}>
        {t.steps.map((label, i) => (
          <li key={i} className={i === 0 ? "done" : i === 1 ? "current" : undefined} aria-current={i === 1 ? "step" : undefined}>
            <span className="n">{i === 0 ? <Icon name="check" /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <h1 className="center">
        {t.heading[0]}
        <span className="text-grad">{t.heading[1]}</span>
      </h1>
      <p className="sub center">{t.subtitle}</p>

      <div className="field">
        <label htmlFor="org-name">{t.name}</label>
        <div className="input">
          <Icon name="building" />
          <input
            id="org-name"
            type="text"
            required
            maxLength={120}
            placeholder={t.namePlaceholder}
            autoComplete="organization"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="org-sector">{t.sector}</label>
        <div className="input">
          <Icon name="briefcase" />
          <select id="org-sector" required value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="" disabled>
              {t.sectorPlaceholder}
            </option>
            {SECTORS.map((s, i) => (
              <option key={s} value={s}>
                {t.sectors[i]}
              </option>
            ))}
          </select>
          <span className="after">
            <Icon name="chev-down" />
          </span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="org-size">{t.size}</label>
        <div className="input">
          <Icon name="users" />
          <select id="org-size" required value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="" disabled>
              {t.sizePlaceholder}
            </option>
            {SIZES.map((s, i) => (
              <option key={s} value={s}>
                {t.sizes[i]}
              </option>
            ))}
          </select>
          <span className="after">
            <Icon name="chev-down" />
          </span>
        </div>
      </div>

      {error && <p key={error} className="auth-error" role="alert">{t.errors[error]}</p>}

      <button type="submit" className="btn btn-light-primary btn-block" style={{ marginTop: 16, fontSize: "1.35rem" }} disabled={pending}>
        <span key={String(pending)}>{pending ? t.submitting : t.submit}</span> <Icon name="arrow" />
      </button>
    </form>
  );
}
