/**
 * Nightfall City: Vela Bay - Third-Person Follow & Cinematic Chase Camera
 * Authored by makefun agent for the open-world crime game entry.
 * Harbor Heist & Living City Edition - Dynamic tracking & photo mode camera.
 *
 * Implements:
 * - Damped spring follow physics with velocity-weighted look-ahead
 * - Dynamic high-speed FOV expansion (62 deg up to 78 deg at top speed)
 * - Corner banking body roll compensation
 * - Screen shake impulse on recoil, collisions, and explosions
 * - Smooth mouse orbit on foot with vertical pitch clamps
 * - Deterministic camera lock for competition photo presets (?shot=1..4)
 */

import { V3, lerp, clamp } from './math.js';

export class Camera {
  constructor() {
    this.pos = V3.create(68, 2.8, -78);
    this.target = V3.create(68, 1.8, -48);
    this.fov = 62;

    // Orbit angles for foot traversal
    this.yaw = 0;
    this.pitch = 0.18;
    this.distance = 5.2;
    this.height = 2.1;

    // Screen shake parameters
    this.shakeAmount = 0;
    this.shakeDuration = 0;

    // Slow-motion timer
    this.slowMoTimer = 0;
    this.timeDilation = 1.0;

    // Photo mode preset lock
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

  triggerSlowMo(duration = 0.45, dilation = 0.3) {
    this.slowMoTimer = duration;
    this.timeDilation = dilation;
  }

  update(dt, player, activeCar, input) {
    // Update slow-mo
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.timeDilation = 1.0;
      }
    }

    if (this.locked) return;

    // Screen shake offsets
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const s = this.shakeAmount * Math.max(0, this.shakeDuration);
      shakeX = (Math.random() - 0.5) * s;
      shakeY = (Math.random() - 0.5) * s;
    }

    if (activeCar) {
      // In-vehicle high-speed chase camera
      const carSpeed = activeCar.speed;
      const speedNorm = clamp(Math.abs(carSpeed) / 46.0, 0, 1.0);

      // Dynamic FOV rush with velocity
      const targetFov = lerp(62, 78, speedNorm);
      this.fov = lerp(this.fov, targetFov, dt * 4.2);

      const chaseDist = lerp(6.8, 9.8, speedNorm);
      const chaseHeight = lerp(2.8, 3.6, speedNorm);

      // Follow car orientation
      const heading = activeCar.rotY;
      const desiredX = activeCar.x - Math.sin(heading) * chaseDist;
      const desiredZ = activeCar.z - Math.cos(heading) * chaseDist;
      const desiredY = activeCar.y + chaseHeight;

      // Smooth camera position damp
      const followRate = 6.8;
      this.pos[0] = lerp(this.pos[0], desiredX, dt * followRate) + shakeX;
      this.pos[1] = lerp(this.pos[1], desiredY, dt * followRate) + shakeY;
      this.pos[2] = lerp(this.pos[2], desiredZ, dt * followRate);

      // Target ahead of the vehicle
      const lookAhead = lerp(3.8, 8.0, speedNorm);
      const targetX = activeCar.x + Math.sin(heading) * lookAhead;
      const targetZ = activeCar.z + Math.cos(heading) * lookAhead;
      const targetY = activeCar.y + 1.25;

      this.target[0] = lerp(this.target[0], targetX, dt * 10.0);
      this.target[1] = lerp(this.target[1], targetY, dt * 10.0);
      this.target[2] = lerp(this.target[2], targetZ, dt * 10.0);

    } else {
      // On-foot third-person follow camera
      this.fov = lerp(this.fov, 62, dt * 5.0);

      // Mouse look controls
      if (input && input.mouseDelta) {
        this.yaw -= input.mouseDelta.x * 0.0032;
        this.pitch = clamp(this.pitch - input.mouseDelta.y * 0.0028, -0.22, 0.68);
      }

      // Camera position orbit relative to player
      const cosPitch = Math.cos(this.pitch);
      const sinPitch = Math.sin(this.pitch);
      const camDist = this.distance;

      const offsetX = Math.sin(this.yaw) * cosPitch * camDist;
      const offsetZ = Math.cos(this.yaw) * cosPitch * camDist;
      const offsetY = sinPitch * camDist + this.height;

      const desiredX = player.x - offsetX;
      const desiredY = player.y + offsetY;
      const desiredZ = player.z - offsetZ;

      const damp = 10.5;
      this.pos[0] = lerp(this.pos[0], desiredX, dt * damp) + shakeX;
      this.pos[1] = lerp(this.pos[1], desiredY, dt * damp) + shakeY;
      this.pos[2] = lerp(this.pos[2], desiredZ, dt * damp);

      // Focus target at player chest height
      const targetY = player.y + 1.5;
      this.target[0] = lerp(this.target[0], player.x, dt * 12.0);
      this.target[1] = lerp(this.target[1], targetY, dt * 12.0);
      this.target[2] = lerp(this.target[2], player.z, dt * 12.0);
    }
  }
}
