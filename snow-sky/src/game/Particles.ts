import { CONFIG } from '../config';

export type ParticleKind =
  | 'snow_spray'
  | 'hover_spark'
  | 'speed_line'
  | 'dust'
  | 'ice_shard'
  | 'crystal_spark'
  | 'death_pixel'
  | 'respawn_glow'
  | 'golden_spark';

interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  length: number;
}

interface AmbientSnowflake {
  x: number;
  y: number;
  layer: 0 | 1 | 2; // 0 = fundo, 1 = meio, 2 = frente
  size: number;
  speedY: number;
  speedX: number;
  phase: number;
}

interface GhostFrame {
  active: boolean;
  x: number;
  y: number;
  facing: 1 | -1;
  hovering: boolean;
  tilt: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 600;
const MAX_SNOW = 135;
const MAX_GHOSTS = 18;
const MAX_RINGS = 10;

export class ParticleSystem {
  private pool: Particle[] = [];
  private cursor = 0;
  private snow: AmbientSnowflake[] = [];
  private ghosts: GhostFrame[] = [];
  private ghostCursor = 0;
  private rings: ShockwaveRing[] = [];
  private ringCursor = 0;
  private time = 0;
  public ambientWindX = -14;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        kind: 'dust',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        color: '#ffffff',
        life: 0,
        maxLife: 1,
        gravity: 0,
        drag: 0,
        length: 0,
      });
    }

    // 3 camadas de parallax de neve caindo
    for (let i = 0; i < MAX_SNOW; i++) {
      const layer = (i % 3) as 0 | 1 | 2;
      this.snow.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        layer,
        size: layer === 2 ? 2 : 1,
        speedY: layer === 0 ? 12 + Math.random() * 6 : layer === 1 ? 22 + Math.random() * 10 : 36 + Math.random() * 14,
        speedX: (Math.random() - 0.5) * 10,
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (let i = 0; i < MAX_GHOSTS; i++) {
      this.ghosts.push({
        active: false,
        x: 0,
        y: 0,
        facing: 1,
        hovering: true,
        tilt: 0,
        life: 0,
        maxLife: 0.25,
        color: CONFIG.PALETTE.BOARD_GLOW,
      });
    }

    for (let i = 0; i < MAX_RINGS; i++) {
      this.rings.push({
        active: false,
        x: 0,
        y: 0,
        radius: 2,
        maxRadius: 24,
        color: CONFIG.PALETTE.ICE_BRIGHT,
        life: 0,
        maxLife: 0.3,
      });
    }
  }

  public spawn(
    kind: ParticleKind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    life = 0.4,
    size = 1,
    gravity = 120,
    drag = 1.5,
    length = 0
  ): void {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.color = color;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.gravity = gravity;
    p.drag = drag;
    p.length = length;
  }

  public spawnGhost(
    x: number,
    y: number,
    facing: 1 | -1,
    hovering: boolean,
    tilt: number,
    color = CONFIG.PALETTE.BOARD_GLOW
  ): void {
    const g = this.ghosts[this.ghostCursor];
    this.ghostCursor = (this.ghostCursor + 1) % MAX_GHOSTS;
    g.active = true;
    g.x = x;
    g.y = y;
    g.facing = facing;
    g.hovering = hovering;
    g.tilt = tilt;
    g.life = 0.22;
    g.maxLife = 0.22;
    g.color = color;
  }

  public spawnShockwave(x: number, y: number, maxRadius = 22, color = CONFIG.PALETTE.ICE_BRIGHT): void {
    const r = this.rings[this.ringCursor];
    this.ringCursor = (this.ringCursor + 1) % MAX_RINGS;
    r.active = true;
    r.x = x;
    r.y = y;
    r.radius = 2;
    r.maxRadius = maxRadius;
    r.color = color;
    r.life = 0.28;
    r.maxLife = 0.28;
  }

  // Rastro do hoverboard deslizando
  public emitHoverTrail(x: number, y: number, vx: number, onIce: boolean): void {
    const dir = vx >= 0 ? -1 : 1;
    const speed = Math.abs(vx);
    // Neve e cristais de gelo saindo da prancha
    this.spawn(
      'snow_spray',
      x + (Math.random() - 0.5) * 4,
      y,
      dir * (20 + Math.random() * 35) + vx * 0.15,
      -12 - Math.random() * 28,
      onIce ? CONFIG.PALETTE.ICE_HIGHLIGHT : CONFIG.PALETTE.SNOW_TOP,
      0.25 + Math.random() * 0.18,
      Math.random() > 0.6 ? 2 : 1,
      140
    );

    // Faíscas ciano do propulsor
    if (Math.random() < 0.75) {
      this.spawn(
        'hover_spark',
        x + dir * 3,
        y - 1,
        dir * (35 + Math.random() * 45),
        (Math.random() - 0.5) * 24,
        Math.random() > 0.4 ? CONFIG.PALETTE.BOARD_GLOW : CONFIG.PALETTE.AURORA_CYAN,
        0.18 + Math.random() * 0.14,
        1,
        0,
        3
      );
    }

    // Linhas de velocidade em alta velocidade
    if (speed > 105 && Math.random() < 0.55) {
      this.spawn(
        'speed_line',
        x - dir * 10 + (Math.random() - 0.5) * 16,
        y - 6 + (Math.random() - 0.5) * 14,
        dir * (speed * 0.65),
        0,
        CONFIG.PALETTE.ICE_HIGHLIGHT,
        0.14,
        1,
        0,
        0,
        6 + Math.floor(speed / 28)
      );
    }
  }

  // Explosão do Pulo Carregado de Hover
  public emitChargedJumpBurst(x: number, y: number, vx: number): void {
    this.spawnShockwave(x, y - 2, 24, CONFIG.PALETTE.BOARD_GLOW);
    for (let i = 0; i < 18; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.9;
      const spd = 30 + Math.random() * 75;
      this.spawn(
        'hover_spark',
        x + (Math.random() - 0.5) * 6,
        y,
        Math.cos(angle) * spd - vx * 0.25,
        Math.sin(angle) * spd * 0.6 - 15,
        i % 2 === 0 ? CONFIG.PALETTE.BOARD_GLOW : CONFIG.PALETTE.ICE_HIGHLIGHT,
        0.28 + Math.random() * 0.2,
        i % 3 === 0 ? 2 : 1,
        60
      );
    }
  }

  // Poeirinha de neve na aterrissagem ou pulo normal
  public emitDustBurst(x: number, y: number, count = 8, color = CONFIG.PALETTE.SNOW_TOP): void {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.spawn(
        'dust',
        x + side * (1 + Math.random() * 3),
        y,
        side * (14 + Math.random() * 32),
        -8 - Math.random() * 22,
        color,
        0.22 + Math.random() * 0.16,
        Math.random() > 0.5 ? 2 : 1,
        75,
        3
      );
    }
  }

  // Gelo lascando na parede
  public emitWallChips(x: number, y: number, wallDir: -1 | 1, isIce: boolean): void {
    const color = isIce ? CONFIG.PALETTE.ICE_BRIGHT : CONFIG.PALETTE.SNOW_SHADOW;
    for (let i = 0; i < 3; i++) {
      this.spawn(
        'ice_shard',
        x,
        y + (Math.random() - 0.5) * 8,
        -wallDir * (15 + Math.random() * 30),
        -20 + Math.random() * 30,
        color,
        0.25 + Math.random() * 0.15,
        1,
        180
      );
    }
  }

  // Explosão de bloco de gelo quebrável
  public emitIceBlockShatter(x: number, y: number): void {
    this.spawnShockwave(x + 4, y + 4, 20, CONFIG.PALETTE.ICE_HIGHLIGHT);
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 85;
      this.spawn(
        'ice_shard',
        x + Math.random() * 8,
        y + Math.random() * 8,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd - 25,
        i % 2 === 0 ? CONFIG.PALETTE.ICE_BRIGHT : CONFIG.PALETTE.ICE_HIGHLIGHT,
        0.35 + Math.random() * 0.25,
        i % 3 === 0 ? 2 : 1,
        210
      );
    }
  }

  // Explosão de morte da Maya
  public emitDeathExplosion(x: number, y: number): void {
    this.spawnShockwave(x, y, 32, CONFIG.PALETTE.HAIR_CHARGED);
    const colors = [
      CONFIG.PALETTE.HAIR_CHARGED,
      CONFIG.PALETTE.MAYA_JACKET_LIGHT,
      CONFIG.PALETTE.BOARD_GLOW,
      '#ffffff',
    ];
    for (let i = 0; i < 38; i++) {
      const angle = (i / 38) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const spd = 35 + Math.random() * 110;
      this.spawn(
        'death_pixel',
        x,
        y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        colors[i % colors.length],
        0.42 + Math.random() * 0.25,
        i % 3 === 0 ? 3 : 2,
        40,
        2.2
      );
    }
  }

  // Brilho subindo no Respawn
  public emitRespawnShimmer(x: number, y: number): void {
    this.spawnShockwave(x, y, 22, '#ffffff');
    for (let i = 0; i < 24; i++) {
      this.spawn(
        'respawn_glow',
        x + (Math.random() - 0.5) * 14,
        y + 6 - Math.random() * 14,
        (Math.random() - 0.5) * 18,
        -35 - Math.random() * 55,
        i % 2 === 0 ? CONFIG.PALETTE.BOARD_GLOW : '#ffffff',
        0.35 + Math.random() * 0.25,
        i % 3 === 0 ? 2 : 1,
        -30,
        1.0
      );
    }
  }

  public update(dt: number, windX = 0): void {
    this.time += dt;
    // Vento ambiente variável suave
    this.ambientWindX = Math.sin(this.time * 0.45) * 14 - 8 + windX * 0.35;

    // Atualiza neve em 3 camadas
    for (let i = 0; i < MAX_SNOW; i++) {
      const s = this.snow[i];
      const layerMult = s.layer === 0 ? 0.4 : s.layer === 1 ? 0.75 : 1.15;
      s.x += (s.speedX + this.ambientWindX * layerMult + Math.sin(this.time * 1.8 + s.phase) * 6) * dt;
      s.y += s.speedY * dt;

      if (s.y > CONFIG.CANVAS_HEIGHT + 4) {
        s.y = -4;
        s.x = Math.random() * CONFIG.CANVAS_WIDTH;
      }
      if (s.x < -4) s.x += CONFIG.CANVAS_WIDTH + 8;
      if (s.x > CONFIG.CANVAS_WIDTH + 4) s.x -= CONFIG.CANVAS_WIDTH + 8;
    }

    // Atualiza partículas do pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      if (p.drag > 0) {
        const factor = Math.max(0, 1 - p.drag * dt);
        p.vx *= factor;
        p.vy *= factor;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Atualiza rastro fantasma
    for (let i = 0; i < MAX_GHOSTS; i++) {
      const g = this.ghosts[i];
      if (!g.active) continue;
      g.life -= dt;
      if (g.life <= 0) g.active = false;
    }

    // Atualiza ondas de impacto
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        continue;
      }
      const progress = 1 - r.life / r.maxLife;
      r.radius = 2 + (r.maxRadius - 2) * (1 - Math.pow(1 - progress, 2));
    }
  }

  public renderSnowLayer(
    ctx: CanvasRenderingContext2D,
    layer: 0 | 1 | 2,
    camX: number,
    camY: number
  ): void {
    const parallax = layer === 0 ? 0.2 : layer === 1 ? 0.5 : 0.9;
    ctx.fillStyle =
      layer === 0
        ? 'rgba(148, 163, 184, 0.45)'
        : layer === 1
        ? 'rgba(226, 232, 240, 0.7)'
        : 'rgba(255, 255, 255, 0.92)';

    for (let i = 0; i < MAX_SNOW; i++) {
      const s = this.snow[i];
      if (s.layer !== layer) continue;
      let sx = (s.x - camX * parallax) % CONFIG.CANVAS_WIDTH;
      let sy = (s.y - camY * parallax) % CONFIG.CANVAS_HEIGHT;
      if (sx < 0) sx += CONFIG.CANVAS_WIDTH;
      if (sy < 0) sy += CONFIG.CANVAS_HEIGHT;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), s.size, s.size);
    }
  }

  public renderGhosts(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (let i = 0; i < MAX_GHOSTS; i++) {
      const g = this.ghosts[i];
      if (!g.active) continue;
      const alpha = (g.life / g.maxLife) * 0.42;
      const sx = Math.round(g.x - camX);
      const sy = Math.round(g.y - camY);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g.color;
      // Silhueta da Maya (cabeça + jaqueta puffer + prancha SNOW SKY)
      ctx.fillRect(sx - 3, sy - 16, 6, 6);
      ctx.fillRect(sx - 4, sy - 10, 8, 8);
      ctx.fillRect(sx - 7, sy - 2, 14, 2);
      ctx.restore();
    }
  }

  public renderWorldParticles(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    // Ondas de impacto
    for (let i = 0; i < MAX_RINGS; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      const alpha = Math.max(0, r.life / r.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(Math.round(r.x - camX), Math.round(r.y - camY), r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Partículas de mundo
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const ratio = p.life / p.maxLife;
      const sx = Math.round(p.x - camX);
      const sy = Math.round(p.y - camY);
      ctx.fillStyle = p.color;

      if (p.kind === 'speed_line') {
        ctx.save();
        ctx.globalAlpha = ratio * 0.75;
        ctx.fillRect(sx, sy, p.length, 1);
        ctx.restore();
      } else {
        const sz = ratio < 0.35 && p.size > 1 ? p.size - 1 : p.size;
        ctx.fillRect(sx, sy, sz, sz);
      }
    }
  }
}
