# Changelog — Telesto 2026 Website

## v7 — 7 Sep 2026 · Google Sheet–driven scoreboard

- **Gravity Board now reads the official Google Sheet** (BMT tab, all 31 teams). Redesigned the tab: branded formatting, frozen panes, a **SHOW ROUND ON WEBSITE** checkbox row (only ticked rounds count), live-round indicator, and totals that mirror the same rule.
- **Sync pipeline**: `scripts/sync-scores.mjs` (service account, read-only, zero deps) runs via GitHub Actions every 5 minutes + on demand; commits `data/scores.json` only when standings change. Key stored as encrypted repo secret.
- **Judge Console removed entirely** (with localStorage/BroadcastChannel/sim) — the sheet is the single source of truth. Transmission log, board footer, ground-rules strip, projector chip, team tags, "Champion" label, and the rankings sub-line removed per review. Status chips are now just **Live** + **Updated · Round N**.
- Event Horizon badge moved inline next to the leader's name (fixes overlap). Event cards top-aligned. Timeline day rows no longer show times. Hero eyebrow removed.
- Security: no credentials touch the repo or browser; site remains fully static behind GitHub's CDN (DDoS-absorbing); sheet strings escaped before render.

## v6 — 6 Sep 2026 · Motion layer ("gravity" feel)

One motion thesis — everything is pulled, swept, or orbits; nothing bounces:

- **Ambient**: rare gold shooting stars in the starfield; hero eclipse gains pointer parallax + scroll drift/fade (depth); orbit rings fade in staggered on load.
- **Scroll**: timeline rows cascade one-by-one; sponsor logos ripple in; gold gradient headings get a one-time corona sweep when revealed.
- **Micro**: corona shine sweeps buttons on hover; event cards tilt subtly toward fine pointers; the active spine glyph carries a slow orbiting dashed ring; countdown seconds tick with a micro-fade.
- **Gravity Board**: the leader's bar has a living sheen; overtaking rows flash gold while fallers briefly dim; a champion change pops the podium; a slow orbital ring turns behind the top three.

Every effect is disabled under `prefers-reduced-motion` and works within the strict CSP (no inline styles).

## v5 — 6 Sep 2026 · Tighter copy + every-screen polish

- Copy cut roughly in half site-wide: hero (dropped quote + slimmer meta), about condensed to one paragraph, event cards, schedule notes, register steps, ground rules, rankings sub/console hints.
- Responsive pass for all sizes: hero lockup now wraps and centers cleanly at every width; tablet events layout (BMT full-width, Case + Quiz paired); fee table scrolls horizontally on narrow phones; nav compressed at 861–1040px; short-viewport (landscape phone) hero compression; smaller minimum title size for ≤400px phones.

## v4 — 6 Sep 2026 · Security hardening + live deployment

- **Live at https://kaushik05code.github.io/telesto-2026/** (GitHub Pages, free, HTTPS enforced, HSTS).
- Fonts self-hosted (20 woff2 files, 268 KB) — no third-party requests at runtime, works offline at the venue.
- Strict Content-Security-Policy + referrer policy on every page; all inline styles removed so `style-src 'self'` holds; `innerHTML` paths audited (all escaped or static).
- `robots.txt`, `.nojekyll`, themed 404 page. JSON-LD event description corrected to the three real verticals.

## v3 — 6 Sep 2026 · Real content from the official brochure

Installed poppler and extracted the full brochure text (`docs/brochure-text-extract.txt`). Replaced all invented copy with real facts:

- **Events**: the real three verticals — Multitasking Event / Best Management Team (offline, UG, four solo domains: Best Manager, Entrepreneurship Development, Wealth Management, HR/Marketing), Business Case (online + on-campus, UG & PG, teams of 3, prelims from 5 Sep), Business Quiz (offline, teams of 2). "Contingent" corrected: it's the BMT + Quiz registration bundle, not an event — now a delegation call-out.
- **New Prizes & Fees section**: ₹2.5 lakh cash pool + verified fee table (BMT 6k/10k, Quiz 2.5k/5k, Case 3k/6k, Contingent 8k/14k; outstation includes accommodation).
- **Schedule**: added "The Approach" online phase (5 Sep prelim, 7 Sep submission, 8 Sep final round); real 8:00 am reporting both days; unverified clock times replaced with honest AM/DAY/PM/CLOSE slots.
- **Register section**: real CHRIST-portal steps, the four scannable registration QR codes (cropped from the official poster), all four contacts with tel: links, and ground rules (IDs, formal attire, team caps).
- **About**: since 2017, international-level, 115+ campus victories. Removed the invented email address site-wide; footer now carries real phone contacts.
- Countdown & structured data aligned to the real 08:00 IST start.

## v2 — 6 Sep 2026

**Landing page**
- Live countdown to first contact (9 Sep, 08:30 IST) in the hero; switches to "The Singularity is live" during the event, disappears after.
- New black-hole accretion-disk artwork (client-supplied) in The Singularity section.
- Open Graph / Twitter cards, `theme-color`, and schema.org **Event** structured data for search and link previews.
- Hero eclipse art converted to WebP (2.3 MB → 154 KB) and preloaded; below-fold images lazy-load.

**The Gravity Board**
- **Projector mode** — ⛶ button (or press `P`) fullscreens the board with enlarged rows for the venue screen.
- **Transmission log** — a live feed of every score event (`Nova Syndicate scores +10`, lead changes) under the board, newest first.
- OG/meta tags.

**Project**
- Git repository with tagged versions (`v1`, `v2`) + zip snapshots in `versions/`.
- Source material (handoff docx, brochure PDF) filed under `docs/source/` (gitignored — 60 MB, unchanging).
- `CLAUDE.md` (working guide), `.claude/settings.json`, this changelog.

## v1 — 6 Sep 2026

Initial build: landing page (hero eclipse, singularity, four events, schedule with eclipse-phase timeline, sponsors, register) + live Gravity Board (FLIP-animated rankings, Judge Console with cross-tab sync, simulate mode, scores.json polling).

### Reverting

```bash
git checkout v1 -- .   # restore v1 files (or v2, etc.)
```

Zip fallbacks: `versions/telesto-v1.zip`.
