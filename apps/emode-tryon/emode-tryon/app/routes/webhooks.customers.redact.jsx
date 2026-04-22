import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Mandatory GDPR: Customer redact
  // Payload contains customer details to be deleted.
  // Implementation note: Returns 200 to acknowledge.
  return new Response();
};
