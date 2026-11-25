"use client";

import { useSyncExternalStore } from "react";
import { AGENT_ADDON_LIST, isAddonId, type AgentAddon } from "@/config/agent-addons";
import { AGENT_SUBSCRIPTIONS, type AgentOffer } from "@/config/agent-subscriptions";
import { agentById } from "@/config/agents";
import { DIGITAL_WEBSITES, digitalWebsiteOf as defaultDigitalOf, type DigitalWebsite } from "@/config/digital";
import { videoPrice, videoSummary } from "@/lib/projects/quote-math";
import type { VideoConfig } from "@/lib/video-config";

/** Prefer live catalogue prices attached to VideoConfig; fall back to hard-coded defaults. */
function digitalSites(config: VideoConfig): readonly DigitalWebsite[] {
  return config.digitalWebsites?.length ? config.digitalWebsites : DIGITAL_WEBSITES;
}

function digitalWebsiteOf(config: VideoConfig, key: string) {
  return digitalSites(config).find((site) => site.id === key) ?? defaultDigitalOf(key);
}

function agentOfferOf(config: VideoConfig, key: string): AgentOffer | null {
  const live = config.agentOffers?.find((o) => o.id === key);
  if (live) return live;
  const def = AGENT_SUBSCRIPTIONS[key];
  const agent = agentById(key);
  if (!def || !agent) return null;
  return {
    id: key,
    name: agent.name,
    price: def.price,
    priceAnnual: def.priceAnnual,
    setupFrom: def.setupFrom,
    credits: def.credits,
    capacity: def.capacity,
  };
}

function addonPriceOf(config: VideoConfig, addon: AgentAddon): number {
  const live = config.agentAddonPrices?.[addon.id];
  return typeof live === "number" && Number.isFinite(live) ? live : addon.price;
}

function selectedAgentAddons(_config: VideoConfig, item: CartAgent): AgentAddon[] {
  const ids = new Set((item.addons ?? []).filter(isAddonId));
  return AGENT_ADDON_LIST.filter((a) => isAddonId(a.id) && ids.has(a.id));
}

const KEY = "aku-projet";
const CLIENT_KEY = "aku-client";
const LAST_KEY = "aku-derniere-demande";

export type CartService = { id: string; slug: string; qty: number; dur: number; opts: string[] };
export type CartForfait = { id: string; type: "forfait"; key: string };
export type CartDigital = { id: string; type: "digital"; key: string };
export type CartAgent = { id: string; type: "agent"; key: string; addons?: string[] };
export type CartItem = CartService | CartForfait | CartDigital | CartAgent;

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
  /** Optional early-start withdrawal consent recorded at checkout (acompte only). */
  earlyStartAccepted?: boolean;
};

const CLIENT_FIELDS = ["prenom", "nom", "entreprise", "email", "tel", "lieu", "date", "message"] as const;

export function isForfait(item: CartItem): item is CartForfait {
  return "type" in item && item.type === "forfait";
}

export function isDigital(item: CartItem): item is CartDigital {
  return "type" in item && item.type === "digital";
}

export function isAgent(item: CartItem): item is CartAgent {
  return "type" in item && item.type === "agent";
}

function isStored(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string") return false;
  if (item.type === "forfait" || item.type === "digital") return typeof item.key === "string";
  if (item.type === "agent") {
    return (
      typeof item.key === "string" &&
      (item.addons === undefined || (Array.isArray(item.addons) && item.addons.every((id) => typeof id === "string")))
    );
  }
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
  return items.filter((item) => {
    if (isForfait(item)) return !!planOf(config, item.key);
    if (isDigital(item)) return !!digitalWebsiteOf(config, item.key);
    if (isAgent(item)) return !!agentOfferOf(config, item.key);
    return !!serviceOf(config, item.slug);
  });
}

/** One display line: setup once vs recurring subscription (never summed into a single misleading label). */
export type CartPriceLine = { label: string; amount: number; suffix?: string };

/** Breakdown shown in the cart. First-period total still uses itemPrice(). */
export function itemPriceLines(config: VideoConfig, item: CartItem): CartPriceLine[] {
  if (isForfait(item)) {
    const plan = planOf(config, item.key);
    if (!plan || plan.onQuote || plan.price == null) return [];
    const lines: CartPriceLine[] = [];
    if (plan.setupPrice != null && plan.setupPrice > 0) {
      lines.push({ label: "Mise en place (une fois)", amount: plan.setupPrice });
    }
    lines.push({ label: "Abonnement", amount: plan.price, suffix: "/ mois" });
    return lines;
  }
  if (isDigital(item)) {
    const site = digitalWebsiteOf(config, item.key);
    if (!site) return [];
    const lines: CartPriceLine[] = [{ label: "Mise en place (une fois)", amount: site.price }];
    if (site.runningFrom != null) {
      lines.push({ label: "Fonctionnement dès", amount: site.runningFrom, suffix: "/ mois" });
    }
    return lines;
  }
  if (isAgent(item)) {
    const offer = agentOfferOf(config, item.key);
    if (!offer) return [];
    const lines: CartPriceLine[] = [
      { label: "Mise en place (une fois)", amount: offer.setupFrom },
      { label: "Abonnement", amount: offer.price, suffix: "/ mois" },
    ];
    for (const addon of selectedAgentAddons(config, item)) {
      const amount = addonPriceOf(config, addon);
      lines.push({
        label: addon.label,
        amount,
        suffix: addon.billing === "month" ? "/ mois" : undefined,
      });
    }
    return lines;
  }
  const service = serviceOf(config, item.slug);
  const amount = service ? videoPrice(config, service, item) : 0;
  return amount > 0 ? [{ label: "", amount }] : [];
}

/** First-period estimate (one-time setup + first subscription month when both apply). Renewals = subscription only. */
/** True when every line has a listed price. A missing or « sur devis » price means the basket cannot be charged. */
export function cartIsPriced(config: VideoConfig, items: CartItem[]) {
  if (!items.length) return false;
  return items.every((item) => {
    if (isForfait(item)) {
      const plan = planOf(config, item.key);
      return !!plan && !plan.onQuote && plan.price != null;
    }
    if (isDigital(item)) return (digitalWebsiteOf(config, item.key)?.price ?? 0) > 0;
    if (isAgent(item)) return !!agentOfferOf(config, item.key);
    return !!serviceOf(config, item.slug);
  });
}

export function itemPrice(config: VideoConfig, item: CartItem) {
  if (isForfait(item)) {
    const plan = planOf(config, item.key);
    if (!plan || plan.price == null) return 0;
    return plan.price + (plan.setupPrice ?? 0);
  }
  if (isDigital(item)) return digitalWebsiteOf(config, item.key)?.price ?? 0;
  if (isAgent(item)) {
    const offer = agentOfferOf(config, item.key);
    if (!offer) return 0;
    const addonsTotal = selectedAgentAddons(config, item).reduce((sum, a) => sum + addonPriceOf(config, a), 0);
    return offer.price + offer.setupFrom + addonsTotal;
  }
  const service = serviceOf(config, item.slug);
  return service ? videoPrice(config, service, item) : 0;
}

/** Recurring monthly amount only (what the customer pays after the first period). */
export function itemRecurringMonthly(config: VideoConfig, item: CartItem) {
  if (isForfait(item)) return planOf(config, item.key)?.price ?? 0;
  if (isAgent(item)) {
    const base = agentOfferOf(config, item.key)?.price ?? 0;
    const monthlyAddons = selectedAgentAddons(config, item)
      .filter((a) => a.billing === "month")
      .reduce((sum, a) => sum + addonPriceOf(config, a), 0);
    return base + monthlyAddons;
  }
  if (isDigital(item)) return digitalWebsiteOf(config, item.key)?.runningFrom ?? 0;
  return 0;
}

export function itemSummary(config: VideoConfig, item: CartItem) {
  if (isForfait(item)) {
    const plan = planOf(config, item.key);
    if (!plan) return "Abonnement mensuel";
    if (plan.onQuote || plan.price == null) return `Sur devis • ${plan.tagline}`;
    return plan.tagline;
  }
  if (isDigital(item)) {
    const site = digitalWebsiteOf(config, item.key);
    if (!site) return "Site internet";
    return site.runningFrom != null ? "Mise en place + fonctionnement mensuel" : "Mise en place";
  }
  if (isAgent(item)) {
    const offer = agentOfferOf(config, item.key);
    if (!offer) return "Abonnement Agent IA";
    const n = item.addons?.length ?? 0;
    return n > 0 ? `${offer.capacity} · ${n} add-on${n > 1 ? "s" : ""}` : offer.capacity;
  }
  const service = serviceOf(config, item.slug);
  return service ? videoSummary(config, service, item) : "";
}

export function itemName(config: VideoConfig, item: CartItem) {
  if (isForfait(item)) {
    const plan = planOf(config, item.key);
    return plan ? `Forfait ${plan.name}` : "Forfait";
  }
  if (isDigital(item)) return digitalWebsiteOf(config, item.key)?.name ?? "Site internet";
  if (isAgent(item)) {
    const offer = agentOfferOf(config, item.key);
    return offer ? `Agent IA — ${offer.name}` : "Agent IA";
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
  const recurringMonthly = items.reduce((sum, item) => sum + itemRecurringMonthly(config, item), 0);

  const persist = (next: CartItem[]) => publish(visibleItems(config, next));

  return {
    items,
    total,
    /** Sum of monthly subscriptions only (renewals after setup). */
    recurringMonthly,
    deposit: Math.round((total * config.depositPercent) / 100),
    add(item: Omit<CartService, "id"> | Omit<CartForfait, "id"> | Omit<CartDigital, "id"> | Omit<CartAgent, "id">) {
      const current =
        "type" in item && item.type === "forfait"
          ? items.filter((entry) => !isForfait(entry))
          : "type" in item && item.type === "digital"
            ? items.filter((entry) => !(isDigital(entry) && entry.key === item.key))
            : "type" in item && item.type === "agent"
              ? items.filter((entry) => !(isAgent(entry) && entry.key === item.key))
              : items;
      persist([...current, { ...item, id: newId() } as CartItem]);
    },
    update(id: string, patch: Partial<Omit<CartService, "id">>) {
      persist(
        items.map((item) =>
          item.id === id && !isForfait(item) && !isDigital(item) && !isAgent(item) ? { ...item, ...patch } : item,
        ),
      );
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

/** Adds or replaces a digital website offer in the project cart. */
export function saveDigitalWebsite(config: VideoConfig, key: string) {
  if (!digitalWebsiteOf(config, key)) return;
  const current = getSnapshot().filter((entry) => !(isDigital(entry) && entry.key === key));
  publish(visibleItems(config, [...current, { type: "digital", key, id: newId() }]));
}

/**
 * Adds or replaces a solo Agents IA subscription in the project cart.
 * Does not re-validate other cart lines (agents-ia pages may not have the full video catalogue).
 */
export function saveAgentSubscription(key: string, addons: string[] = []) {
  const current = getSnapshot().filter((entry) => !(isAgent(entry) && entry.key === key));
  const clean = addons.filter(isAddonId);
  publish([...current, { type: "agent", key, id: newId(), addons: clean }]);
}

/** Updates add-ons on an existing agent cart line (Mon projet → Modifier). */
export function updateAgentAddons(id: string, addons: string[]) {
  const clean = addons.filter(isAddonId);
  publish(
    getSnapshot().map((entry) => (isAgent(entry) && entry.id === id ? { ...entry, addons: clean } : entry)),
  );
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
  payment?: string,
  options?: { earlyStartAccepted?: boolean; termsAccepted?: boolean; privacyAccepted?: boolean }
) {
  const earlyStartAccepted = options?.earlyStartAccepted === true;
  const termsAccepted = options?.termsAccepted === true;
  const privacyAccepted = options?.privacyAccepted === true;
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      payment,
      client,
      items,
      lang: siteLang(),
      ...(kind === "acompte" ? { earlyStartAccepted, termsAccepted, privacyAccepted } : {}),
    }),
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
    ...(kind === "acompte" ? { earlyStartAccepted } : {}),
  });
  return data;
}
