/**
 * Nightfall City: Vela Bay - Wanted Level & Police Pursuit System
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { POLICE_CONFIG, WORLD } from './config.js';
import { clamp, lerp } from './math.js';

export class PoliceSystem {
  constructor() {
    this.wantedStars = 0;
    this.heat = 0; // Float representation of heat
    this.evasionTimer = 0;
    this.isEvading = false;
    this.spawnTimer = 0;

    // Helicopter unit
    this.helicopter = {
      active: false,
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

    if (this.wantedStars <= 0) {
      this.helicopter.active = false;
      this.isEvading = false;
      return;
    }

    // Check distance to nearest police vehicle
    let nearestDist = 999;
    let policeCount = 0;

    for (let i = 0; i < vehicles.vehicles.length; i++) {
      const v = vehicles.vehicles[i];
      if (v.isPolice) {
        policeCount++;
        const d = Math.hypot(v.x - player.x, v.z - player.z);
        if (d < nearestDist) nearestDist = d;

        // Direct police cruiser to intercept player
        this.directPursuit(v, player, dt);
      }
    }

    // Evasion logic
    if (nearestDist > POLICE_CONFIG.SIGHT_RADIUS) {
      this.isEvading = true;
      this.evasionTimer -= dt;
      if (this.evasionTimer <= 0) {
        // Escaped!
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

    // Spawn tactical police backup if below cap
    this.spawnTimer += dt;
    if (this.spawnTimer > POLICE_CONFIG.SPAWN_INTERVAL && policeCount < Math.min(this.wantedStars + 1, POLICE_CONFIG.MAX_ACTIVE_CRUISERS)) {
      this.spawnTimer = 0;
      this.spawnPursuitCruiser(player, vehicles);
    }

    // Police helicopter at 4+ stars or if forced active in photo preset
    if (this.wantedStars >= 4 || this.helicopter.forcedActive) {
      this.helicopter.active = true;
      this.updateHelicopter(dt, player);
    } else {
      this.helicopter.active = false;
    }
  }

  directPursuit(cruiser, player, dt) {
    // Steer towards player
    const dx = player.x - cruiser.x;
    const dz = player.z - cruiser.z;
    const targetAngle = Math.atan2(dx, dz);

    let dAngle = targetAngle - cruiser.rotY;
    while (dAngle > Math.PI) dAngle -= Math.PI * 2;
    while (dAngle < -Math.PI) dAngle += Math.PI * 2;

    cruiser.steer = clamp(dAngle * 1.8, -cruiser.spec.steerAngle, cruiser.spec.steerAngle);
    cruiser.speed = Math.min(cruiser.spec.maxSpeed * 0.95, cruiser.speed + cruiser.spec.accel * dt);
    cruiser.sirenActive = true;
  }

  spawnPursuitCruiser(player, vehicles) {
    // Spawn cruiser ahead or behind on a nearby road
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 65 + Math.random() * 25;
    const sx = clamp(player.x + Math.sin(spawnAngle) * spawnDist, WORLD.COAST_X + 5, WORLD.HALF_SIZE - 20);
    const sz = clamp(player.z + Math.cos(spawnAngle) * spawnDist, -WORLD.HALF_SIZE + 20, WORLD.HALF_SIZE - 20);

    const c = vehicles.spawn('police', sx, 0, sz, Math.atan2(player.x - sx, player.z - sz));
    c.sirenActive = true;
  }

  updateHelicopter(dt, player) {
    const heli = this.helicopter;
    heli.rotorAngle += dt * 32.0;

    if (heli.lockedPosition) {
      return;
    }

    // Circle smoothly overhead
    heli.spotlightAngle += dt * 0.6;
    const circleRadius = 18;
    const targetHeliX = player.x + Math.sin(heli.spotlightAngle) * circleRadius;
    const targetHeliZ = player.z + Math.cos(heli.spotlightAngle) * circleRadius;

    heli.x = lerp(heli.x, targetHeliX, dt * 1.5);
    heli.z = lerp(heli.z, targetHeliZ, dt * 1.5);
    heli.y = lerp(heli.y, 32.0, dt * 2.0);
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.helicopter.active) return;

    const heli = this.helicopter;
    const px = heli.x;
    const py = heli.y;
    const pz = heli.z;

    const darkNavy = [0.10, 0.12, 0.16, 1.0];
    const whiteStripe = [0.92, 0.92, 0.95, 1.0];
    const bladeBlack = [0.05, 0.05, 0.05, 1.0];
    const glassCyan = [0.2, 0.45, 0.65, 0.85];

    const addBoxHeli = (lx, ly, lz, sx, sy, sz, color) => {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const x = px + lx, y = py + ly, z = pz + lz;

      // Quad helpers
      const addFace = (p1, p2, p3, p4, norm) => {
        const pts = [p1, p2, p3, p1, p3, p4];
        for (let i = 0; i < 6; i++) {
          positions.push(pts[i][0], pts[i][1], pts[i][2]);
          normals.push(norm[0], norm[1], norm[2]);
          colors.push(color[0], color[1], color[2], color[3] || 1.0);
          uvs.push(0, 0);
        }
      };

      addFace([x - hx, y + hy, z - hz], [x + hx, y + hy, z - hz], [x + hx, y + hy, z + hz], [x - hx, y + hy, z + hz], [0, 1, 0]);
      addFace([x - hx, y - hy, z + hz], [x + hx, y - hy, z + hz], [x + hx, y - hy, z - hz], [x - hx, y - hy, z - hz], [0, -1, 0]);
      addFace([x - hx, y - hy, z + hz], [x + hx, y - hy, z + hz], [x + hx, y + hy, z + hz], [x - hx, y + hy, z + hz], [0, 0, 1]);
      addFace([x + hx, y - hy, z - hz], [x - hx, y - hy, z - hz], [x - hx, y + hy, z - hz], [x + hx, y + hy, z - hz], [0, 0, -1]);
      addFace([x + hx, y - hy, z + hz], [x + hx, y - hy, z - hz], [x + hx, y + hy, z - hz], [x + hx, y + hy, z + hz], [1, 0, 0]);
      addFace([x - hx, y - hy, z - hz], [x - hx, y - hy, z + hz], [x - hx, y + hy, z + hz], [x - hx, y + hy, z - hz], [-1, 0, 0]);
    };

    // 1. Helicopter main fuselage
    addBoxHeli(0, 0, 0, 2.4, 2.2, 5.8, darkNavy);
    addBoxHeli(0, -0.1, 0, 2.44, 0.35, 5.8, whiteStripe); // Metro PD stripe

    // 2. Cockpit glass bubble
    addBoxHeli(0, 0.25, 2.2, 2.1, 1.6, 1.8, glassCyan);

    // 3. Tail boom & vertical stabilizer
    addBoxHeli(0, 0.4, -4.5, 0.55, 0.65, 4.8, darkNavy);
    addBoxHeli(0, 1.2, -6.6, 0.25, 1.8, 1.2, whiteStripe);

    // 4. Landing skids
    addBoxHeli(-1.2, -1.3, 0, 0.15, 0.15, 5.2, bladeBlack);
    addBoxHeli(1.2, -1.3, 0, 0.15, 0.15, 5.2, bladeBlack);

    // 5. Spinning main rotor blades
    const rCos = Math.cos(heli.rotorAngle);
    const rSin = Math.sin(heli.rotorAngle);
    const bladeLen = 12.0;

    // Two cross blades
    const b1x = rCos * (bladeLen * 0.5);
    const b1z = rSin * (bladeLen * 0.5);
    const ptsB1 = [
      [px - b1x, py + 1.45, pz - b1z],
      [px + b1x, py + 1.45, pz + b1z],
      [px + b1x + 0.3, py + 1.45, pz + b1z + 0.3],
      [px - b1x, py + 1.45, pz - b1z],
      [px + b1x + 0.3, py + 1.45, pz + b1z + 0.3],
      [px - b1x + 0.3, py + 1.45, pz - b1z + 0.3],
    ];
    for (let i = 0; i < 6; i++) {
      positions.push(ptsB1[i][0], ptsB1[i][1], ptsB1[i][2]);
      normals.push(0, 1, 0);
      colors.push(bladeBlack[0], bladeBlack[1], bladeBlack[2], 1.0);
      uvs.push(0, 0);
    }

    // 6. Volumetric searchlight beam cone pointing towards player
    const beamColor = [1.0, 0.98, 0.85, 0.35];
    const groundRadius = 9.0;
    const targetX = px;
    const targetZ = pz + 4.0;

    const beamAngles = 8;
    for (let i = 0; i < beamAngles; i++) {
      const a0 = (i / beamAngles) * Math.PI * 2;
      const a1 = ((i + 1) / beamAngles) * Math.PI * 2;

      const p0 = [targetX + Math.cos(a0) * groundRadius, 0.05, targetZ + Math.sin(a0) * groundRadius];
      const p1 = [targetX + Math.cos(a1) * groundRadius, 0.05, targetZ + Math.sin(a1) * groundRadius];
      const pApex = [px, py - 0.8, pz + 1.0];

      const tri = [pApex, p0, p1];
      for (let p = 0; p < 3; p++) {
        positions.push(tri[p][0], tri[p][1], tri[p][2]);
        normals.push(0, 1, 0);
        colors.push(beamColor[0], beamColor[1], beamColor[2], beamColor[3]);
        uvs.push(0, 0);
      }
    }
  }
}
