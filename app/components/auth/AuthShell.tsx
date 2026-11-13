"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Lang } from "@/config/languages";
import { LangSwitch, useLang } from "@/components/ui/LangSwitch";

type Feat = [icon: string, line1: string, line2: string];
type Side = { heading: [string, string]; text: string; feats?: Feat[] };

/** Left column of each auth page, in both languages. */
const SIDES: Record<string, Record<Lang, Side>> = {
  signup: {
    fr: {
      heading: ["Rejoignez", "AK Universe"],
      text: "Créez votre compte et commencez dès aujourd'hui à utiliser vos agents IA pour développer votre entreprise.",
      feats: [
        ["rocket", "Tous vos agents IA", "au même endroit"],
        ["chart", "Suivi en temps réel", "de vos résultats"],
        ["gear", "Configuration rapide", "et simple"],
      ],
    },
    en: {
      heading: ["Join", "AK Universe"],
      text: "Create your account and start using your AI agents today to grow your business.",
      feats: [
        ["rocket", "All your AI agents", "in one place"],
        ["chart", "Real-time tracking", "of your results"],
        ["gear", "Quick and simple", "setup"],
      ],
    },
    de: {
      heading: ["Willkommen bei", "AK Universe"],
      text: "Erstellen Sie Ihr Konto und nutzen Sie noch heute Ihre KI-Agenten, um Ihr Unternehmen voranzubringen.",
      feats: [
        ["rocket", "Alle Ihre KI-Agenten", "an einem Ort"],
        ["chart", "Echtzeit-Verfolgung", "Ihrer Ergebnisse"],
        ["gear", "Schnelle und einfache", "Einrichtung"],
      ],
    },
  },
  verification: {
    fr: { heading: ["Bienvenue sur", "AK Universe"], text: "Accédez à votre espace et gérez tous vos agents IA en toute simplicité." },
    en: { heading: ["Welcome to", "AK Universe"], text: "Access your workspace and manage all your AI agents with ease." },
    de: { heading: ["Willkommen bei", "AK Universe"], text: "Greifen Sie auf Ihren Bereich zu und verwalten Sie alle Ihre KI-Agenten ganz einfach." },
  },
  organisation: {
    fr: {
      heading: ["Créez votre", "organisation"],
      text: "Structurez votre espace et collaborez avec votre équipe pour gérer vos agents IA en toute simplicité.",
      feats: [
        ["rocket", "Tous vos agents IA", "au même endroit"],
        ["chart", "Suivi en temps réel", "de vos résultats"],
        ["gear", "Gestion simple", "et collaborative"],
      ],
    },
    en: {
      heading: ["Create your", "organization"],
      text: "Structure your workspace and collaborate with your team to manage your AI agents with ease.",
      feats: [
        ["rocket", "All your AI agents", "in one place"],
        ["chart", "Real-time tracking", "of your results"],
        ["gear", "Simple and collaborative", "management"],
      ],
    },
    de: {
      heading: ["Erstellen Sie Ihre", "Organisation"],
      text: "Strukturieren Sie Ihren Bereich und arbeiten Sie mit Ihrem Team zusammen, um Ihre KI-Agenten ganz einfach zu verwalten.",
      feats: [
        ["rocket", "Alle Ihre KI-Agenten", "an einem Ort"],
        ["chart", "Echtzeit-Verfolgung", "Ihrer Ergebnisse"],
        ["gear", "Einfache und gemeinsame", "Verwaltung"],
      ],
    },
  },
  reset: {
    fr: { heading: ["Bienvenue sur", "AK Universe"], text: "Choisissez un nouveau mot de passe pour retrouver l'accès à votre espace." },
    en: { heading: ["Welcome to", "AK Universe"], text: "Choose a new password to regain access to your workspace." },
    de: { heading: ["Willkommen bei", "AK Universe"], text: "Wählen Sie ein neues Passwort, um wieder auf Ihren Bereich zuzugreifen." },
  },
};

type Props = {
  page: keyof typeof SIDES;
  backHref?: string;
  children: ReactNode;
};

/** Two-column light layout shared by inscription, verification, organisation (.auth in style.css). */
export function AuthShell({ page, backHref, children }: Props) {
  const [lang] = useLang();
  const { heading, text, feats } = SIDES[page][lang];

  return (
    <div className="theme-light">
      <div className="auth">
        <aside className="auth-side auth-side-hero">
          <Link href="/" className="logo notranslate" translate="no">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
            <img src="/assets/img/logo.svg" alt="" />
            <span>
              <span className="ak">AK</span> UNIVERSE
            </span>
          </Link>
          {/* Same picture and size as the sign-in page (LoginScreen). */}
          <div className="login-hero-wrap">
            <Image
              className="login-hero-img"
              src="/assets/img/hero-man-arms-crossed.png"
              alt=""
              width={1198}
              height={1137}
              sizes="620px"
              priority
            />
          </div>
          <div className="copy">
            <h2>
              {heading[0]}
              <br />
              <span className="gold">{heading[1]}</span>
            </h2>
            <p>{text}</p>
            {feats && (
              <div className="auth-feats">
                {feats.map(([icon, a, b]) => (
                  <div key={icon}>
                    <span className="icon-box">
                      <Icon name={icon} />
                    </span>
                    {a}
                    <br />
                    {b}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="auth-main">
          <div className="light-top">
            {backHref && (
              <Link href={backHref} className="back">
                <Icon name="arrow-left" /> {{ fr: "Retour", en: "Back", de: "Zurück" }[lang]}
              </Link>
            )}
            <LangSwitch />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
