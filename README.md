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

## Notes

If the site is hosted on a static-only platform, the contact form will not be able to write to `submissions.json` on the server.
