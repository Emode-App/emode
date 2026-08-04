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

  // billing.request throws a redirect to Shopify's confirmation page.
  return billing.request({
    plan,
    // Test charges against development stores, real ones in production.
    // Hardcoding `true` would mean live merchants confirm a subscription and
    // are never actually charged.
    isTest: process.env.NODE_ENV !== "production",
    returnUrl: "/app",
  });
};
