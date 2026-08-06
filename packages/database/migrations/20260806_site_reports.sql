-- "There are no buttons on this page."
--
-- The long tail of storefronts cannot be enumerated in advance, and it cannot be
-- browsed either — there are millions of shops and detection will always be
-- wrong on some of them. What decides whether that is a slow leak or a fixable
-- backlog is whether the failures are ever written down.
--
-- Without this, a shopper who hits a broken shop can only shrug and leave, and
-- the same shop stays broken for everyone else forever. With it, the failures
-- sort by frequency and the top of that list is the work queue.
--
-- Deliberately stores host and PATH only, never the full URL. A product URL
-- routinely carries a click id, a session token or an email address in its query
-- string, and none of that is needed to work out why a button is missing.
create table if not exists public.site_reports (
    id          uuid primary key default gen_random_uuid(),
    host        text not null,
    path        text,
    -- What the detector saw: which tier fired, whether a buy control or a size
    -- control was found, how many large images were on the page, and the last
    -- error a scan threw. This is the whole point — a report without it says
    -- only that something is wrong.
    diagnostics jsonb,
    -- Free text from the shopper. Optional, and usually empty.
    note        text,
    created_at  timestamptz not null default now()
);

-- The work queue: which shops are reported most.
create index if not exists site_reports_host_idx
    on public.site_reports (host, created_at desc);

alter table public.site_reports enable row level security;
-- No policies: writes arrive through the service role in /api/report, and
-- nobody should be able to read other people's reports.
