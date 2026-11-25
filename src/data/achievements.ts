import type { AchievementDef, AchievementId, MetaSaveData, RunStats } from '../core/types.ts';
import { getActiveSynergies } from './relics.ts';

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  first_blood: {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Slay your first cursed monster in the depths.',
    soulReward: 10,
    iconColor: '#ff6b7a',
  },
  parry_master: {
    id: 'parry_master',
    name: 'Iron Riposte',
    description: 'Land 3 shield parries or mirror reflections in a single run.',
    soulReward: 20,
    iconColor: '#ffe082',
  },
  inquisitor_slain: {
    id: 'inquisitor_slain',
    name: 'Chains Broken',
    description: 'Vanquish Garrick, The Chained Inquisitor in Prisoner\'s Crypt.',
    soulReward: 25,
    iconColor: '#ff9636',
  },
  warden_slain: {
    id: 'warden_slain',
    name: 'Gatebreaker',
    description: 'Defeat The Hollow Warden guarding the deeper vaults.',
    soulReward: 35,
    iconColor: '#7ef5eb',
  },
  sovereign_slain: {
    id: 'sovereign_slain',
    name: 'Kingslayer',
    description: 'Overthrow Malgrim, The Crimson Sovereign.',
    soulReward: 50,
    iconColor: '#ffd466',
  },
  killstreak_15: {
    id: 'killstreak_15',
    name: 'Unbroken Reaper',
    description: 'Reach a 15-kill streak in a single run.',
    soulReward: 20,
    iconColor: '#d1364e',
  },
  scroll_collector: {
    id: 'scroll_collector',
    name: 'Trinity Scholar',
    description: 'Absorb at least 4 Trinity Scrolls in one run.',
    soulReward: 20,
    iconColor: '#ba82ed',
  },
  relic_synergy: {
    id: 'relic_synergy',
    name: 'Arcane Confluence',
    description: 'Activate a Relic Synergy by pairing matching Relics.',
    soulReward: 25,
    iconColor: '#67d487',
  },
  hero_collector: {
    id: 'hero_collector',
    name: 'Fellowship of Ashes',
    description: 'Unlock 4 or more playable heroes in the Hall of Heroes.',
    soulReward: 30,
    iconColor: '#cad5ed',
  },
  ossuary_survivor: {
    id: 'ossuary_survivor',
    name: 'Miasma Walker',
    description: 'Venture into The Blighted Ossuary via the alternate crypt path.',
    soulReward: 20,
    iconColor: '#9be675',
  },
  overdrive_unleashed: {
    id: 'overdrive_unleashed',
    name: 'Soul Overdrive',
    description: 'Trigger Soul Overdrive during combat.',
    soulReward: 15,
    iconColor: '#7ef5eb',
  },
  cursed_victor: {
    id: 'cursed_victor',
    name: 'Cursed Conqueror',
    description: 'Slay Malgrim with Curse Tier 1 or higher active.',
    soulReward: 60,
    iconColor: '#ff6b7a',
  },
};

export const ACHIEVEMENT_LIST: readonly AchievementDef[] = Object.values(ACHIEVEMENTS);

export function evaluateNewlyEarnedAchievements(
  save: MetaSaveData,
  stats: RunStats,
  justKilledBossId?: string,
): AchievementId[] {
  const earned = new Set(save.achievements);
  const unlocked: AchievementId[] = [];
  const check = (id: AchievementId, condition: boolean): void => {
    if (!earned.has(id) && condition) unlocked.push(id);
  };

  const totalScrolls =
    stats.scrolls.brutality + stats.scrolls.tactics + stats.scrolls.survival;
  const hasSynergy = getActiveSynergies(stats.relics).length > 0;

  check('first_blood', stats.kills >= 1 || save.totalKills >= 1);
  check('parry_master', stats.parries >= 3);
  check('inquisitor_slain', justKilledBossId === 'boss_inquisitor');
  check('warden_slain', justKilledBossId === 'boss_warden');
  check('sovereign_slain', justKilledBossId === 'boss_sovereign');
  check('killstreak_15', stats.maxKillstreak >= 15);
  check('scroll_collector', totalScrolls >= 4);
  check('relic_synergy', hasSynergy);
  check('hero_collector', save.unlockedCharacters.length >= 4);
  check('ossuary_survivor', stats.biome === 'ossuary');
  check('overdrive_unleashed', stats.overdrivesUsed >= 1);
  check('cursed_victor', justKilledBossId === 'boss_sovereign' && stats.curseTier >= 1);

  return unlocked;
}
