Emode – Product Requirements Document (PRD)
1. Product Overview
Emode is a virtual try-on and dressing room platform that allows consumers to visualize clothing on their own body before purchase, directly on retailer websites or across the web. Emode integrates via a Shopify theme app extension, a universal embeddable widget, and a Chrome extension, enabling try-ons, outfit composition, and purchase intent tracking.

2. Core User Personas
Consumer
Shops online for clothing


Wants to see how items look on their own body


Wants to compare outfits and save favorites


Limited free usage, subscription unlocks more generations


Merchant (Retailer / Brand)
Wants higher conversion and lower returns


Wants fast install with minimal friction


Needs analytics and product ingestion tools



3. Consumer Experience (Functional Requirements)
3.1 Entry Points
Emode can be accessed through:
Shopify Theme App Extension


Embeddable Widget (non-Shopify sites)


Chrome Extension


Each surface exposes:
“Try This On” button


“Add to Dressing Room” button



3.2 Single-Item Try-On Flow (Modal – Tab 1)
User clicks “Try This On”


Modal opens


User can:


Take a photo


Upload a photo


Optional inputs:


Body type / fit preferences


System:


Parses the front-angled product image


Generates a full-body image of the user wearing the item


Default output: upright pose, white background


Result screen:


Generated try-on image


Add to Cart button (Shopify)


Save / Star option


Category-Aware Generation Rules
If item category is underwear, socks, or similar:


Explicit consent prompt


Alternative: neutral base layer



3.3 Dressing Room (Modal – Tab 2)
The Dressing Room allows users to:
Add multiple items from the same brand


Select which items to try on together


Swap items dynamically


View generated outfit combinations


Each item card includes:
Select checkbox


Star (save)


Add to Cart


“Go to Listing” (with progress-loss confirmation)


Dressing Room State:
Persisted for logged-in users


Temporary session persistence for guests



4. Add to Cart Behavior by Platform
Shopify Theme App Extension
Native Add to Cart using Shopify cart APIs


Variant-aware


Immediate cart insertion


Widget (Non-Shopify)
Deep-link to product page with selected variant


Cart insertion where supported


Chrome Extension
No native cart access


Sidebar cart:


Stores product links


Shows total cart value


Allows outbound purchasing per item



5. Chrome Extension Experience
Side Panel Features
Stored user face image


Saved outfits


Starred items (“future closet”)


Generation usage meter (e.g. 5/day)


Subscription upgrade prompt


On Any Clothing Website
Injects:


“Try This On”


“Add to Dressing Room”


Uses same modal system as widget


Purchases handled via outbound links



6. Usage Limits & Monetization (Consumer)
Free Tier
5 generations per day


Outfit saving enabled


Limited history


Paid Consumer Subscription
$10/month


Unlimited (or high-cap) generations


Persistent closet


Priority generation queue (v2)



7. Merchant Experience
Merchant Dashboard (Web App)
Merchants can:
View analytics (try-ons, add-to-cart, conversions)


Manage subscription tier


Upload products:


Individual upload


CSV bulk upload


Visual warnings:


Missing required images


Poor image angles


Access marketplace (future)


Product Ingestion
Shopify: auto-pull product data


CSV optional for overrides


Required images flagged with red warning icons



8. Merchant Monetization
Pricing Model
3 Monthly Plans


3 Lifetime Plans


Access unlocks:
Shopify extension


Widget download


Analytics dashboard


Marketplace participation (future)



9. Marketplace (Future)
Merchants can list products for discovery


Emode takes a transaction fee


Consumers can shop outfits directly



10. Technical Architecture (High-Level)
Frontend
Next.js (Emode hosted UI)


Modal rendered via iframe / overlay


Integrations
Shopify App + Theme Extension


Embeddable JS widget


Chrome Extension


Backend
Supabase:


Users


Merchants


Try-on events


Saved outfits


Subscription state



11. MVP vs V2 Scope
MVP
Shopify theme extension


Single-item try-on


Dressing room (same-brand only)


Chrome extension (basic)


Consumer free + paid tiers


Merchant dashboard (analytics + uploads)


V2
Multi-brand outfits


Marketplace checkout


Background style selection


Social sharing


AI outfit recommendations


Influencer storefronts



12. Product North Star
Reduce return rates and increase buyer confidence by letting shoppers see clothing on themselves before they buy — anywhere they shop.