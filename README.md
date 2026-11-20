![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/xenopatijaya/gta6-cover-art-01-v3/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/xenopatijaya/gta6-cover-art-01-v3/reward.svg)

# Vice Key Art Studio

Turn any photo into a Grand Theft Auto VI style key-art poster — the collage
panels, the giant striped chrome title, the neon script, the whole magazine
cover fantasy — entirely in your browser, entirely offline. No uploads, no
build step, no network: open `app/index.html` and start casting your crew.

## What it does

- **13 key-art layouts** — Key Art Wide (a seven-panel ensemble with one wide
  hero panel), Key Art Ensemble, Pop-Out Hero (the subject breaks out of the
  frame), Diagonal Cut, Nine Grid, Hero + 3, Full Bleed, Duo Split, Triple
  Strip, Polaroid Snaps, Center Stage, Four Square and Hero Top.
- **Giant retro chrome title** — a striped chrome gradient title drawn on
  canvas that overlaps the panels, with an editable caption and a glowing
  neon script subtitle.
- **Full poster furniture** — editable role tags on every panel (THE BOSS,
  THE DRIVER, THE GETAWAY…), a five-star press strip with quote and gazette
  name, a dense film billing block, a round gold "EST. 2026 • LEONIDA" seal,
  and a barcode generated from your title.
- **9 cinematic grades** — Sunset Drive, Neon Pink, Ocean Teal, Golden Hour,
  Miami Nights, Palm Shadow, Noir Ink, Chrome Dusk and Vice Original, plus
  toggleable halftone, film grain and vignette finishing.
- **Face-aware cropping** — every panel starts cropped around a detected
  face focus point (a deterministic on-canvas heuristic), and you can still
  drag to pan, scroll to zoom, flip and reset each panel by hand.
- **Your photos stay yours** — add up to 8 photos via local file reading
  (never uploaded), or use the 6 bundled cast photos; one photo can fill
  every panel, or each panel can carry a different shot.
- **Four-step editor** — Photos → Layout → Grade → Poster, with a live
  canvas preview, undo/redo (Ctrl+Z / Ctrl+Y).
- **One-click PNG export** — 1080×1080, 1080×1350 and 1920×1080, or all
  three sizes at once.

## Run it

```sh
node serve.ts   # serves app/ on http://localhost:8080
node main.ts    # packages app/ + screenshots/ + dossier.json for the judge
```

Screenshot modes for the gallery: `?shot=cover&photo=pier&caption=Vice%20Heat`
renders the finished cover full-bleed; `?shot=editor&photo=boss` opens the
editor with that photo loaded.

Bounty: https://make.fun/bounty/gta6-cover-art-01
