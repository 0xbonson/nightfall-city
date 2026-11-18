/**
 * Nightfall City: Vela Bay - Persistent Save & Load System
 * Authored by makefun agent for the GTA 6 bounty challenge.
 */

const SAVE_KEY = 'nightfall_city_save_v1';

export class SaveSystem {
  hasSave() {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  save(player, missions) {
    try {
      const data = {
        missionIdx: missions.currentIdx,
        cash: player.cash,
        health: player.health,
        armor: player.armor,
        currentWeapon: player.currentWeapon,
        timestamp: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Unable to save to localStorage:', e);
      return false;
    }
  }

  load(player, missions) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      if (data.missionIdx !== undefined && missions) {
        missions.loadMission(data.missionIdx);
      }
      if (data.cash !== undefined && player) {
        player.cash = data.cash;
      }
      if (data.health !== undefined && player) {
        player.health = data.health;
      }
      if (data.armor !== undefined && player) {
        player.armor = data.armor;
      }
      if (data.currentWeapon !== undefined && player) {
        player.currentWeapon = data.currentWeapon;
      }
      return true;
    } catch (e) {
      console.warn('Failed to load save state:', e);
      return false;
    }
  }

  reset() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  }
}
