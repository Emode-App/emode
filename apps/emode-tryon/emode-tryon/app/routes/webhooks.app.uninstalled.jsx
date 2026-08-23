import { authenticate } from "../shopify.server";
import db from "../db.server";
import { supabase } from "../supabase.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already
  // been uninstalled. The session may already be gone — still delete, and
  // still revoke the emode entitlement. Leaving the entitlement in place is
  // how an uninstalled store kept generating on a paid plan: /api/generate
  // reads entitlements, not Shopify billing.
  await db.session.deleteMany({ where: { shop } });

  const { data: merchant, error } = await supabase
    .from("merchants")
    .select("id, comped")
    .eq("shop_domain", shop)
    .maybeSingle();

  if (error) {
    console.error("[emode] uninstall: could not load merchant", shop, error);
    return new Response();
  }

  if (!merchant) {
    return new Response();
  }

  // Design partners are granted a plan in Supabase with no Shopify charge, and
  // uninstalling the admin app must not strip that grant -- they would
  // reinstall into billing.require otherwise, with nobody around to re-comp
  // them. But that grant is about billing, not about whether the app is
  // connected. This used to return before reaching marketplace_visible too,
  // so a comped merchant's products kept appearing in the PUBLIC marketplace
  // after they disconnected -- indistinguishable, to a stranger browsing it,
  // from a store that never left. Visibility is disconnect state; plan is
  // billing state. They are different questions and only one of them is
  // "still theirs to control" for a comped account.
  await supabase
    .from("products")
    .update({ marketplace_visible: false })
    .eq("merchant_id", merchant.id);

  if (merchant.comped) {
    console.log(`[emode] uninstall: hid marketplace listings, left comped entitlement intact for ${merchant.id}`);
    return new Response();
  }

  await supabase
    .from("entitlements")
    .delete()
    .eq("subject_id", merchant.id)
    .eq("subject_type", "merchant");

  await supabase
    .from("merchants")
    .update({ plan: "cancelled" })
    .eq("id", merchant.id);

  console.log(`[emode] uninstall: revoked entitlements for ${shop} (${merchant.id})`);

  return new Response();
};
