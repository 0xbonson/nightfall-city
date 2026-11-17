// City Map and World Definition for Nightfall City (Vela Bay)
// Features 5 distinct districts (Downtown, Financial Quarter, Old Market Quarter,
// Meridian Docks & Marina, Ocean Promenade & Beach), distant landmark skyline towers,
// elevated skyway highway overpass with concrete pillars & approach ramps, full marina
// with moored yachts & harbour master building, landscaped central park, Vela Bay Arena,
// skyscraper construction site with crane & scaffolding, rooftop water tanks & HVAC units,
// festoon string lights, crosswalks, curb ramps, bollard chains, food carts, puddles,
// overflowing bins, murals, and 15 hidden smuggler caches.

import { CONFIG } from './config.js';

export class CityWorld {
  constructor() {
    this.buildings = [];
    this.distantLandmarks = [];
    this.gantryCranes = [];
    this.props = [];
    this.roads = [];
    this.roadNodes = [];
    this.containerStacks = [];
    this.palmTrees = [];
    this.parkedCars = [];
    this.flockBirds = [];
    this.fireEscapes = [];
    this.billboards = [];
    this.waterTanks = [];
    this.roadWear = [];
    this.busShelters = [];
    this.trafficLightTimer = 0;
    this.bounds = { ...CONFIG.world };

    // New immersive urban systems
    this.overpass = null;
    this.overpassPillars = [];
    this.marina = null;
    this.mooredBoats = [];
    this.park = null;
    this.arena = null;
    this.constructionSite = null;
    this.festoonLights = [];
    this.streetFoodCarts = [];
    this.newsVendors = [];
    this.puddles = [];
    this.murals = [];
    this.smugglerCaches = [];
    this.alleyEscapeRoutes = [];
    this.collectedCaches = new Set();

    this.initWorld();
  }

  initWorld() {
    this.generateRoadGrid();
    this.generateDistricts();
    this.generateDistantLandmarks();
    this.generateGantryCranes();
    this.generateProps();
    this.generateFireEscapes();
    this.generateBillboards();
    this.generateWaterTanks();
    this.generateRoadWear();
    this.generateParkedCars();
    this.generateHarbourBirds();

    // Urban landmarks & interactive additions
    this.generateOverpass();
    this.generateMarina();
    this.generateParks();
    this.generateArena();
    this.generateConstructionSite();
    this.generateFestoonLights();
    this.generateStreetDetails();
    this.generateSmugglerCaches();
    this.generateAlleyEscapeRoutes();

    this.buildTrafficWaypoints();
  }

  generateRoadGrid() {
    const coords = CONFIG.world.roadGrid;

    // Vertical (North-South) Avenues
    for (const x of coords) {
      this.roads.push({
        x1: x, z1: -260, x2: x, z2: 260,
        width: x === 0 ? 18 : 14,
        isMajor: x === 0,
      });
    }

    // Horizontal (East-West) Boulevards
    for (const z of coords) {
      this.roads.push({
        x1: -260, z1: z, x2: 260, z2: z,
        width: z === 0 ? 18 : 14,
        isMajor: z === 0,
      });
    }

    // Ocean Promenade Seaside Boulevard along Marina & Beach
    this.roads.push({
      x1: -240, z1: 178, x2: 60, z2: 178,
      width: 14,
      isMajor: false,
      isPromenade: true,
    });
  }

  generateDistricts() {
    // Helper to register a building with collision bounds and architectural styling
    const addBuilding = (spec) => {
      const {
        x, z, w, d, h, type, color, roofColor, roof, district,
        name = '', details = {}
      } = spec;

      const finalRoofColor = roofColor || roof || [color[0] * 0.6, color[1] * 0.6, color[2] * 0.6];

      this.buildings.push({
        x, z, w, d, h,
        minX: x - w / 2, maxX: x + w / 2,
        minZ: z - d / 2, maxZ: z + d / 2,
        type, color, roofColor: finalRoofColor, district, name,
        details: {
          setbacks: details.setbacks || (details.setback ? [{ height: h * 0.6, insetRatio: 0.78 }] : []),
          crown: details.crown || (details.antenna ? 'spire' : details.helipad ? 'helipad' : 'none'),
          plantRoom: details.plantRoom ?? (h > 30),
          hvacCount: details.hvacCount ?? (h > 35 ? 3 : 1),
          storefront: details.storefront ?? true,
          storefrontColor: details.storefrontColor || [color[0] * 0.72, color[1] * 0.72, color[2] * 0.72],
          shopSign: details.shopSign || name,
          signColor: details.signColor || [0.95, 0.85, 0.35],
          awnings: details.awnings ?? false,
          balconies: details.balconies ?? false,
          windowColor: details.windowColor || (type === 'market' ? [0.28, 0.22, 0.18] : [0.72, 0.86, 0.96]),
          ...details,
        }
      });
    };

    // =========================================================================
    // 1. DOWNTOWN VELA (North-East: X > 10, Z < -10)
    // Cool glass skyscrapers with setback tiers, rooftop crowns, helipads, and illuminated corporate signage
    // =========================================================================
    const downtownTowers = [
      // Block (38, -48) — Obsidian Financial Spire
      {
        x: 38, z: -48, w: 24, d: 24, h: 110,
        color: [0.22, 0.34, 0.48], roof: [0.18, 0.22, 0.28],
        name: 'OBSIDIAN SPIRE',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 55, insetRatio: 0.78 }, { height: 85, insetRatio: 0.60 }],
          crown: 'spire',
          shopSign: 'OBSIDIAN TOWER', signColor: [0.2, 0.8, 1.0],
          windowColor: [0.72, 0.88, 1.0], hvacCount: 3
        }
      },
      // Block (105, -48) — Vela Bay Horizon Center (Sloped Glass Crown)
      {
        x: 105, z: -48, w: 30, d: 28, h: 130,
        color: [0.24, 0.36, 0.50], roof: [0.18, 0.22, 0.28],
        name: 'HORIZON CENTER',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 70, insetRatio: 0.80 }, { height: 102, insetRatio: 0.62 }],
          crown: 'sloped_glass',
          shopSign: 'HORIZON PLAZA', signColor: [1.0, 0.7, 0.2],
          windowColor: [0.76, 0.90, 1.0], hvacCount: 4
        }
      },
      // Block (180, -48) — Marina Grand Exchange (Twin Fins Crown)
      {
        x: 180, z: -48, w: 28, d: 28, h: 96,
        color: [0.26, 0.38, 0.52], roof: [0.20, 0.24, 0.30],
        name: 'GRAND EXCHANGE',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 55, insetRatio: 0.82 }],
          crown: 'twin_fins',
          shopSign: 'EXCHANGE BANK', signColor: [0.3, 0.9, 0.5],
          hvacCount: 3
        }
      },
      // Block (38, -115) — Port Meridian Corporate Spire
      {
        x: 38, z: -115, w: 26, d: 28, h: 122,
        color: [0.20, 0.32, 0.46], roof: [0.16, 0.20, 0.26],
        name: 'PORT MERIDIAN TOWER',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 68, insetRatio: 0.76 }, { height: 98, insetRatio: 0.58 }],
          crown: 'spire',
          shopSign: 'PORT MERIDIAN CORP', signColor: [1.0, 0.85, 0.2],
          hvacCount: 4
        }
      },
      // Block (105, -115) — Solano Central Prestige Plaza (Tallest in City with Helipad)
      {
        x: 105, z: -115, w: 32, d: 32, h: 152,
        color: [0.25, 0.38, 0.54], roof: [0.18, 0.22, 0.28],
        name: 'SOLANO PLAZA',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 82, insetRatio: 0.80 }, { height: 118, insetRatio: 0.64 }],
          crown: 'helipad',
          shopSign: 'SOLANO GRAND PLAZA', signColor: [0.95, 0.85, 0.2],
          windowColor: [0.80, 0.94, 1.0], hvacCount: 5
        }
      },
      // Block (180, -100) — Lumina Tower (Ziggurat Crown)
      {
        x: 180, z: -100, w: 30, d: 30, h: 102,
        color: [0.28, 0.36, 0.48], roof: [0.20, 0.22, 0.28],
        name: 'LUMINA TOWER',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 60, insetRatio: 0.80 }, { height: 85, insetRatio: 0.62 }],
          crown: 'ziggurat',
          shopSign: 'LUMINA MEDIA', signColor: [1.0, 0.25, 0.6],
          hvacCount: 3
        }
      },
      // Block (32, -180) — North Point Highrise
      {
        x: 32, z: -180, w: 30, d: 30, h: 104,
        color: [0.22, 0.32, 0.44], roof: [0.18, 0.20, 0.26],
        name: 'NORTH POINT TOWER',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 62, insetRatio: 0.78 }],
          crown: 'twin_fins',
          shopSign: 'NORTH POINT COMMERCE', signColor: [0.2, 0.85, 1.0],
          hvacCount: 3
        }
      },
      // Block (100, -180) — Zenith Telecom Spire
      {
        x: 100, z: -180, w: 30, d: 30, h: 136,
        color: [0.20, 0.30, 0.45], roof: [0.16, 0.18, 0.24],
        name: 'ZENITH TELECOM',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 80, insetRatio: 0.76 }, { height: 112, insetRatio: 0.58 }],
          crown: 'spire',
          shopSign: 'ZENITH COMMUNICATIONS', signColor: [0.2, 1.0, 0.6],
          hvacCount: 4
        }
      },
      // Block (180, -180) — Apex Heights Tower
      {
        x: 180, z: -180, w: 28, d: 28, h: 92,
        color: [0.26, 0.36, 0.50], roof: [0.20, 0.22, 0.28],
        name: 'APEX HEIGHTS',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 55, insetRatio: 0.80 }],
          crown: 'sloped_glass',
          shopSign: 'APEX SUITES', signColor: [1.0, 0.75, 0.2],
          hvacCount: 2
        }
      },
    ];

    for (const t of downtownTowers) {
      addBuilding(t);
    }

    // =========================================================================
    // 2. FINANCIAL QUARTER (Wide Corporate Slabs with Stone & Bronze Glass)
    // =========================================================================
    const financialSlabs = [
      {
        x: 140, z: -32, w: 46, d: 22, h: 74,
        color: [0.42, 0.38, 0.34], roof: [0.22, 0.22, 0.24],
        name: 'VELA TREASURY',
        district: 'financial', type: 'slab',
        details: {
          shopSign: 'CENTRAL TREASURY', signColor: [0.95, 0.85, 0.3],
          windowColor: [0.65, 0.58, 0.48],
          plantRoom: true, hvacCount: 3
        }
      },
      {
        x: 140, z: -100, w: 48, d: 24, h: 80,
        color: [0.32, 0.35, 0.40], roof: [0.20, 0.22, 0.25],
        name: 'MARITIME TRUST',
        district: 'financial', type: 'slab',
        details: {
          shopSign: 'MARITIME TRUST CORP', signColor: [0.2, 0.85, 1.0],
          windowColor: [0.70, 0.82, 0.92],
          plantRoom: true, hvacCount: 3
        }
      },
      {
        x: 215, z: -32, w: 32, d: 22, h: 68,
        color: [0.38, 0.40, 0.44], roof: [0.24, 0.25, 0.28],
        name: 'METRO CAPITAL',
        district: 'financial', type: 'slab',
        details: {
          shopSign: 'METRO CAPITAL BANK', signColor: [0.9, 0.8, 0.2],
          windowColor: [0.68, 0.75, 0.85],
          hvacCount: 2
        }
      },
    ];

    for (const s of financialSlabs) {
      addBuilding(s);
    }

    // =========================================================================
    // 3. OLD MARKET QUARTER (North-West: X < -10, Z < -10)
    // Warm terracotta tile roofs, brick facades, winding alleys, merchant awnings
    // =========================================================================
    const marketBuildings = [
      {
        x: -24, z: -32, w: 18, d: 24, h: 18,
        color: [0.72, 0.36, 0.24], roof: [0.55, 0.22, 0.16],
        name: 'OLD TOWN BAKERY',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'PANETTERIA & CAFE', signColor: [1.0, 0.8, 0.3], stonePlinth: true }
      },
      {
        x: -42, z: -32, w: 16, d: 24, h: 22,
        color: [0.62, 0.32, 0.22], roof: [0.52, 0.20, 0.14],
        name: 'VELA BOOKSTORE',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'LIBRERIA ANTICA', signColor: [0.9, 0.9, 0.8], stonePlinth: true }
      },
      {
        x: -100, z: -32, w: 32, d: 26, h: 24,
        color: [0.76, 0.65, 0.48], roof: [0.54, 0.22, 0.16],
        name: 'PIAZZA MERCATO',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'PIAZZA MERCATO 1894', signColor: [1.0, 0.85, 0.2], stonePlinth: true }
      },
      {
        x: -180, z: -32, w: 28, d: 26, h: 16,
        color: [0.68, 0.34, 0.22], roof: [0.50, 0.20, 0.14],
        name: 'VINTAGE CELLARS',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'ENOTECA VELA', signColor: [0.8, 0.2, 0.3], stonePlinth: true }
      },
      {
        x: -32, z: -100, w: 28, d: 28, h: 26,
        color: [0.66, 0.32, 0.22], roof: [0.58, 0.24, 0.16],
        name: 'OLD GUILDHALL',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'MERCHANT GUILD', signColor: [1.0, 0.8, 0.2], stonePlinth: true }
      },
      {
        x: -100, z: -100, w: 30, d: 30, h: 28,
        color: [0.78, 0.70, 0.56], roof: [0.54, 0.22, 0.15],
        name: 'BELL TOWER SQUARE',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'TRATTORIA DEL PORTO', signColor: [0.2, 0.7, 0.4], stonePlinth: true }
      },
      {
        x: -180, z: -100, w: 28, d: 26, h: 18,
        color: [0.68, 0.34, 0.25], roof: [0.52, 0.20, 0.14],
        name: 'PESCHERIA BLUES',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'PESCE FRESCO', signColor: [0.2, 0.8, 1.0], stonePlinth: true }
      },
      {
        x: -32, z: -180, w: 26, d: 26, h: 20,
        color: [0.64, 0.31, 0.20], roof: [0.50, 0.22, 0.15],
        name: 'LEATHER GUILD',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'PELLETTERIA VELA', signColor: [0.9, 0.7, 0.3], stonePlinth: true }
      },
      {
        x: -180, z: -180, w: 28, d: 26, h: 17,
        color: [0.68, 0.35, 0.24], roof: [0.52, 0.21, 0.15],
        name: 'THE ANCHOR TAVERN',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'THE ANCHOR PUB', signColor: [1.0, 0.75, 0.2], stonePlinth: true }
      },
    ];

    for (const m of marketBuildings) {
      addBuilding(m);
    }

    // =========================================================================
    // 4. MERIDIAN SHIPPING DOCKS (South-East: X > 10, Z > 10)
    // Low industrial warehouses, sheds, container terminals, gantry cranes
    // =========================================================================
    const dockBuildings = [
      {
        x: 34, z: 34, w: 30, d: 30, h: 16,
        color: [0.42, 0.45, 0.48], roof: [0.28, 0.30, 0.32],
        name: 'WHARF WAREHOUSE 1',
        district: 'docks', type: 'warehouse',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'CARGO BERTH 1', signColor: [0.95, 0.85, 0.15] }
      },
      {
        x: 100, z: 34, w: 34, d: 30, h: 18,
        color: [0.38, 0.40, 0.44], roof: [0.26, 0.28, 0.30],
        name: 'PORT LOGISTICS 4',
        district: 'docks', type: 'warehouse',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'LOGISTICS DEPOT 4', signColor: [1.0, 0.6, 0.2] }
      },
      {
        x: 180, z: 34, w: 32, d: 30, h: 15,
        color: [0.45, 0.48, 0.52], roof: [0.30, 0.32, 0.36],
        name: 'CUSTOMS SHED',
        district: 'docks', type: 'warehouse',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'CUSTOMS INSPECTION', signColor: [0.3, 0.8, 1.0] }
      },
      {
        x: 34, z: 100, w: 32, d: 32, h: 16,
        color: [0.36, 0.38, 0.42], roof: [0.25, 0.27, 0.30],
        name: 'DEEPWATER HANGAR',
        district: 'docks', type: 'warehouse',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'DEEPWATER CARGO', signColor: [0.95, 0.85, 0.15] }
      },
      {
        x: 34, z: 180, w: 30, d: 30, h: 15,
        color: [0.39, 0.41, 0.45], roof: [0.27, 0.29, 0.32],
        name: 'MARINE STORAGE 7',
        district: 'docks', type: 'warehouse',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'PIER STORAGE 7', signColor: [1.0, 0.75, 0.2] }
      },
      {
        x: 100, z: 180, w: 34, d: 32, h: 16,
        color: [0.42, 0.44, 0.48], roof: [0.28, 0.30, 0.33],
        name: 'PIER WHARF COMPOUND',
        district: 'docks', type: 'warehouse',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'SHIPPING TERMINAL', signColor: [0.3, 0.85, 1.0] }
      },
      {
        x: 180, z: 160, w: 32, d: 24, h: 18,
        color: [0.35, 0.38, 0.42], roof: [0.24, 0.26, 0.30],
        name: 'PIER 7 SHOWDOWN DEPOT',
        district: 'docks', type: 'terminal',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'PIER 7 BERTH', signColor: [1.0, 0.2, 0.2] }
      },
    ];

    for (const d of dockBuildings) {
      addBuilding(d);
    }

    // Shipping Container Stacks in Docks
    const containerColors = [
      [0.86, 0.18, 0.14],
      [0.15, 0.45, 0.85],
      [0.94, 0.78, 0.12],
      [0.16, 0.65, 0.42],
      [0.90, 0.48, 0.12],
      [0.34, 0.36, 0.40],
    ];

    const cCoords = [
      { x: 145, z: 145 }, { x: 155, z: 145 }, { x: 165, z: 145 },
      { x: 145, z: 155 }, { x: 155, z: 155 }, { x: 165, z: 155 },
      { x: 75, z: 145 },  { x: 85, z: 145 },  { x: 75, z: 155 },
      { x: 145, z: 75 },  { x: 155, z: 75 },  { x: 145, z: 85 },
      { x: 75, z: 75 },   { x: 85, z: 75 },   { x: 75, z: 85 },
    ];

    for (let i = 0; i < cCoords.length; i++) {
      const c = cCoords[i];
      const stackH = 1 + (i % 3);
      for (let layer = 0; layer < stackH; layer++) {
        const col = containerColors[(i * 3 + layer) % containerColors.length];
        this.containerStacks.push({
          x: c.x, y: layer * 3.1, z: c.z,
          w: 6.4, h: 2.9, d: 3.1,
          color: col
        });
      }
    }

    // =========================================================================
    // 5. OCEAN PROMENADE & BEACH (South-West: X < -10, Z > 10)
    // Sun-drenched art-deco pastel resorts, coastal boardwalk, palm boulevards
    // =========================================================================
    const beachBuildings = [
      {
        x: -32, z: 34, w: 28, d: 26, h: 26,
        color: [0.94, 0.90, 0.82], roof: [0.46, 0.50, 0.56],
        name: 'OCEAN SURF HOTEL',
        district: 'promenade', type: 'resort',
        details: { balconies: true, resortTrim: true, shopSign: 'OCEAN SURF RESORT', signColor: [0.2, 0.85, 1.0], hvacCount: 1 }
      },
      {
        x: -100, z: 34, w: 32, d: 28, h: 30,
        color: [0.88, 0.85, 0.80], roof: [0.42, 0.46, 0.52],
        name: 'PALM BEACH VILLA',
        district: 'promenade', type: 'resort',
        details: { balconies: true, resortTrim: true, shopSign: 'PALM ROYAL HOTEL', signColor: [1.0, 0.8, 0.2], hvacCount: 1 }
      },
      {
        x: -180, z: 34, w: 30, d: 28, h: 22,
        color: [0.92, 0.87, 0.84], roof: [0.48, 0.52, 0.58],
        name: 'CABANA SUITES',
        district: 'promenade', type: 'resort',
        details: { balconies: true, resortTrim: true, shopSign: 'CABANA CLUB', signColor: [1.0, 0.35, 0.6], hvacCount: 1 }
      },
      {
        x: -32, z: 100, w: 28, d: 28, h: 28,
        color: [0.95, 0.91, 0.85], roof: [0.44, 0.48, 0.54],
        name: 'AZURE BAY HOTEL',
        district: 'promenade', type: 'resort',
        details: { balconies: true, resortTrim: true, shopSign: 'AZURE BAY LUXURY', signColor: [0.15, 0.9, 0.9], hvacCount: 1 }
      },
      {
        x: -100, z: 100, w: 32, d: 30, h: 34,
        color: [0.89, 0.86, 0.82], roof: [0.40, 0.44, 0.50],
        name: 'THE RIVIERA',
        district: 'promenade', type: 'resort',
        details: { balconies: true, resortTrim: true, shopSign: 'THE RIVIERA SUITES', signColor: [1.0, 0.85, 0.2], hvacCount: 2 }
      },
      {
        x: -180, z: 100, w: 30, d: 28, h: 24,
        color: [0.93, 0.89, 0.82], roof: [0.46, 0.48, 0.54],
        name: 'SEASIDE PLAZA',
        district: 'promenade', type: 'resort',
        details: { balconies: true, resortTrim: true, shopSign: 'SEASIDE BISTRO', signColor: [1.0, 0.4, 0.2], hvacCount: 1 }
      },
    ];

    for (const b of beachBuildings) {
      addBuilding(b);
    }
  }

  generateDistantLandmarks() {
    const landmarks = [
      { x: 100, z: -320, w: 42, d: 42, h: 185, crown: 'spire', color: [0.24, 0.36, 0.52], roof: [0.15, 0.18, 0.22] },
      { x: 220, z: -310, w: 48, d: 40, h: 160, crown: 'twin_fins', color: [0.38, 0.42, 0.48], roof: [0.18, 0.20, 0.25] },
      { x: -90, z: -320, w: 38, d: 38, h: 145, crown: 'ziggurat', color: [0.32, 0.38, 0.46], roof: [0.20, 0.22, 0.26] },
      { x: 260, z: 260, w: 12, d: 12, h: 48, crown: 'lantern', color: [0.92, 0.25, 0.20], roof: [0.15, 0.15, 0.18] },
    ];

    for (const lm of landmarks) {
      this.distantLandmarks.push(lm);
    }
  }

  generateGantryCranes() {
    this.gantryCranes.push({
      x: 130, y: 0, z: 236,
      height: 38,
      boomLength: 36,
      boomWidth: 4.2,
      color: [0.95, 0.65, 0.12],
    });
    this.gantryCranes.push({
      x: 195, y: 0, z: 236,
      height: 38,
      boomLength: 36,
      boomWidth: 4.2,
      color: [0.88, 0.22, 0.16],
    });
  }

  // =========================================================================
  // 6. ELEVATED HIGHWAY OVERPASS & APPROACH RAMPS
  // Crosses east-west across the central avenue at Z = 75, elevated at Y = 7.6m
  // =========================================================================
  generateOverpass() {
    const deckHeight = CONFIG.world.overpassHeight || 7.6;
    const deckZ = 75;
    const deckWidth = 13.5;

    this.overpass = {
      x1: -180, x2: 200, z: deckZ,
      y: deckHeight,
      width: deckWidth,
      // Approach ramps on West and East ends
      westRamp: { x1: -225, z1: deckZ, y1: 0.1, x2: -180, z2: deckZ, y2: deckHeight },
      eastRamp: { x1: 245, z1: deckZ, y1: 0.1, x2: 200, z2: deckZ, y2: deckHeight },
    };

    // Concrete support pillars every 28m flanking streets
    // Note: X = 0 is left open for central 4-lane avenue; pillars flank at X = -18 and X = +18
    const pillarXs = [-160, -120, -80, -45, -18, 18, 55, 90, 130, 170];
    for (const px of pillarXs) {
      this.overpassPillars.push({
        x: px,
        z: deckZ,
        y: 0,
        height: deckHeight,
        radius: 1.4,
        capWidth: 14.5,
      });
    }

    // Overhead highway directional gantry signs
    this.overpassGantries = [
      { x: -10, z: deckZ, signText: '↑ DOWNTOWN SKYWAY · EXIT 2: MARINA & PROMENADE', exitNumber: '2' },
      { x: 110, z: deckZ, signText: '↑ MERIDIAN SKYWAY · EXIT 4: SHIPPING TERMINAL', exitNumber: '4' },
    ];
  }

  // =========================================================================
  // 7. MARINA & HARBOUR MASTER BUILDING
  // Coastal marina with wooden docks, finger piers, 6 moored boats, and nautical office
  // =========================================================================
  generateMarina() {
    this.marina = {
      x: -160,
      z: 210,
      w: 14.0,
      d: 52.0,
      jettyX: -160,
      jettyZ1: 184,
      jettyZ2: 236,
      jettyWidth: 4.8,
      fingerPiers: [
        { x1: -186, x2: -134, z: 196, width: 2.4 },
        { x1: -186, x2: -134, z: 210, width: 2.4 },
        { x1: -186, x2: -134, z: 224, width: 2.4 },
      ],
    };

    // 6 Moored boats tied in marina slips
    this.mooredBoats = [
      // 2 Luxury Motor Yachts
      { x: -172, z: 196, angle: 1.57, length: 11.5, width: 3.8, type: 'yacht', hullColor: [0.94, 0.95, 0.98], stripeColor: [0.12, 0.35, 0.72] },
      { x: -148, z: 196, angle: -1.57, length: 10.2, width: 3.5, type: 'yacht', hullColor: [0.92, 0.94, 0.96], stripeColor: [0.78, 0.18, 0.18] },
      // 2 High-Speed Motorboats
      { x: -172, z: 210, angle: 1.57, length: 7.2, width: 2.6, type: 'speedboat', hullColor: [0.12, 0.72, 0.65], stripeColor: [0.95, 0.95, 0.95] },
      { x: -148, z: 210, angle: -1.57, length: 7.4, width: 2.7, type: 'speedboat', hullColor: [0.88, 0.15, 0.15], stripeColor: [0.12, 0.12, 0.14] },
      // 2 Sailing Yachts with Masts
      { x: -172, z: 224, angle: 1.57, length: 9.6, width: 3.2, type: 'sailboat', hullColor: [0.95, 0.92, 0.86], mastHeight: 12.0 },
      { x: -148, z: 224, angle: -1.57, length: 9.2, width: 3.0, type: 'sailboat', hullColor: [0.18, 0.28, 0.44], mastHeight: 11.5 },
    ];

    // Harbour Master Headquarters Building (2-story white and navy nautical architecture)
    this.buildings.push({
      x: -138, z: 186, w: 14, d: 11, h: 7.8,
      minX: -145, maxX: -131,
      minZ: 180.5, maxZ: 191.5,
      type: 'harbour_master',
      color: [0.94, 0.95, 0.97],
      roofColor: [0.12, 0.24, 0.45],
      district: 'promenade',
      name: 'HARBOUR MASTER',
      details: {
        storefront: true,
        shopSign: 'VELA BAY HARBOUR MASTER',
        signColor: [0.95, 0.85, 0.2],
        balconies: true,
        crown: 'antenna',
      }
    });
  }

  // =========================================================================
  // 8. LANDSCAPED URBAN PARK
  // Green park lawn with winding flagstone paths, ornamental fountain, benches, and shade trees
  // =========================================================================
  generateParks() {
    this.park = {
      x: -32,
      z: -70,
      width: 38,
      depth: 30,
      w: 38,
      d: 30,
      fountain: { x: -32, z: -70, radius: 3.8, height: 1.8 },
      paths: [
        { x1: -50, z1: -70, x2: -14, z2: -70, width: 3.2 },
        { x1: -32, z1: -84, x2: -32, z2: -56, width: 3.2 },
      ],
      trees: [
        { x: -44, z: -80, scale: 1.2 },
        { x: -20, z: -80, scale: 1.3 },
        { x: -44, z: -60, scale: 1.25 },
        { x: -20, z: -60, scale: 1.15 },
        { x: -32, z: -82, scale: 1.35 },
        { x: -32, z: -58, scale: 1.35 },
      ],
      hedges: [
        { x: -32, z: -84, w: 36, d: 1.0, h: 1.2 },
        { x: -32, z: -56, w: 36, d: 1.0, h: 1.2 },
        { x: -50, z: -70, w: 1.0, d: 28, h: 1.2 },
        { x: -14, z: -70, w: 1.0, d: 28, h: 1.2 },
      ],
    };
  }

  // =========================================================================
  // 9. VELA BAY GRAND ARENA (Stadium Landmark)
  // Large modern arena block with curved tiered facade, floodlight towers, and LED marquee
  // =========================================================================
  generateArena() {
    this.arena = {
      x: -100, z: -190,
      width: 74, depth: 68, height: 36,
      floodlightTowers: [
        { x: -134, z: -221, height: 44 },
        { x: -66, z: -221, height: 44 },
        { x: -134, z: -159, height: 44 },
        { x: -66, z: -159, height: 44 },
      ],
      marquee: {
        x: -100, y: 16, z: -155.5,
        width: 32, height: 4.8,
        text: 'VELA BAY ARENA · METRO CHAMPIONSHIPS',
      }
    };

    // Register arena as building for collision and rendering
    this.buildings.push({
      x: this.arena.x, z: this.arena.z,
      w: this.arena.width, d: this.arena.depth, h: this.arena.height,
      minX: this.arena.x - this.arena.width / 2,
      maxX: this.arena.x + this.arena.width / 2,
      minZ: this.arena.z - this.arena.depth / 2,
      maxZ: this.arena.z + this.arena.depth / 2,
      type: 'arena',
      color: [0.38, 0.40, 0.46],
      roofColor: [0.22, 0.24, 0.28],
      district: 'downtown',
      name: 'VELA BAY GRAND ARENA',
      details: {
        shopSign: 'VELA BAY ARENA',
        signColor: [0.2, 0.9, 1.0],
        crown: 'none',
      }
    });
  }

  // =========================================================================
  // 10. SKYSCRAPER CONSTRUCTION SITE WITH TOWER CRANE & SCAFFOLDING
  // Located at X: 140, Z: -180 in Downtown Vela
  // =========================================================================
  generateConstructionSite() {
    this.constructionSite = {
      x: 140, z: -180,
      w: 32, d: 30, h: 42,
      crane: {
        x: 140, z: -180,
        mastHeight: 52,
        jibLength: 36,
        jibFacing: -0.45, // pointing towards downtown avenue
        hookZ: -198,
        hookY: 28,
      },
      scaffoldingTiers: 4,
      hoardings: [
        { x1: 122, z1: -196, x2: 158, z2: -196, text: 'DANGER · HARD HAT AREA · APEX TOWER 2' },
        { x1: 158, z1: -196, x2: 158, z2: -164, text: 'HAULAGE GATE 1 · NO PARKING' },
        { x1: 158, z1: -164, x2: 122, z2: -164, text: 'AUTHORIZED ACCESS ONLY' },
        { x1: 122, z1: -164, x2: 122, z2: -196, text: 'VELA METRO BUILDERS GROUP' },
      ],
    };

    // Register building collision for construction core
    this.buildings.push({
      x: 140, z: -180, w: 26, d: 24, h: 36,
      minX: 127, maxX: 153, minZ: -192, maxZ: -168,
      type: 'construction',
      color: [0.65, 0.58, 0.50],
      roofColor: [0.55, 0.50, 0.45],
      district: 'downtown',
      name: 'APEX TOWER II (UNDER CONSTRUCTION)',
      details: { storefront: false }
    });
  }

  // =========================================================================
  // 11. FESTOON STRING LIGHTS & HANGING SHOP SIGNS
  // Overhead glowing bulb strings across Ocean Promenade boardwalk and Old Market
  // =========================================================================
  generateFestoonLights() {
    // Strings across Ocean Promenade boardwalk
    for (let x = -210; x <= 20; x += 22) {
      this.festoonLights.push({
        x1: x, y1: 5.2, z1: 185.5,
        x2: x, y2: 5.2, z2: 194.5,
        bulbCount: 7,
        color: [1.0, 0.88, 0.55], // Warm glowing filament
      });
    }

    // Strings across Old Market Piazza
    this.festoonLights.push(
      { x1: -116, y1: 5.8, z1: -45, x2: -84, y2: 5.8, z2: -19, bulbCount: 9, color: [1.0, 0.85, 0.4] },
      { x1: -84, y1: 5.8, z1: -45, x2: -116, y2: 5.8, z2: -19, bulbCount: 9, color: [1.0, 0.85, 0.4] }
    );
  }

  // =========================================================================
  // 12. STREET DETAILS: FOOD CARTS, NEWSPAPER VENDING, PUDDLES, MURALS
  // =========================================================================
  generateStreetDetails() {
    // Street Food Carts (hot dog / taco / churros carts with striped canopies & steam)
    this.streetFoodCarts = [
      { x: 50.5, z: -38, angle: 3.14, name: 'HOT DOG CART', canopyColor: [0.95, 0.2, 0.15] },
      { x: -22.5, z: 182, angle: 1.57, name: 'TACOS EL VELA', canopyColor: [0.15, 0.75, 0.4] },
      { x: -95, z: -38, angle: 0, name: 'GELATO ARTIGIANALE', canopyColor: [0.95, 0.85, 0.2] },
    ];

    // Newspaper Vending Boxes (Vela Herald & Metro Times honor boxes on sidewalks)
    this.newsVendors = [
      { x: 53.2, z: -30, color: [0.15, 0.35, 0.75] }, // Blue Daily Herald
      { x: 53.2, z: -31.4, color: [0.85, 0.15, 0.15] }, // Red Metro Times
      { x: -22.5, z: 50, color: [0.15, 0.35, 0.75] },
      { x: -22.5, z: 51.4, color: [0.85, 0.15, 0.15] },
      { x: 22.5, z: -105, color: [0.15, 0.35, 0.75] },
    ];

    // Reflective Rainwater Asphalt Puddles
    this.puddles = [
      { x: 58, z: -36, width: 4.5, length: 2.8 },
      { x: -35, z: 178, width: 5.2, length: 3.2 },
      { x: 0, z: 42, width: 4.8, length: 2.6 },
      { x: 120, z: 160, width: 5.5, length: 3.4 },
      { x: -75, z: -36, width: 3.8, length: 2.5 },
    ];

    // Street Art Murals and Graffiti Tags on Alley Brick & Hoardings
    this.murals = [
      { x: -42, y: 3.5, z: -19.8, w: 9.5, h: 4.2, normal: [0, 0, 1], title: 'VELA FREEDOM' },
      { x: 140, y: 2.2, z: -196.2, w: 12.0, h: 3.2, normal: [0, 0, 1], title: 'NIGHTFALL GRAFFITI' },
      { x: 168, y: 3.2, z: 160, w: 8.5, h: 3.6, normal: [-1, 0, 0], title: 'VANE SYNDICATE TAG' },
    ];
  }

  // =========================================================================
  // 13. HIDDEN SMUGGLER CACHES (15 Collectible Items)
  // Scattered across scenic spots with cash rewards and HUD counter
  // =========================================================================
  generateSmugglerCaches() {
    this.smugglerCaches = [
      { id: 1, x: -175, y: 0.8, z: 236, name: 'Marina Jetty End', reward: 1500 },
      { id: 2, x: -138, y: 8.4, z: 186, name: 'Harbour Master Deck', reward: 1500 },
      { id: 3, x: -32, y: 1.2, z: -70, name: 'Park Fountain Basin', reward: 1500 },
      { id: 4, x: -100, y: 14.5, z: -156, name: 'Arena Ticket Canopy', reward: 1500 },
      { id: 5, x: 140, y: 24.5, z: -180, name: 'Construction 3rd Floor', reward: 2000 },
      { id: 6, x: 140, y: 52.5, z: -180, name: 'Tower Crane Cab', reward: 3500 },
      { id: 7, x: 0, y: 8.4, z: 75, name: 'Overpass Median Gantry', reward: 2000 },
      { id: 8, x: -72, y: 0.4, z: -125, name: 'Old Town Hidden Alley', reward: 1500 },
      { id: 9, x: -100, y: 28.5, z: -100, name: 'Bell Tower Roof', reward: 2500 },
      { id: 10, x: 105, y: 153.0, z: -115, name: 'Solano Plaza Helipad', reward: 5000 },
      { id: 11, x: 195, y: 38.5, z: 236, name: 'Meridian Crane Gantry', reward: 3000 },
      { id: 12, x: 155, y: 9.4, z: 155, name: 'Top of Container Stack', reward: 2000 },
      { id: 13, x: -90, y: 0.8, z: 190, name: 'Boardwalk Gazebo', reward: 1500 },
      { id: 14, x: -215, y: 0.5, z: 220, name: 'Beachfront Sea Wall', reward: 1500 },
      { id: 15, x: 180, y: 19.0, z: 160, name: 'Pier 7 Depot Roof', reward: 2500 },
    ];
  }

  // =========================================================================
  // 14. ALLEYWAY ESCAPE ROUTES (Reacts to Wanted Level)
  // Neon spray-painted cut-throughs that grant 3x evasion boost when wanted
  // =========================================================================
  generateAlleyEscapeRoutes() {
    this.alleyEscapeRoutes = [
      { id: 'alley_market_1', x: -65, z: -55, radius: 14, name: 'Old Market Wine Alley' },
      { id: 'alley_market_2', x: -140, z: -90, radius: 14, name: 'Pescheria Cut-Through' },
      { id: 'under_overpass', x: 0, z: 75, radius: 18, name: 'Skyway Pillar Shadows' },
      { id: 'docks_containers', x: 150, z: 145, radius: 20, name: 'Container Labyrinth' },
    ];
  }

  generateProps() {
    // 1. Palm trees along Ocean Promenade, coastal boulevards, and street islands
    for (let x = -240; x <= -20; x += 16) {
      this.palmTrees.push({ x, z: 18, scale: 1.0 + (Math.abs(x) % 5) * 0.05 });
      this.palmTrees.push({ x, z: 234, scale: 1.1 + (Math.abs(x) % 4) * 0.05 });
    }
    for (let x = -230; x <= 30; x += 18) {
      this.palmTrees.push({ x, z: 185.5, scale: 1.25 + (Math.abs(x) % 3) * 0.06 });
      this.palmTrees.push({ x, z: 170.5, scale: 1.15 + (Math.abs(x) % 4) * 0.05 });
    }
    for (let z = 20; z <= 240; z += 18) {
      this.palmTrees.push({ x: -80, z, scale: 1.15 });
      this.palmTrees.push({ x: -18, z, scale: 1.05 });
      this.palmTrees.push({ x: -145, z, scale: 1.25 });
    }
    for (let x = 20; x <= 220; x += 26) {
      this.palmTrees.push({ x, z: -18, scale: 1.0 });
    }

    const grid = CONFIG.world.roadGrid;

    // 2. Street Lamps along North-South and East-West sidewalks
    for (const rx of grid) {
      const halfW = (rx === 0 ? 18 : 14) / 2 + 1.8;
      for (let z = -250; z <= 250; z += 35) {
        const inIntersection = grid.some(gz => Math.abs(z - gz) < 14);
        if (!inIntersection) {
          this.props.push({ type: 'lamp', x: rx - halfW, z, rotation: 0 });
          this.props.push({ type: 'lamp', x: rx + halfW, z, rotation: Math.PI });
        }
      }
    }

    // 3. Traffic Lights at Intersections
    for (const rx of grid) {
      for (const rz of grid) {
        const hwX = (rx === 0 ? 18 : 14) / 2 + 2.0;
        const hwZ = (rz === 0 ? 18 : 14) / 2 + 2.0;
        this.props.push({ type: 'traffic_light', x: rx - hwX, z: rz - hwZ, angle: 0 });
        this.props.push({ type: 'traffic_light', x: rx + hwX, z: rz + hwZ, angle: Math.PI });
      }
    }

    // 4. Benches, Rubbish Bins, Planters along sidewalks
    for (let z = 25; z <= 220; z += 38) {
      this.props.push({ type: 'bench', x: -22, z, rotation: Math.PI / 2 });
      this.props.push({ type: 'bin', x: -22, z: z + 6, rotation: 0, overflowing: true });
      this.props.push({ type: 'planter', x: -22, z: z - 8, rotation: 0 });
    }
    for (let z = -220; z <= -25; z += 42) {
      this.props.push({ type: 'bench', x: 22, z, rotation: -Math.PI / 2 });
      this.props.push({ type: 'bin', x: 22, z: z + 6, rotation: 0, overflowing: true });
      this.props.push({ type: 'planter', x: 22, z: z - 7, rotation: 0 });
      this.props.push({ type: 'bin', x: -22, z, rotation: 0, overflowing: true });
      this.props.push({ type: 'planter', x: -22, z: z + 12, rotation: 0 });
      this.props.push({ type: 'newsstand', x: 23, z: z + 18, rotation: 0 });
      this.props.push({ type: 'phonebox', x: 23, z: z - 18, rotation: 0 });
    }

    // 5. Bus Shelters along major avenues with waiting spots
    const shelterLocs = [
      { x: 22.5, z: -55, rotation: 0, waitingCount: 2 },
      { x: -22.5, z: 65, rotation: Math.PI, waitingCount: 3 },
      { x: 82.5, z: -25, rotation: 0, waitingCount: 2 },
      { x: -82.5, z: -55, rotation: Math.PI, waitingCount: 2 },
      { x: -22.5, z: -145, rotation: 0, waitingCount: 2 },
      { x: 142.5, z: 25, rotation: Math.PI, waitingCount: 2 },
    ];
    for (const bs of shelterLocs) {
      this.busShelters.push(bs);
      this.props.push({ type: 'bus_shelter', x: bs.x, z: bs.z, rotation: bs.rotation });
    }

    // 6. Bollards & Chains along corner kerbs
    for (const rx of [-140, -60, 0, 60, 140]) {
      for (const rz of [-140, -60, 0, 60, 140]) {
        const hwX = (rx === 0 ? 18 : 14) / 2 + 1.2;
        const hwZ = (rz === 0 ? 18 : 14) / 2 + 1.2;
        this.props.push({ type: 'bollard', x: rx - hwX, z: rz - hwZ, hasChain: true });
        this.props.push({ type: 'bollard', x: rx + hwX, z: rz - hwZ, hasChain: true });
        this.props.push({ type: 'bollard', x: rx - hwX, z: rz + hwZ, hasChain: true });
        this.props.push({ type: 'bollard', x: rx + hwX, z: rz + hwZ, hasChain: true });
      }
    }

    // 7. Manholes and Kerb Storm Drains
    for (const rx of grid) {
      for (let z = -240; z <= 240; z += 40) {
        this.props.push({ type: 'manhole', x: rx, z: z + 6 });
        const hw = (rx === 0 ? 18 : 14) / 2 - 0.4;
        this.props.push({ type: 'drain', x: rx - hw, z: z + 15 });
        this.props.push({ type: 'drain', x: rx + hw, z: z + 15 });
      }
    }

    // 8. Fire hydrants
    for (const rx of [-140, 0, 140]) {
      for (const rz of [-140, 0, 140]) {
        this.props.push({ type: 'hydrant', x: rx + 8.5, z: rz + 8.5 });
        this.props.push({ type: 'hydrant', x: rx - 8.5, z: rz - 8.5 });
      }
    }

    // 9. Harbor mooring bollards along Docks waterline
    for (let x = 30; x <= 220; x += 18) {
      this.props.push({ type: 'bollard', x, z: 224 });
    }
  }

  generateFireEscapes() {
    this.fireEscapes = [
      { x: -24, z: -20, y: 0.16, width: 2.8, depth: 1.4, floors: 4, floorHeight: 3.8, facing: 'S' },
      { x: -42, z: -20, y: 0.16, width: 2.8, depth: 1.4, floors: 5, floorHeight: 3.8, facing: 'S' },
      { x: -100, z: -20, y: 0.16, width: 3.2, depth: 1.4, floors: 5, floorHeight: 4.2, facing: 'S' },
      { x: -180, z: -20, y: 0.16, width: 2.8, depth: 1.4, floors: 3, floorHeight: 3.8, facing: 'S' },
      { x: -20, z: -100, y: 0.16, width: 1.4, depth: 2.8, floors: 5, floorHeight: 4.2, facing: 'E' },
      { x: -180, z: -88, y: 0.16, width: 2.8, depth: 1.4, floors: 4, floorHeight: 3.8, facing: 'S' },
      { x: -20, z: -180, y: 0.16, width: 1.4, depth: 2.8, floors: 4, floorHeight: 4.0, facing: 'E' },
      { x: 50, z: -48, y: 0.16, width: 1.4, depth: 3.0, floors: 8, floorHeight: 4.5, facing: 'E' },
      { x: 120, z: -48, y: 0.16, width: 1.4, depth: 3.0, floors: 8, floorHeight: 4.5, facing: 'E' },
      { x: 48, z: 34, y: 0.16, width: 1.4, depth: 2.8, floors: 3, floorHeight: 4.5, facing: 'E' },
    ];
  }

  generateBillboards() {
    this.billboards = [
      {
        x: 38, y: 55, z: -36, width: 14, height: 5.5, rotation: 0,
        brand: 'NEO COLA', slogan: 'TASTE THE METROPOLIS',
        color: [0.88, 0.12, 0.18, 1.0], accent: [1.0, 0.85, 0.2, 1.0]
      },
      {
        x: -24, y: 19, z: -20, width: 10, height: 4.0, rotation: 0,
        brand: 'BAY CITIZEN', slogan: 'VELA BAY DAILY NEWS',
        color: [0.15, 0.42, 0.82, 1.0], accent: [0.95, 0.95, 0.95, 1.0]
      },
      {
        x: 105, y: 70, z: -34, width: 16, height: 6.0, rotation: 0,
        brand: 'SOLANO MOTORS', slogan: 'UNLEASH THE VELOCE GT',
        color: [0.95, 0.72, 0.12, 1.0], accent: [0.12, 0.12, 0.14, 1.0]
      },
      {
        x: -32, y: 28, z: 46, width: 14, height: 5.0, rotation: Math.PI / 2,
        brand: 'VELA SHORES', slogan: 'OCEANFRONT LUXURY SUITES',
        color: [0.12, 0.72, 0.65, 1.0], accent: [1.0, 0.92, 0.82, 1.0]
      },
      {
        x: 100, y: 20, z: 20, width: 14, height: 4.5, rotation: 0,
        brand: 'MERIDIAN LOGISTICS', slogan: 'SEAPORT FREIGHT & HAULAGE',
        color: [0.22, 0.35, 0.55, 1.0], accent: [0.95, 0.82, 0.16, 1.0]
      },
      {
        x: 180, y: 60, z: -86, width: 12, height: 5.0, rotation: 0,
        brand: 'CLUB LUMINA', slogan: 'VIP NIGHTS OVER VELA BAY',
        color: [0.75, 0.15, 0.65, 1.0], accent: [0.10, 0.92, 1.0, 1.0]
      },
    ];
  }

  generateWaterTanks() {
    this.waterTanks = [
      { x: -32, y: 26, z: -100, radius: 2.4, height: 4.2 },
      { x: -180, y: 16, z: -32, radius: 2.1, height: 3.6 },
      { x: -100, y: 22, z: -180, radius: 2.2, height: 3.8 },
      { x: 34, y: 16, z: 100, radius: 2.6, height: 4.4 },
      { x: 100, y: 20, z: 100, radius: 2.5, height: 4.2 },
      { x: 180, y: 17, z: 100, radius: 2.4, height: 4.0 },
      { x: -180, y: 17, z: -180, radius: 2.0, height: 3.5 },
      { x: 38, y: 110, z: -48, radius: 2.5, height: 4.0 },
      { x: 180, y: 96, z: -48, radius: 2.6, height: 4.2 },
    ];
  }

  generateRoadWear() {
    const grid = CONFIG.world.roadGrid;
    for (const rx of grid) {
      for (let z = -220; z <= 220; z += 55) {
        this.roadWear.push({
          x: rx + (Math.sin(rx + z) > 0 ? 2.5 : -2.5),
          z: z + 8,
          w: 3.2,
          d: 4.5,
          type: 'patch'
        });
      }
    }
    for (const rz of grid) {
      for (let x = -220; x <= 220; x += 55) {
        this.roadWear.push({
          x: x + 8,
          z: rz + (Math.cos(x + rz) > 0 ? 2.5 : -2.5),
          w: 4.5,
          d: 3.2,
          type: 'patch'
        });
      }
    }
  }

  generateParkedCars() {
    this.parkedCars = [
      // Downtown Vela parking
      { x: 19.5, z: -40, angle: 1.57, type: 'sports', color: [0.85, 0.15, 0.15] },
      { x: 19.5, z: -70, angle: 1.57, type: 'sedan', color: [0.20, 0.35, 0.85] },
      { x: 19.5, z: -110, angle: 1.57, type: 'taxi', color: [0.95, 0.82, 0.10] },
      { x: 92, z: -45, angle: 0, type: 'sports', color: [0.95, 0.75, 0.12] },
      { x: 92, z: -135, angle: 3.14, type: 'muscle', color: [0.15, 0.15, 0.18] },
      { x: 168, z: -45, angle: 0, type: 'sedan', color: [0.90, 0.90, 0.92] },
      { x: 168, z: -110, angle: 3.14, type: 'sports', color: [0.12, 0.78, 0.62] },

      // Old Market Quarter
      { x: -19.5, z: -40, angle: -1.57, type: 'sedan', color: [0.65, 0.45, 0.35] },
      { x: -92, z: -60, angle: 0, type: 'truck', color: [0.38, 0.42, 0.45] },
      { x: -168, z: -60, angle: 3.14, type: 'sedan', color: [0.22, 0.24, 0.26] },
      { x: -19.5, z: -125, angle: -1.57, type: 'muscle', color: [0.82, 0.45, 0.12] },

      // Meridian Shipping Docks
      { x: 70, z: 40, angle: 0, type: 'truck', color: [0.45, 0.48, 0.52] },
      { x: 150, z: 70, angle: 1.57, type: 'truck', color: [0.25, 0.30, 0.35] },
      { x: 130, z: 130, angle: 0, type: 'muscle', color: [0.85, 0.15, 0.15] },
      { x: 19.5, z: 75, angle: 1.57, type: 'truck', color: [0.88, 0.52, 0.12] },
      { x: 92, z: 160, angle: 0, type: 'sedan', color: [0.30, 0.32, 0.36] },

      // Ocean Promenade & Beach
      { x: -20.5, z: 45, angle: 1.57, type: 'sports', color: [0.15, 0.75, 0.55] },
      { x: -140, z: 25, angle: 1.57, type: 'taxi', color: [0.95, 0.82, 0.10] },
      { x: -210, z: 80, angle: 0, type: 'sports', color: [0.92, 0.92, 0.92] },
      { x: -20.5, z: 120, angle: 1.57, type: 'sports', color: [0.95, 0.25, 0.60] },
      { x: -92, z: 45, angle: 0, type: 'sedan', color: [0.94, 0.88, 0.76] },
      { x: -168, z: 120, angle: 3.14, type: 'muscle', color: [0.18, 0.18, 0.20] },
    ];
  }

  generateHarbourBirds() {
    for (let i = 0; i < 12; i++) {
      this.flockBirds.push({
        baseX: 150,
        baseY: 26 + (i % 4) * 2.5,
        baseZ: 190,
        radius: 25 + (i % 5) * 6,
        speed: 0.6 + (i % 3) * 0.15,
        phase: (i / 12) * Math.PI * 2,
      });
    }
    for (let i = 0; i < 10; i++) {
      this.flockBirds.push({
        baseX: -160,
        baseY: 22 + (i % 3) * 2.5,
        baseZ: 180,
        radius: 35 + (i % 4) * 8,
        speed: 0.5 + (i % 3) * 0.12,
        phase: (i / 10) * Math.PI * 2,
      });
    }
  }

  update(dt) {
    this.trafficLightTimer += dt;
  }

  getTrafficLightColor(axis = 'NS') {
    const cycle = (CONFIG.trafficLights?.nsGreenDuration || 9.0) +
                  (CONFIG.trafficLights?.nsAmberDuration || 2.5) +
                  (CONFIG.trafficLights?.ewGreenDuration || 9.0) +
                  (CONFIG.trafficLights?.ewAmberDuration || 2.5);
    const t = this.trafficLightTimer % cycle;
    const nsGreenEnd = CONFIG.trafficLights?.nsGreenDuration || 9.0;
    const nsAmberEnd = nsGreenEnd + (CONFIG.trafficLights?.nsAmberDuration || 2.5);
    const ewGreenEnd = nsAmberEnd + (CONFIG.trafficLights?.ewGreenDuration || 9.0);

    if (axis === 'NS') {
      if (t < nsGreenEnd) return 'green';
      if (t < nsAmberEnd) return 'amber';
      return 'red';
    } else {
      if (t < nsAmberEnd) return 'red';
      if (t < ewGreenEnd) return 'green';
      return 'amber';
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

  // Check and collect hidden smuggler caches
  collectCache(playerX, playerZ, radius = 2.4) {
    for (const cache of this.smugglerCaches) {
      if (this.collectedCaches.has(cache.id)) continue;
      const dx = playerX - cache.x;
      const dz = playerZ - cache.z;
      if (dx * dx + dz * dz < radius * radius) {
        this.collectedCaches.add(cache.id);
        return cache;
      }
    }
    return null;
  }

  // Check if player is inside an alleyway escape route zone (speeds up police evasion)
  isInAlleyEscapeRoute(x, z) {
    for (const route of this.alleyEscapeRoutes) {
      const dx = x - route.x;
      const dz = z - route.z;
      if (dx * dx + dz * dz < route.radius * route.radius) {
        return route;
      }
    }
    return null;
  }

  checkCollision(x, z, radius = 0.8) {
    // 1. Buildings (Skyscrapers, Slabs, Market blocks, Warehouses, Resorts, Arena, Harbour Master)
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
          building: b,
        };
      }
    }

    // 2. Shipping container stacks
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
          isContainer: true,
        };
      }
    }

    // 3. Overpass concrete support pillars at ground level
    for (let i = 0; i < this.overpassPillars.length; i++) {
      const p = this.overpassPillars[i];
      const dx = x - p.x;
      const dz = z - p.z;
      const distSq = dx * dx + dz * dz;
      const totalR = radius + p.radius;
      if (distSq < totalR * totalR) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = totalR - dist;
        return {
          collided: true,
          pushX: (dx / dist) * overlap,
          pushZ: (dz / dist) * overlap,
          normalX: dx / dist,
          normalZ: dz / dist,
          isPillar: true,
        };
      }
    }

    // 4. Park stone fountain basin
    if (this.park && this.park.fountain) {
      const f = this.park.fountain;
      const dx = x - f.x;
      const dz = z - f.z;
      const distSq = dx * dx + dz * dz;
      const totalR = radius + f.radius;
      if (distSq < totalR * totalR) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = totalR - dist;
        return {
          collided: true,
          pushX: (dx / dist) * overlap,
          pushZ: (dz / dist) * overlap,
          normalX: dx / dist,
          normalZ: dz / dist,
          isFountain: true,
        };
      }
    }

    return { collided: false, pushX: 0, pushZ: 0, normalX: 0, normalZ: 0 };
  }

  raycast(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dz) || 0.001;
    const stepSize = 1.6;
    const steps = Math.ceil(dist / stepSize);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const testX = x1 + dx * t;
      const testZ = z1 + dz * t;
      const col = this.checkCollision(testX, testZ, 0.4);
      if (col.collided) {
        return { hit: true, x: testX, z: testZ };
      }
    }
    return { hit: false };
  }
}

export const world = new CityWorld();
