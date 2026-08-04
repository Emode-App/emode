import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

/**
 * refunds/create — return rate on tried-on orders.
 *
 * The claim that virtual try-on reduces returns is the one merchants care about
 * most (returns are pure margin loss), and it is the hardest to fake. This is
 * the data behind it.
 *
 * Accumulates rather than overwrites: an order can be refunded in several
 * partial steps, and each arrives as its own webhook.
 *
 * Expect this to report zero for weeks. Return windows are typically 30 days,
 * so the metric only becomes meaningful well after launch.
 */
export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  try {
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("shop_domain", shop)
      .maybeSingle();

    if (!merchant) {
      console.warn(`[emode] ${topic} for unknown shop ${shop}`);
      return new Response();
    }

    const orderId = String(payload?.order_id || "");
    if (!orderId) return new Response();

    // Sum this refund's transactions. refund_line_items alone would miss
    // shipping refunds and manual adjustments.
    const amount = (payload?.transactions || []).reduce(
      (sum, t) => sum + (parseFloat(t?.amount) || 0),
      0
    );
    if (amount <= 0) return new Response();

    const { data: existing } = await supabase
      .from("orders")
      .select("id, refunded_total")
      .eq("merchant_id", merchant.id)
      .eq("platform_order_id", orderId)
      .maybeSingle();

    if (!existing) {
      // The order predates emode being installed, so there is nothing to
      // attribute it to. Not an error.
      console.log(`[emode] Refund for untracked order ${orderId}`);
      return new Response();
    }

    await supabase
      .from("orders")
      .update({
        refunded_total: Number(existing.refunded_total || 0) + amount,
        refunded_at: payload?.created_at || new Date().toISOString(),
      })
      .eq("id", existing.id);

    console.log(`[emode] Recorded ${amount} refund on order ${orderId}`);
  } catch (err) {
    console.error("[emode] refunds/create handler failed:", err);
  }

  return new Response();
};
