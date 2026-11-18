// Pedestrians and Bystander AI System for Nightfall City: Vela Bay
// Manages sidewalk strolls, fleeing behaviors during gunfire or vehicle impacts, and cash drops.

import { world } from './world.js';
import { audio } from './audio.js';
import { particles } from './effects.js';
import { CONFIG } from './config.js';

const PEDESTRIAN_COLLISION_RADIUS = 0.65;

export class PedestrianManager {
  constructor() {
    this.pedestrians = [];
    this.maxPeds = CONFIG.gameplay.pedestrianMaxCount;
    this.cashPickups = [];

    // Warm coastal casual summer attire palette
    this.outfits = [
      { shirt: [0.92, 0.28, 0.24], pants: [0.18, 0.22, 0.36] }, // Coral polo & navy chinos
      { shirt: [0.22, 0.65, 0.88], pants: [0.88, 0.86, 0.82] }, // Cyan coastal linen & beige shorts
      { shirt: [0.96, 0.82, 0.18], pants: [0.22, 0.22, 0.24] }, // Golden tee & dark slacks
      { shirt: [0.24, 0.82, 0.48], pants: [0.32, 0.28, 0.22] }, // Palm green shirt & khaki
      { shirt: [0.94, 0.94, 0.96], pants: [0.12, 0.14, 0.18] }, // Crisp white linen & trousers
      { shirt: [0.96, 0.48, 0.72], pants: [0.22, 0.42, 0.72] }, // Pastel magenta & denim
      { shirt: [0.32, 0.35, 0.40], pants: [0.18, 0.18, 0.20] }, // Slate jacket & dark denim
      { shirt: [0.88, 0.42, 0.18], pants: [0.24, 0.24, 0.26] }, // Sunset rust & charcoal trousers
      { shirt: [0.15, 0.55, 0.52], pants: [0.85, 0.82, 0.78] }, // Seafoam teal & white linen
    ];

    this.sheltersInitialized = false;
    this.parkInitialized = false;
    this.foodCartsInitialized = false;
    this.locked = false; // When true, ambient spawning is paused for composed screenshot capture
  }

  initFoodCartQueues() {
    if (this.foodCartsInitialized || !world.streetFoodCarts) return;
    this.foodCartsInitialized = true;
    for (const cart of world.streetFoodCarts) {
      // 2 customers queued up at each food cart
      for (let k = 1; k <= 2; k++) {
        const offset = k * 1.3;
        const sa = Math.sin(cart.angle);
        const ca = Math.cos(cart.angle);
        const px = cart.x - sa * offset;
        const pz = cart.z - ca * offset;
        const outfit = this.outfits[Math.floor(Math.random() * this.outfits.length)];
        this.pedestrians.push({
          x: px,
          z: pz,
          heading: cart.angle,
          speed: 0,
          health: 40,
          alive: true,
          isFleeing: false,
          fleeTimer: 0,
          isWaiting: true,
          animTime: Math.random() * 5,
          outfit,
          isVehicle: false,
        });
      }
    }
  }

  initShelterWaiting() {
    if (this.sheltersInitialized || !world.busShelters) return;
    this.sheltersInitialized = true;
    for (const shelter of world.busShelters) {
      // 1 to 2 passengers waiting patiently under each glass bus canopy
      const count = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < count; k++) {
        const offset = (k - 0.5) * 1.1;
        const sa = Math.sin(shelter.angle);
        const ca = Math.cos(shelter.angle);
        const px = shelter.x - ca * offset;
        const pz = shelter.z + sa * offset;
        const outfit = this.outfits[Math.floor(Math.random() * this.outfits.length)];
        this.pedestrians.push({
          x: px,
          z: pz,
          heading: shelter.angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.4,
          speed: 0,
          health: 40,
          alive: true,
          isFleeing: false,
          fleeTimer: 0,
          isWaiting: true,
          animTime: Math.random() * 5,
          outfit,
          isVehicle: false,
        });
      }
    }
  }

  initParkStrollers() {
    if (this.parkInitialized || !world.park) return;
    this.parkInitialized = true;
    const park = world.park;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 5 + Math.random() * 12;
      const px = park.x + Math.cos(angle) * dist;
      const pz = park.z + Math.sin(angle) * dist;
      const outfit = this.outfits[Math.floor(Math.random() * this.outfits.length)];
      this.pedestrians.push({
        x: px,
        z: pz,
        heading: Math.random() * Math.PI * 2,
        speed: 1.1,
        health: 40,
        alive: true,
        isFleeing: false,
        fleeTimer: 0,
        isWaiting: false,
        animTime: Math.random() * 5,
        outfit,
        isParkStroller: true,
        isVehicle: false,
      });
    }
  }

  spawnPedestrian(nearX, nearZ) {
    if (this.locked || this.pedestrians.length >= this.maxPeds) return;

    // Pick a sidewalk coordinate near the player (radius 25m to 65m)
    const baseAngle = Math.random() * Math.PI * 2;
    const dist = 25 + Math.random() * 40;
    const px = nearX + Math.cos(baseAngle) * dist;
    const pz = nearZ + Math.sin(baseAngle) * dist;

    // Check not inside a building
    const col = world.checkCollision(px, pz, 0.6);
    if (col.collided) return;

    const groupHeading = Math.random() * Math.PI * 2;
    const groupSpeed = 1.7 + Math.random() * 0.5;
    // 35% chance to spawn in pairs/small walking groups
    const groupSize = Math.random() < 0.35 ? 2 : 1;

    for (let g = 0; g < groupSize; g++) {
      if (this.pedestrians.length >= this.maxPeds) break;
      const gx = px + (g === 1 ? -Math.cos(groupHeading) * 1.1 : 0);
      const gz = pz + (g === 1 ? Math.sin(groupHeading) * 1.1 : 0);
      const outfit = this.outfits[Math.floor(Math.random() * this.outfits.length)];
      this.pedestrians.push({
        x: gx,
        z: gz,
        heading: groupHeading,
        speed: groupSpeed,
        health: 40,
        alive: true,
        isFleeing: false,
        fleeTimer: 0,
        isWaiting: false,
        animTime: Math.random() * 10,
        outfit,
        isVehicle: false,
      });
    }
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
    this.initShelterWaiting();
    this.initParkStrollers();
    this.initFoodCartQueues();

    // Populate around player
    if (this.pedestrians.length < this.maxPeds && Math.random() < dt * 4) {
      this.spawnPedestrian(player.x, player.z);
    }

    // React to sirens or reckless player
    const playerSpeed = player.inVehicle && player.vehicle ? Math.abs(player.vehicle.speed) : (player.isSprinting ? 5.5 : 0);

    // Update pedestrians
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const p = this.pedestrians[i];
      const distToPlayer = Math.hypot(p.x - player.x, p.z - player.z);

      if (distToPlayer > 180 && !p.isWaiting) {
        this.pedestrians.splice(i, 1);
        continue;
      }

      if (!p.alive) continue;

      // Flinch or sidestep if high-speed vehicle or sprinting player brushes past
      if (!p.isWaiting && distToPlayer < (player.inVehicle ? 7.0 : 2.0) && playerSpeed > 4.5 && !p.isFleeing) {
        p.heading = Math.atan2(p.x - player.x, p.z - player.z) + (Math.random() - 0.5) * 0.4;
        p.speed = 3.6;
      }

      if (p.isFleeing) {
        p.isWaiting = false;
        p.fleeTimer -= dt;
        if (p.fleeTimer <= 0) p.isFleeing = false;
        p.speed = 4.8;
      } else if (p.isWaiting) {
        p.speed = 0;
      } else {
        p.speed = 1.6;
        // Occasionally wander
        if (Math.random() < dt * 0.4) {
          p.heading += (Math.random() - 0.5) * 1.5;
        }
      }

      p.animTime += dt * (p.isFleeing ? 12 : (p.isWaiting ? 0.8 : 5));

      // Advance pedestrian
      if (p.speed > 0) {
        const vx = Math.sin(p.heading) * p.speed * dt;
        const vz = Math.cos(p.heading) * p.speed * dt;
        p.x += vx;
        p.z += vz;
      }

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

  // Returns count of active alive pedestrians currently roaming the city
  getActiveCount() {
    return this.pedestrians.filter((p) => p.alive).length;
  }
}

export const pedestrians = new PedestrianManager();
