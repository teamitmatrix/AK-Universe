"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { submitContactMessage } from "@/lib/contact/actions";
import type { QuoteServiceOption } from "@/lib/contact/quote";
import { CONTACT_SUBJECTS, QUOTE_SUBJECT } from "@/lib/contact/subjects";

type Field = "name" | "email" | "company" | "phone" | "subject" | "service" | "message";

const INITIAL = {
  name: "",
  email: "",
  company: "",
  phone: "",
  subject: "",
  service: "",
  message: "",
};

export function ContactForm({
  services,
  initialSubject = "",
  initialService = "",
}: {
  services: QuoteServiceOption[];
  initialSubject?: string;
  initialService?: string;
}) {
  const [values, setValues] = useState({
    ...INITIAL,
    subject: initialSubject,
    service: initialService,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);
  const [sentQuote, setSentQuote] = useState(false);
  const [pending, startTransition] = useTransition();
  const quote = values.subject === QUOTE_SUBJECT;

  const set =
    (field: Field) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      if (fieldErrors[field]) setFieldErrors((errs) => ({ ...errs, [field]: undefined }));
    };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    startTransition(async () => {
      const result = await submitContactMessage({
        ...values,
        service: values.subject === QUOTE_SUBJECT ? values.service : "",
      });
      if (result.success) {
        setSentQuote(values.subject === QUOTE_SUBJECT);
        setSent(true);
        setValues(INITIAL);
        setFieldErrors({});
        return;
      }
      setFormError(result.error);
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
    });
  };

  if (sent) {
    return (
      <div className="contact-form-card contact-success" role="status">
        <span className="icon-circle contact-success-icon">
          <Icon name="check-circle" />
        </span>
        <h2>{sentQuote ? "Votre demande de devis a bien été envoyée." : "Message envoyé"}</h2>
        <p>
          {sentQuote
            ? "Notre équipe étudie votre projet et vous répond dès que possible."
            : "Merci pour votre message. Notre équipe vous répondra dès que possible."}
        </p>
        <button
          type="button"
          className="btn btn-outline-gold"
          onClick={() => {
            setSent(false);
            setFormError("");
          }}
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form-card" onSubmit={onSubmit} noValidate>
      <p className="contact-form-eyebrow">Envoyez-nous un message</p>
      <h2 className="sr-only">Formulaire de contact</h2>

      <div className="d-row">
        <div className="d-field">
          <label htmlFor="contact-name">
            Nom complet <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            value={values.name}
            onChange={set("name")}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
          />
          {fieldErrors.name ? (
            <p id="contact-name-error" className="contact-field-error">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div className="d-field">
          <label htmlFor="contact-email">
            E-mail <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={160}
            value={values.email}
            onChange={set("email")}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="contact-email-error" className="contact-field-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="d-row">
        <div className="d-field">
          <label htmlFor="contact-company">Entreprise</label>
          <input
            id="contact-company"
            name="company"
            type="text"
            autoComplete="organization"
            maxLength={120}
            value={values.company}
            onChange={set("company")}
          />
        </div>
        <div className="d-field">
          <label htmlFor="contact-phone">Téléphone</label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={values.phone}
            onChange={set("phone")}
          />
        </div>
      </div>

      <div className="d-field">
        <label htmlFor="contact-subject">
          Sujet <span className="req" aria-hidden="true">*</span>
        </label>
        <select
          id="contact-subject"
          name="subject"
          required
          value={values.subject}
          onChange={set("subject")}
          aria-invalid={Boolean(fieldErrors.subject)}
          aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
        >
          <option value="" disabled>
            Choisir un sujet
          </option>
          {CONTACT_SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
        {fieldErrors.subject ? (
          <p id="contact-subject-error" className="contact-field-error">
            {fieldErrors.subject}
          </p>
        ) : null}
      </div>

      {quote ? (
        <div className="d-field">
          <label htmlFor="contact-service">Service</label>
          <select
            id="contact-service"
            name="service"
            value={values.service}
            onChange={set("service")}
            aria-invalid={Boolean(fieldErrors.service)}
            aria-describedby={fieldErrors.service ? "contact-service-error" : undefined}
          >
            <option value="">Aucun service en particulier</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
              </option>
            ))}
          </select>
          {fieldErrors.service ? (
            <p id="contact-service-error" className="contact-field-error">
              {fieldErrors.service}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="d-field">
        <label htmlFor="contact-message">
          Votre message <span className="req" aria-hidden="true">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={4000}
          placeholder={quote ? "Décrivez votre projet" : undefined}
          value={values.message}
          onChange={set("message")}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
        />
        {fieldErrors.message ? (
          <p id="contact-message-error" className="contact-field-error">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p className="contact-form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer mon message"} <Icon name="arrow" />
      </button>

      <p className="contact-privacy">
        Consulter la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>
      </p>
    </form>
  );
}
