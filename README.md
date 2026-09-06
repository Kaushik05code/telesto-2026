# TELESTO 2026 — The Noctis Singularity

CUSBMA's flagship management fest website. Two pages, one visual system.

- **`index.html`** — the landing page (hero eclipse, the singularity, events, schedule, live-rankings teaser, sponsors, register).
- **`rankings.html`** — **The Gravity Board**, a live-updating leaderboard for the 10 finalist teams.

Plain HTML / CSS / JS — no build step, no dependencies. Fonts load from Google Fonts (needs internet); everything else is local.

## Run it locally

The rankings page reads `data/scores.json`, so open it through a small web server (not `file://`):

```bash
cd "Telesto 2026 - Website"
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

## Live site

**https://kaushik05code.github.io/telesto-2026/** — hosted free on GitHub Pages (repo: `Kaushik05code/telesto-2026`), HTTPS enforced, served from GitHub's India edge.

To publish changes: commit and `git push` — Pages redeploys automatically in ~30–60 seconds. That's also how you update live scores for everyone: edit `data/scores.json`, push, and every open browser picks it up within seconds of the deploy.

> For the venue projector, prefer running locally (`python3 -m http.server 8000`) — the Judge Console then updates the projector tab instantly, no push needed.

### Security posture

Static site, no backend, no secrets. Hardened with: strict Content-Security-Policy on every page (only same-origin scripts/styles/images/fonts; no inline scripts; `object-src 'none'`), self-hosted fonts (zero third-party requests at runtime), referrer policy, all dynamic text HTML-escaped before rendering, HSTS + enforced HTTPS from GitHub Pages. The Judge Console only ever affects the viewer's own browser — the shared source of truth is `scores.json` in the repo.

## Versions — revert anytime

The repo is under git; every stable state is tagged.

```bash
git tag                 # list versions (v1, v2, …)
git checkout v1 -- .    # restore everything to version 1
```

There's also a plain zip of v1 at `versions/telesto-v1.zip` if you'd rather not touch git. Full history of changes: `CHANGELOG.md`.

## The live rankings — three ways to drive it

Open **`rankings.html`**. The board re-ranks teams by score, animates the bars, and slides rows past each other when a team overtakes another. There are three ways to make scores change live:

1. **Edit `data/scores.json`** — the board re-fetches it every few seconds. During the event, keep the file open, change a team's `score`, save — the board updates on its own. This is the simplest "single source of truth."

2. **Judge Console** — click **⊕ Judge Console** (bottom-right) or open `rankings.html#console`. Award or deduct points per team and the board updates instantly. Changes are saved in the browser and broadcast to every open tab in that browser — so you can run the **projector on one tab and score from another**. Use **Reset to scores.json** to clear local edits.

3. **Simulate** — flip *Simulate live scoring* in the console (or open `rankings.html?demo`) to auto-generate score changes. For rehearsals, demos, and screenshots only.

On the day: press **P** (or the ⛶ Projector chip) for a fullscreen, big-type view built for the venue screen, and watch the **Transmission Log** under the board narrate every score event as it lands.

### Going fully live with a backend

To sync scores across different devices/networks (not just tabs in one browser), point the board at a real backend. Edit **`js/rankings.js`** → `fetchJSON()` and return data in the same shape as `scores.json`. A Supabase table + Realtime subscription drops in cleanly here; the render layer doesn't need to change.

## Editing content

- Event copy, schedule, sponsors, links: **`index.html`**.
- Team names / tags / starting scores: **`data/scores.json`** (and the fallback list at the top of `js/rankings.js`).
- Colours, type, and shared components: **`css/telesto.css`**. Page-specific styles: `css/landing.css`, `css/rankings.css`.

## Brand tokens

- Near-black `#0B0710` · deep violet `#513278` · muted purple `#624D7E` · lavender `#B38DE3` · gold `#BE7305` · light gold `#E6BB7E` · white.
- Display **Michroma**, ceremonial **Cinzel**, body **Poppins**, data/telemetry **Space Mono**.
- Logos and eclipse artwork live in `assets/`.

> *In all chaos there is a cosmos, in all disorder a secret order.*
