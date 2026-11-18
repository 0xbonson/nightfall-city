/**
 * Nightfall City: Vela Bay - Menu & Interface Screens
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

export class MenuManager {
  constructor() {
    this.state = 'none'; // 'none', 'title', 'pause', 'mission_log', 'victory'
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
      this.state = 'pause';
      this.selectedIdx = 0;
    } else {
      this.state = 'none';
    }
  }

  handleInput(input, missions, player, audio, saveSystem) {
    if (this.state === 'none') {
      if (input.isJustPressed('Escape') || input.isJustPressed('KeyP')) {
        this.openPause();
      }
      return;
    }

    // Navigation in menus
    if (input.isJustPressed('ArrowUp') || input.isJustPressed('KeyW')) {
      this.selectedIdx = Math.max(0, this.selectedIdx - 1);
    }
    if (input.isJustPressed('ArrowDown') || input.isJustPressed('KeyS')) {
      this.selectedIdx++;
    }

    if (this.state === 'pause') {
      this.selectedIdx = Math.min(3, this.selectedIdx);
      if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
        if (this.selectedIdx === 0) {
          this.resume();
        } else if (this.selectedIdx === 1) {
          this.state = 'mission_log';
        } else if (this.selectedIdx === 2) {
          if (audio) audio.toggleMute();
        } else if (this.selectedIdx === 3) {
          // Restart to mission 1
          missions.loadMission(0);
          player.health = 100;
          player.armor = 50;
          this.resume();
        }
      }
    } else if (this.state === 'mission_log') {
      if (input.isJustPressed('Escape') || input.isJustPressed('Enter') || input.isJustPressed('Space')) {
        this.state = 'pause';
      }
    } else if (this.state === 'victory') {
      if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
        this.state = 'none';
      }
    }
  }

  render(ctx, w, h, missions, player) {
    if (this.state === 'none') return;

    // Dark translucent background overlay
    ctx.fillStyle = 'rgba(6, 8, 14, 0.88)';
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'pause') {
      this.renderPauseMenu(ctx, w, h);
    } else if (this.state === 'mission_log') {
      this.renderMissionLog(ctx, w, h, missions);
    } else if (this.state === 'victory') {
      this.renderVictoryScreen(ctx, w, h, player);
    }
  }

  renderPauseMenu(ctx, w, h) {
    const cx = w * 0.5;
    let cy = h * 0.28;

    // Title
    ctx.textAlign = 'center';
    ctx.font = '900 48px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.fillText('NIGHTFALL CITY: VELA BAY', cx, cy);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = 'rgba(200, 210, 230, 0.75)';
    ctx.fillText('GAME PAUSED', cx, cy + 34);

    // Options
    const options = [
      'RESUME GAME',
      'MISSION LOG & JOBS',
      'TOGGLE AUDIO SYNTH',
      'RESTART TO MISSION 1',
    ];

    cy += 95;
    for (let i = 0; i < options.length; i++) {
      const isSel = i === this.selectedIdx;
      if (isSel) {
        ctx.fillStyle = 'rgba(255, 187, 0, 0.25)';
        ctx.fillRect(cx - 180, cy - 24, 360, 38);
        ctx.strokeStyle = '#ffbb00';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 180, cy - 24, 360, 38);
        ctx.fillStyle = '#ffea66';
        ctx.font = '900 20px sans-serif';
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
      }
      ctx.fillText(options[i], cx, cy);
      cy += 54;
    }

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(180, 190, 205, 0.6)';
    ctx.fillText('[W / S or Arrow Keys] Navigate    [Enter / Space] Select    [Esc] Resume', cx, h - 45);
  }

  renderMissionLog(ctx, w, h, missions) {
    const cx = w * 0.5;
    let cy = 60;

    ctx.textAlign = 'center';
    ctx.font = '900 32px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.fillText('VELA BAY SYNDICATE MISSION LOG', cx, cy);

    cy += 45;
    const boxW = Math.min(840, w - 80);
    const boxX = (w - boxW) * 0.5;

    for (let i = 0; i < missions.missions.length; i++) {
      const m = missions.missions[i];
      const isCurrent = i === missions.currentIdx;
      const isCompleted = i < missions.currentIdx;

      ctx.fillStyle = isCurrent ? 'rgba(255, 187, 0, 0.18)' : 'rgba(20, 25, 35, 0.7)';
      ctx.fillRect(boxX, cy, boxW, 56);

      ctx.strokeStyle = isCurrent ? '#ffbb00' : 'rgba(70, 80, 100, 0.4)';
      ctx.lineWidth = isCurrent ? 2 : 1;
      ctx.strokeRect(boxX, cy, boxW, 56);

      ctx.textAlign = 'left';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = isCurrent ? '#ffea66' : (isCompleted ? '#44ee77' : '#99aabf');
      ctx.fillText(`${m.title} ${isCompleted ? '✓ COMPLETED' : (isCurrent ? '★ ACTIVE' : 'LOCKED')}`, boxX + 16, cy + 24);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = 'rgba(220, 225, 235, 0.8)';
      ctx.fillText(m.desc, boxX + 16, cy + 44);

      ctx.textAlign = 'right';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#55ff77';
      ctx.fillText(`$${m.rewardCash}`, boxX + boxW - 16, cy + 32);

      cy += 64;
    }

    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[Esc or Enter] Back to Pause Menu', cx, h - 35);
  }

  renderVictoryScreen(ctx, w, h, player) {
    const cx = w * 0.5;
    let cy = h * 0.32;

    ctx.textAlign = 'center';
    ctx.font = '900 44px "Arial Black", sans-serif';
    ctx.fillStyle = '#ffbb00';
    ctx.fillText('CAMPAIGN COMPLETE!', cx, cy);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#55ff88';
    ctx.fillText(`TOTAL REPUTATION & CASH: $${player.cash.toLocaleString()}`, cx, cy + 45);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('You took down the Syndicate and conquered Nightfall City: Vela Bay.', cx, cy + 85);
    ctx.fillText('Press [Enter] to continue exploring in Free Roam mode.', cx, cy + 125);
  }
}
