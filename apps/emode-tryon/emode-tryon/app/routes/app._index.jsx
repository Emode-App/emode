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
  starter: { dailyLimit: 50, unlimited: false, marketplace: false },
  pro: { dailyLimit: 200, unlimited: false, marketplace: true },
  growth: { dailyLimit: 0, unlimited: true, marketplace: true },
};

// Shopify has no notion of emode's marketplace categories, so derive one from
// productType (falling back to the title). Without this every product syncs as
// 'uncategorized' and all six marketplace category filters return nothing.
// Order matters: outerwear is tested before tops so "Denim Jacket" does not
// match a generic top rule.
const CATEGORY_RULES = [
  [/jacket|coat|bomber|blazer|parka|outerwear|vest|puffer/i, "outerwear"],
  [/dress|gown/i, "dresses"],
  [/pant|trouser|jean|short|skirt|legging|chino/i, "bottoms"],
  [/shoe|sneaker|boot|heel|sandal|loafer/i, "shoes"],
  [/hat|cap|bag|belt|scarf|glove|sock|jewel|accessor/i, "accessories"],
  [/shirt|tee|top|blouse|sweater|hoodie|knit|cardigan/i, "tops"],
];

function categoryFor(productType, title) {
  const haystack = `${productType || ""} ${title || ""}`;
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(haystack)) return category;
  }
  return "uncategorized";
}

// Give the merchant an emode account keyed to their shop email and link it to
// the merchant row. Without owner_user_id, getMerchantForUser() in the web app
// can never resolve a Shopify merchant, so the admin dashboard shows the
// "no merchant account linked" state forever.
//
// The account is created pre-confirmed and passwordless: emode signs in with a
// magic link, so the merchant just enters this same email at /login.
async function linkMerchantAccount(admin, merchant) {
  if (merchant.owner_user_id) return merchant;

  let shopProfile = {};
  try {
    const res = await admin.graphql(`{ shop { name email } }`);
    shopProfile = (await res.json())?.data?.shop || {};
  } catch (err) {
    console.error("[emode] Could not read shop profile:", err);
    return merchant;
  }

  const email = shopProfile.email;
  if (!email) {
    console.warn("[emode] Shop has no email; cannot auto-create an emode account.");
    return merchant;
  }

  let userId = null;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (created?.user) {
    userId = created.user.id;
  } else {
    // Already registered (they may have signed up on emode.style first). The
    // admin API has no lookup-by-email, so scan. Paginated at 1000 to stay
    // correct past the 50-row default page.
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const match = (list?.users || []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) userId = match.id;
    else {
      console.error("[emode] Could not create or find user for", email, createError);
      return merchant;
    }
  }

  const brandName = shopProfile.name || merchant.shop_domain;
  const brandSlug = String(brandName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const { data: updated } = await supabase
    .from("merchants")
    .update({
      owner_user_id: userId,
      brand_name: merchant.brand_name || brandName,
      // brand_slug is UNIQUE and powers /marketplace/[brand]; suffix with the
      // shop prefix so two stores with the same name cannot collide.
      brand_slug: merchant.brand_slug || `${brandSlug}-${merchant.shop_domain.split(".")[0].slice(0, 8)}`,
    })
    .eq("id", merchant.id)
    .select()
    .single();

  console.log(`[emode] Linked ${merchant.shop_domain} to emode account ${email}`);
  return updated || merchant;
}

// One-time catalog pull so the merchant's dashboard isn't empty and the
// marketplace has real product data. Runs only when the merchant has no
// products in Supabase yet.
async function syncProducts(admin, merchant, shop, marketplaceVisible) {
  try {
    // status:active only. Without the filter Shopify also returns archived and
    // draft products, so a merchant's emode catalog fills with items that are
    // not for sale — and any of them could surface in the marketplace.
    const response = await admin.graphql(`
      { products(first: 50, query: "status:active") { edges { node {
          id title handle onlineStoreUrl productType
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
          category: categoryFor(node.productType, node.title),
          // The marketplace query filters on this. Left at its default of
          // false, a synced product can never surface there.
          marketplace_visible: marketplaceVisible,
          // Surfaced as a warning in the merchant dashboard: a product with no
          // image cannot be generated against.
          image_quality_status: node.featuredImage?.url ? "ok" : "warning",
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
  let hasTryOns = false;
  if (merchant) {
    // 4. Sync the Shopify billing plan into the emode entitlement — this is what
    // /api/generate actually enforces, so an upgrade via Shopify billing must
    // land here or the merchant keeps starter limits despite paying for Pro.
    // Comped merchants (design partners, free accounts) are exempt from billing
    // sync. Without this their manually-granted plan is silently reset to
    // starter the first time they open the app, because Shopify reports no
    // active subscription.
    const planKey = merchant.comped ? merchant.plan : activePlan.toLowerCase();
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.starter;

    if (!merchant.comped && merchant.plan !== planKey) {
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

    if (!merchant.comped && (!latestEntitlement || latestEntitlement.plan !== planKey)) {
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

      // Marketplace access is plan-gated, so already-synced products have to be
      // re-flagged on any plan change — otherwise upgrading to Pro grants the
      // entitlement but the catalog stays invisible in the marketplace.
      await supabase
        .from("products")
        .update({ marketplace_visible: limits.marketplace })
        .eq("merchant_id", merchant.id);
    }

    // 5. Give the merchant an emode account so the web admin dashboard can
    // find them. Runs once — linkMerchantAccount short-circuits if already set.
    merchant = await linkMerchantAccount(admin, merchant);

    // 6. First-run product catalog sync
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchant.id);
    productCount = count || 0;
    if (productCount === 0) {
      productCount = await syncProducts(admin, merchant, shop, limits.marketplace);
    }

    // Has a shopper ever completed a try-on for this shop? A generation can only
    // originate from the theme extension (or the widget), so its existence is
    // proof the block is installed and working.
    //
    // Inferring beats detecting here: actually reading the published theme's
    // settings_data.json would require the read_themes scope, and adding a scope
    // forces every existing merchant through a re-authorization prompt — a lot
    // of friction to render one banner.
    const { count: genCount } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchant.id);
    hasTryOns = (genCount || 0) > 0;
  }

  // ── The numbers the merchant actually installed this for ──
  //
  // This screen used to report installation state and then send people to
  // another website to find out whether any of it was working. Everything below
  // already existed in the database; none of it was on the page they land on.
  let stats = null;
  let usage = null;
  let topProducts = [];

  if (merchant?.id) {
    const today = new Date().toISOString().slice(0, 10);

    const [statsRes, usageRes, entRes] = await Promise.all([
      supabase.rpc("merchant_tryon_stats", { p_merchant_id: merchant.id, p_days: 30 }),
      supabase
        .from("usage_counters")
        .select("generations_used, overage_used")
        .eq("subject_type", "merchant")
        .eq("subject_id", merchant.id)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("entitlements")
        .select("daily_generation_limit, overage_daily")
        .eq("subject_id", merchant.id)
        .eq("subject_type", "merchant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const row = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
    if (row) {
      const tryOn = Number(row.tryon_visitors) || 0;
      const control = Number(row.control_visitors) || 0;
      const tryOnConv = Number(row.tryon_conversions) || 0;
      const controlConv = Number(row.control_conversions) || 0;

      stats = {
        tryOnVisitors: tryOn,
        // Conversion among shoppers who tried on, against those who saw the
        // button and did not. Without the second number the first means nothing.
        tryOnRate: tryOn ? (tryOnConv / tryOn) * 100 : 0,
        controlRate: control ? (controlConv / control) * 100 : 0,
        revenue: Number(row.tryon_revenue) || 0,
        avgOrderValue: Number(row.tryon_avg_order_value) || 0,
        baselineOrderValue: Number(row.baseline_avg_order_value) || 0,
        refunded: Number(row.tryon_orders_refunded) || 0,
      };
    }

    const included = entRes.data?.daily_generation_limit ?? 0;
    usage = {
      used: usageRes.data?.generations_used ?? 0,
      overage: usageRes.data?.overage_used ?? 0,
      included,
      ceiling: included + (entRes.data?.overage_daily ?? 0),
    };

    const { data: products } = await supabase
      .from("products")
      .select("id, title")
      .eq("merchant_id", merchant.id)
      .limit(50);

    if (products?.length) {
      const { data: byProduct } = await supabase
        .from("generation_products")
        .select("product_id")
        .in("product_id", products.map((p) => p.id));

      const counts = new Map();
      for (const g of byProduct || []) {
        counts.set(g.product_id, (counts.get(g.product_id) || 0) + 1);
      }
      topProducts = products
        .map((p) => ({ title: p.title, tryOns: counts.get(p.id) || 0 }))
        .filter((p) => p.tryOns > 0)
        .sort((a, b) => b.tryOns - a.tryOns)
        .slice(0, 5);
    }
  }

  return {
    merchant,
    activePlan,
    productCount,
    hasTryOns,
    stats,
    usage,
    topProducts,
    // Shown so the merchant knows which email opens their emode dashboard.
    ownerLinked: Boolean(merchant?.owner_user_id),
  };
};

export default function Index() {
  const { merchant, activePlan, productCount, ownerLinked, hasTryOns, stats, usage, topProducts } =
    useLoaderData();

  const money = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
      .format(n || 0);
  const pct = (n) => `${(n || 0).toFixed(1)}%`;

  // The lift is the whole claim: shoppers who tried on, against shoppers who saw
  // the button and did not. Shown only once both sides have enough traffic to
  // mean anything, because a lift computed from four visitors is noise wearing a
  // number's clothes.
  const hasSignal = stats && stats.tryOnVisitors >= 20;
  const lift = hasSignal && stats.controlRate > 0
    ? ((stats.tryOnRate - stats.controlRate) / stats.controlRate) * 100
    : null;

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
                {ownerLinked && (
                  <Box paddingBlockStart="200">
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Deeper analytics, the marketplace and Studio live at{" "}
                      <b>emode.style/login</b>. Sign in with this store&apos;s contact
                      email — the account already exists and uses a magic link, so
                      there&apos;s no password to set.
                    </Text>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">Last 30 days</Text>
                  {stats && !hasSignal && (
                    <Badge>Gathering data</Badge>
                  )}
                </InlineStack>

                {!stats || stats.tryOnVisitors === 0 ? (
                  <Text variant="bodyMd" as="p" tone="subdued">
                    No try-ons yet. Once shoppers start using the button, this fills
                    in with how many tried something on, whether they bought more
                    often than shoppers who didn&apos;t, and what that was worth.
                  </Text>
                ) : (
                  <BlockStack gap="400">
                    <InlineStack gap="800" wrap>
                      <BlockStack gap="100">
                        <Text variant="bodySm" as="p" tone="subdued">Shoppers who tried on</Text>
                        <Text variant="heading2xl" as="p">{stats.tryOnVisitors.toLocaleString()}</Text>
                      </BlockStack>

                      <BlockStack gap="100">
                        <Text variant="bodySm" as="p" tone="subdued">Attributed revenue</Text>
                        <Text variant="heading2xl" as="p">{money(stats.revenue)}</Text>
                      </BlockStack>

                      <BlockStack gap="100">
                        <Text variant="bodySm" as="p" tone="subdued">Average order value</Text>
                        <Text variant="heading2xl" as="p">{money(stats.avgOrderValue)}</Text>
                        {stats.baselineOrderValue > 0 && (
                          <Text variant="bodySm" as="p" tone="subdued">
                            {money(stats.baselineOrderValue)} without try-on
                          </Text>
                        )}
                      </BlockStack>
                    </InlineStack>

                    <Box borderColor="border" borderBlockStartWidth="025" paddingBlockStart="400">
                      {hasSignal ? (
                        <InlineStack gap="800" wrap>
                          <BlockStack gap="100">
                            <Text variant="bodySm" as="p" tone="subdued">Tried on, then bought</Text>
                            <Text variant="headingLg" as="p">{pct(stats.tryOnRate)}</Text>
                          </BlockStack>
                          <BlockStack gap="100">
                            <Text variant="bodySm" as="p" tone="subdued">Saw the button, didn&apos;t use it</Text>
                            <Text variant="headingLg" as="p">{pct(stats.controlRate)}</Text>
                          </BlockStack>
                          {lift !== null && (
                            <BlockStack gap="100">
                              <Text variant="bodySm" as="p" tone="subdued">Difference</Text>
                              <Text variant="headingLg" as="p" tone={lift >= 0 ? "success" : "critical"}>
                                {lift >= 0 ? "+" : ""}{lift.toFixed(0)}%
                              </Text>
                            </BlockStack>
                          )}
                        </InlineStack>
                      ) : (
                        <Text variant="bodyMd" as="p" tone="subdued">
                          Conversion needs about 20 try-on shoppers before the
                          comparison means anything. {stats.tryOnVisitors} so far.
                        </Text>
                      )}
                    </Box>

                    {stats.refunded > 0 && (
                      <Text variant="bodySm" as="p" tone="subdued">
                        {stats.refunded} attributed order{stats.refunded === 1 ? " was" : "s were"} refunded,
                        already deducted above.
                      </Text>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {topProducts?.length > 0 && (
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Most tried on</Text>
                  {topProducts.map((p) => (
                    <InlineStack key={p.title} align="space-between" blockAlign="center">
                      <Text variant="bodyMd" as="p">{p.title}</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        {p.tryOns.toLocaleString()} try-on{p.tryOns === 1 ? "" : "s"}
                      </Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Current Plan
                </Text>
                <Badge tone="info">{activePlan}</Badge>

                {/* Read from the entitlement, not guessed from the plan name.
                    This card previously hardcoded "50" in the markup, so it
                    reported a number the backend had never agreed to and could
                    not follow a plan change. */}
                {usage && usage.included > 0 ? (
                  <BlockStack gap="150">
                    <Text variant="bodyMd" as="p">
                      <b>{usage.used.toLocaleString()}</b> of{" "}
                      {usage.included.toLocaleString()} try-ons used today
                    </Text>
                    <Box background="bg-fill-tertiary" borderRadius="100" minHeight="6px">
                      <Box
                        background={usage.overage > 0 ? "bg-fill-caution" : "bg-fill-brand"}
                        borderRadius="100"
                        minHeight="6px"
                        width={`${Math.min(100, (usage.used / usage.included) * 100)}%`}
                      />
                    </Box>
                    {usage.overage > 0 ? (
                      <Text variant="bodySm" as="p" tone="caution">
                        {usage.overage.toLocaleString()} beyond your plan today. Try-ons
                        keep working and the extra is billed at the end of the month.
                      </Text>
                    ) : (
                      <Text variant="bodySm" as="p" tone="subdued">
                        Resets at midnight UTC. Busy days keep working past this and
                        are billed as they go.
                      </Text>
                    )}
                  </BlockStack>
                ) : (
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Usage appears here once your plan is active.
                  </Text>
                )}

                <Button url="/app/subscribe?plan=Pro" variant="primary">
                  Upgrade to Pro
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {hasTryOns ? (
              <Banner title="Theme extension is live" tone="success">
                <p>
                  Shoppers have completed try-ons on your storefront, so the{" "}
                  <b>emodeAI Buttons</b> block is installed and working. Use the
                  Theme Editor below if you want to move or restyle it.
                </p>
                <Box paddingBlockStart="200">
                  <Button url={`shopify:admin/themes/current/editor?context=apps`} target="_blank">
                    Open Theme Editor
                  </Button>
                </Box>
              </Banner>
            ) : (
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
            )}
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
