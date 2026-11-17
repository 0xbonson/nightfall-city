# Nightfall City: Vela Bay — Game Design & Architecture Document

Nightfall City is an original 3D open-world crime action game developed for the make.fun bounty (slug `gta6-01`). The game delivers a complete, cohesive crime sandbox experience set in the coastal metropolis of **Vela Bay**, running fully offline in modern desktop browsers as plain ES modules with zero third-party libraries, CDNs, or build steps.

---

## 1. World & Setting: Vela Bay

The game world spans a rich coordinate area (-280m to +280m in X and Z) featuring 4 distinct districts and an ocean coastline:

1. **Downtown Vela Bay** (North-East: `X: 20 to 240`, `Z: -240 to -20`):
   - Soaring modern skyscrapers reaching up to 120m in height with reflective glass window bands, concrete corporate plazas, and neon signage.
2. **Old Market Quarter** (North-West: `X: -240 to -20`, `Z: -240 to -20`):
   - Dense historic quarter with terracotta roofs, red-brick facades, narrow winding alleyways, stone arches, and merchant market squares.
3. **Meridian Shipping Docks** (South-East: `X: 20 to 240`, `Z: 20 to 240`):
   - Industrial waterfront shipping port with cargo warehouses, depot compounds, stacked multi-colored shipping containers, gantry cranes, and waterfront piers.
4. **Ocean Promenade & Beach** (South-West: `X: -240 to -20`, `Z: 20 to 240`):
   - Golden sand beaches, animated coastal ocean waves, beachfront hotels, luxury villas, and tall palm tree boulevards.
5. **Grand Parkway & Road Network**:
   - Four-lane central avenues crossing North-South (`X = 0`) and East-West (`Z = 0`) connecting all districts with lane dividers, asphalt textures, and yellow centerlines.

---

## 2. Core Systems Implemented

### 2.1 Exploration & Foot Traversal
- Full 3D third-person character movement for protagonist **Rhea "Rook" Solano**.
- Movement mechanics: walk, sprint (Shift), directional strafing, and camera-relative orientation.
- Precise AABB/circle sliding collision detection against building walls, obstacles, shipping containers, and world borders.

### 2.2 Vehicle System & Arcade Driving
- Diverse vehicle roster with 6 distinct handling profiles:
  - *Veloce GT* (Sports car: top speed 34, rapid acceleration, high grip)
  - *Meridian Cruiser* (Luxury sedan: balanced performance, smooth handling)
  - *Vane Muscle* (Muscle car: high torque, prone to power drifts)
  - *Metro Patrol* (Police interceptor cruiser with siren lightbar)
  - *Titan Van* (Heavy delivery transport: high mass, durable chassis)
  - *Cobra Cab* (City taxi)
- Walk up to any parked or traffic vehicle and press `F` to jack the car.
- Driving dynamics include forward throttle, reverse, foot brake, steering response curves, handbrake drift mechanics (`Space`), tire smoke particle generation, and crash damage modeling.
- Changing or ditching a stolen car doubles evasion rate when escaping police pursuit.

### 2.3 Traffic & Pedestrian Population
- Autonomous AI traffic vehicles navigating the road grid, staying in lanes, and braking for obstacles.
- Dynamic pedestrian population walking along sidewalks and crosswalks with varied outfits.
- Pedestrians panic, scream, and flee when vehicles speed nearby or gunfire erupts.
- Pedestrians drop cash pickups ($20–$100) when eliminated.

### 2.4 Escalating 5-Star Wanted System & Metro Police
- Crime reporting engine monitoring player infractions (carjacking, hit-and-run, discharge of firearms, assaulting officers).
- Heat scales from 0 to 5 stars:
  - **1 Star**: Patrol officers investigate on foot.
  - **2 Stars**: Police cruisers respond and initiate active vehicle pursuit.
  - **3 Stars**: Multi-cruiser pursuit with PIT maneuvers and tactical road barricades.
  - **4 Stars**: Police helicopter deployed with aerial searchlight and SWAT backup.
  - **5 Stars**: Maximum tactical response with sniper fire and aggressive pursuit.
- Evasion mechanic: losing visual line-of-sight starts an evasion countdown where stars flash; successfully hiding drops wanted levels back to zero.

### 2.5 Combat & Arsenal
- Real-time third-person gunplay with mouse aiming and Pointer Lock:
  - **Viper .45 Pistol**: Semi-automatic, 12-round magazine, 120 reserve ammo, high precision.
  - **Vane Carbine Rifle**: Fully automatic, 30-round magazine, 240 reserve ammo, high fire rate.
- Weapons feature ammunition tracking, reload cycles (`R`), spread recoil, muzzle flashes, and blood/spark impact particles.
- Hostile syndicate enforcers and police return fire with tactical AI.

### 2.6 Narrative Campaign (6 Story Missions)
A connected 6-mission story arc detailing Rook's struggle against the rival crews:
1. **The Marina Drop**: Collect an encrypted datapad at Marina Pier and deliver it across town to Matteo Port Meridian's penthouse before the 95s timer expires.
2. **Repo on Vane Turf**: Infiltrate the Vane Syndicate's Old Town compound, neutralize 3 guarding thugs, steal back the custom Nero GT, and deliver it to the Docks Chop Shop.
3. **Market Muscle**: Protect Old Market merchants by taking down 5 extortionist syndicate enforcers in the market square, then evade the responding Metro 2-star police patrol.
4. **Vela Bay Sprint**: High-stakes underground checkpoint street race across 8 gates connecting the beach boulevard, downtown freeway, and dockyard within 110 seconds.
5. **Armory Infiltration**: Infiltrate the fortified syndicate munitions depot, eliminate 6 compound defenders, blow the vault, secure the military cache, and escape a 3-star police net.
6. **Nightfall at the Docks**: Final showdown at Shipping Pier 7; take down Boss Hector Vane and corrupt Police Captain Reynolds, destroy their armored vehicle, and board the getaway speedboat to claim control of Vela Bay.

### 2.7 Heads-Up Display (HUD) & Rotating Radar Minimap
- Custom 2D canvas overlay layered over the WebGL 3D viewport.
- Minimap radar with compass bezel, dynamic rotation matching player heading, road network, ocean coastline, player arrow, mission objective waypoint, police flashing beacons, and enemy blips.
- Status bars for player Health (green/red), Armor (cyan), Cash balance, 5 Wanted Stars, active weapon, ammo counters, and dynamic vehicle speedometer (MPH).
- Interactive hint prompts (`[F] Jack Vehicle`, `[F] Exit Vehicle`) and story dialogue subtitles.

### 2.8 100% Procedural WebAudio Synthesis
- Zero external audio files; all sound effects and music are synthesized via WebAudio API nodes:
  - Vehicle engine noise (sawtooth oscillators with throttle-modulated biquad filters tracking RPM)
  - Police siren wail (dual-tone LFO frequency modulation)
  - Gunshots (transient noise bursts with exponential decay)
  - Tire screeches (bandpass-filtered white noise during drift)
  - Crash impacts, cash chimes, and mission fanfares
  - In-game generative synthwave radio stations (*Vela Wave 80.4* and *Nightfall Beats*)

### 2.9 Persistence & Career Save
- Full state saving to browser `localStorage` (position, cash, active mission, health, armor, wanted heat).
- Title screen menu with "Start New Game", "Continue Career", "Controls", and audio toggles.

---

## 3. Architecture & File Layout

All game code resides under `game/` as plain ES modules:

```
nightfall-city/
├── game/
│   ├── index.html           # Main HTML document, canvas setup, viewport styling
│   └── src/
│       ├── config.js        # Central engine constants, daylight parameters & district config
│       ├── main.js          # Game loop, state machine, lifecycle, deterministic query hooks
│       ├── world.js         # Map geometry, 4 districts, road network, building collision & props
│       ├── physics.js       # Arcade vehicle dynamics, drift physics, character collision
│       ├── player.js        # Player entity, movement, health, armor, carjacking
│       ├── camera.js        # 3D chase camera, orbit camera, screenshake, view matrices
│       ├── render.js        # WebGL 3D renderer: daylight shaders, sky dome, buildings, vehicles
│       ├── traffic.js       # AI traffic manager, parked cars, lane driving, vehicle damage
│       ├── pedestrians.js   # AI pedestrians, fleeing behaviors, cash pickup drops
│       ├── police.js        # 0-5 star wanted system, pursuit AI, roadblocks, helicopter
│       ├── weapons.js       # Pistol and Rifle ballistics, damage, reload, raycasting
│       ├── hud.js           # 2D canvas HUD overlay, health/armor bars, stars, speedometer
│       ├── minimap.js       # Rotating circular radar minimap with roads, cops, markers
│       ├── audio.js         # WebAudio synthesizer for engine, sirens, guns, radio
│       ├── effects.js       # 3D particle system (smoke, fire, sparks, blood) & screen trauma
│       ├── input.js         # Keyboard, mouse, and Pointer Lock input management
│       ├── menu.js          # Title screen, pause menu, controls guide, victory screen
│       └── save.js          # localStorage game state persistence
├── screenshots/
│   ├── 1-on-foot-downtown.png        # Downtown on-foot exploration, articulated player, towers, pedestrians & HUD
│   ├── 2-car-drive-promenade.png     # Sports car driving along sunset ocean promenade, palm trees & water
│   ├── 3-police-pursuit-stars.png    # 4-star police pursuit flanked between cruisers with flashing lightbars
│   └── 4-mission-dock-showdown.png   # Mission 6 dock showdown with gantry crane & hovering tactical helicopter
├── vendor/
│   └── makefun-game.ts      # make.fun dossier generator (standard library only)
├── main.ts                  # Entry packaging script for make.fun evaluation
├── serve.ts                 # Local development HTTP server
├── shots.json               # Screenshot query configuration
└── README.md                # Project documentation with make.fun badges
```

### Module Responsibilities in `game/src/`:

| File | Primary Job |
|---|---|
| `world.js` | Defines the 5 districts, building coordinates with setbacks and crowns, distant skyline landmarks, road networks, ocean boundaries, port gantry cranes, street furniture, and collision raycasts. |
| `render.js` | Custom WebGL 3D rendering pipeline with late-afternoon warm sunlight, sky gradient dome with sun disc and glare, distance fog, building meshes, vehicles, characters, helicopter, gantry cranes, street furniture, and particles. |
| `physics.js` | Vehicle handling (throttle, drift, braking, collisions), tire smoke emission, and player foot movement physics. |
| `player.js` | Protagonist state (health, armor, cash, weapon arsenal, car entry/exit, death/respawn). |
| `camera.js` | Elevated third-person camera with mouse-look yaw/pitch, building collision avoidance clamp, vehicle chase smoothing, and screen shake. |
| `weapons.js` | Pistol and assault rifle ballistics, reload cycles, ammo counters, and raycast hit detection. |
| `traffic.js` | Autonomous road traffic AI, curbside parked vehicles, vehicle collision, and theft mechanics. |
| `pedestrians.js` | Civilian pedestrian behavior, wandering, fleeing danger, and dropped cash pickups. |
| `police.js` | Vela Bay Metro wanted levels (0–5 stars), pursuit cruisers, foot officers, roadblocks, and searchlight helicopter. |
| `missions.js` | 6 complete narrative missions with objectives, dialogue, enemy spawns, timers, and boss encounters. |
| `hud.js` | 2D HUD overlay drawing cash, health/armor gauges, wanted stars, speedometer, dialogue subtitles, screen vignette, and sunlit bloom. |
| `minimap.js` | Rotating circular radar minimap displaying streets, ocean and harbour water, player arrow, mission markers, and police blips. |
| `audio.js` | Procedural WebAudio sound generator for engine pitch, sirens, gunfire, crashes, and synthwave radio. |
| `effects.js` | Particle manager (burnout smoke, heat haze/dust, sparks, blood, explosions) and screen trauma effects. |
| `input.js` | Event listeners for keyboard, mouse look, and Pointer Lock API. |
| `menu.js` | Title start screen, tactical pause map of Vela Bay with district borders, control legend, and story victory screen. |
| `save.js` | localStorage manager for saving and loading player career data. |
| `main.js` | Main entry point orchestrating game loop, updates, rendering, and deterministic query hooks. |

---

## 4. Testing & Verification

1. **Headless Chrome Execution**: Verified that `game/index.html` loads offline without network requests, errors, or missing dependencies.
2. **CDP End-to-End Test**: Used Chrome DevTools Protocol to verify:
   - Player movement on foot
   - Entering and exiting vehicles
   - Crime trigger and wanted level escalation
   - Mission progression and objective completion
   - Saving and restoring state from `localStorage`
3. **Screenshot Generation**: Rendered 4 real 1280x720 in-engine screenshots under 256 KiB each, demonstrating foot exploration, car driving, police pursuit, and mission combat.
4. **Dossier Compliance**: Verified `MAKEFUN_OUTPUT_DIR=out node main.ts` builds `dossier.json` with 100% of game source files and 4 valid screenshots, passing all gate checks.
