import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Badge,
  Box,
  List,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

// Prices mirror the `billing` config in shopify.server.js; allowances mirror
// apps/web/lib/stripe-plan-config.ts. All three have to agree, because a
// listing that disagrees with the charge a merchant sees is a rejection under
// requirement 4.2.1 and a support problem afterwards.
const PLAN_DETAILS = [
  {
    name: "Starter",
    price: 29,
    included: 500,
    features: ["Try-on button on every product page", "Dressing room", "Try-on to purchase attribution"],
  },
  {
    name: "Pro",
    price: 79,
    included: 2000,
    features: ["Everything in Starter", "AI model shots from a flat product image", "Advanced analytics"],
  },
  {
    name: "Growth",
    price: 149,
    included: 5000,
    features: ["Everything in Pro", "Scene control on model shots", "Priority processing"],
  },
];

// Must match the keys of the `billing` config in shopify.server.js. Anything
// else reaches Shopify as an unknown plan and surfaces as an opaque
// "Invalid billing configuration" error in the merchant's admin iframe.
const PLANS = ["Starter", "Pro", "Growth"];

// Development and Plus-partner-sandbox stores cannot be charged real money;
// attempting it fails with an opaque "Error while billing the store". Test
// charges are required there and forbidden from counting as revenue on a real
// store, so the flag has to follow the SHOP, not the deployment environment.
//
// An earlier version keyed this off NODE_ENV, which is exactly wrong: the
// container runs with NODE_ENV=production, so every dev-store upgrade tried to
// raise a live charge and failed.
async function isDevelopmentStore(admin) {
  try {
    const res = await admin.graphql(
      `{ shop { plan { partnerDevelopment shopifyPlus } } }`
    );
    const plan = (await res.json())?.data?.shop?.plan;
    return Boolean(plan?.partnerDevelopment);
  } catch (err) {
    console.error("[emode] Could not read shop plan, defaulting to test charge:", err);
    // Safer to fail toward a test charge than to bill someone unexpectedly.
    return true;
  }
}

export const loader = async ({ request }) => {
  const { billing, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const requested = url.searchParams.get("plan");

  // No explicit plan means show the picker. This route used to default to
  // "Pro" and request the charge straight out of the loader, so merely
  // NAVIGATING here started a subscription — a link in the nav bar would have
  // billed whoever clicked it.
  if (!requested) {
    const current = await billing.check();
    return {
      showPicker: true,
      currentPlan: current?.appSubscriptions?.[0]?.name || null,
    };
  }

  // Case-insensitive, so ?plan=pro works as well as ?plan=Pro.
  const plan = PLANS.find((p) => p.toLowerCase() === requested.toLowerCase());
  if (!plan) {
    throw new Response(
      `Unknown plan "${requested}". Expected one of: ${PLANS.join(", ")}.`,
      { status: 400 }
    );
  }

  // Shopify types returnUrl as URL! and rejects a relative path outright:
  //   INVALID_VARIABLE — Invalid url '/app', missing scheme
  // Prefer SHOPIFY_APP_URL (the tunnel under `shopify app dev`, the Fly host in
  // production) and fall back to this request's own origin so the flow still
  // works if the env var is ever missing.
  const appUrl = (process.env.SHOPIFY_APP_URL || url.origin).replace(/\/+$/, "");
  const returnUrl = `${appUrl}/app`;

  const isTest = await isDevelopmentStore(admin);

  try {
    // billing.request throws a redirect to Shopify's confirmation page, so a
    // Response escaping here is the success path, not a failure.
    return await billing.request({
      plan,
      isTest,
      returnUrl,
    });
  } catch (err) {
    // Re-throw redirects untouched — that is billing.request succeeding.
    if (err instanceof Response) throw err;

    // Shopify puts the actual reason in different places depending on failure
    // type — graphQLErrors for query validation, errorData/body for a rejected
    // charge — and Node's console collapses nested objects to "[Array]" at
    // default depth. Rather than guess which field it is this time, dump every
    // own property, including non-enumerable ones like `errorData`.
    const dump = {};
    for (const key of Object.getOwnPropertyNames(err || {})) {
      if (key === "stack") continue;
      try {
        dump[key] = err[key];
      } catch {
        dump[key] = "<unreadable>";
      }
    }

    console.error(
      "[emode] billing.request failed for plan",
      plan,
      "\n  name:", err?.name,
      "\n  message:", err?.message,
      "\n  isTest:", isTest,
      "\n  returnUrl:", returnUrl,
      "\n  full:", JSON.stringify(dump, null, 2)
    );

    throw new Response(
      `Could not start the ${plan} subscription. ${err?.message || "Unknown billing error."}`,
      { status: 500 }
    );
  }
};

/**
 * Plan picker.
 *
 * App Store requirement 1.2.3: a merchant must be able to move between plans,
 * in BOTH directions, without contacting support. There was previously no UI at
 * all here and the dashboard offered only "Upgrade to Pro", so downgrading meant
 * emailing us — which is the requirement stated backwards.
 *
 * Shopify replaces the existing subscription when a new one is accepted, so
 * choosing a cheaper plan is a downgrade with no extra plumbing.
 */
export default function Subscribe() {
  const { showPicker, currentPlan } = useLoaderData();
  if (!showPicker) return null;

  const current = (currentPlan || "").toLowerCase();

  return (
    <Page>
      <TitleBar title="Plan" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {PLAN_DETAILS.map((plan) => {
              const isCurrent = plan.name.toLowerCase() === current;
              return (
                <Card key={plan.name}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h2" variant="headingMd">{plan.name}</Text>
                        {isCurrent && <Badge tone="success">Current plan</Badge>}
                      </InlineStack>
                      <Text as="p" variant="headingMd">${plan.price}/month</Text>
                    </InlineStack>

                    <Text as="p" variant="bodyMd" tone="subdued">
                      {plan.included.toLocaleString()} try-ons a day included.
                      Busy days keep working past that and are billed as they go.
                    </Text>

                    <List>
                      {plan.features.map((f) => (
                        <List.Item key={f}>{f}</List.Item>
                      ))}
                    </List>

                    {!isCurrent && (
                      <Box>
                        <Button
                          url={`/app/subscribe?plan=${plan.name}`}
                          variant={plan.name === "Pro" ? "primary" : "secondary"}
                        >
                          {current && plan.price < currentPrice(current)
                            ? `Switch to ${plan.name}`
                            : `Choose ${plan.name}`}
                        </Button>
                      </Box>
                    )}
                  </BlockStack>
                </Card>
              );
            })}

            <Text as="p" variant="bodySm" tone="subdued">
              Changing plan takes effect immediately and replaces your current
              subscription. To stop charges entirely, uninstall the app from your
              apps list.
            </Text>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function currentPrice(name) {
  return PLAN_DETAILS.find((p) => p.name.toLowerCase() === name)?.price ?? 0;
}
