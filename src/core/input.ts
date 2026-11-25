import { ATTACK_BUFFER_TIME, JUMP_BUFFER_TIME } from './constants.ts';

export type ActionName =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'attack'
  | 'roll'
  | 'skill1'
  | 'skill2'
  | 'heal'
  | 'interact'
  | 'overdrive'
  | 'warp'
  | 'pause'
  | 'mute';

const KEY_TO_ACTION: Record<string, ActionName> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  Space: 'jump',
  KeyJ: 'attack',
  KeyZ: 'attack',
  ShiftLeft: 'roll',
  ShiftRight: 'roll',
  KeyK: 'roll',
  KeyX: 'roll',
  KeyQ: 'skill1',
  KeyU: 'skill1',
  KeyE: 'skill2',
  KeyI: 'skill2',
  KeyR: 'heal',
  KeyH: 'heal',
  KeyF: 'interact',
  KeyV: 'overdrive',
  KeyL: 'overdrive',
  Tab: 'warp',
  Escape: 'pause',
  KeyM: 'mute',
};

export class InputManager {
  private held = new Set<ActionName>();
  private padHeld = new Set<ActionName>();
  private padPrev = new Set<ActionName>();
  private pressed = new Set<ActionName>();
  private jumpBufferTimer = 0;
  private attackBufferTimer = 0;
  private rollBufferTimer = 0;
  private enabled = true;

  private readonly onKeyDownBound: (e: KeyboardEvent) => void;
  private readonly onKeyUpBound: (e: KeyboardEvent) => void;
  private readonly onMouseDownBound: (e: MouseEvent) => void;
  private readonly onMouseUpBound: (e: MouseEvent) => void;
  private readonly onContextMenuBound: (e: MouseEvent) => void;
  private readonly onBlurBound: () => void;

  constructor(private readonly targetElement: HTMLElement) {
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onMouseDownBound = this.handleMouseDown.bind(this);
    this.onMouseUpBound = this.handleMouseUp.bind(this);
    this.onContextMenuBound = (e: MouseEvent) => e.preventDefault();
    this.onBlurBound = () => this.clearAll();

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    this.targetElement.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    this.targetElement.addEventListener('contextmenu', this.onContextMenuBound);
    window.addEventListener('blur', this.onBlurBound);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    this.targetElement.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    this.targetElement.removeEventListener('contextmenu', this.onContextMenuBound);
    window.removeEventListener('blur', this.onBlurBound);
  }

  setGameplayEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearAll();
    }
  }

  clearAll(): void {
    this.held.clear();
    this.padHeld.clear();
    this.padPrev.clear();
    this.pressed.clear();
    this.jumpBufferTimer = 0;
    this.attackBufferTimer = 0;
    this.rollBufferTimer = 0;
  }

  private triggerPress(action: ActionName): void {
    this.pressed.add(action);
    if (action === 'jump' || action === 'up') {
      this.jumpBufferTimer = JUMP_BUFFER_TIME;
    }
    if (action === 'attack') {
      this.attackBufferTimer = ATTACK_BUFFER_TIME;
    }
    if (action === 'roll') {
      this.rollBufferTimer = 0.12;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const action = KEY_TO_ACTION[e.code];
    if (!action) return;

    if (action === 'pause' || action === 'mute') {
      if (!e.repeat) this.pressed.add(action);
      return;
    }

    if (!this.enabled) return;

    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'Tab'
    ) {
      e.preventDefault();
    }

    if (!e.repeat) {
      this.triggerPress(action);
    }
    this.held.add(action);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const action = KEY_TO_ACTION[e.code];
    if (!action) return;
    this.held.delete(action);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.enabled) return;
    if (e.button === 0) {
      this.triggerPress('attack');
      this.held.add('attack');
    } else if (e.button === 2) {
      this.triggerPress('roll');
      this.held.add('roll');
    } else if (e.button === 1) {
      e.preventDefault();
      this.triggerPress('overdrive');
      this.held.add('overdrive');
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.held.delete('attack');
    if (e.button === 2) this.held.delete('roll');
    if (e.button === 1) this.held.delete('overdrive');
  }

  private pollGamepad(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad: Gamepad | null = null;
    for (const gp of pads) {
      if (gp && gp.connected) {
        pad = gp;
        break;
      }
    }

    this.padHeld.clear();
    if (!pad) {
      this.padPrev.clear();
      return;
    }

    const btn = (idx: number): boolean => Boolean(pad!.buttons[idx]?.pressed);
    const axX = pad.axes[0] ?? 0;
    const axY = pad.axes[1] ?? 0;

    if (btn(9)) this.padHeld.add('pause');

    if (this.enabled) {
      if (axX < -0.35 || btn(14)) this.padHeld.add('left');
      if (axX > 0.35 || btn(15)) this.padHeld.add('right');
      if (axY < -0.45 || btn(12)) {
        this.padHeld.add('up');
        this.padHeld.add('interact');
      }
      if (axY > 0.45 || btn(13)) this.padHeld.add('down');

      if (btn(0)) this.padHeld.add('jump'); // A / Cross
      if (btn(2)) this.padHeld.add('attack'); // X / Square
      if (btn(1) || btn(5)) this.padHeld.add('roll'); // B / RB
      if (btn(4)) this.padHeld.add('skill1'); // LB
      if (btn(7) || btn(3)) this.padHeld.add('skill2'); // RT / Y
      if (btn(6)) this.padHeld.add('heal'); // LT
      if (btn(8) || btn(11)) this.padHeld.add('overdrive'); // Select / R3
    }

    for (const act of this.padHeld) {
      if (!this.padPrev.has(act)) {
        this.triggerPress(act);
      }
    }

    this.padPrev = new Set(this.padHeld);
  }

  update(dt: number): void {
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.attackBufferTimer > 0) this.attackBufferTimer = Math.max(0, this.attackBufferTimer - dt);
    if (this.rollBufferTimer > 0) this.rollBufferTimer = Math.max(0, this.rollBufferTimer - dt);
    this.pollGamepad();
  }

  endFrame(): void {
    this.pressed.clear();
  }

  isHeld(action: ActionName): boolean {
    return this.held.has(action) || this.padHeld.has(action);
  }

  wasPressed(action: ActionName): boolean {
    return this.pressed.has(action);
  }

  hasBufferedJump(): boolean {
    return this.jumpBufferTimer > 0;
  }

  consumeJumpBuffer(): void {
    this.jumpBufferTimer = 0;
  }

  hasBufferedAttack(): boolean {
    return this.attackBufferTimer > 0;
  }

  consumeAttackBuffer(): void {
    this.attackBufferTimer = 0;
  }

  hasBufferedRoll(): boolean {
    return this.rollBufferTimer > 0;
  }

  consumeRollBuffer(): void {
    this.rollBufferTimer = 0;
  }

  getMoveAxisX(): number {
    let dir = 0;
    if (this.isHeld('left')) dir -= 1;
    if (this.isHeld('right')) dir += 1;
    return dir;
  }
}
