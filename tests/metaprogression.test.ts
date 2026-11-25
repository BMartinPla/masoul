import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, evaluateNewlyEarnedAchievements } from '../src/data/achievements.ts';
import type { RunStats } from '../src/core/types.ts';
import { META_UPGRADE_LIST } from '../src/data/metaUpgrades.ts';
import {
  computeDeathSoulRetention,
  computeEffectiveStats,
  getUpgradeCost,
  MetaProgressionManager,
} from '../src/systems/metaprogression.ts';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, val: string) => {
      map.set(key, val);
    },
  };
}

describe('MetaProgressionManager, Heroes, Upgrades & Deeds (V2)', () => {
  it('persists banked Souls, buys upgrades including scroll_mastery & overdrive_vessel', () => {
    const storage = createMemoryStorage();
    const mgr = new MetaProgressionManager(storage);

    expect(mgr.data.souls).toBe(0);
    expect(mgr.isCharacterUnlocked('knight')).toBe(true);
    expect(mgr.isCharacterUnlocked('rogue')).toBe(true);
    expect(mgr.isCharacterUnlocked('templar')).toBe(false);
    expect(mgr.isCharacterUnlocked('necromancer')).toBe(false);

    mgr.addSouls(250);
    const vitCost = getUpgradeCost('vitality', 0);
    expect(vitCost).toBe(18); // +50% cost scaling (12 * 1.5 = 18)
    expect(mgr.buyUpgrade('vitality')).toBe(true);
    expect(mgr.buyUpgrade('scroll_mastery')).toBe(true);
    expect(mgr.buyUpgrade('overdrive_vessel')).toBe(true);
    expect(mgr.data.upgrades.vitality).toBe(1);
    expect(mgr.data.upgrades.scroll_mastery).toBe(1);
    expect(mgr.data.upgrades.overdrive_vessel).toBe(1);
    expect(mgr.data.souls).toBeLessThan(250 - vitCost);

    const stats = computeEffectiveStats(mgr.data);
    expect(stats.maxHp).toBe(15);
    expect(stats.scrollMasteryMult).toBeCloseTo(1.2);
    expect(stats.overdriveStartSurge).toBe(15);
    expect(stats.overdriveChargeMult).toBeCloseTo(1.15);

    const reloaded = new MetaProgressionManager(storage);
    expect(reloaded.data.upgrades.scroll_mastery).toBe(1);
    expect(reloaded.data.upgrades.overdrive_vessel).toBe(1);
  });

  it('unlocks all new heroes including templar and necromancer when Souls suffice', () => {
    const mgr = new MetaProgressionManager(createMemoryStorage());
    mgr.addSouls(60);
    expect(mgr.unlockCharacter('templar')).toBe(false); // costs 65

    mgr.addSouls(130);
    expect(mgr.unlockCharacter('templar')).toBe(true);
    expect(mgr.unlockCharacter('necromancer')).toBe(true);
    expect(mgr.data.selectedCharacter).toBe('necromancer');
  });

  it("scales Death's Bargain retention and Curse tiers properly", () => {
    const mgr = new MetaProgressionManager(createMemoryStorage());
    expect(computeDeathSoulRetention(40, mgr.data)).toBe(10);

    mgr.addSouls(100);
    mgr.buyUpgrade('deaths_bargain');
    expect(computeDeathSoulRetention(40, mgr.data)).toBe(16);

    expect(mgr.data.highestCurseUnlocked).toBe(0);
    mgr.recordVictory(185, 42);
    expect(mgr.data.highestCurseUnlocked).toBe(1);
    expect(mgr.cycleCurseTier()).toBe(1);
    expect(mgr.cycleCurseTier()).toBe(0);
  });

  it('awards Deeds achievements once and credits Soul rewards cleanly', () => {
    const mgr = new MetaProgressionManager(createMemoryStorage());
    const stats: RunStats = {
      biome: 'ossuary',
      kills: 15,
      elitesKilled: 2,
      gold: 80,
      runSouls: 30,
      bankedSoulsThisRun: 0,
      damageDealt: 1200,
      timeSeconds: 180,
      relics: ['ember_brand', 'cinder_crown'],
      scrolls: { brutality: 2, tactics: 1, survival: 1 },
      weaponUpgrades: 1,
      curseTier: 1,
      maxKillstreak: 15,
      parries: 3,
      bossesKilled: 1,
      overdrivesUsed: 1,
    };

    const earned = evaluateNewlyEarnedAchievements(mgr.data, stats, 'boss_sovereign');
    expect(earned).toContain('first_blood');
    expect(earned).toContain('parry_master');
    expect(earned).toContain('relic_synergy');
    expect(earned).toContain('scroll_collector');
    expect(earned).toContain('cursed_victor');

    const beforeSouls = mgr.data.souls;
    expect(mgr.unlockAchievement('cursed_victor')).toBe(true);
    expect(mgr.data.souls).toBe(beforeSouls + ACHIEVEMENTS.cursed_victor.soulReward);
    // Re-claiming yields false and does not duplicate Souls
    expect(mgr.unlockAchievement('cursed_victor')).toBe(false);
    expect(mgr.data.souls).toBe(beforeSouls + ACHIEVEMENTS.cursed_victor.soulReward);
  });

  it('requires all upgrades maxed for Prestige, grants +20% stats per Prestige, and persists language', () => {
    const storage = createMemoryStorage();
    const mgr = new MetaProgressionManager(storage);

    expect(mgr.canPrestige()).toBe(false);
    expect(mgr.ascendPrestige()).toBe(false);

    for (const up of META_UPGRADE_LIST) {
      mgr.data.upgrades[up.id] = up.maxRank;
    }
    expect(mgr.canPrestige()).toBe(true);
    expect(mgr.ascendPrestige()).toBe(true);
    expect(mgr.data.prestigeLevel).toBe(1);
    expect(mgr.canPrestige()).toBe(false);
    for (const up of META_UPGRADE_LIST) {
      expect(mgr.data.upgrades[up.id]).toBe(0);
    }

    const stats = computeEffectiveStats(mgr.data);
    expect(stats.prestigeLevel).toBe(1);
    expect(stats.prestigeStatMult).toBeCloseTo(1.2);
    expect(stats.damageMult).toBeCloseTo(1.2);

    mgr.setLanguage('es');
    const reloaded = new MetaProgressionManager(storage);
    expect(reloaded.data.language).toBe('es');
    expect(reloaded.data.prestigeLevel).toBe(1);
  });
});
