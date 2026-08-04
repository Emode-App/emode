import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

/**
 * orders/create — the far end of try-on attribution.
 *
 * The theme extension writes the shopper's emode visitor id onto the cart as
 * `_emode_vid`; Shopify carries cart attributes through to the order as
 * note_attributes. Reading it back here is what lets the dashboard say "this
 * order came from someone who tried the item on" rather than just counting
 * try-ons.
 *
 * Orders with no visitor id are still recorded, deliberately: they are the
 * store-wide baseline that try-on conversion and AOV are measured against.
 * Without them there is nothing to compare to.
 *
 * No customer PII is stored — no email, name or address — only what the metrics
 * need. That keeps the protected-customer-data surface minimal when requesting
 * read_orders approval from Shopify.
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

    const attributes = payload?.note_attributes || [];
    const vidAttr = attributes.find((a) => a?.name === "_emode_vid");
    const visitorId = vidAttr?.value ? String(vidAttr.value).slice(0, 64) : null;

    // Shopify sends numeric product ids on line items; everything else in emode
    // keys on the GraphQL GID, so normalize here rather than at read time.
    const productGids = (payload?.line_items || [])
      .map((li) => (li?.product_id ? `gid://shopify/Product/${li.product_id}` : null))
      .filter(Boolean);

    // upsert, not insert: Shopify retries webhooks on any non-2xx or timeout,
    // and a duplicate delivery would otherwise double-count revenue.
    const { error } = await supabase.from("orders").upsert(
      {
        merchant_id: merchant.id,
        platform_order_id: String(payload.id),
        visitor_id: visitorId,
        total_price: parseFloat(payload?.total_price) || 0,
        currency: payload?.currency || null,
        line_item_product_ids: productGids,
        ordered_at: payload?.created_at || new Date().toISOString(),
      },
      { onConflict: "merchant_id,platform_order_id" }
    );

    if (error) console.error("[emode] Order upsert failed:", error);
    else if (visitorId) console.log(`[emode] Attributed order ${payload.id} to visitor ${visitorId}`);
  } catch (err) {
    console.error("[emode] orders/create handler failed:", err);
  }

  // Always 200. A non-2xx makes Shopify retry and eventually disable the
  // subscription — an analytics failure is not worth losing the webhook over.
  return new Response();
};
