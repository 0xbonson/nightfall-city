/**
 * Nightfall City: Vela Bay - Protagonist Player Character
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { PLAYER, WEAPONS, WORLD } from './config.js';
import { clamp, normalizeAngle } from './math.js';

export class Player {
  constructor(x = 68, y = 0, z = -68) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vz = 0;
    this.rotY = 0;

    this.health = PLAYER.MAX_HEALTH;
    this.armor = 50;
    this.cash = 1500;
    this.alive = true;

    this.inVehicle = false;
    this.vehicle = null;

    // Weapons
    this.currentWeapon = 'rifle';
    this.ammo = {
      pistol: { clip: WEAPONS.pistol.clipSize, reserve: 60 },
      rifle: { clip: WEAPONS.rifle.clipSize, reserve: 150 },
    };
    this.lastFireTime = 0;
    this.isReloading = false;
    this.reloadTimer = 0;

    // Animation
    this.walkCycle = 0;
    this.isMoving = false;
    this.isSprinting = false;

    // Audio step trigger flag
    this.stepTrigger = false;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.7);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  update(dt, input, camera, world, vehicles) {
    this.stepTrigger = false;

    if (this.inVehicle) {
      if (this.vehicle) {
        this.x = this.vehicle.x;
        this.y = this.vehicle.y;
        this.z = this.vehicle.z;
        this.rotY = this.vehicle.rotY;

        // Exit vehicle with F or E
        if (input.isJustPressed('KeyF') || input.isJustPressed('KeyE')) {
          this.exitVehicle(world);
        }
      }
      return;
    }

    // Vehicle hijacking / entry
    if (input.isJustPressed('KeyF') || input.isJustPressed('KeyE')) {
      const nearCar = vehicles.findNearest(this.x, this.z, PLAYER.ENTER_CAR_DIST);
      if (nearCar) {
        this.enterVehicle(nearCar);
        return;
      }
    }

    // Weapon Switching: 1, 2, Q
    if (input.isJustPressed('Digit1')) this.currentWeapon = 'pistol';
    if (input.isJustPressed('Digit2')) this.currentWeapon = 'rifle';
    if (input.isJustPressed('KeyQ')) {
      this.currentWeapon = this.currentWeapon === 'pistol' ? 'rifle' : 'pistol';
    }

    // Reloading
    const wep = WEAPONS[this.currentWeapon];
    const ammoState = this.ammo[this.currentWeapon];

    if (input.isJustPressed('KeyR') && ammoState.clip < wep.clipSize && ammoState.reserve > 0) {
      this.isReloading = true;
      this.reloadTimer = wep.reloadTime;
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const needed = wep.clipSize - ammoState.clip;
        const add = Math.min(needed, ammoState.reserve);
        ammoState.clip += add;
        ammoState.reserve -= add;
      }
    }

    // On-Foot Movement
    let moveForward = 0;
    let moveStrafe = 0;

    if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveForward += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveForward -= 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) moveStrafe -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) moveStrafe += 1;

    this.isSprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const targetSpeed = this.isSprinting ? PLAYER.SPRINT_SPEED : PLAYER.WALK_SPEED;

    const moveMag = Math.hypot(moveForward, moveStrafe);
    this.isMoving = moveMag > 0.1;

    if (this.isMoving) {
      // Calculate movement relative to camera look yaw
      const camYaw = camera.yaw;
      const moveAngle = Math.atan2(moveStrafe, moveForward) + camYaw;

      const targetVx = Math.sin(moveAngle) * targetSpeed;
      const targetVz = Math.cos(moveAngle) * targetSpeed;

      this.vx = this.vx + (targetVx - this.vx) * clamp(dt * PLAYER.ACCEL, 0, 1);
      this.vz = this.vz + (targetVz - this.vz) * clamp(dt * PLAYER.ACCEL, 0, 1);

      // Face direction of movement smoothly
      const targetRotY = moveAngle;
      let dRot = normalizeAngle(targetRotY - this.rotY);
      this.rotY += dRot * clamp(dt * PLAYER.TURN_SPEED, 0, 1);

      // Animate walk cycle
      const prevCycle = this.walkCycle;
      this.walkCycle += Math.hypot(this.vx, this.vz) * dt * (this.isSprinting ? 6.2 : 4.4);
      if (Math.floor(this.walkCycle / Math.PI) !== Math.floor(prevCycle / Math.PI)) {
        this.stepTrigger = true;
      }
    } else {
      // Decelerate to stop
      this.vx += (0 - this.vx) * clamp(dt * PLAYER.DECEL, 0, 1);
      this.vz += (0 - this.vz) * clamp(dt * PLAYER.DECEL, 0, 1);
      this.walkCycle = 0;
    }

    // Move & Collision sliding
    const newX = this.x + this.vx * dt;
    const newZ = this.z + this.vz * dt;

    // Test X collision
    const colX = world.checkCollision(newX, this.z, PLAYER.RADIUS);
    if (colX.collided) {
      this.x = newX + colX.pushX;
      this.vx = 0;
    } else {
      this.x = newX;
    }

    // Test Z collision
    const colZ = world.checkCollision(this.x, newZ, PLAYER.RADIUS);
    if (colZ.collided) {
      this.z = newZ + colZ.pushZ;
      this.vz = 0;
    } else {
      this.z = newZ;
    }

    // Keep player within world bounds
    const limit = WORLD.HALF_SIZE - 2;
    this.x = clamp(this.x, WORLD.COAST_X - 18, limit);
    this.z = clamp(this.z, -limit, limit);
  }

  enterVehicle(vehicle) {
    this.inVehicle = true;
    this.vehicle = vehicle;
    vehicle.driver = this;
    vehicle.isPlayerControlled = true;
  }

  exitVehicle(world) {
    if (!this.vehicle) return;
    // Place player to the left of the driver door
    const exitAngle = this.vehicle.rotY - Math.PI * 0.5;
    const exitX = this.vehicle.x + Math.sin(exitAngle) * 2.2;
    const exitZ = this.vehicle.z + Math.cos(exitAngle) * 2.2;

    this.x = exitX;
    this.y = this.vehicle.y;
    this.z = exitZ;
    this.vx = 0;
    this.vz = 0;

    this.vehicle.isPlayerControlled = false;
    this.vehicle.driver = null;
    this.vehicle = null;
    this.inVehicle = false;
  }

  // --- Procedural 3D Character Mesh ---
  buildMesh(positions, normals, colors, uvs) {
    if (this.inVehicle) return; // Player is inside car

    const px = this.x;
    const py = this.y;
    const pz = this.z;
    const rot = this.rotY;

    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    // Helper to rotate local character coordinate to world
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
        [3, 2, 6, 7, [0, 1, 0]],   // Top
        [4, 5, 1, 0, [0, -1, 0]],  // Bottom
        [7, 6, 5, 4, [sinR, 0, cosR]], // Front
        [1, 2, 3, 0, [-sinR, 0, -cosR]], // Back
        [6, 2, 1, 5, [cosR, 0, -sinR]],  // Right
        [0, 3, 7, 4, [-cosR, 0, sinR]],  // Left
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

    // Palette: Vice City style bomber jacket, dark tactical pants, sunglasses
    const jacketCol = [0.18, 0.22, 0.28, 1.0]; // Slate charcoal jacket
    const shirtCol = [0.92, 0.25, 0.45, 1.0];  // Neon magenta undershirt
    const pantsCol = [0.15, 0.16, 0.18, 1.0];  // Dark jeans
    const skinCol = [0.85, 0.65, 0.52, 1.0];   // Warm tan
    const shoeCol = [0.95, 0.95, 0.95, 1.0];   // White sneakers

    // Limb animation swings
    const legSwing = Math.sin(this.walkCycle) * 0.45;
    const armSwing = Math.sin(this.walkCycle) * 0.45;

    // Torso / Jacket
    addBoxLocal(0, 1.25, 0, 0.55, 0.65, 0.32, jacketCol);
    // Undershirt chest triangle
    addBoxLocal(0, 1.35, 0.15, 0.22, 0.35, 0.05, shirtCol);

    // Head & Sunglasses
    addBoxLocal(0, 1.72, 0, 0.28, 0.32, 0.28, skinCol);
    addBoxLocal(0, 1.76, 0.14, 0.26, 0.08, 0.06, [0.05, 0.05, 0.05, 1.0]); // Shades

    // Legs with alternating stride
    addBoxLocal(-0.16, 0.5 + legSwing * 0.15, legSwing * 0.35, 0.20, 0.85, 0.22, pantsCol);
    addBoxLocal(0.16, 0.5 - legSwing * 0.15, -legSwing * 0.35, 0.20, 0.85, 0.22, pantsCol);

    // Sneakers
    addBoxLocal(-0.16, 0.1, legSwing * 0.35 + 0.05, 0.22, 0.18, 0.35, shoeCol);
    addBoxLocal(0.16, 0.1, -legSwing * 0.35 + 0.05, 0.22, 0.18, 0.35, shoeCol);

    // Arms
    addBoxLocal(-0.35, 1.25 - armSwing * 0.1, -armSwing * 0.25, 0.16, 0.65, 0.16, jacketCol);
    addBoxLocal(0.35, 1.25 + armSwing * 0.1, armSwing * 0.25, 0.16, 0.65, 0.16, jacketCol);

    // Weapon in hands
    if (this.currentWeapon === 'rifle') {
      // Vane Carbine in forward ready stance
      addBoxLocal(0.25, 1.15, 0.35, 0.12, 0.18, 0.75, [0.1, 0.1, 0.12, 1.0]);
    } else {
      // Pistol in hand
      addBoxLocal(0.28, 1.1, 0.25, 0.08, 0.14, 0.28, [0.18, 0.18, 0.2, 1.0]);
    }
  }
}
