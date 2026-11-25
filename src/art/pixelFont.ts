import {
  MASOUL_GOTHIC_CAP_HEIGHT,
  MASOUL_GOTHIC_GLYPHS,
  MASOUL_PIXEL_CAP_HEIGHT,
  MASOUL_PIXEL_GLYPHS,
  type BitmapGlyph,
} from './gothicGlyphs.ts';

export type PixelFontVariant = 'compact' | 'pixel' | 'gothic';

// Crisp 3x5 compact bitmap font glyphs for dense HUD telemetry
const GLYPHS_3X5: Record<string, readonly number[]> = {
  A: [0b010, 0b101, 0b111, 0b101, 0b101],
  B: [0b110, 0b101, 0b110, 0b101, 0b110],
  C: [0b011, 0b100, 0b100, 0b100, 0b011],
  D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111],
  F: [0b111, 0b100, 0b110, 0b100, 0b100],
  G: [0b011, 0b100, 0b101, 0b101, 0b011],
  H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111],
  J: [0b001, 0b001, 0b001, 0b101, 0b010],
  K: [0b101, 0b101, 0b110, 0b101, 0b101],
  L: [0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101],
  N: [0b110, 0b101, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b010],
  P: [0b110, 0b101, 0b110, 0b100, 0b100],
  Q: [0b010, 0b101, 0b101, 0b111, 0b011],
  R: [0b110, 0b101, 0b110, 0b101, 0b101],
  S: [0b011, 0b100, 0b010, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b111],
  V: [0b101, 0b101, 0b101, 0b101, 0b010],
  W: [0b101, 0b101, 0b111, 0b111, 0b101],
  X: [0b101, 0b101, 0b010, 0b101, 0b101],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  Z: [0b111, 0b001, 0b010, 0b100, 0b111],
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b110, 0b001, 0b010, 0b100, 0b111],
  '3': [0b110, 0b001, 0b010, 0b001, 0b110],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b110, 0b001, 0b110],
  '6': [0b011, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b010, 0b010, 0b010],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b110],
  '+': [0b000, 0b010, 0b111, 0b010, 0b000],
  '-': [0b000, 0b000, 0b111, 0b000, 0b000],
  ':': [0b000, 0b010, 0b000, 0b010, 0b000],
  '/': [0b001, 0b001, 0b010, 0b100, 0b100],
  '!': [0b010, 0b010, 0b010, 0b000, 0b010],
  '?': [0b110, 0b001, 0b010, 0b000, 0b010],
  '.': [0b000, 0b000, 0b000, 0b000, 0b010],
  ',': [0b000, 0b000, 0b000, 0b010, 0b100],
  '%': [0b101, 0b001, 0b010, 0b100, 0b101],
  '[': [0b110, 0b100, 0b100, 0b100, 0b110],
  ']': [0b011, 0b001, 0b001, 0b001, 0b011],
  '(': [0b010, 0b100, 0b100, 0b100, 0b010],
  ')': [0b010, 0b001, 0b001, 0b001, 0b010],
  "'": [0b010, 0b010, 0b000, 0b000, 0b000],
  '&': [0b010, 0b101, 0b010, 0b101, 0b011],
  '=': [0b000, 0b111, 0b000, 0b111, 0b000],
  ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
};

export interface PixelTextOptions {
  color?: string;
  shadow?: string | null;
  scale?: number;
  align?: 'left' | 'center' | 'right';
  variant?: PixelFontVariant;
}

function getBitmapConfig(variant: PixelFontVariant): {
  glyphs: Record<string, BitmapGlyph>;
  capHeight: number;
  spaceWidth: number;
} {
  if (variant === 'gothic') {
    return {
      glyphs: MASOUL_GOTHIC_GLYPHS,
      capHeight: MASOUL_GOTHIC_CAP_HEIGHT,
      spaceWidth: 4,
    };
  }
  return {
    glyphs: MASOUL_PIXEL_GLYPHS,
    capHeight: MASOUL_PIXEL_CAP_HEIGHT,
    spaceWidth: 3,
  };
}

function resolveGlyph(
  glyphs: Record<string, BitmapGlyph>,
  ch: string,
): BitmapGlyph | undefined {
  return glyphs[ch] ?? glyphs[ch.toUpperCase()];
}

function normalizeCompactText(text: string): string {
  return text
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[¡]/g, '!')
    .replace(/[¿]/g, '?')
    .replace(/[ÁÀÄÂ]/gi, 'A')
    .replace(/[ÉÈËÊ]/gi, 'E')
    .replace(/[ÍÌÏÎ]/gi, 'I')
    .replace(/[ÓÒÖÔ]/gi, 'O')
    .replace(/[ÚÙÛ]/gi, 'U')
    .replace(/[Ü]/gi, 'U')
    .replace(/[Ñ]/gi, 'N')
    .toUpperCase();
}

export function measurePixelText(
  text: string,
  scale = 1,
  variant: PixelFontVariant = 'compact',
): number {
  if (!text.length) return 0;
  if (variant === 'compact') {
    const clean = normalizeCompactText(text);
    return (clean.length * 4 - 1) * scale;
  }

  const { glyphs, spaceWidth } = getBitmapConfig(variant);
  let widthPx = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === ' ') {
      widthPx += spaceWidth;
    } else {
      const g = resolveGlyph(glyphs, ch);
      widthPx += (g ? g.width : spaceWidth) + 1;
    }
  }
  if (text[text.length - 1] !== ' ') {
    widthPx = Math.max(0, widthPx - 1);
  }
  return widthPx * scale;
}

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: PixelTextOptions = {},
): void {
  const variant = options.variant ?? 'compact';
  const scale = Math.max(1, Math.round(options.scale ?? 1));
  const color = options.color ?? '#ede6d8';
  const shadow = options.shadow === undefined ? '#0b0a12' : options.shadow;
  const totalWidth = measurePixelText(text, scale, variant);

  let startX = Math.round(x);
  if (options.align === 'center') startX = Math.round(x - totalWidth * 0.5);
  else if (options.align === 'right') startX = Math.round(x - totalWidth);

  const startY = Math.round(y);

  if (variant === 'compact') {
    const upper = normalizeCompactText(text);
    const drawCompactPass = (passX: number, passY: number, fill: string): void => {
      ctx.fillStyle = fill;
      let cursorX = passX;
      for (let i = 0; i < upper.length; i++) {
        const glyph = GLYPHS_3X5[upper[i]!] ?? GLYPHS_3X5[' ']!;
        for (let row = 0; row < 5; row++) {
          const bits = glyph[row]!;
          for (let col = 0; col < 3; col++) {
            if ((bits >> (2 - col)) & 1) {
              ctx.fillRect(cursorX + col * scale, passY + row * scale, scale, scale);
            }
          }
        }
        cursorX += 4 * scale;
      }
    };

    if (shadow) drawCompactPass(startX + scale, startY + scale, shadow);
    drawCompactPass(startX, startY, color);
    return;
  }

  const { glyphs, capHeight, spaceWidth } = getBitmapConfig(variant);
  const drawBitmapPass = (passX: number, passY: number, fill: string): void => {
    ctx.fillStyle = fill;
    let cursorX = passX;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      if (ch === ' ') {
        cursorX += spaceWidth * scale;
        continue;
      }
      const g = resolveGlyph(glyphs, ch);
      if (!g) {
        cursorX += (spaceWidth + 1) * scale;
        continue;
      }
      const topRowOffset = capHeight - (g.yOffset + g.rows.length);
      for (let r = 0; r < g.rows.length; r++) {
        const rowStr = g.rows[r]!;
        const py = passY + (topRowOffset + r) * scale;
        for (let c = 0; c < rowStr.length; c++) {
          if (rowStr[c] === '#') {
            ctx.fillRect(cursorX + c * scale, py, scale, scale);
          }
        }
      }
      cursorX += (g.width + 1) * scale;
    }
  };

  if (shadow) {
    drawBitmapPass(startX + scale, startY + scale, shadow);
  }
  drawBitmapPass(startX, startY, color);
}
