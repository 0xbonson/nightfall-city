// Pedestrians and Bystander AI System for Nightfall City

import { world } from './world.js';
import { audio } from './audio.js';
import { particles } from './effects.js';

export class PedestrianManager {
  constructor() {
    this.pedestrians = [];
    this.maxPeds = 28;
    this.cashPickups = [];

    this.outfits = [
      { shirt: [0.9, 0.2, 0.2], pants: [0.15, 0.2, 0.35] },
      { shirt: [0.2, 0.6, 0.85], pants: [0.85, 0.85, 0.8] },
      { shirt: [0.95, 0.85, 0.2], pants: [0.2, 0.2, 0.2] },
      { shirt: [0.2, 0.8, 0.4], pants: [0.3, 0.25, 0.2] },
      { shirt: [0.85, 0.85, 0.9], pants: [0.1, 0.1, 0.15] },
      { shirt: [0.95, 0.45, 0.7], pants: [0.2, 0.4, 0.7] },
      { shirt: [0.3, 0.3, 0.35], pants: [0.15, 0.15, 0.18] },
    ];
  }

  spawnPedestrian(nearX, nearZ) {
    if (this.pedestrians.length >= this.maxPeds) return;

    // Pick a sidewalk coordinate near the player (radius 30m to 70m)
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 45;
    const px = nearX + Math.cos(angle) * dist;
    const pz = nearZ + Math.sin(angle) * dist;

    // Check not inside a building
    const col = world.checkCollision(px, pz, 0.6);
    if (col.collided) return;

    const outfit = this.outfits[Math.floor(Math.random() * this.outfits.length)];
    this.pedestrians.push({
      x: px,
      z: pz,
      heading: Math.random() * Math.PI * 2,
      speed: 1.8 + Math.random() * 0.8,
      health: 40,
      alive: true,
      isFleeing: false,
      fleeTimer: 0,
      animTime: Math.random() * 10,
      outfit,
      isVehicle: false,
    });
  }

  takeDamage(ped, damage, fromSource) {
    if (!ped.alive) return;
    ped.health -= damage;
    ped.isFleeing = true;
    ped.fleeTimer = 8.0;

    particles.emit('blood', ped.x, 1.0, ped.z, 6);

    if (ped.health <= 0) {
      ped.alive = false;
      // Drop cash pickup
      const dropAmount = 25 + Math.floor(Math.random() * 75);
      this.cashPickups.push({
        x: ped.x,
        z: ped.z,
        amount: dropAmount,
        collected: false,
      });
    }
  }

  alertNearby(x, z, radius = 35) {
    for (const ped of this.pedestrians) {
      if (!ped.alive) continue;
      const d = Math.hypot(ped.x - x, ped.z - z);
      if (d < radius) {
        ped.isFleeing = true;
        ped.fleeTimer = 6.0;
        ped.heading = Math.atan2(ped.x - x, ped.z - z); // Run away
      }
    }
  }

  update(dt, player, onCrime) {
    // Populate around player
    if (this.pedestrians.length < this.maxPeds && Math.random() < dt * 4) {
      this.spawnPedestrian(player.x, player.z);
    }

    // Update pedestrians
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      const distToPlayer = Math.hypot(p.x - player.x, p.z - player.z);

      if (distToPlayer > 180) {
        this.pedestrians.splice(i, 1);
        continue;
      }

      if (!p.alive) continue;

      if (p.isFleeing) {
        p.fleeTimer -= dt;
        if (p.fleeTimer <= 0) p.isFleeing = false;
        p.speed = 4.8;
      } else {
        p.speed = 1.6;
        // Occasionally wander
        if (Math.random() < dt * 0.4) {
          p.heading += (Math.random() - 0.5) * 1.5;
        }
      }

      p.animTime += dt * (p.isFleeing ? 12 : 5);

      // Advance pedestrian
      const vx = Math.sin(p.heading) * p.speed * dt;
      const vz = Math.cos(p.heading) * p.speed * dt;
      p.x += vx;
      p.z += vz;

      // Building collision
      const col = world.checkCollision(p.x, p.z, 0.45);
      if (col.collided) {
        p.x += col.pushX;
        p.z += col.pushZ;
        p.heading += Math.PI * 0.7; // Turn away from wall
      }

      // Check collision with player vehicle
      if (player.inVehicle && player.vehicle) {
        const v = player.vehicle;
        const vdist = Math.hypot(p.x - v.x, p.z - v.z);
        if (vdist < 2.2 && Math.abs(v.speed) > 4) {
          // Rammed pedestrian!
          const damage = Math.floor(Math.abs(v.speed) * 4);
          this.takeDamage(p, damage, { x: v.x, z: v.z });
          onCrime?.('hit_pedestrian');
          audio.playCrash(5);
        }
      }
    }

    // Cash pickups update
    for (let i = this.cashPickups.length - 1; i >= 0; i--) {
      const cp = this.cashPickups[i];
      const dist = Math.hypot(player.x - cp.x, player.z - cp.z);
      if (dist < 2.0 && !cp.collected) {
        cp.collected = true;
        player.addCash(cp.amount);
        this.cashPickups.splice(i, 1);
      }
    }
  }
}

export const pedestrians = new PedestrianManager();
