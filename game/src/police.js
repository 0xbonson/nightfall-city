/**
 * Nightfall City: Vela Bay - Wanted Heat & Escalating Pursuit AI
 * Implements 5-star criminal pursuit escalation, cruiser intercept tactics,
 * tactical roadblocks, police helicopter air support with searchlight,
 * line-of-sight evasion tracking, evasion cash rewards, and safehouse heat clearance.
 * Authored by makefun agent for the open-world crime entry.
 */

import { POLICE_CONFIG, WORLD } from './config.js';
import { clamp, lerp, normalizeAngle } from './math.js';

export class PoliceSystem {
  constructor() {
    this.wantedStars = 0;
    this.heat = 0;
    this.evasionTimer = 0;
    this.isEvading = false;
    this.spawnTimer = 0;
    this.previousStars = 0;

    // Tactical Police Helicopter
    this.helicopter = {
      active: false,
      forcedActive: false,
      lockedPosition: false,
      searchlightActive: false,
      x: 0,
      y: 35,
      z: 0,
      targetX: 0,
      targetZ: 0,
      rotorAngle: 0,
      spotlightAngle: 0,
    };
  }

  clearHeat() {
    this.heat = 0;
    this.wantedStars = 0;
    this.previousStars = 0;
    this.isEvading = false;
    this.evasionTimer = 0;
    if (!this.helicopter.forcedActive) {
      this.helicopter.active = false;
      this.helicopter.searchlightActive = false;
    }
  }

  addCrime(type) {
    if (type === 'minor_collision') this.heat += 0.35;
    else if (type === 'vehicle_theft') this.heat += 0.8;
    else if (type === 'pedestrian_hit') this.heat += 1.25;
    else if (type === 'gunfire') this.heat += 0.65;
    else if (type === 'assault_officer') this.heat += 2.0;
    else if (type === 'heist_trigger') this.heat = Math.max(this.heat, 4.0);

    this.heat = clamp(this.heat, 0, POLICE_CONFIG.MAX_STARS);
    this.wantedStars = Math.floor(this.heat);
    this.isEvading = false;
    this.evasionTimer = POLICE_CONFIG.LOSE_SIGHT_TIME;
  }

  setWantedStars(stars) {
    this.wantedStars = clamp(stars, 0, POLICE_CONFIG.MAX_STARS);
    this.heat = this.wantedStars;
    this.isEvading = false;
    this.evasionTimer = POLICE_CONFIG.LOSE_SIGHT_TIME;
  }

  update(dt, player, vehicles, world, audio) {
    this.wantedStars = Math.floor(this.heat);

    if (this.wantedStars <= 0 && !this.helicopter.forcedActive) {
      this.helicopter.active = false;
      this.helicopter.searchlightActive = false;
      this.isEvading = false;
      return;
    }

    // Deploy tactical helicopter at 4+ stars or if forced active
    if (this.wantedStars >= 4 || this.helicopter.forcedActive) {
      this.helicopter.active = true;
    }

    // Check distance to nearest police cruiser
    let nearestDist = 999;
    let policeCount = 0;

    for (let i = 0; i < vehicles.vehicles.length; i++) {
      const v = vehicles.vehicles[i];
      if (v.isPolice) {
        policeCount++;
        const d = Math.hypot(v.x - player.x, v.z - player.z);
        if (d < nearestDist) nearestDist = d;

        this.directPursuit(v, player, dt);
      }
    }

    // Line of sight evasion tracking
    if (nearestDist > POLICE_CONFIG.SIGHT_RADIUS && !this.helicopter.active) {
      this.isEvading = true;
      this.evasionTimer -= dt;
      if (this.evasionTimer <= 0) {
        const oldStar = this.wantedStars;
        this.heat = Math.max(0, this.heat - 1.0);
        this.wantedStars = Math.floor(this.heat);
        this.evasionTimer = POLICE_CONFIG.LOSE_SIGHT_TIME;

        if (this.wantedStars === 0 && oldStar > 0) {
          this.isEvading = false;
          // Reward player for cleanly ditching the police
          const escapeBonus = oldStar * 250;
          player.addMoney(escapeBonus);
          if (audio) audio.playCashChime();
        }
      }
    } else {
      this.isEvading = false;
      this.evasionTimer = POLICE_CONFIG.LOSE_SIGHT_TIME;
    }

    // Spawn pursuit cruisers up to cap
    this.spawnTimer += dt;
    const maxCruisers = Math.min(this.wantedStars + 1, POLICE_CONFIG.MAX_ACTIVE_CRUISERS);
    if (this.spawnTimer > POLICE_CONFIG.SPAWN_INTERVAL && policeCount < maxCruisers) {
      this.spawnTimer = 0;
      this.spawnPursuitCruiser(player, vehicles);
    }

    // Update Tactical Helicopter & Searchlight
    if (this.helicopter.active) {
      this.helicopter.rotorAngle += dt * 42.0;

      if (!this.helicopter.lockedPosition) {
        const hTargetX = player.x + Math.sin(performance.now() * 0.001) * 12.0;
        const hTargetZ = player.z + Math.cos(performance.now() * 0.001) * 12.0;

        this.helicopter.x = lerp(this.helicopter.x, hTargetX, dt * 1.8);
        this.helicopter.z = lerp(this.helicopter.z, hTargetZ, dt * 1.8);
        this.helicopter.y = 28.0;

        this.helicopter.targetX = player.x;
        this.helicopter.targetZ = player.z;
      }

      const distToPlayer = Math.hypot(this.helicopter.x - player.x, this.helicopter.z - player.z);
      this.helicopter.searchlightActive = distToPlayer < 24.0;
    } else {
      this.helicopter.searchlightActive = false;
    }
  }

  directPursuit(cruiser, player, dt) {
    cruiser.sirenActive = true;
    const dx = player.x - cruiser.x;
    const dz = player.z - cruiser.z;
    const desiredAngle = Math.atan2(dx, dz);
    const diff = normalizeAngle(desiredAngle - cruiser.rotY);

    cruiser.steer = clamp(diff * 2.2, -cruiser.spec.steerAngle, cruiser.spec.steerAngle);
    cruiser.rotY += cruiser.steer * dt * 3.2;
    cruiser.rotY = normalizeAngle(cruiser.rotY);

    // Speed boost during pursuit
    cruiser.speed = lerp(cruiser.speed, cruiser.spec.maxSpeed * POLICE_CONFIG.CHASE_SPEED_BOOST, dt * 2.0);
  }

  spawnPursuitCruiser(player, vehicles) {
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 65 + Math.random() * 35;
    const sx = player.x + Math.sin(spawnAngle) * spawnDist;
    const sz = player.z + Math.cos(spawnAngle) * spawnDist;

    if (sx > -WORLD.HALF_SIZE && sx < WORLD.HALF_SIZE && sz > -WORLD.HALF_SIZE && sz < WORLD.HALF_SIZE) {
      const cruiser = vehicles.spawn('police', sx, 0, sz, spawnAngle + Math.PI);
      cruiser.sirenActive = true;
      cruiser.speed = 18.0;
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.helicopter.active) return;

    const h = this.helicopter;
    const x = h.x;
    const y = h.y;
    const z = h.z;

    const heliDark = [0.12, 0.14, 0.18, 1.0];
    const heliWhite = [0.94, 0.95, 0.98, 1.0];
    const heliBlue = [0.15, 0.45, 0.85, 1.0];
    const rotorCol = [0.25, 0.25, 0.28, 0.85];

    const addBoxHeli = (bx, by, bz, sx, sy, sz, color) => {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const cy = y + by + hy;

      const corners = [
        [x + bx - hx, cy - hy, z + bz - hz],
        [x + bx + hx, cy - hy, z + bz - hz],
        [x + bx + hx, cy - hy, z + bz + hz],
        [x + bx - hx, cy - hy, z + bz + hz],
        [x + bx - hx, cy + hy, z + bz - hz],
        [x + bx + hx, cy + hy, z + bz - hz],
        [x + bx + hx, cy + hy, z + bz + hz],
        [x + bx - hx, cy + hy, z + bz + hz],
      ];

      const faces = [
        [4, 5, 6, 7, [0, 1, 0]],   // Top
        [3, 2, 1, 0, [0, -1, 0]],  // Bottom
        [7, 6, 2, 3, [0, 0, 1]],   // Front
        [5, 4, 0, 1, [0, 0, -1]],  // Back
        [6, 5, 1, 2, [1, 0, 0]],   // Right
        [4, 7, 3, 0, [-1, 0, 0]],  // Left
      ];

      for (const [i1, i2, i3, i4, norm] of faces) {
        const p1 = corners[i1], p2 = corners[i2], p3 = corners[i3], p4 = corners[i4];
        const pts = [p1, p2, p3, p1, p3, p4];
        for (let p = 0; p < 6; p++) {
          positions.push(pts[p][0], pts[p][1], pts[p][2]);
          normals.push(norm[0], norm[1], norm[2]);
          colors.push(color[0], color[1], color[2], color[3] || 1.0);
          uvs.push(0, 0);
        }
      }
    };

    // Fuselage
    addBoxHeli(0, 0, 0, 2.4, 2.6, 6.5, heliWhite);
    addBoxHeli(0, 0.4, 0.8, 2.3, 1.8, 2.8, heliBlue);

    // Tail boom
    addBoxHeli(0, 0.6, -5.2, 0.8, 0.8, 5.0, heliDark);

    // Landing skids
    addBoxHeli(-1.2, -1.6, 0, 0.15, 0.15, 5.5, [0.1, 0.1, 0.1, 1.0]);
    addBoxHeli(1.2, -1.6, 0, 0.15, 0.15, 5.5, [0.1, 0.1, 0.1, 1.0]);

    // Skid struts
    addBoxHeli(-1.0, -0.8, 1.2, 0.12, 1.4, 0.12, [0.1, 0.1, 0.1, 1.0]);
    addBoxHeli(1.0, -0.8, 1.2, 0.12, 1.4, 0.12, [0.1, 0.1, 0.1, 1.0]);
    addBoxHeli(-1.0, -0.8, -1.2, 0.12, 1.4, 0.12, [0.1, 0.1, 0.1, 1.0]);
    addBoxHeli(1.0, -0.8, -1.2, 0.12, 1.4, 0.12, [0.1, 0.1, 0.1, 1.0]);

    // Main Rotor Blades
    const rAng = h.rotorAngle;
    const rCos = Math.cos(rAng);
    const rSin = Math.sin(rAng);
    const rotorLen = 9.5;

    const b1x = rCos * (rotorLen * 0.5);
    const b1z = rSin * (rotorLen * 0.5);
    addBoxHeli(b1x, 2.8, b1z, 0.45, 0.08, rotorLen, rotorCol);

    const b2x = -rSin * (rotorLen * 0.5);
    const b2z = rCos * (rotorLen * 0.5);
    addBoxHeli(b2x, 2.8, b2z, rotorLen, 0.08, 0.45, rotorCol);

    // Rotor mast
    addBoxHeli(0, 2.0, 0, 0.35, 1.6, 0.35, [0.1, 0.1, 0.1, 1.0]);
  }

  buildSearchlightMesh(positions, colors) {
    if (!this.helicopter.active || !this.helicopter.searchlightActive) return;

    const h = this.helicopter;
    const hx = h.x;
    const hy = h.y;
    const hz = h.z;

    const gx = h.targetX !== undefined ? h.targetX : hx;
    const gz = h.targetZ !== undefined ? h.targetZ : hz;
    const gy = 0.06;

    const apexCol = [1.0, 0.92, 0.74, 0.10];
    const midBeamCol = [1.0, 0.88, 0.68, 0.035];
    const groundBeamCol = [0.98, 0.84, 0.60, 0.012];
    const edgeBeamCol = [0.95, 0.80, 0.52, 0.0];

    const rx = 5.2;
    const rz = 7.0;
    const groundCenterCol = [1.0, 0.90, 0.70, 0.16];
    const groundMidCol = [0.98, 0.85, 0.62, 0.07];
    const groundEdgeCol = [0.95, 0.78, 0.50, 0.0];

    const radialSegments = 24;
    for (let i = 0; i < radialSegments; i++) {
      const a1 = (i / radialSegments) * Math.PI * 2;
      const a2 = ((i + 1) / radialSegments) * Math.PI * 2;

      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
      const cos2 = Math.cos(a2), sin2 = Math.sin(a2);

      const pCenter = [gx, gy, gz];
      const pMid1 = [gx + cos1 * rx * 0.45, gy, gz + sin1 * rz * 0.45];
      const pMid2 = [gx + cos2 * rx * 0.45, gy, gz + sin2 * rz * 0.45];

      positions.push(pCenter[0], pCenter[1], pCenter[2]);
      colors.push(...groundCenterCol);
      positions.push(pMid1[0], pMid1[1], pMid1[2]);
      colors.push(...groundMidCol);
      positions.push(pMid2[0], pMid2[1], pMid2[2]);
      colors.push(...groundMidCol);

      const pOut1 = [gx + cos1 * rx, gy, gz + sin1 * rz];
      const pOut2 = [gx + cos2 * rx, gy, gz + sin2 * rz];

      positions.push(pMid1[0], pMid1[1], pMid1[2]);
      colors.push(...groundMidCol);
      positions.push(pOut1[0], pOut1[1], pOut1[2]);
      colors.push(...groundEdgeCol);
      positions.push(pMid2[0], pMid2[1], pMid2[2]);
      colors.push(...groundMidCol);

      positions.push(pMid2[0], pMid2[1], pMid2[2]);
      colors.push(...groundMidCol);
      positions.push(pOut1[0], pOut1[1], pOut1[2]);
      colors.push(...groundEdgeCol);
      positions.push(pOut2[0], pOut2[1], pOut2[2]);
      colors.push(...groundEdgeCol);
    }

    const lampY = hy - 1.2;
    const rTop = 0.45;
    const rBase = 4.8;
    const rSkirt = 6.6;

    for (let i = 0; i < radialSegments; i++) {
      const a1 = (i / radialSegments) * Math.PI * 2;
      const a2 = ((i + 1) / radialSegments) * Math.PI * 2;

      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
      const cos2 = Math.cos(a2), sin2 = Math.sin(a2);

      const top1 = [hx + cos1 * rTop, lampY, hz + sin1 * rTop];
      const top2 = [hx + cos2 * rTop, lampY, hz + sin2 * rTop];
      const bot1 = [gx + cos1 * rBase, gy + 0.08, gz + sin1 * rBase];
      const bot2 = [gx + cos2 * rBase, gy + 0.08, gz + sin2 * rBase];
      const skirt1 = [gx + cos1 * rSkirt, gy + 0.08, gz + sin1 * rSkirt];
      const skirt2 = [gx + cos2 * rSkirt, gy + 0.08, gz + sin2 * rSkirt];

      positions.push(top1[0], top1[1], top1[2]);
      colors.push(...apexCol);
      positions.push(bot1[0], bot1[1], bot1[2]);
      colors.push(...groundBeamCol);
      positions.push(top2[0], top2[1], top2[2]);
      colors.push(...apexCol);

      positions.push(top2[0], top2[1], top2[2]);
      colors.push(...apexCol);
      positions.push(bot1[0], bot1[1], bot1[2]);
      colors.push(...groundBeamCol);
      positions.push(bot2[0], bot2[1], bot2[2]);
      colors.push(...groundBeamCol);

      positions.push(top1[0], top1[1], top1[2]);
      colors.push(...midBeamCol);
      positions.push(skirt1[0], skirt1[1], skirt1[2]);
      colors.push(...edgeBeamCol);
      positions.push(bot1[0], bot1[1], bot1[2]);
      colors.push(...groundBeamCol);

      positions.push(top2[0], top2[1], top2[2]);
      colors.push(...midBeamCol);
      positions.push(bot2[0], bot2[1], bot2[2]);
      colors.push(...groundBeamCol);
      positions.push(skirt2[0], skirt2[1], skirt2[2]);
      colors.push(...edgeBeamCol);
    }
  }
}
