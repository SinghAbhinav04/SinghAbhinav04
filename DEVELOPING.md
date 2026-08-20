# How this profile is built

`README.md` is **generated**. Do not edit it by hand — the next build overwrites it.

The profile is one continuous macOS desktop rendered as a stack of SVG images.
Each image is wrapped in a link, so clicking a window, a project row, a menu
title or a Dock icon opens the page behind it.

```
npm install
npm run build      # regenerate README.md + assets/*.svg
npm run preview    # write .preview.html, then open it to check the seams
npm run fonts      # re-download the embedded fonts (rarely needed)
```

## Changing what it says

Everything personal lives in **`scripts/config.mjs`** — name, role, résumé
highlights, experience, the Launchpad stack, featured projects, certificates,
Dock and menu links. Edit that file and run `npm run build`. Nothing else in
`scripts/` should need touching to change the content.

## How the pieces fit

| File | Job |
| --- | --- |
| `scripts/config.mjs` | All content, plus page geometry constants |
| `scripts/theme.mjs` | Palette, font loading/subsetting, text measurement, the `Doc` builder |
| `scripts/chrome.mjs` | Wallpaper, window frames, traffic lights, menu bar, Dock, glyph set |
| `scripts/panels.mjs` | One function per window |
| `scripts/data.mjs` | Live GitHub + PyPI numbers, each fetch individually guarded |
| `scripts/build.mjs` | Lays the slices out, renders them, writes `README.md` |

## Two rules the panels follow

1. **Nothing is drawn that cannot be clicked.** There are no decorative search
   fields or back buttons. A control on screen is either the link target of its
   own slice or it is not there.
2. **Every string is measured before it is drawn.** `ellipsize` and `wrap` take
   an explicit pixel budget, and window heights are derived from the text that
   has to fit — so longer content grows the window instead of spilling out.

## Slicing

A window taller than one image is drawn *in full* by each of its slices at a
negative `y` offset; the SVG viewport does the cutting. That is how the Projects
Finder spans seven images while staying visually continuous, and how each
project row gets its own link. The menu bar and the Dock use the same trick
horizontally.

Fonts are subset per slice to only the glyphs that slice uses, then embedded as
base64 — GitHub will not load an external font into a README image.

## The demos

`docs/` is a GitHub Pages site: one interactive walkthrough per featured
project, sharing `mac.css` and the timeline runner in `demo.js`. The project
rows in the README link here.

**Pages must be enabled** for the links to resolve: *Settings → Pages → Source:
`main` / `/docs`*. Served at `https://singhabhinav04.github.io/SinghAbhinav04/`.

## Live numbers

`.github/workflows/readme.yml` rebuilds daily and pushes if anything moved.
Add a classic PAT with `read:user` as the `STATS_TOKEN` secret to include
private contributions in the commit count; without it the build falls back to
the default token and counts public activity only.

If a fetch fails, that panel falls back to the value in `config.mjs` and the
build still succeeds.
