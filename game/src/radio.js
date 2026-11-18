/**
 * Nightfall City: Vela Bay - In-Vehicle Procedural Radio Station Network
 * Authored by makefun agent for the open-world crime game entry.
 * Sun-Soaked Vela Bay Edition - Generative radio stations.
 *
 * Implements:
 * - 3 procedural broadcast frequencies + Radio OFF:
 *   1. Vela Wave 98.7 (driving 80s outrun synthwave chords & punchy bass)
 *   2. Sol Coastal FM (sun-soaked Mediterranean downtempo lounge & jazz chords)
 *   3. Metro Dispatch 104.2 (tactical police scanner squelches, priority beeps & dispatch telemetry)
 *   4. Radio OFF (city ambience & engine roar)
 * - In-vehicle station switching with [R] or [ [ ] / [ ] ]
 * - Dynamic HUD radio banner notifications
 */

export const RADIO_STATIONS = [
  {
    id: 'vela_wave',
    name: 'Vela Wave 98.7',
    genre: 'Outrun Synthwave & Sunset Electro',
    color: '#00e5ff',
    bpm: 124,
    notes: [110.0, 110.0, 130.81, 110.0, 87.31, 87.31, 104.65, 87.31, 130.81, 130.81, 164.81, 130.81, 98.0, 98.0, 123.47, 98.0],
  },
  {
    id: 'sol_coastal',
    name: 'Sol Coastal FM',
    genre: 'Mediterranean Downtempo & Balearic Chill',
    color: '#ffaa00',
    bpm: 96,
    notes: [146.83, 174.61, 220.0, 174.61, 130.81, 164.81, 196.0, 164.81, 116.54, 146.83, 174.61, 146.83, 98.0, 123.47, 146.83, 123.47],
  },
  {
    id: 'police_scanner',
    name: 'Metro Dispatch 104.2',
    genre: 'Tactical Police Scanner & Dispatch Chatter',
    color: '#ff3344',
    bpm: 180,
    isScanner: true,
  },
  {
    id: 'radio_off',
    name: 'Radio OFF',
    genre: 'City Ambience & Pure V8 Exhaust',
    color: '#94a3b8',
    isOff: true,
  },
];

export class RadioSystem {
  constructor(audioEngine) {
    this.audio = audioEngine;
    this.currentStationIdx = 0; // Starts on Vela Wave 98.7
    this.bannerTimer = 0;
    this.bannerDuration = 3.2;
    this.bannerText = '';
  }

  getCurrentStation() {
    return RADIO_STATIONS[this.currentStationIdx];
  }

  nextStation() {
    this.currentStationIdx = (this.currentStationIdx + 1) % RADIO_STATIONS.length;
    this.triggerBanner();
    return this.getCurrentStation();
  }

  prevStation() {
    this.currentStationIdx = (this.currentStationIdx - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    this.triggerBanner();
    return this.getCurrentStation();
  }

  setStation(idx) {
    if (idx >= 0 && idx < RADIO_STATIONS.length) {
      this.currentStationIdx = idx;
      this.triggerBanner();
    }
  }

  triggerBanner() {
    const st = this.getCurrentStation();
    this.bannerText = `${st.name} — ${st.genre}`;
    this.bannerTimer = this.bannerDuration;
  }

  update(dt, inCar, input, audio) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
    }

    if (!inCar || !input || typeof input.isJustPressed !== 'function') return;

    // Cycle radio stations with [ / ] or Z / X
    if (input.isJustPressed('BracketRight') || input.isJustPressed('KeyX')) {
      this.nextStation();
      if (audio && audio.playStationClick) audio.playStationClick();
    } else if (input.isJustPressed('BracketLeft') || input.isJustPressed('KeyZ')) {
      this.prevStation();
      if (audio && audio.playStationClick) audio.playStationClick();
    }
  }
}
