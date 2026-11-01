import { after, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { ensureProfile } from "@/lib/auth/session";
import { sendProjectEmails } from "@/lib/projects/emails";
import { priceProject, type ProjectItemInput } from "@/lib/projects/pricing";
import { checkoutLocale, getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";

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
  const byCard = kind === "acompte" && body.payment !== "virement";
  const stripe = byCard ? getStripe() : null;
  if (byCard && (!stripe || priced.deposit <= 0)) {
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
  if (auth.user) await ensureProfile(auth.user);
  const reference = `AKU-${randomBytes(4).toString("hex").toUpperCase()}`;

  const { data: project, error } = await admin
    .from("video_projects")
    .insert({
      reference,
      user_id: auth.user?.id ?? null,
      kind,
      status: kind === "acompte" ? "acompte_en_attente" : "nouveau",
      contact,
      items: priced.items,
      total_cents: priced.total * 100,
      deposit_cents: kind === "acompte" ? priced.deposit * 100 : 0,
    })
    .select("id")
    .single();
  if (error || !project) {
    console.error("video_projects insert failed:", error?.message);
    return NextResponse.json({ error: "Enregistrement impossible. Veuillez réessayer." }, { status: 500 });
  }

  const summary = { ref: reference, total: priced.total, acompte: kind === "acompte" ? priced.deposit : 0 };
  const lang = body.lang === "en" ? "en" : "fr";
  if (!byCard) {
    // Card deposits are confirmed (and e-mailed) by the Stripe webhook once paid.
    after(() =>
      sendProjectEmails({ reference, kind, contact, items: priced.items, total: priced.total, deposit: summary.acompte, lang }, "received")
    );
    return NextResponse.json(summary);
  }

  const site = getSiteUrl();
  let session;
  try {
    session = await stripe!.checkout.sessions.create({
      mode: "payment",
      customer_email: contact.email,
      locale: checkoutLocale(body.lang),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: priced.deposit * 100,
            product_data: {
              name: `Acompte ${priced.depositPercent} % — projet vidéo ${reference}`,
              description: priced.items.map((i) => i.service).join(", ").slice(0, 500),
            },
          },
        },
      ],
      metadata: { kind: "deposit", project_id: project.id, reference, lang },
      payment_intent_data: { metadata: { kind: "deposit", project_id: project.id, reference } },
      success_url: `${site}/confirmation.html?paid=1`,
      cancel_url: `${site}/acompte.html`,
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
