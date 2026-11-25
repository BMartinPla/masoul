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
  // Heavy medieval oak & iron-strapped walkway beam (24x24)
  buf.rect(0, 0, TILE_PX, 7, PAL.wood1);
  buf.rect(0, 1, TILE_PX, 5, PAL.wood2);
  buf.rect(0, 1, TILE_PX, 1, PAL.wood4);
  buf.rect(0, 3, TILE_PX, 1, PAL.wood1);
  buf.rect(0, 6, TILE_PX, 1, PAL.outline);

  // Continuous lower iron truss bar
  buf.rect(0, 7, TILE_PX, 2, PAL.iron0);
  buf.rect(0, 7, TILE_PX, 1, PAL.iron2);

  if (capLeft) {
    buf.rect(0, 0, 4, 9, pal.baseLight);
    buf.rect(0, 0, 1, 9, PAL.outline);
    buf.setRaw(2, 2, PAL.steel4);
    buf.setRaw(2, 5, PAL.steel4);
    buf.line(2, 8, 7, 14, PAL.iron1, 2);
    buf.line(3, 8, 7, 13, PAL.steel3, 1);
  } else {
    buf.setRaw(0, 2, PAL.wood0);
    buf.setRaw(0, 4, PAL.wood0);
  }

  if (capRight) {
    buf.rect(TILE_PX - 4, 0, 4, 9, pal.baseLight);
    buf.rect(TILE_PX - 1, 0, 1, 9, PAL.outline);
    buf.setRaw(TILE_PX - 3, 2, PAL.steel4);
    buf.setRaw(TILE_PX - 3, 5, PAL.steel4);
    buf.line(TILE_PX - 3, 8, TILE_PX - 8, 14, PAL.iron1, 2);
    buf.line(TILE_PX - 4, 8, TILE_PX - 8, 13, PAL.steel3, 1);
  } else {
    buf.rect(12, 1, 1, 5, PAL.wood0);
    buf.setRaw(12, 2, PAL.steel3);
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
  buf.rect(9, 0, 6, TILE_PX, pal.mortar);
  buf.rect(10, 0, 4, TILE_PX, PAL.wood0);
  buf.rect(11, 0, 2, TILE_PX, PAL.wood1);
  buf.rect(9, 11, 6, 2, PAL.iron1);
  buf.setRaw(11, 11, PAL.steel3);
  buf.setRaw(12, 11, PAL.steel3);
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
    const buf = new PixelBuffer(16, 24, PIXEL_SCALE);
    // Iron wall sconce
    buf.rect(7, 13, 2, 9, PAL.iron2);
    buf.rect(5, 12, 6, 2, PAL.iron3);
    buf.rect(6, 18, 4, 2, PAL.iron1);

    // Animated flame tongue
    const sway = i === 1 ? -1 : i === 3 ? 1 : 0;
    const tall = i % 2 === 0 ? 0 : 1;
    buf.poly(
      [
        [5, 12],
        [8 + sway, 3 - tall],
        [11, 12],
      ],
      PAL.ember1,
    );
    buf.poly(
      [
        [6, 12],
        [8 + sway, 5 - tall],
        [10, 12],
      ],
      PAL.ember3,
    );
    buf.rect(7, 9, 2, 3, PAL.ember5);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 10, true);
}

function bakeBrazierAnim(): SpriteAnimation {
  const bufs: PixelBuffer[] = [];
  for (let i = 0; i < 4; i++) {
    const buf = new PixelBuffer(24, 28, PIXEL_SCALE);
    // Tripod wrought-iron bowl
    buf.line(6, 27, 9, 19, PAL.iron2, 2);
    buf.line(18, 27, 15, 19, PAL.iron2, 2);
    buf.rect(11, 20, 2, 7, PAL.iron1);
    buf.poly(
      [
        [4, 14],
        [20, 14],
        [17, 20],
        [7, 20],
      ],
      PAL.iron2,
    );
    buf.rect(5, 14, 14, 2, PAL.gold2);
    // Roaring coals & flames
    const sway = i === 1 ? -2 : i === 3 ? 2 : 0;
    buf.poly(
      [
        [6, 14],
        [12 + sway, 2 + (i % 2)],
        [18, 14],
      ],
      PAL.ember1,
    );
    buf.poly(
      [
        [8, 14],
        [12 + sway, 5 + (i % 2)],
        [16, 14],
      ],
      PAL.ember3,
    );
    buf.rect(10, 10, 4, 4, PAL.ember5);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 10, true);
}

function bakeBannerAnim(pal: BiomeTilePalette, primary: string, trim: string): SpriteAnimation {
  const bufs: PixelBuffer[] = [];
  for (let i = 0; i < 4; i++) {
    const buf = new PixelBuffer(16, 36, PIXEL_SCALE);
    const wave = i === 1 ? 1 : i === 3 ? -1 : 0;
    buf.rect(1, 1, 14, 2, PAL.gold3);
    buf.rect(3, 3, 10, 24, primary);
    buf.rect(4, 3, 2, 22, trim);
    // Swallowtail bottom
    buf.poly(
      [
        [3, 27],
        [8 + wave, 34],
        [13, 27],
      ],
      primary,
    );
    buf.rect(6, 9, 4, 8, pal.topHighlight);
    buf.applyOutline(PAL.outline);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 4, true);
}

function bakePortalAnim(): SpriteAnimation {
  const bufs: PixelBuffer[] = [];
  for (let i = 0; i < 6; i++) {
    const buf = new PixelBuffer(36, 52, PIXEL_SCALE);
    // Carved gothic stone archway
    buf.ellipse(18, 28, 15, 22, PAL.stone1);
    buf.rect(3, 28, 30, 24, PAL.stone1);
    buf.ellipse(18, 28, 11, 18, PAL.void);
    buf.rect(7, 28, 22, 24, PAL.void);
    // Runes on arch
    for (let a = 0; a < 5; a++) {
      const angle = -Math.PI + (a / 4) * Math.PI;
      const rx = 18 + Math.round(Math.cos(angle) * 13);
      const ry = 28 + Math.round(Math.sin(angle) * 20);
      buf.set(rx, ry, i % 2 === a % 2 ? PAL.soul4 : PAL.soul2);
    }
    // Swirling spectral vortex inside arch
    const pulse = (i % 3) - 1;
    buf.shadedEllipse(18, 30, 9 + pulse, 15 + pulse, PAL.soul0, PAL.soul2, PAL.soul4);
    buf.ellipse(18, 30, 4, 8, PAL.soul5);
    buf.set(18 + Math.round(Math.cos(i) * 6), 30 + Math.round(Math.sin(i) * 10), PAL.soul5);
    buf.applyOutline(PAL.outline);
    bufs.push(buf);
  }
  return bakeAnimation(bufs, 9, true);
}

function bakeRoseWindow(tintMain: string, tintAccent: string): HTMLCanvasElement {
  const buf = new PixelBuffer(48, 64, PIXEL_SCALE);
  // Pointed gothic lancet stone frame
  buf.ellipse(24, 24, 20, 22, PAL.stone0);
  buf.rect(4, 24, 40, 38, PAL.stone0);
  buf.ellipse(24, 24, 16, 18, tintMain);
  buf.rect(8, 24, 32, 36, tintMain);
  // Stained glass lead mullions & colorful petals
  buf.ellipse(24, 22, 11, 11, tintAccent);
  buf.ellipse(24, 22, 5, 5, PAL.gold4);
  buf.line(24, 6, 24, 60, PAL.outline, 2);
  buf.line(8, 22, 40, 22, PAL.outline, 2);
  buf.line(12, 10, 36, 34, PAL.outline, 1);
  buf.line(36, 10, 12, 34, PAL.outline, 1);
  // Bottom stone sill
  buf.rect(2, 60, 44, 4, PAL.stone2);
  return buf.toCanvas();
}

function bakePillar(pal: BiomeTilePalette): HTMLCanvasElement {
  const buf = new PixelBuffer(20, 64, PIXEL_SCALE);
  buf.rect(4, 0, 12, 64, pal.baseDark);
  buf.rect(5, 0, 9, 64, pal.baseMid);
  buf.rect(6, 0, 3, 64, pal.baseLight);
  // Capital & base plinth
  buf.rect(1, 0, 18, 6, pal.baseLight);
  buf.rect(2, 58, 16, 6, pal.baseLight);
  buf.rect(3, 5, 14, 2, pal.topTrim);
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
> {
  // Chest closed
  const cc = new PixelBuffer(22, 18, PIXEL_SCALE);
  cc.rect(2, 5, 18, 12, PAL.wood1);
  cc.rect(3, 6, 16, 10, PAL.wood2);
  cc.rect(2, 4, 18, 3, PAL.gold2);
  cc.rect(3, 5, 16, 1, PAL.gold4);
  cc.rect(9, 7, 4, 5, PAL.gold3);
  cc.set(11, 9, PAL.soul4);
  cc.applyOutline(PAL.outline);

  // Chest open
  const co = new PixelBuffer(22, 18, PIXEL_SCALE);
  co.rect(2, 9, 18, 8, PAL.wood1);
  co.rect(3, 2, 16, 6, PAL.wood2);
  co.rect(2, 2, 18, 2, PAL.gold3);
  co.rect(4, 8, 14, 3, PAL.gold4);
  co.applyOutline(PAL.outline);

  // Barrel
  const br = new PixelBuffer(16, 18, PIXEL_SCALE);
  br.shadedEllipse(8, 10, 6, 7, PAL.wood0, PAL.wood2, PAL.wood3);
  br.rect(2, 6, 12, 2, PAL.iron3);
  br.rect(2, 12, 12, 2, PAL.iron3);
  br.applyOutline(PAL.outline);

  // Crate
  const cr = new PixelBuffer(16, 16, PIXEL_SCALE);
  cr.rect(1, 1, 14, 14, PAL.wood1);
  cr.rect(2, 2, 12, 12, PAL.wood3);
  cr.line(2, 2, 13, 13, PAL.wood1, 2);
  cr.rect(1, 1, 14, 2, PAL.wood4);
  cr.applyOutline(PAL.outline);

  // Soul Altar (Sanctuary centerpiece)
  const sa = new PixelBuffer(40, 48, PIXEL_SCALE);
  sa.rect(4, 40, 32, 7, PAL.stone1);
  sa.rect(7, 34, 26, 6, PAL.stone2);
  sa.rect(12, 18, 16, 16, PAL.stone1);
  sa.rect(14, 16, 12, 3, PAL.gold3);
  // Levitating Soul Vessel crystal
  sa.poly(
    [
      [20, 3],
      [26, 10],
      [20, 17],
      [14, 10],
    ],
    PAL.soul3,
  );
  sa.poly(
    [
      [20, 5],
      [23, 10],
      [20, 15],
      [17, 10],
    ],
    PAL.soul5,
  );
  sa.applyOutline(PAL.outline);

  // Relic Shrine
  const rs = new PixelBuffer(26, 34, PIXEL_SCALE);
  rs.rect(4, 28, 18, 5, PAL.stone2);
  rs.rect(8, 14, 10, 14, PAL.stone1);
  rs.rect(6, 12, 14, 3, PAL.gold3);
  rs.shadedEllipse(13, 7, 4, 5, PAL.soul1, PAL.soul3, PAL.soul5);
  rs.applyOutline(PAL.outline);

  // Merchant Hooded Peddler Stand
  const ms = new PixelBuffer(34, 36, PIXEL_SCALE);
  ms.rect(2, 24, 30, 11, PAL.wood1);
  ms.rect(3, 24, 28, 3, PAL.gold3);
  ms.rect(5, 21, 5, 3, PAL.crimson3); // potion
  ms.rect(13, 21, 6, 3, PAL.gold4); // gold/relic
  // Cloaked merchant silhouette behind counter
  ms.poly(
    [
      [11, 24],
      [17, 7],
      [25, 24],
    ],
    PAL.violet1,
  );
  ms.shadedEllipse(18, 11, 4, 4, PAL.obsidian0, PAL.violet2, PAL.violet3);
  ms.set(17, 11, PAL.gold4);
  ms.set(19, 11, PAL.gold4);
  ms.applyOutline(PAL.outline);

  // Curse Brazier
  const cb = new PixelBuffer(26, 32, PIXEL_SCALE);
  cb.rect(5, 26, 16, 5, PAL.obsidian1);
  cb.poly(
    [
      [4, 16],
      [22, 16],
      [18, 26],
      [8, 26],
    ],
    PAL.iron2,
  );
  cb.poly(
    [
      [8, 16],
      [13, 4],
      [18, 16],
    ],
    PAL.crimson3,
  );
  cb.rect(11, 10, 4, 5, PAL.ember4);
  cb.applyOutline(PAL.outline);

  // Hanging Chain
  const ch = new PixelBuffer(8, 32, PIXEL_SCALE);
  for (let y = 0; y < 32; y += 6) {
    ch.rect(2, y, 4, 5, PAL.iron3);
    ch.rect(3, y + 1, 2, 3, null);
    ch.rect(2, y, 4, 1, PAL.steel4);
  }

  // Trinity Scroll Pedestal (glowing floating scroll above stone lectern)
  const ts = new PixelBuffer(26, 36, PIXEL_SCALE);
  ts.rect(5, 30, 16, 5, PAL.stone2);
  ts.rect(9, 17, 8, 13, PAL.stone1);
  ts.rect(7, 15, 12, 3, PAL.gold3);
  ts.rect(7, 5, 12, 8, PAL.bone4);
  ts.rect(6, 5, 2, 8, PAL.crimson3); // Brutality seal
  ts.rect(18, 5, 2, 8, PAL.violet3); // Tactics seal
  ts.rect(11, 7, 4, 4, PAL.venom3); // Survival center seal
  ts.applyOutline(PAL.outline);

  // Blood Shrine (horned crimson chalice altar)
  const bs = new PixelBuffer(28, 34, PIXEL_SCALE);
  bs.rect(5, 28, 18, 5, PAL.obsidian1);
  bs.rect(9, 16, 10, 12, PAL.crimson0);
  bs.poly(
    [
      [7, 8],
      [21, 8],
      [18, 16],
      [10, 16],
    ],
    PAL.gold2,
  );
  bs.rect(9, 7, 10, 2, PAL.crimson4);
  bs.set(14, 5, PAL.crimson5);
  bs.applyOutline(PAL.outline);

  // Waystone Fast-Travel Obelisk (4f)
  const wsBufs: PixelBuffer[] = [];
  for (let i = 0; i < 4; i++) {
    const wb = new PixelBuffer(22, 38, PIXEL_SCALE);
    wb.rect(4, 32, 14, 5, PAL.stone2);
    wb.poly(
      [
        [6, 32],
        [7, 10],
        [11, 4],
        [15, 10],
        [16, 32],
      ],
      PAL.stone1,
    );
    const glow = i % 2 === 0 ? PAL.soul4 : PAL.soul5;
    wb.rect(10, 12, 2, 16, PAL.soul2);
    wb.rect(10, 13 + i * 2, 2, 4, glow);
    wb.set(11, 8, glow);
    wb.applyOutline(PAL.outline);
    wsBufs.push(wb);
  }

  // Carved Lore Tablet
  const lt = new PixelBuffer(18, 24, PIXEL_SCALE);
  lt.rect(3, 19, 12, 4, PAL.stone2);
  lt.ellipse(9, 10, 6, 8, PAL.stone1);
  lt.rect(3, 10, 12, 10, PAL.stone1);
  lt.rect(6, 7, 6, 1, PAL.soul3);
  lt.rect(6, 10, 6, 1, PAL.stone4);
  lt.rect(6, 13, 5, 1, PAL.stone4);
  lt.applyOutline(PAL.outline);

  // Sanctuary Combat Training Dummy
  const td = new PixelBuffer(26, 38, PIXEL_SCALE);
  td.rect(11, 20, 4, 17, PAL.wood2);
  td.rect(6, 34, 14, 3, PAL.wood1);
  td.rect(5, 12, 16, 3, PAL.wood3); // crossbar arms
  td.rect(8, 11, 10, 12, PAL.steel1); // iron practice cuirass
  td.rect(9, 12, 8, 9, PAL.steel3);
  td.shadedEllipse(13, 7, 4, 4, PAL.bone1, PAL.bone2, PAL.bone4);
  td.rect(11, 6, 4, 2, PAL.crimson3); // target bullseye
  td.applyOutline(PAL.outline);

  // Sanctuary Book of Deeds Lectern
  const dl = new PixelBuffer(24, 34, PIXEL_SCALE);
  dl.rect(6, 28, 12, 5, PAL.wood1);
  dl.rect(10, 15, 4, 13, PAL.wood2);
  dl.poly(
    [
      [4, 12],
      [20, 9],
      [20, 16],
      [4, 17],
    ],
    PAL.gold3,
  );
  dl.rect(6, 11, 12, 4, PAL.bone4);
  dl.set(11, 12, PAL.crimson3);
  dl.applyOutline(PAL.outline);

  // Seraphina's Consecrated Golden War-Banner
  const cbTotem = new PixelBuffer(20, 40, PIXEL_SCALE);
  cbTotem.rect(9, 4, 2, 35, PAL.gold3);
  cbTotem.rect(4, 7, 12, 2, PAL.gold4);
  cbTotem.poly(
    [
      [5, 9],
      [15, 9],
      [15, 25],
      [10, 31],
      [5, 25],
    ],
    PAL.bone4,
  );
  cbTotem.rect(9, 11, 2, 13, PAL.gold3);
  cbTotem.rect(7, 15, 6, 2, PAL.gold3);
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
    floorClutter,
    ...bakeProps(),
  };
}
