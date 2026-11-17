# nightfall-city

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xbonson/nightfall-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Nightfall City is an original, 3D open-world crime action game set in the sun-soaked coastal metropolis of **Vela Bay**. Play as **Rhea "Rook" Solano**, a courier-turned-wheelman caught between the ruling **Port Meridian** crime family, the ruthless **Vane Street Syndicate**, and the relentless **Vela Bay Metro Police Department**.

Explore four expansive, handcrafted districts: the soaring glass skyscrapers of **Downtown Vela**, the cobblestone alleys and terracotta roofs of **Old Market Quarter**, the gritty cranes and container yards of **Meridian Shipping Docks**, and the palm-lined turquoise beachfront of **Ocean Promenade**.

## Features & Game Systems

- **True 3D Engine & Offline Architecture**: Custom-built pure WebGL 3D renderer written in vanilla JavaScript without any external libraries, frameworks, or build steps. Features real-time Gouraud/Phong directional sunlight, ambient sky bounce, distance horizon fog, dynamic specular reflections, and animated coastal ocean waves.
- **Arcade Driving & Car Jacking**: Steal parked or moving vehicles (`F` key) across 6 vehicle classes (Veloce GT sports car, Meridian Cruiser sedan, Vane Muscle car, Metro Patrol cruiser, Titan delivery van, and Cobra Cab). Realistic arcade driving model with throttle response, reverse, steering rate, handbrake drift sliding, tire smoke particles, and engine noise that dynamically changes pitch with vehicle speed.
- **Living City Ecosystem**: Autonomous AI traffic that navigates road lanes, yields at intersections, and honks at obstacles. Active pedestrians stroll sidewalks and crosswalks, react to gunfire, flee speeding vehicles, and drop cash upon being eliminated.
- **5-Star Escalating Wanted System**: Commit crimes (carjacking, hit-and-run, gunshots, assaulting officers) to raise your heat from 1 to 5 stars. The Vela Bay Metro deploys foot patrol officers, high-speed interceptor cruisers, road barricades with spike strips at 3+ stars, and tactical police helicopters equipped with searchlights and sniper fire at 4+ stars. Evade line-of-sight to cool heat, or ditch stolen vehicles in alleyways to double evasion speed.
- **6-Part Narrative Campaign**: Full storyline with mission markers, live dialogue, timed deliveries, shootouts, and boss encounters:
  1. *The Marina Drop* (Courier Run) — Collect an encrypted datapad from Marina Pier and speed through downtown traffic to Matteo's penthouse before time expires.
  2. *Repo on Vane Turf* (Grand Theft) — Infiltrate the Syndicate's Old Town stronghold, eliminate guarding thugs, and deliver the custom Nero GT to the Docks Chop Shop.
  3. *Market Muscle* (Protection Shootout) — Defend Old Market merchants by taking down 5 Vane Syndicate enforcers, then shake the arriving Metro 2-star heat.
  4. *Vela Bay Sprint* (Street Race) — High-speed 8-checkpoint race through the neon urban core and coastal expressway under 110 seconds.
  5. *Armory Infiltration* (Depot Heist) — Breach the heavily guarded syndicate military depot, eliminate garrison defenders, blow the vault, and escape a 3-star police dragnet.
  6. *Nightfall at the Docks* (Final Showdown) — Assault Shipping Pier 7, eliminate Boss Hector Vane and corrupt Police Captain Reynolds, destroy armored convoys, and escape on the getaway speedboat.
- **Combat & Arsenal**: Equip the high-precision *Viper .45 Pistol* and the fully-automatic *Vane Carbine Assault Rifle*. Features third-person mouse aim (with Pointer Lock), dynamic bullet spread, recoil, realistic reload cycles, and hostile retaliation from armed syndicate enforcers and police.
- **Full HUD & Rotating Minimap**: Circular radar with compass ring displaying roads, ocean shoreline, player orientation arrow, mission waypoints, police blips (flashing red/blue during pursuit), traffic vehicles, and enemy targets. Screen HUD tracks health, armor, cash balance, active weapon, ammo, and dynamic vehicle speedometer.
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
