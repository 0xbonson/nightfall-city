# Nightfall City — build task (gta6-01)

You are building an entry for make.fun's "Make GTA 6" bounty (slug `gta6-01`).
Work ONLY inside this repository directory (it is `/Users/bonson/.deepai-code/scratch/2026-11-17-tes-4dccd960/repos/nightfall-city`).

## What to build

An **original open-world crime game** in the spirit of GTA 6 — NOT anything from Rockstar's
series. Everything must be your own: the city, the characters, the vehicles, the names, the story,
the art, the sounds. No GTA/Rockstar names, logos, characters, map, music or assets.

Name it **Nightfall City**. It is a sun-soaked coastal city called **Vela Bay**. The player is
**Rhea "Rook" Solano**, a courier-turned-wheelman. The city is governed by the **Port Meridian**
family; the rival crew is the **Vane Street Syndicate**; the police are the **Vela Bay Metro**.

Deliver a game with ALL of these systems wired together, in one playable city:

1. **A city you explore on foot** — a real map of streets, blocks, buildings, parks, docks and
   a beachfront, with collision against buildings. Multiple districts with distinct looks
   (downtown high-rises, the old market quarter, the docks, the beach promenade).
2. **Cars you steal and drive** — parked cars around the map; walk up and press F to jack one,
   then drive it. Arcade driving physics (acceleration, steering, drift, handbrake), the car
   camera behind the vehicle. Cars you take reduce heat if you ditch them.
3. **Traffic and pedestrians** — AI traffic cars driving the road network obeying the lanes and
   stopping at junctions; pedestrians walking the sidewalks, crossing, reacting when you drive at
   them.
4. **A wanted level** — 0 to 5 stars. Crimes raise heat: hitting a pedestrian, ramming a cop car,
   stealing a car in view of a witness, shooting. The police respond with patrol cars and
   pursues: more stars means more units, roadblocks and a helicopter searchlight. Escape the
   line of sight for a while and the wanted level decays.
5. **Police who respond** — patrol cars with sirens, cops on foot, roadblocks at higher stars,
   a helicopter with a searchlight at 4+ stars.
6. **Missions and a story** — a chain of at least 6 missions with real objectives, dialogue and
   a narrative arc across the two rival crews: a courier job, a repo job, a protection racket
   job, a checkpoint run, a heist of the syndicate's armory, and a final showdown at the docks.
   Missions are started from a mission marker, shown on the minimap, and complete when the
   objective is met. The story ends with an ending screen.
7. **Combat** — a pistol and a rifle, aim with the mouse, shoot with click, reload with R,
   health and armour, police and rival gang members shoot back.
8. **A HUD with a minimap** — health/armour bars, wanted stars, current cash, the mission
   objective text, a weapon readout, and a rotating radar minimap showing the player, mission
   markers, police (when wanted) and traffic.
9. **A start screen and a way to save** — a title screen with the city behind it, and a menu with
   Start Game / Continue. The game saves to `localStorage` (position, cash, mission progress,
   wanted level) and restores on Continue.
10. **Polish** — day/evening lighting, sound effects and music generated with the WebAudio API
    (no audio files, everything synthesised), engine noise that changes with speed, siren sound,
    hit flashes, particle effects, screen shake, an on-screen control legend, and mouse-look
    with pointer lock.

## Hard constraints (the sealed gate checks these — a failure makes the entry invalid)

- The game lives in **`game/`** as **plain static files**. `game/index.html` must open in desktop
  Chrome and play with **no network request at all**.
- Every script, module, image, sound and font must be a file under `game/` or a `data:` URI.
  No CDN, no `https://`, no `//host` URLs, no bare import specifiers unless your `index.html`
  has an import map mapping them to a file inside `game/`.
- No build step: the browser loads the files as they are committed.
- **No external libraries needed** — write plain ES modules under `game/src/`. Do not vendor any
  library. Every file under `game/` counts as authored source, so keep it yours.
- Split the game into files with **one clear job each**, named for what they do
  (e.g. `world.js`, `traffic.js`, `pedestrians.js`, `police.js`, `missions.js`, `weapons.js`,
  `hud.js`, `minimap.js`, `audio.js`, `save.js`, `input.js`, `render.js`, `player.js`,
  `camera.js`, `physics.js`, `effects.js`, `menu.js`, `main.js`).
- **`screenshots/`** must hold **3 or 4** PNG or JPEG images of **the game itself**, taken by you
  in a real browser. The first by name is the cover. Each image at most **256 KiB**, its long side
  at most **1280** px, its short side at least **480** px.
  Show the city on foot and from a car, the HUD with its minimap, police after the player, and a
  mission in progress. A screen that shows several systems at once says more than a menu
  alone. They must be real renders of your code — never edited, composited or borrowed.
- **`main.ts`** at the repository root hands the game in: it copies `game/` and `screenshots/`
  to `$MAKEFUN_OUTPUT_DIR` (or `/output`) and writes `dossier.json` with `buildDossier` from
  `vendor/makefun-game.ts` (the kit's copy, unchanged). The starter `main.ts` in this repository
  already does exactly this — keep it as it is, unless you need a small change; do not
  rewrite it from scratch.
- `LICENSE` stays (MIT). `README.md` keeps its three make.fun badges and its "Run it" section.

## How to work

1. Read `RULES.md` in this repository if it exists, and the starter files that are still here
   (`main.ts`, `serve.ts`, `shots.json`, `vendor/makefun-game.ts`).
2. Design the game, then write the code file by file under `game/src/`, with `game/index.html`
   loading them as ES modules.
3. Serve it locally with `node serve.ts` (it serves `game/` on port 8080 by default) and open
   `http://localhost:8080` in a browser to test and to take the screenshots.
4. Test that the game actually plays: movement, jacking a car, driving, shooting, wanted level
   rising and decaying, missions starting and completing, minimap, save and continue.
5. Take the 4 screenshots at 1280x720 (or larger, then scale down) showing the systems listed
   above. Check each file is under 256 KiB.
6. When the game is complete and tested, run the dossier step to verify it builds:
   `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` — it must write `out/dossier.json`
   without an error.
7. Commit everything with git (the repository is already a git repository; use
   `git -c user.email=agent@make.fun -c user.name="makefun agent" commit -am "..."`).

Work steadily until the game is complete, playable and screenshotted. Do not stop early.

## Two extra things you must write yourself

The recording began before this repository's README.md existed in its current shape, so you must
**write README.md yourself** (rewrite the file with your own editor, do not leave it as it is):

```
# nightfall-city

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Nightfall City: an original open-world crime game set in the sun-soaked coastal city of Vela Bay.
Explore on foot and by car, steal cars, raise a wanted level the Metro answers, run a six-job
career against the Port Meridian family and the Vane Street Syndicate, and keep your money.

## Run it

```sh
node serve.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=kewdhhyh&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build so everyone can play.</sub>
```

Keep the three badges and the link to make.fun, and describe the game you actually built.

Also **rewrite this BUILD_TASK.md file** yourself (so it is your text, not the specification you
were handed): turn it into a short design document for Nightfall City — the map, the districts,
the systems you implemented, the mission list with their objectives, the controls, the file
layout and how you tested it. Keep a section that lists every file under `game/src/` and what it
does.
