/**
 * Nightfall City: Vela Bay - Combat Engine, Ballistics, Explosives & Tactical AI
 * Implements glowing multi-caliber tracers, muzzle flash bursts, blood/spark/dust particle dynamics,
 * shotgun pellet fan spread, collectible contraband cash drops, and hostile Syndicate enforcer AI.
 * Authored for make.fun GTA-inspired open-world entry.
 */

import { WEAPONS } from './config.js';

export class CashDrop {
  constructor(x, y, z, amount = 50) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.amount = amount;
    this.alive = true;
    this.bobTimer = Math.random() * Math.PI * 2;
  }

  update(dt, player, audio) {
    if (!this.alive) return;
    this.bobTimer += dt * 3.5;
    const dist = Math.hypot(this.x - player.x, this.z - player.z);
    if (dist < 1.4 && Math.abs(this.y - player.y) < 2.0) {
      player.addMoney(this.amount);
      if (audio) audio.playCashChime();
      this.alive = false;
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.alive) return;
    const yOff = Math.sin(this.bobTimer) * 0.12 + 0.18;
    const cx = this.x;
    const cy = this.y + yOff;
    const cz = this.z;

    // Green currency stack mesh with white paper band
    const rot = this.bobTimer * 1.5;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    const w = 0.22, h = 0.08, d = 0.12;

    const corners = [
      [-w, -h, -d], [w, -h, -d], [w, -h, d], [-w, -h, d],
      [-w,  h, -d], [w,  h, -d], [w,  h, d], [-w,  h, d],
    ];

    const rotCorners = corners.map(([x, y, z]) => [
      cx + x * cosR + z * sinR,
      cy + y,
      cz - x * sinR + z * cosR,
    ]);

    const faces = [
      [4, 5, 6, 7, [0, 1, 0]],
      [3, 2, 1, 0, [0, -1, 0]],
      [7, 6, 2, 3, [sinR, 0, cosR]],
      [5, 4, 0, 1, [-sinR, 0, -cosR]],
      [6, 5, 1, 2, [cosR, 0, -sinR]],
      [4, 7, 3, 0, [-cosR, 0, sinR]],
    ];

    const col = [0.22, 0.72, 0.38, 1.0]; // Mint cash green
    for (const [i1, i2, i3, i4, norm] of faces) {
      const p1 = rotCorners[i1], p2 = rotCorners[i2], p3 = rotCorners[i3], p4 = rotCorners[i4];
      const pts = [p1, p2, p3, p1, p3, p4];
      for (let p = 0; p < 6; p++) {
        positions.push(pts[p][0], pts[p][1], pts[p][2]);
        normals.push(norm[0], norm[1], norm[2]);
        colors.push(col[0], col[1], col[2], col[3]);
        uvs.push(0, 0);
      }
    }
  }
}

export class Bullet {
  constructor(x, y, z, dx, dy, dz, damage, speed = 190, range = 85, isEnemy = false) {
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

  update(dt, world, player, enemies, pedestrians, vehicles, combat) {
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

    // Hit check against player
    if (this.isEnemy && player.alive) {
      const d = Math.hypot(nextX - player.x, nextZ - player.z);
      if (d < 0.65 && Math.abs(nextY - (player.y + 1.0)) < 1.1) {
        player.takeDamage(this.damage);
        combat.spawnImpactParticles(nextX, nextY, nextZ, [0.85, 0.15, 0.15]);
        this.alive = false;
        return;
      }
    }

    // Hit check against hostile syndicate enemies
    if (!this.isEnemy) {
      for (let i = 0; i < enemies.length; i++) {
        const en = enemies[i];
        if (!en.alive) continue;
        const d = Math.hypot(nextX - en.x, nextZ - en.z);
        if (d < 0.65 && Math.abs(nextY - (en.y + 1.0)) < 1.1) {
          en.takeDamage(this.damage, combat);
          combat.spawnImpactParticles(nextX, nextY, nextZ, [0.85, 0.15, 0.15]);
          this.alive = false;
          return;
        }
      }

      // Hit check against pedestrians
      for (let i = 0; i < pedestrians.pedestrians.length; i++) {
        const ped = pedestrians.pedestrians[i];
        if (!ped.alive) continue;
        const d = Math.hypot(nextX - ped.x, nextZ - ped.z);
        if (d < 0.65 && Math.abs(nextY - (ped.y + 1.0)) < 1.1) {
          ped.takeDamage(this.damage, combat);
          combat.spawnImpactParticles(nextX, nextY, nextZ, [0.85, 0.15, 0.15]);
          this.alive = false;
          return;
        }
      }
    }

    // Hit check against vehicles
    for (let i = 0; i < vehicles.vehicles.length; i++) {
      const v = vehicles.vehicles[i];
      const d = Math.hypot(nextX - v.x, nextZ - v.z);
      if (d < v.spec.length * 0.45 && Math.abs(nextY - (v.y + 0.6)) < 1.1) {
        v.takeDamage(this.damage);
        combat.spawnImpactParticles(nextX, nextY, nextZ, [0.95, 0.85, 0.25]); // Sparks
        this.alive = false;
        return;
      }
    }

    // Hit check against static buildings and obstacles
    const col = world.checkCollision(nextX, nextZ, 0.2);
    if (col.collided) {
      combat.spawnImpactParticles(nextX, nextY, nextZ, [0.85, 0.82, 0.78]); // Concrete dust
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

    this.health = 70;
    this.alive = true;
    this.shootTimer = 1.0 + Math.random() * 1.5;
    this.weapon = 'carbine';
  }

  takeDamage(amount, combat) {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      if (combat) {
        combat.spawnCashDrop(this.x, this.y, this.z, Math.floor(80 + Math.random() * 140));
      }
    }
  }

  update(dt, player, combat, audio) {
    if (!this.alive) return;

    // Target player orientation
    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const dist = Math.hypot(dx, dz);
    this.rotY = Math.atan2(dx, dz);

    // Suppressive fire when player is detected within tactical perimeter
    if (dist < 58.0 && player.alive) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 1.2 + Math.random() * 0.9;

        const dirX = dx / dist;
        const dirY = (player.y + 1.2 - (this.y + 1.2)) / dist;
        const dirZ = dz / dist;

        const sp = 0.045;
        const fx = dirX + (Math.random() - 0.5) * sp;
        const fy = dirY + (Math.random() - 0.5) * sp;
        const fz = dirZ + (Math.random() - 0.5) * sp;

        combat.bullets.push(new Bullet(this.x, this.y + 1.2, this.z, fx, fy, fz, 18, 180, 80, true));
        if (audio) audio.playGunshot('carbine');
      }
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.alive) return;

    const x = this.x;
    const y = this.y;
    const z = this.z;
    const rot = this.rotY;

    const sinRot = Math.sin(rot);
    const cosRot = Math.cos(rot);

    // Syndicate Enforcer Tactical Uniform (Black armor vest, crimson shirt, dark cargo pants)
    const vestCol = [0.12, 0.13, 0.15, 1.0];
    const shirtCol = [0.65, 0.16, 0.20, 1.0];
    const pantsCol = [0.18, 0.20, 0.22, 1.0];
    const skinCol = [0.82, 0.65, 0.52, 1.0];

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
        [4, 5, 6, 7, [0, 1, 0]],
        [3, 2, 1, 0, [0, -1, 0]],
        [7, 6, 2, 3, [sinRot, 0, cosRot]],
        [5, 4, 0, 1, [-sinRot, 0, -cosRot]],
        [6, 5, 1, 2, [cosRot, 0, -sinRot]],
        [4, 7, 3, 0, [-cosRot, 0, sinRot]],
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

    // Tactical combat posture
    addBoxRot(-0.14, y, 0, 0.18, 0.72, 0.18, pantsCol);
    addBoxRot(0.14, y, 0, 0.18, 0.72, 0.18, pantsCol);

    // Torso with tactical vest
    addBoxRot(0, y + 0.72, 0, 0.46, 0.68, 0.26, shirtCol);
    addBoxRot(0, y + 0.78, 0, 0.48, 0.55, 0.28, vestCol);

    // Arms in ready aim
    addBoxRot(-0.28, y + 0.85, 0.18, 0.14, 0.55, 0.14, shirtCol);
    addBoxRot(0.28, y + 0.85, 0.18, 0.14, 0.55, 0.14, shirtCol);

    // Head with sunglasses / comm headset
    addBoxRot(0, y + 1.42, 0, 0.28, 0.28, 0.28, skinCol);

    // Tactical Carbine barrel
    addBoxRot(0.18, y + 1.15, 0.32, 0.09, 0.13, 0.68, [0.1, 0.1, 0.1, 1.0]);
  }
}

export class Explosion {
  constructor(x, y, z, maxRadius = 6.8) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.maxRadius = maxRadius;
    this.radius = 0.5;
    this.duration = 0.7;
    this.timer = 0;
    this.alive = true;
  }

  update(dt) {
    this.timer += dt;
    const progress = this.timer / this.duration;
    if (progress >= 1.0) {
      this.alive = false;
      return;
    }
    this.radius = Math.sin(progress * Math.PI * 0.5) * this.maxRadius;
  }

  buildMesh(positions, normals, colors, uvs) {
    if (!this.alive) return;
    const progress = this.timer / this.duration;
    const alpha = (1.0 - progress) * 0.95;

    const col = [1.8, 0.85 * (1.0 - progress), 0.12, alpha];
    const r = this.radius;

    const latBands = 6;
    const lonBands = 8;

    for (let lat = 0; lat < latBands; lat++) {
      const theta1 = (lat * Math.PI) / latBands;
      const theta2 = ((lat + 1) * Math.PI) / latBands;

      for (let lon = 0; lon < lonBands; lon++) {
        const phi1 = (lon * 2 * Math.PI) / lonBands;
        const phi2 = ((lon + 1) * 2 * Math.PI) / lonBands;

        const getPt = (th, ph) => [
          this.x + r * Math.sin(th) * Math.cos(ph),
          this.y + r * Math.cos(th),
          this.z + r * Math.sin(th) * Math.sin(ph),
        ];

        const p1 = getPt(theta1, phi1);
        const p2 = getPt(theta2, phi1);
        const p3 = getPt(theta2, phi2);
        const p4 = getPt(theta1, phi2);

        const pts = [p1, p2, p3, p1, p3, p4];
        for (const pt of pts) {
          positions.push(pt[0], pt[1], pt[2]);
          normals.push(0, 1, 0);
          colors.push(col[0], col[1], col[2], col[3]);
          uvs.push(0, 0);
        }
      }
    }
  }
}

export class CombatSystem {
  constructor() {
    this.bullets = [];
    this.enemies = [];
    this.explosions = [];
    this.particles = [];
    this.cashDrops = [];
  }

  initDocksEnemies() {
    // Syndicate enforcers guarding Pier 7 contraband shipping containers
    this.spawnEnemy(145.0, 0, 118.0, Math.PI * 0.85);
    this.spawnEnemy(155.0, 0, 128.0, Math.PI * 0.75);
    this.spawnEnemy(162.0, 0, 142.0, Math.PI * 0.95);
    this.spawnEnemy(138.0, 0, 125.0, Math.PI * 0.65);
  }

  spawnEnemy(x, y, z, rot = 0) {
    const en = new Enemy(x, y, z, rot);
    this.enemies.push(en);
    return en;
  }

  spawnExplosion(x, y, z, radius = 6.8) {
    this.explosions.push(new Explosion(x, y, z, radius));
  }

  spawnCashDrop(x, y, z, amount = 75) {
    this.cashDrops.push(new CashDrop(x, y, z, amount));
  }

  spawnImpactParticles(x, y, z, color) {
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x, y, z,
        vx: (Math.random() - 0.5) * 5.5,
        vy: Math.random() * 4.2 + 1.2,
        vz: (Math.random() - 0.5) * 5.5,
        color,
        life: 0.38,
        maxLife: 0.38,
      });
    }
  }

  playerShoot(player, camera, police, audio) {
    const now = performance.now() * 0.001;
    const wep = WEAPONS[player.currentWeapon];
    if (!wep) return;
    if (now - player.lastFireTime < wep.fireInterval) return;
    if (player.isReloading) return;

    const ammo = player.ammo[player.currentWeapon];
    if (ammo.clip <= 0) {
      if (ammo.reserve > 0) {
        player.isReloading = true;
        player.reloadTimer = wep.reloadTime;
        if (audio) audio.playReload();
      }
      return;
    }

    ammo.clip--;
    player.lastFireTime = now;

    const fwdX = Math.sin(player.rotY);
    const fwdZ = Math.cos(player.rotY);
    const startX = player.x + fwdX * 0.5;
    const startY = player.y + 1.25;
    const startZ = player.z + fwdZ * 0.5;

    // Shotgun shoots 6 pellets; other weapons shoot single high-velocity tracer
    const pelletCount = player.currentWeapon === 'shotgun' ? 6 : 1;
    for (let p = 0; p < pelletCount; p++) {
      const sp = wep.spread;
      const dx = fwdX + (Math.random() - 0.5) * sp;
      const dy = (Math.random() - 0.5) * sp * 0.5;
      const dz = fwdZ + (Math.random() - 0.5) * sp;
      this.bullets.push(new Bullet(startX, startY, startZ, dx, dy, dz, wep.damage, wep.tracerSpeed, wep.range, false));
    }

    if (audio) audio.playGunshot(player.currentWeapon);
    if (camera) camera.shake(wep.recoil || 0.25, 0.16);

    police.addCrime('gunfire');
  }

  update(dt, world, player, pedestrians, vehicles, police, camera, audio) {
    // Update bullets
    for (let i = 0; i < this.bullets.length; i++) {
      this.bullets[i].update(dt, world, player, this.enemies, pedestrians, vehicles, this);
    }
    this.bullets = this.bullets.filter((b) => b.alive);

    // Update enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].update(dt, player, this, audio);
    }

    // Update explosions
    for (let i = 0; i < this.explosions.length; i++) {
      const exp = this.explosions[i];
      exp.update(dt);

      if (player.alive && Math.hypot(player.x - exp.x, player.z - exp.z) < exp.radius) {
        player.takeDamage(48 * dt * 4);
      }
      for (let j = 0; j < this.enemies.length; j++) {
        const en = this.enemies[j];
        if (en.alive && Math.hypot(en.x - exp.x, en.z - exp.z) < exp.radius) {
          en.takeDamage(65 * dt * 4, this);
        }
      }
    }
    this.explosions = this.explosions.filter((e) => e.alive);

    // Update particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    // Update collectible cash drops
    for (let i = 0; i < this.cashDrops.length; i++) {
      this.cashDrops[i].update(dt, player, audio);
    }
    this.cashDrops = this.cashDrops.filter((c) => c.alive);
  }

  buildMesh(positions, normals, colors, uvs) {
    // 1. Bullets (Glowing Golden-Orange Tracers)
    const tracerCol = [1.8, 1.25, 0.28, 1.0];
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      const tLen = 1.6;
      const x1 = b.x, y1 = b.y, z1 = b.z;
      const x2 = b.x - b.dx * tLen, y2 = b.y - b.dy * tLen, z2 = b.z - b.dz * tLen;

      const w = 0.08;
      positions.push(x1 - w, y1, z1, x1 + w, y1, z1, x2 + w, y2, z2);
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      colors.push(tracerCol[0], tracerCol[1], tracerCol[2], tracerCol[3]);
      colors.push(tracerCol[0], tracerCol[1], tracerCol[2], tracerCol[3]);
      colors.push(tracerCol[0], tracerCol[1], tracerCol[2], tracerCol[3]);
      uvs.push(0, 0, 1, 0, 1, 1);

      positions.push(x1 - w, y1, z1, x2 + w, y2, z2, x2 - w, y2, z2);
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      colors.push(tracerCol[0], tracerCol[1], tracerCol[2], tracerCol[3]);
      colors.push(tracerCol[0], tracerCol[1], tracerCol[2], tracerCol[3]);
      colors.push(tracerCol[0], tracerCol[1], tracerCol[2], tracerCol[3]);
      uvs.push(0, 0, 1, 1, 0, 1);
    }

    // 2. Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].buildMesh(positions, normals, colors, uvs);
    }

    // 3. Explosions
    for (let i = 0; i < this.explosions.length; i++) {
      this.explosions[i].buildMesh(positions, normals, colors, uvs);
    }

    // 4. Collectible cash drops
    for (let i = 0; i < this.cashDrops.length; i++) {
      this.cashDrops[i].buildMesh(positions, normals, colors, uvs);
    }

    // 5. Impact particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const s = 0.08;
      const c = p.color;
      positions.push(p.x - s, p.y - s, p.z, p.x + s, p.y - s, p.z, p.x + s, p.y + s, p.z);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      colors.push(c[0], c[1], c[2], 1.0, c[0], c[1], c[2], 1.0, c[0], c[1], c[2], 1.0);
      uvs.push(0, 0, 1, 0, 1, 1);
    }
  }
}
