import { authenticate } from "../shopify.server";

// Must match the keys of the `billing` config in shopify.server.js. Anything
// else reaches Shopify as an unknown plan and surfaces as an opaque
// "Invalid billing configuration" error in the merchant's admin iframe.
const PLANS = ["Starter", "Pro", "Growth"];

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const requested = url.searchParams.get("plan") || "Pro";

  // Case-insensitive, so ?plan=pro works as well as ?plan=Pro.
  const plan = PLANS.find((p) => p.toLowerCase() === requested.toLowerCase());
  if (!plan) {
    throw new Response(
      `Unknown plan "${requested}". Expected one of: ${PLANS.join(", ")}.`,
      { status: 400 }
    );
  }

  try {
    // billing.request throws a redirect to Shopify's confirmation page, so a
    // Response escaping here is the success path, not a failure.
    return await billing.request({
      plan,
      // Test charges against development stores, real ones in production.
      // Hardcoding `true` would mean live merchants confirm a subscription and
      // are never actually charged.
      isTest: process.env.NODE_ENV !== "production",
      returnUrl: "/app",
    });
  } catch (err) {
    // Re-throw redirects untouched — that is billing.request succeeding.
    if (err instanceof Response) throw err;

    // Shopify's client nests the useful part in graphQLErrors, which Node's
    // console prints as "[Array]" at default depth — so a real billing failure
    // showed up in the logs as an unreadable blob. Flatten it explicitly.
    const gql = err?.graphQLErrors || err?.body?.errors || err?.errors?.graphQLErrors;
    console.error(
      "[emode] billing.request failed for plan",
      plan,
      "\n  message:", err?.message,
      "\n  graphQLErrors:", JSON.stringify(gql, null, 2)
    );

    throw new Response(
      `Could not start the ${plan} subscription. ${err?.message || "Unknown billing error."}`,
      { status: 500 }
    );
  }
};
