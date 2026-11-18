/**
 * Nightfall City: Vela Bay - Procedural WebAudio Synthesizer
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineNode = null;
    this.engineGain = null;
    this.sirenNode = null;
    this.sirenGain = null;
    this.musicGain = null;

    this.isMuted = false;
    this.musicTimer = null;
    this.currentStep = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.setupEngineSynth();
    this.setupSirenSynth();
    this.setupMusicSynth();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    // Dual oscillator with low-pass filter for vehicle rumble
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

    // Map RPM (1000 to 7500) to pitch and volume
    const targetFreq = 38 + (rpm / 7500) * 110;
    const targetFilter = 180 + (rpm / 7500) * 550;

    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.04);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, this.ctx.currentTime, 0.04);
    this.engineGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.05);
  }

  setupSirenSynth() {
    if (!this.ctx) return;
    // Modulated siren oscillator
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

    // Dual-tone wail
    const time = this.ctx.currentTime;
    const sweep = Math.sin(time * 3.5);
    const freq = 750 + (sweep * 0.5 + 0.5) * 450;
    this.sirenOsc.frequency.setValueAtTime(freq, time);
    this.sirenGain.gain.setTargetAtTime(0.12, time, 0.08);
  }

  playFootstep() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Filtered noise tap for walking
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  playGunshot(weaponType = 'pistol') {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Transient noise snap
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(weaponType === 'rifle' ? 1200 : 850, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);

    // 2. Low-frequency punch kick
    const punch = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punch.frequency.setValueAtTime(140, now);
    punch.frequency.exponentialRampToValueAtTime(35, now + 0.09);

    punchGain.gain.setValueAtTime(0.4, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    punch.connect(punchGain);
    punchGain.connect(this.masterGain);

    punch.start(now);
    punch.stop(now + 0.1);
  }

  playExplosion() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Long rumble noise
    const bufferSize = this.ctx.sampleRate * 0.75;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.75);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  setupMusicSynth() {
    if (!this.ctx) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    // Procedural 80s Synthwave loop
    const chords = [
      [110, 164.81, 220], // A minor
      [87.31, 130.81, 174.61], // F major
      [130.81, 196.00, 261.63], // C major
      [98.00, 146.83, 196.00], // G major
    ];

    let chordIdx = 0;
    let step = 0;

    setInterval(() => {
      if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;

      // Synth bass note on every beat
      if (step % 2 === 0) {
        const chord = chords[chordIdx];
        const bassFreq = chord[0] * 0.5;

        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);

        g.gain.setValueAtTime(0.12, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(g);
        g.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 0.2);
      }

      // Snare drum on step 4 and 12
      if (step % 8 === 4) {
        const snareOsc = this.ctx.createOscillator();
        const snareG = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(160, now);
        snareOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

        snareG.gain.setValueAtTime(0.15, now);
        snareG.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        snareOsc.connect(snareG);
        snareG.connect(this.musicGain);

        snareOsc.start(now);
        snareOsc.stop(now + 0.09);
      }

      step = (step + 1) % 16;
      if (step === 0) chordIdx = (chordIdx + 1) % chords.length;
    }, 140); // ~107 BPM
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
