"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signUp } from "@/lib/auth/signup";
import { PASSWORD_RULES, isStrongPassword } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { textLang, useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";
import { AppleLogo, GoogleLogo } from "./SocialLogos";

const TEXT = {
  fr: {
    heading: ["Créer ", "votre compte"],
    subtitle: "Rejoignez AK Universe et commencez à automatiser votre entreprise avec l'IA.",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Adresse e-mail",
    emailPlaceholder: "votre@email.com",
    password: "Mot de passe",
    passwordPlaceholder: "Créez un mot de passe",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    rules: { len: "Au moins 8 caractères", upper: "1 majuscule", digit: "1 chiffre", lower: "1 minuscule" },
    weakToast: "Le mot de passe ne respecte pas encore toutes les règles.",
    submit: "Créer mon compte",
    submitting: "Création…",
    or: "ou",
    google: "Continuer avec Google",
    apple: "Continuer avec Apple",
    googleFailed: "La connexion avec Google a échoué. Veuillez réessayer.",
    appleFailed: "La connexion avec Apple a échoué. Veuillez réessayer.",
    pending: "Connexion Apple : bientôt disponible.",
    haveAccount: "Vous avez déjà un compte ?",
    login: "Se connecter",
    errors: {
      exists: "Un compte existe déjà avec cette adresse e-mail.",
      weak: "Ce mot de passe est trop faible.",
      rate: "Trop de demandes. Veuillez réessayer dans quelques minutes.",
      invalid: "Vérifiez les informations saisies.",
      failed: "Impossible de créer le compte. Veuillez réessayer.",
    },
  },
  en: {
    heading: ["Create ", "your account"],
    subtitle: "Join AK Universe and start automating your business with AI.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    emailPlaceholder: "your@email.com",
    password: "Password",
    passwordPlaceholder: "Create a password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    rules: { len: "At least 8 characters", upper: "1 uppercase letter", digit: "1 number", lower: "1 lowercase letter" },
    weakToast: "Your password does not meet all the rules yet.",
    submit: "Create my account",
    submitting: "Creating…",
    or: "or",
    google: "Continue with Google",
    apple: "Continue with Apple",
    googleFailed: "Google sign-in failed. Please try again.",
    appleFailed: "Apple sign-in failed. Please try again.",
    pending: "Apple sign-in: coming soon.",
    haveAccount: "Already have an account?",
    login: "Sign in",
    errors: {
      exists: "An account already exists with this email address.",
      weak: "This password is too weak.",
      rate: "Too many requests. Please try again in a few minutes.",
      invalid: "Please check the information you entered.",
      failed: "Unable to create the account. Please try again.",
    },
  },
};

type ErrorKey = keyof typeof TEXT.fr.errors;
type OAuthError = "googleFailed" | "appleFailed";

/** Apple stays "coming soon" until it is enabled in Supabase and listed here. Google is always on. */
const APPLE_ENABLED = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
  .split(",")
  .map((p) => p.trim())
  .includes("apple");

const ERROR_KEYS: Record<string, ErrorKey> = {
  user_already_exists: "exists",
  email_exists: "exists",
  weak_password: "weak",
  over_email_send_rate_limit: "rate",
  invalid_input: "invalid",
  rate_limited: "rate",
};

export function SignupForm() {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Message keys (not strings) so they follow the language switch.
  const [error, setError] = useState<ErrorKey | OAuthError | "">("");
  const [lang] = useLang();
  const t = TEXT[textLang(lang)];

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isStrongPassword(form.password)) {
      document.getElementById("pw")?.focus();
      toast(t.weakToast);
      return;
    }
    setLoading(true);
    try {
      const result = await signUp({ ...form, lang });
      if (!result.success) {
        setError(ERROR_KEYS[result.code] ?? "failed");
        return;
      }
      if (result.needsVerification) {
        router.push(`/verification?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
      } else {
        router.push("/organisation");
        router.refresh();
      }
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    if (provider === "apple" && !APPLE_ENABLED) {
      toast(t.pending);
      return;
    }
    setError("");
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=/organisation` },
    });
    if (oauthError) setError(provider === "google" ? "googleFailed" : "appleFailed");
  }

  return (
    <form className="auth-form" id="signup-form" onSubmit={handleSubmit}>
      <h1>
        {t.heading[0]}
        <span className="text-grad">{t.heading[1]}</span>
      </h1>
      <p className="sub">{t.subtitle}</p>

      <div className="row-2">
        <div className="field">
          <label htmlFor="firstname">{t.firstName}</label>
          <div className="input">
            <Icon name="user" />
            <input id="firstname" type="text" required placeholder="John" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="lastname">{t.lastName}</label>
          <div className="input">
            <Icon name="user" />
            <input id="lastname" type="text" required placeholder="Doe" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="email">{t.email}</label>
        <div className="input">
          <Icon name="mail" />
          <input id="email" type="email" required placeholder={t.emailPlaceholder} autoComplete="email" value={form.email} onChange={set("email")} />
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
            autoComplete="new-password"
            aria-describedby="pw-rules"
            value={form.password}
            onChange={set("password")}
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
      <div className="rules" id="pw-rules" aria-live="polite">
        {(Object.keys(PASSWORD_RULES) as (keyof typeof PASSWORD_RULES)[]).map((rule) => (
          <div key={rule} className={`rule${PASSWORD_RULES[rule](form.password) ? " ok" : ""}`} data-rule={rule}>
            <Icon name="check-circle" /> {t.rules[rule]}
          </div>
        ))}
      </div>

      {error && (
        <p key={error} className="auth-error" role="alert">
          {error === "googleFailed" || error === "appleFailed" ? t[error] : t.errors[error]}
        </p>
      )}

      <button type="submit" className="btn btn-light-primary btn-block" disabled={loading}>
        <span key={String(loading)}>{loading ? t.submitting : t.submit}</span> <Icon name="arrow" />
      </button>
      <div className="or">{t.or}</div>
      <button type="button" className="btn btn-light-outline btn-block google-btn" style={{ fontSize: "1.15rem" }} onClick={() => handleOAuth("google")}>
        <GoogleLogo size={26} />
        {t.google}
      </button>
      <button type="button" className="btn btn-light-outline btn-block apple-btn" style={{ fontSize: "1.15rem", marginTop: 10 }} onClick={() => handleOAuth("apple")}>
        <AppleLogo size={26} />
        {t.apple}
      </button>

      <p className="alt">
        {t.haveAccount}
        <br />
        <Link href="/connexion" className="link-orange">
          {t.login} <Icon name="arrow" />
        </Link>
      </p>
      {toastNode}
    </form>
  );
}
