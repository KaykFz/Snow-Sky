import { CONFIG, HoverControlMode } from '../config';

export interface InputState {
  moveX: number; // -1, 0, 1
  moveY: number; // -1 (up), 0, 1 (down)
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  jumpJustReleased: boolean;
  jumpBufferFrames: number;
  hoverHeld: boolean;
  hoverJustPressed: boolean;
  hoverToggledOn: boolean;
  grabHeld: boolean; // Escalada automática ou segurando direção/botão na parede
  restartJustPressed: boolean;
  pauseJustPressed: boolean;
  muteJustPressed: boolean;
  confirmJustPressed: boolean;
}

export class InputManager {
  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private keysJustReleased = new Set<string>();

  private mouseHoverDown = false;
  private mouseHoverJustPressed = false;

  private prevGamepadJump = false;
  private prevGamepadHover = false;
  private prevGamepadRestart = false;
  private prevGamepadPause = false;

  public state: InputState = {
    moveX: 0,
    moveY: 0,
    jumpHeld: false,
    jumpJustPressed: false,
    jumpJustReleased: false,
    jumpBufferFrames: 0,
    hoverHeld: false,
    hoverJustPressed: false,
    hoverToggledOn: false,
    grabHeld: false,
    restartJustPressed: false,
    pauseJustPressed: false,
    muteJustPressed: false,
    confirmJustPressed: false,
  };

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private onBlurBound: () => void;

  constructor() {
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onContextMenuBound = this.onContextMenu.bind(this);
    this.onBlurBound = this.clearAll.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDownBound);
      window.addEventListener('keyup', this.onKeyUpBound);
      window.addEventListener('mousedown', this.onMouseDownBound);
      window.addEventListener('mouseup', this.onMouseUpBound);
      window.addEventListener('contextmenu', this.onContextMenuBound);
      window.addEventListener('blur', this.onBlurBound);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.clearAll();
      });
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDownBound);
      window.removeEventListener('keyup', this.onKeyUpBound);
      window.removeEventListener('mousedown', this.onMouseDownBound);
      window.removeEventListener('mouseup', this.onMouseUpBound);
      window.removeEventListener('contextmenu', this.onContextMenuBound);
      window.removeEventListener('blur', this.onBlurBound);
    }
  }

  public clearAll(): void {
    this.keysDown.clear();
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseHoverDown = false;
    this.mouseHoverJustPressed = false;
    this.state.moveX = 0;
    this.state.moveY = 0;
    this.state.jumpHeld = false;
    this.state.jumpJustPressed = false;
    this.state.jumpJustReleased = false;
    this.state.jumpBufferFrames = 0;
    this.state.hoverHeld = false;
    this.state.hoverJustPressed = false;
    this.state.restartJustPressed = false;
    this.state.pauseJustPressed = false;
    this.state.muteJustPressed = false;
    this.state.confirmJustPressed = false;
  }

  public resetHoverToggle(): void {
    this.state.hoverToggledOn = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    // Previne scroll de página com setas ou espaço
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)
    ) {
      e.preventDefault();
    }
    if (!this.keysDown.has(code)) {
      this.keysJustPressed.add(code);
    }
    this.keysDown.add(code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const code = e.code;
    if (this.keysDown.has(code)) {
      this.keysJustReleased.add(code);
    }
    this.keysDown.delete(code);
  }

  private onMouseDown(e: MouseEvent): void {
    // Clique Direito no canvas aciona o Hover confortavelmente
    if (e.button === 2 && document.body.dataset.state === 'playing') {
      if (!this.mouseHoverDown) {
        this.mouseHoverJustPressed = true;
      }
      this.mouseHoverDown = true;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2) {
      this.mouseHoverDown = false;
    }
  }

  private onContextMenu(e: MouseEvent): void {
    if (document.body.dataset.state === 'playing') {
      e.preventDefault();
    }
  }

  private isAnyDown(codes: string[]): boolean {
    for (let i = 0; i < codes.length; i++) {
      if (this.keysDown.has(codes[i])) return true;
    }
    return false;
  }

  private isAnyJustPressed(codes: string[]): boolean {
    for (let i = 0; i < codes.length; i++) {
      if (this.keysJustPressed.has(codes[i])) return true;
    }
    return false;
  }

  private isAnyJustReleased(codes: string[]): boolean {
    for (let i = 0; i < codes.length; i++) {
      if (this.keysJustReleased.has(codes[i])) return true;
    }
    return false;
  }

  public update(hoverMode: HoverControlMode): void {
    const leftCodes = ['ArrowLeft', 'KeyA'];
    const rightCodes = ['ArrowRight', 'KeyD'];
    const upCodes = ['ArrowUp', 'KeyW'];
    const downCodes = ['ArrowDown', 'KeyS'];

    // Controles ergonômicos:
    // - WASD + Espaço (pular) + Shift / E (hover ao alcance imediato da mão esquerda)
    // - WASD + J (pular) + K / L (hover na mão direita estilo arcade/Steam)
    // - Setas + Z / Espaço (pular) + Shift / C / X (hover na mão esquerda)
    const jumpCodes = ['Space', 'KeyZ', 'KeyJ'];
    const hoverCodes = ['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyK', 'KeyL', 'KeyC', 'KeyX'];
    const restartCodes = ['KeyR'];
    const pauseCodes = ['Escape', 'KeyP'];
    const muteCodes = ['KeyM'];
    const confirmCodes = ['Enter', 'Space', 'KeyZ', 'KeyJ'];

    let moveX = 0;
    if (this.isAnyDown(leftCodes)) moveX -= 1;
    if (this.isAnyDown(rightCodes)) moveX += 1;

    let moveY = 0;
    if (this.isAnyDown(upCodes)) moveY -= 1;
    if (this.isAnyDown(downCodes)) moveY += 1;

    let jumpHeld = this.isAnyDown(jumpCodes);
    let jumpJustPressed = this.isAnyJustPressed(jumpCodes);
    let jumpJustReleased = this.isAnyJustReleased(jumpCodes);

    let hoverHeld = this.isAnyDown(hoverCodes) || this.mouseHoverDown;
    let hoverJustPressed =
      this.isAnyJustPressed(hoverCodes) || this.mouseHoverJustPressed;

    let restartJustPressed = this.isAnyJustPressed(restartCodes);
    let pauseJustPressed = this.isAnyJustPressed(pauseCodes);
    const muteJustPressed = this.isAnyJustPressed(muteCodes);
    let confirmJustPressed = this.isAnyJustPressed(confirmCodes);

    // Leitura do Gamepad API
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const pads = navigator.getGamepads();
      const pad = pads && pads[0];
      if (pad) {
        const axX = pad.axes[0] ?? 0;
        const axY = pad.axes[1] ?? 0;
        const dpadLeft = pad.buttons[14]?.pressed;
        const dpadRight = pad.buttons[15]?.pressed;
        const dpadUp = pad.buttons[12]?.pressed;
        const dpadDown = pad.buttons[13]?.pressed;

        if (axX < -0.35 || dpadLeft) moveX = -1;
        else if (axX > 0.35 || dpadRight) moveX = 1;

        if (axY < -0.35 || dpadUp) moveY = -1;
        else if (axY > 0.35 || dpadDown) moveY = 1;

        const padJump = Boolean(pad.buttons[0]?.pressed || pad.buttons[1]?.pressed);
        const padHover = Boolean(
          pad.buttons[2]?.pressed ||
            pad.buttons[5]?.pressed ||
            pad.buttons[7]?.pressed ||
            pad.buttons[4]?.pressed ||
            pad.buttons[6]?.pressed
        );
        const padRestart = Boolean(pad.buttons[3]?.pressed || pad.buttons[8]?.pressed);
        const padPause = Boolean(pad.buttons[9]?.pressed);

        if (padJump) jumpHeld = true;
        if (padJump && !this.prevGamepadJump) {
          jumpJustPressed = true;
          confirmJustPressed = true;
        }
        if (!padJump && this.prevGamepadJump) jumpJustReleased = true;

        if (padHover) hoverHeld = true;
        if (padHover && !this.prevGamepadHover) hoverJustPressed = true;

        if (padRestart && !this.prevGamepadRestart) restartJustPressed = true;
        if (padPause && !this.prevGamepadPause) pauseJustPressed = true;

        this.prevGamepadJump = padJump;
        this.prevGamepadHover = padHover;
        this.prevGamepadRestart = padRestart;
        this.prevGamepadPause = padPause;
      }
    }

    // Modo Toggle vs Hold para o Hover
    if (hoverMode === 'toggle') {
      if (hoverJustPressed) {
        this.state.hoverToggledOn = !this.state.hoverToggledOn;
      }
      hoverHeld = this.state.hoverToggledOn;
    } else {
      this.state.hoverToggledOn = hoverHeld;
    }

    // Jump Buffer (estilo Celeste: ~6 frames)
    if (jumpJustPressed) {
      this.state.jumpBufferFrames = CONFIG.FEEL.JUMP_BUFFER_FRAMES;
    } else if (this.state.jumpBufferFrames > 0) {
      this.state.jumpBufferFrames--;
    }

    this.state.moveX = moveX;
    this.state.moveY = moveY;
    this.state.jumpHeld = jumpHeld;
    this.state.jumpJustPressed = jumpJustPressed;
    this.state.jumpJustReleased = jumpJustReleased;
    this.state.hoverHeld = hoverHeld;
    this.state.hoverJustPressed = hoverJustPressed;
    const grabCodes = ['ControlLeft', 'ControlRight', 'KeyG', 'KeyF'];
    this.state.grabHeld = moveY < 0 || moveX !== 0 || this.isAnyDown(grabCodes);
    this.state.restartJustPressed = restartJustPressed;
    this.state.pauseJustPressed = pauseJustPressed;
    this.state.muteJustPressed = muteJustPressed;
    this.state.confirmJustPressed = confirmJustPressed;

    // Limpa bordas do frame atual
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseHoverJustPressed = false;
  }

  public consumeJumpBuffer(): void {
    this.state.jumpBufferFrames = 0;
    this.state.jumpJustPressed = false;
  }
}
