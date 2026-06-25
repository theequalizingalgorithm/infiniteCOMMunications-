# infiniteCOMMunications-

GitHub Pages site for the InfiniteCOMMunications Administrative Assistant application.

Live at: `https://theequalizingalgorithm.github.io/infiniteCOMMunications-/`

## How it works

1. Applicant uploads a PDF or DOCX resume.
2. Resume is parsed locally in the browser — nothing is uploaded.
3. Extracted name, email, career, and education details are shown for review and correction.
4. Applicant submits the form and a thank-you modal appears.
5. Clicking **Continue** sends the applicant to the JobMojito interview portal.

## Files

- `index.html` — page markup
- `styles.css` — visual design and responsive layout
- `app.js` — resume extraction, review flow, and form submission
- `.nojekyll` — prevents Jekyll processing on GitHub Pages
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow

## Setup

1. Add `assets/logo.png` and `assets/favicon.png`.
2. Configure GitHub Pages to publish from `main` and `/(root)`.
