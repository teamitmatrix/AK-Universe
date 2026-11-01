"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aku-cookie-notice";
const HIDDEN_ON = ["/admin.html"];

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
// Fallback when storage is blocked (private mode): the notice stays closed for this page view.
let closed = false;
const dismissed = () => {
  if (closed) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * The site only sets cookies needed for the service (session, language, payment), which need no consent
 * under the CNIL rules; visitors are still told once, with a link to the policy.
 */
export function CookieNotice() {
  const hidden = useSyncExternalStore(subscribe, dismissed, () => true);
  const pathname = usePathname();
  if (hidden || HIDDEN_ON.includes(pathname)) return null;

  const close = () => {
    closed = true;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    listeners.forEach((listener) => listener());
  };

  return (
    <div className="cookie-notice" role="region" aria-label="Cookies">
      <p>
        Ce site utilise uniquement des cookies nécessaires à son fonctionnement (session, langue, paiement), sans
        publicité ni mesure d&apos;audience. <a href="/confidentialite.html#cookies">En savoir plus</a>
      </p>
      <button type="button" className="btn btn-primary" onClick={close}>
        OK
      </button>
    </div>
  );
}
