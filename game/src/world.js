// City Map and World Definition for Nightfall City (Vela Bay)
// Features 5 distinct districts (Downtown, Financial Quarter, Old Market Quarter,
// Meridian Docks & Marina, Ocean Promenade & Beach), distant landmark skyline towers,
// gantry cranes, street furniture, parked vehicles, palm boulevards, and collision geometry.

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
    this.bounds = { ...CONFIG.world };

    this.initWorld();
  }

  initWorld() {
    this.generateRoadGrid();
    this.generateDistricts();
    this.generateDistantLandmarks();
    this.generateGantryCranes();
    this.generateProps();
    this.generateParkedCars();
    this.generateHarbourBirds();
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
    // Soaring glass skyscrapers set back from pavement with plazas, setbacks, crowns
    // =========================================================================
    const downtownTowers = [
      // Block (38, -45) — Obsidian Financial Spire (Set back with front plaza)
      {
        x: 38, z: -48, w: 24, d: 24, h: 110,
        color: [0.72, 0.80, 0.90], roof: [0.24, 0.28, 0.35],
        name: 'OBSIDIAN SPIRE',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 55, insetRatio: 0.78 }, { height: 85, insetRatio: 0.60 }],
          crown: 'spire',
          shopSign: 'OBSIDIAN TOWER', signColor: [0.2, 0.8, 1.0],
          windowColor: [0.82, 0.92, 1.0], hvacCount: 3
        }
      },
      // Block (100, -48) — Vela Bay Horizon Center (Sloped Glass Crown)
      {
        x: 105, z: -48, w: 30, d: 28, h: 130,
        color: [0.85, 0.88, 0.94], roof: [0.24, 0.28, 0.34],
        name: 'HORIZON CENTER',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 70, insetRatio: 0.80 }, { height: 102, insetRatio: 0.62 }],
          crown: 'sloped_glass',
          shopSign: 'HORIZON PLAZA', signColor: [1.0, 0.7, 0.2],
          windowColor: [0.78, 0.90, 1.0], hvacCount: 4
        }
      },
      // Block (180, -48) — Marina Grand Exchange (Twin Fins Crown)
      {
        x: 180, z: -48, w: 28, d: 28, h: 96,
        color: [0.80, 0.85, 0.92], roof: [0.25, 0.28, 0.35],
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
        color: [0.76, 0.84, 0.94], roof: [0.22, 0.26, 0.32],
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
        color: [0.78, 0.86, 0.96], roof: [0.22, 0.25, 0.32],
        name: 'SOLANO PLAZA',
        district: 'downtown', type: 'skyscraper',
        details: {
          setbacks: [{ height: 82, insetRatio: 0.80 }, { height: 118, insetRatio: 0.64 }],
          crown: 'helipad',
          shopSign: 'SOLANO GRAND PLAZA', signColor: [0.95, 0.85, 0.2],
          windowColor: [0.82, 0.94, 1.0], hvacCount: 5
        }
      },
      // Block (180, -100) — Lumina Tower (Ziggurat Crown)
      {
        x: 180, z: -100, w: 30, d: 30, h: 102,
        color: [0.84, 0.86, 0.92], roof: [0.24, 0.26, 0.30],
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
        color: [0.28, 0.38, 0.48], roof: [0.20, 0.22, 0.26],
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
        color: [0.22, 0.32, 0.46], roof: [0.18, 0.20, 0.26],
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
        color: [0.86, 0.89, 0.94], roof: [0.22, 0.24, 0.28],
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
      // Block (140, -32) — Vela Bay Treasury Slab (Wide horizontal slab)
      {
        x: 140, z: -32, w: 46, d: 22, h: 74,
        color: [0.42, 0.38, 0.34], roof: [0.22, 0.22, 0.24],
        name: 'VELA TREASURY',
        district: 'financial', type: 'slab',
        details: {
          shopSign: 'CENTRAL TREASURY', signColor: [0.95, 0.85, 0.3],
          windowColor: [0.65, 0.58, 0.48], // Bronze tinted glass
          plantRoom: true, hvacCount: 3
        }
      },
      // Block (140, -100) — Maritime Trust Corporation (Wide slab)
      {
        x: 140, z: -100, w: 48, d: 24, h: 80,
        color: [0.32, 0.35, 0.40], roof: [0.20, 0.22, 0.25],
        name: 'MARITIME TRUST',
        district: 'financial', type: 'slab',
        details: {
          shopSign: 'MARITIME TRUST CORP', signColor: [0.2, 0.85, 1.0],
          windowColor: [0.70, 0.82, 0.92],
          plantRoom: true, hvacCount: 4
        }
      },
      // Block (140, -180) — Sovereign Capital Building (Wide slab)
      {
        x: 140, z: -180, w: 46, d: 22, h: 72,
        color: [0.38, 0.36, 0.35], roof: [0.24, 0.24, 0.26],
        name: 'SOVEREIGN CAPITAL',
        district: 'financial', type: 'slab',
        details: {
          shopSign: 'SOVEREIGN CAPITAL', signColor: [1.0, 0.75, 0.2],
          windowColor: [0.68, 0.76, 0.85],
          plantRoom: true, hvacCount: 3
        }
      },
    ];

    for (const s of financialSlabs) {
      addBuilding(s);
    }

    // =========================================================================
    // 3. OLD MARKET QUARTER (North-West: X < -10, Z < -10)
    // Low narrow blocks (14m-24m), terracotta pitched roofs, brick facades, merchant awnings
    // =========================================================================
    const marketBuildings = [
      // Block (-32, -32): 2 narrow historic buildings
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
      // Block (-100, -32) — Historic Piazza Arcade
      {
        x: -100, z: -32, w: 32, d: 26, h: 24,
        color: [0.76, 0.65, 0.48], roof: [0.54, 0.22, 0.16],
        name: 'PIAZZA MERCATO',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'PIAZZA MERCATO 1894', signColor: [1.0, 0.85, 0.2], stonePlinth: true }
      },
      // Block (-180, -32) — Cobblestone Quarter Wine Cellar
      {
        x: -180, z: -32, w: 28, d: 26, h: 16,
        color: [0.68, 0.34, 0.22], roof: [0.50, 0.20, 0.14],
        name: 'VINTAGE CELLARS',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'ENOTECA VELA', signColor: [0.8, 0.2, 0.3], stonePlinth: true }
      },
      // Block (-32, -100) — Guildhall & Clock House
      {
        x: -32, z: -100, w: 28, d: 28, h: 26,
        color: [0.66, 0.32, 0.22], roof: [0.58, 0.24, 0.16],
        name: 'OLD GUILDHALL',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'MERCHANT GUILD', signColor: [1.0, 0.8, 0.2], stonePlinth: true }
      },
      // Block (-100, -100) — Historic Belltower Quarter
      {
        x: -100, z: -100, w: 30, d: 30, h: 28,
        color: [0.78, 0.70, 0.56], roof: [0.54, 0.22, 0.15],
        name: 'BELL TOWER SQUARE',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'TRATTORIA DEL PORTO', signColor: [0.2, 0.7, 0.4], stonePlinth: true }
      },
      // Block (-180, -100) — Fishmonger Alley
      {
        x: -180, z: -100, w: 28, d: 26, h: 18,
        color: [0.68, 0.34, 0.25], roof: [0.52, 0.20, 0.14],
        name: 'PESCHERIA BLUES',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'PESCE FRESCO', signColor: [0.2, 0.8, 1.0], stonePlinth: true }
      },
      // Block (-32, -180) — Historic Leatherworks
      {
        x: -32, z: -180, w: 26, d: 26, h: 20,
        color: [0.64, 0.31, 0.20], roof: [0.50, 0.22, 0.15],
        name: 'LEATHER GUILD',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'PELLETTERIA VELA', signColor: [0.9, 0.7, 0.3], stonePlinth: true }
      },
      // Block (-100, -180) — Olive & Oil Merchant
      {
        x: -100, z: -180, w: 30, d: 28, h: 22,
        color: [0.74, 0.64, 0.50], roof: [0.56, 0.25, 0.18],
        name: 'OLIVE MERCHANT',
        district: 'market', type: 'market',
        details: { awnings: true, shopSign: 'FRANTOIO ANTICO', signColor: [0.6, 0.8, 0.2], stonePlinth: true }
      },
      // Block (-180, -180) — Cobblestone Tavern
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
    // 4. MERIDIAN SHIPPING DOCKS & MARINA (South-East: X > 10, Z > 10)
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
        name: 'CONTAINER FREIGHT 2',
        district: 'docks', type: 'warehouse',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'FREIGHT TERMINAL 2', signColor: [0.95, 0.85, 0.15] }
      },
      {
        x: 100, z: 100, w: 36, d: 32, h: 20,
        color: [0.40, 0.42, 0.46], roof: [0.28, 0.30, 0.34],
        name: 'CENTRAL CHOP SHOP',
        district: 'docks', type: 'compound',
        details: { rollUpDoors: true, corrugated: true, shopSign: 'MERIDIAN REPAIR CO.', signColor: [1.0, 0.3, 0.2] }
      },
      {
        x: 180, z: 100, w: 34, d: 32, h: 17,
        color: [0.44, 0.46, 0.50], roof: [0.30, 0.32, 0.35],
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
      [0.86, 0.18, 0.14], // Port Crimson Red
      [0.15, 0.45, 0.85], // Ocean Blue
      [0.94, 0.78, 0.12], // Freight Yellow
      [0.16, 0.65, 0.42], // Marine Green
      [0.90, 0.48, 0.12], // Cargo Orange
      [0.34, 0.36, 0.40], // Industrial Steel
    ];

    const cCoords = [
      { x: 145, z: 145 }, { x: 155, z: 145 }, { x: 165, z: 145 },
      { x: 145, z: 155 }, { x: 155, z: 155 }, { x: 165, z: 155 },
      { x: 75, z: 145 },  { x: 85, z: 145 },  { x: 75, z: 155 },
      { x: 145, z: 75 },  { x: 155, z: 75 },  { x: 145, z: 85 },
      { x: 205, z: 145 }, { x: 215, z: 145 }, { x: 205, z: 155 },
      { x: 85, z: 75 },   { x: 75, z: 85 },   { x: 215, z: 155 },
      // Open pier apron container yard for Pier 7 Showdown
      { x: 165, z: 180 }, { x: 175, z: 180 }, { x: 185, z: 180 },
      { x: 165, z: 192 }, { x: 175, z: 192 }, { x: 185, z: 192 },
      { x: 155, z: 180 }, { x: 155, z: 192 },
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
        x: -180, z: 100, w: 30, d: 28, h: 20,
        color: [0.94, 0.90, 0.86], roof: [0.46, 0.50, 0.55],
        name: 'CORAL BEACH INN',
        district: 'promenade', type: 'resort',
        details: { balconies: true, resortTrim: true, shopSign: 'CORAL REEF BISTRO', signColor: [1.0, 0.45, 0.4], hvacCount: 1 }
      },
    ];

    for (const b of beachBuildings) {
      addBuilding(b);
    }
  }

  generateDistantLandmarks() {
    // Landmark towers placed far in the background to create a glorious city skyline silhouette
    const landmarks = [
      // Northern Downtown horizon spire (185m)
      { x: 100, z: -320, w: 42, d: 42, h: 185, crown: 'spire', color: [0.24, 0.36, 0.52], roof: [0.15, 0.18, 0.22] },
      // North-East Financial Monolith (160m)
      { x: 220, z: -310, w: 48, d: 40, h: 160, crown: 'twin_fins', color: [0.38, 0.42, 0.48], roof: [0.18, 0.20, 0.25] },
      // North-West Cathedral Spire (145m)
      { x: -90, z: -320, w: 38, d: 38, h: 145, crown: 'ziggurat', color: [0.32, 0.38, 0.46], roof: [0.20, 0.22, 0.26] },
      // Far Eastern Harbor Lighthouse at mouth of bay (48m)
      { x: 260, z: 260, w: 12, d: 12, h: 48, crown: 'lantern', color: [0.92, 0.25, 0.20], roof: [0.15, 0.15, 0.18] },
    ];

    for (const lm of landmarks) {
      this.distantLandmarks.push(lm);
    }
  }

  generateGantryCranes() {
    // Port Container Gantry Cranes along Meridian Docks water edge
    this.gantryCranes.push({
      x: 130, y: 0, z: 236,
      height: 38,
      boomLength: 36,
      boomWidth: 4.2,
      color: [0.95, 0.65, 0.12], // Industrial Crane Yellow
    });
    this.gantryCranes.push({
      x: 195, y: 0, z: 236,
      height: 38,
      boomLength: 36,
      boomWidth: 4.2,
      color: [0.88, 0.22, 0.16], // Port Red Gantry
    });
  }

  generateProps() {
    // 1. Palm trees along Ocean Promenade, coastal boulevards, and street islands
    for (let x = -240; x <= -20; x += 16) {
      this.palmTrees.push({ x, z: 18, scale: 1.0 + (Math.abs(x) % 5) * 0.05 });
      this.palmTrees.push({ x, z: 234, scale: 1.1 + (Math.abs(x) % 4) * 0.05 });
    }
    for (let z = 20; z <= 240; z += 18) {
      this.palmTrees.push({ x: -80, z, scale: 1.15 });
      this.palmTrees.push({ x: -18, z, scale: 1.05 });
      this.palmTrees.push({ x: -145, z, scale: 1.25 });
    }
    // Downtown avenue palm islands
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
      this.props.push({ type: 'bin', x: -22, z: z + 6, rotation: 0 });
      this.props.push({ type: 'planter', x: -22, z: z - 8, rotation: 0 });
    }
    for (let z = -220; z <= -25; z += 42) {
      // Downtown plaza benches, planters, bins
      this.props.push({ type: 'bench', x: 22, z, rotation: -Math.PI / 2 });
      this.props.push({ type: 'bin', x: 22, z: z + 6, rotation: 0 });
      this.props.push({ type: 'planter', x: 22, z: z - 7, rotation: 0 });
      // Market quarter bins & benches
      this.props.push({ type: 'bin', x: -22, z, rotation: 0 });
      this.props.push({ type: 'planter', x: -22, z: z + 12, rotation: 0 });
      // Downtown newsstands & phoneboxes
      this.props.push({ type: 'newsstand', x: 23, z: z + 18, rotation: 0 });
      this.props.push({ type: 'phonebox', x: 23, z: z - 18, rotation: 0 });
    }

    // 5. Bus Shelters along major avenues
    this.props.push({ type: 'bus_shelter', x: 22.5, z: -55, rotation: 0 });
    this.props.push({ type: 'bus_shelter', x: -22.5, z: 65, rotation: Math.PI });
    this.props.push({ type: 'bus_shelter', x: 82.5, z: -25, rotation: 0 });

    // 6. Bollards along corner kerbs
    for (const rx of [-60, 0, 60]) {
      for (const rz of [-60, 0, 60]) {
        const hwX = (rx === 0 ? 18 : 14) / 2 + 1.2;
        const hwZ = (rz === 0 ? 18 : 14) / 2 + 1.2;
        this.props.push({ type: 'bollard', x: rx - hwX, z: rz - hwZ });
        this.props.push({ type: 'bollard', x: rx + hwX, z: rz - hwZ });
        this.props.push({ type: 'bollard', x: rx - hwX, z: rz + hwZ });
        this.props.push({ type: 'bollard', x: rx + hwX, z: rz + hwZ });
      }
    }

    // 7. Manholes and Kerb Storm Drains
    for (const rx of grid) {
      for (let z = -240; z <= 240; z += 50) {
        this.props.push({ type: 'manhole', x: rx, z });
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

  generateParkedCars() {
    // Parked cars along kerbs to give streets life and realism
    this.parkedCars = [
      // Downtown Vela parking
      { x: 19.5, z: -40, angle: 1.57, type: 'sports', color: [0.85, 0.15, 0.15] }, // Red sports car
      { x: 19.5, z: -70, angle: 1.57, type: 'sedan', color: [0.20, 0.35, 0.85] },  // Blue sedan
      { x: 92, z: -45, angle: 0, type: 'sports', color: [0.95, 0.75, 0.12] },      // Gold coupe
      { x: 92, z: -135, angle: 3.14, type: 'muscle', color: [0.15, 0.15, 0.18] },   // Dark muscle car

      // Old Market Quarter
      { x: -70, z: -40, angle: 1.57, type: 'muscle', color: [0.72, 0.35, 0.85] },  // Vane Nero GT!
      { x: -130, z: -70, angle: 0, type: 'sedan', color: [0.88, 0.45, 0.12] },

      // Meridian Shipping Docks
      { x: 70, z: 40, angle: 0, type: 'truck', color: [0.45, 0.48, 0.52] },
      { x: 150, z: 70, angle: 1.57, type: 'truck', color: [0.25, 0.30, 0.35] },
      { x: 130, z: 130, angle: 0, type: 'muscle', color: [0.85, 0.15, 0.15] },

      // Ocean Promenade & Beach
      { x: -20.5, z: 45, angle: 1.57, type: 'sports', color: [0.15, 0.75, 0.55] }, // Teal roadster
      { x: -140, z: 25, angle: 1.57, type: 'taxi', color: [0.95, 0.82, 0.10] },
      { x: -210, z: 80, angle: 0, type: 'sports', color: [0.92, 0.92, 0.92] },
    ];
  }

  generateHarbourBirds() {
    // Flock of seagulls circling over the Docks harbour
    for (let i = 0; i < 10; i++) {
      this.flockBirds.push({
        baseX: 150,
        baseY: 26 + (i % 4) * 2.5,
        baseZ: 190,
        radius: 25 + (i % 5) * 6,
        speed: 0.6 + (i % 3) * 0.15,
        phase: (i / 10) * Math.PI * 2,
      });
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
    // Check against all city buildings
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
          isContainer: true,
        };
      }
    }

    return { collided: false, pushX: 0, pushZ: 0, normalX: 0, normalZ: 0 };
  }

  // Line of sight raycast against buildings and shipping container obstacles
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
