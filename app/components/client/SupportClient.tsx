"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, LoaderCircle, Mail, MessageCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { createSupportTicket, markTicketResolved, replyToTicket } from "@/lib/client/support-actions";
import {
  HELP_CATEGORIES,
  SUPPORT_HOURS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  searchHelp,
  type HelpCategory,
  type TicketCategory,
} from "@/lib/client/support-content";
import { Modal } from "./PlanManager";
import { Swoosh } from "./Swoosh";

const ERRORS: Record<string, string> = {
  forbidden: "Votre session a expiré. Reconnectez-vous pour continuer.",
  invalid: "Vérifiez les champs indiqués.",
  link: "Le lien doit être un partage Google Drive, Dropbox, WeTransfer, Frame.io ou OneDrive (https).",
  rate_limited: "Vous avez créé plusieurs demandes en peu de temps. Réessayez dans une heure ou complétez une demande existante.",
  notReady: "Le support en ligne sera disponible très prochainement. Contactez-nous par e-mail en attendant.",
  closed: "Cette demande est fermée. Créez une nouvelle demande si besoin.",
  notFound: "Demande introuvable.",
  failed: "Une erreur est survenue. Votre demande n'a pas été envoyée. Réessayez dans un instant.",
};
const FIELD_ERRORS: Record<string, string> = {
  subject: "Indiquez un sujet (3 caractères minimum).",
  category: "Choisissez une catégorie.",
  description: "Décrivez votre demande (10 caractères minimum).",
  body: "Écrivez votre message.",
};

/* ================= Hero: create a request / live chat ================= */

export function SupportHero({ ready, openInitially, defaultCategory }: { ready: boolean; openInitially: boolean; defaultCategory: TicketCategory | null }) {
  const [open, setOpen] = useState(openInitially && ready);
  const [chat, setChat] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // The live assistant is the site chat widget; it is only offered when it is switched on.
  useEffect(() => {
    let alive = true;
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => alive && setChat(d.enabled === true))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="cs-support-hero" aria-labelledby="cs-sup-title">
      <Swoosh className="cs-offer-swoosh" id="cs-sup" />
      <h2 id="cs-sup-title">Contactez notre support</h2>
      <p>Notre équipe vous répond {SUPPORT_HOURS}.</p>
      <div className="cs-support-ctas">
        <button type="button" className="cs-act is-primary cs-act-fit" onClick={() => setOpen(true)} disabled={!ready} title={ready ? undefined : ERRORS.notReady}>
          <Mail className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>Créer une demande</span>
        </button>
        <button
          type="button"
          className="cs-btn-ghost-light"
          onClick={() => (chat ? window.dispatchEvent(new Event("aku:open-chat")) : setOpen(true))}
          title={chat ? "Assistant disponible immédiatement" : "Assistant indisponible : créez une demande"}
        >
          <MessageCircle size={22} strokeWidth={1.8} aria-hidden="true" /> Discuter en direct
        </button>
      </div>
      {open && <TicketModal onClose={close} defaultCategory={defaultCategory} />}
    </section>
  );
}

function TicketModal({ onClose, defaultCategory }: { onClose: () => void; defaultCategory: TicketCategory | null }) {
  const router = useRouter();
  const [form, setForm] = useState({ subject: "", category: defaultCategory ?? "", priority: "normale", description: "", link: "" });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createSupportTicket(form).catch(() => ({ success: false as const, error: "failed" as const, field: undefined }));
      if (res.success) {
        setCreated(res.reference);
        router.refresh();
      } else setError({ message: res.error === "invalid" && res.field ? (FIELD_ERRORS[res.field] ?? ERRORS.invalid) : (ERRORS[res.error] ?? ERRORS.failed), field: res.field });
    });
  }

  if (created) {
    return (
      <Modal title="Demande envoyée" onClose={onClose}>
        <div className="cs-review cs-sent">
          <CircleCheck size={40} strokeWidth={1.6} className="cs-sent-icon" aria-hidden="true" />
          <p>
            Votre demande <strong className="notranslate">{created}</strong> a bien été enregistrée. Un e-mail de confirmation vous a été envoyé et notre équipe
            vous répond {SUPPORT_HOURS}.
          </p>
          <div className="cs-modal-actions">
            <button type="button" className="cs-btn-outline" onClick={onClose}>
              Fermer
            </button>
            <Link href={`/client/dashboard/support/demandes/${created}`} className="cs-act is-primary cs-act-fit">
              <span>Suivre ma demande</span>
              <ArrowRight className="cs-act-arrow" size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Créer une demande" onClose={onClose}>
      <form className="cs-form" onSubmit={submit} noValidate>
        <div className="cs-form-grid">
          <label className="cs-field cs-field-wide">
            <span>
              Sujet<em aria-hidden="true"> *</em>
            </span>
            <input value={form.subject} onChange={set("subject")} maxLength={150} required aria-invalid={error?.field === "subject" || undefined} placeholder="Ex. : Question sur ma dernière facture" />
          </label>
          <label className="cs-field">
            <span>
              Catégorie<em aria-hidden="true"> *</em>
            </span>
            <select value={form.category} onChange={set("category")} required aria-invalid={error?.field === "category" || undefined}>
              <option value="" disabled>
                Choisir…
              </option>
              {Object.entries(TICKET_CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="cs-field">
            <span>Priorité</span>
            <select value={form.priority} onChange={set("priority")}>
              {Object.entries(TICKET_PRIORITIES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="cs-field cs-field-wide">
            <span>
              Description<em aria-hidden="true"> *</em>
            </span>
            <textarea value={form.description} onChange={set("description")} rows={6} maxLength={5000} required aria-invalid={error?.field === "description" || undefined} placeholder="Décrivez votre besoin ou le problème rencontré, avec le plus de détails possible." />
          </label>
          <label className="cs-field cs-field-wide">
            <span>Pièce jointe (lien de partage, facultatif)</span>
            <input type="url" value={form.link} onChange={set("link")} inputMode="url" aria-invalid={error?.field === "link" || undefined} placeholder="https://drive.google.com/…" />
            <small className="cs-field-help">Capture, document… partagé via Google Drive, Dropbox, WeTransfer, Frame.io ou OneDrive.</small>
          </label>
        </div>
        {error && (
          <p className="cs-form-error" role="alert">
            {error.message}
          </p>
        )}
        <div className="cs-modal-actions">
          <button type="button" className="cs-btn-outline" onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="cs-act is-primary cs-act-fit" disabled={busy}>
            {busy && <LoaderCircle className="cs-spin" size={18} aria-hidden="true" />}
            <span>{busy ? "Envoi…" : "Envoyer ma demande"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ================= Help centre search (support page card) ================= */

export function HelpSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className="cs-help-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/client/dashboard/support/aide${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <Search size={20} aria-hidden="true" />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans le centre d'aide…" aria-label="Rechercher dans le centre d'aide" maxLength={80} />
    </form>
  );
}

/* ================= Help centre page ================= */

export function HelpCenter({ initialQuery, initialCategory }: { initialQuery: string; initialCategory: HelpCategory | null }) {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState<HelpCategory | null>(initialCategory);
  const results = useMemo(() => searchHelp(q, category), [q, category]);
  return (
    <section className="cs-card" aria-labelledby="cs-help-title">
      <h2 id="cs-help-title" className="cs-card-title">
        Centre d&apos;aide
      </h2>
      <p className="cs-card-sub">Trouvez rapidement une réponse à vos questions.</p>
      <div className="cs-help-search">
        <Search size={20} aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans le centre d'aide…" aria-label="Rechercher dans le centre d'aide" maxLength={80} />
      </div>
      <div className="cs-chips" role="group" aria-label="Catégories">
        <button type="button" className={category === null ? "cs-chip is-on" : "cs-chip"} aria-pressed={category === null} onClick={() => setCategory(null)}>
          Tout
        </button>
        {(Object.keys(HELP_CATEGORIES) as HelpCategory[]).map((c) => (
          <button key={c} type="button" className={category === c ? "cs-chip is-on" : "cs-chip"} aria-pressed={category === c} onClick={() => setCategory(c)}>
            {HELP_CATEGORIES[c]}
          </button>
        ))}
      </div>
      {results.length ? (
        <div className="cs-faq">
          {results.map((a) => (
            <details key={a.id} open={results.length <= 2}>
              <summary>{a.q}</summary>
              <p>{a.a}</p>
              {a.link && (
                <Link href={a.link.href} className="cs-link-btn">
                  {a.link.label} →
                </Link>
              )}
            </details>
          ))}
        </div>
      ) : (
        <p className="cs-empty">
          Aucun article ne correspond à votre recherche.{" "}
          <Link href="/client/dashboard/support?demande=1" className="cs-link-btn">
            Posez votre question au support
          </Link>
        </p>
      )}
    </section>
  );
}

/* ================= Ticket page: reply / mark resolved ================= */

export function TicketReply({ reference, status }: { reference: string; status: string }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const closed = status === "ferme";

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await replyToTicket({ reference, body, link }).catch(() => ({ success: false as const, error: "failed" as const, field: undefined }));
      if (res.success) {
        setBody("");
        setLink("");
        toast("Votre message a été envoyé au support.");
        router.refresh();
      } else setError(res.error === "invalid" && res.field ? (FIELD_ERRORS[res.field] ?? ERRORS.invalid) : (ERRORS[res.error] ?? ERRORS.failed));
    });
  }

  function resolve() {
    start(async () => {
      const res = await markTicketResolved({ reference }).catch(() => ({ success: false as const, error: "failed" as const }));
      if (res.success) {
        toast("Demande marquée comme résolue.");
        router.refresh();
      } else setError(ERRORS[res.error] ?? ERRORS.failed);
    });
  }

  if (closed) return <p className="cs-hint">Cette demande est fermée. Pour une nouvelle question, créez une nouvelle demande.</p>;
  return (
    <form className="cs-form cs-reply" onSubmit={send} noValidate>
      <label className="cs-field">
        <span>Votre message</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} placeholder="Ajoutez une précision ou répondez au support…" />
      </label>
      <label className="cs-field">
        <span>Lien de partage (facultatif)</span>
        <input type="url" value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://drive.google.com/…" />
      </label>
      {error && (
        <p className="cs-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="cs-modal-actions">
        {status !== "resolu" && (
          <button type="button" className="cs-btn-outline" onClick={resolve} disabled={busy}>
            Marquer comme résolue
          </button>
        )}
        <button type="submit" className="cs-act is-primary cs-act-fit" disabled={busy || body.trim().length < 2}>
          {busy && <LoaderCircle className="cs-spin" size={18} aria-hidden="true" />}
          <span>{status === "resolu" ? "Rouvrir et envoyer" : "Envoyer"}</span>
        </button>
      </div>
      {toastNode}
    </form>
  );
}
