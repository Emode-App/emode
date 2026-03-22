This is the OLDEST prfaq. The @prfaq file is the most up to date in terms of functionality, this file is just more technical; Be mindful. 

Press Release
Emode launches “Try-On Everywhere” — a Chrome extension, Shopify app, and DTC widget that lets shoppers try on outfits across the internet and lets brands add instant AI try-on to any product page.
New York, NY — Emode today announced a new platform that brings AI try-on to where shopping already happens: any website, any product page, and any brand storefront. Shoppers can install the Emode Chrome extension to capture items from any ecommerce site, add them to a cross-site dressing room, and generate try-on previews with their saved avatar. Brands and Shopify sellers can install Emode’s Shopify app or embed a lightweight widget to add “Try On” directly to product pages, increasing buyer confidence and reducing returns.
Emode is built as one platform with multiple distribution surfaces:
B2C Chrome extension for “try anything anywhere”


Shopify app for merchants to add try-on to PDPs in minutes


Universal DTC widget for non-Shopify brands (script embed)


Emode web app as the home base for avatars, saved outfits, and (optionally) native checkout


All surfaces share the same core: a Supabase-backed identity system, a unified catalog object (“Item”), and try-on jobs orchestrated via Supabase Edge Functions.
Availability
Emode will roll out in phases: Chrome extension MVP first, then Shopify app + DTC widget, followed by native marketplace selling for paid accounts.

FAQ
What problem does Emode solve?
Online shopping has a confidence problem: “Will it actually look good on me?” Emode makes try-on available on any store, not just the ones with expensive integrations—so shoppers can build outfits across sites, and brands can add try-on instantly.
How does the Emode Chrome extension work?
When you visit a product page, Emode detects it’s a PDP (product detail page). You can click “Try this on” to:
capture the item (title, images, price, URL, size)


add it to your Dressing Room


generate a try-on using your stored avatar


save the item and output to your Emode history for restyling later


How does Emode work for Shopify sellers and DTC brands?
Merchants install:
Shopify App (best for Shopify): adds a theme block (“Try On”) to product pages and syncs products.


DTC Widget (for any site): embed a script tag and enable try-on on PDPs.


Both route try-on generation through Emode’s backend (Edge Functions) and show results in a modal.
What’s Supabase doing in Emode?
Supabase is the platform core:
Auth: accounts for shoppers + merchants


Postgres: items, avatars, try-on jobs, entitlements


Storage: avatar photos + generated try-on images


Realtime: live updates to job status (optional but great UX)


Edge Functions: secure server-side logic (try-on orchestration, Stripe webhooks)


What’s Context7 MCP doing in Emode?
Context7 MCPs are your “always-accurate docs + patterns” layer inside Cursor/Antigravity:
Use it to pull exact Supabase Edge Function patterns, MV3 extension APIs, Shopify app templates, Stripe webhook verification examples, etc.


In practice: you’ll prompt Cursor/Antigravity to “use context7” to fetch up-to-date API signatures and recommended code patterns while you implement each step below.


What technologies are used where?
Monorepo
Turborepo + TypeScript


Web apps
Next.js (web + merchant dashboard)


Tailwind (optional) or any UI kit


Chrome extension
Manifest V3


Vite + React


chrome.storage, chrome.runtime messaging


Side Panel API + content scripts


Shopify
Shopify App (Node/Next or Remix)


Shopify Admin API for catalog sync


Theme App Extension for PDP blocks (later)


Widget
Tiny TypeScript bundle (Vite library mode)


Injects “Try On” button + modal on PDPs


Backend / platform
Supabase Auth + Postgres + Storage


Supabase Edge Functions (Deno runtime)


Stripe subscriptions (optional phase)


Try-on provider/model (vendor API or your own inference service)


Will it all be one codebase?
One monorepo with multiple apps/packages (shared types + SDK), one Supabase project as the core.

Step-by-step build plan (with precise tech details)
0) Monorepo scaffolding
Tech: Turborepo, Node 20+, pnpm, TypeScript
Create repo:


mkdir emode && cd emode
pnpm init
pnpm add -D turbo typescript




Add pnpm-workspace.yaml:


packages:
  - "apps/*"
  - "packages/*"




Create structure:


apps/web
apps/merchant
apps/extension
apps/widget-playground
packages/types
packages/sdk-tryon
supabase/functions
supabase/migrations




Add Turbo pipeline in turbo.json (dev/build/lint).



1) Supabase project setup
Tech: Supabase Auth, Postgres, Storage, Realtime, Edge Functions, Supabase CLI
Create Supabase project (dashboard).


Install CLI:


brew install supabase/tap/supabase
# or npm i -g supabase




Init + start local dev:


supabase init
supabase start




Create Storage buckets:


avatars (private)


tryon-results (private; serve via signed URLs)


Create tables (minimum):


profiles(id uuid pk, role text, created_at)


avatars(id, user_id, image_path, status, created_at)


items(id, owner_user_id, merchant_id nullable, source, url, domain, title, image_urls jsonb, price_cents, currency, selected_size, created_at)


dressing_room_items(id, user_id, item_id, created_at)


tryon_jobs(id, user_id, item_id, status, result_image_path, error, created_at)


subscriptions(id, user_id, status, plan, current_period_end, stripe_customer_id) (phase 2)


Add RLS policies:


Consumer rows readable/writable only if user_id = auth.uid()


Merchant rows only for that merchant (later add merchant_id mapping)


Cursor/Antigravity + Context7 tip: ask it to fetch Supabase “RLS policies examples for multi-tenant apps” via context7 and generate the SQL migration file.

2) Edge Functions: Try-on orchestration (MVP)
Tech: Supabase Edge Functions (Deno), @supabase/supabase-js@2, Storage upload, job status table
Function A — 
tryon-create
Purpose: validate auth, validate item ownership, insert job = queued, trigger worker
Steps:
Create function:


supabase functions new tryon-create




Implement:


Parse JSON { itemId }


Use service role key to query DB


Use supabase.auth.getUser(jwt) to identify user


Insert row into tryon_jobs


fetch() call to tryon-worker (fire-and-forget)


Deploy:


supabase functions deploy tryon-create
Function B — 
tryon-worker
Purpose: do the actual try-on and write output
Steps:
Create function:


supabase functions new tryon-worker




Implement:


Accept { jobId }


Update job -> running


Load item + avatar


Call your try-on provider (later). For MVP, upload a placeholder (or garment image echo) to tryon-results.


Update job -> succeeded + result_image_path


Deploy:


supabase functions deploy tryon-worker
Job status updates (UX)
Clients can either:


poll tryon_jobs by id every ~1s–2s, or


subscribe via Supabase Realtime on tryon_jobs row updates



3) Web app (Emode home base)
Tech: Next.js App Router, Supabase client, Storage upload, signed URLs
Scaffold:


pnpm create next-app apps/web --ts




Add Supabase client package:


@supabase/supabase-js


Build pages:


/signup, /login


/onboarding/avatar (upload avatar photo to Storage)


/closet (list items)


/dressing-room (list join of dressing_room_items)


Avatar upload:


upload to avatars bucket


insert row into avatars table



4) Chrome extension MVP (B2C “try anywhere”)
Tech: MV3, content scripts, Side Panel, Vite + React, extension ↔ web auth handshake
4.1 Scaffold
Create extension app:


pnpm create vite apps/extension --template react-ts




Build MV3 structure inside apps/extension:


src/
  content/        # injected into pages
  sidepanel/      # dressing room UI
  background/     # service worker
public/
  manifest.json
4.2 Manifest (MV3)
Permissions:


storage, activeTab, sidePanel


Host permissions:


https://*/* (or narrower later)


Content scripts:


match all URLs, but only activate UI if PDP detected


4.3 Auth handshake (cleanest approach)
Extension shows “Sign in”.


Clicking opens https://emode.ai/extension-auth.


Web app logs user into Supabase.


Web app sends tokens back to extension via chrome.runtime.sendMessage(extensionId, { access_token, refresh_token }).


Extension stores tokens in chrome.storage.local.


Extension uses Supabase client with those tokens to call Edge Functions + DB.


4.4 PDP detection + capture
Content script steps:
Detect PDP using:


JSON-LD schema.org/Product if present


fallback DOM signals: price, title, add-to-cart, image gallery, size selector


Inject floating button: “Try this on”


On click:


extract ItemCard fields (url/domain/title/imageUrls/price)


insert into items


call Edge Function tryon-create


Render modal with progress + final result image from signed URL.


4.5 Side Panel (dressing room)
Side panel React UI:


History list (items)


Dressing room list (dressing_room_items)


“Generate” triggers try-on for selected item(s)



5) DTC Widget MVP
Tech: Vite library build, DOM injection, modal, uses same Edge Functions
Build packages/sdk-tryon:


wrapper around Edge Function calls + job polling


Create widget bundle (library mode):


exports EmodeWidget.init({ merchantKey })


On PDP detection:


inject “Try on” button


open modal


call tryon-create with item payload


Host on CDN (or Supabase Storage public asset bucket).



6) Shopify App (Phase 2)
Tech: Shopify app (Next/Remix), Shopify OAuth, Admin API, Theme App Extension
Create Shopify app using Shopify CLI template.


Merchant installs, you store:


shop domain


access token (secure table)


Theme App Extension:


adds a “Try On” block to product pages


block loads your widget SDK with product data


Catalog sync:


webhook on product create/update


store product data in items with merchant_id



7) Subscriptions + “sell natively on Emode” entitlement (Phase 2/3)
Tech: Stripe, Edge Function webhook, subscriptions table
Stripe Checkout for subscription plans


stripe-webhook Edge Function:


verify webhook signature


update subscriptions row for user_id


Gate features:


Consumer Plus: unlimited history/outfits, faster queue


Merchant Pro: on-site widget + analytics


“Sell natively”: enable marketplace listing + checkout



What to paste into Cursor / Antigravity (recommended prompts)
Prompt 1 — “Create Supabase schema + RLS”
“Using context7, generate Supabase SQL migrations for profiles/avatars/items/dressing_room_items/tryon_jobs/subscriptions with correct RLS policies for consumer vs merchant. Also generate Storage bucket policies for avatars and tryon-results using signed URLs.”
Prompt 2 — “Edge Functions skeleton”
“Using context7, generate Supabase Edge Functions for tryon-create and tryon-worker. tryon-create: auth via JWT, validate item ownership, insert queued job, trigger tryon-worker. tryon-worker: set running, fetch item+avatar, call placeholder, upload to tryon-results, set succeeded. Include CORS.”
Prompt 3 — “MV3 extension”
“Using context7, create a Manifest V3 Chrome extension with side panel + content script + service worker. Content script detects PDP via Product JSON-LD and injects Try On button + modal. Side panel shows history/dressing room. Auth handshake via web page that sends Supabase tokens to extension.”