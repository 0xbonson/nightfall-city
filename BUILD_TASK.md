# Nightfall City: Vela Bay — Game Engine Architecture & Build Plan

**Nightfall City: Vela Bay** is an original open-world 3D WebGL crime action game engineered for the make.fun bounty challenge (`gta6-01`). The game runs offline in modern desktop browsers as pure vanilla ES modules with zero third-party dependencies, external asset downloads, or build bundlers.

---

## 1. Setting & World Geometry: Vela Bay

The game world spans an expansive coordinate area (-280m to +280m in X and Z) featuring 6 named districts, an elevated skyway, a harbor suspension bridge, distant mountain foothills, and Mediterranean oceanfront:

1. **Downtown Vela** (North-East: `X: 20 to 240`, `Z: -240 to -20`):
   - Towering modern skyscrapers reaching up to 120m with reflective champagne bronze and teal window bands, illuminated corporate plazas, rooftop HVAC clutter, water tanks, elevator penthouses, and storefront neon display signs.
2. **Old Market Quarter** (North-West: `X: -240 to -20`, `Z: -240 to -20`):
   - Dense Mediterranean quarter with terracotta roofs, sandstone ochre facades, narrow streets, colorful fabric awnings, slender Italian cypress trees, and pedestrian courtyards.
3. **Meridian Cargo Docks** (South-East: `X: 20 to 240`, `Z: 20 to 240`):
   - Heavy industrial waterfront terminal with cargo warehouses, high-chroma shipping container stacks, open harbor basin, moored cargo ships, a massive 36m gantry crane, and contraband heist loot crates at Pier 7.
4. **Ocean Promenade & Marina San Vento** (South-West: `X: -240 to -20`, `Z: 20 to 240`):
   - Art Deco pastel resorts, cantilevered balconies, sunlit cedar boardwalk along the coast, swaying palm tree boulevards, and marina boat slips with moored luxury yachts.
5. **Skyway Boulevard & Central Grand Plaza**:
   - Multi-lane elevated concrete expressway along `X = 45` spanning over cross-streets with support pillars and approach ramps; central green park with manicured lawns and fountains.
6. **Harbor Suspension Bridge & Monte Sereno Foothills**:
   - Majestic steel suspension bridge with twin suspension towers and tension cable rigging crossing the bay; distant Mediterranean rolling mountain ridges ringing the city horizon.
7. **Safehouse Garage** (`X = 95`, `Z = -85`):
   - Custom 3D architectural garage bay with illuminated neon signage, roll-up shutter frame, industrial hydraulic vehicle lift, mechanics' tool chests, and workbenches. Players can pull vehicles inside to stash cars, repair vehicle damage, restock body armor, and immediately clear police pursuit heat.

---

## 2. Core Systems Architecture

### 2.1 Character Traversal & Physics (`player.js`, `math.js`)
- Protagonist **Rhea "Rook" Solano** rendered with articulated 3D limbs, charcoal leather jacket, aviator sunglasses, work boots, and equipped firearms.
- Traversal states: walk, sprint (`Shift`), jump, strafe, reverse, weapon aim, and car enter/exit (`F`/`E`).
- Sliding cylinder-box collision resolution against static world architecture.
- Step cadence synchronization with procedural footstep audio.

### 2.2 Vehicle Physics & Arcade Drift Dynamics (`vehicles.js`)
- 6 vehicle classes: *Veloce GT* (sports coupe), *Torque 440* (muscle car), *Metro Cruiser* (police interceptor with push-bar), *Executive* (luxury sedan), *Cabrio* (city taxi with roof sign), and *Titan Box* (delivery truck & contraband van).
- Physical simulation including engine RPM torque curves, 4-gear automated transmission, front-wheel Ackermann steering, body pitch on acceleration/braking, and body roll during cornering.
- Arcade handbrake drift mechanics (`Space`): rear slip friction drop, counter-steering slides, and burnout screech audio.
- Autonomous civilian traffic AI: pathfinding through intersection nodes, lane discipline, and vehicle avoidance braking.
- Horn mechanism (`H`/`E`) that alerts surrounding traffic and causes pedestrians to scatter.

### 2.3 Pedestrian Population & Reactive Citizen AI (`pedestrians.js`)
- Procedural civilian population with Mediterranean skin tones, linen shirts, trousers, sunglasses, and shopping bags.
- Natural wandering between sidewalk waypoints.
- Dynamic panic AI: civilians scatter, yell, and sprint away from speeding cars, hit-and-run incidents, horn honks, and weapon fire.
- Defeated pedestrians drop glowing green cash bundles ($20–$100).

### 2.4 Police Pursuit & 5-Star Wanted System (`police.js`)
- Escalating heat meter scaling from 0 to 5 stars:
  - **1 Star**: Local patrol cruisers investigate.
  - **2 Stars**: Police interceptors initiate code-3 pursuit with sirens and flashing lightbars.
  - **3 Stars**: Coordinated cruiser pursuit with aggressive pit maneuvers and roadblock barricades.
  - **4 Stars**: Police tactical helicopter deployed with rotating rotors and downward searchlight beam.
  - **5 Stars**: Full citywide tactical lockdown with relentless cruiser waves and airborne suppression.
- Evasion mechanics: breaking line of sight initiates heat cooldown with flashing stars; losing the police awards cash escape bonuses. Pulling into the Safehouse Garage immediately purges police heat.

### 2.5 Combat & Ballistics (`combat.js`)
- Real-time third-person weapon combat with mouse aiming and Pointer Lock.
- Weapon roster: Pistol, SMG, Shotgun (multi-pellet fan spread), and Tactical Carbine Rifle with dedicated specs, recoil spread, and reload cycles (`R`).
- High-visibility golden glowing tracer rounds.
- Hostile Syndicate enforcer squads with tactical search-and-destroy combat AI and return fire.
- Expanding fireball explosions with radius damage and dynamic light flashes.
- Collectible contraband cash drops.

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
- Taxi Driver side jobs: press `K` while driving a taxi to pick up fares and navigate passengers across districts.
- 3D rotating golden octahedron diamond mission beacon marking current target.

### 2.7 Multi-Station Procedural Radio System (`radio.js`, `audio.js`)
- Generative multi-station in-vehicle radio:
  - **Vela Wave 98.7**: Upbeat synthwave basslines with nostalgic coastal leads.
  - **Sol Coastal FM**: Warm Mediterranean chillout grooves.
  - **Metro Police Dispatch**: Low-frequency emergency chatter simulation.
  - **Radio OFF**: Clean engine acoustics.
- In-vehicle cycling with `R` key, accompanied by HUD radio notification toast.

### 2.8 District Navigation & Boundaries (`districts.js`)
- Tracks 6 distinct city districts and presents animated cyan HUD banner toasts upon entering new municipal boundaries.

### 2.9 Safehouse Garage & Progression (`garage.js`)
- Dedicated safehouse facility in Downtown Vela (`X = 95, Z = -85`).
- Enables vehicle stashing (up to 4 player-owned vehicles), free body armor restock, instant vehicle repair, and heat clearance.

### 2.10 Visuals & WebGL Rendering Pipeline (`renderer.js`, `config.js`)
- Custom hand-written WebGL pipeline without external engines.
- Golden-hour sunset lighting: warm direct sun with wrap-around diffuse and sky hemisphere ambient.
- Sunlit road sheen: specular highlight on asphalt roadbeds and vehicle metallic paintwork.
- Atmospheric sky dome: 3-stop vertical color gradient (cobalt zenith, periwinkle mid, golden peach horizon) with solar corona and sun disc.
- Facade illumination: storefront neon displays at street level and office window grids on skyscrapers.
- Dynamic emergency lightbars casting red and blue strobes on surrounding geometry.
- Distance depth fog blending geometry softly into the golden twilight horizon.

### 2.11 Tactical HUD & Circular Radar Minimap (`hud.js`, `minimap.js`)
- 2D Canvas HUD overlay drawing health/armor gauges, cash balance, wanted stars, ammo counter, speedometer dial, active mission banner with distance in meters, radio toast, and district toasts.
- Rotating circular radar minimap drawing ocean coastline, marina docks, suspension bridge, safehouse icon, arterial roads, district zones, traffic pips, flashing police markers, hostile blips, and golden objective beacon.

### 2.12 Procedural WebAudio Synthesizer (`audio.js`)
- 100% procedural sound synthesis using the Web Audio API (zero audio assets):
  - Sawtooth oscillator engine with RPM-modulated lowpass filtering.
  - Dual-tone frequency-modulated police siren.
  - Bandpass noise tire screech during handbrake slides.
  - Multi-harmonic gunshot transients, explosion rumbles, car horns, cash chimes, and footsteps.
  - Multi-station radio synth generator.

### 2.13 Persistence & Menus (`save.js`, `menus.js`, `input.js`)
- Automatic career progression persistence in `localStorage` (mission index, cash, health, armor, wanted stars, stashed garage vehicles, radio station).
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
    ├── audio.js          # Procedural WebAudio sound generator (engine, sirens, guns, drift, radio, horn)
    ├── save.js           # LocalStorage state serialization and loading
    ├── camera.js         # Third-person follow camera, high-speed chase zoom, screen shake, slow-mo dilation
    ├── world.js          # Procedural city generation: 6 districts, roads, skyway, bridge, docks, crane, marina, hills, props
    ├── renderer.js       # WebGL 3D rendering engine, shaders, sunset atmosphere, asphalt sheen, dynamic lights
    ├── vehicles.js       # 6 vehicle models, driving physics, drift mechanics, traffic AI, body roll/pitch
    ├── pedestrians.js    # Pedestrian models, wandering AI, panic fleeing, dropped cash pickups
    ├── player.js         # Rook character model, articulated limbs, movement, carjacking, health/armor, multi-weapon arsenal
    ├── police.js         # 0-5 star wanted system, pursuit cruisers, tactical helicopter with spotlight
    ├── combat.js         # Ballistics, golden glowing tracers, enemy syndicate AI, explosions, cash drops
    ├── missions.js       # 8-mission story campaign, taxi side jobs, 3D rotating diamond beacon
    ├── hud.js            # Health/armor bars, cash readout, wanted stars, speedometer, objective banner, radio toast, district toast
    ├── minimap.js        # Circular GPS radar with ocean water, roads, safehouse icon, traffic, police sirens, mission blip
    ├── menus.js          # Pause menu, controls guide, campaign mission log, victory screen
    ├── districts.js      # District boundary detection and animated transition toasts
    ├── garage.js         # Safehouse garage facility: 3D bay mesh, vehicle stash, repairs, armor restock, heat clearing
    ├── radio.js          # Multi-station generative radio engine with in-vehicle cycling
    └── main.js           # Game coordinator, main loop, system updates, shot preset choreography
```

---

## 4. Verification & Packaging

1. **Static Validation**: Node static server (`serve.ts`) delivers `game/index.html` with zero console errors.
2. **Deterministic Screenshots**: Headless Chrome executes `?shot=1..4` to capture real 1280x720 in-engine gameplay frames.
3. **Packaging**: `main.ts` executes `buildDossier` from `vendor/makefun-game.ts`, copying `game/` and `screenshots/` into the release package and compiling canonical `dossier.json`.
