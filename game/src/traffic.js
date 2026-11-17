// Traffic and Vehicle Population System for Nightfall City

import { VehiclePhysics } from './physics.js';
import { audio } from './audio.js';
import { particles } from './effects.js';

export class TrafficManager {
  constructor() {
    this.vehicles = [];
    this.maxActive = 18;
    this.parkedVehicles = [];

    this.carColors = [
      [0.85, 0.15, 0.15], // Cherry red
      [0.15, 0.35, 0.85], // Cobalt blue
      [0.92, 0.75, 0.12], // Sunset gold
      [0.15, 0.75, 0.55], // Emerald teal
      [0.92, 0.92, 0.92], // Alpine white
      [0.15, 0.15, 0.18], // Shadow black
      [0.72, 0.35, 0.85], // Syndicate violet
      [0.88, 0.45, 0.12], // Tangelo orange
    ];

    this.initParkedVehicles();
  }

  initParkedVehicles() {
    const parkedSpots = [
      // Downtown Vela parking
      { x: 22, z: -40, angle: 1.57, type: 'sports', color: [0.85, 0.15, 0.15] },
      { x: 22, z: -55, angle: 1.57, type: 'sedan', color: [0.15, 0.35, 0.85] },
      { x: 92, z: -40, angle: 0, type: 'sports', color: [0.92, 0.75, 0.12] },
      { x: 92, z: -140, angle: 3.14, type: 'muscle', color: [0.15, 0.15, 0.18] },

      // Old Market Quarter
      { x: -70, z: -40, angle: 1.57, type: 'muscle', color: [0.72, 0.35, 0.85] }, // Vane Nero GT!
      { x: -130, z: -70, angle: 0, type: 'sedan', color: [0.88, 0.45, 0.12] },

      // Meridian Shipping Docks
      { x: 70, z: 40, angle: 0, type: 'truck', color: [0.45, 0.48, 0.52] },
      { x: 150, z: 70, angle: 1.57, type: 'truck', color: [0.25, 0.30, 0.35] },
      { x: 130, z: 130, angle: 0, type: 'muscle', color: [0.85, 0.15, 0.15] },

      // Ocean Promenade & Beach
      { x: -40, z: 25, angle: 1.57, type: 'sports', color: [0.15, 0.75, 0.55] },
      { x: -140, z: 25, angle: 1.57, type: 'taxi', color: [0.95, 0.82, 0.10] },
      { x: -210, z: 80, angle: 0, type: 'sports', color: [0.92, 0.92, 0.92] },
    ];

    for (const spot of parkedSpots) {
      const v = VehiclePhysics.createVehicle(spot.x, spot.z, spot.angle, spot.type);
      v.color = spot.color;
      v.isParked = true;
      v.isVehicle = true;
      this.vehicles.push(v);
    }
  }

  spawnTrafficCar(playerX, playerZ) {
    if (this.vehicles.length >= this.maxActive + 12) return;

    // Pick a road line away from player but within streaming distance (70 to 140m)
    const roads = [-220, -140, -60, 0, 60, 140, 220];
    const isEW = Math.random() > 0.5;
    const rCoord = roads[Math.floor(Math.random() * roads.length)];
    const offset = (Math.random() > 0.5 ? 1 : -1) * (70 + Math.random() * 60);

    let x, z, angle;
    if (isEW) {
      // East-West road
      z = rCoord + (offset > 0 ? 3.5 : -3.5); // Right hand lane
      x = playerX + offset;
      angle = offset > 0 ? -1.57 : 1.57;
    } else {
      // North-South road
      x = rCoord + (offset > 0 ? 3.5 : -3.5);
      z = playerZ + offset;
      angle = offset > 0 ? 3.14 : 0;
    }

    const types = ['sedan', 'sedan', 'taxi', 'sports', 'muscle', 'truck'];
    const type = types[Math.floor(Math.random() * types.length)];
    const v = VehiclePhysics.createVehicle(x, z, angle, type);
    v.color = type === 'taxi' ? [0.95, 0.82, 0.10] : this.carColors[Math.floor(Math.random() * this.carColors.length)];
    v.isTraffic = true;
    v.isVehicle = true;
    v.speed = 12 + Math.random() * 6;
    this.vehicles.push(v);
  }

  findNearbyVehicle(x, z, maxDist = 4.5) {
    let closest = null;
    let closestDist = maxDist;
    for (const v of this.vehicles) {
      if (v.wrecked) continue;
      const dist = Math.hypot(v.x - x, v.z - z);
      if (dist < closestDist) {
        closestDist = dist;
        closest = v;
      }
    }
    return closest;
  }

  update(dt, player, onCrime) {
    // Spawn traffic periodically around player
    if (Math.random() < dt * 1.5) {
      this.spawnTrafficCar(player.x, player.z);
    }

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v === player.vehicle) continue;

      const distToPlayer = Math.hypot(v.x - player.x, v.z - player.z);

      // Despawn traffic cars that are too far away (except parked cars or mission cars)
      if (v.isTraffic && distToPlayer > 220) {
        this.vehicles.splice(i, 1);
        continue;
      }

      if (v.wrecked) {
        particles.emit('smoke', v.x, 0.8, v.z, 1, { size: 0.5, up: 0.8 });
        continue;
      }

      if (v.isTraffic) {
        // AI driving forward along lane
        let desiredThrottle = 0.6;
        let obstacleAhead = false;

        // Ray ahead to check for other vehicles or player
        const checkDist = 12;
        const sinA = Math.sin(v.angle);
        const cosA = Math.cos(v.angle);
        const aheadX = v.x + sinA * checkDist;
        const aheadZ = v.z + cosA * checkDist;

        for (const other of this.vehicles) {
          if (other === v) continue;
          const odx = other.x - v.x;
          const odz = other.z - v.z;
          const proj = odx * sinA + odz * cosA;
          if (proj > 0 && proj < checkDist) {
            const lat = Math.abs(-odx * cosA + odz * sinA);
            if (lat < 2.5) {
              obstacleAhead = true;
              break;
            }
          }
        }

        // Check if player is directly ahead
        const pdx = player.x - v.x;
        const pdz = player.z - v.z;
        const pProj = pdx * sinA + pdz * cosA;
        if (pProj > 0 && pProj < checkDist) {
          const pLat = Math.abs(-pdx * cosA + pdz * sinA);
          if (pLat < 2.5) obstacleAhead = true;
        }

        if (obstacleAhead) {
          desiredThrottle = -0.6; // Brake
        }

        VehiclePhysics.updateVehicle(v, dt, {
          throttle: desiredThrottle,
          steer: 0,
          handbrake: false
        });
      }

      // Check collision with player vehicle
      if (player.inVehicle && player.vehicle && player.vehicle !== v) {
        const pv = player.vehicle;
        const cdx = v.x - pv.x;
        const cdz = v.z - pv.z;
        const cdist = Math.hypot(cdx, cdz);
        const minGap = (v.width + pv.width) * 0.7;
        if (cdist < minGap && cdist > 0.01) {
          const overlap = minGap - cdist;
          const nx = cdx / cdist;
          const nz = cdz / cdist;
          v.x += nx * overlap * 0.5;
          v.z += nz * overlap * 0.5;
          pv.x -= nx * overlap * 0.5;
          pv.z -= nz * overlap * 0.5;

          const relSpeed = Math.abs(pv.speed - v.speed);
          if (relSpeed > 5) {
            audio.playCrash(relSpeed);
            particles.emit('spark', (v.x + pv.x) / 2, 0.6, (v.z + pv.z) / 2, 8);
            if (v.isPolice) {
              onCrime?.('rammed_police');
            }
          }
        }
      }
    }
  }
}

export const traffic = new TrafficManager();
