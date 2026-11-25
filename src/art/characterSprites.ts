import { PIXEL_SCALE } from '../core/constants.ts';
import type { CharacterAnimState, CharacterId } from '../core/types.ts';
import { PAL } from './palette.ts';
import { PixelBuffer } from './pixelBuffer.ts';
import { bakeAnimation, type SpriteSet } from './spriteAtlas.ts';

const LOGIC_HERO_W = 56;
const LOGIC_HERO_H = 48;
const LOGIC_ANCHOR_X = 28;
const LOGIC_ANCHOR_Y = 44;

export const HERO_SPRITE_W = Math.round(LOGIC_HERO_W * PIXEL_SCALE);
export const HERO_SPRITE_H = Math.round(LOGIC_HERO_H * PIXEL_SCALE);
export const HERO_ANCHOR_X = Math.round(LOGIC_ANCHOR_X * PIXEL_SCALE);
export const HERO_ANCHOR_Y = Math.round(LOGIC_ANCHOR_Y * PIXEL_SCALE);

interface HeroPose {
  bobY: number;
  leanX: number;
  squashX: number;
  legFront: [number, number]; // offset from hip
  legBack: [number, number];
  armFront: [number, number]; // hand offset from shoulder
  armBack: [number, number];
  capePhase: number;
  capeSweepX: number;
  weaponAngle: number; // radians, 0 = pointing right
  slashArc?: {
    start: number;
    end: number;
    radius: number;
    thick: number;
    outer: string;
    mid: string;
    core: string;
  };
  shieldForward?: boolean;
  castGlow?: string;
  castRadius?: number;
  rollAngle?: number; // if set, draw curled dodge silhouette
  airFlipAngle?: number; // if set, draw tucked mid-air somersault spin
  airRingRadius?: number; // horizontal shockwave air-ring beneath feet
  hurtTint?: boolean;
  deathT?: number; // 0..1 collapse
}

interface HeroStyle {
  id: CharacterId;
  bodyW: number;
  bodyH: number;
  armorShadow: string;
  armorMid: string;
  armorLight: string;
  trim: string;
  capeDark: string;
  capeMid: string;
  capeLight: string;
  eyeColor: string;
  slashOuter: string;
  slashMid: string;
  slashCore: string;
  skill1Color: string;
  skill2Color: string;
}

const HERO_STYLES: Record<CharacterId, HeroStyle> = {
  knight: {
    id: 'knight',
    bodyW: 9,
    bodyH: 11,
    armorShadow: PAL.steel0,
    armorMid: PAL.steel2,
    armorLight: PAL.steel4,
    trim: PAL.gold3,
    capeDark: PAL.crimson0,
    capeMid: PAL.crimson2,
    capeLight: PAL.crimson3,
    eyeColor: PAL.soul4,
    slashOuter: PAL.steel2,
    slashMid: PAL.steel4,
    slashCore: PAL.steel5,
    skill1Color: PAL.gold4,
    skill2Color: PAL.ember4,
  },
  rogue: {
    id: 'rogue',
    bodyW: 7,
    bodyH: 10,
    armorShadow: PAL.obsidian1,
    armorMid: PAL.moss1,
    armorLight: PAL.moss3,
    trim: PAL.steel3,
    capeDark: PAL.crimson1,
    capeMid: PAL.crimson2,
    capeLight: PAL.crimson4,
    eyeColor: PAL.soul5,
    slashOuter: PAL.crimson2,
    slashMid: PAL.crimson4,
    slashCore: '#fff0f3',
    skill1Color: PAL.soul4,
    skill2Color: PAL.venom4,
  },
  pyromancer: {
    id: 'pyromancer',
    bodyW: 8,
    bodyH: 12,
    armorShadow: PAL.violet0,
    armorMid: PAL.violet1,
    armorLight: PAL.violet3,
    trim: PAL.ember3,
    capeDark: PAL.obsidian0,
    capeMid: PAL.violet2,
    capeLight: PAL.ember2,
    eyeColor: PAL.ember4,
    slashOuter: PAL.ember1,
    slashMid: PAL.ember3,
    slashCore: PAL.ember5,
    skill1Color: PAL.ember4,
    skill2Color: PAL.ember5,
  },
  executioner: {
    id: 'executioner',
    bodyW: 12,
    bodyH: 13,
    armorShadow: PAL.iron0,
    armorMid: PAL.iron2,
    armorLight: PAL.iron4,
    trim: PAL.crimson3,
    capeDark: PAL.obsidian0,
    capeMid: PAL.bone1,
    capeLight: PAL.bone3,
    eyeColor: PAL.crimson4,
    slashOuter: PAL.crimson1,
    slashMid: PAL.crimson3,
    slashCore: PAL.ember5,
    skill1Color: PAL.iron4,
    skill2Color: PAL.crimson4,
  },
  templar: {
    id: 'templar',
    bodyW: 9,
    bodyH: 11,
    armorShadow: PAL.steel1,
    armorMid: PAL.steel3,
    armorLight: PAL.steel5,
    trim: PAL.gold4,
    capeDark: PAL.gold1,
    capeMid: PAL.bone3,
    capeLight: PAL.gold5,
    eyeColor: PAL.gold4,
    slashOuter: PAL.gold2,
    slashMid: PAL.gold4,
    slashCore: PAL.gold5,
    skill1Color: PAL.gold5,
    skill2Color: PAL.gold4,
  },
  necromancer: {
    id: 'necromancer',
    bodyW: 8,
    bodyH: 12,
    armorShadow: PAL.obsidian0,
    armorMid: PAL.moss0,
    armorLight: PAL.moss2,
    trim: PAL.bone3,
    capeDark: PAL.obsidian0,
    capeMid: PAL.moss1,
    capeLight: PAL.venom3,
    eyeColor: PAL.venom4,
    slashOuter: PAL.moss2,
    slashMid: PAL.venom3,
    slashCore: PAL.soul5,
    skill1Color: PAL.venom4,
    skill2Color: PAL.soul4,
  },
};

function drawHeroHead(
  buf: PixelBuffer,
  style: HeroStyle,
  hx: number,
  hy: number,
  pose: HeroPose,
): void {
  if (style.id === 'knight') {
    // Flowing crimson helmet plume
    const plumeWave = Math.round(Math.sin(pose.capePhase) * 1.5);
    buf.poly(
      [
        [hx - 2, hy - 5],
        [hx - 7 - Math.abs(plumeWave), hy - 8 + plumeWave],
        [hx - 8, hy - 5 + plumeWave],
        [hx - 2, hy - 3],
      ],
      PAL.crimson2,
    );
    buf.line(hx - 2, hy - 5, hx - 7, hy - 7 + plumeWave, PAL.crimson4);

    // Sallet steel helm
    buf.shadedEllipse(hx, hy, 5, 5, style.armorShadow, style.armorMid, style.armorLight);
    buf.rect(hx - 4, hy + 1, 9, 3, PAL.steel1);
    buf.rect(hx - 1, hy - 5, 3, 2, PAL.gold3); // crest
    // Visor slit + glowing eyes
    buf.rect(hx + 1, hy - 1, 4, 2, PAL.outline);
    buf.set(hx + 3, hy - 1, style.eyeColor);
    buf.set(hx + 4, hy - 1, PAL.soul5);
    buf.rect(hx - 3, hy + 3, 7, 1, PAL.gold2);
  } else if (style.id === 'rogue') {
    // Hooded cloak
    buf.shadedEllipse(hx - 1, hy, 5, 5, PAL.obsidian0, PAL.moss0, PAL.moss2);
    buf.poly(
      [
        [hx - 6, hy - 2],
        [hx - 1, hy - 6],
        [hx + 4, hy - 3],
        [hx - 3, hy + 2],
      ],
      PAL.moss1,
    );
    // Plague-doctor silver half-mask / beak
    buf.poly(
      [
        [hx + 1, hy - 2],
        [hx + 7, hy + 1],
        [hx + 1, hy + 3],
      ],
      PAL.steel3,
    );
    buf.line(hx + 2, hy - 1, hx + 6, hy + 1, PAL.steel5);
    // Glowing assassin eye
    buf.set(hx + 2, hy - 1, style.eyeColor);
    buf.set(hx + 3, hy - 1, PAL.soul4);
  } else if (style.id === 'pyromancer') {
    // Floating ember halo behind crown
    const haloY = hy - 7 + Math.round(Math.sin(pose.capePhase) * 0.8);
    buf.set(hx - 3, haloY, PAL.ember2);
    buf.set(hx, haloY - 1, PAL.ember4);
    buf.set(hx + 3, haloY, PAL.ember2);

    // Shadowed cowl + horned iron crown
    buf.shadedEllipse(hx, hy, 5, 5, PAL.obsidian0, PAL.violet0, PAL.violet2);
    buf.rect(hx - 4, hy - 4, 8, 2, PAL.iron2);
    buf.line(hx - 4, hy - 4, hx - 6, hy - 8, PAL.iron4);
    buf.line(hx + 3, hy - 4, hx + 5, hy - 8, PAL.ember3);
    // Face darkness + blazing eyes
    buf.rect(hx, hy - 1, 4, 3, PAL.outline);
    buf.set(hx + 1, hy, PAL.ember4);
    buf.set(hx + 3, hy, PAL.ember5);
    // Ember beard/collar
    buf.rect(hx - 2, hy + 3, 5, 2, PAL.ember2);
  } else if (style.id === 'templar') {
    // Winged Sunsworn Paladin Helm
    const wingWave = Math.round(Math.sin(pose.capePhase) * 1);
    buf.poly(
      [
        [hx - 2, hy - 2],
        [hx - 9, hy - 8 + wingWave],
        [hx - 7, hy - 2 + wingWave],
      ],
      PAL.gold4,
    );
    buf.line(hx - 2, hy - 2, hx - 8, hy - 7 + wingWave, PAL.steel5);
    buf.shadedEllipse(hx, hy, 5, 5, style.armorShadow, style.armorMid, style.armorLight);
    buf.rect(hx - 1, hy - 6, 3, 3, PAL.gold3);
    buf.rect(hx + 1, hy - 1, 4, 2, PAL.outline);
    buf.set(hx + 3, hy - 1, PAL.gold5);
    buf.rect(hx - 3, hy + 3, 7, 1, PAL.gold4);
  } else if (style.id === 'necromancer') {
    // Jagged Lich Skull Crown + Floating Soul Gem
    const gemY = hy - 8 + Math.round(Math.sin(pose.capePhase) * 1);
    buf.set(hx, gemY, PAL.venom4);
    buf.shadedEllipse(hx, hy, 5, 5, PAL.obsidian0, PAL.bone2, PAL.bone4);
    buf.line(hx - 4, hy - 4, hx - 6, hy - 8, PAL.bone3);
    buf.line(hx + 3, hy - 4, hx + 5, hy - 8, PAL.bone4);
    buf.rect(hx + 1, hy - 1, 3, 2, PAL.outline);
    buf.set(hx + 2, hy - 1, PAL.venom4);
    buf.set(hx + 4, hy - 1, PAL.soul5);
    buf.rect(hx - 2, hy + 3, 5, 2, PAL.moss2);
  } else {
    // Executioner Torvald: heavy chained iron hood + horned collar
    buf.shadedEllipse(hx, hy - 1, 6, 6, PAL.iron0, PAL.iron1, PAL.iron3);
    buf.poly(
      [
        [hx - 5, hy - 2],
        [hx, hy - 8],
        [hx + 4, hy - 3],
      ],
      PAL.iron2,
    );
    // Iron rivets and glowing crimson eye slit
    buf.rect(hx + 1, hy - 1, 4, 2, PAL.outline);
    buf.set(hx + 2, hy - 1, PAL.crimson4);
    buf.set(hx + 3, hy - 1, PAL.ember4);
    buf.rect(hx - 4, hy + 3, 9, 2, PAL.crimson2);
    buf.set(hx - 3, hy - 3, PAL.iron4);
    buf.set(hx + 1, hy - 4, PAL.iron4);
  }
}

function drawKnightOffhandShield(buf: PixelBuffer, backHandX: number, backHandY: number): void {
  const sx = backHandX + 3;
  const sy = backHandY + 1;
  buf.rect(sx - 3, sy - 4, 6, 8, PAL.steel1);
  buf.rect(sx - 2, sy - 3, 4, 6, PAL.crimson2);
  buf.rect(sx - 1, sy - 2, 2, 4, PAL.gold3);
  buf.rect(sx - 3, sy - 4, 6, 1, PAL.gold4);
}

function drawHeroWeapon(
  buf: PixelBuffer,
  style: HeroStyle,
  handX: number,
  handY: number,
  backHandX: number,
  backHandY: number,
  pose: HeroPose,
): void {
  const cos = Math.cos(pose.weaponAngle);
  const sin = Math.sin(pose.weaponAngle);
  const gx = Math.round(handX);
  const gy = Math.round(handY);

  if (style.id === 'knight') {
    // Broadsword with pommel & front-hand gauntlet grip
    const tipX = handX + cos * 15;
    const tipY = handY + sin * 15;
    const perpX = -sin;
    const perpY = cos;
    buf.line(handX - cos * 3, handY - sin * 3, handX, handY, PAL.wood2, 2);
    buf.set(Math.round(handX - cos * 3), Math.round(handY - sin * 3), PAL.gold4);
    buf.line(handX - perpX * 2, handY - perpY * 2, handX + perpX * 2, handY + perpY * 2, PAL.gold3, 2);
    buf.line(handX, handY, tipX, tipY, PAL.steel3, 2);
    buf.line(handX + perpX * 0.6, handY + perpY * 0.6, tipX, tipY, PAL.steel5, 1);

    // Kite Buckler Shield in front when parrying (idle/run off-hand shield layers behind torso)
    if (pose.shieldForward) {
      const sx = handX + 3;
      const sy = handY - 1;
      buf.rect(sx - 3, sy - 4, 6, 8, PAL.steel1);
      buf.rect(sx - 2, sy - 3, 4, 6, PAL.crimson2);
      buf.rect(sx - 1, sy - 2, 2, 4, PAL.gold3);
      buf.rect(sx - 3, sy - 4, 6, 1, PAL.gold4);
    }
  } else if (style.id === 'rogue') {
    // Twin curved crimson-edged daggers
    const drawDagger = (hx: number, hy: number, ang: number, len: number): void => {
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      buf.line(hx, hy, hx + dx * len, hy + dy * len, PAL.steel4, 2);
      buf.line(hx + dx * 2, hy + dy * 2, hx + dx * (len + 2), hy + dy * (len + 2), PAL.crimson4, 1);
      buf.set(hx, hy, PAL.gold3);
    };
    drawDagger(handX, handY, pose.weaponAngle, 9);
    drawDagger(backHandX, backHandY, pose.weaponAngle + 0.55, 8);
    buf.rect(Math.round(backHandX) - 1, Math.round(backHandY) - 1, 2, 2, style.armorMid);
  } else if (style.id === 'pyromancer') {
    // Runic Flame Staff held aloft in idle/run/jump/fall
    const staffAngle = pose.weaponAngle > 0.8 ? pose.weaponAngle : Math.min(-0.45, pose.weaponAngle);
    const sc = Math.cos(staffAngle);
    const ss = Math.sin(staffAngle);
    const topX = handX + sc * 12;
    const topY = handY + ss * 12;
    const botX = handX - sc * 6;
    const botY = handY - ss * 6;
    buf.line(botX, botY, topX, topY, PAL.wood2, 2);
    buf.line(botX, botY, topX, topY, PAL.iron3, 1);
    buf.shadedEllipse(topX, topY, 3, 3, PAL.ember1, PAL.ember3, PAL.ember5);
    buf.set(topX, topY - 3, PAL.ember4);

    // Levitating Grimoire near back hand
    const grx = backHandX - 3;
    const gry = backHandY - 4 + Math.round(Math.sin(pose.capePhase * 1.5));
    buf.rect(grx - 3, gry - 2, 6, 5, PAL.crimson2);
    buf.rect(grx - 2, gry - 1, 4, 3, PAL.bone4);
    buf.set(grx, gry, PAL.ember4);
  } else if (style.id === 'templar') {
    // Radiant Sun-Halberd Spear
    const tipX = handX + cos * 19;
    const tipY = handY + sin * 19;
    const shaftBackX = handX - cos * 6;
    const shaftBackY = handY - sin * 6;
    const perpX = -sin;
    const perpY = cos;
    buf.line(shaftBackX, shaftBackY, tipX, tipY, PAL.gold3, 2);
    buf.set(Math.round(shaftBackX), Math.round(shaftBackY), PAL.gold4);
    buf.line(handX + cos * 11, handY + sin * 11, tipX, tipY, PAL.steel5, 2);
    buf.poly(
      [
        [handX + cos * 12, handY + sin * 12],
        [handX + cos * 15 + perpX * 4, handY + sin * 15 + perpY * 4],
        [handX + cos * 17, handY + sin * 17],
      ],
      PAL.gold4,
    );
    buf.set(tipX, tipY, PAL.gold5);
  } else if (style.id === 'necromancer') {
    // Spectral Emerald Soul-Scythe + Orbiting Skull
    const headX = handX + cos * 15;
    const headY = handY + sin * 15;
    const perpX = -sin;
    const perpY = cos;
    buf.line(handX - cos * 6, handY - sin * 6, headX, headY, PAL.bone2, 2);
    buf.poly(
      [
        [headX, headY],
        [headX + perpX * 5 + cos * 2, headY + perpY * 5 + sin * 2],
        [headX + perpX * 9 - cos * 4, headY + perpY * 9 - sin * 4],
        [headX + perpX * 5 - cos * 3, headY + perpY * 5 - sin * 3],
      ],
      PAL.venom3,
    );
    buf.line(headX, headY, headX + perpX * 9 - cos * 4, headY + perpY * 9 - sin * 4, PAL.soul5, 1);
    const sx = backHandX - 4;
    const sy = backHandY - 5 + Math.round(Math.sin(pose.capePhase * 1.4));
    buf.shadedEllipse(sx, sy, 2, 2, PAL.moss1, PAL.bone3, PAL.bone4);
    buf.set(sx + 1, sy, PAL.venom4);
  } else {
    // Colossal notched Great-Axe
    const headX = handX + cos * 15;
    const headY = handY + sin * 15;
    const perpX = -sin;
    const perpY = cos;
    buf.line(handX - cos * 4, handY - sin * 4, headX, headY, PAL.wood2, 2);
    buf.set(Math.round(handX - cos * 4), Math.round(handY - sin * 4), PAL.gold3);
    buf.poly(
      [
        [headX - cos * 3, headY - sin * 3],
        [headX + perpX * 6 + cos * 2, headY + perpY * 6 + sin * 2],
        [headX + cos * 4, headY + sin * 4],
        [headX - perpX * 5 + cos * 1, headY - perpY * 5 + sin * 1],
      ],
      PAL.iron3,
    );
    buf.line(
      headX + perpX * 6 + cos * 2,
      headY + perpY * 6 + sin * 2,
      headX - perpX * 5 + cos * 1,
      headY - perpY * 5 + sin * 1,
      PAL.crimson4,
      1,
    );
  }

  // Armored gauntlet gripping weapon shaft
  buf.rect(gx - 1, gy - 1, 2, 2, style.armorLight);
}

function renderHeroFrame(style: HeroStyle, pose: HeroPose): PixelBuffer {
  const buf = new PixelBuffer(LOGIC_HERO_W, LOGIC_HERO_H, PIXEL_SCALE);

  // Special curled dodge roll pose
  if (pose.rollAngle !== undefined) {
    const cx = LOGIC_ANCHOR_X;
    const cy = LOGIC_ANCHOR_Y - 8;
    buf.shadedEllipse(cx, cy, 8, 7, style.capeDark, style.armorMid, style.armorLight);
    // Swirling motion trail
    buf.drawSlashArc(
      cx,
      cy,
      8,
      pose.rollAngle,
      pose.rollAngle + Math.PI * 1.1,
      2,
      style.capeDark,
      style.trim,
      PAL.steel5,
    );
    buf.applyOutline(PAL.outline);
    return buf;
  }

  // Mid-air tucked acrobatic somersault + aerial impulse wind-ring
  if (pose.airFlipAngle !== undefined) {
    const cx = LOGIC_ANCHOR_X;
    const cy = LOGIC_ANCHOR_Y - 15;
    if (pose.airRingRadius && pose.airRingRadius > 0) {
      buf.ellipse(cx, LOGIC_ANCHOR_Y - 4, pose.airRingRadius, 2, PAL.soul4);
      buf.ellipse(cx, LOGIC_ANCHOR_Y - 4, Math.max(2, pose.airRingRadius - 2), 1, PAL.soul5);
    }
    buf.shadedEllipse(cx, cy, 7, 6, style.armorShadow, style.armorMid, style.armorLight);
    buf.shadedEllipse(
      cx + Math.round(Math.cos(pose.airFlipAngle) * 3),
      cy + Math.round(Math.sin(pose.airFlipAngle) * 3),
      3,
      3,
      style.trim,
      style.armorLight,
      PAL.steel5,
    );
    buf.set(
      cx + Math.round(Math.cos(pose.airFlipAngle) * 4),
      cy + Math.round(Math.sin(pose.airFlipAngle) * 4),
      style.eyeColor,
    );
    buf.drawSlashArc(
      cx,
      cy,
      9,
      pose.airFlipAngle,
      pose.airFlipAngle + Math.PI * 1.25,
      3,
      style.capeDark,
      style.capeMid,
      style.capeLight,
    );
    buf.drawSlashArc(
      cx,
      cy,
      11,
      pose.airFlipAngle + Math.PI * 0.75,
      pose.airFlipAngle + Math.PI * 1.65,
      2,
      style.trim,
      style.armorLight,
      PAL.steel5,
    );
    buf.applyTopRim(style.armorLight, new Set([style.eyeColor, PAL.soul4, PAL.soul5]));
    buf.applyOutline(PAL.outline);
    return buf;
  }

  // Death collapse animation
  if (pose.deathT !== undefined) {
    const t = pose.deathT;
    const cx = LOGIC_ANCHOR_X;
    const cy = Math.round(LOGIC_ANCHOR_Y - 12 * (1 - t) - 2);
    if (t < 0.7) {
      buf.shadedEllipse(cx - t * 6, cy + 4, 6, 4, style.armorShadow, style.armorMid, style.armorLight);
      buf.shadedEllipse(cx + t * 4, cy + 2, 4, 4, style.capeDark, style.capeMid, style.trim);
    } else {
      // Fallen cloak & weapon with rising soul wisp
      buf.ellipse(cx, LOGIC_ANCHOR_Y - 2, 9, 2, style.capeDark);
      buf.rect(cx - 6, LOGIC_ANCHOR_Y - 3, 12, 2, style.armorShadow);
      buf.line(cx - 8, LOGIC_ANCHOR_Y - 4, cx + 6, LOGIC_ANCHOR_Y - 2, PAL.steel3);
      buf.set(cx + 1, LOGIC_ANCHOR_Y - 8 - Math.round((t - 0.7) * 18), PAL.soul4);
      buf.set(cx + 2, LOGIC_ANCHOR_Y - 10 - Math.round((t - 0.7) * 18), PAL.soul5);
    }
    buf.applyOutline(PAL.outline);
    return buf;
  }

  const cx = LOGIC_ANCHOR_X + Math.round(pose.leanX);
  const hipY = LOGIC_ANCHOR_Y - 8 + Math.round(pose.bobY);
  const shoulderY = hipY - style.bodyH + 2;
  const headY = shoulderY - 6;

  // Back cape / scarf
  buf.drawCape(
    cx - 3,
    shoulderY,
    cx - 8 + pose.capeSweepX,
    LOGIC_ANCHOR_Y - 3 + Math.round(pose.bobY * 0.5),
    6,
    9,
    pose.capePhase,
    style.capeDark,
    style.capeMid,
    style.capeLight,
  );

  // Back arm
  const backShoulderX = cx - 2;
  const backHandX = backShoulderX + pose.armBack[0];
  const backHandY = shoulderY + pose.armBack[1];
  buf.drawArticulatedLimb(
    backShoulderX,
    shoulderY + 1,
    backHandX,
    backHandY,
    2,
    style.armorShadow,
    style.armorMid,
  );
  if (style.id === 'knight' && !pose.shieldForward) {
    drawKnightOffhandShield(buf, backHandX, backHandY);
  }

  // Back leg
  const backHipX = cx - 2;
  const backFootX = backHipX + pose.legBack[0];
  const backFootY = hipY + pose.legBack[1];
  buf.drawArticulatedLimb(backHipX, hipY, backFootX, backFootY, 3, style.armorShadow, style.armorMid);

  // Front leg with knee poleyn & cuffed boot
  const frontHipX = cx + 2;
  const frontFootX = frontHipX + pose.legFront[0];
  const frontFootY = hipY + pose.legFront[1];
  buf.drawArticulatedLimb(frontHipX, hipY, frontFootX, frontFootY, 3, style.armorMid, style.armorLight);
  const kneeX = Math.round((frontHipX + frontFootX) * 0.5);
  const kneeY = Math.round((hipY + frontFootY) * 0.5);
  buf.rect(kneeX - 1, kneeY - 1, 2, 2, style.trim);
  buf.rect(frontFootX - 1, frontFootY - 2, 4, 3, style.armorShadow);
  buf.rect(frontFootX - 1, frontFootY - 2, 3, 1, style.trim);

  // Torso armor / robe
  const halfW = Math.floor(style.bodyW / 2);
  buf.rect(cx - halfW, shoulderY - 1, style.bodyW, style.bodyH, style.armorShadow);
  buf.rect(cx - halfW + 1, shoulderY, style.bodyW - 2, style.bodyH - 2, style.armorMid);
  buf.rect(cx - halfW + 1, shoulderY, Math.max(2, halfW - 1), style.bodyH - 4, style.armorLight);
  // Belt, buckle glint & chest trim
  buf.rect(cx - halfW, hipY - 2, style.bodyW, 2, style.trim);
  buf.set(cx, hipY - 2, PAL.gold4);
  if (style.id === 'executioner') {
    // Fur shoulder mantle
    buf.rect(cx - halfW - 2, shoulderY - 2, style.bodyW + 4, 3, PAL.bone2);
    buf.rect(cx - halfW - 1, shoulderY - 2, style.bodyW + 2, 1, PAL.bone4);
  } else if (style.id === 'pyromancer') {
    // Tattered lower robe skirt
    buf.poly(
      [
        [cx - 4, hipY - 1],
        [cx + 4, hipY - 1],
        [cx + 6, hipY + 7],
        [cx - 6, hipY + 7],
      ],
      PAL.violet1,
    );
    buf.line(cx - 3, hipY, cx - 5, hipY + 7, PAL.ember3);
  }

  // Head
  drawHeroHead(buf, style, cx + 1, headY, pose);

  // Front arm & weapon
  const frontShoulderX = cx + 2;
  const frontHandX = frontShoulderX + pose.armFront[0];
  const frontHandY = shoulderY + pose.armFront[1];
  buf.drawArticulatedLimb(
    frontShoulderX,
    shoulderY + 1,
    frontHandX,
    frontHandY,
    2,
    style.armorMid,
    style.armorLight,
  );
  // Pauldron
  buf.shadedEllipse(frontShoulderX, shoulderY, 3, 2, style.armorShadow, style.armorMid, style.armorLight);

  drawHeroWeapon(buf, style, frontHandX, frontHandY, backHandX, backHandY, pose);

  // Cast aura / glow
  if (pose.castGlow && pose.castRadius) {
    buf.ellipse(frontHandX + 3, frontHandY, pose.castRadius, pose.castRadius, pose.castGlow);
  }

  // Specular 1px rim highlight + crisp 1px silhouette outline around character before additive slash smear
  buf.applyTopRim(
    style.armorLight,
    new Set([
      style.eyeColor,
      PAL.soul4,
      PAL.soul5,
      PAL.ember4,
      PAL.ember5,
      style.slashCore,
      pose.castGlow ?? '',
    ]),
  );
  buf.applyOutline(PAL.outline);

  // Draw crisp slash smear arc OUTSIDE outline for pure vibrant motion!
  if (pose.slashArc) {
    buf.drawSlashArc(
      cx + 2,
      shoulderY + 3,
      pose.slashArc.radius,
      pose.slashArc.start,
      pose.slashArc.end,
      pose.slashArc.thick,
      pose.slashArc.outer,
      pose.slashArc.mid,
      pose.slashArc.core,
    );
  }

  return buf;
}

function buildHeroAnimations(style: HeroStyle): SpriteSet<CharacterAnimState> {
  const mk = (poses: HeroPose[], fps: number, loop = true) =>
    bakeAnimation(
      poses.map((p) => renderHeroFrame(style, p)),
      fps,
      loop,
    );

  // 1. Idle (4f breathing & cape sway)
  const idle = mk(
    [0, 1, 2, 3].map((i) => ({
      bobY: i === 1 || i === 2 ? 1 : 0,
      leanX: 0,
      squashX: 1,
      legFront: [2, 8],
      legBack: [-2, 8],
      armFront: [4, 4 + (i % 2)],
      armBack: [2, 4],
      capePhase: i * 1.4,
      capeSweepX: -2 - (i % 2),
      weaponAngle: -0.45 + (i % 2) * 0.08,
    })),
    5,
    true,
  );

  // 2. Run (6f athletic sprint cycle)
  const runLegs: Array<[number, number, number, number, number]> = [
    [6, 6, -5, 7, -1],
    [3, 8, -2, 6, 0],
    [-2, 7, 3, 5, 1],
    [-5, 6, 6, 6, -1],
    [-2, 6, 3, 8, 0],
    [3, 5, -2, 7, 1],
  ];
  const run = mk(
    runLegs.map(([fx, fy, bx, by, bob], i) => ({
      bobY: bob,
      leanX: 3,
      squashX: 1,
      legFront: [fx, fy],
      legBack: [bx, by],
      armFront: [4 - (i % 3), 4],
      armBack: [-2 + (i % 3), 4],
      capePhase: i * 1.05,
      capeSweepX: -8,
      weaponAngle: 0.22 + (i % 2) * 0.08,
    })),
    12,
    true,
  );

  // 3. Jump (2f upward vault)
  const jump = mk(
    [0, 1].map((i) => ({
      bobY: -2,
      leanX: 2,
      squashX: 1,
      legFront: [3, 5 + i],
      legBack: [-3, 7],
      armFront: [4, 1],
      armBack: [-4, 2],
      capePhase: i * 1.5,
      capeSweepX: -5,
      weaponAngle: -0.9,
    })),
    8,
    false,
  );

  // 3b. Mid-Air Double Jump (4f acrobatic tucked somersault + expanding soul-wind ring)
  const air_jump = mk(
    [
      {
        bobY: 0,
        leanX: 2,
        squashX: 1,
        legFront: [2, 6],
        legBack: [-2, 6],
        armFront: [2, 2],
        armBack: [-2, 2],
        capePhase: 0.4,
        capeSweepX: -6,
        weaponAngle: 0,
        airFlipAngle: 0.4,
        airRingRadius: 7,
      },
      {
        bobY: 0,
        leanX: 2,
        squashX: 1,
        legFront: [2, 6],
        legBack: [-2, 6],
        armFront: [2, 2],
        armBack: [-2, 2],
        capePhase: 1.8,
        capeSweepX: -7,
        weaponAngle: 0,
        airFlipAngle: 2.2,
        airRingRadius: 10,
      },
      {
        bobY: 0,
        leanX: 2,
        squashX: 1,
        legFront: [2, 6],
        legBack: [-2, 6],
        armFront: [2, 2],
        armBack: [-2, 2],
        capePhase: 3.1,
        capeSweepX: -7,
        weaponAngle: 0,
        airFlipAngle: 4.1,
        airRingRadius: 0,
      },
      {
        bobY: -3,
        leanX: 3,
        squashX: 1,
        legFront: [4, 4],
        legBack: [-4, 6],
        armFront: [5, -2],
        armBack: [-4, 0],
        capePhase: 3.2,
        capeSweepX: -8,
        weaponAngle: -0.6,
      },
    ],
    15,
    false,
  );

  // 4. Fall (2f descending cape billowing upward)
  const fall = mk(
    [0, 1].map((i) => ({
      bobY: 0,
      leanX: 1,
      squashX: 1,
      legFront: [2, 8],
      legBack: [-3, 6],
      armFront: [5, -1 + i],
      armBack: [-4, 0],
      capePhase: 2 + i * 1.6,
      capeSweepX: -7,
      weaponAngle: -1.3,
    })),
    8,
    true,
  );

  // 5. Wall slide (2f braced against stone)
  const wall_slide = mk(
    [0, 1].map((i) => ({
      bobY: i,
      leanX: -1,
      squashX: 1,
      legFront: [3, 6],
      legBack: [1, 8],
      armFront: [5, -2],
      armBack: [-2, 4],
      capePhase: i * 1.2,
      capeSweepX: -4,
      weaponAngle: -1.8,
    })),
    6,
    true,
  );

  // 6. Dodge Roll (4f blurred tumble)
  const roll = mk(
    [0, 1, 2, 3].map((i) => ({
      bobY: 2,
      leanX: 2,
      squashX: 1,
      legFront: [0, 6],
      legBack: [0, 6],
      armFront: [2, 3],
      armBack: [-2, 3],
      capePhase: i * 1.6,
      capeSweepX: -6,
      weaponAngle: 0,
      rollAngle: i * 1.6,
    })),
    18,
    true,
  );

  // 6b. Dive Slam (3f dramatic downward plunge)
  const dive_slam = mk(
    [0, 1, 2].map((i) => ({
      bobY: 1,
      leanX: 2,
      squashX: 1,
      legFront: [3, 5],
      legBack: [-3, 4],
      armFront: [3, 6],
      armBack: [-4, 0],
      capePhase: 2 + i * 1.8,
      capeSweepX: -8,
      weaponAngle: Math.PI * 0.5,
      slashArc: {
        start: 0.7,
        end: 2.4,
        radius: 17,
        thick: 3,
        outer: style.slashOuter,
        mid: style.slashMid,
        core: style.slashCore,
      },
    })),
    14,
    true,
  );

  // 7. Attack 1 (4f snappy horizontal/diagonal slash)
  const attack1 = mk(
    [
      {
        bobY: 0,
        leanX: -1,
        squashX: 1,
        legFront: [3, 8],
        legBack: [-4, 8],
        armFront: [-3, 1],
        armBack: [-4, 4],
        capePhase: 0.4,
        capeSweepX: -4,
        weaponAngle: -2.2,
      },
      {
        bobY: 1,
        leanX: 4,
        squashX: 1,
        legFront: [6, 7],
        legBack: [-5, 8],
        armFront: [7, 2],
        armBack: [-3, 4],
        capePhase: 1.2,
        capeSweepX: -8,
        weaponAngle: 0.15,
        slashArc: {
          start: -1.3,
          end: 0.9,
          radius: 17,
          thick: 3,
          outer: style.slashOuter,
          mid: style.slashMid,
          core: style.slashCore,
        },
      },
      {
        bobY: 1,
        leanX: 4,
        squashX: 1,
        legFront: [6, 7],
        legBack: [-4, 8],
        armFront: [6, 4],
        armBack: [-3, 4],
        capePhase: 2.0,
        capeSweepX: -7,
        weaponAngle: 0.55,
        slashArc: {
          start: -0.5,
          end: 1.15,
          radius: 17,
          thick: 2,
          outer: style.slashOuter,
          mid: style.slashMid,
          core: style.slashCore,
        },
      },
      {
        bobY: 0,
        leanX: 2,
        squashX: 1,
        legFront: [4, 8],
        legBack: [-3, 8],
        armFront: [4, 4],
        armBack: [-2, 4],
        capePhase: 2.6,
        capeSweepX: -4,
        weaponAngle: 0.2,
      },
    ],
    18,
    false,
  );

  // 8. Attack 2 (4f reverse rising slash)
  const attack2 = mk(
    [
      {
        bobY: 1,
        leanX: 1,
        squashX: 1,
        legFront: [4, 8],
        legBack: [-4, 8],
        armFront: [2, 6],
        armBack: [-2, 4],
        capePhase: 0.8,
        capeSweepX: -5,
        weaponAngle: 1.2,
      },
      {
        bobY: -1,
        leanX: 5,
        squashX: 1,
        legFront: [6, 7],
        legBack: [-5, 8],
        armFront: [7, -1],
        armBack: [-3, 3],
        capePhase: 1.6,
        capeSweepX: -9,
        weaponAngle: -0.45,
        slashArc: {
          start: 1.1,
          end: -1.4,
          radius: 18,
          thick: 3,
          outer: style.slashOuter,
          mid: style.slashMid,
          core: style.slashCore,
        },
      },
      {
        bobY: -1,
        leanX: 4,
        squashX: 1,
        legFront: [5, 7],
        legBack: [-4, 8],
        armFront: [6, -2],
        armBack: [-3, 3],
        capePhase: 2.3,
        capeSweepX: -7,
        weaponAngle: -0.95,
        slashArc: {
          start: 0.3,
          end: -1.5,
          radius: 18,
          thick: 2,
          outer: style.slashOuter,
          mid: style.slashMid,
          core: style.slashCore,
        },
      },
      {
        bobY: 0,
        leanX: 2,
        squashX: 1,
        legFront: [3, 8],
        legBack: [-2, 8],
        armFront: [4, 2],
        armBack: [-2, 4],
        capePhase: 2.9,
        capeSweepX: -4,
        weaponAngle: -0.5,
      },
    ],
    18,
    false,
  );

  // 9. Attack 3 (5f heavy overhead finisher slam)
  const attack3 = mk(
    [
      {
        bobY: -2,
        leanX: -2,
        squashX: 1,
        legFront: [2, 8],
        legBack: [-4, 8],
        armFront: [-2, -5],
        armBack: [-3, -2],
        capePhase: 0.3,
        capeSweepX: -6,
        weaponAngle: -2.4,
      },
      {
        bobY: -2,
        leanX: 0,
        squashX: 1,
        legFront: [4, 7],
        legBack: [-4, 8],
        armFront: [2, -6],
        armBack: [-2, -1],
        capePhase: 1.0,
        capeSweepX: -8,
        weaponAngle: -1.7,
      },
      {
        bobY: 2,
        leanX: 6,
        squashX: 1,
        legFront: [7, 7],
        legBack: [-6, 8],
        armFront: [8, 3],
        armBack: [-4, 4],
        capePhase: 2.0,
        capeSweepX: -10,
        weaponAngle: 0.35,
        slashArc: {
          start: -1.9,
          end: 0.9,
          radius: 21,
          thick: 4,
          outer: style.slashOuter,
          mid: style.trim,
          core: style.slashCore,
        },
      },
      {
        bobY: 2,
        leanX: 6,
        squashX: 1,
        legFront: [7, 7],
        legBack: [-5, 8],
        armFront: [8, 5],
        armBack: [-4, 4],
        capePhase: 2.8,
        capeSweepX: -8,
        weaponAngle: 0.65,
        slashArc: {
          start: -0.9,
          end: 1.05,
          radius: 21,
          thick: 2,
          outer: style.slashOuter,
          mid: style.trim,
          core: style.slashCore,
        },
      },
      {
        bobY: 1,
        leanX: 3,
        squashX: 1,
        legFront: [5, 8],
        legBack: [-3, 8],
        armFront: [5, 4],
        armBack: [-3, 4],
        capePhase: 3.4,
        capeSweepX: -4,
        weaponAngle: 0.35,
      },
    ],
    15,
    false,
  );

  // 10. Skill 1 (4f shield guard / dash / firebolt / hook)
  const skill1 = mk(
    [0, 1, 2, 3].map((i) => ({
      bobY: i === 1 || i === 2 ? 1 : 0,
      leanX: style.id === 'knight' ? 1 : 4,
      squashX: 1,
      legFront: [5, 8],
      legBack: [-4, 8],
      armFront: [7, 1],
      armBack: [-2, 3],
      capePhase: i * 1.4,
      capeSweepX: -8,
      weaponAngle: style.id === 'knight' ? -0.9 : 0.0,
      shieldForward: style.id === 'knight',
      castGlow: i === 1 || i === 2 ? style.skill1Color : undefined,
      castRadius: i === 1 ? 4 : i === 2 ? 3 : 0,
    })),
    14,
    false,
  );

  // 11. Skill 2 (4f ultimate cast / cleave / smoke / whirlwind)
  const skill2 = mk(
    [0, 1, 2, 3].map((i) => ({
      bobY: i === 0 ? -2 : 1,
      leanX: i === 0 ? -2 : 5,
      squashX: 1,
      legFront: [6, 7],
      legBack: [-5, 8],
      armFront: [i === 0 ? 1 : 8, i === 0 ? -5 : 1],
      armBack: [-4, 2],
      capePhase: i * 1.8,
      capeSweepX: -10,
      weaponAngle: i === 0 ? -2.0 : 0.1,
      castGlow: i >= 1 ? style.skill2Color : undefined,
      castRadius: i === 1 ? 5 : i === 2 ? 6 : 3,
      slashArc:
        i === 1 || i === 2
          ? {
              start: -2.4,
              end: 2.2,
              radius: 20,
              thick: 3,
              outer: style.skill2Color,
              mid: style.slashMid,
              core: PAL.steel5,
            }
          : undefined,
    })),
    13,
    false,
  );

  // 12. Hurt (2f recoil)
  const hurt = mk(
    [0, 1].map((i) => ({
      bobY: -1,
      leanX: -3 + i,
      squashX: 1,
      legFront: [2, 8],
      legBack: [-3, 8],
      armFront: [1, -1],
      armBack: [-5, 1],
      capePhase: i * 2,
      capeSweepX: 3,
      weaponAngle: -1.6,
      hurtTint: true,
    })),
    12,
    false,
  );

  // 13. Death (5f fall & soul wisp)
  const death = mk(
    [0, 0.25, 0.5, 0.78, 1].map((t) => ({
      bobY: 0,
      leanX: 0,
      squashX: 1,
      legFront: [2, 8],
      legBack: [-2, 8],
      armFront: [3, 4],
      armBack: [-3, 4],
      capePhase: t * 4,
      capeSweepX: -2,
      weaponAngle: 0,
      deathT: t,
    })),
    7,
    false,
  );

  return {
    idle,
    run,
    jump,
    air_jump,
    fall,
    wall_slide,
    roll,
    dive_slam,
    attack1,
    attack2,
    attack3,
    skill1,
    skill2,
    hurt,
    death,
  };
}

export function bakeAllCharacterSprites(): Record<CharacterId, SpriteSet<CharacterAnimState>> {
  return {
    knight: buildHeroAnimations(HERO_STYLES.knight),
    rogue: buildHeroAnimations(HERO_STYLES.rogue),
    pyromancer: buildHeroAnimations(HERO_STYLES.pyromancer),
    templar: buildHeroAnimations(HERO_STYLES.templar),
    executioner: buildHeroAnimations(HERO_STYLES.executioner),
    necromancer: buildHeroAnimations(HERO_STYLES.necromancer),
  };
}
