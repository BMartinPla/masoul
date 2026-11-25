import type { BiomeId } from '../core/types.ts';

export type BgmMood = 'none' | 'sanctuary' | 'crypt' | 'catacombs' | 'boss';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private sfxVolume = 0.85;
  private musicVolume = 0.65;
  private bgmMood: BgmMood = 'none';
  private bgmStep = 0;
  private bgmTimer = 0;

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.38;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.38, this.ctx.currentTime);
    }
    return this.muted;
  }

  setMood(mood: BgmMood): void {
    if (this.bgmMood === mood) return;
    this.bgmMood = mood;
    this.bgmStep = 0;
    this.bgmTimer = 0;
  }

  setBiomeMood(biome: BiomeId): void {
    if (biome === 'sanctuary') this.setMood('sanctuary');
    else if (biome === 'crypt') this.setMood('crypt');
    else this.setMood('catacombs');
  }

  update(dt: number): void {
    if (this.muted || this.bgmMood === 'none' || this.musicVolume <= 0.01) return;
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const stepInterval =
      this.bgmMood === 'boss'
        ? 0.15
        : this.bgmMood === 'catacombs'
          ? 0.20
          : this.bgmMood === 'crypt'
            ? 0.23
            : 0.36;
    this.bgmTimer += dt;
    if (this.bgmTimer < stepInterval) return;
    this.bgmTimer -= stepInterval;

    this.playBgmNote(this.bgmMood, this.bgmStep);
    this.bgmStep = (this.bgmStep + 1) % 16;
  }

  private playBgmNote(mood: BgmMood, step: number): void {
    const mv = this.musicVolume;
    const sanctuaryBass = [146.83, 0, 174.61, 0, 130.81, 0, 110.0, 0, 146.83, 0, 164.81, 0, 130.81, 0, 110.0, 0];
    const sanctuaryArp = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 329.63, 293.66, 261.63, 329.63, 392.0, 440.0, 349.23, 329.63, 293.66, 220.0];

    const cryptBass = [73.42, 73.42, 0, 73.42, 87.31, 0, 82.41, 0, 65.41, 65.41, 0, 65.41, 55.0, 0, 69.3, 0];
    const cryptLead = [293.66, 0, 349.23, 329.63, 293.66, 0, 440.0, 0, 392.0, 349.23, 329.63, 0, 277.18, 0, 293.66, 0];

    const cataBass = [82.41, 0, 82.41, 110.0, 98.0, 0, 92.5, 0, 73.42, 0, 87.31, 0, 65.41, 73.42, 82.41, 0];
    const cataLead = [329.63, 392.0, 493.88, 0, 440.0, 392.0, 369.99, 0, 329.63, 293.66, 329.63, 440.0, 392.0, 329.63, 293.66, 0];

    const bossBass = [73.42, 73.42, 146.83, 73.42, 87.31, 87.31, 174.61, 87.31, 65.41, 65.41, 130.81, 65.41, 69.3, 82.41, 110.0, 138.59];
    const bossLead = [440.0, 0, 466.16, 440.0, 349.23, 0, 523.25, 0, 587.33, 0, 554.37, 440.0, 349.23, 329.63, 277.18, 440.0];

    if (mood === 'sanctuary') {
      const b = sanctuaryBass[step]!;
      const a = sanctuaryArp[step]!;
      if (b > 0) this.toneRaw(b, 'triangle', 0.45, 0.08 * mv, b * 0.99);
      if (a > 0 && step % 2 === 0) this.toneRaw(a, 'sine', 0.35, 0.055 * mv, a);
    } else if (mood === 'crypt') {
      const b = cryptBass[step]!;
      const l = cryptLead[step]!;
      if (b > 0) this.toneRaw(b, 'sawtooth', 0.16, 0.075 * mv, b * 0.96);
      if (l > 0) this.toneRaw(l, 'square', 0.14, 0.036 * mv, l);
      if (step % 4 === 0) this.noiseRaw(0.04, 0.035 * mv, 900);
    } else if (mood === 'catacombs') {
      const b = cataBass[step]!;
      const l = cataLead[step]!;
      if (b > 0) this.toneRaw(b, 'sawtooth', 0.18, 0.08 * mv, b * 0.98);
      if (l > 0) this.toneRaw(l, 'triangle', 0.16, 0.055 * mv, l);
      if (step % 2 === 0) this.noiseRaw(0.04, (step % 4 === 0 ? 0.045 : 0.025) * mv, 1100);
    } else if (mood === 'boss') {
      const b = bossBass[step]!;
      const l = bossLead[step]!;
      if (b > 0) this.toneRaw(b, 'sawtooth', 0.14, 0.10 * mv, b * 0.98);
      if (l > 0) this.toneRaw(l, 'square', 0.15, 0.055 * mv, l);
      if (step % 2 === 0) this.noiseRaw(0.05, (step % 4 === 0 ? 0.07 : 0.035) * mv, step % 4 === 0 ? 450 : 1800);
    }
  }

  private tone(
    freqStart: number,
    type: OscillatorType,
    duration: number,
    volume: number,
    freqEnd = freqStart,
  ): void {
    this.toneRaw(freqStart, type, duration, volume * this.sfxVolume, freqEnd);
  }

  private noise(duration: number, volume: number, filterHz = 1200): void {
    this.noiseRaw(duration, volume * this.sfxVolume, filterHz);
  }

  private toneRaw(
    freqStart: number,
    type: OscillatorType,
    duration: number,
    volume: number,
    freqEnd = freqStart,
  ): void {
    if (this.muted || volume <= 0.001 || !this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freqStart), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private noiseRaw(duration: number, volume: number, filterHz = 1200): void {
    if (this.muted || volume <= 0.001 || !this.ctx || !this.masterGain) return;
    const sampleCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
  }

  playSlash(): void {
    this.noise(0.08, 0.16, 1700);
    this.tone(320, 'triangle', 0.08, 0.12, 130);
  }

  playHeavySlash(): void {
    this.noise(0.14, 0.24, 950);
    this.tone(180, 'sawtooth', 0.16, 0.18, 70);
  }

  playDagger(): void {
    this.noise(0.05, 0.12, 2600);
    this.tone(540, 'triangle', 0.06, 0.10, 260);
  }

  playCrit(): void {
    this.tone(880, 'triangle', 0.14, 0.22, 1320);
    this.tone(660, 'sine', 0.18, 0.16, 990);
  }

  playParry(): void {
    this.tone(1046, 'triangle', 0.24, 0.26, 1568);
    this.tone(1318, 'sine', 0.28, 0.22, 1760);
    this.noise(0.08, 0.18, 3200);
  }

  playBlock(): void {
    this.tone(240, 'square', 0.08, 0.14, 160);
    this.noise(0.06, 0.14, 2400);
  }

  playFireball(): void {
    this.noise(0.16, 0.18, 700);
    this.tone(260, 'sawtooth', 0.18, 0.14, 110);
  }

  playArrow(): void {
    this.tone(420, 'triangle', 0.06, 0.14, 180);
    this.noise(0.05, 0.10, 2200);
  }

  playRoll(): void {
    this.noise(0.10, 0.12, 850);
  }

  playJump(): void {
    this.tone(220, 'triangle', 0.09, 0.12, 410);
  }

  playSlam(): void {
    this.tone(120, 'sawtooth', 0.20, 0.26, 48);
    this.noise(0.18, 0.22, 420);
  }

  playTelegraph(): void {
    this.tone(680, 'square', 0.09, 0.09, 860);
  }

  playHitEnemy(): void {
    this.noise(0.06, 0.16, 1100);
    this.tone(170, 'square', 0.07, 0.15, 85);
  }

  playHitPlayer(): void {
    this.tone(140, 'sawtooth', 0.16, 0.24, 65);
    this.noise(0.12, 0.20, 600);
  }

  playSoulPickup(): void {
    this.tone(660, 'sine', 0.12, 0.12, 990);
  }

  playCoinPickup(): void {
    this.tone(987, 'triangle', 0.07, 0.10, 1318);
  }

  playHeal(): void {
    this.tone(392, 'sine', 0.16, 0.16, 523);
    this.tone(523, 'triangle', 0.22, 0.14, 784);
  }

  playChest(): void {
    this.tone(440, 'triangle', 0.14, 0.16, 554);
    setTimeout(() => this.tone(659, 'triangle', 0.24, 0.18, 880), 90);
  }

  playUpgrade(): void {
    this.tone(523, 'triangle', 0.16, 0.18, 784);
    setTimeout(() => this.tone(784, 'sine', 0.28, 0.20, 1046), 95);
  }

  playOverdrive(): void {
    this.tone(220, 'sawtooth', 0.28, 0.22, 880);
    this.tone(440, 'triangle', 0.35, 0.20, 1320);
    this.noise(0.18, 0.18, 1600);
  }

  playScrollPickup(): void {
    this.tone(440, 'sine', 0.16, 0.16, 659);
    setTimeout(() => this.tone(659, 'triangle', 0.24, 0.18, 987), 85);
  }

  playKillstreak(): void {
    this.tone(587, 'triangle', 0.14, 0.16, 880);
  }

  playAchievement(): void {
    this.tone(523, 'triangle', 0.14, 0.18, 659);
    setTimeout(() => this.tone(659, 'triangle', 0.16, 0.18, 784), 90);
    setTimeout(() => this.tone(784, 'sine', 0.28, 0.20, 1046), 180);
  }

  playWarp(): void {
    this.tone(784, 'sine', 0.22, 0.18, 293);
    this.noise(0.12, 0.12, 2400);
  }

  playBannerPlant(): void {
    this.tone(330, 'triangle', 0.16, 0.18, 660);
    this.noise(0.10, 0.14, 900);
  }

  playBossRoar(): void {
    this.tone(110, 'sawtooth', 0.55, 0.26, 52);
    this.noise(0.45, 0.22, 340);
  }
}
