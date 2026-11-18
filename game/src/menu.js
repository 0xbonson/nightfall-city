// Start Menu, Pause Menu, Controls, and Story Ending Screen for Nightfall City

import { SaveManager } from './save.js';
import { audio } from './audio.js';

export const MENU_BUTTON_WIDTH = 260;
export const MENU_BUTTON_HEIGHT = 46;

export class MenuManager {
  constructor() {
    this.state = 'title'; // 'title', 'controls', 'playing', 'paused', 'ending'
    this.hasSave = SaveManager.hasSave();
    this.buttons = [];
  }

  refreshSaveStatus() {
    this.hasSave = SaveManager.hasSave();
  }

  render(ctx, width, height, player, world, missions) {
    this.buttons = [];

    if (this.state === 'title') {
      this.renderTitleScreen(ctx, width, height);
    } else if (this.state === 'controls') {
      this.renderControlsScreen(ctx, width, height);
    } else if (this.state === 'paused') {
      this.renderPauseScreen(ctx, width, height, player, world, missions);
    } else if (this.state === 'ending') {
      this.renderEndingScreen(ctx, width, height);
    }
  }

  renderTitleScreen(ctx, width, height) {
    // Subtle dark gradient over the 3D city backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(10, 15, 26, 0.4)');
    grad.addColorStop(0.5, 'rgba(8, 12, 22, 0.7)');
    grad.addColorStop(1, 'rgba(5, 8, 16, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.textAlign = 'center';

    // Logo & Title
    const titleY = height * 0.28;
    ctx.font = '900 64px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('NIGHTFALL CITY', width / 2 + 4, titleY + 4);

    // Neon gradient for main title
    const textGrad = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
    textGrad.addColorStop(0, '#ff007f'); // Neon pink
    textGrad.addColorStop(0.5, '#ffaa00'); // Sunset amber
    textGrad.addColorStop(1, '#00f0ff'); // Cyan
    ctx.fillStyle = textGrad;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 18;
    ctx.fillText('NIGHTFALL CITY', width / 2, titleY);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffcc00';
    ctx.letterSpacing = '4px';
    ctx.fillText('VELA BAY · OPEN WORLD CRIME', width / 2, titleY + 34);

    // Menu Buttons
    const btnW = MENU_BUTTON_WIDTH;
    const btnH = MENU_BUTTON_HEIGHT;
    const btnX = width / 2 - btnW / 2;
    let btnY = height * 0.50;

    this.drawButton(ctx, btnX, btnY, btnW, btnH, 'START NEW GAME', 'start');
    btnY += 60;

    if (this.hasSave) {
      this.drawButton(ctx, btnX, btnY, btnW, btnH, 'CONTINUE CAREER', 'continue');
      btnY += 60;
    }

    this.drawButton(ctx, btnX, btnY, btnW, btnH, 'CONTROLS', 'controls');
    btnY += 60;

    const radioLabel = audio.radioStation === 1 ? 'RADIO: VELA WAVE' : audio.radioStation === 2 ? 'RADIO: NIGHTFALL' : 'RADIO: OFF';
    this.drawButton(ctx, btnX, btnY, btnW, btnH, radioLabel, 'toggle_radio');

    // Footer credits & edition
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Nightfall City: Vela Bay · make.fun (gta6-01) · 100% Offline Static ES Modules', width / 2, height - 24);

    ctx.restore();
  }

  renderControlsScreen(ctx, width, height) {
    ctx.fillStyle = 'rgba(5, 8, 16, 0.92)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('CONTROLS & SHORTCUTS', width / 2, height * 0.18);

    const controls = [
      ['W, A, S, D', 'Move on Foot / Steer & Accelerate in Car'],
      ['Shift', 'Sprint on Foot'],
      ['Space', 'Handbrake & Drift in Car'],
      ['F or E', 'Jack Nearby Vehicle / Exit Vehicle'],
      ['H', 'Honk Vehicle Horn (Alerts Pedestrians & Traffic)'],
      ['T', 'Express Courier Run (Timed Delivery Loop for Cash)'],
      ['K', 'Taxi Shift (Pick Up Passengers & Earn Fares)'],
      ['Mouse Look', 'Look Around / Aim (Pointer Lock enabled)'],
      ['Left Mouse Click', 'Fire Weapon (Pistol / Assault Rifle)'],
      ['R', 'Reload Weapon / Change Radio Station'],
      ['1 / 2 / Q', 'Switch Weapons'],
      ['M / Esc / P', 'Tactical Pause Map & Dossier'],
    ];

    let rowY = height * 0.28;
    ctx.font = '15px system-ui, sans-serif';
    for (const [key, desc] of controls) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(key, width / 2 - 20, rowY);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(desc, width / 2 + 20, rowY);
      rowY += 32;
    }

    const btnW = 200;
    const btnH = 44;
    this.drawButton(ctx, width / 2 - btnW / 2, height * 0.82, btnW, btnH, 'BACK', 'back_title');

    ctx.restore();
  }

  renderPauseScreen(ctx, width, height, player, world, missions) {
    // Backdrop overlay
    ctx.fillStyle = 'rgba(8, 12, 20, 0.88)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    // Header Banner
    ctx.textAlign = 'left';
    ctx.font = '900 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillText('VELA BAY · TACTICAL PAUSE MAP', 40, 48);
    ctx.shadowBlur = 0;

    // Layout dimensions
    const mapX = 40;
    const mapY = 70;
    const mapW = Math.max(340, Math.min(680, width * 0.58));
    const mapH = height - 110;

    // Draw Map Frame
    ctx.fillStyle = 'rgba(12, 18, 28, 0.95)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    // Map Clipping Region
    ctx.save();
    ctx.beginPath();
    ctx.rect(mapX + 2, mapY + 2, mapW - 4, mapH - 4);
    ctx.clip();

    const scale = Math.min((mapW - 30) / 600, (mapH - 30) / 600);
    const cx = mapX + mapW / 2;
    const cy = mapY + mapH / 2;

    // Coordinate conversion
    const toScreenX = (wx) => cx + wx * scale;
    const toScreenY = (wz) => cy + wz * scale;

    // 1. Water areas (Ocean at west, Bay at south)
    ctx.fillStyle = 'rgba(18, 55, 95, 0.85)';
    // West ocean
    ctx.fillRect(mapX, mapY, toScreenX(-125) - mapX, mapH);
    // South harbour water
    ctx.fillRect(toScreenX(50), toScreenY(130), mapW, mapH);

    // 2. City land mass
    ctx.fillStyle = 'rgba(24, 32, 44, 0.9)';
    ctx.fillRect(toScreenX(-125), toScreenY(-260), toScreenX(260) - toScreenX(-125), toScreenY(260) - toScreenY(-260));

    // 3. Roads
    if (world && world.roads) {
      ctx.lineWidth = 7 * scale * 2.2;
      ctx.strokeStyle = 'rgba(48, 58, 72, 0.9)';
      ctx.beginPath();
      for (const road of world.roads) {
        ctx.moveTo(toScreenX(road.x1), toScreenY(road.z1));
        ctx.lineTo(toScreenX(road.x2), toScreenY(road.z2));
      }
      ctx.stroke();

      // Road yellow centerlines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 204, 0, 0.4)';
      ctx.beginPath();
      for (const road of world.roads) {
        ctx.moveTo(toScreenX(road.x1), toScreenY(road.z1));
        ctx.lineTo(toScreenX(road.x2), toScreenY(road.z2));
      }
      ctx.stroke();
    }

    // Central Park & Marina on tactical map
    if (world && world.park) {
      ctx.fillStyle = 'rgba(40, 130, 70, 0.55)';
      ctx.fillRect(toScreenX(world.park.x - world.park.w / 2), toScreenY(world.park.z - world.park.d / 2), world.park.w * scale, world.park.d * scale);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.fillText('CENTRAL PARK', toScreenX(world.park.x), toScreenY(world.park.z));
    }
    if (world && world.marina) {
      ctx.fillStyle = 'rgba(80, 70, 60, 0.75)';
      ctx.fillRect(toScreenX(world.marina.x - world.marina.w / 2), toScreenY(world.marina.z - world.marina.d / 2), world.marina.w * scale, world.marina.d * scale);
    }
    // Elevated Skyway Overpass Deck
    if (world && world.overpass) {
      const op = world.overpass;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(120, 135, 160, 0.95)';
      ctx.beginPath();
      ctx.moveTo(toScreenX(op.x1), toScreenY(op.z));
      ctx.lineTo(toScreenX(op.x2), toScreenY(op.z));
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255, 180, 0, 0.9)';
      ctx.beginPath();
      ctx.moveTo(toScreenX(op.x1), toScreenY(op.z));
      ctx.lineTo(toScreenX(op.x2), toScreenY(op.z));
      ctx.stroke();
    }

    // 4. District Labels on Map
    const districts = [
      { name: 'OCEAN PROMENADE', wx: -85, wz: -80, color: 'rgba(56, 189, 248, 0.8)' },
      { name: 'DOWNTOWN SKYLINE', wx: 0, wz: -140, color: 'rgba(251, 191, 36, 0.8)' },
      { name: 'FINANCIAL QUARTER', wx: 120, wz: -60, color: 'rgba(167, 139, 250, 0.8)' },
      { name: 'OLD MARKET', wx: -30, wz: 60, color: 'rgba(248, 113, 113, 0.8)' },
      { name: 'MERIDIAN DOCKS', wx: 130, wz: 180, color: 'rgba(52, 211, 153, 0.8)' }
    ];

    ctx.textAlign = 'center';
    ctx.font = 'bold 10px system-ui, sans-serif';
    for (const dist of districts) {
      ctx.fillStyle = dist.color;
      ctx.fillText(dist.name, toScreenX(dist.wx), toScreenY(dist.wz));
    }

    // 5. Mission Objective Marker
    if (missions) {
      let markerPos = null;
      let label = 'MISSION';
      if (missions.activeMission && missions.currentStep?.target) {
        markerPos = missions.currentStep.target;
        label = 'OBJECTIVE';
      } else if (missions.currentMission?.startMarker) {
        markerPos = missions.currentMission.startMarker;
        label = missions.currentMission.title;
      }

      if (markerPos) {
        const mx = toScreenX(markerPos.x);
        const my = toScreenY(markerPos.z);
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(label, mx, my - 10);
      }
    }

    // 6. Player Position Pin
    if (player) {
      const px = toScreenX(player.x);
      const py = toScreenY(player.z);

      // Pulse ring
      const pulse = (Math.sin(Date.now() / 200) + 1) * 3 + 6;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Heading arrow
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(player.heading || 0);

      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(-5, -6);
      ctx.lineTo(0, -3);
      ctx.lineTo(5, -6);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('YOU', px, py + 18);
    }

    // North Compass Indicator
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('▲ N', mapX + 24, mapY + 28);

    ctx.restore(); // End map clip

    // Right Side: Pause Controls, Mission List, and Career Dossier
    const panelX = mapX + mapW + 28;
    const panelW = width - panelX - 40;
    let py = mapY + 12;

    ctx.textAlign = 'left';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('TACTICAL DOSSIER', panelX, py);

    py += 22;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('STORY CAMPAIGN (8 MISSIONS):', panelX, py);
    py += 16;

    const missionTitles = [
      '1. The Marina Drop',
      '2. Repo on Vane Turf',
      '3. Market Muscle',
      '4. Vela Bay Sprint',
      '5. Armory Infiltration',
      '6. Nightfall at the Docks',
      '7. The Skyway Lockdown',
      '8. The Sunset Syndicate Heist'
    ];

    ctx.font = '11px system-ui, monospace';
    const curIdx = missions ? missions.currentMissionIndex : 0;
    for (let i = 0; i < missionTitles.length; i++) {
      if (i < curIdx) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillText(`[✔] ${missionTitles[i]}`, panelX, py);
      } else if (i === curIdx && !missions.storyCompleted) {
        ctx.fillStyle = '#f39c12';
        ctx.fillText(`[►] ${missionTitles[i]} (ACTIVE)`, panelX, py);
      } else if (missions.storyCompleted) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillText(`[✔] ${missionTitles[i]}`, panelX, py);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillText(`[ ] ${missionTitles[i]}`, panelX, py);
      }
      py += 15;
    }

    py += 8;

    // Career Quick Stats
    if (player) {
      ctx.font = 'bold 12px system-ui, monospace';
      ctx.fillStyle = '#39e75f';
      ctx.fillText(`CASH: $${player.cash.toLocaleString()}`, panelX, py);
      py += 16;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`HEALTH: ${Math.round(player.health)}%  ARMOR: ${Math.round(player.armor)}%`, panelX, py);
      py += 16;
      const collectedCount = world && world.collectedCaches ? world.collectedCaches.size : 0;
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`SMUGGLER CACHES: ${collectedCount} / 15`, panelX, py);
      py += 15;
      const collectedMixtapes = world && world.collectedMixtapes ? world.collectedMixtapes.size : 0;
      ctx.fillStyle = '#e056fd';
      ctx.fillText(`VELA MIXTAPES: ${collectedMixtapes} / 10`, panelX, py);
      py += 15;
      const courierCount = missions && missions.courierRun ? missions.courierRun.completedRuns : 0;
      ctx.fillStyle = '#a855f7';
      ctx.fillText(`EXPRESS DELIVERIES: ${courierCount}`, panelX, py);
      py += 15;
      const taxiCount = missions && missions.taxiShift ? missions.taxiShift.completedFares : 0;
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(`TAXI FARES: ${taxiCount}`, panelX, py);
    }

    // Action Buttons
    const btnW = Math.min(260, panelW);
    const btnH = 38;
    let btnY = height - 195;

    this.drawButton(ctx, panelX, btnY, btnW, btnH, 'RESUME CAREER', 'resume');
    btnY += 46;
    const isCourierActive = missions && missions.courierRun && missions.courierRun.active;
    this.drawButton(ctx, panelX, btnY, btnW, btnH, isCourierActive ? 'CANCEL COURIER JOB' : 'START COURIER JOB', 'toggle_courier');
    btnY += 46;
    this.drawButton(ctx, panelX, btnY, btnW, btnH, 'SAVE GAME', 'save');
    btnY += 46;
    this.drawButton(ctx, panelX, btnY, btnW, btnH, 'QUIT TO TITLE', 'quit_title');

    ctx.restore();
  }

  renderEndingScreen(ctx, width, height) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(30, 10, 40, 0.95)');
    grad.addColorStop(1, 'rgba(10, 5, 20, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = '900 48px system-ui, sans-serif';
    ctx.fillStyle = '#ffcc00';
    ctx.fillText('NIGHTFALL CITY CONQUERED', width / 2, height * 0.25);

    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('Vela Bay is yours, Rhea "Rook" Solano.', width / 2, height * 0.34);

    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#ecf0f1';
    const lines = [
      'The Vane Street Syndicate has crumbled.',
      'Corrupt Police Captain Reynolds has been ousted.',
      'Port Meridian family honors your independence as Queen of the Streets.',
      'All 7 Story Missions completed successfully.',
      'Free roam continues with your earnings, cars, and courier contracts.'
    ];

    let ly = height * 0.42;
    for (const line of lines) {
      ctx.fillText(line, width / 2, ly);
      ly += 30;
    }

    const btnW = 240;
    const btnH = 46;
    this.drawButton(ctx, width / 2 - btnW / 2, height * 0.76, btnW, btnH, 'CONTINUE FREE ROAM', 'continue_roam');

    ctx.restore();
  }

  drawButton(ctx, x, y, w, h, text, action) {
    this.buttons.push({ x, y, w, h, action });

    ctx.save();
    ctx.fillStyle = 'rgba(20, 30, 45, 0.85)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + w / 2, y + h / 2 + 5);
    ctx.restore();
  }

  handleClick(mouseX, mouseY) {
    for (const btn of this.buttons) {
      if (
        mouseX >= btn.x &&
        mouseX <= btn.x + btn.w &&
        mouseY >= btn.y &&
        mouseY <= btn.y + btn.h
      ) {
        audio.playCash();
        return btn.action;
      }
    }
    return null;
  }
}

export const menu = new MenuManager();
