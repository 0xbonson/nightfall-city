/**
 * Nightfall City: Vela Bay - Procedural Open World & District Generator
 * Authored by makefun agent for the GTA 6 bounty challenge.
 *
 * Generates an expansive, high-density coastal metropolis:
 * - Downtown Financial District: Soaring glass curtain skyscrapers, setbacks, illuminated crowns, helipads, antennas
 * - Ocean Promenade: Vibrant Art Deco coastal resorts, tiered pastel balconies, beachfront boardwalk, palm boulevards
 * - Old Town Quarter: Warm terracotta and sandstone facades, storefront awnings, historic arches, pedestrian plazas
 * - Meridian Cargo Docks: Heavy industrial concrete aprons, vivid multicolored shipping container stacks, 36m gantry crane
 * - Marina Waterfront: Weathered timber piers, moored luxury motor yachts, shoreline wave breaks
 * - Elevated Skyway: Multi-lane elevated concrete expressway with overpass ramps and overhanging highway signs
 * - Verdant Parks: Lush green lawns, tropical palm groves, street furniture, fire hydrants, decorative lampposts
 */

import { WORLD, DISTRICTS } from './config.js';

export class World {
  constructor() {
    this.colliders = []; // AABB array: { minX, maxX, minZ, maxZ, height, type }
    this.roadNodes = []; // Traffic navigation graph nodes
    this.roadSegments = [];
    this.props = [];
    this.spawns = {
      player: [68, 0, -68],
      vehicles: [],
      pedestrians: [],
    };

    // Vertex buffer arrays for static world geometry batch
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.uvs = [];

    // Water vertex data (separate batch for animated wave displacement)
    this.waterPositions = [];
    this.waterNormals = [];
    this.waterColors = [];
    this.waterUvs = [];

    this.generate();
  }

  generate() {
    this.generateTerrainAndSea();
    this.generateRoadGrid();
    this.generateElevatedSkyway();
    this.generateCityBlocks();
    this.generateParksAndPlazas();
    this.generateMarinaAndWaterfront();
    this.generateDocksAndCranes();
    this.generatePropsAndStreetFurniture();
  }

  // --- Geometry Construction Primitives ---

  addQuad(p1, p2, p3, p4, normal, color, uvScale = [1, 1]) {
    const pts = [p1, p2, p3, p1, p3, p4];
    const uvCoords = [
      [0, 0], [uvScale[0], 0], [uvScale[0], uvScale[1]],
      [0, 0], [uvScale[0], uvScale[1]], [0, uvScale[1]],
    ];

    for (let i = 0; i < 6; i++) {
      this.positions.push(pts[i][0], pts[i][1], pts[i][2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.colors.push(color[0], color[1], color[2], color[3] !== undefined ? color[3] : 1.0);
      this.uvs.push(uvCoords[i][0], uvCoords[i][1]);
    }
  }

  addBox(x, y, z, sx, sy, sz, color, uvScale = [1, 1], addCollider = true) {
    const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
    const cy = y + hy;

    // Top face (+Y)
    this.addQuad(
      [x - hx, cy + hy, z - hz],
      [x + hx, cy + hy, z - hz],
      [x + hx, cy + hy, z + hz],
      [x - hx, cy + hy, z + hz],
      [0, 1, 0], color, [sx * uvScale[0], sz * uvScale[1]]
    );

    // Bottom face (-Y)
    this.addQuad(
      [x - hx, cy - hy, z + hz],
      [x + hx, cy - hy, z + hz],
      [x + hx, cy - hy, z - hz],
      [x - hx, cy - hy, z - hz],
      [0, -1, 0], color, [sx * uvScale[0], sz * uvScale[1]]
    );

    // Front face (+Z)
    this.addQuad(
      [x - hx, cy - hy, z + hz],
      [x + hx, cy - hy, z + hz],
      [x + hx, cy + hy, z + hz],
      [x - hx, cy + hy, z + hz],
      [0, 0, 1], color, [sx * uvScale[0], sy * uvScale[1]]
    );

    // Back face (-Z)
    this.addQuad(
      [x + hx, cy - hy, z - hz],
      [x - hx, cy - hy, z - hz],
      [x - hx, cy + hy, z - hz],
      [x + hx, cy + hy, z - hz],
      [0, 0, -1], color, [sx * uvScale[0], sy * uvScale[1]]
    );

    // Right face (+X)
    this.addQuad(
      [x + hx, cy - hy, z + hz],
      [x + hx, cy - hy, z - hz],
      [x + hx, cy + hy, z - hz],
      [x + hx, cy + hy, z + hz],
      [1, 0, 0], color, [sz * uvScale[0], sy * uvScale[1]]
    );

    // Left face (-X)
    this.addQuad(
      [x - hx, cy - hy, z - hz],
      [x - hx, cy - hy, z + hz],
      [x - hx, cy + hy, z + hz],
      [x - hx, cy + hy, z - hz],
      [-1, 0, 0], color, [sz * uvScale[0], sy * uvScale[1]]
    );

    if (addCollider && y < 3.0) {
      this.colliders.push({
        minX: x - hx, maxX: x + hx,
        minZ: z - hz, maxZ: z + hz,
        height: sy,
        yBottom: y,
      });
    }
  }

  // --- Generation Procedures ---

  generateTerrainAndSea() {
    // City ground base slab - clean light asphalt/concrete foundation
    const groundColor = [0.26, 0.28, 0.32, 1.0];
    this.addQuad(
      [WORLD.COAST_X, 0, -WORLD.HALF_SIZE],
      [WORLD.HALF_SIZE, 0, -WORLD.HALF_SIZE],
      [WORLD.HALF_SIZE, 0, WORLD.HALF_SIZE],
      [WORLD.COAST_X, 0, WORLD.HALF_SIZE],
      [0, 1, 0], groundColor, [100, 100]
    );

    // Turquoise & Azure Ocean Water Mesh
    const oceanColor = [0.08, 0.48, 0.68, 0.94];
    const waterMinX = -WORLD.HALF_SIZE - 200;
    const waterMaxX = WORLD.COAST_X + 2;
    const waterMinZ = -WORLD.HALF_SIZE - 100;
    const waterMaxZ = WORLD.HALF_SIZE + 100;

    const segsX = 26;
    const segsZ = 26;
    const dx = (waterMaxX - waterMinX) / segsX;
    const dz = (waterMaxZ - waterMinZ) / segsZ;

    for (let ix = 0; ix < segsX; ix++) {
      for (let iz = 0; iz < segsZ; iz++) {
        const x0 = waterMinX + ix * dx;
        const x1 = x0 + dx;
        const z0 = waterMinZ + iz * dz;
        const z1 = z0 + dz;

        const pts = [
          [x0, WORLD.SEA_LEVEL, z0],
          [x1, WORLD.SEA_LEVEL, z0],
          [x1, WORLD.SEA_LEVEL, z1],
          [x0, WORLD.SEA_LEVEL, z0],
          [x1, WORLD.SEA_LEVEL, z1],
          [x0, WORLD.SEA_LEVEL, z1],
        ];

        for (let p = 0; p < 6; p++) {
          this.waterPositions.push(pts[p][0], pts[p][1], pts[p][2]);
          this.waterNormals.push(0, 1, 0);
          this.waterColors.push(oceanColor[0], oceanColor[1], oceanColor[2], oceanColor[3]);
          this.waterUvs.push(pts[p][0] * 0.04, pts[p][2] * 0.04);
        }
      }
    }

    // Coastal Seawall & Granite Revetment along shoreline
    const seawallColor = [0.52, 0.54, 0.58, 1.0];
    this.addBox(WORLD.COAST_X, -2.5, 0, 3.4, 5.0, WORLD.SIZE, seawallColor, [1, 1], true);
  }

  generateRoadGrid() {
    const northSouthRoads = [-105, -55, 0, 45, 115, 185];
    const eastWestRoads = [-180, -115, -50, 20, 85, 150, 215];

    // Rich warm asphalt (bright enough to reflect golden sunlight, never murky black)
    const asphaltColor = [0.28, 0.29, 0.33, 1.0];
    const markingYellow = [1.0, 0.85, 0.15, 1.0]; // High-vis golden amber centerline
    const markingWhite = [0.96, 0.96, 0.98, 1.0]; // Bright white lane boundaries
    const sidewalkColor = [0.76, 0.78, 0.82, 1.0]; // Clean sunlit concrete sidewalks

    // North-South Avenues
    for (const rx of northSouthRoads) {
      if (rx < WORLD.COAST_X) continue;

      // Roadway bed
      this.addBox(rx, 0.02, 0, WORLD.ROAD_WIDTH, 0.04, WORLD.SIZE, asphaltColor, [1, 1], false);

      // Golden centerline dashes
      const dashLen = 4.2;
      const gapLen = 3.8;
      for (let z = -WORLD.HALF_SIZE; z < WORLD.HALF_SIZE; z += dashLen + gapLen) {
        this.addBox(rx, 0.05, z + dashLen * 0.5, 0.30, 0.02, dashLen, markingYellow, [1, 1], false);
      }

      // Outer boundary white road lines
      const hw = WORLD.ROAD_WIDTH * 0.5 - 0.7;
      this.addBox(rx - hw, 0.05, 0, 0.24, 0.02, WORLD.SIZE, markingWhite, [1, 1], false);
      this.addBox(rx + hw, 0.05, 0, 0.24, 0.02, WORLD.SIZE, markingWhite, [1, 1], false);

      // Flanking raised pedestrian sidewalks
      const swW = 3.8;
      this.addBox(rx - hw - swW * 0.5, 0, 0, swW, WORLD.CURB_HEIGHT, WORLD.SIZE, sidewalkColor, [1, 1], false);
      this.addBox(rx + hw + swW * 0.5, 0, 0, swW, WORLD.CURB_HEIGHT, WORLD.SIZE, sidewalkColor, [1, 1], false);
    }

    // East-West Cross Streets
    for (const rz of eastWestRoads) {
      const roadStartX = WORLD.COAST_X + 2;
      const roadLen = WORLD.HALF_SIZE - roadStartX;
      const roadMidX = roadStartX + roadLen * 0.5;

      this.addBox(roadMidX, 0.02, rz, roadLen, 0.04, WORLD.ROAD_WIDTH, asphaltColor, [1, 1], false);

      // Golden centerline dashes
      const dashLen = 4.2;
      const gapLen = 3.8;
      for (let x = roadStartX; x < WORLD.HALF_SIZE; x += dashLen + gapLen) {
        this.addBox(x + dashLen * 0.5, 0.05, rz, dashLen, 0.02, 0.30, markingYellow, [1, 1], false);
      }

      // Outer boundary white stripes
      const hw = WORLD.ROAD_WIDTH * 0.5 - 0.7;
      this.addBox(roadMidX, 0.05, rz - hw, roadLen, 0.02, 0.24, markingWhite, [1, 1], false);
      this.addBox(roadMidX, 0.05, rz + hw, roadLen, 0.02, 0.24, markingWhite, [1, 1], false);
    }

    // Intersections and Crosswalk zebra stripes
    for (const rx of northSouthRoads) {
      for (const rz of eastWestRoads) {
        this.roadNodes.push({ x: rx, z: rz, y: 0 });

        const rw = WORLD.ROAD_WIDTH * 0.5;
        this.addCrosswalk(rx, rz - rw - 2.2, true);
        this.addCrosswalk(rx, rz + rw + 2.2, true);
        this.addCrosswalk(rx - rw - 2.2, rz, false);
        this.addCrosswalk(rx + rw + 2.2, rz, false);
      }
    }
  }

  addCrosswalk(x, z, isHorizontal) {
    const white = [0.96, 0.96, 0.98, 1.0];
    const count = 7;
    const stripeW = 0.85;
    const stripeGap = 0.75;
    const totalSpan = count * stripeW + (count - 1) * stripeGap;
    const start = -totalSpan * 0.5;

    for (let i = 0; i < count; i++) {
      const offset = start + i * (stripeW + stripeGap) + stripeW * 0.5;
      if (isHorizontal) {
        this.addBox(x + offset, 0.06, z, stripeW, 0.02, 3.2, white, [1, 1], false);
      } else {
        this.addBox(x, 0.06, z + offset, 3.2, 0.02, stripeW, white, [1, 1], false);
      }
    }
  }

  generateElevatedSkyway() {
    const overpassY = WORLD.OVERPASS_Y;
    const overpassW = WORLD.OVERPASS_WIDTH;
    const overpassLen = WORLD.OVERPASS_Z_END - WORLD.OVERPASS_Z_START;
    const overpassZMid = (WORLD.OVERPASS_Z_START + WORLD.OVERPASS_Z_END) * 0.5;

    const concreteDeck = [0.55, 0.58, 0.62, 1.0];
    const highwayAsphalt = [0.30, 0.32, 0.36, 1.0];
    const barrierColor = [0.82, 0.84, 0.88, 1.0];
    const pillarColor = [0.46, 0.48, 0.52, 1.0];

    // Main overpass deck
    this.addBox(WORLD.OVERPASS_X, overpassY, overpassZMid, overpassW, 1.3, overpassLen, concreteDeck, [1, 1], true);
    this.addBox(WORLD.OVERPASS_X, overpassY + 0.66, overpassZMid, overpassW - 1.2, 0.04, overpassLen, highwayAsphalt, [1, 1], false);

    // Left & Right crash barriers
    const hw = overpassW * 0.5;
    this.addBox(WORLD.OVERPASS_X - hw + 0.35, overpassY + 1.2, overpassZMid, 0.7, 1.2, overpassLen, barrierColor, [1, 1], true);
    this.addBox(WORLD.OVERPASS_X + hw - 0.35, overpassY + 1.2, overpassZMid, 0.7, 1.2, overpassLen, barrierColor, [1, 1], true);

    // Structural support pillars
    for (let z = WORLD.OVERPASS_Z_START + 18; z < WORLD.OVERPASS_Z_END; z += 38) {
      this.addBox(WORLD.OVERPASS_X - 9.5, 0, z, 2.0, overpassY, 2.0, pillarColor, [1, 1], true);
      this.addBox(WORLD.OVERPASS_X + 9.5, 0, z, 2.0, overpassY, 2.0, pillarColor, [1, 1], true);
      this.addBox(WORLD.OVERPASS_X, overpassY - 0.65, z, overpassW + 3.2, 1.3, 2.6, pillarColor, [1, 1], false);
    }

    // Skyway highway exit ramps
    const rampLen = 48;
    this.addBox(WORLD.OVERPASS_X, overpassY * 0.5, WORLD.OVERPASS_Z_START - rampLen * 0.5, overpassW, overpassY, rampLen, concreteDeck, [1, 1], true);
    this.addBox(WORLD.OVERPASS_X, overpassY * 0.5, WORLD.OVERPASS_Z_END + rampLen * 0.5, overpassW, overpassY, rampLen, concreteDeck, [1, 1], true);
  }

  generateCityBlocks() {
    const sidewalkColor = [0.76, 0.78, 0.82, 1.0];

    // 1. Downtown High-Rise Skyscraper District
    this.buildDowntownTowers(sidewalkColor);

    // 2. Old Town Historic Quarter
    this.buildOldTown(sidewalkColor);

    // 3. Ocean Promenade Resort Strip
    this.buildPromenade(sidewalkColor);
  }

  buildDowntownTowers(sidewalkColor) {
    const blockDefs = [
      { xMid: 22.5, width: 28 },
      { xMid: 80.0, width: 50 },
      { xMid: 150.0, width: 50 },
    ];
    const rowDefs = [
      { zMid: -214.5, length: 47 },
      { zMid: -147.5, length: 47 },
      { zMid: -82.5, length: 47 },
    ];

    // Rich glass facade palette
    const towerPalettes = [
      { body: [0.28, 0.48, 0.70, 1.0], trim: [0.85, 0.90, 0.95, 1.0], crown: [0.95, 0.75, 0.20, 1.0] }, // Sapphire Glass
      { body: [0.24, 0.58, 0.68, 1.0], trim: [0.78, 0.88, 0.92, 1.0], crown: [0.20, 0.85, 0.95, 1.0] }, // Cyan Mirror
      { body: [0.65, 0.52, 0.38, 1.0], trim: [0.90, 0.80, 0.65, 1.0], crown: [1.0, 0.60, 0.25, 1.0] },  // Champagne Bronze
      { body: [0.72, 0.74, 0.78, 1.0], trim: [0.35, 0.40, 0.48, 1.0], crown: [0.95, 0.25, 0.20, 1.0] },  // Platinum Silver
      { body: [0.32, 0.36, 0.45, 1.0], trim: [0.88, 0.88, 0.92, 1.0], crown: [0.45, 0.80, 1.0, 1.0] },   // Obsidian Cobalt
    ];

    let pIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        // Sidewalk plaza base
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false);

        const pal = towerPalettes[(pIdx++) % towerPalettes.length];
        const height = 58 + ((Math.abs(Math.floor(bx.xMid * 9 + bz.zMid * 17))) % 56);

        // Ground podium floor
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT, bz.zMid, bx.width - 4, 6.0, bz.length - 4, pal.trim, [0.5, 0.5], true);

        // Main tower body
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + 6.0, bz.zMid, bx.width - 7, height - 6.0, bz.length - 7, pal.body, [0.25, 0.25], true);

        // Illuminated architectural setback crown
        if (height > 65) {
          const tierH = 24;
          const tierW = Math.max(14, bx.width - 15);
          const tierL = Math.max(14, bz.length - 15);
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height, bz.zMid, tierW, tierH, tierL, pal.trim, [0.2, 0.2], true);

          // Helipad or rooftop beacon
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + tierH, bz.zMid, 12, 0.7, 12, pal.crown, [1, 1], false);
          // Communications Mast
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + tierH + 0.7, bz.zMid, 0.9, 16, 0.9, [0.95, 0.25, 0.25, 1.0], [1, 1], false);
        }

        // Grand glass entrance portico / canopy
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + 4.2, bz.zMid - bz.length * 0.5 + 2.8, Math.min(22, bx.width - 8), 0.45, 5.0, [0.20, 0.25, 0.32, 1.0], [1, 1], false);
      }
    }
  }

  buildOldTown(sidewalkColor) {
    const blockDefs = [
      { xMid: -80.0, width: 32 },
      { xMid: -27.5, width: 37 },
    ];
    const rowDefs = [
      { zMid: -214.5, length: 47 },
      { zMid: -147.5, length: 47 },
      { zMid: -82.5, length: 47 },
    ];

    const facadeColors = [
      [0.82, 0.38, 0.25, 1.0], // Terracotta Rust
      [0.90, 0.72, 0.42, 1.0], // Mediterranean Ochre
      [0.85, 0.82, 0.72, 1.0], // Cream Travertine
      [0.55, 0.68, 0.52, 1.0], // Tuscan Sage Green
      [0.78, 0.45, 0.40, 1.0], // Coral Rose
    ];

    let cIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false);

        const subH1 = 18 + ((Math.abs(Math.floor(bx.xMid))) % 10);
        const subH2 = 15 + ((Math.abs(Math.floor(bz.zMid))) % 8);
        const col1 = facadeColors[(cIdx++) % facadeColors.length];
        const col2 = facadeColors[(cIdx++) % facadeColors.length];

        // West townhouse
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT, bz.zMid, bx.width * 0.46, subH1, bz.length - 6, col1, [0.4, 0.4], true);
        // East townhouse
        this.addBox(bx.xMid + bx.width * 0.22, WORLD.CURB_HEIGHT, bz.zMid, bx.width * 0.46, subH2, bz.length - 6, col2, [0.4, 0.4], true);

        // Storefront awnings & decorative roof cornices
        const awningCol = [0.22, 0.55, 0.35, 1.0];
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT + 3.4, bz.zMid - bz.length * 0.5 + 2.5, bx.width * 0.42, 0.35, 3.2, awningCol, [1, 1], false);
        this.addBox(bx.xMid + bx.width * 0.22, WORLD.CURB_HEIGHT + 3.4, bz.zMid - bz.length * 0.5 + 2.5, bx.width * 0.42, 0.35, 3.2, [0.85, 0.22, 0.20, 1.0], [1, 1], false);
      }
    }
  }

  buildPromenade(sidewalkColor) {
    const blockDefs = [
      { xMid: -80.0, width: 32 },
      { xMid: -27.5, width: 37 },
    ];
    const rowDefs = [
      { zMid: 52.5, length: 47 },
      { zMid: 117.5, length: 47 },
      { zMid: 182.5, length: 47 },
    ];

    // Miami Art Deco Pastel Palettes
    const resortPalettes = [
      [0.96, 0.96, 0.98, 1.0], // Brilliant White
      [0.60, 0.88, 0.84, 1.0], // Coastal Aqua Mint
      [0.96, 0.70, 0.65, 1.0], // Pastel Coral Pink
      [0.98, 0.86, 0.65, 1.0], // Warm Sunset Peach
    ];

    let rIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false);

        const height = 30 + ((Math.abs(Math.floor(bx.xMid * 5 + bz.zMid * 7))) % 24);
        const col = resortPalettes[(rIdx++) % resortPalettes.length];

        this.addBox(bx.xMid, WORLD.CURB_HEIGHT, bz.zMid, bx.width - 6, height, bz.length - 6, col, [0.35, 0.35], true);

        // Tiered cantilevered balcony ribbons
        const balconyWhite = [1.0, 1.0, 1.0, 1.0];
        for (let y = WORLD.CURB_HEIGHT + 4.5; y < height; y += 4.5) {
          this.addBox(bx.xMid, y, bz.zMid - bz.length * 0.5 + 2.5, bx.width - 8, 0.40, 2.0, balconyWhite, [1, 1], false);
        }
      }
    }
  }

  generateParksAndPlazas() {
    // Lush central green park plaza at X = 80, Z = 52.5
    const grassGreen = [0.26, 0.68, 0.30, 1.0];
    const fountainBlue = [0.15, 0.55, 0.75, 1.0];

    // Park lawn pad
    this.addBox(80.0, WORLD.CURB_HEIGHT, 52.5, 46, 0.25, 44, grassGreen, [4, 4], false);

    // Decorative central reflecting fountain basin
    this.addBox(80.0, WORLD.CURB_HEIGHT + 0.3, 52.5, 14, 0.65, 14, [0.75, 0.78, 0.82, 1.0], [1, 1], true);
    this.addBox(80.0, WORLD.CURB_HEIGHT + 0.6, 52.5, 12, 0.35, 12, fountainBlue, [1, 1], false);

    // Palm trees in park corners
    this.addPalmTree(65, WORLD.CURB_HEIGHT, 38);
    this.addPalmTree(95, WORLD.CURB_HEIGHT, 38);
    this.addPalmTree(65, WORLD.CURB_HEIGHT, 67);
    this.addPalmTree(95, WORLD.CURB_HEIGHT, 67);
  }

  generateMarinaAndWaterfront() {
    // Broad seaside promenade boardwalk
    const timberColor = [0.65, 0.50, 0.36, 1.0]; // Warm sunlit cedar boardwalk
    const railingColor = [0.94, 0.96, 0.98, 1.0];

    // Main boardwalk along coast
    this.addBox(-122, 0.28, 0, 15, 0.55, WORLD.SIZE * 0.92, timberColor, [1, 2], false);

    // Chrome / white promenade pedestrian safety railing
    this.addBox(-128.5, 0.95, 0, 0.3, 0.85, WORLD.SIZE * 0.92, railingColor, [1, 1], true);

    // Marina boat slips & wooden jetties
    const pierZList = [-150, -70, 60, 140];
    const pierLen = 44;
    const pierW = 7.0;

    for (const pz of pierZList) {
      this.addBox(WORLD.COAST_X - pierLen * 0.5, 0.24, pz, pierLen, 0.45, pierW, timberColor, [2, 1], false);

      // Moored luxury powerboats & yachts
      this.addBoat(WORLD.COAST_X - 24, -0.2, pz + 8.0);
    }
  }

  addBoat(x, y, z) {
    const hullWhite = [0.96, 0.96, 0.98, 1.0];
    const cabinNavy = [0.12, 0.32, 0.58, 1.0];
    const glassTint = [0.10, 0.18, 0.28, 1.0];

    // Hull
    this.addBox(x, y + 0.6, z, 13, 1.25, 4.2, hullWhite, [1, 1], true);
    // Cabin
    this.addBox(x - 1.2, y + 1.7, z, 6.0, 1.1, 3.0, cabinNavy, [1, 1], false);
    // Windshield
    this.addBox(x + 2.2, y + 1.6, z, 1.4, 0.85, 2.8, glassTint, [1, 1], false);
  }

  generateDocksAndCranes() {
    // Meridian Cargo Docks in South-East district
    const dockApron = [0.36, 0.38, 0.42, 1.0];
    this.addBox(140, 0.08, 140, 160, 0.16, 160, dockApron, [1, 1], false);

    // Safety yellow & black hazard boundary strip along wharf
    const hazardYellow = [1.0, 0.82, 0.08, 1.0];
    this.addBox(140, 0.18, 220, 160, 0.04, 1.8, hazardYellow, [1, 1], false);
    this.addBox(220, 0.18, 140, 1.8, 0.04, 160, hazardYellow, [1, 1], false);

    // Deep harbor ocean water basin
    const harborColor = [0.06, 0.42, 0.58, 0.95];
    const bMinX = 222, bMaxX = WORLD.HALF_SIZE + 80;
    const bMinZ = 60, bMaxZ = WORLD.HALF_SIZE + 80;
    const bPts = [
      [bMinX, WORLD.SEA_LEVEL, bMinZ],
      [bMaxX, WORLD.SEA_LEVEL, bMinZ],
      [bMaxX, WORLD.SEA_LEVEL, bMaxZ],
      [bMinX, WORLD.SEA_LEVEL, bMinZ],
      [bMaxX, WORLD.SEA_LEVEL, bMaxZ],
      [bMinX, WORLD.SEA_LEVEL, bMaxZ],
    ];
    for (let p = 0; p < 6; p++) {
      this.waterPositions.push(bPts[p][0], bPts[p][1], bPts[p][2]);
      this.waterNormals.push(0, 1, 0);
      this.waterColors.push(harborColor[0], harborColor[1], harborColor[2], harborColor[3]);
      this.waterUvs.push(bPts[p][0] * 0.04, bPts[p][2] * 0.04);
    }

    // Moored Cargo Container Ship
    this.addBox(244, -1.0, 160, 24, 7.0, 80, [0.22, 0.24, 0.28, 1.0], [1, 1], true);
    this.addBox(244, 6.0, 128, 16, 8.5, 20, [0.92, 0.92, 0.95, 1.0], [1, 1], true);

    // Cargo Warehouses
    const whColor = [0.42, 0.45, 0.50, 1.0];
    const whRoof = [0.65, 0.30, 0.22, 1.0];
    this.addBox(80, 0, 70, 38, 14, 32, whColor, [0.2, 0.2], true);
    this.addBox(80, 14, 70, 40, 2.6, 34, whRoof, [1, 1], false);

    this.addBox(80, 0, 150, 38, 14, 32, whColor, [0.2, 0.2], true);
    this.addBox(80, 14, 150, 40, 2.6, 34, whRoof, [1, 1], false);

    // Multi-tier shipping container stacks (high chroma vivid colors)
    const containerColors = [
      [0.88, 0.18, 0.15, 1.0], // Crimson Red
      [0.15, 0.50, 0.88, 1.0], // Ocean Blue
      [0.98, 0.55, 0.10, 1.0], // High-Vis Orange
      [0.18, 0.65, 0.35, 1.0], // Jade Green
      [0.95, 0.82, 0.15, 1.0], // Industrial Yellow
    ];

    const cW = 2.65, cL = 7.2, cH = 2.65;
    let colIdx = 0;
    for (let row = 0; row < 5; row++) {
      for (let stackZ = 0; stackZ < 4; stackZ++) {
        const cx = 135 + row * 4.3;
        const cz = 95 + stackZ * 9.8;
        const layers = 1 + ((row + stackZ) % 3);

        for (let l = 0; l < layers; l++) {
          const col = containerColors[(colIdx++) % containerColors.length];
          this.addBox(cx, l * cH, cz, cW, cH, cL, col, [1, 1], true);
        }
      }
    }

    // Massive 36m Industrial Gantry Crane
    this.buildGantryCrane(150, 0, 155);
  }

  buildGantryCrane(x, y, z) {
    const craneYellow = [1.0, 0.78, 0.08, 1.0]; // Bright industrial yellow
    const metalDark = [0.26, 0.28, 0.32, 1.0];

    const height = 36;
    const spanW = 28;
    const depthL = 19;

    const hw = spanW * 0.5;
    const hl = depthL * 0.5;

    // 4 legs
    this.addBox(x - hw, y, z - hl, 1.9, height, 1.9, craneYellow, [1, 1], true);
    this.addBox(x + hw, y, z - hl, 1.9, height, 1.9, craneYellow, [1, 1], true);
    this.addBox(x - hw, y, z + hl, 1.9, height, 1.9, craneYellow, [1, 1], true);
    this.addBox(x + hw, y, z + hl, 1.9, height, 1.9, craneYellow, [1, 1], true);

    // Cross braces
    this.addBox(x - hw, y + height * 0.5, z, 1.3, 1.3, depthL, craneYellow, [1, 1], false);
    this.addBox(x + hw, y + height * 0.5, z, 1.3, 1.3, depthL, craneYellow, [1, 1], false);

    // Overhead gantry boom
    this.addBox(x, y + height, z, spanW + 16, 3.4, 4.8, craneYellow, [1, 1], true);

    // Cab & Spreader
    this.addBox(x + 2, y + height - 2.8, z, 4.8, 2.6, 3.6, metalDark, [1, 1], false);
    this.addBox(x + 2, y + height - 12, z, 0.3, 10, 0.3, [0.15, 0.15, 0.15, 1.0], [1, 1], false);
    this.addBox(x + 2, y + height - 12, z, 3.2, 0.7, 6.2, metalDark, [1, 1], false);
  }

  generatePropsAndStreetFurniture() {
    // 1. Tropical Palm Trees along Coastal Ocean Promenade
    for (let z = -WORLD.HALF_SIZE + 25; z < WORLD.HALF_SIZE - 25; z += 18) {
      this.addPalmTree(-118, 0.3, z);
      this.addPalmTree(-90, 0.2, z);
    }

    // 2. Modern Street Lampposts with warm glowing fixtures
    const postColor = [0.42, 0.44, 0.48, 1.0];
    const lampGlow = [1.0, 0.92, 0.65, 1.0];

    const lampXList = [-105, 0, 45, 115];
    for (const lx of lampXList) {
      for (let lz = -220; lz <= 220; lz += 42) {
        this.addBox(lx + 8.5, 0, lz, 0.36, 8.4, 0.36, postColor, [1, 1], false);
        this.addBox(lx + 7.2, 8.2, lz, 2.8, 0.26, 0.26, postColor, [1, 1], false);
        this.addBox(lx + 5.9, 8.0, lz, 0.65, 0.28, 0.55, lampGlow, [1, 1], false);
      }
    }

    // 3. Fire Hydrants
    const hydrantRed = [0.96, 0.22, 0.18, 1.0];
    for (let z = -200; z <= 200; z += 65) {
      this.addBox(9.4, 0, z, 0.45, 0.95, 0.45, hydrantRed, [1, 1], true);
      this.addBox(-9.4, 0, z + 20, 0.45, 0.95, 0.45, hydrantRed, [1, 1], true);
    }
  }

  addPalmTree(x, y, z) {
    const trunkColor = [0.48, 0.36, 0.25, 1.0];
    const frondColor = [0.22, 0.68, 0.28, 1.0];

    const trunkH = 8.8;
    this.addBox(x, y, z, 0.70, trunkH, 0.70, trunkColor, [1, 1], true);

    const frondLen = 4.4;
    const frondW = 1.3;
    const topY = y + trunkH;
    const angles = [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75, Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];

    for (const ang of angles) {
      const fx = x + Math.cos(ang) * (frondLen * 0.45);
      const fz = z + Math.sin(ang) * (frondLen * 0.45);
      this.addBox(fx, topY - 0.4, fz, frondW, 0.16, frondLen * 0.92, frondColor, [1, 1], false);
    }
  }

  // --- Collision Query ---
  checkCollision(cx, cz, radius) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (cx + radius > c.minX && cx - radius < c.maxX &&
          cz + radius > c.minZ && cz - radius < c.maxZ) {
        const nx = Math.max(c.minX, Math.min(cx, c.maxX));
        const nz = Math.max(c.minZ, Math.min(cz, c.maxZ));
        const dx = cx - nx;
        const dz = cz - nz;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          const d = Math.sqrt(distSq);
          if (d > 0.0001) {
            const overlap = radius - d;
            return {
              collided: true,
              pushX: (dx / d) * overlap,
              pushZ: (dz / d) * overlap,
              collider: c,
            };
          } else {
            const pxLeft = cx - c.minX;
            const pxRight = c.maxX - cx;
            const pzTop = cz - c.minZ;
            const pzBottom = c.maxZ - cz;
            const minPen = Math.min(pxLeft, pxRight, pzTop, pzBottom);
            if (minPen === pxLeft) return { collided: true, pushX: -radius, pushZ: 0, collider: c };
            if (minPen === pxRight) return { collided: true, pushX: radius, pushZ: 0, collider: c };
            if (minPen === pzTop) return { collided: true, pushX: 0, pushZ: -radius, collider: c };
            return { collided: true, pushX: 0, pushZ: radius, collider: c };
          }
        }
      }
    }
    return { collided: false, pushX: 0, pushZ: 0 };
  }
}
