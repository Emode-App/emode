# Brand assets

All generated from the two source files, and committed. Nothing here needs
re-doing unless the logo itself changes.

| Path | What | Used by |
|---|---|---|
| `apps/web/public/brand/emode-logo.png` | Full lockup | Navbar, footer, login |
| `apps/web/public/brand/emode-mark.png` | E monogram | Admin sidebar |
| `apps/web/app/icon.png` | Favicon, 512² | Next.js App Router picks this up by filename — no config, no `<link>` |
| `apps/web/app/apple-icon.png` | iOS home screen, 180² | Same convention |
| `apps/chrome/icons/emode-mark.png` | Side panel header | |
| `apps/chrome/icons/icon{16,48,128}.png` | Extension icons | Required by the Chrome Web Store |

## How they were made

The supplied artwork is black line-work on flat cream, at 1254², with roughly 20%
dead space on every side.

**Transparency comes from darkness, not from keying out the background.** Alpha is
derived per pixel as `255 × (bgLuminance − pixelLuminance) / bgLuminance`. Because
the artwork is black on a flat ground, darkness *is* coverage — so every
antialiased edge survives intact and no cream halo is left behind. Keying out
"colours near cream" within a tolerance would have fringed every curve, and this
mark is almost entirely curves.

That matters because the mark is not only ever shown on cream: the admin sidebar
is near-black and the extension panel is white. A baked-in cream rectangle reads
as a mistake on both.

**Cropped to the artwork** before resizing. At favicon size, the original's dead
space would have rendered the mark tiny inside a mostly-empty square.

**`apple-icon.png` is opaque**, filled with the brand cream. iOS composites
transparency onto black, which would have turned a black monogram into a black
square.

The script that did it is not committed — it was a one-off transformation and the
outputs are what matter. It is reproduced in the session notes if the source art
is ever revised.

## Fallback

`components/Logo.tsx` falls back to the type wordmark if an image fails to load.
Not defensiveness for its own sake: the assets live in `public/`, and a bad
deploy or a path typo would otherwise put a broken-image icon in the header of
every page.
