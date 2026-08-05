# Brand assets

The code references these paths already and degrades to the type wordmark until
the files exist, so nothing breaks while they are missing — but nothing shows the
real mark either.

## Files to add

| Path | What | Notes |
|---|---|---|
| `apps/web/public/brand/emode-logo.png` | Full lockup (E monogram + "Emode" + "Internet fashion.") | Transparent background. Used in the navbar, footer and login. |
| `apps/web/public/brand/emode-mark.png` | E monogram alone | Transparent background, square. Used in the admin sidebar, where the full lockup would be illegible at the width available. |
| `apps/web/app/icon.png` | Favicon | Next.js App Router picks this up by filename — no config, no `<link>` tag. 512×512, square, transparent. Use the monogram; a wordmark is unreadable at 16px. |
| `apps/web/app/apple-icon.png` | iOS home screen | 180×180. Same convention. Needs an opaque background: iOS composites transparency onto black. |
| `apps/chrome/icons/emode-mark.png` | Side panel header | ~64px tall. |
| `apps/chrome/icons/icon16.png`<br>`icon48.png`<br>`icon128.png` | Extension icons | **Required by the Chrome Web Store**; the manifest currently declares none. |

## Transparency

Both images as supplied have a cream background baked in. That is fine on the
marketing site, which is cream, and wrong everywhere else — the admin sidebar is
near-black, the extension panel is white, and a cream rectangle floating on either
reads as a mistake. Export with a transparent background.

The admin sidebar applies a CSS `invert` to the monogram so a black mark reads on
a dark background. That works on a transparent PNG and looks broken on a cream
one.

## After adding them

Add the `icons` key to `apps/chrome/manifest.json`:

```json
"icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
```

It is deliberately absent right now: Chrome refuses to load an unpacked
extension whose manifest points at icon files that do not exist, so adding the
key before the files would break local development.
