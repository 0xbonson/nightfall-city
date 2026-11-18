# Nightfall City: Vela Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Nightfall City: Vela Bay** is an open-world 3D crime action sandbox developed for the make.fun bounty challenge (`gta6-01`). Built entirely from scratch using pure vanilla WebGL and ES modules, it runs completely offline in any modern browser with zero build steps, bundlers, or third-party engines.

Step into the shoes of **Rhea "Rook" Solano**, an elite operative navigating the sun-drenched coastal underworld of **Vela Bay**. Confront rival syndicates, seize fast cars, outrun tactical police pursuits across elevated expressways, and conquer eight story contracts across four sprawling districts.

---

## The World of Vela Bay

- **Downtown Financial District**: Glass-curtain skyscrapers, corporate setback towers, illuminated rooftop crowns, helipads, and wide pedestrian plazas.
- **Ocean Promenade & Marina**: Art Deco beachfront hotels, pastel balconies, cedar boardwalk, tropical palm boulevards, and moored luxury yachts in ocean slips.
- **Old Town Historic Quarter**: Terracotta-tiled townhouses, Mediterranean ochre walls, narrow alleyways, and storefront awnings.
- **Meridian Cargo Docks**: Heavy industrial concrete quays, multi-tiered shipping container stacks in vivid safety colors, cargo ships, and an imposing 36-meter industrial gantry crane.
- **Elevated Skyway & Central Park**: Multi-lane concrete overpass spanning arterial avenues with approach ramps, overlooking landscaped park lawns and fountains.

---

## Core Systems & Highlights

- **Pure WebGL Engine & Sunset Lighting**: Custom shader pipeline delivering warm golden-hour sunlight, sky hemisphere ambient fill, road asphalt sheen, storefront and office window illumination, contact shadow ambient occlusion, dynamic wave displacement with crest foam, and soft distance fog.
- **Vehicle Simulation & Arcade Drifting**: 6 distinct vehicles (*Veloce GT* sports car, *Torque 440* muscle car, *Metro Cruiser* police interceptor, *Executive* sedan, *Cabrio* taxi, *Titan Box* truck). Features high-speed handbrake drifting (`Space`), engine RPM throttle curves, body roll, and tire smoke.
- **Living City Ecosystem**: Autonomous civilian traffic navigating multi-lane intersections and dynamic pedestrians wandering sidewalks that panic and scatter from speeding vehicles and gunfire.
- **5-Star Escalating Wanted System**: Committing crimes summons foot patrol officers, high-speed cruisers, tactical PIT roadblocks, and airborne police helicopters with downward spotlight beams.
- **Combat & Arsenal**: Third-person ballistics with high-visibility glowing golden tracers, weapon recoil, magazine reload cycles, expanding fireball explosions, and tactical enemy Syndicate AI squads.
- **8-Stage Syndicate Story Campaign**: Coherent contract chain from *The Marina Drop* to the grand finale *Take Down the Syndicate*, complete with in-game mission waypoints, taxi driving side gigs (`K`), and 3D rotating diamond beacons.
- **Tactical GPS Radar & HUD**: 2D canvas overlay featuring health/armor bars, cash balance, wanted heat stars, dynamic vehicle speedometer (MPH), and a circular radar minimap showing roads, ocean coastline, traffic, sirens, and objective waypoints.
- **100% Procedural WebAudio Synth**: Zero external sound assets. Generates engine RPM revs, dual-tone sirens, drift screeches, gunshots, explosions, and retro synthwave basslines using native WebAudio oscillators.
- **Local Career Persistence**: Seamlessly saves and restores cash, mission progress, weapons, and stats in `localStorage`.

---

## Controls

| Action | Key / Input |
|---|---|
| **Move on Foot / Steer Car** | `W`, `A`, `S`, `D` / Arrow Keys |
| **Sprint / Nitro Boost** | `Shift` (Hold) |
| **Handbrake Drift / Slide** | `Space` (in vehicle) / Jump (on foot) |
| **Enter / Exit Vehicle** | `F` or `Enter` |
| **Aim & Look** | Mouse Movement (Pointer Lock enabled) |
| **Fire Equipped Weapon** | Left Mouse Button |
| **Aim Down Sights** | Right Mouse Button (Hold) |
| **Equip Weapons** | `1` (Pistol), `2` (SMG), `3` (Shotgun), `4` (Carbine) |
| **Reload Magazine** | `R` |
| **Sound Vehicle Horn** | `E` (in vehicle) |
| **Toggle Taxi Shift** | `K` (in taxi or sedan) |
| **Toggle Vehicle Headlights**| `H` (in vehicle) |
| **Pause / Mission Log / Menu**| `Esc` or `P` |

---

## File Layout

```
nightfall-city/
├── game/
│   ├── index.html            # Main game page, viewport canvas container, shot query handler
│   └── src/
│       ├── config.js         # Central world constants, district definitions, lighting, missions
│       ├── math.js           # Vector3, Matrix4, quaternion, and spatial utility functions
│       ├── input.js          # Keyboard, mouse buttons, pointer lock, and movement tracking
│       ├── audio.js          # Procedural WebAudio sound generator (engine, sirens, guns, synthwave)
│       ├── save.js           # LocalStorage state persistence and career loading
│       ├── camera.js         # Third-person follow camera, high-speed chase zoom, screen shake
│       ├── world.js          # Procedural world generation: 4 districts, roads, skyway, docks, crane
│       ├── renderer.js       # Hand-written WebGL engine, sunset atmosphere, asphalt sheen, lights
│       ├── vehicles.js       # 6 vehicle models, driving physics, handbrake drift, traffic AI
│       ├── pedestrians.js    # Pedestrian models, wandering AI, panic fleeing, cash drops
│       ├── player.js         # Rook character model, articulated limbs, carjacking, health/armor
│       ├── police.js         # 0-5 star wanted system, pursuit cruisers, spotlight helicopter
│       ├── combat.js         # Ballistics, golden glowing tracers, enemy syndicate AI, explosions
│       ├── missions.js       # 8-mission story campaign, taxi side jobs, 3D rotating diamond beacon
│       ├── hud.js            # Health/armor bars, cash readout, wanted stars, speedometer gauge
│       ├── minimap.js        # Circular GPS radar with ocean water, roads, traffic, police sirens
│       ├── menus.js          # Pause menu, controls guide, campaign mission log, victory screen
│       └── main.js           # Game coordinator, main loop, system updates, shot preset choreography
├── screenshots/
│   ├── 1-city-street.png     # Downtown on foot: soaring towers into sunset sky, traffic, pedestrians, HUD
│   ├── 2-car-promenade.png   # Sports car at 151 MPH on coastal road: ocean waves, palms, boardwalk, marina
│   ├── 3-police-chase.png    # 5-star police chase: flashing red/blue sirens, cruisers, elevated overpass
│   └── 4-dock-heist.png      # Meridian Docks at golden hour: shipping containers, 36m gantry crane, water
├── vendor/
│   └── makefun-game.ts       # make.fun standard-library evaluation builder (unmodified)
├── main.ts                   # Packaging pipeline script for make.fun evaluation dossier
├── serve.ts                  # Clean static development server serving game/ on port 8080
├── shots.json                # Camera and world preset definitions for screenshot capture
├── BUILD_TASK.md             # Detailed engineering design and architecture specification
├── LICENSE                   # MIT License with SPDX-License-Identifier
├── .gitignore                # Git ignore patterns for dependencies and build artifacts
└── README.md                 # Project overview, gameplay controls, and make.fun badges
```

---

## How to Run

1. Start the local server:
   ```sh
   node serve.ts
   ```
2. Open `http://localhost:8080/game/index.html` in any modern web browser (Google Chrome, Safari, Firefox, Edge).
3. Click **Launch Game** to enter Vela Bay.

To view the deterministic photo mode scenes:
- Downtown On-Foot: `http://localhost:8080/game/index.html?shot=1`
- Waterfront Sports Car: `http://localhost:8080/game/index.html?shot=2`
- High-Speed Police Chase: `http://localhost:8080/game/index.html?shot=3`
- Meridian Docks Heist: `http://localhost:8080/game/index.html?shot=4`

---

<sub>Entered on [make.fun](https://make.fun/?ref=kewdhhyh&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build so everyone can play.</sub>
