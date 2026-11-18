/**
 * Nightfall City: Vela Bay - Vehicle Physics & Autonomous Traffic
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { CAR_TYPES, WORLD } from './config.js';
import { clamp, normalizeAngle, lerp } from './math.js';

export class Vehicle {
  constructor(typeId = 'sports', x = 0, y = 0, z = 0, rotY = 0) {
    this.typeId = typeId;
    this.spec = CAR_TYPES[typeId] || CAR_TYPES.sports;

    this.x = x;
    this.y = y;
    this.z = z;
    this.rotY = rotY;

    this.vx = 0;
    this.vz = 0;
    this.speed = 0; // Forward speed in m/s (1 m/s ~= 2.24 mph)
    this.steer = 0; // Current steer angle in radians

    this.engineRPM = 1200;
    this.gear = 1;
    this.health = 100;
    this.isPlayerControlled = false;
    this.driver = null;

    // Visuals & sirens
    this.isPolice = this.spec.isPolice || false;
    this.sirenActive = this.isPolice;
    this.sirenTimer = 0;
    this.tireSmokeActive = false;
    this.bodyRoll = 0;
    this.bodyPitch = 0;

    // AI navigation properties
    this.targetNode = null;
    this.aiWaitTimer = 0;
  }

  getSpeedMph() {
    return Math.abs(Math.round(this.speed * 2.237));
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  update(dt, input, world, otherCars) {
    if (this.isPlayerControlled && input) {
      this.updatePlayerPhysics(dt, input, world, otherCars);
    } else {
      this.updateAIPhysics(dt, world, otherCars);
    }

    // Engine RPM & Gear Simulation for dynamic audio
    const absSpeed = Math.abs(this.speed);
    if (absSpeed < 8) {
      this.gear = 1;
      this.engineRPM = 1000 + (absSpeed / 8) * 4500;
    } else if (absSpeed < 18) {
      this.gear = 2;
      this.engineRPM = 2200 + ((absSpeed - 8) / 10) * 4200;
    } else if (absSpeed < 30) {
      this.gear = 3;
      this.engineRPM = 2800 + ((absSpeed - 18) / 12) * 4400;
    } else {
      this.gear = 4;
      this.engineRPM = 3200 + ((absSpeed - 30) / 15) * 4300;
    }

    // Siren strobe animation
    if (this.sirenActive) {
      this.sirenTimer += dt * 8.0;
    }
  }

  updatePlayerPhysics(dt, input, world, otherCars) {
    const spec = this.spec;

    let throttle = 0;
    let steerInput = 0;
    const handbrake = input.isDown('Space');

    if (input.isDown('KeyW') || input.isDown('ArrowUp')) throttle += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) throttle -= 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steerInput += 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steerInput -= 1;

    // Speed-sensitive steering (tighter at low speeds, stable at high speeds)
    const steerLimit = spec.steerAngle * clamp(1.0 - (Math.abs(this.speed) / spec.maxSpeed) * 0.55, 0.45, 1.0);
    const targetSteer = steerInput * steerLimit;
    this.steer = lerp(this.steer, targetSteer, dt * spec.steerSpeed);

    // Acceleration & Braking
    if (throttle > 0) {
      if (this.speed < 0) {
        // Braking while reversing
        this.speed += spec.brake * dt;
      } else {
        // Accelerate forward
        this.speed = Math.min(spec.maxSpeed, this.speed + spec.accel * dt);
      }
      this.bodyPitch = lerp(this.bodyPitch, -0.05, dt * 6.0); // Squat
    } else if (throttle < 0) {
      if (this.speed > 0.5) {
        // Foot brake
        this.speed = Math.max(0, this.speed - spec.brake * dt);
        this.bodyPitch = lerp(this.bodyPitch, 0.08, dt * 8.0); // Dive
      } else {
        // Reverse
        this.speed = Math.max(-spec.reverseSpeed, this.speed - spec.accel * 0.6 * dt);
      }
    } else {
      // Natural rolling resistance drag
      const drag = 12.0;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - drag * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + drag * dt);
      this.bodyPitch = lerp(this.bodyPitch, 0, dt * 5.0);
    }

    // Handbrake drift mechanics
    this.tireSmokeActive = false;
    if (handbrake && Math.abs(this.speed) > 10.0) {
      this.speed *= (1.0 - dt * 0.35); // Slow down gradually
      this.rotY += this.steer * dt * 2.8 * Math.sign(this.speed);
      this.tireSmokeActive = true;
      this.bodyRoll = lerp(this.bodyRoll, -this.steer * 0.18, dt * 8.0);
    } else {
      // Normal turning yaw rate
      if (Math.abs(this.speed) > 0.1) {
        const turnRadius = (this.speed / spec.length) * Math.tan(this.steer);
        this.rotY += turnRadius * dt;
        this.bodyRoll = lerp(this.bodyRoll, -this.steer * (Math.abs(this.speed) / spec.maxSpeed) * 0.14, dt * 6.0);
      } else {
        this.bodyRoll = lerp(this.bodyRoll, 0, dt * 6.0);
      }
    }

    // Velocity vector based on heading
    this.vx = Math.sin(this.rotY) * this.speed;
    this.vz = Math.cos(this.rotY) * this.speed;

    // Movement & Collision detection
    this.moveAndCollide(dt, world, otherCars);
  }

  updateAIPhysics(dt, world, otherCars) {
    const spec = this.spec;

    // Autonomous navigation along streets
    const cruiseSpeed = this.isPolice ? spec.maxSpeed * 0.85 : 16.0;

    // Forward raycast to check for vehicles ahead
    let obstacleAhead = false;
    const checkDist = 12.0;
    const forwardX = Math.sin(this.rotY);
    const forwardZ = Math.cos(this.rotY);

    for (let i = 0; i < otherCars.length; i++) {
      const oc = otherCars[i];
      if (oc === this) continue;
      const dx = oc.x - this.x;
      const dz = oc.z - this.z;
      const dist = Math.hypot(dx, dz);
      if (dist < checkDist) {
        // Dot product to see if obstacle is ahead
        const dot = (dx * forwardX + dz * forwardZ) / dist;
        if (dot > 0.6) {
          obstacleAhead = true;
          break;
        }
      }
    }

    if (obstacleAhead) {
      // Brake
      this.speed = Math.max(0, this.speed - spec.brake * dt);
    } else {
      // Cruise forward
      this.speed = Math.min(cruiseSpeed, this.speed + spec.accel * 0.6 * dt);
    }

    this.vx = Math.sin(this.rotY) * this.speed;
    this.vz = Math.cos(this.rotY) * this.speed;

    this.moveAndCollide(dt, world, otherCars);
  }

  moveAndCollide(dt, world, otherCars) {
    const prevX = this.x;
    const prevZ = this.z;

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Building collision
    const col = world.checkCollision(this.x, this.z, this.spec.width * 0.55);
    if (col.collided) {
      this.x = prevX + col.pushX;
      this.z = prevZ + col.pushZ;
      this.speed *= -0.3; // Rebound
      this.takeDamage(12);
    }

    // World border wrap / bounce
    const limit = WORLD.HALF_SIZE - 4;
    if (this.x > limit || this.x < WORLD.COAST_X - 10) {
      this.x = clamp(this.x, WORLD.COAST_X - 8, limit);
      this.speed *= -0.5;
    }
    if (this.z > limit || this.z < -limit) {
      this.z = clamp(this.z, -limit, limit);
      this.speed *= -0.5;
    }
  }

  // --- Procedural 3D Car Geometry ---
  buildMesh(positions, normals, colors, uvs) {
    const px = this.x;
    const py = this.y;
    const pz = this.z;
    const rot = this.rotY;

    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const toWorld = (lx, ly, lz) => {
      // Apply body roll & pitch
      const rollX = lx * Math.cos(this.bodyRoll) - ly * Math.sin(this.bodyRoll);
      const rollY = lx * Math.sin(this.bodyRoll) + ly * Math.cos(this.bodyRoll);
      const pitchY = rollY * Math.cos(this.bodyPitch) - lz * Math.sin(this.bodyPitch);
      const pitchZ = rollY * Math.sin(this.bodyPitch) + lz * Math.cos(this.bodyPitch);

      const wx = px + (rollX * cosR + pitchZ * sinR);
      const wy = py + pitchY;
      const wz = pz + (-rollX * sinR + pitchZ * cosR);
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

    const spec = this.spec;
    const carColor = spec.color;
    const roofColor = spec.roofColor || carColor;
    const glassColor = [0.12, 0.16, 0.22, 0.9];
    const wheelColor = [0.15, 0.15, 0.16, 1.0];
    const headlightCol = [1.0, 0.96, 0.82, 1.0];
    const taillightCol = [0.95, 0.15, 0.10, 1.0];

    const w = spec.width;
    const l = spec.length;
    const h = spec.height;

    // 1. Lower chassis / body
    addBoxLocal(0, 0.45, 0, w, 0.55, l, carColor);

    // 2. Cabin / Greenhouse
    const cabinL = l * 0.52;
    const cabinW = w * 0.86;
    const cabinH = h * 0.55;
    addBoxLocal(0, 0.45 + cabinH * 0.5 + 0.25, -l * 0.08, cabinW, cabinH, cabinL, roofColor);

    // 3. Tinted windshield & windows
    addBoxLocal(0, 0.45 + cabinH * 0.5 + 0.25, -l * 0.08 + cabinL * 0.5 + 0.05, cabinW - 0.1, cabinH * 0.85, 0.12, glassColor);
    addBoxLocal(0, 0.45 + cabinH * 0.5 + 0.25, -l * 0.08 - cabinL * 0.5 - 0.05, cabinW - 0.1, cabinH * 0.85, 0.12, glassColor);

    // 4. Headlights (+Z front)
    addBoxLocal(-w * 0.36, 0.48, l * 0.5 + 0.05, 0.45, 0.24, 0.1, headlightCol);
    addBoxLocal(w * 0.36, 0.48, l * 0.5 + 0.05, 0.45, 0.24, 0.1, headlightCol);

    // 5. Taillights (-Z rear)
    addBoxLocal(-w * 0.36, 0.52, -l * 0.5 - 0.05, 0.48, 0.22, 0.1, taillightCol);
    addBoxLocal(w * 0.36, 0.52, -l * 0.5 - 0.05, 0.48, 0.22, 0.1, taillightCol);

    // 6. Wheels (4 corners)
    const wheelR = 0.38;
    const wheelW = 0.32;
    const frontZ = l * 0.34;
    const rearZ = -l * 0.34;
    const sideX = w * 0.5 + 0.02;

    addBoxLocal(-sideX, wheelR, frontZ, wheelW, wheelR * 2, wheelR * 2, wheelColor);
    addBoxLocal(sideX, wheelR, frontZ, wheelW, wheelR * 2, wheelR * 2, wheelColor);
    addBoxLocal(-sideX, wheelR, rearZ, wheelW, wheelR * 2, wheelR * 2, wheelColor);
    addBoxLocal(sideX, wheelR, rearZ, wheelW, wheelR * 2, wheelR * 2, wheelColor);

    // 7. Police Strobe Lightbar
    if (spec.hasLightbar) {
      const barY = 0.45 + cabinH + 0.32;
      addBoxLocal(0, barY, -l * 0.08, w * 0.68, 0.16, 0.38, [0.15, 0.15, 0.15, 1.0]);

      // Alternating flash
      const isRed = Math.sin(this.sirenTimer) > 0;
      const redLight = isRed ? [1.0, 0.05, 0.05, 1.0] : [0.3, 0.02, 0.02, 1.0];
      const blueLight = !isRed ? [0.05, 0.35, 1.0, 1.0] : [0.02, 0.08, 0.3, 1.0];

      addBoxLocal(-w * 0.22, barY + 0.08, -l * 0.08, 0.24, 0.12, 0.32, redLight);
      addBoxLocal(w * 0.22, barY + 0.08, -l * 0.08, 0.24, 0.12, 0.32, blueLight);
    }

    // 8. Sports car GT wing / spoiler
    if (spec.hasSpoiler) {
      const wingY = 0.45 + cabinH * 0.65;
      const wingZ = -l * 0.48;
      addBoxLocal(-w * 0.35, wingY - 0.15, wingZ, 0.08, 0.35, 0.18, carColor);
      addBoxLocal(w * 0.35, wingY - 0.15, wingZ, 0.08, 0.35, 0.18, carColor);
      addBoxLocal(0, wingY + 0.05, wingZ, w * 0.92, 0.08, 0.42, carColor);
    }

    // 9. Taxi roof sign
    if (spec.hasTaxiSign) {
      const signY = 0.45 + cabinH + 0.34;
      addBoxLocal(0, signY, -l * 0.08, 0.75, 0.22, 0.35, [1.0, 0.95, 0.82, 1.0]);
    }
  }
}

export class VehicleManager {
  constructor() {
    this.vehicles = [];
  }

  spawn(typeId, x, y, z, rotY = 0) {
    const v = new Vehicle(typeId, x, y, z, rotY);
    this.vehicles.push(v);
    return v;
  }

  initCityTraffic(world) {
    // Populate the city grid with active traffic cars
    const types = ['sports', 'muscle', 'sedan', 'taxi', 'truck'];

    // Spawn 16 cars at various road coordinates
    const spawnPoints = [
      { x: -105, z: 20, rot: 0, type: 'sports' },
      { x: -105, z: 120, rot: 0, type: 'sedan' },
      { x: -105, z: -80, rot: Math.PI, type: 'muscle' },
      { x: 0, z: -140, rot: 0, type: 'taxi' },
      { x: 0, z: 60, rot: Math.PI, type: 'sedan' },
      { x: 45, z: -60, rot: 0, type: 'police' },
      { x: 45, z: 80, rot: Math.PI, type: 'sports' },
      { x: 115, z: -110, rot: 0, type: 'sedan' },
      { x: 115, z: 40, rot: Math.PI, type: 'taxi' },
      { x: 185, z: 120, rot: 0, type: 'truck' },
      { x: 185, z: -50, rot: Math.PI, type: 'sedan' },
      { x: 68, z: -68, rot: 0, type: 'sports' }, // Near player starting point
    ];

    for (const sp of spawnPoints) {
      this.spawn(sp.type, sp.x, 0, sp.z, sp.rot);
    }
  }

  findNearest(x, z, maxDist) {
    let nearest = null;
    let minDist = maxDist;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isPlayerControlled) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = v;
      }
    }
    return nearest;
  }

  update(dt, input, world) {
    for (let i = 0; i < this.vehicles.length; i++) {
      this.vehicles[i].update(dt, input, world, this.vehicles);
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    for (let i = 0; i < this.vehicles.length; i++) {
      this.vehicles[i].buildMesh(positions, normals, colors, uvs);
    }
  }

  getPoliceSirens() {
    // Find active police cruisers for dynamic emergency lighting
    let s1 = null, s2 = null;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isPolice && v.sirenActive) {
        if (!s1) s1 = v;
        else if (!s2) { s2 = v; break; }
      }
    }

    const res = {
      s1Pos: [0, -100, 0],
      s1Col: [0, 0, 0],
      s2Pos: [0, -100, 0],
      s2Col: [0, 0, 0],
    };

    if (s1) {
      res.s1Pos = [s1.x, s1.y + 1.8, s1.z];
      const isRed = Math.sin(s1.sirenTimer) > 0;
      res.s1Col = isRed ? [1.2, 0.1, 0.1] : [0.1, 0.4, 1.4];
    }
    if (s2) {
      res.s2Pos = [s2.x, s2.y + 1.8, s2.z];
      const isRed = Math.sin(s2.sirenTimer + Math.PI) > 0;
      res.s2Col = isRed ? [1.2, 0.1, 0.1] : [0.1, 0.4, 1.4];
    }
    return res;
  }
}
