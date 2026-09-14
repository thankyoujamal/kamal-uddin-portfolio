# Mohammad Kamal Uddin — Portfolio

Personal portfolio site for **Mohammad Kamal Uddin**, Hospital Administration
Professional and MRD Incharge at Salt Lake City Medical Centre, Kolkata.

**Live site:** https://kamal-uddin-portfolio.vercel.app

## Stack

Plain HTML, CSS and JavaScript — no build step, no dependencies, no framework.

| File | Purpose |
| --- | --- |
| `index.html` | Full single-page site markup |
| `styles.css` | Design tokens, layout and responsive rules |
| `lattice-background.js` | Animated site-wide lattice canvas background |
| `script.js` | Navigation, scroll reveals, active-section highlighting |

## Running locally

No install required — either open `index.html` directly, or serve it:

```bash
python3 -m http.server 5173
# then visit http://127.0.0.1:5173
```

## Design

Dark teal (`#115e59`) and white palette. The background is a real-time
Delaunay-style triangulated lattice rendered to a fixed full-viewport canvas,
with cursor-field deformation and vertex energy pulses.

Accessibility and performance behaviours built in:

- `prefers-reduced-motion` renders a single static frame instead of animating
- The animation pauses while the browser tab is hidden
- Vertex density drops on screens under 700px
- The canvas is hidden entirely when printing

## Deployment

Hosted on [Vercel](https://vercel.com) as a static site — no build step, no
build command, no output directory.

```bash
vercel deploy --prod
```

## Sections

About · Experience · Internships & Training · Education · Core Competencies · Contact
