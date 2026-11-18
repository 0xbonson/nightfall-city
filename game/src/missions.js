/**
 * Nightfall City: Vela Bay - Narrative Mission Engine & Objectives
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

import { MISSIONS } from './config.js';

export class MissionManager {
  constructor() {
    this.missions = MISSIONS;
    this.currentIdx = 0;
    this.status = 'active'; // 'inactive', 'active', 'passed', 'failed'
    this.bannerTimer = 0;
    this.bannerText = '';
    this.bannerSubtitle = '';

    // Race / Timed state
    this.missionTimer = 0;
    this.checkpointIdx = 0;

    // Taxi Side Job
    this.taxiMode = false;
    this.taxiFare = null; // { startX, startZ, destX, destZ, reward }

    this.markerRotation = 0;
    this.loadMission(0);
  }

  getCurrentMission() {
    return this.missions[this.currentIdx];
  }

  loadMission(index) {
    this.currentIdx = Math.max(0, Math.min(index, this.missions.length - 1));
    const m = this.missions[this.currentIdx];
    this.status = 'active';
    this.checkpointIdx = 0;
    this.missionTimer = m.timeLimit || 0;

    this.showBanner(m.title.toUpperCase(), m.desc, 4.5);
  }

  showBanner(title, subtitle, duration = 3.5) {
    this.bannerText = title;
    this.bannerSubtitle = subtitle;
    this.bannerTimer = duration;
  }

  getObjectiveText() {
    if (this.taxiMode && this.taxiFare) {
      return `TAXI FARE: Deliver passenger to destination ($${this.taxiFare.reward})`;
    }

    const m = this.getCurrentMission();
    if (!m) return 'FREE ROAM: Explore Vela Bay';

    if (m.targetType === 'race') {
      const remaining = Math.max(0, Math.ceil(this.missionTimer));
      return `COASTAL RACE: Checkpoint ${this.checkpointIdx + 1}/${m.checkpoints.length} [Time: ${remaining}s]`;
    }

    return m.desc;
  }

  getTargetCoords() {
    if (this.taxiMode && this.taxiFare) {
      return [this.taxiFare.destX, 0, this.taxiFare.destZ];
    }

    const m = this.getCurrentMission();
    if (!m) return null;

    if (m.targetType === 'race' && m.checkpoints) {
      return m.checkpoints[this.checkpointIdx];
    }

    return m.targetPos;
  }

  update(dt, player, vehicles, police, combat, saveSystem) {
    this.markerRotation += dt * 2.5;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
    }

    const m = this.getCurrentMission();
    if (!m || this.status !== 'active') return;

    // Update timed missions
    if (m.timeLimit && this.missionTimer > 0) {
      this.missionTimer -= dt;
      if (this.missionTimer <= 0) {
        this.status = 'failed';
        this.showBanner('MISSION FAILED', 'Time expired. Better luck next run.', 4.0);
        return;
      }
    }

    const target = this.getTargetCoords();
    if (!target) return;

    const dist = Math.hypot(player.x - target[0], player.z - target[2]);

    // Checkpoint race progression
    if (m.targetType === 'race') {
      if (dist < 8.0) {
        this.checkpointIdx++;
        if (this.checkpointIdx >= m.checkpoints.length) {
          this.completeMission(player, saveSystem);
        }
      }
      return;
    }

    // Standard waypoint arrival
    if (dist < 6.5) {
      if (m.targetType === 'vehicle_drop') {
        if (player.inVehicle) {
          this.completeMission(player, saveSystem);
        }
      } else if (m.targetType === 'pickup') {
        if (m.wantedLevelOnPickup) {
          police.setWantedStars(m.wantedLevelOnPickup);
        }
        this.completeMission(player, saveSystem);
      } else if (m.targetType === 'heist_finale') {
        if (m.wantedLevelOnTrigger) {
          police.setWantedStars(m.wantedLevelOnTrigger);
        }
        this.completeMission(player, saveSystem);
      } else {
        this.completeMission(player, saveSystem);
      }
    }
  }

  completeMission(player, saveSystem) {
    const m = this.getCurrentMission();
    this.status = 'passed';
    player.cash += m.rewardCash;

    this.showBanner('MISSION PASSED!', `+ $${m.rewardCash} CASH REWARD - ${m.completionText}`, 5.0);

    if (saveSystem) {
      saveSystem.save(player, this);
    }

    // Advance to next mission after delay
    setTimeout(() => {
      if (this.currentIdx < this.missions.length - 1) {
        this.loadMission(this.currentIdx + 1);
      } else {
        this.showBanner('CAMPAIGN COMPLETE', 'You rule the streets of Vela Bay!', 8.0);
      }
    }, 4500);
  }

  toggleTaxiMode(player) {
    if (!player.inVehicle) return;
    this.taxiMode = !this.taxiMode;
    if (this.taxiMode) {
      // Spawn random destination
      this.taxiFare = {
        destX: -105 + Math.random() * 200,
        destZ: -180 + Math.random() * 360,
        reward: 150 + Math.floor(Math.random() * 300),
      };
      this.showBanner('TAXI SHIFT STARTED', `Deliver fare to destination for $${this.taxiFare.reward}!`, 3.0);
    } else {
      this.taxiFare = null;
      this.showBanner('TAXI SHIFT ENDED', 'Off the clock.', 2.5);
    }
  }

  buildMesh(positions, normals, colors, uvs) {
    const target = this.getTargetCoords();
    if (!target) return;

    const tx = target[0];
    const ty = target[1] + 1.2 + Math.sin(this.markerRotation * 1.5) * 0.35;
    const tz = target[2];

    // Rotating golden diamond waypoint marker
    const goldColor = [1.0, 0.85, 0.15, 0.95];
    const size = 1.4;

    const rot = this.markerRotation;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    const toWorld = (lx, ly, lz) => {
      const wx = tx + (lx * cosR + lz * sinR);
      const wy = ty + ly;
      const wz = tz + (-lx * sinR + lz * cosR);
      return [wx, wy, wz];
    };

    const top = toWorld(0, size, 0);
    const bottom = toWorld(0, -size, 0);
    const mid1 = toWorld(size * 0.7, 0, 0);
    const mid2 = toWorld(0, 0, size * 0.7);
    const mid3 = toWorld(-size * 0.7, 0, 0);
    const mid4 = toWorld(0, 0, -size * 0.7);

    const faces = [
      [top, mid1, mid2],
      [top, mid2, mid3],
      [top, mid3, mid4],
      [top, mid4, mid1],
      [bottom, mid2, mid1],
      [bottom, mid3, mid2],
      [bottom, mid4, mid3],
      [bottom, mid1, mid4],
    ];

    for (const f of faces) {
      for (let p = 0; p < 3; p++) {
        positions.push(f[p][0], f[p][1], f[p][2]);
        normals.push(0, 1, 0);
        colors.push(goldColor[0], goldColor[1], goldColor[2], goldColor[3]);
        uvs.push(0, 0);
      }
    }
  }
}
