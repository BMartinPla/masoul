import type { RelicDef, RelicId, RelicTag } from '../core/types.ts';

export const RELICS: Record<RelicId, RelicDef> = {
  vampiric_fang: {
    id: 'vampiric_fang',
    name: 'Vampiric Fang',
    rarity: 'rare',
    shortTag: 'LIFESTEAL',
    description: 'Restore 5 HP every time you slay an enemy.',
    iconColor: '#ff6b7a',
    tags: ['soul'],
  },
  ember_brand: {
    id: 'ember_brand',
    name: 'Ember Brand',
    rarity: 'common',
    shortTag: 'BURN',
    description: 'Weapon strikes ignite enemies, dealing burning damage over 3s.',
    iconColor: '#ff9636',
    tags: ['fire'],
  },
  venom_vial: {
    id: 'venom_vial',
    name: 'Venom Vial',
    rarity: 'common',
    shortTag: 'POISON',
    description: 'Attacks apply stacking Poison that erodes enemy armor.',
    iconColor: '#9be675',
    tags: ['poison'],
  },
  windstrider_boots: {
    id: 'windstrider_boots',
    name: 'Windstrider Boots',
    rarity: 'common',
    shortTag: 'MOBILITY',
    description: '+18% movement speed and +1 extra mid-air jump.',
    iconColor: '#7ef5eb',
    tags: ['mobility'],
  },
  executioners_seal: {
    id: 'executioners_seal',
    name: "Executioner's Seal",
    rarity: 'rare',
    shortTag: 'EXECUTE',
    description: '+35% damage against enemies below 45% HP.',
    iconColor: '#d1364e',
    tags: ['crit'],
  },
  soul_lantern: {
    id: 'soul_lantern',
    name: 'Soul Lantern',
    rarity: 'rare',
    shortTag: 'SOULS +40%',
    description: 'Slain monsters drop +40% bonus Souls and glow brightly.',
    iconColor: '#7ef5eb',
    tags: ['soul'],
  },
  aegis_shard: {
    id: 'aegis_shard',
    name: 'Aegis Shard',
    rarity: 'common',
    shortTag: 'SHIELD',
    description: 'Gain a 20 HP regenerating barrier upon entering each new biome.',
    iconColor: '#cad5ed',
    tags: ['defense'],
  },
  storm_brand: {
    id: 'storm_brand',
    name: 'Storm Brand',
    rarity: 'legendary',
    shortTag: 'LIGHTNING',
    description: 'Critical hits unleash chain lightning arcing to nearby enemies.',
    iconColor: '#ffe082',
    tags: ['crit'],
  },
  blood_chalice: {
    id: 'blood_chalice',
    name: 'Blood Chalice',
    rarity: 'cursed',
    shortTag: '+45% DMG / -25% HP',
    description: 'Bargain in blood: +45% all damage dealt, but -25% max HP.',
    iconColor: '#ff6b7a',
    tags: ['soul'],
  },
  twin_echo: {
    id: 'twin_echo',
    name: 'Twin Echo',
    rarity: 'legendary',
    shortTag: 'COOLDOWN',
    description: 'Skill cooldowns recover 30% faster.',
    iconColor: '#ba82ed',
    tags: ['mobility'],
  },
  iron_greaves: {
    id: 'iron_greaves',
    name: 'Iron Greaves',
    rarity: 'common',
    shortTag: 'DIVE SLAM',
    description: 'Dive Slam radius +50% and deals double impact damage.',
    iconColor: '#8b8fa8',
    tags: ['defense'],
  },
  glass_crown: {
    id: 'glass_crown',
    name: 'Glass Crown',
    rarity: 'cursed',
    shortTag: '+25% CRIT',
    description: '+25% Critical Hit chance, +20% incoming damage taken.',
    iconColor: '#ffe082',
    tags: ['crit'],
  },
  frost_sigil: {
    id: 'frost_sigil',
    name: 'Frost Sigil',
    rarity: 'rare',
    shortTag: 'CHILL',
    description: 'Hits chill enemies for 2.5s, slowing their movement and attacks by 35%.',
    iconColor: '#7ef5eb',
    tags: ['defense'],
  },
  phoenix_ash: {
    id: 'phoenix_ash',
    name: 'Phoenix Ash',
    rarity: 'legendary',
    shortTag: 'REVIVE',
    description: 'Once per run, survive lethal damage with 50% HP in a fiery shockwave.',
    iconColor: '#ffd466',
    tags: ['fire'],
  },
  cursed_scythe: {
    id: 'cursed_scythe',
    name: 'Cursed Scythe',
    rarity: 'cursed',
    shortTag: '+30% DMG / BLEED',
    description: 'Hits inflict Bleed and deal +30% damage, but Healing Flasks restore 25% less.',
    iconColor: '#d1364e',
    tags: ['crit'],
  },
  cinder_crown: {
    id: 'cinder_crown',
    name: 'Cinder Crown',
    rarity: 'rare',
    shortTag: 'FIRE NOVA',
    description: 'Critical hits erupt in a small fire blast that ignites nearby enemies.',
    iconColor: '#ff9636',
    tags: ['fire'],
  },
  plague_censer: {
    id: 'plague_censer',
    name: 'Plague Censer',
    rarity: 'rare',
    shortTag: 'TOXIC CLOUD',
    description: 'Enemies die in a noxious mist that poisons surrounding foes.',
    iconColor: '#67d487',
    tags: ['poison'],
  },
  mirror_shield: {
    id: 'mirror_shield',
    name: 'Mirror Ward',
    rarity: 'legendary',
    shortTag: 'REFLECT',
    description: 'Every 8 seconds, automatically blocks and reflects one enemy projectile.',
    iconColor: '#cad5ed',
    tags: ['defense'],
  },
  assassins_mark: {
    id: 'assassins_mark',
    name: "Assassin's Mark",
    rarity: 'rare',
    shortTag: 'AMBUSH',
    description: 'Deal +35% bonus damage against undamaged enemies at full HP.',
    iconColor: '#9be675',
    tags: ['poison', 'crit'],
  },
  berserker_pauldron: {
    id: 'berserker_pauldron',
    name: 'Berserker Pauldron',
    rarity: 'rare',
    shortTag: 'RAGE',
    description: 'Deal +35% bonus damage while your HP is below 50%.',
    iconColor: '#ff6b7a',
    tags: ['fire'],
  },
};

export const RELIC_LIST: readonly RelicDef[] = Object.values(RELICS);

export interface RelicSynergy {
  id: 'hellfire' | 'plague_burst' | 'precision' | 'bulwark';
  name: string;
  description: string;
  color: string;
}

const SYNERGY_DEFS: Record<RelicSynergy['id'], RelicSynergy> = {
  hellfire: {
    id: 'hellfire',
    name: 'Synergy: Hellfire',
    description: '2+ Fire Relics: Burn damage +50% and Burn lasts longer.',
    color: '#ff9636',
  },
  plague_burst: {
    id: 'plague_burst',
    name: 'Synergy: Plague Pact',
    description: '2+ Poison Relics: Poison deals +50% damage and stacks faster.',
    color: '#9be675',
  },
  precision: {
    id: 'precision',
    name: 'Synergy: Lethal Edge',
    description: '2+ Crit Relics: Critical Hits deal +25% extra damage.',
    color: '#ffe082',
  },
  bulwark: {
    id: 'bulwark',
    name: 'Synergy: Iron Bulwark',
    description: '2+ Defense Relics: Incoming damage reduced by 15%.',
    color: '#cad5ed',
  },
};

export function getActiveSynergies(relicIds: readonly RelicId[]): RelicSynergy[] {
  const counts: Record<RelicTag, number> = {
    fire: 0,
    poison: 0,
    crit: 0,
    defense: 0,
    soul: 0,
    mobility: 0,
  };
  for (const id of relicIds) {
    const def = RELICS[id];
    if (!def) continue;
    for (const tag of def.tags) {
      counts[tag] += 1;
    }
  }

  const active: RelicSynergy[] = [];
  if (counts.fire >= 2) active.push(SYNERGY_DEFS.hellfire);
  if (counts.poison >= 2) active.push(SYNERGY_DEFS.plague_burst);
  if (counts.crit >= 2) active.push(SYNERGY_DEFS.precision);
  if (counts.defense >= 2) active.push(SYNERGY_DEFS.bulwark);
  return active;
}
