import { CONFIG } from '../config';
import { InputState } from './Input';
import { LevelRuntime } from './Level';
import { ParticleSystem } from './Particles';
import {
  PhysicsEvents,
  PlayerKinematics,
  createEmptyEvents,
  stepPlayerPhysics,
} from './Physics';

export interface HairNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export type MayaAnimState =
  | 'idle'
  | 'run'
  | 'jump'
  | 'fall'
  | 'wall_slide'
  | 'hover_slide'
  | 'hover_air'
  | 'hover_wall_climb'
  | 'dead'
  | 'respawning';

interface CompiledPixel {
  x: number;
  y: number;
  token: string;
}

interface CompiledSpriteFrame {
  outlines: Array<[number, number]>;
  pixels: CompiledPixel[];
  anchorX: number;
  anchorY: number;
}

function compilePixelFrame(
  rows: string[],
  anchorX: number,
  anchorY: number
): CompiledSpriteFrame {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const filled = new Set<string>();
  const pixels: CompiledPixel[] = [];

  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.') {
        filled.add(`${x},${y}`);
        pixels.push({ x, y, token: ch });
      }
    }
  }

  const outlineSet = new Set<string>();
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const p of pixels) {
    for (const [dx, dy] of dirs) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      const key = `${nx},${ny}`;
      if (!filled.has(key)) {
        outlineSet.add(key);
      }
    }
  }

  const outlines: Array<[number, number]> = [];
  for (const key of outlineSet) {
    const [ox, oy] = key.split(',').map(Number);
    if (ox >= -1 && ox <= w && oy >= -1 && oy <= h) {
      outlines.push([ox, oy]);
    }
  }

  return { outlines, pixels, anchorX, anchorY };
}

// Frames clássicos estilo Celeste (cabeça compacta 5px, olhos 1x1 nítidos, cachecol azul e proporção ágil)
const MAYA_FRAMES = {
  idle: compilePixelFrame(
    [
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '..lPjJJJj..',
      '..PPJJdJJS.',
      '..ppJddJd..',
      '....DNNnD..',
      '....NN.NN..',
      '....NN.NN..',
      '....BB.BB..',
      '....bb.bb..',
    ],
    5,
    13
  ),
  idleBlink: compilePixelFrame(
    [
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSsSsS..',
      '....FFfFF..',
      '..lPjJJJj..',
      '..PPJJdJJS.',
      '..ppJddJd..',
      '....DNNnD..',
      '....NN.NN..',
      '....NN.NN..',
      '....BB.BB..',
      '....bb.bb..',
    ],
    5,
    13
  ),
  run1: compilePixelFrame(
    [
      '...........',
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '..lPjJJJjS.',
      '..PPJJdJd..',
      '...pDNNnD..',
      '...NN..NN..',
      '..nN....Nn.',
      '..BB....BB.',
      '..bb....bb.',
    ],
    5,
    13
  ),
  run2: compilePixelFrame(
    [
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '..lPjJJJj..',
      '..PPJJdJJS.',
      '..ppJddJd..',
      '....DNNnD..',
      '....NN.NN..',
      '....NN.NN..',
      '...BB...BB.',
      '...bb...bb.',
    ],
    5,
    13
  ),
  run3: compilePixelFrame(
    [
      '...........',
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '.SlPjJJJj..',
      '..PPJJdJJS.',
      '...pDNNnD..',
      '...NN..NN..',
      '..NN....NN.',
      '..BB....BB.',
      '..bb....bb.',
    ],
    5,
    13
  ),
  run4: compilePixelFrame(
    [
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '..lPjJJJj..',
      '..PPJJdJJS.',
      '..ppJddJd..',
      '....DNNnD..',
      '....NN.NN..',
      '....NN.BB..',
      '....BB.bb..',
      '....bb.....',
    ],
    5,
    13
  ),
  jump: compilePixelFrame(
    [
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '..lPjJJJjS.',
      '..PPJJdJd..',
      '..ppJddJd..',
      '....DNNnN..',
      '...NN..BB..',
      '...BB..bb..',
      '...bb......',
      '...........',
    ],
    5,
    12
  ),
  fall: compilePixelFrame(
    [
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '.SlPjJJJj..',
      '..PPJJdJJS.',
      '..ppJddJd..',
      '....DNNnN..',
      '....NN.NN..',
      '....BB.BB..',
      '....bb.bb..',
      '...........',
    ],
    5,
    12
  ),
  wallSlide: compilePixelFrame(
    [
      '.....HLH...',
      '....kHLHk..',
      '...kSShSS..',
      '...kSESES..',
      '....FFfFF..',
      '..lPjJJJjS.',
      '..PPJJdJd..',
      '..ppJddJd..',
      '....DNNn...',
      '....NN.NN..',
      '....BB.BB..',
      '....bb.bb..',
      '...........',
    ],
    5,
    12
  ),
  hover: compilePixelFrame(
    [
      '......HLH.....',
      '.....kHLHk....',
      '....kSShSS....',
      '....kSESES....',
      '.....FFfFF....',
      '..S.lPjJJJj.S.',
      '...jjPPJJdJj..',
      '....ppJddJd...',
      '.....NNn.nNN..',
      '....BB....BB..',
      '....bb....bb..',
      'CTtCCGGGGCCTtC',
      '.CCCCCCCCCCCC.',
    ],
    7,
    13
  ),
};

function drawPixelCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string
): void {
  ctx.fillStyle = color;
  const r = Math.floor(size / 2);
  const x0 = cx - r;
  const y0 = cy - r;
  if (size <= 2) {
    ctx.fillRect(x0, y0, size, size);
    return;
  }
  if (size === 3) {
    ctx.fillRect(x0 + 1, y0, 1, 3);
    ctx.fillRect(x0, y0 + 1, 3, 1);
    return;
  }
  if (size === 4) {
    ctx.fillRect(x0 + 1, y0, 2, 4);
    ctx.fillRect(x0, y0 + 1, 4, 2);
    return;
  }
  // Círculo pixelado com cantos chanfrados (5x5, 6x6, 7x7...)
  ctx.fillRect(x0 + 1, y0, size - 2, size);
  ctx.fillRect(x0, y0 + 1, size, size - 2);
}

export class Player implements PlayerKinematics {
  public x = 0;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public width = CONFIG.PLAYER_WIDTH;
  public height = CONFIG.PLAYER_HEIGHT;
  public facing: 1 | -1 = 1;

  public onGround = false;
  public onIce = false;
  public onBlackIce = false;
  public onSoftSnow = false;
  public onSlope = false;
  public wallDir: -1 | 0 | 1 = 0;
  public wallIsIce = false;

  public isHovering = false;
  public hoverEnergy = CONFIG.HOVER.MAX_ENERGY;
  public wallStamina = CONFIG.NORMAL.WALL_STAMINA_MAX;
  public coyoteFrames = 0;

  public animState: MayaAnimState = 'idle';
  public animTime = 0;
  public runCycleDist = 0;

  // GameMaker Jelly Effect (Mola amortecida Squash & Stretch)
  public scaleX = 1;
  public scaleY = 1;
  private jellyDeform = 0;
  private jellyVel = 0;
  public bodyTilt = 0;
  public flashFrames = 0;

  // Indicadores de precisão (Input Buffer, Coyote Time e Prontidão de Dash/Salto Carregado)
  public jumpBufferVisualFrames = 0;
  public coyoteVisualFrames = 0;
  public isDashOrChargedReady = false;

  // Morte & Respawn rápido (< 1s)
  public deathTimerFrames = 0;
  public respawnShimmerFrames = 0;

  // Simulação de Cabelo Cacheado Volumoso (8 segmentos Verlet/Mola)
  public hair: HairNode[] = [];
  private ghostTimer = 0;

  constructor(spawnX: number, spawnY: number) {
    this.spawnAt(spawnX, spawnY);
  }

  public spawnAt(spawnX: number, spawnY: number): void {
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.onIce = false;
    this.onBlackIce = false;
    this.onSoftSnow = false;
    this.onSlope = false;
    this.wallDir = 0;
    this.wallIsIce = false;
    this.isHovering = false;
    this.hoverEnergy = CONFIG.HOVER.MAX_ENERGY;
    this.wallStamina = CONFIG.NORMAL.WALL_STAMINA_MAX;
    this.coyoteFrames = 0;
    this.jumpBufferVisualFrames = 0;
    this.coyoteVisualFrames = 0;
    this.isDashOrChargedReady = false;
    this.animState = 'respawning';
    this.deathTimerFrames = 0;
    this.respawnShimmerFrames = 14;
    this.jellyDeform = -0.26;
    this.jellyVel = -2.4;
    this.scaleX = 0.74;
    this.scaleY = 1.28;
    this.bodyTilt = 0;
    this.flashFrames = 8;

    this.hair = [];
    const headX = this.x;
    const headY = this.y - 10;
    for (let i = 0; i < CONFIG.HAIR.SEGMENTS; i++) {
      this.hair.push({
        x: headX - i * 1.8,
        y: headY + i * 0.6,
        vx: 0,
        vy: 0,
        size: CONFIG.HAIR.SIZES[i] ?? 2,
      });
    }
  }

  public applyJelly(deformImpulse: number, velKick = 0): void {
    this.jellyDeform = Math.max(-0.34, Math.min(0.36, this.jellyDeform + deformImpulse));
    this.jellyVel += velKick;
  }

  public triggerDeath(particles: ParticleSystem): void {
    if (this.animState === 'dead') return;
    this.animState = 'dead';
    this.deathTimerFrames = CONFIG.FEEL.DEATH_RESPAWN_FRAMES;
    this.vx = 0;
    this.vy = 0;
    this.isHovering = false;
    particles.emitDeathExplosion(this.x, this.y - 8);
  }

  public update(
    dt: number,
    input: InputState,
    level: LevelRuntime,
    particles: ParticleSystem
  ): { events: PhysicsEvents; respawnedNow: boolean } {
    this.animTime += dt;
    if (this.flashFrames > 0) this.flashFrames--;

    if (this.animState === 'dead') {
      this.deathTimerFrames--;
      if (this.deathTimerFrames <= 0) {
        level.resetOnRespawn();
        this.spawnAt(level.spawnX, level.spawnY);
        particles.emitRespawnShimmer(this.x, this.y - 8);
        const respawnEvents = createEmptyEvents();
        respawnEvents.energyRechargedFlash = true;
        return {
          events: respawnEvents,
          respawnedNow: true,
        };
      }
      return {
        events: createEmptyEvents(),
        respawnedNow: false,
      };
    }

    if (this.respawnShimmerFrames > 0) {
      this.respawnShimmerFrames--;
    }

    const prevFacing = this.facing;
    const { events, consumeJumpBuffer } = stepPlayerPhysics(this, input, level, dt);
    if (consumeJumpBuffer) {
      input.jumpBufferFrames = 0;
      input.jumpJustPressed = false;
    }

    if (events.energyRechargedFlash) {
      this.flashFrames = 6;
    }

    // GameMaker Jelly Effect: impulsos elásticos em todas as ações chave
    if (events.hoverActivated) {
      this.applyJelly(0.2, 1.8);
    } else if (events.hoverDeactivated) {
      this.applyJelly(-0.12, -1.2);
    }

    if (this.onGround && prevFacing !== this.facing && Math.abs(this.vx) > 20) {
      this.applyJelly(0.11, 1.1);
    }

    if (events.jumped) {
      this.applyJelly(
        events.chargedJump ? -0.3 : -0.22,
        events.chargedJump ? -3.6 : -2.6
      );
      if (events.chargedJump) {
        particles.emitChargedJumpBurst(this.x, this.y, this.vx);
      } else {
        particles.emitDustBurst(this.x, this.y, 7);
      }
    } else if (events.landed) {
      const impact = Math.min(1, events.landSpeed / 155);
      this.applyJelly(0.14 + 0.18 * impact, 1.8 + 2.2 * impact);
      particles.emitDustBurst(
        this.x,
        this.y,
        6 + Math.floor(impact * 6),
        this.onIce ? CONFIG.PALETTE.ICE_HIGHLIGHT : CONFIG.PALETTE.SNOW_TOP
      );
    }

    if (events.springBounced) {
      this.applyJelly(-0.34, -4.2);
      particles.emitChargedJumpBurst(events.springX, events.springY, this.vx);
    }

    if (events.blockShattered) {
      this.applyJelly(0.22, 2.6);
      particles.emitIceBlockShatter(events.blockX, events.blockY);
    }

    if (events.crystalCollected) {
      this.applyJelly(-0.24, -2.8);
      particles.spawnShockwave(
        events.crystalX,
        events.crystalY,
        16,
        CONFIG.PALETTE.CRYSTAL_BRIGHT
      );
    }

    if (events.boostRingHit) {
      this.applyJelly(-0.32, -3.8);
      particles.emitChargedJumpBurst(events.boostRingX, events.boostRingY, this.vx);
      particles.spawnShockwave(
        events.boostRingX,
        events.boostRingY,
        22,
        CONFIG.PALETTE.BOARD_GLOW
      );
    }

    if (events.keyCollected) {
      this.applyJelly(-0.22, -2.4);
      particles.spawnShockwave(
        events.keyX,
        events.keyY,
        24,
        CONFIG.PALETTE.GOLDEN_FLAKE
      );
    }

    if (events.goldenCollected && level.goldenFlake) {
      this.applyJelly(-0.2, -2.0);
      particles.spawnShockwave(
        level.goldenFlake.x,
        level.goldenFlake.y,
        24,
        CONFIG.PALETTE.GOLDEN_FLAKE
      );
    }

    // Ciclo de corrida suave em 4 quadros sincronizado com distância (velocidade natural!)
    if (this.onGround && Math.abs(this.vx) > 5 && !this.isHovering) {
      const prevStep = Math.floor(this.runCycleDist);
      this.runCycleDist += Math.abs(this.vx) * dt * 0.14;
      const nextStep = Math.floor(this.runCycleDist);
      if (nextStep !== prevStep && (nextStep % 4 === 0 || nextStep % 4 === 2)) {
        // Micro-squash jellying e poeira sutil ao pisar na neve durante o passo
        this.applyJelly(0.07, 0.6);
        particles.emitDustBurst(
          this.x - this.facing * 2,
          this.y,
          2,
          this.onIce ? CONFIG.PALETTE.ICE_HIGHLIGHT : CONFIG.PALETTE.SNOW_TOP
        );
      }
    } else {
      this.runCycleDist = 0;
    }

    // Atualiza estados visuais de Input Buffer, Coyote Time e Dash/Salto Carregado
    this.jumpBufferVisualFrames = !this.onGround && input.jumpBufferFrames > 0
      ? input.jumpBufferFrames
      : 0;
    this.coyoteVisualFrames = !this.onGround && this.coyoteFrames > 0
      ? this.coyoteFrames
      : 0;
    this.isDashOrChargedReady =
      this.isHovering && Math.abs(this.vx) >= CONFIG.HOVER.CHARGED_SPEED_THRESHOLD;

    // Oscilador harmônico amortecido do Jelly Effect (estilo GameMaker)
    const stiffness = 260;
    const damping = 11.2;
    const accel = -stiffness * this.jellyDeform - damping * this.jellyVel;
    this.jellyVel += accel * dt;
    this.jellyDeform += this.jellyVel * dt;

    const idleBreath =
      this.onGround && Math.abs(this.vx) < 4 && !this.isHovering
        ? Math.sin(this.animTime * 3.8) * 0.028
        : 0;
    // Leve agachamento de antecipação quando há Input Buffer prestes a disparar
    const bufferAnticipation = this.jumpBufferVisualFrames > 0 ? 0.08 : 0;
    const totalDeform = Math.max(
      -0.34,
      Math.min(0.36, this.jellyDeform + idleBreath + bufferAnticipation)
    );
    this.scaleX = 1 + totalDeform;
    this.scaleY = 1 - totalDeform * 0.85;

    // Inclinação do corpo conforme a velocidade no Hover
    const recover = 1 - Math.exp(-14 * dt);
    const targetTilt = this.isHovering
      ? Math.max(-0.32, Math.min(0.32, (this.vx / 145) * 0.25))
      : 0;
    this.bodyTilt += (targetTilt - this.bodyTilt) * recover;

    // Rastro do Hoverboard e Fantasmas em alta velocidade
    if (this.isHovering) {
      if (this.onGround || Math.abs(this.vx) > 60) {
        particles.emitHoverTrail(this.x, this.y, this.vx, this.onIce);
      }
      if (Math.abs(this.vx) > 95 || Math.abs(this.vy) > 110) {
        this.ghostTimer -= dt;
        if (this.ghostTimer <= 0) {
          this.ghostTimer = 0.045;
          particles.spawnGhost(
            this.x,
            this.y,
            this.facing,
            true,
            this.bodyTilt,
            this.hoverEnergy > 25
              ? CONFIG.PALETTE.BOARD_GLOW
              : CONFIG.PALETTE.HAIR_CHARGED
          );
        }
      }
    }

    if (!this.onGround && this.wallDir !== 0 && Math.abs(this.vy) > 15) {
      if (Math.random() < 0.45) {
        particles.emitWallChips(
          this.x + this.wallDir * 4,
          this.y - 8,
          this.wallDir,
          this.wallIsIce
        );
      }
    }

    if (events.died) {
      this.triggerDeath(particles);
    } else if (this.isHovering) {
      if (this.onGround) {
        this.animState = 'hover_slide';
      } else {
        this.animState = 'hover_air';
      }
    } else {
      if (!this.onGround && this.wallDir !== 0) {
        this.animState = 'wall_slide';
      } else if (!this.onGround) {
        this.animState = this.vy < 0 ? 'jump' : 'fall';
      } else if (Math.abs(this.vx) > 8) {
        this.animState = 'run';
      } else {
        this.animState = 'idle';
      }
    }

    this.updateHair(dt, particles.ambientWindX);

    return { events, respawnedNow: false };
  }

  public updateHair(dt: number, windX: number): void {
    if (this.hair.length === 0) return;

    const crouchOffset = this.isHovering ? 0.8 : 0;
    const breatheOffset =
      this.animState === 'idle' ? Math.sin(this.animTime * 4.2) * 0.3 : 0;
    const rootX = this.x - this.facing * 2.4 + this.bodyTilt * 4;
    const rootY = this.y - (10.5 - crouchOffset) * this.scaleY + breatheOffset;

    this.hair[0].x = rootX;
    this.hair[0].y = rootY;

    const segLen = CONFIG.HAIR.SEGMENT_LENGTH;
    const stiffness = CONFIG.HAIR.STIFFNESS;
    const damping = CONFIG.HAIR.DAMPING;

    const speedMag = Math.abs(this.vx);
    const baseTrailX =
      -this.facing * (this.isHovering ? 2.1 : 1.45) -
      (this.vx / 95) * 1.45 +
      (windX / 90) * CONFIG.HAIR.WIND_INFLUENCE;
    const baseTrailY =
      (this.isHovering && speedMag > 70 ? 0.1 : 0.55) -
      (this.vy / 170) * 1.1;

    for (let i = 1; i < this.hair.length; i++) {
      const prev = this.hair[i - 1];
      const curr = this.hair[i];

      const curlWaveX = Math.sin(this.animTime * 4.8 + i * 1.15) * 0.5;
      const curlWaveY = Math.cos(this.animTime * 5.2 + i * 1.25) * 0.6;

      const targetX = prev.x + baseTrailX + curlWaveX;
      const targetY = prev.y + baseTrailY + curlWaveY;

      curr.vx = (curr.vx + (targetX - curr.x) * stiffness * 22 * dt) * damping;
      curr.vy = (curr.vy + (targetY - curr.y) * stiffness * 22 * dt) * damping;

      curr.x += curr.vx;
      curr.y += curr.vy;

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const d = Math.hypot(dx, dy);
      if (d > segLen && d > 0.0001) {
        const nx = dx / d;
        const ny = dy / d;
        curr.x = prev.x + nx * segLen;
        curr.y = prev.y + ny * segLen;
      } else if (d < segLen * 0.55 && d > 0.0001) {
        const nx = dx / d;
        const ny = dy / d;
        curr.x = prev.x + nx * (segLen * 0.55);
        curr.y = prev.y + ny * (segLen * 0.55);
      }
    }
  }

  public getHairColor(): { main: string; shade: string } {
    const P = CONFIG.PALETTE;
    if (this.flashFrames > 0) {
      return { main: P.HAIR_FLASH, shade: P.ICE_HIGHLIGHT };
    }
    if (this.hoverEnergy <= 1) {
      return { main: P.HAIR_DEPLETED, shade: P.HAIR_DEPLETED_SHADE };
    }
    return { main: P.HAIR_CHARGED, shade: P.HAIR_CHARGED_SHADE };
  }

  private getTokenColor(
    token: string,
    curlDark: string,
    curlMid: string,
    curlLight: string
  ): string {
    const P = CONFIG.PALETTE;
    switch (token) {
      case 'S':
        return P.MAYA_SKIN;
      case 's':
        return P.MAYA_SKIN_SHADOW;
      case 'h':
        return P.MAYA_SKIN_HIGHLIGHT;
      case 'r':
        return P.MAYA_BLUSH;
      case 'E':
        return '#110814';
      case 'W':
        return '#ffffff';
      case 'F':
        return P.MAYA_SCARF_BLUE;
      case 'f':
        return P.MAYA_SCARF_BLUE_LIGHT;
      case 'J':
        return P.MAYA_JACKET;
      case 'j':
        return P.MAYA_JACKET_LIGHT;
      case 'd':
        return P.MAYA_JACKET_SHADE;
      case 'D':
        return P.MAYA_JACKET_DEEP;
      case 'P':
        return P.MAYA_PACK;
      case 'p':
        return P.MAYA_PACK_DARK;
      case 'l':
        return P.MAYA_PACK_LIGHT;
      case 'N':
        return P.MAYA_PANTS;
      case 'n':
        return P.MAYA_PANTS_DARK;
      case 'B':
        return P.MAYA_BOOTS;
      case 'b':
        return P.MAYA_BOOTS_DARK;
      case 'H':
        return curlMid;
      case 'k':
        return curlDark;
      case 'L':
        return curlLight;
      case 'C':
        return P.BOARD_BODY;
      case 'G':
        return P.BOARD_ACCENT;
      case 'T':
        return P.BOARD_PAD;
      case 't':
        return P.BOARD_GLOW;
      default:
        return P.MAYA_OUTLINE;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (this.animState === 'dead') return;

    const P = CONFIG.PALETTE;
    const stateHair = this.getHairColor();
    const isDepleted = this.hoverEnergy <= 1 && this.flashFrames <= 0;
    const isFlash = this.flashFrames > 0;

    const curlDark = isFlash ? '#e0f2fe' : isDepleted ? '#0369a1' : P.HAIR_CURL_DARK;
    const curlMid = isFlash ? '#ffffff' : isDepleted ? '#0ea5e9' : P.HAIR_CURL_MID;
    const curlLight = isFlash ? '#ffffff' : isDepleted ? '#7dd3fc' : P.HAIR_CURL_LIGHT;

    // =========================================================================
    // 1. Cabelo Cacheado Volumoso em Círculos Pixelados (Estilo Celeste)
    // =========================================================================
    // Passo 1: Contorno externo #0b101d contínuo ao redor de toda a cadeia de cachos
    for (let i = this.hair.length - 1; i >= 0; i--) {
      const node = this.hair[i];
      const hx = Math.round(node.x - camX);
      const hy = Math.round(node.y - camY);
      drawPixelCircle(ctx, hx, hy, node.size + 2, P.MAYA_OUTLINE);
    }

    // Passo 2: Camada de sombra profunda + massa cacheada + brilho de cacho
    for (let i = this.hair.length - 1; i >= 0; i--) {
      const node = this.hair[i];
      const sz = node.size;
      const hx = Math.round(node.x - camX);
      const hy = Math.round(node.y - camY);

      drawPixelCircle(ctx, hx, hy, sz, curlDark);
      drawPixelCircle(ctx, hx, hy - (sz >= 5 ? 1 : 0), Math.max(1, sz - 1), curlMid);

      if (sz >= 4) {
        ctx.fillStyle = curlLight;
        ctx.fillRect(hx - 1, hy - Math.floor(sz / 2), 2, 1);
      }

      // Brilho sutil de estado (energia cheia/gasta/flash) nas presilhas e ponta
      if (i === 1 || i === 4 || i === this.hair.length - 1) {
        ctx.fillStyle = stateHair.main;
        ctx.fillRect(hx, hy - Math.floor(sz / 2), 1, 1);
      }
    }

    // =========================================================================
    // 2. Sprite Pixel Art Estilo Celeste da Maya (Frames pré-compilados)
    // =========================================================================
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);

    ctx.save();
    ctx.translate(sx, sy);
    if (this.bodyTilt !== 0) {
      ctx.rotate(this.bodyTilt);
    }
    ctx.scale(this.facing * this.scaleX, this.scaleY);

    // Escolha do frame exato de animação
    const isBlinking =
      this.animState === 'idle' && Math.sin(this.animTime * 1.4) > 0.96;
    let frame = MAYA_FRAMES.idle;
    if (this.isHovering) {
      frame = MAYA_FRAMES.hover;
    } else if (!this.onGround && this.wallDir !== 0) {
      frame = MAYA_FRAMES.wallSlide;
    } else if (!this.onGround) {
      frame = this.vy < 0 ? MAYA_FRAMES.jump : MAYA_FRAMES.fall;
    } else if (this.animState === 'run') {
      const runFrames = [
        MAYA_FRAMES.run1,
        MAYA_FRAMES.run2,
        MAYA_FRAMES.run3,
        MAYA_FRAMES.run4,
      ];
      frame = runFrames[Math.floor(this.runCycleDist) % 4];
    } else if (isBlinking) {
      frame = MAYA_FRAMES.idleBlink;
    }

    // Aura sutil sob o hoverboard quando ativo
    if (this.isHovering) {
      const pulse = Math.sin(this.animTime * 24) > 0;
      ctx.fillStyle = P.BOARD_GLOW;
      ctx.fillRect(-5, 1, 10, 1);
      if (pulse) {
        ctx.fillStyle = P.GOLDEN_GLOW;
        ctx.fillRect(-4, 1, 2, 1);
        ctx.fillRect(2, 1, 2, 1);
      }
    } else {
      // Prancha compacta presa nas costas quando a pé
      ctx.fillStyle = P.MAYA_OUTLINE;
      ctx.fillRect(-5, -10, 2, 7);
      ctx.fillStyle = P.BOARD_ACCENT;
      ctx.fillRect(-4, -9, 1, 5);
    }

    // Passo A: Outline 1px #0b101d consistente em todo o sprite
    ctx.fillStyle = P.MAYA_OUTLINE;
    for (let i = 0; i < frame.outlines.length; i++) {
      const [ox, oy] = frame.outlines[i];
      ctx.fillRect(ox - frame.anchorX, oy - frame.anchorY, 1, 1);
    }

    // Passo B: Pixels internos sombreados
    for (let i = 0; i < frame.pixels.length; i++) {
      const p = frame.pixels[i];
      ctx.fillStyle = this.getTokenColor(p.token, curlDark, curlMid, curlLight);
      ctx.fillRect(p.x - frame.anchorX, p.y - frame.anchorY, 1, 1);
    }

    // Passo C: Indicadores nos pés / alerta de stamina na parede (Prontidão de Dash/Salto Carregado)
    if (this.isDashOrChargedReady) {
      const sparkFlash = Math.sin(this.animTime * 36) > 0;
      ctx.fillStyle = sparkFlash ? '#fef08a' : P.BOARD_GLOW;
      ctx.fillRect(5, -2, 2, 1);
      ctx.fillRect(6, -1, 2, 1);
      ctx.fillRect(-6, -1, 2, 1);
    } else if (
      !this.isHovering &&
      !this.onGround &&
      this.wallDir !== 0 &&
      this.wallStamina < 36
    ) {
      // Alerta visual sutil de cansaço ao escalar sem hover (gotícula piscando)
      if (Math.sin(this.animTime * 28) > 0) {
        ctx.fillStyle = P.SPIKE_TIP;
        ctx.fillRect(-4, -11, 2, 2);
      }
    }

    ctx.restore();

    // =========================================================================
    // 3. Indicador Diegético de Precisão nos Pés (Input Buffer & Coyote Time)
    // =========================================================================
    if (this.jumpBufferVisualFrames > 0) {
      // Anel/chevron convergente dourado + ciano sob as botas indicando pulo enfileirado!
      const t = this.jumpBufferVisualFrames / CONFIG.FEEL.JUMP_BUFFER_FRAMES; // 1 -> 0
      const spread = 2 + Math.round(t * 4);
      const footY = sy + 2;
      ctx.fillStyle = P.MAYA_OUTLINE;
      ctx.fillRect(sx - spread - 2, footY - 1, 3, 3);
      ctx.fillRect(sx + spread, footY - 1, 3, 3);
      ctx.fillRect(sx - 2, footY, 4, 2);

      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx - spread - 1, footY, 2, 1);
      ctx.fillRect(sx + spread, footY, 2, 1);
      ctx.fillStyle = P.BOARD_GLOW;
      ctx.fillRect(sx - 1, footY, 2, 1);
      ctx.fillRect(sx - 2, sy - 1, 1, 1);
      ctx.fillRect(sx + 1, sy - 1, 1, 1);
    } else if (this.coyoteVisualFrames > 0) {
      // Sutil plataforma fantasma ciano sob os pés indicando janela ativa de Coyote Time
      const alpha = this.coyoteVisualFrames / CONFIG.FEEL.COYOTE_FRAMES;
      ctx.save();
      ctx.globalAlpha = 0.45 + alpha * 0.45;
      ctx.fillStyle = P.BOARD_GLOW;
      ctx.fillRect(sx - 4, sy + 1, 8, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 2, sy + 1, 4, 1);
      ctx.restore();
    }
  }
}
