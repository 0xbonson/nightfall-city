/**
 * Nightfall City: Vela Bay - Circular Radar Minimap
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { WORLD } from './config.js';

export class Minimap {
  constructor(radius = 72) {
    this.radius = radius;
    this.cx = radius + 30;
    this.cy = 0; // Set dynamically from canvas height
    this.scale = 0.58; // World meters to radar pixels
  }

  render(ctx, h, player, vehicles, police, missions, combat) {
    this.cy = h - this.radius - 30;

    const cx = this.cx;
    const cy = this.cy;
    const r = this.radius;

    ctx.save();

    // 1. Outer radar bezel & glass
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 95, 120, 0.65)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. Circular Clipping Mask for radar contents
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Background fill (city block base)
    ctx.fillStyle = '#181b22';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Coordinate transform: center on player
    const px = player.x;
    const pz = player.z;

    const toRadarX = (wx) => cx + (wx - px) * this.scale;
    const toRadarY = (wz) => cy + (wz - pz) * this.scale;

    // 3. Render Ocean Water (West of WORLD.COAST_X)
    const coastRadarX = toRadarX(WORLD.COAST_X);
    if (coastRadarX > cx - r) {
      ctx.fillStyle = '#0a354c';
      ctx.fillRect(cx - r, cy - r, Math.min(r * 2, coastRadarX - (cx - r)), r * 2);
    }

    // 4. Render Main Roads
    ctx.strokeStyle = '#2d3340';
    ctx.lineWidth = WORLD.ROAD_WIDTH * this.scale;

    // North-South avenues
    const nsRoads = [-105, -55, 0, 45, 115, 185];
    for (const rx of nsRoads) {
      const rxRadar = toRadarX(rx);
      ctx.beginPath();
      ctx.moveTo(rxRadar, cy - r);
      ctx.lineTo(rxRadar, cy + r);
      ctx.stroke();
    }

    // East-West streets
    const ewRoads = [-180, -115, -50, 20, 85, 150, 215];
    for (const rz of ewRoads) {
      const rzRadar = toRadarY(rz);
      ctx.beginPath();
      ctx.moveTo(cx - r, rzRadar);
      ctx.lineTo(cx + r, rzRadar);
      ctx.stroke();
    }

    // Overpass (highlighted in cyan/grey)
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = WORLD.OVERPASS_WIDTH * this.scale;
    const overpassXRadar = toRadarX(WORLD.OVERPASS_X);
    ctx.beginPath();
    ctx.moveTo(overpassXRadar, toRadarY(WORLD.OVERPASS_Z_START));
    ctx.lineTo(overpassXRadar, toRadarY(WORLD.OVERPASS_Z_END));
    ctx.stroke();

    // 5. Traffic & Police Vehicle Blips
    for (let i = 0; i < vehicles.vehicles.length; i++) {
      const v = vehicles.vehicles[i];
      if (v.isPlayerControlled) continue;

      const vx = toRadarX(v.x);
      const vy = toRadarY(v.z);
      const d = Math.hypot(vx - cx, vy - cy);
      if (d > r - 2) continue;

      if (v.isPolice) {
        // Flashing red & blue police pip
        const isRed = Math.sin(v.sirenTimer) > 0;
        ctx.fillStyle = isRed ? '#ff2222' : '#2288ff';
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal car pip
        ctx.fillStyle = '#8899aa';
        ctx.fillRect(vx - 2, vy - 2, 4, 4);
      }
    }

    // 6. Mission Waypoint Blip
    const target = missions.getTargetCoords();
    if (target) {
      let tx = toRadarX(target[0]);
      let ty = toRadarY(target[2]);
      const distToTarget = Math.hypot(tx - cx, ty - cy);

      // Clamp to radar edge if out of radar view
      if (distToTarget > r - 7) {
        const angle = Math.atan2(ty - cy, tx - cx);
        tx = cx + Math.cos(angle) * (r - 7);
        ty = cy + Math.sin(angle) * (r - 7);
      }

      // Golden diamond marker
      ctx.fillStyle = '#ffbb00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 6);
      ctx.lineTo(tx + 6, ty);
      ctx.lineTo(tx, ty + 6);
      ctx.lineTo(tx - 6, ty);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 7. Enemy Blips (combat)
    if (combat && combat.enemies) {
      ctx.fillStyle = '#ff3333';
      for (let i = 0; i < combat.enemies.length; i++) {
        const en = combat.enemies[i];
        if (!en.alive) continue;
        const ex = toRadarX(en.x);
        const ey = toRadarY(en.z);
        if (Math.hypot(ex - cx, ey - cy) < r - 2) {
          ctx.beginPath();
          ctx.arc(ex, ey, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 8. Player Heading Arrow (Center of radar)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.rotY);

    ctx.fillStyle = '#ffcc00';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 9);  // Pointing forward in direction of heading
    ctx.lineTo(5, -6);
    ctx.lineTo(0, -3);
    ctx.lineTo(-5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.restore(); // Restore clipping mask

    // 9. Cardinal Directions (N, S, E, W)
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('N', cx, cy - r - 9);
    ctx.fillText('S', cx, cy + r + 9);
    ctx.fillText('E', cx + r + 9, cy);
    ctx.fillText('W', cx - r - 9, cy);
  }
}
