// Rotating Radar Minimap System for Nightfall City: Vela Bay
// Displays dynamic roads, district water lines, active traffic, syndicate targets, and GPS route markers.

export const MINIMAP_DEFAULT_SIZE = 175; // Diameter in pixels
export const MINIMAP_RADAR_ZOOM = 1.35;  // Pixels per world meter

export class Minimap {
  constructor() {
    this.size = MINIMAP_DEFAULT_SIZE;
    this.radius = this.size / 2;
    this.zoom = MINIMAP_RADAR_ZOOM;
  }

  render(ctx, player, world, police, traffic, pedestrians, missions, screenWidth, screenHeight) {
    const cx = 110;
    const cy = screenHeight - 110;
    const r = this.radius;

    ctx.save();

    // Minimap boundary & clipping circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Dark radar background
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    bgGrad.addColorStop(0, 'rgba(15, 23, 36, 0.92)');
    bgGrad.addColorStop(1, 'rgba(8, 12, 20, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Center transform around player position and orient with player heading
    ctx.save();
    ctx.translate(cx, cy);
    const rotation = -(player.heading || 0);
    ctx.rotate(rotation);

    const px = player.x;
    const pz = player.z;

    // Draw Water (Ocean at West: x < -125, Harbour bay at South: z > 130)
    ctx.fillStyle = 'rgba(20, 110, 180, 0.45)';
    ctx.fillRect((-400 - px) * this.zoom, (-400 - pz) * this.zoom, 275 * this.zoom, 800 * this.zoom);
    ctx.fillRect((50 - px) * this.zoom, (130 - pz) * this.zoom, 350 * this.zoom, 300 * this.zoom);

    // Draw Central Park Green Lawn
    if (world.park) {
      const parkX = (world.park.x - px) * this.zoom;
      const parkZ = (world.park.z - pz) * this.zoom;
      const parkW = world.park.w * this.zoom;
      const parkD = world.park.d * this.zoom;
      ctx.fillStyle = 'rgba(40, 120, 65, 0.45)';
      ctx.fillRect(parkX - parkW / 2, parkZ - parkD / 2, parkW, parkD);
    }

    // Draw Marina Jetty Pier
    if (world.marina) {
      const jx = (world.marina.x - px) * this.zoom;
      const jz = (world.marina.z - pz) * this.zoom;
      const jw = world.marina.w * this.zoom;
      const jd = world.marina.d * this.zoom;
      ctx.fillStyle = 'rgba(90, 80, 70, 0.75)';
      ctx.fillRect(jx - jw / 2, jz - jd / 2, jw, jd);
    }

    // Draw Roads Grid
    ctx.lineWidth = 14 * this.zoom;
    ctx.strokeStyle = 'rgba(50, 60, 75, 0.85)';
    ctx.beginPath();
    for (const road of world.roads) {
      const x1 = (road.x1 - px) * this.zoom;
      const z1 = (road.z1 - pz) * this.zoom;
      const x2 = (road.x2 - px) * this.zoom;
      const z2 = (road.z2 - pz) * this.zoom;
      ctx.moveTo(x1, z1);
      ctx.lineTo(x2, z2);
    }
    ctx.stroke();

    // Draw Road Centerlines
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(230, 200, 80, 0.5)';
    ctx.beginPath();
    for (const road of world.roads) {
      const x1 = (road.x1 - px) * this.zoom;
      const z1 = (road.z1 - pz) * this.zoom;
      const x2 = (road.x2 - px) * this.zoom;
      const z2 = (road.z2 - pz) * this.zoom;
      ctx.moveTo(x1, z1);
      ctx.lineTo(x2, z2);
    }
    ctx.stroke();

    // Draw Elevated Skyway Overpass Deck
    if (world.overpass) {
      const op = world.overpass;
      ctx.lineWidth = op.width * this.zoom;
      ctx.strokeStyle = 'rgba(85, 95, 115, 0.95)';
      ctx.beginPath();
      ctx.moveTo((op.x1 - px) * this.zoom, (op.z - pz) * this.zoom);
      ctx.lineTo((op.x2 - px) * this.zoom, (op.z - pz) * this.zoom);
      ctx.stroke();

      // Overpass center divider
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = 'rgba(255, 180, 0, 0.85)';
      ctx.beginPath();
      ctx.moveTo((op.x1 - px) * this.zoom, (op.z - pz) * this.zoom);
      ctx.lineTo((op.x2 - px) * this.zoom, (op.z - pz) * this.zoom);
      ctx.stroke();
    }

    // Draw Buildings
    ctx.fillStyle = 'rgba(28, 36, 48, 0.9)';
    for (const b of world.buildings) {
      const bx = (b.x - px) * this.zoom;
      const bz = (b.z - pz) * this.zoom;
      const bw = b.w * this.zoom;
      const bd = b.d * this.zoom;
      if (Math.hypot(bx, bz) < r + 40) {
        ctx.fillRect(bx - bw / 2, bz - bd / 2, bw, bd);
      }
    }

    // Draw Traffic vehicles
    ctx.fillStyle = 'rgba(220, 220, 230, 0.75)';
    for (const v of traffic.vehicles) {
      if (v === player.vehicle) continue;
      const vx = (v.x - px) * this.zoom;
      const vz = (v.z - pz) * this.zoom;
      if (Math.hypot(vx, vz) < r) {
        ctx.fillRect(vx - 2, vz - 3, 4, 6);
      }
    }

    // Draw Mission Enemies (Red dots)
    ctx.fillStyle = 'rgba(255, 40, 40, 0.95)';
    for (const e of missions.enemies) {
      if (!e.alive) continue;
      const ex = (e.x - px) * this.zoom;
      const ez = (e.z - pz) * this.zoom;
      if (Math.hypot(ex, ez) < r) {
        ctx.beginPath();
        ctx.arc(ex, ez, e.isBoss ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Police Units (Flashing Blue/Red)
    if (police.wantedLevel > 0) {
      const flash = Math.sin(Date.now() * 0.015) > 0;
      ctx.fillStyle = flash ? 'rgba(255, 30, 30, 0.95)' : 'rgba(30, 140, 255, 0.95)';
      for (const c of police.cruisers) {
        const cx = (c.x - px) * this.zoom;
        const cz = (c.z - pz) * this.zoom;
        if (Math.hypot(cx, cz) < r) {
          ctx.beginPath();
          ctx.arc(cx, cz, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const o of police.officers) {
        if (!o.alive) continue;
        const ox = (o.x - px) * this.zoom;
        const oz = (o.z - pz) * this.zoom;
        if (Math.hypot(ox, oz) < r) {
          ctx.beginPath();
          ctx.arc(ox, oz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Evasion ring
      if (police.isEvading) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, police.copSightRadius * this.zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw Mission Objective Marker
    let targetObj = null;
    if (missions.activeMission && missions.currentStep) {
      targetObj = missions.currentStep.target;
      if (missions.currentStep.action === 'checkpoints') {
        targetObj = missions.currentStep.checkpoints[missions.currentCheckpointIndex];
      }
    } else if (!missions.activeMission && missions.currentMission) {
      targetObj = missions.currentMission.startMarker;
    }

    if (targetObj) {
      const tx = (targetObj.x - px) * this.zoom;
      const tz = (targetObj.z - pz) * this.zoom;
      const dist = Math.hypot(tx, tz);

      // Clamp to edge if off minimap
      let drawX = tx;
      let drawZ = tz;
      if (dist > r - 12) {
        const angle = Math.atan2(tz, tx);
        drawX = Math.cos(angle) * (r - 12);
        drawZ = Math.sin(angle) * (r - 12);
      }

      // Glowing Diamond
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(drawX, drawZ - 7);
      ctx.lineTo(drawX + 7, drawZ);
      ctx.lineTo(drawX, drawZ + 7);
      ctx.lineTo(drawX - 7, drawZ);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Courier Objective Marker (Green Diamond)
    if (missions.courierRun && missions.courierRun.active && missions.courierRun.target) {
      const cxTarget = missions.courierRun.target;
      const ctx_x = (cxTarget.x - px) * this.zoom;
      const ctx_z = (cxTarget.z - pz) * this.zoom;
      const cDist = Math.hypot(ctx_x, ctx_z);
      let cdrawX = ctx_x;
      let cdrawZ = ctx_z;
      if (cDist > r - 12) {
        const cAngle = Math.atan2(ctx_z, ctx_x);
        cdrawX = Math.cos(cAngle) * (r - 12);
        cdrawZ = Math.sin(cAngle) * (r - 12);
      }
      ctx.fillStyle = '#2ecc71';
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cdrawX, cdrawZ - 6);
      ctx.lineTo(cdrawX + 6, cdrawZ);
      ctx.lineTo(cdrawX, cdrawZ + 6);
      ctx.lineTo(cdrawX - 6, cdrawZ);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Taxi Shift Objective (Yellow/Gold Marker)
    if (missions.taxiShift && missions.taxiShift.active) {
      const target = missions.taxiShift.state === 'seeking_fare' ? missions.taxiShift.passenger : missions.taxiShift.destination;
      if (target) {
        const tx_x = (target.x - px) * this.zoom;
        const tx_z = (target.z - pz) * this.zoom;
        const tDist = Math.hypot(tx_x, tx_z);
        let tdrawX = tx_x;
        let tdrawZ = tx_z;
        if (tDist > r - 12) {
          const tAngle = Math.atan2(tx_z, tx_x);
          tdrawX = Math.cos(tAngle) * (r - 12);
          tdrawZ = Math.sin(tAngle) * (r - 12);
        }
        ctx.fillStyle = '#f1c40f';
        ctx.shadowColor = '#f1c40f';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(tdrawX, tdrawZ, 5.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw Nearby Vela Wave Mixtapes (Magenta blips when within 60m)
    if (world.mixtapes) {
      ctx.fillStyle = '#e056fd';
      for (const m of world.mixtapes) {
        if (world.collectedMixtapes && world.collectedMixtapes.has(m.id)) continue;
        const mDist = Math.hypot(m.x - px, m.z - pz);
        if (mDist < 60) {
          const mx = (m.x - px) * this.zoom;
          const mz = (m.z - pz) * this.zoom;
          if (Math.hypot(mx, mz) < r - 5) {
            ctx.beginPath();
            ctx.arc(mx, mz, 3.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Draw Nearby Smuggler Caches (Amber blips when within 50m)
    if (world.smugglerCaches) {
      ctx.fillStyle = '#f39c12';
      for (const cache of world.smugglerCaches) {
        if (world.collectedCaches && world.collectedCaches.has(cache.id)) continue;
        const cDist = Math.hypot(cache.x - px, cache.z - pz);
        if (cDist < 55) {
          const cacheX = (cache.x - px) * this.zoom;
          const cacheZ = (cache.z - pz) * this.zoom;
          if (Math.hypot(cacheX, cacheZ) < r - 5) {
            ctx.beginPath();
            ctx.arc(cacheX, cacheZ, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    ctx.restore(); // Undo player transform

    // Draw Player Center Triangle (pointing Up)
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 6, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore(); // Undo clip

    // Bezel Border & Compass Ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#223048';
    ctx.stroke();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.stroke();

    // North & Cardinal Indicators on Bezel
    const nAngle = -(player.heading || 0) - Math.PI / 2;
    const nx = cx + Math.cos(nAngle) * (r - 10);
    const ny = cy + Math.sin(nAngle) * (r - 10);
    ctx.fillStyle = '#ff3344';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    // East Indicator
    const eAngle = nAngle + Math.PI / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillText('E', cx + Math.cos(eAngle) * (r - 10), cy + Math.sin(eAngle) * (r - 10));

    // South and West Cardinal Indicators
    const sAngle = nAngle + Math.PI;
    ctx.fillText('S', cx + Math.cos(sAngle) * (r - 10), cy + Math.sin(sAngle) * (r - 10));
    const wAngle = nAngle + (Math.PI * 3) / 2;
    ctx.fillText('W', cx + Math.cos(wAngle) * (r - 10), cy + Math.sin(wAngle) * (r - 10));
  }
}

export const minimap = new Minimap();
