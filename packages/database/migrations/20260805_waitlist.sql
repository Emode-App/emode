-- Consumer app waitlist.
--
-- The mobile app is pre-launch, so the landing page collects addresses rather
-- than sending people to a store listing that does not exist yet.
create table if not exists public.waitlist (
    id          uuid primary key default gen_random_uuid(),
    email       text not null,
    source      text not null default 'landing',
    created_at  timestamptz not null default now()
);

-- One row per address, case-insensitively. Signing up twice is enthusiasm, not
-- a second person, and a duplicate means emailing someone twice on launch day.
create unique index if not exists waitlist_email_uniq
  on public.waitlist (lower(email));

-- Written only by the service role via /api/waitlist. No policies: nothing
-- client-side should be able to read the list back, since it is a list of
-- people's email addresses.
alter table public.waitlist enable row level security;
