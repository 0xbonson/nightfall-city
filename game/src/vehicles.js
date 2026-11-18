/**
 * Nightfall City: Vela Bay - Vehicle Physics & Autonomous Traffic System
 * 6 detailed vehicle classes (sports, muscle, police, sedan, taxi, truck),
 * arcade drifting mechanics with handbrake slide, tire smoke, traffic AI, and police sirens.
 * Authored for make.fun GTA 6 bounty challenge.
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
    this.isTaxi = this.spec.isTaxi || false;
    this.sirenActive = this.isPolice;
    this.sirenTimer = 0;
    this.isDrifting = false;
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

    // Engine RPM & Gear Simulation
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

    // Siren strobe timing
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

    // Speed-dependent steering ratio
    const steerLimit = spec.steerAngle * clamp(1.0 - (Math.abs(this.speed) / spec.maxSpeed) * 0.55, 0.45, 1.0);
    const targetSteer = steerInput * steerLimit;
    this.steer = lerp(this.steer, targetSteer, dt * spec.steerSpeed);

    // Acceleration & Braking
    if (throttle > 0) {
      if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + spec.brake * dt);
      } else {
        this.speed = Math.min(spec.maxSpeed, this.speed + spec.accel * dt);
      }
    } else if (throttle < 0) {
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - spec.brake * dt);
      } else {
        this.speed = Math.max(-spec.reverseSpeed, this.speed - spec.accel * 0.5 * dt);
      }
    } else {
      // Natural rolling drag
      this.speed *= Math.pow(0.96, dt * 60);
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    // Handbrake Drifting
    if (handbrake && Math.abs(this.speed) > 10.0) {
      this.isDrifting = true;
      this.speed *= Math.pow(0.94, dt * 60);
      // Extra yaw rotation when sliding
      this.rotY += this.steer * dt * 3.8 * Math.sign(this.speed);
    } else {
      this.isDrifting = false;
      this.rotY += (this.speed / spec.length) * Math.tan(this.steer) * dt;
    }

    this.rotY = normalizeAngle(this.rotY);

    // Body roll into turns
    const lateralG = (this.speed * this.speed * Math.sin(this.steer)) / spec.length;
    this.bodyRoll = lerp(this.bodyRoll, clamp(-lateralG * 0.04, -0.15, 0.15), dt * 8.0);

    // Apply forward motion
    const prevX = this.x;
    const prevZ = this.z;

    this.vx = Math.sin(this.rotY) * this.speed;
    this.vz = Math.cos(this.rotY) * this.speed;

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Check collision with city buildings
    const col = world.checkCollision(this.x, this.z, spec.width * 0.6);
    if (col.collided) {
      this.x = prevX + col.pushX;
      this.z = prevZ + col.pushZ;
      this.speed *= -0.3; // Rebound bounce
    }

    // Inter-car collision
    for (let i = 0; i < otherCars.length; i++) {
      const other = otherCars[i];
      if (other === this) continue;
      const d = Math.hypot(this.x - other.x, this.z - other.z);
      const minD = (spec.length + other.spec.length) * 0.42;
      if (d < minD && d > 0.001) {
        const overlap = minD - d;
        const nx = (this.x - other.x) / d;
        const nz = (this.z - other.z) / d;
        this.x += nx * overlap * 0.6;
        this.z += nz * overlap * 0.6;
        this.speed *= 0.7;
        other.speed *= 0.7;
      }
    }
  }

  updateAIPhysics(dt, world, otherCars) {
    const spec = this.spec;
    const cruiseSpeed = this.isPolice ? spec.maxSpeed * 0.95 : 14.0;

    // Target lane navigation
    if (!this.targetNode || Math.hypot(this.x - this.targetNode.x, this.z - this.targetNode.z) < 12.0) {
      this.pickNextAINode(world);
    }

    if (this.targetNode) {
      const dx = this.targetNode.x - this.x;
      const dz = this.targetNode.z - this.z;
      const desiredAngle = Math.atan2(dx, dz);
      let angleDiff = normalizeAngle(desiredAngle - this.rotY);

      this.steer = clamp(angleDiff * 1.5, -spec.steerAngle, spec.steerAngle);
      this.rotY += this.steer * dt * 2.5;
      this.rotY = normalizeAngle(this.rotY);
    }

    // Accelerate towards cruising speed
    this.speed = lerp(this.speed, cruiseSpeed, dt * 1.5);

    // Check car ahead to prevent rear-ending
    for (let i = 0; i < otherCars.length; i++) {
      const other = otherCars[i];
      if (other === this) continue;
      const d = Math.hypot(this.x - other.x, this.z - other.z);
      if (d < 16.0) {
        // Dot product to test if car is ahead
        const fwdX = Math.sin(this.rotY);
        const fwdZ = Math.cos(this.rotY);
        const toOtherX = (other.x - this.x) / d;
        const toOtherZ = (other.z - this.z) / d;
        if (fwdX * toOtherX + fwdZ * toOtherZ > 0.7) {
          // Slow down
          this.speed = Math.max(0, other.speed - 2.0);
        }
      }
    }

    this.vx = Math.sin(this.rotY) * this.speed;
    this.vz = Math.cos(this.rotY) * this.speed;

    this.x += this.vx * dt;
    this.z += this.vz * dt;
  }

  pickNextAINode(world) {
    if (!world.roadNodes || world.roadNodes.length === 0) return;
    const candidates = world.roadNodes.filter((n) => {
      const d = Math.hypot(this.x - n.x, this.z - n.z);
      return d > 20 && d < 120;
    });
    if (candidates.length > 0) {
      this.targetNode = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const rot = this.rotY;
    const spec = this.spec;

    const sinRot = Math.sin(rot);
    const cosRot = Math.cos(rot);

    const bodyCol = spec.color;
    const roofCol = spec.roofColor || spec.color;
    const glassCol = [0.15, 0.22, 0.32, 0.95];
    const tireCol = [0.12, 0.12, 0.14, 1.0];
    const wheelChrome = [0.85, 0.88, 0.92, 1.0];

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
        [7, 6, 2, 3, [sinRot, 0, cosRot]], // Front (+Z)
        [5, 4, 0, 1, [-sinRot, 0, -cosRot]], // Back (-Z)
        [6, 5, 1, 2, [cosRot, 0, -sinRot]],  // Right (+X)
        [4, 7, 3, 0, [-cosRot, 0, sinRot]], // Left (-X)
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

    // 1. Lower Chassis
    addBoxRot(0, y + 0.22, 0, spec.width, spec.height * 0.45, spec.length, bodyCol);

    // 2. Cabin & Windows
    const cabinLen = spec.length * 0.52;
    const cabinW = spec.width * 0.88;
    const cabinH = spec.height * 0.55;
    addBoxRot(0, y + 0.22 + spec.height * 0.45, -spec.length * 0.08, cabinW, cabinH, cabinLen, roofCol);

    // Windshield & Rear glass
    addBoxRot(0, y + 0.22 + spec.height * 0.48, spec.length * 0.16, cabinW * 0.94, cabinH * 0.88, 0.25, glassCol);
    addBoxRot(0, y + 0.22 + spec.height * 0.48, -spec.length * 0.32, cabinW * 0.94, cabinH * 0.88, 0.25, glassCol);

    // 3. Wheels & Rims
    const wR = 0.38;
    const wW = 0.32;
    const wheelY = y + wR * 0.5;
    const fWheelZ = spec.length * 0.32;
    const rWheelZ = -spec.length * 0.32;
    const wheelX = spec.width * 0.5 - 0.05;

    addBoxRot(-wheelX, wheelY, fWheelZ, wW, wR * 2, wR * 2, tireCol);
    addBoxRot(wheelX, wheelY, fWheelZ, wW, wR * 2, wR * 2, tireCol);
    addBoxRot(-wheelX, wheelY, rWheelZ, wW, wR * 2, wR * 2, tireCol);
    addBoxRot(wheelX, wheelY, rWheelZ, wW, wR * 2, wR * 2, tireCol);

    // Shiny alloy hubcaps
    addBoxRot(-wheelX - 0.02, wheelY, fWheelZ, 0.05, wR, wR, wheelChrome);
    addBoxRot(wheelX + 0.02, wheelY, fWheelZ, 0.05, wR, wR, wheelChrome);
    addBoxRot(-wheelX - 0.02, wheelY, rWheelZ, 0.05, wR, wR, wheelChrome);
    addBoxRot(wheelX + 0.02, wheelY, rWheelZ, 0.05, wR, wR, wheelChrome);

    // 4. Headlights (Bright Xenon Gold/White)
    const hlCol = [1.2, 1.15, 0.9, 1.0];
    const tlCol = [1.2, 0.15, 0.1, 1.0];
    const fZ = spec.length * 0.5 + 0.02;
    const bZ = -spec.length * 0.5 - 0.02;
    const hlW = 0.35, hlH = 0.18;

    addBoxRot(-spec.width * 0.35, y + 0.45, fZ, hlW, hlH, 0.06, hlCol);
    addBoxRot(spec.width * 0.35, y + 0.45, fZ, hlW, hlH, 0.06, hlCol);

    // Taillights
    addBoxRot(-spec.width * 0.35, y + 0.55, bZ, hlW, hlH, 0.06, tlCol);
    addBoxRot(spec.width * 0.35, y + 0.55, bZ, hlW, hlH, 0.06, tlCol);

    // 5. Special vehicle accoutrements
    if (spec.hasSpoiler) {
      const spY = y + 0.22 + spec.height * 0.55;
      const spZ = -spec.length * 0.44;
      addBoxRot(-spec.width * 0.35, spY, spZ, 0.08, 0.32, 0.18, [0.1, 0.1, 0.1, 1.0]);
      addBoxRot(spec.width * 0.35, spY, spZ, 0.08, 0.32, 0.18, [0.1, 0.1, 0.1, 1.0]);
      addBoxRot(0, spY + 0.32, spZ, spec.width * 0.95, 0.06, 0.45, bodyCol);
    }

    if (spec.hasHoodScoop) {
      addBoxRot(0, y + 0.22 + spec.height * 0.45, spec.length * 0.22, 0.65, 0.15, 0.85, [0.1, 0.1, 0.1, 1.0]);
    }

    if (this.isTaxi) {
      // Illuminated yellow taxi roof sign
      const signY = y + 0.22 + spec.height;
      addBoxRot(0, signY, -spec.length * 0.08, 0.75, 0.22, 0.35, [1.0, 0.95, 0.2, 1.0]);
    }

    if (this.isPolice) {
      // Heavy Push-bar on front bumper
      addBoxRot(0, y + 0.38, fZ + 0.12, spec.width * 0.65, 0.45, 0.15, [0.15, 0.15, 0.15, 1.0]);

      // Roof Emergency Flasher Lightbar (Red and Blue LEDs)
      const barY = y + 0.22 + spec.height + 0.05;
      const barZ = -spec.length * 0.08;

      const flashPhase = Math.sin(this.sirenTimer * 2.0);
      const redLED = flashPhase > 0 ? [1.5, 0.1, 0.1, 1.0] : [0.35, 0.02, 0.02, 1.0];
      const blueLED = flashPhase <= 0 ? [0.1, 0.4, 1.5, 1.0] : [0.02, 0.05, 0.35, 1.0];

      addBoxRot(-0.45, barY, barZ, 0.42, 0.14, 0.30, redLED);
      addBoxRot(0.45, barY, barZ, 0.42, 0.14, 0.30, blueLED);
      addBoxRot(0, barY, barZ, 0.22, 0.12, 0.25, [0.9, 0.9, 0.9, 1.0]);
    }
  }
}

export class VehicleManager {
  constructor() {
    this.vehicles = [];
  }

  initCityTraffic(world) {
    const lanes = [
      { x: 125.5, zStart: -240, zEnd: 240, rot: Math.PI, types: ['sedan', 'taxi', 'sports'] },
      { x: 136.5, zStart: 240, zEnd: -240, rot: 0, types: ['muscle', 'sedan', 'truck'] },
      { x: -102.0, zStart: -240, zEnd: 240, rot: Math.PI, types: ['sports', 'taxi'] },
      { x: -108.0, zStart: 240, zEnd: -240, rot: 0, types: ['sedan', 'muscle'] },
      { x: 45.0, zStart: -180, zEnd: 180, rot: Math.PI, types: ['sports', 'police'] },
    ];

    let vCount = 0;
    for (const lane of lanes) {
      for (let z = lane.zStart; Math.abs(z - lane.zEnd) > 40; z += (lane.zEnd > lane.zStart ? 55 : -55)) {
        if (vCount++ > 18) break;
        const type = lane.types[Math.floor(Math.random() * lane.types.length)];
        const car = this.spawn(type, lane.x, 0, z, lane.rot);
        car.speed = 12.0 + Math.random() * 8.0;
      }
    }
  }

  spawn(type, x, y, z, rot = 0) {
    const v = new Vehicle(type, x, y, z, rot);
    this.vehicles.push(v);
    return v;
  }

  findNearest(x, z, maxDist = 4.0) {
    let best = null;
    let minDist = maxDist;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isPlayerControlled) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < minDist) {
        minDist = d;
        best = v;
      }
    }
    return best;
  }

  getPoliceSirens() {
    // Locate up to 2 active cruisers to send dynamic light to shaders
    const activePolice = this.vehicles.filter((v) => v.isPolice && v.sirenActive);
    if (activePolice.length === 0) return null;

    const p1 = activePolice[0];
    const s1Col = [1.6, 0.2, 0.2]; // High-intensity pursuit strobe red

    let s2Pos = [0, -100, 0];
    let s2Col = [0, 0, 0];
    if (activePolice.length > 1) {
      const p2 = activePolice[1];
      s2Pos = [p2.x, p2.y + 1.8, p2.z];
      s2Col = [0.2, 0.5, 1.8]; // High-intensity pursuit strobe blue
    }

    return {
      s1Pos: [p1.x, p1.y + 1.8, p1.z],
      s1Col,
      s2Pos,
      s2Col,
    };
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
}
