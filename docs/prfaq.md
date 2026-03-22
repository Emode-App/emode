Press Release
Emode Launches Universal Virtual Try-On & Dressing Room Infrastructure for Online Fashion
San Francisco, CA — Emode today announced the launch of its virtual try-on and dressing room platform, enabling shoppers to realistically visualize clothing on their own bodies before purchasing—directly on retailer websites or anywhere on the web.
Emode integrates as:
a Shopify Theme App Extension


a universal embeddable widget


a Chrome browser extension


Together, these surfaces allow any consumer to try on single garments or full outfits, save looks to a persistent dressing room, and convert intent into purchases—all while giving merchants actionable analytics and conversion tooling.
Unlike traditional virtual try-on tools that rely on mannequins or static avatars, Emode generates full-body, upright images of the actual shopper wearing the selected garments, using a consistent studio-style output by default.
Emode is available today to Shopify merchants and consumers, with tiered merchant plans and a consumer subscription model.

FAQ
1. What problem does Emode solve?
Online fashion suffers from:
high return rates


low buyer confidence


poor visualization of fit and styling


Emode solves this by letting shoppers see clothing on themselves, not on models, and by allowing them to compose, compare, and save outfits before buying.

2. How does Emode work at a high level?
Emode consists of:
A front-end interaction layer (buttons, modal, dressing room)


A try-on generation pipeline


A stateful dressing room


Commerce integrations (Shopify cart, outbound links)


Merchant and consumer accounts


All try-on interactions are rendered inside an Emode-hosted modal, ensuring consistency across platforms.

3. How does a shopper interact with Emode on a Shopify store?
Entry Points
On any supported product page:
“Try This On” button


“Add to Dressing Room” button


These are injected via the Shopify Theme App Extension.

Single-Item Try-On Flow (Modal – Tab 1)
Shopper clicks Try This On


Emode modal opens (iframe overlay)


Shopper:


takes a photo OR


uploads a photo


Optional inputs:


body type


fit preference


Emode:


extracts the product’s primary front-angled image


combines it with the shopper’s image


generates a full-body, upright image on a white background


Result view:


generated image


Add to Cart button


Star / Save option



Category-Aware Safety Logic
If the product category is:
underwear


socks


swimwear


The user must explicitly confirm generation.
Fallback option:
generate with a neutral base layer



4. What is the Dressing Room?
The Dressing Room is the second tab of the same modal.
It allows shoppers to:
add multiple items from the same brand


select which items to try on together


generate outfit combinations


swap items dynamically


Each item card includes:
green/white checkbox (select for outfit)


star (save for later)


Add to Cart


Go to Listing


If the shopper clicks Go to Listing, Emode displays a confirmation warning:
“You will lose your current dressing room progress. Continue?”

5. How does Add to Cart work?
Shopify
Native cart insertion


Variant-aware


Immediate update to Shopify cart


Non-Shopify Widget
Deep links to product page


Variant pre-selection where supported


Chrome Extension
No native cart access


Sidebar “cart” that:


stores links


calculates total value


allows outbound purchasing per item



6. How does the Chrome Extension work?
Side Panel Features
stored face image


saved outfits


starred items (“future closet”)


daily generation counter


subscription upgrade CTA


On Any Clothing Website
injects Try This On and Dressing Room buttons


opens the same Emode modal


tracks generation usage


routes purchases via outbound links



7. Are there usage limits for consumers?
Yes.
Free Consumer Tier
5 try-on generations per day


outfit saving enabled


limited history


Paid Consumer Subscription
$10/month


expanded or unlimited generations


persistent closet


priority generation (future)


Limits are enforced server-side.

8. How do merchants interact with Emode?
Merchant Dashboard
Merchants can:
manage subscription tier


view analytics:


try-ons per product


add-to-cart rate


engagement trends


manage products:


automatic Shopify ingestion


optional CSV bulk upload


see visual warnings for:


missing required images


low-quality angles


A red warning icon appears until required assets are supplied.

9. How does product ingestion work?
Shopify
automatic pull of:


product metadata


variants


images


pricing


CSV Upload
optional override


used for bulk operations


missing images flagged immediately



10. How is Emode monetized?
Consumers
free tier


$10/month subscription


Merchants
3 monthly plans


3 lifetime plans


Plans gate:
analytics depth


product count


marketplace access (future)



11. What does the UI look like?
Design System
Color palette: black and white


Accent colors:


Add to Cart: green + white


Star icon: yellow


Checkboxes: green + white


Generate Try-On button: purple gradient


Typography: modern, sans-serif


Style: minimal, clean, high-contrast


Motion: smooth, flush animations


modal entrance easing


image generation loading shimmer


state transitions without jank


No visual clutter. No skeuomorphism.

12. How is Emode architected technically?
Frontend: Next.js


Auth & Data: Supabase


Storage: Supabase Storage


Commerce: Shopify APIs


Distribution: Shopify App, Widget, Chrome Extension


State: centralized dressing room per user


Try-on generation is handled server-side, with strict validation and rate limits.

13. What is the long-term vision?
multi-brand dressing rooms


marketplace checkout


influencer storefronts


AI outfit recommendations


social sharing



14. What is Emode’s north star?
Reduce returns and increase buyer confidence by letting shoppers see clothing on themselves before they buy—anywhere they shop.


