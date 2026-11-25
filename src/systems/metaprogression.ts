import { MAX_CURSE_TIER, SAVE_STORAGE_KEY } from '../core/constants.ts';
import type {
  AchievementId,
  CharacterId,
  Language,
  MetaSaveData,
  MetaUpgradeId,
} from '../core/types.ts';
import { ACHIEVEMENTS } from '../data/achievements.ts';
import { CHARACTERS } from '../data/characters.ts';
import { META_UPGRADES, META_UPGRADE_LIST } from '../data/metaUpgrades.ts';
import { setActiveLanguage } from '../i18n/translations.ts';

export interface EffectiveHeroStats {
  maxHp: number;
  damageMult: number;
  moveSpeedMult: number;
  critChanceBonus: number;
  flaskCharges: number;
  soulDropMult: number;
  soulMagnetRadius: number;
  deathRetentionRate: number;
  cooldownRecoveryMult: number;
  scrollMasteryMult: number;
  overdriveStartSurge: number;
  overdriveChargeMult: number;
  prestigeLevel: number;
  prestigeStatMult: number;
}

export function detectDefaultLanguage(): Language {
  try {
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) {
      return 'es';
    }
  } catch {
    // Ignore environment access issues
  }
  return 'en';
}

export function createDefaultSave(): MetaSaveData {
  return {
    souls: 0,
    unlockedCharacters: ['knight', 'rogue'],
    selectedCharacter: 'knight',
    upgrades: {
      vitality: 0,
      might: 0,
      swiftness: 0,
      alchemist: 0,
      soul_magnet: 0,
      deaths_bargain: 0,
      executioners_luck: 0,
      shadow_grace: 0,
      scroll_mastery: 0,
      overdrive_vessel: 0,
    },
    achievements: [],
    highestCurseUnlocked: 0,
    activeCurseTier: 0,
    totalRuns: 0,
    totalKills: 0,
    totalVictories: 0,
    bestTimeSeconds: null,
    prestigeLevel: 0,
    language: detectDefaultLanguage(),
  };
}

export function getUpgradeCost(id: MetaUpgradeId, currentRank: number): number {
  const def = META_UPGRADES[id];
  return Math.round((def.baseCost + currentRank * def.costStep) * 1.5);
}

export function countMaxedUpgrades(save: MetaSaveData): number {
  let count = 0;
  for (const up of META_UPGRADE_LIST) {
    if ((save.upgrades[up.id] ?? 0) >= up.maxRank) count += 1;
  }
  return count;
}

export function areAllUpgradesMaxed(save: MetaSaveData): boolean {
  return META_UPGRADE_LIST.every((up) => (save.upgrades[up.id] ?? 0) >= up.maxRank);
}

export function computeEffectiveStats(save: MetaSaveData): EffectiveHeroStats {
  const u = save.upgrades;
  const prestigeLevel = Math.max(0, save.prestigeLevel ?? 0);
  const prestigeStatMult = 1 + prestigeLevel * 0.2;
  return {
    maxHp: u.vitality * 15,
    damageMult: (1 + u.might * 0.08) * prestigeStatMult,
    moveSpeedMult: Math.min(2.2, (1 + u.swiftness * 0.05) * prestigeStatMult),
    critChanceBonus: u.executioners_luck * 0.04,
    flaskCharges: 2 + u.alchemist,
    soulDropMult: (1 + u.soul_magnet * 0.12) * prestigeStatMult,
    soulMagnetRadius: 56 + u.soul_magnet * 18,
    deathRetentionRate: Math.min(0.9, 0.25 + u.deaths_bargain * 0.15),
    cooldownRecoveryMult: (1 + u.shadow_grace * 0.06) * prestigeStatMult,
    scrollMasteryMult: 1 + (u.scroll_mastery ?? 0) * 0.2,
    overdriveStartSurge: (u.overdrive_vessel ?? 0) * 15,
    overdriveChargeMult: (1 + (u.overdrive_vessel ?? 0) * 0.15) * prestigeStatMult,
    prestigeLevel,
    prestigeStatMult,
  };
}

export function computeDeathSoulRetention(unbankedSouls: number, save: MetaSaveData): number {
  if (unbankedSouls <= 0) return 0;
  const rate = computeEffectiveStats(save).deathRetentionRate;
  return Math.max(1, Math.round(unbankedSouls * rate));
}

export class MetaProgressionManager {
  data: MetaSaveData;

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null = getBrowserStorage()) {
    this.data = this.load();
    setActiveLanguage(this.data.language);
  }

  private load(): MetaSaveData {
    if (!this.storage) return createDefaultSave();
    try {
      const raw = this.storage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return createDefaultSave();
      const parsed = JSON.parse(raw) as Partial<MetaSaveData>;
      const base = createDefaultSave();
      return {
        ...base,
        ...parsed,
        upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : base.achievements,
        unlockedCharacters:
          Array.isArray(parsed.unlockedCharacters) && parsed.unlockedCharacters.length > 0
            ? parsed.unlockedCharacters
            : base.unlockedCharacters,
        prestigeLevel: typeof parsed.prestigeLevel === 'number' ? Math.max(0, parsed.prestigeLevel) : 0,
        language: parsed.language === 'es' || parsed.language === 'en' ? parsed.language : base.language,
      };
    } catch {
      return createDefaultSave();
    }
  }

  save(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota restrictions
    }
  }

  addSouls(amount: number): void {
    if (amount <= 0) return;
    this.data.souls += Math.round(amount);
    this.save();
  }

  unlockAchievement(id: AchievementId): boolean {
    if (this.data.achievements.includes(id)) return false;
    this.data.achievements.push(id);
    this.data.souls += ACHIEVEMENTS[id].soulReward;
    this.save();
    return true;
  }

  canBuyUpgrade(id: MetaUpgradeId): boolean {
    const def = META_UPGRADES[id];
    const rank = this.data.upgrades[id] ?? 0;
    if (rank >= def.maxRank) return false;
    return this.data.souls >= getUpgradeCost(id, rank);
  }

  buyUpgrade(id: MetaUpgradeId): boolean {
    if (!this.canBuyUpgrade(id)) return false;
    const rank = this.data.upgrades[id] ?? 0;
    this.data.souls -= getUpgradeCost(id, rank);
    this.data.upgrades[id] = rank + 1;
    this.save();
    return true;
  }

  canPrestige(): boolean {
    return areAllUpgradesMaxed(this.data);
  }

  ascendPrestige(): boolean {
    if (!this.canPrestige()) return false;
    this.data.prestigeLevel = (this.data.prestigeLevel ?? 0) + 1;
    for (const up of META_UPGRADE_LIST) {
      this.data.upgrades[up.id] = 0;
    }
    this.save();
    return true;
  }

  setLanguage(lang: Language): void {
    this.data.language = lang;
    setActiveLanguage(lang);
    this.save();
  }

  isCharacterUnlocked(id: CharacterId): boolean {
    return this.data.unlockedCharacters.includes(id);
  }

  unlockCharacter(id: CharacterId): boolean {
    if (this.isCharacterUnlocked(id)) return true;
    const cost = CHARACTERS[id].unlockCost;
    if (this.data.souls < cost) return false;
    this.data.souls -= cost;
    this.data.unlockedCharacters.push(id);
    this.data.selectedCharacter = id;
    this.save();
    return true;
  }

  selectCharacter(id: CharacterId): boolean {
    if (!this.isCharacterUnlocked(id)) return false;
    this.data.selectedCharacter = id;
    this.save();
    return true;
  }

  cycleCurseTier(): number {
    if (this.data.highestCurseUnlocked <= 0) return 0;
    this.data.activeCurseTier =
      (this.data.activeCurseTier + 1) % (Math.min(MAX_CURSE_TIER, this.data.highestCurseUnlocked) + 1);
    this.save();
    return this.data.activeCurseTier;
  }

  recordVictory(timeSeconds: number, kills: number): void {
    this.data.totalVictories += 1;
    this.data.totalKills += kills;
    if (this.data.highestCurseUnlocked < MAX_CURSE_TIER) {
      this.data.highestCurseUnlocked = Math.min(
        MAX_CURSE_TIER,
        Math.max(this.data.highestCurseUnlocked, this.data.activeCurseTier + 1),
      );
    }
    if (this.data.bestTimeSeconds === null || timeSeconds < this.data.bestTimeSeconds) {
      this.data.bestTimeSeconds = Math.round(timeSeconds);
    }
    this.save();
  }

  recordRunEnd(kills: number): void {
    this.data.totalRuns += 1;
    this.data.totalKills += kills;
    this.save();
  }
}

function getBrowserStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}
