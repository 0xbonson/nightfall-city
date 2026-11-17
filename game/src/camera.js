// Third-Person Cinematic Camera System for Nightfall City (Vela Bay)
// Features dynamic chase tracking, elevation looking down at street, building collision avoidance,
// on-foot player framing, and instant camera snapping.

import { screenEffects } from './effects.js';
import { world } from './world.js';

const NEAR_CLIP_PLANE = 0.4;
const FAR_CLIP_PLANE = 750.0;
export const CAMERA_DEFAULT_FOV = 68;
export const CAMERA_MAX_DYNAMIC_FOV = 82;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 3.5;
    this.z = -5;
    this.targetX = 0;
    this.targetY = 1.4;
    this.targetZ = 0;

    this.yaw = 0; // Horizontal angle in radians
    this.pitch = 0.18; // Vertical angle in radians (looking down)
    this.roll = 0; // Corner banking roll angle in radians
    this.targetRoll = 0;
    this.distance = 5.0;
    this.fov = 68; // Degrees
    this.aspect = 16 / 9;

    this.lookSensitivity = 0.0024;
    this.lockedYaw = false;
    this.viewMatrix = new Float32Array(16);
    this.projMatrix = new Float32Array(16);
    this.viewProjMatrix = new Float32Array(16);
  }

  // Instantly place camera at ideal position without lerp lag (used for shot setups and teleports)
  snap(player) {
    if (!player) return;
    this.targetX = player.x;
    this.targetY = player.y + (player.inVehicle ? 1.1 : 1.4);
    this.targetZ = player.z;

    const inVehicle = player.inVehicle && player.vehicle;
    const targetDist = inVehicle ? 7.6 : 5.0;
    const targetHeight = inVehicle ? 2.5 : 1.4;
    const hDist = targetDist * Math.cos(this.pitch);
    const vDist = targetDist * Math.sin(this.pitch) + targetHeight;

    this.x = this.targetX - Math.sin(this.yaw) * hDist;
    this.y = Math.max(1.8, this.targetY + vDist);
    this.z = this.targetZ - Math.cos(this.yaw) * hDist;
    this.roll = 0;
    this.targetRoll = 0;

    this.avoidBuildingCollision();
    this.computeMatrices();
  }

  // Prevent camera from clipping through or ending up inside buildings
  avoidBuildingCollision() {
    const dx = this.x - this.targetX;
    const dz = this.z - this.targetZ;
    const totalDist = Math.hypot(dx, dz) || 0.001;
    const steps = 12;

    for (let i = steps; i >= 1; i--) {
      const frac = i / steps;
      const testX = this.targetX + (dx / totalDist) * (totalDist * frac);
      const testZ = this.targetZ + (dz / totalDist) * (totalDist * frac);

      // Check center ray plus slight side clearance
      const col = world.checkCollision(testX, testZ, 0.85);
      if (col.collided) {
        // Bring camera closer along view vector so it stays firmly outside the wall
        const safeDist = Math.max(2.0, totalDist * (frac - 0.12));
        this.x = this.targetX + (dx / totalDist) * safeDist;
        this.z = this.targetZ + (dz / totalDist) * safeDist;
        this.y = Math.max(2.0, this.y + 0.35); // Lift slightly when near obstacle
        break;
      }
    }
  }

  update(player, dt, mouseDelta = { dx: 0, dy: 0 }) {
    // Mouse look
    this.yaw -= mouseDelta.dx * this.lookSensitivity;
    this.pitch += mouseDelta.dy * this.lookSensitivity;
    // Clamp pitch between -10 deg and 65 deg
    this.pitch = Math.max(-0.15, Math.min(1.1, this.pitch));

    let targetDist = 5.0;
    let targetHeight = 1.4;

    if (player.inVehicle && player.vehicle) {
      const v = player.vehicle;
      const speedRatio = Math.min(1.0, Math.abs(v.speed) / (v.maxSpeed || 28.0));

      // Chase camera sits above car, pulls back smoothly with speed
      targetDist = 7.4 + speedRatio * 3.6;
      targetHeight = 2.4 + speedRatio * 0.7;

      // Camera leans into corners dynamically with vehicle roll and lateral slide
      this.targetRoll = -(v.roll || 0) * 0.7 - (v.steer || 0) * 0.06;

      // Auto-align camera yaw behind vehicle gently (unless explicitly locked by cinematic shot)
      if (!this.lockedYaw) {
        const carAngle = v.angle;
        let angleDiff = carAngle - this.yaw;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.yaw += angleDiff * Math.min(1.0, 3.8 * dt);
      }

      // Speed-based dynamic FOV expansion (68 deg at rest up to 82 deg at top velocity)
      this.fov = CAMERA_DEFAULT_FOV + speedRatio * (CAMERA_MAX_DYNAMIC_FOV - CAMERA_DEFAULT_FOV);
    } else {
      // On-foot camera shows player and street around them
      targetDist = 5.0;
      targetHeight = 1.4;
      this.targetRoll = 0;
      this.fov = CAMERA_DEFAULT_FOV;
    }

    this.roll += (this.targetRoll - this.roll) * Math.min(1.0, 6.0 * dt);
    this.distance += (targetDist - this.distance) * Math.min(1.0, 6.5 * dt);

    // Target point is character/vehicle center
    this.targetX = player.x;
    this.targetY = player.y + (player.inVehicle ? 1.0 : 1.3);
    this.targetZ = player.z;

    // Calculate ideal eye position
    const hDist = this.distance * Math.cos(this.pitch);
    const vDist = this.distance * Math.sin(this.pitch) + targetHeight;

    const idealX = this.targetX - Math.sin(this.yaw) * hDist + screenEffects.shakeX;
    const idealY = Math.max(1.8, this.targetY + vDist + screenEffects.shakeY);
    const idealZ = this.targetZ - Math.cos(this.yaw) * hDist;

    // Detect large distance jumps (teleport, shot change, respawn) and snap immediately
    const distToIdeal = Math.hypot(this.x - idealX, this.z - idealZ);
    if (distToIdeal > 20.0) {
      this.x = idealX;
      this.y = idealY;
      this.z = idealZ;
    } else {
      // Smooth camera lag
      const lerpSpeed = player.inVehicle ? 9.0 : 12.0;
      this.x += (idealX - this.x) * Math.min(1.0, lerpSpeed * dt);
      this.y += (idealY - this.y) * Math.min(1.0, lerpSpeed * dt);
      this.z += (idealZ - this.z) * Math.min(1.0, lerpSpeed * dt);
    }

    // Keep camera out of building interiors
    this.avoidBuildingCollision();

    this.computeMatrices();
  }

  computeMatrices() {
    this.perspective(this.fov * Math.PI / 180, this.aspect, NEAR_CLIP_PLANE, FAR_CLIP_PLANE, this.projMatrix);
    
    // Up vector incorporates banking roll
    const upX = -Math.sin(this.roll) * Math.cos(this.yaw);
    const upY = Math.cos(this.roll);
    const upZ = Math.sin(this.roll) * Math.sin(this.yaw);

    this.lookAt(
      this.x, this.y, this.z,
      this.targetX, this.targetY, this.targetZ,
      upX, upY, upZ,
      this.viewMatrix
    );
    this.multiply(this.projMatrix, this.viewMatrix, this.viewProjMatrix);
  }

  perspective(fovy, aspect, near, far, out) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
  }

  lookAt(eyeX, eyeY, eyeZ, targetX, targetY, targetZ, upX, upY, upZ, out) {
    let z0 = eyeX - targetX;
    let z1 = eyeY - targetY;
    let z2 = eyeZ - targetZ;
    let len = 1 / (Math.hypot(z0, z1, z2) || 1);
    z0 *= len; z1 *= len; z2 *= len;

    let x0 = upY * z2 - upZ * z1;
    let x1 = upZ * z0 - upX * z2;
    let x2 = upX * z1 - upY * z0;
    len = 1 / (Math.hypot(x0, x1, x2) || 1);
    x0 *= len; x1 *= len; x2 *= len;

    let y0 = z1 * x2 - z2 * x1;
    let y1 = z2 * x0 - z0 * x2;
    let y2 = z0 * x1 - z1 * x0;

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eyeX + x1 * eyeY + x2 * eyeZ);
    out[13] = -(y0 * eyeX + y1 * eyeY + y2 * eyeZ);
    out[14] = -(z0 * eyeX + z1 * eyeY + z2 * eyeZ);
    out[15] = 1;
  }

  multiply(a, b, out) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + j] * b[i * 4 + k];
        }
        out[i * 4 + j] = sum;
      }
    }
  }
}

export const camera = new Camera();
