import "server-only";
import { MARKETING_CATEGORIES } from "@/config/marketing";
import { PROJECT_UNIVERSE_LABELS, resolveProjectUniverse } from "@/lib/projects/universe";
import { createClient } from "@/lib/supabase/server";
import { getVideoConfig } from "@/lib/video-config";
import { loadCommerciaux, loadVideastes, PAID, selectProjects } from "./team";

/**
 * Rapports & statistiques, computed live from real rows:
 *   revenue by category / top products ← line items of paid video projects (items[].service + price)
 *                                         + paid subscription payments
 *   revenue trend                       ← paid payments per month (real, not simulated)
 *   team performance                    ← the same loaders as the Commerciaux / Vidéastes pages
 *
 * Top-level categories are the three site universes (Agents IA · Marketing · Digital).
 */

export const REPORT_PERIODS = ["mois", "3m", "12m", "tout"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

const DAY = 86_400_000;
const startOfMonth = (d: Date, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);
const periodStart = (p: ReportPeriod, now: Date) =>
  p === "mois" ? startOfMonth(now) : p === "3m" ? startOfMonth(now, -2) : p === "12m" ? startOfMonth(now, -11) : null;

export async function loadReports(period: ReportPeriod, now = new Date()) {
  const supabase = await createClient();
  const [cfg, { projects }, paymentsRes, commerciaux, videastes] = await Promise.all([
    getVideoConfig(),
    selectProjects(supabase, { extra: "items", statuses: [...PAID] }, 5000),
    supabase.from("payments").select("kind, amount_cents, status, created_at, project_id, user_id").eq("status", "paid").limit(20000),
    loadCommerciaux(now),
    loadVideastes(now),
  ]);
  const payments = (paymentsRes.data ?? []) as { kind: string; amount_cents: number; created_at: string; project_id: string | null; user_id: string | null }[];

  // Sub-label within Marketing for video services / forfaits (still rolled into Marketing totals).
  const slugByName = new Map(cfg.services.map((s) => [s.name, s.slug]));
  const categoryBySlug = new Map(MARKETING_CATEGORIES.flatMap((c) => c.slugs.map((slug) => [slug, c.name] as const)));
  const marketingDetailOf = (service: string) => {
    if (service.startsWith("Forfait ")) return "Forfaits marketing";
    const slug = slugByName.get(service);
    return (slug && categoryBySlug.get(slug)) || "Vidéos — autres";
  };

  // The sale date is when the first payment (deposit) arrived; older rows fall back to the request date.
  const firstPayment = new Map<string, string>();
  for (const p of payments) if (p.project_id && (!firstPayment.has(p.project_id) || p.created_at < firstPayment.get(p.project_id)!)) firstPayment.set(p.project_id, p.created_at);
  const from = periodStart(period, now);
  const inPeriod = (iso: string) => !from || new Date(iso) >= from;

  const byCategory = new Map<string, number>();
  const byProduct = new Map<string, { cents: number; count: number }>();
  const clientsFirstSale = new Map<string, string>();
  let salesCount = 0;
  let revenueCents = 0;

  for (const p of projects) {
    const date = firstPayment.get(p.id) ?? p.created_at;
    const key = p.user_id ? `u:${p.user_id}` : `e:${(p.email ?? p.id).toLowerCase()}`;
    if (!clientsFirstSale.has(key) || date < clientsFirstSale.get(key)!) clientsFirstSale.set(key, date);
    if (!inPeriod(date)) continue;
    salesCount += 1;
    revenueCents += p.total_cents;
    const universe = resolveProjectUniverse(p.universe, p.items);
    const universeLabel = PROJECT_UNIVERSE_LABELS[universe];
    for (const item of p.items ?? []) {
      const cents = Math.round(Number(item.price) * 100) || 0;
      const cat =
        universe === "marketing"
          ? `${universeLabel} · ${marketingDetailOf(item.service)}`
          : universeLabel;
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + cents);
      const prod = byProduct.get(item.service) ?? { cents: 0, count: 0 };
      byProduct.set(item.service, { cents: prod.cents + cents, count: prod.count + 1 });
    }
  }
  for (const pay of payments) {
    if (pay.kind !== "subscription") continue;
    if (pay.user_id) {
      const key = `u:${pay.user_id}`;
      if (!clientsFirstSale.has(key) || pay.created_at < clientsFirstSale.get(key)!) clientsFirstSale.set(key, pay.created_at);
    }
    if (!inPeriod(pay.created_at)) continue;
    salesCount += 1;
    revenueCents += pay.amount_cents;
    const agentsLabel = PROJECT_UNIVERSE_LABELS.agents;
    byCategory.set(agentsLabel, (byCategory.get(agentsLabel) ?? 0) + pay.amount_cents);
    const prod = byProduct.get("Abonnement Agents IA") ?? { cents: 0, count: 0 };
    byProduct.set("Abonnement Agents IA", { cents: prod.cents + pay.amount_cents, count: prod.count + 1 });
  }

  const categoryTotal = [...byCategory.values()].reduce((a, b) => a + b, 0);
  const trend = Array.from({ length: 12 }, (_, i) => {
    const start = startOfMonth(now, i - 11);
    const end = startOfMonth(now, i - 10);
    const rows = payments.filter((p) => new Date(p.created_at) >= start && new Date(p.created_at) < end);
    return { month: start.toISOString(), cents: rows.reduce((s, p) => s + p.amount_cents, 0), count: rows.length };
  });

  return {
    period,
    kpis: {
      revenueCents,
      sales: salesCount,
      newClients: [...clientsFirstSale.values()].filter(inPeriod).length,
      averageCents: salesCount ? Math.round(revenueCents / salesCount) : 0,
      collected30Cents: payments.filter((p) => new Date(p.created_at).getTime() >= now.getTime() - 30 * DAY).reduce((s, p) => s + p.amount_cents, 0),
    },
    categories: [...byCategory.entries()]
      .map(([name, cents]) => ({ name, cents, share: categoryTotal ? Math.round((cents / categoryTotal) * 1000) / 10 : 0 }))
      .sort((a, b) => b.cents - a.cents),
    topProducts: [...byProduct.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.cents - a.cents).slice(0, 10),
    trend,
    commerciaux: commerciaux.migrated ? commerciaux.rows : null,
    videastes: videastes.migrated ? videastes.rows : null,
  };
}
