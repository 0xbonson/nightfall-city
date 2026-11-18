# Nightfall City: Vela Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Nightfall City: Vela Bay** is an original open-world 3D crime action game built for the make.fun bounty challenge (`gta6-01`). Engineered entirely from scratch in vanilla WebGL and ES modules with zero third-party engines or runtime dependencies, it runs completely offline in modern desktop browsers.

---

## 1. Setting: The Sun-Drenched City of Vela Bay

Vela Bay is a vibrant, sun-soaked coastal Mediterranean metropolis framed by terracotta roofs, turquoise waters, rolling foothills, and towering modern glass spires. 

### Municipal Districts
- **Downtown Vela**: The financial pulse of the city, lined with towering champagne-bronze and teal glass skyscrapers, wide pedestrian plazas, rooftop elevator penthouses, water towers, and storefront neon displays.
- **Ocean Promenade**: An expansive beachfront boulevard facing the open bay, dotted with Art Deco pastel hotels, tiered balconies, swaying palms, and a scenic cedar boardwalk.
- **Old Market Quarter**: Historic district of warm sandstone ochre buildings, tiled terracotta rooftops, colorful striped shop awnings, and slender Italian cypress groves.
- **Meridian Cargo Docks**: The industrial waterfront hub featuring stacked multi-chroma shipping containers, open water basins, freight ships, and a towering 36-meter yellow container gantry crane at Pier 7.
- **Marina San Vento**: Luxury yacht basin with private docks, wooden slips, and seaside cafes.
- **Skyway Boulevard**: Multi-lane elevated concrete expressway spanning the metropolis with approach ramps, crossing over Central Grand Plaza and the majestic Harbor Suspension Bridge.
- **Downtown Safehouse Garage** (`X = 95, Z = -85`): A fully functional hideout with illuminated neon signage, roll-up shutter bay, vehicle lift, and mechanic tool chests.

---

## 2. Story: Rook's Ascendance

Take control of **Rhea "Rook" Solano**, an exiled operative returning to Vela Bay to dismantle the corrupt Syndicate that seized the city's ports and municipal council. Operating out of an underground safehouse in Downtown Vela, Rook takes on high-stakes courier runs, precision car repossessions, underground street races, and dockside ambushes to bring down the Syndicate's syndicate lieutenants and corrupt harbor officials.

---

## 3. How to Play: Complete Key Controls

| Action | Control / Keybinding |
|---|---|
| **Move on Foot** | `W`, `A`, `S`, `D` or Arrow Keys |
| **Sprint / Nitro** | `Shift` (Hold) |
| **Jump (on foot) / Drift (in car)** | `Space` |
| **Enter / Exit Vehicle** | `F` or `E` (near door) |
| **Aim Weapon** | Mouse Movement (Pointer Lock enabled) |
| **Fire Equipped Weapon** | Left Mouse Button (`LMB`) |
| **Aim Down Sights (Zoom Cam)** | Right Mouse Button (`RMB` Hold) |
| **Switch Weapons** | `1` (Pistol), `2` (SMG), `3` (Shotgun), `4` (Carbine) or `Q` (Cycle) |
| **Reload Magazine** | `R` (on foot) |
| **Cycle Radio Stations** | `R` or `[` / `]` (inside vehicle) |
| **Vehicle Horn** | `H` or `E` (clears traffic & scatters pedestrians) |
| **Toggle Vehicle Headlights** | `L` |
| **Start / End Taxi Driver Shift** | `K` (while driving a taxi or sedan) |
| **Safehouse Garage Operations** | `E` or `F` (drive inside safehouse bay) |
| **Pause / Mission Log / Options** | `Esc` or `P` |

---

## 4. Syndicate Story Campaign & Rewards

The campaign consists of 8 story missions with narrative briefings, 3D golden beacon waypoints, and rewards:

1. **The Marina Drop** — Retrieve encrypted USB drive from Marina Pier 7 and deliver to safehouse.  
   *Reward: $2,500*
2. **Repo on Vane Turf** — Infiltrate the Old Town compound, eliminate the guards, and steal back the Veloce GT sports coupe.  
   *Reward: $4,000*
3. **Market Shakedown** — Defend local vendors in the Old Market Quarter by eliminating Syndicate extortionists.  
   *Reward: $5,500*
4. **Vela Bay Grand Prix** — Win a high-speed 8-checkpoint street race across Ocean Promenade and Skyway Boulevard against the clock.  
   *Reward: $7,500*
5. **Munitions Depot Raid** — Infiltrate the fortified dockside weapons depot and seize Syndicate tactical carbines.  
   *Reward: $9,000*
6. **Pier 7 Ambush** — Ambush corrupt harbor enforcers and secure contraband cargo.  
   *Reward: $12,000*
7. **Skyway Interception** — Pursue and intercept an armored syndicate courier convoy on the elevated expressway.  
   *Reward: $15,000*
8. **Take Down the Syndicate** — Storm the primary Meridian Docks headquarters, eliminate the syndicate leadership, and make a getaway.  
   *Reward: $25,000*

---

## 5. Side Activities & Progression

- **Safehouse Garage**: Store up to 4 stolen or customized vehicles. Driving inside automatically repairs vehicle damage, restocks body armor to 100%, and instantly clears all active police wanted stars.
- **Taxi Driver Side Hustle**: Press `K` while driving a taxi or civilian car to toggle on-demand taxi fares. Pick up fares, follow the radar waypoint across town, and earn $350–$800 cash per trip.
- **Street Crime & Evasion Bonuses**: Lose high-speed police chases by breaking line of sight to receive cash bonuses ($250 per evaded star).
- **Contraband Cash Drops**: Defeated enforcers and civilians drop collectible cash bundles ($20–$200) that chime on pickup.

---

## 6. How Save & Load Works

The game automatically syncs your career progress to browser `localStorage` (`nightfall_city_save_v2`):
- Active mission story progress
- Player cash reserves and weapon arsenal
- Health, armor, and active wanted level
- Stashed vehicles in the Safehouse Garage
- Selected radio station preference

Your game seamlessly resumes where you left off upon reloading or refreshing the browser. To reset your career, select **Restart to Mission 1** from the pause menu (`Esc`).

---

## 7. Technical Architecture & Source Modules

The codebase is structured into single-responsibility ES modules under `game/src/`:

- [`config.js`](file:///game/src/config.js): World coordinates, district dimensions, lighting parameters, vehicle physics specs, weapon attributes, 8-mission definitions, and photo mode camera presets.
- [`math.js`](file:///game/src/math.js): Hand-optimized 3D vector, matrix (`M4`), and geometry utility routines.
- [`world.js`](file:///game/src/world.js): Procedural metropolis generation: 6 districts, skyscrapers with rooftop clutter, Mediterranean villas, ocean coastline, suspension bridge, gantry cranes, and cypress trees.
- [`renderer.js`](file:///game/src/renderer.js): Pure WebGL rendering engine with sunset atmospheric sky dome, solar corona, asphalt sheen, procedural window grids, dynamic police strobe lights, and depth fog.
- [`camera.js`](file:///game/src/camera.js): Spring-interpolated third-person camera with high-speed dynamic FOV expansion, look-ahead projection, and screen shake.
- [`player.js`](file:///game/src/player.js): Rhea "Rook" Solano character controller, walk/sprint kinetics, multi-weapon handling, and vehicle boarding.
- [`vehicles.js`](file:///game/src/vehicles.js): 6 vehicle classes, engine RPM acoustics, Ackermann steering, suspension roll/pitch, arcade handbrake drifting, and horn.
- [`pedestrians.js`](file:///game/src/pedestrians.js): Civilian population with articulated walking cycles, panic fleeing AI, and dropped cash pickups.
- [`police.js`](file:///game/src/police.js): 0–5 star wanted heat manager, pursuit cruisers, roadblock deployment, tactical police helicopter with searchlight beam, and evasion bonuses.
- [`combat.js`](file:///game/src/combat.js): Real-time ballistics with glowing tracer rounds, multi-pellet shotgun spread, Syndicate enforcer AI, and fireball explosions.
- [`missions.js`](file:///game/src/missions.js): 8-part story arc manager, checkpoint street races, taxi fare generator, and 3D rotating diamond beacon.
- [`hud.js`](file:///game/src/hud.js): 2D Canvas HUD with health/armor gauges, cash counter, 5 wanted stars, ammo readouts, speedometer dial, and district toasts.
- [`minimap.js`](file:///game/src/minimap.js): Rotating GPS radar minimap displaying ocean coastline, roads, safehouse icon, traffic pips, flashing police markers, and objective waypoints.
- [`audio.js`](file:///game/src/audio.js): 100% procedural WebAudio sound synthesizer: engine RPM revs, dual-tone sirens, drift screeches, gunshots, explosions, cash chimes, and radio audio.
- [`radio.js`](file:///game/src/radio.js): Multi-station procedural radio system (Vela Wave 98.7, Sol Coastal FM, Metro Police Dispatch).
- [`districts.js`](file:///game/src/districts.js): Municipal district boundary detection with animated HUD entrance banners.
- [`garage.js`](file:///game/src/garage.js): Safehouse garage system: 3D bay mesh, vehicle stashing, free repair, armor restock, and heat clearance.
- [`menus.js`](file:///game/src/menus.js): Start overlay, pause menu, controls cheatsheet, mission contract dossier, and victory screen.
- [`save.js`](file:///game/src/save.js): LocalStorage serialization, career state restoration, and profile wipe.
- [`input.js`](file:///game/src/input.js): DOM keyboard, mouse buttons, pointer lock, and movement deltas.
- [`main.js`](file:///game/src/main.js): Game loop coordinator, subsystem orchestration, and deterministic photo mode executor.

---

## 8. How to Run & Verify

1. Launch the static server:
   ```bash
   node serve.ts --port 8080
   ```
2. Open `http://localhost:8080/index.html` in your browser.
3. Test photo mode poses:
   - Cover street shot: `http://localhost:8080/?shot=1`
   - Coastal car promenade: `http://localhost:8080/?shot=2`
   - 5-Star police chase: `http://localhost:8080/?shot=3`
   - Meridian Docks heist: `http://localhost:8080/?shot=4`

Package for distribution:
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](file:///LICENSE) file for details.  
`SPDX-License-Identifier: MIT`

<sub>Entered on [make.fun](https://make.fun/?ref=kewdhhyh&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build so everyone can play.</sub>
