import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  Banner,
  Badge,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { supabase } from "../supabase.server";

// Shopify billing plan names → emode entitlement limits (mirrors
// apps/web/lib/stripe-plan-config.ts — keep in sync if plans change)
const PLAN_LIMITS = {
  starter: { dailyLimit: 50, unlimited: false },
  pro: { dailyLimit: 200, unlimited: false },
  growth: { dailyLimit: 0, unlimited: true },
};

// One-time catalog pull so the merchant's dashboard isn't empty and the
// marketplace has real product data. Runs only when the merchant has no
// products in Supabase yet.
async function syncProducts(admin, merchant, shop) {
  try {
    const response = await admin.graphql(`
      { products(first: 50) { edges { node {
          id title handle onlineStoreUrl
          featuredImage { url }
          variants(first: 1) { edges { node { id price } } }
      } } } }`);
    const body = await response.json();
    const edges = body?.data?.products?.edges || [];

    for (const { node } of edges) {
      // Select-then-insert: platform_product_id has no unique constraint,
      // so ON CONFLICT upserts are not an option here.
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("merchant_id", merchant.id)
        .eq("platform_product_id", node.id)
        .limit(1)
        .maybeSingle();
      if (existing) continue;

      const { data: product, error: pError } = await supabase
        .from("products")
        .insert({
          merchant_id: merchant.id,
          platform_product_id: node.id,
          title: node.title,
          handle: node.handle,
          primary_image_url: node.featuredImage?.url || null,
          buy_url: node.onlineStoreUrl || `https://${shop}/products/${node.handle}`,
        })
        .select("id")
        .single();
      if (pError || !product) {
        console.error("[emode] Product sync insert failed:", pError);
        continue;
      }

      const variant = node.variants?.edges?.[0]?.node;
      if (variant) {
        await supabase.from("variants").insert({
          product_id: product.id,
          platform_variant_id: variant.id,
          price: parseFloat(variant.price) || null,
          image_url: node.featuredImage?.url || null,
        });
      }
    }
    console.log(`[emode] Synced ${edges.length} products for ${shop}`);
    return edges.length;
  } catch (err) {
    console.error("[emode] Product sync failed:", err);
    return 0;
  }
}

export const loader = async ({ request }) => {
  const { session, billing, admin } = await authenticate.admin(request);
  const { shop } = session;

  // 1. Check if merchant exists in emode Supabase
  let { data: merchant, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("shop_domain", shop)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Supabase error fetching merchant:", error);
  }

  // 2. Register if not found
  if (!merchant) {
    const { data: newMerchant, error: insertError } = await supabase
      .from("merchants")
      .insert([{ shop_domain: shop, platform: "shopify", plan: "starter" }])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase error creating merchant:", insertError);
    } else {
      merchant = newMerchant;
      await supabase.from("entitlements").insert([
        {
          subject_type: "merchant",
          subject_id: merchant.id,
          plan: "starter",
          daily_generation_limit: 50,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    }
  }

  // 3. Check billing status from Shopify
  const billingCheck = await billing.check();
  const activePlan = billingCheck.appSubscriptions[0]?.name || "Starter";

  let productCount = 0;
  if (merchant) {
    // 4. Sync the Shopify billing plan into the emode entitlement — this is what
    // /api/generate actually enforces, so an upgrade via Shopify billing must
    // land here or the merchant keeps starter limits despite paying for Pro.
    const planKey = activePlan.toLowerCase();
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.starter;

    if (merchant.plan !== planKey) {
      await supabase.from("merchants").update({ plan: planKey }).eq("id", merchant.id);
      merchant.plan = planKey;
    }

    const { data: latestEntitlement } = await supabase
      .from("entitlements")
      .select("plan")
      .eq("subject_id", merchant.id)
      .eq("subject_type", "merchant")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestEntitlement || latestEntitlement.plan !== planKey) {
      await supabase.from("entitlements").insert([
        {
          subject_type: "merchant",
          subject_id: merchant.id,
          plan: planKey,
          daily_generation_limit: limits.dailyLimit,
          unlimited: limits.unlimited,
          renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    }

    // 5. First-run product catalog sync
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchant.id);
    productCount = count || 0;
    if (productCount === 0) {
      productCount = await syncProducts(admin, merchant, shop);
    }
  }

  return { merchant, activePlan, productCount };
};

export default function Index() {
  const { merchant, activePlan, productCount } = useLoaderData();

  return (
    <Page>
      <TitleBar title="emodeAI Dashboard" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Installation Status
                  </Text>
                  <Badge tone="success">Connected to emode AI</Badge>
                </InlineStack>
                <Text variant="bodyMd" as="p">
                  Your shop <b>{merchant?.shop_domain}</b> is correctly linked to the emode AI backend.
                  Virtual try-ons are enabled for your product pages once the theme extension is active.
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  {productCount > 0
                    ? `${productCount} products synced to emode.`
                    : "No products synced yet — they'll sync automatically on next load."}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Current Plan
                </Text>
                <Badge tone="info">{activePlan}</Badge>
                <Text variant="bodyMd" as="p">
                  Daily Limit: {activePlan === "Starter" ? "50" : activePlan === "Pro" ? "200" : "500"} try-ons
                </Text>
                <Button url="/app/subscribe?plan=Pro" variant="primary">
                  Upgrade to Pro
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Banner title="Action Required: Activate Theme Extension" tone="warning">
              <p>
                To show the try-on buttons on your product pages, you must go to your Theme Editor 
                and add the <b>emodeAI Buttons</b> app block.
              </p>
              {/* Polaris v12 uses logical properties; `paddingTop` is not a
                  recognized prop and gets forwarded to the DOM, which React
                  warns about. */}
              <Box paddingBlockStart="200">
                <Button url={`shopify:admin/themes/current/editor?context=apps`} target="_blank">
                  Open Theme Editor
                </Button>
              </Box>
            </Banner>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
