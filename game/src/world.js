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
 * - Marina, harbor suspension bridge, working Meridian Cargo Docks with Pier 7 quay slabs, moored cargo barge,
 *   far shore breakwater, harbour cranes, stacked containers, warehouse roller door, bollards, gulls,
 *   and distant Monte Sereno hills
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
    const shadowColor = [0.46, 0.46, 0.50, 1.0]; // Ambient-lit Mediterranean ground shadow (soft, never pitch black)
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
    const groundColor = [0.42, 0.40, 0.38, 1.0];
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
    const seawallColor = [0.65, 0.63, 0.60, 1.0];
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
    const asphaltColor = [0.40, 0.39, 0.41, 1.0];
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

    const concreteDeck = [0.65, 0.67, 0.70, 1.0];
    const highwayAsphalt = [0.38, 0.37, 0.40, 1.0];
    const barrierColor = [0.88, 0.90, 0.94, 1.0];
    const pillarColor = [0.55, 0.57, 0.60, 1.0];

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
    const roadwayColor = [0.38, 0.37, 0.40, 1.0];

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

    // Historic Mediterranean pastel facades: terracotta red, limewash yellow, warm sienna, olive plaster
    const oldTownPalettes = [
      { wall: [0.86, 0.44, 0.28, 1.0], roof: [0.72, 0.28, 0.18, 1.0], shutter: [0.22, 0.52, 0.42, 1.0] },
      { wall: [0.94, 0.82, 0.48, 1.0], roof: [0.75, 0.32, 0.20, 1.0], shutter: [0.25, 0.35, 0.65, 1.0] },
      { wall: [0.82, 0.58, 0.40, 1.0], roof: [0.68, 0.25, 0.16, 1.0], shutter: [0.32, 0.48, 0.28, 1.0] },
      { wall: [0.92, 0.88, 0.80, 1.0], roof: [0.74, 0.30, 0.18, 1.0], shutter: [0.78, 0.38, 0.22, 1.0] },
    ];

    let oIdx = 0;
    for (const bx of blockDefs) {
      for (const bz of rowDefs) {
        this.addBox(bx.xMid, 0, bz.zMid, bx.width, WORLD.CURB_HEIGHT, bz.length, sidewalkColor, [1, 1], false, true);

        // Subdivide block into 4 charming historic tenements
        const subW = (bx.width - 4) * 0.5;
        const subL = (bz.length - 4) * 0.5;

        for (let ix = 0; ix < 2; ix++) {
          for (let iz = 0; iz < 2; iz++) {
            const cx = bx.xMid - (bx.width - 4) * 0.25 + ix * subW;
            const cz = bz.zMid - (bz.length - 4) * 0.25 + iz * subL;
            const h = 14 + ((ix * 7 + iz * 11 + bx.xMid * 3) % 12);
            const pal = oldTownPalettes[(oIdx++) % oldTownPalettes.length];

            // Tenement building mass
            this.addBox(cx, WORLD.CURB_HEIGHT, cz, subW - 1.2, h, subL - 1.2, pal.wall, [0.3, 0.3], true, true);

            // Terracotta barrel-tile sloping roof cap
            this.addBox(cx, WORLD.CURB_HEIGHT + h, cz, subW - 0.6, 2.4, subL - 0.6, pal.roof, [1, 1], false, true);

            // Ground shadow
            this.addGroundShadow(cx, cz, subW - 1.2, subL - 1.2, h);

            // Shuttered windows and small balconies
            for (let fY = WORLD.CURB_HEIGHT + 3.8; fY < h; fY += 3.8) {
              this.addBox(cx, fY, cz - subL * 0.5 + 0.4, subW * 0.6, 1.4, 0.2, pal.shutter, [1, 1], false, false);
              this.addBox(cx, fY - 0.2, cz - subL * 0.5 + 0.6, subW * 0.55, 0.25, 0.7, [0.18, 0.20, 0.22, 1.0], [1, 1], false, false);
            }

            // Striped sidewalk awning
            this.addAwning(cx, WORLD.CURB_HEIGHT + 2.8, cz - subL * 0.5 + 0.2, subW * 0.75, 2.2, [0.92, 0.32, 0.22, 1.0], [0.95, 0.92, 0.85, 1.0]);
          }
        }
      }
    }
  }

  buildPromenade(sidewalkColor) {
    // Seaside promenade luxury resorts and beachfront plazas
    const rowDefs = [
      { zMid: -147.5, length: 47 },
      { zMid: -82.5, length: 47 },
      { zMid: 52.5, length: 47 },
      { zMid: 117.5, length: 47 },
    ];

    const hotelColor = [0.95, 0.92, 0.86, 1.0]; // Mediterranean pearl white
    const glassTeal = [0.18, 0.65, 0.75, 0.85];

    for (const rz of rowDefs) {
      const cx = -90;
      const cz = rz.zMid;
      this.addBox(cx, 0, cz, 34, WORLD.CURB_HEIGHT, rz.length, sidewalkColor, [1, 1], false, true);

      // Resort hotel stepped structure
      this.addBox(cx + 4, WORLD.CURB_HEIGHT, cz, 22, 18, rz.length - 8, hotelColor, [0.4, 0.4], true, true);
      this.addBox(cx + 6, WORLD.CURB_HEIGHT + 18, cz, 16, 10, rz.length - 14, hotelColor, [0.4, 0.4], true, true);

      // Ribbon wrap-around balconies facing the sea (-X)
      for (let bY = WORLD.CURB_HEIGHT + 4.5; bY < 18; bY += 4.5) {
        this.addBox(cx - 7.5, bY, cz, 1.8, 0.35, rz.length - 10, hotelColor, [1, 1], false, true);
        this.addBox(cx - 8.3, bY + 0.4, cz, 0.12, 0.85, rz.length - 10, glassTeal, [1, 1], false, false);
      }

      this.addGroundShadow(cx + 4, cz, 22, rz.length - 8, 28);
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
    // =========================================================================
    // Meridian Cargo Docks & Working Harbour at Pier 7 (South-East District)
    // =========================================================================
    // The working harbour quay spans X = 100 to X = 162, Z = 60 to 220.
    // Water basin begins at X = 162, with quay wall dropping into harbour basin.
    // Far shore breakwater and coastline across the water at X = 210..270.

    // 1. Sunlit Concrete Quayside Slab with etched expansion joints
    const dockApron = [0.74, 0.72, 0.68, 1.0];      // Sun-warmed reinforced harbour concrete
    const quayWidth = 62.0;                         // X = 100..162
    const quayLength = 160.0;                       // Z = 60..220
    const quayMidX = 131.0;
    const quayMidZ = 140.0;

    this.addBox(quayMidX, 0.08, quayMidZ, quayWidth, 0.16, quayLength, dockApron, [1, 1], false, true);

    // Concrete slab grid expansion joints etched across quay surface
    const jointColor = [0.52, 0.50, 0.46, 1.0];
    for (let jx = 105; jx <= 160; jx += 9.0) {
      this.addBox(jx, 0.165, quayMidZ, 0.12, 0.02, quayLength, jointColor, [1, 1], false, false);
    }
    for (let jz = 65; jz <= 215; jz += 10.0) {
      this.addBox(quayMidX, 0.165, jz, quayWidth, 0.02, 0.12, jointColor, [1, 1], false, false);
    }

    // 2. Heavy Industrial Crane Rails embedded in the quay along X = 143.0 and X = 158.5
    const railSteel = [0.32, 0.34, 0.38, 1.0];
    const railGripYellow = [0.98, 0.82, 0.10, 1.0];
    this.addBox(143.0, 0.17, quayMidZ, 0.35, 0.06, quayLength - 10, railSteel, [1, 1], false, false);
    this.addBox(143.0 - 0.45, 0.168, quayMidZ, 0.18, 0.02, quayLength - 10, railGripYellow, [1, 1], false, false);
    this.addBox(158.5, 0.17, quayMidZ, 0.35, 0.06, quayLength - 10, railSteel, [1, 1], false, false);
    this.addBox(158.5 + 0.45, 0.168, quayMidZ, 0.18, 0.02, quayLength - 10, railGripYellow, [1, 1], false, false);

    // 3. Quayside Edge Yellow & Black Safety Hazard Chevrons along wharf edge (X = 160.5..162.0)
    const hazardYellow = [1.0, 0.84, 0.08, 1.0];
    const hazardBlack = [0.16, 0.16, 0.18, 1.0];
    this.addBox(161.25, 0.17, quayMidZ, 1.5, 0.03, quayLength, hazardYellow, [1, 1], false, false);
    // Alternating black diagonal hazard hash blocks
    for (let hz = 62; hz < 218; hz += 4.0) {
      this.addBox(161.25, 0.175, hz, 1.45, 0.035, 1.8, hazardBlack, [1, 1], false, false);
    }

    // Granite quayside vertical drop wall (face +X) dropping into the water
    const quayWallColor = [0.58, 0.56, 0.54, 1.0];
    this.addBox(162.0, -1.8, quayMidZ, 0.8, 3.8, quayLength, quayWallColor, [1, 1], true, true);

    // 4. Stenciled Painted Quay Markings (PIER 7, BAY 04, cargo bay rectangles)
    const paintWhite = [0.94, 0.94, 0.96, 1.0];
    // Pier 7 Large Stencil lettering on quay slab
    this.addBox(151.0, 0.17, 102.0, 6.0, 0.02, 1.8, hazardYellow, [1, 1], false, false);
    this.addBox(151.0, 0.17, 105.0, 8.0, 0.02, 1.8, paintWhite, [1, 1], false, false); // "PIER 7" zone
    this.addBox(152.0, 0.17, 134.0, 7.5, 0.02, 1.6, paintWhite, [1, 1], false, false); // "BAY 04"
    // Loading bay perimeter boxes
    this.addBox(150.0, 0.17, 118.0, 16.0, 0.02, 0.25, paintWhite, [1, 1], false, false);
    this.addBox(150.0, 0.17, 126.0, 16.0, 0.02, 0.25, paintWhite, [1, 1], false, false);
    this.addBox(142.0, 0.17, 122.0, 0.25, 0.02, 8.0, paintWhite, [1, 1], false, false);
    this.addBox(158.0, 0.17, 122.0, 0.25, 0.02, 8.0, paintWhite, [1, 1], false, false);

    // 5. Heavy Cast-Iron Mooring Bollards along quay lip (X = 161.4)
    const bollardDark = [0.20, 0.22, 0.25, 1.0];
    const bollardZ = [75, 88, 101, 114, 127, 140, 153, 166, 179, 192, 205];
    for (const bz of bollardZ) {
      // Bollard base
      this.addBox(161.35, 0.16, bz, 0.65, 0.20, 0.65, bollardDark, [1, 1], true, true);
      // Bollard columnar post
      this.addBox(161.35, 0.36, bz, 0.44, 0.75, 0.44, bollardDark, [1, 1], true, true);
      // Bollard flared cap
      this.addBox(161.35, 1.11, bz, 0.68, 0.18, 0.68, bollardDark, [1, 1], false, true);
    }

    // 6. Deep Harbour Water Basin (X = 162 to 280, Z = 60 to 220)
    const harborWaterCol = [0.06, 0.46, 0.62, 0.95];
    const hbMinX = 162.2, hbMaxX = WORLD.HALF_SIZE + 100;
    const hbMinZ = 50, hbMaxZ = WORLD.HALF_SIZE + 100;
    const hPts = [
      [hbMinX, WORLD.SEA_LEVEL, hbMinZ],
      [hbMaxX, WORLD.SEA_LEVEL, hbMinZ],
      [hbMaxX, WORLD.SEA_LEVEL, hbMaxZ],
      [hbMinX, WORLD.SEA_LEVEL, hbMinZ],
      [hbMaxX, WORLD.SEA_LEVEL, hbMaxZ],
      [hbMinX, WORLD.SEA_LEVEL, hbMaxZ],
    ];
    for (let p = 0; p < 6; p++) {
      this.waterPositions.push(hPts[p][0], hPts[p][1], hPts[p][2]);
      this.waterNormals.push(0, 1, 0);
      this.waterColors.push(harborWaterCol[0], harborWaterCol[1], harborWaterCol[2], harborWaterCol[3]);
      this.waterUvs.push(hPts[p][0] * 0.04, hPts[p][2] * 0.04);
    }

    // 7. Moored Working Harbour Cargo Barge / Feeder Vessel along Quay Wall
    // Positioned right against Pier 7 quay wall at X = 166..177, Z = 110..144
    this.buildMooredCargoBarge(171.5, -0.4, 126.0);

    // 8. Far Shore & Breakwater across water in the background (X = 210..265, Z = 60..220)
    this.buildFarShoreBreakwater();

    // 9. Harbour Warehouse Wall with Roll-Up Shutter Door on West side of Pier 7 (X = 133..138, Z = 110..142)
    this.buildDockWarehouseWall(133.5, 0.16, 126.0);

    // 10. Multi-Tier Shipping Container Stacks in bold high-chroma primary colors
    // Framing Pier 7 naturally along north perimeter and far eastern background
    const containerColors = [
      [0.90, 0.20, 0.16, 1.0], // Crimson Red
      [0.15, 0.52, 0.90, 1.0], // Ocean Blue
      [0.98, 0.56, 0.10, 1.0], // High-Vis Orange
      [0.18, 0.68, 0.38, 1.0], // Jade Green
      [0.96, 0.84, 0.14, 1.0], // Industrial Yellow
    ];

    const cW = 2.65, cL = 7.2, cH = 2.65;
    let colIdx = 0;

    // Northern perimeter container stacks (Z = 72..86)
    for (let row = 0; row < 3; row++) {
      for (let stackX = 0; stackX < 4; stackX++) {
        const cx = 132 + stackX * 8.6;
        const cz = 72 + row * 4.4;
        const layers = 1 + ((row + stackX) % 3);

        for (let l = 0; l < layers; l++) {
          const col = containerColors[(colIdx++) % containerColors.length];
          this.addBox(cx, 0.16 + l * cH, cz, cL, cH, cW, col, [1, 1], true, true);
        }
      }
    }

    // Background container stacks along northern/eastern edge
    for (let row = 0; row < 2; row++) {
      for (let stackZ = 0; stackZ < 4; stackZ++) {
        const cx = 158 + row * 4.2;
        const cz = 65 + stackZ * 9.5;
        const layers = 1 + ((row + stackZ) % 3);
        for (let l = 0; l < layers; l++) {
          const col = containerColors[(colIdx++) % containerColors.length];
          this.addBox(cx, 0.16 + l * cH, cz, cW, cH, cL, col, [1, 1], true, true);
        }
      }
    }

    // 11. Contraband Heist Crates & Pallets on Pier 7 (Mid Ground Subject of Mission)
    // Placed at [149.8, 0.16, 117.2] right in front of target van
    this.buildContrabandLootStation(149.8, 0.16, 117.2);

    // 12. Harbour Jib Crane on the quayside rail (X = 158.5, Z = 94.0) with angled boom against sunset sky
    this.buildDocksideJibCrane(158.5, 0.16, 94.0);

    // 13. Massive 36m Industrial Gantry Crane towering in background
    this.buildGantryCrane(148, 0.16, 168);

    // 14. White Coastal Gulls in flight over water and perched on containers
    this.buildHarbourGulls();
  }

  buildMooredCargoBarge(x, y, z) {
    // Heavy duty steel cargo barge moored against Pier 7 quay wall
    const hullSteel = [0.22, 0.24, 0.28, 1.0];
    const redBottom = [0.72, 0.22, 0.18, 1.0];
    const deckTimber = [0.65, 0.58, 0.50, 1.0];
    const whiteSuper = [0.94, 0.94, 0.96, 1.0];
    const railingSteel = [0.78, 0.80, 0.84, 1.0];

    const bargeW = 9.5;
    const bargeL = 34.0;
    const bargeH = 2.4;

    // Red anti-fouling lower hull in water
    this.addBox(x, y + 0.4, z, bargeW, 1.0, bargeL, redBottom, [1, 1], true, true);
    // Dark steel freeboard upper hull
    this.addBox(x, y + 1.4, z, bargeW, 1.4, bargeL, hullSteel, [1, 1], true, true);
    // Working deck
    this.addBox(x, y + 2.1, z, bargeW - 0.6, 0.15, bargeL - 0.8, deckTimber, [1, 1], false, true);

    // Raised cargo hatch coamings with tarpaulins
    this.addBox(x, y + 2.4, z - 6.0, bargeW - 2.4, 0.9, 10.0, [0.18, 0.42, 0.58, 1.0], [1, 1], true, true);
    this.addBox(x, y + 2.4, z + 6.0, bargeW - 2.4, 0.9, 10.0, [0.78, 0.38, 0.20, 1.0], [1, 1], true, true);

    // Aft Wheelhouse / Deckhouse
    this.addBox(x, y + 3.2, z - 13.0, 5.5, 2.2, 5.0, whiteSuper, [1, 1], true, true);
    // Wheelhouse navigation bridge windows
    this.addBox(x, y + 3.8, z - 13.0, 5.6, 0.7, 5.1, [0.12, 0.20, 0.30, 1.0], [1, 1], false, false);
    // Exhaust stack funnel
    this.addBox(x, y + 4.8, z - 14.5, 1.1, 2.2, 1.1, [0.85, 0.22, 0.18, 1.0], [1, 1], false, true);
    // Radar mast
    this.addBox(x, y + 5.2, z - 12.0, 0.25, 2.8, 0.25, [0.85, 0.88, 0.92, 1.0], [1, 1], false, false);
    this.addBox(x, y + 6.6, z - 12.0, 1.8, 0.22, 0.4, [0.95, 0.95, 0.98, 1.0], [1, 1], false, false);

    // Deck safety stanchions & railings
    this.addBox(x + (bargeW * 0.5 - 0.2), y + 2.5, z, 0.15, 0.8, bargeL - 2, railingSteel, [1, 1], false, false);
    this.addBox(x - (bargeW * 0.5 - 0.2), y + 2.5, z, 0.15, 0.8, bargeL - 2, railingSteel, [1, 1], false, false);

    // Heavy mooring hawsers / lines stretching from barge deck to Pier 7 bollards
    this.addBox(164.0, 0.85, 114.0, 5.5, 0.12, 0.12, [0.38, 0.34, 0.28, 1.0], [1, 1], false, false);
    this.addBox(164.0, 0.85, 140.0, 5.5, 0.12, 0.12, [0.38, 0.34, 0.28, 1.0], [1, 1], false, false);
  }

  buildFarShoreBreakwater() {
    // Breakwater rocks, far shoreline terrain, and distant Mediterranean coastal silhouettes
    const breakwaterRock = [0.48, 0.46, 0.44, 1.0];
    const farCoastGreen = [0.38, 0.48, 0.34, 1.0];
    const farWarehouse = [0.70, 0.62, 0.52, 1.0];
    const farRoof = [0.72, 0.35, 0.22, 1.0];

    // Rip-rap granite breakwater jetty extending into the bay
    for (let bz = 60; bz <= 210; bz += 16) {
      this.addBox(228, -0.5, bz, 14, 2.8, 18, breakwaterRock, [1, 1], true, true);
      this.addBox(222, -1.0, bz + 4, 10, 1.8, 12, breakwaterRock, [1, 1], true, true);
    }

    // Far shore elevated coastal terrace
    this.addBox(246, 0.5, 140, 24, 5.5, 160, farCoastGreen, [1, 1], false, true);
    this.addBox(258, 2.5, 140, 28, 10.0, 150, [0.62, 0.55, 0.44, 1.0], [1, 1], false, true);

    // Distant coastal harbor structures and lighthouse on the far shore
    this.addBox(244, 6.0, 95, 12, 6.0, 20, farWarehouse, [1, 1], false, true);
    this.addBox(244, 12.0, 95, 13, 2.0, 21, farRoof, [1, 1], false, true);
    this.addBox(244, 6.0, 155, 14, 7.0, 22, farWarehouse, [1, 1], false, true);
    this.addBox(244, 13.0, 155, 15, 2.2, 23, farRoof, [1, 1], false, true);

    // Slender Mediterranean cypresses along the far hillside
    for (let cz = 80; cz <= 190; cz += 25) {
      this.addCypressTree(242, 6.0, cz);
    }
  }

  buildDockWarehouseWall(x, y, z) {
    // Industrial corrugated steel warehouse facade facing Pier 7
    const wallCol = [0.52, 0.55, 0.58, 1.0];       // Corrugated zinc-grey siding
    const trimCol = [0.38, 0.40, 0.44, 1.0];
    const doorCol = [0.24, 0.28, 0.32, 1.0];       // Segmented industrial roll-up door
    const chevronYellow = [1.0, 0.82, 0.10, 1.0];
    const lampGlow = [1.0, 0.95, 0.70, 1.0];

    const wallW = 8.0;
    const wallH = 16.0;
    const wallL = 36.0;

    // Main warehouse mass
    this.addBox(x, y, z, wallW, wallH, wallL, wallCol, [1, 1], true, true);
    // Roof eaves overhang
    this.addBox(x + 0.4, y + wallH, z, wallW + 0.8, 1.2, wallL + 1.2, trimCol, [1, 1], false, true);

    // Massive Roll-Up Shutter Roller Door (facing Pier 7 at +X face)
    const doorX = x + wallW * 0.5 + 0.15;
    const doorH = 7.5;
    const doorL = 10.5;
    this.addBox(doorX, y, z - 2.0, 0.3, doorH, doorL, doorCol, [1, 1], false, true);

    // Horizontal rolling slat ribs across roller door
    for (let slatY = y + 0.6; slatY < y + doorH; slatY += 0.75) {
      this.addBox(doorX + 0.08, slatY, z - 2.0, 0.12, 0.15, doorL - 0.2, [0.35, 0.38, 0.42, 1.0], [1, 1], false, false);
    }

    // Heavy yellow/black hazard chevron lintel bar above roller door
    this.addBox(doorX, y + doorH + 0.35, z - 2.0, 0.45, 0.7, doorL + 0.8, chevronYellow, [1, 1], false, true);
    for (let chZ = z - 2.0 - doorL * 0.45; chZ < z - 2.0 + doorL * 0.45; chZ += 2.0) {
      this.addBox(doorX + 0.05, y + doorH + 0.35, chZ, 0.48, 0.68, 0.9, [0.15, 0.15, 0.16, 1.0], [1, 1], false, false);
    }

    // High gooseneck industrial vapor lamp above roller door with warm cone glow
    this.addBox(doorX + 0.8, y + doorH + 1.8, z - 2.0, 1.6, 0.15, 0.15, trimCol, [1, 1], false, false);
    this.addBox(doorX + 1.6, y + doorH + 1.6, z - 2.0, 0.75, 0.35, 0.65, lampGlow, [1, 1], false, false);

    // Industrial ventilation louvers on warehouse upper facade
    this.addBox(doorX, y + 11.5, z - 8.0, 0.25, 2.4, 4.0, [0.28, 0.30, 0.34, 1.0], [1, 1], false, true);
    this.addBox(doorX, y + 11.5, z + 6.0, 0.25, 2.4, 4.0, [0.28, 0.30, 0.34, 1.0], [1, 1], false, true);
  }

  buildContrabandLootStation(x, y, z) {
    // Contraband Heist Crates staged on wooden cargo pallets
    const woodSlat = [0.78, 0.58, 0.38, 1.0];
    const woodDark = [0.55, 0.40, 0.25, 1.0];
    const steelBand = [0.22, 0.24, 0.28, 1.0];
    const lootGold = [1.0, 0.88, 0.22, 1.0];
    const lootGlow = [0.20, 0.95, 0.85, 1.0];

    // Heavy wooden cargo pallet base (standard Euro-pallet 1.2m x 1.6m footprint)
    this.addBox(x, y, z, 3.4, 0.18, 3.4, woodDark, [1, 1], true, true);
    // Forklift slot stringers
    this.addBox(x, y + 0.18, z, 3.4, 0.14, 0.35, woodDark, [1, 1], false, true);
    this.addBox(x, y + 0.18, z - 1.2, 3.4, 0.14, 0.35, woodDark, [1, 1], false, true);
    this.addBox(x, y + 0.18, z + 1.2, 3.4, 0.14, 0.35, woodDark, [1, 1], false, true);
    // Top deck deckboards
    this.addBox(x, y + 0.32, z, 3.4, 0.08, 3.4, woodSlat, [1, 1], true, true);

    // Main contraband crate #1 (large wooden military crate with steel corner brackets)
    const c1X = x - 0.45;
    const c1Y = y + 0.40;
    const c1Z = z - 0.35;
    this.addBox(c1X, c1Y, c1Z, 1.8, 1.5, 1.8, woodSlat, [1, 1], true, true);
    // Tension steel bands
    this.addBox(c1X, c1Y + 0.4, c1Z, 1.84, 0.12, 1.84, steelBand, [1, 1], false, false);
    this.addBox(c1X, c1Y + 1.0, c1Z, 1.84, 0.12, 1.84, steelBand, [1, 1], false, false);

    // Stenciled contraband markings on crate
    this.addBox(c1X + 0.92, c1Y + 0.7, c1Z, 0.02, 0.4, 0.9, [0.98, 0.22, 0.18, 1.0], [1, 1], false, false);

    // Contraband crate #2 (stacked beside #1)
    const c2X = x + 0.85;
    const c2Y = y + 0.40;
    const c2Z = z + 0.45;
    this.addBox(c2X, c2Y, c2Z, 1.4, 1.3, 1.4, woodSlat, [1, 1], true, true);
    this.addBox(c2X, c2Y + 0.65, c2Z, 1.44, 0.10, 1.44, steelBand, [1, 1], false, false);

    // Open wooden loot crate #3 with glowing contraband cargo inside!
    const c3X = x - 0.25;
    const c3Y = c1Y + 1.5;
    const c3Z = z - 0.25;
    // Lower crate box
    this.addBox(c3X, c3Y, c3Z, 1.25, 0.9, 1.25, woodDark, [1, 1], true, true);
    // Glowing contraband loot inside the open crate (bars & cybertech cache)
    this.addBox(c3X, c3Y + 0.75, c3Z, 0.95, 0.25, 0.95, lootGold, [1, 1], false, false);
    this.addBox(c3X, c3Y + 0.85, c3Z, 0.65, 0.15, 0.65, lootGlow, [1, 1], false, false);

    // Propped open wooden crate lid
    this.addBox(c3X + 0.6, c3Y + 1.1, c3Z, 0.1, 0.85, 1.25, woodSlat, [1, 1], false, true);

    // Hovering 3D Golden Diamond Mission Objective Beacon above the crates!
    const beaconY = c3Y + 2.4;
    this.addBox(x, beaconY, z, 0.55, 0.95, 0.55, lootGold, [1, 1], false, false);
    this.addBox(x, beaconY, z, 0.75, 0.45, 0.75, [1.0, 0.96, 0.45, 1.0], [1, 1], false, false);
    // Pulsing light shaft down to the crates
    this.addBox(x, beaconY - 1.2, z, 0.08, 1.6, 0.08, [1.0, 0.85, 0.25, 0.8], [1, 1], false, false);
  }

  buildDocksideJibCrane(x, y, z) {
    // Quayside rail-mounted luffing jib crane with boom reaching into the sunset sky
    const craneOrange = [0.98, 0.52, 0.10, 1.0];   // High-vis maritime orange
    const craneDark = [0.24, 0.26, 0.30, 1.0];
    const cableSteel = [0.75, 0.78, 0.82, 1.0];

    // Crane rail portal gantry base
    this.addBox(x, y, z, 5.5, 5.0, 5.5, craneOrange, [1, 1], true, true);
    // Portal arch opening for rail passage
    this.addBox(x, y, z, 3.8, 3.8, 5.8, [0.15, 0.15, 0.15, 1.0], [1, 1], false, false);

    // Slewing ring turntable
    this.addBox(x, y + 5.0, z, 4.2, 0.8, 4.2, craneDark, [1, 1], false, true);

    // Operator cab & machinery housing
    this.addBox(x, y + 5.8, z - 1.0, 3.6, 3.2, 4.8, craneOrange, [1, 1], true, true);
    // Cab glass window facing water (+X)
    this.addBox(x + 1.8, y + 7.0, z - 0.5, 0.15, 1.4, 2.4, [0.15, 0.35, 0.55, 1.0], [1, 1], false, false);

    // Counterweight at crane rear
    this.addBox(x - 2.8, y + 6.2, z - 1.0, 2.2, 2.4, 3.4, craneDark, [1, 1], false, true);

    // Angled latticework crane boom reaching high into the sky towards the harbour water (+X, +Y)
    const boomLen = 22.0;
    const boomX = x + 8.5;
    const boomY = y + 14.5;
    const boomZ = z + 1.5;
    this.addBox(boomX, boomY, boomZ, 16.0, 1.2, 1.2, craneOrange, [1, 1], false, true);
    // Secondary upper tie boom
    this.addBox(boomX - 2.0, boomY + 2.8, boomZ, 12.0, 0.8, 0.8, craneOrange, [1, 1], false, true);

    // Hoist cable dropping down toward the water
    this.addBox(boomX + 6.5, y + 8.0, boomZ, 0.08, 12.0, 0.08, cableSteel, [1, 1], false, false);
    // Cargo hoist spreader / hook
    this.addBox(boomX + 6.5, y + 2.0, boomZ, 1.8, 0.6, 1.2, craneDark, [1, 1], false, true);
  }

  buildHarbourGulls() {
    // Coastal white gulls wheeling in flight over the water and perched on containers
    const gullWhite = [0.98, 0.98, 1.0, 1.0];
    const gullGrey = [0.72, 0.74, 0.78, 1.0];
    const gullBeak = [1.0, 0.75, 0.10, 1.0];

    const gullPosList = [
      // Flying over the water basin
      { x: 178.0, y: 8.5, z: 122.0, span: 1.4 },
      { x: 188.0, y: 12.0, z: 135.0, span: 1.5 },
      { x: 172.0, y: 6.8, z: 145.0, span: 1.3 },
      { x: 195.0, y: 14.5, z: 110.0, span: 1.6 },
      { x: 168.0, y: 9.2, z: 98.0, span: 1.2 },
      // Perched on container top at Pier 7
      { x: 144.5, y: 8.2, z: 80.0, span: 0.9 },
    ];

    for (const g of gullPosList) {
      // Body
      this.addBox(g.x, g.y, g.z, 0.25, 0.18, 0.45, gullWhite, [1, 1], false, false);
      // Yellow beak
      this.addBox(g.x, g.y - 0.02, g.z + 0.26, 0.08, 0.08, 0.14, gullBeak, [1, 1], false, false);
      // Angled wings (V-shape)
      this.addBox(g.x - g.span * 0.4, g.y + 0.12, g.z, g.span * 0.75, 0.04, 0.28, gullGrey, [1, 1], false, false);
      this.addBox(g.x + g.span * 0.4, g.y + 0.12, g.z, g.span * 0.75, 0.04, 0.28, gullGrey, [1, 1], false, false);
    }
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
    // Downtown Avenue road is at rx = 115, road width 22 (X = 104..126).
    // East kerbside is at X = 123.8..124.5; West kerbside is at X = 105.5..106.2.
    const parkedDefs = [
      // Downtown Avenue East Kerbside (X = 124.0, facing North/South)
      { type: 'sedan', x: 124.0, z: -108.0, rot: Math.PI },
      { type: 'sports', x: 124.0, z: -130.0, rot: Math.PI },
      { type: 'taxi', x: 124.0, z: -150.0, rot: Math.PI },
      // Downtown Avenue West Kerbside (X = 106.0)
      { type: 'hatchback', x: 106.0, z: -104.0, rot: 0 },
      { type: 'muscle', x: 106.0, z: -128.0, rot: 0 },

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
