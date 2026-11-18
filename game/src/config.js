// Nightfall City — Master Game Configuration & World Constants
// Centralizes engine parameters, district definitions, daylight lighting, and gameplay balance.

export const CONFIG = {
  // World geometry and boundary limits (in world units / meters)
  world: {
    minX: -280,
    maxX: 280,
    minZ: -280,
    maxZ: 280,
    seaLevel: -0.2,
    curbHeight: 0.16,
    sidewalkWidth: 4.5,
    roadGrid: [-220, -140, -60, 0, 60, 140, 220],
    overpassHeight: 7.6, // Elevated highway bridge clearance
    totalSmugglerCaches: 15, // Collectible hidden packages
    totalMixtapes: 10, // Collectible golden neon cassettes in Promenade/Marina
    totalHydrants: 18, // Working cast-iron fire hydrants
    totalDumpsters: 14, // Interactive knockable steel dumpsters
  },

  // Traffic light signal cycle timings (in seconds)
  trafficLights: {
    nsGreenDuration: 9.0,
    nsAmberDuration: 2.5,
    ewGreenDuration: 9.0,
    ewAmberDuration: 2.5,
  },

  // Taxi shift side activity configuration
  taxiShift: {
    baseFare: 120,
    ratePerMeter: 1.45,
    speedBonusThreshold: 45, // Seconds remaining for bonus tip
    tipMultiplier: 1.5,
  },

  // Atmospheric late afternoon daylight and coastal sun lighting constants
  lighting: {
    // Sun sits low over the South-West bay, casting long dramatic afternoon shadows
    sunDir: [-0.64, 0.35, 0.68],
    sunColor: [1.0, 0.92, 0.74], // Warm golden late-afternoon sunlight
    skyZenithColor: [0.08, 0.32, 0.74], // Deep coastal cobalt blue zenith
    skyHorizonColor: [0.96, 0.88, 0.74], // Pale hot sun-soaked golden horizon
    ambientSky: [0.32, 0.44, 0.62], // Cool atmospheric sky hemisphere fill
    ambientGround: [0.34, 0.28, 0.20], // Warm asphalt and sand ground bounce
    fogColor: [0.94, 0.86, 0.74], // Atmospheric haze matching horizon color
    fogStart: 70.0,
    fogEnd: 460.0,
    shadowDir: [0.64, 0.0, -0.68], // Vector along which shadows stretch across pavements
    shadowLength: 1.95, // Long afternoon shadow projection multiplier
  },

  // Material surface colors (warm grey asphalt, light stone kerbs, coastal sand)
  surfaces: {
    asphalt: [0.24, 0.24, 0.26, 1.0], // Dark smooth asphalt roadway
    asphaltPatch: [0.18, 0.18, 0.20, 1.0], // Dark fresh asphalt repair patch
    sidewalk: [0.68, 0.66, 0.62, 1.0], // Paved architectural stone pavement
    kerb: [0.76, 0.74, 0.70, 1.0], // Raised granite kerbstone
    centerline: [0.96, 0.82, 0.16, 1.0], // Golden yellow highway line
    laneWhite: [0.95, 0.95, 0.96, 1.0], // Crisp road marking white
    ocean: [0.10, 0.42, 0.72, 1.0], // Turquoise coastal ocean water
    sand: [0.94, 0.86, 0.68, 1.0], // Sun-drenched coastal beach sand
    boardwalk: [0.72, 0.58, 0.42, 1.0], // Weathered cedar timber boardwalk
    grass: [0.24, 0.50, 0.20, 1.0], // Lush landscaped park lawn
    puddle: [0.20, 0.32, 0.46, 0.85], // Reflective street puddle
  },

  // District metadata and distinctive architectural palettes
  districts: {
    downtown: {
      name: 'Downtown Vela',
      description: 'Cool glass skyscrapers with setback tiers, rooftop crowns, and landscaped plazas',
      ambientColor: [0.20, 0.30, 0.44], // Cool, dense, corporate skyline palette
    },
    financial: {
      name: 'Financial Quarter',
      description: 'Wide corporate slabs of bronze glass, dark granite, and mechanical penthouses',
      ambientColor: [0.28, 0.30, 0.36],
    },
    market: {
      name: 'Old Market Quarter',
      description: 'Low narrow blocks, terracotta tile roofs, brick facades, and merchant awnings',
      ambientColor: [0.65, 0.42, 0.32], // Warm terracotta brick and clay
    },
    docks: {
      name: 'Meridian Shipping Docks & Marina',
      description: 'Industrial warehouses, shipping container stacks, moored yachts, and gantry cranes',
      ambientColor: [0.34, 0.36, 0.40],
    },
    promenade: {
      name: 'Ocean Promenade & Beach',
      description: 'Sun-drenched art-deco resorts, wooden boardwalk, marina, and palm-lined boulevards',
      ambientColor: [0.92, 0.88, 0.80], // Bright, warm, sun-soaked seaside
    },
  },

  // Gameplay balance and simulation caps
  gameplay: {
    playerWalkSpeed: 5.2,
    playerSprintSpeed: 9.6,
    maxWantedLevel: 5,
    wantedCooldownDuration: 18.0, // Seconds in evasion before heat clears
    pedestrianMaxCount: 48,
    trafficMaxCount: 36,
    policeMaxCruisers: 6,
    audioMasterVolume: 0.85,
  },
};
