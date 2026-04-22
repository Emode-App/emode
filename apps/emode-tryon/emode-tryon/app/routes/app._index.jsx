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

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
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

  return { merchant, activePlan };
};

export default function Index() {
  const { merchant, activePlan } = useLoaderData();

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
              <Box paddingTop="200">
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
