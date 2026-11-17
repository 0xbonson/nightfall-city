// Main Game Loop, State Machine, and Bootstrap for Nightfall City (Vela Bay)
// Orchestrates 3D rendering, simulation systems, HUD, audio, and deterministic query hooks.

import { CONFIG } from './config.js';
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
import { VehiclePhysics } from './physics.js';

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
      this.activeShot = shot;
      menu.state = 'playing';

      if (shot === '1' || shot === 'start' || shot === 'foot') {
        // Shot 1: Rook on foot in Downtown Vela Bay, with soaring glass tower skyline behind in warm late-afternoon sun
        player.x = 56.5;
        player.z = -32;
        player.heading = 3.14; // Facing down the avenue towards Downtown towers
        player.cash = 6500;
        player.health = 100;
        player.armor = 80;
        player.activeWeaponIndex = 0;
        camera.lockedYaw = true;
        camera.yaw = 3.14; // Looking North directly into the Downtown skyline
        camera.pitch = -0.04; // Looking slightly up to capture the soaring tower crowns
        camera.distance = 5.4;
        camera.snap(player);
        missions.startMission(0);

        // Spawn pedestrians strolling along the Downtown avenue sidewalk
        pedestrians.pedestrians = [];
        for (let i = 0; i < 5; i++) {
          const ped = pedestrians.spawnPedestrian(53.5, -36 - i * 4);
          if (ped) { ped.heading = 3.14; }
        }
      } else if (shot === '2' || shot === 'play' || shot === 'car') {
        // Shot 2: Sports car driving along Ocean Promenade with ocean, palm trees, and sun in frame
        const car = traffic.findNearbyVehicle(-40, 25, 40) || traffic.vehicles[0];
        player.enterVehicle(car);
        car.x = -220;
        car.z = 40;
        car.angle = 0; // Speeding South along coastal promenade
        car.speed = 36;
        car.isDrifting = false;
        player.cash = 7800;
        camera.lockedYaw = true;
        camera.yaw = -0.68; // Looking southwest directly into the ocean, palms, and late afternoon sun disc
        camera.pitch = 0.08;
        camera.distance = 7.5;
        camera.snap(player);

        missions.startMission(1);
      } else if (shot === '3' || shot === 'police' || shot === 'pursuit') {
        // Shot 3: High speed 3-Star Police Pursuit with cruisers visible on the road and wanted stars in HUD
        const car = traffic.vehicles[0];
        player.enterVehicle(car);
        car.x = 0;
        car.z = 25;
        car.angle = 0;
        car.speed = 32;
        car.isDrifting = false;
        player.cash = 12500;
        police.setWantedLevel(3);

        // Spawn two active police cruisers in direct pursuit visible ahead and alongside on the road
        police.cruisers = [];
        const c1 = VehiclePhysics.createVehicle(3.8, 38, -0.04, 'police');
        c1.color = [0.12, 0.12, 0.14];
        c1.roofColor = [0.95, 0.95, 0.95];
        c1.isPolice = true;
        c1.speed = 30;
        police.cruisers.push(c1);

        const c2 = VehiclePhysics.createVehicle(-3.6, 31, 0.04, 'police');
        c2.color = [0.12, 0.12, 0.14];
        c2.roofColor = [0.95, 0.95, 0.95];
        c2.isPolice = true;
        c2.speed = 32;
        police.cruisers.push(c2);

        camera.lockedYaw = true;
        camera.yaw = 0.04;
        camera.pitch = 0.13;
        camera.distance = 8.0;
        camera.snap(player);
      } else if (shot === '4' || shot === 'end' || shot === 'dock') {
        // Shot 4: Mission 6 "Nightfall at the Docks" Showdown! Containers, gantry crane, and helicopter
        player.x = 145;
        player.z = 186;
        player.heading = 1.2; // Facing towards container stacks, helicopter, and gantry crane
        player.cash = 32000;
        player.activeWeaponIndex = 1;
        player.health = 100;
        player.armor = 80;
        police.setWantedLevel(4);
        police.officers = [];
        missions.startMission(5);

        // Spawn syndicate enforcers defending the shipping container yard
        missions.enemies = [
          { x: 164, y: 0, z: 182, heading: -1.6, alive: true, health: 100 },
          { x: 172, y: 0, z: 190, heading: -1.8, alive: true, health: 100 }
        ];

        // Position tactical police helicopter hovering in open sky next to gantry crane
        police.helicopter = {
          x: 180,
          y: 14,
          z: 205,
          rotorAngle: 1.2,
          spotlightX: 145,
          spotlightZ: 186,
          shootCooldown: 999
        };

        camera.lockedYaw = true;
        camera.yaw = 1.2; // Looking southeast directly towards containers, helicopter, and crane
        camera.pitch = 0.02;
        camera.distance = 5.5;
        camera.snap(player);

        particles.emit('spark', 158, 1.2, 186, 12);
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
      // Cinematic orbit camera around the city skyline
      this.orbitAngle += dt * 0.15;
      camera.x = Math.sin(this.orbitAngle) * 90 + 32;
      camera.y = 42;
      camera.z = Math.cos(this.orbitAngle) * 90 - 32;
      camera.targetX = 32;
      camera.targetY = 14;
      camera.targetZ = -32;
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

    // Maintain stable actor compositions for query-driven screenshot capture
    if (this.activeShot) {
      player.health = 100;
      player.armor = 80;
      player.alive = true;
    }

    if (this.activeShot === '2' && player.vehicle) {
      player.vehicle.speed = 36;
      player.vehicle.x = -220;
    } else if (this.activeShot === '3' && player.vehicle) {
      player.vehicle.speed = 32;
      police.setWantedLevel(3);
      if (police.cruisers.length >= 2) {
        police.cruisers[0].x = player.x + 3.8;
        police.cruisers[0].z = player.z + 13;
        police.cruisers[0].speed = 30;
        police.cruisers[0].angle = -0.04;
        police.cruisers[1].x = player.x - 3.6;
        police.cruisers[1].z = player.z + 6;
        police.cruisers[1].speed = 32;
        police.cruisers[1].angle = 0.04;
      }
    } else if (this.activeShot === '4') {
      police.setWantedLevel(4);
      police.officers = [];
      if (police.helicopter) {
        police.helicopter.x = player.x + 35;
        police.helicopter.y = 14;
        police.helicopter.z = player.z + 19;
        police.helicopter.rotorAngle += dt * 38;
      }
    }

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
      menu.render(this.hudCtx, w, h, player, world, missions);
    }
  }
}

const inputsObj = { cameraYaw: 0 };

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
