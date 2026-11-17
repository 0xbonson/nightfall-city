# nightfall-city

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Nightfall City is an original, 3D open-world crime action game set in the sun-soaked coastal metropolis of **Vela Bay**. Play as **Rhea "Rook" Solano**, a courier-turned-wheelman caught between the ruling **Port Meridian** crime family, the ruthless **Vane Street Syndicate**, and the relentless **Vela Bay Metro Police Department**.

Explore four expansive, handcrafted districts: the soaring glass skyscrapers of **Downtown Vela**, the cobblestone alleys and terracotta roofs of **Old Market Quarter**, the gritty cranes and container yards of **Meridian Shipping Docks**, and the palm-lined turquoise beachfront of **Ocean Promenade**.

## Features & Game Systems

- **True 3D Engine & Sun-Soaked Atmosphere**: Custom-built pure WebGL 3D renderer written in vanilla JavaScript without external libraries, frameworks, or build steps. Features real-time warm directional late-afternoon sunlight (`[1.0, 0.93, 0.80]`), blue-sky hemisphere ambient fill, atmospheric sky gradient from pale hot horizon into deep blue zenith, brilliant sun disc with soft glare corona, horizon distance fog, warm grey asphalt, specular ocean water highlights with coastal shoreline surf, character and vehicle ground shadows, heat haze, and cinematic screen vignette with golden bloom.
- **Rich Architectural Silhouettes & Street Furniture**: Varied building silhouettes by district: Downtown tall towers with setbacks, window mullions, and crowns; Financial Quarter wide slabs; Old Town low narrow blocks with awnings; and Harbour/Marina warehouses with towering gantry cranes. Streets are populated with kerbs, road wear patches, lamp posts, working traffic light cycles, benches, bins, planters with foliage, bus shelters with waiting passengers, bollards, newspaper stands, phone kiosks, fire escapes, rooftop water tanks, palm trees along the promenade, curbside parked cars, drain and manhole covers, and district-branded hoardings.
- **Arcade Driving & Dynamic Physics**: Steal parked or moving vehicles (`F` key) across 6 vehicle classes (sports car, sedan, muscle car, police cruiser, transit bus, delivery truck, and taxi). Realistic vehicle physics with cornering body roll, braking dive and acceleration squat pitch, progressive lateral drift grip, tire smoke particles, and engine noise that dynamically changes pitch with vehicle speed.
- **Articulated Character & Cinematic Camera**: On-foot player model with articulated swinging limbs, torso lean, headwear, and weapon aiming. Third-person cinematic chase camera with speed-dependent pull-back, corner banking roll, dynamic FOV expansion, and collision raycasting against building architecture.
- **Living City Ecosystem**: Autonomous AI traffic that obeys traffic light cycles, navigates road lanes, yields at intersections, and honks at obstacles. Active pedestrians stroll sidewalks in small groups, wait at bus shelters, obey pedestrian signals, react to gunfire, flee speeding vehicles, and drop cash upon being eliminated. Flocks of sea birds circle over the harbour and marina.
- **5-Star Escalating Wanted System**: Commit crimes (carjacking, hit-and-run, gunshots, assaulting officers) to raise your heat from 1 to 5 stars. The Vela Bay Metro deploys foot patrol officers, high-speed interceptor cruisers, road barricades with spike strips at 3+ stars, and tactical police helicopters equipped with searchlights and sniper fire at 4+ stars. Evade line-of-sight to cool heat, or ditch stolen vehicles in alleyways to double evasion speed.
- **6-Part Narrative Campaign**: Full storyline with mission markers, live dialogue, timed deliveries, shootouts, and boss encounters:
  1. *The Marina Drop* (Courier Run) — Collect an encrypted datapad from Marina Pier and speed through downtown traffic to Matteo's penthouse before time expires.
  2. *Repo on Vane Turf* (Grand Theft) — Infiltrate the Syndicate's Old Town stronghold, eliminate guarding thugs, and deliver the custom Nero GT to the Docks Chop Shop.
  3. *Market Muscle* (Protection Shootout) — Defend Old Market merchants by taking down 5 Vane Syndicate enforcers, then shake the arriving Metro 2-star heat.
  4. *Vela Bay Sprint* (Street Race) — High-speed 8-checkpoint race through the urban core and coastal expressway under 110 seconds.
  5. *Armory Infiltration* (Depot Heist) — Breach the heavily guarded syndicate military depot, eliminate garrison defenders, blow the vault, and escape a 3-star police dragnet.
  6. *Nightfall at the Docks* (Final Showdown) — Assault Shipping Pier 7, eliminate Boss Hector Vane and corrupt Police Captain Reynolds, destroy armored convoys, and escape on the getaway speedboat.
- **Combat & Arsenal**: Equip the high-precision *Viper .45 Pistol* and the fully-automatic *Vane Carbine Assault Rifle*. Features third-person mouse aim (with Pointer Lock), dynamic bullet spread, recoil, realistic reload cycles, and hostile retaliation from armed syndicate enforcers and police.
- **Full HUD, Rotating Minimap & Tactical Pause Map**: Circular radar with compass ring displaying roads, ocean shoreline, player orientation arrow, mission waypoints, police blips (flashing red/blue during pursuit), traffic vehicles, and enemy targets. Screen HUD tracks health, armor, cash balance, active weapon, ammo, and dynamic vehicle speedometer. Pause screen features a full tactical city map of Vela Bay with district borders, roads, player location, and active objective markers.
- **100% Synthesized WebAudio**: Procedurally synthesized sound effects and generative 80s synthwave music radio stations (*Vela Wave 80.4* and *Nightfall Beats*) built entirely on the WebAudio API without external audio files.
- **Persistence**: Complete career save and load system using `localStorage`, supporting instant resume and autosave across missions.

## Controls

| Action | Control |
|---|---|
| **Move / Drive** | `W`, `A`, `S`, `D` / Arrow Keys |
| **Sprint** | `Shift` (on foot) |
| **Handbrake / Drift** | `Space` (in vehicle) |
| **Jack Car / Exit** | `F` or `E` |
| **Aim & Look** | Mouse Movement (Pointer Lock enabled) |
| **Fire Weapon** | Left Mouse Click |
| **Reload Weapon** | `R` |
| **Cycle Weapon** | `1`, `2`, `Q`, or Mouse Wheel |
| **Change Radio Station** | `R` (in vehicle) |
| **Pause / Menu** | `Esc` or `P` |

## Run it

```sh
node serve.ts
```

Open `http://localhost:8080` in any modern desktop browser (Chrome, Edge, Safari, Firefox). No internet connection or build tools required.

---

<sub>Entered on [make.fun](https://make.fun/?ref=kewdhhyh&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build so everyone can play.</sub>
