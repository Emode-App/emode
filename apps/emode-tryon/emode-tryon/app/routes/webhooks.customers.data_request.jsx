import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Mandatory GDPR: Customer data request
  // Payload contains customer details. You should return JSON data you have on them.
  // For emode, we might have generation history for this customer email.
  
  // Implementation note: Returns 200 to acknowledge.
  return new Response();
};
