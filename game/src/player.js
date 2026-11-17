// Player character Rhea "Rook" Solano for Nightfall City

import { CharacterPhysics, VehiclePhysics } from './physics.js';
import { WeaponManager } from './weapons.js';
import { audio } from './audio.js';
import { screenEffects, particles } from './effects.js';

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
    this.wastedTimer = 0;
    this.isWasted = false;
  }

  get activeWeapon() {
    return this.weapons[this.activeWeaponIndex];
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
      audio.updateEngine(true, this.vehicle.speed / this.vehicle.maxSpeed, inputs.isAction('forward'));
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

      if (this.isMoving) {
        this.animTime += dt * (this.isSprinting ? 12 : 7);
      }
    }
  }
}

export const player = new Player();
