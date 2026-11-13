import { createElement, Fragment, type ReactNode } from "react";
import { localeOf, SOURCE_LANG, type Lang } from "@/config/languages";

/** French text → translated text. French itself needs no catalogue. */
export type Catalog = Readonly<Record<string, string>>;
export type Vars = Record<string, string | number>;
/** Markup in a text: "<gold>…</gold>" is rendered by tags.gold(children). "<br/>" is always a line break. */
export type Tags = Record<string, (children: ReactNode) => ReactNode>;

export type T = {
  /** Translates a French text, then fills "{name}" placeholders. */
  (text: string, vars?: Vars): string;
  /** Same, for a text with markup tags (see Tags). */
  rich(text: string, tags?: Tags, vars?: Vars): ReactNode;
  /**
   * For a short French word whose translation depends on where it appears: looks up "<context>|<text>"
   * (e.g. t.in("nom-famille", "Nom") → "Last name", while t("Nom") → "Name").
   */
  in(context: string, text: string, vars?: Vars): string;
  /** Translates catalogue data (config files): no warning when a value has no translation (ids, URLs…). */
  data(text: string): string;
  lang: Lang;
  /** "fr-FR", "en-GB": for toLocaleString / toLocaleDateString. */
  locale: string;
};

const warned = new Set<string>();

function fill(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** "<tag>text</tag>" (not nested) or a self-closing "<tag/>" such as "<br/>". */
const MARKUP = /<(\w+)>([\s\S]*?)<\/\1>|<(\w+)\s*\/>/g;

/** Tags every text can use without passing them: <gold>, <strong>, <b>, <em>, <br/>. */
const DEFAULT_TAGS: Tags = {
  gold: (children) => createElement("span", { className: "gold" }, children),
  strong: (children) => createElement("strong", null, children),
  b: (children) => createElement("b", null, children),
  em: (children) => createElement("em", null, children),
  br: () => createElement("br"),
};

function renderRich(text: string, custom: Tags = {}): ReactNode {
  const tags = { ...DEFAULT_TAGS, ...custom };
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(MARKUP)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const name = match[1] ?? match[3];
    const render = tags[name];
    const inner = match[2] ?? null;
    nodes.push(createElement(Fragment, { key: key++ }, render ? render(inner) : inner));
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length === 1 ? nodes[0] : nodes;
}

export function createT(lang: Lang, catalog: Catalog): T {
  const lookup = (text: string) => {
    const found = catalog[text];
    if (found !== undefined) return found;
    if (lang !== SOURCE_LANG && process.env.NODE_ENV !== "production" && !warned.has(text)) {
      warned.add(text);
      console.warn(`[i18n] Missing ${lang} translation: ${JSON.stringify(text)}`);
    }
    return text;
  };
  const t = ((text: string, vars?: Vars) => fill(lookup(text), vars)) as T;
  t.rich = (text, tags, vars) => renderRich(fill(lookup(text), vars), tags);
  t.in = (context, text, vars) => {
    const scoped = catalog[`${context}|${text}`];
    return scoped !== undefined ? fill(scoped, vars) : t(text, vars);
  };
  t.data = (text) => catalog[text] ?? text;
  t.lang = lang;
  t.locale = localeOf(lang);
  return t;
}

/** Keys of catalogue data that are identifiers, never shown as text. */
const DATA_SKIP = new Set([
  "id",
  "key",
  "slug",
  "icon",
  "href",
  "url",
  "image",
  "portrait",
  "heroPortrait",
  "phonesImage",
  "from",
  "category",
  "per",
  "slugs",
  "topic",
]);

/**
 * Translates every text of a data object (agents, services, plans…). A field can carry a translation
 * of its own with a "<field>|<French>" catalogue entry, for short words whose translation depends on
 * where they appear (e.g. "gold|réseaux sociaux").
 */
export function translateData<V>(value: V, t: T, field = ""): V {
  if (typeof value === "string") {
    // A service's `options` list holds option ids ("drone"); options given as objects are still translated.
    if (field === "options") return value;
    const scoped = field ? t.data(`${field}|${value}`) : value;
    return (scoped !== `${field}|${value}` ? scoped : t.data(value)) as V;
  }
  if (Array.isArray(value)) return value.map((item) => translateData(item, t, field)) as V;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = DATA_SKIP.has(k) ? v : translateData(v, t, k);
    return out as V;
  }
  return value;
}
