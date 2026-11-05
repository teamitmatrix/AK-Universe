import "server-only";
import { AGENT_CATEGORIES, AGENT_LANGUAGES, agents } from "@/config/agents";
import { CHATBOT_FAQ } from "@/config/chatbot-faq";
import { DIGITAL_GROUPS, DIGITAL_OFFERS, DIGITAL_WEBSITES, MOBILE_APP } from "@/config/digital";
import { COMPANY, TODO } from "@/config/company";
import { AGENT_TIERS, ANNUAL_DISCOUNT, MAX_EXTRA_USERS, OPTIONS as PLAN_OPTIONS, PLAN, USER_PRICE } from "@/config/pricing";
import { getVideoConfig, type OptionRef, type Service, type VideoConfig } from "@/lib/video-config";
import { getChatbotSettings } from "./knowledge";

/*
 * Everything the site chatbot may answer from, as small self-contained documents.
 * Built from the same data the pages use (live video prices from admin included),
 * then embedded and searched by lib/chatbot/rag.ts.
 */

export type Doc = { source: string; title: string; url?: string; content: string };

/** Admin text is split into passages of about this size (one embedding each). */
const PASSAGE_CHARS = 1200;

const euros = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
const list = (items: readonly string[] | undefined) => (items ?? []).map((i) => `- ${i}`).join("\n");

/** Always sent with the retrieved passages, so general questions get a correct frame. */
export const OVERVIEW: Doc = {
  source: "site",
  title: "Présentation d'AK Universe",
  url: "/",
  content: `AK Universe propose aux entreprises trois univers (menu : Agents IA, Marketing, Digital) :
1) Agents IA par abonnement (vocal, WhatsApp, ventes, marketing, support client, productivité, commercial, analyse, technique, recrutement), disponibles 24/7. Pages : /agents-ia (tous les agents, catégories, démos, FAQ), /agents-ia/<agent> (fiche de chaque agent), /agents-ia#tarifs (offres), /inscription (essai gratuit et création de compte), /abonnement, /compte.
2) Production vidéo professionnelle (17 services : entreprise, événementiel, réseaux sociaux, drone, mariage, immobilier, food…) et Forfaits Marketing mensuels. Un devis se demande sur /contact (sujet « Demande de devis »), sans projet préalable ; depuis une fiche service le service est prérempli. « Mon projet » (/projet, puis /projet/informations) reste le parcours pour composer plusieurs services et réserver avec un acompte. Pages : /services (catalogue), /services/<service>, /marketing/realisations (portfolio pas encore publié), /marketing/forfaits, /contact.
3) Solutions digitales (sites web, applications mobiles, SEO, fiche Google Business Profile, CRM), sur devis. Page : /digital.
Mentions : /cgv, /confidentialite, /mentions-legales. Tous les prix sont en euros HT.`,
};

function optionLines(cfg: VideoConfig, refs: OptionRef[] | undefined) {
  return (refs ?? []).flatMap((ref) => {
    const id = typeof ref === "string" ? ref : ref.id;
    const base = cfg.options[id];
    if (!base) return [];
    const o = typeof ref === "string" ? base : { ...base, ...ref };
    return [`${o.label} : +${euros(o.price)} ${o.per === "video" ? "par vidéo" : "par projet"}`];
  });
}

function discountText(discounts: Record<string, number>, unit: string) {
  const parts = Object.entries(discounts)
    .filter(([, pct]) => pct > 0)
    .map(([q, pct]) => `${q} ${unit} : -${pct} %`);
  return parts.length ? `Remises selon la quantité : ${parts.join(", ")}.` : "";
}

function serviceDoc(cfg: VideoConfig, s: Service): Doc {
  const unit = (s.qtyLabel || "Nombre de vidéos").replace(/^Nombre de /, "");
  const durations = s.durations ?? cfg.defaultDurations;
  return {
    source: "service",
    title: s.name,
    url: `/services/${s.slug}`,
    content: [
      `${s.name} — à partir de ${euros(s.price)} ${s.unit ?? "HT"}. ${s.priceNote ?? ""}`,
      s.description,
      s.includesText,
      `Ce que nous réalisons :\n${list(s.includes)}`,
      `Inclus dans le prix :\n${list(s.priceList)}`,
      `Durées / formats (supplément HT par vidéo) :\n${list(durations.map((d) => `${d.label} : ${d.extra ? `+${euros(d.extra)}` : "inclus"}`))}`,
      `Options disponibles :\n${list(optionLines(cfg, s.options))}`,
      discountText(s.qtyDiscounts ?? cfg.qtyDiscounts, unit),
      `Pour un devis : /contact?sujet=Demande%20de%20devis&service=${s.slug} (le service est prérempli et modifiable). Pour composer ce service avec d'autres et réserver une date, l'ajouter au projet puis payer un acompte de ${cfg.depositPercent} % sur /projet/informations.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

function videoDocs(cfg: VideoConfig): Doc[] {
  const docs: Doc[] = [
    {
      source: "video",
      title: "Catalogue des services vidéo et prix de départ",
      url: "/services",
      content: `Services vidéo (prix HT, à partir de) :\n${list(
        cfg.services.map((s) => `${s.name} : ${euros(s.price)} ${s.unit ?? "HT"} — /services/${s.slug}`)
      )}`,
    },
    {
      source: "video",
      title: "Options, durées et remises des vidéos",
      url: "/services",
      content: [
        `Durées par défaut (supplément HT par vidéo, sauf services ayant leurs propres durées) :\n${list(
          cfg.defaultDurations.map((d) => `${d.label} : ${d.extra ? `+${euros(d.extra)}` : "inclus"}`)
        )}`,
        `Options (prix par défaut, certains services ont un prix spécifique) :\n${list(
          Object.values(cfg.options).map((o) => `${o.label} : ${euros(o.price)} ${o.per === "video" ? "par vidéo" : "par projet"}`)
        )}`,
        discountText(cfg.qtyDiscounts, "vidéos"),
      ].join("\n\n"),
    },
    {
      source: "video",
      title: "Acompte et réservation d'un tournage",
      url: "/finaliser",
      content: `Pour réserver une date de tournage, un acompte de ${cfg.depositPercent} % de l'estimation HT est payé en ligne (carte bancaire Visa, Mastercard, CB, Amex, Apple Pay / Google Pay via Stripe) ou par virement bancaire (réservation confirmée à réception). La confirmation est immédiate et le solde est réglé selon le devis final, à la livraison des vidéos. Sans acompte, vous pouvez aussi demander un devis personnalisé gratuit, sans paiement immédiat (réponse sous 24 à 48 h).`,
    },
  ];
  const own = new Set(CHATBOT_FAQ.flatMap((t) => t.entries.map((e) => e.q.toLowerCase())));
  for (const f of cfg.faq ?? []) {
    if (!own.has(f.q.toLowerCase())) docs.push({ source: "faq", title: f.q, content: `Question : ${f.q}\nRéponse : ${f.a}` });
  }
  return docs;
}

function marketingDocs(cfg: VideoConfig): Doc[] {
  const m = cfg.marketing;
  if (!m?.plans?.length) return [];
  return [
    ...m.plans.map((p) => ({
      source: "marketing",
      title: `Forfait Marketing ${p.name}`,
      url: "/marketing/forfaits",
      content: `Forfait Marketing ${p.name}${p.popular ? " (le plus populaire)" : ""} — à partir de ${euros(p.price)} HT / mois. ${p.tagline}\nInclus :\n${list(p.features)}`,
    })),
    {
      source: "marketing",
      title: "Forfaits Marketing : comparaison et inclus",
      url: "/marketing/forfaits",
      content: [
        `Forfaits Marketing mensuels : ${m.plans.map((p) => `${p.name} ${euros(p.price)} HT / mois`).join(" ; ")}.`,
        `Inclus dans tous les forfaits :\n${list((m.included ?? []).map((i) => `${i.title} — ${i.text}`))}`,
        `Bénéfices :\n${list((m.benefits ?? []).map((i) => `${i.title} — ${i.text}`))}`,
        m.customQuote ? `${m.customQuote.title} ${m.customQuote.text} (${m.customQuote.primaryCta} : /contact, sujet Demande de devis)` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];
}

function agentDocs(): Doc[] {
  return [
    {
      source: "agents",
      title: "Liste des agents IA",
      url: "/agents-ia",
      content: `Agents IA disponibles (page /agents-ia, par catégorie) :\n${list(
        AGENT_CATEGORIES.map(
          (c) => `${c.name} : ${agents.filter((a) => a.category === c.id).map((a) => `${a.name} (${a.menu})`).join(", ")}`
        )
      )}`,
    },
    ...agents.map((a) => ({
      source: "agents",
      title: a.name,
      url: `/agents-ia/${a.id}`,
      content: `${a.name} — ${a.description}\nFonctionnalités :\n${list(a.features)}\nCapacités :\n${list(a.capabilities)}\nIntégrations : ${a.integrations.join(", ")}.\nLangues : ${AGENT_LANGUAGES.join(", ")}.\nDisponible dans toutes les offres (voir /agents-ia#tarifs).`,
    })),
    {
      source: "agents",
      title: "Offres Agents IA (page Tarifs)",
      url: "/agents-ia#tarifs",
      content: `Offres présentées sur /agents-ia#tarifs (prix HT) :\n${list(
        AGENT_TIERS.map(
          (t) =>
            `${t.name}${"popular" in t ? " (le plus populaire)" : ""} : ${t.price === null ? "sur devis" : `${euros(t.price)} / mois`}, mise en place ${t.setupFrom === null ? "sur devis" : `à partir de ${euros(t.setupFrom)}`}. ${t.desc} Inclus : ${t.features.join(", ")}.`
        )
      )}\nSans engagement (annulation à tout moment), accès immédiat (commencez en quelques minutes), essai gratuit via /inscription. Offre Sur devis : nous contacter.`,
    },
    {
      source: "agents",
      title: "Abonnement en ligne AK Universe Pro (page /abonnement)",
      url: "/abonnement",
      content: `Après inscription, l'abonnement se personnalise sur /abonnement : formule ${PLAN.name} à ${euros(PLAN.monthlyPrice)} HT / mois (${PLAN.features.join(", ")}). Utilisateurs supplémentaires : ${euros(USER_PRICE)} HT / utilisateur / mois (jusqu'à ${MAX_EXTRA_USERS}). Paiement annuel : -${ANNUAL_DISCOUNT * 100} % (facturé 12 mois en une fois). Options mensuelles :\n${list(
        PLAN_OPTIONS.map((o) => `${o.label} : ${euros(o.price)} HT / mois — ${o.info}`)
      )}`,
    },
  ];
}

function faqDocs(): Doc[] {
  return CHATBOT_FAQ.flatMap((topic) =>
    topic.entries.map((e) => ({
      source: "faq",
      title: e.q,
      url: e.url,
      content: `${topic.topic}\nQuestion : ${e.q}\nRéponse : ${e.a}`,
    }))
  );
}

function digitalDocs(): Doc[] {
  const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;
  return [
    {
      source: "digital",
      title: "Digital — Sites internet & e-commerce",
      url: "/digital#sites",
      content: `Des sites professionnels, rapides et pensés pour convertir vos visiteurs en clients.\n${list(
        DIGITAL_WEBSITES.map((site) => {
          const running =
            site.runningFrom === null
              ? "pas de frais de fonctionnement affichés"
              : `frais de fonctionnement à partir de ${euros(site.runningFrom)} / mois`;
          return `${site.name} : mise en place ${euros(site.price)} ; ${running} (${site.points.join(", ")})`;
        }),
      )}`,
    },
    ...DIGITAL_GROUPS.map((g) => ({
      source: "digital",
      title: `Digital — ${g.title} ${g.gold}`,
      url: `/digital#${g.id}`,
      content: `${g.text}\n${list(g.services.map((s) => `${s.name} : ${s.text} (${s.points.join(", ")})`))}`,
    })),
    {
      source: "digital",
      title: "Application mobile sur mesure",
      url: "/digital/application-mobile",
      content: `${MOBILE_APP.lead}\nCe que nous pouvons développer :\n${list(
        MOBILE_APP.builds.map((item) => `${item.name} : ${item.text}`),
      )}\nMéthode :\n${list(MOBILE_APP.steps.map((step, i) => `${i + 1}. ${step.name} — ${step.text}`))}\n${MOBILE_APP.pricingNote}`,
    },
    {
      source: "digital",
      title: "Tarifs des solutions digitales",
      url: "/digital#tarifs",
      content: `Sites internet : prix de mise en place publiés sur /digital#sites. Applications et SEO/Google/CRM : sur devis.\n${list(
        DIGITAL_OFFERS.map((o) => `${o.name} : ${o.text}`),
      )}\nDemande de devis gratuite sur /contact, sans projet préalable.`,
    },
  ];
}

function companyDoc(): Doc | null {
  const known = [
    ["Raison sociale", COMPANY.legalName],
    ["Adresse", COMPANY.address],
    ["E-mail", COMPANY.email],
    ["Téléphone", COMPANY.phone],
    ["SIRET", COMPANY.siret],
  ].filter(([, v]) => v !== TODO);
  if (!known.length) return null;
  return {
    source: "company",
    title: "Coordonnées d'AK Universe",
    url: "/mentions-legales",
    content: known.map(([k, v]) => `${k} : ${v}`).join("\n"),
  };
}

/** "# Title" or a short line in capitals, e.g. "ZONE D'INTERVENTION (VIDÉO)". */
function headingOf(line: string) {
  const md = line.match(/^#{1,6}\s+(.+)$/);
  if (md) return md[1].trim();
  const l = line.trim();
  return l.length <= 80 && /\p{Lu}/u.test(l) && l === l.toUpperCase() ? l : null;
}

/** Splits the admin text on blank lines into passages of about PASSAGE_CHARS, titled by the last heading. */
export function splitPassages(text: string): { title: string; content: string }[] {
  const out: { title: string; content: string }[] = [];
  let heading = "Base de connaissances";
  let current = "";
  const flush = () => {
    // Old static-site links (/services.html) are written as the current paths.
    if (current.trim()) out.push({ title: heading, content: current.trim().replace(/(\/[\w\-/]+)\.html\b/g, "$1") });
    current = "";
  };
  for (const block of text.split(/\n\s*\n/)) {
    let b = block.trim();
    if (!b) continue;
    const [first, ...rest] = b.split("\n");
    const h = headingOf(first);
    if (h) {
      flush();
      heading = h;
      b = rest.join("\n").trim();
      if (!b) continue;
    }
    if (current && current.length + b.length > PASSAGE_CHARS) flush();
    // A single block longer than a passage is cut on line breaks.
    for (const piece of b.length > PASSAGE_CHARS * 1.5 ? b.split("\n") : [b]) {
      if (current && current.length + piece.length > PASSAGE_CHARS) flush();
      current += (current ? "\n\n" : "") + piece;
    }
  }
  flush();
  return out;
}

export async function buildCorpus(): Promise<Doc[]> {
  const [cfg, settings] = await Promise.all([getVideoConfig(), getChatbotSettings()]);
  return [
    OVERVIEW,
    ...cfg.services.map((s) => serviceDoc(cfg, s)),
    ...videoDocs(cfg),
    ...marketingDocs(cfg),
    ...agentDocs(),
    ...digitalDocs(),
    ...faqDocs(),
    ...[companyDoc()].filter((d): d is Doc => d !== null),
    ...splitPassages(settings.knowledge).map((p) => ({ source: "admin", ...p })),
  ];
}
