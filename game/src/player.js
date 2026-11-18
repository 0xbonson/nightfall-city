// Player character Rhea "Rook" Solano for Nightfall City: Vela Bay
// Controls on-foot movement, vehicle boarding, weapons handling, and respawn mechanics.

import { CharacterPhysics, VehiclePhysics } from './physics.js';
import { WeaponManager } from './weapons.js';
import { audio } from './audio.js';
import { screenEffects, particles } from './effects.js';
import { CONFIG } from './config.js';
import { world } from './world.js';
import { police } from './police.js';

export const PLAYER_INITIAL_HEALTH = 100;
export const PLAYER_INITIAL_ARMOR = 50;

export class Player {
  constructor() {
    this.name = 'Rhea "Rook" Solano';
    this.x = 0;
    this.y = 0;
    this.z = 25; // Spawn on Grand Parkway near Marina
    this.vx = 0;
    this.vz = 0;
    this.heading = 0; // Radians
    this.pitch = 0.15; // Camera look pitch

    this.maxHealth = 100;
    this.health = 100;
    this.maxArmor = 100;
    this.armor = 50;
    this.cash = 1000;
    this.alive = true;

    this.inVehicle = false;
    this.vehicle = null;
    this.isJacked = false;

    this.weapons = WeaponManager.createArsenal();
    this.activeWeaponIndex = 0;

    this.isMoving = false;
    this.isSprinting = false;
    this.animTime = 0;
    this.footstepTimer = 0;
    this.staggerTimer = 0;
    this.landTimer = 0;
    this.lastHonkTime = 0;
    this.wastedTimer = 0;
    this.isWasted = false;
  }

  get activeWeapon() {
    return this.weapons[this.activeWeaponIndex];
  }

  get hasWeapon() {
    return this.activeWeaponIndex > 0;
  }

  set hasWeapon(val) {
    if (val && this.activeWeaponIndex === 0) {
      this.activeWeaponIndex = 1;
    } else if (!val) {
      this.activeWeaponIndex = 0;
    }
  }

  switchWeapon(index) {
    if (index >= 0 && index < this.weapons.length && index !== this.activeWeaponIndex) {
      this.activeWeaponIndex = index;
      audio.playReload();
    }
  }

  cycleWeapon() {
    this.activeWeaponIndex = (this.activeWeaponIndex + 1) % this.weapons.length;
    audio.playReload();
  }

  enterVehicle(car) {
    if (!car || car.wrecked) return false;
    this.inVehicle = true;
    this.vehicle = car;
    this.x = car.x;
    this.z = car.z;
    audio.playCarDoor();
    audio.resume();
    return true;
  }

  exitVehicle() {
    if (!this.inVehicle || !this.vehicle) return;
    const sinA = Math.sin(this.vehicle.angle);
    const cosA = Math.cos(this.vehicle.angle);
    // Exit to left of car
    this.x = this.vehicle.x - cosA * 2.2;
    this.z = this.vehicle.z + sinA * 2.2;
    this.heading = this.vehicle.angle;
    this.inVehicle = false;
    this.vehicle = null;
    audio.playCarDoor();
  }

  takeDamage(amount, source = null) {
    if (!this.alive) return;
    screenEffects.flashRed(0.7);
    screenEffects.addTrauma(amount * 0.02);

    let damageRemaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.75);
      this.armor = Math.max(0, this.armor - absorbed);
      damageRemaining -= absorbed;
    }

    this.health = Math.max(0, this.health - damageRemaining);
    particles.emit('blood', this.x, 1.2, this.z, 6);

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.alive = false;
    this.isWasted = true;
    this.wastedTimer = 3.5;
    if (this.inVehicle && this.vehicle) {
      this.exitVehicle();
    }
    screenEffects.flashRed(1.0);
    screenEffects.addTrauma(0.8);
  }

  respawn() {
    this.alive = true;
    this.isWasted = false;
    this.health = 100;
    this.armor = 25;
    this.cash = Math.max(0, this.cash - 250);
    // Hospital spawn in Downtown Vela
    this.x = 80;
    this.z = -60;
    this.vx = 0;
    this.vz = 0;
    this.heading = 0;
  }

  addCash(amount) {
    this.cash += amount;
    audio.playCash();
  }

  update(dt, inputs) {
    if (!this.alive) {
      this.wastedTimer -= dt;
      if (this.wastedTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.activeWeapon?.update(dt);

    if (this.inVehicle && this.vehicle) {
      // In Car driving
      VehiclePhysics.updateVehicle(this.vehicle, dt, {
        throttle: inputs.isAction('forward') ? 1 : inputs.isAction('backward') ? -1 : 0,
        steer: inputs.isAction('left') ? 1 : inputs.isAction('right') ? -1 : 0,
        handbrake: inputs.isAction('handbrake'),
        isPlayer: true,
      });

      this.x = this.vehicle.x;
      this.z = this.vehicle.z;
      this.heading = this.vehicle.angle;
      audio.updateEngine(true, Math.abs(this.vehicle.speed) / this.vehicle.maxSpeed, inputs.isAction('forward'));

      // Scatter pigeons in vehicle path
      if (world && world.scatterPigeonsNear) {
        world.scatterPigeonsNear(this.vehicle.x, this.vehicle.z, 10.0);
      }

      // Check collision with hydrants and dumpsters
      if (world && world.checkHydrantHit) {
        const hit = world.checkHydrantHit(this.vehicle.x, this.vehicle.z, 1.2);
        if (hit.justBursted) {
          audio.playHydrantBurst?.();
          screenEffects.addTrauma(0.15);
        }
      }
      if (world && world.checkDumpsterHit) {
        const hit = world.checkDumpsterHit(this.vehicle.x, this.vehicle.z, 1.6, Math.abs(this.vehicle.speed));
        if (hit.justKnocked) {
          audio.playDumpsterCrash?.();
          screenEffects.addTrauma(0.2);
          particles.emitDebris?.(hit.dumpster.x, 0.8, hit.dumpster.z, 10);
        }
      }

      // Horn action
      if (inputs.isAction('horn') && Date.now() - this.lastHonkTime > 600) {
        this.lastHonkTime = Date.now();
        audio.playHorn();
      }
    } else {
      // On Foot
      audio.updateEngine(false, 0, false);

      // Camera-relative movement
      let camYaw = inputs.cameraYaw || this.heading;
      let forward = 0;
      let strafe = 0;

      if (inputs.isAction('forward')) forward += 1;
      if (inputs.isAction('backward')) forward -= 1;
      if (inputs.isAction('left')) strafe += 1;
      if (inputs.isAction('right')) strafe -= 1;

      // Translate forward/strafe to world X/Z using camera angle
      const sinC = Math.sin(camYaw);
      const cosC = Math.cos(camYaw);
      const moveX = forward * sinC - strafe * cosC;
      const moveZ = forward * cosC + strafe * sinC;

      CharacterPhysics.updatePlayer(this, dt, {
        moveX,
        moveZ,
        sprint: inputs.isAction('sprint'),
      });

      // Scatter pigeons on foot
      if (world && world.scatterPigeonsNear) {
        world.scatterPigeonsNear(this.x, this.z, this.isSprinting ? 7.5 : 4.0);
      }

      if (this.isMoving) {
        this.animTime += dt * (this.isSprinting ? 12 : 7);
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
          const surface = world?.getSurfaceAt ? world.getSurfaceAt(this.x, this.z) : 'stone';
          audio.playFootstep(surface, this.isSprinting);
          this.footstepTimer = this.isSprinting ? 0.28 : 0.44;
        }
      } else {
        this.footstepTimer = 0.1;
      }

      // Proximity to street food carts to grab hot food
      if (world && world.streetFoodCarts && (inputs.isAction('enter') || inputs.isAction('fire'))) {
        for (const cart of world.streetFoodCarts) {
          const dist = Math.hypot(this.x - cart.x, this.z - cart.z);
          if (dist < 2.5 && this.health < this.maxHealth && this.cash >= 15) {
            this.cash -= 15;
            this.health = Math.min(this.maxHealth, this.health + 25);
            audio.playCash();
            screenEffects.flashGreen?.(0.3);
            break;
          }
        }
      }
    }

    // Proximity check for Vela Wave Mixtapes
    if (world && world.checkMixtapePickup) {
      const mixtape = world.checkMixtapePickup(this.x, this.z, 2.2);
      if (mixtape) {
        this.addCash(500);
        audio.playCash();
        particles.emit('spark', mixtape.x, mixtape.y || 1.0, mixtape.z, 16);
      }
    }

    // Proximity check for hidden Smuggler Caches
    if (world && world.smugglerCaches) {
      for (const cache of world.smugglerCaches) {
        if (world.collectedCaches && world.collectedCaches.has(cache.id)) continue;
        const dist = Math.hypot(this.x - cache.x, this.z - cache.z);
        if (dist < 3.2) {
          const collected = world.collectCache(cache.id);
          if (collected) {
            this.addCash(cache.reward);
            audio.playCash();
            particles.emit('spark', cache.x, 0.8, cache.z, 14);
          }
        }
      }
    }

    // Alleyway escape route detection when wanted by police
    if (world && world.isInAlleyEscapeRoute && world.isInAlleyEscapeRoute(this.x, this.z)) {
      if (police && police.wantedLevel > 0) {
        // Accelerate police evasion timer in alleyways
        police.evasionTimer = Math.max(0, police.evasionTimer - dt * 2.8);
      }
    }
  }

  // Returns true if player health is at maximum capacity
  isFullHealth() {
    return this.health >= this.maxHealth;
  }
}

export const player = new Player();
