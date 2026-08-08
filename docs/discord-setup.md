# emode Discord

One server, two audiences that have almost nothing in common.

**emode** is the consumer app (`Fitted/fitted-mobile`): a social product with a
feed, explore, posts, messages, profiles, trends and brands. Its users are
shoppers who want to be seen.

**emodeAI** is the Shopify app and widget. Its users are merchants who want a
try-on button to work and their analytics to add up.

Putting them in the same channels serves neither. A merchant debugging a theme
block should not be scrolling past outfit posts, and a shopper should not be
reading about Stripe webhooks. So the server splits down the middle, with one
shared front door.

---

## Status

**The server exists.** `emode`, id `1535443895146647562`, created 2026-08-07,
with all fourteen channels below. What is NOT done, and cannot be automated:

- **Categories.** Discord's context menus only respond to trusted events, so
  "Create Category" cannot be driven from a script the way the "Create Channel"
  button can. The channels are all sitting in the default *Text Channels*
  category. Making the four categories and dragging channels into them is a
  couple of minutes by hand.
- **Roles and permissions.** Same reason. `#billing` is currently public and
  needs locking to `@merchant` and `@staff` before anyone is invited.
  `#announcements` and `#changelog` need setting to staff-post-only.
- **Community mode and onboarding**, which is where the shopper/merchant
  question below gets configured.

Everything in this document that is not marked above still needs doing by hand
in Server Settings.

**Discord does not replace the support email.** Requirement 4 of the App Store
listing names `support@emode.style` as the support channel, and that has to stay
true. Discord is somewhere merchants *can* go, not the only place they can be
heard, and a reviewer checking support will check the email.

---

## Structure

### Front door — visible to everyone

| Channel | Purpose |
|---|---|
| `#welcome` | What emode is, the two halves, where to go next. Rules here. |
| `#announcements` | Launches, outages, releases. Locked; staff post only. |
| `#introductions` | Optional, but it is the cheapest way to learn who is arriving. |

### emode — the consumer side

| Channel | Purpose |
|---|---|
| `#fits` | Try-ons and outfits people are proud of. The reason most will stay. |
| `#feedback` | What is confusing, what is missing. |
| `#bugs` | Consumer app only. Ask for device and OS in the topic. |
| `#feature-requests` | Threads, not a wall of messages, so voting is possible. |
| `#style-help` | Shoppers asking each other. Costs nothing and builds the habit. |

### emodeAI — the merchant side

| Channel | Purpose |
|---|---|
| `#merchant-general` | Merchants talking to each other. |
| `#install-help` | Theme blocks, the widget snippet, Shopify setup. Where most support lands. |
| `#merchant-bugs` | Separate from consumer bugs; the triage is different. |
| `#changelog` | Locked. Every release, in plain language. |
| `#billing` | **Private.** Plans, invoices, refunds. Never a public channel. |

### Staff — private

`#internal`, `#alerts`, `#triage`. Point deploy and error webhooks at `#alerts`
rather than letting them land anywhere members can see.

---

## Roles

| Role | Who | How it is granted |
|---|---|---|
| `@shopper` | Default on join | Auto |
| `@merchant` | Anyone running emodeAI | Verified — see below |
| `@founding merchant` | AppSumo lifetime buyers | Verified, by code |
| `@staff` | You | Manual |

**Verify merchants rather than trusting a claim.** The merchant-only channels
are where billing and roadmap conversations happen, and they are worth
protecting. The cheapest honest check is a code shown in the merchant's own
dashboard — the same place their store key already lives — pasted into a bot
command. Until that bot exists, verify by hand: the number of merchants who ask
will be small enough for a while, and that is a good problem to reach.

**AppSumo buyers should be marked.** They bought early on a lifetime deal, they
will be vocal, and they will expect to be treated as founders. `@founding
merchant` costs nothing and buys goodwill in the one audience most likely to
review you publicly.

---

## Rules, kept short

Long rules go unread. Five lines is enough:

1. Be decent. No harassment, no hate, no sexual content.
2. Outfit posts belong in `#fits`. Everything else, use the channel that fits.
3. No promoting other brands or apps. Merchants sharing their own store in
   `#merchant-general` is fine and encouraged.
4. Never post an API key, store key, or invoice. Staff will never DM asking for
   one.
5. Bug reports need what you did, what happened, and what you expected.

That last one saves more time than everything else combined.

**Say the impersonation rule out loud in `#welcome`.** Fashion communities with
money moving through them attract DM scams within days of opening. "Staff will
never DM you first" posted before anyone arrives is worth more than moderation
afterwards.

---

## Finishing it

Steps 1 and 2 are done; the rest are not.

1. ~~Discord → Add a Server → Create My Own → For a club or community.~~ Done.
2. ~~Name it **emode**.~~ Done. Icon still needs uploading — use the same mark
   as the app so it is recognisable in a sidebar of thirty servers.
3. **Enable Community** in Server Settings. This unlocks the rules screen,
   welcome screen, and — the reason to do it — the ability to lock channels
   behind an agreement rather than trusting people to read a pin.
4. Create the categories and channels above. Set `#announcements` and
   `#changelog` to staff-post-only, and `#billing` to `@merchant` and `@staff`
   only.
5. Set the **Welcome Screen** to point at `#welcome`, `#fits` and
   `#install-help`. Those three cover both audiences' first question.
6. Turn on **Onboarding** and ask one question: *shopper or merchant?* Use the
   answer to grant a role and hide the half of the server that is not theirs.
   This is the single highest-value setting for a two-audience server.
7. Make an invite link that **never expires** with **unlimited uses** for the
   apps and the listing. The default one-day link is the usual reason a Discord
   link in an App Store listing is dead within a week.

---

## Where the link goes, and where it does not

**Yes:** the consumer app (settings or profile), `emode.style`, AppSumo listing
and its updates, `#changelog` link in merchant onboarding emails.

**Not the Shopify App Store listing.** Support there must resolve to
`support@emode.style`. A Discord invite as the support channel reads as "we
answer when we feel like it", and a reviewer cannot verify a response time in a
chat server. Mention the community in the app details if you like; keep the
support field an address.

---

## Later, with a bot

Only once there are people in it. An empty server with six integrations is
worse than an empty server.

- Merchant verification by dashboard code, granting `@merchant`.
- `#changelog` posts from the deploy workflow, so releases announce themselves.
- `#alerts` from Fly and Vercel failures, so an outage reaches you before a
  merchant does.
- A `/tryon` showcase command, if `#fits` gets busy enough to need structure.
