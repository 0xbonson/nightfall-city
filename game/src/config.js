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

  // Atmospheric daylight and sun lighting constants
  lighting: {
    sunDir: [0.55, 0.72, 0.42], // Direction towards high morning/afternoon coastal sun
    sunColor: [1.0, 0.95, 0.82], // Brilliant warm sun
    skyZenithColor: [0.22, 0.54, 0.92], // Deep coastal blue zenith
    skyHorizonColor: [0.72, 0.84, 0.94], // Soft sunlit coastal haze
    ambientSky: [0.28, 0.38, 0.52], // Cool sky hemisphere term
    ambientGround: [0.18, 0.16, 0.14], // Warm street ground bounce
    fogColor: [0.72, 0.83, 0.93], // Atmospheric haze matching horizon
    fogStart: 85.0,
    fogEnd: 420.0,
  },

  // District metadata and palettes
  districts: {
    downtown: {
      name: 'Downtown Vela',
      description: 'Glass skyscrapers, financial towers, and corporate plazas',
      ambientColor: [0.24, 0.35, 0.48],
    },
    market: {
      name: 'Old Market Quarter',
      description: 'Historic terracotta architecture, brick facades, and vibrant stalls',
      ambientColor: [0.65, 0.42, 0.32],
    },
    docks: {
      name: 'Meridian Shipping Docks',
      description: 'Industrial warehouses, shipping container stacks, and deepwater piers',
      ambientColor: [0.36, 0.38, 0.42],
    },
    promenade: {
      name: 'Ocean Promenade',
      description: 'Sun-drenched coastal hotels, sandy beaches, and palm boulevards',
      ambientColor: [0.88, 0.85, 0.78],
    },
  },

  // Gameplay balance and simulation caps
  gameplay: {
    playerWalkSpeed: 5.2,
    playerSprintSpeed: 9.6,
    maxWantedLevel: 5,
    wantedCooldownDuration: 18.0, // Seconds in evasion before heat clears
    pedestrianMaxCount: 40,
    trafficMaxCount: 30,
    policeMaxCruisers: 6,
    audioMasterVolume: 0.85,
  },
};
