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
        // Shot 1: Rook on foot on a busy Downtown pavement, glass skyscrapers rising behind into warm sky, pedestrians and traffic
        player.inVehicle = false;
        player.vehicle = null;
        player.x = 52.5;
        player.z = -34;
        player.heading = 3.14; // Facing down the avenue towards Downtown towers
        player.cash = 6500;
        player.health = 100;
        player.armor = 80;
        player.activeWeaponIndex = 0;
        camera.lockedYaw = true;
        camera.yaw = 3.14; // Looking North directly into the Downtown skyline
        camera.pitch = -0.06; // Looking slightly up to capture the soaring tower crowns
        camera.distance = 4.8;
        camera.snap(player);
        missions.startMission(0);

        // Spawn pedestrians strolling along the Downtown avenue sidewalk in small groups
        pedestrians.pedestrians = [];
        const p1 = { x: 52.8, z: -41, heading: 3.14, speed: 1.6, alive: true, health: 40, animTime: 1.2, outfit: pedestrians.outfits[0] };
        const p2 = { x: 51.6, z: -42, heading: 3.14, speed: 1.6, alive: true, health: 40, animTime: 1.4, outfit: pedestrians.outfits[1] };
        const p3 = { x: 53.2, z: -49, heading: 0.1, speed: 1.5, alive: true, health: 40, animTime: 3.2, outfit: pedestrians.outfits[2] };
        const p4 = { x: 52.0, z: -57, heading: 3.14, speed: 1.7, alive: true, health: 40, animTime: 2.1, outfit: pedestrians.outfits[4] };
        const p5 = { x: 51.4, z: -46.5, heading: 1.57, speed: 0, alive: true, isWaiting: true, health: 40, animTime: 0.5, outfit: pedestrians.outfits[3] }; // At bus shelter
        pedestrians.pedestrians.push(p1, p2, p3, p4, p5);

        // Populate Downtown avenue with traffic (Taxi, sports car, bus)
        traffic.vehicles = [];
        const taxi = VehiclePhysics.createVehicle(63.5, -44, 3.14, 'taxi');
        taxi.color = [0.96, 0.82, 0.12];
        taxi.isTraffic = true;
        taxi.speed = 15;
        traffic.vehicles.push(taxi);

        const sports = VehiclePhysics.createVehicle(56.5, -60, 3.14, 'sports');
        sports.color = [0.85, 0.15, 0.15];
        sports.isTraffic = true;
        sports.speed = 18;
        traffic.vehicles.push(sports);

        const bus = VehiclePhysics.createVehicle(63.5, -78, 3.14, 'bus');
        bus.color = [0.18, 0.52, 0.78];
        bus.isTraffic = true;
        bus.speed = 10;
        traffic.vehicles.push(bus);
      } else if (shot === '2' || shot === 'play' || shot === 'car') {
        // Shot 2: Sports car at speed along the Ocean Promenade with the sea, the sun low over the water, palm trees and boardwalk in frame
        const car = VehiclePhysics.createVehicle(-105, 178, -1.57, 'sports');
        car.color = [0.12, 0.78, 0.62]; // Tropical seafoam turquoise sports car
        car.roofColor = [0.10, 0.12, 0.14];
        car.speed = 36;
        car.pitch = 0.035; // Acceleration squat
        car.roll = -0.03;
        car.isDrifting = true;
        car.driftFactor = 0.8;
        traffic.vehicles = [car];
        player.enterVehicle(car);
        player.cash = 8400;

        camera.lockedYaw = true;
        camera.yaw = -0.92; // Looking west-southwest across car directly into boardwalk, beach, palm trees, ocean, and low sun
        camera.pitch = 0.06;
        camera.distance = 7.2;
        camera.snap(player);

        missions.startMission(1);
      } else if (shot === '3' || shot === 'police' || shot === 'pursuit') {
        // Shot 3: High speed 4-Star Police Pursuit with player car between two cruisers on wide road, lights flashing, wanted stars in HUD
        const car = VehiclePhysics.createVehicle(0, 36, 0, 'muscle');
        car.color = [0.88, 0.15, 0.15]; // Red muscle car
        car.roofColor = [0.12, 0.12, 0.14];
        car.speed = 35;
        car.pitch = 0.025;
        player.enterVehicle(car);
        player.cash = 14500;
        police.setWantedLevel(4);

        // Two police cruisers flanking player car on the wide central avenue
        police.cruisers = [];
        const c1 = VehiclePhysics.createVehicle(-4.4, 37.5, 0, 'police');
        c1.color = [0.12, 0.12, 0.14];
        c1.roofColor = [0.95, 0.95, 0.95];
        c1.isPolice = true;
        c1.isCinematic = true;
        c1.cinematicOffsetX = -4.4;
        c1.cinematicOffsetZ = 1.2;
        c1.sirenPhase = 0;
        c1.speed = 35;
        police.cruisers.push(c1);

        const c2 = VehiclePhysics.createVehicle(4.4, 37.5, 0, 'police');
        c2.color = [0.12, 0.12, 0.14];
        c2.roofColor = [0.95, 0.95, 0.95];
        c2.isPolice = true;
        c2.isCinematic = true;
        c2.cinematicOffsetX = 4.4;
        c2.cinematicOffsetZ = 1.2;
        c2.sirenPhase = 3.14;
        c2.speed = 35;
        police.cruisers.push(c2);

        camera.lockedYaw = true;
        camera.yaw = 0.0; // Looking forward from behind player car between both flanking cruisers
        camera.pitch = 0.07;
        camera.distance = 7.8;
        camera.snap(player);
      } else if (shot === '4' || shot === 'end' || shot === 'dock') {
        // Shot 4: Mission 6 "Showdown at Meridian Docks" with shipping containers, gantry crane, helicopter and water beyond
        player.inVehicle = false;
        player.vehicle = null;
        player.x = 136;
        player.z = 188;
        player.heading = 0.58; // Facing towards container stacks, crane, helicopter, and open bay
        player.cash = 45000;
        player.activeWeaponIndex = 1;
        player.health = 100;
        player.armor = 85;
        police.setWantedLevel(4);
        police.officers = [];
        missions.startMission(5);

        // Syndicate enforcers guarding the container rows
        missions.enemies = [
          { x: 154, y: 0, z: 200, heading: -2.1, alive: true, health: 100, animTime: 0.8 },
          { x: 168, y: 0, z: 195, heading: -2.4, alive: true, health: 100, animTime: 1.5 }
        ];

        // Police helicopter hovering above the dockside with searchlight illuminating the yard
        police.helicopter = {
          x: 154,
          y: 7.2,
          z: 206,
          hoverX: 154,
          hoverY: 7.2,
          hoverZ: 206,
          rotorAngle: 1.5,
          spotlightX: 144,
          spotlightZ: 196,
          spotlightTargetX: 144,
          spotlightTargetZ: 196,
          shootCooldown: 999
        };

        camera.lockedYaw = true;
        camera.yaw = 0.58; // Looking northeast directly towards containers, crane, hovering helicopter, and water
        camera.pitch = -0.04; // Looking slightly up to capture the crane boom and hovering helicopter in the sky
        camera.distance = 5.2;
        camera.snap(player);

        particles.emit('spark', 148, 1.2, 194, 8);
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

    if (this.activeShot === '1') {
      player.x = 52.5;
      player.z = -34;
      player.heading = 3.14;
      camera.yaw = 3.14;
      camera.pitch = -0.06;
      camera.distance = 4.8;
    } else if (this.activeShot === '2' && player.vehicle) {
      player.vehicle.x = -110;
      player.vehicle.z = 178;
      player.vehicle.angle = -1.57;
      player.vehicle.speed = 36;
      player.vehicle.pitch = 0.035;
      player.vehicle.roll = -0.03;
      player.vehicle.isDrifting = true;
      player.x = player.vehicle.x;
      player.z = player.vehicle.z;
      camera.yaw = -0.92;
      camera.pitch = 0.06;
      camera.distance = 7.2;
    } else if (this.activeShot === '3' && player.vehicle) {
      player.vehicle.x = 0;
      player.vehicle.z = 36;
      player.vehicle.angle = 0;
      player.vehicle.speed = 35;
      player.x = player.vehicle.x;
      player.z = player.vehicle.z;
      police.setWantedLevel(4);
      if (police.cruisers.length >= 2) {
        police.cruisers[0].x = -4.4;
        police.cruisers[0].z = 37.5;
        police.cruisers[0].speed = 35;
        police.cruisers[0].angle = 0;
        police.cruisers[1].x = 4.4;
        police.cruisers[1].z = 37.5;
        police.cruisers[1].speed = 35;
        police.cruisers[1].angle = 0;
      }
      camera.yaw = 0.0;
      camera.pitch = 0.07;
      camera.distance = 7.8;
    } else if (this.activeShot === '4') {
      player.x = 136;
      player.z = 188;
      player.heading = 0.58;
      police.setWantedLevel(4);
      police.officers = [];
      if (police.helicopter) {
        police.helicopter.x = 152;
        police.helicopter.y = 7.2;
        police.helicopter.z = 206;
        police.helicopter.spotlightX = 144;
        police.helicopter.spotlightZ = 196;
        police.helicopter.rotorAngle += dt * 38;
      }
      camera.yaw = 0.58;
      camera.pitch = -0.04;
      camera.distance = 5.2;
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
