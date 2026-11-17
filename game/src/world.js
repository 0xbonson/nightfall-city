// City Map and World Definition for Nightfall City (Vela Bay)
// Features 4 distinct districts, multi-tiered architecture, road network,
// street furniture props (lamps, benches, bins, traffic lights), and collision geometry.

import { CONFIG } from './config.js';

export class CityWorld {
  constructor() {
    this.buildings = [];
    this.props = [];
    this.roads = [];
    this.roadNodes = [];
    this.containerStacks = [];
    this.palmTrees = [];
    this.bounds = { ...CONFIG.world };

    this.initWorld();
  }

  initWorld() {
    this.generateRoadGrid();
    this.generateDistricts();
    this.generateProps();
    this.buildTrafficWaypoints();
  }

  generateRoadGrid() {
    const coords = CONFIG.world.roadGrid;

    // Vertical (North-South) Avenues
    for (const x of coords) {
      this.roads.push({
        x1: x, z1: -260, x2: x, z2: 260,
        width: x === 0 ? 18 : 14,
        isMajor: x === 0
      });
    }

    // Horizontal (East-West) Boulevards
    for (const z of coords) {
      this.roads.push({
        x1: -260, z1: z, x2: 260, z2: z,
        width: z === 0 ? 18 : 14,
        isMajor: z === 0
      });
    }
  }

  generateDistricts() {
    // Helper to register a building with collision bounds and architectural details
    const addBuilding = (spec) => {
      const { x, z, w, d, h, type, color, roofColor, district, details = {} } = spec;
      this.buildings.push({
        x, z, w, d, h,
        minX: x - w / 2, maxX: x + w / 2,
        minZ: z - d / 2, maxZ: z + d / 2,
        type, color, roofColor, district,
        details: {
          setback: details.setback ?? false,
          setbackHeight: details.setbackHeight ?? h * 0.6,
          antenna: details.antenna ?? false,
          hvacCount: details.hvacCount ?? (h > 25 ? 2 : 1),
          storefront: details.storefront ?? true,
          ...details,
        }
      });
    };

    // =========================================================================
    // 1. DOWNTOWN VELA (North-East: X > 10, Z < -10)
    // High-rise curtain glass skyscrapers, corporate plazas, modern towers
    // =========================================================================
    const downtownTowers = [
      // Block (30, -30) — Obsidian Financial Center
      { x: 30, z: -30, w: 42, d: 42, h: 96, color: [0.22, 0.34, 0.48], roof: [0.18, 0.22, 0.28], setback: true, antenna: true },
      // Block (100, -30) — Vela Bay Horizon Tower
      { x: 100, z: -30, w: 46, d: 42, h: 122, color: [0.84, 0.88, 0.92], roof: [0.20, 0.24, 0.30], setback: true, antenna: true },
      // Block (180, -30) — Marina Grand Exchange
      { x: 180, z: -30, w: 44, d: 44, h: 84, color: [0.28, 0.42, 0.54], roof: [0.22, 0.26, 0.32], setback: false },
      // Block (30, -100) — Port Meridian Corporate Center
      { x: 30, z: -100, w: 42, d: 46, h: 108, color: [0.19, 0.26, 0.38], roof: [0.16, 0.20, 0.25], setback: true },
      // Block (100, -100) — Central Bank & Solano Plaza Tower (Prestige Tower with Rooftop Helipad)
      { x: 100, z: -100, w: 48, d: 48, h: 140, color: [0.32, 0.48, 0.62], roof: [0.15, 0.18, 0.24], setback: true, antenna: true, helipad: true },
      // Block (180, -100) — Lumina Plaza
      { x: 180, z: -100, w: 44, d: 46, h: 78, color: [0.80, 0.84, 0.90], roof: [0.24, 0.26, 0.30], setback: false },
      // Block (30, -180) — North Point Highrise
      { x: 30, z: -180, w: 44, d: 44, h: 90, color: [0.26, 0.36, 0.46], roof: [0.20, 0.22, 0.26], setback: true },
      // Block (100, -180) — Zenith Telecom Spire
      { x: 100, z: -180, w: 46, d: 46, h: 115, color: [0.20, 0.30, 0.44], roof: [0.18, 0.20, 0.26], setback: true, antenna: true },
      // Block (180, -180) — Apex Heights
      { x: 180, z: -180, w: 42, d: 44, h: 72, color: [0.86, 0.89, 0.94], roof: [0.22, 0.24, 0.28], setback: false },
    ];

    for (const t of downtownTowers) {
      addBuilding({
        x: t.x, z: t.z, w: t.w, d: t.d, h: t.h,
        type: 'skyscraper',
        color: t.color,
        roofColor: t.roof,
        district: 'downtown',
        details: { setback: t.setback, antenna: t.antenna, helipad: t.helipad, hvacCount: 3 }
      });
    }

    // =========================================================================
    // 2. OLD MARKET QUARTER (North-West: X < -10, Z < -10)
    // Red brick, terracotta tile roofs, historic stone archways, merchant alleys
    // =========================================================================
    const marketBuildings = [
      { x: -30, z: -30, w: 40, d: 40, h: 22, color: [0.72, 0.36, 0.24], roof: [0.55, 0.22, 0.16] },
      { x: -100, z: -30, w: 44, d: 42, h: 26, color: [0.60, 0.30, 0.22], roof: [0.50, 0.20, 0.14] },
      { x: -180, z: -30, w: 42, d: 44, h: 18, color: [0.76, 0.65, 0.48], roof: [0.52, 0.24, 0.18] },
      { x: -30, z: -100, w: 42, d: 44, h: 24, color: [0.66, 0.32, 0.22], roof: [0.58, 0.24, 0.16] },
      { x: -100, z: -100, w: 44, d: 44, h: 30, color: [0.78, 0.70, 0.56], roof: [0.54, 0.22, 0.15] },
      { x: -180, z: -100, w: 42, d: 42, h: 20, color: [0.68, 0.34, 0.25], roof: [0.52, 0.20, 0.14] },
      { x: -30, z: -180, w: 40, d: 42, h: 19, color: [0.64, 0.31, 0.20], roof: [0.50, 0.22, 0.15] },
      { x: -100, z: -180, w: 44, d: 44, h: 25, color: [0.74, 0.64, 0.50], roof: [0.56, 0.25, 0.18] },
      { x: -180, z: -180, w: 42, d: 40, h: 17, color: [0.68, 0.35, 0.24], roof: [0.52, 0.21, 0.15] },
    ];

    for (const m of marketBuildings) {
      addBuilding({
        x: m.x, z: m.z, w: m.w, d: m.d, h: m.h,
        type: 'market',
        color: m.color,
        roofColor: m.roof,
        district: 'market',
        details: { awnings: true, hvacCount: 1, stonePlinth: true }
      });
    }

    // =========================================================================
    // 3. MERIDIAN SHIPPING DOCKS (South-East: X > 10, Z > 10)
    // Heavy industrial hangars, logistics depots, port crane facilities
    // =========================================================================
    const dockBuildings = [
      { x: 30, z: 30, w: 42, d: 42, h: 18, type: 'warehouse', col: [0.42, 0.45, 0.48], roof: [0.28, 0.30, 0.32] },
      { x: 100, z: 30, w: 46, d: 44, h: 22, type: 'warehouse', col: [0.38, 0.40, 0.44], roof: [0.26, 0.28, 0.30] },
      { x: 180, z: 30, w: 44, d: 44, h: 16, type: 'depot', col: [0.45, 0.48, 0.52], roof: [0.30, 0.32, 0.36] },
      { x: 30, z: 100, w: 44, d: 44, h: 20, type: 'warehouse', col: [0.36, 0.38, 0.42], roof: [0.25, 0.27, 0.30] },
      { x: 100, z: 100, w: 46, d: 44, h: 25, type: 'compound', col: [0.40, 0.42, 0.46], roof: [0.28, 0.30, 0.34] },
      { x: 180, z: 100, w: 44, d: 46, h: 20, type: 'hangar', col: [0.44, 0.46, 0.50], roof: [0.30, 0.32, 0.35] },
      { x: 30, z: 180, w: 42, d: 42, h: 18, type: 'storage', col: [0.39, 0.41, 0.45], roof: [0.27, 0.29, 0.32] },
      { x: 100, z: 180, w: 46, d: 46, h: 16, type: 'pier_wharf', col: [0.42, 0.44, 0.48], roof: [0.28, 0.30, 0.33] },
      { x: 180, z: 180, w: 44, d: 44, h: 24, type: 'terminal', col: [0.35, 0.38, 0.42], roof: [0.24, 0.26, 0.30] },
    ];

    for (const d of dockBuildings) {
      addBuilding({
        x: d.x, z: d.z, w: d.w, d: d.d, h: d.h,
        type: d.type,
        color: d.col,
        roofColor: d.roof,
        district: 'docks',
        details: { rollUpDoors: true, corrugated: true, hvacCount: 2 }
      });
    }

    // Shipping Container Stacks in Docks
    const containerColors = [
      [0.85, 0.20, 0.16], // Port Crimson Red
      [0.16, 0.48, 0.88], // Ocean Blue
      [0.92, 0.76, 0.14], // Freight Yellow
      [0.18, 0.68, 0.44], // Marine Green
      [0.88, 0.46, 0.14], // Cargo Orange
      [0.32, 0.34, 0.38], // Steel Grey
    ];

    const cCoords = [
      { x: 145, z: 145 }, { x: 155, z: 145 }, { x: 165, z: 145 },
      { x: 145, z: 155 }, { x: 155, z: 155 }, { x: 165, z: 155 },
      { x: 75, z: 145 }, { x: 85, z: 145 }, { x: 75, z: 155 },
      { x: 145, z: 75 }, { x: 155, z: 75 }, { x: 145, z: 85 },
      { x: 205, z: 145 }, { x: 215, z: 145 }, { x: 205, z: 155 },
      { x: 85, z: 75 }, { x: 75, z: 85 }, { x: 215, z: 155 },
    ];

    for (let i = 0; i < cCoords.length; i++) {
      const c = cCoords[i];
      const stackH = 1 + (i % 3);
      for (let layer = 0; layer < stackH; layer++) {
        const col = containerColors[(i + layer) % containerColors.length];
        this.containerStacks.push({
          x: c.x, y: layer * 3.2, z: c.z,
          w: 6.5, h: 3.0, d: 3.2,
          color: col
        });
      }
    }

    // =========================================================================
    // 4. OCEAN PROMENADE & BEACH (South-West: X < -10, Z > 10)
    // Art-deco beachfront luxury hotels, pastel resorts, coastal boulevards
    // =========================================================================
    const beachBuildings = [
      { x: -30, z: 30, w: 42, d: 40, h: 24, col: [0.94, 0.90, 0.82], roof: [0.46, 0.50, 0.56] },
      { x: -100, z: 30, w: 44, d: 42, h: 28, col: [0.88, 0.85, 0.80], roof: [0.42, 0.46, 0.52] },
      { x: -180, z: 30, w: 42, d: 42, h: 20, col: [0.92, 0.87, 0.84], roof: [0.48, 0.52, 0.58] },
      { x: -30, z: 100, w: 40, d: 44, h: 26, col: [0.95, 0.91, 0.85], roof: [0.44, 0.48, 0.54] },
      { x: -100, z: 100, w: 44, d: 44, h: 32, col: [0.89, 0.86, 0.82], roof: [0.40, 0.44, 0.50] },
      { x: -180, z: 100, w: 42, d: 42, h: 18, col: [0.94, 0.90, 0.86], roof: [0.46, 0.50, 0.55] },
    ];

    for (const b of beachBuildings) {
      addBuilding({
        x: b.x, z: b.z, w: b.w, d: b.d, h: b.h,
        type: 'resort',
        color: b.col,
        roofColor: b.roof,
        district: 'promenade',
        details: { balconies: true, resortTrim: true, hvacCount: 1 }
      });
    }
  }

  generateProps() {
    // 1. Palm trees along Ocean Promenade and coastal avenues
    for (let x = -240; x <= -20; x += 18) {
      this.palmTrees.push({ x, z: 18, scale: 1.0 + (Math.abs(x) % 5) * 0.05 });
      this.palmTrees.push({ x, z: 236, scale: 1.1 + (Math.abs(x) % 4) * 0.05 });
    }
    for (let z = 20; z <= 240; z += 18) {
      this.palmTrees.push({ x: -18, z, scale: 1.05 });
      this.palmTrees.push({ x: -245, z, scale: 1.2 });
    }
    // Downtown avenue palm islands
    for (let x = 20; x <= 220; x += 28) {
      this.palmTrees.push({ x, z: -18, scale: 1.0 });
    }

    // 2. Street Furniture (Lamps, Benches, Bins, Traffic Lights)
    const grid = CONFIG.world.roadGrid;

    // Street Lamps along North-South and East-West sidewalks
    for (const rx of grid) {
      const halfW = (rx === 0 ? 18 : 14) / 2 + 1.8;
      for (let z = -250; z <= 250; z += 35) {
        // Avoid placing right inside intersections
        const inIntersection = grid.some(gz => Math.abs(z - gz) < 14);
        if (!inIntersection) {
          this.props.push({ type: 'lamp', x: rx - halfW, z, rotation: 0 });
          this.props.push({ type: 'lamp', x: rx + halfW, z, rotation: Math.PI });
        }
      }
    }

    // Traffic Lights at Intersections
    for (const rx of grid) {
      for (const rz of grid) {
        const hwX = (rx === 0 ? 18 : 14) / 2 + 2.0;
        const hwZ = (rz === 0 ? 18 : 14) / 2 + 2.0;
        // 4 corner traffic lights per major intersection
        this.props.push({ type: 'traffic_light', x: rx - hwX, z: rz - hwZ, angle: 0 });
        this.props.push({ type: 'traffic_light', x: rx + hwX, z: rz + hwZ, angle: Math.PI });
      }
    }

    // Benches and Trash Bins along sidewalks
    for (let z = 25; z <= 220; z += 40) {
      // Promenade oceanfront benches
      this.props.push({ type: 'bench', x: -22, z, rotation: Math.PI / 2 });
      this.props.push({ type: 'bin', x: -22, z: z + 6, rotation: 0 });
    }
    for (let z = -220; z <= -25; z += 45) {
      // Downtown plaza benches and bins
      this.props.push({ type: 'bench', x: 22, z, rotation: -Math.PI / 2 });
      this.props.push({ type: 'bin', x: 22, z: z + 6, rotation: 0 });
      // Market quarter bins
      this.props.push({ type: 'bin', x: -22, z, rotation: 0 });
      // Downtown newsstands
      this.props.push({ type: 'newsstand', x: 23, z: z + 18, rotation: 0 });
    }

    // Fire hydrants near avenue corners
    for (const rx of [-140, 0, 140]) {
      for (const rz of [-140, 0, 140]) {
        this.props.push({ type: 'hydrant', x: rx + 8.5, z: rz + 8.5 });
        this.props.push({ type: 'hydrant', x: rx - 8.5, z: rz - 8.5 });
      }
    }

    // Harbor mooring bollards along Docks waterline
    for (let x = 30; x <= 220; x += 18) {
      this.props.push({ type: 'bollard', x, z: 224 });
    }
  }

  buildTrafficWaypoints() {
    const coords = CONFIG.world.roadGrid;
    for (const x of coords) {
      for (const z of coords) {
        this.roadNodes.push({ x, z });
      }
    }
  }

  checkCollision(x, z, radius = 0.8) {
    // Check against all buildings
    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      const closestX = Math.max(b.minX, Math.min(x, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = radius - dist;
        return {
          collided: true,
          pushX: (dx / dist) * overlap,
          pushZ: (dz / dist) * overlap,
          normalX: dx / dist,
          normalZ: dz / dist,
          building: b
        };
      }
    }

    // Check against shipping container stacks
    for (let i = 0; i < this.containerStacks.length; i++) {
      const c = this.containerStacks[i];
      const minX = c.x - c.w / 2;
      const maxX = c.x + c.w / 2;
      const minZ = c.z - c.d / 2;
      const maxZ = c.z + c.d / 2;

      const closestX = Math.max(minX, Math.min(x, maxX));
      const closestZ = Math.max(minZ, Math.min(z, maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = radius - dist;
        return {
          collided: true,
          pushX: (dx / dist) * overlap,
          pushZ: (dz / dist) * overlap,
          normalX: dx / dist,
          normalZ: dz / dist,
          isContainer: true
        };
      }
    }

    return { collided: false, pushX: 0, pushZ: 0, normalX: 0, normalZ: 0 };
  }
}

export const world = new CityWorld();
