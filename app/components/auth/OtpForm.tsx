"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { safeRedirect } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";
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
    deliveryNote:
      "Le code peut mettre 1 à 2 minutes à arriver. Patientez, puis réessayez « Renvoyer un code » si besoin.",
    spamNote: "Code non reçu ? Pensez à vérifier vos spams ou courriers indésirables.",
    incomplete: "Saisissez les 6 chiffres du code.",
    resent: "Un nouveau code a été envoyé.",
    resendFailed: "Impossible d'envoyer un nouveau code pour le moment.",
    wait: "Trop de codes demandés. Patientez quelques minutes avant d'en demander un autre.",
    missingEmail: "Adresse e-mail manquante. Recommencez l'inscription.",
    expired: "Ce code a expiré. Demandez-en un nouveau.",
    incorrect: "Le code saisi est incorrect.",
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
    deliveryNote: "The code may take 1–2 minutes to arrive. Wait, then try “Resend a code” again if needed.",
    spamNote: "Didn't get the code? Check your spam or junk folder.",
    incomplete: "Enter all 6 digits of the code.",
    resent: "A new code has been sent.",
    resendFailed: "Unable to send a new code right now.",
    wait: "Too many codes requested. Please wait a few minutes before asking for another one.",
    missingEmail: "Email address missing. Please start the sign-up again.",
    expired: "This code has expired. Please request a new one.",
    incorrect: "The code you entered is incorrect.",
    failed: "Verification failed. Please try again.",
  },
};

type ErrorKey = "missingEmail" | "expired" | "incorrect" | "failed" | "";
type OtpApiResult = { success: boolean; code?: string };

async function postOtp(body: Record<string, string>): Promise<OtpApiResult> {
  const res = await fetch("/api/auth/otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  let data: OtpApiResult | null = null;
  try {
    data = (await res.json()) as OtpApiResult;
  } catch {
    data = null;
  }
  if (!data || typeof data.success !== "boolean") {
    return { success: false, code: "unknown" };
  }
  return data;
}

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
  const [error, setError] = useState<ErrorKey>("");
  const [cooldown, setCooldown] = useState(0);
  const [expiryVersion, setExpiryVersion] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const submitting = useRef(false);
  const expiredLocally = useRef(false);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    expiredLocally.current = false;
    const timer = window.setTimeout(() => {
      expiredLocally.current = true;
    }, 15 * 60_000);
    return () => window.clearTimeout(timer);
  }, [email, loginStep, expiryVersion]);

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
    if (submitting.current) return;
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
    submitting.current = true;
    setLoading(true);
    try {
      // Verify directly with Supabase in the browser. This is the same flow that worked
      // on the translations branch and avoids nginx/Next Server Action 502 responses.
      const { data, error: verifyError } = await createClient().auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "email",
      });
      if (verifyError || !data.user) {
        setError(expiredLocally.current ? "expired" : "incorrect");
        setDigits(Array(LENGTH).fill(""));
        focus(0);
        return;
      }

      // Best effort only: clears the pending OTP cookie and remembers this browser when requested.
      // The Supabase session is already established, so a failure here must never block sign-in.
      void postOtp({ action: "finalize", userId: data.user.id }).catch(() => undefined);

      router.replace(safeRedirect(params.get("redirectTo"), loginStep ? "/" : "/organisation"));
      router.refresh();
    } catch {
      setError("failed");
      setDigits(Array(LENGTH).fill(""));
      focus(0);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setCooldown(60);
    setError("");
    try {
      const result = await postOtp({
        action: "resend",
        step: loginStep ? "login" : "signup",
        email,
        lang: textLang(lang),
      });
      if (result.success) {
        toast(t.resent);
        setDigits(Array(LENGTH).fill(""));
        setExpiryVersion((version) => version + 1);
        focus(0);
        return;
      }
      if (result.code === "rate_limited") toast(t.wait);
      else if (result.code === "otp_expired") setError("expired");
      else toast(t.resendFailed);
    } catch {
      toast(t.resendFailed);
    }
  }

  return (
    <form className="auth-form center auth-otp-form" id="otp-form" onSubmit={handleSubmit}>
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
      <p className="otp-note">{t.deliveryNote}</p>
      <p className="otp-note">{t.spamNote}</p>
      {toastNode}
    </form>
  );
}
