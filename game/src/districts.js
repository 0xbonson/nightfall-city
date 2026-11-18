/**
 * Nightfall City: Vela Bay - District Navigation & Spatial Territory System
 * Authored by makefun agent for the GTA 6 bounty challenge.
 *
 * Tracks territory boundaries across Vela Bay's Mediterranean coastal topography:
 * - Downtown Vela: Towering glass curtain skyscrapers and financial plazas
 * - Ocean Promenade: Art Deco pastel beachfront hotels, cedar boardwalk, and palm boulevards
 * - Old Market Quarter: Mediterranean terracotta townhouses, narrow alleys, and artisanal markets
 * - Meridian Cargo Docks: Industrial quays, multi-tier shipping containers, and 36m gantry crane
 * - Marina San Vento: Weathered wooden pier slips, motor yachts, and breakwater channels
 * - Skyway Expressway: Elevated multi-lane concrete expressway spanning over the metropolis
 * - Monte Sereno Foothills: Scenic sunlit coastal ridge framing the northern horizon
 */

export const DISTRICT_REGISTRY = [
  {
    id: 'downtown',
    name: 'Downtown Vela',
    tagline: 'Financial Core & High-Rise Skyscraper District',
    bounds: { minX: 10, maxX: 260, minZ: -260, maxZ: -10 },
    accentColor: [0.22, 0.65, 0.95], // Electric sapphire
    hudColor: '#38bdf8',
    speedLimitMph: 45,
    crimeRisk: 'high',
  },
  {
    id: 'old_town',
    name: 'Old Market Quarter',
    tagline: 'Historic Terracotta Alleys & Artisan Bazaars',
    bounds: { minX: -130, maxX: 10, minZ: -260, maxZ: -10 },
    accentColor: [0.88, 0.45, 0.22], // Terracotta rust
    hudColor: '#fb923c',
    speedLimitMph: 30,
    crimeRisk: 'medium',
  },
  {
    id: 'docks',
    name: 'Meridian Cargo Docks',
    tagline: 'Heavy Industrial Quays & Container Terminal',
    bounds: { minX: 10, maxX: 260, minZ: 10, maxZ: 260 },
    accentColor: [0.95, 0.58, 0.12], // Industrial amber
    hudColor: '#f59e0b',
    speedLimitMph: 35,
    crimeRisk: 'very_high',
  },
  {
    id: 'promenade',
    name: 'Ocean Promenade',
    tagline: 'Art Deco Beachfront, Palms & Seaside Boardwalk',
    bounds: { minX: -130, maxX: 10, minZ: 10, maxZ: 260 },
    accentColor: [0.15, 0.85, 0.75], // Coastal turquoise
    hudColor: '#2dd4bf',
    speedLimitMph: 40,
    crimeRisk: 'low',
  },
  {
    id: 'skyway',
    name: 'Skyway Boulevard Overpass',
    tagline: 'Elevated High-Speed Coastal Expressway',
    bounds: { minX: 36, maxX: 54, minZ: -180, maxZ: 180 },
    accentColor: [0.65, 0.45, 0.95], // Highway violet
    hudColor: '#a855f7',
    speedLimitMph: 85,
    crimeRisk: 'high',
    elevationMin: 7.0,
  },
  {
    id: 'marina',
    name: 'Marina San Vento',
    tagline: 'Waterfront Piers & Deepwater Yacht Slips',
    bounds: { minX: -170, maxX: -125, minZ: -180, maxZ: 180 },
    accentColor: [0.08, 0.55, 0.88], // Deep marina azure
    hudColor: '#0ea5e9',
    speedLimitMph: 25,
    crimeRisk: 'low',
  },
];

export class DistrictManager {
  constructor() {
    this.currentDistrict = DISTRICT_REGISTRY[0];
    this.previousDistrict = null;
    this.toastTimer = 0;
    this.toastDuration = 3.5;
  }

  update(playerX, playerY, playerZ, dt) {
    const active = this.findDistrictAt(playerX, playerY, playerZ);
    if (active && active.id !== this.currentDistrict.id) {
      this.previousDistrict = this.currentDistrict;
      this.currentDistrict = active;
      this.toastTimer = this.toastDuration;
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
    }
  }

  findDistrictAt(x, y, z) {
    // Check elevated skyway first if above deck elevation threshold
    if (y >= 7.0) {
      const sky = DISTRICT_REGISTRY.find((d) => d.id === 'skyway');
      if (sky && x >= sky.bounds.minX && x <= sky.bounds.maxX && z >= sky.bounds.minZ && z <= sky.bounds.maxZ) {
        return sky;
      }
    }

    // Check marina waterfront
    if (x < -125) {
      return DISTRICT_REGISTRY.find((d) => d.id === 'marina') || DISTRICT_REGISTRY[3];
    }

    // Standard ground districts
    for (const d of DISTRICT_REGISTRY) {
      if (d.id === 'skyway' || d.id === 'marina') continue;
      const b = d.bounds;
      if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
        return d;
      }
    }

    return DISTRICT_REGISTRY[0];
  }

  getCurrentName() {
    return this.currentDistrict ? this.currentDistrict.name : 'Vela Bay';
  }

  getCurrentDistrict() {
    return this.currentDistrict;
  }
}
