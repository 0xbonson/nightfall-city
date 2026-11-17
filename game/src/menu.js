// Start Menu, Pause Menu, Controls, and Story Ending Screen for Nightfall City

import { SaveManager } from './save.js';
import { audio } from './audio.js';

export class MenuManager {
  constructor() {
    this.state = 'title'; // 'title', 'controls', 'playing', 'paused', 'ending'
    this.hasSave = SaveManager.hasSave();
    this.buttons = [];
  }

  refreshSaveStatus() {
    this.hasSave = SaveManager.hasSave();
  }

  render(ctx, width, height) {
    this.buttons = [];

    if (this.state === 'title') {
      this.renderTitleScreen(ctx, width, height);
    } else if (this.state === 'controls') {
      this.renderControlsScreen(ctx, width, height);
    } else if (this.state === 'paused') {
      this.renderPauseScreen(ctx, width, height);
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
    const btnW = 260;
    const btnH = 46;
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

    // Footer credits
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillText('Bounty Entry: make.fun (gta6-01) · Playable offline in modern browsers', width / 2, height - 24);

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
      ['Mouse Look', 'Look Around / Aim (Pointer Lock enabled)'],
      ['Left Mouse Click', 'Fire Weapon (Pistol / Assault Rifle)'],
      ['R', 'Reload Weapon / Change Radio Station'],
      ['1 / 2 / Q', 'Switch Weapons'],
      ['Esc or P', 'Pause / Menu'],
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

  renderPauseScreen(ctx, width, height) {
    ctx.fillStyle = 'rgba(5, 8, 16, 0.75)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GAME PAUSED', width / 2, height * 0.32);

    const btnW = 240;
    const btnH = 46;
    const btnX = width / 2 - btnW / 2;
    let btnY = height * 0.44;

    this.drawButton(ctx, btnX, btnY, btnW, btnH, 'RESUME', 'resume');
    btnY += 60;
    this.drawButton(ctx, btnX, btnY, btnW, btnH, 'SAVE GAME', 'save');
    btnY += 60;
    this.drawButton(ctx, btnX, btnY, btnW, btnH, 'QUIT TO TITLE', 'quit_title');

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
      'All 6 Story Missions completed successfully.',
      'Free roam continues with your earnings and cars.'
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
