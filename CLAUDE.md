# CLAUDE.md — Telesto 2026 Website

Guidance for Claude Code when working in this repository.

## What this is

Two-page static site for **TELESTO 2026 · "The Noctis Singularity"** — CUSBMA's flagship management fest at CHRIST (Deemed to be University), Bannerghatta Road Campus, Bengaluru, **9–10 September 2026**.

Plain HTML/CSS/JS. **No build step, no framework, no dependencies.** Fonts come from Google Fonts; everything else is local.

## Run / preview

```bash
python3 -m http.server 8000        # from repo root
# http://localhost:8000/index.html and /rankings.html
```

A server is required — `rankings.html` fetches `data/scores.json` (blocked on `file://`).

### Screenshot workflow (visual verification)

Use headless Chrome; always eyeball changes before calling them done:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --hide-scrollbars --window-size=1440,1000 --virtual-time-budget=4000 \
  --screenshot=/tmp/shot.png "http://localhost:8000/index.html?static"
```

- `index.html?static` — forces all `.reveal` sections visible and shrinks the hero (IntersectionObserver doesn't fire under virtual time).
- `rankings.html?demo` — auto-simulates score changes. `#console` deep-links the Judge Console open.
- Headless Chrome has a **~500px minimum layout viewport** — shoot mobile at width 500, not below, or you'll see phantom cropping.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Landing page (hero, about, events, schedule, teaser, sponsors, register) |
| `rankings.html` | The Gravity Board — live BMT leaderboard (~31 teams, sheet-fed) |
| `css/telesto.css` | **Design tokens + shared components** (nav, footer, buttons, reveal) |
| `css/landing.css`, `css/rankings.css` | Page-specific styles |
| `js/cosmos.js` | Shared: starfield canvas, `phaseSVG()` eclipse-phase glyphs, reveal-on-scroll |
| `js/site.js` | Landing: spine scrollspy, countdown, timeline markers, mobile nav |
| `js/rankings.js` | Live engine: FLIP reorder, 60s polling, projector mode (P key) |
| `scripts/sync-scores.mjs` + `.github/workflows/` | Sheet→site sync pipeline (see data flow below) |
| `data/scores.json` | Machine-written standings (from the Google Sheet — see data flow) |
| `assets/` | Brand art, logos, sponsor logos (webp variants for the big hero art) |
| `docs/source/` | Original handoff docx + brochure PDF (**gitignored** — 60MB, never changes) |
| `versions/` | Zip snapshots (**gitignored** — git tags are the real history) |

## Versioning — how to revert

Every stable state is a git tag. To restore the whole site to version 1:

```bash
git checkout v1 -- .        # bring v1 files into the working tree
# or view it read-only: git stash && git checkout v1
```

`versions/telesto-v1.zip` is a belt-and-suspenders copy of v1 outside git. When shipping a new stable state: commit, then `git tag vN`, then `zip -qr versions/telesto-vN.zip index.html rankings.html css js data assets README.md`.

## Live rankings — data flow

`data/scores.json` is machine-written — **never hand-edit it**. Shape:

```json
{ "roundNum": 3, "teams": [ { "id": "t1", "name": "…", "score": 123 } ], "updated": "ISO-8601" }
```

Pipeline: Google Sheet (BMT tab) → `scripts/sync-scores.mjs` (service-account JWT, read-only scope, zero npm deps) → GitHub Action `.github/workflows/sync-scores.yml` (cron every 5 min + manual dispatch, secret `GCP_SA_KEY`) → commit → Pages redeploy → `js/rankings.js` polls every 60 s and re-renders (FLIP reorder, dynamic roster — rows rebuild when team ids/names change).

Sheet layout (BMT tab): row 1 title · row 2 = publish checkboxes C2:Q2 ("SHOW ROUND ON WEBSITE", R2 = live-round indicator) · row 3 headers · rows 4–34 = 31 teams. Website totals count **only checked rounds**; `roundNum` = highest checked round. Team names come from column B (blank → "Team N"). Sheet text is untrusted input — keep `esc()` on every rendered string.

There is no Judge Console, no localStorage state, and no client-side score mutation — the sheet is the single source of truth.

## Design system (do not drift from this)

- **Palette (exact, from the client's asset handoff):** bg `#0B0710`, deep violet `#513278`, muted purple `#624D7E`, lavender `#B38DE3`, gold `#BE7305`, light gold `#E6BB7E`, white. All are CSS variables in `css/telesto.css`. **Gold is reserved** for CTAs and the leaderboard — use sparingly.
- **Type roles:** Michroma (display, uppercase), Cinzel (ceremonial eyebrows/taglines), Poppins (body), Space Mono (scores/telemetry/timestamps).
- **Signature device:** eclipse-phase glyphs (`Cosmos.phaseSVG(p, dir)`, p: 0 = dark → 1 = full) used for the scroll spine and schedule timeline. Reuse it rather than inventing new markers.
- Copy voice: cosmic metaphors grounded in the event ("event horizon" = 1st place, "totality" = finals). Tagline verbatim: *"In all chaos there is a cosmos, in all disorder a secret order."*

## Conventions & gotchas

- Quality floor: responsive to ~360px, visible `:focus-visible`, `prefers-reduced-motion` respected (check any new animation against `Cosmos.reduced` / the CSS media query).
- Big brand art: keep PNG originals in `assets/`, serve `.webp` (convert via PIL, quality 82).
- The eclipse art has a black square background — display it with `mix-blend-mode:screen` + a radial mask (see `.hero-eclipse .eclipse-img`).
- Fixed overlays that slide off-canvas (like the Judge Console) must live inside a fixed `overflow:hidden` host (`.console-host`) — `overflow-x:hidden` on body does **not** clip `position:fixed` elements and you'll get phantom horizontal scroll on mobile.
- No `Date.now()` seeding for the sim — it uses a fixed LCG seed so demo runs are reproducible.
- Commit messages: plain description of what changed; tag stable states.
