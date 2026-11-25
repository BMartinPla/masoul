import { describe, expect, it } from 'vitest';
import { getActiveSynergies } from '../src/data/relics.ts';
import {
  resolveHitOnTarget,
  tickStatusEffects,
  type CombatTargetState,
} from '../src/systems/combat.ts';

function makeTarget(overrides: Partial<CombatTargetState> = {}): CombatTargetState {
  return {
    hp: 100,
    maxHp: 100,
    x: 100,
    facing: 1,
    invulnTimer: 0,
    shieldedFront: false,
    isParrying: false,
    statuses: [],
    ...overrides,
  };
}

describe('Combat Resolution, Relics & Synergies (V2)', () => {
  it('resolves normal and critical strikes accurately', () => {
    const t1 = makeTarget();
    const normal = resolveHitOnTarget(t1, {
      rawDamage: 20,
      attackerX: 80,
      critChance: 0.1,
      attackerRelics: [],
      rngRoll: 0.9,
    });
    expect(normal.isCrit).toBe(false);
    expect(normal.amount).toBe(20);
    expect(t1.hp).toBe(80);

    const t2 = makeTarget();
    const crit = resolveHitOnTarget(t2, {
      rawDamage: 20,
      attackerX: 80,
      critChance: 0.5,
      attackerRelics: [],
      rngRoll: 0.2,
    });
    expect(crit.isCrit).toBe(true);
    expect(crit.amount).toBe(32);
    expect(t2.hp).toBe(68);
  });

  it('triggers Vespera guaranteed backstab crits and applies Poison', () => {
    const enemyFacingRight = makeTarget({ x: 100, facing: 1 });
    const res = resolveHitOnTarget(enemyFacingRight, {
      rawDamage: 20,
      attackerX: 70,
      attackerCharacter: 'rogue',
      critChance: 0,
      attackerRelics: [],
      rngRoll: 0.99,
    });
    expect(res.isCrit).toBe(true);
    expect(res.amount).toBe(37);
    expect(enemyFacingRight.statuses.some((s) => s.type === 'poison')).toBe(true);
  });

  it('triggers Aegis Parry and prevents damage during invulnerability', () => {
    const parryingKnight = makeTarget({ isParrying: true });
    const parried = resolveHitOnTarget(parryingKnight, {
      rawDamage: 40,
      attackerX: 130,
      critChance: 0,
      attackerRelics: [],
      rngRoll: 0.5,
    });
    expect(parried.wasParried).toBe(true);
    expect(parried.amount).toBe(0);
    expect(parryingKnight.hp).toBe(100);

    const rollingHero = makeTarget({ invulnTimer: 0.2 });
    const missed = resolveHitOnTarget(rollingHero, {
      rawDamage: 40,
      attackerX: 130,
      critChance: 0,
      attackerRelics: [],
      rngRoll: 0.5,
    });
    expect(missed.amount).toBe(0);
    expect(rollingHero.hp).toBe(100);
  });

  it('blocks frontal light attacks on Dark Knight shields unless attacked from behind or pierced', () => {
    const dkFacingLeft = makeTarget({ x: 100, facing: -1, shieldedFront: true });
    const frontHit = resolveHitOnTarget(dkFacingLeft, {
      rawDamage: 20,
      attackerX: 70,
      critChance: 0,
      attackerRelics: [],
      rngRoll: 0.9,
    });
    expect(frontHit.wasBlocked).toBe(true);
    expect(frontHit.amount).toBe(3);

    const pierceHit = resolveHitOnTarget(dkFacingLeft, {
      rawDamage: 20,
      attackerX: 70,
      critChance: 0,
      piercesShield: true,
      attackerRelics: [],
      rngRoll: 0.9,
    });
    expect(pierceHit.wasBlocked).toBe(false);
    expect(pierceHit.amount).toBe(20);
  });

  it('activates V2 Relics & Relic Synergies (Assassins Mark, Berserker Pauldron, Precision, Cursed Scythe)', () => {
    const fullTarget = makeTarget({ hp: 100, maxHp: 100 });
    const ambush = resolveHitOnTarget(fullTarget, {
      rawDamage: 20,
      attackerX: 80,
      critChance: 0,
      attackerRelics: ['assassins_mark'],
      rngRoll: 0.9,
    });
    expect(ambush.amount).toBe(27); // +35% ambush bonus

    const lowHpHeroHit = resolveHitOnTarget(makeTarget(), {
      rawDamage: 20,
      attackerX: 80,
      attackerHpRatio: 0.35,
      critChance: 0,
      attackerRelics: ['berserker_pauldron'],
      rngRoll: 0.9,
    });
    expect(lowHpHeroHit.amount).toBe(27);

    // Lethal Edge Synergy (2+ crit relics) boosts crit multiplier +25%
    const synergies = getActiveSynergies(['storm_brand', 'executioners_seal']);
    expect(synergies.some((s) => s.id === 'precision')).toBe(true);

    const critSynTarget = makeTarget();
    const synCrit = resolveHitOnTarget(critSynTarget, {
      rawDamage: 20,
      attackerX: 80,
      critChance: 1.0,
      attackerRelics: ['storm_brand', 'cursed_scythe'],
      rngRoll: 0.1,
    });
    // 20 * 1.3 (cursed_scythe) * 1.6 * 1.25 (precision synergy) = 52
    expect(synCrit.isCrit).toBe(true);
    expect(synCrit.amount).toBe(52);
    expect(critSynTarget.statuses.some((s) => s.type === 'bleed')).toBe(true);
  });

  it('ticks Burn/Poison DoTs and cleans up expired statuses', () => {
    const target = makeTarget();
    resolveHitOnTarget(target, {
      rawDamage: 10,
      attackerX: 80,
      attackerCharacter: 'pyromancer',
      critChance: 0,
      attackerRelics: [],
      rngRoll: 0.9,
    });
    expect(target.statuses.some((s) => s.type === 'burn')).toBe(true);

    let tickSum = 0;
    for (let i = 0; i < 6; i++) {
      tickStatusEffects(target.statuses, 0.5, (_t, dmg) => {
        tickSum += dmg;
      });
    }
    expect(tickSum).toBeGreaterThan(0);
    expect(target.statuses.length).toBe(0);
  });
});
