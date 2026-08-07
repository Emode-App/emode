-- Included allowance, then metered overage, then a hard ceiling.
--
-- The old shape was a single daily cap that hard-stopped. Starter was 50/day,
-- which a real storefront exhausts before lunch — and the shopper then saw
-- "Daily limit reached (50/50)" ON THE MERCHANT'S PRODUCT PAGE. An emode-branded
-- failure on a shop the merchant is paying us for.
--
-- The opposite, unlimited, is what several tiers actually promised. Every try-on
-- is a paid image generation, so "unlimited" on a $149/month plan is unbounded
-- cost, and on a $1499 one-time plan it is unbounded cost forever against a
-- single payment. The AppSumo top tier sold exactly that for $207.
--
-- So: three bands. Up to the included allowance is free to the merchant. Above
-- it, on subscription plans, generations keep working and are counted for
-- billing. Above the ceiling, they stop — because a runaway loop should not be
-- able to bill a merchant into bankruptcy either.

alter table public.usage_counters
    add column if not exists overage_used integer not null default 0;

comment on column public.usage_counters.overage_used is
    'Generations beyond the plan''s included daily allowance. Billable on subscription plans.';

-- The return type changes, so the old function has to go first.
drop function if exists consume_generation(TEXT, UUID, INTEGER, DATE);

/**
 * Atomically reserve one generation.
 *
 * Increments first and rolls back if it would breach the ceiling, so the check
 * and the write are one locked operation. Two concurrent requests cannot both
 * read "at the limit" and both proceed.
 *
 * p_limit    included allowance. Negative means no accounting at all.
 * p_overage  how far past the allowance this plan may go. 0 for plans with no
 *            overage billing (lifetime and AppSumo tiers, which have no
 *            subscription to charge), so for those the allowance IS the ceiling.
 */
CREATE OR REPLACE FUNCTION consume_generation(
    p_subject_type TEXT,
    p_subject_id   UUID,
    p_limit        INTEGER,
    p_overage      INTEGER DEFAULT 0,
    p_date         DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (allowed BOOLEAN, used INTEGER, overage INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_used    INTEGER;
    v_ceiling INTEGER;
BEGIN
    INSERT INTO usage_counters (subject_type, subject_id, date, generations_used)
    VALUES (p_subject_type, p_subject_id, p_date, 1)
    ON CONFLICT (subject_id, date)
    DO UPDATE SET generations_used = usage_counters.generations_used + 1
    RETURNING usage_counters.generations_used INTO v_used;

    -- Negative allowance means count nothing and deny nothing.
    IF p_limit < 0 THEN
        RETURN QUERY SELECT true, v_used, 0;
        RETURN;
    END IF;

    v_ceiling := p_limit + GREATEST(p_overage, 0);

    IF v_used > v_ceiling THEN
        -- Past the hard ceiling: give the credit back. Safe here because the
        -- ON CONFLICT above holds this row's lock for the rest of the
        -- transaction.
        UPDATE usage_counters
           SET generations_used = usage_counters.generations_used - 1
         WHERE usage_counters.subject_id = p_subject_id
           AND usage_counters.date = p_date;

        RETURN QUERY SELECT false, v_used - 1, GREATEST(v_used - 1 - p_limit, 0);
        RETURN;
    END IF;

    -- Inside the overage band: allowed, and recorded separately so it can be
    -- billed without re-deriving it from the total later.
    IF v_used > p_limit THEN
        UPDATE usage_counters
           SET overage_used = v_used - p_limit
         WHERE usage_counters.subject_id = p_subject_id
           AND usage_counters.date = p_date;

        RETURN QUERY SELECT true, v_used, v_used - p_limit;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, v_used, 0;
END;
$$;

-- release_generation has to unwind overage too, or a failed generation leaves a
-- merchant billed for something they never received.
CREATE OR REPLACE FUNCTION release_generation(
    p_subject_id UUID,
    p_date       DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE usage_counters
       SET generations_used = GREATEST(usage_counters.generations_used - 1, 0),
           overage_used     = GREATEST(usage_counters.overage_used - 1, 0)
     WHERE usage_counters.subject_id = p_subject_id
       AND usage_counters.date = p_date;
END;
$$;

REVOKE ALL ON FUNCTION consume_generation(TEXT, UUID, INTEGER, INTEGER, DATE)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_generation(UUID, DATE)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_generation(TEXT, UUID, INTEGER, INTEGER, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION release_generation(UUID, DATE) TO service_role;
