import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

/**
 * The API key is needed in the document head, not just in AppProvider.
 *
 * It is the app's public client id, the same value already rendered into the
 * embedded page, so exposing it here reveals nothing.
 */
export const loader = () => ({ apiKey: process.env.SHOPIFY_API_KEY || "" });

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/*
          App Store requirement 2.2.3: the App Bridge script must load from
          Shopify's CDN and must come before any other script tag. The React
          package alone does not satisfy it — that provides bindings, while this
          is what keeps the embedded app on the current App Bridge, and what the
          automated pre-submission check looks for.
        */}
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
          data-api-key={apiKey}
        />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
