/**
 * Nightfall City: Vela Bay - Heads-Up Display (HUD) System
 * Dense tactical interface: mission dossier panel, wanted/status stack,
 * police response table, district readout, weapon rack, minimap HUD trim,
 * radio ticker and speedometer, all drawn on the 2D overlay canvas.
 * Authored for make.fun open-world crime entry (Vela Bay edition).
 */

import { WEAPONS } from './config.js';

const INK = '#05070c';

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

  // ---------------------------------------------------------------
  // Primitives
  // ---------------------------------------------------------------
  panel(ctx, x, y, w, h, accent = '#ffaa00', alpha = 0.82) {
    ctx.fillStyle = `rgba(6, 9, 15, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 3, h);
  }

  label(ctx, text, x, y, color = 'rgba(255,255,255,0.62)', size = 10, align = 'left') {
    ctx.font = `800 ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(text.toUpperCase(), x, y);
  }

  bar(ctx, x, y, w, h, pct, color, bg = 'rgba(255,255,255,0.10)') {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    const p = Math.max(0, Math.min(1, pct));
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, color[0]);
    g.addColorStop(1, color[1]);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * p, h);
  }

  // ---------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------
  render(player, missions, police, activeCar, shotPreset, radio, districts, garage, vehicles) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= 0.016;
      ctx.fillStyle = `rgba(220, 20, 20, ${Math.min(0.35, this.damageFlashTimer)})`;
      ctx.fillRect(0, 0, w, h);
    }

    this.renderMissionPanel(ctx, w, missions, player, shotPreset);
    this.renderStatusPanel(ctx, w, player, police, districts, shotPreset);
    this.renderPolicePanel(ctx, w, h, police, vehicles, player);
    this.renderDistrictPanel(ctx, w, h, districts, shotPreset);
    this.renderWeaponRack(ctx, w, h, player, shotPreset);
    this.renderDialogue(ctx, w, h, missions, shotPreset);
    this.renderRadioTicker(ctx, w, h, radio);

    if (districts && districts.bannerTimer > 0) {
      this.renderDistrictBanner(ctx, w, districts);
    }
    if (radio && radio.bannerTimer > 0) {
      this.renderRadioBanner(ctx, w, radio);
    }
    if (activeCar || (shotPreset && shotPreset.player && shotPreset.player.inVehicle)) {
      this.renderSpeedometer(ctx, w, h, activeCar, shotPreset);
    }
    if (!shotPreset && missions && missions.bannerTimer > 0) {
      this.renderMissionBanner(ctx, w, h, missions);
    }
    if (garage && garage.promptTimer > 0) {
      this.renderGaragePrompt(ctx, w, h, garage.promptText || garage.promptMessage);
    } else {
      this.renderInteractionPrompts(ctx, w, h, player, activeCar);
    }
  }

  // ---------------------------------------------------------------
  // Top-left: mission dossier
  // ---------------------------------------------------------------
  renderMissionPanel(ctx, w, missions, player, shotPreset) {
    const pw = 372;
    const ph = 92;
    const x = 26;
    const y = 22;

    const mission = missions && missions.getCurrentMission ? missions.getCurrentMission() : null;
    const presetTitle = shotPreset && shotPreset.missionTitle ? shotPreset.missionTitle : null;
    const accent = shotPreset && shotPreset.accent ? shotPreset.accent : '#ff9a2e';
    this.panel(ctx, x, y, pw, ph, accent);

    if (mission) {
      const head = presetTitle ? `Chapter ${mission.id} · Operation` : `Chapter ${mission.id} · Syndicate Ops`;
      this.label(ctx, head, x + 14, y + 20, accent, 10);
      ctx.font = '900 21px "Arial Black", "Impact", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText((presetTitle || mission.title).toUpperCase(), x + 14, y + 42);
      if (mission.giver && !presetTitle) {
        this.label(ctx, `Handler: ${mission.giver}`, x + 14, y + 58, 'rgba(255,255,255,0.55)', 10);
      }
    } else {
      this.label(ctx, 'Vela Bay · Free Roam', x + 14, y + 22, accent, 11);
    }

    let objective = shotPreset && shotPreset.objective ? shotPreset.objective : (missions ? missions.getObjectiveText() : 'EXPLORE VELA BAY');
    let dist = 0;
    if (!shotPreset && missions) {
      dist = missions.getDistanceToTarget(player.x, player.z);
      if (dist > 0) objective += `  ·  ${Math.round(dist)} M`;
    }
    ctx.font = '800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText(this.ellipsize(ctx, objective.toUpperCase(), pw - 28), x + 14, y + 76);

    // Stage pips: chapter progress across the 8 syndicate operations
    const pipY = y + ph - 12;
    const pipW = 40;
    const activeIdx = shotPreset && shotPreset.stage ? shotPreset.stage - 1 : (mission ? mission.id - 1 : 0);
    for (let i = 0; i < 8; i++) {
      const px = x + 14 + i * (pipW + 5);
      const done = i < activeIdx;
      const active = i === activeIdx;
      ctx.fillStyle = active ? accent : done ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.13)';
      ctx.fillRect(px, pipY, pipW, 4);
      if (active) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(px, pipY - 3, pipW, 2);
      }
    }
  }

  ellipsize(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 4 && ctx.measureText(t + '...').width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + '...';
  }

  // ---------------------------------------------------------------
  // Top-right: wanted, cash, vitals, weapon
  // ---------------------------------------------------------------
  renderStatusPanel(ctx, w, player, police, districts, shotPreset) {
    const pw = 232;
    const ph = 152;
    const x = w - pw - 26;
    const y = 22;

    this.panel(ctx, x, y, pw, ph, '#ffcc00', 0.80);

    // Wanted header + stars
    const wantedStars = shotPreset && shotPreset.wantedStars !== undefined ? shotPreset.wantedStars : police.wantedStars;
    this.label(ctx, 'Wanted', x + 14, y + 20, '#ffcc00', 11);
    const evading = police.isEvading;
    const flash = Math.floor(performance.now() * 0.006) % 2 === 0;
    const starSize = 17;
    const gap = 5;
    let sx = x + pw - 14 - (5 * starSize + 4 * gap);
    for (let i = 0; i < 5; i++) {
      const cx = sx + starSize * 0.5 + i * (starSize + gap);
      ctx.save();
      ctx.translate(cx, y + 14);
      const on = i < wantedStars;
      ctx.fillStyle = on ? (evading && flash ? '#ffffff' : '#ffcc00') : 'rgba(255,255,255,0.12)';
      ctx.strokeStyle = on ? 'rgba(40,25,0,0.8)' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.2;
      this.drawStar(ctx, 0, 0, 5, starSize * 0.5, starSize * 0.22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (evading) {
      this.label(ctx, 'Evading', x + 14, y + 32, '#66ff88', 9);
    }

    // Cash
    const cashVal = shotPreset && shotPreset.cash !== undefined ? shotPreset.cash : player.cash;
    ctx.textAlign = 'right';
    ctx.font = '900 30px "Arial Black", "Impact", sans-serif';
    const g = ctx.createLinearGradient(0, y + 36, 0, y + 64);
    g.addColorStop(0, '#7dffa0');
    g.addColorStop(1, '#16b93a');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(`$${cashVal.toLocaleString()}`, x + pw - 11, y + 64);
    ctx.fillStyle = g;
    ctx.fillText(`$${cashVal.toLocaleString()}`, x + pw - 14, y + 61);

    // Vitals
    const rows = [
      { name: 'Health', pct: player.health / 100, c: ['#18c94a', '#68ff8e'] },
      { name: 'Armor', pct: player.armor / 100, c: ['#0a7dff', '#3ce0ff'] },
      { name: 'Heat', pct: Math.min(1, (police.heat || 0) / 5), c: ['#ff5a2e', '#ffc14d'] },
    ];
    let by = y + 78;
    for (const r of rows) {
      this.label(ctx, r.name, x + 14, by + 8, 'rgba(255,255,255,0.72)', 9);
      this.bar(ctx, x + 62, by, pw - 78, 9, r.pct, r.c);
      by += 16;
    }

    // Weapon + ammo
    const wepKey = player.currentWeapon;
    const wep = WEAPONS[wepKey] || WEAPONS.carbine;
    const ammo = player.ammo[wepKey] || { clip: 30, reserve: 150 };
    this.label(ctx, wep.name, x + 14, y + ph - 12, '#00e5ff', 10);
    ctx.textAlign = 'right';
    ctx.font = '900 17px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${ammo.clip}`, x + pw - 42, y + ph - 8);
    ctx.font = '700 12px sans-serif';
    ctx.fillStyle = 'rgba(200,210,225,0.7)';
    ctx.fillText(`/${ammo.reserve}`, x + pw - 14, y + ph - 8);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------------
  // Right: police response table
  // ---------------------------------------------------------------
  renderPolicePanel(ctx, w, h, police, vehicles, player) {
    const units = [];
    if (vehicles && vehicles.length) {
      for (const v of vehicles) {
        if (!v.isPolice) continue;
        const dx = (v.x || 0) - (player ? player.x : 0);
        const dz = (v.z || 0) - (player ? player.z : 0);
        units.push({ name: 'CRUISER', d: Math.hypot(dx, dz), status: v.sirenActive ? 'PURSUIT' : 'RESPONDING' });
      }
    }
    if (police && police.helicopter && police.helicopter.active) {
      const hx = police.helicopter.x - (player ? player.x : 0);
      const hz = police.helicopter.z - (player ? player.z : 0);
      units.push({ name: 'AIR UNIT', d: Math.hypot(hx, hz), status: 'DEPLOYED', heli: true });
    }
    units.sort((a, b) => a.d - b.d);
    const shown = units.slice(0, 5);

    const pw = 250;
    const ph = 34 + Math.max(1, shown.length) * 20;
    const x = w - pw - 26;
    const y = 190;

    const accent = shown.length ? '#ff4d4d' : '#5ad0ff';
    this.panel(ctx, x, y, pw, ph, accent, 0.78);
    this.label(ctx, 'Police Response', x + 14, y + 20, accent, 11);
    this.label(ctx, shown.length ? `${shown.length} units` : 'clear', x + pw - 14, y + 20, 'rgba(255,255,255,0.45)', 10, 'right');

    if (!shown.length) {
      this.label(ctx, 'No active pursuit', x + 14, y + 40, 'rgba(255,255,255,0.45)', 11);
      return;
    }
    let ry = y + 38;
    for (const u of shown) {
      ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(u.name, x + 14, ry);
      const st = u.status;
      ctx.fillStyle = st === 'PURSUIT' ? '#ff5c5c' : st === 'DEPLOYED' ? '#ffc14d' : st === 'RESPONDING' ? '#ff9a2e' : '#7fe3ff';
      ctx.fillText(st, x + 96, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(220,230,245,0.75)';
      ctx.fillText(`${Math.round(u.d)} m`, x + pw - 14, ry);
      ry += 20;
    }
  }

  // ---------------------------------------------------------------
  // Bottom-left above the minimap: district readout
  // ---------------------------------------------------------------
  renderDistrictPanel(ctx, w, h, districts, shotPreset) {
    const d = (districts && districts.currentDistrict) || null;
    const name = shotPreset && shotPreset.district ? shotPreset.district : (d ? d.name : 'Vela Bay');
    const tagline = shotPreset && shotPreset.district ? 'Metro Precinct Jurisdiction' : (d ? d.tagline : 'Mediterranean Coast Metropolis');
    const accent = d && d.hudColor ? d.hudColor : '#00e5ff';

    const pw = 252;
    const ph = 56;
    const x = 26;
    const y = h - 300;

    this.panel(ctx, x, y, pw, ph, accent, 0.74);
    ctx.font = '900 15px "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.fillText(this.ellipsize(ctx, name.toUpperCase(), pw - 92), x + 14, y + 22);
    this.label(ctx, this.ellipsize(ctx, tagline, pw - 28), x + 14, y + 38, 'rgba(255,255,255,0.55)', 9);
    if (d && d.crimeRisk) {
      const risk = d.crimeRisk.toUpperCase();
      ctx.textAlign = 'right';
      this.label(ctx, `Crime ${risk}`, x + pw - 14, y + 22, risk === 'HIGH' ? '#ff6b6b' : risk === 'MEDIUM' ? '#ffc14d' : '#66ff88', 9, 'right');
    }
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------------
  // Bottom-right: weapon rack
  // ---------------------------------------------------------------
  renderWeaponRack(ctx, w, h, player, shotPreset) {
    const keys = Object.keys(WEAPONS).slice(0, 6);
    const slotW = 56;
    const gap = 6;
    const pw = keys.length * (slotW + gap) + 14;
    const ph = 52;
    const x = w - pw - 26;
    const y = h - 250;

    this.panel(ctx, x, y, pw, ph, '#00e5ff', 0.70);
    let sx = x + 10;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const wep = WEAPONS[k];
      const active = k === player.currentWeapon;
      const ammo = (shotPreset && shotPreset.ammo && shotPreset.ammo[k]) || player.ammo[k] || { clip: 0, reserve: 0 };
      ctx.fillStyle = active ? 'rgba(0,229,255,0.20)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(sx, y + 9, slotW, 34);
      if (active) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(sx + 0.5, y + 9.5, slotW - 1, 33);
      }
      ctx.font = '800 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.62)';
      const nm = (wep.name || k).toUpperCase().split(' ')[0];
      ctx.fillText(nm.slice(0, 8), sx + slotW * 0.5, y + 22);
      ctx.font = '900 12px "Arial Black", sans-serif';
      ctx.fillStyle = ammo.clip > 0 ? '#ffe066' : '#ff6b6b';
      ctx.fillText(`${ammo.clip}`, sx + slotW * 0.5, y + 38);
      sx += slotW + gap;
    }
  }

  // ---------------------------------------------------------------
  // Bottom centre: radio ticker
  // ---------------------------------------------------------------
  renderRadioTicker(ctx, w, h, radio) {
    if (!radio) return;
    const st = radio.getCurrentStation ? radio.getCurrentStation() : null;
    if (!st) return;
    const text = `RADIO ${st.name.toUpperCase()}  ·  ${st.genre}`;
    ctx.textAlign = 'center';
    ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const tw = ctx.measureText(text).width + 26;
    const x = w * 0.5 - tw * 0.5;
    const y = h - 58;
    ctx.fillStyle = 'rgba(6, 9, 15, 0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, tw, 22, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,0,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffbb44';
    ctx.fillText(text, w * 0.5, y + 15);
    ctx.textAlign = 'left';
  }


  // ---------------------------------------------------------------
  // Bottom centre: character briefing box with portrait
  // ---------------------------------------------------------------
  renderDialogue(ctx, w, h, missions, shotPreset) {
    const mission = missions && missions.getCurrentMission ? missions.getCurrentMission() : null;
    if (!mission) return;
    const speaker = shotPreset && shotPreset.speaker ? shotPreset.speaker : (mission.giver || 'Vela Bay Dispatch');
    const text = shotPreset && shotPreset.dialogue ? shotPreset.dialogue : (mission.dialogue || '');
    if (!text) return;

    const pw = 660;
    const ph = 78;
    const x = (w - pw) * 0.5;
    const y = h - 152;

    ctx.fillStyle = 'rgba(6, 9, 15, 0.86)';
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Speaker portrait
    this.drawPortrait(ctx, x + 6, y + 6, 66, speaker);

    // Speaker name plate
    ctx.font = '900 12px "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(speaker.toUpperCase(), x + 82, y + 22);
    const nameW = ctx.measureText(speaker.toUpperCase()).width;
    ctx.fillStyle = 'rgba(255,170,0,0.85)';
    ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('· MISSION BRIEFING', x + 88 + nameW * 1.35, y + 22);

    // Dialogue body, wrapped
    ctx.font = '600 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(233, 240, 250, 0.92)';
    const lines = this.wrapText(ctx, text, pw - 100);
    let ly = y + 41;
    for (const line of lines.slice(0, 3)) {
      ctx.fillText(line, x + 82, ly);
      ly += 16;
    }
  }

  wrapText(ctx, text, maxWidth) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // A flat, stylised bust that matches the game's low-poly cast.
  drawPortrait(ctx, x, y, size, name) {
    let seed = 0;
    for (let i = 0; i < name.length; i++) seed = (seed * 31 + name.charCodeAt(i)) >>> 0;
    const skin = ['#e8b98d', '#c98e63', '#f2cfa6', '#a9714b'][seed % 4];
    const hair = ['#2b1b12', '#4a2c19', '#c0392b', '#1c1c22'][seed % 4];
    const shirt = ['#2b6cb0', '#7b3f9d', '#2f855a', '#b7791f'][(seed >> 3) % 4];

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();

    // Backdrop
    const g = ctx.createLinearGradient(x, y, x, y + size);
    g.addColorStop(0, '#1b2a44');
    g.addColorStop(1, '#0b1220');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);

    const cx = x + size * 0.5;
    // Shoulders
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.08, y + size);
    ctx.lineTo(x + size * 0.24, y + size * 0.62);
    ctx.lineTo(x + size * 0.76, y + size * 0.62);
    ctx.lineTo(x + size * 0.92, y + size);
    ctx.closePath();
    ctx.fill();
    // Collar
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.16, y + size * 0.63);
    ctx.lineTo(cx, y + size * 0.82);
    ctx.lineTo(cx + size * 0.16, y + size * 0.63);
    ctx.closePath();
    ctx.fill();
    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, y + size * 0.40, size * 0.225, size * 0.265, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, y + size * 0.25, size * 0.235, size * 0.17, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - size * 0.235, y + size * 0.25, size * 0.085, size * 0.19);
    ctx.fillRect(cx + size * 0.15, y + size * 0.25, size * 0.085, size * 0.19);
    // Eyes
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(cx - size * 0.115, y + size * 0.37, size * 0.065, size * 0.042);
    ctx.fillRect(cx + size * 0.05, y + size * 0.37, size * 0.065, size * 0.042);
    // Mouth
    ctx.fillStyle = 'rgba(90,30,30,0.75)';
    ctx.fillRect(cx - size * 0.06, y + size * 0.505, size * 0.12, size * 0.026);
    // Rim light
    ctx.strokeStyle = 'rgba(255,190,120,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, size - 1.5, size - 1.5);
    ctx.restore();
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

  renderDistrictBanner(ctx, w, districts) {
    const bannerW = 340;
    const bannerH = 34;
    const bannerX = (w - bannerW) * 0.5;
    const bannerY = 122;

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
    const bannerY = 186;

    ctx.textAlign = 'right';
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(`RADIO ${radio.bannerText.toUpperCase()}`, rightMargin, bannerY);
  }

  renderSpeedometer(ctx, w, h, activeCar, shotPreset) {
    const cx = w - 108;
    const cy = h - 96;
    const r = 60;

    const speed = shotPreset && shotPreset.player && shotPreset.player.speedMph ? shotPreset.player.speedMph : (activeCar ? activeCar.getSpeedMph() : 0);
    const gear = activeCar ? activeCar.gear : 4;

    ctx.save();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
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
    ctx.fillText(text, w * 0.5, h - 25);
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
