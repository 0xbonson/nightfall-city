// Game save/load system using browser localStorage for Nightfall City: Vela Bay
// Persists player career progression, cash reserves, weapons inventory, and story milestones.

export const SAVE_STORAGE_KEY = 'nightfall_city_save_v2';
export const SAVE_LEGACY_KEY = 'nightfall_city_save_v1';
export const SAVE_CURRENT_VERSION = 2;

export class SaveManager {
  static hasSave() {
    try {
      return !!localStorage.getItem(SAVE_STORAGE_KEY) || !!localStorage.getItem(SAVE_LEGACY_KEY);
    } catch {
      return false;
    }
  }

  static save(data) {
    try {
      const payload = {
        version: SAVE_CURRENT_VERSION,
        timestamp: Date.now(),
        cash: data.cash ?? 500,
        missionIndex: data.missionIndex ?? 0,
        health: data.health ?? 100,
        armor: data.armor ?? 100,
        posX: data.x ?? 0,
        posZ: data.z ?? 0,
        pistolAmmo: data.pistolAmmo ?? 60,
        rifleAmmo: data.rifleAmmo ?? 120,
        wantedLevel: data.wantedLevel ?? 0,
        collectedCaches: Array.from(data.collectedCaches || []),
        courierRuns: data.courierRuns ?? 0,
      };
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  static load() {
    try {
      let raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem(SAVE_LEGACY_KEY);
      }
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static clear() {
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
      localStorage.removeItem(SAVE_LEGACY_KEY);
      return true;
    } catch {
      return false;
    }
  }

  static getSaveSummary() {
    const data = this.load();
    if (!data) return null;
    return {
      missionIndex: data.missionIndex,
      cash: data.cash,
      collectedCaches: data.collectedCaches ? data.collectedCaches.length : 0,
      courierRuns: data.courierRuns || 0,
      savedAt: new Date(data.timestamp).toLocaleString(),
    };
  }
}
