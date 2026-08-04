import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  // 2025-01 is past Shopify's support window: requests to it come back with
  // x-shopify-api-version-warning and are served by a newer version anyway,
  // which is how appSubscriptionCreate started failing. April26 matches the
  // webhooks api_version in shopify.app.emode-tryon.toml — keep the two in sync.
  apiVersion: ApiVersion.April26,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
  // Recurring plans must be declared with `lineItems`. The flat
  // { amount, currencyCode, interval } shape is the old v1 format, and
  // shopify-api 13 rejects it at request time with "Invalid billing
  // configuration for plan X. Must be either a one-time plan or a subscription
  // plan with line items." — the config loads fine, so it only surfaces when a
  // merchant actually clicks upgrade.
  //
  // Prices mirror apps/web/lib/stripe-plan-config.ts and the PLAN_LIMITS map in
  // app/routes/app._index.jsx. All three must stay in sync: PLAN_LIMITS is keyed
  // on the lowercased plan name returned by billing.check().
  billing: {
    Starter: {
      lineItems: [
        {
          amount: 29,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    Pro: {
      lineItems: [
        {
          amount: 79,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    Growth: {
      lineItems: [
        {
          amount: 149,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
  },
});

export default shopify;
export const apiVersion = ApiVersion.April26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
