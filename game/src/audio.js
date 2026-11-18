/**
 * Nightfall City: Vela Bay - Procedural WebAudio Synthesizer Engine
 * Authored by makefun agent for the open-world crime game entry.
 *
 * 100% code-synthesized sound effects and multi-station generative audio:
 * - Vehicle V8 / Turbo-4 engine rev synthesis with RPM-tracked pitch & lowpass cutoff
 * - Authentic dual-tone frequency-modulated police siren (650Hz to 1050Hz)
 * - Bandpass filtered tire screech during high-speed drifts and burnout slides
 * - Weapon acoustics: Viper .45 pistol, Stiletto SMG, Bravado 12G shotgun, and Vane Carbine
 * - Impact transients, explosion rumbles, car horns, footsteps, cash chimes, reload latches, and mission fanfare
 * - Multi-station generative radio: 80s Synthwave, Coastal Lounge, and Police Scanner
 * Zero external audio files, samples, or MP3 downloads required.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;

    // Vehicle engine synthesis nodes
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;

    // Police siren synthesis nodes
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;

    // Tire drift screech nodes
    this.screechGain = null;
    this.screechFilter = null;

    // Generative radio nodes
    this.radioGain = null;
    this.radioTimer = null;
    this.radioStep = 0;
    this.currentStationId = 'vela_wave';

    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.72, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.setupEngineSynth();
    this.setupSirenSynth();
    this.setupTireScreechSynth();
    this.setupRadioSynth();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.72, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
  }

  updateEngine(rpm = 1000, inCar = false) {
    if (!this.ctx || !this.engineGain) return;
    if (!inCar) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      return;
    }

    // Map RPM (1000 to 7500) to pitch and filter cutoff
    const targetFreq = 38 + (rpm / 7500) * 115;
    const targetFilter = 180 + (rpm / 7500) * 580;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.04);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, this.ctx.currentTime, 0.04);
    this.engineGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05);
  }

  setupSirenSynth() {
    if (!this.ctx) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.setValueAtTime(800, this.ctx.currentTime);

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);

    this.sirenOsc.start();
  }

  updateSiren(hasActivePolicePursuit) {
    if (!this.ctx || !this.sirenGain) return;
    if (!hasActivePolicePursuit) {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }

    // Modulate pitch between 650Hz and 1050Hz (classic dual-tone cop siren)
    const t = this.ctx.currentTime;
    const pitch = 850 + Math.sin(t * 3.5) * 250;
    this.sirenOsc.frequency.setValueAtTime(pitch, t);
    this.sirenGain.gain.setTargetAtTime(0.24, t, 0.08);
  }

  setupTireScreechSynth() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(3.2, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    whiteNoise.start();
  }

  updateDrift(isDrifting) {
    if (!this.ctx || !this.screechGain) return;
    this.screechGain.gain.setTargetAtTime(isDrifting ? 0.25 : 0, this.ctx.currentTime, 0.05);
  }

  playGunshot(weaponType = 'pistol') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (weaponType === 'carbine' || weaponType === 'rifle') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

      gain.gain.setValueAtTime(0.42, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    } else if (weaponType === 'shotgun') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.22);

      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    } else if (weaponType === 'smg') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);

      gain.gain.setValueAtTime(0.36, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playReload() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  playCashChime() {
    if (!this.ctx) return;
    const notes = [1046.5, 1318.5]; // C6, E6
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.30);
    });
  }

  playExplosion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.7);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.8);
  }

  playFootstep() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  playHorn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(330, t);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(440, t);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.36);
    osc2.stop(t + 0.36);
  }

  playStationClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  playMissionPassed() {
    if (!this.ctx) return;
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  setupRadioSynth() {
    if (!this.ctx) return;
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    this.radioGain.connect(this.masterGain);

    // Station progressions
    const synthBassline = [110, 110, 130.81, 110, 87.31, 87.31, 104.65, 87.31, 130.81, 130.81, 164.81, 130.81, 98.0, 98.0, 123.47, 98.0];
    const coastalChords = [146.83, 174.61, 220.0, 174.61, 130.81, 164.81, 196.0, 164.81, 116.54, 146.83, 174.61, 146.83, 98.0, 123.47, 146.83, 123.47];

    const playRadioStep = () => {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;

      if (this.currentStationId === 'radio_off') return;

      if (this.currentStationId === 'police_scanner') {
        // Occasional dispatch chatter tone beep
        if (Math.random() < 0.25) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880 + Math.random() * 220, t);
          gain.gain.setValueAtTime(0.06, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(gain);
          gain.connect(this.radioGain);
          osc.start(t);
          osc.stop(t + 0.09);
        }
        return;
      }

      const seq = this.currentStationId === 'sol_coastal' ? coastalChords : synthBassline;
      const freq = seq[this.radioStep % seq.length];
      this.radioStep++;

      const osc = this.ctx.createOscillator();
      const flt = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = this.currentStationId === 'sol_coastal' ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.5, t);

      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(this.currentStationId === 'sol_coastal' ? 240 : 340, t);
      flt.frequency.exponentialRampToValueAtTime(140, t + 0.22);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(flt);
      flt.connect(gain);
      gain.connect(this.radioGain);

      osc.start(t);
      osc.stop(t + 0.25);
    };

    this.radioTimer = setInterval(playRadioStep, 240);
  }

  setRadioStation(stationId) {
    this.currentStationId = stationId;
  }
}
