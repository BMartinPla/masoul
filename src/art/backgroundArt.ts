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

    // Vaulted stone ceiling band + descending gothic ribs + jagged stalactites
    ctx.fillStyle = ribColor;
    ctx.fillRect(0, 0, VIEW_W, 24);
    for (let ax = 0; ax < VIEW_W; ax += 80) {
      for (let i = 0; i < 40; i++) {
        const h = 24 + Math.floor(((40 - i) * (40 - i)) / 32);
        ctx.fillStyle = ribColor;
        ctx.fillRect(ax + i, 0, 1, h);
        ctx.fillRect(ax + 79 - i, 0, 1, h);
        if (i % 5 === 0) {
          ctx.fillStyle = seamColor;
          ctx.fillRect(ax + i, h - 2, 1, 2);
          ctx.fillRect(ax + 79 - i, h - 2, 1, 2);
        }
      }
      // Subtle recessed lancet glow high in the vault
      ctx.fillStyle = seamColor;
      ctx.fillRect(ax + 38, 28, 4, 24);
      ctx.fillStyle = moonColor;
      ctx.globalAlpha = 0.14;
      ctx.fillRect(ax + 39, 32, 2, 16);
      ctx.globalAlpha = 1;
      // Stalactite clusters between ribs
      for (let s = 0; s < 3; s++) {
        const sx = ax + 22 + s * 16;
        const sh = 10 + ((ax + s * 7) % 12);
        ctx.fillStyle = ribColor;
        ctx.fillRect(sx - 2, 22, 4, Math.floor(sh * 0.5));
        ctx.fillRect(sx - 1, 22, 2, sh);
        ctx.fillStyle = seamColor;
        ctx.fillRect(sx - 1, 22 + Math.floor(sh * 0.3), 1, 3);
      }
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

    // Drifting dithered night-cloud wisps across the lower moon/sky
    const cloudBands = [
      { x: 42, y: 92, w: 120, h: 6 },
      { x: 240, y: 108, w: 150, h: 7 },
      { x: 435, y: 88, w: 135, h: 6 },
      { x: 515, y: 112, w: 96, h: 5 },
    ];
    for (const cb of cloudBands) {
      for (let cy = 0; cy < cb.h; cy++) {
        for (let cx = 0; cx < cb.w; cx++) {
          const edge = Math.min(cx, cb.w - 1 - cx);
          if (edge < 14 && (cx + cy) % 2 === 1) continue;
          if (((cx + cy * 2) & 3) === 0) {
            ctx.fillStyle = c1;
            ctx.fillRect(cb.x + cx, cb.y + cy, 1, 1);
          } else if (((cx + cy) & 7) === 0) {
            ctx.fillStyle = c2;
            ctx.fillRect(cb.x + cx, cb.y + cy, 1, 1);
          }
        }
      }
    }
  }

  return c;
}

function bakeFarSpires(biome: BiomeId): HTMLCanvasElement {
  const [c, ctx] = createCanvas(VIEW_W, VIEW_H);
  const ridgeColor =
    biome === 'catacombs'
      ? '#13080e'
      : biome === 'ossuary'
        ? '#07140f'
        : biome === 'citadel'
          ? '#110819'
          : biome === 'crypt'
            ? '#0b121b'
            : '#0e0c1c';
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
  const rim =
    biome === 'catacombs'
      ? '#2b131f'
      : biome === 'ossuary'
        ? '#143326'
        : biome === 'citadel'
          ? '#291538'
          : biome === 'crypt'
            ? '#1a2838'
            : '#1f1b3b';
  const windowColor =
    biome === 'catacombs'
      ? PAL.crimson3
      : biome === 'ossuary'
        ? PAL.venom3
        : biome === 'citadel'
          ? PAL.ember3
          : PAL.soul3;

  // Jagged distant mountain / cavern ridge behind cathedral spires
  ctx.fillStyle = ridgeColor;
  for (let x = 0; x < VIEW_W; x++) {
    const ridgeH =
      95 +
      Math.round(Math.sin(x * 0.022) * 28 + Math.cos(x * 0.058) * 16 + ((x * 13) % 5));
    ctx.fillRect(x, VIEW_H - ridgeH, 1, ridgeH);
  }

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
    ctx.fillStyle = rim;
    ctx.fillRect(t.x, topY, 1, t.h);

    // Flying buttress shoulders on wide keeps
    if (t.w >= 58) {
      ctx.fillStyle = silhouette;
      for (let b = 0; b < 14; b++) {
        ctx.fillRect(t.x - 14 + b, topY + 34 + b * 2, 14 - b, 2);
        ctx.fillRect(t.x + t.w, topY + 34 + b * 2, 14 - b, 2);
      }
    }

    if (t.spire) {
      const mid = t.x + Math.floor(t.w / 2);
      ctx.fillStyle = silhouette;
      for (let sy = 0; sy < 52; sy++) {
        const hw = Math.max(1, Math.floor(((52 - sy) / 52) * (t.w * 0.44)));
        ctx.fillRect(mid - hw, topY - 52 + sy, hw * 2, 1);
      }
      // Side pinnacles & rooftop finial cross
      ctx.fillRect(t.x + 3, topY - 16, 4, 16);
      ctx.fillRect(t.x + t.w - 7, topY - 16, 4, 16);
      ctx.fillStyle = rim;
      ctx.fillRect(mid, topY - 60, 1, 8);
      ctx.fillRect(mid - 2, topY - 57, 5, 1);
    } else {
      ctx.fillStyle = silhouette;
      for (let bx = t.x; bx < t.x + t.w; bx += 10) {
        ctx.fillRect(bx, topY - 8, 5, 8);
      }
      ctx.fillStyle = rim;
      ctx.fillRect(t.x, topY, t.w, 1);
    }

    // Glowing gothic lancet windows with soft outer glow
    const wx = t.x + Math.floor(t.w * 0.5) - 1;
    ctx.fillStyle = rim;
    ctx.fillRect(wx - 1, topY + 23, 5, 13);
    ctx.fillStyle = windowColor;
    ctx.fillRect(wx, topY + 24, 3, 10);
    if (t.w > 64) {
      ctx.fillRect(t.x + 15, topY + 38, 2, 9);
      ctx.fillRect(t.x + t.w - 17, topY + 38, 2, 9);
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
  const deep =
    biome === 'catacombs'
      ? '#14080f'
      : biome === 'ossuary'
        ? '#0a1712'
        : biome === 'citadel'
          ? '#120a18'
          : biome === 'crypt'
            ? '#0c131a'
            : '#100e1f';

  // Pointed gothic arched viaducts & colonnades
  for (let ax = 0; ax < VIEW_W; ax += 80) {
    // Beveled pier with capital & stepped plinth
    ctx.fillStyle = stone;
    ctx.fillRect(ax, 140, 18, 158);
    ctx.fillStyle = rim;
    ctx.fillRect(ax, 140, 2, 158);
    ctx.fillStyle = deep;
    ctx.fillRect(ax + 16, 140, 2, 158);
    ctx.fillRect(ax - 2, 142, 22, 4);

    // Spandrel wall & pointed gothic arch cutout between piers
    ctx.fillStyle = stone;
    ctx.fillRect(ax, 136, 80, 62);
    ctx.fillStyle = rim;
    ctx.fillRect(ax, 136, 80, 2);

    // Clear pointed arch opening (y=146..198, x=ax+18..ax+80)
    const archMid = ax + 49;
    for (let y = 148; y < 198; y++) {
      const t = Math.min(1, (y - 148) / 28);
      const halfSpan = Math.round(t * 31);
      ctx.clearRect(archMid - halfSpan, y, halfSpan * 2, 1);
      if (y < 176) {
        ctx.fillStyle = rim;
        ctx.fillRect(archMid - halfSpan - 1, y, 1, 1);
        ctx.fillRect(archMid + halfSpan, y, 1, 1);
      }
    }
    // Keystone at arch crown
    ctx.fillStyle = rim;
    ctx.fillRect(archMid - 2, 143, 4, 5);

    // Crenellated parapet battlements along viaduct top
    ctx.fillStyle = stone;
    for (let bx = 0; bx < 80; bx += 16) {
      ctx.fillRect(ax + bx, 127, 9, 9);
      ctx.fillStyle = rim;
      ctx.fillRect(ax + bx, 127, 9, 1);
      ctx.fillStyle = stone;
    }
  }

  // Lower viaduct wall & dithered atmospheric mist band
  ctx.fillStyle = stone;
  ctx.fillRect(0, 298, VIEW_W, 62);
  ctx.fillStyle = rim;
  ctx.fillRect(0, 298, VIEW_W, 2);
  for (let y = 290; y < 298; y += 2) {
    for (let x = y % 4 === 0 ? 0 : 1; x < VIEW_W; x += 4) {
      ctx.fillStyle = rim;
      ctx.fillRect(x, y, 1, 1);
    }
  }
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
  const lanternGlow =
    biome === 'catacombs'
      ? PAL.crimson3
      : biome === 'ossuary'
        ? PAL.venom3
        : biome === 'citadel'
          ? PAL.ember3
          : PAL.soul3;

  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, VIEW_W, 38);
  ctx.fillRect(0, 314, VIEW_W, 46);

  for (let x = 0; x < VIEW_W; x += 160) {
    // Sculpted 28px fluted cathedral pier with stepped plinth & flared capital
    ctx.fillStyle = wall;
    ctx.fillRect(x, 38, 28, 276);
    ctx.fillRect(x - 4, 298, 36, 16);
    ctx.fillRect(x - 4, 38, 36, 10);

    // Fluting highlights & ashlar mortar seams
    ctx.fillStyle = highlight;
    ctx.fillRect(x + 2, 48, 2, 250);
    ctx.fillRect(x + 24, 48, 2, 250);
    ctx.fillRect(x - 4, 38, 36, 2);
    ctx.fillRect(x - 4, 298, 36, 2);
    for (let y = 64; y < 298; y += 22) {
      ctx.fillRect(x, y, 28, 1);
    }

    // Sweeping pointed gothic vault ribs curving from pier capitals to arch keystone
    const crownX = x + 94;
    for (let s = 0; s <= 66; s++) {
      const t = s / 66;
      const ribY = Math.round(38 + (1 - Math.sqrt(t)) * 56);
      ctx.fillStyle = wall;
      ctx.fillRect(x + 28 + s, 0, 1, ribY);
      ctx.fillRect(x + 160 - s, 0, 1, ribY);
      ctx.fillStyle = highlight;
      ctx.fillRect(x + 28 + s, ribY - 2, 1, 2);
      ctx.fillRect(x + 160 - s, ribY - 2, 1, 2);
    }

    // Carved keystone & hanging wrought-iron lantern cage at arch midpoint
    ctx.fillStyle = highlight;
    ctx.fillRect(crownX - 3, 36, 6, 8);
    ctx.fillStyle = wall;
    ctx.fillRect(crownX, 44, 1, 34);
    ctx.fillRect(crownX - 4, 78, 9, 12);
    ctx.fillStyle = lanternGlow;
    ctx.fillRect(crownX - 2, 81, 5, 6);
  }

  return c;
}

function bakeForegroundSilhouettes(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(VIEW_W, VIEW_H);
  // Subtle dark gothic ceiling corbel arches, chained gibbets & gargoyle silhouettes (1.24x scroll)
  ctx.fillStyle = 'rgba(7, 6, 11, 0.38)';
  ctx.fillRect(56, 0, 14, VIEW_H);
  ctx.fillRect(384, 0, 12, VIEW_H);

  // Curved gothic ceiling corbel arches flanking columns
  for (let i = 0; i < 24; i++) {
    const h = Math.round((24 - i) * (24 - i) * 0.08);
    ctx.fillRect(70 + i, 0, 1, h);
    ctx.fillRect(55 - i, 0, 1, h);
    ctx.fillRect(396 + i, 0, 1, h);
    ctx.fillRect(383 - i, 0, 1, h);
  }

  // Hanging iron chain & barred gibbet cage near ceiling
  ctx.fillRect(220, 0, 2, 54);
  ctx.fillRect(208, 54, 26, 3);
  ctx.fillRect(208, 54, 3, 28);
  ctx.fillRect(216, 54, 2, 28);
  ctx.fillRect(224, 54, 2, 28);
  ctx.fillRect(231, 54, 3, 28);
  ctx.fillRect(208, 79, 26, 3);

  // Second hanging iron lantern chain & perched gargoyle silhouette
  ctx.fillRect(548, 0, 2, 46);
  ctx.fillRect(540, 46, 18, 3);
  ctx.fillRect(542, 49, 14, 12);
  ctx.fillRect(536, 40, 6, 8);
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
