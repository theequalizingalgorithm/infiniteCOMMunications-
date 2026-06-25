# infiniteCOMMunications-

This repository hosts the GitHub Pages site and Cloudflare Worker for the authenticated JobMojito interview embed.

## Setup

1. Configure the Cloudflare Worker secret:

   ```bash
   npx wrangler secret put JOBMOJITO_SIGNING_KEY
   ```

2. Enter the replacement signing key when prompted.

   > If the signing key has been exposed, generate a new one and rotate it immediately. Do not commit the secret or place it in frontend code.

3. Update `app.js` with your Cloudflare Worker endpoint:

   ```js
   const WORKER_URL = "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev";
   ```

4. Commit and push to `main` to deploy the site via GitHub Pages at `https://theequalizingalgorithm.github.io/infiniteCOMMunications-/`.

## Cloudflare Worker deployment

1. Create a GitHub secret named `CLOUDFLARE_API_TOKEN` with a Cloudflare token that has `Worker Scripts: Edit` permissions for your account.
2. Create a GitHub secret named `CLOUDFLARE_ACCOUNT_ID` with your Cloudflare account ID.
3. Create a GitHub secret named `JOBMOJITO_SIGNING_KEY` so the workflow can sync it to the Worker during deploy.
4. The Cloudflare Worker deploy workflow runs automatically on pushes to `main`.

## Files

- `index.html` — the complete static application and interview experience
- `styles.css` — visual design and responsive layout
- `app.js` — local resume extraction, review flow, and final Worker submission
- `.nojekyll` — prevents Jekyll processing on GitHub Pages
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow
- `.github/workflows/cloudflare-worker.yml` — optional Cloudflare Worker deployment workflow
- `worker/index.js` — Cloudflare Worker code using Web Crypto API for HMAC signing
- `wrangler.toml` — worker configuration

## How to use

1. Add `assets/logo.png` and `assets/favicon.png`.
2. Replace `WORKER_URL` in `app.js` with your Cloudflare Worker endpoint.
3. Never put `JOBMOJITO_SIGNING_KEY` in GitHub.
4. Configure GitHub Pages to publish from `main` and `/(root)`.
5. Test with a PDF and a DOCX resume.
6. Verify text extraction works only for text-based resumes.
7. Confirm no network request is made before final submission.
8. Confirm the Worker receives only `{ "name": fullName, "email": email }`.
9. Confirm the interview iframe appears only after a successful submission.
