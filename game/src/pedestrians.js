/**
 * Nightfall City: Vela Bay - Pedestrian Population & Reactive AI
 * Authored by makefun agent for the GTA 6 bounty challenge.
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

    this.health = 25;
    this.alive = true;
    this.isFleeing = false;
    this.fleeTimer = 0;

    // Varied clothing palette
    const shirtColors = [
      [0.92, 0.35, 0.28, 1.0], // Coral red
      [0.22, 0.65, 0.85, 1.0], // Sky blue
      [0.85, 0.78, 0.25, 1.0], // Yellow
      [0.32, 0.72, 0.42, 1.0], // Green
      [0.88, 0.88, 0.90, 1.0], // White
      [0.18, 0.20, 0.24, 1.0], // Black
    ];
    const pantColors = [
      [0.18, 0.24, 0.38, 1.0], // Blue jeans
      [0.55, 0.48, 0.38, 1.0], // Khaki
      [0.16, 0.16, 0.18, 1.0], // Charcoal
    ];
    const skinTones = [
      [0.88, 0.72, 0.58, 1.0],
      [0.72, 0.52, 0.38, 1.0],
      [0.48, 0.34, 0.25, 1.0],
    ];

    this.shirtCol = shirtColors[Math.floor(Math.random() * shirtColors.length)];
    this.pantsCol = pantColors[Math.floor(Math.random() * pantColors.length)];
    this.skinCol = skinTones[Math.floor(Math.random() * skinTones.length)];

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

  update(dt, world, player, activeCars) {
    if (!this.alive) return;

    // React to nearby speeding cars or running player
    if (this.fleeTimer > 0) {
      this.fleeTimer -= dt;
      if (this.fleeTimer <= 0) this.isFleeing = false;
    }

    const currentSpeed = this.isFleeing ? 5.2 : this.speed;

    // Strolling direction timer
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

    // Collision with city buildings
    const col = world.checkCollision(this.x, this.z, 0.35);
    if (col.collided) {
      this.x = prevX + col.pushX;
      this.z = prevZ + col.pushZ;
      this.rotY += Math.PI * 0.5 + Math.random() * 0.5;
    }

    // Check collision with player vehicle
    for (let i = 0; i < activeCars.length; i++) {
      const c = activeCars[i];
      const dist = Math.hypot(c.x - this.x, c.z - this.z);
      if (dist < 2.5 && Math.abs(c.speed) > 4.0) {
        // Hit by vehicle!
        this.takeDamage(100);
        break;
      } else if (dist < 8.0 && Math.abs(c.speed) > 8.0) {
        this.fleeFrom(c.x, c.z);
      }
    }

    // Animate walk cycle
    this.walkCycle += currentSpeed * dt * (this.isFleeing ? 7.0 : 4.5);
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.alive) return;

    const px = this.x;
    const py = this.y;
    const pz = this.z;
    const rot = this.rotY;

    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const toWorld = (lx, ly, lz) => {
      const wx = px + (lx * cosR + lz * sinR);
      const wy = py + ly;
      const wz = pz + (-lx * sinR + lz * cosR);
      return [wx, wy, wz];
    };

    const addBoxLocal = (lx, ly, lz, sx, sy, sz, color) => {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const corners = [
        toWorld(lx - hx, ly - hy, lz - hz),
        toWorld(lx + hx, ly - hy, lz - hz),
        toWorld(lx + hx, ly + hy, lz - hz),
        toWorld(lx - hx, ly + hy, lz - hz),
        toWorld(lx - hx, ly - hy, lz + hz),
        toWorld(lx + hx, ly - hy, lz + hz),
        toWorld(lx + hx, ly + hy, lz + hz),
        toWorld(lx - hx, ly + hy, lz + hz),
      ];

      const faces = [
        [3, 2, 6, 7, [0, 1, 0]],
        [4, 5, 1, 0, [0, -1, 0]],
        [7, 6, 5, 4, [sinR, 0, cosR]],
        [1, 2, 3, 0, [-sinR, 0, -cosR]],
        [6, 2, 1, 5, [cosR, 0, -sinR]],
        [0, 3, 7, 4, [-cosR, 0, sinR]],
      ];

      for (const face of faces) {
        const [i0, i1, i2, i3, norm] = face;
        const quadPts = [corners[i0], corners[i1], corners[i2], corners[i0], corners[i2], corners[i3]];
        for (let p = 0; p < 6; p++) {
          positions.push(quadPts[p][0], quadPts[p][1], quadPts[p][2]);
          normals.push(norm[0], norm[1], norm[2]);
          colors.push(color[0], color[1], color[2], color[3] || 1.0);
          uvs.push(0, 0);
        }
      }
    };

    const legSwing = Math.sin(this.walkCycle) * 0.42;
    const armSwing = Math.sin(this.walkCycle) * 0.42;

    // Torso
    addBoxLocal(0, 1.2, 0, 0.48, 0.58, 0.28, this.shirtCol);

    // Head
    addBoxLocal(0, 1.65, 0, 0.25, 0.28, 0.25, this.skinCol);

    // Legs
    addBoxLocal(-0.14, 0.45 + legSwing * 0.1, legSwing * 0.3, 0.18, 0.78, 0.2, this.pantsCol);
    addBoxLocal(0.14, 0.45 - legSwing * 0.1, -legSwing * 0.3, 0.18, 0.78, 0.2, this.pantsCol);

    // Arms
    if (this.isFleeing) {
      // Arms raised in panic!
      addBoxLocal(-0.30, 1.55, 0.1, 0.14, 0.55, 0.14, this.shirtCol);
      addBoxLocal(0.30, 1.55, 0.1, 0.14, 0.55, 0.14, this.shirtCol);
    } else {
      addBoxLocal(-0.30, 1.15 - armSwing * 0.1, -armSwing * 0.25, 0.14, 0.58, 0.14, this.shirtCol);
      addBoxLocal(0.30, 1.15 + armSwing * 0.1, armSwing * 0.25, 0.14, 0.58, 0.14, this.shirtCol);
    }
  }
}

export class PedestrianManager {
  constructor() {
    this.pedestrians = [];
    this.cashPickups = []; // { x, y, z, amount }
  }

  initCityPedestrians() {
    // Spawn 28 pedestrians along downtown and waterfront sidewalks
    const sidewalkPoints = [
      { x: 68, z: -45 }, { x: 72, z: -55 }, { x: 65, z: -85 },
      { x: 55, z: -70 }, { x: 80, z: -75 }, { x: 92, z: -60 },
      { x: -116, z: 25 }, { x: -116, z: 65 }, { x: -116, z: 110 },
      { x: -116, z: 155 }, { x: -116, z: -50 }, { x: -116, z: -120 },
      { x: -60, z: -100 }, { x: -50, z: -130 }, { x: -70, z: -70 },
      { x: 12, z: -40 }, { x: 12, z: 50 }, { x: 12, z: 120 },
      { x: 55, z: 30 }, { x: 55, z: 100 }, { x: 125, z: -60 },
      { x: 125, z: 50 }, { x: 140, z: 110 }, { x: 155, z: 125 },
    ];

    for (const pt of sidewalkPoints) {
      const p = new Pedestrian(pt.x + (Math.random() - 0.5) * 4, 0, pt.z + (Math.random() - 0.5) * 4, Math.random() * Math.PI * 2);
      this.pedestrians.push(p);
    }
  }

  spawn(x, y, z, rotY = 0) {
    const ped = new Pedestrian(x, y, z, rotY);
    this.pedestrians.push(ped);
    return ped;
  }

  update(dt, world, player, vehicles) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      if (ped.alive) {
        ped.update(dt, world, player, vehicles.vehicles);
        if (!ped.alive) {
          // Drop cash pickup
          this.cashPickups.push({
            x: ped.x,
            y: 0.15,
            z: ped.z,
            amount: 40 + Math.floor(Math.random() * 80),
          });
        }
      }
    }

    // Player collects cash pickups
    for (let i = this.cashPickups.length - 1; i >= 0; i--) {
      const cp = this.cashPickups[i];
      const dist = Math.hypot(player.x - cp.x, player.z - cp.z);
      if (dist < 1.8) {
        player.cash += cp.amount;
        this.cashPickups.splice(i, 1);
      }
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    for (let i = 0; i < this.pedestrians.length; i++) {
      this.pedestrians[i].buildMesh(positions, normals, colors, uvs);
    }

    // Render green cash pickups
    const cashGreen = [0.15, 0.85, 0.25, 1.0];
    for (let i = 0; i < this.cashPickups.length; i++) {
      const cp = this.cashPickups[i];
      const hx = 0.35, hz = 0.2, hy = 0.08;
      // Simple glowing money stack
      const pts = [
        [cp.x - hx, cp.y + hy, cp.z - hz],
        [cp.x + hx, cp.y + hy, cp.z - hz],
        [cp.x + hx, cp.y + hy, cp.z + hz],
        [cp.x - hx, cp.y + hy, cp.z - hz],
        [cp.x + hx, cp.y + hy, cp.z + hz],
        [cp.x - hx, cp.y + hy, cp.z + hz],
      ];
      for (let p = 0; p < 6; p++) {
        positions.push(pts[p][0], pts[p][1], pts[p][2]);
        normals.push(0, 1, 0);
        colors.push(cashGreen[0], cashGreen[1], cashGreen[2], 1.0);
        uvs.push(0, 0);
      }
    }
  }
}
