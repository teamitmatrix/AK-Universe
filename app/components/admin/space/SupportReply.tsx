"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { replyAsSupport, setSupportStatus } from "@/lib/admin/support-actions";
import type { TicketStatus } from "@/lib/client/support-content";

export type SupportFormLabels = {
  replyTitle: string;
  hint: string;
  body: string;
  link: string;
  status: string;
  send: string;
  sending: string;
  sent: string;
  statusTitle: string;
  saveStatus: string;
  saved: string;
  statuses: Record<TicketStatus, string>;
  errors: Record<string, string>;
};

/** Reply box and status control of one support request. The reply is stored as a support message. */
export function SupportReply({ reference, status, labels }: { reference: string; status: TicketStatus; labels: SupportFormLabels }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [replyStatus, setReplyStatus] = useState<TicketStatus>("en_attente");
  const [nextStatus, setNextStatus] = useState<TicketStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  useEffect(() => setNextStatus(status), [status]);

  const fail = (code: string) => setError(labels.errors[code] ?? labels.errors.failed ?? code);

  function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await replyAsSupport({ reference, body, link, status: replyStatus }).catch(() => ({ success: false as const, error: "failed" }));
      if (res.success) {
        setBody("");
        setLink("");
        toast(labels.sent);
        router.refresh();
      } else fail(res.error);
    });
  }

  function saveStatus(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await setSupportStatus({ reference, status: nextStatus }).catch(() => ({ success: false as const, error: "failed" }));
      if (res.success) {
        toast(labels.saved);
        router.refresh();
      } else fail(res.error);
    });
  }

  return (
    <div className="adm-stack-forms">
      {error && (
        <p className="adm-error adm-support-error" role="alert">
          {error}
        </p>
      )}
      <form className="adm-support-form" onSubmit={send}>
        <h3>{labels.replyTitle}</h3>
        <p className="adm-support-hint">{labels.hint}</p>
        <label className="adm-field">
          <span>{labels.body}</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={5000} required />
        </label>
        <label className="adm-field">
          <span>{labels.link}</span>
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://drive.google.com/…" />
        </label>
        <label className="adm-field">
          <span>{labels.status}</span>
          <select value={replyStatus} onChange={(e) => setReplyStatus(e.target.value as TicketStatus)}>
            {(Object.keys(labels.statuses) as TicketStatus[]).map((id) => (
              <option key={id} value={id}>
                {labels.statuses[id]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="adm-btn" disabled={busy || body.trim().length < 2}>
          {busy ? labels.sending : labels.send}
        </button>
      </form>

      <form className="adm-support-form" onSubmit={saveStatus}>
        <h3>{labels.statusTitle}</h3>
        <label className="adm-field">
          <span>{labels.status}</span>
          <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as TicketStatus)}>
            {(Object.keys(labels.statuses) as TicketStatus[]).map((id) => (
              <option key={id} value={id}>
                {labels.statuses[id]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="adm-btn is-ghost" disabled={busy || nextStatus === status}>
          {labels.saveStatus}
        </button>
      </form>
      {toastNode}
    </div>
  );
}
