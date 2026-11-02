"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/auth/login";
import { safeRedirect } from "@/lib/auth/redirect";
import { sendResetEmail } from "@/lib/auth/reset-password";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { LangSwitch, nativeTranslate, textLang, useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { AppleLogo, GoogleLogo, MicrosoftLogo } from "./SocialLogos";

/* Texts from connexion.html (FR) and applyLoginTranslations() in main.js (EN). */
const TEXT = {
  fr: {
    welcome: ["Bienvenue dans", "votre espace", "AK Universe."],
    intro:
      "Connectez-vous pour accéder à vos agents IA, gérer vos projets et profiter de toutes les fonctionnalités de votre compte.",
    benefits: [
      ["Vos agents IA", "Toujours disponibles 24/7"],
      ["Vos projets", "Suivi et gestion simplifiée"],
      ["Vos paramètres", "Personnalisez votre expérience"],
      ["Un écosystème complet", "Marketing, vidéos et plus encore"],
    ],
    heading: ["Se ", "connecter"],
    subtitle: "Accédez à votre espace AK Universe.",
    account: ["Compte client", "Compte entreprise"],
    accountGroup: "Type de compte",
    email: "Adresse e-mail",
    emailPlaceholder: "votre@email.com",
    password: "Mot de passe",
    passwordPlaceholder: "Votre mot de passe",
    remember: "Se souvenir de moi",
    forgot: "Mot de passe oublié ?",
    sending: "Envoi…",
    submit: "Se connecter",
    submitting: "Connexion…",
    or: "ou continuer avec",
    signup: "Vous n'avez pas encore de compte ?",
    signupLink: "Créer un compte",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    invalid: "Adresse e-mail ou mot de passe incorrect.",
    unconfirmed: "Veuillez d'abord confirmer votre adresse e-mail.",
    failed: "Connexion impossible. Veuillez réessayer.",
    oauthFailed: "La connexion avec ce fournisseur a échoué. Veuillez réessayer.",
    resetNeedsEmail: "Saisissez votre adresse e-mail pour réinitialiser votre mot de passe.",
    resetSent: "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
    resetFailed: "Impossible d'envoyer l'e-mail de réinitialisation. Réessayez plus tard.",
    pending: (p: string) => `Connexion ${p} : bientôt disponible.`,
  },
  en: {
    welcome: ["Welcome to", "your AK Universe", "workspace."],
    intro: "Sign in to access your AI agents, manage your projects, and enjoy all your account features.",
    benefits: [
      ["Your AI agents", "Always available 24/7"],
      ["Your projects", "Simple tracking and management"],
      ["Your settings", "Customize your experience"],
      ["A complete ecosystem", "Marketing, videos and more"],
    ],
    heading: ["Sign ", "in"],
    subtitle: "Access your AK Universe workspace.",
    account: ["Client account", "Business account"],
    accountGroup: "Account type",
    email: "Email address",
    emailPlaceholder: "name@example.com",
    password: "Password",
    passwordPlaceholder: "Your password",
    remember: "Remember me",
    forgot: "Forgot password?",
    sending: "Sending…",
    submit: "Sign in",
    submitting: "Signing in…",
    or: "or continue with",
    signup: "Don't have an account yet?",
    signupLink: "Create an account",
    showPassword: "Show password",
    hidePassword: "Hide password",
    invalid: "Incorrect email address or password.",
    unconfirmed: "Please confirm your email address first.",
    failed: "Unable to sign in. Please try again.",
    oauthFailed: "Signing in with this provider failed. Please try again.",
    resetNeedsEmail: "Enter your email address to reset your password.",
    resetSent: "If an account exists for this address, a reset email has just been sent.",
    resetFailed: "Unable to send the reset email. Please try again later.",
    pending: (p: string) => `${p} sign-in: coming soon.`,
  },
};

type MessageKey =
  | "invalid" | "unconfirmed" | "failed" | "oauthFailed"
  | "resetNeedsEmail" | "resetSent" | "resetFailed";

const BENEFIT_ICONS = ["bolt", "chart", "gear", "calendar"];

type OAuthProvider = "google" | "apple" | "azure";
/** Extra sign-in providers switched on in Supabase, e.g. "apple,azure" (Google is always on). */
const EXTRA_PROVIDERS = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "").split(",").map((p) => p.trim());

export function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [lang, setLang] = useLang();
  const [toast, toastNode] = useToast();
  const t = TEXT[textLang(lang)];

  const [account, setAccount] = useState<"client" | "entreprise">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  // Message keys (not strings) so they follow the language switch.
  const [error, setError] = useState<MessageKey | "">(() =>
    params.get("error") === "oauth" ? "oauthFailed" : ""
  );
  const [notice, setNotice] = useState<MessageKey | "">("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const result = await login(email.trim(), password, remember, lang);
      if (!result.success) {
        setError(
          result.code === "email_not_confirmed" ? "unconfirmed"
          : result.code === "invalid_credentials" ? "invalid"
          : "failed"
        );
        return;
      }
      const next = safeRedirect(params.get("redirectTo"));
      if (result.step === "code") {
        // Two-factor: the 6-digit code was e-mailed (Resend).
        router.push(`/verification?step=login&email=${encodeURIComponent(result.email)}&redirectTo=${encodeURIComponent(next)}`);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("resetNeedsEmail");
      document.getElementById("email")?.focus();
      return;
    }
    setResetLoading(true);
    try {
      const result = await sendResetEmail(email.trim(), lang);
      if (result.success) setNotice("resetSent");
      else setError("resetFailed");
    } catch {
      setError("resetFailed");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError("");
    const supabase = createClient();
    const next = encodeURIComponent(safeRedirect(params.get("redirectTo")));
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${next}`,
        // Microsoft only returns the e-mail address when asked for it.
        scopes: provider === "azure" ? "email" : undefined,
      },
    });
    if (oauthError) setError("oauthFailed");
  }

  /** Apple / Microsoft stay "coming soon" until enabled in Supabase and listed in NEXT_PUBLIC_OAUTH_PROVIDERS. */
  const social = (provider: OAuthProvider, label: string) => () =>
    provider === "google" || EXTRA_PROVIDERS.includes(provider) ? handleOAuth(provider) : toast(t.pending(label));

  return (
    <div className="theme-light" translate={nativeTranslate(lang)}>
      <div className="auth auth-login">
        <aside className="auth-side">
          <Link href="/" className="logo notranslate">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
            <img src="/assets/img/logo.svg" alt="" />
            <span>
              <span className="ak">AK</span> UNIVERSE
            </span>
          </Link>

          <div className="login-hero-wrap">
            <Image
              className="login-hero-img"
              src="/assets/img/hero-man-arms-crossed.png"
              alt=""
              width={1198}
              height={1137}
              sizes="340px"
              priority
            />
          </div>

          <div className="copy">
            <h2>
              {t.welcome[0]}
              <br />
              <span className="gold">
                {t.welcome[1]}
                <br />
                {t.welcome[2]}
              </span>
            </h2>
            <p>{t.intro}</p>
          </div>

          <div className="login-benefits">
            {t.benefits.map(([title, text], i) => (
              <div key={BENEFIT_ICONS[i]} className="login-benefit">
                <span className="icon-box">
                  <Icon name={BENEFIT_ICONS[i]} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="auth-main">
          <div className="light-top">
            <LangSwitch lang={lang} onChange={setLang} />
          </div>

          <form className="auth-form" id="login-form" style={{ maxWidth: 545 }} onSubmit={handleSubmit}>
            <h1 className="center">
              {t.heading[0]}
              <span className="text-grad">{t.heading[1]}</span>
            </h1>
            <p className="sub center">{t.subtitle}</p>

            <div className="account-switch" role="group" aria-label={t.accountGroup}>
              {(["client", "entreprise"] as const).map((type, i) => (
                <button
                  key={type}
                  type="button"
                  className={`account-switch-btn${account === type ? " active" : ""}`}
                  data-account={type}
                  aria-pressed={account === type}
                  onClick={() => setAccount(type)}
                >
                  <Icon name={type === "client" ? "user" : "building"} /> {t.account[i]}
                </button>
              ))}
            </div>

            <div className="field">
              <label htmlFor="email">{t.email}</label>
              <div className="input">
                <Icon name="mail" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder={t.emailPlaceholder}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pw">{t.password}</label>
              <div className="input">
                <Icon name="lock" />
                <input
                  id="pw"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={t.passwordPlaceholder}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="after pw-toggle"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} />
                </button>
              </div>
            </div>

            <div className="remember-row">
              <label className="remember-check">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />{" "}
                {t.remember}
              </label>
              <a
                href="#"
                id="forgot"
                className="link-orange"
                aria-disabled={resetLoading}
                onClick={(e) => {
                  e.preventDefault();
                  if (!resetLoading) void handleForgot();
                }}
              >
                <span key={String(resetLoading)}>{resetLoading ? t.sending : t.forgot}</span>
              </a>
            </div>

            {error && <p key={error} className="auth-error" role="alert">{t[error]}</p>}
            {notice && <p key={notice} className="auth-notice" role="status">{t[notice]}</p>}

            <button type="submit" className="btn btn-light-primary btn-block" disabled={loading}>
              <span key={String(loading)}>{loading ? t.submitting : t.submit}</span> <Icon name="arrow" />
            </button>
            <div className="or">{t.or}</div>
            <div className="social-row">
              <button type="button" className="btn btn-light-outline btn-block social-btn google-btn" onClick={social("google", "Google")}>
                <GoogleLogo />
                Google
              </button>
              <button
                type="button"
                className="btn btn-light-outline btn-block social-btn apple-btn"
                onClick={social("apple", "Apple")}
              >
                <AppleLogo />
                Apple
              </button>
              <button
                type="button"
                className="btn btn-light-outline btn-block social-btn microsoft-btn"
                onClick={social("azure", "Microsoft")}
              >
                <MicrosoftLogo />
                Microsoft
              </button>
            </div>

            <p className="alt">
              {t.signup}
              <br />
              <Link href="/inscription" className="link-orange">
                {t.signupLink} <Icon name="arrow" />
              </Link>
            </p>
          </form>
        </main>
      </div>
      {toastNode}
    </div>
  );
}
