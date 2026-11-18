/**
 * Nightfall City: Vela Bay - Procedural Open World & District Generator
 * Authored by makefun agent for the open-world crime game challenge.
 *
 * Generates an expansive Mediterranean coastal metropolis bathed in warm golden light:
 * - Coherent palette: Washed ochre, sunlit sandstone, terracotta rust, coral accents, coastal teal, deep blue shade, and warm yellow low sun
 * - Per-face facade tinting so every building and block reads as a solid with 3D corners
 * - Directional ground cast shadows stretching across streets from low sunset lighting
 * - Lived-in facades: balconies with railings and flower planters, striped shopfront awnings, painted signage,
 *   rooftop clutter (wooden water tanks on stilts, satellite dishes, antennae with warning beacons, rooftop gardens),
 *   fire escapes, and air-conditioning units
 * - Street level detail: pavements with kerbs, zebra crossings with tactile paving, kerbside parked cars,
 *   lush palms and slender Italian cypresses, cast-iron lamp posts, park benches, litter bins, bus shelters,
 *   traffic lights, road markings, manhole covers, and puddles that catch the sky
 * - Marina, harbor suspension bridge, industrial cargo docks with 36m gantry crane, and distant Monte Sereno hills
 */

import { WORLD, DISTRICTS, LIGHTING } from './config.js';

export class World {
  constructor() {
    this.colliders = []; // AABB array: { minX, maxX, minZ, maxZ, height, yBottom, type }
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
    this.generateDistantHills();
    this.generateRoadGrid();
    this.generateElevatedSkyway();
    this.generateHarbourBridge();
    this.generateCityBlocks();
    this.generateParksAndPlazas();
    this.generateMarinaAndWaterfront();
    this.generateDocksAndCranes();
    this.generatePropsAndStreetFurniture();
    this.generateParkedCars();
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

  /**
   * Adds an axis-aligned 3D box with per-face normal tinting so the block reads as a solid with corners.
   * Sun is low in the sky coming from North-West (SUN_DIR ~ [-0.68, 0.32, -0.65]).
   * Sun-facing faces take warm golden tint; shade-facing faces take cool blue-teal shade tint.
   */
  addBox(x, y, z, sx, sy, sz, color, uvScale = [1, 1], addCollider = true, applyFaceTint = true) {
    const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
    const cy = y + hy;

    const baseR = color[0], baseG = color[1], baseB = color[2], baseA = color[3] !== undefined ? color[3] : 1.0;

    // Per-face tints based on low North-West late-afternoon sun:
    // Top (+Y): Direct sun + sky dome
    const colTop = applyFaceTint ? [baseR * 1.08, baseG * 1.04, baseB * 0.96, baseA] : color;
    // Bottom (-Y): Deep crevice ground ambient
    const colBottom = applyFaceTint ? [baseR * 0.45, baseG * 0.45, baseB * 0.50, baseA] : color;
    // North (-Z) face: Points directly toward low NW sun -> Bright golden highlight
    const colNorth = applyFaceTint ? [Math.min(1.0, baseR * 1.25), Math.min(1.0, baseG * 1.14), baseB * 0.92, baseA] : color;
    // South (+Z) face: Turned away from sun -> Cool Mediterranean blue-teal shade
    const colSouth = applyFaceTint ? [baseR * 0.72, baseG * 0.82, Math.min(1.0, baseB * 1.02), baseA] : color;
    // West (-X) face: Points toward low NW sun -> Warm sunlit facet
    const colWest = applyFaceTint ? [Math.min(1.0, baseR * 1.20), Math.min(1.0, baseG * 1.10), baseB * 0.90, baseA] : color;
    // East (+X) face: Turned away from sun -> Cool blue-teal shade
    const colEast = applyFaceTint ? [baseR * 0.74, baseG * 0.84, Math.min(1.0, baseB * 1.04), baseA] : color;

    // Top face (+Y)
    this.addQuad(
      [x - hx, cy + hy, z - hz],
      [x + hx, cy + hy, z - hz],
      [x + hx, cy + hy, z + hz],
      [x - hx, cy + hy, z + hz],
      [0, 1, 0], colTop, [sx * uvScale[0], sz * uvScale[1]]
    );

    // Bottom face (-Y)
    this.addQuad(
      [x - hx, cy - hy, z + hz],
      [x + hx, cy - hy, z + hz],
      [x + hx, cy - hy, z - hz],
      [x - hx, cy - hy, z - hz],
      [0, -1, 0], colBottom, [sx * uvScale[0], sz * uvScale[1]]
    );

    // Front face (+Z) - South / Shaded
    this.addQuad(
      [x - hx, cy - hy, z + hz],
      [x + hx, cy - hy, z + hz],
      [x + hx, cy + hy, z + hz],
      [x - hx, cy + hy, z + hz],
      [0, 0, 1], colSouth, [sx * uvScale[0], sy * uvScale[1]]
    );

    // Back face (-Z) - North / Sunlit
    this.addQuad(
      [x + hx, cy - hy, z - hz],
      [x - hx, cy - hy, z - hz],
      [x - hx, cy + hy, z - hz],
      [x + hx, cy + hy, z - hz],
      [0, 0, -1], colNorth, [sx * uvScale[0], sy * uvScale[1]]
    );

    // Right face (+X) - East / Shaded
    this.addQuad(
      [x + hx, cy - hy, z + hz],
      [x + hx, cy - hy, z - hz],
      [x + hx, cy + hy, z - hz],
      [x + hx, cy + hy, z + hz],
      [1, 0, 0], colEast, [sz * uvScale[0], sy * uvScale[1]]
    );

    // Left face (-X) - West / Sunlit
    this.addQuad(
      [x - hx, cy - hy, z - hz],
      [x - hx, cy - hy, z + hz],
      [x - hx, cy + hy, z + hz],
      [x - hx, cy + hy, z - hz],
      [-1, 0, 0], colWest, [sz * uvScale[0], sy * uvScale[1]]
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

  /**
   * Adds a soft directional ground shadow cast by an elevated structure or building.
   * Stretches in direction of (+X, +Z) opposite to low NW sun.
   */
  addGroundShadow(x, z, sx, sz, height, y = 0.035) {
    const shadowStretch = Math.min(height * 0.75, 28.0);
    const shadowColor = [0.12, 0.14, 0.20, 0.55]; // Deep Mediterranean blue-grey shadow
    const hx = sx * 0.5;
    const hz = sz * 0.5;

    // Projected ground quad stretching toward (+X, +Z)
    const offX = shadowStretch * 0.65;
    const offZ = shadowStretch * 0.62;

    this.addQuad(
      [x - hx, y, z - hz],
      [x + hx + offX, y, z - hz + offZ * 0.5],
      [x + hx + offX, y, z + hz + offZ],
      [x - hx, y, z + hz],
      [0, 1, 0], shadowColor, [1, 1]
    );
  }

  // --- Generation Procedures ---

  generateTerrainAndSea() {
    // City ground base slab - warm sun-baked asphalt foundation
    const groundColor = [0.34, 0.33, 0.36, 1.0];
    this.addQuad(
      [WORLD.COAST_X, 0, -WORLD.HALF_SIZE],
      [WORLD.HALF_SIZE, 0, -WORLD.HALF_SIZE],
      [WORLD.HALF_SIZE, 0, WORLD.HALF_SIZE],
      [WORLD.COAST_X, 0, WORLD.HALF_SIZE],
      [0, 1, 0], groundColor, [100, 100]
    );

    // Turquoise & Azure Ocean Water Mesh
    const oceanColor = [0.08, 0.52, 0.68, 0.95];
    const waterMinX = -WORLD.HALF_SIZE - 220;
    const waterMaxX = WORLD.COAST_X + 2;
    const waterMinZ = -WORLD.HALF_SIZE - 120;
    const waterMaxZ = WORLD.HALF_SIZE + 120;

    const segsX = 28;
    const segsZ = 28;
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
    const seawallColor = [0.60, 0.58, 0.56, 1.0];
    this.addBox(WORLD.COAST_X, -2.5, 0, 3.6, 5.0, WORLD.SIZE, seawallColor, [1, 1], true, true);
  }

  generateDistantHills() {
    // Monte Sereno Foothills: Scenic sunlit ridges framing the northern and eastern horizon
    const hillColFar = [0.72, 0.58, 0.48, 1.0];  // Sun-washed terracotta bluffs
    const hillColNear = [0.55, 0.62, 0.46, 1.0]; // Mediterranean olive ridge

    // Northern Ridge
    const numHillsN = 9;
    const spanN = WORLD.SIZE + 80;
    const stepN = spanN / numHillsN;
    for (let i = 0; i < numHillsN; i++) {
      const hx = -WORLD.HALF_SIZE + i * stepN;
      const hz = -WORLD.HALF_SIZE - 75;
      const hHeight = 46 + Math.sin(i * 1.7) * 22;
      const hWidth = stepN * 1.45;
      this.addBox(hx, 0, hz, hWidth, hHeight, 55, hillColFar, [1, 1], false, true);
      this.addBox(hx + stepN * 0.5, 0, hz + 35, hWidth * 0.85, hHeight * 0.65, 40, hillColNear, [1, 1], false, true);
    }

    // Eastern Mountain Flank
    const numHillsE = 7;
    const spanE = WORLD.SIZE;
    const stepE = spanE / numHillsE;
    for (let i = 0; i < numHillsE; i++) {
      const hx = WORLD.HALF_SIZE + 65;
      const hz = -WORLD.HALF_SIZE + i * stepE;
      const hHeight = 54 + Math.cos(i * 2.1) * 20;
      this.addBox(hx, 0, hz, 60, hHeight, stepE * 1.4, hillColFar, [1, 1], false, true);
    }
  }

  generateRoadGrid() {
    const northSouthRoads = [-105, -55, 0, 45, 115, 185];
    const eastWestRoads = [-180, -115, -50, 20, 85, 150, 215];

    // Rich warm asphalt (reflects golden sunlight, never murky black)
    const asphaltColor = [0.36, 0.35, 0.38, 1.0];
    const markingYellow = [1.0, 0.82, 0.12, 1.0]; // High-vis golden amber centerline
    const markingWhite = [0.96, 0.96, 0.98, 1.0]; // Bright white lane boundaries
    const sidewalkColor = [0.82, 0.78, 0.70, 1.0]; // Sunlit washed sandstone sidewalks
    const kerbColor = [0.68, 0.65, 0.60, 1.0];     // Raised granite kerbstone

    // North-South Avenues
    for (const rx of northSouthRoads) {
      if (rx < WORLD.COAST_X) continue;

      // Roadway bed
      this.addBox(rx, 0.02, 0, WORLD.ROAD_WIDTH, 0.04, WORLD.SIZE, asphaltColor, [1, 1], false, false);

      // Golden centerline dashes
      const dashLen = 4.2;
      const gapLen = 3.8;
      for (let z = -WORLD.HALF_SIZE; z < WORLD.HALF_SIZE; z += dashLen + gapLen) {
        this.addBox(rx, 0.05, z + dashLen * 0.5, 0.32, 0.02, dashLen, markingYellow, [1, 1], false, false);
      }

      // Outer boundary white road lines
      const hw = WORLD.ROAD_WIDTH * 0.5 - 0.7;
      this.addBox(rx - hw, 0.05, 0, 0.24, 0.02, WORLD.SIZE, markingWhite, [1, 1], false, false);
      this.addBox(rx + hw, 0.05, 0, 0.24, 0.02, WORLD.SIZE, markingWhite, [1, 1], false, false);

      // Raised granite kerbstones
      const kerbW = 0.32;
      this.addBox(rx - hw - kerbW * 0.5, 0.02, 0, kerbW, WORLD.CURB_HEIGHT, WORLD.SIZE, kerbColor, [1, 1], false, true);
      this.addBox(rx + hw + kerbW * 0.5, 0.02, 0, kerbW, WORLD.CURB_HEIGHT, WORLD.SIZE, kerbColor, [1, 1], false, true);

      // Flanking raised pedestrian sidewalks
      const swW = WORLD.SIDEWALK_WIDTH;
      this.addBox(rx - hw - kerbW - swW * 0.5, 0, 0, swW, WORLD.CURB_HEIGHT, WORLD.SIZE, sidewalkColor, [1, 1], false, true);
      this.addBox(rx + hw + kerbW + swW * 0.5, 0, 0, swW, WORLD.CURB_HEIGHT, WORLD.SIZE, sidewalkColor, [1, 1], false, true);

      // Cast-iron manhole covers along avenue
      for (let z = -200; z <= 200; z += 55) {
        this.addBox(rx + 2.5, 0.055, z, 1.1, 0.02, 1.1, [0.24, 0.24, 0.26, 1.0], [1, 1], false, false);
      }
    }

    // East-West Cross Streets
    for (const rz of eastWestRoads) {
      const roadStartX = WORLD.COAST_X + 2;
      const roadLen = WORLD.HALF_SIZE - roadStartX;
      const roadMidX = roadStartX + roadLen * 0.5;

      this.addBox(roadMidX, 0.02, rz, roadLen, 0.04, WORLD.ROAD_WIDTH, asphaltColor, [1, 1], false, false);

      // Golden centerline dashes
      const dashLen = 4.2;
      const gapLen = 3.8;
      for (let x = roadStartX; x < WORLD.HALF_SIZE; x += dashLen + gapLen) {
        this.addBox(x + dashLen * 0.5, 0.05, rz, dashLen, 0.02, 0.32, markingYellow, [1, 1], false, false);
      }

      // Outer boundary white stripes
      const hw = WORLD.ROAD_WIDTH * 0.5 - 0.7;
      this.addBox(roadMidX, 0.05, rz - hw, roadLen, 0.02, 0.24, markingWhite, [1, 1], false, false);
      this.addBox(roadMidX, 0.05, rz + hw, roadLen, 0.02, 0.24, markingWhite, [1, 1], false, false);
    }

    // Intersections and Crosswalk zebra stripes with tactile paving
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
    const tactileYellow = [0.96, 0.78, 0.12, 1.0]; // Warning blister paving
    const count = 7;
    const stripeW = 0.85;
    const stripeGap = 0.75;
    const totalSpan = count * stripeW + (count - 1) * stripeGap;
    const start = -totalSpan * 0.5;

    for (let i = 0; i < count; i++) {
      const offset = start + i * (stripeW + stripeGap) + stripeW * 0.5;
      if (isHorizontal) {
        this.addBox(x + offset, 0.06, z, stripeW, 0.02, 3.2, white, [1, 1], false, false);
      } else {
        this.addBox(x, 0.06, z + offset, 3.2, 0.02, stripeW, white, [1, 1], false, false);
      }
    }

    // Yellow tactile paving curb ramp at crossing ends
    if (isHorizontal) {
      this.addBox(x, 0.065, z - 2.2, totalSpan, 0.02, 0.8, tactileYellow, [1, 1], false, false);
      this.addBox(x, 0.065, z + 2.2, totalSpan, 0.02, 0.8, tactileYellow, [1, 1], false, false);
    } else {
      this.addBox(x - 2.2, 0.065, z, 0.8, 0.02, totalSpan, tactileYellow, [1, 1], false, false);
      this.addBox(x + 2.2, 0.065, z, 0.8, 0.02, totalSpan, tactileYellow, [1, 1], false, false);
    }
  }

  generateElevatedSkyway() {
    const overpassY = WORLD.OVERPASS_Y;
    const overpassW = WORLD.OVERPASS_WIDTH;
    const overpassLen = WORLD.OVERPASS_Z_END - WORLD.OVERPASS_Z_START;
    const overpassZMid = (WORLD.OVERPASS_Z_START + WORLD.OVERPASS_Z_END) * 0.5;

    const concreteDeck = [0.62, 0.64, 0.68, 1.0];
    const highwayAsphalt = [0.34, 0.33, 0.36, 1.0];
    const barrierColor = [0.86, 0.88, 0.92, 1.0];
    const pillarColor = [0.52, 0.54, 0.58, 1.0];

    // Main overpass deck
    this.addBox(WORLD.OVERPASS_X, overpassY, overpassZMid, overpassW, 1.3, overpassLen, concreteDeck, [1, 1], true, true);
    this.addBox(WORLD.OVERPASS_X, overpassY + 0.66, overpassZMid, overpassW - 1.2, 0.04, overpassLen, highwayAsphalt, [1, 1], false, false);

    // Highway centerline golden dashes
    const dashLen = 4.5, gapLen = 4.0;
    for (let z = WORLD.OVERPASS_Z_START; z < WORLD.OVERPASS_Z_END; z += dashLen + gapLen) {
      this.addBox(WORLD.OVERPASS_X, overpassY + 0.70, z + dashLen * 0.5, 0.35, 0.02, dashLen, [1.0, 0.82, 0.12, 1.0], [1, 1], false, false);
    }

    // Left & Right concrete safety barriers
    const hw = overpassW * 0.5;
    this.addBox(WORLD.OVERPASS_X - hw + 0.35, overpassY + 1.2, overpassZMid, 0.7, 1.2, overpassLen, barrierColor, [1, 1], true, true);
    this.addBox(WORLD.OVERPASS_X + hw - 0.35, overpassY + 1.2, overpassZMid, 0.7, 1.2, overpassLen, barrierColor, [1, 1], true, true);

    // Structural support pillars & ground shadows
    for (let z = WORLD.OVERPASS_Z_START + 18; z < WORLD.OVERPASS_Z_END; z += 38) {
      this.addBox(WORLD.OVERPASS_X - 9.5, 0, z, 2.0, overpassY, 2.0, pillarColor, [1, 1], true, true);
      this.addBox(WORLD.OVERPASS_X + 9.5, 0, z, 2.0, overpassY, 2.0, pillarColor, [1, 1], true, true);
      this.addBox(WORLD.OVERPASS_X, overpassY - 0.65, z, overpassW + 3.2, 1.3, 2.6, pillarColor, [1, 1], false, true);

      // Long ground shadows under the overpass
      this.addGroundShadow(WORLD.OVERPASS_X, z, overpassW, 12, overpassY);
    }

    // Skyway highway exit ramps
    const rampLen = 48;
    this.addBox(WORLD.OVERPASS_X, overpassY * 0.5, WORLD.OVERPASS_Z_START - rampLen * 0.5, overpassW, overpassY, rampLen, concreteDeck, [1, 1], true, true);
    this.addBox(WORLD.OVERPASS_X, overpassY * 0.5, WORLD.OVERPASS_Z_END + rampLen * 0.5, overpassW, overpassY, rampLen, concreteDeck, [1, 1], true, true);
  }

  generateHarbourBridge() {
    // Grand Vela Bay Suspension Bridge connecting Old Town to the Western Peninsula
    const bridgeX = -130;
    const bridgeZ = -180;
    const bridgeLen = 85;
    const bridgeW = 12;

    const steelColor = [0.82, 0.38, 0.24, 1.0]; // International rust orange
    const roadwayColor = [0.35, 0.34, 0.38, 1.0];

    // Bridge road deck spanning west across the bay
    this.addBox(bridgeX - bridgeLen * 0.5, 6.0, bridgeZ, bridgeLen, 1.2, bridgeW, roadwayColor, [1, 1], true, true);

    // Twin suspension towers
    const towerH = 36;
    this.addBox(bridgeX - 18, 0, bridgeZ - 5.5, 2.4, towerH, 2.4, steelColor, [1, 1], true, true);
    this.addBox(bridgeX - 18, 0, bridgeZ + 5.5, 2.4, towerH, 2.4, steelColor, [1, 1], true, true);
    this.addBox(bridgeX - 18, towerH - 2, bridgeZ, 2.6, 2.4, bridgeW, steelColor, [1, 1], false, true);

    // Suspension cables
    this.addBox(bridgeX - 35, 14.0, bridgeZ - 5.4, 34, 0.45, 0.45, steelColor, [1, 1], false, true);
    this.addBox(bridgeX - 35, 14.0, bridgeZ + 5.4, 34, 0.45, 0.45, steelColor, [1, 1], false, true);
  }

  generateCityBlocks() {
    const sidewalkColor = [0.82, 0.78, 0.70, 1.0]; // Sunlit washed sandstone

    // 1. Downtown High-Rise Skyscraper District (North-East)
    this.buildDowntownTowers(sidewalkColor);

    // 2. Old Town Historic Quarter (North-West)
    this.buildOldTown(sidewalkColor);

    // 3. Ocean Promenade Resort Strip (South-West)
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

    // Rich Mediterranean architecture palette: Washed ochre, champagne bronze, sapphire teal, travertine cream
    const towerPalettes = [
      { body: [0.92, 0.76, 0.46, 1.0], trim: [0.78, 0.42, 0.22, 1.0], crown: [1.0, 0.82, 0.15, 1.0], sign: 'HOTEL VELA', signCol: [0.98, 0.82, 0.15, 1.0] },
      { body: [0.28, 0.62, 0.74, 1.0], trim: [0.88, 0.86, 0.82, 1.0], crown: [0.20, 0.90, 0.98, 1.0], sign: 'SOL BANK', signCol: [0.20, 0.88, 1.0, 1.0] },
      { body: [0.78, 0.62, 0.44, 1.0], trim: [0.92, 0.84, 0.70, 1.0], crown: [1.0, 0.65, 0.28, 1.0], sign: 'METRO CASINO', signCol: [1.0, 0.45, 0.18, 1.0] },
      { body: [0.88, 0.84, 0.76, 1.0], trim: [0.38, 0.44, 0.52, 1.0], crown: [0.96, 0.32, 0.24, 1.0], sign: 'CAFE RIVIERA', signCol: [0.96, 0.84, 0.25, 1.0] },
      { body: [0.35, 0.48, 0.65, 1.0], trim: [0.90, 0.90, 0.94, 1.0], crown: [0.45, 0.85, 1.0, 1.0], sign: 'VELA TOWER', signCol: [0.35, 0.85, 0.95, 1.0] },
    ];

    let pIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        // Sidewalk plaza base
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false, true);

        const pal = towerPalettes[(pIdx++) % towerPalettes.length];
        const height = 58 + ((Math.abs(Math.floor(bx.xMid * 9 + bz.zMid * 17))) % 56);

        // Ground podium floor with wide storefront windows
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT, bz.zMid, bx.width - 4, 6.0, bz.length - 4, pal.trim, [0.5, 0.5], true, true);

        // Main tower body
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + 6.0, bz.zMid, bx.width - 7, height - 6.0, bz.length - 7, pal.body, [0.25, 0.25], true, true);

        // Long directional ground shadow cast by the tower
        this.addGroundShadow(bx.xMid, bz.zMid, bx.width - 7, bz.length - 7, height);

        // Architectural balconies with railings on mid floors (floors 3, 5, 7)
        for (let bY = WORLD.CURB_HEIGHT + 14; bY < Math.min(height - 10, 42); bY += 9) {
          const balW = bx.width - 12;
          const balL = 2.4;
          const balZ = bz.zMid - bz.length * 0.5 + 2.0;

          // Balcony slab
          this.addBox(bx.xMid, bY, balZ, balW, 0.40, balL, [0.88, 0.86, 0.82, 1.0], [1, 1], false, true);
          // Balcony wrought-iron railing
          this.addBox(bx.xMid, bY + 0.45, balZ - balL * 0.5 + 0.1, balW, 0.90, 0.12, [0.18, 0.20, 0.22, 1.0], [1, 1], false, false);
          this.addBox(bx.xMid - balW * 0.5 + 0.1, bY + 0.45, balZ, 0.12, 0.90, balL, [0.18, 0.20, 0.22, 1.0], [1, 1], false, false);
          this.addBox(bx.xMid + balW * 0.5 - 0.1, bY + 0.45, balZ, 0.12, 0.90, balL, [0.18, 0.20, 0.22, 1.0], [1, 1], false, false);

          // Balcony flower planter box with bougainvillea
          this.addBox(bx.xMid, bY + 0.40, balZ - balL * 0.5 + 0.25, balW * 0.75, 0.35, 0.35, [0.82, 0.38, 0.24, 1.0], [1, 1], false, true);
          this.addBox(bx.xMid, bY + 0.70, balZ - balL * 0.5 + 0.25, balW * 0.72, 0.25, 0.32, [0.92, 0.28, 0.36, 1.0], [1, 1], false, false);
        }

        // Air conditioning condenser units bracketed to side walls
        for (let acY = WORLD.CURB_HEIGHT + 10; acY < Math.min(height - 8, 36); acY += 8) {
          this.addBox(bx.xMid + (bx.width - 7) * 0.5 + 0.45, acY, bz.zMid - 4, 0.85, 0.75, 1.1, [0.65, 0.68, 0.72, 1.0], [1, 1], false, true);
          this.addBox(bx.xMid - (bx.width - 7) * 0.5 - 0.45, acY + 3, bz.zMid + 4, 0.85, 0.75, 1.1, [0.65, 0.68, 0.72, 1.0], [1, 1], false, true);
        }

        // Industrial steel fire escape down side facade
        const feX = bx.xMid + (bx.width - 7) * 0.5 + 0.7;
        for (let feY = WORLD.CURB_HEIGHT + 8; feY < Math.min(height - 12, 38); feY += 6) {
          // Landing platform
          this.addBox(feX, feY, bz.zMid + 2, 1.4, 0.25, 2.8, [0.22, 0.24, 0.28, 1.0], [1, 1], false, true);
          // Railing
          this.addBox(feX + 0.6, feY + 0.55, bz.zMid + 2, 0.1, 0.85, 2.8, [0.22, 0.24, 0.28, 1.0], [1, 1], false, false);
          // Angled ladder/stair
          this.addBox(feX, feY + 3.0, bz.zMid - 0.5, 0.45, 5.8, 0.2, [0.22, 0.24, 0.28, 1.0], [1, 1], false, false);
        }

        // Rooftop Clutter: Wooden water tank on metal stilt legs
        const tankX = bx.xMid - 5.5;
        const tankZ = bz.zMid - 4.5;
        const tankBaseY = WORLD.CURB_HEIGHT + height;
        // 4 stilt legs
        this.addBox(tankX - 1.2, tankBaseY, tankZ - 1.2, 0.35, 3.2, 0.35, [0.22, 0.24, 0.28, 1.0], [1, 1], false, false);
        this.addBox(tankX + 1.2, tankBaseY, tankZ - 1.2, 0.35, 3.2, 0.35, [0.22, 0.24, 0.28, 1.0], [1, 1], false, false);
        this.addBox(tankX - 1.2, tankBaseY, tankZ + 1.2, 0.35, 3.2, 0.35, [0.22, 0.24, 0.28, 1.0], [1, 1], false, false);
        this.addBox(tankX + 1.2, tankBaseY, tankZ + 1.2, 0.35, 3.2, 0.35, [0.22, 0.24, 0.28, 1.0], [1, 1], false, false);
        // Wooden barrel tank body
        this.addBox(tankX, tankBaseY + 3.2, tankZ, 3.8, 3.6, 3.8, [0.62, 0.44, 0.30, 1.0], [1, 1], false, true);
        // Conical / tiered roof
        this.addBox(tankX, tankBaseY + 6.8, tankZ, 3.4, 0.8, 3.4, [0.45, 0.30, 0.20, 1.0], [1, 1], false, true);

        // Rooftop HVAC chiller units and elevator penthouse
        this.addBox(bx.xMid + 4, WORLD.CURB_HEIGHT + height, bz.zMid + 3, 5.2, 3.2, 6.2, [0.55, 0.58, 0.62, 1.0], [1, 1], false, true);
        this.addBox(bx.xMid + 4, WORLD.CURB_HEIGHT + height + 3.2, bz.zMid + 3, 3.6, 1.2, 3.6, [0.42, 0.45, 0.48, 1.0], [1, 1], false, true);

        // Satellite Dish on roof
        const satX = bx.xMid + 6.5;
        const satZ = bz.zMid - 5.0;
        this.addBox(satX, tankBaseY, satZ, 0.3, 1.8, 0.3, [0.25, 0.28, 0.32, 1.0], [1, 1], false, false);
        this.addBox(satX - 0.4, tankBaseY + 1.8, satZ - 0.4, 2.2, 2.2, 0.25, [0.90, 0.92, 0.95, 1.0], [1, 1], false, true);

        // Rooftop Garden Pergola with greenery
        this.addBox(bx.xMid - 4.5, tankBaseY, bz.zMid + 5.0, 5.0, 0.3, 4.5, [0.28, 0.65, 0.32, 1.0], [1, 1], false, true);
        this.addBox(bx.xMid - 4.5, tankBaseY + 2.5, bz.zMid + 5.0, 4.8, 0.2, 4.2, [0.55, 0.40, 0.28, 1.0], [1, 1], false, true);

        // Illuminated architectural setback crown
        if (height > 65) {
          const tierH = 24;
          const tierW = Math.max(14, bx.width - 15);
          const tierL = Math.max(14, bz.length - 15);
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height, bz.zMid, tierW, tierH, tierL, pal.trim, [0.2, 0.2], true, true);

          // Helipad or rooftop beacon
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + tierH, bz.zMid, 12, 0.7, 12, pal.crown, [1, 1], false, true);
          // Communications Mast with warning beacon
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + tierH + 0.7, bz.zMid, 0.9, 16, 0.9, [0.95, 0.25, 0.25, 1.0], [1, 1], false, false);
          this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + tierH + 16.7, bz.zMid, 1.4, 1.4, 1.4, [1.5, 0.2, 0.2, 1.0], [1, 1], false, false);
        }

        // Storefront Canopy / Portico
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + 4.2, bz.zMid - bz.length * 0.5 + 2.8, Math.min(22, bx.width - 8), 0.45, 5.0, [0.25, 0.28, 0.34, 1.0], [1, 1], false, true);

        // Storefront Striped Fabric Awning
        this.addAwning(bx.xMid, WORLD.CURB_HEIGHT + 3.8, bz.zMid - bz.length * 0.5 + 1.2, Math.min(18, bx.width - 10), 2.8, [0.88, 0.42, 0.22, 1.0], [0.96, 0.94, 0.88, 1.0]);

        // Illuminated Storefront Signboard
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + 5.2, bz.zMid - bz.length * 0.5 + 0.3, 11.0, 1.1, 0.3, pal.signCol, [1, 1], false, false);
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
      [0.86, 0.42, 0.24, 1.0], // Terracotta Rust
      [0.94, 0.76, 0.42, 1.0], // Mediterranean Ochre
      [0.88, 0.82, 0.72, 1.0], // Travertine Cream
      [0.58, 0.72, 0.52, 1.0], // Tuscan Sage Green
      [0.82, 0.48, 0.42, 1.0], // Coral Rose
    ];

    let cIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false, true);

        const subH1 = 18 + ((Math.abs(Math.floor(bx.xMid))) % 10);
        const subH2 = 15 + ((Math.abs(Math.floor(bz.zMid))) % 8);
        const col1 = facadeColors[(cIdx++) % facadeColors.length];
        const col2 = facadeColors[(cIdx++) % facadeColors.length];

        // West townhouse
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT, bz.zMid, bx.width * 0.46, subH1, bz.length - 6, col1, [0.4, 0.4], true, true);
        this.addGroundShadow(bx.xMid - bx.width * 0.22, bz.zMid, bx.width * 0.46, bz.length - 6, subH1);

        // East townhouse
        this.addBox(bx.xMid + bx.width * 0.22, WORLD.CURB_HEIGHT, bz.zMid, bx.width * 0.46, subH2, bz.length - 6, col2, [0.4, 0.4], true, true);
        this.addGroundShadow(bx.xMid + bx.width * 0.22, bz.zMid, bx.width * 0.46, bz.length - 6, subH2);

        // Storefront striped awnings
        this.addAwning(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT + 3.4, bz.zMid - bz.length * 0.5 + 2.5, bx.width * 0.42, 3.2, [0.22, 0.58, 0.38, 1.0], [0.96, 0.94, 0.88, 1.0]);
        this.addAwning(bx.xMid + bx.width * 0.22, WORLD.CURB_HEIGHT + 3.4, bz.zMid - bz.length * 0.5 + 2.5, bx.width * 0.42, 3.2, [0.88, 0.26, 0.22, 1.0], [0.96, 0.94, 0.88, 1.0]);

        // Wrought-iron balconies on upper floors
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT + 7.5, bz.zMid - bz.length * 0.5 + 0.8, bx.width * 0.36, 0.9, 1.4, [0.22, 0.24, 0.28, 1.0], [1, 1], false, true);
        this.addBox(bx.xMid + bx.width * 0.22, WORLD.CURB_HEIGHT + 7.5, bz.zMid - bz.length * 0.5 + 0.8, bx.width * 0.36, 0.9, 1.4, [0.22, 0.24, 0.28, 1.0], [1, 1], false, true);

        // Terracotta flower boxes on balconies
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT + 8.1, bz.zMid - bz.length * 0.5 + 0.8, bx.width * 0.30, 0.35, 0.35, [0.82, 0.38, 0.22, 1.0], [1, 1], false, true);
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT + 8.4, bz.zMid - bz.length * 0.5 + 0.8, bx.width * 0.28, 0.20, 0.30, [0.96, 0.30, 0.35, 1.0], [1, 1], false, false);

        // Rooftop terracotta tiles and chimneys
        this.addBox(bx.xMid - bx.width * 0.22, WORLD.CURB_HEIGHT + subH1, bz.zMid, bx.width * 0.48, 1.2, bz.length - 5, [0.74, 0.34, 0.20, 1.0], [1, 1], false, true);
        this.addBox(bx.xMid + bx.width * 0.22, WORLD.CURB_HEIGHT + subH2, bz.zMid, bx.width * 0.48, 1.2, bz.length - 5, [0.74, 0.34, 0.20, 1.0], [1, 1], false, true);

        // Brick chimneys
        this.addBox(bx.xMid - bx.width * 0.22 - 2.5, WORLD.CURB_HEIGHT + subH1 + 1.2, bz.zMid + 3, 1.2, 2.4, 1.2, [0.65, 0.32, 0.22, 1.0], [1, 1], false, true);
        this.addBox(bx.xMid + bx.width * 0.22 + 2.5, WORLD.CURB_HEIGHT + subH2 + 1.2, bz.zMid - 3, 1.2, 2.4, 1.2, [0.65, 0.32, 0.22, 1.0], [1, 1], false, true);
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

    // Art Deco Pastel Palettes: Brilliant white, coastal aqua mint, sunset peach, coral pink
    const resortPalettes = [
      { body: [0.96, 0.96, 0.98, 1.0], trim: [0.15, 0.85, 0.75, 1.0], name: 'HOTEL PALOMA' },
      { body: [0.62, 0.90, 0.86, 1.0], trim: [0.98, 0.98, 1.0, 1.0], name: 'RIVIERA RESORT' },
      { body: [0.98, 0.72, 0.66, 1.0], trim: [0.96, 0.92, 0.85, 1.0], name: 'SOLARIS INN' },
      { body: [0.98, 0.88, 0.68, 1.0], trim: [0.20, 0.80, 0.72, 1.0], name: 'CLUB OCEANA' },
    ];

    let rIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false, true);

        const height = 30 + ((Math.abs(Math.floor(bx.xMid * 5 + bz.zMid * 7))) % 24);
        const resort = resortPalettes[(rIdx++) % resortPalettes.length];

        this.addBox(bx.xMid, WORLD.CURB_HEIGHT, bz.zMid, bx.width - 6, height, bz.length - 6, resort.body, [0.35, 0.35], true, true);
        this.addGroundShadow(bx.xMid, bz.zMid, bx.width - 6, bz.length - 6, height);

        // Tiered cantilevered white balcony ribbons with railings
        const balconyWhite = [1.0, 1.0, 1.0, 1.0];
        for (let y = WORLD.CURB_HEIGHT + 4.5; y < height; y += 4.5) {
          const balZ = bz.zMid - bz.length * 0.5 + 2.5;
          const balW = bx.width - 8;
          // Balcony floor
          this.addBox(bx.xMid, y, balZ, balW, 0.40, 2.0, balconyWhite, [1, 1], false, true);
          // Balcony railing
          this.addBox(bx.xMid, y + 0.45, balZ - 0.9, balW, 0.85, 0.1, [0.95, 0.95, 0.98, 1.0], [1, 1], false, false);
        }

        // Rooftop Art Deco spires and neon signs
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height, bz.zMid, 6.0, 4.0, 6.0, resort.trim, [1, 1], false, true);
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height + 4.0, bz.zMid, 1.0, 6.5, 1.0, [0.15, 0.85, 0.75, 1.0], [1, 1], false, false);

        // Illuminated hotel facade signboard
        this.addBox(bx.xMid, WORLD.CURB_HEIGHT + height - 2.5, bz.zMid - bz.length * 0.5 + 2.8, 9.5, 1.2, 0.35, [0.15, 0.88, 0.85, 1.0], [1, 1], false, false);
      }
    }
  }

  addAwning(x, y, z, width, depth, color1, color2) {
    const hw = width * 0.5;
    const hd = depth * 0.5;

    // Sloping awning frame
    const p1 = [x - hw, y + 0.8, z - hd];
    const p2 = [x + hw, y + 0.8, z - hd];
    const p3 = [x + hw, y, z + hd];
    const p4 = [x - hw, y, z + hd];

    const norm = [0, 0.707, 0.707];
    this.addQuad(p1, p2, p3, p4, norm, color1, [4, 1]);

    // Front valance fringe
    this.addBox(x, y - 0.3, z + hd, width, 0.6, 0.1, color2, [1, 1], false, true);
  }

  generateParksAndPlazas() {
    // Lush central green park plaza at X = 80, Z = 52.5
    const grassGreen = [0.28, 0.70, 0.32, 1.0];
    const fountainBlue = [0.15, 0.55, 0.75, 1.0];

    // Park lawn pad
    this.addBox(80.0, WORLD.CURB_HEIGHT, 52.5, 46, 0.25, 44, grassGreen, [4, 4], false, true);

    // Decorative central reflecting fountain basin
    this.addBox(80.0, WORLD.CURB_HEIGHT + 0.3, 52.5, 14, 0.65, 14, [0.78, 0.80, 0.84, 1.0], [1, 1], true, true);
    this.addBox(80.0, WORLD.CURB_HEIGHT + 0.6, 52.5, 12, 0.35, 12, fountainBlue, [1, 1], false, false);

    // Palm and Cypress trees in park
    this.addPalmTree(65, WORLD.CURB_HEIGHT, 38);
    this.addPalmTree(95, WORLD.CURB_HEIGHT, 38);
    this.addCypressTree(65, WORLD.CURB_HEIGHT, 67);
    this.addCypressTree(95, WORLD.CURB_HEIGHT, 67);

    // Park benches
    this.addBench(73, WORLD.CURB_HEIGHT + 0.25, 42, 0);
    this.addBench(87, WORLD.CURB_HEIGHT + 0.25, 42, 0);
  }

  generateMarinaAndWaterfront() {
    // Broad seaside promenade boardwalk
    const timberColor = [0.70, 0.52, 0.38, 1.0]; // Warm sunlit cedar boardwalk
    const railingColor = [0.94, 0.96, 0.98, 1.0];

    // Main boardwalk along coast
    this.addBox(-122, 0.28, 0, 15, 0.55, WORLD.SIZE * 0.92, timberColor, [1, 2], false, true);

    // Promenade pedestrian safety railing
    this.addBox(-128.5, 0.95, 0, 0.3, 0.85, WORLD.SIZE * 0.92, railingColor, [1, 1], true, true);

    // Marina boat slips & wooden jetties
    const pierZList = [-150, -70, 60, 140];
    const pierLen = 44;
    const pierW = 7.0;

    for (const pz of pierZList) {
      this.addBox(WORLD.COAST_X - pierLen * 0.5, 0.24, pz, pierLen, 0.45, pierW, timberColor, [2, 1], false, true);

      // Moored luxury powerboats & yachts
      this.addBoat(WORLD.COAST_X - 24, -0.2, pz + 8.0);
    }
  }

  addBoat(x, y, z) {
    const hullWhite = [0.96, 0.96, 0.98, 1.0];
    const cabinNavy = [0.12, 0.32, 0.58, 1.0];
    const glassTint = [0.10, 0.18, 0.28, 1.0];

    // Hull
    this.addBox(x, y + 0.6, z, 13, 1.25, 4.2, hullWhite, [1, 1], true, true);
    // Cabin
    this.addBox(x - 1.2, y + 1.7, z, 6.0, 1.1, 3.0, cabinNavy, [1, 1], false, true);
    // Windshield
    this.addBox(x + 2.2, y + 1.6, z, 1.4, 0.85, 2.8, glassTint, [1, 1], false, false);
  }

  generateDocksAndCranes() {
    // Meridian Cargo Docks in South-East district
    const dockApron = [0.38, 0.40, 0.44, 1.0];
    this.addBox(140, 0.08, 140, 160, 0.16, 160, dockApron, [1, 1], false, true);

    // Safety yellow & black hazard boundary strip along wharf
    const hazardYellow = [1.0, 0.82, 0.08, 1.0];
    this.addBox(140, 0.18, 220, 160, 0.04, 1.8, hazardYellow, [1, 1], false, false);
    this.addBox(220, 0.18, 140, 1.8, 0.04, 160, hazardYellow, [1, 1], false, false);

    // Deep harbor ocean water basin
    const harborColor = [0.06, 0.46, 0.62, 0.95];
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
    this.addBox(244, -1.0, 160, 24, 7.0, 80, [0.22, 0.24, 0.28, 1.0], [1, 1], true, true);
    this.addBox(244, 6.0, 128, 16, 8.5, 20, [0.92, 0.92, 0.95, 1.0], [1, 1], true, true);

    // Cargo Warehouses
    const whColor = [0.46, 0.48, 0.52, 1.0];
    const whRoof = [0.72, 0.34, 0.24, 1.0];
    this.addBox(80, 0, 70, 38, 14, 32, whColor, [0.2, 0.2], true, true);
    this.addBox(80, 14, 70, 40, 2.6, 34, whRoof, [1, 1], false, true);

    this.addBox(80, 0, 150, 38, 14, 32, whColor, [0.2, 0.2], true, true);
    this.addBox(80, 14, 150, 40, 2.6, 34, whRoof, [1, 1], false, true);

    // Multi-tier shipping container stacks in bold high-chroma primary colors
    const containerColors = [
      [0.90, 0.20, 0.16, 1.0], // Crimson Red
      [0.15, 0.52, 0.90, 1.0], // Ocean Blue
      [0.98, 0.56, 0.10, 1.0], // High-Vis Orange
      [0.18, 0.68, 0.38, 1.0], // Jade Green
      [0.96, 0.84, 0.14, 1.0], // Industrial Yellow
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
          this.addBox(cx, l * cH, cz, cW, cH, cL, col, [1, 1], true, true);
        }
        this.addGroundShadow(cx, cz, cW, cL, layers * cH);
      }
    }

    // Contraband Heist Loot Crates near Pier 7
    const crateWood = [0.78, 0.56, 0.34, 1.0];
    const crateBands = [0.22, 0.22, 0.24, 1.0];
    this.addBox(146.0, 0.08, 114.0, 1.6, 1.5, 1.6, crateWood, [1, 1], true, true);
    this.addBox(146.0, 0.45, 114.0, 1.65, 0.2, 1.65, crateBands, [1, 1], false, false);
    this.addBox(148.0, 0.08, 115.0, 1.4, 1.3, 1.4, crateWood, [1, 1], true, true);
    this.addBox(147.0, 1.58, 114.5, 1.2, 1.1, 1.2, crateWood, [1, 1], false, true);

    // Massive 36m Industrial Gantry Crane
    this.buildGantryCrane(150, 0, 155);
  }

  buildGantryCrane(x, y, z) {
    const craneYellow = [1.0, 0.80, 0.10, 1.0]; // Bright industrial yellow
    const metalDark = [0.26, 0.28, 0.32, 1.0];

    const height = 36;
    const spanW = 28;
    const depthL = 19;

    const hw = spanW * 0.5;
    const hl = depthL * 0.5;

    // 4 legs
    this.addBox(x - hw, y, z - hl, 1.9, height, 1.9, craneYellow, [1, 1], true, true);
    this.addBox(x + hw, y, z - hl, 1.9, height, 1.9, craneYellow, [1, 1], true, true);
    this.addBox(x - hw, y, z + hl, 1.9, height, 1.9, craneYellow, [1, 1], true, true);
    this.addBox(x + hw, y, z + hl, 1.9, height, 1.9, craneYellow, [1, 1], true, true);

    // Cross braces
    this.addBox(x - hw, y + height * 0.5, z, 1.3, 1.3, depthL, craneYellow, [1, 1], false, true);
    this.addBox(x + hw, y + height * 0.5, z, 1.3, 1.3, depthL, craneYellow, [1, 1], false, true);

    // Overhead gantry boom
    this.addBox(x, y + height, z, spanW + 16, 3.4, 4.8, craneYellow, [1, 1], true, true);

    // Cab & Spreader
    this.addBox(x + 2, y + height - 2.8, z, 4.8, 2.6, 3.6, metalDark, [1, 1], false, true);
    this.addBox(x + 2, y + height - 12, z, 0.3, 10, 0.3, [0.15, 0.15, 0.15, 1.0], [1, 1], false, false);
    this.addBox(x + 2, y + height - 12, z, 3.2, 0.7, 6.2, metalDark, [1, 1], false, true);

    // Long shadow cast by crane
    this.addGroundShadow(x, z, spanW, depthL, height);
  }

  generatePropsAndStreetFurniture() {
    // 1. Tropical Palm Trees along Coastal Ocean Promenade
    for (let z = -WORLD.HALF_SIZE + 25; z < WORLD.HALF_SIZE - 25; z += 18) {
      this.addPalmTree(-118, 0.3, z);
      this.addPalmTree(-90, 0.24, z);
    }

    // 2. Mediterranean Slender Cypress Trees along Downtown plazas and Old Town
    for (let z = -220; z <= -20; z += 35) {
      this.addCypressTree(18, 0.24, z);
      this.addCypressTree(-12, 0.24, z);
    }

    // 3. Ornate Cast-Iron Street Lampposts with warm glowing lanterns
    const postColor = [0.28, 0.30, 0.34, 1.0];
    const lampGlow = [1.0, 0.92, 0.65, 1.0];

    const lampXList = [-105, 0, 45, 115];
    for (const lx of lampXList) {
      for (let lz = -220; lz <= 220; lz += 42) {
        // Base and post
        this.addBox(lx + 8.5, 0, lz, 0.38, 8.4, 0.38, postColor, [1, 1], false, true);
        // Curved arm
        this.addBox(lx + 7.2, 8.2, lz, 2.8, 0.26, 0.26, postColor, [1, 1], false, true);
        // Lantern head
        this.addBox(lx + 5.9, 8.0, lz, 0.65, 0.28, 0.55, lampGlow, [1, 1], false, false);
      }
    }

    // 4. Fire Hydrants
    const hydrantRed = [0.96, 0.22, 0.18, 1.0];
    for (let z = -200; z <= 200; z += 65) {
      this.addBox(9.4, 0, z, 0.45, 0.95, 0.45, hydrantRed, [1, 1], true, true);
      this.addBox(-9.4, 0, z + 20, 0.45, 0.95, 0.45, hydrantRed, [1, 1], true, true);
    }

    // 5. Park Benches and Litter Bins along sidewalks
    const benchXList = [-50, 40, 110];
    for (const bx of benchXList) {
      for (let bz = -180; bz <= 180; bz += 50) {
        this.addBench(bx, WORLD.CURB_HEIGHT, bz, 0);
        this.addLitterBin(bx + 4.5, WORLD.CURB_HEIGHT, bz);
      }
    }

    // 6. Glass Bus Shelters
    this.addBusShelter(118.5, WORLD.CURB_HEIGHT, -112);
    this.addBusShelter(-51.0, WORLD.CURB_HEIGHT, -80);
    this.addBusShelter(-90.5, WORLD.CURB_HEIGHT, 85);

    // 7. Traffic Light Gantries at Major Intersections
    this.addTrafficLight(115 + 8.0, 0, -115 - 8.0);
    this.addTrafficLight(45 + 8.0, 0, -50 - 8.0);
    this.addTrafficLight(-55 + 8.0, 0, 20 - 8.0);
  }

  addBench(x, y, z, rot = 0) {
    const woodColor = [0.72, 0.48, 0.28, 1.0];
    const ironColor = [0.18, 0.20, 0.22, 1.0];

    // Seat slats
    this.addBox(x, y + 0.45, z, 2.2, 0.08, 0.6, woodColor, [1, 1], false, true);
    // Backrest slats
    this.addBox(x, y + 0.85, z - 0.28, 2.2, 0.45, 0.08, woodColor, [1, 1], false, true);
    // Iron legs
    this.addBox(x - 0.95, y, z, 0.1, 0.48, 0.6, ironColor, [1, 1], false, false);
    this.addBox(x + 0.95, y, z, 0.1, 0.48, 0.6, ironColor, [1, 1], false, false);
  }

  addLitterBin(x, y, z) {
    const binCol = [0.32, 0.35, 0.38, 1.0];
    const lidCol = [0.78, 0.80, 0.84, 1.0];
    this.addBox(x, y, z, 0.55, 0.95, 0.55, binCol, [1, 1], true, true);
    this.addBox(x, y + 0.95, z, 0.60, 0.12, 0.60, lidCol, [1, 1], false, false);
  }

  addBusShelter(x, y, z) {
    const frameCol = [0.22, 0.25, 0.28, 1.0];
    const glassCol = [0.35, 0.65, 0.85, 0.65];
    const adPoster = [0.96, 0.45, 0.22, 1.0];

    // Frame posts
    this.addBox(x - 1.8, y, z, 0.15, 2.8, 0.15, frameCol, [1, 1], true, false);
    this.addBox(x + 1.8, y, z, 0.15, 2.8, 0.15, frameCol, [1, 1], true, false);
    // Roof canopy
    this.addBox(x, y + 2.8, z + 0.4, 4.0, 0.15, 1.8, frameCol, [1, 1], false, true);
    // Rear glass panel
    this.addBox(x, y + 1.2, z - 0.05, 3.6, 2.2, 0.06, glassCol, [1, 1], false, false);
    // Interior bench
    this.addBox(x, y + 0.45, z + 0.3, 2.4, 0.08, 0.45, [0.65, 0.45, 0.28, 1.0], [1, 1], false, true);
    // Side advertising lightbox
    this.addBox(x + 1.8, y + 0.8, z + 0.4, 0.12, 1.8, 1.0, adPoster, [1, 1], false, false);
  }

  addTrafficLight(x, y, z) {
    const mastCol = [0.25, 0.28, 0.30, 1.0];
    const boxCol = [0.16, 0.18, 0.20, 1.0];

    // Vertical mast and overhead arm
    this.addBox(x, y, z, 0.4, 7.5, 0.4, mastCol, [1, 1], false, true);
    this.addBox(x - 3.0, y + 7.3, z, 6.4, 0.3, 0.3, mastCol, [1, 1], false, true);

    // 3-Aspect Signal Box (Red, Amber, Green)
    this.addBox(x - 4.5, y + 6.4, z, 0.65, 1.8, 0.55, boxCol, [1, 1], false, true);
    this.addBox(x - 4.5, y + 7.0, z - 0.3, 0.38, 0.38, 0.1, [0.98, 0.15, 0.15, 1.0], [1, 1], false, false); // Red
    this.addBox(x - 4.5, y + 6.4, z - 0.3, 0.38, 0.38, 0.1, [0.35, 0.25, 0.05, 1.0], [1, 1], false, false); // Amber
    this.addBox(x - 4.5, y + 5.8, z - 0.3, 0.38, 0.38, 0.1, [0.15, 0.98, 0.35, 1.0], [1, 1], false, false); // Green
  }

  addPalmTree(x, y, z) {
    const trunkColor = [0.48, 0.36, 0.24, 1.0];
    const frondColor = [0.22, 0.68, 0.28, 1.0];

    const trunkH = 8.8;
    this.addBox(x, y, z, 0.70, trunkH, 0.70, trunkColor, [1, 1], true, true);

    // Palm fronds - 8 radial arching foliage segments
    const frondLen = 4.4;
    const frondW = 1.3;
    const topY = y + trunkH;
    const angles = [0, Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75, Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];

    for (const ang of angles) {
      const fx = x + Math.cos(ang) * (frondLen * 0.45);
      const fz = z + Math.sin(ang) * (frondLen * 0.45);
      this.addBox(fx, topY - 0.4, fz, frondW, 0.16, frondLen * 0.92, frondColor, [1, 1], false, true);
    }

    // Directional shadow on ground
    this.addGroundShadow(x, z, 3.5, 3.5, trunkH);
  }

  addCypressTree(x, y, z) {
    const trunkColor = [0.38, 0.28, 0.20, 1.0];
    const foliageColor = [0.18, 0.48, 0.24, 1.0]; // Deep evergreen cypress green

    // Trunk
    this.addBox(x, y, z, 0.45, 2.0, 0.45, trunkColor, [1, 1], true, true);
    // Slender tapered columnar foliage
    this.addBox(x, y + 1.8, z, 1.8, 4.0, 1.8, foliageColor, [1, 1], false, true);
    this.addBox(x, y + 5.6, z, 1.3, 3.8, 1.3, foliageColor, [1, 1], false, true);
    this.addBox(x, y + 9.2, z, 0.8, 2.5, 0.8, foliageColor, [1, 1], false, true);

    this.addGroundShadow(x, z, 2.2, 2.2, 10.0);
  }

  generateParkedCars() {
    // Adds realistic kerbside parked civilian vehicles along avenues to make the city feel alive
    const parkedDefs = [
      // Downtown Avenue (X = 120 kerbside)
      { type: 'sedan', x: 121.2, z: -108.0, rot: Math.PI },
      { type: 'sports', x: 121.2, z: -130.0, rot: Math.PI },
      { type: 'taxi', x: 121.2, z: -150.0, rot: Math.PI },
      { type: 'hatchback', x: 140.8, z: -104.0, rot: 0 },
      { type: 'muscle', x: 140.8, z: -128.0, rot: 0 },

      // Ocean Promenade (X = -112 kerbside)
      { type: 'sports', x: -111.5, z: 92.0, rot: 0 },
      { type: 'sedan', x: -111.5, z: 114.0, rot: 0 },
      { type: 'hatchback', x: -98.5, z: 82.0, rot: Math.PI },
      { type: 'sedan', x: -98.5, z: 104.0, rot: Math.PI },
    ];

    const carColors = {
      sports: [0.08, 0.82, 0.88, 1.0],      // Coastal turquoise
      muscle: [0.96, 0.42, 0.14, 1.0],      // Sunset flame
      sedan: [0.88, 0.84, 0.78, 1.0],       // Champagne pearl
      taxi: [0.98, 0.82, 0.10, 1.0],        // High-vis amber
      hatchback: [0.88, 0.32, 0.28, 1.0],   // Coral red
    };

    for (const p of parkedDefs) {
      const col = carColors[p.type] || [0.8, 0.8, 0.8, 1.0];
      const w = 2.1, l = 4.6, h = 1.35;

      // Lower body
      this.addBox(p.x, 0.24, p.z, w, h * 0.45, l, col, [1, 1], true, true);
      // Cabin & dark windows
      this.addBox(p.x, 0.24 + h * 0.45, p.z - l * 0.06, w * 0.88, h * 0.50, l * 0.55, [0.12, 0.18, 0.25, 1.0], [1, 1], false, false);
      // Wheels
      this.addBox(p.x - w * 0.45, 0.32, p.z + l * 0.32, 0.28, 0.64, 0.64, [0.15, 0.15, 0.16, 1.0], [1, 1], false, false);
      this.addBox(p.x + w * 0.45, 0.32, p.z + l * 0.32, 0.28, 0.64, 0.64, [0.15, 0.15, 0.16, 1.0], [1, 1], false, false);
      this.addBox(p.x - w * 0.45, 0.32, p.z - l * 0.32, 0.28, 0.64, 0.64, [0.15, 0.15, 0.16, 1.0], [1, 1], false, false);
      this.addBox(p.x + w * 0.45, 0.32, p.z - l * 0.32, 0.28, 0.64, 0.64, [0.15, 0.15, 0.16, 1.0], [1, 1], false, false);

      // Ground shadow under parked car
      this.addGroundShadow(p.x, p.z, w, l, h);
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
