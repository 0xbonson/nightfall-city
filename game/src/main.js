/**
 * Nightfall City: Vela Bay - Game Coordinator & Main Loop
 * Authored by makefun agent for the open-world crime game entry.
 *
 * Coordinates:
 * - Pure WebGL 3D rendering pipeline (world mesh, dynamic entities, atmosphere)
 * - 2D HUD canvas overlay (status bars, wanted stars, speedometer, radar minimap, menus)
 * - Systems orchestration: Player, Vehicles, Pedestrians, Police AI, Missions, Combat, Audio Synth,
 *   District Manager, Safehouse Garage, Generative Multi-Station Radio System
 * - Deterministic Photo Mode presets (?shot=1..4) with camera choreography and world staging
 * - Persistent save/load synchronization
 */

import { SHOT_PRESETS } from './config.js';
import { World } from './world.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { PedestrianManager } from './pedestrians.js';
import { PoliceSystem } from './police.js';
import { MissionManager } from './missions.js';
import { CombatSystem } from './combat.js';
import { HUD } from './hud.js';
import { Minimap } from './minimap.js';
import { AudioEngine } from './audio.js';
import { MenuManager } from './menus.js';
import { SaveSystem } from './save.js';
import { InputManager } from './input.js';
import { DistrictManager } from './districts.js';
import { GarageSystem } from './garage.js';
import { RadioSystem } from './radio.js';

export class Game {
  constructor() {
    this.glCanvas = document.getElementById('gl-canvas');
    this.hudCanvas = document.getElementById('hud-canvas');

    this.input = new InputManager(this.hudCanvas);
    this.audio = new AudioEngine();
    this.saveSystem = new SaveSystem();
    this.menuManager = new MenuManager();

    this.districts = new DistrictManager();
    this.garage = new GarageSystem();
    this.radio = new RadioSystem(this.audio);

    this.world = new World();
    this.renderer = new Renderer(this.glCanvas);
    this.renderer.uploadWorldMesh(this.world);

    this.camera = new Camera();
    this.player = new Player(68, 0, -68);

    this.vehicles = new VehicleManager();
    this.vehicles.initCityTraffic(this.world);

    this.pedestrians = new PedestrianManager();
    this.pedestrians.initCityPedestrians();

    this.police = new PoliceSystem();
    this.missions = new MissionManager();
    this.combat = new CombatSystem();
    this.combat.initDocksEnemies();

    this.hud = new HUD();
    this.hud.init(this.hudCanvas);
    this.minimap = new Minimap(76);

    this.lastTime = performance.now();
    this.totalTime = 0;
    this.activeCar = null;

    // Detect photo mode (?shot=1..4)
    this.shotPreset = this.detectShotPreset();

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // Apply photo mode preset or load save
    if (this.shotPreset) {
      this.applyShotPreset(this.shotPreset);
    } else {
      this.saveSystem.load(this.player, this.missions, this.police, this.garage, this.radio);
    }

    // Dynamic mesh buffers
    this.dynPositions = [];
    this.dynNormals = [];
    this.dynColors = [];
    this.dynUvs = [];

    // Audio context unlock on first user gesture
    const unlockAudio = () => {
      this.audio.init();
      this.audio.resume();
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('mousedown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Launch main render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  detectShotPreset() {
    const params = new URLSearchParams(window.location.search);
    const shotNum = parseInt(params.get('shot'), 10);
    if (shotNum && SHOT_PRESETS[shotNum]) {
      return SHOT_PRESETS[shotNum];
    }
    return null;
  }

  applyShotPreset(preset) {
    this.camera.setPreset(preset);

    if (preset.player) {
      this.player.x = preset.player.pos[0];
      this.player.y = preset.player.pos[1];
      this.player.z = preset.player.pos[2];
      this.player.rotY = preset.player.rot;
      if (preset.player.weapon) this.player.currentWeapon = preset.player.weapon;

      if (preset.player.inVehicle) {
        const carType = preset.player.vehicleType || 'sports';
        const car = this.vehicles.spawn(carType, this.player.x, 0, this.player.z, this.player.rotY);
        car.speed = (preset.player.speedMph || 120) / 2.237;
        this.player.enterVehicle(car);
        this.activeCar = car;
      }
    }

    if (preset.wantedStars !== undefined) {
      this.police.setWantedStars(preset.wantedStars);
    }

    if (preset.traffic) {
      for (const tr of preset.traffic) {
        const v = this.vehicles.spawn(tr.type, tr.pos[0], tr.pos[1], tr.pos[2], tr.rot);
        v.speed = (tr.speedMph || 0) / 2.237;
      }
    }

    if (preset.pedestrians) {
      for (const pd of preset.pedestrians) {
        this.pedestrians.spawn(pd.pos[0], pd.pos[1], pd.pos[2], pd.rot);
      }
    }

    if (preset.enemies) {
      for (const en of preset.enemies) {
        this.combat.spawnEnemy(en.pos[0], en.pos[1], en.pos[2], en.rot);
      }
    }

    if (preset.cruisers) {
      for (const cr of preset.cruisers) {
        const cruiser = this.vehicles.spawn('police', cr.pos[0], cr.pos[1], cr.pos[2], cr.rot);
        cruiser.sirenActive = true;
        cruiser.sirenTimer = cr.sirenPhase || 0;
        cruiser.speed = (preset.player && preset.player.speedMph ? preset.player.speedMph : 120) / 2.237;
      }
    }

    if (preset.hasHeli) {
      this.police.helicopter.active = true;
      this.police.helicopter.forcedActive = true;
      this.police.helicopter.lockedPosition = true;
      if (preset.heliPos) {
        this.police.helicopter.x = preset.heliPos[0];
        this.police.helicopter.y = preset.heliPos[1];
        this.police.helicopter.z = preset.heliPos[2];
      } else {
        this.police.helicopter.x = preset.player.pos[0] + 6;
        this.police.helicopter.y = 26;
        this.police.helicopter.z = preset.player.pos[2] + 16;
      }
    }
  }

  handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.glCanvas.width = w;
    this.glCanvas.height = h;
    this.hudCanvas.width = w;
    this.hudCanvas.height = h;
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) * 0.001, 0.1);
    this.lastTime = currentTime;
    this.totalTime += dt;

    this.update(dt);
    this.render();

    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Menu navigation & pause check
    this.menuManager.handleInput(this.input, this.missions, this.player, this.audio, this.saveSystem, this.radio);

    if (this.menuManager.isPaused() && !this.shotPreset) {
      return;
    }

    // Toggle taxi side gig
    if (this.input.isJustPressed('KeyK')) {
      this.missions.toggleTaxiMode(this.player, this.audio);
    }

    // Active vehicle check
    this.activeCar = this.player.inVehicle ? this.player.vehicle : null;

    // Vehicle horn
    if (this.activeCar && (this.input.isJustPressed('KeyH') || this.input.isJustPressed('KeyE'))) {
      this.activeCar.honkHorn(this.audio, this.pedestrians);
    }

    // Radio cycling inside vehicle
    if (this.activeCar && this.input.isJustPressed('KeyR')) {
      this.radio.nextStation();
    }

    // Shooting input on foot
    if (this.input.isMouseDown && !this.player.inVehicle && !this.shotPreset) {
      this.combat.playerShoot(this.player, this.camera, this.police, this.audio);
    }

    // Subsystem updates
    this.districts.update(dt, this.player.x, this.player.y, this.player.z);
    this.garage.update(dt, this.player, this.activeCar, this.police, this.audio, this.saveSystem);
    this.radio.update(dt, this.player.inVehicle, this.input, this.audio);

    this.player.update(dt, this.input, this.camera, this.world, this.vehicles);
    this.vehicles.update(dt, this.input, this.world);
    this.pedestrians.update(dt, this.world, this.player, this.vehicles, this.audio);
    this.police.update(dt, this.player, this.vehicles, this.world, this.audio);
    this.missions.update(dt, this.player, this.vehicles, this.police, this.combat, this.saveSystem, this.audio);
    this.combat.update(dt, this.world, this.player, this.pedestrians, this.vehicles, this.police, this.camera, this.audio);
    this.camera.update(dt, this.player, this.activeCar, this.input);

    // Audio synthesizer updates
    if (this.player.stepTrigger && !this.player.inVehicle) {
      this.audio.playFootstep();
    }
    this.audio.updateEngine(this.activeCar ? this.activeCar.engineRPM : 1000, !!this.activeCar);
    this.audio.updateSiren(this.police.wantedStars > 0);
  }

  render() {
    // 1. Gather dynamic entities into single batch
    this.dynPositions.length = 0;
    this.dynNormals.length = 0;
    this.dynColors.length = 0;
    this.dynUvs.length = 0;

    this.player.buildMesh(this.dynPositions, this.dynNormals, this.dynColors, this.dynUvs);
    this.vehicles.buildMesh(this.dynPositions, this.dynNormals, this.dynColors, this.dynUvs);
    this.pedestrians.buildMesh(this.dynPositions, this.dynNormals, this.dynColors, this.dynUvs);
    this.police.buildMesh(this.dynPositions, this.dynNormals, this.dynColors, this.dynUvs);
    this.garage.buildMesh(this.dynPositions, this.dynNormals, this.dynColors, this.dynUvs);
    this.missions.buildMesh(this.dynPositions, this.dynNormals, this.dynColors, this.dynUvs);
    this.combat.buildMesh(this.dynPositions, this.dynNormals, this.dynColors, this.dynUvs);

    // 2. Render 3D WebGL Scene
    const sirens = this.vehicles.getPoliceSirens();
    this.renderer.renderWorld(this.camera, this.totalTime, sirens);

    this.renderer.drawDynamicMesh(
      this.dynPositions,
      this.dynNormals,
      this.dynColors,
      this.dynUvs
    );

    // 3. Render 2D Overlay (HUD, Minimap, Menus)
    const hudCtx = this.hud.ctx;
    const h = this.hudCanvas.height;

    // Tactical HUD (health, armor, cash, stars, ammo, objective, radio, districts, speedometer)
    this.hud.render(
      this.player,
      this.missions,
      this.police,
      this.activeCar,
      this.shotPreset,
      this.radio,
      this.districts,
      this.garage
    );

    // Tactical GPS Minimap
    this.minimap.render(
      hudCtx,
      h,
      this.player,
      this.vehicles,
      this.police,
      this.missions,
      this.combat,
      this.garage
    );

    // Pause menu & modal dialogues
    if (this.menuManager.isPaused() && !this.shotPreset) {
      this.menuManager.render(
        hudCtx,
        this.hudCanvas.width,
        h,
        this.missions,
        this.player,
        this.audio,
        this.garage
      );
    }
  }
}

// Initialize on document ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
