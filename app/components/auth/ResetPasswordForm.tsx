"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword } from "@/lib/auth/password";
import { notifyPasswordChanged } from "@/lib/auth/reset-password";
import { textLang, useLang } from "@/components/ui/LangSwitch";

const TEXT = {
  fr: {
    heading: ["Réinitialiser votre ", "mot de passe"],
    subtitle: "Choisissez un nouveau mot de passe pour votre compte AK Universe.",
    done: "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.",
    backToLogin: "Retour à la connexion",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    submit: "Enregistrer le nouveau mot de passe",
    submitting: "Modification...",
    checking: "Vérification du lien...",
    errors: {
      invalidLink: "Le lien est invalide ou expiré. Demandez un nouvel e-mail de réinitialisation.",
      weak: "Utilisez au moins 8 caractères, une majuscule, une minuscule et un chiffre.",
      mismatch: "Les mots de passe ne correspondent pas.",
      samePassword: "Le nouveau mot de passe doit être différent de l'ancien.",
      failed: "Impossible de modifier le mot de passe.",
    },
  },
  en: {
    heading: ["Reset your ", "password"],
    subtitle: "Choose a new password for your AK Universe account.",
    done: "Your password has been changed. You can now sign in.",
    backToLogin: "Back to sign in",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    submit: "Save the new password",
    submitting: "Saving...",
    checking: "Checking the link...",
    errors: {
      invalidLink: "This link is invalid or has expired. Request a new reset email.",
      weak: "Use at least 8 characters, one uppercase letter, one lowercase letter and one number.",
      mismatch: "The passwords do not match.",
      samePassword: "The new password must be different from the old one.",
      failed: "Unable to change the password.",
    },
  },
};

type ErrorKey = keyof typeof TEXT.fr.errors;

export function ResetPasswordForm() {
  const [lang] = useLang();
  const t = TEXT[textLang(lang)];
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  // Message key (not a string) so it follows the language switch.
  const [error, setError] = useState<ErrorKey | "">("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    let active = true;
    async function prepareRecovery() {
      try {
        const supabase = createClient();
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        if (tokenHash) {
          // Link from our Resend e-mail.
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (verifyError) throw verifyError;
          window.history.replaceState({}, "", window.location.pathname);
        } else if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
          window.history.replaceState({}, "", window.location.pathname);
        }
        const { data, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) throw new Error("no session");
        if (active) setReady(true);
      } catch {
        if (active) setError("invalidLink");
      }
    }
    void prepareRecovery();
    return () => {
      active = false;
    };
  }, []);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isStrongPassword(password)) {
      setError("weak");
      return;
    }
    if (password !== confirmPassword) {
      setError("mismatch");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } =
        await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.code === "same_password" ? "samePassword" : "failed");
        return;
      }
      setSuccess(true);
      void notifyPasswordChanged(lang);
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
        <h1 className="center">
          {t.heading[0]}
          <span className="text-grad">{t.heading[1]}</span>
        </h1>
        <p className="sub center">{t.subtitle}</p>
        {success ? (
          <>
            <p role="status">{t.done}</p>
            <Link className="btn btn-light-primary btn-block" href="/connexion">
              {t.backToLogin}
            </Link>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="new-password">{t.newPassword}</label>
              <div className="input">
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="confirm-password">{t.confirmPassword}</label>
              <div className="input">
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>
            {error && <p key={error} className="auth-error" role="alert">{t.errors[error]}</p>}
            <button
              type="submit"
              className="btn btn-light-primary btn-block"
              disabled={!ready || loading}
            >
              <span key={String(loading)}>{loading ? t.submitting : t.submit}</span>
            </button>
            {!ready && !error && (
              <p role="status">{t.checking}</p>
            )}
            <p className="alt">
              <Link href="/connexion" className="link-orange">
                {t.backToLogin}
              </Link>
            </p>
          </>
        )}
    </form>
  );
}
