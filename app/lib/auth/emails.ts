import "server-only";
import type { User } from "@supabase/supabase-js";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Account e-mails sent through Resend. Supabase still creates and checks the codes/links
 * (auth.admin.generateLink returns them without sending anything); only the delivery is ours.
 */

export type AuthEmail = "signup" | "login" | "reset" | "password_changed";

const TEXT = {
  fr: {
    signup: {
      subject: (code: string) => `${code} — votre code de vérification AK Universe`,
      title: "Confirmez votre adresse e-mail",
      intro: "Bienvenue chez AK Universe ! Saisissez ce code sur la page d'inscription pour activer votre compte :",
    },
    login: {
      subject: (code: string) => `${code} — votre code de connexion AK Universe`,
      title: "Code de connexion",
      intro: "Pour terminer votre connexion, saisissez ce code :",
    },
    reset: {
      subject: () => "Réinitialisez votre mot de passe AK Universe",
      title: "Réinitialisation du mot de passe",
      intro: "Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Le lien est valable une seule fois.",
      button: "Choisir un nouveau mot de passe",
    },
    password_changed: {
      subject: () => "Votre mot de passe AK Universe a été modifié",
      title: "Mot de passe modifié",
      intro: "Le mot de passe de votre compte AK Universe vient d'être modifié.",
    },
    validity: "Ce code est personnel et valable pendant une durée limitée. Ne le communiquez à personne.",
    notYou: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    changedNotYou: "Si vous n'êtes pas à l'origine de ce changement, réinitialisez immédiatement votre mot de passe et répondez à cet e-mail.",
    signature: "L'équipe AK Universe",
  },
  en: {
    signup: {
      subject: (code: string) => `${code} — your AK Universe verification code`,
      title: "Confirm your email address",
      intro: "Welcome to AK Universe! Enter this code on the sign-up page to activate your account:",
    },
    login: {
      subject: (code: string) => `${code} — your AK Universe sign-in code`,
      title: "Sign-in code",
      intro: "To finish signing in, enter this code:",
    },
    reset: {
      subject: () => "Reset your AK Universe password",
      title: "Password reset",
      intro: "Click the button below to choose a new password. The link can only be used once.",
      button: "Choose a new password",
    },
    password_changed: {
      subject: () => "Your AK Universe password was changed",
      title: "Password changed",
      intro: "The password of your AK Universe account has just been changed.",
    },
    validity: "This code is personal and valid for a limited time. Never share it.",
    notYou: "If you did not request this, you can ignore this email.",
    changedNotYou: "If you did not make this change, reset your password immediately and reply to this email.",
    signature: "The AK Universe team",
  },
};

const muted = (text: string) => `<p style="margin:16px 0 0;color:#a89c8e;font-size:13px">${text}</p>`;

function build(kind: AuthEmail, lang: string | undefined, value: string) {
  const t = lang === "en" ? TEXT.en : TEXT.fr;
  const k = t[kind];
  let body: string;
  let text: string;
  if (kind === "signup" || kind === "login") {
    body = `<p style="margin:0 0 20px">${k.intro}</p>
<p style="margin:0 0 8px;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#fdb942">${escapeHtml(value)}</p>
${muted(t.validity)}${muted(t.notYou)}`;
    text = `${k.intro}\n\n${value}\n\n${t.validity}\n${t.notYou}\n\n${t.signature}`;
  } else if (kind === "reset") {
    const button = (k as typeof t.reset).button;
    body = `<p style="margin:0 0 24px">${k.intro}</p>
<p style="margin:0 0 8px;text-align:center"><a href="${escapeHtml(value)}" style="display:inline-block;background:#fdb942;color:#1b1206;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px">${button}</a></p>
${muted(t.notYou)}`;
    text = `${k.intro}\n\n${value}\n\n${t.notYou}\n\n${t.signature}`;
  } else {
    body = `<p style="margin:0">${k.intro}</p>${muted(t.changedNotYou)}`;
    text = `${k.intro}\n\n${t.changedNotYou}\n\n${t.signature}`;
  }
  return { subject: k.subject(value), html: emailLayout(k.title, body), text };
}

/** At most one account e-mail per minute and 5 per hour for each user (stored in the user's app_metadata). */
const MIN_GAP_MS = 60_000;
const HOURLY_MAX = 5;

async function allowSend(user: User) {
  const now = Date.now();
  const log = ((user.app_metadata?.aku_auth_mail as number[] | undefined) ?? []).filter((t) => now - t < 3_600_000);
  if (log.length >= HOURLY_MAX || (log.length && now - log[log.length - 1] < MIN_GAP_MS)) return false;
  await createAdminClient().auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, aku_auth_mail: [...log, now] },
  });
  return true;
}

/** Returns "rate_limited" when the user asked for too many e-mails, so the UI can say "wait a minute". */
export async function sendAuthEmail(
  kind: AuthEmail,
  user: User,
  /** The code or link; a function is only called once the rate limit allows the e-mail (a new code replaces the previous one). */
  value: string | (() => Promise<string>),
  lang?: string
) {
  if (kind !== "password_changed" && !(await allowSend(user))) return "rate_limited" as const;
  const resolved = typeof value === "function" ? await value() : value;
  const sent = await sendEmail({ to: user.email!, ...build(kind, lang, resolved) });
  return sent ? ("sent" as const) : ("failed" as const);
}

/** A fresh 6-digit code for an existing user (Supabase magic-link OTP, checked with verifyOtp type "email"). */
export async function newEmailCode(email: string) {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.email_otp) throw error ?? new Error("No e-mail code returned.");
  return data.properties.email_otp;
}
