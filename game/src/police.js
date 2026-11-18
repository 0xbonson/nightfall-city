/**
 * Nightfall City: Vela Bay - Wanted Heat & Escalating Pursuit AI
 * Implements 5-star criminal pursuit escalation, cruiser intercept tactics,
 * roadblocks, helicopter air support with searchlight, and line-of-sight evasion.
 * Authored for make.fun GTA 6 bounty challenge.
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

    // Tactical Police Helicopter
    this.helicopter = {
      active: false,
      forcedActive: false,
      lockedPosition: false,
      x: 0,
      y: 35,
      z: 0,
      targetX: 0,
      targetZ: 0,
      rotorAngle: 0,
      spotlightAngle: 0,
    };
  }

  addCrime(type) {
    if (type === 'minor_collision') this.heat += 0.35;
    else if (type === 'vehicle_theft') this.heat += 0.8;
    else if (type === 'pedestrian_hit') this.heat += 1.2;
    else if (type === 'gunfire') this.heat += 0.6;
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

  update(dt, player, vehicles, world) {
    this.wantedStars = Math.floor(this.heat);

    if (this.wantedStars <= 0 && !this.helicopter.forcedActive) {
      this.helicopter.active = false;
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

        // Direct cruiser to intercept player
        this.directPursuit(v, player, dt);
      }
    }

    // Line of sight evasion tracking
    if (nearestDist > POLICE_CONFIG.SIGHT_RADIUS && !this.helicopter.active) {
      this.isEvading = true;
      this.evasionTimer -= dt;
      if (this.evasionTimer <= 0) {
        this.heat = Math.max(0, this.heat - 1.0);
        this.wantedStars = Math.floor(this.heat);
        this.evasionTimer = POLICE_CONFIG.LOSE_SIGHT_TIME;
        if (this.wantedStars === 0) {
          this.isEvading = false;
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

    // Update Tactical Helicopter
    if (this.helicopter.active) {
      this.helicopter.rotorAngle += dt * 38.0;

      if (!this.helicopter.lockedPosition) {
        const hTargetX = player.x + Math.sin(performance.now() * 0.001) * 12.0;
        const hTargetZ = player.z + Math.cos(performance.now() * 0.001) * 12.0;

        this.helicopter.x = lerp(this.helicopter.x, hTargetX, dt * 1.8);
        this.helicopter.z = lerp(this.helicopter.z, hTargetZ, dt * 1.8);
        this.helicopter.y = 28.0;
      }
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
    // Spawn cruiser behind or ahead along the road network
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

    // Cross rotor blades
    const b1x = rCos * (rotorLen * 0.5);
    const b1z = rSin * (rotorLen * 0.5);
    addBoxHeli(b1x, 2.8, b1z, 0.45, 0.08, rotorLen, rotorCol);

    const b2x = -rSin * (rotorLen * 0.5);
    const b2z = rCos * (rotorLen * 0.5);
    addBoxHeli(b2x, 2.8, b2z, rotorLen, 0.08, 0.45, rotorCol);

    // Rotor mast
    addBoxHeli(0, 2.0, 0, 0.35, 1.6, 0.35, [0.1, 0.1, 0.1, 1.0]);

    // High-Intensity Downward Searchlight Spotlight Beam
    const spotCol = [1.5, 1.4, 1.0, 0.35];
    const beamRadius = 7.5;
    const groundY = 0.05;

    // Conical spotlight geometry on the ground
    const circlePts = 12;
    for (let c = 0; c < circlePts; c++) {
      const a1 = (c / circlePts) * Math.PI * 2;
      const a2 = ((c + 1) / circlePts) * Math.PI * 2;

      const p1 = [x, y - 1.5, z];
      const p2 = [x + Math.cos(a1) * beamRadius, groundY, z + Math.sin(a1) * beamRadius];
      const p3 = [x + Math.cos(a2) * beamRadius, groundY, z + Math.sin(a2) * beamRadius];

      const quad = [p1, p2, p3];
      for (const pt of quad) {
        positions.push(pt[0], pt[1], pt[2]);
        normals.push(0, 1, 0);
        colors.push(spotCol[0], spotCol[1], spotCol[2], spotCol[3]);
        uvs.push(0, 0);
      }
    }
  }
}
