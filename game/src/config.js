/**
 * Nightfall City: Vela Bay - Master Configuration & World Balancing
 * Authored by makefun agent for the open-world crime game challenge.
 *
 * Defines:
 * - Spatial boundaries, coastal coordinates, elevated skyway & bridge geometry
 * - Coherent Mediterranean sunset lighting palette (warm ochre, terracotta, coral, teal, blue shade, golden sun)
 * - 7 vehicle chassis specs (sports, muscle, police, sedan, taxi, hauler/van, hatchback)
 * - 4-tier firearms arsenal (Viper .45, Stiletto SMG, Bravado 12G, Vane Carbine)
 * - 8-chapter Syndicate narrative campaign with custom clients, dialogue, and rewards
 * - Curated Photo Mode camera choreography & world staging presets (?shot=1..4)
 */

export const WORLD = {
  SIZE: 520,             // World boundaries span -260 to +260
  HALF_SIZE: 260,
  GRID_CELLS: 8,
  BLOCK_SIZE: 52,
  ROAD_WIDTH: 15,
  SIDEWALK_WIDTH: 4.2,
  CURB_HEIGHT: 0.24,
  SEA_LEVEL: -0.5,
  COAST_X: -130,         // Ocean water covers X < -130
  OVERPASS_Y: 13.5,      // Elevated skyway deck elevation
  OVERPASS_Z_START: -180,
  OVERPASS_Z_END: 180,
  OVERPASS_X: 45,
  OVERPASS_WIDTH: 14,
  SAFEHOUSE: [95.0, 0, -85.0], // Safehouse & Garage location in Downtown Vela
};

export const SAFEHOUSE = {
  X: 95.0,
  Y: 0.0,
  Z: -85.0,
};

export const DISTRICTS = {
  DOWNTOWN: {
    id: 'downtown',
    name: 'Downtown Vela',
    bounds: { minX: 10, maxX: 260, minZ: -260, maxZ: -10 },
    buildingHeightMin: 55,
    buildingHeightMax: 125,
    accentColor: [0.22, 0.65, 0.95],
  },
  OLD_TOWN: {
    id: 'old_town',
    name: 'Old Market Quarter',
    bounds: { minX: -130, maxX: 10, minZ: -260, maxZ: -10 },
    buildingHeightMin: 14,
    buildingHeightMax: 34,
    accentColor: [0.88, 0.45, 0.22],
  },
  DOCKS: {
    id: 'docks',
    name: 'Meridian Cargo Docks',
    bounds: { minX: 10, maxX: 260, minZ: 10, maxZ: 260 },
    buildingHeightMin: 12,
    buildingHeightMax: 28,
    accentColor: [0.95, 0.58, 0.12],
  },
  PROMENADE: {
    id: 'promenade',
    name: 'Ocean Promenade',
    bounds: { minX: -130, maxX: 10, minZ: 10, maxZ: 260 },
    buildingHeightMin: 20,
    buildingHeightMax: 50,
    accentColor: [0.15, 0.85, 0.75],
  },
};

export const LIGHTING = {
  // Warm late-afternoon Mediterranean sun: low in sky, long soft shadows
  SUN_DIR: [-0.68, 0.32, -0.65],
  SUN_COLOR: [1.48, 1.18, 0.72],      // Warm intense golden yellow
  SKY_COLOR: [0.26, 0.48, 0.76],      // Periwinkle cobalt sky
  SHADE_TINT: [0.32, 0.50, 0.70],     // Cool Mediterranean blue-teal shade
  HORIZON_COLOR: [1.0, 0.72, 0.46],   // Golden-peach dusk horizon
  AMBIENT_COLOR: [0.48, 0.58, 0.72],  // Dual ambient fill
  GROUND_BOUNCE: [0.82, 0.64, 0.46],  // Warm ochre & terracotta ground bounce
  FOG_COLOR: [0.98, 0.76, 0.54],      // Warm golden dusk haze
  FOG_DENSITY: 0.0022,
};

export const CAR_TYPES = {
  sports: {
    id: 'sports',
    name: 'Veloce GT',
    width: 2.15,
    length: 4.65,
    height: 1.25,
    maxSpeed: 46.5,
    accel: 33.0,
    brake: 44.0,
    reverseSpeed: 14.5,
    steerAngle: 0.64,
    steerSpeed: 4.2,
    driftGrip: 0.88,
    mass: 1240,
    color: [0.08, 0.82, 0.88, 1.0],      // Vibrant coastal turquoise
    roofColor: [0.06, 0.52, 0.62, 1.0],
    hasSpoiler: true,
  },
  muscle: {
    id: 'muscle',
    name: 'Stallion 428',
    width: 2.22,
    length: 4.95,
    height: 1.35,
    maxSpeed: 42.5,
    accel: 35.0,
    brake: 36.0,
    reverseSpeed: 12.5,
    steerAngle: 0.58,
    steerSpeed: 3.4,
    driftGrip: 0.82,
    mass: 1580,
    color: [0.96, 0.42, 0.14, 1.0],      // Sunset terracotta orange
    roofColor: [0.16, 0.16, 0.18, 1.0],
    hasSpoiler: false,
    hasHoodScoop: true,
  },
  police: {
    id: 'police',
    name: 'Metro Interceptor',
    width: 2.16,
    length: 4.95,
    height: 1.44,
    maxSpeed: 45.0,
    accel: 33.0,
    brake: 40.0,
    reverseSpeed: 13.5,
    steerAngle: 0.60,
    steerSpeed: 3.8,
    driftGrip: 0.86,
    mass: 1680,
    color: [0.96, 0.96, 0.98, 1.0],      // Crisp police white
    roofColor: [0.12, 0.14, 0.18, 1.0],  // Dark cruiser roof
    isPolice: true,
    hasPushBar: true,
  },
  sedan: {
    id: 'sedan',
    name: 'Meridian Executive',
    width: 2.12,
    length: 4.80,
    height: 1.40,
    maxSpeed: 36.0,
    accel: 25.0,
    brake: 32.0,
    reverseSpeed: 11.5,
    steerAngle: 0.56,
    steerSpeed: 3.1,
    driftGrip: 0.90,
    mass: 1480,
    color: [0.88, 0.84, 0.78, 1.0],      // Champagne pearl travertine
    roofColor: [0.80, 0.76, 0.70, 1.0],
  },
  taxi: {
    id: 'taxi',
    name: 'Cobra City Cab',
    width: 2.12,
    length: 4.80,
    height: 1.44,
    maxSpeed: 35.0,
    accel: 25.0,
    brake: 32.0,
    reverseSpeed: 11.5,
    steerAngle: 0.56,
    steerSpeed: 3.1,
    driftGrip: 0.90,
    mass: 1490,
    color: [0.98, 0.82, 0.10, 1.0],      // High-vis taxi amber
    roofColor: [0.92, 0.76, 0.08, 1.0],
    isTaxi: true,
  },
  truck: {
    id: 'truck',
    name: 'Meridian Hauler',
    width: 2.65,
    length: 7.4,
    height: 2.50,
    maxSpeed: 29.0,
    accel: 16.0,
    brake: 26.0,
    reverseSpeed: 8.5,
    steerAngle: 0.48,
    steerSpeed: 2.3,
    driftGrip: 0.94,
    mass: 3950,
    color: [0.26, 0.46, 0.72, 1.0],      // Deep maritime blue
    roofColor: [0.20, 0.36, 0.58, 1.0],
  },
  hatchback: {
    id: 'hatchback',
    name: 'Vela Compact',
    width: 2.05,
    length: 4.25,
    height: 1.35,
    maxSpeed: 38.0,
    accel: 28.0,
    brake: 36.0,
    reverseSpeed: 12.0,
    steerAngle: 0.62,
    steerSpeed: 3.6,
    driftGrip: 0.89,
    mass: 1180,
    color: [0.88, 0.32, 0.28, 1.0],      // Coral red
    roofColor: [0.18, 0.18, 0.20, 1.0],
  },
};

export const PLAYER = {
  WALK_SPEED: 4.8,
  SPRINT_SPEED: 8.6,
  ACCEL: 26.0,
  ROT_SPEED: 8.8,
  MAX_HEALTH: 100,
  MAX_ARMOR: 100,
  ENTER_CAR_DIST: 3.8,
};

export const WEAPONS = {
  pistol: {
    id: 'pistol',
    name: 'Viper .45',
    damage: 28,
    fireInterval: 0.22,
    clipSize: 12,
    maxReserve: 120,
    reloadTime: 1.25,
    spread: 0.025,
    range: 65,
    tracerSpeed: 195,
  },
  smg: {
    id: 'smg',
    name: 'Stiletto 9mm',
    damage: 22,
    fireInterval: 0.09,
    clipSize: 32,
    maxReserve: 240,
    reloadTime: 1.4,
    spread: 0.05,
    range: 70,
    tracerSpeed: 205,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Bravado 12G',
    damage: 18,
    pellets: 6,
    fireInterval: 0.65,
    clipSize: 8,
    maxReserve: 48,
    reloadTime: 2.1,
    spread: 0.14,
    range: 38,
    tracerSpeed: 165,
  },
  carbine: {
    id: 'carbine',
    name: 'Vane Carbine',
    damage: 34,
    fireInterval: 0.12,
    clipSize: 30,
    maxReserve: 180,
    reloadTime: 1.6,
    spread: 0.032,
    range: 110,
    tracerSpeed: 235,
  },
};

export const POLICE_CONFIG = {
  HEAT_DECAY_RATE: 0.06,
  SIGHT_RADIUS: 55,
  LOSE_SIGHT_TIME: 14.0,
  SPAWN_INTERVAL: 8.0,
  MAX_ACTIVE_CRUISERS: 5,
  MAX_STARS: 5,
  CHASE_SPEED_BOOST: 1.15,
};

export const MISSIONS = [
  {
    id: 1,
    title: 'THE VELA ARRIVAL',
    giver: 'Silvio "The Anchor" Moreno',
    startPos: [68, 0, -68],
    targetPos: [95, 0, -85],
    targetType: 'safehouse',
    enemiesCount: 0,
    wantedLevelOnTrigger: 0,
    rewardCash: 2500,
    dialogue: 'Welcome back to Vela Bay, Rook. The syndicates carved up the city while you were away. Get to the safehouse garage on 4th Street to establish our base.',
    completionText: 'Safehouse secured. Garage storage unlocked.',
  },
  {
    id: 2,
    title: 'WHEELS FOR THE CREW',
    giver: 'Silvio Moreno',
    startPos: [95, 0, -85],
    targetPos: [-105, 0, 40],
    targetType: 'vehicle_steal',
    enemiesCount: 2,
    wantedLevelOnTrigger: 1,
    rewardCash: 4500,
    dialogue: 'A pristine Veloce GT is parked down at the Ocean Promenade hotel valet. Boost it and bring it back without wrecking the chassis.',
    completionText: 'Veloce GT delivered to the safehouse garage.',
  },
  {
    id: 3,
    title: 'OLD TOWN SHAKEDOWN',
    giver: 'Dante "Two-Times" Valenti',
    startPos: [95, 0, -85],
    targetPos: [-55, 0, -115],
    targetType: 'combat',
    enemiesCount: 4,
    wantedLevelOnTrigger: 2,
    rewardCash: 7500,
    dialogue: 'The Leone brothers are skimming protection tribute from our merchants in the Old Market Quarter. Take care of their enforcers.',
    completionText: 'Leone crew cleared out of Old Town.',
  },
  {
    id: 4,
    title: 'SKYWAY INTERCEPTION',
    giver: 'Elena Rossi',
    startPos: [-55, 0, -115],
    targetPos: [45, 13.5, 20],
    targetType: 'pursuit',
    enemiesCount: 3,
    wantedLevelOnTrigger: 3,
    rewardCash: 12000,
    dialogue: 'A cartel courier is moving hard currency across the elevated Skyway Boulevard. Intercept the courier vehicle and seize the payload.',
    completionText: 'Courier intercepted. $12,000 payload secured.',
  },
  {
    id: 5,
    title: 'HARBOUR BRIDGE RUN',
    giver: 'Elena Rossi',
    startPos: [45, 0, 20],
    targetPos: [-130, 6, -180],
    targetType: 'time_trial',
    enemiesCount: 0,
    wantedLevelOnTrigger: 2,
    rewardCash: 15000,
    dialogue: 'Metro Police set up a dragnet across the northern avenues. Punch through their perimeter and cross the Vela Bay Suspension Bridge before the lockdown closes.',
    completionText: 'Bridge crossed. Police dragnet evaded.',
  },
  {
    id: 6,
    title: 'CASINO TAKEDOWN',
    giver: 'Silvio Moreno',
    startPos: [-130, 0, -180],
    targetPos: [150, 0, -82],
    targetType: 'combat',
    enemiesCount: 5,
    wantedLevelOnTrigger: 3,
    rewardCash: 22000,
    dialogue: 'The Metro Syndicate is laundering extortion money through the Downtown Casino penthouse vault. Neutralize security and extract the ledger.',
    completionText: 'Casino vault cracked. Ledger recovered.',
  },
  {
    id: 7,
    title: 'DOCK HEIST AMBUSH',
    giver: 'Elena Rossi',
    startPos: [150, 0, -82],
    targetPos: [148, 0, 115],
    targetType: 'heist',
    enemiesCount: 6,
    wantedLevelOnTrigger: 3,
    rewardCash: 35000,
    dialogue: 'A shipment of high-caliber military hardware is being offloaded at Meridian Cargo Docks Pier 7. Ambush the crew, seize the contraband crates, and load the getaway van.',
    completionText: 'Pier 7 contraband seized. Military arsenal unlocked.',
  },
  {
    id: 8,
    title: 'VELA BAY FINALE: THE CLEAN BREAK',
    giver: 'Silvio & Elena',
    startPos: [-70, 0, 40],
    targetPos: [-115, 0, -60],
    targetType: 'heist_finale',
    enemiesCount: 6,
    wantedLevelOnTrigger: 4,
    rewardCash: 50000,
    dialogue: 'Tonight we take everything they stole from us. Break the vault, grab fifty grand in bearer bonds, and reach the getaway launch at the marina.',
    completionText: 'HEIST COMPLETE! Bearer bonds secured. Nightfall City is yours, Rook.',
  },
];

export const SHOT_PRESETS = {
  1: {
    // The Cover: A city alive in motion and under pressure:
    // Wide street view along Downtown Avenue with protagonist in foreground on foot holding weapon,
    // beside the angled sports coupe just exited; active traffic in motion (taxi, sedan, oncoming hatchback),
    // kerbside parked muscle car, double-parked delivery hauler; pedestrians walking in pairs along sidewalks;
    // responding police cruiser with flashing lightbar in mid/far distance; 2 wanted stars on HUD matching minimap blips.
    name: '1-city-street.png',
    camera: {
      pos: [118.0, 2.15, -91.0],
      target: [120.5, 1.85, -126.0],
      fov: 63,
    },
    player: {
      pos: [119.5, 0.24, -95.5],
      rot: Math.PI * 0.96,
      inVehicle: false,
      weapon: 'smg',
    },
    district: 'Downtown Vela',
    wantedStars: 2,
    cash: 18450,
    objective: 'DELIVER THE STOLEN VELOCE GT TO SAFEHOUSE (140M)',
    traffic: [
      // Stolen sports coupe parked at an angle at the kerb right beside player
      { type: 'sports', pos: [123.0, 0, -96.5], rot: Math.PI * 0.88, speedMph: 0 },
      // Northbound lane moving traffic
      { type: 'taxi', pos: [120.2, 0, -112.0], rot: Math.PI, speedMph: 28 },
      { type: 'sedan', pos: [119.8, 0, -128.0], rot: Math.PI, speedMph: 32 },
      // Southbound lane oncoming traffic
      { type: 'hatchback', pos: [110.5, 0, -118.0], rot: 0, speedMph: 25 },
      // Double-parked delivery hauler with hazard lights
      { type: 'truck', pos: [121.2, 0, -138.0], rot: Math.PI, speedMph: 0 },
      // Parked muscle car at east kerb
      { type: 'muscle', pos: [124.2, 0, -104.0], rot: Math.PI, speedMph: 0 },
      // Responding police interceptor with flashing sirens heading south toward player
      { type: 'police', pos: [111.0, 0, -132.0], rot: 0, speedMph: 35, sirenActive: true },
    ],
    pedestrians: [
      // East sidewalk walking pairs and pedestrians
      { pos: [126.8, 0.24, -102.0], rot: Math.PI, walkCycle: 1.2 },
      { pos: [127.6, 0.24, -103.5], rot: Math.PI, walkCycle: 2.5 },
      { pos: [127.2, 0.24, -118.0], rot: 0, walkCycle: 0.8 },
      // West sidewalk pedestrians
      { pos: [102.5, 0.24, -106.0], rot: Math.PI, walkCycle: 1.9 },
      { pos: [103.2, 0.24, -107.2], rot: Math.PI, walkCycle: 3.1 },
      { pos: [102.8, 0.24, -124.0], rot: 0, walkCycle: 0.4 },
    ],
  },
  2: {
    // Driving a sports car along Ocean Promenade seen from behind and slightly above:
    // Car clearly a car with shaped body, bonnet, cabin, roof, boot, sun catching windscreen.
    // Boulevard with Art Deco buildings, palm trees, wanted level 0 or 1, full HUD with minimap & waypoint.
    name: '2-car-promenade.png',
    camera: {
      pos: [-106.5, 1.6, 71.0],
      target: [-112.0, 1.35, 112.0],
      fov: 65,
    },
    player: {
      pos: [-107.5, 0, 78.0],
      rot: 0,
      inVehicle: true,
      vehicleType: 'sports',
      speedMph: 151,
    },
    district: 'Ocean Promenade',
    wantedStars: 1,
    cash: 26800,
    objective: 'COASTAL TIME TRIAL: PASS CHECKPOINT 4/6 (0:34)',
    traffic: [
      { type: 'sedan', pos: [-102.0, 0, 120.0], rot: 0, speedMph: 45 },
    ],
    pedestrians: [
      { pos: [-118.5, 0.28, 88.0], rot: 0, walkCycle: 0.5 },
      { pos: [-118.2, 0.28, 105.0], rot: Math.PI, walkCycle: 1.8 },
      { pos: [-90.5, 0.24, 94.0], rot: 0, walkCycle: 2.3 },
    ],
  },
  3: {
    // 5-Star police chase: player muscle car pursued bumper-to-bumper by at least 2 police cars with red and blue lights,
    // lights washing the street and buildings, wanted level showing 5 stars, tactical police chopper overhead, HUD & minimap with police blips.
    // Soft transparent pale amber searchlight beam with feathered ground ellipse, illuminating street without obscuring action.
    name: '3-police-chase.png',
    camera: {
      pos: [46.5, 2.6, -19.0],
      target: [45.0, 1.7, -50.0],
      fov: 68,
    },
    player: {
      pos: [45.0, 0, -32.0],
      rot: Math.PI,
      inVehicle: true,
      vehicleType: 'muscle',
      speedMph: 128,
    },
    district: 'Skyway Boulevard Overpass',
    wantedStars: 5,
    cash: 42500,
    objective: 'EVADE 5-STAR METRO POLICE PURSUIT',
    hasHeli: true,
    heliPos: [45.0, 22.0, -48.0],
    cruisers: [
      { pos: [40.8, 0, -30.5], rot: Math.PI, sirenPhase: 0 },
      { pos: [49.2, 0, -30.5], rot: Math.PI, sirenPhase: Math.PI },
      { pos: [45.0, 0, -22.0], rot: Math.PI, sirenPhase: Math.PI * 0.5 },
    ],
  },
  4: {
    // Meridian Cargo Docks heist in progress at a working harbour:
    // Legible at one glance with distinct foreground, mid-ground, and background:
    // Foreground: Player visibly armed with tactical carbine in two-handed combat ready stance.
    // Mid-ground: Contraband loot crates on pallet, open crate with glowing cargo & 3D golden objective beacon,
    // target getaway hauler van with rear doors wide open, bollards along quay lip, moored cargo barge hull in water.
    // Background: Warehouse wall with roll-up shutter door & hazard chevrons, colourful stacked shipping containers,
    // dockside jib crane & 36m gantry crane against sunset sky, white coastal gulls, water basin, and far shore breakwater.
    // HUD: Mission objective, 3 wanted stars, $75,000 cash, minimap with objective marker, health & armor bars, carbine ammo.
    name: '4-dock-heist.png',
    camera: {
      pos: [142.2, 2.15, 104.5],
      target: [154.5, 2.25, 126.5],
      fov: 62,
    },
    player: {
      pos: [144.5, 0.16, 108.5],
      rot: 0.55,
      inVehicle: false,
      weapon: 'carbine',
    },
    district: 'Meridian Cargo Docks',
    wantedStars: 3,
    cash: 75000,
    objective: 'SEIZE THE CONTRABAND CRATES AT PIER 7 (10M)',
    targetPos: [149.8, 0.16, 117.2],
    hasHeli: false,
    enemies: [
      { pos: [156.0, 0.16, 126.0], rot: Math.PI * 0.92 },
      { pos: [151.0, 0.16, 130.0], rot: Math.PI * 0.82 },
    ],
    traffic: [
      { type: 'truck', pos: [155.0, 0.16, 118.2], rot: Math.PI * 0.72, speedMph: 0, rearDoorsOpen: true },
    ],
  },
};
