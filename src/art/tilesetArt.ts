import { PIXEL_SCALE, TILE_PX } from '../core/constants.ts';
import type { BiomeId } from '../core/types.ts';
import { PAL } from './palette.ts';
import { PixelBuffer } from './pixelBuffer.ts';
import { bakeAnimation, type SpriteAnimation } from './spriteAtlas.ts';

export interface BiomeTilePalette {
  baseDark: string;
  baseMid: string;
  baseLight: string;
  mortar: string;
  topTrim: string;
  topHighlight: string;
  accent: string;
}

const BIOME_TILE_PALETTES: Record<BiomeId, BiomeTilePalette> = {
  sanctuary: {
    baseDark: PAL.stone0,
    baseMid: PAL.stone1,
    baseLight: PAL.stone3,
    mortar: PAL.obsidian0,
    topTrim: PAL.gold2,
    topHighlight: PAL.gold4,
    accent: PAL.soul3,
  },
  crypt: {
    baseDark: PAL.stone0,
    baseMid: PAL.stone1,
    baseLight: PAL.stone2,
    mortar: PAL.obsidian0,
    topTrim: PAL.moss2,
    topHighlight: PAL.moss4,
    accent: PAL.moss3,
  },
  catacombs: {
    baseDark: '#1c1218',
    baseMid: '#2e1d26',
    baseLight: '#472d39',
    mortar: '#0f090d',
    topTrim: PAL.crimson1,
    topHighlight: PAL.crimson3,
    accent: PAL.crimson2,
  },
  ossuary: {
    baseDark: '#10211c',
    baseMid: '#1a362d',
    baseLight: '#2c5446',
    mortar: '#08120f',
    topTrim: PAL.venom2,
    topHighlight: PAL.venom4,
    accent: PAL.venom3,
  },
  citadel: {
    baseDark: PAL.obsidian0,
    baseMid: PAL.obsidian2,
    baseLight: PAL.obsidian3,
    mortar: '#07060b',
    topTrim: PAL.gold1,
    topHighlight: PAL.gold3,
    accent: PAL.ember2,
  },
};

export interface TilesetAssets {
  solidTiles: Record<BiomeId, HTMLCanvasElement[][]>; // [mask 0..15][variant 0..2]
  platformTiles: Record<
    BiomeId,
    [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]
  >; // [single, leftCap, mid, rightCap]
  supportBeam: Record<BiomeId, HTMLCanvasElement>;
  spikesTile: HTMLCanvasElement;
  torchAnim: SpriteAnimation;
  brazierAnim: SpriteAnimation;
  bannerAnim: Record<BiomeId, SpriteAnimation>;
  portalAnim: SpriteAnimation;
  chestClosed: HTMLCanvasElement;
  chestOpen: HTMLCanvasElement;
  barrel: HTMLCanvasElement;
  crate: HTMLCanvasElement;
  soulAltar: HTMLCanvasElement;
  relicShrine: HTMLCanvasElement;
  merchantStand: HTMLCanvasElement;
  curseBrazier: HTMLCanvasElement;
  roseWindow: Record<BiomeId, HTMLCanvasElement>;
  pillar: Record<BiomeId, HTMLCanvasElement>;
  chain: HTMLCanvasElement;
  trinityScrollPedestal: HTMLCanvasElement;
  bloodShrine: HTMLCanvasElement;
  waystoneAnim: SpriteAnimation;
  loreTablet: HTMLCanvasElement;
  trainingDummy: HTMLCanvasElement;
  deedsLectern: HTMLCanvasElement;
  consecratedBanner: HTMLCanvasElement;
  heroPedestal: HTMLCanvasElement;
  statue: Record<BiomeId, HTMLCanvasElement>;
  floorClutter: Record<BiomeId, [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]>;
}

/** Mask bits: 1=top solid, 2=right solid, 4=bottom solid, 8=left solid */
function bakeSolidTile(pal: BiomeTilePalette, mask: number, variant: number): HTMLCanvasElement {
  const buf = new PixelBuffer(TILE_PX, TILE_PX, 1);
  const hasTop = (mask & 1) !== 0;
  const hasRight = (mask & 2) !== 0;
  const hasBottom = (mask & 4) !== 0;
  const hasLeft = (mask & 8) !== 0;

  buf.rect(0, 0, TILE_PX, TILE_PX, pal.baseMid);

  // 4-course Hi-Bit gothic ashlar masonry on 24x24 grid
  const rowShift = variant * 5;
  buf.rect(0, 5, TILE_PX, 1, pal.mortar);
  buf.rect(0, 11, TILE_PX, 1, pal.mortar);
  buf.rect(0, 17, TILE_PX, 1, pal.mortar);
  buf.rect((5 + rowShift) % 22, 0, 1, 5, pal.mortar);
  buf.rect((15 + rowShift) % 22, 6, 1, 5, pal.mortar);
  buf.rect((9 + rowShift) % 22, 12, 1, 5, pal.mortar);
  buf.rect((18 + rowShift) % 22, 18, 1, 6, pal.mortar);

  // Fine 1px top highlight lips & recessed bottom shadows per course
  buf.rect(1, 6, TILE_PX - 2, 1, pal.baseLight);
  buf.rect(1, 18, TILE_PX - 2, 1, pal.baseLight);
  buf.rect(1, 10, TILE_PX - 2, 1, pal.baseDark);
  buf.rect(1, 16, TILE_PX - 2, 1, pal.baseDark);

  // Chiseled cracks & 1px checkerboard weathering
  if (variant === 1) {
    buf.rect(3, 2, 6, 2, pal.baseLight);
    buf.ditherRect(13, 12, 6, 4, pal.baseDark, null);
    buf.line(18, 1, 21, 5, pal.mortar);
  } else if (variant === 2) {
    buf.rect(9, 7, 5, 2, pal.baseLight);
    buf.ditherRect(2, 19, 7, 3, pal.baseDark, null);
    buf.line(14, 13, 17, 17, pal.baseDark);
  } else {
    buf.ditherRect(4, 7, 6, 3, pal.baseDark, null);
    buf.rect(15, 2, 5, 2, pal.baseLight);
    buf.rect(4, 19, 5, 2, pal.baseLight);
  }

  // Exposed edges beveling & medieval trim
  if (!hasTop) {
    buf.rect(0, 0, TILE_PX, 4, pal.baseLight);
    buf.rect(0, 0, TILE_PX, 1, pal.topHighlight);
    buf.rect(0, 4, TILE_PX, 1, pal.mortar);
    // Hanging moss / blood / gold cap
    for (let x = 0; x < TILE_PX; x += 3) {
      const drop = ((x + variant * 3) % 4) + 2;
      buf.rect(x, 1, 2, drop, pal.topTrim);
      if (drop >= 4) buf.setRaw(x + 1, 1 + drop, pal.accent);
    }
  }
  if (!hasBottom) {
    buf.rect(0, TILE_PX - 4, TILE_PX, 4, pal.baseDark);
    buf.rect(0, TILE_PX - 1, TILE_PX, 1, PAL.outline);
  }
  if (!hasLeft) {
    buf.rect(0, 0, 3, TILE_PX, pal.baseLight);
    buf.rect(0, 0, 1, TILE_PX, PAL.outline);
  }
  if (!hasRight) {
    buf.rect(TILE_PX - 3, 0, 3, TILE_PX, pal.baseDark);
    buf.rect(TILE_PX - 1, 0, 1, TILE_PX, PAL.outline);
  }

  return buf.toCanvas();
}

function bakePlatformVariant(
  pal: BiomeTilePalette,
  capLeft: boolean,
  capRight: boolean,
): HTMLCanvasElement {
  const buf = new PixelBuffer(TILE_PX, TILE_PX, 1);
  // Heavy medieval oak & wrought-iron walkway deck (top surface at y=0 for 1:1 collision)
  buf.rect(0, 0, TILE_PX, 1, PAL.outline);
  buf.rect(0, 1, TILE_PX, 1, PAL.wood4);
  buf.rect(0, 2, TILE_PX, 3, PAL.wood3);
  buf.rect(0, 4, TILE_PX, 2, PAL.wood2);
  buf.rect(0, 5, TILE_PX, 1, PAL.outline);

  // Oak plank vertical seams & biome moss/trim flecks
  for (const sx of [8, 16]) {
    buf.rect(sx, 1, 1, 4, PAL.wood1);
    buf.setRaw(sx - 1, 2, PAL.gold3);
    buf.setRaw(sx + 1, 4, PAL.steel4);
  }
  buf.setRaw(4, 1, pal.topTrim);
  buf.setRaw(19, 1, pal.topTrim);

  // Structural iron-strapped beam & open diagonal lattice truss
  buf.rect(0, 6, TILE_PX, 3, PAL.iron0);
  buf.rect(0, 6, TILE_PX, 1, PAL.iron2);
  buf.rect(0, 8, TILE_PX, 1, PAL.iron1);
  for (let rx = 3; rx < TILE_PX; rx += 6) {
    buf.setRaw(rx, 7, PAL.steel4);
  }
  // Under-truss lattice
  buf.rect(0, 12, TILE_PX, 1, PAL.iron0);
  for (let lx = 0; lx < TILE_PX; lx += 8) {
    buf.line(lx, 9, lx + 4, 12, PAL.iron1, 1);
    buf.line(lx + 7, 9, lx + 3, 12, PAL.iron2, 1);
  }

  if (capLeft && capRight) {
    // 1-tile platform: chiseled stone-and-iron gothic corbel pedestal underneath
    buf.rect(0, 0, 4, 10, pal.baseLight);
    buf.rect(TILE_PX - 4, 0, 4, 10, pal.baseLight);
    buf.rect(0, 0, 1, 10, PAL.outline);
    buf.rect(TILE_PX - 1, 0, 1, 10, PAL.outline);
    buf.setRaw(2, 2, PAL.steel4);
    buf.setRaw(TILE_PX - 3, 2, PAL.steel4);
    buf.poly(
      [
        [5, 9],
        [18, 9],
        [15, 19],
        [8, 19],
      ],
      pal.baseDark,
    );
    buf.rect(8, 10, 8, 2, PAL.iron2);
    buf.rect(10, 13, 4, 5, pal.baseMid);
    buf.setRaw(11, 14, pal.accent);
  } else {
    if (capLeft) {
      buf.rect(0, 0, 5, 10, pal.baseLight);
      buf.rect(0, 0, 1, 10, PAL.outline);
      buf.rect(4, 1, 1, 8, PAL.iron2);
      buf.setRaw(2, 2, PAL.steel4);
      buf.setRaw(2, 7, PAL.steel4);
      // Sweeping wrought-iron scroll bracket
      buf.line(1, 10, 1, 19, PAL.iron1, 2);
      buf.line(2, 10, 10, 18, PAL.iron2, 2);
      buf.line(3, 10, 9, 16, PAL.steel3, 1);
      buf.setRaw(10, 18, PAL.steel4);
    }
    if (capRight) {
      buf.rect(TILE_PX - 5, 0, 5, 10, pal.baseLight);
      buf.rect(TILE_PX - 1, 0, 1, 10, PAL.outline);
      buf.rect(TILE_PX - 5, 1, 1, 8, PAL.iron2);
      buf.setRaw(TILE_PX - 3, 2, PAL.steel4);
      buf.setRaw(TILE_PX - 3, 7, PAL.steel4);
      buf.line(TILE_PX - 2, 10, TILE_PX - 2, 19, PAL.iron1, 2);
      buf.line(TILE_PX - 3, 10, TILE_PX - 11, 18, PAL.iron2, 2);
      buf.line(TILE_PX - 4, 10, TILE_PX - 10, 16, PAL.steel3, 1);
      buf.setRaw(TILE_PX - 11, 18, PAL.steel4);
    }
  }

  return buf.toCanvas();
}

function bakePlatformTiles(
  pal: BiomeTilePalette,
): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
  return [
    bakePlatformVariant(pal, true, true),
    bakePlatformVariant(pal, true, false),
    bakePlatformVariant(pal, false, false),
    bakePlatformVariant(pal, false, true),
  ];
}

function bakeSupportBeam(pal: BiomeTilePalette): HTMLCanvasElement {
  const buf = new PixelBuffer(TILE_PX, TILE_PX, 1);
  // 10px-wide timber-and-iron X-braced stanchion (x=7..16)
  buf.rect(7, 0, 10, TILE_PX, PAL.outline);
  buf.rect(8, 0, 8, TILE_PX, PAL.obsidian0);
  buf.rect(8, 0, 2, TILE_PX, PAL.wood2);
  buf.rect(14, 0, 2, TILE_PX, PAL.wood1);
  // Diagonal iron X-braces (upper & lower bays)
  buf.line(9, 2, 14, 10, PAL.iron2, 1);
  buf.line(14, 2, 9, 10, PAL.iron3, 1);
  buf.line(9, 13, 14, 21, PAL.iron2, 1);
  buf.line(14, 13, 9, 21, PAL.iron3, 1);
  // Riveted iron collar bands
  buf.rect(7, 0, 10, 2, PAL.iron2);
  buf.rect(7, 11, 10, 2, PAL.iron2);
  buf.setRaw(9, 0, pal.topHighlight);
  buf.setRaw(14, 0, PAL.steel4);
  buf.setRaw(9, 11, PAL.steel4);
  buf.setRaw(14, 11, PAL.steel4);
  return buf.toCanvas();
}

function bakeSpikesTile(): HTMLCanvasElement {
  const buf = new PixelBuffer(TILE_PX, TILE_PX, 1);
  const centers = [2, 6, 10, 14, 18, 22];
  for (const cx of centers) {
    buf.poly(
      [
        [cx - 2, TILE_PX - 3],
        [cx, 6],
        [cx + 2, TILE_PX - 3],
      ],
      PAL.steel2,
    );
    buf.line(cx, 6, cx - 1, TILE_PX - 3, PAL.steel4);
    buf.setRaw(cx, 6, PAL.crimson4);
    buf.setRaw(cx, 7, PAL.crimson3);
    buf.setRaw(cx, 8, PAL.crimson2);
  }
  buf.rect(0, TILE_PX - 3, TILE_PX, 3, PAL.iron0);
  buf.rect(0, TILE_PX - 3, TILE_PX, 1, PAL.iron2);
  buf.applyOutline(PAL.outline);
  return buf.toCanvas();
}

function bakeTorchAnim(): SpriteAnimation {
  const bufs: PixelBuffer[] = [];
  for (let i = 0; i < 4; i++) {
    const buf = new PixelBuffer(18, 26, PIXEL_SCALE);
    // Wrought-iron wall sconce with angled bracket & ring
    buf.rect(6, 13, 6, 2, PAL.iron2);
    buf.rect(8, 15, 2, 9, PAL.iron2);
    buf.line(4, 15, 8, 20, PAL.iron1, 1);
    buf.line(13, 15, 9, 20, PAL.iron1, 1);
    buf.rect(7, 21, 4, 3, PAL.iron3);
    buf.applyOutline(PAL.outline);

    // Dancing 4-shade flame + rising ember spark
    const sway = i === 1 ? -1 : i === 3 ? 1 : 0;
    const tall = i % 2 === 0 ? 0 : 2;
    buf.poly(
      [
        [6, 13],
        [9 + sway, 3 - tall],
        [12, 13],
      ],
      PAL.ember1,
    );
    buf.poly(
      [
        [7, 13],
        [9 + sway, 6 - tall],
        [11, 13],
      ],
      PAL.ember3,
    );
    buf.rect(8, 10, 2, 3, PAL.ember5);
    buf.set(9 + sway * 2, 2 - (i % 2), PAL.ember4);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 10, true);
}

function bakeBrazierAnim(): SpriteAnimation {
  const bufs: PixelBuffer[] = [];
  for (let i = 0; i < 4; i++) {
    const buf = new PixelBuffer(26, 30, PIXEL_SCALE);
    // Claw-footed riveted iron cauldron brazier with brass lion-ring rim
    buf.line(6, 28, 9, 20, PAL.iron2, 2);
    buf.line(20, 28, 17, 20, PAL.iron2, 2);
    buf.rect(12, 21, 2, 7, PAL.iron1);
    buf.poly(
      [
        [4, 14],
        [22, 14],
        [18, 21],
        [8, 21],
      ],
      PAL.iron2,
    );
    buf.rect(5, 14, 16, 2, PAL.gold3);
    buf.set(8, 17, PAL.steel4);
    buf.set(17, 17, PAL.steel4);
    buf.applyOutline(PAL.outline);

    // Roaring coals & multi-tongued flames + spark
    const sway = i === 1 ? -2 : i === 3 ? 2 : 0;
    buf.poly(
      [
        [6, 14],
        [13 + sway, 2 + (i % 2)],
        [20, 14],
      ],
      PAL.ember1,
    );
    buf.poly(
      [
        [8, 14],
        [13 + sway, 5 + (i % 2)],
        [18, 14],
      ],
      PAL.ember3,
    );
    buf.rect(11, 10, 4, 4, PAL.ember5);
    buf.set(13 - sway, 1 + (i % 2), PAL.ember4);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 10, true);
}

function bakeBannerAnim(pal: BiomeTilePalette, primary: string, trim: string): SpriteAnimation {
  const bufs: PixelBuffer[] = [];
  for (let i = 0; i < 4; i++) {
    const buf = new PixelBuffer(18, 38, PIXEL_SCALE);
    const wave = i === 1 ? 1 : i === 3 ? -1 : 0;
    // Brass spear-finial crossbar
    buf.rect(1, 2, 16, 2, PAL.gold3);
    buf.set(0, 2, PAL.gold4);
    buf.set(17, 2, PAL.gold4);
    buf.rect(4, 4, 10, 24, primary);
    buf.rect(5, 4, 2, 22, trim);
    buf.rect(12, 4, 1, 22, trim);
    // Battle-torn swallowtail bottom + central crest
    buf.poly(
      [
        [4, 28],
        [6 + wave, 35],
        [9, 30],
        [12 + wave, 35],
        [14, 28],
      ],
      primary,
    );
    buf.rect(8, 9, 2, 10, pal.topHighlight);
    buf.rect(6, 12, 6, 2, pal.topHighlight);
    buf.applyOutline(PAL.outline);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 4, true);
}

function bakePortalAnim(): SpriteAnimation {
  const bufs: PixelBuffer[] = [];
  for (let i = 0; i < 6; i++) {
    const buf = new PixelBuffer(42, 56, PIXEL_SCALE);
    // Stepped stone threshold & twin carved gothic columns
    buf.rect(2, 52, 38, 3, PAL.stone2);
    buf.rect(4, 28, 34, 24, PAL.stone1);
    buf.ellipse(21, 28, 17, 23, PAL.stone1);
    buf.rect(5, 28, 4, 24, PAL.stone3);
    buf.rect(33, 28, 4, 24, PAL.stone3);
    buf.ellipse(21, 28, 12, 19, PAL.void);
    buf.rect(9, 28, 24, 24, PAL.void);
    // Keystone skull crest & pulsing runes on arch
    buf.rect(19, 5, 4, 5, PAL.gold3);
    for (let a = 0; a < 7; a++) {
      const angle = -Math.PI + (a / 6) * Math.PI;
      const rx = 21 + Math.round(Math.cos(angle) * 14);
      const ry = 28 + Math.round(Math.sin(angle) * 21);
      buf.set(rx, ry, i % 2 === a % 2 ? PAL.soul4 : PAL.soul2);
    }
    // Multi-ring swirling spectral vortex + orbiting star-sparks
    const pulse = (i % 3) - 1;
    buf.shadedEllipse(21, 31, 10 + pulse, 16 + pulse, PAL.soul0, PAL.soul2, PAL.soul4);
    buf.ellipse(21, 31, 4, 9, PAL.soul5);
    buf.set(21 + Math.round(Math.cos(i) * 7), 31 + Math.round(Math.sin(i) * 11), PAL.soul5);
    buf.set(21 - Math.round(Math.cos(i) * 6), 31 - Math.round(Math.sin(i) * 9), PAL.gold4);
    buf.applyOutline(PAL.outline);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 9, true);
}

function bakeRoseWindow(tintMain: string, tintAccent: string): HTMLCanvasElement {
  const buf = new PixelBuffer(52, 68, PIXEL_SCALE);
  // Pointed gothic arch stone frame with upper circular 8-petal rose medallion + twin lancets
  buf.ellipse(26, 24, 22, 22, PAL.stone0);
  buf.rect(4, 24, 44, 40, PAL.stone0);
  buf.ellipse(26, 22, 18, 18, tintMain);
  buf.rect(8, 24, 36, 38, tintMain);
  // 8-petal upper rose medallion
  buf.ellipse(26, 21, 13, 13, tintAccent);
  buf.ellipse(26, 21, 6, 6, PAL.gold4);
  buf.line(26, 5, 26, 62, PAL.outline, 2);
  buf.line(8, 21, 44, 21, PAL.outline, 2);
  buf.line(14, 9, 38, 33, PAL.outline, 1);
  buf.line(38, 9, 14, 33, PAL.outline, 1);
  // Lower twin lancet diamond mullions
  buf.rect(14, 38, 8, 20, tintAccent);
  buf.rect(30, 38, 8, 20, tintAccent);
  buf.line(8, 46, 44, 46, PAL.outline, 1);
  // Stepped stone window sill
  buf.rect(2, 62, 48, 5, PAL.stone2);
  buf.rect(2, 62, 48, 1, PAL.stone4);
  buf.applyOutline(PAL.outline);
  return buf.toCanvas();
}

function bakePillar(pal: BiomeTilePalette): HTMLCanvasElement {
  const buf = new PixelBuffer(24, 68, PIXEL_SCALE);
  // 3-stepped octagonal plinth base & flared gothic capital
  buf.rect(2, 62, 20, 5, pal.baseDark);
  buf.rect(3, 57, 18, 5, pal.baseMid);
  buf.rect(6, 6, 12, 52, pal.baseDark);
  buf.rect(7, 6, 9, 52, pal.baseMid);
  buf.rect(8, 6, 3, 52, pal.baseLight);
  buf.rect(9, 6, 1, 52, pal.topHighlight);
  // Carved mid-shaft stone collar ring
  buf.rect(5, 31, 14, 4, pal.baseLight);
  buf.rect(11, 32, 2, 2, pal.accent);
  // Flared gothic capital
  buf.rect(2, 1, 20, 5, pal.baseLight);
  buf.rect(4, 6, 16, 2, pal.topTrim);
  buf.applyOutline(PAL.outline);
  return buf.toCanvas();
}

function bakeGothicStatue(pal: BiomeTilePalette): HTMLCanvasElement {
  const buf = new PixelBuffer(26, 48, PIXEL_SCALE);
  // Stepped carved stone pedestal
  buf.rect(3, 41, 20, 6, pal.baseDark);
  buf.rect(5, 36, 16, 5, pal.baseMid);
  buf.rect(4, 35, 18, 2, pal.topTrim);
  // Hooded gothic sentinel statue holding a downward-resting greatsword
  buf.poly(
    [
      [6, 35],
      [9, 14],
      [17, 14],
      [20, 35],
    ],
    pal.baseMid,
  );
  buf.rect(9, 15, 4, 19, pal.baseLight);
  buf.shadedEllipse(13, 10, 5, 6, pal.baseDark, pal.baseMid, pal.baseLight);
  buf.set(12, 10, pal.accent);
  buf.set(14, 10, pal.accent);
  // Resting greatsword down center
  buf.rect(12, 16, 2, 19, PAL.steel3);
  buf.rect(9, 19, 8, 2, PAL.gold3);
  buf.applyTopRim(pal.topHighlight);
  buf.applyOutline(PAL.outline);
  return buf.toCanvas();
}

function bakeHeroPedestal(): HTMLCanvasElement {
  const buf = new PixelBuffer(56, 42, PIXEL_SCALE);
  // Grand Sanctuary Hall of Heroes Monument Dais
  buf.rect(2, 36, 52, 5, PAL.stone1);
  buf.rect(6, 31, 44, 5, PAL.stone2);
  buf.rect(8, 31, 40, 1, PAL.gold3);
  // Flanking short fluted columns with burning golden braziers
  for (const cx of [7, 43]) {
    buf.rect(cx, 15, 6, 16, PAL.stone3);
    buf.rect(cx - 1, 13, 8, 3, PAL.gold3);
    buf.poly([[cx, 13], [cx + 3, 5], [cx + 6, 13]], PAL.ember3);
    buf.rect(cx + 2, 9, 2, 4, PAL.ember5);
  }
  // Central heraldic crest tablet
  buf.rect(18, 17, 20, 14, PAL.stone1);
  buf.rect(20, 19, 16, 10, PAL.obsidian2);
  buf.rect(27, 20, 2, 8, PAL.gold4);
  buf.rect(23, 23, 10, 2, PAL.gold3);
  buf.applyTopRim(PAL.gold4);
  buf.applyOutline(PAL.outline);
  return buf.toCanvas();
}

function bakeProps(): Pick<
  TilesetAssets,
  | 'chestClosed'
  | 'chestOpen'
  | 'barrel'
  | 'crate'
  | 'soulAltar'
  | 'relicShrine'
  | 'merchantStand'
  | 'curseBrazier'
  | 'chain'
  | 'trinityScrollPedestal'
  | 'bloodShrine'
  | 'waystoneAnim'
  | 'loreTablet'
  | 'trainingDummy'
  | 'deedsLectern'
  | 'consecratedBanner'
  | 'heroPedestal'
> {
  // Chest closed
  const cc = new PixelBuffer(24, 20, PIXEL_SCALE);
  cc.rect(2, 6, 20, 13, PAL.wood1);
  cc.rect(3, 7, 18, 11, PAL.wood2);
  cc.rect(2, 4, 20, 4, PAL.gold2);
  cc.rect(3, 5, 18, 1, PAL.gold4);
  cc.rect(10, 8, 4, 6, PAL.gold3);
  cc.set(12, 10, PAL.soul4);
  cc.applyOutline(PAL.outline);

  // Chest open
  const co = new PixelBuffer(24, 20, PIXEL_SCALE);
  co.rect(2, 10, 20, 9, PAL.wood1);
  co.rect(3, 2, 18, 6, PAL.wood2);
  co.rect(2, 2, 20, 2, PAL.gold3);
  co.rect(4, 9, 16, 3, PAL.gold4);
  co.applyOutline(PAL.outline);

  // Barrel
  const br = new PixelBuffer(18, 20, PIXEL_SCALE);
  br.shadedEllipse(9, 11, 7, 8, PAL.wood0, PAL.wood2, PAL.wood3);
  br.rect(2, 7, 14, 2, PAL.iron3);
  br.rect(2, 13, 14, 2, PAL.iron3);
  br.applyOutline(PAL.outline);

  // Crate
  const cr = new PixelBuffer(18, 18, PIXEL_SCALE);
  cr.rect(1, 1, 16, 16, PAL.wood1);
  cr.rect(2, 2, 14, 14, PAL.wood3);
  cr.line(2, 2, 15, 15, PAL.wood1, 2);
  cr.rect(1, 1, 16, 2, PAL.wood4);
  cr.applyOutline(PAL.outline);

  // Soul Altar (Sanctuary centerpiece: tiered altar + embroidered cloth + candles + faceted Soul Prism Totem)
  const sa = new PixelBuffer(44, 54, PIXEL_SCALE);
  sa.rect(3, 46, 38, 7, PAL.stone1);
  sa.rect(6, 40, 32, 6, PAL.stone2);
  sa.rect(11, 22, 22, 18, PAL.stone1);
  sa.rect(13, 22, 18, 3, PAL.gold3);
  // Crimson-gold embroidered cloth + skull relief
  sa.rect(17, 25, 10, 13, PAL.crimson1);
  sa.rect(19, 25, 6, 11, PAL.crimson2);
  sa.rect(20, 28, 4, 4, PAL.bone3);
  // Twin side brass candlesticks with cyan flames
  for (const cx of [10, 34]) {
    sa.rect(cx - 1, 18, 2, 5, PAL.gold3);
    sa.set(cx, 15, PAL.soul4);
    sa.set(cx, 16, PAL.soul5);
  }
  // Faceted levitating Soul Prism Totem + flanking crystal shards
  sa.poly(
    [
      [22, 2],
      [29, 11],
      [22, 20],
      [15, 11],
    ],
    PAL.soul3,
  );
  sa.poly(
    [
      [22, 5],
      [25, 11],
      [22, 17],
      [19, 11],
    ],
    PAL.soul5,
  );
  sa.set(13, 10, PAL.soul4);
  sa.set(31, 10, PAL.soul4);
  sa.applyTopRim(PAL.soul5);
  sa.applyOutline(PAL.outline);

  // Relic Shrine (Winged Seraph Statue Totem holding radiant chalice orb)
  const rs = new PixelBuffer(32, 44, PIXEL_SCALE);
  rs.rect(5, 37, 22, 6, PAL.stone2);
  rs.rect(9, 22, 14, 15, PAL.stone1);
  rs.rect(7, 20, 18, 3, PAL.gold3);
  // Spread stone wings
  rs.poly([[12, 20], [3, 9], [6, 20]], PAL.stone3);
  rs.poly([[20, 20], [29, 9], [26, 20]], PAL.stone3);
  rs.shadedEllipse(16, 15, 4, 5, PAL.stone0, PAL.stone2, PAL.stone4);
  // Radiant golden reliquary orb
  rs.shadedEllipse(16, 7, 5, 5, PAL.gold2, PAL.gold4, PAL.soul5);
  rs.applyTopRim(PAL.gold5);
  rs.applyOutline(PAL.outline);

  // Merchant Hooded Peddler Stand (timber booth + slanted awning + hanging lantern + wares)
  const ms = new PixelBuffer(38, 42, PIXEL_SCALE);
  ms.rect(3, 28, 32, 13, PAL.wood1);
  ms.rect(4, 28, 30, 3, PAL.gold3);
  ms.rect(5, 12, 2, 16, PAL.wood2);
  ms.rect(31, 12, 2, 16, PAL.wood2);
  // Slanted striped awning
  ms.poly([[2, 12], [36, 10], [36, 15], [2, 16]], PAL.crimson1);
  ms.rect(8, 12, 4, 4, PAL.gold3);
  ms.rect(20, 11, 4, 4, PAL.gold3);
  // Hanging lantern + potions
  ms.rect(6, 16, 1, 3, PAL.iron3);
  ms.rect(5, 19, 3, 4, PAL.ember4);
  ms.rect(6, 25, 5, 3, PAL.crimson3);
  ms.rect(14, 25, 6, 3, PAL.gold4);
  // Cloaked merchant behind counter
  ms.poly([[13, 28], [19, 14], [27, 28]], PAL.violet1);
  ms.shadedEllipse(20, 18, 4, 4, PAL.obsidian0, PAL.violet2, PAL.violet3);
  ms.set(19, 18, PAL.gold4);
  ms.set(21, 18, PAL.gold4);
  ms.applyOutline(PAL.outline);

  // Curse Brazier (Cursed Skull Totem Tripod erupting with violet/crimson flames)
  const cb = new PixelBuffer(30, 40, PIXEL_SCALE);
  cb.line(6, 38, 10, 27, PAL.iron2, 2);
  cb.line(24, 38, 20, 27, PAL.iron2, 2);
  cb.rect(14, 28, 2, 10, PAL.iron1);
  cb.poly([[4, 18], [26, 18], [21, 28], [9, 28]], PAL.iron2);
  // Ring of horned bone skulls
  for (const sx of [8, 15, 22]) {
    cb.shadedEllipse(sx, 18, 3, 3, PAL.bone1, PAL.bone3, PAL.bone4);
    cb.set(sx - 1, 18, PAL.crimson4);
    cb.set(sx + 1, 18, PAL.crimson4);
  }
  cb.poly([[9, 16], [15, 3], [21, 16]], PAL.violet3);
  cb.poly([[11, 16], [15, 7], [19, 16]], PAL.crimson4);
  cb.rect(14, 11, 2, 4, PAL.ember4);
  cb.applyOutline(PAL.outline);

  // Hanging Chain
  const ch = new PixelBuffer(8, 32, PIXEL_SCALE);
  for (let y = 0; y < 32; y += 6) {
    ch.rect(2, y, 4, 5, PAL.iron3);
    ch.rect(3, y + 1, 2, 3, null);
    ch.rect(2, y, 4, 1, PAL.steel4);
  }

  // Trinity Scroll Pedestal (Winged Marble Reliquary Totem + levitating glowing scroll)
  const ts = new PixelBuffer(30, 42, PIXEL_SCALE);
  ts.rect(5, 35, 20, 6, PAL.stone2);
  ts.rect(10, 20, 10, 15, PAL.stone1);
  ts.rect(12, 22, 6, 11, PAL.crimson2);
  ts.rect(7, 18, 16, 3, PAL.gold3);
  // Brass wing cradle
  ts.poly([[9, 18], [4, 11], [8, 17]], PAL.gold4);
  ts.poly([[21, 18], [26, 11], [22, 17]], PAL.gold4);
  // Levitating parchment scroll with Trinity runes
  ts.rect(8, 5, 14, 10, PAL.bone4);
  ts.rect(7, 5, 2, 10, PAL.crimson3);
  ts.rect(21, 5, 2, 10, PAL.violet3);
  ts.rect(13, 8, 4, 4, PAL.venom3);
  ts.applyOutline(PAL.outline);

  // Blood Shrine (Horned Gargoyle Idol Totem holding brimming blood chalice)
  const bs = new PixelBuffer(32, 42, PIXEL_SCALE);
  bs.rect(5, 35, 22, 6, PAL.obsidian1);
  bs.rect(10, 20, 12, 15, PAL.obsidian2);
  bs.shadedEllipse(16, 25, 5, 5, PAL.obsidian0, PAL.obsidian2, PAL.stone3);
  bs.line(12, 22, 8, 17, PAL.bone3, 2);
  bs.line(20, 22, 24, 17, PAL.bone3, 2);
  bs.set(14, 24, PAL.crimson4);
  bs.set(18, 24, PAL.crimson4);
  bs.poly([[6, 9], [26, 9], [21, 18], [11, 18]], PAL.gold2);
  bs.rect(8, 8, 16, 3, PAL.crimson4);
  bs.line(12, 11, 12, 16, PAL.crimson3, 1);
  bs.line(20, 11, 20, 15, PAL.crimson3, 1);
  bs.set(16, 6, PAL.crimson5);
  bs.applyOutline(PAL.outline);

  // Waystone Fast-Travel Obelisk (Split-Crown Runic Obelisk Totem, 4f)
  const wsBufs: PixelBuffer[] = [];
  for (let i = 0; i < 4; i++) {
    const wb = new PixelBuffer(26, 46, PIXEL_SCALE);
    wb.rect(4, 39, 18, 6, PAL.stone2);
    wb.rect(6, 35, 14, 4, PAL.moss1);
    wb.poly([[7, 35], [8, 14], [11, 6], [11, 14], [15, 14], [15, 6], [18, 14], [19, 35]], PAL.stone1);
    const glow = i % 2 === 0 ? PAL.soul4 : PAL.soul5;
    wb.rect(12, 16, 2, 16, PAL.soul2);
    wb.rect(12, 17 + i * 2, 2, 4, glow);
    // Levitating pulsing diamond Soul Core between split horns
    wb.poly([[13, 3], [16, 7], [13, 11], [10, 7]], glow);
    wb.set(8 + (i % 2) * 10, 9 - (i % 3), PAL.soul5);
    wb.applyOutline(PAL.outline);
    wsBufs.push(wb);
  }

  // Carved Arched Runestone Lore Stele
  const lt = new PixelBuffer(22, 30, PIXEL_SCALE);
  lt.rect(3, 24, 16, 5, PAL.stone2);
  lt.ellipse(11, 11, 7, 9, PAL.stone1);
  lt.rect(4, 11, 14, 13, PAL.stone1);
  lt.rect(6, 22, 4, 2, PAL.moss2);
  lt.rect(7, 8, 8, 1, PAL.soul3);
  lt.rect(7, 12, 8, 1, PAL.stone4);
  lt.rect(7, 16, 6, 1, PAL.stone4);
  lt.applyOutline(PAL.outline);

  // Sanctuary Combat Training Dummy (Armored knight dummy + target shield)
  const td = new PixelBuffer(28, 40, PIXEL_SCALE);
  td.rect(12, 21, 4, 18, PAL.wood2);
  td.rect(6, 36, 16, 3, PAL.wood1);
  td.rect(5, 13, 18, 3, PAL.wood3);
  td.rect(9, 12, 10, 12, PAL.steel1);
  td.rect(10, 13, 8, 9, PAL.steel3);
  td.shadedEllipse(14, 7, 4, 4, PAL.bone1, PAL.bone2, PAL.bone4);
  td.rect(12, 6, 4, 2, PAL.crimson3);
  td.shadedEllipse(21, 17, 3, 4, PAL.wood1, PAL.wood3, PAL.gold3);
  td.applyOutline(PAL.outline);

  // Sanctuary Book of Deeds Lectern (Gilded lectern + open illuminated tome)
  const dl = new PixelBuffer(26, 36, PIXEL_SCALE);
  dl.rect(6, 30, 14, 5, PAL.wood1);
  dl.rect(11, 16, 4, 14, PAL.wood2);
  dl.poly([[4, 13], [22, 9], [22, 17], [4, 19]], PAL.gold3);
  dl.rect(6, 12, 14, 5, PAL.bone4);
  dl.rect(12, 17, 2, 5, PAL.crimson3);
  dl.applyOutline(PAL.outline);

  // Seraphina's Consecrated Golden Sun-Halberd Totem
  const cbTotem = new PixelBuffer(24, 44, PIXEL_SCALE);
  cbTotem.rect(11, 4, 2, 39, PAL.gold3);
  cbTotem.rect(5, 8, 14, 2, PAL.gold4);
  cbTotem.set(12, 2, PAL.gold5);
  cbTotem.poly([[6, 10], [18, 10], [18, 28], [12, 34], [6, 28]], PAL.bone4);
  cbTotem.rect(11, 13, 2, 14, PAL.gold3);
  cbTotem.rect(8, 17, 8, 2, PAL.gold3);
  cbTotem.applyOutline(PAL.outline);

  return {
    chestClosed: cc.toCanvas(),
    chestOpen: co.toCanvas(),
    barrel: br.toCanvas(),
    crate: cr.toCanvas(),
    soulAltar: sa.toCanvas(),
    relicShrine: rs.toCanvas(),
    merchantStand: ms.toCanvas(),
    curseBrazier: cb.toCanvas(),
    chain: ch.toCanvas(),
    trinityScrollPedestal: ts.toCanvas(),
    bloodShrine: bs.toCanvas(),
    waystoneAnim: bakeAnimation(wsBufs, 6, true),
    loreTablet: lt.toCanvas(),
    trainingDummy: td.toCanvas(),
    deedsLectern: dl.toCanvas(),
    consecratedBanner: cbTotem.toCanvas(),
    heroPedestal: bakeHeroPedestal(),
  };
}

function bakeFloorClutter(biome: BiomeId): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
  const mk = () => new PixelBuffer(16, 10, PIXEL_SCALE);
  const b0 = mk();
  const b1 = mk();
  const b2 = mk();

  if (biome === 'crypt') {
    // 0: Mossy stone rubble + bone shard
    b0.rect(3, 6, 5, 3, PAL.stone1);
    b0.rect(4, 6, 3, 1, PAL.moss2);
    b0.rect(9, 7, 4, 2, PAL.bone2);
    b0.set(12, 6, PAL.bone4);
    // 1: Rusted chain links + pebble
    b1.rect(2, 7, 4, 2, PAL.steel1);
    b1.rect(5, 6, 4, 2, PAL.steel2);
    b1.rect(10, 7, 3, 2, PAL.stone2);
    // 2: Cracked skull + moss tuft
    b2.shadedEllipse(6, 6, 3, 3, PAL.bone1, PAL.bone2, PAL.bone4);
    b2.set(5, 6, PAL.outline);
    b2.set(7, 6, PAL.outline);
    b2.rect(10, 7, 3, 2, PAL.moss2);
  } else if (biome === 'catacombs') {
    // 0: Melted candle stub + warm ember
    b0.rect(6, 4, 3, 5, PAL.bone3);
    b0.rect(4, 8, 7, 1, PAL.bone1);
    b0.set(7, 2, PAL.ember3);
    b0.set(7, 3, PAL.ember2);
    // 1: Bone shard + crimson droplet
    b1.rect(3, 7, 5, 2, PAL.bone2);
    b1.rect(9, 7, 4, 2, PAL.crimson1);
    b1.set(10, 7, PAL.crimson3);
    // 2: Broken urn shards + ash
    b2.poly([[3, 8], [6, 5], [8, 8]], PAL.wood2);
    b2.rect(9, 7, 4, 2, PAL.stone1);
  } else if (biome === 'ossuary') {
    // 0: Twin rib bones + moss
    b0.rect(3, 7, 6, 2, PAL.bone2);
    b0.rect(8, 6, 4, 2, PAL.bone3);
    b0.rect(2, 8, 3, 1, PAL.venom2);
    // 1: Venomous mushroom cluster
    b1.rect(5, 5, 2, 4, PAL.bone2);
    b1.rect(3, 3, 6, 2, PAL.venom2);
    b1.set(5, 3, PAL.venom4);
    b1.rect(10, 6, 2, 3, PAL.bone2);
    b1.rect(9, 5, 4, 2, PAL.venom3);
    // 2: Jawbone + pebbles
    b2.rect(4, 6, 6, 3, PAL.bone3);
    b2.set(5, 6, PAL.bone4);
    b2.set(7, 6, PAL.bone4);
    b2.rect(11, 7, 3, 2, PAL.stone1);
  } else if (biome === 'citadel') {
    // 0: Obsidian shard + gold trim
    b0.poly([[3, 8], [7, 4], [10, 8]], PAL.obsidian2);
    b0.rect(6, 6, 2, 1, PAL.gold3);
    b0.rect(11, 7, 3, 2, PAL.obsidian3);
    // 1: Broken blade hilt + ash
    b1.rect(3, 7, 6, 2, PAL.steel2);
    b1.rect(8, 5, 2, 4, PAL.gold2);
    b1.rect(11, 7, 3, 2, PAL.ember2);
    // 2: Scorched banner scrap
    b2.rect(3, 7, 8, 2, PAL.crimson1);
    b2.rect(5, 7, 3, 1, PAL.gold3);
    b2.set(12, 8, PAL.ember3);
  } else {
    // Sanctuary: fallen gold leaf + candle stub + carved stone
    b0.rect(4, 7, 4, 2, PAL.gold3);
    b0.rect(9, 7, 4, 2, PAL.stone2);
    b1.rect(6, 5, 3, 4, PAL.bone3);
    b1.set(7, 3, PAL.gold4);
    b1.set(7, 4, PAL.ember3);
    b2.rect(4, 6, 6, 3, PAL.stone3);
    b2.rect(10, 7, 3, 2, PAL.moss2);
  }

  for (const buf of [b0, b1, b2]) {
    buf.applyOutline(PAL.outline);
  }
  return [b0.toCanvas(), b1.toCanvas(), b2.toCanvas()];
}

export function bakeTilesetAssets(): TilesetAssets {
  const biomes: BiomeId[] = ['sanctuary', 'crypt', 'catacombs', 'ossuary', 'citadel'];
  const solidTiles = {} as Record<BiomeId, HTMLCanvasElement[][]>;
  const platformTiles = {} as Record<
    BiomeId,
    [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]
  >;
  const supportBeam = {} as Record<BiomeId, HTMLCanvasElement>;
  const bannerAnim = {} as Record<BiomeId, SpriteAnimation>;
  const roseWindow = {} as Record<BiomeId, HTMLCanvasElement>;
  const pillar = {} as Record<BiomeId, HTMLCanvasElement>;
  const statue = {} as Record<BiomeId, HTMLCanvasElement>;
  const floorClutter = {} as Record<
    BiomeId,
    [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement]
  >;

  for (const b of biomes) {
    const pal = BIOME_TILE_PALETTES[b];
    const maskRows: HTMLCanvasElement[][] = [];
    for (let mask = 0; mask < 16; mask++) {
      maskRows.push([
        bakeSolidTile(pal, mask, 0),
        bakeSolidTile(pal, mask, 1),
        bakeSolidTile(pal, mask, 2),
      ]);
    }
    solidTiles[b] = maskRows;
    platformTiles[b] = bakePlatformTiles(pal);
    supportBeam[b] = bakeSupportBeam(pal);
    pillar[b] = bakePillar(pal);
    statue[b] = bakeGothicStatue(pal);
    floorClutter[b] = bakeFloorClutter(b);

    if (b === 'sanctuary') {
      bannerAnim[b] = bakeBannerAnim(pal, PAL.soul1, PAL.gold3);
      roseWindow[b] = bakeRoseWindow(PAL.soul2, PAL.gold3);
    } else if (b === 'crypt') {
      bannerAnim[b] = bakeBannerAnim(pal, PAL.moss1, PAL.steel3);
      roseWindow[b] = bakeRoseWindow(PAL.soul1, PAL.moss3);
    } else if (b === 'catacombs') {
      bannerAnim[b] = bakeBannerAnim(pal, PAL.crimson1, PAL.gold2);
      roseWindow[b] = bakeRoseWindow(PAL.crimson1, PAL.crimson3);
    } else if (b === 'ossuary') {
      bannerAnim[b] = bakeBannerAnim(pal, PAL.venom1, PAL.bone3);
      roseWindow[b] = bakeRoseWindow(PAL.venom1, PAL.soul4);
    } else {
      bannerAnim[b] = bakeBannerAnim(pal, PAL.violet1, PAL.ember3);
      roseWindow[b] = bakeRoseWindow(PAL.ember1, PAL.gold3);
    }
  }

  return {
    solidTiles,
    platformTiles,
    supportBeam,
    spikesTile: bakeSpikesTile(),
    torchAnim: bakeTorchAnim(),
    brazierAnim: bakeBrazierAnim(),
    bannerAnim,
    portalAnim: bakePortalAnim(),
    roseWindow,
    pillar,
    statue,
    floorClutter,
    ...bakeProps(),
  };
}
