// Narrative Missions and Story Arc for Nightfall City (Vela Bay)
// Features 6 connected story missions with dialogue, objectives, enemies, and grand ending.

import { audio } from './audio.js';
import { SaveManager } from './save.js';
import { police } from './police.js';
import { CONFIG } from './config.js';

export const MISSION_MARKER_TRIGGER_RADIUS = 5.0; // Distance in meters to activate mission beacon
export const TOTAL_STORY_CAMPAIGN_MISSIONS = 6;
export const CHECKPOINT_TRIGGER_RADIUS = 8.0; // Proximity trigger threshold for street race checkpoints

export class MissionManager {
  constructor() {
    this.totalStoryMissions = TOTAL_STORY_CAMPAIGN_MISSIONS;
    this.missions = [
      {
        id: 1,
        title: 'The Marina Drop',
        client: 'Matteo Port Meridian',
        startMarker: { x: -140, z: 60, radius: 5.0 },
        steps: [
          {
            desc: 'Go to the Marina Pier to collect the encrypted datapad.',
            dialogue: { speaker: 'MATTEO', text: 'Rhea. Welcome to Vela Bay. I need someone who can move fast without asking questions. Grab the datapad at the Marina.' },
            target: { x: -180, z: 80, radius: 4.0 },
            action: 'reach'
          },
          {
            desc: 'Deliver the datapad to the Port Meridian Downtown Penthouse before time runs out!',
            dialogue: { speaker: 'MATTEO', text: 'Good. Now bring it to the Downtown tower. Vane Syndicate spotters are on the avenue—drive hard!' },
            target: { x: 100, z: -100, radius: 5.0 },
            timeLimit: 95,
            action: 'deliver'
          }
        ],
        reward: 1500,
      },
      {
        id: 2,
        title: 'Repo on Vane Turf',
        client: 'Matteo Port Meridian',
        startMarker: { x: 80, z: -80, radius: 5.0 },
        steps: [
          {
            desc: 'Infiltrate Vane Syndicate territory in the Old Market Quarter.',
            dialogue: { speaker: 'MATTEO', text: 'The Vanes boosted our prized custom Nero GT. They have it stashed in an alley in Old Town. Go take it back.' },
            target: { x: -70, z: -40, radius: 6.0 },
            action: 'reach',
            spawnEnemies: 3
          },
          {
            desc: 'Eliminate the 3 Syndicate guards protecting the Nero GT.',
            dialogue: { speaker: 'VANE ENFORCER', text: 'Look who crawled into Old Town! Put Solano in the dirt!' },
            action: 'eliminate'
          },
          {
            desc: 'Jack the Nero GT and deliver it to the Docks Chop Shop.',
            dialogue: { speaker: 'MATTEO', text: 'You got the keys! Bring it down to our chop shop at the Docks in one piece.' },
            target: { x: 100, z: 40, radius: 5.0 },
            action: 'deliver'
          }
        ],
        reward: 3000,
      },
      {
        id: 3,
        title: 'Market Muscle',
        client: 'Port Meridian Family',
        startMarker: { x: -100, z: -80, radius: 5.0 },
        steps: [
          {
            desc: 'Confront the Vane Syndicate enforcers shaking down Old Market merchants.',
            dialogue: { speaker: 'SHOPKEEPER', text: 'Rook, thank god! The Vane crew is smashing stalls and demanding protection money!' },
            target: { x: -140, z: -140, radius: 6.0 },
            action: 'reach',
            spawnEnemies: 5
          },
          {
            desc: 'Eliminate the 5 Vane Syndicate thugs in the market square.',
            dialogue: { speaker: 'VANE LIEUTENANT', text: 'This market belongs to Hector Vane now, courier! Kill her!' },
            action: 'eliminate'
          },
          {
            desc: 'Evade the arriving Vela Bay Metro police patrol!',
            dialogue: { speaker: 'METRO DISPATCH', text: 'All units, 10-71 shots fired in Old Market. Suspect is armed and dangerous!' },
            triggerPolice: 2,
            action: 'evade'
          }
        ],
        reward: 4500,
      },
      {
        id: 4,
        title: 'Vela Bay Sprint',
        client: 'Underground Street League',
        startMarker: { x: -220, z: 200, radius: 6.0 },
        steps: [
          {
            desc: 'Checkpoint Sprint: Pass through all 8 race gates across Vela Bay before time expires!',
            dialogue: { speaker: 'RACE MC', text: '8 gates from the Ocean Promenade through Downtown to the Docks. Hit the gas, Rook!' },
            action: 'checkpoints',
            timeLimit: 110,
            checkpoints: [
              { x: -140, z: 200 },
              { x: -60, z: 140 },
              { x: 0, z: 60 },
              { x: 0, z: -60 },
              { x: 60, z: -140 },
              { x: 140, z: -140 },
              { x: 140, z: 0 },
              { x: 180, z: 100 }
            ]
          }
        ],
        reward: 6000,
      },
      {
        id: 5,
        title: 'Armory Infiltration',
        client: 'Matteo Port Meridian',
        startMarker: { x: 100, z: -60, radius: 5.0 },
        steps: [
          {
            desc: 'Assault the fortified Vane Syndicate Armory near the Docks.',
            dialogue: { speaker: 'MATTEO', text: 'Hector Vane is stockpiling military-grade weaponry at their dockside depot. Infiltrate it and wipe out their garrison.' },
            target: { x: 180, z: 60, radius: 6.0 },
            action: 'reach',
            spawnEnemies: 6
          },
          {
            desc: 'Neutralize the 6 Syndicate depot guards and blow the weapons vault.',
            dialogue: { speaker: 'VANE COMMANDER', text: 'Intruder in the depot! Protect the vault at all costs!' },
            action: 'eliminate'
          },
          {
            desc: 'Secure the weapons cache and escape the 3-star Metro police net to the Safehouse.',
            dialogue: { speaker: 'MATTEO', text: 'Alarm is tripped! The whole Metro precinct is rolling in! Lose them and get to the Safehouse!' },
            triggerPolice: 3,
            target: { x: 0, z: 20, radius: 5.0 },
            action: 'deliver'
          }
        ],
        reward: 8000,
      },
      {
        id: 6,
        title: 'Nightfall at the Docks',
        client: 'Final Showdown',
        startMarker: { x: 140, z: 140, radius: 6.0 },
        steps: [
          {
            desc: 'Infiltrate Shipping Pier 7 where Hector Vane and corrupt Police Captain Reynolds are meeting.',
            dialogue: { speaker: 'MATTEO', text: 'This is it, Rook. Vane and Captain Reynolds are finalizing the takeover of the city on Pier 7. End this alliance once and for all.' },
            target: { x: 180, z: 180, radius: 6.0 },
            action: 'reach',
            spawnEnemies: 8,
            spawnBoss: true
          },
          {
            desc: 'Eliminate Boss Hector Vane and his elite Syndicate bodyguards!',
            dialogue: { speaker: 'HECTOR VANE', text: 'Solano! You should have stayed a glorified delivery girl! You die tonight in Vela Bay!' },
            action: 'eliminate_boss'
          },
          {
            desc: 'Board the extraction speedboat at the end of the pier to secure your rule over Nightfall City!',
            dialogue: { speaker: 'RHEA "ROOK"', text: 'Vela Bay is mine now. Let nightfall come.' },
            target: { x: 215, z: 215, radius: 5.0 },
            action: 'reach'
          }
        ],
        reward: 25000,
      }
    ];

    this.currentMissionIndex = 0;
    this.activeMission = null;
    this.currentStepIndex = 0;
    this.stepTimer = 0;
    this.currentCheckpointIndex = 0;
    this.enemies = [];
    this.dialogue = null;
    this.dialogueTimer = 0;
    this.storyCompleted = false;
  }

  get currentMission() {
    return this.missions[this.currentMissionIndex];
  }

  get currentStep() {
    if (!this.activeMission) return null;
    return this.activeMission.steps[this.currentStepIndex];
  }

  showDialogue(speaker, text, duration = 6.0) {
    this.dialogue = { speaker, text };
    this.dialogueTimer = duration;
  }

  startMission(index) {
    if (index >= this.missions.length) {
      this.storyCompleted = true;
      return;
    }
    this.currentMissionIndex = index;
    this.activeMission = this.missions[index];
    this.currentStepIndex = 0;
    this.startStep(0);
    audio.playCash();
  }

  startStep(stepIdx) {
    this.currentStepIndex = stepIdx;
    const step = this.activeMission.steps[stepIdx];
    if (!step) {
      this.completeMission();
      return;
    }

    if (step.dialogue) {
      this.showDialogue(step.dialogue.speaker, step.dialogue.text);
    }

    if (step.timeLimit) {
      this.stepTimer = step.timeLimit;
    } else {
      this.stepTimer = 0;
    }

    if (step.triggerPolice) {
      police.setWantedLevel(step.triggerPolice);
    }

    if (step.spawnEnemies) {
      this.spawnMissionEnemies(step.spawnEnemies, step.spawnBoss);
    }

    if (step.action === 'checkpoints') {
      this.currentCheckpointIndex = 0;
    }
  }

  spawnMissionEnemies(count, withBoss = false) {
    this.enemies = [];
    const basePos = this.currentStep.target || { x: 180, z: 180 };
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 5 + Math.random() * 8;
      this.enemies.push({
        x: basePos.x + Math.cos(angle) * dist,
        z: basePos.z + Math.sin(angle) * dist,
        heading: Math.random() * Math.PI * 2,
        health: 50,
        maxHealth: 50,
        alive: true,
        shootCooldown: 1.0 + Math.random() * 1.5,
        isSyndicate: true,
        isVehicle: false,
      });
    }

    if (withBoss) {
      this.enemies.push({
        x: basePos.x,
        z: basePos.z,
        heading: 0,
        health: 250,
        maxHealth: 250,
        alive: true,
        shootCooldown: 0.8,
        isBoss: true,
        isSyndicate: true,
        isVehicle: false,
        name: 'Hector Vane',
      });
    }
  }

  completeMission() {
    audio.playMissionFanfare();
    const rew = this.activeMission.reward;
    this.showDialogue('SYSTEM', `MISSION PASSED! +$${rew}`, 7.0);

    this.activeMission = null;
    this.currentMissionIndex++;

    if (this.currentMissionIndex >= this.missions.length) {
      this.storyCompleted = true;
    }
  }

  failMission(reason = 'MISSION FAILED') {
    this.showDialogue('SYSTEM', reason, 6.0);
    this.activeMission = null;
  }

  update(dt, player) {
    // Dialogue timer decay
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) {
        this.dialogue = null;
      }
    }

    // If no active mission, check if player walks into next mission start marker
    if (!this.activeMission && !this.storyCompleted) {
      const m = this.currentMission;
      if (m && m.startMarker) {
        const dist = Math.hypot(player.x - m.startMarker.x, player.z - m.startMarker.z);
        if (dist < m.startMarker.radius) {
          this.startMission(this.currentMissionIndex);
        }
      }
      return;
    }

    if (!this.activeMission) return;

    const step = this.currentStep;
    if (!step) return;

    // Step Timer
    if (step.timeLimit && this.stepTimer > 0) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.failMission('TIME EXPIRED - MISSION FAILED');
        return;
      }
    }

    // Step actions
    if (step.action === 'reach' || step.action === 'deliver') {
      const dist = Math.hypot(player.x - step.target.x, player.z - step.target.z);
      if (dist < step.target.radius) {
        this.startStep(this.currentStepIndex + 1);
      }
    } else if (step.action === 'eliminate') {
      const aliveCount = this.enemies.filter(e => e.alive).length;
      if (aliveCount === 0) {
        this.startStep(this.currentStepIndex + 1);
      }
    } else if (step.action === 'eliminate_boss') {
      const boss = this.enemies.find(e => e.isBoss);
      if (!boss || !boss.alive) {
        this.startStep(this.currentStepIndex + 1);
      }
    } else if (step.action === 'evade') {
      if (police.wantedLevel === 0) {
        this.startStep(this.currentStepIndex + 1);
      }
    } else if (step.action === 'checkpoints') {
      const cp = step.checkpoints[this.currentCheckpointIndex];
      const dist = Math.hypot(player.x - cp.x, player.z - cp.z);
      if (dist < 8.0) {
        this.currentCheckpointIndex++;
        audio.playCash();
        if (this.currentCheckpointIndex >= step.checkpoints.length) {
          this.startStep(this.currentStepIndex + 1);
        }
      }
    }

    // Update Syndicate Enemy AI
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const dist = Math.hypot(dx, dz);

      enemy.heading = Math.atan2(dx, dz);

      if (dist > 14) {
        enemy.x += Math.sin(enemy.heading) * 3.2 * dt;
        enemy.z += Math.cos(enemy.heading) * 3.2 * dt;
      }

      enemy.shootCooldown -= dt;
      if (enemy.shootCooldown <= 0 && dist < 45 && player.alive) {
        enemy.shootCooldown = enemy.isBoss ? 0.6 : (1.3 + Math.random() * 1.0);
        audio.playGunshot(enemy.isBoss);
        if (Math.random() < 0.65) {
          player.takeDamage(enemy.isBoss ? 16 : 10, { x: enemy.x, z: enemy.z });
        }
      }
    }
  }
}

export const missions = new MissionManager();
