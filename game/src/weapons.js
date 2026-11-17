// Weapons and Ballistic Combat System for Nightfall City: Vela Bay
// Manages hitscan firearms, magazine reloads, bullet spread cones, and impact feedback.

import { audio } from './audio.js';
import { particles, screenEffects } from './effects.js';
import { world } from './world.js';

export const WEAPON_MAX_EFFECTIVE_RANGE = 120.0; // Hitscan maximum raycast range in meters

export class Weapon {
  constructor(name, type, damage, magSize, maxReserve, fireRate, reloadTime, spread) {
    this.name = name;
    this.type = type; // 'pistol' or 'rifle'
    this.damage = damage;
    this.magSize = magSize;
    this.ammoInMag = magSize;
    this.reserveAmmo = maxReserve;
    this.maxReserve = maxReserve;
    this.fireInterval = 1.0 / fireRate;
    this.reloadTime = reloadTime;
    this.spread = spread;
    this.cooldown = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }
  }

  canShoot() {
    return this.cooldown <= 0 && !this.isReloading && this.ammoInMag > 0;
  }

  shoot(origin, dir, targetEntities = [], isPlayer = false) {
    if (!this.canShoot()) {
      if (this.ammoInMag === 0 && !this.isReloading && this.reserveAmmo > 0) {
        this.reload();
      }
      return null;
    }

    this.ammoInMag--;
    this.cooldown = this.fireInterval;

    if (isPlayer) {
      audio.playGunshot(this.type === 'rifle');
      screenEffects.addTrauma(this.type === 'rifle' ? 0.08 : 0.12);
    }

    // Apply bullet spread
    const angleOffset = (Math.random() - 0.5) * this.spread;
    const finalDir = {
      x: dir.x * Math.cos(angleOffset) - dir.z * Math.sin(angleOffset),
      z: dir.x * Math.sin(angleOffset) + dir.z * Math.cos(angleOffset),
    };

    // Raycast bullet trajectory (max range in meters)
    const maxRange = WEAPON_MAX_EFFECTIVE_RANGE;
    const targetX = origin.x + finalDir.x * maxRange;
    const targetZ = origin.z + finalDir.z * maxRange;

    // Check world/building hit first
    const worldHit = world.raycast(origin.x, origin.z, targetX, targetZ);
    let hitDist = worldHit.hit ? worldHit.dist : maxRange;
    let hitEntity = null;

    // Check entities along path
    for (const ent of targetEntities) {
      if (!ent.alive) continue;
      const dx = ent.x - origin.x;
      const dz = ent.z - origin.z;
      const proj = dx * finalDir.x + dz * finalDir.z;
      if (proj > 0 && proj < hitDist) {
        // Perpendicular distance to ray
        const perpSq = (dx * dx + dz * dz) - (proj * proj);
        const hitRadius = ent.isVehicle ? 2.0 : 0.7;
        if (perpSq < hitRadius * hitRadius) {
          hitDist = proj;
          hitEntity = ent;
        }
      }
    }

    const hitX = origin.x + finalDir.x * hitDist;
    const hitZ = origin.z + finalDir.z * hitDist;

    if (hitEntity) {
      hitEntity.takeDamage(this.damage, origin);
      if (hitEntity.isVehicle) {
        particles.emit('spark', hitX, 0.7, hitZ, 6);
      } else {
        particles.emit('blood', hitX, 1.2, hitZ, 8);
      }
    } else if (worldHit.hit) {
      particles.emit('spark', hitX, 1.0, hitZ, 5);
      particles.emit('smoke', hitX, 1.0, hitZ, 2, { size: 0.3 });
    }

    return {
      hit: !!hitEntity || worldHit.hit,
      hitEntity,
      x: hitX,
      z: hitZ,
      dist: hitDist
    };
  }

  reload() {
    if (this.isReloading || this.ammoInMag >= this.magSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
    audio.playReload();
  }

  finishReload() {
    const needed = this.magSize - this.ammoInMag;
    const load = Math.min(needed, this.reserveAmmo);
    this.ammoInMag += load;
    this.reserveAmmo -= load;
    this.isReloading = false;
  }
}

export const WEAPON_DEFAULTS = {
  PISTOL: { name: 'Viper .45', type: 'pistol', damage: 28, magSize: 12, maxReserve: 120, fireRate: 3.8, reloadTime: 1.1, spread: 0.04 },
  RIFLE: { name: 'Vane Carbine', type: 'rifle', damage: 22, magSize: 30, maxReserve: 240, fireRate: 9.5, reloadTime: 1.7, spread: 0.08 },
};

export class WeaponManager {
  static createArsenal() {
    return [
      new Weapon(
        WEAPON_DEFAULTS.PISTOL.name,
        WEAPON_DEFAULTS.PISTOL.type,
        WEAPON_DEFAULTS.PISTOL.damage,
        WEAPON_DEFAULTS.PISTOL.magSize,
        WEAPON_DEFAULTS.PISTOL.maxReserve,
        WEAPON_DEFAULTS.PISTOL.fireRate,
        WEAPON_DEFAULTS.PISTOL.reloadTime,
        WEAPON_DEFAULTS.PISTOL.spread
      ),
      new Weapon(
        WEAPON_DEFAULTS.RIFLE.name,
        WEAPON_DEFAULTS.RIFLE.type,
        WEAPON_DEFAULTS.RIFLE.damage,
        WEAPON_DEFAULTS.RIFLE.magSize,
        WEAPON_DEFAULTS.RIFLE.maxReserve,
        WEAPON_DEFAULTS.RIFLE.fireRate,
        WEAPON_DEFAULTS.RIFLE.reloadTime,
        WEAPON_DEFAULTS.RIFLE.spread
      ),
    ];
  }
}
