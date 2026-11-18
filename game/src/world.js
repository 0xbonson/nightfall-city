/**
 * Nightfall City: Vela Bay - City Procedural World Generator
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { WORLD, DISTRICTS } from './config.js';

export class World {
  constructor() {
    this.colliders = []; // Array of AABB { minX, maxX, minZ, maxZ, height, type }
    this.roadNodes = []; // Traffic navigation graph nodes
    this.roadSegments = [];
    this.props = [];
    this.spawns = {
      player: [68, 0, -68],
      vehicles: [],
      pedestrians: [],
    };

    // Vertex data arrays for static world mesh batch
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.uvs = [];

    // Water vertex data
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
    this.generateMarinaAndWaterfront();
    this.generateDocksAndCranes();
    this.generatePropsAndStreetFurniture();
  }

  // --- Geometry Construction Helpers ---

  addQuad(p1, p2, p3, p4, normal, color, uvScale = [1, 1]) {
    // Two triangles: p1-p2-p3, p1-p3-p4
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

  // --- World Generation Phases ---

  generateTerrainAndSea() {
    // City ground base slab (pavement & terrain)
    const baseColor = [0.18, 0.19, 0.22, 1.0];
    this.addQuad(
      [WORLD.COAST_X, 0, -WORLD.HALF_SIZE],
      [WORLD.HALF_SIZE, 0, -WORLD.HALF_SIZE],
      [WORLD.HALF_SIZE, 0, WORLD.HALF_SIZE],
      [WORLD.COAST_X, 0, WORLD.HALF_SIZE],
      [0, 1, 0], baseColor, [100, 100]
    );

    // Ocean water mesh (stretches westward towards horizon)
    const oceanColor = [0.06, 0.42, 0.58, 0.95];
    const waterMinX = -WORLD.HALF_SIZE - 180;
    const waterMaxX = WORLD.COAST_X + 2;
    const waterMinZ = -WORLD.HALF_SIZE - 80;
    const waterMaxZ = WORLD.HALF_SIZE + 80;

    // Subdivided water grid for vertex displacement in shader
    const segsX = 24;
    const segsZ = 24;
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
          this.waterUvs.push(pts[p][0] * 0.05, pts[p][2] * 0.05);
        }
      }
    }

    // Seawall & Promenade bulkhead barrier along coastline
    const seawallColor = [0.42, 0.42, 0.45, 1.0];
    this.addBox(WORLD.COAST_X, -2.5, 0, 3.2, 5.0, WORLD.SIZE, seawallColor, [1, 1], true);
  }

  generateRoadGrid() {
    // The main avenues and grid roads
    // Arterial roads:
    // 1. Coastal Boulevard at X = -105
    // 2. Central Avenue at X = 0
    // 3. Skyway Boulevard at X = 45
    // 4. East Boulevard at X = 115
    // 5. Port Avenue at X = 185
    // Cross streets along Z:
    // Z = -180, -115, -50, 20, 85, 150, 215

    const northSouthRoads = [-105, -55, 0, 45, 115, 185];
    const eastWestRoads = [-180, -115, -50, 20, 85, 150, 215];

    const asphaltColor = [0.12, 0.12, 0.14, 1.0];
    const markingYellow = [0.95, 0.78, 0.12, 1.0];
    const markingWhite = [0.92, 0.92, 0.94, 1.0];

    // North-South Roads
    for (const rx of northSouthRoads) {
      if (rx < WORLD.COAST_X) continue;
      // Road surface
      this.addBox(rx, 0.02, 0, WORLD.ROAD_WIDTH, 0.04, WORLD.SIZE, asphaltColor, [1, 1], false);

      // Yellow centerline (broken dashes)
      const dashLen = 4;
      const gapLen = 4;
      for (let z = -WORLD.HALF_SIZE; z < WORLD.HALF_SIZE; z += dashLen + gapLen) {
        this.addBox(rx, 0.05, z + dashLen * 0.5, 0.28, 0.02, dashLen, markingYellow, [1, 1], false);
      }

      // Outer lane white stripes
      const hw = WORLD.ROAD_WIDTH * 0.5 - 0.6;
      this.addBox(rx - hw, 0.05, 0, 0.22, 0.02, WORLD.SIZE, markingWhite, [1, 1], false);
      this.addBox(rx + hw, 0.05, 0, 0.22, 0.02, WORLD.SIZE, markingWhite, [1, 1], false);

      // Flanking raised sidewalk ribbons on east and west sides of road
      const swW = 3.6;
      const swColor = [0.68, 0.70, 0.74, 1.0];
      this.addBox(rx - hw - swW * 0.5, 0, 0, swW, WORLD.CURB_HEIGHT, WORLD.SIZE, swColor, [1, 1], false);
      this.addBox(rx + hw + swW * 0.5, 0, 0, swW, WORLD.CURB_HEIGHT, WORLD.SIZE, swColor, [1, 1], false);
    }

    // East-West Roads
    for (const rz of eastWestRoads) {
      const roadStartX = WORLD.COAST_X + 2;
      const roadLen = WORLD.HALF_SIZE - roadStartX;
      const roadMidX = roadStartX + roadLen * 0.5;

      this.addBox(roadMidX, 0.02, rz, roadLen, 0.04, WORLD.ROAD_WIDTH, asphaltColor, [1, 1], false);

      // Yellow centerline dashes
      const dashLen = 4;
      const gapLen = 4;
      for (let x = roadStartX; x < WORLD.HALF_SIZE; x += dashLen + gapLen) {
        this.addBox(x + dashLen * 0.5, 0.05, rz, dashLen, 0.02, 0.28, markingYellow, [1, 1], false);
      }

      // Outer lane stripes
      const hw = WORLD.ROAD_WIDTH * 0.5 - 0.6;
      this.addBox(roadMidX, 0.05, rz - hw, roadLen, 0.02, 0.22, markingWhite, [1, 1], false);
      this.addBox(roadMidX, 0.05, rz + hw, roadLen, 0.02, 0.22, markingWhite, [1, 1], false);
    }

    // Build traffic road graph nodes at intersections
    for (const rx of northSouthRoads) {
      for (const rz of eastWestRoads) {
        this.roadNodes.push({
          x: rx,
          z: rz,
          y: 0,
        });

        // Add crosswalks at intersection entrances
        const rw = WORLD.ROAD_WIDTH * 0.5;
        this.addCrosswalk(rx, rz - rw - 2, true);
        this.addCrosswalk(rx, rz + rw + 2, true);
        this.addCrosswalk(rx - rw - 2, rz, false);
        this.addCrosswalk(rx + rw + 2, rz, false);
      }
    }
  }

  addCrosswalk(x, z, isHorizontal) {
    const white = [0.90, 0.90, 0.92, 1.0];
    const stripeCount = 6;
    const stripeW = 0.8;
    const stripeGap = 0.8;
    const totalSpan = stripeCount * stripeW + (stripeCount - 1) * stripeGap;
    const start = -totalSpan * 0.5;

    for (let i = 0; i < stripeCount; i++) {
      const offset = start + i * (stripeW + stripeGap) + stripeW * 0.5;
      if (isHorizontal) {
        this.addBox(x + offset, 0.06, z, stripeW, 0.02, 2.8, white, [1, 1], false);
      } else {
        this.addBox(x, 0.06, z + offset, 2.8, 0.02, stripeW, white, [1, 1], false);
      }
    }
  }

  generateElevatedSkyway() {
    // Elevated expressway along X = 45 from Z = -180 to Z = 180
    const overpassY = WORLD.OVERPASS_Y;
    const overpassW = WORLD.OVERPASS_WIDTH;
    const overpassLen = WORLD.OVERPASS_Z_END - WORLD.OVERPASS_Z_START;
    const overpassZMid = (WORLD.OVERPASS_Z_START + WORLD.OVERPASS_Z_END) * 0.5;

    const concreteColor = [0.48, 0.50, 0.54, 1.0];
    const deckAsphalt = [0.14, 0.14, 0.16, 1.0];
    const barrierColor = [0.72, 0.74, 0.78, 1.0];

    // Main elevated road deck
    this.addBox(WORLD.OVERPASS_X, overpassY, overpassZMid, overpassW, 1.2, overpassLen, concreteColor, [1, 1], true);
    this.addBox(WORLD.OVERPASS_X, overpassY + 0.62, overpassZMid, overpassW - 1.2, 0.04, overpassLen, deckAsphalt, [1, 1], false);

    // Left and right concrete safety crash barriers
    const hw = overpassW * 0.5;
    this.addBox(WORLD.OVERPASS_X - hw + 0.35, overpassY + 1.2, overpassZMid, 0.7, 1.2, overpassLen, barrierColor, [1, 1], true);
    this.addBox(WORLD.OVERPASS_X + hw - 0.35, overpassY + 1.2, overpassZMid, 0.7, 1.2, overpassLen, barrierColor, [1, 1], true);

    // Overpass support pillars: placed OUTSIDE the roadway curb at X = 45 - 9.5 and X = 45 + 9.5
    const pillarColor = [0.38, 0.40, 0.44, 1.0];
    for (let z = WORLD.OVERPASS_Z_START + 16; z < WORLD.OVERPASS_Z_END; z += 36) {
      this.addBox(WORLD.OVERPASS_X - 9.5, 0, z, 1.8, overpassY, 1.8, pillarColor, [1, 1], true);
      this.addBox(WORLD.OVERPASS_X + 9.5, 0, z, 1.8, overpassY, 1.8, pillarColor, [1, 1], true);
      // Overhead cross support beam under deck
      this.addBox(WORLD.OVERPASS_X, overpassY - 0.6, z, overpassW + 3.0, 1.2, 2.4, pillarColor, [1, 1], false);
    }

    // Approach ramps at North and South ends
    const rampLen = 45;
    const northRampZ = WORLD.OVERPASS_Z_START - rampLen * 0.5;
    const southRampZ = WORLD.OVERPASS_Z_END + rampLen * 0.5;

    this.addBox(WORLD.OVERPASS_X, overpassY * 0.5, northRampZ, overpassW, overpassY, rampLen, concreteColor, [1, 1], true);
    this.addBox(WORLD.OVERPASS_X, overpassY * 0.5, southRampZ, overpassW, overpassY, rampLen, concreteColor, [1, 1], true);

    // East-West elevated highway bridge spanning across Central Avenue and Skyway Blvd at Z = 50
    const bridgeW = 12.0;
    const bridgeY = 11.0;
    const bridgeLen = 140.0;
    const bridgeX = 25.0;
    this.addBox(bridgeX, bridgeY, 50, bridgeLen, 1.4, bridgeW, concreteColor, [1, 1], true);
    this.addBox(bridgeX, bridgeY + 0.72, 50, bridgeLen, 0.04, bridgeW - 1.2, deckAsphalt, [1, 1], false);
    this.addBox(bridgeX, bridgeY + 1.2, 50 - bridgeW * 0.5 + 0.35, bridgeLen, 1.2, 0.7, barrierColor, [1, 1], true);
    this.addBox(bridgeX, bridgeY + 1.2, 50 + bridgeW * 0.5 - 0.35, bridgeLen, 1.2, 0.7, barrierColor, [1, 1], true);
    // Support pillars outside roadways
    this.addBox(-11.5, 0, 50, 2.0, bridgeY, 2.0, pillarColor, [1, 1], true);
    this.addBox(11.5, 0, 50, 2.0, bridgeY, 2.0, pillarColor, [1, 1], true);
    this.addBox(62.0, 0, 50, 2.0, bridgeY, 2.0, pillarColor, [1, 1], true);
  }

  generateCityBlocks() {
    // Build sidewalk blocks and buildings in each quadrant
    const sidewalkColor = [0.65, 0.65, 0.68, 1.0];

    // Downtown skyscrapers (East / North)
    const dt = DISTRICTS.DOWNTOWN;
    this.buildDistrictTowers(dt, sidewalkColor);

    // Old Market Quarter (West / North)
    const ot = DISTRICTS.OLD_TOWN;
    this.buildOldMarket(ot, sidewalkColor);

    // Ocean Promenade luxury blocks (West / South)
    const pr = DISTRICTS.PROMENADE;
    this.buildPromenadeBlocks(pr, sidewalkColor);
  }

  buildDistrictTowers(district, sidewalkColor) {
    // Generate towering corporate glass and metal skyscrapers
    // Three columns between roads X=0, X=45, X=115, X=185
    const blockDefs = [
      { xMid: 22.5, width: 27 },   // Between Central Ave (0) and Skyway (45)
      { xMid: 80.0, width: 50 },   // Between Skyway (45) and East Blvd (115)
      { xMid: 150.0, width: 50 },  // Between East Blvd (115) and Port Ave (185)
    ];
    // Three row tiers between roads Z = -180, -115, -50
    const rowDefs = [
      { zMid: -214.5, length: 47 },
      { zMid: -147.5, length: 47 },
      { zMid: -82.5, length: 47 },
    ];

    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        // Sidewalk pad
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false);

        // Building configuration
        const height = 52 + ((Math.abs(Math.floor(bx.xMid * 7 + bz.zMid * 13))) % 52);
        const bldColor = [0.22, 0.28, 0.38, 1.0]; // Reflective dark blue/grey corporate tower

        // Main tower body
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT, bz.zMid, bx.width - 6, height, bz.length - 6, bldColor, [0.2, 0.2], true);

        // Tower setback tier (higher, narrower)
        if (height > 60) {
          const tierH = 22;
          const tierColor = [0.30, 0.36, 0.48, 1.0];
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height, bz.zMid, Math.max(12, bx.width - 14), tierH, Math.max(14, bz.length - 14), tierColor, [0.2, 0.2], true);

          // Rooftop spire or helipad
          const helipadColor = [0.85, 0.75, 0.25, 1.0];
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + tierH, bz.zMid, 12, 0.6, 12, helipadColor, [1, 1], false);
          // Communications antenna
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + tierH + 0.6, bz.zMid, 0.8, 14, 0.8, [0.8, 0.2, 0.2, 1.0], [1, 1], false);
        }

        // Ground-level entrance lobby with glass canopy
        const canopyColor = [0.15, 0.18, 0.24, 1.0];
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + 3.8, bz.zMid - bz.length * 0.5 + 2.5, Math.min(24, bx.width - 10), 0.4, 4.5, canopyColor, [1, 1], false);
      }
    }
  }

  buildOldMarket(district, sidewalkColor) {
    // Historic dense blocks with terracotta roofs, courtyards, stone arches
    const blockDefs = [
      { xMid: -80.0, width: 32 },  // Between Coastal (-105) and West Ave (-55)
      { xMid: -27.5, width: 37 },  // Between West Ave (-55) and Central (0)
    ];
    const rowDefs = [
      { zMid: -214.5, length: 47 },
      { zMid: -147.5, length: 47 },
      { zMid: -82.5, length: 47 },
    ];

    const brickColors = [
      [0.68, 0.32, 0.22, 1.0], // Terracotta red
      [0.78, 0.62, 0.42, 1.0], // Sandstone ochre
      [0.55, 0.45, 0.38, 1.0], // Earth brown
    ];

    let cIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        // Sidewalk
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false);

        // Split each block into smaller townhouses
        const subH1 = 18 + ((Math.abs(Math.floor(bx.xMid))) % 8);
        const subH2 = 14 + ((Math.abs(Math.floor(bz.zMid))) % 7);
        const color1 = brickColors[cIdx++ % brickColors.length];
        const color2 = brickColors[cIdx++ % brickColors.length];

        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT, bz.zMid, bx.width * 0.45, subH1, bz.length - 6, color1, [0.5, 0.5], true);
        this.addBox(bx.xMid + bx.width * 0.22, WORLD.CURB_HEIGHT, bz.zMid, bx.width * 0.45, subH2, bz.length - 6, color2, [0.5, 0.5], true);

        // Rooftop cornice & awning
        const awningColor = [0.2, 0.5, 0.3, 1.0];
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT + 3.2, bz.zMid - bz.length * 0.5 + 2.5, bx.width * 0.4, 0.3, 3.0, awningColor, [1, 1], false);
      }
    }
  }

  buildPromenadeBlocks(district, sidewalkColor) {
    // Coastal boulevard hotels, modern residential resorts with balconies
    const blockDefs = [
      { xMid: -80.0, width: 32 },
      { xMid: -27.5, width: 37 },
    ];
    const rowDefs = [
      { zMid: 52.5, length: 47 },
      { zMid: 117.5, length: 47 },
      { zMid: 182.5, length: 47 },
    ];

    const hotelColors = [
      [0.85, 0.88, 0.92, 1.0], // Bright coastal white
      [0.72, 0.82, 0.85, 1.0], // Pale aqua
      [0.92, 0.84, 0.74, 1.0], // Sunset beige
    ];

    let hIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        // Sidewalk pad
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false);

        const height = 26 + ((Math.abs(Math.floor(bx.xMid * 3 + bz.zMid * 5))) % 22);
        const color = hotelColors[hIdx++ % hotelColors.length];

        this.addBox(bx.xMid, WORLD.CURB_HEIGHT, bz.zMid, bx.width - 6, height, bz.length - 6, color, [0.3, 0.3], true);

        // Balcony bands protruding along facade
        const balconyColor = [0.95, 0.95, 0.98, 1.0];
        for (let y = WORLD.CURB_HEIGHT + 4; y < height; y += 4.5) {
          this.addBox(bx.xMid, y, bz.zMid - bz.length * 0.5 + 2.5, bx.width - 8, 0.35, 1.8, balconyColor, [1, 1], false);
        }
      }
    }
  }

  generateMarinaAndWaterfront() {
    // Broad waterfront boardwalk along the coast between X = -130 and X = -115
    const boardwalkColor = [0.55, 0.42, 0.30, 1.0]; // Warm weathered timber
    const railingColor = [0.85, 0.88, 0.92, 1.0];

    // Boardwalk deck
    this.addBox(-122, 0.28, 0, 14, 0.55, WORLD.SIZE * 0.9, boardwalkColor, [1, 2], false);

    // Safety railing posts and handrails
    this.addBox(-128.5, 0.9, 0, 0.3, 0.8, WORLD.SIZE * 0.9, railingColor, [1, 1], true);

    // Marina Pier Jetties extending into the ocean
    const pierZList = [-150, -70, 60, 140];
    const pierLen = 42;
    const pierW = 6.5;

    for (const pz of pierZList) {
      // Pier deck
      this.addBox(WORLD.COAST_X - pierLen * 0.5, 0.22, pz, pierLen, 0.45, pierW, boardwalkColor, [2, 1], false);
      // Pier pilings into water
      for (let px = WORLD.COAST_X - 6; px > WORLD.COAST_X - pierLen; px -= 8) {
        this.addBox(px, -2.5, pz - pierW * 0.4, 0.6, 3.5, 0.6, [0.25, 0.20, 0.15, 1.0], [1, 1], true);
        this.addBox(px, -2.5, pz + pierW * 0.4, 0.6, 3.5, 0.6, [0.25, 0.20, 0.15, 1.0], [1, 1], true);
      }

      // Moored luxury yacht / speedboat model beside pier
      this.addBoat(WORLD.COAST_X - 22, -0.2, pz + 7.5, Math.PI * 0.05);
    }
  }

  addBoat(x, y, z, rotY) {
    const hullWhite = [0.94, 0.95, 0.98, 1.0];
    const cabinBlue = [0.15, 0.35, 0.55, 1.0];
    // Main hull
    this.addBox(x, y + 0.6, z, 12, 1.2, 3.8, hullWhite, [1, 1], true);
    // Cabin superstructure
    this.addBox(x - 1.0, y + 1.6, z, 5.5, 1.0, 2.8, cabinBlue, [1, 1], false);
    // Windshield
    this.addBox(x + 2.0, y + 1.5, z, 1.2, 0.8, 2.6, [0.1, 0.15, 0.2, 1.0], [1, 1], false);
  }

  generateDocksAndCranes() {
    // Meridian Cargo Docks in South-East quadrant (X: 20 to 240, Z: 20 to 240)
    // Industrial concrete dock apron slab
    const dockPavementColor = [0.26, 0.28, 0.32, 1.0];
    this.addBox(140, 0.08, 140, 160, 0.16, 160, dockPavementColor, [1, 1], false);

    // Yellow hazard safety strip along wharf edge
    const hazardYellow = [0.95, 0.78, 0.10, 1.0];
    this.addBox(140, 0.18, 220, 160, 0.04, 1.6, hazardYellow, [1, 1], false);
    this.addBox(220, 0.18, 140, 1.6, 0.04, 160, hazardYellow, [1, 1], false);

    // Open harbor water basin along east and south edges of docks
    const basinColor = [0.05, 0.38, 0.52, 0.95];
    const bMinX = 222, bMaxX = WORLD.HALF_SIZE + 60;
    const bMinZ = 60, bMaxZ = WORLD.HALF_SIZE + 60;
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
      this.waterColors.push(basinColor[0], basinColor[1], basinColor[2], basinColor[3]);
      this.waterUvs.push(bPts[p][0] * 0.05, bPts[p][2] * 0.05);
    }

    const sPts = [
      [60, WORLD.SEA_LEVEL, 222],
      [bMaxX, WORLD.SEA_LEVEL, 222],
      [bMaxX, WORLD.SEA_LEVEL, bMaxZ],
      [60, WORLD.SEA_LEVEL, 222],
      [bMaxX, WORLD.SEA_LEVEL, bMaxZ],
      [60, WORLD.SEA_LEVEL, bMaxZ],
    ];
    for (let p = 0; p < 6; p++) {
      this.waterPositions.push(sPts[p][0], sPts[p][1], sPts[p][2]);
      this.waterNormals.push(0, 1, 0);
      this.waterColors.push(basinColor[0], basinColor[1], basinColor[2], basinColor[3]);
      this.waterUvs.push(sPts[p][0] * 0.05, sPts[p][2] * 0.05);
    }

    // Cargo freighter moored along eastern wharf
    this.addBox(240, -1.0, 160, 22, 6.5, 75, [0.18, 0.20, 0.24, 1.0], [1, 1], true);
    this.addBox(240, 5.5, 130, 14, 8.0, 18, [0.88, 0.88, 0.90, 1.0], [1, 1], true);

    // 1. Cargo warehouses
    const warehouseColor = [0.35, 0.38, 0.42, 1.0];
    const roofColor = [0.55, 0.25, 0.20, 1.0];

    this.addBox(80, 0, 70, 38, 14, 32, warehouseColor, [0.2, 0.2], true);
    this.addBox(80, 14, 70, 40, 2.5, 34, roofColor, [1, 1], false);

    this.addBox(80, 0, 150, 38, 14, 32, warehouseColor, [0.2, 0.2], true);
    this.addBox(80, 14, 150, 40, 2.5, 34, roofColor, [1, 1], false);

    // 2. Shipping container stacks (multi-colored shipping containers)
    const containerColors = [
      [0.82, 0.18, 0.15, 1.0], // Crimson Red
      [0.15, 0.42, 0.78, 1.0], // Cobalt Blue
      [0.92, 0.55, 0.12, 1.0], // Safety Orange
      [0.18, 0.58, 0.32, 1.0], // Evergreen
      [0.85, 0.75, 0.15, 1.0], // Yellow
    ];

    const cW = 2.6; // Container width
    const cL = 7.0; // Container length
    const cH = 2.6; // Container height

    // Stack clusters around X = 145, Z = 125
    let colIdx = 0;
    for (let row = 0; row < 5; row++) {
      for (let stackZ = 0; stackZ < 4; stackZ++) {
        const cx = 135 + row * 4.2;
        const cz = 95 + stackZ * 9.5;
        const heightLayers = 1 + ((row + stackZ) % 3);

        for (let l = 0; l < heightLayers; l++) {
          const cColor = containerColors[(colIdx++) % containerColors.length];
          this.addBox(cx, l * cH, cz, cW, cH, cL, cColor, [1, 1], true);
        }
      }
    }

    // 3. Massive 36m Industrial Gantry Crane at X = 150, Z = 155
    this.buildGantryCrane(150, 0, 155);
  }

  buildGantryCrane(x, y, z) {
    const craneYellow = [0.96, 0.72, 0.08, 1.0];
    const metalDark = [0.25, 0.26, 0.28, 1.0];

    const height = 36;
    const spanW = 26;
    const depthL = 18;

    // Four massive vertical legs
    const hw = spanW * 0.5;
    const hl = depthL * 0.5;
    this.addBox(x - hw, y, z - hl, 1.8, height, 1.8, craneYellow, [1, 1], true);
    this.addBox(x + hw, y, z - hl, 1.8, height, 1.8, craneYellow, [1, 1], true);
    this.addBox(x - hw, y, z + hl, 1.8, height, 1.8, craneYellow, [1, 1], true);
    this.addBox(x + hw, y, z + hl, 1.8, height, 1.8, craneYellow, [1, 1], true);

    // Diagonal truss cross braces
    this.addBox(x - hw, y + height * 0.5, z, 1.2, 1.2, depthL, craneYellow, [1, 1], false);
    this.addBox(x + hw, y + height * 0.5, z, 1.2, 1.2, depthL, craneYellow, [1, 1], false);

    // Overhead horizontal gantry truss girder
    this.addBox(x, y + height, z, spanW + 14, 3.2, 4.5, craneYellow, [1, 1], true);

    // Trolley & operator cabin
    this.addBox(x + 2, y + height - 2.8, z, 4.5, 2.5, 3.5, metalDark, [1, 1], false);

    // Cable hoist & spreader frame
    this.addBox(x + 2, y + height - 12, z, 0.25, 10, 0.25, [0.1, 0.1, 0.1, 1.0], [1, 1], false);
    this.addBox(x + 2, y + height - 12, z, 3.0, 0.6, 6.0, metalDark, [1, 1], false);
  }

  generatePropsAndStreetFurniture() {
    // 1. Palm trees along the coastal Ocean Promenade (X = -118)
    for (let z = -WORLD.HALF_SIZE + 25; z < WORLD.HALF_SIZE - 25; z += 18) {
      this.addPalmTree(-118, 0.3, z);
      this.addPalmTree(-90, 0.2, z);
    }

    // 2. Street lights / lamp posts along main streets
    const streetLightColor = [0.35, 0.36, 0.40, 1.0];
    const lampGlow = [1.0, 0.95, 0.75, 1.0];

    const lampXList = [-105, 0, 45, 115];
    for (const lx of lampXList) {
      for (let lz = -220; lz <= 220; lz += 40) {
        // Vertical post
        this.addBox(lx + 8.5, 0, lz, 0.35, 8.2, 0.35, streetLightColor, [1, 1], false);
        // Overhanging arm
        this.addBox(lx + 7.2, 8.0, lz, 2.8, 0.25, 0.25, streetLightColor, [1, 1], false);
        // Lamp fixture
        this.addBox(lx + 6.0, 7.8, lz, 0.6, 0.25, 0.5, lampGlow, [1, 1], false);
      }
    }

    // 3. Fire hydrants and benches
    const hydrantColor = [0.92, 0.22, 0.15, 1.0];
    for (let z = -200; z <= 200; z += 65) {
      this.addBox(9.2, 0, z, 0.45, 0.9, 0.45, hydrantColor, [1, 1], true);
      this.addBox(-9.2, 0, z + 20, 0.45, 0.9, 0.45, hydrantColor, [1, 1], true);
    }
  }

  addPalmTree(x, y, z) {
    const trunkColor = [0.42, 0.32, 0.22, 1.0];
    const frondColor = [0.18, 0.62, 0.24, 1.0];

    // Segmented curved trunk
    const trunkH = 8.5;
    this.addBox(x, y, z, 0.65, trunkH, 0.65, trunkColor, [1, 1], true);

    // Palm leaf fronds spreading out at top
    const frondLen = 4.2;
    const frondW = 1.2;
    const topY = y + trunkH;

    const angles = [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75, Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
    for (const ang of angles) {
      const fx = x + Math.cos(ang) * (frondLen * 0.45);
      const fz = z + Math.sin(ang) * (frondLen * 0.45);
      this.addBox(fx, topY - 0.4, fz, frondW, 0.15, frondLen * 0.9, frondColor, [1, 1], false);
    }
  }

  // --- Collision Query ---
  checkCollision(cx, cz, radius) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      // Quick bounding box test
      if (cx + radius > c.minX && cx - radius < c.maxX &&
          cz + radius > c.minZ && cz - radius < c.maxZ) {
        // Nearest point
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
            // Push out along smallest depth axis
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
