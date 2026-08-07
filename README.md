# Panas Website Agency (Clothing Brands)

This project is a website plus a simple Node server that saves contact form submissions to `submissions.json`. It mirrors the structure of the original Panas Website Agency site, repositioned around redesigning storefronts for streetwear and apparel brands instead of music producers.

## Pages

- `index.html` — Home
- `work.html` — Concept mockups (no real client work yet — see comments in the file for where real screenshots go)
- `services.html` — Pricing: Site Redesign ($500–$1,200 one-time) and Drop Page Retainer ($75–150/month)
- `about.html` — Studio philosophy and process (discovery call → mockup → build → launch)
- `contact.html` — Contact form

## Hosting: migrating from Render to Cloudflare Pages

Production currently runs on **Render** (free tier), which spins down after ~15 minutes
idle. A cold start makes the first chat message fail — Cloudflare returns its own HTML
error page while the origin wakes, the widget can't parse it as JSON, and the visitor
sees the generic error. Keeping it awake with a cron ping would consume nearly the whole
monthly instance-hour allowance, and exceeding that suspends the service outright.

`functions/`, `wrangler.toml` and `build.mjs` are the Cloudflare Pages port. **Nothing is
switched over yet — Render is still serving production.**

Why Pages works here: nothing calls `/submit` or `/admin/submissions` (the contact form
posts straight to Formspree from `script.js`), so the only server-side code in use is
`POST /api/chat`. No filesystem, no database — just static assets plus one Function.

- Static assets on Pages are unlimited and never sleep.
- Pages Functions: 100,000 requests/day free.
- Workers AI: 10,000 Neurons/day free — **unchanged**, the site already uses it. At roughly
  24 neurons per message that is ~400 chat messages/day. There is no free unlimited LLM
  inference anywhere; only the hosting constraint goes away.
- The `[ai]` binding replaces the `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` pair
  `server.js` needed for its REST call.

### Deploying it

```bash
npm run build          # assembles ./dist (allowlist — never ships server.js or node_modules)
npx wrangler login     # interactive browser OAuth
npx wrangler pages deploy
```

`npm run preview` runs it locally, but the AI binding is remote-only, so it needs
`CLOUDFLARE_API_TOKEN` set or the dev server will not start.

### Known difference from Render

Pages permanently redirects `/work.html` to `/work` (308). Links still work, but every
internal navigation takes an extra hop and the canonical URL changes. Either accept it or
switch internal links and the `og:url` tags to extensionless before cutting DNS over.

After cutover, delete `server.js`, `render.yaml`, the `nodemailer` dependency, and the
duplicated system prompt in `functions/api/chat.js`.

## Run locally

1. Install Node.js 18+.
2. In the project folder, run:
   ```bash
   npm install
   npm start
   ```
3. Open `http://localhost:3000/index.html` in your browser.

The contact form itself submits client-side via Formspree (see `script.js`) — the Node server's `/submit` endpoint is a secondary, progressive-enhancement path for non-JS form submissions and isn't wired into the current `contact.html` form markup.

## How submissions are saved

- Browser saves a fallback copy in `localStorage`.
- Server saves submissions to `submissions.json` when the site is served by `server.js`.
- In production, set `SUBMISSIONS_FILE` to a path on persistent storage, for example `/var/data/submissions.json` on Render.

## Deploying to production

The website must be hosted as a Node application, not static-only.

Recommended options:
- Railway
- Render
- Fly.io
- DigitalOcean App Platform
- Heroku

Use the following settings:
- Start command: `npm start`
- Node version: 18 or higher

Your domain `panaswebsite.agency` must point to the deployed Node app for `/submit` to work.

### Persistent submissions on Render

Render's normal app filesystem is temporary. If submissions are saved inside the deployed project folder, they can disappear after a restart or redeploy.

This repo's `render.yaml` mounts a persistent disk at `/var/data` and sets:

```bash
SUBMISSIONS_FILE=/var/data/submissions.json
```

Keep that disk attached to the service so `/admin/submissions` continues to show older contact form entries.

## Notes

If the site is hosted on a static-only platform, the contact form will not be able to write to `submissions.json` on the server.

## Email notifications

To send confirmation emails to users who submit the form, configure the Node app with SMTP credentials in your deployment environment.

Required environment variables:
- `EMAIL_HOST` — your SMTP host
- `EMAIL_PORT` — SMTP port (usually `587` or `465`)
- `EMAIL_SECURE` — `true` for SSL/TLS, `false` otherwise
- `EMAIL_USER` — SMTP username
- `EMAIL_PASS` — SMTP password

Optional environment variables:
- `EMAIL_FROM` — email sender address (default: `Panas Website Agency <no-reply@panaswebsite.agency>`)
- `BOOKING_LINK` — a booking link included in the confirmation email
- `ADMIN_EMAIL` — optional copy recipient for each submission
- `ADMIN_TOKEN` — token required to access the `/admin/submissions` endpoint

- `SUBMISSIONS_FILE` - where server-side submissions are saved; use persistent storage in production

## Admin endpoint

If `ADMIN_TOKEN` is set, you can view all submissions at:

```
GET /admin/submissions?token=YOUR_ADMIN_TOKEN
```

Or with a header:
```
curl -H 'X-Admin-Token: YOUR_ADMIN_TOKEN' https://your-site.render.com/admin/submissions
```

Returns all submissions as JSON. Returns 403 if the token is missing or invalid.

Deploy the app through Render or another Node service, and make sure these variables are set for the live site.

## Still missing before this replaces the live site

- `og-image.png` — the old one is producer-branded; needs a new one for the clothing-brand positioning (referenced in each page's `<meta property="og:image">`).
- Real concept mockup screenshots on `work.html` and the homepage Work section (currently `.portfolio-empty` / `.work-preview-empty` placeholders).
- A real hero preview image/video on `index.html` (currently a `.hero-visual` placeholder).
