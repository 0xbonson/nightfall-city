// Arcade Driving Physics and Character Collision for Nightfall City

import { world } from './world.js';
import { audio } from './audio.js';
import { particles, screenEffects } from './effects.js';

export class VehiclePhysics {
  static createVehicle(x, z, angle = 0, type = 'sedan') {
    const specs = {
      sports: { maxSpeed: 34, accel: 18, reverseMax: -12, steerRate: 2.8, grip: 0.92, health: 300, mass: 1200, length: 4.6, width: 2.1 },
      sedan: { maxSpeed: 26, accel: 13, reverseMax: -10, steerRate: 2.4, grip: 0.88, health: 350, mass: 1500, length: 4.8, width: 2.2 },
      muscle: { maxSpeed: 30, accel: 20, reverseMax: -11, steerRate: 2.5, grip: 0.82, health: 380, mass: 1650, length: 5.0, width: 2.2 },
      police: { maxSpeed: 31, accel: 16, reverseMax: -11, steerRate: 2.6, grip: 0.90, health: 400, mass: 1600, length: 4.9, width: 2.2 },
      truck: { maxSpeed: 20, accel: 9, reverseMax: -8, steerRate: 1.8, grip: 0.85, health: 600, mass: 2800, length: 5.8, width: 2.5 },
      taxi: { maxSpeed: 25, accel: 13, reverseMax: -10, steerRate: 2.4, grip: 0.88, health: 350, mass: 1500, length: 4.8, width: 2.2 },
    }[type] || { maxSpeed: 26, accel: 13, reverseMax: -10, steerRate: 2.4, grip: 0.88, health: 350, mass: 1500, length: 4.8, width: 2.2 };

    return {
      x, z, y: 0,
      angle, // radians (0 = facing North/+Z)
      speed: 0,
      lateralSpeed: 0,
      steer: 0, // current wheel steer
      angularVel: 0,
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

  static updateVehicle(car, dt, inputs = {}) {
    if (car.wrecked) {
      car.speed *= Math.max(0, 1 - 3 * dt);
      return;
    }

    const { throttle = 0, steer = 0, handbrake = false } = inputs;
    car.isAccelerating = throttle > 0;
    car.isBraking = throttle < 0 || handbrake;

    // Steering response
    const targetSteer = steer * 0.55;
    car.steer += (targetSteer - car.steer) * Math.min(1.0, 12 * dt);

    // Acceleration & Braking
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
      // Natural engine drag
      car.speed *= Math.max(0, 1 - 1.2 * dt);
    }

    // Handbrake / Drift
    let grip = car.grip;
    if (handbrake) {
      car.speed *= Math.max(0, 1 - 1.8 * dt);
      grip *= 0.45; // Slide easily
      car.isDrifting = Math.abs(car.speed) > 5;
    } else {
      car.isDrifting = Math.abs(car.speed) > 14 && Math.abs(car.steer) > 0.25;
    }

    if (car.isDrifting) {
      car.driftFactor = Math.min(1.0, car.driftFactor + 4 * dt);
      // Spawn tire smoke particles
      const sin = Math.sin(car.angle);
      const cos = Math.cos(car.angle);
      const rearX = car.x - sin * 1.8;
      const rearZ = car.z - cos * 1.8;
      particles.emit('smoke', rearX, 0.2, rearZ, 2, { size: 0.4, up: 0.5 });
      if (inputs.isPlayer) {
        audio.playTireScreech();
      }
    } else {
      car.driftFactor = Math.max(0, car.driftFactor - 3 * dt);
    }

    // Angular turning (steering turns the car based on forward speed)
    const turnSensitivity = (car.speed >= 0 ? 1 : -1) * (1 - Math.min(0.5, Math.abs(car.speed) / (car.maxSpeed * 1.6)));
    const turnAmount = car.steer * car.steerRate * (car.speed / 14) * turnSensitivity;
    car.angle += turnAmount * dt;

    // Heading direction
    const sinA = Math.sin(car.angle);
    const cosA = Math.cos(car.angle);

    // Forward motion
    const forwardX = sinA * car.speed * dt;
    const forwardZ = cosA * car.speed * dt;

    car.x += forwardX;
    car.z += forwardZ;

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
    const isMoving = moveX !== 0 || moveZ !== 0;

    const baseSpeed = sprint ? 8.2 : 4.4;
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
