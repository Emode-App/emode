import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Mandatory GDPR: Shop redact
  // When a shop requests data deletion (e.g. 48h after uninstallation).
  if (shop) {
    // Delete data for this shop in emode Supabase
    // We should look up the merchant by shop_domain and delete them.
    // CASCADE will handle related products, variants, etc. if schema allows.
    
    const { error } = await supabase
      .from("merchants")
      .delete()
      .eq("shop_domain", shop);

    if (error) {
      console.error(`Error redacting shop ${shop}:`, error);
    }
  }

  return new Response();
};
