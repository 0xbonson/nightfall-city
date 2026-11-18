// WebAudio API synthesis for Nightfall City: Vela Bay
// 100% procedurally generated audio: synthwave radio, vehicle engines, sirens, footsteps,
// doors, horns, tire skids, collision thumps, seagulls, and distant traffic.
// Zero external sound files, 100% offline static synthesis.

import { CONFIG } from './config.js';

export const RADIO_STATION_OFF = 0;
export const RADIO_STATION_VELA_WAVE = 1;
export const RADIO_STATION_NIGHTFALL = 2;

export const DEFAULT_MASTER_GAIN = 0.65;
export const DEFAULT_SFX_GAIN = 0.8;
export const DEFAULT_MUSIC_GAIN = 0.35;

class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.ambientGain = null;
    this.surfGain = null;
    this.radioPlaying = false;
    this.radioInterval = null;
    this.radioStep = 0;
    this.radioStation = RADIO_STATION_VELA_WAVE; // 1: Vela Wave, 2: Nightfall Beats, 0: Off
    this.initialized = false;
    this.lastFootstepTime = 0;
    this.lastHornTime = 0;
    this.lastGullTime = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(DEFAULT_MASTER_GAIN, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(DEFAULT_SFX_GAIN, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(DEFAULT_MUSIC_GAIN, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initEngineSynth();
      this.initSirenSynth();
      this.initCityAmbience();
      this.startRadio();
      this.initialized = true;
    } catch {
      // Audio context may require user interaction
    }
  }

  resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initEngineSynth() {
    if (!this.ctx) return;
    // Primary engine rumble (sawtooth for aggressive engine growl)
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(32, this.ctx.currentTime);

    // Secondary sub-octave rumble for low-end chassis weight
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.setValueAtTime(16, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.2, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc.start();
    this.engineSubOsc.start();
  }

  updateEngine(inCar, speedRatio, isAccelerating) {
    if (!this.engineGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (!inCar) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      return;
    }
    const ratio = Math.abs(speedRatio);
    // Virtual 4-gear transmission RPM cycle: revs rise and drop across power bands
    const gearProgress = (ratio * 3.8) % 1.0;
    const gearBase = 32 + Math.floor(ratio * 3.8) * 14;
    const baseFreq = gearBase + gearProgress * 95 + (isAccelerating ? 26 : 0);
    const filterFreq = 160 + ratio * 640 + (isAccelerating ? 280 : 0);
    const targetVol = 0.20 + ratio * 0.16 + (isAccelerating ? 0.08 : 0);

    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.08);
  }

  initSirenSynth() {
    if (!this.ctx) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';
    this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.frequency.setValueAtTime(1.8, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);
    this.sirenLfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);

    const sirenFilter = this.ctx.createBiquadFilter();
    sirenFilter.type = 'lowpass';
    sirenFilter.frequency.setValueAtTime(1500, this.ctx.currentTime);

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc.connect(sirenFilter);
    sirenFilter.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);

    this.sirenOsc.start();
    this.sirenLfo.start();
  }

  updateSiren(wantedLevel, nearestCopDist = 999) {
    if (!this.sirenGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (wantedLevel > 0 && nearestCopDist < 120) {
      const vol = Math.max(0.04, Math.min(0.28, (1 - nearestCopDist / 120) * 0.3));
      this.sirenGain.gain.setTargetAtTime(vol, now, 0.15);
      this.sirenLfo.frequency.setTargetAtTime(wantedLevel >= 3 ? 3.2 : 1.8, now, 0.2);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.2);
    }
  }

  initCityAmbience() {
    if (!this.ctx) return;
    // Ambient distant city traffic rumble
    const bufSize = this.ctx.sampleRate * 2;
    const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + (0.02 * white)) / 1.02; // Brown noise approximation
      last = data[i];
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

    noiseSrc.connect(rumbleFilter);
    rumbleFilter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);
    noiseSrc.start();

    // Ocean surf filter for coastal promenade
    const surfFilter = this.ctx.createBiquadFilter();
    surfFilter.type = 'bandpass';
    surfFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    surfFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.surfGain = this.ctx.createGain();
    this.surfGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    noiseSrc.connect(surfFilter);
    surfFilter.connect(this.surfGain);
    this.surfGain.connect(this.masterGain);
  }

  updateAmbience(posX, posZ) {
    if (!this.surfGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    // When near coastal promenade or ocean (X < -60 or Z > 140), bring up ocean surf
    const distToCoast = Math.min(Math.abs(posX - (-220)), Math.abs(posZ - 200));
    const surfFactor = Math.max(0, Math.min(1.0, 1.0 - distToCoast / 160));
    this.surfGain.gain.setTargetAtTime(0.02 + surfFactor * 0.08, now, 0.5);

    // Occasional seagull call when near coast
    if (surfFactor > 0.4 && now - this.lastGullTime > 6.0) {
      if (Math.random() < 0.25) {
        this.playSeagull();
        this.lastGullTime = now;
      }
    }
  }

  // Articulated footstep audio calibrated to specific surface materials
  playFootstep(surface = 'sidewalk', isSprinting = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastFootstepTime < (isSprinting ? 0.22 : 0.38)) return;
    this.lastFootstepTime = now;

    const osc = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    if (surface === 'boardwalk') {
      // Hollow resonant timber knock
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isSprinting ? 140 : 110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      f.type = 'bandpass';
      f.frequency.setValueAtTime(420, now);
      f.Q.setValueAtTime(1.8, now);
      g.gain.setValueAtTime(isSprinting ? 0.22 : 0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (surface === 'sand') {
      // Soft granular crunch
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.09);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(180, now);
      g.gain.setValueAtTime(isSprinting ? 0.14 : 0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (surface === 'grass') {
      // Soft organic turf scuff
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.07);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(220, now);
      g.gain.setValueAtTime(0.10, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (surface === 'asphalt') {
      // Solid rubber sole impact on aggregate
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isSprinting ? 100 : 82, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.06);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(240, now);
      g.gain.setValueAtTime(isSprinting ? 0.20 : 0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      // Architectural stone paver / sidewalk tap
      osc.type = 'sine';
      const baseFreq = isSprinting ? 115 : 95;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.06);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(320, now);
      g.gain.setValueAtTime(isSprinting ? 0.22 : 0.15, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  // Weighty landing thud after jumping or stepping off curbs
  playLanding(surface = 'sidewalk') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 0.12);

    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(200, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // High-pressure fire hydrant fountain geyser sound
  playHydrantBurst() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.05, now + 0.5);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Heavy steel dumpster knockdown impact clang
  playDumpsterCrash() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  // Car door mechanical latch thud when jacking or exiting vehicles
  playCarDoor() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Heavy metal click
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);

    // Deep chassis thud
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, now + 0.04);
    sub.frequency.exponentialRampToValueAtTime(35, now + 0.20);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.4, now + 0.04);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    sub.connect(sg);
    sg.connect(this.sfxGain);
    sub.start(now + 0.04);
    sub.stop(now + 0.22);
  }

  // Dual-tone automobile horn
  playHorn() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHornTime < 0.4) return;
    this.lastHornTime = now;

    [415.3, 520.0].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(freq, now);
      f.Q.setValueAtTime(4.0, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.18, now);
      g.gain.linearRampToValueAtTime(0.18, now + 0.28);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  // Seagull calling along coastal promenade and docks
  playSeagull() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.linearRampToValueAtTime(2200, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.12, now + 0.10);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  playGunshot(isRifle = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * (isRifle ? 0.09 : 0.14));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isRifle ? 1800 : 1200, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isRifle ? 0.45 : 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isRifle ? 0.09 : 0.14));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);

    // Punch transient sub
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(isRifle ? 180 : 140, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.08);
  }

  playReload() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1400, now + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playCrash(speed = 10) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const duration = 0.32;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const out = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) {
      out[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buf.length * 0.22));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(260 + Math.min(speed * 45, 950), now);

    const g = this.ctx.createGain();
    const vol = Math.min(0.70, 0.25 + speed * 0.035);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(now);

    // Heavy bass thump for vehicle collision impact
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, now);
    sub.frequency.exponentialRampToValueAtTime(25, now + 0.18);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(Math.min(0.65, 0.2 + speed * 0.03), now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.20);
  }

  playTireScreech() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.15), this.ctx.sampleRate);
    const out = buf.getChannelData(0);
    for (let i = 0; i < buf.length; i++) {
      out[i] = (Math.random() * 2 - 1) * (0.5 + Math.sin(i * 0.05) * 0.5);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(2200, now);
    filt.Q.setValueAtTime(3.5, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
  }

  playCash() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.18);
    });
  }

  playMissionFanfare() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(1800, now + i * 0.1);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.25, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
      osc.connect(filt);
      filt.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.35);
    });
  }

  // Generative Synthwave Radio
  startRadio() {
    if (!this.ctx || this.radioInterval) return;
    const bassline = [110, 110, 130.81, 146.83, 164.81, 146.83, 130.81, 98];
    const arpeggio = [220, 261.63, 329.63, 392.0, 440, 523.25, 659.25, 523.25];

    this.radioInterval = setInterval(() => {
      if (!this.ctx || this.radioStation === 0 || this.ctx.state === 'suspended') return;
      const now = this.ctx.currentTime;
      const step = this.radioStep % 8;

      // Bass synth note
      if (step % 2 === 0) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassline[step] * (this.radioStation === 1 ? 0.5 : 0.75), now);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(380, now);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.16, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(f);
        f.connect(g);
        g.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.22);
      }

      // Arp melody note
      const arpOsc = this.ctx.createOscillator();
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpeggio[(step + (this.radioStation === 2 ? 2 : 0)) % 8], now);
      const arpg = this.ctx.createGain();
      arpg.gain.setValueAtTime(0.08, now);
      arpg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      arpOsc.connect(arpg);
      arpg.connect(this.musicGain);
      arpOsc.start(now);
      arpOsc.stop(now + 0.12);

      // Drum kick / snare on beat
      if (step === 0 || step === 4) {
        const kick = this.ctx.createOscillator();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(120, now);
        kick.frequency.exponentialRampToValueAtTime(35, now + 0.08);
        const kg = this.ctx.createGain();
        kg.gain.setValueAtTime(0.24, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        kick.connect(kg);
        kg.connect(this.musicGain);
        kick.start(now);
        kick.stop(now + 0.09);
      } else if (step === 2 || step === 6) {
        // Snare
        const snBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.06), this.ctx.sampleRate);
        const snData = snBuf.getChannelData(0);
        for (let i = 0; i < snBuf.length; i++) snData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 800);
        const snSrc = this.ctx.createBufferSource();
        snSrc.buffer = snBuf;
        const sng = this.ctx.createGain();
        sng.gain.setValueAtTime(0.14, now);
        snSrc.connect(sng);
        sng.connect(this.musicGain);
        snSrc.start(now);
      }

      this.radioStep++;
    }, 140);
  }

  toggleRadio() {
    this.radioStation = (this.radioStation + 1) % 3;
    return this.radioStation === 1 ? 'VELA WAVE 80.4' : this.radioStation === 2 ? 'NIGHTFALL BEATS' : 'RADIO OFF';
  }
}

export const audio = new SoundManager();
