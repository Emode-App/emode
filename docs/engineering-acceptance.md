Below is a full engineering acceptance-criteria document derived directly from the PR/FAQ.
This is written in Given / When / Then format so it can be dropped straight into Linear, Jira, or GitHub Projects and used by frontend, backend, infra, and platform engineers with zero ambiguity.
This is not high-level. This is build-blocking exactness.

Emode – Engineering Acceptance Criteria

EPIC 0 — Monorepo & Infrastructure
AC-0.1 Monorepo Bootstrapping
Given a new developer clones the repository
When they run pnpm install
Then
Turborepo initializes successfully


All workspaces resolve without version conflicts


pnpm dev:web, pnpm dev:shopify, and pnpm dev:chrome can be executed independently



AC-0.2 Environment Separation
Given each app (web, shopify, chrome, widget)
When environment variables are loaded
Then
Secrets are read only from the app’s local .env file


No secrets are required at the repo root


Production and local environments do not share credentials



EPIC 1 — Supabase Data Model & Security
AC-1.1 Database Schema Creation
Given Supabase migrations are applied
When all SQL files are executed
Then
All tables listed in the PR/FAQ exist


Foreign key relationships are enforced


Unique constraints prevent duplicate installations or counters



AC-1.2 Row Level Security (RLS)
Given RLS is enabled
When
A consumer queries their data


A merchant queries their analytics

 Then


Consumers can only access rows where user_id = auth.uid()


Merchants can only access rows scoped to their merchant_id


Service role bypass works for internal jobs and Shopify webhooks



AC-1.3 Usage Counters
Given a user generates an image
When the generation is accepted
Then
A row is created or updated in usage_counters for today


The counter increments atomically


Concurrent requests do not exceed limits



EPIC 2 — Authentication & Identity
AC-2.1 Consumer Authentication
Given a user opens the Emode modal
When
They are logged in

 Then


Their Supabase session is used for all API calls


When
They are not logged in

 Then


A guest session ID is issued


Guest sessions are rate-limited



AC-2.2 Merchant Authentication
Given a merchant installs the Shopify app
When OAuth completes
Then
The merchant is persisted in Supabase


The access token is encrypted


The merchant is linked to a Supabase account



EPIC 3 — Try-On Generation Engine
AC-3.1 Single-Item Try-On Request
Given a user clicks “Try This On”
When /api/tryon/single is called
Then
Request payload is validated with Zod


Product image URL is validated


User image exists or upload is required


Category safety rules are enforced



AC-3.2 Category Consent Enforcement
Given the product category is underwear, socks, or swim
When the user attempts generation
Then
A consent flag is required


Without consent, generation is rejected with a descriptive error


Neutral base layer option is available



AC-3.3 Generation Lifecycle
Given a valid generation request
When the job is accepted
Then
A generations row is created with status queued


The job is dispatched to the generation service


Status transitions: queued → processing → succeeded|failed



AC-3.4 Generation Result Delivery
Given generation succeeds
When the client polls /api/tryon/status
Then
A signed URL is returned


URL expiration is enforced


The result image renders correctly in the modal



EPIC 4 — Dressing Room
AC-4.1 Dressing Room Creation
Given a user opens the modal
When they add their first item
Then
A dressing room record is created


The dressing room is scoped to the merchant


State persists across modal tab switches



AC-4.2 Item Selection
Given items exist in the dressing room
When the user toggles checkboxes
Then
Selection state is persisted


Only selected items are included in outfit generation



AC-4.3 Outfit Generation
Given ≥2 items are selected
When the user clicks “Generate Outfit”
Then
/api/tryon/outfit is called


Generation limits are enforced


A combined try-on image is produced



EPIC 5 — Shopify App & Theme Extension
AC-5.1 App Installation
Given a merchant installs the app
When installation completes
Then
Merchant data is stored


Access token is encrypted


Uninstall webhook is registered



AC-5.2 Theme Extension Injection
Given the extension is added to a product page
When the page loads
Then
“Try This On” and “Add to Dressing Room” buttons render


Product ID, variant ID, image URL are captured



AC-5.3 Modal Launch from Shopify
Given a user clicks a try-on button
When the modal opens
Then
It loads from Emode’s Next.js app


All product context is passed via query params or postMessage


No Shopify theme styles leak into the modal



AC-5.4 Shopify Add to Cart
Given a generation succeeds
When the user clicks “Add to Cart”
Then
The correct variant is added


Cart updates without page reload


If insertion fails, fallback redirect is used



EPIC 6 — Embeddable Widget
AC-6.1 Widget Initialization
Given the widget script loads
When the DOM is ready
Then
Product context is extracted via selectors


Buttons are injected once


No duplicate injections occur



AC-6.2 Widget Modal Behavior
Given a user clicks try-on
When the modal opens
Then
Behavior matches Shopify modal


Add-to-cart defaults to deep linking



EPIC 7 — Chrome Extension
AC-7.1 Product Page Detection
Given the user visits a Shopify storefront
When product elements are detected
Then
Buttons are injected near primary purchase UI


Incorrect pages are ignored



AC-7.2 Side Panel State
Given the side panel is open
When
The user saves items or outfits

 Then


Data persists across sessions


Generation counts are visible



AC-7.3 Outbound Cart
Given items are added from multiple sites
When the user views the sidebar cart
Then
All items display with price and link


Total value is computed correctly



EPIC 8 — Monetization & Limits
AC-8.1 Generation Limit Enforcement
Given a free user has used 5 generations
When they attempt another
Then
API returns a paywall error


UI displays upgrade CTA


No generation job is created



AC-8.2 Subscription Upgrade
Given a user purchases $10/month
When Stripe webhook fires
Then
Entitlement is updated


Generation limits are lifted


Changes take effect immediately



EPIC 9 — Merchant Dashboard
AC-9.1 Product Ingestion
Given a merchant logs in
When products are fetched
Then
Shopify products sync automatically


Missing/low-quality images show red warning icons



AC-9.2 CSV Upload
Given a merchant uploads CSV
When parsing completes
Then
Valid rows create/update products


Invalid rows surface inline errors



AC-9.3 Analytics
Given try-on events occur
When merchant views analytics
Then
Counts match event data


Metrics update within acceptable delay



EPIC 10 — UI Styling & Motion
AC-10.1 Design Tokens
Given UI components render
Then
Base palette is black and white


Add-to-cart is green/white


Star is yellow


Checkboxes are green/white


Generate button uses purple gradient



AC-10.2 Motion
Given the modal opens or state changes
Then
Animations run at ≥60fps


No layout shift occurs


All animations use transform/opacity only



FINAL ACCEPTANCE CONDITION (System-Wide)
The system is considered complete when:
A user on a Shopify clothing site can:


click Try This On


upload a photo


generate a try-on


add the item to cart


The same user can:


open the Chrome extension on another site


try on items


save outfits


hit a generation limit


upgrade and continue


A merchant can:


install Emode


see analytics


fix image warnings


observe measurable engagement