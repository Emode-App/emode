# emodeAI screencast: what to record, in what order

The form asks for 3 to 8 minutes covering the merchant flow and the customer
flow, with no loud background noise. This targets **5 minutes 30**, which leaves
room to be slow on the try-on without running long.

Record in the order below. It is the order that reads best, and it is also the
only order in which the dashboard has data to show — see the warning under
Segment 4.

---

## Before you press record

**Run `scripts/seed-review-account.sql`.** Segment 5 signs into emode.style and
there is nothing behind that account until this runs. This is the one blocking
prerequisite left.

**Already done, so you can ignore it:** the `read_themes` scope is deployed
(app version `emodeai-10`) and the dashboard code that uses it is live on Fly.
The install banner now reads the theme directly rather than guessing from
try-on counts, so Segment 4 will correctly show **"Try-on buttons are live"**
the moment you save the block.

**One consequence of that scope change:** any store that already had the app
installed will be asked to re-authorize the next time it opens, because the
permission set changed. Accept the prompt before you start recording, or it
will appear mid-take. A store you install fresh during Segment 1 is unaffected —
it grants the new scope as part of the normal install.

Then:

- A development store with **at least 6 apparel products**, each with a clean
  front-facing product photo. The generator works from the product image, so a
  bad catalogue makes the app look bad.
- **The emodeAI Buttons block not yet added.** You are demonstrating setup, so
  it has to start absent. If you have already added it, remove it and save.
- **A full-length photo of a person**, well lit, whole body in frame. Use your
  own photo or a stock image you have a licence for. Not a celebrity, not a
  photo you found — this video goes to a reviewer and stays on the internet.
- Browser at **1280×800 or larger**, one clean window, no other tabs, no
  bookmarks bar, no notifications. Quit anything that pops toasts.
- Silence anything that makes noise. The form calls out background noise
  specifically.

---

## Segment 1 — Install (0:00 – 0:40)

Start on the app's App Store listing page, click install, walk through the
permission screen without skipping it, land in the admin.

Say what the app does in one sentence while the install runs. Something like:
*"emodeAI lets shoppers see clothes on their own body before they buy, and then
shows the merchant which try-ons turned into orders."*

Do not read the permission list aloud. Just let it be visible.

---

## Segment 2 — Setup (0:40 – 1:40)

This is the segment reviewers care about most, because requirement 5.1.3 is
specifically about whether setup instructions are clear.

1. Land on the dashboard. Pause on the **"One step left: add the try-on
   buttons"** banner long enough to read the four numbered steps.
2. Click **Add try-on buttons**. The theme editor opens on a product template
   with the block already placed.
3. Show that it landed next to Add to cart. Drag it once so it is obvious it can
   be moved.
4. Open the block's settings briefly — **Max width** and **Alignment** — and
   say the width matches the Add to cart button automatically.
5. Click **Save**.

Say plainly: *"No theme code, and nothing to paste."*

---

## Segment 3 — Customer flow (1:40 – 3:40)

The heart of the video. Slow down here.

1. Open a product page on the storefront. Show **Try This On** and **Dressing
   Room** sitting under Add to cart.
2. Click **Try This On**. The modal opens over the product page.
3. Upload the full-length photo.
4. **Generation takes roughly 5 to 15 seconds.** Do not cut it out — a reviewer
   should see the real wait. Speed the footage to about 2× instead, or talk over
   it. Cutting to a finished result invites the suspicion it was faked.
5. Show the result properly. Let it sit on screen for a full three seconds
   before you touch anything.
6. Go back, open a second product, add it to the **Dressing Room**.
7. Open the Dressing Room, select two garments, choose **Try Together**, and
   show the stacked outfit.

Then **buy something.** Add the product to cart and complete checkout on the dev
store. It takes twenty seconds and it is what makes Segment 4 work — attributed
revenue needs a real order behind it.

---

## Segment 4 — Merchant flow (3:40 – 4:50)

Now go back into the Shopify admin and open the app.

> **This is why the order matters.** Analytics populate from real try-ons and
> real orders. Record this segment first and every card reads zero, which looks
> like a broken app rather than a new store. By recording it after Segment 3
> the numbers are real and you are not tempted to fake them.

Show, in this order:

1. The banner now reads **"Try-on buttons are live"** — the setup loop closing
   on camera is the single most reassuring thing in the video.
2. **Last 30 days**: try-ons, conversion, attributed revenue. Say that
   conversion is measured against shoppers who did not try on, and that it stays
   hidden until there is enough traffic to mean anything. Honesty about a small
   sample reads as competence.
3. **Most tried on**.
4. The plan and daily usage bar. Say the allowance and that busy days keep
   working past it at no extra charge. **Do not say overage is billed** — it
   is not, and the listing says the same.

---

## Segment 5 — The rest of the account (4:50 – 5:30)

1. From the dashboard, point at the **Your full emodeAI account** panel and the
   email it names.
2. Go to emode.style, sign in, choose **For brands**.
3. Open **Studio**, pick a product, generate a model shot. Say this is the same
   engine as the try-on, run against a flat product photo instead of a shopper
   photo.
4. Close on the product library.

---

## Do not put these on camera

- **The marketplace.** Requirement 1.1.6 bars apps that turn stores into
  marketplaces. It is unlaunched. Showing it invites a question with no upside.
- **The Chrome extension.** Requirement 1.1.13 names Chrome extensions that copy
  product information from other websites. Do not mention it exists.
- **Any other app or service you run.** Requirement 4.4 forbids referencing them
  in listing content.
- **Real customer data.** Use the dev store's own test orders only.
- **Prices, invoices or your Stripe dashboard.** Pricing belongs in the Pricing
  details section, nowhere else (4.2.3).
- **Anything with a number you cannot substantiate.** No "merchants see X%".
  4.3.3 bans statistics in listing content and a screencast is listing content.

---

## Hosting it

The field takes a URL, up to 255 characters, and reviewers need to open it
without an account.

Unlisted **YouTube** or **Vimeo** is the normal answer. Unlisted, not private —
private is the most common reason a reviewer reports they could not watch it.
A direct link to a Loom works too if the workspace does not force a sign-in.

Test it in a private window while signed out of everything before you paste it
into the form. Then paste it into the **Screencast URL** field and click Save.

That is the last outstanding issue on the listing.
