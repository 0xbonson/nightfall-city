// City Map and World Definition for Nightfall City (Vela Bay)
// Features 4 distinct districts, road network with AI waypoints, collision meshes and props.

export class CityWorld {
  constructor() {
    this.buildings = [];
    this.props = [];
    this.roads = [];
    this.roadNodes = [];
    this.containerStacks = [];
    this.palmTrees = [];
    this.bounds = { minX: -280, maxX: 280, minZ: -280, maxZ: 280 };

    this.initWorld();
  }

  initWorld() {
    this.generateRoadGrid();
    this.generateDistricts();
    this.generateProps();
    this.buildTrafficWaypoints();
  }

  generateRoadGrid() {
    // Main Avenues (width 16 units)
    // Vertical Avenues
    const xRoads = [-220, -140, -60, 0, 60, 140, 220];
    const zRoads = [-220, -140, -60, 0, 60, 140, 220];

    // Roads layout
    for (const x of xRoads) {
      this.roads.push({
        x1: x, z1: -260, x2: x, z2: 260, width: x === 0 ? 18 : 14, isMajor: x === 0
      });
    }
    for (const z of zRoads) {
      this.roads.push({
        x1: -260, z1: z, x2: 260, z2: z, width: z === 0 ? 18 : 14, isMajor: z === 0
      });
    }
  }

  generateDistricts() {
    // Helper to add building with bounds check
    const addBuilding = (x, z, w, d, h, type, color, roofColor, district) => {
      // Avoid placing on road axes
      this.buildings.push({
        x, z, w, d, h,
        minX: x - w / 2, maxX: x + w / 2,
        minZ: z - d / 2, maxZ: z + d / 2,
        type, color, roofColor, district
      });
    };

    // 1. DOWNTOWN VELA (North-East: X > 10, Z < -10)
    // High-rise glass towers, corporate skyscrapers, sleek plazas
    const downtownColors = [
      [0.22, 0.32, 0.45], // Steel blue
      [0.18, 0.25, 0.38], // Deep navy glass
      [0.35, 0.42, 0.52], // Reflective cyan
      [0.28, 0.30, 0.35], // Dark granite
      [0.85, 0.88, 0.92], // White concrete / glass
    ];

    const dtBlocks = [
      { bx: 30, bz: -30, bw: 42, bd: 42 },
      { bx: 100, bz: -30, bw: 46, bd: 42 },
      { bx: 180, bz: -30, bw: 44, bd: 44 },
      { bx: 30, bz: -100, bw: 42, bd: 46 },
      { bx: 100, bz: -100, bw: 48, bd: 48 },
      { bx: 180, bz: -100, bw: 44, bd: 46 },
      { bx: 30, bz: -180, bw: 44, bd: 44 },
      { bx: 100, bz: -180, bw: 46, bd: 46 },
      { bx: 180, bz: -180, bw: 42, bd: 44 },
    ];

    for (const b of dtBlocks) {
      // Each block can have 1-2 major towers
      const h = 45 + ((Math.abs(b.bx * 13 + b.bz * 7)) % 75); // 45m to 120m skyscraper
      const col = downtownColors[(Math.abs(b.bx + b.bz)) % downtownColors.length];
      addBuilding(b.bx, b.bz, b.bw, b.bd, h, 'skyscraper', col, [0.15, 0.18, 0.22], 'downtown');
    }

    // 2. OLD MARKET QUARTER (North-West: X < -10, Z < -10)
    // Brick, terracotta roofs, medium height (12m - 26m), vibrant artisan stalls
    const marketColors = [
      [0.68, 0.38, 0.28], // Terracotta
      [0.55, 0.32, 0.24], // Red brick
      [0.72, 0.62, 0.48], // Sandstone
      [0.62, 0.52, 0.42], // Aged stucco
      [0.78, 0.70, 0.58], // Warm cream
    ];

    const mqBlocks = [
      { bx: -30, bz: -30, bw: 40, bd: 40 },
      { bx: -100, bz: -30, bw: 44, bd: 42 },
      { bx: -180, bz: -30, bw: 42, bd: 44 },
      { bx: -30, bz: -100, bw: 42, bd: 44 },
      { bx: -100, bz: -100, bw: 44, bd: 44 },
      { bx: -180, bz: -100, bw: 42, bd: 42 },
      { bx: -30, bz: -180, bw: 40, bd: 42 },
      { bx: -100, bz: -180, bw: 44, bd: 44 },
      { bx: -180, bz: -180, bw: 42, bd: 40 },
    ];

    for (const b of mqBlocks) {
      const h = 14 + ((Math.abs(b.bx * 7 + b.bz * 11)) % 16); // 14m to 30m
      const col = marketColors[(Math.abs(b.bx * 3 + b.bz)) % marketColors.length];
      addBuilding(b.bx, b.bz, b.bw, b.bd, h, 'market', col, [0.45, 0.22, 0.15], 'market');
    }

    // 3. MERIDIAN SHIPPING DOCKS (South-East: X > 10, Z > 10)
    // Industrial warehouses, shipping container stacks, gantry crane, oil tanks
    const dockBlocks = [
      { bx: 30, bz: 30, bw: 42, bd: 42, type: 'warehouse', h: 16 },
      { bx: 100, bz: 30, bw: 46, bd: 44, type: 'warehouse', h: 18 },
      { bx: 180, bz: 30, bw: 44, bd: 44, type: 'depot', h: 15 },
      { bx: 30, bz: 100, bw: 44, bd: 44, type: 'warehouse', h: 18 },
      { bx: 100, bz: 100, bw: 46, bd: 44, type: 'compound', h: 22 },
      { bx: 180, bz: 100, bw: 44, bd: 46, type: 'hangar', h: 18 },
      { bx: 30, bz: 180, bw: 42, bd: 42, type: 'storage', h: 16 },
      { bx: 100, bz: 180, bw: 46, bd: 46, type: 'pier_wharf', h: 14 },
      { bx: 180, bz: 180, bw: 44, bd: 44, type: 'terminal', h: 20 },
    ];

    for (const b of dockBlocks) {
      addBuilding(b.bx, b.bz, b.bw, b.bd, b.h, b.type, [0.38, 0.40, 0.44], [0.25, 0.27, 0.30], 'docks');
    }

    // Add shipping container stacks in Docks
    const containerColors = [
      [0.82, 0.18, 0.15], // Crimson red
      [0.15, 0.45, 0.85], // Ocean blue
      [0.88, 0.72, 0.12], // Gold yellow
      [0.18, 0.65, 0.42], // Teal / emerald
      [0.85, 0.45, 0.15], // Orange
    ];

    const cCoords = [
      { x: 145, z: 145 }, { x: 155, z: 145 }, { x: 165, z: 145 },
      { x: 145, z: 155 }, { x: 155, z: 155 }, { x: 165, z: 155 },
      { x: 75, z: 145 }, { x: 85, z: 145 }, { x: 75, z: 155 },
      { x: 145, z: 75 }, { x: 155, z: 75 }, { x: 145, z: 85 },
      { x: 205, z: 145 }, { x: 215, z: 145 }, { x: 205, z: 155 },
    ];

    for (let i = 0; i < cCoords.length; i++) {
      const c = cCoords[i];
      const stackH = 1 + (i % 3); // 1 to 3 containers high
      for (let layer = 0; layer < stackH; layer++) {
        const col = containerColors[(i + layer) % containerColors.length];
        this.containerStacks.push({
          x: c.x, y: layer * 3.2, z: c.z,
          w: 6.5, h: 3.0, d: 3.2,
          color: col
        });
      }
    }

    // 4. OCEAN PROMENADE & BEACH (South-West: X < -10, Z > 10)
    // Low-rise beach villas, luxury hotels, palm trees, golden beach
    const beachBlocks = [
      { bx: -30, bz: 30, bw: 42, bd: 40, h: 20, col: [0.92, 0.88, 0.80] },
      { bx: -100, bz: 30, bw: 44, bd: 42, h: 24, col: [0.85, 0.82, 0.78] },
      { bx: -180, bz: 30, bw: 42, bd: 42, h: 18, col: [0.88, 0.85, 0.82] },
      { bx: -30, bz: 100, bw: 40, bd: 44, h: 22, col: [0.90, 0.86, 0.80] },
      { bx: -100, bz: 100, bw: 44, bd: 44, h: 26, col: [0.86, 0.84, 0.80] },
      { bx: -180, bz: 100, bw: 42, bd: 42, h: 16, col: [0.92, 0.89, 0.84] },
      // The outer edge (-220 to -260 and 220 to 260) is the open beachfront & boardwalk!
    ];

    for (const b of beachBlocks) {
      addBuilding(b.bx, b.bz, b.bw, b.bd, b.h, 'resort', b.col, [0.45, 0.48, 0.52], 'promenade');
    }
  }

  generateProps() {
    // Palm trees along Ocean Promenade and central avenues
    for (let x = -240; x <= -20; x += 18) {
      this.palmTrees.push({ x: x, z: 18, scale: 1.0 + Math.random() * 0.2 });
      this.palmTrees.push({ x: x, z: 240, scale: 1.1 + Math.random() * 0.2 });
    }
    for (let z = 20; z <= 240; z += 18) {
      this.palmTrees.push({ x: -18, z: z, scale: 1.0 + Math.random() * 0.2 });
      this.palmTrees.push({ x: -245, z: z, scale: 1.2 + Math.random() * 0.3 });
    }

    // Downtown palm plazas
    for (let x = 20; x <= 220; x += 30) {
      this.palmTrees.push({ x: x, z: -18, scale: 1.0 });
    }
  }

  buildTrafficWaypoints() {
    // Generate navigation nodes along road lines
    const coords = [-220, -140, -60, 0, 60, 140, 220];
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
      // Closest point on AABB
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

    // World boundary
    if (x < this.bounds.minX + radius) return { collided: true, pushX: this.bounds.minX + radius - x, pushZ: 0 };
    if (x > this.bounds.maxX - radius) return { collided: true, pushX: this.bounds.maxX - radius - x, pushZ: 0 };
    if (z < this.bounds.minZ + radius) return { collided: true, pushX: 0, pushZ: this.bounds.minZ + radius - z };
    if (z > this.bounds.maxZ - radius) return { collided: true, pushX: 0, pushZ: this.bounds.maxZ - radius - z };

    return { collided: false, pushX: 0, pushZ: 0 };
  }

  raycast(x0, z0, x1, z1) {
    // Simple line intersection test vs building boxes
    const dx = x1 - x0;
    const dz = z1 - z0;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(dist / 1.5);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t;
      const pz = z0 + dz * t;
      const col = this.checkCollision(px, pz, 0.4);
      if (col.collided) {
        return { hit: true, x: px, z: pz, dist: dist * t };
      }
    }
    return { hit: false, x: x1, z: z1, dist };
  }
}

export const world = new CityWorld();
