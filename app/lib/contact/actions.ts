"use server";

import { sendContactEmails } from "@/lib/contact/emails";
import { quoteServiceLabel } from "@/lib/contact/services";
import { QUOTE_SUBJECT, isContactSubject } from "@/lib/contact/subjects";

type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  service?: string;
  message: string;
};

type FieldErrors = Partial<Record<keyof ContactPayload, string>>;

type ContactResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: FieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = {
  name: 120,
  email: 160,
  company: 120,
  phone: 40,
  message: 4000,
} as const;

/** Best-effort anti-spam in this process (resets on cold start). */
const recent = new Map<string, number[]>();
const MAX_PER_EMAIL = 5;
const WINDOW_MS = 15 * 60 * 1000;

function rateLimited(email: string) {
  const now = Date.now();
  const key = email.toLowerCase();
  const stamps = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX_PER_EMAIL) {
    recent.set(key, stamps);
    return true;
  }
  stamps.push(now);
  recent.set(key, stamps);
  return false;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function submitContactMessage(raw: ContactPayload): Promise<ContactResult> {
  const name = clean(raw.name, MAX.name);
  const email = clean(raw.email, MAX.email);
  const company = clean(raw.company, MAX.company);
  const phone = clean(raw.phone, MAX.phone);
  const subject = clean(raw.subject, 80);
  const serviceId = subject === QUOTE_SUBJECT ? clean(raw.service, 160) : "";
  const service = serviceId ? quoteServiceLabel(serviceId) : "";
  const message = clean(raw.message, MAX.message);

  const fieldErrors: FieldErrors = {};

  if (!name) fieldErrors.name = "Indiquez votre nom.";
  if (!email) fieldErrors.email = "Indiquez votre e-mail.";
  else if (!EMAIL_RE.test(email)) fieldErrors.email = "E-mail invalide.";
  if (!isContactSubject(subject)) fieldErrors.subject = "Choisissez un sujet.";
  if (serviceId && !service) fieldErrors.service = "Choisissez un service de la liste.";
  if (!message) fieldErrors.message = "Écrivez votre message.";
  else if (message.length < 10) fieldErrors.message = "Message trop court.";

  if (Object.keys(fieldErrors).length) {
    return { success: false, error: "Vérifiez les champs obligatoires.", fieldErrors };
  }

  if (rateLimited(email)) {
    return {
      success: false,
      error: "Trop de messages envoyés avec cet e-mail. Réessayez dans quelques minutes.",
    };
  }

  const sent = await sendContactEmails({ name, email, company, phone, subject, service, message });
  if (!sent) {
    return {
      success: false,
      error: "Impossible d’envoyer le message pour le moment. Réessayez ou écrivez-nous par e-mail.",
    };
  }

  return { success: true };
}
