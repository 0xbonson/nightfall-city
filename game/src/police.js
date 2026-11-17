// Vela Bay Metro Police Department System for Nightfall City
// Manages 0-5 Star wanted level, police cruiser pursuit, foot officers, roadblocks, and tactical air support.

import { VehiclePhysics } from './physics.js';
import { world } from './world.js';
import { audio } from './audio.js';
import { particles } from './effects.js';
import { CONFIG } from './config.js';

const POLICE_EVASION_DURATION = 12.0; // Seconds required outside detection cone to cool heat
const POLICE_SIGHT_RANGE = 72.0;     // Optical detection distance in meters

export class PoliceManager {
  constructor() {
    this.wantedLevel = 0; // 0 to CONFIG.gameplay.maxWantedLevel
    this.maxCruisers = CONFIG.gameplay.policeMaxCruisers;
    this.heat = 0; // Raw points
    this.isEvading = false;
    this.evasionTimer = 0;
    this.evasionMax = POLICE_EVASION_DURATION;

    this.cruisers = [];
    this.officers = [];
    this.roadblocks = [];
    this.helicopter = null;

    this.copSightRadius = POLICE_SIGHT_RANGE;
  }

  reportCrime(crimeType) {
    const crimes = {
      shot_fired: 15,
      carjacking: 25,
      hit_pedestrian: 35,
      rammed_police: 50,
      killed_police: 85,
      heist_alarm: 100,
    };
    const points = crimes[crimeType] || 20;
    this.heat += points;
    this.isEvading = false;
    this.evasionTimer = this.evasionMax;
    this.updateWantedStars();
  }

  updateWantedStars() {
    let oldLevel = this.wantedLevel;
    if (this.heat >= 180) this.wantedLevel = 5;
    else if (this.heat >= 120) this.wantedLevel = 4;
    else if (this.heat >= 70) this.wantedLevel = 3;
    else if (this.heat >= 35) this.wantedLevel = 2;
    else if (this.heat >= 15) this.wantedLevel = 1;
    else this.wantedLevel = 0;

    // Helicopter activates at 4+ stars
    if (this.wantedLevel >= 4 && !this.helicopter) {
      this.helicopter = {
        x: 0, y: 35, z: 0,
        rotorAngle: 0,
        spotlightX: 0, spotlightZ: 0,
        shootCooldown: 0,
      };
    } else if (this.wantedLevel < 4 && this.helicopter) {
      this.helicopter = null;
    }
  }

  setWantedLevel(level) {
    this.wantedLevel = Math.max(0, Math.min(5, level));
    const heatMap = [0, 20, 45, 80, 130, 200];
    this.heat = heatMap[this.wantedLevel];
    this.isEvading = false;
    this.evasionTimer = this.evasionMax;
    this.updateWantedStars();
  }

  spawnCruiser(playerX, playerZ, ahead = false) {
    const spawnAngle = Math.random() * Math.PI * 2;
    const dist = 75 + Math.random() * 40;
    const cx = playerX + Math.cos(spawnAngle) * dist;
    const cz = playerZ + Math.sin(spawnAngle) * dist;

    const v = VehiclePhysics.createVehicle(cx, cz, Math.random() * Math.PI * 2, 'police');
    v.color = [0.12, 0.12, 0.14]; // Metro black
    v.roofColor = [0.95, 0.95, 0.95]; // White roof & doors
    v.isPolice = true;
    v.isVehicle = true;
    v.sirenPhase = Math.random() * 10;
    this.cruisers.push(v);
  }

  spawnFootOfficer(nearX, nearZ) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 20;
    const ox = nearX + Math.cos(angle) * dist;
    const oz = nearZ + Math.sin(angle) * dist;

    this.officers.push({
      x: ox,
      z: oz,
      heading: 0,
      health: 60,
      alive: true,
      shootCooldown: 1.0 + Math.random() * 1.5,
      isPolice: true,
      isVehicle: false,
    });
  }

  spawnRoadblock(playerX, playerZ, heading) {
    // Spawn two cruisers perpendicular across the road ahead
    const aheadDist = 70;
    const rbx = playerX + Math.sin(heading) * aheadDist;
    const rbz = playerZ + Math.cos(heading) * aheadDist;

    for (let offset = -4; offset <= 4; offset += 8) {
      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const cx = rbx + cosH * offset;
      const cz = rbz - sinH * offset;

      const v = VehiclePhysics.createVehicle(cx, cz, heading + Math.PI / 2, 'police');
      v.color = [0.12, 0.12, 0.14];
      v.roofColor = [0.95, 0.95, 0.95];
      v.isPolice = true;
      v.isVehicle = true;
      v.isRoadblock = true;
      this.cruisers.push(v);
    }
  }

  update(dt, player, peds) {
    if (this.wantedLevel === 0) {
      // Clean up police units when heat is 0
      this.cruisers = this.cruisers.filter(c => Math.hypot(c.x - player.x, c.z - player.z) < 180 && !c.isPolice);
      this.officers = [];
      this.helicopter = null;
      audio.updateSiren(0);
      return;
    }

    // Determine target unit counts based on wanted level
    const maxCruisers = this.wantedLevel * 2;
    const maxOfficers = this.wantedLevel >= 2 ? 3 : 1;

    // Spawn cruisers if needed
    if (this.cruisers.length < maxCruisers && Math.random() < dt * 1.5) {
      this.spawnCruiser(player.x, player.z);
    }
    // Spawn foot officers
    if (this.officers.length < maxOfficers && Math.random() < dt * 1.0) {
      this.spawnFootOfficer(player.x, player.z);
    }
    // High stars roadblock spawn
    if (this.wantedLevel >= 3 && Math.random() < dt * 0.08 && this.cruisers.length < maxCruisers + 2) {
      this.spawnRoadblock(player.x, player.z, player.inVehicle && player.vehicle ? player.vehicle.angle : player.heading);
    }

    // Check line of sight from all police units to player
    let playerSpotted = false;
    let closestCopDist = 999;

    for (const c of this.cruisers) {
      const dist = Math.hypot(c.x - player.x, c.z - player.z);
      closestCopDist = Math.min(closestCopDist, dist);
      if (dist < this.copSightRadius) {
        const los = world.raycast(c.x, c.z, player.x, player.z);
        if (!los.hit) playerSpotted = true;
      }
    }

    for (const o of this.officers) {
      if (!o.alive) continue;
      const dist = Math.hypot(o.x - player.x, o.z - player.z);
      closestCopDist = Math.min(closestCopDist, dist);
      if (dist < this.copSightRadius) {
        const los = world.raycast(o.x, o.z, player.x, player.z);
        if (!los.hit) playerSpotted = true;
      }
    }

    // Helicopter always spots player unless player is in dense covered tunnel
    if (this.helicopter) {
      playerSpotted = true;
      closestCopDist = Math.min(closestCopDist, 35);
    }

    audio.updateSiren(this.wantedLevel, closestCopDist);

    // Evasion handling
    if (!playerSpotted) {
      this.isEvading = true;
      // Ditching car doubles evasion decay rate!
      const decayMultiplier = (!player.inVehicle) ? 2.2 : 1.0;
      this.evasionTimer -= dt * decayMultiplier;

      if (this.evasionTimer <= 0) {
        // Drop one star!
        this.wantedLevel--;
        const heatThresholds = [0, 20, 45, 80, 130];
        this.heat = heatThresholds[this.wantedLevel] || 0;
        this.evasionTimer = this.evasionMax;
        if (this.wantedLevel === 0) {
          this.heat = 0;
          this.isEvading = false;
        }
      }
    } else {
      this.isEvading = false;
      this.evasionTimer = this.evasionMax;
    }

    // Update Cruisers AI Pursuit
    for (let i = this.cruisers.length - 1; i >= 0; i--) {
      const c = this.cruisers[i];
      c.sirenPhase = (c.sirenPhase || 0) + dt * 14;

      if (c.wrecked) continue;

      const dx = player.x - c.x;
      const dz = player.z - c.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 250) {
        this.cruisers.splice(i, 1);
        continue;
      }

      if (c.isCinematic) {
        // Locked pursuit formation alongside player vehicle
        if (player.vehicle) {
          c.speed = player.vehicle.speed;
          c.angle = player.vehicle.angle;
          c.x = player.x + (c.cinematicOffsetX || 0);
          c.z = player.z + (c.cinematicOffsetZ || 0);
        }
      } else if (!c.isRoadblock) {
        const desiredAngle = Math.atan2(dx, dz);
        let angleDiff = desiredAngle - c.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const steer = Math.max(-1, Math.min(1, angleDiff * 2.2));
        const throttle = dist > 6 ? 1.0 : (dist < 3 ? -0.4 : 0.2);

        VehiclePhysics.updateVehicle(c, dt, {
          throttle,
          steer,
          handbrake: Math.abs(angleDiff) > 1.2 && c.speed > 12
        });
      }
    }

    // Update Foot Officers AI
    for (let i = this.officers.length - 1; i >= 0; i--) {
      const o = this.officers[i];
      if (!o.alive) continue;

      const dx = player.x - o.x;
      const dz = player.z - o.z;
      const dist = Math.hypot(dx, dz);

      o.heading = Math.atan2(dx, dz);

      if (dist > 18) {
        // Move towards player
        o.x += Math.sin(o.heading) * 3.4 * dt;
        o.z += Math.cos(o.heading) * 3.4 * dt;
      }

      // Shoot at player if in range & line of sight
      o.shootCooldown -= dt;
      if (o.shootCooldown <= 0 && dist < 50 && player.alive) {
        const los = world.raycast(o.x, o.z, player.x, player.z);
        if (!los.hit) {
          o.shootCooldown = 1.2 + Math.random() * 0.8;
          audio.playGunshot(false);
          // Accuracy check based on distance
          if (Math.random() < Math.max(0.2, 1 - dist / 60)) {
            player.takeDamage(12 + Math.floor(Math.random() * 8), { x: o.x, z: o.z });
          }
        }
      }
    }

    // Update Helicopter
    if (this.helicopter) {
      this.helicopter.rotorAngle += dt * 38;
      if (this.helicopter.hoverX !== undefined) {
        this.helicopter.x = this.helicopter.hoverX;
        this.helicopter.y = this.helicopter.hoverY || 15;
        this.helicopter.z = this.helicopter.hoverZ;
      } else {
        // Fly towards player smoothly
        this.helicopter.x += (player.x - this.helicopter.x) * Math.min(1.0, 1.2 * dt);
        this.helicopter.z += (player.z - this.helicopter.z) * Math.min(1.0, 1.2 * dt);
      }
      this.helicopter.spotlightX = this.helicopter.spotlightTargetX !== undefined ? this.helicopter.spotlightTargetX : player.x;
      this.helicopter.spotlightZ = this.helicopter.spotlightTargetZ !== undefined ? this.helicopter.spotlightTargetZ : player.z;

      // Helicopter sniper fire at 5 stars
      if (this.wantedLevel >= 5 && player.alive) {
        this.helicopter.shootCooldown -= dt;
        if (this.helicopter.shootCooldown <= 0) {
          this.helicopter.shootCooldown = 2.2;
          audio.playGunshot(true);
          player.takeDamage(18, { x: this.helicopter.x, z: this.helicopter.z });
        }
      }
    }
  }
}

export const police = new PoliceManager();
