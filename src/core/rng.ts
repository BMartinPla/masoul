export class SeededRng {
  private state: number;

  constructor(seed: number | string) {
    if (typeof seed === 'string') {
      let h = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      this.state = h >>> 0;
    } else {
      this.state = (seed >>> 0) || 0x1337beef;
    }
  }

  /** Returns float in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(prob: number): boolean {
    return this.next() < prob;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('SeededRng.pick called on empty array');
    }
    return items[Math.floor(this.next() * items.length)]!;
  }

  weightedPick<T>(entries: ReadonlyArray<{ item: T; weight: number }>): T {
    let total = 0;
    for (const e of entries) total += Math.max(0, e.weight);
    if (total <= 0) return entries[0]!.item;
    let roll = this.next() * total;
    for (const e of entries) {
      roll -= Math.max(0, e.weight);
      if (roll <= 0) return e.item;
    }
    return entries[entries.length - 1]!.item;
  }
}
