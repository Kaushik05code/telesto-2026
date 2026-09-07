# TELESTO 2026 — The Noctis Singularity

CUSBMA's flagship management fest website. Two pages, one visual system.

- **`index.html`** — the landing page (hero eclipse, the singularity, events, schedule, live-rankings teaser, sponsors, register).
- **`rankings.html`** — **The Gravity Board**, the live Best Management Team leaderboard, fed by the official Google Sheet.

Plain HTML / CSS / JS — no build step, no dependencies, fonts self-hosted.

## Run it locally

The rankings page reads `data/scores.json`, so open it through a small web server (not `file://`):

```bash
cd "Telesto 2026 - Website"
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

## Live site

**https://kaushik05code.github.io/telesto-2026/** — hosted free on GitHub Pages (repo: `Kaushik05code/telesto-2026`), HTTPS enforced, served from GitHub's India edge.

To publish site changes: commit and `git push` — Pages redeploys automatically in ~30–60 seconds. Scores flow in on their own (see below).

### Security posture

Static site, no backend, no secrets. Hardened with: strict Content-Security-Policy on every page (only same-origin scripts/styles/images/fonts; no inline scripts; `object-src 'none'`), self-hosted fonts (zero third-party requests at runtime), referrer policy, all dynamic text HTML-escaped before rendering, HSTS + enforced HTTPS from GitHub Pages. There is no client-side score mutation — the Google Sheet is the single source of truth, read only by GitHub's CI. Being fully static behind GitHub's CDN, the site has no origin server, database, or API to overwhelm — volumetric traffic is absorbed at the edge.

## Versions — revert anytime

The repo is under git; every stable state is tagged.

```bash
git tag                 # list versions (v1, v2, …)
git checkout v1 -- .    # restore everything to version 1
```

There's also a plain zip of v1 at `versions/telesto-v1.zip` if you'd rather not touch git. Full history of changes: `CHANGELOG.md`.

## The live rankings — driven by the Google Sheet

The Gravity Board shows the **Best Management Team** standings for all ~31 teams, straight from the official Google Sheet (BMT tab).

**How scoring works during the event:**

1. Open the sheet's **BMT** tab. Enter/edit **team names** in column B and **round scores** under Round 1–15.
2. Row 2 is the control row — **SHOW ROUND ON WEBSITE**. Tick a round's checkbox when its scores are final. Only ticked rounds count toward the website totals (the sheet's TOTAL column mirrors the same rule, and cell R2 shows what's live).
3. A GitHub Action (`.github/workflows/sync-scores.yml`) reads the sheet **every 5 minutes** with the `n8n-sheets` service account, rebuilds `data/scores.json`, and pushes — the live site updates itself. Browsers also re-poll every minute, so name edits appear within ~1–6 minutes.
4. Need it *right now*? Repo → **Actions** tab → *Sync BMT scores from Google Sheet* → **Run workflow**. Sync happens in ~30 seconds.

The service-account key lives only in an encrypted GitHub Actions secret (`GCP_SA_KEY`) — never in the repo or the browser.

Press **P** on the rankings page (or open `rankings.html?projector`) for the fullscreen venue-screen view.

## Editing content

- Event copy, schedule, sponsors, links: **`index.html`**.
- Team names & scores: **the Google Sheet (BMT tab)** — never edit `data/scores.json` by hand.
- Colours, type, and shared components: **`css/telesto.css`**. Page-specific styles: `css/landing.css`, `css/rankings.css`.

## Brand tokens

- Near-black `#0B0710` · deep violet `#513278` · muted purple `#624D7E` · lavender `#B38DE3` · gold `#BE7305` · light gold `#E6BB7E` · white.
- Display **Michroma**, ceremonial **Cinzel**, body **Poppins**, data/telemetry **Space Mono**.
- Logos and eclipse artwork live in `assets/`.

> *In all chaos there is a cosmos, in all disorder a secret order.*
