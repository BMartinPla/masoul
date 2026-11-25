import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MASOUL_GOTHIC_GLYPHS,
  MASOUL_PIXEL_GLYPHS,
} from '../src/art/gothicGlyphs.ts';
import { measurePixelText } from '../src/art/pixelFont.ts';

describe('Custom Dark-Medieval Fonts', () => {
  const fontFiles = [
    { name: 'MasoulGothic.ttf', magic: [0x00, 0x01, 0x00, 0x00] },
    { name: 'MasoulGothic.woff', magic: [0x77, 0x4f, 0x46, 0x46] }, // wOFF
    { name: 'MasoulPixel.ttf', magic: [0x00, 0x01, 0x00, 0x00] },
    { name: 'MasoulPixel.woff', magic: [0x77, 0x4f, 0x46, 0x46] }, // wOFF
  ];

  it('generates valid TTF and WOFF binaries in public/fonts', () => {
    for (const f of fontFiles) {
      const fullPath = resolve(process.cwd(), 'public', 'fonts', f.name);
      expect(existsSync(fullPath)).toBe(true);
      const buf = readFileSync(fullPath);
      expect(buf.length).toBeGreaterThan(2000);
      expect([buf[0], buf[1], buf[2], buf[3]]).toEqual(f.magic);
    }
  });

  it('covers A-Z, a-z, 0-9, punctuation, and Spanish accents in both bitmap tables', () => {
    const sample =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?'\"()-+&%ÁÉÍÓÚÑÜáéíóúñü¡¿";
    for (const ch of sample) {
      expect(MASOUL_GOTHIC_GLYPHS[ch]).toBeDefined();
      expect(MASOUL_PIXEL_GLYPHS[ch]).toBeDefined();
    }
  });

  it('measures proportional pixel text accurately across all variants', () => {
    const wCompact = measurePixelText('MASOUL', 1, 'compact');
    const wPixel = measurePixelText('MASOUL', 1, 'pixel');
    const wGothic = measurePixelText('MASOUL', 1, 'gothic');

    expect(wCompact).toBeGreaterThan(0);
    expect(wPixel).toBeGreaterThan(wCompact);
    expect(wGothic).toBeGreaterThanOrEqual(wPixel);
  });
});
