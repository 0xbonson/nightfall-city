// Narrative Missions and Story Arc for Nightfall City (Vela Bay)
// Features 6 connected story missions with dialogue, objectives, enemies, and grand ending.

import { audio } from './audio.js';
import { SaveManager } from './save.js';
import { police } from './police.js';
import { CONFIG } from './config.js';

export const MISSION_MARKER_TRIGGER_RADIUS = 5.0; // Distance in meters to activate mission beacon
export const TOTAL_STORY_CAMPAIGN_MISSIONS = 8;
export const CHECKPOINT_TRIGGER_RADIUS = 8.0; // Proximity trigger threshold for street race checkpoints

export const COURIER_DESTINATIONS = [
  { x: -180, z: 90, name: 'Vela Marina Pier' },
  { x: -20, z: -25, name: 'Central Park Fountain' },
  { x: 95, z: -95, name: 'Downtown Penthouse' },
  { x: -130, z: -135, name: 'Old Market Quarter' },
  { x: 160, z: 170, name: 'Meridian Docks Depot' },
  { x: -90, z: 25, name: 'Grand Arena Plaza' },
  { x: 140, z: -40, name: 'Skyway Construction Site' },
  { x: -105, z: 175, name: 'Ocean Promenade Boardwalk' },
];

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
      },
      {
        id: 7,
        title: 'The Skyway Lockdown',
        client: 'Matteo Port Meridian',
        startMarker: { x: 0, z: 20, radius: 6.0 },
        steps: [
          {
            desc: 'Drive to the Elevated Skyway Overpass where corrupt Metro SWAT units formed a tactical blockade.',
            dialogue: { speaker: 'MATTEO', text: 'Rhea, Reynolds is finished, but rogue precinct brass have barricaded the Skyway overpass. Break their blockade before they lock down Vela Bay!' },
            target: { x: -60, z: 75, radius: 7.0 },
            action: 'reach',
            spawnEnemies: 6
          },
          {
            desc: 'Eliminate the 6 rogue SWAT commanders holding the overpass checkpoint.',
            dialogue: { speaker: 'SWAT COMMANDER', text: 'Target Solano on the deck! Open fire, don\'t let her off the bridge!' },
            action: 'eliminate'
          },
          {
            desc: 'Evade the 4-star citywide dragnet and deliver the command vehicle to the Downtown Tower!',
            dialogue: { speaker: 'MATTEO', text: 'Cruisers and gunships are converging! Floor it down the Skyway ramp and bring it home to Downtown!' },
            triggerPolice: 4,
            target: { x: 100, z: -100, radius: 6.0 },
            timeLimit: 120,
            action: 'deliver'
          }
        ],
        reward: 35000,
      },
      {
        id: 8,
        title: 'The Sunset Syndicate Heist',
        client: 'Port Meridian Underworld',
        startMarker: { x: -60, z: 120, radius: 6.0 },
        steps: [
          {
            desc: 'Meet your informant at the Ocean Promenade Gazebo for the vault schematics.',
            dialogue: { speaker: 'INFORMANT', text: 'Rook. The Sunset Syndicate keeps bearer bonds in the beachside safehouse. Take these codes before their offshore courier docks.' },
            target: { x: -140, z: 125, radius: 5.0 },
            action: 'reach'
          },
          {
            desc: 'Infiltrate the Syndicate Ocean Safehouse and breach the security gate.',
            dialogue: { speaker: 'MATTEO', text: 'You have the codes. Hit their safehouse fast, clear out the heavy hitters, and blow the vault.' },
            target: { x: -210, z: 80, radius: 6.0 },
            action: 'reach',
            spawnEnemies: 5
          },
          {
            desc: 'Eliminate the 5 Syndicate Safehouse Enforcers guarding the vault.',
            dialogue: { speaker: 'SYNDICATE CAPTAIN', text: 'Solano breached the perimeter! Fire at will, protect the bearer bonds!' },
            action: 'eliminate'
          },
          {
            desc: 'Grab the bonds and lose the 3-star Metro Police dragnet to the Marina Safe Drop!',
            dialogue: { speaker: 'MATTEO', text: 'Bonds secured! Alarms tripped the whole south precinct—lose the heat and hit the Marina drop!' },
            triggerPolice: 3,
            target: { x: -60, z: 200, radius: 6.0 },
            timeLimit: 110,
            action: 'deliver'
          }
        ],
        reward: 45000,
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

    // Express Courier Open-World Activity Loop
    this.courierRun = {
      active: false,
      target: null,
      targetName: '',
      timeLimit: 0,
      timer: 0,
      reward: 0,
      completedRuns: 0,
    };

    // Vela Bay Taxi Shift Side Activity
    this.taxiShift = {
      active: false,
      state: 'idle', // 'idle' | 'seeking_fare' | 'driving_fare'
      passenger: null,
      destination: null,
      destinationName: '',
      fare: 0,
      bonus: 120,
      timeElapsed: 0,
      completedFares: 0,
      totalEarned: 0,
    };
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

  startStep(stepIdx, player = null) {
    this.currentStepIndex = stepIdx;
    const step = this.activeMission.steps[stepIdx];
    if (!step) {
      this.completeMission(player);
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

  completeMission(player = null) {
    audio.playMissionFanfare();
    const rew = this.activeMission.reward;
    if (player) {
      player.cash += rew;
    }
    this.showDialogue('SYSTEM', `MISSION PASSED! +$${rew}`, 7.0);

    this.activeMission = null;
    this.currentMissionIndex++;

    if (this.currentMissionIndex >= this.missions.length) {
      this.storyCompleted = true;
    }
  }

  // --- Express Courier Delivery Activity Loop ---
  startCourierRun(player) {
    if (this.courierRun.active) {
      this.cancelCourierRun();
      return;
    }
    const available = COURIER_DESTINATIONS.filter(d => Math.hypot(player.x - d.x, player.z - d.z) > 45);
    const dest = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : COURIER_DESTINATIONS[0];
    const dist = Math.hypot(player.x - dest.x, player.z - dest.z);
    const timeLimit = Math.max(50, Math.ceil((dist / 22.0) * 1.5) + 15);
    const reward = Math.round(750 + dist * 5.5);

    this.courierRun = {
      active: true,
      target: { x: dest.x, z: dest.z, radius: 8.5 },
      targetName: dest.name,
      timeLimit: timeLimit,
      timer: timeLimit,
      reward: reward,
      completedRuns: this.courierRun.completedRuns || 0,
    };

    audio.playCash();
    this.showDialogue('DISPATCH', `EXPRESS RUN: Deliver package to ${dest.name}! (${timeLimit}s)`, 5.5);
  }

  cancelCourierRun() {
    if (!this.courierRun.active) return;
    this.courierRun.active = false;
    this.courierRun.target = null;
    this.showDialogue('DISPATCH', 'Courier delivery cancelled.', 3.0);
  }

  updateCourier(dt, player) {
    if (!this.courierRun.active) return;

    this.courierRun.timer -= dt;
    if (this.courierRun.timer <= 0) {
      this.courierRun.active = false;
      this.courierRun.target = null;
      audio.playSiren(false);
      this.showDialogue('DISPATCH', 'DELIVERY EXPIRED! Job failed.', 4.0);
      return;
    }

    const dist = Math.hypot(player.x - this.courierRun.target.x, player.z - this.courierRun.target.z);
    if (dist < this.courierRun.target.radius) {
      const rew = this.courierRun.reward;
      if (player) {
        player.cash += rew;
      }
      this.courierRun.completedRuns++;
      this.courierRun.active = false;
      this.courierRun.target = null;
      audio.playCash();
      audio.playMissionFanfare();
      this.showDialogue('DISPATCH', `PACKAGE DELIVERED! +$${rew} (Runs: ${this.courierRun.completedRuns})`, 6.0);
    }
  }

  toggleTaxiShift(player) {
    if (this.taxiShift.active) {
      this.taxiShift.active = false;
      this.taxiShift.state = 'idle';
      this.taxiShift.passenger = null;
      this.taxiShift.destination = null;
      this.showDialogue('DISPATCH', `Taxi Shift ended. Total earned: $${this.taxiShift.totalEarned}`, 4.0);
      return false;
    } else {
      this.taxiShift.active = true;
      this.taxiShift.state = 'seeking_fare';
      this.pickNextPassenger(player);
      audio.playCash();
      this.showDialogue('DISPATCH', 'TAXI SHIFT ON: Locate waiting passenger and pull over.', 5.0);
      return true;
    }
  }

  pickNextPassenger(player) {
    // Pick passenger at one of city destinations
    const spot = COURIER_DESTINATIONS[Math.floor(Math.random() * COURIER_DESTINATIONS.length)];
    this.taxiShift.state = 'seeking_fare';
    this.taxiShift.passenger = {
      x: spot.x + (Math.random() - 0.5) * 8,
      z: spot.z + (Math.random() - 0.5) * 8,
      name: spot.name,
      radius: 4.5,
    };
    this.taxiShift.destination = null;
    this.taxiShift.fare = 35;
    this.taxiShift.bonus = 120;
    this.taxiShift.timeElapsed = 0;
  }

  pickPassengerDestination(player) {
    const candidates = COURIER_DESTINATIONS.filter(d => Math.hypot(d.x - player.x, d.z - player.z) > 80);
    const dest = candidates[Math.floor(Math.random() * candidates.length)] || COURIER_DESTINATIONS[0];
    const tripDist = Math.hypot(dest.x - player.x, dest.z - player.z);
    this.taxiShift.state = 'driving_fare';
    this.taxiShift.destination = { x: dest.x, z: dest.z, radius: 5.5 };
    this.taxiShift.destinationName = dest.name;
    this.taxiShift.fare = Math.floor(40 + tripDist * 0.45);
    this.taxiShift.bonus = Math.floor(60 + tripDist * 0.25);
    this.taxiShift.timeElapsed = 0;
    audio.playCarDoor();
    this.showDialogue('PASSENGER', `Take me to ${dest.name}, and step on it!`, 5.0);
  }

  updateTaxiShift(dt, player) {
    if (!this.taxiShift.active) return;

    if (this.taxiShift.state === 'seeking_fare' && this.taxiShift.passenger) {
      const dist = Math.hypot(player.x - this.taxiShift.passenger.x, player.z - this.taxiShift.passenger.z);
      const isStopped = player.inVehicle && player.vehicle ? Math.abs(player.vehicle.speed) < 3.5 : true;
      if (dist < this.taxiShift.passenger.radius && isStopped) {
        this.pickPassengerDestination(player);
      }
    } else if (this.taxiShift.state === 'driving_fare' && this.taxiShift.destination) {
      this.taxiShift.timeElapsed += dt;
      // Bonus decays slightly over time
      this.taxiShift.bonus = Math.max(15, this.taxiShift.bonus - dt * 1.5);

      const dist = Math.hypot(player.x - this.taxiShift.destination.x, player.z - this.taxiShift.destination.z);
      const isStopped = player.inVehicle && player.vehicle ? Math.abs(player.vehicle.speed) < 3.5 : true;
      if (dist < this.taxiShift.destination.radius && isStopped) {
        const totalPayout = Math.floor(this.taxiShift.fare + this.taxiShift.bonus);
        if (player) {
          player.cash += totalPayout;
        }
        this.taxiShift.totalEarned += totalPayout;
        this.taxiShift.completedFares++;
        audio.playCarDoor();
        audio.playCash();
        audio.playMissionFanfare();
        this.showDialogue('PASSENGER', `Here's your fare plus tip! +$${totalPayout}`, 5.0);
        this.pickNextPassenger(player);
      }
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

    // Update open-world courier activity
    this.updateCourier(dt, player);

    // Update taxi shift activity
    this.updateTaxiShift(dt, player);

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
        this.startStep(this.currentStepIndex + 1, player);
      }
    } else if (step.action === 'eliminate') {
      const aliveCount = this.enemies.filter(e => e.alive).length;
      if (aliveCount === 0) {
        this.startStep(this.currentStepIndex + 1, player);
      }
    } else if (step.action === 'eliminate_boss') {
      const boss = this.enemies.find(e => e.isBoss);
      if (!boss || !boss.alive) {
        this.startStep(this.currentStepIndex + 1, player);
      }
    } else if (step.action === 'evade') {
      if (police.wantedLevel === 0) {
        this.startStep(this.currentStepIndex + 1, player);
      }
    } else if (step.action === 'checkpoints') {
      const cp = step.checkpoints[this.currentCheckpointIndex];
      const dist = Math.hypot(player.x - cp.x, player.z - cp.z);
      if (dist < 8.0) {
        this.currentCheckpointIndex++;
        audio.playCash();
        if (this.currentCheckpointIndex >= step.checkpoints.length) {
          this.startStep(this.currentStepIndex + 1, player);
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
