import { PIXEL_SCALE } from '../core/constants.ts';
import type { EnemyAnimState, EnemyId } from '../core/types.ts';
import { PAL } from './palette.ts';
import { PixelBuffer } from './pixelBuffer.ts';
import { bakeAnimation, type SpriteSet } from './spriteAtlas.ts';

export interface EnemySpriteMetrics {
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
}

const ENEMY_LOGIC_METRICS: Record<EnemyId, EnemySpriteMetrics> = {
  skeleton: { w: 52, h: 48, anchorX: 26, anchorY: 44 },
  crossbowman: { w: 52, h: 48, anchorX: 26, anchorY: 44 },
  ghoul: { w: 52, h: 48, anchorX: 26, anchorY: 44 },
  plague_rat: { w: 44, h: 36, anchorX: 22, anchorY: 32 },
  gargoyle: { w: 60, h: 52, anchorX: 30, anchorY: 44 },
  frost_wraith: { w: 52, h: 52, anchorX: 26, anchorY: 46 },
  dark_knight: { w: 64, h: 56, anchorX: 32, anchorY: 51 },
  cultist: { w: 52, h: 52, anchorX: 26, anchorY: 46 },
  brute: { w: 72, h: 64, anchorX: 36, anchorY: 59 },
  mimic: { w: 48, h: 44, anchorX: 24, anchorY: 40 },
  boss_inquisitor: { w: 88, h: 80, anchorX: 44, anchorY: 73 },
  boss_warden: { w: 92, h: 84, anchorX: 46, anchorY: 77 },
  boss_sovereign: { w: 100, h: 92, anchorX: 50, anchorY: 85 },
};

function scaleMetrics(m: EnemySpriteMetrics): EnemySpriteMetrics {
  return {
    w: Math.round(m.w * PIXEL_SCALE),
    h: Math.round(m.h * PIXEL_SCALE),
    anchorX: Math.round(m.anchorX * PIXEL_SCALE),
    anchorY: Math.round(m.anchorY * PIXEL_SCALE),
  };
}

export const ENEMY_METRICS: Record<EnemyId, EnemySpriteMetrics> = {
  skeleton: scaleMetrics(ENEMY_LOGIC_METRICS.skeleton),
  crossbowman: scaleMetrics(ENEMY_LOGIC_METRICS.crossbowman),
  ghoul: scaleMetrics(ENEMY_LOGIC_METRICS.ghoul),
  plague_rat: scaleMetrics(ENEMY_LOGIC_METRICS.plague_rat),
  gargoyle: scaleMetrics(ENEMY_LOGIC_METRICS.gargoyle),
  frost_wraith: scaleMetrics(ENEMY_LOGIC_METRICS.frost_wraith),
  dark_knight: scaleMetrics(ENEMY_LOGIC_METRICS.dark_knight),
  cultist: scaleMetrics(ENEMY_LOGIC_METRICS.cultist),
  brute: scaleMetrics(ENEMY_LOGIC_METRICS.brute),
  mimic: scaleMetrics(ENEMY_LOGIC_METRICS.mimic),
  boss_inquisitor: scaleMetrics(ENEMY_LOGIC_METRICS.boss_inquisitor),
  boss_warden: scaleMetrics(ENEMY_LOGIC_METRICS.boss_warden),
  boss_sovereign: scaleMetrics(ENEMY_LOGIC_METRICS.boss_sovereign),
};

interface EnemyPose {
  state: EnemyAnimState;
  frame: number;
  progress: number; // 0..1 within state
}

function drawSkeleton(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;
  const bob = pose.state === 'idle' ? Math.round(Math.sin(p * Math.PI * 2)) : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 4) : 0;

  if (pose.state === 'death') {
    const t = p;
    buf.ellipse(cx, gy - 2, 7 + t * 4, 2, PAL.bone1);
    buf.rect(cx - 5, gy - 4, 4, 3, PAL.bone3);
    buf.rect(cx + 2, gy - 5 + Math.round(t * 2), 4, 4, PAL.steel2);
    buf.line(cx - 6, gy - 1, cx + 6, gy - 2, PAL.bone4);
    buf.applyOutline(PAL.outline);
    return;
  }

  const lean =
    pose.state === 'telegraph' ? -3 : pose.state === 'attack' ? 5 : pose.state === 'hurt' ? -4 : 1;
  const bx = cx + lean;
  const hipY = gy - 8 + bob;
  const shY = hipY - 9;

  // Articulated legs with knee joints & tattered crimson crypt tabard
  buf.drawArticulatedLimb(bx - 2, hipY, bx - 2 - stride, gy - 1, 2, PAL.bone1, PAL.bone3);
  buf.drawArticulatedLimb(bx + 2, hipY, bx + 2 + stride, gy - 1, 2, PAL.bone2, PAL.bone4);
  buf.poly([[bx - 2, hipY - 1], [bx + 3, hipY - 1], [bx + 2, hipY + 4], [bx - 1, hipY + 4]], PAL.crimson1);

  // Ribcage & rusted breastplate scrap
  buf.rect(bx - 3, shY, 6, 8, PAL.bone1);
  buf.rect(bx - 3, shY + 1, 6, 1, PAL.bone3);
  buf.rect(bx - 3, shY + 3, 6, 1, PAL.bone3);
  buf.rect(bx - 3, shY + 5, 6, 1, PAL.bone3);
  buf.rect(bx - 4, shY, 3, 5, PAL.steel1);
  buf.rect(bx - 4, hipY - 2, 7, 2, PAL.wood2);

  // Skull & pointed rusted morion helm with brow visor
  buf.shadedEllipse(bx + 1, shY - 5, 4, 4, PAL.bone1, PAL.bone3, PAL.bone4);
  buf.poly(
    [
      [bx - 5, shY - 6],
      [bx + 1, shY - 11],
      [bx + 6, shY - 6],
    ],
    PAL.steel1,
  );
  buf.rect(bx - 5, shY - 6, 11, 1, PAL.steel3);
  buf.set(bx + 1, shY - 11, PAL.steel4);
  buf.set(bx + 3, shY - 5, pose.state === 'telegraph' ? PAL.ember4 : PAL.soul4);
  buf.set(bx + 1, shY - 5, pose.state === 'telegraph' ? PAL.ember4 : PAL.soul4);

  // Offhand iron buckler shield
  buf.shadedEllipse(bx - 4, shY + 3, 3, 4, PAL.steel1, PAL.steel2, PAL.steel4);
  buf.set(bx - 4, shY + 3, PAL.gold3);

  // Arm + notched sword with crossguard & pommel
  const ang =
    pose.state === 'telegraph' ? -2.2 : pose.state === 'attack' ? 0.35 - p * 0.4 : -0.5;
  const hx = bx + 3 + Math.round(Math.cos(ang) * 4);
  const hy = shY + 2 + Math.round(Math.sin(ang) * 4);
  buf.drawArticulatedLimb(bx + 2, shY + 1, hx, hy, 2, PAL.bone2, PAL.bone4);
  const tx = hx + Math.round(Math.cos(ang) * 13);
  const ty = hy + Math.round(Math.sin(ang) * 13);
  buf.line(hx, hy, tx, ty, PAL.steel3, 2);
  buf.line(hx, hy, tx, ty, PAL.steel5, 1);
  const gx = Math.round(-Math.sin(ang) * 3);
  const gyOff = Math.round(Math.cos(ang) * 3);
  buf.line(hx - gx, hy - gyOff, hx + gx, hy + gyOff, PAL.gold3, 2);
  buf.set(hx - Math.round(Math.cos(ang) * 2), hy - Math.round(Math.sin(ang) * 2), PAL.gold4);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && pose.frame >= 1 && pose.frame <= 2) {
    buf.drawSlashArc(bx + 4, shY + 2, 16, -1.3, 0.9, 3, PAL.soul2, PAL.soul4, PAL.steel5);
  }
}

function drawCrossbowman(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.ellipse(cx, gy - 2, 8, 2, PAL.obsidian2);
    buf.line(cx - 5, gy - 3, cx + 6, gy - 1, PAL.wood3, 2);
    buf.applyOutline(PAL.outline);
    return;
  }

  const bob = pose.state === 'idle' ? Math.round(Math.sin(p * Math.PI * 2)) : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 3) : 0;
  const hipY = gy - 8 + bob;
  const shY = hipY - 10;

  // Tattered cloak + back bolt quiver with feathered fletching
  buf.drawCape(cx - 2, shY, cx - 5, gy - 2, 6, 10, p * 4, PAL.obsidian0, PAL.violet0, PAL.violet2);
  buf.line(cx - 5, shY - 2, cx - 2, shY + 6, PAL.wood2, 3);
  buf.set(cx - 6, shY - 3, PAL.crimson3);
  buf.set(cx - 4, shY - 3, PAL.bone4);
  buf.line(cx - 2, hipY, cx - 2 - stride, gy - 1, PAL.bone1, 2);
  buf.line(cx + 2, hipY, cx + 2 + stride, gy - 1, PAL.bone2, 2);

  // Tunic
  buf.rect(cx - 4, shY, 8, 10, PAL.obsidian1);
  buf.rect(cx - 3, shY + 1, 6, 7, PAL.wood1);
  buf.rect(cx - 4, hipY - 2, 8, 2, PAL.gold2);

  // Hooded skull head
  buf.shadedEllipse(cx, shY - 5, 5, 5, PAL.obsidian0, PAL.obsidian2, PAL.violet2);
  buf.rect(cx, shY - 6, 4, 4, PAL.bone3);
  buf.set(cx + 2, shY - 5, pose.state === 'telegraph' ? PAL.crimson4 : PAL.ember4);

  // Crossbow held forward
  const aimY = shY + 3;
  const aimX = cx + 4;
  buf.rect(aimX, aimY, 10, 2, PAL.wood3);
  buf.line(aimX + 8, aimY - 4, aimX + 8, aimY + 5, PAL.steel3, 2); // prod
  buf.line(aimX + 2, aimY + 1, aimX + 8, aimY - 4, PAL.steel4);
  buf.line(aimX + 2, aimY + 1, aimX + 8, aimY + 5, PAL.steel4);

  if (pose.state === 'telegraph') {
    // Glowing notched bolt
    buf.line(aimX + 4, aimY + 1, aimX + 13, aimY + 1, PAL.ember4, 2);
    buf.set(aimX + 14, aimY + 1, PAL.ember5);
  }

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && pose.frame === 1) {
    buf.line(aimX + 10, aimY + 1, aimX + 20, aimY + 1, PAL.ember4, 2);
  }
}

function drawGhoul(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.ellipse(cx, gy - 2, 9, 2, PAL.ghoul0);
    buf.rect(cx - 4, gy - 4, 7, 3, PAL.ghoul2);
    buf.applyOutline(PAL.outline);
    return;
  }

  const lunge = pose.state === 'attack' ? 6 : pose.state === 'telegraph' ? -4 : 0;
  const crouch = pose.state === 'telegraph' ? 3 : pose.state === 'attack' ? -2 : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 5) : 0;

  const bx = cx + lunge;
  const by = gy - 9 + crouch;

  // Hunched feral spine, dorsal bone spikes & tattered loincloth
  buf.shadedEllipse(bx - 1, by, 7, 5, PAL.ghoul0, PAL.ghoul1, PAL.ghoul2);
  buf.line(bx - 5, by - 4, bx - 6, by - 7, PAL.bone3);
  buf.line(bx - 2, by - 5, bx - 2, by - 8, PAL.bone4);
  buf.line(bx + 1, by - 5, bx + 2, by - 7, PAL.bone3);
  buf.rect(bx - 5, by + 2, 5, 3, PAL.wood1);

  // Scuttling hind & front claws
  buf.line(bx - 4, by + 2, bx - 6 - stride, gy - 1, PAL.ghoul1, 2);
  buf.line(bx + 2, by + 2, bx + 4 + stride, gy - 1, PAL.ghoul2, 2);

  // Snarling skull-like face
  buf.shadedEllipse(bx + 6, by - 2, 4, 4, PAL.ghoul0, PAL.ghoul2, PAL.ghoul3);
  buf.set(bx + 8, by - 3, pose.state === 'telegraph' ? PAL.crimson4 : PAL.ember4);
  buf.rect(bx + 6, by, 4, 2, PAL.crimson2);
  buf.set(bx + 7, by, PAL.bone4);
  buf.set(bx + 9, by, PAL.bone4);

  // Long slashing claws
  const clawAngle = pose.state === 'telegraph' ? -1.8 : pose.state === 'attack' ? 0.3 : 0.7;
  const hx = bx + 6 + Math.round(Math.cos(clawAngle) * 6);
  const hy = by + 1 + Math.round(Math.sin(clawAngle) * 6);
  buf.line(bx + 4, by + 1, hx, hy, PAL.ghoul2, 2);
  buf.line(hx, hy, hx + 4, hy + 1, PAL.crimson3);
  buf.line(hx, hy + 1, hx + 3, hy + 3, PAL.bone4);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 7, by, 13, -1.0, 1.0, 2, PAL.crimson2, PAL.crimson4, PAL.bone4);
  }
}

function drawGargoyle(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const p = pose.progress;
  const flap = Math.sin(p * Math.PI * 2);
  const hoverY = 23 + Math.round(flap * 3);

  if (pose.state === 'death') {
    buf.ellipse(cx, m.anchorY - 2, 10, 3, PAL.stone1);
    buf.poly(
      [
        [cx - 8, m.anchorY - 3],
        [cx - 3, m.anchorY - 7],
        [cx + 6, m.anchorY - 2],
      ],
      PAL.stone3,
    );
    buf.applyOutline(PAL.outline);
    return;
  }

  const swoopX = pose.state === 'attack' ? 5 : pose.state === 'telegraph' ? -3 : 0;
  const bx = cx + swoopX;
  const wingTipY = hoverY - 12 + Math.round(flap * 8);

  // Bat wings (back + front membrane)
  buf.poly(
    [
      [bx - 2, hoverY - 2],
      [bx - 16, wingTipY],
      [bx - 13, hoverY + 4],
      [bx - 4, hoverY + 4],
    ],
    PAL.obsidian2,
  );
  buf.line(bx - 2, hoverY - 2, bx - 16, wingTipY, PAL.stone4, 2);
  buf.set(bx - 17, wingTipY - 1, PAL.bone3); // wingtip claw

  buf.poly(
    [
      [bx + 2, hoverY - 2],
      [bx + 15, wingTipY + 2],
      [bx + 12, hoverY + 5],
      [bx + 3, hoverY + 4],
    ],
    PAL.stone1,
  );
  buf.line(bx + 2, hoverY - 2, bx + 15, wingTipY + 2, PAL.stone4, 2);
  buf.set(bx + 16, wingTipY + 1, PAL.bone3);

  // Stone-armored torso, chest rune & dangling talons
  buf.shadedEllipse(bx, hoverY + 1, 5, 7, PAL.stone0, PAL.stone2, PAL.stone4);
  buf.set(bx + 1, hoverY, PAL.crimson3);
  buf.set(bx + 1, hoverY + 2, PAL.crimson4);
  buf.line(bx - 2, hoverY + 7, bx - 3, hoverY + 13, PAL.stone3, 2);
  buf.line(bx + 2, hoverY + 7, bx + 5, hoverY + 12, PAL.stone3, 2);

  // Horned gargoyle head
  buf.shadedEllipse(bx + 2, hoverY - 7, 4, 4, PAL.stone1, PAL.stone3, PAL.stone5);
  buf.line(bx, hoverY - 10, bx - 4, hoverY - 15, PAL.stone4, 2);
  buf.line(bx + 3, hoverY - 10, bx + 6, hoverY - 15, PAL.stone4, 2);
  buf.set(bx + 4, hoverY - 7, pose.state === 'telegraph' ? PAL.ember4 : PAL.crimson4);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 5, hoverY + 3, 14, -0.7, 1.3, 3, PAL.crimson1, PAL.crimson4, PAL.ember5);
  }
}

function drawDarkKnight(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.rect(cx - 9, gy - 4, 18, 4, PAL.iron1);
    buf.rect(cx - 5, gy - 6, 9, 4, PAL.iron3);
    buf.line(cx - 12, gy - 2, cx + 10, gy - 2, PAL.steel4);
    buf.applyOutline(PAL.outline);
    return;
  }

  const bob = pose.state === 'idle' ? Math.round(Math.sin(p * Math.PI * 2)) : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 3) : 0;
  const bx = cx + (pose.state === 'attack' ? 5 : pose.state === 'telegraph' ? -2 : 0);
  const hipY = gy - 10 + bob;
  const shY = hipY - 13;

  // Dark crimson cape
  buf.drawCape(bx - 4, shY, bx - 10, gy - 3, 7, 12, p * 4, PAL.crimson0, PAL.crimson1, PAL.crimson3);

  // Heavy greaves
  buf.line(bx - 3, hipY, bx - 3 - stride, gy - 1, PAL.iron1, 4);
  buf.line(bx + 3, hipY, bx + 3 + stride, gy - 1, PAL.iron2, 4);

  // Black plate armor & layered waist tassets
  buf.rect(bx - 6, shY, 12, 13, PAL.iron0);
  buf.rect(bx - 5, shY + 1, 10, 11, PAL.iron2);
  buf.rect(bx - 5, shY + 1, 4, 9, PAL.iron3);
  buf.rect(bx - 6, hipY - 2, 12, 2, PAL.gold2);
  buf.rect(bx - 6, hipY, 4, 3, PAL.iron2);
  buf.rect(bx + 2, hipY, 4, 3, PAL.iron3);

  // Horned dark helm & flowing crimson crest plume
  buf.line(bx - 1, shY - 11, bx - 8, shY - 12 + bob, PAL.crimson2, 2);
  buf.shadedEllipse(bx + 1, shY - 6, 5, 5, PAL.iron0, PAL.iron2, PAL.iron4);
  buf.line(bx - 3, shY - 9, bx - 7, shY - 15, PAL.steel3, 2);
  buf.line(bx + 3, shY - 9, bx + 7, shY - 15, PAL.steel3, 2);
  buf.rect(bx + 2, shY - 6, 4, 2, PAL.outline);
  buf.set(bx + 4, shY - 6, pose.state === 'telegraph' ? PAL.ember5 : PAL.crimson4);

  // Halberd
  const ang = pose.state === 'telegraph' ? -2.1 : pose.state === 'attack' ? 0.25 : -1.1;
  const sx = bx - 2;
  const sy = shY + 2;
  const tx = sx + Math.round(Math.cos(ang) * 20);
  const ty = sy + Math.round(Math.sin(ang) * 20);
  buf.line(sx - Math.cos(ang) * 5, sy - Math.sin(ang) * 5, tx, ty, PAL.wood2, 2);
  buf.poly(
    [
      [tx, ty],
      [tx + 4, ty - 4],
      [tx + 6, ty + 2],
    ],
    PAL.steel4,
  );

  // Tower Shield held forward
  const shieldX = bx + (pose.state === 'attack' ? 3 : 7);
  const shieldY = shY + 5;
  buf.rect(shieldX - 3, shieldY - 7, 6, 15, PAL.iron1);
  buf.rect(shieldX - 2, shieldY - 6, 4, 13, PAL.iron3);
  buf.rect(shieldX - 1, shieldY - 4, 2, 9, PAL.gold3);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 6, shY + 2, 20, -1.5, 0.9, 3, PAL.crimson2, PAL.crimson4, PAL.steel5);
  }
}

function drawCultist(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const p = pose.progress;
  const floatY = m.anchorY - 10 + Math.round(Math.sin(p * Math.PI * 2) * 2);

  if (pose.state === 'death') {
    buf.ellipse(cx, m.anchorY - 2, 8, 2, PAL.crimson1);
    buf.set(cx, m.anchorY - 8 - Math.round(p * 14), PAL.crimson4);
    buf.applyOutline(PAL.outline);
    return;
  }

  // Flowing dark-crimson cultist robes (levitating)
  buf.poly(
    [
      [cx - 4, floatY - 14],
      [cx + 4, floatY - 14],
      [cx + 7, floatY + 2],
      [cx - 7, floatY + 2],
    ],
    PAL.crimson0,
  );
  buf.poly(
    [
      [cx - 3, floatY - 13],
      [cx + 3, floatY - 13],
      [cx + 5, floatY + 1],
      [cx - 5, floatY + 1],
    ],
    PAL.crimson2,
  );
  buf.rect(cx - 4, floatY - 13, 8, 2, PAL.gold3);

  // Bone skull mask + tall crimson mitre hood
  buf.poly(
    [
      [cx - 4, floatY - 18],
      [cx, floatY - 26],
      [cx + 4, floatY - 18],
    ],
    PAL.crimson1,
  );
  buf.shadedEllipse(cx + 1, floatY - 18, 4, 4, PAL.bone1, PAL.bone3, PAL.bone4);
  buf.set(cx + 2, floatY - 18, pose.state === 'telegraph' ? PAL.ember5 : PAL.crimson4);

  // Floating cursed grimoire + blood orb
  const orbX = cx + 9;
  const orbY = floatY - 10;
  buf.rect(cx - 10, floatY - 12, 5, 6, PAL.wood2);
  buf.rect(cx - 9, floatY - 11, 3, 4, PAL.bone4);
  buf.set(cx - 8, floatY - 10, PAL.crimson3);
  buf.line(cx + 3, floatY - 11, orbX - 2, orbY, PAL.crimson2, 2);
  if (pose.state === 'telegraph' || pose.state === 'attack') {
    buf.shadedEllipse(orbX, orbY, 4, 4, PAL.crimson2, PAL.crimson4, PAL.ember5);
  } else {
    buf.shadedEllipse(orbX, orbY, 2, 2, PAL.crimson1, PAL.crimson3, PAL.crimson4);
  }

  buf.applyOutline(PAL.outline);
}

function drawBrute(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.ellipse(cx, gy - 4, 14, 4, PAL.iron1);
    buf.rect(cx - 10, gy - 7, 16, 5, PAL.bone2);
    buf.applyOutline(PAL.outline);
    return;
  }

  const bob = pose.state === 'idle' ? Math.round(Math.sin(p * Math.PI * 2)) : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 4) : 0;
  const bx = cx + (pose.state === 'attack' ? 6 : pose.state === 'telegraph' ? -4 : 0);
  const hipY = gy - 12 + bob;
  const shY = hipY - 16;

  // Massive legs
  buf.line(bx - 5, hipY, bx - 5 - stride, gy - 1, PAL.iron1, 5);
  buf.line(bx + 4, hipY, bx + 4 + stride, gy - 1, PAL.iron2, 5);

  // Hulking torso, spiked pauldrons, chains & skull belt buckle
  buf.shadedEllipse(bx, shY + 8, 10, 9, PAL.skin0, PAL.skin1, PAL.skin2);
  buf.rect(bx - 10, shY, 20, 6, PAL.iron2); // shoulder armor plate
  buf.rect(bx - 8, shY - 1, 16, 2, PAL.iron4);
  buf.set(bx - 10, shY - 2, PAL.steel4);
  buf.set(bx + 9, shY - 2, PAL.steel4);
  buf.line(bx - 8, shY + 5, bx + 7, hipY - 1, PAL.steel3, 2); // iron chain bandolier
  buf.rect(bx - 3, hipY - 2, 6, 3, PAL.bone3);
  buf.set(bx - 1, hipY - 1, PAL.outline);
  buf.set(bx + 1, hipY - 1, PAL.outline);

  // Horned brute head
  buf.shadedEllipse(bx + 2, shY - 5, 5, 5, PAL.iron0, PAL.iron2, PAL.iron4);
  buf.line(bx - 2, shY - 7, bx - 7, shY - 12, PAL.bone3, 2);
  buf.line(bx + 5, shY - 7, bx + 10, shY - 12, PAL.bone3, 2);
  buf.set(bx + 4, shY - 5, pose.state === 'telegraph' ? PAL.ember5 : PAL.crimson4);

  // Colossal spiked iron mace
  const ang = pose.state === 'telegraph' ? -2.3 : pose.state === 'attack' ? 0.55 : -0.8;
  const sx = bx + 6;
  const sy = shY + 3;
  const hx = sx + Math.round(Math.cos(ang) * 16);
  const hy = sy + Math.round(Math.sin(ang) * 16);
  buf.line(sx, sy, hx, hy, PAL.wood2, 3);
  buf.shadedEllipse(hx, hy, 6, 6, PAL.iron0, PAL.iron2, PAL.iron4);
  // Spikes
  buf.set(hx + 6, hy, PAL.steel4);
  buf.set(hx - 6, hy, PAL.steel4);
  buf.set(hx, hy - 6, PAL.steel4);
  buf.set(hx, hy + 6, PAL.steel4);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 6, shY + 6, 23, -1.8, 0.9, 4, PAL.ember1, PAL.ember3, PAL.ember5);
  }
}

function drawBossWarden(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.ellipse(cx, gy - 3, 18, 4, PAL.soul1);
    buf.rect(cx - 12, gy - 8, 22, 6, PAL.steel1);
    buf.shadedEllipse(cx, gy - 14 - Math.round(p * 18), 4, 4, PAL.soul2, PAL.soul4, PAL.soul5);
    buf.applyOutline(PAL.outline);
    return;
  }

  const hover = Math.round(Math.sin(p * Math.PI * 2) * 2);
  const bx = cx + (pose.state === 'attack' ? 7 : pose.state === 'telegraph' ? -5 : 0);
  const hipY = gy - 18 + hover;
  const shY = hipY - 22;

  // Spectral tattered phantom cape
  buf.drawCape(bx - 5, shY, bx - 16, gy - 4, 12, 20, p * 5, PAL.soul0, PAL.soul1, PAL.soul3);

  // Armored lower legs / spectral greaves with knee guards
  buf.line(bx - 5, hipY, bx - 7, gy - 2, PAL.steel0, 5);
  buf.line(bx + 5, hipY, bx + 7, gy - 2, PAL.steel1, 5);
  buf.rect(bx - 7, hipY + 5, 4, 3, PAL.soul3);
  buf.rect(bx + 4, hipY + 5, 4, 3, PAL.soul4);

  // Giant hollowed chest plate with glowing cyan Soul Core
  buf.rect(bx - 10, shY, 20, 21, PAL.steel0);
  buf.rect(bx - 9, shY + 1, 18, 19, PAL.steel2);
  buf.rect(bx - 4, shY + 5, 8, 9, PAL.outline);
  buf.shadedEllipse(bx, shY + 9, 3, 4, PAL.soul2, PAL.soul4, PAL.soul5);

  // Towering pauldrons
  buf.shadedEllipse(bx - 11, shY + 2, 6, 5, PAL.steel0, PAL.steel2, PAL.steel4);
  buf.shadedEllipse(bx + 11, shY + 2, 6, 5, PAL.steel1, PAL.steel3, PAL.steel5);

  // Crowned hollow helm
  buf.shadedEllipse(bx + 1, shY - 8, 6, 7, PAL.steel0, PAL.steel2, PAL.steel4);
  buf.line(bx - 4, shY - 13, bx - 5, shY - 20, PAL.soul4, 2);
  buf.line(bx + 1, shY - 14, bx + 1, shY - 22, PAL.soul5, 2);
  buf.line(bx + 5, shY - 13, bx + 6, shY - 20, PAL.soul4, 2);
  buf.rect(bx + 1, shY - 9, 5, 2, PAL.outline);
  buf.set(bx + 3, shY - 9, pose.state === 'telegraph' ? PAL.ember4 : PAL.soul5);

  // Chained lantern-flail on back arm
  const lx = bx - 16;
  const ly = shY + 14 + Math.round(Math.cos(p * Math.PI * 2) * 3);
  buf.line(bx - 10, shY + 6, lx, ly, PAL.steel3);
  buf.shadedEllipse(lx, ly, 4, 5, PAL.soul1, PAL.soul3, PAL.soul5);

  // Colossal spectral greatsword with crossguard
  const ang = pose.state === 'telegraph' ? -2.2 : pose.state === 'attack' ? 0.35 : -0.8;
  const hx = bx + 10;
  const hy = shY + 7;
  const tx = hx + Math.round(Math.cos(ang) * 28);
  const ty = hy + Math.round(Math.sin(ang) * 28);
  buf.line(hx, hy, tx, ty, PAL.soul3, 3);
  buf.line(hx, hy, tx, ty, PAL.soul5, 1);
  const gx = Math.round(-Math.sin(ang) * 5);
  const gyOff = Math.round(Math.cos(ang) * 5);
  buf.line(hx - gx, hy - gyOff, hx + gx, hy + gyOff, PAL.steel4, 2);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 6, shY + 8, 30, -1.7, 1.0, 5, PAL.soul2, PAL.soul4, PAL.soul5);
  }
}

function drawBossSovereign(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.ellipse(cx, gy - 4, 20, 5, PAL.crimson1);
    buf.rect(cx - 12, gy - 10, 24, 7, PAL.gold2);
    buf.shadedEllipse(cx, gy - 16 - Math.round(p * 20), 5, 5, PAL.ember2, PAL.ember4, PAL.ember5);
    buf.applyOutline(PAL.outline);
    return;
  }

  const bob = Math.round(Math.sin(p * Math.PI * 2) * 2);
  const bx = cx + (pose.state === 'attack' ? 8 : pose.state === 'telegraph' ? -6 : 0);
  const hipY = gy - 20 + bob;
  const shY = hipY - 25;

  // Majestic crimson & gold royal cape
  buf.drawCape(bx - 6, shY, bx - 18, gy - 3, 14, 24, p * 4.5, PAL.crimson0, PAL.crimson2, PAL.gold3);

  // Obsidian Demon Greaves with gold knee plates
  buf.line(bx - 6, hipY, bx - 7, gy - 2, PAL.obsidian1, 6);
  buf.line(bx + 6, hipY, bx + 7, gy - 2, PAL.obsidian2, 6);
  buf.rect(bx - 8, hipY + 6, 4, 3, PAL.gold3);
  buf.rect(bx + 4, hipY + 6, 4, 3, PAL.gold4);

  // Obsidian & Gold Armor Cuirass
  buf.rect(bx - 12, shY, 24, 24, PAL.obsidian0);
  buf.rect(bx - 11, shY + 1, 22, 22, PAL.obsidian2);
  buf.rect(bx - 8, shY + 4, 16, 4, PAL.gold3);
  buf.rect(bx - 4, shY + 10, 8, 8, PAL.crimson2);
  buf.shadedEllipse(bx, shY + 14, 3, 3, PAL.ember2, PAL.ember4, PAL.ember5);

  // Winged Gold Pauldrons
  buf.shadedEllipse(bx - 13, shY + 2, 7, 6, PAL.gold1, PAL.gold3, PAL.gold4);
  buf.shadedEllipse(bx + 13, shY + 2, 7, 6, PAL.gold1, PAL.gold3, PAL.gold4);

  // Demon King horned crown & blazing eyes
  buf.shadedEllipse(bx + 1, shY - 9, 7, 7, PAL.obsidian0, PAL.obsidian2, PAL.crimson2);
  buf.line(bx - 5, shY - 14, bx - 11, shY - 24, PAL.gold4, 3);
  buf.line(bx + 6, shY - 14, bx + 12, shY - 24, PAL.gold4, 3);
  buf.rect(bx - 4, shY - 16, 10, 3, PAL.gold3);
  buf.set(bx + 2, shY - 9, PAL.ember5);
  buf.set(bx + 5, shY - 9, PAL.ember5);

  // Giant Flaming Claymore with ornate gold crossguard
  const ang = pose.state === 'telegraph' ? -2.3 : pose.state === 'attack' ? 0.45 : -0.7;
  const hx = bx + 12;
  const hy = shY + 8;
  const tx = hx + Math.round(Math.cos(ang) * 32);
  const ty = hy + Math.round(Math.sin(ang) * 32);
  buf.line(hx, hy, tx, ty, PAL.crimson2, 4);
  buf.line(hx, hy, tx, ty, PAL.ember4, 2);
  buf.line(hx, hy, tx, ty, PAL.ember5, 1);
  const gx = Math.round(-Math.sin(ang) * 6);
  const gyOff = Math.round(Math.cos(ang) * 6);
  buf.line(hx - gx, hy - gyOff, hx + gx, hy + gyOff, PAL.gold3, 3);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 8, shY + 8, 34, -1.9, 1.1, 5, PAL.crimson2, PAL.ember3, PAL.ember5);
  }
}

function drawPlagueRat(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.ellipse(cx, gy - 2, 7, 2, PAL.venom1);
    buf.set(cx + 3, gy - 5 - Math.round(p * 8), PAL.venom3);
    buf.applyOutline(PAL.outline);
    return;
  }

  const lunge = pose.state === 'attack' ? 5 : pose.state === 'telegraph' ? -3 : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 3) : 0;
  const bx = cx + lunge;
  const by = gy - 6 + (pose.state === 'attack' ? -2 : 0);

  // Segmented whipping tail with dark rings
  const tailY = by - 1 + Math.round(Math.sin(p * 6) * 2);
  buf.line(bx - 6, by + 1, bx - 14, tailY, PAL.crimson2, 2);
  buf.set(bx - 9, by, PAL.crimson0);
  buf.set(bx - 12, tailY, PAL.crimson0);
  // Paws
  buf.line(bx - 4, by + 2, bx - 5 - stride, gy - 1, PAL.ghoul1, 2);
  buf.line(bx + 3, by + 2, bx + 5 + stride, gy - 1, PAL.ghoul2, 2);

  // Hunched fur body + glowing venom pustules
  buf.shadedEllipse(bx, by, 6, 4, PAL.obsidian1, PAL.wood1, PAL.ghoul2);
  buf.rect(bx - 3, by - 4, 2, 2, PAL.venom3);
  buf.rect(bx + 1, by - 4, 2, 2, PAL.venom4);

  // Snout, ear & glowing fangs
  buf.shadedEllipse(bx + 6, by + 1, 4, 3, PAL.wood1, PAL.ghoul2, PAL.ghoul3);
  buf.ellipse(bx + 4, by - 3, 2, 2, PAL.crimson2);
  buf.set(bx + 8, by, pose.state === 'telegraph' ? PAL.ember5 : PAL.venom4);
  buf.set(bx + 9, by + 2, PAL.bone4);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 8, by + 1, 10, -0.9, 0.9, 2, PAL.venom2, PAL.venom4, PAL.bone4);
  }
}

function drawFrostWraith(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const p = pose.progress;
  const hover = m.anchorY - 12 + Math.round(Math.sin(p * Math.PI * 2) * 3);

  if (pose.state === 'death') {
    buf.ellipse(cx, m.anchorY - 2, 7, 2, PAL.soul2);
    buf.set(cx, m.anchorY - 10 - Math.round(p * 14), PAL.soul5);
    buf.applyOutline(PAL.outline);
    return;
  }

  // Flowing tattered spectral ice-shroud
  buf.drawCape(cx - 2, hover - 14, cx - 5, hover + 5, 7, 13, p * 5, PAL.soul0, PAL.soul2, PAL.soul4);
  buf.poly(
    [
      [cx - 4, hover - 13],
      [cx + 4, hover - 13],
      [cx + 6, hover + 2],
      [cx - 6, hover + 2],
    ],
    PAL.soul1,
  );
  // Wailing skull-hood
  buf.shadedEllipse(cx + 1, hover - 17, 5, 5, PAL.soul0, PAL.soul3, PAL.soul5);
  buf.rect(cx + 1, hover - 18, 3, 2, PAL.outline);
  buf.set(cx + 3, hover - 18, pose.state === 'telegraph' ? PAL.ember5 : PAL.soul5);
  // Open wailing mouth in telegraph/attack
  if (pose.state === 'telegraph' || pose.state === 'attack') {
    buf.rect(cx + 2, hover - 15, 2, 2, PAL.outline);
  }
  // Outstretched frost claws + orbiting ice crystals
  buf.line(cx + 3, hover - 10, cx + 11, hover - 12, PAL.soul4, 2);
  buf.line(cx + 3, hover - 7, cx + 10, hover - 6, PAL.soul3, 2);
  const cryY = hover - 12 + Math.round(Math.cos(p * Math.PI * 2) * 3);
  buf.poly([[cx - 9, cryY], [cx - 7, cryY - 3], [cx - 5, cryY], [cx - 7, cryY + 3]], PAL.soul4);
  buf.poly([[cx + 10, cryY + 6], [cx + 12, cryY + 3], [cx + 14, cryY + 6], [cx + 12, cryY + 9]], PAL.soul5);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(cx + 8, hover - 10, 14, -1.2, 1.2, 2, PAL.soul2, PAL.soul4, PAL.soul5);
  }
}

function drawMimic(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.rect(cx - 8, gy - 6, 16, 5, PAL.wood1);
    buf.rect(cx - 6, gy - 4, 12, 2, PAL.gold3);
    buf.applyOutline(PAL.outline);
    return;
  }

  // Disguised chest in idle (with subtle breathing lid twitch!)
  if (pose.state === 'idle') {
    const twitch = pose.frame === 2 ? -1 : 0;
    buf.rect(cx - 9, gy - 12, 18, 12, PAL.wood1);
    buf.rect(cx - 8, gy - 11, 16, 10, PAL.wood2);
    buf.rect(cx - 9, gy - 13 + twitch, 18, 3, PAL.gold2);
    buf.rect(cx - 8, gy - 12 + twitch, 16, 1, PAL.gold4);
    buf.rect(cx - 2, gy - 9, 4, 5, PAL.gold3);
    if (pose.frame === 2) {
      buf.set(cx - 3, gy - 10, PAL.crimson4);
      buf.set(cx + 3, gy - 10, PAL.crimson4);
    } else {
      buf.set(cx, gy - 7, PAL.soul4);
    }
    buf.applyOutline(PAL.outline);
    return;
  }

  // Revealed toothy Mimic monster!
  const hop = pose.state === 'move' ? Math.abs(Math.round(Math.sin(p * Math.PI * 2) * 3)) : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 3) : 0;
  const bx = cx + (pose.state === 'attack' ? 4 : 0);
  const by = gy - 4 - hop;

  // Spider-wood legs
  buf.line(bx - 7, by - 2, bx - 10 - stride, gy - 1, PAL.wood3, 2);
  buf.line(bx + 6, by - 2, bx + 10 + stride, gy - 1, PAL.wood3, 2);

  // Lower jaw chest box + iron corner brackets & keyhole plate
  buf.rect(bx - 9, by - 7, 18, 7, PAL.wood1);
  buf.rect(bx - 8, by - 6, 16, 5, PAL.gold2);
  buf.rect(bx - 9, by - 7, 3, 7, PAL.steel2);
  buf.rect(bx + 6, by - 7, 3, 7, PAL.steel2);
  buf.rect(bx - 2, by - 6, 4, 4, PAL.gold3);
  buf.set(bx, by - 4, PAL.soul4);

  // Snapping upper chest lid
  const jawOpen = pose.state === 'telegraph' ? 7 : pose.state === 'attack' ? 4 : 5;
  buf.rect(bx - 9, by - 12 - jawOpen, 18, 5, PAL.wood2);
  buf.rect(bx - 9, by - 13 - jawOpen, 18, 2, PAL.gold4);

  // Jagged ivory fangs & glowing red eyes inside maw
  buf.rect(bx - 7, by - 7 - jawOpen, 14, jawOpen, PAL.crimson0);
  for (let tx = bx - 6; tx <= bx + 6; tx += 3) {
    buf.set(tx, by - 7, PAL.bone4);
    buf.set(tx, by - 8 - jawOpen + 1, PAL.bone4);
  }
  buf.set(bx - 3, by - 9 - Math.floor(jawOpen * 0.5), PAL.ember4);
  buf.set(bx + 3, by - 9 - Math.floor(jawOpen * 0.5), PAL.ember4);
  // Lashing crimson tongue
  buf.line(bx + 2, by - 6, bx + 11, by - 5 + (pose.frame % 2), PAL.crimson4, 2);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 7, by - 7, 13, -1.1, 1.1, 3, PAL.crimson2, PAL.crimson4, PAL.bone4);
  }
}

function drawBossInquisitor(buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose): void {
  const cx = m.anchorX;
  const gy = m.anchorY;
  const p = pose.progress;

  if (pose.state === 'death') {
    buf.ellipse(cx, gy - 3, 18, 4, PAL.ember1);
    buf.rect(cx - 12, gy - 9, 24, 6, PAL.iron2);
    buf.shadedEllipse(cx, gy - 14 - Math.round(p * 16), 4, 4, PAL.ember2, PAL.ember4, PAL.ember5);
    buf.applyOutline(PAL.outline);
    return;
  }

  const bob = pose.state === 'idle' ? Math.round(Math.sin(p * Math.PI * 2)) : 0;
  const stride = pose.state === 'move' ? Math.round(Math.sin(p * Math.PI * 2) * 4) : 0;
  const bx = cx + (pose.state === 'attack' ? 7 : pose.state === 'telegraph' ? -5 : 0);
  const hipY = gy - 15 + bob;
  const shY = hipY - 22;

  // Crimson Inquisitor Mantle
  buf.drawCape(bx - 5, shY, bx - 15, gy - 3, 11, 19, p * 4.5, PAL.crimson0, PAL.crimson2, PAL.gold3);

  // Iron greaves with brass knee plates
  buf.line(bx - 5, hipY, bx - 5 - stride, gy - 1, PAL.iron1, 5);
  buf.line(bx + 5, hipY, bx + 5 + stride, gy - 1, PAL.iron2, 5);
  buf.rect(bx - 7, hipY + 4, 4, 3, PAL.gold3);
  buf.rect(bx + 3, hipY + 4, 4, 3, PAL.gold3);

  // Heavy Iron Breastplate + Brass Inquisitor Cross
  buf.rect(bx - 10, shY, 20, 21, PAL.iron0);
  buf.rect(bx - 9, shY + 1, 18, 19, PAL.iron2);
  buf.rect(bx - 2, shY + 4, 4, 13, PAL.gold3);
  buf.rect(bx - 6, shY + 7, 12, 3, PAL.gold3);

  // Tall Pointed Iron Mitre-Helm + Ember Slit
  buf.poly(
    [
      [bx - 6, shY - 2],
      [bx + 1, shY - 19],
      [bx + 7, shY - 2],
    ],
    PAL.iron1,
  );
  buf.rect(bx - 5, shY - 6, 10, 5, PAL.iron3);
  buf.rect(bx + 1, shY - 5, 5, 2, PAL.outline);
  buf.set(bx + 3, shY - 5, pose.state === 'telegraph' ? PAL.ember5 : PAL.ember4);

  // Colossal Chained Blazing Censer-Flail
  const ang = pose.state === 'telegraph' ? -2.2 : pose.state === 'attack' ? 0.45 : -0.75;
  const hx = bx + 9;
  const hy = shY + 6;
  const ballX = hx + Math.round(Math.cos(ang) * 24);
  const ballY = hy + Math.round(Math.sin(ang) * 24);
  buf.line(hx, hy, ballX, ballY, PAL.steel3, 2);
  buf.shadedEllipse(ballX, ballY, 6, 6, PAL.ember1, PAL.ember3, PAL.ember5);
  buf.set(ballX, ballY - 6, PAL.ember4);

  buf.applyOutline(PAL.outline);
  if (pose.state === 'attack' && (pose.frame === 1 || pose.frame === 2)) {
    buf.drawSlashArc(bx + 8, shY + 8, 28, -1.8, 1.0, 4, PAL.ember1, PAL.ember3, PAL.ember5);
  }
}

type EnemyDrawer = (buf: PixelBuffer, m: EnemySpriteMetrics, pose: EnemyPose) => void;

const ENEMY_DRAWERS: Record<EnemyId, EnemyDrawer> = {
  skeleton: drawSkeleton,
  crossbowman: drawCrossbowman,
  ghoul: drawGhoul,
  plague_rat: drawPlagueRat,
  gargoyle: drawGargoyle,
  frost_wraith: drawFrostWraith,
  dark_knight: drawDarkKnight,
  cultist: drawCultist,
  brute: drawBrute,
  mimic: drawMimic,
  boss_inquisitor: drawBossInquisitor,
  boss_warden: drawBossWarden,
  boss_sovereign: drawBossSovereign,
};

const ENEMY_RIM_COLORS: Record<EnemyId, string> = {
  skeleton: PAL.bone4,
  crossbowman: PAL.violet3,
  ghoul: PAL.moss4,
  plague_rat: PAL.venom3,
  gargoyle: PAL.stone4,
  frost_wraith: PAL.soul5,
  dark_knight: PAL.steel5,
  cultist: PAL.crimson4,
  brute: PAL.bone3,
  mimic: PAL.gold4,
  boss_inquisitor: PAL.ember4,
  boss_warden: PAL.soul5,
  boss_sovereign: PAL.crimson4,
};

const ENEMY_GLOW_EXCLUDE = new Set<string>([
  PAL.soul4,
  PAL.soul5,
  PAL.ember4,
  PAL.ember5,
  PAL.crimson4,
  PAL.crimson5,
  PAL.venom4,
  PAL.gold4,
]);

function buildEnemyAnimations(id: EnemyId): SpriteSet<EnemyAnimState> {
  const m = ENEMY_LOGIC_METRICS[id];
  const drawer = ENEMY_DRAWERS[id];

  const mkState = (state: EnemyAnimState, count: number, fps: number, loop: boolean) => {
    const bufs: PixelBuffer[] = [];
    for (let i = 0; i < count; i++) {
      const buf = new PixelBuffer(m.w, m.h, PIXEL_SCALE);
      drawer(buf, m, {
        state,
        frame: i,
        progress: count <= 1 ? 0 : i / (count - 1),
      });
      if (state !== 'death' && !(id.startsWith('boss_') && state === 'attack')) {
        buf.applyTopRim(ENEMY_RIM_COLORS[id], ENEMY_GLOW_EXCLUDE);
      }
      bufs.push(buf);
    }
    return bakeAnimation(bufs, fps, loop);
  };

  return {
    idle: mkState('idle', 4, 5, true),
    move: mkState('move', 6, 10, true),
    telegraph: mkState('telegraph', 3, 8, false),
    attack: mkState('attack', 4, 13, false),
    hurt: mkState('hurt', 2, 12, false),
    death: mkState('death', 5, 8, false),
  };
}

export function bakeAllEnemySprites(): Record<EnemyId, SpriteSet<EnemyAnimState>> {
  return {
    skeleton: buildEnemyAnimations('skeleton'),
    crossbowman: buildEnemyAnimations('crossbowman'),
    ghoul: buildEnemyAnimations('ghoul'),
    plague_rat: buildEnemyAnimations('plague_rat'),
    gargoyle: buildEnemyAnimations('gargoyle'),
    frost_wraith: buildEnemyAnimations('frost_wraith'),
    dark_knight: buildEnemyAnimations('dark_knight'),
    cultist: buildEnemyAnimations('cultist'),
    brute: buildEnemyAnimations('brute'),
    mimic: buildEnemyAnimations('mimic'),
    boss_inquisitor: buildEnemyAnimations('boss_inquisitor'),
    boss_warden: buildEnemyAnimations('boss_warden'),
    boss_sovereign: buildEnemyAnimations('boss_sovereign'),
  };
}
