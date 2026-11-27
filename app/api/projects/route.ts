import { after, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ensureProfile } from "@/lib/auth/session";
import { sendProjectEmails } from "@/lib/projects/emails";
import { priceProject, type ProjectItemInput } from "@/lib/projects/pricing";
import { projectUniverseFromCart, type ProjectUniverse } from "@/lib/projects/universe";
import { allowedCheckoutMethods } from "@/lib/billing/payment-methods";
import { checkoutLocale, getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { privacyContactFields } from "@/config/privacy";
import { termsContactFields } from "@/config/terms";
import { buildEarlyStartRecord, earlyStartContactFields } from "@/config/withdrawal";
import { getPrivacy } from "@/lib/privacy";
import { getTerms } from "@/lib/terms";
import { recordProjectTermsAcceptance } from "@/lib/terms-acceptance";

/*
 * Video project intake (finaliser.html → "Demander mon devis", acompte.html → "Payer").
 * Public endpoint: prices are recomputed on the server, never taken from the client.
 */

const CONTACT_FIELDS = {
  prenom: { required: true, max: 80 },
  nom: { required: true, max: 80 },
  entreprise: { required: false, max: 120 },
  email: { required: true, max: 160 },
  tel: { required: true, max: 30 },
  lieu: { required: true, max: 120 },
  date: { required: false, max: 10 },
  message: { required: false, max: 2000 },
} as const;

type Body = {
  kind?: string;
  payment?: string;
  lang?: string;
  client?: Record<string, unknown>;
  items?: ProjectItemInput[];
  /** Optional early-start consent for acompte checkout (must stay unchecked by default on the client). */
  earlyStartAccepted?: boolean;
  /** Mandatory CGV checkbox for acompte — must be true or the request is refused. */
  termsAccepted?: boolean;
  /** Mandatory privacy-policy checkbox — must be true or the request is refused. */
  privacyAccepted?: boolean;
};

const MAX_BODY_BYTES = 64 * 1024;
/** Anti-spam: at most this many requests per e-mail address in the window below. */
const MAX_REQUESTS_PER_EMAIL = 5;
const WINDOW_MINUTES = 15;

function parseContact(raw: Record<string, unknown> = {}) {
  const contact: Record<string, string> = {};
  for (const [field, rule] of Object.entries(CONTACT_FIELDS)) {
    const value = typeof raw[field] === "string" ? (raw[field] as string).trim() : "";
    if (rule.required && !value) return null;
    contact[field] = value.slice(0, rule.max);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return null;
  return contact;
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
  }

  let body: Body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const kind = body.kind === "acompte" ? "acompte" : body.kind === "devis" ? "devis" : null;
  const contact = parseContact(body.client);
  if (!kind || !contact || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Informations incomplètes." }, { status: 400 });
  }

  const priced = await priceProject(body.items);
  if (!priced.items.length) {
    return NextResponse.json({ error: "Votre projet est vide." }, { status: 400 });
  }

  // "virement": the booking is confirmed when the bank transfer is received, no online payment.
  if (kind === "acompte" && !priced.fixed) {
    return NextResponse.json(
      { error: "Cette sélection n'a pas de prix fixe. Demandez un devis." },
      { status: 400 }
    );
  }

  // Online Stripe Checkout for card + wallets; bank transfer skips Stripe.
  const byCard = kind === "acompte" && body.payment !== "virement";
  const stripe = byCard ? getStripe() : null;
  const checkoutMethod = body.payment === "wallet" ? "wallet" : "card";
  const charge = priced.charge;
  if (byCard && (!stripe || charge <= 0)) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas encore configuré. Aucun paiement n'a été effectué." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await admin
    .from("video_projects")
    .select("id", { count: "exact", head: true })
    .eq("contact->>email", contact.email)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_REQUESTS_PER_EMAIL) {
    return NextResponse.json(
      { error: "Trop de demandes envoyées. Veuillez réessayer dans quelques minutes." },
      { status: 429 }
    );
  }

  const { data: auth } = await (await createClient()).auth.getUser();
  if (kind === "acompte" && !auth.user) {
    return NextResponse.json(
      { error: "Connectez-vous ou créez un compte pour payer." },
      { status: 401 }
    );
  }
  if (auth.user) await ensureProfile(auth.user);
  const reference = `AKU-${randomBytes(4).toString("hex").toUpperCase()}`;

  if (kind === "acompte" && (body.termsAccepted !== true || body.privacyAccepted !== true)) {
    return NextResponse.json(
      {
        error:
          "Vous devez accepter les Conditions Générales de Vente et d'Utilisation et la Politique de confidentialité pour continuer.",
      },
      { status: 400 }
    );
  }

  const earlyStart = kind === "acompte" ? buildEarlyStartRecord(body.earlyStartAccepted === true) : null;
  const termsAcceptedAt = kind === "acompte" ? new Date().toISOString() : null;
  const [terms, privacy] = kind === "acompte" ? await Promise.all([getTerms(), getPrivacy()]) : [null, null];
  const storedContact =
    kind === "acompte" && terms && privacy && termsAcceptedAt
      ? {
          ...contact,
          ...(earlyStart ? earlyStartContactFields(earlyStart) : {}),
          ...termsContactFields(terms, termsAcceptedAt),
          ...privacyContactFields(privacy, termsAcceptedAt),
        }
      : contact;

  const universe: ProjectUniverse = projectUniverseFromCart(body.items);
  const row = {
    reference,
    user_id: auth.user?.id ?? null,
    kind,
    status: kind === "acompte" ? "acompte_en_attente" : "nouveau",
    contact: storedContact,
    items: priced.items,
    total_cents: priced.total * 100,
    deposit_cents: kind === "acompte" ? charge * 100 : 0,
    universe,
  };
  let { data: project, error } = await admin.from("video_projects").insert(row).select("id").single();
  // Before migration 029 the universe column does not exist — retry without it.
  if (error && /universe/i.test(error.message)) {
    const { universe: _u, ...legacy } = row;
    void _u;
    ({ data: project, error } = await admin.from("video_projects").insert(legacy).select("id").single());
  }
  if (error || !project) {
    console.error("video_projects insert failed:", error?.message);
    return NextResponse.json({ error: "Enregistrement impossible. Veuillez réessayer." }, { status: 500 });
  }

  if (kind === "acompte" && termsAcceptedAt && terms && privacy) {
    const recorded = await recordProjectTermsAcceptance({
      userId: auth.user?.id ?? null,
      projectId: project.id,
      plan: reference,
      options: priced.items,
      acceptedAt: termsAcceptedAt,
      termsVersion: terms.version,
      termsLabel: terms.label,
      privacyVersion: privacy.version,
      privacyLabel: privacy.label,
    });
    if (!recorded) {
      await admin.from("video_projects").delete().eq("id", project.id);
      return NextResponse.json(
        { error: "L'acceptation des documents n'a pas pu être enregistrée. Aucun paiement n'a été effectué." },
        { status: 500 }
      );
    }
  }

  const summary = {
    ref: reference,
    total: priced.total,
    acompte: kind === "acompte" ? charge : 0,
    universe,
  };
  const lang = body.lang === "en" ? "en" : "fr";
  if (!byCard) {
    // Card deposits are confirmed (and e-mailed) by the Stripe webhook once paid.
    after(() =>
      sendProjectEmails(
        {
          reference,
          kind,
          contact: storedContact,
          items: priced.items,
          total: priced.total,
          deposit: summary.acompte,
          lang,
          earlyStart,
        },
        "received"
      )
    );
    return NextResponse.json(summary);
  }

  const site = getSiteUrl();
  const successQs = new URLSearchParams({ paid: "1", ref: reference, universe });
  const checkoutTitle =
    universe === "agents"
      ? `Paiement Agents IA — ${reference}`
      : universe === "digital"
        ? `Paiement Digital — ${reference}`
        : priced.fixed
          ? `Paiement Marketing — ${reference}`
          : `Acompte ${priced.depositPercent} % — projet vidéo ${reference}`;
  const cancelUrl =
    universe === "agents" ? `${site}/agents-ia` : universe === "digital" ? `${site}/digital` : `${site}/acompte`;
  let session;
  try {
    session = await stripe!.checkout.sessions.create({
      mode: "payment",
      customer_email: contact.email,
      locale: checkoutLocale(body.lang),
      // Card Checkout surfaces Apple Pay / Google Pay when enabled in the Stripe Dashboard.
      allowed_payment_method_types: allowedCheckoutMethods(checkoutMethod),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: charge * 100,
            product_data: {
              name: checkoutTitle,
              description: priced.items.map((i) => i.service).join(", ").slice(0, 500),
            },
          },
        },
      ],
      metadata: {
        kind: "deposit",
        project_id: project.id,
        reference,
        lang,
        universe,
      },
      payment_intent_data: {
        metadata: { kind: "deposit", project_id: project.id, reference, universe },
      },
      success_url: `${site}/confirmation?${successQs.toString()}`,
      cancel_url: cancelUrl,
    });
  } catch (cause) {
    console.error("Stripe deposit checkout failed:", cause);
    return NextResponse.json(
      { error: `Le paiement en ligne est momentanément indisponible. Votre demande est enregistrée (${reference}).` },
      { status: 502 }
    );
  }

  await admin.from("video_projects").update({ stripe_checkout_session_id: session.id }).eq("id", project.id);
  return NextResponse.json({ ...summary, checkoutUrl: session.url });
}
