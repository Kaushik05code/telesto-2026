# Changelog — Telesto 2026 Website

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
