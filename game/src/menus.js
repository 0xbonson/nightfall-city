/**
 * Nightfall City: Vela Bay - Interface & Navigation Menus
 * Authored by makefun agent for the GTA 6 bounty challenge.
 *
 * Implements:
 * - Clean pause overlay with game state suspension
 * - Interactive options: Resume, Controls Guide, Mission Log, Audio Synth Toggle, Restart
 * - In-depth Controls Cheatsheet displaying keyboard & mouse mappings
 * - 8-stage Syndicate Campaign Dossier with completion indicators and cash bounties
 * - Grand Victory screen acknowledging campaign triumph in Vela Bay
 */

export class MenuManager {
  constructor() {
    this.state = 'none'; // 'none', 'pause', 'controls', 'mission_log', 'victory'
    this.selectedIdx = 0;
  }

  isPaused() {
    return this.state !== 'none';
  }

  openPause() {
    this.state = 'pause';
    this.selectedIdx = 0;
  }

  resume() {
    this.state = 'none';
  }

  togglePause() {
    if (this.state === 'none') {
      this.openPause();
    } else {
      this.resume();
    }
  }

  handleInput(input, missions, player, audio, saveSystem) {
    if (this.state === 'none') {
      if (input.isJustPressed('Escape') || input.isJustPressed('KeyP')) {
        this.openPause();
      }
      return;
    }

    // Modal navigation
    if (input.isJustPressed('ArrowUp') || input.isJustPressed('KeyW')) {
      this.selectedIdx = Math.max(0, this.selectedIdx - 1);
    }
    if (input.isJustPressed('ArrowDown') || input.isJustPressed('KeyS')) {
      this.selectedIdx++;
    }

    if (this.state === 'pause') {
      const maxIdx = 4;
      this.selectedIdx = Math.min(maxIdx, this.selectedIdx);

      if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
        if (this.selectedIdx === 0) {
          this.resume();
        } else if (this.selectedIdx === 1) {
          this.state = 'controls';
        } else if (this.selectedIdx === 2) {
          this.state = 'mission_log';
        } else if (this.selectedIdx === 3) {
          if (audio) audio.toggleMute();
        } else if (this.selectedIdx === 4) {
          // Restart campaign from mission 1
          missions.loadMission(0);
          player.health = 100;
          player.armor = 50;
          if (saveSystem) saveSystem.save(missions.currentIdx, player);
          this.resume();
        }
      }
      if (input.isJustPressed('Escape')) {
        this.resume();
      }
    } else if (this.state === 'controls' || this.state === 'mission_log') {
      if (input.isJustPressed('Escape') || input.isJustPressed('Enter') || input.isJustPressed('Space') || input.isJustPressed('Backspace')) {
        this.state = 'pause';
      }
    } else if (this.state === 'victory') {
      if (input.isJustPressed('Enter') || input.isJustPressed('Space') || input.isJustPressed('Escape')) {
        this.state = 'none';
      }
    }
  }

  render(ctx, w, h, missions, player, audio) {
    if (this.state === 'none') return;

    // Frosted dark backdrop
    ctx.save();
    ctx.fillStyle = 'rgba(7, 10, 16, 0.90)';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'pause') {
      this.renderPauseMenu(ctx, w, h, audio);
    } else if (this.state === 'controls') {
      this.renderControlsGuide(ctx, w, h);
    } else if (this.state === 'mission_log') {
      this.renderMissionLog(ctx, w, h, missions);
    } else if (this.state === 'victory') {
      this.renderVictoryScreen(ctx, w, h, player);
    }

    ctx.restore();
  }

  renderPauseMenu(ctx, w, h, audio) {
    const cx = w * 0.5;
    let cy = h * 0.22;

    // Header Logo
    ctx.textAlign = 'center';
    ctx.font = '900 46px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.shadowColor = 'rgba(255, 187, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillText('NIGHTFALL CITY: VELA BAY', cx, cy);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(180, 205, 230, 0.85)';
    ctx.fillText('SIMULATION PAUSED', cx, cy + 34);

    const isMuted = audio ? audio.isMuted : false;
    const options = [
      'RESUME GAME',
      'CONTROLS & SHORTCUTS',
      'SYNDICATE MISSION LOG',
      isMuted ? 'AUDIO: MUTED [UNMUTE]' : 'AUDIO: ENABLED [MUTE]',
      'RESTART TO MISSION 1',
    ];

    cy += 82;
    for (let i = 0; i < options.length; i++) {
      const isSel = i === this.selectedIdx;
      if (isSel) {
        ctx.fillStyle = 'rgba(255, 187, 0, 0.22)';
        ctx.fillRect(cx - 210, cy - 24, 420, 40);
        ctx.strokeStyle = '#ffbb00';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 210, cy - 24, 420, 40);

        ctx.fillStyle = '#ffea66';
        ctx.font = '900 21px sans-serif';
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 18px sans-serif';
      }
      ctx.fillText(options[i], cx, cy);
      cy += 54;
    }

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(160, 180, 205, 0.65)';
    ctx.fillText('[W / S or Arrow Keys] Select    [Enter / Space] Confirm    [Esc] Resume', cx, h - 38);
  }

  renderControlsGuide(ctx, w, h) {
    const cx = w * 0.5;
    let cy = 70;

    ctx.textAlign = 'center';
    ctx.font = '900 34px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.fillText('VELA BAY OPERATOR CONTROLS', cx, cy);

    cy += 48;
    const boxW = Math.min(800, w - 80);
    const boxX = (w - boxW) * 0.5;

    const keybinds = [
      { key: 'W / A / S / D', action: 'Move Rook on Foot / Steer & Accelerate Vehicle' },
      { key: 'Shift (Hold)', action: 'Sprint on foot / Nitro boost acceleration in cars' },
      { key: 'Space', action: 'Handbrake Drift / Slide in vehicle / Jump on foot' },
      { key: 'F / Enter', action: 'Enter or Exit nearby Vehicle' },
      { key: 'Left Click', action: 'Fire Weapon (Pistol / SMG / Shotgun / Carbine)' },
      { key: 'Right Click (Hold)', action: 'Aim Down Sights (Zoomed tactical camera)' },
      { key: '1, 2, 3, 4', action: 'Equip Pistol, SMG, Shotgun, or Carbine' },
      { key: 'R', action: 'Reload current weapon magazine' },
      { key: 'E', action: 'Horn in vehicle / Interact with contacts' },
      { key: 'H', action: 'Toggle Vehicle Headlights' },
      { key: 'Esc / P', action: 'Pause Game / View Dossier' },
    ];

    for (let i = 0; i < keybinds.length; i++) {
      const kb = keybinds[i];
      ctx.fillStyle = i % 2 === 0 ? 'rgba(25, 33, 48, 0.8)' : 'rgba(18, 24, 36, 0.8)';
      ctx.fillRect(boxX, cy, boxW, 36);

      ctx.textAlign = 'left';
      ctx.font = '900 14px monospace';
      ctx.fillStyle = '#ffbb00';
      ctx.fillText(kb.key, boxX + 18, cy + 23);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(kb.action, boxX + 220, cy + 23);

      cy += 40;
    }

    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[Esc / Enter] Back to Menu', cx, h - 30);
  }

  renderMissionLog(ctx, w, h, missions) {
    const cx = w * 0.5;
    let cy = 55;

    ctx.textAlign = 'center';
    ctx.font = '900 32px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.fillText('SYNDICATE CAMPAIGN CONTRACTS', cx, cy);

    cy += 42;
    const boxW = Math.min(880, w - 80);
    const boxX = (w - boxW) * 0.5;

    for (let i = 0; i < missions.missions.length; i++) {
      const m = missions.missions[i];
      const isCurrent = i === missions.currentIdx;
      const isCompleted = i < missions.currentIdx;

      ctx.fillStyle = isCurrent ? 'rgba(255, 187, 0, 0.20)' : 'rgba(18, 23, 34, 0.75)';
      ctx.fillRect(boxX, cy, boxW, 56);

      ctx.strokeStyle = isCurrent ? '#ffbb00' : 'rgba(75, 90, 115, 0.45)';
      ctx.lineWidth = isCurrent ? 2 : 1;
      ctx.strokeRect(boxX, cy, boxW, 56);

      ctx.textAlign = 'left';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = isCurrent ? '#ffea66' : (isCompleted ? '#44ee77' : '#8899aa');
      ctx.fillText(`${m.title} ${isCompleted ? '✓ COMPLETED' : (isCurrent ? '★ ACTIVE TARGET' : 'LOCKED')}`, boxX + 18, cy + 23);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = 'rgba(215, 225, 240, 0.85)';
      ctx.fillText(m.desc, boxX + 18, cy + 43);

      ctx.textAlign = 'right';
      ctx.font = '900 15px sans-serif';
      ctx.fillStyle = '#55ff77';
      ctx.fillText(`$${m.rewardCash.toLocaleString()}`, boxX + boxW - 18, cy + 32);

      cy += 63;
    }

    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[Esc / Enter] Back to Menu', cx, h - 25);
  }

  renderVictoryScreen(ctx, w, h, player) {
    const cx = w * 0.5;
    let cy = h * 0.30;

    ctx.textAlign = 'center';
    ctx.font = '900 46px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.shadowColor = 'rgba(255, 187, 0, 0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText('CAMPAIGN COMPLETE!', cx, cy);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#55ff88';
    ctx.fillText(`TOTAL REPUTATION & STASH: $${player.cash.toLocaleString()}`, cx, cy + 46);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('You toppled the Syndicate and conquered Nightfall City: Vela Bay.', cx, cy + 90);
    ctx.fillText('Press [Enter] or [Space] to resume free-roaming exploration.', cx, cy + 130);
  }
}
