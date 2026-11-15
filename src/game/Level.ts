import { CONFIG } from '../config';
import { Tilemap } from './Tilemap';

export interface CrystalObj {
  id: string;
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
}

export interface SpringObj {
  id: string;
  x: number;
  y: number;
  dir: 'up' | 'right' | 'left';
  animTimer: number;
}

export interface BoostRingObj {
  id: string;
  x: number;
  y: number;
  cooldown: number;
  pulseTimer: number;
}

export interface StarKeyObj {
  id: string;
  x: number;
  y: number;
  collected: boolean;
}

export interface CrystalGateObj {
  id: string;
  tx: number;
  ty: number;
  x: number;
  y: number;
  width: number;
  height: number;
  unlocked: boolean;
}

export interface BreakableBlockObj {
  id: string;
  tx: number;
  ty: number;
  x: number;
  y: number;
  width: number;
  height: number;
  broken: boolean;
}

export interface FallingPlatformObj {
  id: string;
  x: number;
  y: number;
  originY: number;
  width: number;
  height: number;
  state: 'idle' | 'shaking' | 'falling' | 'respawning';
  timer: number;
  vy: number;
}

export interface VanishPlatformObj {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: 'idle' | 'warning' | 'gone';
  timer: number;
}

export interface ModeBlockObj {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  requiredMode: 'hover' | 'normal';
  passingThrough: boolean;
}

export interface WindZoneObj {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

export interface CheckpointObj {
  id: string;
  x: number;
  y: number;
  activated: boolean;
}

export interface GoldenFlakeObj {
  x: number;
  y: number;
  collected: boolean;
}

export interface LevelDefinition {
  id: number;
  world: 1 | 2 | 3;
  worldName: string;
  title: string;
  subtitle: string;
  hint: string;
  ascii: string[];
  windZones?: Array<{
    tx: number;
    ty: number;
    tw: number;
    th: number;
    vx: number;
    vy: number;
  }>;
}

export class LevelRuntime {
  public def: LevelDefinition;
  public tilemap: Tilemap;
  public spawnX = 24;
  public spawnY = 120;
  public goalX = 280;
  public goalY = 120;

  public crystals: CrystalObj[] = [];
  public springs: SpringObj[] = [];
  public boostRings: BoostRingObj[] = [];
  public starKeys: StarKeyObj[] = [];
  public gates: CrystalGateObj[] = [];
  public breakables: BreakableBlockObj[] = [];
  public fallingPlatforms: FallingPlatformObj[] = [];
  public vanishPlatforms: VanishPlatformObj[] = [];
  public modeBlocks: ModeBlockObj[] = [];
  public windZones: WindZoneObj[] = [];
  public checkpoints: CheckpointObj[] = [];
  public goldenFlake: GoldenFlakeObj | null = null;

  constructor(def: LevelDefinition, alreadyCollectedFlake = false) {
    this.def = def;
    const S = CONFIG.TILE_SIZE;

    // Extrai objetos especiais do ASCII e deixa os tiles limpos para o Tilemap
    const cleanedRows: string[] = [];

    for (let ty = 0; ty < def.ascii.length; ty++) {
      const line = def.ascii[ty];
      let cleanLine = '';
      for (let tx = 0; tx < line.length; tx++) {
        const ch = line[tx];
        const wx = tx * S;
        const wy = ty * S;

        if (ch === 'S') {
          this.spawnX = wx + S / 2;
          this.spawnY = wy + S;
          cleanLine += '.';
        } else if (ch === 'E') {
          this.goalX = wx + S / 2;
          this.goalY = wy + S;
          cleanLine += '.';
        } else if (ch === 'C') {
          this.crystals.push({
            id: `c_${tx}_${ty}`,
            x: wx + S / 2,
            y: wy + S / 2,
            active: true,
            respawnTimer: 0,
          });
          cleanLine += '.';
        } else if (ch === 'M') {
          this.springs.push({
            id: `m_${tx}_${ty}`,
            x: wx,
            y: wy,
            dir: 'up',
            animTimer: 0,
          });
          cleanLine += '.';
        } else if (ch === 'R') {
          this.boostRings.push({
            id: `r_${tx}_${ty}`,
            x: wx + S / 2,
            y: wy + S / 2,
            cooldown: 0,
            pulseTimer: 0,
          });
          cleanLine += '.';
        } else if (ch === 'T') {
          this.starKeys.push({
            id: `t_${tx}_${ty}`,
            x: wx + S / 2,
            y: wy + S / 2,
            collected: false,
          });
          cleanLine += '.';
        } else if (ch === 'D') {
          this.gates.push({
            id: `d_${tx}_${ty}`,
            tx,
            ty,
            x: wx,
            y: wy,
            width: S,
            height: S,
            unlocked: false,
          });
          cleanLine += '.';
        } else if (ch === 'B') {
          this.breakables.push({
            id: `b_${tx}_${ty}`,
            tx,
            ty,
            x: wx,
            y: wy,
            width: S,
            height: S,
            broken: false,
          });
          cleanLine += '.';
        } else if (ch === 'F') {
          // Agrupa 'F' horizontais contíguos em uma única plataforma que cai
          if (tx > 0 && line[tx - 1] === 'F') {
            const prev = this.fallingPlatforms[this.fallingPlatforms.length - 1];
            prev.width += S;
          } else {
            this.fallingPlatforms.push({
              id: `f_${tx}_${ty}`,
              x: wx,
              y: wy,
              originY: wy,
              width: S,
              height: 5,
              state: 'idle',
              timer: 0,
              vy: 0,
            });
          }
          cleanLine += '.';
        } else if (ch === 'V') {
          // Plataformas que desaparecem após o uso ('V')
          if (tx > 0 && line[tx - 1] === 'V') {
            const prev = this.vanishPlatforms[this.vanishPlatforms.length - 1];
            prev.width += S;
          } else {
            this.vanishPlatforms.push({
              id: `v_${tx}_${ty}`,
              x: wx,
              y: wy,
              width: S,
              height: 6,
              state: 'idle',
              timer: 0,
            });
          }
          cleanLine += '.';
        } else if (ch === 'H' || ch === 'N') {
          // Blocos Alternados por Modo ('H' = sólido no Hover; 'N' = sólido a pé sem Hover)
          this.modeBlocks.push({
            id: `mb_${tx}_${ty}`,
            x: wx,
            y: wy,
            width: S,
            height: S,
            requiredMode: ch === 'H' ? 'hover' : 'normal',
            passingThrough: false,
          });
          cleanLine += '.';
        } else if (ch === 'K') {
          this.checkpoints.push({
            id: `k_${tx}_${ty}`,
            x: wx + S / 2,
            y: wy + S,
            activated: false,
          });
          cleanLine += '.';
        } else if (ch === 'G') {
          this.goldenFlake = {
            x: wx + S / 2,
            y: wy + S / 2,
            collected: alreadyCollectedFlake,
          };
          cleanLine += '.';
        } else {
          cleanLine += ch;
        }
      }
      cleanedRows.push(cleanLine);
    }

    this.tilemap = new Tilemap(cleanedRows, def.world, def.id);

    if (def.windZones) {
      def.windZones.forEach((wz, idx) => {
        this.windZones.push({
          id: `wz_${idx}`,
          x: wz.tx * S,
          y: wz.ty * S,
          width: wz.tw * S,
          height: wz.th * S,
          vx: wz.vx,
          vy: wz.vy,
        });
      });
    }
  }

  public get widthPx(): number {
    return this.tilemap.width * CONFIG.TILE_SIZE;
  }

  public get heightPx(): number {
    return this.tilemap.height * CONFIG.TILE_SIZE;
  }

  public unlockAllGates(): void {
    for (const g of this.gates) {
      g.unlocked = true;
    }
  }

  // Reseta objetos temporários quando a Maya morre e dá respawn
  public resetOnRespawn(): void {
    for (const c of this.crystals) {
      c.active = true;
      c.respawnTimer = 0;
    }
    for (const r of this.boostRings) {
      r.cooldown = 0;
      r.pulseTimer = 0;
    }
    for (const b of this.breakables) {
      b.broken = false;
    }
    for (const f of this.fallingPlatforms) {
      f.state = 'idle';
      f.y = f.originY;
      f.timer = 0;
      f.vy = 0;
    }
    for (const v of this.vanishPlatforms) {
      v.state = 'idle';
      v.timer = 0;
    }
    for (const mb of this.modeBlocks) {
      mb.passingThrough = false;
    }
    // Se algum checkpoint já foi ativado depois da chave, preserva portões abertos; caso contrário reseta
    const anyCheckpoint = this.checkpoints.some((cp) => cp.activated);
    if (!anyCheckpoint) {
      for (const k of this.starKeys) {
        k.collected = false;
      }
      for (const g of this.gates) {
        g.unlocked = false;
      }
    }
  }

  public update(dt: number): void {
    // Cristais verdes recarregáveis
    for (const c of this.crystals) {
      if (!c.active) {
        c.respawnTimer -= dt;
        if (c.respawnTimer <= 0) {
          c.active = true;
        }
      }
    }

    // Anéis Boreais de Impulso
    for (const r of this.boostRings) {
      if (r.cooldown > 0) r.cooldown = Math.max(0, r.cooldown - dt);
      if (r.pulseTimer > 0) r.pulseTimer = Math.max(0, r.pulseTimer - dt);
    }

    // Molas de neve
    for (const s of this.springs) {
      if (s.animTimer > 0) {
        s.animTimer = Math.max(0, s.animTimer - dt);
      }
    }

    // Plataformas que caem
    for (const f of this.fallingPlatforms) {
      if (f.state === 'shaking') {
        f.timer -= dt;
        if (f.timer <= 0) {
          f.state = 'falling';
          f.vy = 20;
        }
      } else if (f.state === 'falling') {
        f.vy = Math.min(180, f.vy + 360 * dt);
        f.y += f.vy * dt;
        if (f.y > this.heightPx + 32) {
          f.state = 'respawning';
          f.timer = CONFIG.OBJECTS.FALLING_PLATFORM_RESPAWN;
        }
      } else if (f.state === 'respawning') {
        f.timer -= dt;
        if (f.timer <= 0) {
          f.state = 'idle';
          f.y = f.originY;
          f.vy = 0;
        }
      }
    }

    // Plataformas que desaparecem no lugar ('V')
    for (const v of this.vanishPlatforms) {
      if (v.state === 'warning') {
        v.timer -= dt;
        if (v.timer <= 0) {
          v.state = 'gone';
          v.timer = CONFIG.OBJECTS.VANISH_RESPAWN;
        }
      } else if (v.state === 'gone') {
        v.timer -= dt;
        if (v.timer <= 0) {
          v.state = 'idle';
          v.timer = 0;
        }
      }
    }
  }

  public renderObjects(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    time: number,
    isHovering = false
  ): void {
    const P = CONFIG.PALETTE;
    const S = CONFIG.TILE_SIZE;

    // 1. Zonas de Vento
    for (const wz of this.windZones) {
      const rx = Math.round(wz.x - camX);
      const ry = Math.round(wz.y - camY);
      ctx.save();
      ctx.fillStyle = 'rgba(125, 211, 252, 0.07)';
      ctx.fillRect(rx, ry, wz.width, wz.height);

      // Linhas de corrente de ar animadas (suporta vento horizontal e corrente ascendente)
      ctx.fillStyle = 'rgba(224, 242, 254, 0.5)';
      const isVerticalDominant = Math.abs(wz.vy) > Math.abs(wz.vx);
      const streamCount = Math.max(5, Math.floor((wz.width * wz.height) / 320));
      for (let i = 0; i < streamCount; i++) {
        if (isVerticalDominant) {
          const dirY = wz.vy <= 0 ? -1 : 1;
          const speed = Math.max(35, Math.abs(wz.vy) * 0.5);
          const lx = (i * 19 + 4) % Math.max(8, wz.width - 4);
          const ly = ((i * 29 + time * speed * dirY) % wz.height + wz.height) % wz.height;
          ctx.fillRect(rx + lx, ry + Math.floor(ly), 1, 7);
        } else {
          const dirX = wz.vx >= 0 ? 1 : -1;
          const speed = Math.max(30, Math.abs(wz.vx) * 0.45);
          const lx =
            ((i * 37 + time * speed * dirX) % wz.width + wz.width) % wz.width;
          const ly = (i * 19) % Math.max(8, wz.height - 4);
          ctx.fillRect(rx + Math.floor(lx), ry + ly + 2, 7, 1);
        }
      }
      ctx.restore();
    }

    // 2. Checkpoints (Lanternas de Gelo com outline e neve)
    for (const cp of this.checkpoints) {
      const cx = Math.round(cp.x - camX);
      const cy = Math.round(cp.y - camY);
      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(cx - 3, cy - 12, 6, 12);
      ctx.fillStyle = P.STONE_LIGHT;
      ctx.fillRect(cx - 1, cy - 10, 2, 10);
      ctx.fillStyle = P.SNOW_TOP;
      ctx.fillRect(cx - 2, cy - 11, 4, 1);
      ctx.fillStyle = cp.activated ? P.BOARD_GLOW : '#475569';
      ctx.fillRect(cx - 2, cy - 10, 4, 4);
      if (cp.activated) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, cy - 9, 2, 2);
      }
    }

    // 3. Portões Cristalinos Selados ('D' - destravados pela Chave Estelar 'T')
    for (const g of this.gates) {
      const gx = Math.round(g.x - camX);
      const gy = Math.round(g.y - camY);
      if (g.unlocked) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.fillRect(gx + 3, gy, 2, S);
        continue;
      }
      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(gx, gy, S, S);
      ctx.fillStyle = '#312e81';
      ctx.fillRect(gx + 1, gy + 1, S - 2, S - 2);
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(gx + 2, gy + 2, S - 4, S - 4);
      // Runas pulsantes douradas/ciano indicando trava
      ctx.fillStyle = Math.sin(time * 5 + g.ty) > 0 ? '#fde047' : '#38bdf8';
      ctx.fillRect(gx + 3, gy + 3, 2, 2);
    }

    // 4. Chaves Estelares ('T')
    for (const k of this.starKeys) {
      if (k.collected) continue;
      const kx = Math.round(k.x - camX);
      const ky = Math.round(k.y - camY + Math.sin(time * 4.2 + k.x) * 2);
      const pulse = Math.sin(time * 6) * 0.12;

      ctx.save();
      ctx.translate(kx, ky);
      ctx.scale(1 + pulse, 1 - pulse);

      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(-4, -4, 9, 9);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-3, -1, 7, 3);
      ctx.fillRect(-1, -3, 3, 7);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-2, -2, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -1, 3, 3);
      ctx.restore();
    }

    // 5. Anéis Boreais de Impulso ('R')
    for (const r of this.boostRings) {
      const rx = Math.round(r.x - camX);
      const ry = Math.round(r.y - camY + Math.sin(time * 3.4 + r.x) * 1.2);
      const jelly = r.pulseTimer > 0 ? Math.sin(r.pulseTimer * 28) * 0.25 : 0;
      const activeGlow = r.cooldown <= 0;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.scale(1 + jelly, 1 - jelly);

      // Contorno externo em anel pixelado 12x12
      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(-5, -6, 10, 2);
      ctx.fillRect(-5, 4, 10, 2);
      ctx.fillRect(-6, -5, 2, 10);
      ctx.fillRect(4, -5, 2, 10);

      // Aro ciano/turquesa brilhante
      ctx.fillStyle = activeGlow ? '#22d3ee' : '#334155';
      ctx.fillRect(-4, -5, 8, 2);
      ctx.fillRect(-4, 3, 8, 2);
      ctx.fillRect(-5, -4, 2, 8);
      ctx.fillRect(3, -4, 2, 8);

      // Núcleo pulsante dourado/branco
      if (activeGlow) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-1, -5, 2, 1);
        ctx.fillRect(-1, 4, 2, 1);
        ctx.fillStyle = 'rgba(45, 212, 191, 0.35)';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = '#ffffff';
        const sparkOff = Math.round(Math.sin(time * 8 + r.x) * 2);
        ctx.fillRect(sparkOff, 0, 1, 1);
      }
      ctx.restore();
    }

    // 6. Plataformas que caem (Pontes de gelo com contorno e pingentes)
    for (const f of this.fallingPlatforms) {
      if (f.state === 'respawning') continue;
      const shakeX =
        f.state === 'shaking' ? Math.round(Math.sin(time * 55) * 1.5) : 0;
      const fx = Math.round(f.x - camX) + shakeX;
      const fy = Math.round(f.y - camY);

      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(fx - 1, fy - 1, f.width + 2, f.height + 2);
      ctx.fillStyle = P.STONE_MID;
      ctx.fillRect(fx, fy, f.width, f.height);
      ctx.fillStyle = P.SNOW_TOP;
      ctx.fillRect(fx, fy, f.width, 1);
      ctx.fillStyle = P.ICE_BRIGHT;
      ctx.fillRect(fx, fy + 1, f.width, 2);
      // Pingentes de gelo embaixo
      for (let x = 2; x < f.width - 2; x += 4) {
        ctx.fillStyle = P.TILE_OUTLINE;
        ctx.fillRect(fx + x - 1, fy + f.height, 4, 3);
        ctx.fillStyle = P.ICE_BRIGHT;
        ctx.fillRect(fx + x, fy + f.height, 2, 2);
      }
    }

    // 6b. Plataformas que Desaparecem ('V' - cristal violeta que desmaterializa após uso)
    for (const v of this.vanishPlatforms) {
      const vx = Math.round(v.x - camX);
      const vy = Math.round(v.y - camY);

      if (v.state === 'gone') {
        // Silhueta pontilhada enquanto recarrega
        ctx.fillStyle = 'rgba(167, 139, 250, 0.35)';
        for (let px = 0; px < v.width; px += 3) {
          ctx.fillRect(vx + px, vy, 2, 1);
          ctx.fillRect(vx + px, vy + v.height - 1, 2, 1);
        }
        continue;
      }

      const blinkHide =
        v.state === 'warning' && Math.floor(v.timer * 24) % 2 === 0;
      const shakeX =
        v.state === 'warning' ? Math.round(Math.sin(time * 60) * 1) : 0;
      if (blinkHide) continue;

      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(vx + shakeX - 1, vy - 1, v.width + 2, v.height + 2);
      ctx.fillStyle = P.VANISH_DARK;
      ctx.fillRect(vx + shakeX, vy, v.width, v.height);
      ctx.fillStyle = P.VANISH_MID;
      ctx.fillRect(vx + shakeX, vy + 1, v.width, v.height - 2);
      ctx.fillStyle = P.VANISH_BRIGHT;
      ctx.fillRect(vx + shakeX, vy, v.width, 1);
      // Runas de fissura
      ctx.fillStyle = '#ffffff';
      for (let x = 2; x < v.width - 2; x += 6) {
        ctx.fillRect(vx + shakeX + x, vy + 2, 2, 1);
        ctx.fillRect(vx + shakeX + x + 1, vy + 3, 2, 1);
      }
    }

    // 6c. Blocos de Alternância por Modo ('H' = Hover / 'N' = Sem Hover)
    for (const mb of this.modeBlocks) {
      const mx = Math.round(mb.x - camX);
      const my = Math.round(mb.y - camY);
      const isSolid =
        !mb.passingThrough &&
        ((mb.requiredMode === 'hover' && isHovering) ||
          (mb.requiredMode === 'normal' && !isHovering));
      const bodyCol =
        mb.requiredMode === 'hover' ? P.MODE_HOVER_BODY : P.MODE_NORMAL_BODY;
      const lightCol =
        mb.requiredMode === 'hover' ? P.MODE_HOVER_LIGHT : P.MODE_NORMAL_LIGHT;

      if (!isSolid) {
        // Silhueta pontilhada indicando estado inativo
        ctx.fillStyle = bodyCol;
        ctx.fillRect(mx, my, 2, 1);
        ctx.fillRect(mx + S - 2, my, 2, 1);
        ctx.fillRect(mx, my + S - 1, 2, 1);
        ctx.fillRect(mx + S - 2, my + S - 1, 2, 1);
        ctx.fillRect(mx, my + 3, 1, 2);
        ctx.fillRect(mx + S - 1, my + 3, 1, 2);
        ctx.fillStyle = lightCol;
        ctx.fillRect(mx + 3, my + 3, 2, 2);
        continue;
      }

      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(mx, my, S, S);
      ctx.fillStyle = bodyCol;
      ctx.fillRect(mx + 1, my + 1, S - 2, S - 2);
      ctx.fillStyle = lightCol;
      ctx.fillRect(mx + 1, my + 1, S - 2, 2);
      ctx.fillRect(mx + 1, my + 1, 2, S - 2);
      // Ícone central minimalista (barra horizontal = hover; pino vertical = a pé)
      ctx.fillStyle = P.TILE_OUTLINE;
      if (mb.requiredMode === 'hover') {
        ctx.fillRect(mx + 2, my + 4, 4, 1);
      } else {
        ctx.fillRect(mx + 3, my + 2, 2, 4);
      }
    }

    // 7. Blocos de Gelo Quebráveis (Cristal rachado com outline)
    for (const b of this.breakables) {
      if (b.broken) continue;
      const bx = Math.round(b.x - camX);
      const by = Math.round(b.y - camY);
      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(bx, by, S, S);
      ctx.fillStyle = P.ICE_DARK;
      ctx.fillRect(bx + 1, by + 1, S - 2, S - 2);
      ctx.fillStyle = P.ICE_BRIGHT;
      ctx.fillRect(bx + 1, by + 1, S - 3, S - 3);
      // Rachaduras brancas brilhantes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 2, by + 2, 2, 1);
      ctx.fillRect(bx + 3, by + 3, 2, 1);
      ctx.fillRect(bx + 4, by + 4, 2, 2);
      ctx.fillRect(bx + 2, by + 5, 2, 1);
    }

    // 8. Molas de Neve (com efeito Jelly elástico GameMaker ao quicar)
    for (const s of this.springs) {
      const sx = Math.round(s.x - camX);
      const sy = Math.round(s.y - camY);
      const tNorm = s.animTimer > 0 ? s.animTimer / 0.28 : 0;
      const jellyWave = tNorm > 0 ? Math.sin((1 - tNorm) * Math.PI * 3.5) * tNorm : 0;
      const topOffset = Math.round(4 - jellyWave * 4.2);
      const stretchX = Math.round(jellyWave * 2);

      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(sx, sy + 5, 8, 3);
      ctx.fillStyle = P.STONE_LIGHT;
      ctx.fillRect(sx + 1, sy + 6, 6, 2);
      // Espiral metálica
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx + 2, sy + topOffset + 2, 4, Math.max(1, 5 - topOffset));
      // Topo colorido com outline + jelly squash lateral
      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(sx - 1 - stretchX, sy + topOffset - 1, 10 + stretchX * 2, 4);
      ctx.fillStyle = P.MAYA_SCARF;
      ctx.fillRect(sx - stretchX, sy + topOffset, 8 + stretchX * 2, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 1 - stretchX, sy + topOffset, 6 + stretchX * 2, 1);
    }

    // 9. Cristais Verdes de Impulso (Gema losango facetada estilo Celeste com brilho orbital)
    for (const c of this.crystals) {
      const cx = Math.round(c.x - camX);
      const cy = Math.round(c.y - camY + Math.sin(time * 3.8 + c.x * 0.1) * 1.4);

      if (!c.active) {
        // Silhueta pontilhada em losango enquanto recarrega
        ctx.fillStyle = 'rgba(110, 231, 183, 0.35)';
        ctx.fillRect(cx, cy - 3, 1, 1);
        ctx.fillRect(cx, cy + 3, 1, 1);
        ctx.fillRect(cx - 3, cy, 1, 1);
        ctx.fillRect(cx + 3, cy, 1, 1);
        ctx.fillRect(cx - 2, cy - 2, 1, 1);
        ctx.fillRect(cx + 2, cy - 2, 1, 1);
        ctx.fillRect(cx - 2, cy + 2, 1, 1);
        ctx.fillRect(cx + 2, cy + 2, 1, 1);
        continue;
      }

      const jellyPulse = Math.sin(time * 4.8 + c.x * 0.2) * 0.08;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + jellyPulse, 1 - jellyPulse);

      // Contorno externo em losango nítido (9x11)
      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(-1, -5, 3, 11);
      ctx.fillRect(-2, -4, 5, 9);
      ctx.fillRect(-3, -3, 7, 7);
      ctx.fillRect(-4, -2, 9, 5);
      ctx.fillRect(-5, -1, 11, 3);

      // Sombra esmeralda profunda na base/direita
      ctx.fillStyle = '#047857';
      ctx.fillRect(0, -4, 1, 9);
      ctx.fillRect(-1, -3, 3, 7);
      ctx.fillRect(-2, -2, 5, 5);
      ctx.fillRect(-3, -1, 7, 3);
      ctx.fillRect(-4, 0, 9, 1);

      // Corpo verde-esmeralda vibrante
      ctx.fillStyle = P.CRYSTAL_GREEN;
      ctx.fillRect(0, -4, 1, 8);
      ctx.fillRect(-1, -3, 2, 6);
      ctx.fillRect(-2, -2, 4, 4);
      ctx.fillRect(-3, -1, 6, 2);

      // Faceta superior-esquerda luminosa (menta)
      ctx.fillStyle = P.CRYSTAL_BRIGHT;
      ctx.fillRect(-2, -2, 2, 2);
      ctx.fillRect(-1, -3, 1, 3);
      ctx.fillRect(-3, -1, 2, 1);

      // Brilho especular branco nítido
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -2, 1, 2);
      ctx.fillRect(-2, -1, 1, 1);
      ctx.restore();

      // Duas estrelinhas orbitando em torno da gema
      const ang = time * 3.2 + c.x * 0.15;
      ctx.fillStyle = '#a7f3d0';
      ctx.fillRect(cx + Math.round(Math.cos(ang) * 6), cy + Math.round(Math.sin(ang) * 5), 1, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        cx + Math.round(Math.cos(ang + Math.PI) * 5),
        cy + Math.round(Math.sin(ang + Math.PI) * 4),
        1,
        1
      );
    }

    // 10. Colecionável Opcional: Floco de Neve Dourado (com efeito Jelly e cintilação)
    if (this.goldenFlake && !this.goldenFlake.collected) {
      const gx = Math.round(this.goldenFlake.x - camX);
      const gy = Math.round(this.goldenFlake.y - camY + Math.sin(time * 3.2) * 2);
      const flakePulse = Math.sin(time * 4.6) * 0.1;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.scale(1 + flakePulse, 1 - flakePulse);

      ctx.fillStyle = P.TILE_OUTLINE;
      ctx.fillRect(-4, -2, 9, 5);
      ctx.fillRect(-2, -4, 5, 9);
      ctx.fillRect(-3, -3, 7, 7);

      ctx.fillStyle = P.GOLDEN_FLAKE;
      ctx.fillRect(-3, -1, 7, 3);
      ctx.fillRect(-1, -3, 3, 7);
      ctx.fillRect(-2, -2, 5, 5);
      ctx.fillStyle = P.GOLDEN_GLOW;
      ctx.fillRect(-1, -1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1, 1);
      ctx.restore();
    }

    // 11. Portal / Marco Boreal de Chegada da Fase ('E')
    const ex = Math.round(this.goalX - camX);
    const ey = Math.round(this.goalY - camY);
    const obeliskJelly = Math.sin(time * 4.2) * 0.08;
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(ex - 6, ey - 5, 12, 5);
    ctx.save();
    ctx.translate(ex, ey - 4);
    ctx.scale(1 - obeliskJelly * 0.7, 1 + obeliskJelly);
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(-4, -14, 8, 14);
    // Obelisco de Cristal Boreal
    const pulse = Math.sin(time * 5) * 1.5;
    ctx.fillStyle = P.BOARD_ACCENT;
    ctx.fillRect(-3, -13, 6, 13);
    ctx.fillStyle = P.BOARD_GLOW;
    ctx.fillRect(-2, -12, 4, 11);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -10 + Math.round(pulse * 0.5), 2, 6);
    ctx.restore();
    // Pedestal com neve na frente
    ctx.fillStyle = P.STONE_LIGHT;
    ctx.fillRect(ex - 5, ey - 3, 10, 3);
    ctx.fillStyle = P.SNOW_TOP;
    ctx.fillRect(ex - 4, ey - 4, 8, 1);
  }
}

/**
 * 10 Fases Criativas com Rotas Múltiplas, Segredos e Ritmo Celeste:
 * Mundo 1: Encosta Nevada (Fases 1 a 3)
 * Mundo 2: Ruínas Congeladas (Fases 4 a 7)
 * Mundo 3: Pico Gelado (Fases 8 a 10)
 *
 * Legenda ASCII:
 *  'S' = Spawn da Maya       'E' = Marco Boreal (Meta)
 *  'K' = Checkpoint          'G' = Floco Dourado Secreto
 *  '#' = Pedra Nevada        '=' = Gelo Escorregadio
 *  '~' = Neve Macia (Freio)  'I' = Parede de Gelo (Wall-Run)
 *  '/' = Rampa Subindo       '\' = Rampa Descendo
 *  '-' = Plataforma Madeira  '^'/'v' = Espinhos
 *  'C' = Cristal Verde       'M' = Mola de Neve
 *  'B' = Gelo Quebrável      'F' = Ponte Instável
 *  'V' = Cristal Efêmero     'Z' = Gelo Negro (Atrito Zero)
 *  'H' = Bloco Só-Hover      'N' = Bloco Só-A-Pé
 *  'R' = Anel Boreal Turbo   'T' = Chave Estelar
 *  'D' = Portão Cristalino
 */
export const LEVELS: LevelDefinition[] = [
  // =========================================================================
  // MUNDO 1: ENCOSTA NEVADA — Aprender o Fluxo
  // =========================================================================
  {
    id: 1,
    world: 1,
    worldName: 'Encosta Nevada',
    title: '1. O Despertar da Brisa',
    subtitle: '',
    hint: '',
    ascii: [
      '........................................................',
      '........................................................',
      '........................................................',
      '........................................................',
      '........................................................',
      '.........................G..............................',
      '.......................-----............................',
      '........................................................',
      '..............................C.........................',
      '........................................................',
      '.....................................C..................',
      '........................................................',
      '..............----................R.....................',
      '........................................................',
      '........................................................',
      '........................../.................K.........E.',
      '........................./##...............=============',
      '...S..................../###...............#############',
      '..================...===####...............#############',
      '##################^^^#######...====........#############',
      '############################^^^####^^^^^^^^#############',
      '########################################################',
      '########################################################',
    ],
  },
  {
    id: 2,
    world: 1,
    worldName: 'Encosta Nevada',
    title: '2. Neve Macia e Impulso',
    subtitle: '',
    hint: '',
    ascii: [
      '............................................................',
      '............................................................',
      '............................................................',
      '................................................G...........',
      '..............................................-----.........',
      '............................................................',
      '.........................................R..................',
      '............................................................',
      '..S.................................C.......................',
      '.####\\..................................................E...',
      '......\\.............................................======..',
      '.......\\.........................K..................######..',
      '........==========~~~~.........======.......................',
      '........##########~~~~^^^###\\..######.......................',
      '.............................\\..............................',
      '..............................\\.............................',
      '...............................\\====~~~~~====\\..............',
      '...............................##############.\\.............',
      '...............................................\\.......M....',
      '................................................==========..',
      '................................................##########..',
      '............................................................',
      '............................................................',
      '............................................................',
    ],
  },
  {
    id: 3,
    world: 1,
    worldName: 'Encosta Nevada',
    title: '3. Escalada Cristalina',
    subtitle: '',
    hint: '',
    ascii: [
      '..........................................................',
      '..........................................................',
      '..........................................................',
      '...........................G..............................',
      '.........................-----............................',
      '..........................................................',
      '........................................I.................',
      '...............................I........I.............E...',
      '...............................I........I.........======..',
      '...............................I...C....I....R....######..',
      '...............I...............I........I.................',
      '...............I...............I........I.................',
      '...............I.....C....K====I........I.................',
      '.........====..I.........######.........I.................',
      '.........####..I.........######.........I.................',
      '...............I..........................................',
      '..........---..I..........................................',
      '...............I........................M.................',
      '..S............I.....................======...............',
      '.=================...................######...............',
      '.#################........................................',
      '.#################........................................',
      '..........................................................',
      '..........................................................',
      '..........................................................',
    ],
  },

  // =========================================================================
  // MUNDO 2: RUÍNAS CONGELADAS — Quebra-Cabeças de Movimento
  // =========================================================================
  {
    id: 4,
    world: 2,
    worldName: 'Ruínas Congeladas',
    title: '4. Portões da Cidade Antiga',
    subtitle: '',
    hint: '',
    ascii: [
      '................................................................',
      '................................................................',
      '................................................................',
      '.................#....................G.........................',
      '.................#..................-----.......................',
      '.................#..............................................',
      '.................#................C.............................',
      '.................D..............................................',
      '.................D..............................R...............',
      '.................D..........K................................E..',
      '..S..............D........======......R..................======.',
      '.===========.....=======..######.........................######.',
      '.###########.....#######..######..........----......---.........',
      '.###########............C.......................................',
      '....---.........................................................',
      '.........M......T...............................................',
      '.......================.........................................',
      '.......################.........................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
      '................................................................',
    ],
  },
  {
    id: 5,
    world: 2,
    worldName: 'Ruínas Congeladas',
    title: '5. Fúria Quebra-Gelo',
    subtitle: '',
    hint: '',
    ascii: [
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '..........................................B....G....................',
      '..S.......................................B..=====..................',
      '.####\\....................................B.........................',
      '......\\...............................R.............................',
      '.......\\.............R.......B......./#...........C.................',
      '........\\....................B....../##...............R..........E..',
      '.........=========B======B...B..K===###......................======.',
      '.........#################...B=========......................######.',
      '.............................##########..........M..................',
      '...............................................====.................',
      '...............................................####.................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
    ],
  },
  {
    id: 6,
    world: 2,
    worldName: 'Ruínas Congeladas',
    title: '6. Pontes Efêmeras',
    subtitle: '',
    hint: '',
    ascii: [
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '............................................R.......................',
      '....................................................................',
      '.....................................C......N.............VVVV...E..',
      '.................C..........................N.................======',
      '.........VVVV..........FFFF.....K..........VVVV.....R.........######',
      '..............................~~~~..................C...............',
      '..S...M.......................####..................................',
      '.ZZZZZZ.............................................................',
      '.######........................................C....................',
      '....................................................M...............',
      '........................................G..........===..............',
      '.....................................=======.......###..............',
      '.....................................#######........................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
      '....................................................................',
    ],
  },
  {
    id: 7,
    world: 2,
    worldName: 'Ruínas Congeladas',
    title: '7. Corredor dos Ventos',
    subtitle: '',
    hint: '',
    windZones: [
      { tx: 9, ty: 8, tw: 24, th: 10, vx: 182, vy: -18 },
      { tx: 40, ty: 3, tw: 11, th: 17, vx: 22, vy: -175 },
    ],
    ascii: [
      '......................................................................',
      '......................................................................',
      '......................................................................',
      '......................................................................',
      '....................................................G.................',
      '..................................................=====...............',
      '......................................................................',
      '.......................................^^^...............R.........E..',
      '.................................................................=====',
      '.......................................N.....................C...#####',
      '.........................R.............N....C.........................',
      '................C......................N..............................',
      '.......................................I..............................',
      '..................................K....I..........M...................',
      '..S..............................~~~~..I........====..................',
      '.ZZZZZZZZZ.......................####..I........####..................',
      '.#########.............................I..............................',
      '.#########.............................ZZZZ...........................',
      '.......................................####...........................',
      '......................................................................',
      '......................................................................',
      '......................................................................',
      '......................................................................',
      '......................................................................',
      '......................................................................',
    ],
  },

  // =========================================================================
  // MUNDO 3: PICO GELADO — Maestria e Liberdade
  // =========================================================================
  {
    id: 8,
    world: 3,
    worldName: 'Pico Gelado',
    title: '8. Abismo Boreal',
    subtitle: '',
    hint: '',
    ascii: [
      '........................................................................',
      '.........................................................#..............',
      '......................................................G..#..............',
      '....................................................-----#..............',
      '.........................................................#..............',
      '..............................................T..........D..............',
      '.........................................................D..............',
      '....................R....................................D...........E..',
      '..S.........................................N............D.......=======',
      '.####\\.......................C..............N............D.......#######',
      '......\\.....................................I......C.....###############',
      '.......\\............/.......................I............###############',
      '........\\........../#......C........K.......I......VVVV.................',
      '.........ZZZZZZZZZZ##.............=====.....I...........................',
      '.........############.............#####.....I.....M.....................',
      '.................................................====...................',
      '.................................................####...................',
      '........................................................................',
      '........................................................................',
      '........................................................................',
      '........................................................................',
      '........................................................................',
      '........................................................................',
      '........................................................................',
      '........................................................................',
    ],
  },
  {
    id: 9,
    world: 3,
    worldName: 'Pico Gelado',
    title: '9. Sinfonia da Avalancha',
    subtitle: '',
    hint: '',
    windZones: [{ tx: 35, ty: 3, tw: 23, th: 9, vx: 175, vy: -22 }],
    ascii: [
      '............................................................................',
      '............................................................................',
      '............................................................................',
      '............................................................................',
      '........................................................G...................',
      '......................................................=====.................',
      '...............................................B............................',
      '..S...................................R........B........C...................',
      '.####\\........................HHHH.............B..........................E.',
      '......\\..........B.................K......VVVV.B......................======',
      '.......ZZZZZZZZZZB.......I.......=====........................C.......######',
      '.......###########...C...I.......#####...................R............######',
      '.........................I..................................................',
      '.........................I..................................................',
      '.........................I..........N...........I...........................',
      '.........................I..........N.....C.....I...........................',
      '....................................N...........I.....M.....................',
      '....................................=====.......I...====....................',
      '....................................#####...........####....................',
      '............................................................................',
      '............................................................................',
      '............................................................................',
      '............................................................................',
      '............................................................................',
      '............................................................................',
    ],
  },
  {
    id: 10,
    world: 3,
    worldName: 'Pico Gelado',
    title: '10. O Cume Estrelado',
    subtitle: '',
    hint: '',
    windZones: [{ tx: 29, ty: 3, tw: 13, th: 16, vx: 26, vy: -165 }],
    ascii: [
      '..................................................................................',
      '..............................................#...................................',
      '..............................................#...................................',
      '..............................................#.............G.....................',
      '..............................................#...........-----...................',
      '..............................................#...................................',
      '......................................T.......#.........................R......E..',
      '..............................................#............................=======',
      '..............................................D.................N..........#######',
      '..............................................D.................N..........#######',
      '..S...........................................D.................N.................',
      '.####\\........................................D..........C......I.................',
      '......\\...............................C.......D.....K...........I.................',
      '.......\\.............R.......B...........K....======...VVVV.....I.................',
      '........ZZZZZZZZZZZZZZZZZZZZB......====HHHH===######............I.................',
      '........####################.......###########..................M.................',
      '..............................................................====................',
      '..............................................................####................',
      '..................................................................................',
      '..................................................................................',
      '..................................................................................',
      '..................................................................................',
      '..................................................................................',
      '..................................................................................',
      '..................................................................................',
      '..................................................................................',
    ],
  },
];
