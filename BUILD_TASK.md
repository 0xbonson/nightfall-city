# Nightfall City: Vela Bay — Game Engine Architecture & Build Plan

**Nightfall City: Vela Bay** is an original open-world 3D WebGL crime action game engineered for the make.fun bounty challenge (`gta6-01`). The game runs offline in modern desktop browsers as pure vanilla ES modules with zero third-party dependencies, external asset downloads, or build bundlers.

---

## 1. Setting & Art Direction: Vela Bay

The game world spans an expansive coordinate area (-280m to +280m in X and Z) featuring 6 named districts, an elevated skyway, a harbor suspension bridge, distant mountain foothills, and Mediterranean oceanfront bathed in warm late-afternoon sunlight:

- **Warm Sun Low in the Sky**: Direct sun positioned low to the northwest (`[-0.65, 0.45, -0.62]`), projecting long directional shadows across streets, sidewalks, building blocks, and props.
- **Per-Face Façade Lighting**: Strong color contrast between sunward building facets (warm golden sand and peach ochre) and shadow facets (cool atmospheric blue-teal shade), making blocks immediately read as three-dimensional solids with defined architectural corners.
- **Lived-In Façades & Rooftops**: Multi-level balconies with wrought-iron railings and flowering planter boxes, colorful fabric shopfront awnings, painted street signage, rooftop clutter (water tanks on wood/steel stilts, communications aerials, satellite dishes, air-conditioning condenser units, fire escapes), and varied illuminated multi-pane windows.
- **Street-Level Urban Detail**: Raised granite kerbs, pedestrian crossings with tactile yellow paving pads, kerbside parked civilian cars, Mediterranean date palms and Italian pencil cypresses, ornate lamp posts, wooden benches, green litter bins, glass-backed bus shelters, traffic light gantries, cast-iron manhole covers, and procedural rain puddles reflecting the sky.
- **Atmospheric Sky & Water**: Multi-stop atmospheric sky dome with solar corona, dusk depth fog, and shimmering ocean water with dynamic wave displacement and golden sun trail specular glints.
- **Distinct Districts**:
  1. **Downtown Vela**: High-rise glass skyscrapers, corporate plazas, rooftop HVAC clutter, and safehouse garage.
  2. **Old Market Quarter**: Mediterranean terracotta roofs, sandstone ochre townhouses, arched alleys, and market stalls.
  3. **Meridian Cargo Docks**: Heavy industrial quays, warm sunlit concrete apron, multi-tier container stacks, breakwater quays, contraband crates, target heist van, and a 36m yellow container gantry crane.
  4. **Ocean Promenade & Marina San Vento**: Art Deco pastel resorts, beachfront boardwalk, palm avenues, and marina boat slips.
  5. **Skyway Boulevard Expressway**: Multi-lane elevated concrete expressway spanning over the metropolis.
  6. **Harbor Suspension Bridge & Monte Sereno Foothills**: Twin-tower suspension bridge spanning the bay, framed by rolling northern mountain ridges.

---

## 2. Core Systems Architecture

### 2.1 Character Traversal & Physics (`player.js`, `math.js`)
- Protagonist **Rhea "Rook" Solano** rendered with distinct athletic silhouette: dark leather boots with thick rubber soles, deep indigo denim jeans, brown leather utility belt with steel buckle, rolled-sleeve terracotta jacket over dark crewneck tee, aviator sunglasses, and equipped firearms.
- Directional ground shadow cast along the sun vector under the character's feet.
- Traversal states: walk, sprint (`Shift`), jump, strafe, reverse, weapon aim, and car enter/exit (`F`/`E`).
- Sliding collision resolution against static city architecture.
- Synchronized step cadence triggering procedural footstep audio.

### 2.2 Vehicle Physics & Arcade Drift Dynamics (`vehicles.js`)
- 7 vehicle chassis classes:
  1. *Veloce GT*: Aerodynamic sports coupe with low roofline, side intake vents, and rear wing spoiler.
  2. *Stallion 428*: Aggressive classic muscle car with raised hood induction scoop and wide rear haunches.
  3. *Metro Interceptor*: High-contrast black-and-white police cruiser with steel bullbar push-bumper and dual-tone flashing lightbar.
  4. *Meridian Executive*: Premium luxury 4-door executive sedan with chrome grille and tinted privacy glass.
  5. *Cobra City Cab*: Vibrant sunshine yellow taxi with checkerboard side rub-strip and illuminated rooftop sign box.
  6. *Piccolo Sport*: Agile European 3-door hot hatchback with steep hatch and sporty stance.
  7. *Meridian Hauler*: Heavy industrial box cargo truck with corrugated cargo bay.
- Directional ground shadow cast under each vehicle along the sun vector.
- True vehicle anatomy: bonnet, cabin, roof, boot, dark glass with pillar frames, headlights, ruby taillights, side mirrors, wheels with rubber tires and alloy rims.
- Arcade handbrake drift mechanics (`Space`): rear slip friction drop, counter-steering slides, and burnout screech audio.
- Autonomous civilian traffic AI: pathfinding through intersection nodes, lane discipline, and vehicle collision avoidance.
- Vehicle horn (`H`/`E`) clearing traffic and scattering pedestrians.

### 2.3 Pedestrian Population & Reactive Citizen AI (`pedestrians.js`)
- Procedural civilian population with Mediterranean skin tones, varied attire (terracotta, coral, washed ochre, seafoam teal, linen cream, navy), hair styles, sunglasses, fedoras, and shopping bags.
- Directional ground shadow cast under each pedestrian along the sun vector.
- Dynamic panic AI: civilians scatter, yell, and sprint away from speeding cars, hit-and-run incidents, horn honks, and weapon fire.
- Defeated pedestrians drop glowing green cash bundles ($25–$100).

### 2.4 Police Pursuit, Chopper Searchlight & 5-Star Wanted System (`police.js`, `renderer.js`)
- Escalating heat meter scaling from 0 to 5 stars:
  - **1 Star**: Local patrol cruisers investigate.
  - **2 Stars**: Police interceptors initiate code-3 pursuit with sirens and flashing lightbars.
  - **3 Stars**: Coordinated cruiser pursuit with aggressive pit maneuvers and roadblock barricades.
  - **4 Stars**: Police tactical helicopter deployed with rotating rotors and atmospheric searchlight beam.
  - **5 Stars**: Full citywide tactical lockdown with relentless cruiser waves and airborne suppression.
- **Volumetric Atmospheric Searchlight Beam**: Rendered with additive alpha blending (`SRC_ALPHA, ONE`), no depth mask writes, and multi-layered translucent amber-white pyramids (`[1.0, 0.90..0.92, 0.70..0.74]`). Opacity falls off towards the ground and sides, leaving street asphalt, cars, and building facades clearly visible behind the beam.
- **Ground Footprint Ellipse**: Feathered concentric amber rings illuminating the pavement beneath the beam.
- Helicopter only appears and beams down when searchlight is actively over player target.
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
- Dedicated additive alpha searchlight pass preserving background visibility.

### 2.11 Tactical HUD & Circular Radar Minimap (`hud.js`, `minimap.js`)
- 2D Canvas HUD overlay drawing health/armor gauges, cash balance, wanted stars, ammo counter, speedometer dial, active mission banner with distance in meters, radio toast, and district toasts.
- Rotating circular radar minimap drawing ocean coastline, marina docks, suspension bridge, safehouse icon, arterial roads, district zones, traffic pips, flashing police markers, hostile blips, and golden objective beacon.

### 2.12 Procedural WebAudio Synthesizer (`audio.js`)
- 100% procedural sound synthesis using the Web Audio API (zero audio assets):
  - Sawtooth oscillator engine with RPM-modulated lowpass filtering.
  - Dual-tone frequency-modulated police siren.
  - Bandpass noise tire screech during handbrake slides.
  - Multi-harmonic gunshot transients, reload latches, explosion rumbles, car horns, cash chimes, and footsteps.
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
    ├── renderer.js       # WebGL 3D rendering engine, shaders, sunset atmosphere, asphalt sheen, dynamic lights, searchlight pass
    ├── vehicles.js       # 7 vehicle models, driving physics, drift mechanics, traffic AI, body roll/pitch
    ├── pedestrians.js    # Pedestrian models, wandering AI, panic fleeing, dropped cash pickups
    ├── player.js         # Rook character model, articulated limbs, movement, carjacking, health/armor, multi-weapon arsenal
    ├── police.js         # 0-5 star wanted system, pursuit cruisers, tactical helicopter with atmospheric searchlight
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
