import { authenticate } from "../shopify.server";

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
  const requested = url.searchParams.get("plan") || "Pro";

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
