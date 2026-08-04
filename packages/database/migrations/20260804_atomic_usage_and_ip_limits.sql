-- emodeAI: atomic usage accounting + per-IP abuse ceiling
-- Apply after 20260319_schema_updates.sql
--
-- Two problems this fixes:
--
-- 1. /api/generate read the counter, compared it to the limit, then wrote
--    counter+1 as three separate statements. Two concurrent requests both read
--    4, both write 5, and the user gets a free generation for every request
--    they can land in the same window. AC-1.3 requires atomic increments.
--
-- 2. Anonymous shoppers were rate limited on a client-generated guestId, which
--    is reset by clearing localStorage. That makes the free tier unbounded, and
--    every generation costs a real Gemini image call. The per-IP ceiling below
--    is the backstop that a client cannot clear.

-- ============================================================
-- USAGE COUNTERS: allow an 'ip' subject alongside user/merchant
-- ============================================================
ALTER TABLE usage_counters DROP CONSTRAINT IF EXISTS usage_counters_subject_type_check;
ALTER TABLE usage_counters ADD CONSTRAINT usage_counters_subject_type_check
    CHECK (subject_type IN ('user', 'merchant', 'ip'));

-- ============================================================
-- consume_generation: atomically reserve one generation.
--
-- Increments first and rolls the increment back if it would exceed the limit,
-- so the check and the write are a single locked operation. Pass a negative
-- p_limit for unlimited plans (still counts usage, never denies).
--
-- Returns (allowed, used) where `used` is the caller's post-call count.
-- ============================================================
CREATE OR REPLACE FUNCTION consume_generation(
    p_subject_type TEXT,
    p_subject_id   UUID,
    p_limit        INTEGER,
    p_date         DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (allowed BOOLEAN, used INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_used INTEGER;
BEGIN
    INSERT INTO usage_counters (subject_type, subject_id, date, generations_used)
    VALUES (p_subject_type, p_subject_id, p_date, 1)
    ON CONFLICT (subject_id, date)
    DO UPDATE SET generations_used = usage_counters.generations_used + 1
    RETURNING usage_counters.generations_used INTO v_used;

    IF p_limit >= 0 AND v_used > p_limit THEN
        -- Over the cap: give the credit back. Safe to do here — the ON CONFLICT
        -- above holds a row lock for the rest of this transaction.
        UPDATE usage_counters
           SET generations_used = usage_counters.generations_used - 1
         WHERE usage_counters.subject_id = p_subject_id
           AND usage_counters.date = p_date;

        RETURN QUERY SELECT false, v_used - 1;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, v_used;
END;
$$;

-- ============================================================
-- release_generation: hand a reserved credit back when the generation itself
-- fails, so a Gemini error does not cost the user one of their daily try-ons.
-- ============================================================
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
       SET generations_used = GREATEST(usage_counters.generations_used - 1, 0)
     WHERE usage_counters.subject_id = p_subject_id
       AND usage_counters.date = p_date;
END;
$$;

-- Both functions are called only with the service role from /api/generate.
REVOKE ALL ON FUNCTION consume_generation(TEXT, UUID, INTEGER, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_generation(UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_generation(TEXT, UUID, INTEGER, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION release_generation(UUID, DATE) TO service_role;

-- Daily counter lookups are all (subject_id, date); the existing UNIQUE already
-- covers that. This one keeps the nightly "usage by type" reads cheap.
CREATE INDEX IF NOT EXISTS usage_counters_type_date_idx
    ON usage_counters (subject_type, date);
