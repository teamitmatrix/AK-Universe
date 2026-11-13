/*
 * Lists the French texts that have no translation yet, for every language of config/languages.ts.
 *
 *   npm run check:i18n          → missing texts per language (exit code 1 if any)
 *   npm run check:i18n -- --unused   → also lists catalogue entries no longer used
 *
 * Texts are found in two places:
 *   - code: every t("…") / t.rich("…") call in app/ (literal French text);
 *   - data: every text of the catalogue files translated with translateData() (config/*.ts, services-data.js).
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const showUnused = process.argv.includes("--unused");
/** --json <file>: also writes the missing texts (with where they come from) as JSON, for translators. */
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;

/* ---------- tiny TS loader (config + catalogue files only import each other) ---------- */
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, "utf8");
  const mod = { exports: {} };
  cache.set(file, mod);
  if (file.endsWith("services-data.js")) {
    const sandbox = { window: {} };
    vm.runInNewContext(source, sandbox);
    mod.exports = { AKU_CONFIG: sandbox.window.AKU_CONFIG };
    return mod.exports;
  }
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  });
  const localRequire = (spec) => {
    let target;
    if (spec.startsWith("@/config/")) target = path.join(root, "config", spec.slice(9));
    else if (spec.startsWith("@/")) target = path.join(root, "app", spec.slice(2));
    else if (spec.startsWith(".")) target = path.resolve(path.dirname(file), spec);
    else return require(spec);
    for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
      if (fs.existsSync(target + ext) && fs.statSync(target + ext).isFile()) return load(target + ext);
    }
    throw new Error(`Cannot resolve ${spec} from ${file}`);
  };
  new Function("exports", "require", "module", outputText)(mod.exports, localRequire, mod);
  return mod.exports;
}

/* ---------- texts used in code ---------- */
/** t("…"), t.rich("…") and t.in("context", "…") (which needs a "context|…" entry). */
const CALL = /\bt(\.rich|\.in)?\(\s*(?:"([\w-]+)",\s*)?("(?:[^"\\]|\\.)*"|`[^`$]*`)/g;
const codeKeys = new Map(); // text → first file
const clientKeys = new Set(); // texts used in "use client" files: they must be in a client catalogue
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full.includes(path.join("i18n", "catalogs"))) continue;
      walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const source = fs.readFileSync(full, "utf8");
      const isClient = /^\s*["']use client["']/.test(source.replace(/^﻿/, ""));
      for (const match of source.matchAll(CALL)) {
        const raw = match[3];
        const plain = raw.startsWith("`") ? raw.slice(1, -1) : JSON.parse(raw);
        const text = match[1] === ".in" && match[2] ? `${match[2]}|${plain}` : plain;
        if (!codeKeys.has(text)) codeKeys.set(text, path.relative(root, full));
        if (isClient) clientKeys.add(text);
      }
    }
  }
}
walk(path.join(root, "app"));

/** Texts passed to t() through a variable (lists inside components), so the scan above cannot see them. */
const DYNAMIC_CLIENT = [
  // components/video/flow.tsx (STEPS), Configurator.tsx (tabs), ConfirmationView.tsx (NEXT)
  "Mon projet", "Mes informations", "Validation", "Options", "Exemples", "FAQ",
  "Analyse de votre projet", "Proposition d'un devis personnalisé", "Échange pour valider les détails",
  "Organisation du tournage", "Création et livraison des vidéos",
  // lib/contact/subjects.ts (contact form subjects)
  "Agents IA", "Marketing", "Digital", "Demande de devis", "Question générale", "Autre",
];
const DYNAMIC_SERVER = [
  // app/page.tsx (pillars)
  "Automatisez vos appels, vos messages WhatsApp et les demandes courantes de vos clients.",
  "Présentez votre offre avec des vidéos, des contenus pour les réseaux sociaux et des campagnes publicitaires.",
  "Créez un site vitrine, une boutique en ligne ou une application mobile sur mesure.",
  "Découvrir les agents IA", "Découvrir le marketing", "Découvrir le digital",
  "Portrait d’un agent IA AK Universe", "Tournage et production de contenus marketing", "Illustration site web, application et SaaS",
  // components/layout/AgentPricing.tsx (LOOK)
  "Commencer gratuitement", "Essayer gratuitement", "Nous contacter",
  // app/compte/page.tsx
  "Actif", "Paiement en attente", "Paiement en retard", "Résilié", "Paiement incomplet", "mensuel", "annuel",
  // app/confidentialite/page.tsx (DATA, STORAGE)
  "Compte client : prénom, nom, e-mail, mot de passe (chiffré), organisation (nom, secteur, taille)",
  "Créer et gérer votre compte, vous donner accès aux agents IA", "Exécution du contrat", "Tant que le compte est actif, puis 3 ans",
  "Demandes de devis et réservations vidéo : coordonnées, lieu, date, message, services choisis",
  "Établir le devis, organiser le tournage, vous recontacter", "Mesures précontractuelles / contrat", "3 ans après le dernier contact",
  "Abonnements et paiements : formule, montants, références Stripe (aucune donnée de carte n'est stockée par AK Universe)",
  "Facturation, comptabilité", "Contrat et obligation légale", "10 ans (obligation comptable)",
  "E-mails envoyés (confirmation de demande, code de vérification, réinitialisation du mot de passe)",
  "Vous informer du suivi de votre demande ou de votre compte", "Contrat", "Journal d'envoi : 30 jours",
  "Garder votre session ouverte après la connexion", "Nécessaire", "Mémoriser la langue choisie",
  "aku-projet (stockage local), aku-client (stockage de session)",
  "Conserver votre projet vidéo et vos coordonnées entre les étapes de la demande",
  "aku-cookie-notice (stockage local)", "Ne plus afficher l'information sur les cookies", "Cookies Stripe",
  "Sécuriser le paiement et prévenir la fraude, sur la page de paiement Stripe",
];
for (const text of DYNAMIC_CLIENT) {
  codeKeys.set(text, "dynamic (client)");
  clientKeys.add(text);
}
for (const text of DYNAMIC_SERVER) if (!codeKeys.has(text)) codeKeys.set(text, "dynamic (server)");

/* ---------- texts of catalogue data ---------- */
const DATA_SKIP = new Set(["id", "key", "slug", "icon", "href", "url", "image", "portrait", "heroPortrait", "phonesImage", "from", "category", "per", "slugs", "topic"]);
const dataKeys = new Map(); // text → field
const dataSource = new Map(); // text → config file
let source = "";
function collect(value, field = "") {
  if (typeof value === "string") {
    // Option ids ("drone") and icon names in [icon, text] pairs are identifiers, not texts.
    if (field === "options" || (field === "benefits" && /^[a-z0-9-]+$/.test(value))) return;
    if (/[A-Za-zÀ-ÿ]/.test(value) && !dataKeys.has(value)) {
      dataKeys.set(value, field);
      dataSource.set(value, source);
    }
  } else if (Array.isArray(value)) value.forEach((item) => collect(item, field));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) if (!DATA_SKIP.has(k)) collect(v, k);
  }
}
const cfg = (name) => {
  source = name;
  return load(path.join(root, "config", name));
};
const agents = cfg("agents.ts");
collect(agents.agents);
collect(agents.AGENT_CATEGORIES);
const tiers = cfg("pricing.ts").AGENT_TIERS;
collect(tiers);
const digital = cfg("digital.ts");
collect([digital.DIGITAL_SUBNAV, digital.DIGITAL_WEBSITES, digital.DIGITAL_GROUPS, digital.DIGITAL_OFFERS, digital.MOBILE_APP]);
const marketing = cfg("marketing.ts");
collect([marketing.SERVICE_TAGS, marketing.MARKETING_CATEGORIES]);
const nav = cfg("navigation.ts").NAV_MENUS;
collect(nav);
const faqTopics = cfg("chatbot-faq.ts").CHATBOT_FAQ;
collect(faqTopics.filter((topic) => /^(Agents IA|Vidéo|Forfaits Marketing)/.test(topic.topic)));
const video = cfg("services-data.js").AKU_CONFIG;
collect(video);
const status = cfg("projects.ts").PROJECT_STATUS;
collect(status);
const org = cfg("organisation.ts");
collect([org.SECTORS, org.SIZES]);
const company = cfg("company.ts");
collect([company.COMPANY.legalForm, company.COMPANY.publicationDirector, company.COMPANY.updatedAt, company.PROCESSORS]);

/** Shown as they are in every language (names, brands, units). */
const SAME =
  /^(Milo|Nora|Léa|Adam|Hugo|Jade|Sacha|Inès|Noé|Éva|Clara|Starter|Pro|Pro Business|Marketing|Digital|Motion design|Interview|Drone|Food|E-commerce|UGC & Ads|FAQ|Contact|LinkedIn|Instagram|Facebook|WhatsApp Business|Google Workspace|Microsoft 365|Outlook|Google Analytics|Google Search Console|CMS|CRM|SMS|Notion|Google Drive|Confluence|Intranet|Job boards|Google Posts|Reporting|IONOS SARL|Supabase Inc\.|Stripe Payments Europe Ltd\.|Resend \(Plus Five Five Inc\.\)|Google LLC|Landing page|[\d\s:.,/–-]+)$/;

/* ---------- compare with each catalogue ---------- */
const { LANGUAGES, SOURCE_LANG } = cfg("languages.ts");
let missingTotal = 0;
for (const { code } of LANGUAGES) {
  if (code === SOURCE_LANG) continue;
  const catalogs = load(path.join(root, "app", "i18n", "catalogs", code, "index.ts"));
  const catalog = { ...catalogs.client, ...catalogs.server };
  const clientOnly = new Set(Object.keys(catalogs.client));
  const missing = [];
  const json = [];
  for (const [text, file] of codeKeys) {
    if (text in catalog) continue;
    missing.push(`  ${file}: ${JSON.stringify(text)}`);
    json.push({ text, from: file.replaceAll("\\", "/"), client: clientKeys.has(text) });
  }
  for (const text of clientKeys) {
    if (text in catalog && !clientOnly.has(text)) missing.push(`  used in a client component but only in a server catalogue: ${JSON.stringify(text)}`);
  }
  for (const [text, field] of dataKeys) {
    if (text in catalog || `${field}|${text}` in catalog || SAME.test(text)) continue;
    missing.push(`  data (${field}): ${JSON.stringify(text)}`);
    json.push({ text, from: `config/${dataSource.get(text)}`, field, client: false });
  }
  missingTotal += missing.length;
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(json, null, 1));
  console.log(`\n[${code}] ${missing.length} missing translation(s)`);
  if (missing.length) console.log(missing.join("\n"));
  if (showUnused) {
    const used = (key) => codeKeys.has(key) || dataKeys.has(key) || dataKeys.has(key.split("|").slice(1).join("|"));
    const unused = Object.keys(catalog).filter((key) => !used(key));
    console.log(`\n[${code}] ${unused.length} entr${unused.length === 1 ? "y" : "ies"} not found in code or data (may be built at runtime):`);
    if (unused.length) console.log(unused.map((k) => `  ${clientOnly.has(k) ? "client" : "server"}: ${JSON.stringify(k)}`).join("\n"));
  }
}
process.exitCode = missingTotal ? 1 : 0;
