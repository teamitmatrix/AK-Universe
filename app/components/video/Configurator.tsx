"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { discountOf, durationsOf, euro, qtyChoicesOf, qtyWord, resolvedOptions, videoPrice, videoSummary } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { quoteHref } from "@/lib/contact/quote";
import { isDigital, isForfait, serviceOf, useCart } from "./cart";
import { useVideo } from "./context";
import { Examples } from "./Examples";

type Tab = "options" | "exemples" | "faq";

export function Configurator({
  slug,
  editId,
  mode,
  onClose,
}: {
  slug: string;
  editId?: string;
  mode: "add" | "quote";
  onClose: () => void;
}) {
  const router = useRouter();
  const { config } = useVideo();
  const cart = useCart(config);
  const service = serviceOf(config, slug);
  const found = editId ? cart.items.find((item) => item.id === editId) : undefined;
  const existing = found && !isForfait(found) && !isDigital(found) ? found : undefined;
  const quantities = service ? qtyChoicesOf(config, service) : [1];
  const durations = service ? durationsOf(config, service) : [];
  const options = service ? resolvedOptions(config, service) : [];
  const [qty, setQty] = useState(existing?.qty ?? quantities[0]);
  const [dur, setDur] = useState(existing?.dur ?? 0);
  const [opts, setOpts] = useState<string[]>(existing ? [...existing.opts] : []);
  const [tab, setTab] = useState<Tab>("options");
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyOpen = document.body.classList.contains("modal-open");
    document.body.classList.add("modal-open");
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not([hidden]), a, input")].filter(
        (element) => element.offsetParent
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      if (!previouslyOpen) document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!service) return null;

  const draft = { qty, dur, opts };
  const price = videoPrice(config, service, draft);
  const verb = editId ? "Mettre à jour" : mode === "quote" ? "Continuer vers mon devis" : "Ajouter à mon projet";
  const showOptions = !done && tab === "options";

  const submit = () => {
    const data = { slug: service.slug, qty, dur, opts };
    if (editId) cart.update(editId, data);
    else cart.add(data);
    if (mode === "quote") {
      router.push(quoteHref(service.slug));
      return;
    }
    if (editId) {
      onClose();
      return;
    }
    setDone(true);
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cfg-title" ref={dialogRef}>
        <button type="button" className="modal-close" aria-label="Fermer" onClick={onClose} ref={closeRef}>
          <Icon name="x" />
        </button>
        {!done && (
          <div className="tabs" role="tablist">
            {(
              [
                ["options", "Options"],
                ["exemples", "Exemples"],
                ["faq", "FAQ"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {showOptions && (
          <div className="tab-panel">
            <h2 id="cfg-title">Personnalisez votre {service.name.toLowerCase()}</h2>
            {quantities.length > 1 && (
              <div className="cfg-group">
                <span className="cfg-label">{service.qtyLabel || "Nombre de vidéos"}</span>
                <div className="seg" role="radiogroup" aria-label={service.qtyLabel || "Nombre de vidéos"}>
                  {quantities.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      role="radio"
                      aria-checked={qty === amount}
                      onClick={() => setQty(amount)}
                    >
                      {qtyWord(service, amount)}
                      {discountOf(config, service, amount) ? <span className="pill">-{discountOf(config, service, amount)}%</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="cfg-group">
              <span className="cfg-label">{service.durations ? "Format / durée" : "Durée par vidéo"}</span>
              <div className="seg" role="radiogroup" aria-label="Durée">
                {durations.map((duration, index) => (
                  <button key={duration.label} type="button" role="radio" aria-checked={dur === index} onClick={() => setDur(index)}>
                    {duration.label}
                    {duration.extra ? <small>+{euro(duration.extra)}</small> : null}
                  </button>
                ))}
              </div>
            </div>
            <ul className="cfg-options">
              {options.map((option) => (
                <li key={option.id}>
                  <label className="cfg-opt">
                    <Icon name={option.icon || "sparkle"} />
                    <span>{option.label}</span>
                    <span className="cfg-price">
                      + {euro(option.price)}
                      {option.per === "video" && quantities.length > 1 ? " / unité" : ""}
                    </span>
                    <span className="switch dark">
                      <input
                        type="checkbox"
                        checked={opts.includes(option.id)}
                        onChange={(event) =>
                          setOpts((current) =>
                            event.target.checked ? [...current, option.id] : current.filter((id) => id !== option.id)
                          )
                        }
                      />
                      <span />
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary btn-block btn-lg cfg-submit" onClick={submit}>
              <Icon name="cart" /> {verb} – {euro(price)}
            </button>
            <p className="cfg-note">Prix indicatif, ajusté selon vos besoins.</p>
          </div>
        )}
        {!done && tab === "exemples" && (
          <div className="tab-panel">
            <Examples service={service} className="examples-grid compact" onAdd={() => setTab("options")} />
          </div>
        )}
        {!done && tab === "faq" && (
          <div className="tab-panel">
            {(config.faq ?? []).map((entry) => (
              <details key={entry.q} className="faq">
                <summary>
                  {entry.q}
                  <Icon name="chev-down" />
                </summary>
                <p>{entry.a}</p>
              </details>
            ))}
          </div>
        )}
        {done && (
          <div className="cfg-done">
            <span className="done-ic">
              <Icon name="check" />
            </span>
            <h2 id="cfg-title">{editId ? "Service mis à jour" : "Ajouté à votre projet"}</h2>
            <p className="done-summary">
              {service.name} — {videoSummary(config, service, draft)} — {euro(price)} HT
            </p>
            <div className="cta-row center">
              <a href="/projet" className="btn btn-primary">
                Voir mon projet <Icon name="arrow" />
              </a>
              <a href="/services" className="btn btn-outline">
                Ajouter un autre service
              </a>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
