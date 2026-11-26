import type { CharacterId } from '../core/types.ts';
import { PAL } from './palette.ts';
import { PixelBuffer } from './pixelBuffer.ts';

export type SkillIconKey = `${CharacterId}_1` | `${CharacterId}_2` | 'roll';

/**
 * Bakes crisp 14x14 outlined Hi-Bit pixel-art icons for all 12 hero skills and Dodge Roll.
 * Only called inside getGameAssets() so Node Vitest never touches DOM canvas APIs.
 */
export function bakeAllSkillIcons(): Record<SkillIconKey, HTMLCanvasElement> {
  const mk = (): PixelBuffer => new PixelBuffer(14, 14, 1);

  // knight_1: Aegis Parry (Heater kite buckler with golden cross & rim gleam)
  const k1 = mk();
  k1.poly(
    [
      [3, 2],
      [10, 2],
      [10, 7],
      [7, 11],
      [3, 7],
    ],
    PAL.steel2,
  );
  k1.rect(4, 3, 2, 5, PAL.steel4);
  k1.rect(6, 3, 2, 7, PAL.gold4);
  k1.rect(4, 5, 6, 2, PAL.gold3);
  k1.set(4, 3, PAL.gold5);
  k1.applyOutline(PAL.outline);

  // knight_2: Judgement Cleave (Sweeping radiant crescent wave)
  const k2 = mk();
  k2.poly(
    [
      [2, 2],
      [7, 2],
      [11, 5],
      [11, 8],
      [7, 11],
      [2, 11],
      [6, 8],
      [6, 5],
    ],
    PAL.ember2,
  );
  k2.poly(
    [
      [5, 3],
      [8, 3],
      [10, 6],
      [10, 7],
      [8, 10],
      [5, 10],
      [8, 7],
      [8, 6],
    ],
    PAL.gold4,
  );
  k2.rect(9, 5, 2, 4, PAL.gold5);
  k2.applyOutline(PAL.outline);

  // rogue_1: Shadow Step (Hooded phantom silhouette + diagonal cyan blink slash)
  const r1 = mk();
  r1.shadedEllipse(6, 6, 4, 4, PAL.soul1, PAL.soul2, PAL.soul4);
  r1.rect(4, 9, 5, 3, PAL.soul2);
  r1.line(2, 11, 11, 2, PAL.soul5, 1);
  r1.set(5, 5, PAL.soul5);
  r1.set(7, 5, PAL.soul5);
  r1.applyOutline(PAL.outline);

  // rogue_2: Venom Fan (Three fanned throwing daggers with poisoned tips)
  const r2 = mk();
  // Left angled dagger
  r2.line(6, 11, 2, 3, PAL.steel3, 1);
  r2.set(2, 2, PAL.venom4);
  r2.set(3, 4, PAL.venom3);
  // Center vertical dagger
  r2.rect(6, 3, 2, 8, PAL.steel4);
  r2.rect(6, 2, 2, 2, PAL.venom4);
  r2.rect(5, 9, 4, 1, PAL.gold3);
  // Right angled dagger
  r2.line(7, 11, 11, 3, PAL.steel3, 1);
  r2.set(11, 2, PAL.venom4);
  r2.set(10, 4, PAL.venom3);
  r2.applyOutline(PAL.outline);

  // pyromancer_1: Cinder Pillar (Twin roaring fire columns)
  const p1 = mk();
  // Left pillar
  p1.rect(2, 5, 4, 7, PAL.ember1);
  p1.rect(3, 3, 2, 8, PAL.ember3);
  p1.rect(3, 6, 2, 5, PAL.ember5);
  // Right pillar
  p1.rect(8, 4, 4, 8, PAL.ember1);
  p1.rect(9, 2, 2, 9, PAL.ember3);
  p1.rect(9, 5, 2, 6, PAL.ember5);
  p1.applyOutline(PAL.outline);

  // pyromancer_2: Soul Nova (8-point exploding ember starburst ring)
  const p2 = mk();
  p2.line(7, 1, 7, 12, PAL.ember2, 2);
  p2.line(1, 7, 12, 7, PAL.ember2, 2);
  p2.line(3, 3, 11, 11, PAL.gold3, 1);
  p2.line(11, 3, 3, 11, PAL.gold3, 1);
  p2.shadedEllipse(7, 7, 3, 3, PAL.ember2, PAL.ember4, PAL.ember5);
  p2.applyOutline(PAL.outline);

  // templar_1: Heavensfall (Downward-plunging winged golden halberd + impact chevron)
  const t1 = mk();
  t1.rect(6, 1, 2, 9, PAL.gold3);
  t1.poly(
    [
      [4, 6],
      [7, 10],
      [10, 6],
      [7, 8],
    ],
    PAL.steel4,
  );
  t1.rect(5, 2, 4, 2, PAL.gold5);
  t1.line(2, 10, 7, 12, PAL.gold4, 1);
  t1.line(11, 10, 7, 12, PAL.gold4, 1);
  t1.applyOutline(PAL.outline);

  // templar_2: Consecrated Banner (Planted golden cross battle standard)
  const t2 = mk();
  t2.rect(6, 1, 2, 11, PAL.gold4);
  t2.rect(3, 3, 8, 1, PAL.gold4);
  t2.poly(
    [
      [4, 4],
      [10, 4],
      [10, 10],
      [7, 12],
      [4, 10],
    ],
    PAL.bone4,
  );
  t2.rect(6, 5, 2, 5, PAL.crimson3);
  t2.rect(5, 6, 4, 2, PAL.crimson3);
  t2.applyOutline(PAL.outline);

  // executioner_1: Chain Hook (Diagonal iron chain links ending in 3-clawed grappling hook)
  const e1 = mk();
  e1.line(2, 11, 8, 5, PAL.iron2, 2);
  e1.set(3, 10, PAL.steel4);
  e1.set(6, 7, PAL.steel4);
  // 3-claw hook head
  e1.poly(
    [
      [7, 4],
      [11, 2],
      [9, 6],
    ],
    PAL.steel4,
  );
  e1.line(8, 4, 5, 2, PAL.steel3, 1);
  e1.line(9, 5, 11, 8, PAL.steel3, 1);
  e1.set(11, 2, PAL.steel5);
  e1.applyOutline(PAL.outline);

  // executioner_2: Crimson Whirlwind (Spinning double-bitted crimson great-axe vortex)
  const e2 = mk();
  e2.shadedEllipse(7, 7, 5, 5, PAL.crimson2, PAL.crimson3, PAL.crimson4);
  e2.ellipse(7, 7, 3, 3, PAL.void);
  e2.poly(
    [
      [2, 5],
      [5, 7],
      [2, 9],
    ],
    PAL.steel4,
  );
  e2.poly(
    [
      [12, 5],
      [9, 7],
      [12, 9],
    ],
    PAL.steel4,
  );
  e2.rect(6, 3, 2, 8, PAL.iron3);
  e2.applyOutline(PAL.outline);

  // necromancer_1: Reap & Harvest (Curved spectral reaper scythe)
  const n1 = mk();
  n1.line(3, 11, 10, 3, PAL.wood2, 2);
  n1.poly(
    [
      [3, 2],
      [10, 2],
      [11, 4],
      [7, 4],
      [3, 6],
    ],
    PAL.venom3,
  );
  n1.line(3, 2, 10, 2, PAL.soul5, 1);
  n1.set(2, 4, PAL.soul4);
  n1.applyOutline(PAL.outline);

  // necromancer_2: Bone Legion (Horned skull wreathed in emerald soul-fire)
  const n2 = mk();
  n2.poly([[3, 5], [2, 2], [5, 4]], PAL.soul4);
  n2.poly([[11, 5], [12, 2], [9, 4]], PAL.soul4);
  n2.shadedEllipse(7, 6, 4, 4, PAL.bone2, PAL.bone3, PAL.bone4);
  n2.rect(5, 9, 4, 3, PAL.bone3);
  n2.set(5, 6, PAL.outline);
  n2.set(8, 6, PAL.outline);
  n2.set(6, 10, PAL.outline);
  n2.set(8, 10, PAL.outline);
  n2.applyOutline(PAL.outline);

  // roll: Winged iron greave boot with cyan speed lines
  const rl = mk();
  rl.rect(5, 3, 4, 6, PAL.iron2);
  rl.rect(5, 8, 7, 3, PAL.steel3);
  rl.rect(6, 4, 2, 4, PAL.steel4);
  // Wing & speed lines
  rl.poly([[5, 5], [2, 3], [4, 7]], PAL.soul4);
  rl.line(1, 9, 4, 9, PAL.soul5, 1);
  rl.line(2, 11, 4, 11, PAL.soul3, 1);
  rl.applyOutline(PAL.outline);

  return {
    knight_1: k1.toCanvas(),
    knight_2: k2.toCanvas(),
    rogue_1: r1.toCanvas(),
    rogue_2: r2.toCanvas(),
    pyromancer_1: p1.toCanvas(),
    pyromancer_2: p2.toCanvas(),
    templar_1: t1.toCanvas(),
    templar_2: t2.toCanvas(),
    executioner_1: e1.toCanvas(),
    executioner_2: e2.toCanvas(),
    necromancer_1: n1.toCanvas(),
    necromancer_2: n2.toCanvas(),
    roll: rl.toCanvas(),
  };
}
