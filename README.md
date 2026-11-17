# Sun Production — Homepage (design prototype)

A static, working prototype of the new Sun Production homepage (Website 2.0, Design A).
No build step: open `index.html`, or host the folder as it is.

## Run it locally
Double-click `index.html`, or from this folder run:

```
python3 -m http.server 8000
```

then open http://localhost:8000

## Publish with GitHub Pages
1. Create a repository (for example `sunproduction-homepage`) and push these files to the `main` branch.
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/sunproduction-homepage/`.

## What is in here
- `index.html` — the page shell, fonts and styles
- `assets/js/template.js` — the page markup (generated from the design)
- `assets/js/app.js` — content, interactions and animation logic
- `assets/js/runtime.js` — a small renderer that turns the template into the page, using Preact
- `assets/js/preact.min.js` — Preact 10 (MIT licence, see `PREACT-LICENSE.txt`)
- `assets/img/` — all images used on the page

## Prototype limits
- Forms (free audit, consultation, Google Guide, Media Kit, Creator Network, partnerships, directories) validate and show
  a thank-you screen, but do not send or store anything yet. Connecting them to email, the CRM / Google Sheets
  and a booking tool is part of the development phase.
- Videos open a preview with a link to Instagram; on-page video playback needs the video files.
- The Google Guidebook cover and the audit report preview are placeholders until the final files are added.
