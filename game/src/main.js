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
        // Shot 1: Rook on foot on a rich Downtown stone pavement, tall towers rising into warm sky, pedestrians and traffic
        player.inVehicle = false;
        player.vehicle = null;
        player.x = 68.2;
        player.z = -80;
        player.heading = 3.14; // Facing down the avenue towards Downtown towers
        player.speed = 2.5; // Walking stride
        player.animTime = 0.95;
        player.cash = 6500;
        player.health = 100;
        player.armor = 80;
        player.activeWeaponIndex = 0;
        camera.lockedYaw = true;
        camera.lockedPitch = -0.15;
        camera.lockedDistance = 3.8;
        camera.yaw = 3.12; // Looking North along avenue into Downtown skyline with towers on both sides
        camera.pitch = -0.15; // Looking up to capture soaring skyscraper crowns
        camera.distance = 3.8;
        camera.snap(player);
        missions.startMission(0);
        missions.dialogue = null;
        missions.dialogueTimer = 0;

        // Pedestrians strolling along the Downtown avenue sidewalk ahead of player
        pedestrians.pedestrians = [];
        pedestrians.locked = true;
        pedestrians.foodCartsInitialized = true;
        const p1 = { x: 71.4, z: -90, heading: 3.14, speed: 1.6, alive: true, health: 40, animTime: 1.2, outfit: pedestrians.outfits[0] };
        const p2 = { x: 72.8, z: -93, heading: 3.14, speed: 1.5, alive: true, health: 40, animTime: 1.4, outfit: pedestrians.outfits[1] };
        const p3 = { x: 71.0, z: -106, heading: 0.1, speed: 1.4, alive: true, health: 40, animTime: 3.2, outfit: pedestrians.outfits[2] };
        const p4 = { x: 68.5, z: -118, heading: 3.14, speed: 1.7, alive: true, health: 40, animTime: 2.1, outfit: pedestrians.outfits[4] };
        pedestrians.pedestrians.push(p1, p2, p3, p4);

        // Populate Downtown avenue with traffic (Sports car, taxi, bus)
        traffic.vehicles = [];
        const sports = VehiclePhysics.createVehicle(56.5, -90, 3.14, 'sports');
        sports.color = [0.88, 0.16, 0.16];
        sports.isTraffic = true;
        sports.speed = 18;
        traffic.vehicles.push(sports);

        const taxi = VehiclePhysics.createVehicle(63.5, -100, 3.14, 'taxi');
        taxi.color = [0.96, 0.82, 0.12];
        taxi.isTraffic = true;
        taxi.speed = 15;
        traffic.vehicles.push(taxi);

        const bus = VehiclePhysics.createVehicle(63.5, -128, 3.14, 'bus');
        bus.color = [0.18, 0.52, 0.78];
        bus.isTraffic = true;
        bus.speed = 10;
        traffic.vehicles.push(bus);
      } else if (shot === '2' || shot === 'play' || shot === 'car') {
        // Shot 2: Sports car at speed along the Ocean Promenade with the sea, low sun over the water, palm trees, boardwalk & marina
        const car = VehiclePhysics.createVehicle(-96, 178, -1.88, 'sports');
        car.color = [0.10, 0.85, 0.70]; // Tropical seafoam turquoise sports car
        car.roofColor = [0.10, 0.12, 0.14];
        car.speed = 42;
        car.pitch = 0.045; // Hard acceleration squat
        car.roll = -0.08; // High speed dynamic drift roll
        car.isDrifting = true;
        car.driftFactor = 1.0;
        traffic.vehicles = [car];
        player.enterVehicle(car);
        player.cash = 8400;

        camera.lockedYaw = true;
        camera.lockedPitch = 0.08;
        camera.lockedDistance = 5.6;
        camera.yaw = -2.32; // Angled South-West directly across sports car towards the boardwalk, marina, sea, and low sun
        camera.pitch = 0.08;
        camera.distance = 5.6;
        camera.snap(player);

        missions.startMission(0);
        missions.dialogue = null;
        missions.dialogueTimer = 0;
      } else if (shot === '3' || shot === 'police' || shot === 'pursuit') {
        // Shot 3: High speed 5-Star Police Pursuit with player car between two cruisers on wide road, lights flashing, wanted stars in HUD
        const car = VehiclePhysics.createVehicle(0, 48, 0, 'muscle');
        car.color = [0.90, 0.15, 0.15]; // Red muscle car
        car.roofColor = [0.12, 0.12, 0.14];
        car.speed = 38;
        car.pitch = 0.02;
        player.enterVehicle(car);
        player.cash = 18500;
        police.setWantedLevel(5);

        // Two police cruisers flanking player car tightly on the wide central avenue approaching the overpass
        police.cruisers = [];
        const c1 = VehiclePhysics.createVehicle(-3.4, 50.2, 0.06, 'police');
        c1.color = [0.12, 0.12, 0.14];
        c1.roofColor = [0.95, 0.95, 0.95];
        c1.isPolice = true;
        c1.isCinematic = true;
        c1.cinematicOffsetX = -3.4;
        c1.cinematicOffsetZ = 2.2;
        c1.sirenPhase = 0;
        c1.speed = 38;
        police.cruisers.push(c1);

        const c2 = VehiclePhysics.createVehicle(3.4, 49.8, -0.06, 'police');
        c2.color = [0.12, 0.12, 0.14];
        c2.roofColor = [0.95, 0.95, 0.95];
        c2.isPolice = true;
        c2.isCinematic = true;
        c2.cinematicOffsetX = 3.4;
        c2.cinematicOffsetZ = 1.8;
        c2.sirenPhase = 3.14;
        c2.speed = 38;
        police.cruisers.push(c2);

        camera.lockedYaw = true;
        camera.lockedPitch = 0.06;
        camera.lockedDistance = 6.2;
        camera.yaw = 0.0; // Looking forward from behind player car between both flanking cruisers towards overpass
        camera.pitch = 0.06;
        camera.distance = 6.2;
        camera.snap(player);

        missions.dialogue = null;
        missions.dialogueTimer = 0;
      } else if (shot === 'title' || shot === 'menu') {
        // Shot 5: Title screen over the skyline orbit camera (start screen)
        menu.state = 'title';
      } else if (shot === 'controls') {
        // Shot 6: Controls & shortcuts screen (the rules of play)
        menu.state = 'controls';
      } else if (shot === 'win' || shot === 'score') {
        // Shot 7: Victory / results screen with the final score and a restart button
        player.cash = 128450;
        player.health = 100;
        player.armor = 85;
        world.collectedMixtapes = new Set(world.mixtapes.map((m) => m.id));
        missions.courierRun.completedRuns = 14;
        missions.taxiShift.completedFares = 22;
        missions.currentMissionIndex = missions.missions.length;
        missions.storyCompleted = true;
        missions.activeMission = null;
        menu.state = 'ending';
      } else if (shot === '4' || shot === 'end' || shot === 'dock') {
        // Shot 4: Mission 6 "Showdown at Meridian Docks" with shipping containers, gantry crane, helicopter and water beyond
        player.inVehicle = false;
        player.vehicle = null;
        player.x = 142;
        player.z = 191;
        player.heading = 0.58; // Facing towards container stacks, crane, helicopter, and open bay
        player.speed = 2.4;
        player.animTime = 1.0;
        player.cash = 45000;
        player.activeWeaponIndex = 1;
        player.hasWeapon = true;
        player.health = 100;
        player.armor = 85;
        police.setWantedLevel(4);
        police.officers = [];
        missions.startMission(5);
        missions.dialogue = null;
        missions.dialogueTimer = 0;

        // Syndicate enforcers guarding the container rows
        missions.enemies = [
          { x: 154, y: 0, z: 205, heading: -2.1, alive: true, health: 100, animTime: 0.8 },
          { x: 146, y: 0, z: 209, heading: -2.4, alive: true, health: 100, animTime: 1.5 }
        ];

        // Police helicopter hovering above the dockside with searchlight illuminating the yard
        police.helicopter = {
          x: 153,
          y: 9.2,
          z: 212,
          hoverX: 153,
          hoverY: 9.2,
          hoverZ: 212,
          rotorAngle: 1.5,
          spotlightX: 147,
          spotlightZ: 205,
          spotlightTargetX: 147,
          spotlightTargetZ: 205,
          shootCooldown: 999
        };

        camera.lockedYaw = true;
        camera.lockedPitch = -0.07;
        camera.lockedDistance = 3.8;
        camera.yaw = 0.56;
        camera.pitch = -0.07;
        camera.distance = 3.8;
        camera.snap(player);

        particles.emit('spark', 150, 1.2, 196, 8);
        camera.snap(player);

        particles.emit('spark', 150, 1.2, 196, 8);
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
        if (data.collectedCaches) {
          world.collectedCaches = new Set(data.collectedCaches);
        }
        if (missions.courierRun && data.courierRuns) {
          missions.courierRun.completedRuns = data.courierRuns;
        }
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
    } else if (action === 'toggle_courier') {
      if (missions.courierRun && missions.courierRun.active) {
        missions.cancelCourierRun();
      } else {
        missions.startCourierRun(player);
      }
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
        collectedCaches: world.collectedCaches,
        courierRuns: missions.courierRun ? missions.courierRun.completedRuns : 0,
      });
      missions.showDialogue('SYSTEM', 'CAREER PROGRESS SAVED', 4.0);
      menu.state = 'playing';
    } else if (action === 'toggle_radio') {
      audio.toggleRadio();
    } else if (action === 'restart_campaign') {
      this.restartCampaign();
    }
  }

  // Restart a finished campaign from mission one with a clean score.
  restartCampaign() {
    player.cash = 1000;
    player.health = player.maxHealth;
    player.armor = 50;
    player.x = 0;
    player.z = 25;
    player.inVehicle = false;
    player.vehicle = null;
    player.isWasted = false;
    player.wastedTimer = 0;
    world.collectedCaches = new Set();
    world.collectedMixtapes = new Set();
    police.setWantedLevel(0);
    missions.resetCampaign();
    menu.state = 'playing';
    input.requestLock();
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

    // Express Courier activity toggle with KeyT
    if (input.isAction('activity')) {
      if (!this.activityPressed) {
        this.activityPressed = true;
        if (missions.courierRun && missions.courierRun.active) {
          missions.cancelCourierRun();
        } else {
          missions.startCourierRun(player);
        }
      }
    } else {
      this.activityPressed = false;
    }

    // Taxi Shift side activity toggle with KeyK
    if (input.isAction('taxi')) {
      if (!this.taxiPressed) {
        this.taxiPressed = true;
        missions.toggleTaxiShift(player);
      }
    } else {
      this.taxiPressed = false;
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
    input.cameraYaw = camera.yaw;
    player.update(dt, input);
    camera.update(player, dt, mouse);

    // Update Traffic, Pedestrians, Police, Missions, Particles, and Audio Ambience
    traffic.update(dt, player, onCrime);
    pedestrians.update(dt, player, onCrime);
    police.update(dt, player, pedestrians);
    missions.update(dt, player);
    particles.update(dt);
    screenEffects.update(dt);
    audio.updateAmbience(player.x, player.z, dt);

    // Update living city systems (hydrant geysers, dumpsters, pigeons)
    if (world.updateLivingSystems) {
      world.updateLivingSystems(dt, { particles });
    }

    // Periodic steam from street food carts
    if (world.streetFoodCarts && Math.random() < dt * 5.0) {
      const cart = world.streetFoodCarts[Math.floor(Math.random() * world.streetFoodCarts.length)];
      if (Math.hypot(player.x - cart.x, player.z - cart.z) < 65) {
        particles.emit('steam', cart.x, cart.y + 1.25, cart.z, 1, { size: 0.35, up: 1.2 });
      }
    }

    // Maintain stable actor compositions for query-driven screenshot capture
    if (this.activeShot) {
      player.health = 100;
      player.armor = 80;
      player.alive = true;
    }

    if (this.activeShot === '1') {
      player.x = 68.2;
      player.z = -80;
      player.heading = 3.14;
      player.speed = 2.5;
      player.animTime = 0.95;
      camera.yaw = 3.12;
      camera.pitch = -0.15;
      camera.distance = 3.8;
    } else if (this.activeShot === '2' && player.vehicle) {
      player.vehicle.x = -96;
      player.vehicle.z = 178;
      player.vehicle.angle = -1.88;
      player.vehicle.speed = 42;
      player.vehicle.pitch = 0.045;
      player.vehicle.roll = -0.08;
      player.vehicle.isDrifting = true;
      player.x = player.vehicle.x;
      player.z = player.vehicle.z;
      camera.yaw = -2.32;
      camera.pitch = 0.08;
      camera.distance = 5.6;

      // Road skid marks from rear tires under drift
      particles.addSkidMark(player.vehicle.x + 1.2, player.vehicle.z - 0.7, player.vehicle.angle, 0.35, 0.65);
      particles.addSkidMark(player.vehicle.x + 1.2, player.vehicle.z + 0.7, player.vehicle.angle, 0.35, 0.65);
    } else if (this.activeShot === '3' && player.vehicle) {
      player.vehicle.x = 0;
      player.vehicle.z = 48;
      player.vehicle.angle = 0;
      player.vehicle.speed = 38;
      player.x = player.vehicle.x;
      player.z = player.vehicle.z;
      police.setWantedLevel(5);
      if (police.cruisers.length >= 2) {
        police.cruisers[0].x = -3.4;
        police.cruisers[0].z = 50.2;
        police.cruisers[0].speed = 38;
        police.cruisers[0].angle = 0.06;
        police.cruisers[1].x = 3.4;
        police.cruisers[1].z = 49.8;
        police.cruisers[1].speed = 38;
        police.cruisers[1].angle = -0.06;
      }
      camera.yaw = 0.0;
      camera.pitch = 0.06;
      camera.distance = 6.2;

      // Tire smoke & skid marks under hard high-speed chase
      particles.addSkidMark(-3.4, 48.5, 0.06, 0.35, 0.55);
      particles.addSkidMark(3.4, 48.2, -0.06, 0.35, 0.55);
      particles.addSkidMark(0, 46.5, 0, 0.35, 0.55);
      particles.emit('smoke', -3.4, 0.3, 47.8, 1, { size: 0.35, up: 0.2 });
      particles.emit('smoke', 3.4, 0.3, 47.5, 1, { size: 0.35, up: 0.2 });
      particles.emit('smoke', 0, 0.3, 45.8, 1, { size: 0.35, up: 0.2 });
    } else if (this.activeShot === '4') {
      player.x = 142;
      player.z = 191;
      player.heading = 0.56;
      player.speed = 2.4;
      player.animTime = 1.0;
      police.setWantedLevel(4);
      police.officers = [];
      if (police.helicopter) {
        police.helicopter.x = 153;
        police.helicopter.y = 9.2;
        police.helicopter.z = 212;
        police.helicopter.spotlightX = 147;
        police.helicopter.spotlightZ = 205;
        police.helicopter.rotorAngle += dt * 38;
      }
      camera.yaw = 0.56;
      camera.pitch = -0.07;
      camera.distance = 3.8;
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
