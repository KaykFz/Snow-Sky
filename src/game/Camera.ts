import { CONFIG } from '../config';

export class Camera {
  public x = 0;
  public y = 0;
  public targetX = 0;
  public targetY = 0;

  public shakeTrauma = 0;
  public offsetX = 0;
  public offsetY = 0;

  public hitstopFrames = 0;

  // Iris Wipe (círculo se fechando/abrindo nas transições de fase)
  public irisProgress = 1; // 0 = fechado, 1 = totalmente aberto
  public irisState: 'idle' | 'closing' | 'opening' = 'opening';
  public irisFocusX = CONFIG.CANVAS_WIDTH / 2;
  public irisFocusY = CONFIG.CANVAS_HEIGHT / 2;
  private onIrisClosedCallback: (() => void) | null = null;

  public snapTo(
    focusX: number,
    focusY: number,
    levelWidthPx: number,
    levelHeightPx: number
  ): void {
    this.targetX = this.clampX(focusX - CONFIG.CANVAS_WIDTH / 2, levelWidthPx);
    this.targetY = this.clampY(focusY - CONFIG.CANVAS_HEIGHT / 2, levelHeightPx);
    this.x = this.targetX;
    this.y = this.targetY;
  }

  public addShake(trauma: number, enabled = true): void {
    if (!enabled) return;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + trauma);
  }

  public triggerHitstop(frames: number): void {
    this.hitstopFrames = Math.max(this.hitstopFrames, frames);
  }

  public startIrisTransition(
    worldX: number,
    worldY: number,
    onClosed: () => void
  ): void {
    this.irisFocusX = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, worldX - this.x));
    this.irisFocusY = Math.max(20, Math.min(CONFIG.CANVAS_HEIGHT - 20, worldY - this.y));
    this.irisState = 'closing';
    this.irisProgress = 1;
    this.onIrisClosedCallback = onClosed;
  }

  private clampX(x: number, levelWidthPx: number): number {
    const maxX = Math.max(0, levelWidthPx - CONFIG.CANVAS_WIDTH);
    return Math.max(0, Math.min(maxX, x));
  }

  private clampY(y: number, levelHeightPx: number): number {
    const maxY = Math.max(0, levelHeightPx - CONFIG.CANVAS_HEIGHT);
    return Math.max(0, Math.min(maxY, y));
  }

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerVx: number,
    levelWidthPx: number,
    levelHeightPx: number
  ): void {
    // Lookahead suave baseado na velocidade horizontal
    const lookaheadX = Math.max(-36, Math.min(36, playerVx * 0.2));
    const desiredX = playerX + lookaheadX - CONFIG.CANVAS_WIDTH * 0.46;
    const desiredY = playerY - CONFIG.CANVAS_HEIGHT * 0.54;

    this.targetX = this.clampX(desiredX, levelWidthPx);
    this.targetY = this.clampY(desiredY, levelHeightPx);

    const smooth = 1 - Math.exp(-9.5 * dt);
    this.x += (this.targetX - this.x) * smooth;
    this.y += (this.targetY - this.y) * smooth;

    // Screen shake (trauma²)
    if (this.shakeTrauma > 0) {
      const shakeAmt = this.shakeTrauma * this.shakeTrauma * 5.5;
      this.offsetX = (Math.random() * 2 - 1) * shakeAmt;
      this.offsetY = (Math.random() * 2 - 1) * shakeAmt;
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.8);
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    // Iris Wipe
    if (this.irisState === 'closing') {
      this.irisProgress -= dt * 3.2;
      if (this.irisProgress <= 0) {
        this.irisProgress = 0;
        const cb = this.onIrisClosedCallback;
        this.onIrisClosedCallback = null;
        if (cb) cb();
        this.irisState = 'opening';
      }
    } else if (this.irisState === 'opening') {
      this.irisProgress += dt * 2.8;
      if (this.irisProgress >= 1) {
        this.irisProgress = 1;
        this.irisState = 'idle';
      }
    }
  }

  public get renderX(): number {
    return Math.round(this.x + this.offsetX);
  }

  public get renderY(): number {
    return Math.round(this.y + this.offsetY);
  }

  public renderIrisWipe(ctx: CanvasRenderingContext2D): void {
    if (this.irisProgress >= 1) return;
    const maxRadius = 220;
    const radius = Math.max(0, this.irisProgress * this.irisProgress * maxRadius);

    ctx.save();
    ctx.fillStyle = CONFIG.PALETTE.BG_DEEP_NIGHT;
    ctx.beginPath();
    ctx.rect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.arc(this.irisFocusX, this.irisFocusY, radius, 0, Math.PI * 2, true);
    ctx.fill();

    // Borda ciano sutil no círculo
    if (radius > 2) {
      ctx.strokeStyle = CONFIG.PALETTE.BOARD_GLOW;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.irisFocusX, this.irisFocusY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
