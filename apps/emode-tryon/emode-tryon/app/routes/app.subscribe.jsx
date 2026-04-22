import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") || "Pro";

  await billing.request({
    plan,
    isTest: true, // Set to false for production
    returnUrl: "/app",
  });
  
  return null;
};
