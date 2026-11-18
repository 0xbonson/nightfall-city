/**
 * Nightfall City: Vela Bay - High-Fidelity Tactical GPS Minimap
 * Authored by makefun agent for the open-world crime game entry.
 * Sun-Soaked Vela Bay Edition - Rotating GPS Radar & District Boundaries display.
 *
 * Renders a circular navigation radar with:
 * - Dynamic ocean water & marina coastline
 * - District-shaded city blocks and arterial road network
 * - Safehouse garage wrench icon & stash indicator
 * - Multi-layer traffic pips, flashing dual-tone police indicators
 * - Glowing mission objective beacons with edge clamping
 * - Distinct compass markers and North indicator
 * - Articulated player heading chevron with heading sweep
 */

import { WORLD, SAFEHOUSE } from './config.js';

export class Minimap {
  constructor(radius = 76) {
    this.radius = radius;
    this.cx = radius + 32;
    this.cy = 0; // Updated dynamically from viewport height
    this.scale = 0.55; // World meters to radar pixels (shows ~138m radius)
    this.pulsePhase = 0;
  }

  render(ctx, h, player, vehicles, police, missions, combat, garage) {
    this.cy = h - this.radius - 32;
    this.pulsePhase = (this.pulsePhase + 0.05) % (Math.PI * 2);

    const cx = this.cx;
    const cy = this.cy;
    const r = this.radius;

    ctx.save();

    // 1. Radar Glass Outer Ring & Shadow
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10, 14, 22, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bezel border
    ctx.strokeStyle = 'rgba(100, 130, 170, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Secondary inner decorative bezel ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(30, 45, 65, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Circular Clipping Mask for internal contents
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // City ground base
    ctx.fillStyle = '#171b24';
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Transform setup: player-centric coordinate space
    const px = player.x;
    const pz = player.z;
    const toRadarX = (wx) => cx + (wx - px) * this.scale;
    const toRadarY = (wz) => cy + (wz - pz) * this.scale;

    // 3. Render Ocean Water & Marina Coastline
    const coastRadarX = toRadarX(WORLD.COAST_X);
    if (coastRadarX > cx - r) {
      const oceanRight = Math.min(cx + r, coastRadarX);
      ctx.fillStyle = '#0a324b';
      ctx.fillRect(cx - r, cy - r, oceanRight - (cx - r), r * 2);

      // Surf / Shoreline foam fringe
      ctx.strokeStyle = 'rgba(120, 200, 240, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(coastRadarX, cy - r);
      ctx.lineTo(coastRadarX, cy + r);
      ctx.stroke();

      // Marina Pier Docks (west jutting slips)
      ctx.fillStyle = '#3a4450';
      const pierZList = [-80, -20, 40, 100];
      for (const pzVal of pierZList) {
        const pzRad = toRadarY(pzVal);
        if (pzRad >= cy - r - 10 && pzRad <= cy + r + 10) {
          ctx.fillRect(coastRadarX - 22, pzRad - 2.5, 22, 5);
        }
      }
    }

    // 4. District Area Shading
    // Industrial Docks (South-West)
    const docksX0 = toRadarX(-120);
    const docksZ0 = toRadarY(60);
    const docksW = 90 * this.scale;
    const docksH = 160 * this.scale;
    ctx.fillStyle = 'rgba(60, 45, 30, 0.25)';
    ctx.fillRect(docksX0, docksZ0, docksW, docksH);

    // Downtown (Central high-rise grid)
    const dtX0 = toRadarX(-30);
    const dtZ0 = toRadarY(-80);
    const dtW = 120 * this.scale;
    const dtH = 140 * this.scale;
    ctx.fillStyle = 'rgba(30, 60, 90, 0.22)';
    ctx.fillRect(dtX0, dtZ0, dtW, dtH);

    // 5. Road Network Grid
    ctx.strokeStyle = '#2d3545';
    ctx.lineWidth = WORLD.ROAD_WIDTH * this.scale;

    // North-South Avenues
    const nsRoads = [-105, -55, 0, 45, 115, 185];
    for (const rx of nsRoads) {
      const rxRad = toRadarX(rx);
      ctx.beginPath();
      ctx.moveTo(rxRad, cy - r);
      ctx.lineTo(rxRad, cy + r);
      ctx.stroke();
    }

    // East-West Streets
    const ewRoads = [-180, -115, -50, 20, 85, 150, 215];
    for (const rz of ewRoads) {
      const rzRad = toRadarY(rz);
      ctx.beginPath();
      ctx.moveTo(cx - r, rzRad);
      ctx.lineTo(cx + r, rzRad);
      ctx.stroke();
    }

    // Elevated Highway / Overpass
    ctx.strokeStyle = '#4e6278';
    ctx.lineWidth = WORLD.OVERPASS_WIDTH * this.scale;
    const overpassXRadar = toRadarX(WORLD.OVERPASS_X);
    ctx.beginPath();
    ctx.moveTo(overpassXRadar, toRadarY(WORLD.OVERPASS_Z_START));
    ctx.lineTo(overpassXRadar, toRadarY(WORLD.OVERPASS_Z_END));
    ctx.stroke();

    // Harbor Suspension Bridge
    ctx.strokeStyle = '#627084';
    ctx.lineWidth = 6 * this.scale;
    const bridgeX1 = toRadarX(-115);
    const bridgeZ1 = toRadarY(130);
    const bridgeX2 = toRadarX(-215);
    const bridgeZ2 = toRadarY(130);
    ctx.beginPath();
    ctx.moveTo(bridgeX1, bridgeZ1);
    ctx.lineTo(bridgeX2, bridgeZ2);
    ctx.stroke();

    // Concentric Range Rings
    ctx.strokeStyle = 'rgba(120, 160, 210, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Safehouse Garage Icon (Green wrench / shelter box)
    const garX = toRadarX(SAFEHOUSE.X);
    const garZ = toRadarY(SAFEHOUSE.Z);
    if (Math.hypot(garX - cx, garZ - cy) < r - 4) {
      ctx.fillStyle = '#22cc55';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(garX, garZ, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('H', garX, garZ + 3);
    }

    // 7. Traffic & Police Vehicles
    if (vehicles && vehicles.vehicles) {
      for (let i = 0; i < vehicles.vehicles.length; i++) {
        const v = vehicles.vehicles[i];
        if (v.isPlayerControlled) continue;

        const vx = toRadarX(v.x);
        const vy = toRadarY(v.z);
        const dist = Math.hypot(vx - cx, vy - cy);
        if (dist > r - 3) continue;

        if (v.isPolice) {
          const flash = Math.sin(v.sirenTimer * 2) > 0;
          ctx.fillStyle = flash ? '#ff2a2a' : '#2288ff';
          ctx.beginPath();
          ctx.arc(vx, vy, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#8b9bb4';
          ctx.fillRect(vx - 2.5, vy - 2.5, 5, 5);
        }
      }
    }

    // Police Chopper
    if (police && police.helicopter && police.helicopter.active) {
      const hx = toRadarX(police.helicopter.x);
      const hy = toRadarY(police.helicopter.z);
      if (Math.hypot(hx - cx, hy - cy) < r - 4) {
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 8. Hostile Syndicate Enforcer Blips
    if (combat && combat.enemies) {
      ctx.fillStyle = '#ff2222';
      for (let i = 0; i < combat.enemies.length; i++) {
        const en = combat.enemies[i];
        if (!en.alive) continue;
        const ex = toRadarX(en.x);
        const ey = toRadarY(en.z);
        if (Math.hypot(ex - cx, ey - cy) < r - 2) {
          ctx.beginPath();
          ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 9. Mission Objective Beacon (Glowing Diamond)
    const target = missions ? missions.getTargetCoords() : null;
    if (target) {
      let tx = toRadarX(target[0]);
      let ty = toRadarY(target[2]);
      const distToTarget = Math.hypot(tx - cx, ty - cy);

      const clamped = distToTarget > r - 8;
      if (clamped) {
        const angle = Math.atan2(ty - cy, tx - cx);
        tx = cx + Math.cos(angle) * (r - 8);
        ty = cy + Math.sin(angle) * (r - 8);
      }

      const aura = 6 + Math.sin(this.pulsePhase) * 2;
      ctx.fillStyle = 'rgba(255, 200, 40, 0.35)';
      ctx.beginPath();
      ctx.arc(tx, ty, aura, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffc400';
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 6.5);
      ctx.lineTo(tx + 6.5, ty);
      ctx.lineTo(tx, ty + 6.5);
      ctx.lineTo(tx - 6.5, ty);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 10. Player Chevron (Rotated to heading)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.rotY);

    ctx.fillStyle = 'rgba(255, 220, 80, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 24, -Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd500';
    ctx.strokeStyle = '#05070a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(5.5, -6);
    ctx.lineTo(0, -3);
    ctx.lineTo(-5.5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.restore(); // End clipping mask

    // 11. North Badge & Compass Markings
    ctx.save();
    const nBadgeY = cy - r - 12;
    ctx.fillStyle = 'rgba(15, 20, 30, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, nBadgeY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff3344';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '900 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('N', cx, nBadgeY);

    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = 'rgba(180, 200, 230, 0.75)';
    ctx.fillText('S', cx, cy + r + 10);
    ctx.fillText('E', cx + r + 11, cy);
    ctx.fillText('W', cx - r - 11, cy);

    ctx.restore();
  }
}
