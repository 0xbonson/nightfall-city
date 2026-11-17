// Main Game Loop, State Machine, and Bootstrap for Nightfall City
// Orchestrates 3D rendering, simulation systems, HUD, audio, and deterministic query hooks.

import { world } from './world.js';
import { player } from './player.js';
import { camera } from './camera.js';
import { WebGLRenderer } from './render.js';
import { traffic } from './traffic.js';
import { pedestrians } from './pedestrians.js';
import { police } from './police.js';
import { missions } from './missions.js';
import { particles, screenEffects } from './effects.js';
import { input } from './input.js';
import { hud } from './hud.js';
import { menu } from './menu.js';
import { audio } from './audio.js';
import { SaveManager } from './save.js';

class GameApp {
  constructor() {
    this.glCanvas = document.getElementById('glcanvas');
    this.hudCanvas = document.getElementById('hudcanvas');
    this.hudCtx = this.hudCanvas.getContext('2d');

    this.renderer = new WebGLRenderer(this.glCanvas);
    this.lastTime = performance.now();
    this.orbitAngle = 0;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Input init
    input.init(this.hudCanvas);

    // Build static 3D world geometry in WebGL
    this.renderer.buildStaticMesh(world);

    // Click handler for UI and canvas pointer lock
    this.hudCanvas.addEventListener('mousedown', (e) => {
      audio.resume();

      if (menu.state !== 'playing') {
        const rect = this.hudCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const action = menu.handleClick(mx, my);
        if (action) this.handleMenuAction(action);
        return;
      }

      // In game click: request pointer lock for mouse look
      input.requestLock();
    });

    // Check query params for deterministic screenshot mode
    this.handleQueryParams();

    // Start Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  handleQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');

    if (shot) {
      menu.state = 'playing';

      if (shot === '1' || shot === 'start' || shot === 'foot') {
        // Shot 1: On-foot in Downtown Vela Bay, high-rises, parked sports car, pedestrians, weapon drawn
        player.x = 28;
        player.z = -55;
        player.heading = 0.4;
        player.cash = 4500;
        player.health = 100;
        player.armor = 80;
        player.activeWeaponIndex = 0;
        camera.yaw = 0.35;
        camera.pitch = 0.18;
        camera.distance = 4.8;
        missions.startMission(0);
        // Spawn pedestrians nearby
        for (let i = 0; i < 6; i++) {
          pedestrians.spawnPedestrian(player.x, player.z);
        }
      } else if (shot === '2' || shot === 'play' || shot === 'car') {
        // Shot 2: Car driving along Ocean Promenade at sunset, beach and palm trees, drift smoke
        const car = traffic.findNearbyVehicle(-40, 25, 20) || traffic.vehicles[0];
        player.enterVehicle(car);
        car.x = -110;
        car.z = 25;
        car.angle = 1.57;
        car.speed = 22;
        car.isDrifting = true;
        player.cash = 7800;
        camera.yaw = 1.57;
        camera.pitch = 0.24;
        camera.distance = 7.0;
        particles.emit('smoke', car.x - 2, 0.2, car.z, 8, { size: 0.6 });
        missions.startMission(1);
      } else if (shot === '3' || shot === 'police' || shot === 'pursuit') {
        // Shot 3: High speed 3-Star Police Pursuit with cruisers, siren lights, roadblock
        const car = traffic.vehicles[0];
        player.enterVehicle(car);
        car.x = 0;
        car.z = -20;
        car.angle = 0;
        car.speed = 26;
        player.cash = 12500;
        police.setWantedLevel(3);
        camera.yaw = 0;
        camera.pitch = 0.22;
        camera.distance = 7.2;
        police.spawnCruiser(0, -65);
        police.spawnCruiser(0, -50);
        police.spawnRoadblock(0, 45, 0);
        particles.emit('smoke', car.x, 0.3, car.z - 2, 6);
      } else if (shot === '4' || shot === 'end' || shot === 'dock') {
        // Shot 4: Mission 6 "Nightfall at the Docks" Showdown! Containers, shootout, helicopter
        player.x = 175;
        player.z = 170;
        player.heading = 0.8;
        player.cash = 32000;
        player.activeWeaponIndex = 1;
        player.health = 75;
        player.armor = 40;
        police.setWantedLevel(4);
        missions.startMission(5);
        camera.yaw = 0.75;
        camera.pitch = 0.25;
        camera.distance = 5.2;
        particles.emit('spark', 180, 1.2, 175, 12);
        particles.emit('smoke', 178, 0.8, 172, 4);
      }
    }
  }

  handleMenuAction(action) {
    if (action === 'start') {
      menu.state = 'playing';
      input.requestLock();
    } else if (action === 'continue') {
      const data = SaveManager.load();
      if (data) {
        player.cash = data.cash;
        player.health = data.health;
        player.armor = data.armor;
        player.x = data.posX;
        player.z = data.posZ;
        missions.startMission(data.missionIndex);
      }
      menu.state = 'playing';
      input.requestLock();
    } else if (action === 'controls') {
      menu.state = 'controls';
    } else if (action === 'back_title' || action === 'quit_title') {
      menu.state = 'title';
      input.unlock();
    } else if (action === 'resume' || action === 'continue_roam') {
      menu.state = 'playing';
      input.requestLock();
    } else if (action === 'save') {
      SaveManager.save({
        cash: player.cash,
        missionIndex: missions.currentMissionIndex,
        health: player.health,
        armor: player.armor,
        x: player.x,
        z: player.z,
      });
      missions.showDialogue('SYSTEM', 'CAREER PROGRESS SAVED', 4.0);
      menu.state = 'playing';
    } else if (action === 'toggle_radio') {
      audio.toggleRadio();
    }
  }

  resize() {
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    this.glCanvas.width = w;
    this.glCanvas.height = h;
    this.hudCanvas.width = w;
    this.hudCanvas.height = h;
    camera.aspect = w / h;
  }

  loop(timestamp) {
    const dt = Math.min(0.066, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const mouse = input.consumeMouse();

    // Check pause key
    if (input.isAction('pause')) {
      if (menu.state === 'playing') {
        menu.state = 'paused';
        input.unlock();
      } else if (menu.state === 'paused') {
        menu.state = 'playing';
        input.requestLock();
      }
    }

    if (menu.state === 'title') {
      // Cinematic orbit camera around the city
      this.orbitAngle += dt * 0.15;
      camera.x = Math.sin(this.orbitAngle) * 90 + 30;
      camera.y = 42;
      camera.z = Math.cos(this.orbitAngle) * 90 - 30;
      camera.targetX = 30;
      camera.targetY = 12;
      camera.targetZ = -30;
      camera.computeMatrices();
      return;
    }

    if (menu.state !== 'playing') return;

    // Crime callback handler
    const onCrime = (type) => {
      police.reportCrime(type);
      pedestrians.alertNearby(player.x, player.z, 30);
    };

    // Jack or Exit vehicle with F / E
    if (input.isAction('interact')) {
      if (!this.interactPressed) {
        this.interactPressed = true;
        if (player.inVehicle) {
          player.exitVehicle();
        } else {
          const nearCar = traffic.findNearbyVehicle(player.x, player.z, 4.0);
          if (nearCar && !nearCar.wrecked) {
            player.enterVehicle(nearCar);
            if (nearCar.isTraffic) {
              onCrime('carjacking');
            }
          }
        }
      }
    } else {
      this.interactPressed = false;
    }

    // Weapons cycling & reload
    if (input.isAction('weapon1')) player.switchWeapon(0);
    if (input.isAction('weapon2')) player.switchWeapon(1);
    if (input.isAction('cycleWeapon')) player.cycleWeapon();
    if (input.isAction('reload')) player.activeWeapon?.reload();

    // Shooting
    if (mouse.left && !player.inVehicle && player.alive) {
      const origin = { x: player.x, z: player.z };
      // Shoot in camera aim direction
      const dir = { x: Math.sin(camera.yaw), z: Math.cos(camera.yaw) };

      // Targets: syndicate enemies, police officers, pedestrians, cars
      const targets = [
        ...missions.enemies,
        ...police.officers,
        ...pedestrians.pedestrians,
        ...traffic.vehicles,
        ...police.cruisers
      ];

      const shotResult = player.activeWeapon?.shoot(origin, dir, targets, true);
      if (shotResult?.hit) {
        onCrime('shot_fired');
      }
    }

    // Update Player & Camera
    inputsObj.cameraYaw = camera.yaw;
    player.update(dt, input);
    camera.update(player, dt, mouse);

    // Update Traffic, Pedestrians, Police, Missions, Particles
    traffic.update(dt, player, onCrime);
    pedestrians.update(dt, player, onCrime);
    police.update(dt, player, pedestrians);
    missions.update(dt, player);
    particles.update(dt);
    screenEffects.update(dt);

    // Check story completion ending screen trigger
    if (missions.storyCompleted && menu.state === 'playing' && missions.currentMissionIndex >= missions.missions.length) {
      menu.state = 'ending';
      input.unlock();
    }
  }

  render() {
    const w = this.hudCanvas.width;
    const h = this.hudCanvas.height;

    // 1. Render 3D WebGL World
    this.renderer.renderScene(
      camera,
      world,
      player,
      traffic,
      pedestrians,
      police,
      missions,
      particles.particles
    );

    // 2. Render 2D Canvas HUD or Menu Overlay
    if (menu.state === 'playing') {
      hud.render(
        this.hudCtx,
        player,
        world,
        police,
        traffic,
        pedestrians,
        missions,
        w,
        h
      );
    } else {
      this.hudCtx.clearRect(0, 0, w, h);
      menu.render(this.hudCtx, w, h);
    }
  }
}

const inputsObj = { cameraYaw: 0 };

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
