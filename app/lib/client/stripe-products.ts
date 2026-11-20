import "server-only";
import type Stripe from "stripe";

/*
 * Active Stripe product for each client-space plan. Checkout creates its product inline (product_data), and
 * Stripe marks such products inactive: a new price can no longer be attached to them, so plan / option /
 * cycle changes must use an active product. One product per plan (metadata aku_plan = plan id), found or
 * created once, then cached for the life of the server process. Its name is what invoices show.
 */

const cache = new Map<string, string>();

export async function planProduct(stripe: Stripe, planId: string, planName: string): Promise<string> {
  const hit = cache.get(planId);
  if (hit) return hit;

  let id: string | undefined;
  try {
    const found = await stripe.products.search({ query: `active:'true' AND metadata['aku_plan']:'${planId.replace(/'/g, "")}'`, limit: 1 });
    id = found.data[0]?.id;
  } catch {
    // Search unavailable on some accounts: scan the active products instead.
    for await (const p of stripe.products.list({ active: true, limit: 100 })) {
      if (p.metadata?.aku_plan === planId) {
        id = p.id;
        break;
      }
    }
  }
  if (!id) {
    const created = await stripe.products.create(
      { name: planName, metadata: { aku_plan: planId } },
      { idempotencyKey: `aku-plan-product-${planId}` }
    );
    id = created.id;
  }
  cache.set(planId, id);
  return id;
}
