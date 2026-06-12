# Panas Website Agency

This project is a website plus a simple Node server that saves contact form submissions to `submissions.json`.

## Run locally

1. Install Node.js 18+.
2. In the project folder, run:
   ```bash
   npm install
   npm start
   ```
3. Open `http://localhost:3000/contact.html` in your browser.

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

Important: do not use GitHub Pages for this custom domain if you want the Node app to handle `/submit`.
If you previously had a `CNAME` file in the repo, remove it and update your DNS records to point to Render instead.

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
