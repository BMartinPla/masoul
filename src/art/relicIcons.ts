import { PIXEL_SCALE } from '../core/constants.ts';
import type { RelicId } from '../core/types.ts';
import { PAL } from './palette.ts';
import { PixelBuffer } from './pixelBuffer.ts';

function mkIcon(): PixelBuffer {
  return new PixelBuffer(16, 16, PIXEL_SCALE);
}

const RELIC_DRAWERS: Record<RelicId, (b: PixelBuffer) => void> = {
  vampiric_fang: (b) => {
    b.poly([[5, 3], [10, 3], [9, 11], [7, 13], [6, 10]], PAL.bone3);
    b.rect(6, 4, 2, 5, PAL.bone4);
    b.rect(5, 2, 5, 2, PAL.gold3);
    b.set(7, 12, PAL.crimson3);
    b.set(7, 13, PAL.crimson4);
  },
  ember_brand: (b) => {
    b.poly([[7, 2], [11, 6], [11, 11], [8, 13], [5, 11], [5, 6]], PAL.ember1);
    b.poly([[7, 4], [10, 7], [9, 11], [6, 11], [6, 7]], PAL.ember3);
    b.rect(7, 7, 2, 3, PAL.gold4);
  },
  venom_vial: (b) => {
    b.rect(6, 2, 4, 2, PAL.wood2);
    b.rect(6, 4, 4, 2, PAL.bone3);
    b.shadedEllipse(8, 10, 4, 4, PAL.steel1, PAL.steel2, PAL.steel4);
    b.rect(5, 9, 6, 4, PAL.venom2);
    b.rect(6, 9, 3, 2, PAL.venom4);
  },
  windstrider_boots: (b) => {
    b.rect(5, 4, 4, 7, PAL.wood2);
    b.rect(5, 9, 7, 4, PAL.wood3);
    b.rect(4, 5, 2, 2, PAL.soul3);
    b.rect(3, 4, 3, 1, PAL.soul4);
    b.rect(5, 4, 4, 1, PAL.gold3);
  },
  executioners_seal: (b) => {
    b.shadedEllipse(8, 8, 5, 5, PAL.crimson1, PAL.crimson2, PAL.crimson3);
    b.rect(7, 5, 2, 6, PAL.gold4);
    b.rect(5, 7, 6, 2, PAL.gold3);
  },
  soul_lantern: (b) => {
    b.rect(6, 2, 4, 1, PAL.gold3);
    b.rect(5, 3, 6, 2, PAL.steel2);
    b.rect(5, 5, 6, 6, PAL.soul2);
    b.rect(6, 6, 4, 4, PAL.soul4);
    b.rect(4, 11, 8, 2, PAL.steel1);
  },
  aegis_shard: (b) => {
    b.poly([[4, 3], [12, 3], [11, 10], [8, 13], [5, 10]], PAL.steel2);
    b.poly([[5, 4], [11, 4], [10, 9], [8, 11], [6, 9]], PAL.steel4);
    b.rect(7, 5, 2, 5, PAL.gold3);
    b.rect(6, 6, 4, 2, PAL.gold4);
  },
  storm_brand: (b) => {
    b.poly([[9, 2], [5, 8], [8, 8], [6, 13], [11, 7], [8, 7]], PAL.soul3);
    b.rect(7, 6, 2, 2, PAL.bone4);
  },
  blood_chalice: (b) => {
    b.rect(4, 3, 8, 4, PAL.gold3);
    b.rect(5, 4, 6, 2, PAL.crimson3);
    b.rect(7, 7, 2, 4, PAL.gold2);
    b.rect(5, 11, 6, 2, PAL.gold3);
    b.set(8, 8, PAL.crimson4);
  },
  twin_echo: (b) => {
    b.shadedEllipse(6, 8, 3, 4, PAL.violet1, PAL.violet2, PAL.violet3);
    b.shadedEllipse(10, 8, 3, 4, PAL.soul1, PAL.soul2, PAL.soul4);
    b.set(6, 7, PAL.bone4);
    b.set(10, 7, PAL.bone4);
  },
  iron_greaves: (b) => {
    b.rect(5, 3, 5, 6, PAL.steel2);
    b.rect(5, 8, 7, 5, PAL.steel3);
    b.rect(6, 4, 2, 4, PAL.steel4);
    b.rect(5, 6, 5, 1, PAL.gold3);
  },
  glass_crown: (b) => {
    b.poly([[3, 10], [4, 4], [6, 8], [8, 3], [10, 8], [12, 4], [13, 10]], PAL.soul2);
    b.rect(4, 10, 8, 2, PAL.soul4);
    b.set(8, 6, PAL.bone4);
  },
  frost_sigil: (b) => {
    b.rect(7, 2, 2, 12, PAL.soul3);
    b.rect(2, 7, 12, 2, PAL.soul3);
    b.line(4, 4, 11, 11, PAL.soul4);
    b.line(11, 4, 4, 11, PAL.soul4);
    b.rect(7, 7, 2, 2, PAL.bone4);
  },
  phoenix_ash: (b) => {
    b.poly([[3, 9], [6, 4], [8, 7], [10, 4], [13, 9], [8, 12]], PAL.ember2);
    b.rect(6, 6, 4, 4, PAL.gold3);
    b.rect(7, 7, 2, 2, PAL.gold4);
    b.rect(5, 12, 6, 1, PAL.stone2);
  },
  cursed_scythe: (b) => {
    b.line(5, 13, 11, 3, PAL.wood2);
    b.poly([[11, 3], [5, 3], [3, 6], [7, 5], [11, 5]], PAL.steel3);
    b.rect(5, 3, 4, 1, PAL.violet3);
  },
  cinder_crown: (b) => {
    b.poly([[3, 11], [4, 5], [6, 8], [8, 3], [10, 8], [12, 5], [13, 11]], PAL.obsidian2);
    b.rect(4, 10, 8, 2, PAL.gold3);
    b.set(4, 4, PAL.ember3);
    b.set(8, 2, PAL.ember4);
    b.set(12, 4, PAL.ember3);
  },
  plague_censer: (b) => {
    b.rect(7, 2, 2, 3, PAL.steel2);
    b.shadedEllipse(8, 9, 4, 4, PAL.gold2, PAL.gold3, PAL.gold4);
    b.rect(6, 8, 4, 2, PAL.venom3);
    b.set(5, 5, PAL.venom4);
    b.set(11, 6, PAL.venom4);
  },
  mirror_shield: (b) => {
    b.shadedEllipse(8, 8, 5, 5, PAL.steel2, PAL.steel3, PAL.soul4);
    b.line(5, 6, 9, 10, PAL.bone4);
    b.rect(7, 3, 2, 1, PAL.gold3);
    b.rect(7, 12, 2, 1, PAL.gold3);
  },
  assassins_mark: (b) => {
    b.line(4, 12, 12, 4, PAL.steel3);
    b.line(4, 4, 12, 12, PAL.steel2);
    b.rect(7, 7, 2, 2, PAL.crimson3);
    b.set(12, 4, PAL.bone4);
  },
  berserker_pauldron: (b) => {
    b.poly([[3, 10], [5, 4], [11, 4], [13, 10], [9, 12], [5, 11]], PAL.steel2);
    b.rect(5, 5, 6, 3, PAL.crimson2);
    b.poly([[4, 5], [2, 2], [6, 4]], PAL.bone3);
    b.rect(7, 8, 3, 2, PAL.gold3);
  },
};

export function bakeAllRelicIcons(): Record<RelicId, HTMLCanvasElement> {
  const icons = {} as Record<RelicId, HTMLCanvasElement>;
  const ids = Object.keys(RELIC_DRAWERS) as RelicId[];
  for (const id of ids) {
    const buf = mkIcon();
    RELIC_DRAWERS[id](buf);
    buf.applyTopRim(PAL.bone4);
    buf.applyOutline(PAL.outline);
    icons[id] = buf.toCanvas();
  }
  return icons;
}
