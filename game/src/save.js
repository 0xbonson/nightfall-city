/**
 * Nightfall City: Vela Bay - Persistent Save & Career State Manager
 * Uses browser localStorage to persist campaign progress, cash balance,
 * weapons arsenal, and player accomplishments across sessions.
 * Authored for make.fun GTA 6 bounty challenge.
 */

const STORAGE_KEY = 'nightfall_city_save_v1';

export class SaveSystem {
  hasSave() {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }

  save(player, missions, police) {
    try {
      const payload = {
        version: '1.3.0',
        missionIdx: missions ? missions.currentIdx : 0,
        cash: player ? player.cash : 1500,
        health: player ? player.health : 100,
        armor: player ? player.armor : 50,
        currentWeapon: player ? player.currentWeapon : 'rifle',
        wantedStars: police ? police.wantedStars : 0,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.warn('[SaveSystem] Unable to write save payload to localStorage:', err);
      return false;
    }
  }

  load(player, missions, police) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
      if (data.wantedStars !== undefined && police) {
        police.setWantedStars(data.wantedStars);
      }
      return true;
    } catch (err) {
      console.warn('[SaveSystem] Unable to read save payload from localStorage:', err);
      return false;
    }
  }

  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }
}
