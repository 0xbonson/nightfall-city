// Arcade Driving Physics and Character Collision for Nightfall City: Vela Bay
// Provides responsive wheel traction, drift dynamics, collision resolution, and tire smoke emission.

import { world } from './world.js';
import { audio } from './audio.js';
import { particles, screenEffects } from './effects.js';
import { CONFIG } from './config.js';

export const HANDBRAKE_SLIP_FACTOR = 0.45; // Friction multiplier during handbrake drift

export class VehiclePhysics {
  static createVehicle(x, z, angle = 0, type = 'sedan') {
    const specs = {
      sports: { maxSpeed: 35, accel: 19, reverseMax: -12, steerRate: 2.8, grip: 0.92, health: 320, mass: 1250, length: 4.6, width: 2.1, height: 1.35 },
      sedan: { maxSpeed: 26, accel: 13, reverseMax: -10, steerRate: 2.4, grip: 0.88, health: 360, mass: 1550, length: 4.8, width: 2.2, height: 1.50 },
      muscle: { maxSpeed: 31, accel: 21, reverseMax: -11, steerRate: 2.5, grip: 0.82, health: 390, mass: 1700, length: 5.0, width: 2.2, height: 1.45 },
      police: { maxSpeed: 32, accel: 17, reverseMax: -11, steerRate: 2.6, grip: 0.90, health: 420, mass: 1650, length: 4.9, width: 2.2, height: 1.55 },
      taxi: { maxSpeed: 25, accel: 13, reverseMax: -10, steerRate: 2.4, grip: 0.88, health: 360, mass: 1550, length: 4.8, width: 2.2, height: 1.50 },
      truck: { maxSpeed: 21, accel: 10, reverseMax: -8, steerRate: 1.8, grip: 0.85, health: 700, mass: 3800, length: 6.4, width: 2.5, height: 2.80 },
      bus: { maxSpeed: 19, accel: 8.5, reverseMax: -7, steerRate: 1.5, grip: 0.86, health: 950, mass: 6500, length: 8.4, width: 2.6, height: 2.90 },
    }[type] || { maxSpeed: 26, accel: 13, reverseMax: -10, steerRate: 2.4, grip: 0.88, health: 360, mass: 1550, length: 4.8, width: 2.2, height: 1.50 };

    return {
      x, z, y: 0,
      angle, // radians (0 = facing North/+Z)
      speed: 0,
      lateralSpeed: 0,
      lateralVelocity: 0,
      steer: 0, // current wheel steer
      angularVel: 0,
      pitch: 0, // vehicle body nose pitch (acceleration squat / braking dive)
      roll: 0, // vehicle body roll (cornering lean)
      type,
      ...specs,
      maxHealth: specs.health,
      currentHealth: specs.health,
      driftFactor: 0,
      isDrifting: false,
      isBraking: false,
      isAccelerating: false,
      damaged: false,
      wrecked: false,
      color: [0.8, 0.2, 0.2], // default car color
      roofColor: [0.1, 0.1, 0.1],
    };
  }

  // Returns list of all supported vehicle class identifiers
  static getVehicleTypes() {
    return ['sports', 'sedan', 'muscle', 'police', 'taxi', 'truck', 'bus'];
  }

  static updateVehicle(car, dt, inputs = {}) {
    if (car.wrecked) {
      car.speed *= Math.max(0, 1 - 3 * dt);
      car.pitch *= Math.max(0, 1 - 5 * dt);
      car.roll *= Math.max(0, 1 - 5 * dt);
      return;
    }

    const { throttle = 0, steer = 0, handbrake = false } = inputs;
    car.isAccelerating = throttle > 0;
    car.isBraking = throttle < 0 || handbrake;

    // Steering response with speed sensitivity
    const targetSteer = steer * 0.55;
    car.steer += (targetSteer - car.steer) * Math.min(1.0, 12 * dt);

    // Acceleration & Braking with momentum
    if (throttle > 0) {
      if (car.speed < 0) {
        // Braking while in reverse
        car.speed += car.accel * 1.8 * dt;
      } else {
        const powerDrop = 1 - (car.speed / car.maxSpeed) * 0.65;
        car.speed += car.accel * powerDrop * dt;
        if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
      }
    } else if (throttle < 0) {
      if (car.speed > 0) {
        // Foot braking
        car.speed -= car.accel * 2.2 * dt;
        if (car.speed < 0) car.speed = 0;
      } else {
        // Reversing
        car.speed -= car.accel * 0.7 * dt;
        if (car.speed < car.reverseMax) car.speed = car.reverseMax;
      }
    } else {
      // Natural rolling engine drag
      car.speed *= Math.max(0, 1 - 1.2 * dt);
    }

    // Handbrake / Drift Dynamics
    let grip = car.grip;
    if (handbrake) {
      car.speed *= Math.max(0, 1 - 1.8 * dt);
      grip *= 0.40; // Reduced lateral friction for powerslide
      car.isDrifting = Math.abs(car.speed) > 5;
    } else {
      car.isDrifting = Math.abs(car.speed) > 13 && Math.abs(car.steer) > 0.22;
    }

    const isHardBraking = car.isBraking && Math.abs(car.speed) > 8;

    if (car.isDrifting || isHardBraking) {
      car.driftFactor = Math.min(1.0, car.driftFactor + 4 * dt);
      // Spawn tire smoke particles and leave road skid marks
      const sin = Math.sin(car.angle);
      const cos = Math.cos(car.angle);
      const rearX = car.x - sin * (car.length * 0.42);
      const rearZ = car.z - cos * (car.length * 0.42);

      if (inputs.isPlayer) {
        particles.emit('smoke', rearX, 0.15, rearZ, 2, { size: 0.45, up: 0.6 });
        if (particles.addSkidMark) {
          particles.addSkidMark(rearX, rearZ, car.angle, car.width * 0.8, car.isDrifting ? 0.85 : 0.6);
        }
        audio.playTireScreech();
      }
    } else {
      car.driftFactor = Math.max(0, car.driftFactor - 3 * dt);
    }

    // Body pitch & roll weight transfer:
    // Nose rises under acceleration; dives under hard braking
    let targetPitch = 0;
    if (car.isBraking && car.speed > 2) {
      targetPitch = -0.045; // Nose dive
    } else if (car.isAccelerating && car.speed < car.maxSpeed * 0.8) {
      targetPitch = 0.035; // Nose squat
    }
    car.pitch = (car.pitch || 0) + (targetPitch - (car.pitch || 0)) * Math.min(1.0, 9 * dt);

    // Body roll away from turn direction (centrifugal lean)
    const targetRoll = -(car.steer * (car.speed / (car.maxSpeed * 0.6))) * 0.06;
    car.roll = (car.roll || 0) + (targetRoll - (car.roll || 0)) * Math.min(1.0, 9 * dt);

    // Dynamic wheel spin rotation & steer angle for visual rendering
    car.wheelRotation = (car.wheelRotation || 0) + (car.speed / 0.35) * dt;
    car.steerAngle = car.steer;
    car.isReversing = car.speed < -0.1;

    // Angular turning with speed sensitivity
    const turnSensitivity = (car.speed >= 0 ? 1 : -1) * (1 - Math.min(0.5, Math.abs(car.speed) / (car.maxSpeed * 1.6)));
    const turnAmount = car.steer * car.steerRate * (car.speed / 14) * turnSensitivity;
    car.angle += turnAmount * dt;

    // Heading direction
    const sinA = Math.sin(car.angle);
    const cosA = Math.cos(car.angle);

    // Forward motion
    const forwardX = sinA * car.speed * dt;
    const forwardZ = cosA * car.speed * dt;

    // Lateral slide momentum during drift
    if (car.isDrifting) {
      car.lateralVelocity = (car.lateralVelocity || 0) + car.steer * car.speed * 0.25 * dt;
    } else {
      car.lateralVelocity = (car.lateralVelocity || 0) * Math.max(0, 1.0 - 8 * dt);
    }
    const lateralX = -cosA * (car.lateralVelocity || 0) * dt;
    const lateralZ = sinA * (car.lateralVelocity || 0) * dt;

    car.x += forwardX + lateralX;
    car.z += forwardZ + lateralZ;

    // Check collision with city buildings/props
    const colRadius = car.width * 0.75;
    const col = world.checkCollision(car.x, car.z, colRadius);
    if (col.collided) {
      car.x += col.pushX * 1.2;
      car.z += col.pushZ * 1.2;

      const impactSpeed = Math.abs(car.speed);
      if (impactSpeed > 4) {
        const damage = Math.floor(impactSpeed * 3.5);
        car.currentHealth = Math.max(0, car.currentHealth - damage);
        if (inputs.isPlayer) {
          audio.playCrash(impactSpeed);
          screenEffects.addTrauma(impactSpeed * 0.03);
          particles.emit('spark', car.x, 0.6, car.z, Math.min(12, Math.floor(impactSpeed * 1.2)));
        }
        car.speed = -car.speed * 0.35; // Bounce back
      } else {
        car.speed = 0;
      }

      if (car.currentHealth <= 0 && !car.wrecked) {
        car.wrecked = true;
        particles.emit('fire', car.x, 1.0, car.z, 20);
        screenEffects.addTrauma(0.7);
        screenEffects.flashWhite(0.8);
      }
    }
  }
}

export class CharacterPhysics {
  static updatePlayer(player, dt, inputs = {}) {
    const { moveX = 0, moveZ = 0, sprint = false } = inputs;

    // Stagger / recovery decay
    if (player.staggerTimer > 0) {
      player.staggerTimer = Math.max(0, player.staggerTimer - dt);
    }
    if (player.landTimer > 0) {
      player.landTimer = Math.max(0, player.landTimer - dt);
    }

    const isMoving = (moveX !== 0 || moveZ !== 0) && player.staggerTimer <= 0;
    const speedMult = player.landTimer > 0 ? 0.75 : 1.0;
    const baseSpeed = (sprint ? (CONFIG.gameplay.playerSprintSpeed || 8.2) : (CONFIG.gameplay.playerWalkSpeed || 4.4)) * speedMult;
    const accel = 30;
    const friction = 14;

    if (isMoving) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ) || 1;
      const targetVx = (moveX / len) * baseSpeed;
      const targetVz = (moveZ / len) * baseSpeed;

      player.vx += (targetVx - player.vx) * Math.min(1.0, accel * dt);
      player.vz += (targetVz - player.vz) * Math.min(1.0, accel * dt);
      player.heading = Math.atan2(player.vx, player.vz);
      player.isMoving = true;
      player.isSprinting = sprint;
    } else {
      player.vx *= Math.max(0, 1 - friction * dt);
      player.vz *= Math.max(0, 1 - friction * dt);
      player.isMoving = (player.vx * player.vx + player.vz * player.vz) > 0.04;
      player.isSprinting = false;
    }

    // Move
    player.x += player.vx * dt;
    player.z += player.vz * dt;

    // Building collisions
    const col = world.checkCollision(player.x, player.z, 0.55);
    if (col.collided) {
      player.x += col.pushX;
      player.z += col.pushZ;
      // Dampen velocity against normal
      const dot = player.vx * col.normalX + player.vz * col.normalZ;
      if (dot < 0) {
        player.vx -= col.normalX * dot;
        player.vz -= col.normalZ * dot;
      }
    }
  }
}
