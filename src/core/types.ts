export type CharacterId =
  | 'knight'
  | 'rogue'
  | 'pyromancer'
  | 'executioner'
  | 'templar'
  | 'necromancer';

export type CharacterAnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'air_jump'
  | 'fall'
  | 'wall_slide'
  | 'roll'
  | 'dive_slam'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'skill1'
  | 'skill2'
  | 'hurt'
  | 'death';

export type EnemyId =
  | 'skeleton'
  | 'crossbowman'
  | 'ghoul'
  | 'plague_rat'
  | 'gargoyle'
  | 'frost_wraith'
  | 'dark_knight'
  | 'cultist'
  | 'brute'
  | 'mimic'
  | 'boss_inquisitor'
  | 'boss_warden'
  | 'boss_sovereign';

export type EnemyAnimState =
  | 'idle'
  | 'move'
  | 'telegraph'
  | 'attack'
  | 'hurt'
  | 'death';

export type BiomeId = 'sanctuary' | 'crypt' | 'catacombs' | 'ossuary' | 'citadel';

export type Language = 'en' | 'es';

export type TileType = 0 | 1 | 2 | 3; // 0=empty, 1=solid, 2=one-way platform, 3=spikes

export type RelicId =
  | 'vampiric_fang'
  | 'ember_brand'
  | 'venom_vial'
  | 'windstrider_boots'
  | 'executioners_seal'
  | 'soul_lantern'
  | 'aegis_shard'
  | 'storm_brand'
  | 'blood_chalice'
  | 'twin_echo'
  | 'iron_greaves'
  | 'glass_crown'
  | 'frost_sigil'
  | 'phoenix_ash'
  | 'cursed_scythe'
  | 'cinder_crown'
  | 'plague_censer'
  | 'mirror_shield'
  | 'assassins_mark'
  | 'berserker_pauldron';

export type RelicRarity = 'common' | 'rare' | 'cursed' | 'legendary';

export type RelicTag = 'fire' | 'poison' | 'crit' | 'defense' | 'soul' | 'mobility';

export type ScrollStat = 'brutality' | 'tactics' | 'survival';

export type MetaUpgradeId =
  | 'vitality'
  | 'might'
  | 'swiftness'
  | 'alchemist'
  | 'soul_magnet'
  | 'deaths_bargain'
  | 'executioners_luck'
  | 'shadow_grace'
  | 'scroll_mastery'
  | 'overdrive_vessel';

export type AchievementId =
  | 'first_blood'
  | 'parry_master'
  | 'inquisitor_slain'
  | 'warden_slain'
  | 'sovereign_slain'
  | 'killstreak_15'
  | 'scroll_collector'
  | 'relic_synergy'
  | 'hero_collector'
  | 'ossuary_survivor'
  | 'overdrive_unleashed'
  | 'cursed_victor';

export type StatusType = 'burn' | 'poison' | 'bleed' | 'stun' | 'vulnerable' | 'frost';

export type GameScreen =
  | 'title'
  | 'sanctuary'
  | 'playing'
  | 'soul_altar'
  | 'hero_select'
  | 'relic_select'
  | 'scroll_select'
  | 'merchant'
  | 'paused'
  | 'dead'
  | 'victory'
  | 'codex'
  | 'deeds'
  | 'controls';

export interface ComboStepDef {
  damageMult: number;
  duration: number;
  activeStart: number;
  activeEnd: number;
  rangeX: number;
  rangeY: number;
  lungeSpeed: number;
  knockbackX: number;
  knockbackY: number;
  canCrit?: boolean;
  rangedBolt?: boolean;
}

export interface SkillDef {
  name: string;
  description: string;
  cooldown: number;
  iconColor: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  archetype: string;
  description: string;
  passiveName: string;
  passiveDesc: string;
  unlockCost: number;
  accentColor: string;
  glowColor: string;
  maxHp: number;
  moveSpeed: number;
  jumpForce: number;
  baseDamage: number;
  critChance: number;
  rollSpeed: number;
  rollDuration: number;
  combo: [ComboStepDef, ComboStepDef, ComboStepDef];
  skill1: SkillDef;
  skill2: SkillDef;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  title?: string;
  description: string;
  isBoss: boolean;
  isFlying: boolean;
  shieldedFront: boolean;
  width: number;
  height: number;
  spriteSize: number;
  maxHp: number;
  speed: number;
  damage: number;
  detectRange: number;
  attackRange: number;
  telegraphDuration: number;
  attackDuration: number;
  attackCooldown: number;
  soulDrop: number;
  goldDrop: number;
  accentColor: string;
}

export interface RelicDef {
  id: RelicId;
  name: string;
  rarity: RelicRarity;
  shortTag: string;
  description: string;
  iconColor: string;
  tags: readonly RelicTag[];
}

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  name: string;
  description: string;
  maxRank: number;
  baseCost: number;
  costStep: number;
  bonusPerRankLabel: string;
}

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  soulReward: number;
  iconColor: string;
}

export interface BiomeDef {
  id: BiomeId;
  name: string;
  subtitle: string;
  ambientColor: string;
  ambientAlpha: number;
  torchColor: string;
  skyTop: string;
  skyBottom: string;
  stoneAccent: string;
  roomCount: number;
  enemyWeights: Array<{ id: EnemyId; weight: number }>;
  bossId?: EnemyId;
  nextBiome?: BiomeId;
  altNextBiome?: BiomeId;
}

export interface MetaSaveData {
  souls: number;
  unlockedCharacters: CharacterId[];
  selectedCharacter: CharacterId;
  upgrades: Record<MetaUpgradeId, number>;
  achievements: AchievementId[];
  highestCurseUnlocked: number;
  activeCurseTier: number;
  totalRuns: number;
  totalKills: number;
  totalVictories: number;
  bestTimeSeconds: number | null;
  prestigeLevel: number;
  language: Language;
}

export interface RunStats {
  biome: BiomeId;
  kills: number;
  elitesKilled: number;
  gold: number;
  runSouls: number;
  bankedSoulsThisRun: number;
  damageDealt: number;
  timeSeconds: number;
  relics: RelicId[];
  scrolls: Record<ScrollStat, number>;
  weaponUpgrades: number;
  curseTier: number;
  maxKillstreak: number;
  parries: number;
  bossesKilled: number;
  overdrivesUsed: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  flicker?: number;
}

export type PropKind =
  | 'torch'
  | 'brazier'
  | 'banner'
  | 'chain'
  | 'rose_window'
  | 'pillar'
  | 'statue'
  | 'candle_cluster';

export interface PropPlacement {
  kind: PropKind;
  x: number;
  y: number;
  variant: number;
  color?: string;
}

export type StationKind =
  | 'soul_altar'
  | 'hero_pedestal'
  | 'curse_brazier'
  | 'dungeon_gate'
  | 'chest'
  | 'relic_shrine'
  | 'merchant'
  | 'exit_portal'
  | 'barrel'
  | 'crate'
  | 'trinity_scroll'
  | 'blood_shrine'
  | 'waystone'
  | 'lore_tablet'
  | 'training_dummy'
  | 'deeds_lectern';

export interface InteractivePlacement {
  kind: StationKind;
  x: number;
  y: number;
  id?: string;
  targetBiome?: BiomeId;
  loreText?: string;
}

export interface EnemySpawn {
  enemyId: EnemyId;
  x: number;
  y: number;
  isElite?: boolean;
}

export interface StatusEffect {
  type: StatusType;
  remaining: number;
  tickTimer: number;
  stacks: number;
  power: number;
}

export interface DamageResult {
  amount: number;
  isCrit: boolean;
  wasBlocked: boolean;
  wasParried: boolean;
  killed: boolean;
}
