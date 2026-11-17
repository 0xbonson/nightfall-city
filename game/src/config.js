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
  },

  // Traffic light signal cycle timings (in seconds)
  trafficLights: {
    nsGreenDuration: 9.0,
    nsAmberDuration: 2.5,
    ewGreenDuration: 9.0,
    ewAmberDuration: 2.5,
  },

  // Atmospheric late afternoon daylight and coastal sun lighting constants
  lighting: {
    // Warm sun coming from South-West over the bay
    sunDir: [-0.60, 0.48, 0.64],
    sunColor: [1.0, 0.93, 0.80], // Warm late afternoon sunlight
    skyZenithColor: [0.10, 0.35, 0.76], // Deep coastal blue zenith
    skyHorizonColor: [0.94, 0.86, 0.74], // Pale hot sun-soaked horizon
    ambientSky: [0.34, 0.45, 0.62], // Cool sky hemisphere fill
    ambientGround: [0.32, 0.28, 0.22], // Warm asphalt and sand ground bounce
    fogColor: [0.92, 0.84, 0.74], // Atmospheric haze matching horizon color
    fogStart: 75.0,
    fogEnd: 460.0,
    shadowDir: [0.60, 0.0, -0.64], // Direction shadows stretch away from sun
    shadowLength: 1.45, // Afternoon long shadow multiplier
  },

  // Material surface colors (warm grey asphalt, light stone kerbs, coastal sand)
  surfaces: {
    asphalt: [0.38, 0.37, 0.35, 1.0], // Warm grey asphalt rather than blue-black
    asphaltPatch: [0.28, 0.27, 0.26, 1.0], // Darker fresh asphalt repair patch
    sidewalk: [0.70, 0.68, 0.65, 1.0], // Paved stone sidewalk
    kerb: [0.78, 0.76, 0.72, 1.0], // Raised granite kerbstone
    centerline: [0.96, 0.82, 0.16, 1.0], // Golden yellow highway line
    laneWhite: [0.95, 0.95, 0.96, 1.0], // Crisp road marking white
    ocean: [0.12, 0.48, 0.75, 1.0], // Turquoise coastal water
    sand: [0.94, 0.86, 0.68, 1.0], // Sun-drenched coastal beach sand
    boardwalk: [0.74, 0.60, 0.44, 1.0], // Weathered cedar timber boardwalk
  },

  // District metadata and distinctive architectural palettes
  districts: {
    downtown: {
      name: 'Downtown Vela',
      description: 'Glass skyscrapers with setback tiers, rooftop crowns, and landscaped plazas',
      ambientColor: [0.24, 0.35, 0.48],
    },
    financial: {
      name: 'Financial Quarter',
      description: 'Wide corporate slabs of bronze glass, dark granite, and mechanical penthouses',
      ambientColor: [0.30, 0.32, 0.38],
    },
    market: {
      name: 'Old Market Quarter',
      description: 'Low narrow blocks, terracotta tile roofs, brick facades, and merchant awnings',
      ambientColor: [0.65, 0.42, 0.32],
    },
    docks: {
      name: 'Meridian Shipping Docks & Marina',
      description: 'Industrial warehouses, shipping container stacks, and towering gantry cranes',
      ambientColor: [0.36, 0.38, 0.42],
    },
    promenade: {
      name: 'Ocean Promenade & Beach',
      description: 'Sun-drenched art-deco resorts, wooden boardwalk, and palm-lined boulevards',
      ambientColor: [0.88, 0.85, 0.78],
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
