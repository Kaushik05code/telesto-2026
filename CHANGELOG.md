# Changelog — Telesto 2026 Website

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
