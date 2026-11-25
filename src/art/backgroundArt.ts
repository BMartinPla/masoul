import { VIEW_H, VIEW_W } from '../core/constants.ts';
import type { BiomeId } from '../core/types.ts';
import { PAL } from './palette.ts';

export interface BiomeParallaxLayers {
  sky: HTMLCanvasElement;
  farSpires: HTMLCanvasElement;
  midCastle: HTMLCanvasElement;
  nearVaults: HTMLCanvasElement;
  fgSilhouettes: HTMLCanvasElement;
}

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function bakeSkyLayer(biome: BiomeId): HTMLCanvasElement {
  const [c, ctx] = createCanvas(VIEW_W, VIEW_H);

  const palettes: Record<BiomeId, [string, string, string, string]> = {
    sanctuary: ['#0b0a17', '#16142e', '#262047', '#9be6e2'],
    crypt: ['#090c14', '#131d2b', '#1e303d', '#d9e8f5'],
    catacombs: ['#12080f', '#240f19', '#381523', '#ff6b7a'],
    ossuary: ['#07120e', '#0f241b', '#18362a', '#9be675'],
    citadel: ['#0d0714', '#1f0e29', '#38162c', '#ffb057'],
  };

  const [c0, c1, c2, moonColor] = palettes[biome];
  ctx.fillStyle = c0;
  ctx.fillRect(0, 0, VIEW_W, 126);
  ctx.fillStyle = c1;
  ctx.fillRect(0, 126, VIEW_W, 126);
  ctx.fillStyle = c2;
  ctx.fillRect(0, 252, VIEW_W, 108);

  // Ordered 1px pixel dithering bands between sky tones
  ctx.fillStyle = c1;
  for (let y = 114; y < 138; y += 2) {
    for (let x = y % 4 === 0 ? 0 : 1; x < VIEW_W; x += 2) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = c2;
  for (let y = 240; y < 264; y += 2) {
    for (let x = y % 4 === 0 ? 0 : 1; x < VIEW_W; x += 2) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const isSubterranean = biome === 'crypt' || biome === 'catacombs' || biome === 'ossuary';

  if (isSubterranean) {
    // Subterranean cavern & vaulted stonework: no outdoor sky moon behind indoor torches
    const ribColor =
      biome === 'crypt' ? '#070a10' : biome === 'catacombs' ? '#0c050a' : '#050d09';
    const seamColor =
      biome === 'crypt' ? '#172330' : biome === 'catacombs' ? '#2c111d' : '#122920';

    // Vaulted stone ceiling band + descending gothic ribs
    ctx.fillStyle = ribColor;
    ctx.fillRect(0, 0, VIEW_W, 24);
    for (let ax = 0; ax < VIEW_W; ax += 80) {
      for (let i = 0; i < 40; i++) {
        const h = 24 + Math.floor(((40 - i) * (40 - i)) / 36);
        ctx.fillStyle = ribColor;
        ctx.fillRect(ax + i, 0, 1, h);
        ctx.fillRect(ax + 79 - i, 0, 1, h);
        if (i % 6 === 0) {
          ctx.fillStyle = seamColor;
          ctx.fillRect(ax + i, h - 2, 1, 2);
          ctx.fillRect(ax + 79 - i, h - 2, 1, 2);
        }
      }
      // Subtle recessed lancet glow high in the vault
      ctx.fillStyle = seamColor;
      ctx.fillRect(ax + 38, 30, 4, 22);
      ctx.fillStyle = moonColor;
      ctx.globalAlpha = 0.14;
      ctx.fillRect(ax + 39, 34, 2, 14);
      ctx.globalAlpha = 1;
    }

    // Subtle cavern mist & damp spore specks (never bright white stars)
    for (let i = 0; i < 65; i++) {
      const sx = (i * 89 + 23) % VIEW_W;
      const sy = 56 + ((i * 61 + 17) % 190);
      ctx.fillStyle = i % 4 === 0 ? seamColor : c2;
      ctx.fillRect(sx, sy, 2, 1);
    }
  } else {
    // Open-sky biomes (Sanctuary & Citadel): stars + cratered moon with soft 2-ring halo
    for (let i = 0; i < 95; i++) {
      const sx = (i * 73 + 19) % VIEW_W;
      const sy = (i * 53 + 11) % 210;
      ctx.fillStyle = i % 5 === 0 ? moonColor : '#5e5a7d';
      ctx.fillRect(sx, sy, 1, 1);
    }

    const mx = 490;
    const my = 74;
    const mr = 32;

    // 2-ring atmospheric halo
    for (let dy = -(mr + 18); dy <= mr + 18; dy++) {
      for (let dx = -(mr + 18); dx <= mr + 18; dx++) {
        const dist2 = dx * dx + dy * dy;
        if (dist2 > mr * mr && dist2 <= (mr + 8) * (mr + 8) && ((dx + dy) & 3) === 0) {
          ctx.fillStyle = c2;
          ctx.fillRect(mx + dx, my + dy, 1, 1);
        } else if (
          dist2 > (mr + 8) * (mr + 8) &&
          dist2 <= (mr + 18) * (mr + 18) &&
          ((dx + dy) & 7) === 0
        ) {
          ctx.fillStyle = c1;
          ctx.fillRect(mx + dx, my + dy, 1, 1);
        }
      }
    }

    // Dramatic cratered moon with 1px edge dither
    for (let dy = -mr; dy <= mr; dy++) {
      for (let dx = -mr; dx <= mr; dx++) {
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= mr * mr) {
          if (dist2 > (mr - 2) * (mr - 2) && ((dx + dy) & 1) === 1) {
            ctx.fillStyle = c1;
          } else if (
            (dx - 8) * (dx - 8) + (dy + 5) * (dy + 5) < 54 ||
            (dx + 11) * (dx + 11) + (dy - 8) * (dy - 8) < 28
          ) {
            ctx.fillStyle = c2;
          } else {
            ctx.fillStyle = moonColor;
          }
          ctx.fillRect(mx + dx, my + dy, 1, 1);
        }
      }
    }
  }

  return c;
}

function bakeFarSpires(biome: BiomeId): HTMLCanvasElement {
  const [c, ctx] = createCanvas(VIEW_W, VIEW_H);
  const silhouette =
    biome === 'catacombs'
      ? '#1a0c14'
      : biome === 'ossuary'
        ? '#0a1c15'
        : biome === 'citadel'
          ? '#170c21'
          : biome === 'crypt'
            ? '#101824'
            : '#121024';
  const windowColor =
    biome === 'catacombs'
      ? PAL.crimson3
      : biome === 'ossuary'
        ? PAL.venom3
        : biome === 'citadel'
          ? PAL.ember3
          : PAL.soul3;

  ctx.fillStyle = silhouette;
  const towers = [
    { x: 14, w: 50, h: 162, spire: true },
    { x: 80, w: 72, h: 122, spire: false },
    { x: 168, w: 60, h: 196, spire: true },
    { x: 246, w: 88, h: 112, spire: false },
    { x: 350, w: 54, h: 178, spire: true },
    { x: 422, w: 78, h: 132, spire: false },
    { x: 516, w: 52, h: 186, spire: true },
    { x: 582, w: 50, h: 138, spire: false },
  ];

  for (const t of towers) {
    const topY = VIEW_H - t.h;
    ctx.fillStyle = silhouette;
    ctx.fillRect(t.x, topY, t.w, t.h);
    if (t.spire) {
      const mid = t.x + Math.floor(t.w / 2);
      for (let sy = 0; sy < 48; sy++) {
        const hw = Math.max(1, Math.floor(((48 - sy) / 48) * (t.w * 0.45)));
        ctx.fillRect(mid - hw, topY - 48 + sy, hw * 2, 1);
      }
    } else {
      for (let bx = t.x; bx < t.x + t.w; bx += 10) {
        ctx.fillRect(bx, topY - 8, 5, 8);
      }
    }
    ctx.fillStyle = windowColor;
    ctx.fillRect(t.x + Math.floor(t.w * 0.5) - 1, topY + 24, 3, 10);
    if (t.w > 64) {
      ctx.fillRect(t.x + 15, topY + 38, 2, 8);
      ctx.fillRect(t.x + t.w - 17, topY + 38, 2, 8);
    }
  }

  return c;
}

function bakeMidCastle(biome: BiomeId): HTMLCanvasElement {
  const [c, ctx] = createCanvas(VIEW_W, VIEW_H);
  const stone =
    biome === 'catacombs'
      ? '#24121b'
      : biome === 'ossuary'
        ? '#122920'
        : biome === 'citadel'
          ? '#21132b'
          : biome === 'crypt'
            ? '#16212b'
            : '#1b1830';
  const rim =
    biome === 'catacombs'
      ? '#3d1f2d'
      : biome === 'ossuary'
        ? '#244a3b'
        : biome === 'citadel'
          ? '#39224a'
          : biome === 'crypt'
            ? '#263847'
            : '#2c284a';

  for (let ax = 0; ax < VIEW_W; ax += 80) {
    ctx.fillStyle = stone;
    ctx.fillRect(ax, 144, 22, VIEW_H - 144);
    ctx.fillStyle = rim;
    ctx.fillRect(ax, 144, 2, VIEW_H - 144);
    ctx.fillStyle = stone;
    ctx.fillRect(ax, 134, 80, 20);
    ctx.fillStyle = rim;
    ctx.fillRect(ax, 134, 80, 2);
    ctx.fillStyle = stone;
    ctx.fillRect(ax + 22, 154, 12, 18);
    ctx.fillRect(ax + 48, 154, 12, 18);
  }
  ctx.fillStyle = stone;
  ctx.fillRect(0, 298, VIEW_W, 62);
  ctx.fillStyle = rim;
  ctx.fillRect(0, 298, VIEW_W, 1);
  return c;
}

function bakeNearVaults(biome: BiomeId): HTMLCanvasElement {
  const [c, ctx] = createCanvas(VIEW_W, VIEW_H);
  const wall =
    biome === 'catacombs'
      ? '#160b10'
      : biome === 'ossuary'
        ? '#0d1c16'
        : biome === 'citadel'
          ? '#140c1a'
          : biome === 'crypt'
            ? '#0f161c'
            : '#12101d';
  const highlight =
    biome === 'catacombs'
      ? '#2b1620'
      : biome === 'ossuary'
        ? '#1b382d'
        : biome === 'citadel'
          ? '#261730'
          : biome === 'crypt'
            ? '#1d2933'
            : '#211e36';

  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, VIEW_W, 50);
  ctx.fillRect(0, 304, VIEW_W, 56);

  for (let x = 0; x < VIEW_W; x += 160) {
    ctx.fillStyle = wall;
    ctx.fillRect(x, 50, 48, 254);
    ctx.fillStyle = highlight;
    ctx.fillRect(x, 50, 48, 2);
    ctx.fillRect(x + 46, 50, 2, 254);

    for (let y = 64; y < 304; y += 20) {
      ctx.fillStyle = highlight;
      ctx.fillRect(x, y, 48, 1);
    }

    ctx.fillStyle = wall;
    ctx.fillRect(x + 48, 50, 18, 24);
    ctx.fillRect(x + 142, 50, 18, 24);
    ctx.fillStyle = highlight;
    ctx.fillRect(x + 48, 74, 112, 2);
  }

  return c;
}

function bakeForegroundSilhouettes(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(VIEW_W, VIEW_H);
  // Subtle dark gothic silhouette columns, chains & hanging iron cages in foreground (1.24x scroll)
  ctx.fillStyle = 'rgba(7, 6, 11, 0.42)';
  ctx.fillRect(56, 0, 16, VIEW_H);
  ctx.fillRect(384, 0, 14, VIEW_H);

  // Hanging iron chain & gibbet cage silhouettes near ceiling
  ctx.fillRect(220, 0, 3, 62);
  ctx.fillRect(208, 62, 26, 3);
  ctx.fillRect(208, 62, 3, 28);
  ctx.fillRect(231, 62, 3, 28);
  ctx.fillRect(208, 87, 26, 3);

  ctx.fillRect(548, 0, 3, 52);
  ctx.fillRect(539, 52, 20, 3);
  return c;
}

export function bakeAllBiomeParallax(): Record<BiomeId, BiomeParallaxLayers> {
  const biomes: BiomeId[] = ['sanctuary', 'crypt', 'catacombs', 'ossuary', 'citadel'];
  const result = {} as Record<BiomeId, BiomeParallaxLayers>;
  const fg = bakeForegroundSilhouettes();
  for (const b of biomes) {
    result[b] = {
      sky: bakeSkyLayer(b),
      farSpires: bakeFarSpires(b),
      midCastle: bakeMidCastle(b),
      nearVaults: bakeNearVaults(b),
      fgSilhouettes: fg,
    };
  }
  return result;
}
