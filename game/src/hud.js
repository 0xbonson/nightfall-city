// Heads-Up Display (HUD) and Minimap Integration for Nightfall City

import { minimap } from './minimap.js';
import { screenEffects } from './effects.js';
import { CONFIG } from './config.js';

export const HUD_STATUS_BAR_WIDTH = 140;
export const HUD_STATUS_BAR_HEIGHT = 12;
export const HUD_VIGNETTE_ALPHA = 0.28; // Subtle cinematic vignette edge falloff

export class HUD {
  render(ctx, player, world, police, traffic, pedestrians, missions, width, height) {
    ctx.clearRect(0, 0, width, height);

    // 0. Screen-wide cinematic vignette & warm sunlit bloom
    const vigGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.38, width / 2, height / 2, width * 0.75);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, `rgba(18, 12, 8, ${HUD_VIGNETTE_ALPHA})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);

    // Warm golden hour bloom over the late-afternoon sunlit upper frame
    const bloomGrad = ctx.createRadialGradient(width * 0.76, height * 0.18, 0, width * 0.76, height * 0.18, width * 0.42);
    bloomGrad.addColorStop(0, 'rgba(255, 238, 195, 0.13)');
    bloomGrad.addColorStop(0.4, 'rgba(255, 205, 145, 0.06)');
    bloomGrad.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.fillStyle = bloomGrad;
    ctx.fillRect(0, 0, width, height);

    // 1. Damage Hit Vignette / Red Flash
    if (screenEffects.hitFlash > 0.01) {
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, 'rgba(255, 0, 0, 0)');
      grad.addColorStop(1, `rgba(200, 0, 0, ${screenEffects.hitFlash * 0.75})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // High velocity radial motion speed lines
    if (player.inVehicle && player.vehicle) {
      const mph = Math.abs(player.vehicle.speed * 3.6);
      if (mph > 65) {
        const intensity = Math.min(1.0, (mph - 65) / 50.0);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.35})`;
        ctx.lineWidth = 1.6;
        const cx = width / 2;
        const cy = height / 2;
        const numLines = Math.floor(18 + intensity * 24);
        for (let i = 0; i < numLines; i++) {
          const angle = (i / numLines) * Math.PI * 2 + (Math.sin(Date.now() * 0.01 + i) * 0.05);
          const rInner = width * (0.28 + (i % 3) * 0.06);
          const rOuter = width * 0.72;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
          ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // White explosion flash
    if (screenEffects.whiteFlash > 0.01) {
      ctx.fillStyle = `rgba(255, 255, 255, ${screenEffects.whiteFlash * 0.6})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Crosshair (when on foot)
    if (!player.inVehicle && player.alive) {
      const cx = width / 2;
      const cy = height / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;

      const spread = 7;
      ctx.beginPath();
      // 4 crosshair ticks
      ctx.moveTo(cx - spread - 8, cy); ctx.lineTo(cx - spread, cy);
      ctx.moveTo(cx + spread, cy); ctx.lineTo(cx + spread + 8, cy);
      ctx.moveTo(cx, cy - spread - 8); ctx.lineTo(cx, cy - spread);
      ctx.moveTo(cx, cy + spread); ctx.lineTo(cx, cy + spread + 8);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Top-Right: Cash, Wanted Stars, Health & Armor, Weapon Readout, Smuggler Caches
    this.renderStatusBars(ctx, player, police, world, width);

    // 4. Top-Center: Mission Objective Banner & Express Courier Banner
    this.renderMissionBanner(ctx, missions, player, width);

    // 5. Vehicle Speedometer (when driving)
    if (player.inVehicle && player.vehicle) {
      this.renderSpeedometer(ctx, player.vehicle, width, height);
    }

    // 6. Interaction Hint Prompt & Alley Escape Route Notice
    this.renderInteractionHint(ctx, player, world, police, traffic, width, height);

    // 7. Dialogue Subtitles Box
    if (missions.dialogue) {
      this.renderDialogue(ctx, missions.dialogue, width, height);
    }

    // 8. Control Legend (Top-Left)
    this.renderControls(ctx);

    // 9. Minimap (Bottom-Left)
    minimap.render(ctx, player, world, police, traffic, pedestrians, missions, width, height);

    // 10. Wasted / Death Overlay
    if (player.isWasted) {
      ctx.fillStyle = 'rgba(120, 0, 0, 0.55)';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.font = '900 64px Impact, system-ui, sans-serif';
      ctx.fillStyle = '#ff2233';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.strokeText('WASTED', width / 2, height / 2);
      ctx.fillText('WASTED', width / 2, height / 2);
      ctx.restore();
    }
  }

  renderStatusBars(ctx, player, police, world, width) {
    const right = width - 24;
    let y = 28;

    // Cash Display ($)
    ctx.save();
    ctx.font = '900 32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000000';
    ctx.fillText(`$${player.cash.toLocaleString()}`, right + 2, y + 2);
    ctx.fillStyle = '#39e75f';
    ctx.shadowColor = '#39e75f';
    ctx.shadowBlur = 8;
    ctx.fillText(`$${player.cash.toLocaleString()}`, right, y);
    ctx.shadowBlur = 0;
    ctx.restore();

    y += 34;

    // Wanted Stars (0 to 5)
    ctx.save();
    const starSize = 22;
    const starGap = 26;
    const starStartX = right - (5 * starGap) + 8;
    const isFlashing = police.isEvading && (Math.floor(Date.now() / 250) % 2 === 0);

    for (let i = 0; i < 5; i++) {
      const sx = starStartX + i * starGap;
      const isFilled = i < police.wantedLevel;

      if (isFilled && !isFlashing) {
        ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 10;
      } else if (isFilled && isFlashing) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = 'rgba(100, 110, 130, 0.35)';
        ctx.shadowBlur = 0;
      }

      this.drawStar(ctx, sx, y, starSize / 2, starSize / 4);
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    y += 26;

    // Health and Armor Bars
    const barWidth = HUD_STATUS_BAR_WIDTH;
    const barHeight = HUD_STATUS_BAR_HEIGHT;

    // Health Bar (Green)
    ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
    ctx.fillRect(right - barWidth, y, barWidth, barHeight);
    const healthRatio = Math.max(0, player.health / player.maxHealth);
    ctx.fillStyle = healthRatio > 0.25 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(right - barWidth, y, barWidth * healthRatio, barHeight);
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(right - barWidth, y, barWidth, barHeight);

    // Heart icon / label
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText('HP', right - barWidth - 8, y + 10);

    y += 18;

    // Armor Bar (Cyan)
    ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
    ctx.fillRect(right - barWidth, y, barWidth, barHeight);
    const armorRatio = Math.max(0, player.armor / player.maxArmor);
    ctx.fillStyle = '#00c3ff';
    ctx.fillRect(right - barWidth, y, barWidth * armorRatio, barHeight);
    ctx.strokeStyle = '#34495e';
    ctx.strokeRect(right - barWidth, y, barWidth, barHeight);

    ctx.fillText('AP', right - barWidth - 8, y + 10);

    y += 24;

    // Active Weapon & Ammo Readout
    const wep = player.activeWeapon;
    if (wep) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(wep.name.toUpperCase(), right, y);

      ctx.font = 'bold 14px system-ui, monospace';
      if (wep.isReloading) {
        ctx.fillStyle = '#ffcc00';
        ctx.fillText('RELOADING...', right, y + 18);
      } else {
        ctx.fillStyle = '#95a5a6';
        ctx.fillText(`${wep.ammoInMag} / ${wep.reserveAmmo}`, right, y + 18);
      }
    }

    // Smuggler Caches counter
    const collectedCount = world && world.collectedCaches ? world.collectedCaches.size : 0;
    const totalCaches = (world && world.smugglerCaches) ? world.smugglerCaches.length : 15;
    y += 36;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px system-ui, monospace';
    ctx.fillStyle = '#f39c12';
    ctx.fillText(`CACHES: ${collectedCount} / ${totalCaches}`, right, y);

    // Vela Wave Mixtapes counter
    const collectedMixtapes = world && world.collectedMixtapes ? world.collectedMixtapes.size : 0;
    const totalMixtapes = (world && world.mixtapes) ? world.mixtapes.length : 10;
    y += 18;
    ctx.fillStyle = '#e056fd';
    ctx.fillText(`MIXTAPES: ${collectedMixtapes} / ${totalMixtapes}`, right, y);
    ctx.restore();
  }

  drawStar(ctx, cx, cy, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let step = Math.PI / 5;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  renderMissionBanner(ctx, missions, player, width) {
    let title = '';
    let objective = '';

    if (missions.activeMission && missions.currentStep) {
      title = `${missions.activeMission.title.toUpperCase()}`;
      objective = missions.currentStep.desc;
      if (missions.currentStep.target) {
        const d = Math.round(Math.hypot(player.x - missions.currentStep.target.x, player.z - missions.currentStep.target.z));
        objective += ` (${d}m)`;
      }
      if (missions.currentStep.timeLimit && missions.stepTimer > 0) {
        const mins = Math.floor(missions.stepTimer / 60);
        const secs = Math.floor(missions.stepTimer % 60).toString().padStart(2, '0');
        objective += ` [TIME: ${mins}:${secs}]`;
      }
    } else if (!missions.activeMission && missions.currentMission) {
      title = 'NEXT JOB AVAILABLE';
      const m = missions.currentMission;
      const d = Math.round(Math.hypot(player.x - m.startMarker.x, player.z - m.startMarker.z));
      objective = `Start "${m.title}" at marker (${d}m)`;
    } else if (missions.storyCompleted) {
      title = 'NIGHTFALL CITY CONQUERED';
      objective = 'You rule Vela Bay. Free roam active.';
    }

    if (title) {
      ctx.save();
      ctx.textAlign = 'center';

      // Banner background plate
      const plateW = 460;
      const plateH = 46;
      const plateX = width / 2 - plateW / 2;
      const plateY = 18;

      ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
      ctx.strokeStyle = 'rgba(255, 204, 0, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(plateX, plateY, plateW, plateH);
      ctx.strokeRect(plateX, plateY, plateW, plateH);

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(title, width / 2, plateY + 18);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#ecf0f1';
      ctx.fillText(objective, width / 2, plateY + 36);

      ctx.restore();
    }

    // Express Courier Run Secondary Banner
    if (missions.courierRun && missions.courierRun.active) {
      ctx.save();
      ctx.textAlign = 'center';
      const cr = missions.courierRun;
      const mins = Math.floor(cr.timer / 60);
      const secs = Math.floor(cr.timer % 60).toString().padStart(2, '0');
      const d = cr.target ? Math.round(Math.hypot(player.x - cr.target.x, player.z - cr.target.z)) : 0;
      const cBoxW = 420;
      const cBoxH = 32;
      const cBoxX = width / 2 - cBoxW / 2;
      const cBoxY = title ? 72 : 18;

      ctx.fillStyle = 'rgba(8, 24, 18, 0.90)';
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.fillRect(cBoxX, cBoxY, cBoxW, cBoxH);
      ctx.strokeRect(cBoxX, cBoxY, cBoxW, cBoxH);

      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#2ecc71';
      ctx.fillText(`EXPRESS: Deliver to ${cr.targetName} (${d}m) [${mins}:${secs}] +$${cr.reward}`, width / 2, cBoxY + 20);
      ctx.restore();
    }

    // Taxi Shift Secondary Banner
    if (missions.taxiShift && missions.taxiShift.active) {
      ctx.save();
      ctx.textAlign = 'center';
      const ts = missions.taxiShift;
      const tBoxW = 460;
      const tBoxH = 34;
      const tBoxX = width / 2 - tBoxW / 2;
      const tBoxY = (missions.courierRun && missions.courierRun.active) ? 108 : (title ? 72 : 18);

      ctx.fillStyle = 'rgba(28, 22, 6, 0.92)';
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.5;
      ctx.fillRect(tBoxX, tBoxY, tBoxW, tBoxH);
      ctx.strokeRect(tBoxX, tBoxY, tBoxW, tBoxH);

      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#f1c40f';
      if (ts.state === 'seeking_fare' && ts.passenger) {
        const d = Math.round(Math.hypot(player.x - ts.passenger.x, player.z - ts.passenger.z));
        ctx.fillText(`TAXI SHIFT: Locate waiting passenger at ${ts.passenger.name} (${d}m)`, width / 2, tBoxY + 21);
      } else if (ts.state === 'driving_fare' && ts.destination) {
        const d = Math.round(Math.hypot(player.x - ts.destination.x, player.z - ts.destination.z));
        ctx.fillText(`TAXI FARE: Drive to ${ts.destinationName} (${d}m) | Meter: $${ts.fare} + Tip: $${Math.floor(ts.bonus)}`, width / 2, tBoxY + 21);
      }
      ctx.restore();
    }
  }

  renderSpeedometer(ctx, vehicle, width, height) {
    const x = width - 110;
    const y = height - 70;
    const mph = Math.abs(Math.round(vehicle.speed * 3.6));

    ctx.save();
    ctx.fillStyle = 'rgba(15, 22, 35, 0.85)';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.fillRect(x - 60, y - 40, 120, 60);
    ctx.strokeRect(x - 60, y - 40, 120, 60);

    ctx.textAlign = 'center';
    ctx.font = '900 28px system-ui, monospace';
    ctx.fillStyle = vehicle.isDrifting ? '#ffcc00' : '#00f0ff';
    ctx.fillText(`${mph}`, x, y - 6);

    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText('MPH', x, y + 12);
    ctx.restore();
  }

  renderInteractionHint(ctx, player, world, police, traffic, width, height) {
    let hint = '';
    if (player.inVehicle) {
      hint = '[F] Exit Vehicle | [H] Horn';
    } else {
      const nearCar = traffic.findNearbyVehicle(player.x, player.z, 3.8);
      if (nearCar && !nearCar.wrecked) {
        hint = `[F] Jack ${nearCar.type.toUpperCase()}`;
      }
    }

    // Alley Escape Route active notifier
    const inEscapeRoute = police && police.wantedLevel > 0 && world && world.isInAlleyEscapeRoute && world.isInAlleyEscapeRoute(player.x, player.z);

    if (!hint && !inEscapeRoute) return;

    ctx.save();
    ctx.textAlign = 'center';

    if (inEscapeRoute) {
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#2ecc71';
      ctx.shadowColor = '#27ae60';
      ctx.shadowBlur = 8;
      ctx.fillText('⚡ ALLEY ESCAPE ROUTE — HEAT COOLING 3X FASTER ⚡', width / 2, height - 148);
      ctx.shadowBlur = 0;
    }

    if (hint) {
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(hint, width / 2, height - 120);
    }
    ctx.restore();
  }

  renderDialogue(ctx, dlg, width, height) {
    ctx.save();
    const boxW = Math.min(680, width - 40);
    const boxH = 68;
    const boxX = (width - boxW) / 2;
    const boxY = height - 90;

    ctx.fillStyle = 'rgba(8, 12, 18, 0.92)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(dlg.speaker.toUpperCase(), boxX + 16, boxY + 22);

    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(dlg.text, boxX + 16, boxY + 46);
    ctx.restore();
  }

  renderControls(ctx) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
    ctx.fillText('WASD: Move / Drive | SPACE: Handbrake | F: Jack/Exit | H: Horn | T: Courier Job | K: Taxi Shift | CLICK: Shoot | R: Reload | M: Map', 20, 24);
    ctx.restore();
  }
}

export const hud = new HUD();
