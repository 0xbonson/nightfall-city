/**
 * Nightfall City: Vela Bay - Heads-Up Display (HUD) System
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { WEAPONS } from './config.js';

export class HUD {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  init(overlayCanvas) {
    this.canvas = overlayCanvas;
    this.ctx = overlayCanvas.getContext('2d');
  }

  render(player, missions, police, activeCar, shotPreset) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Top-Right: Money, Wanted Stars, Weapon & Ammo
    this.renderTopRight(ctx, w, player, police, shotPreset);

    // 2. Top-Left: Health & Armor Bars
    this.renderHealthAndArmor(ctx, player);

    // 3. Center-Top: Mission Objective Banner
    this.renderObjectiveBanner(ctx, w, missions, shotPreset);

    // 4. Bottom-Right: Vehicle Speedometer (if in car or in car shot preset)
    if (activeCar || (shotPreset && shotPreset.player && shotPreset.player.inVehicle)) {
      this.renderSpeedometer(ctx, w, h, activeCar, shotPreset);
    }

    // 5. Center Banner (Mission complete / start / failed)
    if (!shotPreset && missions.bannerTimer > 0) {
      this.renderMissionBanner(ctx, w, h, missions);
    }

    // 6. Interaction Prompt (e.g. near car or vehicle controls)
    this.renderInteractionPrompts(ctx, w, h, player, activeCar);
  }

  renderTopRight(ctx, w, player, police, shotPreset) {
    const rightMargin = w - 35;
    let topY = 32;

    // --- Cash Display ---
    const cashVal = shotPreset && shotPreset.cash !== undefined ? shotPreset.cash : player.cash;
    ctx.textAlign = 'right';
    ctx.font = '900 28px "Arial Black", "Impact", sans-serif';

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(`$${cashVal.toLocaleString()}`, rightMargin + 2, topY + 2);

    // Cash Green Gradient
    const cashGrad = ctx.createLinearGradient(0, topY - 20, 0, topY);
    cashGrad.addColorStop(0, '#55ff77');
    cashGrad.addColorStop(1, '#18bb36');
    ctx.fillStyle = cashGrad;
    ctx.fillText(`$${cashVal.toLocaleString()}`, rightMargin, topY);

    // --- Wanted Stars ---
    topY += 34;
    const wantedStars = shotPreset && shotPreset.wantedStars !== undefined ? shotPreset.wantedStars : police.wantedStars;
    const starCount = 5;
    const starSize = 22;
    const starGap = 8;
    const totalStarsW = starCount * starSize + (starCount - 1) * starGap;
    let starStartX = rightMargin - totalStarsW;

    const isEvading = police.isEvading;
    const flashState = Math.floor(performance.now() * 0.006) % 2 === 0;

    for (let i = 0; i < starCount; i++) {
      const sx = starStartX + i * (starSize + starGap);
      const isFilled = i < wantedStars;

      ctx.save();
      ctx.translate(sx + starSize * 0.5, topY + starSize * 0.5);

      if (isFilled) {
        if (isEvading && flashState) {
          ctx.fillStyle = '#ffffff'; // Flashing white
        } else {
          ctx.fillStyle = '#ffcc00'; // Bright gold
        }
        ctx.strokeStyle = '#221100';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = 'rgba(25, 25, 30, 0.65)';
        ctx.strokeStyle = 'rgba(120, 120, 130, 0.45)';
        ctx.lineWidth = 1.5;
      }

      this.drawStarPath(ctx, 0, 0, 5, starSize * 0.5, starSize * 0.22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // --- Weapon & Ammo ---
    topY += 40;
    const wepKey = shotPreset && shotPreset.player ? shotPreset.player.weapon : player.currentWeapon;
    const wep = WEAPONS[wepKey] || WEAPONS.rifle;
    const ammo = player.ammo[wepKey] || { clip: 30, reserve: 150 };

    ctx.textAlign = 'right';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = 'rgba(220, 220, 230, 0.85)';
    ctx.fillText(wep.name.toUpperCase(), rightMargin, topY);

    topY += 24;
    ctx.font = '900 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${ammo.clip} / ${ammo.reserve}`, rightMargin, topY);
  }

  drawStarPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  renderHealthAndArmor(ctx, player) {
    const leftX = 35;
    let topY = 32;
    const barW = 160;
    const barH = 12;

    // Health Bar
    ctx.fillStyle = 'rgba(10, 12, 16, 0.75)';
    ctx.fillRect(leftX, topY, barW, barH);
    ctx.strokeStyle = 'rgba(60, 65, 75, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftX, topY, barW, barH);

    const hpPct = Math.max(0, player.health / 100);
    const hpGrad = ctx.createLinearGradient(leftX, 0, leftX + barW, 0);
    hpGrad.addColorStop(0, '#e52d27');
    hpGrad.addColorStop(1, '#45f248');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(leftX + 1, topY + 1, (barW - 2) * hpPct, barH - 2);

    // Armor Bar
    topY += 18;
    ctx.fillStyle = 'rgba(10, 12, 16, 0.75)';
    ctx.fillRect(leftX, topY, barW, barH);
    ctx.strokeRect(leftX, topY, barW, barH);

    const armorPct = Math.max(0, player.armor / 100);
    const armorGrad = ctx.createLinearGradient(leftX, 0, leftX + barW, 0);
    armorGrad.addColorStop(0, '#11998e');
    armorGrad.addColorStop(1, '#38ef7d');
    ctx.fillStyle = '#00c6ff';
    ctx.fillRect(leftX + 1, topY + 1, (barW - 2) * armorPct, barH - 2);

    // Label indicators
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('HEALTH', leftX + 4, topY - 8);
    ctx.fillText('ARMOR', leftX + 4, topY + 9);
  }

  renderObjectiveBanner(ctx, w, missions, shotPreset) {
    const objText = shotPreset && shotPreset.objective ? shotPreset.objective : missions.getObjectiveText();
    if (!objText) return;

    const bannerW = Math.min(620, w * 0.55);
    const bannerH = 40;
    const bannerX = (w - bannerW) * 0.5;
    const bannerY = 24;

    // Backdrop with gold left accent border
    ctx.fillStyle = 'rgba(12, 15, 22, 0.82)';
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

    ctx.fillStyle = '#ffbb00';
    ctx.fillRect(bannerX, bannerY, 5, bannerH);

    ctx.strokeStyle = 'rgba(255, 187, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(objText.toUpperCase(), bannerX + bannerW * 0.5, bannerY + 25);
  }

  renderSpeedometer(ctx, w, h, activeCar, shotPreset) {
    const speedMph = shotPreset && shotPreset.player && shotPreset.player.speedMph !== undefined
      ? shotPreset.player.speedMph
      : (activeCar ? activeCar.getSpeedMph() : 0);

    const speedX = w - 120;
    const speedY = h - 65;

    // Background circle arc
    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 22, 0.78)';
    ctx.beginPath();
    ctx.arc(speedX, speedY, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 85, 110, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Speed radial progress arc
    const maxMph = 160;
    const progress = Math.min(1.0, speedMph / maxMph);
    const startAngle = Math.PI * 0.75;
    const endAngle = startAngle + progress * Math.PI * 1.5;

    const arcGrad = ctx.createLinearGradient(speedX - 50, speedY, speedX + 50, speedY);
    arcGrad.addColorStop(0, '#00d2ff');
    arcGrad.addColorStop(0.7, '#ffaa00');
    arcGrad.addColorStop(1, '#ff3300');

    ctx.beginPath();
    ctx.arc(speedX, speedY, 48, startAngle, endAngle);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Speed text
    ctx.textAlign = 'center';
    ctx.font = '900 32px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${speedMph}`, speedX, speedY + 8);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#00d2ff';
    ctx.fillText('MPH', speedX, speedY + 24);

    // Gear indicator
    const gear = activeCar ? activeCar.gear : 4;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.fillText(`GEAR D${gear}`, speedX, speedY - 18);

    ctx.restore();
  }

  renderMissionBanner(ctx, w, h, missions) {
    const bannerH = 90;
    const bannerY = h * 0.32;

    ctx.fillStyle = 'rgba(6, 8, 14, 0.92)';
    ctx.fillRect(0, bannerY, w, bannerH);

    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, bannerY, w, 4);
    ctx.fillRect(0, bannerY + bannerH - 4, w, 4);

    ctx.textAlign = 'center';
    ctx.font = '900 32px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(missions.bannerText, w * 0.5, bannerY + 42);

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(missions.bannerSubtitle, w * 0.5, bannerY + 70);
  }

  renderInteractionPrompts(ctx, w, h, player, activeCar) {
    const promptY = h - 35;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = 'rgba(230, 235, 245, 0.75)';

    if (activeCar) {
      ctx.fillText('[W/A/S/D] Drive   [Space] Handbrake Drift   [F] Exit Vehicle   [K] Taxi Job', w * 0.5, promptY);
    } else {
      ctx.fillText('[W/A/S/D] Move   [Shift] Sprint   [F] Jack Car   [LMB] Shoot   [R] Reload   [Esc] Pause', w * 0.5, promptY);
    }
  }
}
