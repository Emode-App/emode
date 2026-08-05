# Magic link email template

One-time Supabase dashboard change. Without it, magic links only sign people in
when the link happens to open in the same browser context that requested it.

## Why

Supabase's default magic-link template sends `{{ .ConfirmationURL }}`, which runs
the PKCE flow. PKCE returns a `code` that is useless without a *code verifier* —
a cookie stored in the browser that requested the link.

An email link is opened wherever the mail client decides. Gmail's in-app browser,
a different Chrome profile, an incognito window, the user's phone when they
requested it on their laptop. Any of those is a different cookie jar, so the
verifier is missing and the exchange fails.

The failure is close to invisible from the outside: Supabase confirms the email
address server-side before redirecting, so `auth.users` gains a row with
`email_confirmed_at` set and `last_sign_in_at` null. The account looks created.
The user lands back on a login form that treats them as a stranger.

`verifyOtp` with a `token_hash` has no verifier and no browser affinity — the
token in the URL is the entire credential — so the link works from any browser
on any device.

## The change

Supabase dashboard → Authentication → Email Templates → **Magic Link**.

Replace the body with:

```html
<h2>Sign in to emode</h2>
<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">
    Sign in
  </a>
</p>
<p>If you didn't request this, you can ignore this email.</p>
```

Do the same for the **Confirm signup** template if it is ever enabled.

`{{ .SiteURL }}` must be `https://www.emode.style`. Supabase implicitly permits
its own Site URL as a redirect target, so no allowlist entry is needed for it.

`/auth/callback` handles `token_hash` and `code` both, so OAuth is unaffected —
Google stays on PKCE, which is correct there because the flow never leaves the
browser that started it.
