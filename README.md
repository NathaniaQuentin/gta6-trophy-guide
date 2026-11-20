# Leonida Trophy Guide — all 55 GTA 6 trophies

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/NathaniaQuentin/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/NathaniaQuentin/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI. Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide" bounty, $250 in USDC.

## What it is

- **Every trophy, official and exact.** All 55 names, descriptions and grades exactly as PlayStation publishes them (1 platinum, 2 gold, 6 silver, 46 bronze), with a guide in the author's own words for each one: what to do, where and how, when it can be missed, and which source each fact comes from.
- **A roadmap to the platinum.** Three stages with hours and difficulty, per-chapter difficulty and time estimates, a play order, and missable warnings.
- **A tracker that remembers.** A checklist with progress saved in the browser (localStorage), export to a file and import back, filters by kind (story, missable, collectibles, activities, robberies, side strands, miscellany) and grade, search, sorting, and a spoiler-free mode that hides unearnt story trophies until you earn them.
- **Honest about what is unknown.** One trophy is flagged as possibly missable (Positive Mental Attitude — do its Chapter 1 spots during Chapter 1; whether it truly counts as missable is unconfirmed). Two trophies (Bad Luck, I Guess; Ten Pin) are labelled unconfirmed instead of guessed at. No online trophies; difficulty 4/10, about 200 hours, one playthrough, cheats disable trophies.

## Run it

```sh
node serve.ts
# open http://localhost:8080 — the guide works with the network off
```

Or open `app/index.html` from any static server with `app/` at its root. The app loads only `app/data/trophies.json` from its own folder and makes no network request.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/dossier.json from app/ and screenshots/ via vendor/makefun-frontend.ts
```

## Files

- `app/index.html`, `app/style.css`, `app/app.js` — the guide and tracker (no libraries, no build step)
- `app/data/trophies.json` — the 55 trophies, the roadmap, the chapters, the play order and the missable warnings
- `screenshots/` — 4 real renders of the app (see `shots.json` for which view each one shows)
- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to the output and writes `dossier.json`
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged
- `serve.ts` — the kit's static server

## Sources

Guides cite their sources beside each trophy: PowerPyx's GTA 6 Trophy Guide and Collectible Guides, Exophase's GTA VI trophy list, and PSNProfiles' GTA VI Trophy List. Official names, descriptions and grades are PlayStation's own words; the guides are written for this page.
