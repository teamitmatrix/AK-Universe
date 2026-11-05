"use client";

import { useSyncExternalStore } from "react";
import { videoPrice, videoSummary } from "@/lib/projects/quote-math";
import type { VideoConfig } from "@/lib/video-config";

const KEY = "aku-projet";
const CLIENT_KEY = "aku-client";
const LAST_KEY = "aku-derniere-demande";

export type CartService = { id: string; slug: string; qty: number; dur: number; opts: string[] };
export type CartForfait = { id: string; type: "forfait"; key: string };
export type CartItem = CartService | CartForfait;

export type ClientInfo = {
  prenom: string;
  nom: string;
  entreprise: string;
  email: string;
  tel: string;
  lieu: string;
  date: string;
  message: string;
};

export type LastRequest = {
  type: "devis" | "acompte";
  ref: string;
  date: string;
  client: ClientInfo;
  total: number;
  acompte: number;
  depositPercent: number;
};

const CLIENT_FIELDS = ["prenom", "nom", "entreprise", "email", "tel", "lieu", "date", "message"] as const;

export function isForfait(item: CartItem): item is CartForfait {
  return "type" in item && item.type === "forfait";
}

function isStored(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string") return false;
  if (item.type === "forfait") return typeof item.key === "string";
  return (
    typeof item.slug === "string" &&
    typeof item.qty === "number" &&
    typeof item.dur === "number" &&
    Array.isArray(item.opts) &&
    item.opts.every((option) => typeof option === "string")
  );
}

function parse(raw: string | null): CartItem[] {
  try {
    const data = JSON.parse(raw ?? "null");
    return Array.isArray(data) ? data.filter(isStored) : [];
  } catch {
    return [];
  }
}

let snapshot: CartItem[] = [];
let ready = false;
const listeners = new Set<() => void>();
const SERVER_ITEMS: CartItem[] = [];

function publish(items: CartItem[]) {
  snapshot = items;
  ready = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* Storage can be blocked; the cart still works for this page view. */
  }
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  if (!ready && typeof window !== "undefined") {
    try {
      snapshot = parse(localStorage.getItem(KEY));
    } catch {
      snapshot = [];
    }
    ready = true;
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    snapshot = parse(event.newValue);
    ready = true;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function serviceOf(config: VideoConfig, slug: string) {
  return config.services.find((service) => service.slug === slug);
}

export function planOf(config: VideoConfig, key: string) {
  return config.marketing?.plans?.find((plan) => plan.key === key);
}

export function visibleItems(config: VideoConfig, items: CartItem[]) {
  return items.filter((item) => (isForfait(item) ? !!planOf(config, item.key) : !!serviceOf(config, item.slug)));
}

export function itemPrice(config: VideoConfig, item: CartItem) {
  if (isForfait(item)) return planOf(config, item.key)?.price ?? 0;
  const service = serviceOf(config, item.slug);
  return service ? videoPrice(config, service, item) : 0;
}

export function itemSummary(config: VideoConfig, item: CartItem) {
  if (isForfait(item)) {
    const plan = planOf(config, item.key);
    return plan ? `Abonnement mensuel • ${plan.tagline}` : "Abonnement mensuel";
  }
  const service = serviceOf(config, item.slug);
  return service ? videoSummary(config, service, item) : "";
}

export function itemName(config: VideoConfig, item: CartItem) {
  if (isForfait(item)) {
    const plan = planOf(config, item.key);
    return plan ? `Forfait ${plan.name}` : "Forfait";
  }
  return serviceOf(config, item.slug)?.name ?? "";
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function useCart(config: VideoConfig) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_ITEMS);
  const items = visibleItems(config, raw);
  const total = items.reduce((sum, item) => sum + itemPrice(config, item), 0);

  const persist = (next: CartItem[]) => publish(visibleItems(config, next));

  return {
    items,
    total,
    deposit: Math.round((total * config.depositPercent) / 100),
    add(item: Omit<CartService, "id"> | Omit<CartForfait, "id">) {
      const current = "type" in item && item.type === "forfait" ? items.filter((entry) => !isForfait(entry)) : items;
      persist([...current, { ...item, id: newId() } as CartItem]);
    },
    update(id: string, patch: Partial<Omit<CartService, "id">>) {
      persist(items.map((item) => (item.id === id && !isForfait(item) ? { ...item, ...patch } : item)));
    },
    remove(id: string) {
      persist(items.filter((item) => item.id !== id));
    },
    clear() {
      clearCart();
    },
  };
}

export function emptyClient(): ClientInfo {
  return { prenom: "", nom: "", entreprise: "", email: "", tel: "", lieu: "", date: "", message: "" };
}

export function readClient(): ClientInfo {
  const client = emptyClient();
  if (typeof window === "undefined") return client;
  try {
    const raw = JSON.parse(sessionStorage.getItem(CLIENT_KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return client;
    for (const field of CLIENT_FIELDS) {
      if (typeof raw[field] === "string") client[field] = raw[field];
    }
  } catch {
    /* ignore broken session data */
  }
  return client;
}

export function writeClient(client: ClientInfo) {
  try {
    sessionStorage.setItem(CLIENT_KEY, JSON.stringify(client));
  } catch {
    /* ignore */
  }
}

const CLIENT_EMPTY = emptyClient();
let clientSnapshot: ClientInfo = CLIENT_EMPTY;
let clientReady = false;
const clientListeners = new Set<() => void>();

function getClientSnapshot() {
  if (!clientReady && typeof window !== "undefined") {
    clientSnapshot = readClient();
    clientReady = true;
  }
  return clientSnapshot;
}

function subscribeClient(listener: () => void) {
  clientListeners.add(listener);
  return () => clientListeners.delete(listener);
}

/** Contact form kept in sessionStorage, same key as the static pages. */
export function useClientDraft() {
  const client = useSyncExternalStore(subscribeClient, getClientSnapshot, () => CLIENT_EMPTY);
  const update = (patch: Partial<ClientInfo>) => {
    clientSnapshot = { ...getClientSnapshot(), ...patch };
    clientReady = true;
    writeClient(clientSnapshot);
    clientListeners.forEach((listener) => listener());
  };
  return [client, update] as const;
}

export function clearCart() {
  publish([]);
}

/** Saves a package and leaves the current page. Skips React listeners so a translated page is not rewritten. */
export function saveForfait(config: VideoConfig, key: string) {
  const current = getSnapshot().filter((entry) => !isForfait(entry));
  const next = visibleItems(config, [...current, { type: "forfait", key, id: newId() }]);
  snapshot = next;
  ready = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* The next page still reads whatever storage accepted. */
  }
}

export function readLast(): LastRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(sessionStorage.getItem(LAST_KEY) ?? "null") as LastRequest | null;
    if (!raw || (raw.type !== "devis" && raw.type !== "acompte") || typeof raw.ref !== "string") return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeLast(value: LastRequest) {
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function siteLang() {
  try {
    return localStorage.getItem("aku-language") || "fr";
  } catch {
    return "fr";
  }
}

export async function submitProject(
  config: VideoConfig,
  kind: "devis" | "acompte",
  items: CartItem[],
  client: ClientInfo,
  payment?: string
) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, payment, client, items, lang: siteLang() }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    ref?: string;
    total?: number;
    acompte?: number;
    checkoutUrl?: string;
  };
  if (!res.ok || !data.ref) throw new Error(data.error || "Une erreur est survenue. Veuillez réessayer.");
  writeLast({
    type: kind,
    ref: data.ref,
    date: new Date().toISOString(),
    client,
    total: data.total ?? 0,
    acompte: data.acompte ?? 0,
    depositPercent: config.depositPercent,
  });
  return data;
}
