import type { Lang } from "@/config/languages";
import type { Catalog } from "../translate";
import * as de from "./de";
import * as en from "./en";

/*
 * One folder per language. Keys are the French texts of the site, values the translation.
 * "client" files hold the texts of client components (sent to the browser for the current
 * language only); "server" files the rest (pages, legal texts, catalogue data), never sent as such.
 */

const fr = { client: {}, server: {} };

const LANGS: Record<Lang, { client: Catalog; server: Catalog }> = { fr, en, de };

export const CLIENT_CATALOGS = Object.fromEntries(
  Object.entries(LANGS).map(([lang, c]) => [lang, c.client]),
) as Record<Lang, Catalog>;

export const SERVER_CATALOGS = Object.fromEntries(
  Object.entries(LANGS).map(([lang, c]) => [lang, { ...c.client, ...c.server }]),
) as Record<Lang, Catalog>;
