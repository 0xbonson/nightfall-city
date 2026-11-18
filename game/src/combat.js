/**
 * Nightfall City: Vela Bay - Combat Engine, Ballistics & Enemies
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { WEAPONS } from './config.js';

export class Bullet {
  constructor(x, y, z, dx, dy, dz, damage, speed = 190, range = 80, isEnemy = false) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.dx = dx;
    this.dy = dy;
    this.dz = dz;
    this.damage = damage;
    this.speed = speed;
    this.distRemaining = range;
    this.isEnemy = isEnemy;
    this.alive = true;
  }

  update(dt, world, player, enemies, pedestrians, vehicles) {
    if (!this.alive) return;

    const step = this.speed * dt;
    this.distRemaining -= step;
    if (this.distRemaining <= 0) {
      this.alive = false;
      return;
    }

    const nextX = this.x + this.dx * step;
    const nextY = this.y + this.dy * step;
    const nextZ = this.z + this.dz * step;

    // Check hit on player
    if (this.isEnemy && player.alive) {
      const d = Math.hypot(nextX - player.x, nextZ - player.z);
      if (d < 0.65 && Math.abs(nextY - (player.y + 1.0)) < 1.0) {
        player.takeDamage(this.damage);
        this.alive = false;
        return;
      }
    }

    // Check hit on enemies
    if (!this.isEnemy) {
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (!en.alive) continue;
        const d = Math.hypot(nextX - en.x, nextZ - en.z);
        if (d < 0.65 && Math.abs(nextY - (en.y + 1.0)) < 1.0) {
          en.takeDamage(this.damage);
          this.alive = false;
          return;
        }
      }

      // Check hit on pedestrians
      for (let i = 0; i < pedestrians.pedestrians.length; i++) {
        const ped = pedestrians.pedestrians[i];
        if (!ped.alive) continue;
        const d = Math.hypot(nextX - ped.x, nextZ - ped.z);
        if (d < 0.65 && Math.abs(nextY - (ped.y + 1.0)) < 1.0) {
          ped.takeDamage(this.damage);
          this.alive = false;
          return;
        }
      }
    }

    // Check hit on vehicles
    for (let i = 0; i < vehicles.vehicles.length; i++) {
      const v = vehicles.vehicles[i];
      const d = Math.hypot(nextX - v.x, nextZ - v.z);
      if (d < v.spec.length * 0.45 && Math.abs(nextY - (v.y + 0.6)) < 1.0) {
        v.takeDamage(this.damage);
        this.alive = false;
        return;
      }
    }

    // Check hit on static world buildings
    const col = world.checkCollision(nextX, nextZ, 0.2);
    if (col.collided) {
      this.alive = false;
      return;
    }

    this.x = nextX;
    this.y = nextY;
    this.z = nextZ;
  }
}

export class Enemy {
  constructor(x, y, z, rotY = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotY = rotY;
    this.health = 45;
    this.alive = true;
    this.fireTimer = 0.5 + Math.random() * 1.5;
    this.walkCycle = 0;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  update(dt, player, combat) {
    if (!this.alive || !player.alive) return;

    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const dist = Math.hypot(dx, dz);

    // Aim towards player
    this.rotY = Math.atan2(dx, dz);

    // Shoot if player is within range
    if (dist < 45.0) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = 0.8 + Math.random() * 0.6;
        combat.spawnBullet(this.x, this.y + 1.3, this.z, dx / dist, 0, dz / dist, 14, 180, 50, true);
      }
    }
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

    // Syndicate enforcer in dark tactical vest and dark pants
    const vestCol = [0.12, 0.14, 0.18, 1.0];
    const pantsCol = [0.22, 0.22, 0.24, 1.0];
    const skinCol = [0.82, 0.65, 0.52, 1.0];

    // Torso
    addBoxLocal(0, 1.25, 0, 0.52, 0.65, 0.32, vestCol);
    // Head
    addBoxLocal(0, 1.72, 0, 0.26, 0.28, 0.26, skinCol);
    // Legs
    addBoxLocal(-0.15, 0.48, 0, 0.20, 0.85, 0.22, pantsCol);
    addBoxLocal(0.15, 0.48, 0, 0.20, 0.85, 0.22, pantsCol);
    // Weapon in hands
    addBoxLocal(0.25, 1.2, 0.35, 0.10, 0.14, 0.65, [0.15, 0.15, 0.15, 1.0]);
  }
}

export class CombatSystem {
  constructor() {
    this.bullets = [];
    this.enemies = [];
    this.explosions = []; // { x, y, z, radius, life, maxLife }
    this.muzzleFlashes = [];
  }

  initDocksEnemies() {
    // Spawn 5 Syndicate enforcers at Meridian Docks Container Yard
    const enemySpawns = [
      { x: 135, z: 105 },
      { x: 148, z: 120 },
      { x: 140, z: 145 },
      { x: 155, z: 130 },
      { x: 162, z: 110 },
    ];

    for (const sp of enemySpawns) {
      this.enemies.push(new Enemy(sp.x, 0, sp.z, 0));
    }
  }

  spawnEnemy(x, y, z, rotY = 0) {
    const enemy = new Enemy(x, y, z, rotY);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnBullet(x, y, z, dx, dy, dz, damage, speed, range, isEnemy = false) {
    this.bullets.push(new Bullet(x, y, z, dx, dy, dz, damage, speed, range, isEnemy));
  }

  triggerExplosion(x, y, z, radius = 6.0, damage = 80) {
    this.explosions.push({
      x, y, z,
      radius,
      damage,
      life: 0.65,
      maxLife: 0.65,
    });
  }

  update(dt, world, player, pedestrians, vehicles, police, camera, audio) {
    // 1. Update active bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt, world, player, this.enemies, pedestrians, vehicles);
      if (!b.alive) {
        this.bullets.splice(i, 1);
      }
    }

    // 2. Update enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(dt, player, this);
    }

    // 3. Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.life -= dt;
      if (ex.life <= 0) {
        this.explosions.splice(i, 1);
      } else if (ex.life > ex.maxLife - dt * 2) {
        // Shockwave camera shake
        if (camera) camera.shake(1.2, 0.4);
        if (audio) audio.playExplosion();

        // Inflict blast damage
        const dP = Math.hypot(player.x - ex.x, player.z - ex.z);
        if (dP < ex.radius) player.takeDamage(ex.damage * (1 - dP / ex.radius));

        // Damage vehicles
        for (let v = 0; v < vehicles.vehicles.length; v++) {
          const veh = vehicles.vehicles[v];
          const dV = Math.hypot(veh.x - ex.x, veh.z - ex.z);
          if (dV < ex.radius) veh.takeDamage(ex.damage * (1 - dV / ex.radius));
        }
      }
    }

    // 4. Update muzzle flashes
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      this.muzzleFlashes[i].life -= dt;
      if (this.muzzleFlashes[i].life <= 0) {
        this.muzzleFlashes.splice(i, 1);
      }
    }
  }

  playerShoot(player, camera, police, audio) {
    if (!player.alive || player.inVehicle) return;

    const wep = WEAPONS[player.currentWeapon];
    const ammoState = player.ammo[player.currentWeapon];
    const now = performance.now() * 0.001;

    if (now - player.lastFireTime < wep.fireInterval) return;
    if (ammoState.clip <= 0) return;

    player.lastFireTime = now;
    ammoState.clip--;

    if (audio) audio.playGunshot(player.currentWeapon);
    if (camera) camera.shake(0.18, 0.12);

    // Shoot in direction player is looking
    const spread = (Math.random() - 0.5) * wep.spread;
    const shootAngle = player.rotY + spread;
    const dx = Math.sin(shootAngle);
    const dz = Math.cos(shootAngle);
    const dy = -camera.pitch * 0.4;

    this.spawnBullet(
      player.x + dx * 0.8,
      player.y + 1.4,
      player.z + dz * 0.8,
      dx, dy, dz,
      wep.damage,
      wep.tracerSpeed,
      wep.range,
      false
    );

    // Muzzle flash particle
    this.muzzleFlashes.push({
      x: player.x + dx * 0.8,
      y: player.y + 1.4,
      z: player.z + dz * 0.8,
      life: 0.06,
    });

    // Alert police if weapon discharged
    police.addCrime('gunfire');
  }

  buildMesh(positions, normals, colors, uvs) {
    // 1. Draw enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].buildMesh(positions, normals, colors, uvs);
    }

    // 2. Draw bullet tracer lines
    const tracerColor = [1.0, 0.92, 0.35, 1.0];
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      const tLen = 1.6;
      const x0 = b.x - b.dx * tLen;
      const y0 = b.y - b.dy * tLen;
      const z0 = b.z - b.dz * tLen;

      // Small quad for tracer
      const pts = [
        [x0, y0 - 0.05, z0],
        [b.x, b.y - 0.05, b.z],
        [b.x, b.y + 0.05, b.z],
        [x0, y0 - 0.05, z0],
        [b.x, b.y + 0.05, b.z],
        [x0, y0 + 0.05, z0],
      ];
      for (let p = 0; p < 6; p++) {
        positions.push(pts[p][0], pts[p][1], pts[p][2]);
        normals.push(0, 1, 0);
        colors.push(tracerColor[0], tracerColor[1], tracerColor[2], 1.0);
        uvs.push(0, 0);
      }
    }

    // 3. Draw explosion fireballs
    for (let i = 0; i < this.explosions.length; i++) {
      const ex = this.explosions[i];
      const progress = 1.0 - (ex.life / ex.maxLife);
      const r = ex.radius * Math.sin(progress * Math.PI);
      const orangeFire = [1.0, 0.55 - progress * 0.4, 0.05, 0.9];

      // Draw expanding fireball box
      const pts = [
        [ex.x - r, ex.y + r * 1.5, ex.z - r],
        [ex.x + r, ex.y + r * 1.5, ex.z - r],
        [ex.x + r, ex.y + r * 1.5, ex.z + r],
        [ex.x - r, ex.y + r * 1.5, ex.z - r],
        [ex.x + r, ex.y + r * 1.5, ex.z + r],
        [ex.x - r, ex.y + r * 1.5, ex.z + r],
      ];
      for (let p = 0; p < 6; p++) {
        positions.push(pts[p][0], pts[p][1], pts[p][2]);
        normals.push(0, 1, 0);
        colors.push(orangeFire[0], orangeFire[1], orangeFire[2], orangeFire[3]);
        uvs.push(0, 0);
      }
    }
  }
}
