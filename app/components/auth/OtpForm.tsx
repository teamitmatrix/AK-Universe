"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { resendLoginCode, verifyLoginCode } from "@/lib/auth/login";
import { safeRedirect } from "@/lib/auth/redirect";
import { resendSignupCode, verifySignupCode } from "@/lib/auth/signup";
import { Icon } from "@/components/ui/Icon";
import { textLang, useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";

const LENGTH = 6;

const TEXT = {
  fr: {
    heading: "Vérifiez vos e-mails",
    sent: "Nous avons envoyé un code de connexion à",
    yourEmail: "votre adresse e-mail",
    group: "Code à 6 chiffres",
    digit: (n: number) => `Chiffre ${n}`,
    submit: "Se connecter",
    submitting: "Vérification…",
    expires: "Le code expire après 15 minutes.",
    resend: "Renvoyer un code",
    incomplete: "Saisissez les 6 chiffres du code.",
    resent: "Un nouveau code a été envoyé.",
    resendFailed: "Impossible d'envoyer un nouveau code pour le moment.",
    wait: "Un code vient d'être envoyé. Patientez une minute avant d'en demander un autre.",
    missingEmail: "Adresse e-mail manquante. Recommencez l'inscription.",
    expired: "Ce code est invalide ou a expiré. Demandez un nouveau code.",
    failed: "Vérification impossible. Veuillez réessayer.",
  },
  en: {
    heading: "Check your email",
    sent: "We sent a sign-in code to",
    yourEmail: "your email address",
    group: "6-digit code",
    digit: (n: number) => `Digit ${n}`,
    submit: "Sign in",
    submitting: "Verifying…",
    expires: "The code expires after 15 minutes.",
    resend: "Resend a code",
    incomplete: "Enter all 6 digits of the code.",
    resent: "A new code has been sent.",
    resendFailed: "Unable to send a new code right now.",
    wait: "A code was just sent. Please wait a minute before asking for another one.",
    missingEmail: "Email address missing. Please start the sign-up again.",
    expired: "This code is invalid or has expired. Request a new code.",
    failed: "Verification failed. Please try again.",
  },
};

export function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  // "login": two-factor step after the password (connexion.html); otherwise the sign-up confirmation.
  const loginStep = params.get("step") === "login";
  const [lang] = useLang();
  const t = TEXT[textLang(lang)];
  const [toast, toastNode] = useToast();
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  // Message key (not a string) so it follows the language switch.
  const [error, setError] = useState<"missingEmail" | "expired" | "failed" | "">("");
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => inputs.current[0]?.focus(), []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const focus = (i: number) => inputs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  function setDigit(i: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((d) => d.map((v, j) => (j === i ? digit : v)));
    if (digit && i < LENGTH - 1) focus(i + 1);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits((d) => d.map((v, j) => pasted[j] ?? v));
    focus(pasted.length);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const code = digits.join("");
    if (code.length < LENGTH) {
      toast(t.incomplete);
      focus(digits.findIndex((d) => !d));
      return;
    }
    if (!email) {
      setError("missingEmail");
      return;
    }
    setLoading(true);
    try {
      const result = loginStep ? await verifyLoginCode(code) : await verifySignupCode(email, code);
      if (!result.success) {
        setError(result.code === "otp_expired" ? "expired" : "failed");
        return;
      }
      router.replace(loginStep ? safeRedirect(params.get("redirectTo")) : "/organisation.html");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setCooldown(30);
    const result = loginStep ? await resendLoginCode(lang) : await resendSignupCode(email, lang);
    toast(result.success ? t.resent : result.code === "rate_limited" ? t.wait : t.resendFailed);
  }

  return (
    <form className="auth-form center" id="otp-form" onSubmit={handleSubmit}>
      <h1>{t.heading}</h1>
      <p className="sub">
        {t.sent}
        <br />
        <b id="otp-email" style={{ color: "var(--l-text)" }}>
          <span className="notranslate">{email || t.yourEmail}</span>
        </b>
      </p>

      <div className="otp" role="group" aria-label={t.group} onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : undefined}
            maxLength={1}
            aria-label={t.digit(i + 1)}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digit) focus(i - 1);
              if (e.key === "ArrowLeft") focus(i - 1);
              if (e.key === "ArrowRight") focus(i + 1);
            }}
          />
        ))}
      </div>

      {error && <p key={error} className="auth-error" role="alert">{t[error]}</p>}

      <button type="submit" className="btn btn-light-primary btn-block" disabled={loading}>
        <span key={String(loading)}>{loading ? t.submitting : t.submit}</span> <Icon name="arrow" />
      </button>
      <p className="resend">
        {t.expires}{" "}
        <button type="button" id="resend" className="link-orange" disabled={cooldown > 0} onClick={handleResend}>
          <span key={String(cooldown > 0)}>
            {t.resend}
            {cooldown > 0 && <span className="notranslate"> ({cooldown}s)</span>}
          </span>
        </button>
      </p>
      {toastNode}
    </form>
  );
}
