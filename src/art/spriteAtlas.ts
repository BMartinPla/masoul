import type { PixelBuffer } from './pixelBuffer.ts';

export interface SpriteAnimation {
  frames: HTMLCanvasElement[];
  flipped: HTMLCanvasElement[];
  flash: HTMLCanvasElement[];
  flashFlipped: HTMLCanvasElement[];
  fps: number;
  loop: boolean;
}

export type SpriteSet<TState extends string> = Record<TState, SpriteAnimation>;

export function bakeAnimation(
  buffers: PixelBuffer[],
  fps: number,
  loop = true,
  flashColor = '#fff7e6',
): SpriteAnimation {
  return {
    frames: buffers.map((b) => b.toCanvas()),
    flipped: buffers.map((b) => b.toFlippedCanvas()),
    flash: buffers.map((b) => b.toFlashCanvas(flashColor, false)),
    flashFlipped: buffers.map((b) => b.toFlashCanvas(flashColor, true)),
    fps,
    loop,
  };
}

export function getAnimationFrame(
  anim: SpriteAnimation,
  time: number,
  facing: number,
  isFlash = false,
): HTMLCanvasElement {
  const count = anim.frames.length;
  let idx = Math.floor(Math.max(0, time) * anim.fps);
  if (anim.loop) {
    idx = idx % count;
  } else {
    idx = Math.min(count - 1, idx);
  }
  const flip = facing < 0;
  if (isFlash) {
    return (flip ? anim.flashFlipped[idx] : anim.flash[idx])!;
  }
  return (flip ? anim.flipped[idx] : anim.frames[idx])!;
}
