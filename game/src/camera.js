/**
 * Nightfall City: Vela Bay - Follow & Cinematic Camera System
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { V3, lerp, clamp } from './math.js';

export class Camera {
  constructor() {
    this.pos = V3.create(68, 2.8, -78);
    this.target = V3.create(68, 1.8, -48);
    this.fov = 62;

    // Follow parameters
    this.yaw = 0;
    this.pitch = 0.18;
    this.distance = 5.2;
    this.height = 2.1;

    // Shake
    this.shakeAmount = 0;
    this.shakeDuration = 0;

    // Locked shot mode preset flag
    this.locked = false;
  }

  setPreset(preset) {
    if (!preset || !preset.camera) return;
    this.pos[0] = preset.camera.pos[0];
    this.pos[1] = preset.camera.pos[1];
    this.pos[2] = preset.camera.pos[2];

    this.target[0] = preset.camera.target[0];
    this.target[1] = preset.camera.target[1];
    this.target[2] = preset.camera.target[2];

    this.fov = preset.camera.fov || 62;
    this.locked = true;
  }

  shake(amount = 0.5, duration = 0.35) {
    this.shakeAmount = amount;
    this.shakeDuration = duration;
  }

  update(dt, player, activeCar, input) {
    if (this.locked) return;

    // Update screen shake
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const s = this.shakeAmount * Math.max(0, this.shakeDuration);
      shakeOffsetX = (Math.random() - 0.5) * s;
      shakeOffsetY = (Math.random() - 0.5) * s;
    }

    if (activeCar) {
      // In-vehicle chase camera
      const carSpeed = activeCar.speed;
      const speedNorm = clamp(Math.abs(carSpeed) / 40.0, 0, 1.0);

      // Broaden FOV dynamically with speed (rush of speed effect)
      const targetFov = lerp(62, 74, speedNorm);
      this.fov = lerp(this.fov, targetFov, dt * 4.0);

      const chaseDist = lerp(6.8, 9.4, speedNorm);
      const chaseHeight = lerp(2.8, 3.4, speedNorm);

      // Follow car orientation
      const heading = activeCar.rotY;
      const desiredX = activeCar.x - Math.sin(heading) * chaseDist;
      const desiredZ = activeCar.z - Math.cos(heading) * chaseDist;
      const desiredY = activeCar.y + chaseHeight;

      // Smooth camera damp
      const followRate = 6.5;
      this.pos[0] = lerp(this.pos[0], desiredX, dt * followRate);
      this.pos[1] = lerp(this.pos[1], desiredY, dt * followRate);
      this.pos[2] = lerp(this.pos[2], desiredZ, dt * followRate);

      // Target ahead of the car
      const lookAhead = lerp(3.5, 7.0, speedNorm);
      const targetX = activeCar.x + Math.sin(heading) * lookAhead;
      const targetZ = activeCar.z + Math.cos(heading) * lookAhead;
      const targetY = activeCar.y + 1.2;

      this.target[0] = lerp(this.target[0], targetX, dt * 10.0);
      this.target[1] = lerp(this.target[1], targetY, dt * 10.0);
      this.target[2] = lerp(this.target[2], targetZ, dt * 10.0);

    } else {
      // On-foot follow camera
      this.fov = lerp(this.fov, 62, dt * 5.0);

      // Mouse look input
      if (input && input.mouseDelta) {
        this.yaw -= input.mouseDelta.x * 0.0032;
        this.pitch += input.mouseDelta.y * 0.0032;
        this.pitch = clamp(this.pitch, -0.45, 0.75);
      }

      const pX = player.x;
      const pY = player.y + 1.6; // Shoulder / eye height
      const pZ = player.z;

      // Calculate camera position based on yaw, pitch, and distance
      const horizDist = this.distance * Math.cos(this.pitch);
      const vertDist = this.distance * Math.sin(this.pitch);

      const desiredX = pX - Math.sin(this.yaw) * horizDist;
      const desiredY = pY + vertDist + 0.5;
      const desiredZ = pZ - Math.cos(this.yaw) * horizDist;

      this.pos[0] = lerp(this.pos[0], desiredX, dt * 12.0);
      this.pos[1] = lerp(this.pos[1], desiredY, dt * 12.0);
      this.pos[2] = lerp(this.pos[2], desiredZ, dt * 12.0);

      this.target[0] = lerp(this.target[0], pX, dt * 15.0);
      this.target[1] = lerp(this.target[1], pY, dt * 15.0);
      this.target[2] = lerp(this.target[2], pZ, dt * 15.0);
    }

    // Apply shake offsets
    this.pos[0] += shakeOffsetX;
    this.pos[1] += shakeOffsetY;
  }
}
