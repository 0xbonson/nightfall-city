# Nightfall City: Vela Bay — Game Engine Architecture & Build Plan

**Nightfall City: Vela Bay** is an open-world 3D crime action game built for the make.fun bounty challenge (`gta6-01`). The game runs offline in desktop browsers as pure vanilla ES modules with zero third-party dependencies, libraries, or build bundlers.

---

## 1. Setting & World Geometry: Vela Bay

The game world spans a rich coordinate area (-280m to +280m in X and Z) featuring 4 distinct districts, an elevated skyway, and an ocean coastline:

1. **Downtown Financial District** (North-East: `X: 20 to 240`, `Z: -240 to -20`):
   - Soaring modern skyscrapers reaching up to 120m with reflective glass window bands, champagne bronze towers, concrete corporate plazas, and illuminated rooftop crowns.
2. **Old Town Historic Quarter** (North-West: `X: -240 to -20`, `Z: -240 to -20`):
   - Dense Mediterranean quarter with terracotta roofs, sandstone ochre facades, narrow streets, storefront awnings, and pedestrian courtyards.
3. **Meridian Cargo Docks** (South-East: `X: 20 to 240`, `Z: 20 to 240`):
   - Heavy industrial waterfront shipping terminal with cargo warehouses, high-chroma shipping container stacks, open harbor basin, moored cargo ships, and a massive 36m gantry crane.
4. **Ocean Promenade & Marina** (South-West: `X: -240 to -20`, `Z: 20 to 240`):
   - Miami-style Art Deco pastel resorts, tiered cantilevered balconies, sunlit cedar boardwalk along the coast, tropical palm tree boulevards, and marina boat slips with moored luxury yachts.
5. **Elevated Skyway & Central Park**:
   - Multi-lane elevated concrete expressway along `X = 45` spanning over cross-streets with support pillars and approach ramps; central green park with manicured lawns and fountains.
6. **Road Network & Intersections**:
   - Arterial North-South avenues (`X = -105, -55, 0, 45, 115, 185`) and East-West cross streets (`Z = -180, -115, -50, 20, 85, 150, 215`) with warm sunlit asphalt, glowing amber centerlines, white lane markings, and zebra crosswalks.

---

## 2. Core Systems Architecture

### 2.1 Character Traversal & Physics (`player.js`, `math.js`)
- Protagonist **Rhea "Rook" Solano** rendered with articulated 3D limbs, leather jacket, work boots, and equipped firearms.
- Traversal states: walk, sprint (`Shift`), jump, strafe, reverse, and car enter/exit (`F`).
- Sliding cylinder-box collision resolution against static world colliders.
- Step cadence synchronization with procedural footstep audio.

### 2.2 Vehicle Physics & Arcade Drift Dynamics (`vehicles.js`)
- 6 vehicle types: *Veloce GT* (sports coupe), *Torque 440* (muscle car), *Metro Cruiser* (police interceptor), *Executive* (luxury sedan), *Cabrio* (city taxi), and *Titan Box* (delivery truck).
- Physical simulation including engine RPM torque curves, gear ratios, front-wheel steering angles, body pitch on acceleration/braking, and body roll during cornering.
- Arcade handbrake drift mechanics (`Space`): rear slip friction drop, counter-steering slides, and burnout screech audio.
- Autonomous civilian traffic AI: pathfinding through intersection nodes, lane discipline, and vehicle avoidance braking.

### 2.3 Pedestrian Population & Reactions (`pedestrians.js`)
- Procedural civilian population with distinct skin tones, shirts, and trousers.
- Natural wandering between sidewalk waypoints.
- Dynamic panic AI: civilians scatter, yell, and sprint away from speeding cars, hit-and-run incidents, and weapon fire.
- Defeated pedestrians drop glowing green cash bundles ($20–$100).

### 2.4 Police Pursuit & 5-Star Wanted System (`police.js`)
- Heat meter scaling from 0 to 5 stars based on infraction severity:
  - **1 Star**: Local patrol officers investigate.
  - **2 Stars**: Police interceptors initiate code-3 pursuit with sirens and flashing lightbars.
  - **3 Stars**: Coordinated cruiser pursuit with aggressive pit maneuvers and roadblock barricades.
  - **4 Stars**: Police tactical helicopter deployed with rotating rotors and downward searchlight beam.
  - **5 Stars**: Full citywide tactical lockdown with relentless cruiser waves and airborne suppression.
- Evasion mechanics: breaking line of sight initiates heat cooldown with flashing stars; hiding for 20 seconds clears the record.

### 2.5 Combat & Ballistics (`combat.js`)
- Real-time third-person weapon combat with mouse aiming and Pointer Lock.
- Weapon roster: Pistol, SMG, Shotgun, and Carbine Rifle with dedicated specs, recoil spread, and reload cycles (`R`).
- High-visibility golden glowing tracer rounds.
- Hostile Syndicate enforcer squads with tactical search-and-destroy combat AI.
- Expanding fireball explosions with radius damage and dynamic light flashes.

### 2.6 Syndicate Campaign & Side Activities (`missions.js`)
- Connected 8-mission narrative storyline tracking Rook's campaign against the Vela Bay Syndicate:
  1. *The Marina Drop*: Retrieve encrypted flash drive from Marina pier and deliver to safehouse.
  2. *Repo on Vane Turf*: Steal back stolen sports car from Old Town compound.
  3. *Market Shakedown*: Protect local shopkeepers by eliminating Syndicate extortionists.
  4. *Vela Bay Grand Prix*: 8-checkpoint street race across ocean boulevard and highway.
  5. *Munitions Depot Raid*: Infiltrate fortified dockside weapons depot and seize carbines.
  6. *Pier 7 Ambush*: Ambush corrupt Captain Reynolds and eliminate Syndicate lieutenants.
  7. *Skyway Interception*: Intercept armoured bullion convoy on the elevated skyway.
  8. *Take Down the Syndicate*: Final showdown at Meridian Docks and high-speed escape.
- Taxi Driver side jobs: press `K` to pick up fares and navigate passengers across districts.
- 3D rotating golden octahedron diamond mission beacon marking current target.

### 2.7 Visuals & WebGL Rendering Pipeline (`renderer.js`, `config.js`)
- Custom hand-written WebGL pipeline without external engines.
- Golden-hour sunset lighting: warm direct sun with wrap-around diffuse and sky hemisphere ambient.
- Sunlit road sheen: specular highlight on asphalt roadbeds and vehicle paintwork.
- Atmospheric sky dome: 3-stop vertical color gradient (cobalt zenith, periwinkle mid, golden peach horizon) with solar corona and sun disc.
- Facade illumination: storefront neon displays at street level and office window grids on skyscrapers.
- Dynamic emergency lightbars casting red and blue strobes on surrounding geometry.
- Distance depth fog blending geometry softly into the golden twilight horizon.

### 2.8 Tactical HUD & Circular Radar Minimap (`hud.js`, `minimap.js`)
- 2D Canvas HUD overlay drawing health/armor gauges, cash balance, wanted stars, ammo counter, speedometer dial, and active mission banner with distance in meters.
- Rotating circular radar minimap drawing ocean coastline, marina docks, arterial roads, district zones, traffic pips, flashing police markers, hostile blips, and golden objective beacon.

### 2.9 Procedural WebAudio Synthesizer (`audio.js`)
- 100% procedural sound synthesis using the Web Audio API (zero audio assets):
  - Sawtooth oscillator engine with RPM-modulated lowpass filtering.
  - Dual-tone frequency-modulated police siren.
  - Bandpass noise tire screech during handbrake slides.
  - Multi-harmonic gunshot transients, explosion rumbles, car horns, and footsteps.
  - Retro synthwave bassline accompaniment.

### 2.10 Persistence & Menus (`save.js`, `menus.js`, `input.js`)
- Automatic career progression persistence in `localStorage` (mission index, cash, health, armor, wanted stars).
- In-game pause menu with interactive options: Resume, Controls Guide, Syndicate Mission Log, Audio Synth Toggle, and Campaign Restart.

---

## 3. Module Map (`game/src/`)

```
game/
├── index.html            # Main HTML container, styling, canvas layering, shot query bypass
└── src/
    ├── config.js         # World dimensions, districts, lighting params, vehicle specs, 8-mission specs, shot presets
    ├── math.js           # Vector3, Matrix4, quaternion, easing, and spatial utilities
    ├── input.js          # Keyboard, mouse, pointer lock, and action input bindings
    ├── audio.js          # Procedural WebAudio sound generator (engine, sirens, guns, drift, synthwave)
    ├── save.js           # LocalStorage state serialization and loading
    ├── camera.js         # Third-person follow camera, high-speed chase zoom, screen shake, slow-mo dilation
    ├── world.js          # Procedural city generation: 4 districts, roads, skyway, docks, crane, marina, props
    ├── renderer.js       # WebGL 3D rendering engine, shaders, sunset atmosphere, asphalt sheen, dynamic lights
    ├── vehicles.js       # 6 vehicle models, driving physics, drift mechanics, traffic AI, body roll/pitch
    ├── pedestrians.js    # Pedestrian models, wandering AI, panic fleeing, dropped cash pickups
    ├── player.js         # Rook character model, articulated limbs, movement, carjacking, health/armor
    ├── police.js         # 0-5 star wanted system, pursuit cruisers, tactical helicopter with spotlight
    ├── combat.js         # Ballistics, golden glowing tracers, enemy syndicate AI, explosions
    ├── missions.js       # 8-mission story campaign, taxi side jobs, 3D rotating diamond beacon
    ├── hud.js            # Health/armor bars, cash readout, wanted stars, speedometer, objective banner
    ├── minimap.js        # Circular GPS radar with ocean water, roads, traffic, police sirens, mission blip
    ├── menus.js          # Pause menu, controls guide, campaign mission log, victory screen
    └── main.js           # Game coordinator, main loop, system updates, shot preset choreography
```

---

## 4. Verification & Packaging

1. **Static Validation**: Node static server (`serve.ts`) delivers `game/index.html` with zero console errors.
2. **Deterministic Screenshots**: Headless Chrome executes `?shot=1..4` to capture real 1280x720 in-engine gameplay frames.
3. **Packaging**: `main.ts` executes `buildDossier` from `vendor/makefun-game.ts`, copying `game/` and `screenshots/` into the release package and compiling canonical `dossier.json`.
