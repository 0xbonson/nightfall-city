/**
 * Nightfall City: Vela Bay - Narrative Mission Engine & Objective Tracking
 * 8-part story arc (Courier deliveries, vehicle repo, street racing, depot sabotage,
 * overpass pursuit, marina heist) plus interactive Taxi Driver side hustle.
 * Authored by makefun agent for the open-world crime entry.
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

    // Taxi Driver Side Job
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

  toggleTaxiMode(player, audio) {
    this.taxiMode = !this.taxiMode;
    if (this.taxiMode) {
      const destX = (Math.random() - 0.5) * 320;
      const destZ = (Math.random() - 0.5) * 320;
      this.taxiFare = {
        destX,
        destZ,
        reward: 350 + Math.floor(Math.random() * 450),
      };
      this.showBanner('TAXI SHIFT STARTED', `Deliver passenger to marked destination ($${this.taxiFare.reward})`, 3.5);
      if (audio) audio.playCashChime();
    } else {
      this.taxiFare = null;
      this.showBanner('TAXI SHIFT ENDED', 'Off duty. Resuming standard operations.', 3.0);
    }
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

  getDistanceToTarget(playerX, playerZ) {
    const target = this.getTargetCoords();
    if (!target) return 0;
    return Math.round(Math.hypot(playerX - target[0], playerZ - target[2]));
  }

  update(dt, player, vehicles, police, combat, saveSystem, audio) {
    this.markerRotation += dt * 2.5;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
    }

    // Taxi Fare Completion Check
    if (this.taxiMode && this.taxiFare) {
      const d = Math.hypot(player.x - this.taxiFare.destX, player.z - this.taxiFare.destZ);
      if (d < 8.5) {
        player.addMoney(this.taxiFare.reward);
        this.showBanner('FARE DELIVERED!', `Earned $${this.taxiFare.reward} cash fare + tip!`, 3.5);
        if (audio) audio.playCashChime();
        this.taxiFare = null;
        this.taxiMode = false;
        if (saveSystem) saveSystem.save(player, this, police);
      }
      return;
    }

    const m = this.getCurrentMission();
    if (!m || this.status !== 'active') return;

    // Timed countdown
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

    const d = Math.hypot(player.x - target[0], player.z - target[2]);

    if (m.targetType === 'race') {
      if (d < 14.0) {
        this.checkpointIdx++;
        if (this.checkpointIdx >= m.checkpoints.length) {
          this.completeMission(player, police, saveSystem, audio);
        } else {
          this.showBanner('CHECKPOINT CLEARED', `${this.checkpointIdx}/${m.checkpoints.length} passed!`, 1.5);
          if (audio) audio.playCashChime();
        }
      }
    } else if (m.targetType === 'vehicle_drop') {
      if (d < 10.0 && player.inVehicle) {
        this.completeMission(player, police, saveSystem, audio);
      }
    } else if (m.targetType === 'pickup') {
      if (d < 4.5) {
        if (m.wantedLevelOnPickup) police.setWantedStars(m.wantedLevelOnPickup);
        this.completeMission(player, police, saveSystem, audio);
      }
    } else if (m.targetType === 'combat_repo' || m.targetType === 'combat_elimination') {
      if (d < 14.0) {
        const aliveEnemies = combat.enemies.filter((e) => e.alive);
        if (aliveEnemies.length === 0) {
          this.completeMission(player, police, saveSystem, audio);
        }
      }
    } else if (m.targetType === 'chase_intercept' || m.targetType === 'sabotage_escape' || m.targetType === 'heist_finale') {
      if (d < 8.5) {
        this.completeMission(player, police, saveSystem, audio);
      }
    }
  }

  completeMission(player, police, saveSystem, audio) {
    const m = this.getCurrentMission();
    this.status = 'passed';
    player.addMoney(m.rewardCash);

    this.showBanner('MISSION PASSED!', `${m.title} — Earned $${m.rewardCash.toLocaleString()}`, 4.5);
    if (audio) audio.playMissionPassed();

    setTimeout(() => {
      if (this.currentIdx < this.missions.length - 1) {
        this.loadMission(this.currentIdx + 1);
      } else {
        this.showBanner('CAMPAIGN CONQUERED!', 'You control Vela Bay. Free roam unlocked.', 6.0);
      }
      if (saveSystem) saveSystem.save(player, this, police);
    }, 4500);
  }

  buildMesh(positions, normals, colors, uvs) {
    const target = this.getTargetCoords();
    if (!target) return;

    const tx = target[0];
    const ty = target[1] + 2.2 + Math.sin(this.markerRotation * 1.5) * 0.35;
    const tz = target[2];

    const rot = this.markerRotation;
    const goldCol = [1.6, 1.25, 0.28, 0.95];
    const s = 1.1;

    // Rotating 3D octahedron diamond beacon
    const topPt = [tx, ty + s, tz];
    const btmPt = [tx, ty - s, tz];
    const midPts = [
      [tx + Math.cos(rot) * s, ty, tz + Math.sin(rot) * s],
      [tx + Math.cos(rot + Math.PI * 0.5) * s, ty, tz + Math.sin(rot + Math.PI * 0.5) * s],
      [tx + Math.cos(rot + Math.PI) * s, ty, tz + Math.sin(rot + Math.PI) * s],
      [tx + Math.cos(rot + Math.PI * 1.5) * s, ty, tz + Math.sin(rot + Math.PI * 1.5) * s],
    ];

    const addTri = (p1, p2, p3) => {
      positions.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      colors.push(goldCol[0], goldCol[1], goldCol[2], goldCol[3]);
      colors.push(goldCol[0], goldCol[1], goldCol[2], goldCol[3]);
      colors.push(goldCol[0], goldCol[1], goldCol[2], goldCol[3]);
      uvs.push(0, 0, 1, 0, 0.5, 1);
    };

    // Upper pyramid
    addTri(topPt, midPts[0], midPts[1]);
    addTri(topPt, midPts[1], midPts[2]);
    addTri(topPt, midPts[2], midPts[3]);
    addTri(topPt, midPts[3], midPts[0]);

    // Lower pyramid
    addTri(btmPt, midPts[1], midPts[0]);
    addTri(btmPt, midPts[2], midPts[1]);
    addTri(btmPt, midPts[3], midPts[2]);
    addTri(btmPt, midPts[0], midPts[3]);
  }
}
