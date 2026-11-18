/**
 * Nightfall City: Vela Bay - Heads-Up Display (HUD) System
 * Crisp GTA-style interface: Health/Armor bars, Cash readout, 5 Wanted Stars,
 * Weapon ammo counters, mission objective banner with distance readout,
 * radio station notification, district entrance banner, safehouse garage prompts,
 * and high-speed speedometer gauge.
 * Authored for make.fun open-world crime entry.
 */

import { WEAPONS } from './config.js';

export class HUD {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.damageFlashTimer = 0;
  }

  init(overlayCanvas) {
    this.canvas = overlayCanvas;
    this.ctx = overlayCanvas.getContext('2d');
  }

  triggerDamageFlash() {
    this.damageFlashTimer = 0.35;
  }

  render(player, missions, police, activeCar, shotPreset, radio, districts, garage) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Damage flash vignette
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= 0.016;
      ctx.fillStyle = `rgba(220, 20, 20, ${Math.min(0.35, this.damageFlashTimer)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 1. Top-Right: Cash, Wanted Stars, Weapon & Ammo
    this.renderTopRight(ctx, w, player, police, shotPreset);

    // 2. Top-Left: Health & Armor Bars
    this.renderHealthAndArmor(ctx, player);

    // 3. Center-Top: Mission Objective Banner with distance readout
    this.renderObjectiveBanner(ctx, w, missions, player, shotPreset);

    // 4. District toast banner (under objective)
    if (districts && districts.bannerTimer > 0) {
      this.renderDistrictBanner(ctx, w, districts);
    }

    // 5. Radio station toast (top right below weapon)
    if (radio && radio.bannerTimer > 0) {
      this.renderRadioBanner(ctx, w, radio);
    }

    // 6. Bottom-Right: Vehicle Speedometer Gauge
    if (activeCar || (shotPreset && shotPreset.player && shotPreset.player.inVehicle)) {
      this.renderSpeedometer(ctx, w, h, activeCar, shotPreset);
    }

    // 7. Center Banner (Mission complete / start / failed)
    if (!shotPreset && missions && missions.bannerTimer > 0) {
      this.renderMissionBanner(ctx, w, h, missions);
    }

    // 8. Safehouse Garage prompt
    if (garage && garage.promptTimer > 0) {
      this.renderGaragePrompt(ctx, w, h, garage.promptText);
    } else {
      // General Interaction Prompts
      this.renderInteractionPrompts(ctx, w, h, player, activeCar);
    }
  }

  renderTopRight(ctx, w, player, police, shotPreset) {
    const rightMargin = w - 35;
    let topY = 32;

    // --- Cash Readout ---
    const cashVal = shotPreset && shotPreset.cash !== undefined ? shotPreset.cash : player.cash;
    ctx.textAlign = 'right';
    ctx.font = '900 28px "Arial Black", "Impact", sans-serif';

    // Bold drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText(`$${cashVal.toLocaleString()}`, rightMargin + 2, topY + 2);

    // Cash Green Gradient
    const cashGrad = ctx.createLinearGradient(0, topY - 22, 0, topY);
    cashGrad.addColorStop(0, '#66ff88');
    cashGrad.addColorStop(1, '#1bc43b');
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
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#ffcc00';
        }
        ctx.strokeStyle = '#221100';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = 'rgba(25, 25, 30, 0.65)';
        ctx.strokeStyle = 'rgba(120, 120, 130, 0.45)';
        ctx.lineWidth = 1.5;
      }

      this.drawStar(ctx, 0, 0, 5, starSize * 0.5, starSize * 0.22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // --- Weapon & Ammo Readout ---
    topY += 36;
    const wepKey = player.currentWeapon;
    const wep = WEAPONS[wepKey] || WEAPONS.carbine;
    const ammoState = player.ammo[wepKey] || { clip: 30, reserve: 150 };

    ctx.textAlign = 'right';
    ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(wep.name.toUpperCase(), rightMargin, topY);

    topY += 22;
    ctx.font = '900 24px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${ammoState.clip}`, rightMargin - 44, topY);

    ctx.font = '700 16px sans-serif';
    ctx.fillStyle = 'rgba(200, 210, 225, 0.75)';
    ctx.fillText(`/${ammoState.reserve}`, rightMargin, topY);
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
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
    const leftMargin = 35;
    const topY = 32;
    const barW = 160;
    const barH = 12;

    // --- Health Bar ---
    ctx.fillStyle = 'rgba(12, 14, 20, 0.85)';
    ctx.fillRect(leftMargin, topY, barW, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftMargin, topY, barW, barH);

    const hpPct = Math.max(0, Math.min(1, player.health / 100));
    const hpGrad = ctx.createLinearGradient(leftMargin, 0, leftMargin + barW, 0);
    hpGrad.addColorStop(0, '#22cc44');
    hpGrad.addColorStop(1, '#55ff77');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(leftMargin + 1, topY + 1, (barW - 2) * hpPct, barH - 2);

    ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('HEALTH', leftMargin, topY - 4);

    // --- Armor Bar ---
    const armorY = topY + 26;
    ctx.fillStyle = 'rgba(12, 14, 20, 0.85)';
    ctx.fillRect(leftMargin, armorY, barW, barH);
    ctx.strokeRect(leftMargin, armorY, barW, barH);

    const armPct = Math.max(0, Math.min(1, player.armor / 100));
    const armGrad = ctx.createLinearGradient(leftMargin, 0, leftMargin + barW, 0);
    armGrad.addColorStop(0, '#0088ff');
    armGrad.addColorStop(1, '#00d2ff');
    ctx.fillStyle = armGrad;
    ctx.fillRect(leftMargin + 1, armorY + 1, (barW - 2) * armPct, barH - 2);

    ctx.fillText('ARMOR', leftMargin, armorY - 4);
  }

  renderObjectiveBanner(ctx, w, missions, player, shotPreset) {
    const bannerW = Math.min(680, w - 120);
    const bannerH = 46;
    const bannerX = (w - bannerW) * 0.5;
    const bannerY = 24;

    ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 170, 0, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    let text = shotPreset && shotPreset.objective ? shotPreset.objective : (missions ? missions.getObjectiveText() : 'EXPLORE VELA BAY');

    if (!shotPreset && missions) {
      const dist = missions.getDistanceToTarget(player.x, player.z);
      if (dist > 0) {
        text += ` (${dist}M)`;
      }
    }

    ctx.textAlign = 'center';
    ctx.font = '800 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text.toUpperCase(), w * 0.5, bannerY + 28);
  }

  renderDistrictBanner(ctx, w, districts) {
    const bannerW = 340;
    const bannerH = 34;
    const bannerX = (w - bannerW) * 0.5;
    const bannerY = 76;

    ctx.fillStyle = 'rgba(12, 18, 28, 0.88)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 4);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(districts.bannerText.toUpperCase(), w * 0.5, bannerY + 22);
  }

  renderRadioBanner(ctx, w, radio) {
    const rightMargin = w - 35;
    const bannerY = 148;

    ctx.textAlign = 'right';
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(`📻 ${radio.bannerText.toUpperCase()}`, rightMargin, bannerY);
  }

  renderSpeedometer(ctx, w, h, activeCar, shotPreset) {
    const cx = w - 90;
    const cy = h - 90;
    const r = 62;

    const speed = shotPreset && shotPreset.player && shotPreset.player.speedMph ? shotPreset.player.speedMph : (activeCar ? activeCar.getSpeedMph() : 0);
    const gear = activeCar ? activeCar.gear : 4;

    ctx.save();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 10, 16, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 100, 130, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const maxSpeedDisplay = 160;
    const speedRatio = Math.min(1.0, speed / maxSpeedDisplay);
    const startAngle = Math.PI * 0.75;
    const endAngle = startAngle + speedRatio * (Math.PI * 1.5);

    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, startAngle, endAngle);
    const rpmGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    rpmGrad.addColorStop(0, '#00e5ff');
    rpmGrad.addColorStop(0.7, '#ffcc00');
    rpmGrad.addColorStop(1, '#ff2200');
    ctx.strokeStyle = rpmGrad;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '900 32px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${speed}`, cx, cy + 6);

    ctx.font = '800 12px sans-serif';
    ctx.fillStyle = '#00d2ff';
    ctx.fillText('MPH', cx, cy + 24);

    ctx.font = '800 11px sans-serif';
    ctx.fillStyle = 'rgba(220, 230, 245, 0.65)';
    ctx.fillText(`GEAR ${gear}`, cx, cy - 22);

    ctx.restore();
  }

  renderMissionBanner(ctx, w, h, missions) {
    const bannerH = 80;
    const bannerY = h * 0.38;

    ctx.fillStyle = 'rgba(6, 8, 14, 0.92)';
    ctx.fillRect(0, bannerY, w, bannerH);

    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(0, bannerY, w, 3);
    ctx.fillRect(0, bannerY + bannerH - 3, w, 3);

    ctx.textAlign = 'center';
    ctx.font = '900 30px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(missions.bannerText, w * 0.5, bannerY + 38);

    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(230, 240, 255, 0.85)';
    ctx.fillText(missions.bannerSubtitle, w * 0.5, bannerY + 62);
  }

  renderGaragePrompt(ctx, w, h, text) {
    ctx.textAlign = 'center';
    ctx.font = '800 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#22ff66';
    ctx.fillText(`🔧 ${text}`, w * 0.5, h - 25);
  }

  renderInteractionPrompts(ctx, w, h, player, activeCar) {
    ctx.textAlign = 'center';
    ctx.font = '700 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    if (activeCar) {
      ctx.fillText('[F / E] Exit Vehicle   [SPACE] Drift   [H] Horn   [R] Radio Station   [K] Taxi Shift', w * 0.5, h - 25);
    } else {
      ctx.fillText('[F / E] Enter Vehicle   [1-4 / Q] Weapons   [R] Reload   [SHIFT] Sprint   [ESC] Menu', w * 0.5, h - 25);
    }
  }
}
