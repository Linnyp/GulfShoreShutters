# Gulfshore Shutters

One-page marketing site with a lead-capture form. Astro (static output) + Tailwind v4,
deployed to Cloudflare Pages, with the form handled by a Pages Function on the Workers
runtime.

Current payload for the homepage: **~9 KB HTML + ~6 KB CSS, gzipped, with zero
first-party JavaScript files.** The small amount of JS (mobile nav, form submit) is
inlined into the HTML by Astro; the only external script is Cloudflare Turnstile.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Astro dev server on `localhost:4321` (Pages Functions **not** served) |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serves `dist/` through the real Workers runtime — use this to test the form |
| `npm run check` | Type/template diagnostics for `src/` |
| `npm run deploy` | Build and push to Cloudflare Pages |

`npm run dev` does not run `functions/`. To exercise the quote form locally, use
`npm run build && npm run preview`.

Type-check the Functions separately, since they use the Workers lib rather than the DOM:

```bash
npx tsc --noEmit -p functions/tsconfig.json
```

## Layout

```
src/data/site.ts        All business copy — the one file to edit for text changes
src/pages/index.astro   The page; composes the section components
src/layouts/            Head, meta, LocalBusiness + FAQPage JSON-LD
src/components/         Header, Hero, Services, Gallery, Process, Testimonials, Faq, QuoteForm, Footer
functions/api/quote.ts  POST /api/quote — validation, spam checks, D1 write, email
public/_headers         CSP and cache-control rules applied by Pages
schema.sql              D1 table for the lead archive
```

## How the form works

1. The form is a real `<form method="post" action="/api/quote">`. JS intercepts it for an
   inline success state; if JS fails, the browser posts natively and the Function
   redirects to `/thank-you/`.
2. `functions/api/quote.ts` runs the cheap checks first — honeypot field, a
   sub-3-second fill timer, then field validation — so bot traffic never costs an
   outbound request.
3. Turnstile is verified server-side against `siteverify`.
4. The lead is written to D1 **before** the email is sent, so a Resend outage cannot
   lose a customer. Without a D1 binding, a failed send returns a 502 telling the visitor
   to call.

Turnstile verification is skipped when `TURNSTILE_SECRET_KEY` is unset, which is what
makes local testing possible. **Setting it in production is required** or the form is
wide open.

## Setup checklist

### 1. Environment variables

Copy `.env.example` to `.env` for local work. In production set the same keys under
Cloudflare Pages → Settings → Environment variables, marking `TURNSTILE_SECRET_KEY` and
`RESEND_API_KEY` as encrypted.

- Turnstile keys: Cloudflare dashboard → Turnstile → add a widget for the domain.
- `RESEND_API_KEY`: resend.com, then verify the sending domain (SPF + DKIM) or delivery
  to the owner's inbox will land in spam.
- `LEAD_FROM_EMAIL` must be on the verified domain. `LEAD_TO_EMAIL` is where leads go.

### 2. Lead archive (recommended)

```bash
npx wrangler d1 create gulfshore-leads
npx wrangler d1 execute gulfshore-leads --remote --file=./schema.sql
```

Bind it to the Pages project as `LEADS` (Settings → Functions → D1 bindings). Read leads
back with `npx wrangler d1 execute gulfshore-leads --remote --command "SELECT * FROM leads ORDER BY id DESC LIMIT 20"`.

### 3. Deploy

Deployed as a Worker with static assets, configured by `wrangler.jsonc`: `dist` is
served from the `ASSETS` binding, and anything that is not a file there falls through
to `worker/index.ts`, which is how `/api/quote` is reached.

```bash
npm run deploy     # astro build && wrangler deploy
```

The Git integration runs the same thing on push to `main`. Bindings (`LEADS`) and the
environment variables above are set in the dashboard, not in `wrangler.jsonc`.

> **Do not delete `wrangler.jsonc`.** Without a config, `wrangler deploy` runs its
> framework setup wizard, which auto-answers "yes" in CI and runs `astro add cloudflare`
> — swapping the static build for the SSR adapter and routing images through a
> Cloudflare Images binding that is not enabled. Every image then 404s while the build
> log still reports success.

## Before launch

All copy lives in `src/data/site.ts` and traces to
`.agents/context/product-marketing-context.md`. Search that file for `OPEN:` — each marks
an unresolved owner question and records the assumption the site currently ships under.

**Blocking:**

- [ ] **Settle the domain.** `astro.config.mjs` and `public/robots.txt` assume
      `gulfshoreshutters.com`, but the Google Business Profile and the owner's email are on
      `gulfshoreshutters.company`. Nothing should go to print until this is decided.
- [ ] **Confirm the pricing structure** — minimum square footage per panel or order,
      whether the rate varies by material or specialty shape, and that install is included.
      The published $35–$40/sq ft and the worked table in `Pricing.astro` depend on it.
- [ ] **Decide the business address.** The site ships as a service-area business: the
      residential street line is withheld and the JSON-LD carries no `streetAddress`.
      Configure the Google Business Profile the same way, or supply a public address.

**Important:**

- [ ] Confirm **who honours the warranty** — Devlin or Gulf Shore Shutters LLC. For a new
      LLC selling a lifetime term this is load-bearing and belongs on the page.
- [ ] Confirm the install photography is not from a **previous employer's** jobs, which
      would change how it can be captioned.
- [ ] Add the owner's **surname** once known (`About.astro` is first-name only).
- [ ] Collect the **first five genuine reviews**. There is no testimonial section and no
      `AggregateRating` schema by design — do not add either until the reviews are real and
      first-party.
- [ ] Verify the JSON-LD with Google's Rich Results Test, then submit the sitemap.
- [ ] Confirm the Google Business Profile NAP matches the footer exactly.

## Photography

Real photos are the entire payload of this page, and with no testimonials yet they are the
only visual proof the business has. They are already wired up: sources live in
`src/assets/` and go through `astro:assets`, which emits WebP at the right sizes with a
correct `srcset`.

Two things to know before adding more:

1. **EXIF rotation is not automatic.** The originals in `photos-original/` carry
   orientation 6 — sharp does not honour it and Astro does not call `.rotate()`, so a raw
   re-import renders sideways. Normalize on the way in:

   ```js
   sharp(src).rotate().resize({ width: 2000, fit: 'inside' })
     .jpeg({ quality: 82, mozjpeg: true }).toFile('src/assets/name.jpg');
   ```

2. **`photos-original/` is not deployed** and is gitignored. It holds the untouched camera
   files; `src/assets/` holds the normalized derivatives the build consumes.

Add a photo by dropping the normalized JPG in `src/assets/` and adding a `{ file, alt }`
entry to `gallery` in `src/data/site.ts`.

**Not usable:** `photos-original/Photo Mar 05 2026, 11 02 *.png` are screenshots of Devlin
Shutters' Facebook page, app chrome included. They are not first-party photography and are
not ours to publish.

## Fonts

The CSS asks for Cormorant Garamond (display) and Inter (body) and falls back to system
serif/sans, so nothing is fetched over the network. The logo wordmark is a high-contrast
serif in wide caps; self-hosting the real faces would match it more closely — put the
woff2 files in `public/fonts/`, add `@font-face` rules with `font-display: swap` to
`src/styles/global.css`, and preload the body weight. Do not link Google Fonts' CDN; it
costs a third-party connection on the critical path and would need a CSP change.

## Colour

The palette in `src/styles/global.css` comes from the brand board
(`photos-original/Photo Aug 31 2026, 8 13 32 PM.png`): Deep Olive `#465448`, Warm Ivory
`#F6F1E7`, Charcoal `#292B29`, Champagne Gold `#B49A6A`.

One caveat worth keeping: **Champagne Gold is not a text colour on a light background.**
The brand value itself only reaches 2.6:1 on ivory. Use `gold-400` for text on olive-900
(6.8:1) and `gold-700` for gold text on light (7.8:1); `gold-500` is decoration only.

## Analytics and conversions

`QuoteForm.astro` pushes a `quote_request_submitted` event to `window.dataLayer` on
success, and every call/quote link carries a `data-cta` attribute for click tracking.
Both are inert until a tag manager is installed. Adding one means loosening `script-src`
and `connect-src` in `public/_headers`.
