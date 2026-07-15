# Panas Website Agency (Clothing Brands)

This project is a website plus a simple Node server that saves contact form submissions to `submissions.json`. It mirrors the structure of the original Panas Website Agency site, repositioned around redesigning storefronts for streetwear and apparel brands instead of music producers.

## Pages

- `index.html` — Home
- `work.html` — Concept mockups (no real client work yet — see comments in the file for where real screenshots go)
- `services.html` — Pricing: Site Redesign ($500–$1,200 one-time) and Drop Page Retainer ($75–150/month)
- `about.html` — Studio philosophy and process (discovery call → mockup → build → launch)
- `contact.html` — Contact form

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
