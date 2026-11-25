"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eraser, PenLine } from "lucide-react";

type Props = {
  /** Share token — when set on an open devis, the client can sign. */
  shareToken?: string | null;
  kind: "devis" | "facture";
  status: string;
  clientSignature: string | null;
  signerName: string | null;
  signedAt: string | null;
  defaultSignerName?: string;
};

const ERRORS: Record<string, string> = {
  empty: "Veuillez tracer votre signature dans le cadre.",
  invalid: "Indiquez votre nom et votre signature.",
  already_signed: "Ce devis a déjà été accepté.",
  not_open: "Ce devis n'est plus ouvert à la signature.",
  not_quote: "Seuls les devis peuvent être signés ici.",
  not_found: "Document introuvable.",
  too_large: "Signature trop volumineuse. Réessayez avec un trait plus simple.",
  failed: "Enregistrement impossible. Réessayez.",
};

function dateTimeFr(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Signature block on the printable sheet: pad to accept, or the saved image once signed. */
export function DocSignature({
  shareToken,
  kind,
  status,
  clientSignature,
  signerName,
  signedAt,
  defaultSignerName = "",
}: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [name, setName] = useState(defaultSignerName);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const canSign = kind === "devis" && status === "en_attente" && Boolean(shareToken) && !clientSignature;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canSign) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = canvas.clientWidth || 320;
    const cssH = canvas.clientHeight || 110;
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1612";
    hasInk.current = false;
  }, [canSign]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasInk.current = true;
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function clearPad() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    setError("");
  }

  function accept() {
    setError("");
    if (!shareToken) return;
    if (name.trim().length < 2) {
      setError(ERRORS.invalid);
      return;
    }
    if (!hasInk.current || !canvasRef.current) {
      setError(ERRORS.empty);
      return;
    }
    const signature = canvasRef.current.toDataURL("image/png");
    start(async () => {
      const res = await fetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: shareToken, signerName: name.trim(), signature }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(ERRORS[data.error ?? ""] ?? ERRORS.failed);
        return;
      }
      router.refresh();
    });
  }

  if (clientSignature) {
    return (
      <div className="doc-sign is-signed">
        <span>Date et signature du client :</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- stored data URL must print as-is */}
        <img src={clientSignature} alt={`Signature ${signerName ?? ""}`.trim()} className="doc-sign-img" />
        <p className="doc-sign-meta">
          {signerName ? <strong>{signerName}</strong> : null}
          {signerName && signedAt ? " — " : null}
          {signedAt ? `Signé électroniquement le ${dateTimeFr(signedAt)}` : "Signé électroniquement"}
        </p>
      </div>
    );
  }

  if (!canSign) {
    return (
      <div className="doc-sign">
        <span>Date et signature du client :</span>
      </div>
    );
  }

  return (
    <div className="doc-sign-pad no-print">
      <p className="doc-sign-pad-title">
        <PenLine size={16} aria-hidden="true" /> Accepter et signer électroniquement
      </p>
      <p className="doc-sign-pad-hint">
        En signant, vous acceptez ce devis (mention « Bon pour accord »). Votre signature est enregistrée avec la date et
        l&apos;heure.
      </p>
      <label className="doc-sign-field">
        <span>Nom du signataire</span>
        <input
          type="text"
          value={name}
          maxLength={120}
          autoComplete="name"
          placeholder="Prénom Nom"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="doc-sign-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="doc-sign-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <span className="doc-sign-canvas-label">Signez ici</span>
      </div>
      {error ? (
        <p className="doc-sign-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="doc-sign-actions">
        <button type="button" className="doc-btn is-ghost" onClick={clearPad} disabled={pending}>
          <Eraser size={15} aria-hidden="true" /> Effacer
        </button>
        <button type="button" className="doc-btn" onClick={accept} disabled={pending}>
          <Check size={15} aria-hidden="true" /> {pending ? "Enregistrement…" : "Signer et accepter le devis"}
        </button>
      </div>
    </div>
  );
}
