/**
 * Nightfall City: Vela Bay - Vehicle Physics & Autonomous Traffic System
 * Authored by makefun agent for the open-world crime game entry.
 * Sun-Soaked Vela Bay Edition - 7 vehicle chassis classes & drift physics.
 *
 * Implements:
 * - 7 distinct vehicle chassis classes:
 *   1. Veloce GT (sleek sports coupe with rear wing & side scoops)
 *   2. Stallion 428 (aggressive classic muscle with hood induction scoop)
 *   3. Metro Interceptor (high-contrast black/white police cruiser with push-bar & strobe lightbar)
 *   4. Meridian Executive (premium executive 4-door luxury sedan)
 *   5. Cobra City Cab (yellow taxi with checkerboard livery & illuminated rooftop sign)
 *   6. Piccolo Sport (agile European 3-door hot hatchback)
 *   7. Meridian Hauler (industrial box truck/van with cargo bay)
 * - Directional ground shadows cast under chassis along the low sun vector
 * - True vehicle anatomy: bonnet, cabin, roof, boot, dark glass with pillar frames,
 *   headlights, ruby taillights, side mirrors, wheels with rubber tires and alloy rims
 * - Arcade drift physics with handbrake slide, counter-steering yaw, body roll, and tire screech
 * - Engine RPM & 4-speed transmission gearbox simulation
 * - Autonomous civilian traffic AI with node navigation and collision avoidance
 * - Dual-tone police sirens casting dynamic red/blue lighting on city geometry
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
    this.speed = 0; // Forward speed in m/s (1 m/s ~= 2.237 mph)
    this.steer = 0; // Steer angle in radians

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
    this.headlightsOn = true;

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

  honkHorn(audio, pedestrians) {
    if (audio) audio.playHorn();
    if (pedestrians) pedestrians.notifyHorn(this.x, this.z, 22.0);
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

    // Collision avoidance with other traffic
    for (let i = 0; i < otherCars.length; i++) {
      const other = otherCars[i];
      if (other === this) continue;
      const d = Math.hypot(this.x - other.x, this.z - other.z);
      if (d < 16.0) {
        const fwdX = Math.sin(this.rotY);
        const fwdZ = Math.cos(this.rotY);
        const toOtherX = other.x - this.x;
        const toOtherZ = other.z - this.z;
        const dot = fwdX * toOtherX + fwdZ * toOtherZ;
        if (dot > 0) {
          this.speed = Math.max(0, this.speed - spec.brake * dt * 1.8);
          break;
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
    const candidates = world.roadNodes.filter((n) => Math.hypot(n.x - this.x, n.z - this.z) > 15.0);
    if (candidates.length > 0) {
      this.targetNode = candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    const spec = this.spec;
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const rot = this.rotY;

    const sinRot = Math.sin(rot);
    const cosRot = Math.cos(rot);

    const bodyCol = spec.color;
    const roofCol = spec.roofColor || [0.15, 0.15, 0.18, 1.0];
    const glassCol = [0.10, 0.18, 0.26, 1.0]; // Dark tinted automotive glass
    const tireCol = [0.12, 0.12, 0.13, 1.0];  // Deep black rubber tire
    const rimCol = [0.85, 0.88, 0.92, 1.0];   // Polished alloy rim
    const hubCol = [0.22, 0.24, 0.28, 1.0];   // Wheel center hub
    const headlightCol = [1.5, 1.45, 1.15, 1.0]; // Warm Xenon headlight beam
    const taillightCol = [1.2, 0.15, 0.10, 1.0]; // Glowing ruby taillight
    const chromeCol = [0.85, 0.88, 0.92, 1.0];

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

    const w = spec.width;
    const l = spec.length;
    const h = spec.height;

    // 0. Directional ground shadow cast along the sun vector (+X, +Z)
    const shW = w * 0.58;
    const shL = l * 0.55;
    const shOffX = 0.65;
    const shOffZ = 0.90;
    const shY = y + 0.015;

    const shQuad = [
      [-shW, 0, -shL], [shW, 0, -shL], [shW, 0, shL],
      [-shW, 0, -shL], [shW, 0, shL], [-shW, 0, shL],
    ];
    const shadowTint = [0.03, 0.05, 0.08, 0.45];
    for (const [lx, , lz] of shQuad) {
      const wx = x + shOffX + lx * cosRot + lz * sinRot;
      const wz = z + shOffZ - lx * sinRot + lz * cosRot;
      positions.push(wx, shY, wz);
      normals.push(0, 1, 0);
      colors.push(shadowTint[0], shadowTint[1], shadowTint[2], shadowTint[3]);
      uvs.push(0, 0);
    }

    // 1. Lower Chassis & Aerodynamic Sills
    addBoxRot(0, y + 0.18, 0, w, h * 0.38, l, bodyCol);

    // Front Bumper & Air Dam
    addBoxRot(0, y + 0.14, l * 0.48, w * 0.96, h * 0.24, 0.28, [0.12, 0.12, 0.14, 1.0]);
    // Rear Diffuser & Bumper
    addBoxRot(0, y + 0.16, -l * 0.48, w * 0.96, h * 0.24, 0.28, [0.12, 0.12, 0.14, 1.0]);

    // 2. Bonnet / Hood & Boot / Trunk
    const bonnetL = l * 0.32;
    const bonnetZ = l * 0.28;
    addBoxRot(0, y + 0.18 + h * 0.32, bonnetZ, w * 0.92, 0.10, bonnetL, bodyCol);

    const bootL = l * 0.22;
    const bootZ = -l * 0.34;
    addBoxRot(0, y + 0.18 + h * 0.30, bootZ, w * 0.90, 0.10, bootL, bodyCol);

    // 3. Cabin & Greenhouse Architecture
    const cabinL = l * 0.46;
    const cabinW = w * 0.86;
    const cabinH = h * 0.48;
    const cabinZ = -l * 0.05;

    // Roof Top
    addBoxRot(0, y + 0.18 + h * 0.36 + cabinH - 0.08, cabinZ, cabinW * 0.92, 0.08, cabinL * 0.82, roofCol);

    // Windshield (Front rake)
    addBoxRot(0, y + 0.18 + h * 0.36 + cabinH * 0.48, cabinZ + cabinL * 0.46, cabinW * 0.90, cabinH * 0.84, 0.18, glassCol);
    // Rear Window
    addBoxRot(0, y + 0.18 + h * 0.36 + cabinH * 0.48, cabinZ - cabinL * 0.46, cabinW * 0.90, cabinH * 0.84, 0.18, glassCol);
    // Side Windows (Left & Right)
    addBoxRot(-cabinW * 0.48, y + 0.18 + h * 0.36 + cabinH * 0.48, cabinZ, 0.08, cabinH * 0.80, cabinL * 0.85, glassCol);
    addBoxRot(cabinW * 0.48, y + 0.18 + h * 0.36 + cabinH * 0.48, cabinZ, 0.08, cabinH * 0.80, cabinL * 0.85, glassCol);

    // A/B/C Pillars
    addBoxRot(-cabinW * 0.49, y + 0.18 + h * 0.36, cabinZ, 0.09, cabinH, 0.14, bodyCol);
    addBoxRot(cabinW * 0.49, y + 0.18 + h * 0.36, cabinZ, 0.09, cabinH, 0.14, bodyCol);

    // Side-view mirrors
    addBoxRot(-w * 0.52, y + 0.18 + h * 0.44, cabinZ + cabinL * 0.38, 0.18, 0.10, 0.12, bodyCol);
    addBoxRot(w * 0.52, y + 0.18 + h * 0.44, cabinZ + cabinL * 0.38, 0.18, 0.10, 0.12, bodyCol);

    // 4. Wheels & Multi-Spoke Alloy Rims (4 corners)
    const wheelR = 0.38;
    const wheelW = 0.30;
    const axleZ = l * 0.31;
    const axleX = w * 0.5 - 0.05;

    const wheels = [
      [-axleX, y + wheelR, axleZ],
      [axleX, y + wheelR, axleZ],
      [-axleX, y + wheelR, -axleZ],
      [axleX, y + wheelR, -axleZ],
    ];

    for (const [wx, wy, wz] of wheels) {
      // Rubber tire
      addBoxRot(wx, wy - wheelR, wz, wheelW, wheelR * 2, wheelR * 2, tireCol);
      // Alloy rim face
      addBoxRot(wx + (wx > 0 ? 0.08 : -0.08), wy - wheelR * 0.65, wz, 0.08, wheelR * 1.3, wheelR * 1.3, rimCol);
      // Center hub
      addBoxRot(wx + (wx > 0 ? 0.10 : -0.10), wy - wheelR * 0.25, wz, 0.06, wheelR * 0.5, wheelR * 0.5, hubCol);
    }

    // 5. Headlights, Taillights & Grille
    const frontZ = l * 0.5 - 0.08;
    const rearZ = -l * 0.5 + 0.08;
    const lightX = w * 0.38;

    // Dual Xenon Headlights
    addBoxRot(-lightX, y + 0.42, frontZ, 0.38, 0.20, 0.16, headlightCol);
    addBoxRot(lightX, y + 0.42, frontZ, 0.38, 0.20, 0.16, headlightCol);

    // Front Grille
    addBoxRot(0, y + 0.38, frontZ + 0.02, w * 0.45, 0.18, 0.12, [0.08, 0.08, 0.10, 1.0]);

    // Ruby LED Taillights
    addBoxRot(-lightX, y + 0.48, rearZ, 0.40, 0.18, 0.16, taillightCol);
    addBoxRot(lightX, y + 0.48, rearZ, 0.40, 0.18, 0.16, taillightCol);

    // Dual Chrome Exhaust Pipes
    addBoxRot(-w * 0.28, y + 0.20, rearZ - 0.10, 0.14, 0.12, 0.22, chromeCol);
    addBoxRot(w * 0.28, y + 0.20, rearZ - 0.10, 0.14, 0.12, 0.22, chromeCol);

    // 6. Class-Specific Bodywork
    if (spec.hasSpoiler) {
      // Sports aerodynamic GT spoiler wing
      addBoxRot(0, y + h * 0.78, rearZ + 0.15, w * 0.88, 0.08, 0.38, [0.12, 0.12, 0.14, 1.0]);
      addBoxRot(-w * 0.32, y + h * 0.54, rearZ + 0.15, 0.06, 0.28, 0.22, [0.12, 0.12, 0.14, 1.0]);
      addBoxRot(w * 0.32, y + h * 0.54, rearZ + 0.15, 0.06, 0.28, 0.22, [0.12, 0.12, 0.14, 1.0]);
    }

    if (spec.hasHoodScoop) {
      // Muscle power-bulge hood induction scoop
      addBoxRot(0, y + h * 0.62, l * 0.22, w * 0.32, 0.14, 0.85, [0.12, 0.12, 0.14, 1.0]);
    }

    if (this.isPolice) {
      // Heavy Steel Push-Bumper Bullbar
      addBoxRot(0, y + 0.36, frontZ + 0.26, w * 0.70, 0.44, 0.22, [0.12, 0.12, 0.14, 1.0]);
      // Dual A-pillar searchlights
      addBoxRot(-w * 0.48, y + 0.95, cabinZ + cabinL * 0.40, 0.12, 0.18, 0.14, [0.15, 0.15, 0.18, 1.0]);
      addBoxRot(w * 0.48, y + 0.95, cabinZ + cabinL * 0.40, 0.12, 0.18, 0.14, [0.15, 0.15, 0.18, 1.0]);

      // Dual-Tone LED Emergency Lightbar on roof
      const flash = Math.sin(this.sirenTimer * 2) > 0;
      const redLight = flash ? [2.8, 0.25, 0.25, 1.0] : [0.5, 0.1, 0.1, 1.0];
      const blueLight = !flash ? [0.25, 0.8, 2.8, 1.0] : [0.1, 0.15, 0.5, 1.0];

      addBoxRot(-w * 0.24, y + 0.18 + h * 0.36 + cabinH + 0.08, cabinZ, w * 0.34, 0.18, 0.32, redLight);
      addBoxRot(w * 0.24, y + 0.18 + h * 0.36 + cabinH + 0.08, cabinZ, w * 0.34, 0.18, 0.32, blueLight);
      addBoxRot(0, y + 0.18 + h * 0.36 + cabinH + 0.06, cabinZ, 0.22, 0.14, 0.32, [0.95, 0.95, 0.98, 1.0]);
    }

    if (this.isTaxi) {
      // Illuminated Yellow Rooftop Taxi Sign Box
      addBoxRot(0, y + 0.18 + h * 0.36 + cabinH + 0.10, cabinZ, 0.95, 0.26, 0.42, [1.0, 0.95, 0.45, 1.0]);
      // Black checkerboard side stripe
      addBoxRot(-w * 0.51, y + 0.52, 0, 0.04, 0.16, l * 0.82, [0.12, 0.12, 0.14, 1.0]);
      addBoxRot(w * 0.51, y + 0.52, 0, 0.04, 0.16, l * 0.82, [0.12, 0.12, 0.14, 1.0]);
    }

    if (this.typeId === 'truck') {
      // Industrial Cargo Hauler Box Body
      const boxL = l * 0.62;
      const boxW = w * 1.04;
      const boxH = h * 0.92;
      const boxZ = -l * 0.15;
      addBoxRot(0, y + 0.18 + h * 0.38, boxZ, boxW, boxH, boxL, [0.88, 0.88, 0.90, 1.0]);
      // Cargo roll-up rear door
      addBoxRot(0, y + 0.18 + h * 0.38, boxZ - boxL * 0.5 - 0.04, boxW * 0.88, boxH * 0.88, 0.08, [0.35, 0.38, 0.42, 1.0]);
    }
  }
}

export class VehicleManager {
  constructor() {
    this.vehicles = [];
  }

  initCityTraffic(world) {
    // Spawn initial civilian traffic fleet spread along arterial avenues
    const spawnPoints = [
      { type: 'sports', x: -105, z: 40, rot: 0 },
      { type: 'muscle', x: 0, z: -100, rot: Math.PI },
      { type: 'sedan', x: 45, z: 80, rot: 0 },
      { type: 'taxi', x: 115, z: -40, rot: Math.PI },
      { type: 'hatchback', x: -55, z: 120, rot: Math.PI },
      { type: 'truck', x: 185, z: 60, rot: 0 },
      { type: 'police', x: 0, z: 20, rot: 0 },
    ];

    for (const sp of spawnPoints) {
      this.spawn(sp.type, sp.x, 0, sp.z, sp.rot);
    }
  }

  spawn(type, x, y, z, rotY = 0) {
    const v = new Vehicle(type, x, y, z, rotY);
    this.vehicles.push(v);
    return v;
  }

  findNearest(x, z, maxDist = 4.0) {
    let nearest = null;
    let minD = maxDist;
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isPlayerControlled) continue;
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < minD) {
        minD = d;
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

  getPoliceSirens() {
    let s1 = null;
    let s2 = null;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v.isPolice && v.sirenActive) {
        const flash = Math.sin(v.sirenTimer * 2) > 0;
        const sData = {
          pos: [v.x, v.y + 1.8, v.z],
          col: flash ? [2.8, 0.25, 0.25] : [0.25, 0.8, 2.8],
        };
        if (!s1) s1 = sData;
        else if (!s2) {
          s2 = sData;
          break;
        }
      }
    }

    if (!s1) return null;

    return {
      s1Pos: s1.pos,
      s1Col: s1.col,
      s2Pos: s2 ? s2.pos : s1.pos,
      s2Col: s2 ? s2.col : [0, 0, 0],
    };
  }

  buildMesh(positions, normals, colors, uvs) {
    for (let i = 0; i < this.vehicles.length; i++) {
      this.vehicles[i].buildMesh(positions, normals, colors, uvs);
    }
  }
}
