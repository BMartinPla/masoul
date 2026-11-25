import type {
  CharacterId,
  DamageResult,
  RelicId,
  StatusEffect,
  StatusType,
} from '../core/types.ts';
import { getActiveSynergies } from '../data/relics.ts';

export interface CombatTargetState {
  hp: number;
  maxHp: number;
  x: number;
  facing: number;
  invulnTimer: number;
  shieldedFront: boolean;
  isParrying: boolean;
  statuses: StatusEffect[];
}

export interface HitSpec {
  rawDamage: number;
  attackerX: number;
  attackerCharacter?: CharacterId;
  attackerHpRatio?: number;
  critChance: number;
  forceCrit?: boolean;
  piercesShield?: boolean;
  attackerRelics: readonly RelicId[];
  applyStatus?: StatusType;
  rngRoll: number; // 0..1 deterministic or Math.random()
}

export function isBackstab(attackerX: number, targetX: number, targetFacing: number): boolean {
  if (targetFacing >= 0) {
    return attackerX < targetX - 2;
  }
  return attackerX > targetX + 2;
}

export function applyStatusEffect(
  statuses: StatusEffect[],
  type: StatusType,
  duration: number,
  power: number,
): void {
  const existing = statuses.find((s) => s.type === type);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    existing.power = Math.max(existing.power, power);
    if (type === 'poison' || type === 'bleed') {
      existing.stacks = Math.min(5, existing.stacks + 1);
    }
  } else {
    statuses.push({
      type,
      remaining: duration,
      tickTimer: 0.45,
      stacks: 1,
      power,
    });
  }
}

export function hasStatus(statuses: readonly StatusEffect[], type: StatusType): boolean {
  return statuses.some((s) => s.type === type && s.remaining > 0);
}

export function tickStatusEffects(
  statuses: StatusEffect[],
  dt: number,
  onTickDamage: (type: StatusType, dmg: number) => void,
): void {
  for (let i = statuses.length - 1; i >= 0; i--) {
    const s = statuses[i]!;
    s.remaining -= dt;
    if (s.type === 'burn' || s.type === 'poison' || s.type === 'bleed') {
      s.tickTimer -= dt;
      if (s.tickTimer <= 0) {
        s.tickTimer += 0.5;
        onTickDamage(s.type, Math.max(1, Math.round(s.power * s.stacks)));
      }
    }
    if (s.remaining <= 0) {
      statuses.splice(i, 1);
    }
  }
}

export function resolveHitOnTarget(
  target: CombatTargetState,
  hit: HitSpec,
): DamageResult {
  if (target.invulnTimer > 0) {
    return {
      amount: 0,
      isCrit: false,
      wasBlocked: false,
      wasParried: false,
      killed: false,
    };
  }

  // Check player shield parry
  if (target.isParrying) {
    return {
      amount: 0,
      isCrit: false,
      wasBlocked: true,
      wasParried: true,
      killed: false,
    };
  }

  const backstab = isBackstab(hit.attackerX, target.x, target.facing);

  // Dark Knight frontal shield check
  if (target.shieldedFront && !backstab && !hit.piercesShield) {
    const chipped = Math.max(1, Math.round(hit.rawDamage * 0.15));
    target.hp = Math.max(0, target.hp - chipped);
    return {
      amount: chipped,
      isCrit: false,
      wasBlocked: true,
      wasParried: false,
      killed: target.hp <= 0,
    };
  }

  let dmg = hit.rawDamage;
  const hasRelic = (id: RelicId): boolean => hit.attackerRelics.includes(id);
  const synergies = getActiveSynergies(hit.attackerRelics);
  const hasSyn = (id: string): boolean => synergies.some((s) => s.id === id);

  if (hasRelic('blood_chalice')) dmg *= 1.45;
  if (hasRelic('cursed_scythe')) dmg *= 1.3;
  if (hasRelic('executioners_seal') && target.hp <= target.maxHp * 0.45) {
    dmg *= 1.35;
  }
  if (hasRelic('assassins_mark') && target.hp >= target.maxHp) {
    dmg *= 1.35;
  }
  if (
    hasRelic('berserker_pauldron') &&
    hit.attackerHpRatio !== undefined &&
    hit.attackerHpRatio < 0.5
  ) {
    dmg *= 1.35;
  }
  if (hasStatus(target.statuses, 'vulnerable')) {
    dmg *= 1.3;
  }

  const rogueBackstab = hit.attackerCharacter === 'rogue' && backstab;
  const bonusCrit = hasRelic('glass_crown') ? 0.25 : 0;
  const isCrit =
    Boolean(hit.forceCrit) ||
    rogueBackstab ||
    hit.rngRoll < Math.min(0.95, hit.critChance + bonusCrit);

  if (isCrit) {
    let critMult = rogueBackstab ? 1.85 : 1.6;
    if (hasSyn('precision')) critMult *= 1.25;
    dmg *= critMult;
  }

  const finalDmg = Math.max(1, Math.round(dmg));
  target.hp = Math.max(0, target.hp - finalDmg);

  // Apply innate & relic status effects
  if (hit.applyStatus) {
    applyStatusEffect(target.statuses, hit.applyStatus, 3.0, 4);
  }
  if (hasRelic('cursed_scythe')) {
    applyStatusEffect(target.statuses, 'bleed', 3.0, 4);
  }
  if (rogueBackstab || hasRelic('venom_vial')) {
    const pPower = hasSyn('plague_burst') ? 5 : 3;
    const pDur = hasSyn('plague_burst') ? 4.5 : 3.5;
    applyStatusEffect(target.statuses, 'poison', pDur, pPower);
  }
  if (hit.attackerCharacter === 'pyromancer' || hasRelic('ember_brand')) {
    const bPower = hasSyn('hellfire') ? 6 : 4;
    const bDur = hasSyn('hellfire') ? 4.2 : 3.0;
    applyStatusEffect(target.statuses, 'burn', bDur, bPower);
  }
  if (hasRelic('frost_sigil')) {
    applyStatusEffect(target.statuses, 'frost', 2.5, 1);
  }

  return {
    amount: finalDmg,
    isCrit,
    wasBlocked: false,
    wasParried: false,
    killed: target.hp <= 0,
  };
}
