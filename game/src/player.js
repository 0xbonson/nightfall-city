/**
 * Nightfall City: Vela Bay - Protagonist Character Controller
 * Rhea "Rook" Solano: Sculpted 3D character silhouette with athletic proportions,
 * rolled-sleeve jacket over contrasting tee, tactical utility belt, denim,
 * multi-weapon geometries (carbine, shotgun, smg, pistol), articulated gait kinematics,
 * two-handed tactical combat ready stance, vehicle entry/exit transitions,
 * directional ground shadows, and health/armor systems.
 * Authored by makefun agent for the open-world crime entry.
 */

import { PLAYER, WEAPONS } from './config.js';
import { clamp, normalizeAngle, lerp } from './math.js';

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

    // Arsenal
    this.currentWeapon = 'carbine';
    this.weaponList = ['pistol', 'smg', 'shotgun', 'carbine'];
    this.ammo = {
      pistol: { clip: WEAPONS.pistol.clipSize, reserve: 72 },
      smg: { clip: WEAPONS.smg.clipSize, reserve: 150 },
      shotgun: { clip: WEAPONS.shotgun.clipSize, reserve: 36 },
      carbine: { clip: WEAPONS.carbine.clipSize, reserve: 180 },
    };
    this.lastFireTime = 0;
    this.isReloading = false;
    this.reloadTimer = 0;

    // Animation & Gait
    this.walkCycle = 0;
    this.isMoving = false;
    this.isSprinting = false;

    // Audio step trigger flag
    this.stepTrigger = false;
    this.lastStepPhase = 0;
  }

  addMoney(amount) {
    this.cash = Math.max(0, this.cash + amount);
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

  enterVehicle(car) {
    if (!car) return;
    this.inVehicle = true;
    this.vehicle = car;
    car.isPlayerControlled = true;
    car.driver = this;
  }

  exitVehicle(world) {
    if (!this.vehicle) return;
    const car = this.vehicle;
    car.isPlayerControlled = false;
    car.driver = null;

    // Exit onto driver side
    const exitDist = car.spec.width * 0.5 + 1.25;
    const exX = car.x - Math.cos(car.rotY) * exitDist;
    const exZ = car.z + Math.sin(car.rotY) * exitDist;

    this.x = exX;
    this.y = car.y;
    this.z = exZ;
    this.rotY = car.rotY;

    this.inVehicle = false;
    this.vehicle = null;
    this.vx = 0;
    this.vz = 0;
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

    // Vehicle entry
    if (input.isJustPressed('KeyF') || input.isJustPressed('KeyE')) {
      const nearCar = vehicles.findNearest(this.x, this.z, PLAYER.ENTER_CAR_DIST);
      if (nearCar) {
        this.enterVehicle(nearCar);
        return;
      }
    }

    // Weapon Switching
    if (input.isJustPressed('Digit1')) this.currentWeapon = 'pistol';
    if (input.isJustPressed('Digit2')) this.currentWeapon = 'smg';
    if (input.isJustPressed('Digit3')) this.currentWeapon = 'shotgun';
    if (input.isJustPressed('Digit4')) this.currentWeapon = 'carbine';
    if (input.isJustPressed('KeyQ')) {
      const idx = this.weaponList.indexOf(this.currentWeapon);
      const nextIdx = (idx + 1) % this.weaponList.length;
      this.currentWeapon = this.weaponList[nextIdx];
    }

    // Weapon Reloading
    const wep = WEAPONS[this.currentWeapon] || WEAPONS.carbine;
    const ammoState = this.ammo[this.currentWeapon] || { clip: 30, reserve: 150 };

    if (input.isJustPressed('KeyR') && ammoState.clip < wep.clipSize && ammoState.reserve > 0) {
      this.isReloading = true;
      this.reloadTimer = wep.reloadTime;
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const needed = wep.clipSize - ammoState.clip;
        const available = Math.min(needed, ammoState.reserve);
        ammoState.clip += available;
        ammoState.reserve -= available;
      }
    }

    // Foot Traversal Direction
    let fwd = 0;
    let strafe = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) fwd += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) fwd -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) strafe += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) strafe -= 1;

    this.isMoving = fwd !== 0 || strafe !== 0;
    this.isSprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

    const targetSpeed = this.isMoving ? (this.isSprinting ? PLAYER.SPRINT_SPEED : PLAYER.WALK_SPEED) : 0;

    if (this.isMoving) {
      const camYaw = camera ? camera.yaw : 0;
      const moveAngle = Math.atan2(strafe, fwd) + camYaw;

      this.rotY = lerp(this.rotY, moveAngle, dt * PLAYER.ROT_SPEED);
      this.rotY = normalizeAngle(this.rotY);

      this.vx = Math.sin(this.rotY) * targetSpeed;
      this.vz = Math.cos(this.rotY) * targetSpeed;

      const prevPhase = Math.sin(this.walkCycle);
      this.walkCycle += dt * (this.isSprinting ? 12.0 : 8.0);
      const currPhase = Math.sin(this.walkCycle);

      if (prevPhase < 0 && currPhase >= 0) {
        this.stepTrigger = true;
      }
    } else {
      this.vx = lerp(this.vx, 0, dt * 14.0);
      this.vz = lerp(this.vz, 0, dt * 14.0);
    }

    const prevX = this.x;
    const prevZ = this.z;

    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Collision with city buildings
    const col = world.checkCollision(this.x, this.z, 0.42);
    if (col.collided) {
      this.x = prevX + col.pushX;
      this.z = prevZ + col.pushZ;
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    if (this.inVehicle || !this.alive) return;

    const x = this.x;
    const y = this.y;
    const z = this.z;
    const rot = this.rotY;

    const sinRot = Math.sin(rot);
    const cosRot = Math.cos(rot);

    const swing = Math.sin(this.walkCycle) * (this.isMoving ? 0.45 : 0);

    // Warm Mediterranean Palette: terracotta-washed jacket, dark inner shirt, indigo denim
    const jacketCol = [0.84, 0.38, 0.22, 1.0];  // Sun-washed terracotta jacket
    const teeCol = [0.18, 0.20, 0.24, 1.0];     // Dark charcoal crewneck tee
    const beltCol = [0.24, 0.16, 0.10, 1.0];    // Distressed brown leather belt
    const buckleCol = [0.88, 0.85, 0.75, 1.0];  // Brushed steel buckle
    const pantsCol = [0.18, 0.26, 0.42, 1.0];   // Deep indigo denim jeans
    const bootsCol = [0.12, 0.12, 0.14, 1.0];   // Dark combat boots
    const soleCol = [0.06, 0.06, 0.07, 1.0];    // Rubber sole
    const skinCol = [0.88, 0.72, 0.58, 1.0];    // Mediterranean warm skin tone
    const hairCol = [0.15, 0.12, 0.10, 1.0];    // Dark espresso hair
    const shadesCol = [0.08, 0.10, 0.12, 1.0];  // Dark aviator shades
    const gunSteel = [0.16, 0.17, 0.20, 1.0];   // Blued weapon steel
    const gunWood = [0.38, 0.22, 0.14, 1.0];    // Walnut rifle stock
    const opticLens = [0.15, 0.85, 0.95, 1.0];  // Holo sight reflex optic lens

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

    // 0. Directional ground shadow cast along the low NW sun vector (+X, +Z)
    const shadowCol = [0.03, 0.05, 0.08, 0.42];
    const shLength = 1.35;
    const shW = 0.42;
    const shX = x + 0.35;
    const shZ = z + 0.48;
    const shGroundY = y + 0.015;

    const shQuad = [
      [shX - shW, shGroundY, shZ - shW],
      [shX + shW + 0.2, shGroundY, shZ - shW + 0.1],
      [shX + shW + 0.2 + shLength * 0.4, shGroundY, shZ + shW + shLength],
      [shX - shW, shGroundY, shZ - shW],
      [shX + shW + 0.2 + shLength * 0.4, shGroundY, shZ + shW + shLength],
      [shX - shW + shLength * 0.3, shGroundY, shZ + shW + shLength],
    ];
    for (const pt of shQuad) {
      positions.push(pt[0], pt[1], pt[2]);
      normals.push(0, 1, 0);
      colors.push(shadowCol[0], shadowCol[1], shadowCol[2], shadowCol[3]);
      uvs.push(0, 0);
    }

    // 1. Boots & Soles
    addBoxRot(-0.14, y, swing * 0.18, 0.19, 0.06, 0.32, soleCol);
    addBoxRot(0.14, y, -swing * 0.18, 0.19, 0.06, 0.32, soleCol);
    addBoxRot(-0.14, y + 0.06, swing * 0.18, 0.18, 0.20, 0.29, bootsCol);
    addBoxRot(0.14, y + 0.06, -swing * 0.18, 0.18, 0.20, 0.29, bootsCol);

    // 2. Denim Jeans
    addBoxRot(-0.14, y + 0.24, swing * 0.18, 0.18, 0.56, 0.19, pantsCol);
    addBoxRot(0.14, y + 0.24, -swing * 0.18, 0.18, 0.56, 0.19, pantsCol);

    // 3. Waist / Belt & Buckle
    addBoxRot(0, y + 0.78, 0, 0.48, 0.08, 0.26, beltCol);
    addBoxRot(0, y + 0.78, 0.135, 0.10, 0.07, 0.04, buckleCol);

    // 4. Torso: Dark inner shirt + Open terracotta jacket
    addBoxRot(0, y + 0.84, 0, 0.48, 0.65, 0.26, jacketCol);
    addBoxRot(0, y + 0.88, 0.09, 0.22, 0.52, 0.12, teeCol); // Open chest shirt showing

    // 5. Head, Hair & Aviator Sunglasses
    addBoxRot(0, y + 1.48, 0, 0.28, 0.28, 0.27, skinCol);
    addBoxRot(0, y + 1.62, -0.02, 0.30, 0.15, 0.29, hairCol); // Hair crop
    addBoxRot(0, y + 1.54, 0.14, 0.26, 0.09, 0.06, shadesCol); // Sunglasses

    // 6. Tactical Two-Handed Combat Weapon Stance vs Sidearm Stance
    const isTwoHanded = this.currentWeapon === 'carbine' || this.currentWeapon === 'rifle' ||
                        this.currentWeapon === 'shotgun' || this.currentWeapon === 'smg';

    if (isTwoHanded) {
      // TWO-HANDED TACTICAL COMBAT STANCE:
      // The protagonist holds the long gun raised at low-ready / tactical patrol aim,
      // right arm at the trigger grip, left arm reaching across supporting the handguard/barrel.
      // Immediately legible in screenshots as combat-ready action!

      // Right arm (Trigger hand)
      addBoxRot(0.26, y + 1.05, 0.10, 0.14, 0.28, 0.14, jacketCol); // Right shoulder
      addBoxRot(0.24, y + 1.00, 0.22, 0.12, 0.14, 0.22, skinCol);    // Right forearm forward
      addBoxRot(0.22, y + 1.02, 0.32, 0.10, 0.12, 0.12, skinCol);    // Right trigger hand

      // Left arm (Support hand reaching forward to barrel)
      addBoxRot(-0.24, y + 1.05, 0.06, 0.14, 0.26, 0.14, jacketCol); // Left shoulder
      addBoxRot(-0.08, y + 0.98, 0.24, 0.12, 0.13, 0.28, skinCol);   // Left forearm reaching forward-right
      addBoxRot(0.08, y + 1.02, 0.44, 0.10, 0.11, 0.12, skinCol);    // Left support hand grasping handguard

      if (this.currentWeapon === 'carbine' || this.currentWeapon === 'rifle') {
        // Tactical M4/AR Carbine with receiver, magazine, barrel, stock, holo sight
        addBoxRot(0.18, y + 1.08, 0.30, 0.08, 0.15, 0.36, gunSteel);  // Receiver
        addBoxRot(0.18, y + 1.07, 0.58, 0.05, 0.06, 0.44, gunSteel);  // Free-float handguard & barrel
        addBoxRot(0.18, y + 1.06, 0.82, 0.06, 0.07, 0.10, [0.10, 0.10, 0.12, 1.0]); // Flash hider / muzzle brake
        addBoxRot(0.18, y + 0.93, 0.34, 0.06, 0.20, 0.11, gunSteel);  // Curved STANAG 30-rnd magazine
        addBoxRot(0.18, y + 1.10, 0.06, 0.07, 0.13, 0.24, gunWood);   // Adjustable tactical stock
        // Holographic reflex optic sight
        addBoxRot(0.18, y + 1.18, 0.30, 0.07, 0.08, 0.14, [0.10, 0.10, 0.12, 1.0]);
        addBoxRot(0.18, y + 1.18, 0.38, 0.05, 0.06, 0.02, opticLens);
      } else if (this.currentWeapon === 'shotgun') {
        // Heavy Combat Shotgun
        addBoxRot(0.18, y + 1.08, 0.12, 0.08, 0.14, 0.32, gunWood);   // Walnut stock
        addBoxRot(0.18, y + 1.09, 0.42, 0.09, 0.13, 0.42, gunSteel);  // Heavy receiver
        addBoxRot(0.18, y + 1.10, 0.70, 0.06, 0.07, 0.50, gunSteel);  // 12-gauge blued barrel & mag tube
        addBoxRot(0.18, y + 1.02, 0.54, 0.08, 0.08, 0.24, gunWood);   // Ribbed pump fore-end
      } else {
        // Tactical SMG
        addBoxRot(0.18, y + 1.08, 0.28, 0.08, 0.14, 0.36, gunSteel);
        addBoxRot(0.18, y + 0.92, 0.28, 0.05, 0.24, 0.07, [0.10, 0.10, 0.12, 1.0]); // Stick magazine
        addBoxRot(0.18, y + 1.09, 0.52, 0.04, 0.05, 0.24, gunSteel); // Suppressed barrel
      }
    } else {
      // Tactical Handgun / Pistol stance:
      // Right arm extended forward holding pistol at ready, left arm poised
      addBoxRot(0.28, y + 1.02, 0.12, 0.14, 0.28, 0.14, jacketCol);
      addBoxRot(0.26, y + 1.00, 0.24, 0.12, 0.14, 0.22, skinCol);
      addBoxRot(0.24, y + 1.02, 0.34, 0.10, 0.11, 0.12, skinCol);

      // Left arm balanced
      addBoxRot(-0.28, y + 0.92, -swing * 0.18, 0.14, 0.36, 0.14, jacketCol);
      addBoxRot(-0.28, y + 0.68, -swing * 0.18 + 0.06, 0.12, 0.20, 0.12, skinCol);
      addBoxRot(-0.28, y + 0.56, -swing * 0.18 + 0.06, 0.10, 0.12, 0.10, skinCol);

      // Blued steel semi-automatic combat pistol
      addBoxRot(0.24, y + 1.09, 0.38, 0.07, 0.11, 0.26, gunSteel); // Slide & barrel
      addBoxRot(0.24, y + 0.99, 0.32, 0.06, 0.14, 0.08, [0.12, 0.12, 0.14, 1.0]); // Grip
    }
  }
}
