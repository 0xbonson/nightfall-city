/**
 * Nightfall City: Vela Bay - Pedestrian Population & Reactive Citizen AI
 * Authored by makefun agent for the open-world crime game entry.
 *
 * Implements:
 * - Diverse Mediterranean coastal citizens with articulated walking kinematics
 * - Distinct silhouettes: head, hair, sunglasses/hats, shirts/blazers, trousers/shorts, shoes
 * - Mediterranean palette: terracotta, coral, washed ochre, seafoam teal, linen cream, navy
 * - Directional ground shadows cast along the sun vector under each citizen
 * - Accessories: shopping totes, leather briefcases, sunglasses, caps
 * - Reactive AI: sidewalk navigation, panicking and fleeing from speeding cars & gunfire
 * - Demise cash drops with spinning currency stacks
 */

import { clamp, normalizeAngle } from './math.js';

export class Pedestrian {
  constructor(x, y, z, rotY = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotY = rotY;

    this.vx = 0;
    this.vz = 0;
    this.speed = 1.6 + Math.random() * 0.6;
    this.walkCycle = Math.random() * Math.PI * 2;

    this.health = 30;
    this.alive = true;
    this.isFleeing = false;
    this.fleeTimer = 0;
    this.hasDroppedCash = false;

    // Mediterranean coastal civilian styling
    const shirtColors = [
      [0.95, 0.42, 0.35, 1.0], // Sunset coral
      [0.22, 0.68, 0.85, 1.0], // Vela teal
      [0.96, 0.82, 0.28, 1.0], // Ochre sun
      [0.28, 0.75, 0.52, 1.0], // Coastal mint
      [0.96, 0.95, 0.92, 1.0], // Linen white
      [0.85, 0.44, 0.68, 1.0], // Bougainvillea magenta
      [0.22, 0.25, 0.32, 1.0], // Marine navy
      [0.78, 0.48, 0.28, 1.0], // Terracotta orange
    ];
    const pantColors = [
      [0.18, 0.28, 0.45, 1.0], // Denim indigo
      [0.72, 0.65, 0.52, 1.0], // Sand khaki
      [0.15, 0.16, 0.18, 1.0], // Slate black
      [0.88, 0.88, 0.85, 1.0], // Linen cream
      [0.35, 0.42, 0.36, 1.0], // Olive sage
    ];
    const skinTones = [
      [0.92, 0.76, 0.62, 1.0],
      [0.84, 0.66, 0.50, 1.0],
      [0.62, 0.44, 0.32, 1.0],
      [0.94, 0.80, 0.68, 1.0],
    ];
    const hairTones = [
      [0.14, 0.12, 0.10, 1.0], // Espresso
      [0.32, 0.20, 0.12, 1.0], // Chestnut
      [0.75, 0.62, 0.42, 1.0], // Sun-bleached blonde
      [0.10, 0.10, 0.12, 1.0], // Jet black
    ];

    this.shirtCol = shirtColors[Math.floor(Math.random() * shirtColors.length)];
    this.pantsCol = pantColors[Math.floor(Math.random() * pantColors.length)];
    this.skinCol = skinTones[Math.floor(Math.random() * skinTones.length)];
    this.hairCol = hairTones[Math.floor(Math.random() * hairTones.length)];
    this.hasGlasses = Math.random() < 0.45;
    this.hasBag = Math.random() < 0.35;
    this.hasHat = Math.random() < 0.25;

    this.targetDirTimer = 5 + Math.random() * 10;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health -= amount;
    this.isFleeing = true;
    this.fleeTimer = 10.0;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  fleeFrom(threatX, threatZ) {
    if (!this.alive) return;
    this.isFleeing = true;
    this.fleeTimer = 8.0;
    const dx = this.x - threatX;
    const dz = this.z - threatZ;
    this.rotY = Math.atan2(dx, dz);
  }

  update(dt, world, player, vehicles) {
    if (!this.alive) return;

    if (this.fleeTimer > 0) {
      this.fleeTimer -= dt;
      if (this.fleeTimer <= 0) this.isFleeing = false;
    }

    const currentSpeed = this.isFleeing ? 5.5 : this.speed;

    // Periodic wandering direction shifts
    this.targetDirTimer -= dt;
    if (this.targetDirTimer <= 0 && !this.isFleeing) {
      this.targetDirTimer = 6 + Math.random() * 12;
      this.rotY += (Math.random() - 0.5) * 1.5;
    }

    this.vx = Math.sin(this.rotY) * currentSpeed;
    this.vz = Math.cos(this.rotY) * currentSpeed;

    const prevX = this.x;
    const prevZ = this.z;

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Building collision
    const col = world.checkCollision(this.x, this.z, 0.35);
    if (col.collided) {
      this.x = prevX + col.pushX;
      this.z = prevZ + col.pushZ;
      this.rotY += Math.PI * 0.5;
    }

    // Advance walking gait
    this.walkCycle += dt * currentSpeed * 3.6;

    // Flee from nearby speeding vehicles
    for (let i = 0; i < vehicles.vehicles.length; i++) {
      const v = vehicles.vehicles[i];
      if (Math.abs(v.speed) > 6.5) {
        const d = Math.hypot(this.x - v.x, this.z - v.z);
        if (d < 8.5) {
          this.fleeFrom(v.x, v.z);
          break;
        }
      }
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.alive) return;

    const x = this.x;
    const y = this.y;
    const z = this.z;
    const rot = this.rotY;

    const sinRot = Math.sin(rot);
    const cosRot = Math.cos(rot);

    const swing = Math.sin(this.walkCycle) * 0.35;

    const addBoxRot = (bx, by, bz, sx, sy, sz, color) => {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const cy = by + hy;

      const corners = [
        [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
        [-hx, hy, -hz],  [hx, hy, -hz],  [hx, hy, hz],  [-hx, hy, hz],
      ];

      const rotCorners = corners.map(([cx, cyOff, cz]) => {
        const lx = cx + bx;
        const lz = cz + bz;
        const wx = x + lx * cosRot + lz * sinRot;
        const wz = z - lx * sinRot + lz * cosRot;
        return [wx, cy + cyOff, wz];
      });

      const faces = [
        [4, 5, 6, 7, [0, 1, 0]],   // Top
        [3, 2, 1, 0, [0, -1, 0]],  // Bottom
        [7, 6, 2, 3, [sinRot, 0, cosRot]], // Front
        [5, 4, 0, 1, [-sinRot, 0, -cosRot]], // Back
        [6, 5, 1, 2, [cosRot, 0, -sinRot]],  // Right
        [4, 7, 3, 0, [-cosRot, 0, sinRot]], // Left
      ];

      for (const [i1, i2, i3, i4, norm] of faces) {
        const p1 = rotCorners[i1], p2 = rotCorners[i2], p3 = rotCorners[i3], p4 = rotCorners[i4];
        const pts = [p1, p2, p3, p1, p3, p4];
        for (let p = 0; p < 6; p++) {
          positions.push(pts[p][0], pts[p][1], pts[p][2]);
          normals.push(norm[0], norm[1], norm[2]);
          colors.push(color[0], color[1], color[2], color[3] || 1.0);
          uvs.push(0, 0);
        }
      }
    };

    // 0. Directional ground shadow cast along the sun vector (+X, +Z)
    const shadowCol = [0.03, 0.05, 0.08, 0.38];
    const shW = 0.32;
    const shL = 1.05;
    const shX = x + 0.30;
    const shZ = z + 0.40;
    const shGroundY = y + 0.012;

    const shQuad = [
      [shX - shW, shGroundY, shZ - shW],
      [shX + shW + 0.1, shGroundY, shZ - shW + 0.05],
      [shX + shW + 0.1 + shL * 0.35, shGroundY, shZ + shW + shL],
      [shX - shW, shGroundY, shZ - shW],
      [shX + shW + 0.1 + shL * 0.35, shGroundY, shZ + shW + shL],
      [shX - shW + shL * 0.25, shGroundY, shZ + shW + shL],
    ];
    for (const pt of shQuad) {
      positions.push(pt[0], pt[1], pt[2]);
      normals.push(0, 1, 0);
      colors.push(shadowCol[0], shadowCol[1], shadowCol[2], shadowCol[3]);
      uvs.push(0, 0);
    }

    // 1. Shoes
    const shoeCol = [0.12, 0.12, 0.14, 1.0];
    addBoxRot(-0.12, y, swing * 0.16, 0.16, 0.12, 0.26, shoeCol);
    addBoxRot(0.12, y, -swing * 0.16, 0.16, 0.12, 0.26, shoeCol);

    // 2. Trousers / Shorts
    addBoxRot(-0.12, y + 0.12, swing * 0.16, 0.16, 0.62, 0.16, this.pantsCol);
    addBoxRot(0.12, y + 0.12, -swing * 0.16, 0.16, 0.62, 0.16, this.pantsCol);

    // 3. Torso / Shirt
    addBoxRot(0, y + 0.74, 0, 0.44, 0.64, 0.24, this.shirtCol);

    // 4. Arms & Hands
    addBoxRot(-0.28, y + 0.78, -swing * 0.16, 0.12, 0.40, 0.12, this.shirtCol);
    addBoxRot(-0.28, y + 0.58, -swing * 0.16, 0.10, 0.22, 0.10, this.skinCol);

    addBoxRot(0.28, y + 0.78, swing * 0.16, 0.12, 0.40, 0.12, this.shirtCol);
    addBoxRot(0.28, y + 0.58, swing * 0.16, 0.10, 0.22, 0.10, this.skinCol);

    // 5. Head & Hair
    addBoxRot(0, y + 1.40, 0, 0.26, 0.26, 0.26, this.skinCol);
    addBoxRot(0, y + 1.54, -0.01, 0.28, 0.12, 0.28, this.hairCol);

    // 6. Accessories
    if (this.hasGlasses) {
      addBoxRot(0, y + 1.46, 0.14, 0.24, 0.07, 0.06, [0.10, 0.10, 0.12, 1.0]);
    }

    if (this.hasHat) {
      addBoxRot(0, y + 1.58, 0, 0.42, 0.06, 0.42, [0.85, 0.78, 0.62, 1.0]); // Straw fedora brim
      addBoxRot(0, y + 1.64, 0, 0.28, 0.12, 0.28, [0.85, 0.78, 0.62, 1.0]); // Crown
    }

    if (this.hasBag) {
      addBoxRot(0.32, y + 0.42, swing * 0.16, 0.12, 0.28, 0.22, [0.88, 0.75, 0.55, 1.0]);
    }
  }
}

export class CashPickup {
  constructor(x, y, z, amount = 50) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.amount = amount;
    this.alive = true;
    this.rot = 0;
  }

  update(dt, player, audio) {
    if (!this.alive) return;
    this.rot += dt * 3.5;

    const d = Math.hypot(this.x - player.x, this.z - player.z);
    if (d < 1.6 && Math.abs(this.y - player.y) < 2.0) {
      player.addMoney(this.amount);
      if (audio) audio.playCashChime();
      this.alive = false;
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.alive) return;
    const green = [0.22, 0.88, 0.42, 1.0];
    const hoverY = this.y + 0.35 + Math.sin(this.rot * 2) * 0.08;

    const s = 0.32;
    const pts = [
      [this.x - s, hoverY, this.z - s],
      [this.x + s, hoverY, this.z - s],
      [this.x + s, hoverY + 0.1, this.z + s],
      [this.x - s, hoverY + 0.1, this.z + s],
    ];

    const quad = [pts[0], pts[1], pts[2], pts[0], pts[2], pts[3]];
    for (const pt of quad) {
      positions.push(pt[0], pt[1], pt[2]);
      normals.push(0, 1, 0);
      colors.push(green[0], green[1], green[2], green[3]);
      uvs.push(0, 0);
    }
  }
}

export class PedestrianManager {
  constructor() {
    this.pedestrians = [];
    this.pickups = [];
  }

  initCityPedestrians() {
    // Populate downtown sidewalks, market quarter, and coastal promenade
    const sidewalkZones = [
      { xMin: 110, xMax: 160, zMin: -160, zMax: -80 }, // Downtown Vela sidewalks
      { xMin: -95, xMax: -30, zMin: -160, zMax: -70 },  // Old Market Quarter
      { xMin: -115, xMax: -90, zMin: 30, zMax: 180 },   // Promenade Boardwalk
      { xMin: 20, xMax: 80, zMin: -50, zMax: 50 },      // Central Grand Plaza
    ];

    for (const zone of sidewalkZones) {
      for (let i = 0; i < 9; i++) {
        const x = zone.xMin + Math.random() * (zone.xMax - zone.xMin);
        const z = zone.zMin + Math.random() * (zone.zMax - zone.zMin);
        this.spawn(x, 0.22, z, Math.random() * Math.PI * 2);
      }
    }
  }

  spawn(x, y, z, rot = 0) {
    const p = new Pedestrian(x, y, z, rot);
    this.pedestrians.push(p);
    return p;
  }

  notifyGunfire(gx, gz, radius = 48) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      if (p.alive && Math.hypot(p.x - gx, p.z - gz) < radius) {
        p.fleeFrom(gx, gz);
      }
    }
  }

  notifyHorn(hx, hz, radius = 22) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      if (p.alive && Math.hypot(p.x - hx, p.z - hz) < radius) {
        p.fleeFrom(hx, hz);
      }
    }
  }

  update(dt, world, player, vehicles, audio) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];
      p.update(dt, world, player, vehicles);

      // If dead, drop cash
      if (!p.alive && !p.hasDroppedCash) {
        p.hasDroppedCash = true;
        this.pickups.push(new CashPickup(p.x, p.y, p.z, 25 + Math.floor(Math.random() * 75)));
      }
    }

    for (let i = 0; i < this.pickups.length; i++) {
      this.pickups[i].update(dt, player, audio);
    }
    this.pickups = this.pickups.filter((pk) => pk.alive);
  }

  buildMesh(positions, normals, colors, uvs) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      this.pedestrians[i].buildMesh(positions, normals, colors, uvs);
    }
    for (let i = 0; i < this.pickups.length; i++) {
      this.pickups[i].buildMesh(positions, normals, colors, uvs);
    }
  }
}
