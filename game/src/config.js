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
    damage: 68,
    fireInterval: 0.65,
    clipSize: 8,
    maxReserve: 48,
    reloadTime: 1.9,
    spread: 0.12,
    range: 45,
    tracerSpeed: 170,
  },
  rifle: {
    id: 'rifle',
    name: 'Vane Carbine',
    damage: 36,
    fireInterval: 0.11,
    clipSize: 30,
    maxReserve: 240,
    reloadTime: 1.75,
    spread: 0.040,
    range: 95,
    tracerSpeed: 225,
  },
  carbine: {
    id: 'carbine',
    name: 'Vane Carbine',
    damage: 36,
    fireInterval: 0.11,
    clipSize: 30,
    maxReserve: 240,
    reloadTime: 1.75,
    spread: 0.040,
    range: 95,
    tracerSpeed: 225,
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
    id: 'm1_welcome',
    title: '1. Arrival in Vela Bay',
    client: 'Matteo Vance',
    desc: 'Deliver the turquoise Veloce GT to the Downtown Safehouse garage.',
    startPos: [-110, 0, 80],
    targetPos: [95, 0, -85],
    targetType: 'vehicle_drop',
    rewardCash: 1800,
    dialogue: 'Rook, welcome to Vela Bay. I need that turquoise Veloce GT brought to the safehouse before Metro PD clocks it.',
    completionText: 'Delivery confirmed. The keys are safe. Safehouse Garage unlocked!',
  },
  {
    id: 'm2_alley_cache',
    title: '2. Old Town Dead-Drop',
    client: 'Sora Tanaka',
    desc: 'Retrieve the encrypted briefcase hidden behind Old Market clocktower and lose the 1-star police patrol.',
    startPos: [95, 0, -85],
    targetPos: [-65, 0, -115],
    targetType: 'pickup',
    wantedLevelOnPickup: 1,
    rewardCash: 2800,
    dialogue: 'The Syndicate left a drive in the courtyard behind the market clocktower. Grab it and stay out of sight.',
    completionText: 'Data decrypted. Syndicate accounts are exposed. Clean job, Rook.',
  },
  {
    id: 'm3_harbor_repo',
    title: '3. Repossession at the Piers',
    client: 'Matteo Vance',
    desc: 'Infiltrate Marina Pier 3, eliminate 3 guarding Syndicate thugs, and recover the Stallion 428 muscle car.',
    startPos: [-65, 0, -115],
    targetPos: [-90, 0, -165],
    targetType: 'combat_repo',
    enemiesCount: 3,
    rewardCash: 3800,
    dialogue: 'A rival crew boosted my favorite muscle car. They parked it at Pier 3 under armed guard. Bring it back.',
    completionText: 'Stallion secured! That 428 engine roar never gets old.',
  },
  {
    id: 'm4_coastal_sprint',
    title: '4. Coastal Grand Prix',
    client: 'Elena Rostova',
    desc: 'Race through 6 illuminated street checkpoints along the coastal boulevard in under 75 seconds.',
    startPos: [-105, 0, 160],
    targetPos: [-105, 0, -140],
    targetType: 'race',
    timeLimit: 75,
    checkpoints: [
      [-105, 0, 160],
      [-105, 0, 80],
      [-105, 0, 0],
      [-105, 0, -80],
      [-40, 0, -140],
      [45, 13.5, -40],
    ],
    rewardCash: 5500,
    dialogue: 'Let us see what your hands are made of. Run the coastal ribbon against the clock. Keep the tires gripping.',
    completionText: 'First place across the line! The Vela underground now respects your name.',
  },
  {
    id: 'm5_docks_raid',
    title: '5. Raid on Container Bay',
    client: 'Matteo Vance',
    desc: 'Assault Meridian Docks Container Yard, neutralize 5 Syndicate enforcers, and seize the arms shipment.',
    startPos: [45, 0, 40],
    targetPos: [140, 0, 140],
    targetType: 'combat_elimination',
    enemiesCount: 5,
    rewardCash: 7200,
    dialogue: 'The Syndicate is unloading military hardware between the container stacks at Pier 7. Clean them out.',
    completionText: 'Container Yard cleared! Military carbines added to your trunk arsenal.',
  },
  {
    id: 'm6_expressway_pursuit',
    title: '6. The Skyway Intercept',
    client: 'Sora Tanaka',
    desc: 'Pursue an escaping Syndicate courier on the Elevated Skyway and force their vehicle off the highway.',
    startPos: [45, 13.5, -120],
    targetPos: [45, 13.5, 90],
    targetType: 'chase_intercept',
    rewardCash: 9000,
    dialogue: 'A courier has our extortion ledger on the Elevated Skyway heading south! Catch up and force them to pull over.',
    completionText: 'Courier neutralized! Ledger retrieved. Syndicate leadership is panicking.',
  },
  {
    id: 'm7_depot_sabotage',
    title: '7. Meridian Depot Sabotage',
    client: 'Elena Rostova',
    desc: 'Plant explosive timers at 3 fuel reservoirs in the rail depot and evade the 3-star citywide police dragnet.',
    startPos: [110, 0, 80],
    targetPos: [175, 0, 185],
    targetType: 'sabotage_escape',
    wantedLevelOnTrigger: 3,
    rewardCash: 12000,
    dialogue: 'Time to sever their supply line. Plant the charges at the fuel tanks, then lose the citywide response.',
    completionText: 'Reservoirs detonated! Plumes of smoke rise over Vela Bay. You vanished cleanly.',
  },
  {
    id: 'm8_grand_heist',
    title: '8. The Sunset Syndicate Heist',
    client: 'Matteo Vance',
    desc: 'Crack the offshore vault at Marina Bay Bank, seize $50,000 bearer bonds, and escape to the boat.',
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
    // The Cover: Wide street view from sidewalk with protagonist in foreground (distinct silhouette, holding weapon),
    // tall warm ochre/terracotta facades receding into haze, active traffic and pedestrians, trees, shopfronts,
    // sky with low warm sun and long soft shadows, and full HUD with minimap, wanted stars, money, health/armor.
    name: '1-city-street.png',
    camera: {
      pos: [118.0, 2.1, -91.0],
      target: [123.0, 1.8, -128.0],
      fov: 63,
    },
    player: {
      pos: [118.5, 0.24, -96.0],
      rot: Math.PI,
      inVehicle: false,
      weapon: 'rifle',
    },
    district: 'Downtown Vela',
    wantedStars: 1,
    cash: 18450,
    objective: 'DELIVER THE VELOCE GT TO DOWNTOWN SAFEHOUSE (140M)',
    traffic: [
      { type: 'taxi', pos: [125.5, 0, -104.0], rot: Math.PI, speedMph: 28 },
      { type: 'muscle', pos: [136.5, 0, -114.0], rot: Math.PI, speedMph: 42 },
      { type: 'sports', pos: [125.5, 0, -135.0], rot: Math.PI, speedMph: 48 },
      { type: 'police', pos: [136.5, 0, -165.0], rot: Math.PI, speedMph: 35 },
    ],
    pedestrians: [
      { pos: [118.0, 0.24, -108.0], rot: Math.PI },
      { pos: [117.8, 0.24, -122.0], rot: 0 },
      { pos: [143.5, 0.24, -102.0], rot: Math.PI },
      { pos: [143.2, 0.24, -118.0], rot: 0 },
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
      { pos: [-118.5, 0.28, 88.0], rot: 0 },
      { pos: [-118.2, 0.28, 105.0], rot: Math.PI },
      { pos: [-90.5, 0.24, 94.0], rot: 0 },
    ],
  },
  3: {
    // 5-Star police chase: player muscle car pursued bumper-to-bumper by at least 2 police cars with red and blue lights,
    // lights washing the street and buildings, wanted level showing 5 stars, tactical police chopper overhead, HUD & minimap with police blips.
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
    // Meridian Cargo Docks heist mission: protagonist holding weapon, objective marker diamond,
    // contraband target truck and loot crate at Pier 7, container stacks in bold colors, 36m gantry crane, water and far shore.
    name: '4-dock-heist.png',
    camera: {
      pos: [127.0, 5.9, 97.0],
      target: [172.0, 4.3, 148.0],
      fov: 63,
    },
    player: {
      pos: [134.0, 0, 106.0],
      rot: Math.PI * 0.28,
      inVehicle: false,
      weapon: 'rifle',
    },
    district: 'Meridian Cargo Docks',
    wantedStars: 3,
    cash: 75000,
    objective: 'SEIZE THE CONTRABAND CRATES AT PIER 7',
    hasHeli: true,
    heliPos: [158.0, 24.0, 138.0],
    enemies: [
      { pos: [145.0, 0, 118.0], rot: Math.PI * 0.85 },
      { pos: [155.0, 0, 128.0], rot: Math.PI * 0.75 },
    ],
    traffic: [
      { type: 'truck', pos: [152.0, 0, 112.0], rot: Math.PI * 0.45, speedMph: 0 },
    ],
  },
};
