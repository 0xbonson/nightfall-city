// Traffic and Vehicle Population System for Nightfall City: Vela Bay
// Simulates dynamic road cruising, civilian lane navigation, traffic light compliance, and curbside parked vehicles.

import { VehiclePhysics } from './physics.js';
import { world } from './world.js';
import { audio } from './audio.js';
import { particles } from './effects.js';
import { CONFIG } from './config.js';

export class TrafficManager {
  constructor() {
    this.vehicles = [];
    this.maxActive = CONFIG.gameplay.trafficMaxCount;
    this.parkedVehicles = [];

    // Vivid sun-soaked coastal vehicular palette
    this.carColors = [
      [0.85, 0.15, 0.15], // Cherry red
      [0.15, 0.35, 0.85], // Cobalt blue
      [0.92, 0.75, 0.12], // Sunset gold
      [0.15, 0.75, 0.55], // Emerald teal
      [0.92, 0.92, 0.92], // Alpine white
      [0.18, 0.18, 0.22], // Shadow graphite
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
    const roads = CONFIG.world.roadGrid;
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

    const types = ['sedan', 'sedan', 'taxi', 'taxi', 'sports', 'muscle', 'truck', 'bus'];
    const type = types[Math.floor(Math.random() * types.length)];
    const v = VehiclePhysics.createVehicle(x, z, angle, type);
    if (type === 'taxi') {
      v.color = [0.96, 0.82, 0.12]; // Golden yellow cab
    } else if (type === 'bus') {
      v.color = Math.random() > 0.5 ? [0.18, 0.52, 0.78] : [0.85, 0.42, 0.18]; // Transit blue or Metro copper
    } else if (type === 'truck') {
      v.color = [0.42, 0.45, 0.50]; // Freight industrial grey
    } else {
      v.color = this.carColors[Math.floor(Math.random() * this.carColors.length)];
    }
    v.isTraffic = true;
    v.isVehicle = true;
    v.speed = type === 'bus' ? 8 : (type === 'truck' ? 10 : 12 + Math.random() * 5);
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

        // Compliance with intersection traffic signals
        const isEW = Math.abs(sinA) > Math.abs(cosA);
        const roadGrid = CONFIG.world.roadGrid;
        let distToNextIntersection = 999;
        if (isEW) {
          const moveDir = sinA > 0 ? 1 : -1;
          for (const rx of roadGrid) {
            const d = (rx - v.x) * moveDir;
            if (d > 0 && d < distToNextIntersection) {
              distToNextIntersection = d;
            }
          }
        } else {
          const moveDir = cosA > 0 ? 1 : -1;
          for (const rz of roadGrid) {
            const d = (rz - v.z) * moveDir;
            if (d > 0 && d < distToNextIntersection) {
              distToNextIntersection = d;
            }
          }
        }

        const signalColor = world.getTrafficLightColor(isEW ? 'ew' : 'ns');
        if ((signalColor === 'red' || (signalColor === 'amber' && distToNextIntersection > 8)) &&
            distToNextIntersection >= 6 && distToNextIntersection <= 20) {
          obstacleAhead = true;
        }

        // Turning at intersections
        let steerInput = 0;
        if (!v.isTurning && distToNextIntersection < 6 && distToNextIntersection > 1 && signalColor === 'green') {
          if (!v.lastTurnCheck || Date.now() - v.lastTurnCheck > 8000) {
            v.lastTurnCheck = Date.now();
            if (Math.random() < 0.35) { // 35% chance to turn at intersection
              v.isTurning = true;
              const turnDir = Math.random() < 0.5 ? -1 : 1; // left or right
              v.turnTargetAngle = v.angle + turnDir * (Math.PI * 0.5);
              v.turnTimer = 2.5;
            }
          }
        }

        if (v.isTurning) {
          v.turnTimer -= dt;
          const diff = v.turnTargetAngle - v.angle;
          steerInput = Math.max(-0.6, Math.min(0.6, diff * 2.0));
          if (Math.abs(diff) < 0.1 || v.turnTimer <= 0) {
            v.angle = v.turnTargetAngle;
            v.isTurning = false;
            steerInput = 0;
          }
        }

        if (obstacleAhead) {
          desiredThrottle = -0.7; // Brake smoothly at light or behind obstacle

          // Annoyed driver honk if blocked closely by player
          v.honkCooldown = (v.honkCooldown || (2 + Math.random() * 3)) - dt;
          if (v.honkCooldown <= 0 && distToPlayer < 18) {
            v.honkCooldown = 5.0 + Math.random() * 4.0;
            audio.playHorn();
          }
        }

        VehiclePhysics.updateVehicle(v, dt, {
          throttle: desiredThrottle,
          steer: steerInput,
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
