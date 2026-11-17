// Rotating Radar Minimap System for Nightfall City

export class Minimap {
  constructor() {
    this.size = 175; // Diameter in pixels
    this.radius = this.size / 2;
    this.zoom = 1.35; // Pixels per world meter
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

    // Draw Water (Ocean at West & South)
    ctx.fillStyle = 'rgba(20, 110, 180, 0.45)';
    ctx.fillRect((-300 - px) * this.zoom, (220 - pz) * this.zoom, 600 * this.zoom, 100 * this.zoom);

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
  }
}

export const minimap = new Minimap();
