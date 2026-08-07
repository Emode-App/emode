-- Close four policies that granted more than anything needed.
--
-- Found by reading the customer list with the anon key, which ships in every
-- page of the site. `merchants` was SELECT USING (true), so one unauthenticated
-- request returned every merchant's email, plan, Stripe customer id, and
-- whether their last payment failed. That is a competitor's prospect list and a
-- phisher's target list in the same response, and payment_state tells an
-- attacker precisely who is primed to believe "your emode payment failed".
--
-- Checked before changing anything: every server-side read goes through the
-- service role, which bypasses RLS. The only browser-client reader of these
-- tables is the onboarding page, and both of its queries are already scoped to
-- the signed-in user. So nothing legitimate loses access here.

-- ── merchants ──────────────────────────────────────────────────────────────
--
-- Scoped to the two shapes onboarding actually uses: the row you own, and the
-- row created for your email by the Stripe webhook before ownership is linked.
drop policy if exists "Merchants are publicly readable" on public.merchants;

create policy "Owners read their own merchant"
    on public.merchants
    for select
    using (
        owner_user_id = auth.uid()
        or shop_domain = (current_setting('request.jwt.claims', true)::json ->> 'email')
    );

-- ── products ───────────────────────────────────────────────────────────────
--
-- Was SELECT USING (true), so every merchant's full catalogue was readable
-- including rows with marketplace_visible = false. A merchant who deliberately
-- kept a product off the marketplace was publishing it anyway, along with its
-- buy_url.
drop policy if exists "Products are publicly readable" on public.products;

create policy "Marketplace products are publicly readable"
    on public.products
    for select
    using (marketplace_visible = true);

-- ── variants ───────────────────────────────────────────────────────────────
--
-- Same leak one table over: prices and buy_urls for products their merchant
-- never listed.
drop policy if exists "Variants are publicly readable" on public.variants;

create policy "Variants of listed products are publicly readable"
    on public.variants
    for select
    using (
        product_id in (
            select id from public.products where marketplace_visible = true
        )
    );

-- ── usage_counters ─────────────────────────────────────────────────────────
--
-- The quota bypass. For subject_type='user', subject_id IS the user id, so
-- `UPDATE USING (subject_id = auth.uid())` let a signed-in shopper PATCH their
-- own row and set generations_used back to 0: unlimited AI generations, billed
-- to us. consume_generation is atomic and correct, and entirely beside the
-- point if the row it guards can be edited directly.
--
-- Nothing legitimate writes here from a browser. Every increment goes through
-- the service-role RPC.
drop policy if exists "Users can update own usage" on public.usage_counters;
drop policy if exists "Users can insert own usage" on public.usage_counters;

-- ── generations ────────────────────────────────────────────────────────────
--
-- Client-side inserts stopped being used when recording moved server-side into
-- /api/generate. Leaving the policy meant a user could forge try-on history and
-- inflate a merchant's per-product counts.
drop policy if exists "Users can create own generations" on public.generations;
