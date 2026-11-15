import { CONFIG } from '../config';

export enum TileType {
  EMPTY = 0,
  STONE = 1,       // '#' Terra / pedra coberta de neve
  ICE = 2,         // '=' Gelo escorregadio azul brilhante (acelera hover)
  SOFT_SNOW = 3,   // '~' Neve macia (freia o hover)
  ICE_WALL = 4,    // 'I' Parede de gelo vertical (permite correr na parede no hover)
  SPIKE_UP = 5,    // '^' Espinhos para cima
  SPIKE_DOWN = 6,  // 'v' Espinhos para baixo
  SPIKE_LEFT = 7,  // '<' Espinhos para esquerda
  SPIKE_RIGHT = 8, // '>' Espinhos para direita
  WOOD_PLAT = 9,   // '-' Plataforma de madeira atravessável por baixo
  RAMP_UP_R = 10,  // '/' Rampa de gelo subindo para a direita
  RAMP_DOWN_R = 11,// '\' Rampa de gelo descendo para a direita
  BLACK_ICE = 12,  // 'Z' Gelo negro espelhado (atrito quase zero a pé e no hover)
}

export class Tilemap {
  public width: number;
  public height: number;
  public tiles: TileType[][];
  public worldIndex: 1 | 2 | 3;
  public levelSeed: number;

  constructor(asciiRows: string[], worldIndex: 1 | 2 | 3 = 1, levelSeed = 1) {
    this.height = asciiRows.length;
    this.width = Math.max(...asciiRows.map((r) => r.length));
    this.worldIndex = worldIndex;
    this.levelSeed = levelSeed;
    this.tiles = [];

    for (let ty = 0; ty < this.height; ty++) {
      const row: TileType[] = [];
      const line = asciiRows[ty] || '';
      for (let tx = 0; tx < this.width; tx++) {
        const ch = line[tx] || '.';
        row.push(Tilemap.charToTile(ch));
      }
      this.tiles.push(row);
    }
  }

  public static charToTile(ch: string): TileType {
    switch (ch) {
      case '#':
        return TileType.STONE;
      case '=':
        return TileType.ICE;
      case '~':
        return TileType.SOFT_SNOW;
      case 'I':
        return TileType.ICE_WALL;
      case '^':
        return TileType.SPIKE_UP;
      case 'v':
        return TileType.SPIKE_DOWN;
      case '<':
        return TileType.SPIKE_LEFT;
      case '>':
        return TileType.SPIKE_RIGHT;
      case '-':
        return TileType.WOOD_PLAT;
      case '/':
        return TileType.RAMP_UP_R;
      case '\\':
        return TileType.RAMP_DOWN_R;
      case 'Z':
        return TileType.BLACK_ICE;
      default:
        return TileType.EMPTY;
    }
  }

  public getTile(tx: number, ty: number): TileType {
    if (tx < 0 || tx >= this.width) return TileType.STONE;
    if (ty < 0) return TileType.EMPTY;
    if (ty >= this.height) return TileType.EMPTY;
    return this.tiles[ty][tx];
  }

  public isSolidBlock(t: TileType): boolean {
    return (
      t === TileType.STONE ||
      t === TileType.ICE ||
      t === TileType.SOFT_SNOW ||
      t === TileType.ICE_WALL ||
      t === TileType.BLACK_ICE
    );
  }

  public isRamp(t: TileType): boolean {
    return t === TileType.RAMP_UP_R || t === TileType.RAMP_DOWN_R;
  }

  public isHazard(t: TileType): boolean {
    return (
      t === TileType.SPIKE_UP ||
      t === TileType.SPIKE_DOWN ||
      t === TileType.SPIKE_LEFT ||
      t === TileType.SPIKE_RIGHT
    );
  }

  public getRampFloorY(tx: number, ty: number, worldX: number): number | null {
    const t = this.getTile(tx, ty);
    const localX = Math.max(0, Math.min(CONFIG.TILE_SIZE, worldX - tx * CONFIG.TILE_SIZE));
    const baseTopY = ty * CONFIG.TILE_SIZE;
    const baseBotY = (ty + 1) * CONFIG.TILE_SIZE;

    if (t === TileType.RAMP_UP_R) {
      return baseBotY - localX;
    }
    if (t === TileType.RAMP_DOWN_R) {
      return baseTopY + localX;
    }
    return null;
  }

  private drawPixelCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    worldIndex: number
  ): void {
    const cx = Math.round(x);
    const cy = Math.round(y);
    const dark =
      worldIndex === 2 ? '#23445c' : worldIndex === 3 ? '#3b2869' : '#324261';
    const mid =
      worldIndex === 2 ? '#4d7794' : worldIndex === 3 ? '#6c4fa6' : '#6c82a6';
    const light =
      worldIndex === 2 ? '#8ab4cf' : worldIndex === 3 ? '#a68ce0' : '#a7bdd9';

    ctx.fillStyle = dark;
    ctx.fillRect(cx + 2, cy + 8, w - 4, 6);
    ctx.fillRect(cx, cy + 10, w, 4);

    ctx.fillStyle = mid;
    ctx.fillRect(cx + 4, cy + 4, w - 8, 8);
    ctx.fillRect(cx + Math.floor(w * 0.2), cy, Math.floor(w * 0.45), 10);
    ctx.fillRect(cx + Math.floor(w * 0.55), cy + 2, Math.floor(w * 0.3), 8);

    ctx.fillStyle = light;
    ctx.fillRect(cx + Math.floor(w * 0.22), cy, Math.floor(w * 0.38), 2);
    ctx.fillRect(cx + Math.floor(w * 0.57), cy + 2, Math.floor(w * 0.24), 2);
    ctx.fillRect(cx + 5, cy + 4, 8, 2);
  }

  private drawCrescentMoon(
    ctx: CanvasRenderingContext2D,
    mx: number,
    my: number,
    worldIndex: number
  ): void {
    const moonColor =
      worldIndex === 2 ? '#ccfbf1' : worldIndex === 3 ? '#fae8ff' : '#f0f9ff';

    // Lua crescente pixel-art limpa (8x8, sem caixa quadrada ao redor)
    const rows = [
      '..XXXX..',
      '.XXXX...',
      'XXXX....',
      'XXXX....',
      'XXXX....',
      'XXXX....',
      '.XXXX...',
      '..XXXX..',
    ];
    ctx.fillStyle = moonColor;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] === 'X') {
          ctx.fillRect(mx + c, my + r, 1, 1);
        }
      }
    }
  }

  private renderMountainChain(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    parallaxX: number,
    parallaxY: number,
    tileCycle: number,
    phaseOffset: number,
    segments: ReadonlyArray<{
      x0: number;
      xPeak: number;
      x1: number;
      y0: number;
      yPeak: number;
      y1: number;
      snowH: number;
      seed: number;
    }>,
    palette: {
      rim?: string;
      lit: string;
      light: string;
      dark: string;
      deep: string;
      snowLit: string;
      snowShade: string;
    }
  ): void {
    const yOff = Math.round(camY * parallaxY);
    const shiftX = camX * parallaxX + phaseOffset;

    for (let px = 0; px < CONFIG.CANVAS_WIDTH; px++) {
      const wx = (((px + shiftX) % tileCycle) + tileCycle) % tileCycle;

      // Encontra o segmento único [x0, x1) para este pixel (sem triângulos cruzados)
      let seg = segments[0];
      for (let i = 0; i < segments.length; i++) {
        if (wx >= segments[i].x0 && wx < segments[i].x1) {
          seg = segments[i];
          break;
        }
      }

      const onLeftSlope = wx <= seg.xPeak;
      const span = onLeftSlope
        ? Math.max(1, seg.xPeak - seg.x0)
        : Math.max(1, seg.x1 - seg.xPeak);
      const t = onLeftSlope
        ? (wx - seg.x0) / span
        : (wx - seg.xPeak) / span;

      const baseY = onLeftSlope
        ? seg.y0 + (seg.yPeak - seg.y0) * Math.pow(t, 1.02)
        : seg.yPeak + (seg.y1 - seg.yPeak) * Math.pow(t, 0.98);

      // Pequeno recorte natural da rocha que zera exatamente nos vales e no cume
      const rockBump =
        Math.sin(t * Math.PI * 2.5 + seg.seed) * 1.6 * Math.sin(t * Math.PI);
      const topY = Math.round(baseY + rockBump - yOff);
      const h = CONFIG.CANVAS_HEIGHT - topY;
      if (h <= 0) continue;

      if (palette.rim) {
        ctx.fillStyle = palette.rim;
        ctx.fillRect(px, topY - 1, 1, 1);
      }

      // Face esquerda iluminada sólida / Face direita sombreada sólida (ZERO código de barras)
      ctx.fillStyle = onLeftSlope ? palette.lit : palette.dark;
      ctx.fillRect(px, topY, 1, h);

      // Realce limpo na borda superior da face iluminada (sem listras verticais)
      if (onLeftSlope && t > 0.25) {
        ctx.fillStyle = palette.light;
        ctx.fillRect(px, topY, 1, Math.min(h, 3));
      }

      // Crista central sinuosa dividindo luz e sombra ao longo da montanha
      const dxFromPeak = wx - seg.xPeak;
      if (Math.abs(dxFromPeak) <= 6) {
        for (let dy = 0; dy < h; dy += 2) {
          const spineOffset =
            Math.round(Math.sin(dy * 0.14 + seg.seed) * 2.6 + dy * 0.06);
          if (dxFromPeak <= spineOffset) {
            ctx.fillStyle = dxFromPeak >= spineOffset - 3 ? palette.light : palette.lit;
          } else {
            ctx.fillStyle = dxFromPeak <= spineOffset + 3 ? palette.deep : palette.dark;
          }
          ctx.fillRect(px, topY + dy, 1, Math.min(2, h - dy));
        }
      }

      // Calota de neve limpa acompanhando a inclinação até a linha de neve
      if (seg.snowH > 0) {
        const distNorm = Math.abs(wx - seg.xPeak) / span;
        const snowCoverage = Math.max(0, 1 - distNorm * 2.25);
        const snowDepth = Math.round(
          snowCoverage * (seg.snowH + Math.sin(wx * 0.35 + seg.seed) * 2.0)
        );
        if (snowDepth > 0) {
          ctx.fillStyle = onLeftSlope ? palette.snowLit : palette.snowShade;
          ctx.fillRect(px, topY, 1, Math.min(h, snowDepth));
        }
      }
    }
  }

  public renderBackground(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    worldIndex: number,
    time: number
  ): void {
    const P = CONFIG.PALETTE;
    const seed = this.levelSeed;
    const seedPhase = (seed - 1) * 97;

    // 1. Céu em degradê suave por mundo (sem linhas quadriculadas cortando as nuvens)
    const skyBands =
      worldIndex === 1
        ? ['#131c36', '#1a2748', '#22335c', '#2b4070', '#344e85', '#3e5c99']
        : worldIndex === 2
        ? ['#0b1826', '#102438', '#16314a', '#1d405c', '#25506e', '#2e6080']
        : ['#110b24', '#1a1136', '#24184a', '#2f2060', '#3b2875', '#47318c'];

    const bandH = Math.ceil(CONFIG.CANVAS_HEIGHT / skyBands.length);
    for (let i = 0; i < skyBands.length; i++) {
      ctx.fillStyle = skyBands[i];
      ctx.fillRect(0, i * bandH, CONFIG.CANVAS_WIDTH, bandH);
    }

    // 2. Estrelas cintilantes + Lua crescente sutil (varia posição por fase)
    for (let i = 0; i < 40; i++) {
      const sx = (((i * 79 + seed * 31 - camX * 0.025) % 320) + 320) % 320;
      const sy = (((i * 43 + seed * 17 - camY * 0.015) % 98) + 98) % 98 + 2;
      const blink = Math.sin(time * 2.2 + i * 1.9 + seed);
      if (blink > -0.25) {
        ctx.fillStyle =
          blink > 0.65
            ? '#ffffff'
            : worldIndex === 3
            ? '#f5d0fe'
            : worldIndex === 2
            ? '#99f6e4'
            : '#bae6fd';
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
      }
    }

    // Lua crescente limpa (aparece no menu/fases pares e mundo 3 para diferenciar céus)
    if (seed === 1 || seed % 2 === 0 || worldIndex === 3) {
      const moonBaseX = seed === 1 ? 212 : 48 + ((seed * 67) % 210);
      const moonX = Math.round(moonBaseX - camX * 0.015);
      const moonY = Math.round(16 + ((seed * 7) % 14) - camY * 0.01);
      this.drawCrescentMoon(ctx, moonX, moonY, worldIndex);
    }

    // 3. Aurora Boreal colorida de acordo com o mundo e a fase
    ctx.save();
    const auroraA =
      worldIndex === 2 ? '#34d399' : worldIndex === 3 ? '#e879f9' : P.AURORA_CYAN;
    const auroraB =
      worldIndex === 2 ? '#2dd4bf' : worldIndex === 3 ? '#38bdf8' : P.AURORA_VIOLET;
    for (let band = 0; band < 2; band++) {
      ctx.fillStyle = band === 0 ? auroraA : auroraB;
      ctx.globalAlpha = worldIndex === 3 ? (band === 0 ? 0.18 : 0.14) : band === 0 ? 0.14 : 0.1;
      for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += 2) {
        const wave =
          Math.sin((x + seedPhase) * 0.024 + time * 0.55 + band * 1.9) * 8 +
          Math.cos(x * 0.048 - time * 0.35) * 4;
        const y = 18 + band * 11 + wave - camY * 0.03;
        ctx.fillRect(x, Math.round(y), 2, 13);
      }
    }
    ctx.restore();

    // 4. Nuvens Pixel-Art Volumosas (ciclo largo fora da tela, sem recortes laterais)
    const cloudShift = camX * 0.05 + time * 3.2;
    const cloudCycle = 440;
    const cloudPositions = [
      { x: (24 + seed * 37) % 380, y: 46 + (seed % 3) * 4, w: 56 },
      { x: (132 + seed * 53) % 380, y: 34 + (seed % 2) * 6, w: 66 },
      { x: (238 + seed * 29) % 380, y: 54 + (seed % 3) * 3, w: 52 },
      { x: (336 + seed * 41) % 380, y: 32 + (seed % 2) * 5, w: 60 },
    ];
    for (const c of cloudPositions) {
      let cx = (((c.x - cloudShift) % cloudCycle) + cloudCycle) % cloudCycle;
      if (cx > 336) cx -= cloudCycle;
      this.drawPixelCloud(ctx, cx, c.y - camY * 0.025, c.w, worldIndex);
    }

    // 5. Plano Distante Contínuo de Picos Alpinos (0.07x, segmentos ligados vale-a-vale)
    const farRise = worldIndex === 3 ? -8 : 0;
    this.renderMountainChain(
      ctx,
      camX,
      camY,
      0.07,
      0.04,
      384,
      seedPhase * 1.2,
      [
        { x0: 0, xPeak: 42, x1: 96, y0: 136 + farRise, yPeak: 112 + farRise, y1: 138 + farRise, snowH: 8, seed: 1 },
        { x0: 96, xPeak: 152, x1: 204, y0: 138 + farRise, yPeak: 106 + farRise, y1: 136 + farRise, snowH: 11, seed: 2 },
        { x0: 204, xPeak: 256, x1: 304, y0: 136 + farRise, yPeak: 114 + farRise, y1: 139 + farRise, snowH: 8, seed: 3 },
        { x0: 304, xPeak: 344, x1: 384, y0: 139 + farRise, yPeak: 108 + farRise, y1: 136 + farRise, snowH: 10, seed: 4 },
      ],
      {
        lit: worldIndex === 2 ? '#294c66' : worldIndex === 3 ? '#432f75' : '#3d4c7a',
        light: worldIndex === 2 ? '#346080' : worldIndex === 3 ? '#563e91' : '#4d5f94',
        dark: worldIndex === 2 ? '#1e394f' : worldIndex === 3 ? '#302057' : '#2d3961',
        deep: worldIndex === 2 ? '#162b3d' : worldIndex === 3 ? '#241742' : '#222c4d',
        snowLit: '#dbeafe',
        snowShade: '#93c5fd',
      }
    );

    // 6. Plano Intermediário Contínuo de Montanhas Principais (0.14x, faces sólidas limpas + crista sinuosa)
    const midRise = worldIndex === 3 ? -8 : 0;
    this.renderMountainChain(
      ctx,
      camX,
      camY,
      0.14,
      0.08,
      384,
      seedPhase,
      [
        { x0: 0, xPeak: 48, x1: 104, y0: 150 + midRise, yPeak: 116 + midRise, y1: 148 + midRise, snowH: 12, seed: 11 },
        { x0: 104, xPeak: 162, x1: 214, y0: 148 + midRise, yPeak: 112 + midRise, y1: 150 + midRise, snowH: 14, seed: 12 },
        { x0: 214, xPeak: 266, x1: 316, y0: 150 + midRise, yPeak: 120 + midRise, y1: 146 + midRise, snowH: 10, seed: 13 },
        { x0: 316, xPeak: 354, x1: 384, y0: 146 + midRise, yPeak: 114 + midRise, y1: 150 + midRise, snowH: 13, seed: 14 },
      ],
      {
        rim: worldIndex === 2 ? '#152636' : worldIndex === 3 ? '#1e1338' : '#1d1c3b',
        lit: worldIndex === 2 ? '#436987' : worldIndex === 3 ? '#7152ab' : P.BG_MOUNTAIN_MID,
        light: worldIndex === 2 ? '#608bad' : worldIndex === 3 ? '#9a78d9' : P.BG_MOUNTAIN_LIGHT,
        dark: worldIndex === 2 ? '#2b475e' : worldIndex === 3 ? '#463075' : P.BG_MOUNTAIN_FAR,
        deep: worldIndex === 2 ? '#20374a' : worldIndex === 3 ? '#342259' : '#372d59',
        snowLit: '#ffffff',
        snowShade: P.SNOW_SHADOW,
      }
    );

    // 7. Plano Próximo Temático por Mundo (0.24x parallax contínuo, diferenciando cada mundo!)
    const nearYOff = Math.round(camY * 0.15);

    if (worldIndex === 1) {
      // MUNDO 1: Colinas suaves com floresta de pinheiros nevados (sem recorte neon)
      const nearShift = camX * 0.24;
      for (let px = 0; px < CONFIG.CANVAS_WIDTH; px++) {
        const wx = px + nearShift + seedPhase * 0.7;
        const hillY = Math.round(
          150 + Math.sin(wx * 0.022) * 8 + Math.cos(wx * 0.055) * 4 - nearYOff
        );
        if (hillY < CONFIG.CANVAS_HEIGHT) {
          ctx.fillStyle = '#183a54';
          ctx.fillRect(px, hillY, 1, 3);
          ctx.fillStyle = '#11293d';
          ctx.fillRect(px, hillY + 3, 1, CONFIG.CANVAS_HEIGHT - (hillY + 3));
        }
        // Silhueta contínua de pinheiros alpinos distribuídos pelas colinas
        const treeSlot = Math.floor(wx / 18);
        const localX = ((wx % 18) + 18) % 18;
        const treeCenter = 9 + ((treeSlot * 5 + seed) % 4) - 2;
        const dist = Math.abs(localX - treeCenter);
        const treeH = 9 + ((Math.abs(treeSlot) * 7 + seed) % 6);
        if (dist <= 4 && (Math.abs(treeSlot) + seed) % 3 !== 0) {
          const coneY = hillY - Math.max(0, Math.round(treeH * (1 - dist / 4.5)));
          if (coneY < hillY) {
            ctx.fillStyle = '#0e2236';
            ctx.fillRect(px, coneY, 1, hillY - coneY + 2);
            if (dist <= 1) {
              ctx.fillStyle = '#93c5fd';
              ctx.fillRect(px, coneY, 1, 1);
            }
          }
        }
      }
    } else if (worldIndex === 2) {
      // MUNDO 2: Ruínas Congeladas — torres quebradas, arcos e janelas âmbar/ciano iluminadas
      const ruinShift = Math.floor(camX * 0.26);
      const baseSlot = Math.floor(ruinShift / 52);
      for (let i = -1; i < 8; i++) {
        const slot = baseSlot + i;
        const rx = slot * 52 - ruinShift;
        const hash = Math.abs(slot * 17 + seed * 11);
        const rw = 22 + (hash % 12);
        const rh = 28 + ((hash * 3) % 28);
        const ry = CONFIG.CANVAS_HEIGHT - rh - nearYOff;

        // Torre principal de alvenaria antiga
        ctx.fillStyle = '#16293b';
        ctx.fillRect(rx, ry, rw, rh + nearYOff);
        ctx.fillStyle = '#244159';
        ctx.fillRect(rx + 2, ry + 3, rw - 4, rh + nearYOff);

        // Ameias quebradas e neve acumulada no topo
        ctx.fillStyle = '#0d1a26';
        ctx.fillRect(rx, ry, rw, 1);
        ctx.fillStyle = '#cfe8f7';
        ctx.fillRect(rx + 1, ry - 2, Math.floor(rw * 0.4), 2);
        ctx.fillRect(rx + Math.floor(rw * 0.58), ry - 1, Math.floor(rw * 0.35), 1);

        // Arco/passagem ou janelas luminosas das ruínas
        if (hash % 3 === 0) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(rx + Math.floor(rw / 2) - 2, ry + 8, 2, 4);
          ctx.fillRect(rx + Math.floor(rw / 2) + 2, ry + 8, 2, 4);
        } else {
          ctx.fillStyle = '#2dd4bf';
          ctx.fillRect(rx + 6, ry + 9, 2, 5);
          if (rw > 24) ctx.fillRect(rx + rw - 8, ry + 9, 2, 5);
        }
      }
    } else {
      // MUNDO 3: Pico Gelado — espirais cristalinas luminosas e névoa violeta no vale
      const spireShift = camX * 0.25;
      for (let px = 0; px < CONFIG.CANVAS_WIDTH; px++) {
        const wx = px + spireShift + seedPhase;
        const u = Math.abs(Math.sin(wx * 0.045) * 14 + Math.cos(wx * 0.11) * 9);
        const spireY = Math.round(166 - u - nearYOff);
        const slope = Math.cos(wx * 0.045);
        if (spireY < CONFIG.CANVAS_HEIGHT) {
          ctx.fillStyle = slope > 0 ? '#2f2159' : '#1d143b';
          ctx.fillRect(px, spireY, 1, CONFIG.CANVAS_HEIGHT - spireY);
          if (u > 14) {
            ctx.fillStyle = slope > 0 ? '#38bdf8' : '#a855f7';
            ctx.fillRect(px, spireY, 1, Math.min(4, Math.round((u - 13) * 0.5)));
          }
        }
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    time: number
  ): void {
    const P = CONFIG.PALETTE;
    const S = CONFIG.TILE_SIZE;

    const startTx = Math.max(0, Math.floor(camX / S) - 1);
    const endTx = Math.min(this.width - 1, Math.ceil((camX + CONFIG.CANVAS_WIDTH) / S) + 1);
    const startTy = Math.max(0, Math.floor(camY / S) - 1);
    const endTy = Math.min(this.height - 1, Math.ceil((camY + CONFIG.CANVAS_HEIGHT) / S) + 1);

    for (let ty = startTy; ty <= endTy; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const t = this.tiles[ty][tx];
        if (t === TileType.EMPTY) continue;

        const px = Math.round(tx * S - camX);
        const py = Math.round(ty * S - camY);
        const above = this.getTile(tx, ty - 1);
        const below = this.getTile(tx, ty + 1);
        const left = this.getTile(tx - 1, ty);
        const right = this.getTile(tx + 1, ty);

        switch (t) {
          case TileType.STONE: {
            const topExposed = !this.isSolidBlock(above) && !this.isRamp(above);
            const botExposed = !this.isSolidBlock(below);
            const leftExposed = !this.isSolidBlock(left);
            const rightExposed = !this.isSolidBlock(right);

            // Base rochosa estilizada por mundo (Slate Alpino / Alvenaria das Ruínas / Cristal do Pico)
            const stoneBase =
              this.worldIndex === 2
                ? '#182b3b'
                : this.worldIndex === 3
                ? '#1d1638'
                : P.STONE_DARK;
            const stoneAccent =
              this.worldIndex === 2
                ? '#2a4459'
                : this.worldIndex === 3
                ? '#31255e'
                : P.STONE_MID;

            ctx.fillStyle = stoneBase;
            ctx.fillRect(px, py, S, S);

            const hash = (tx * 7 + ty * 13) % 4;
            ctx.fillStyle = stoneAccent;
            if (this.worldIndex === 2) {
              // Tijolos antigos esculpidos nas Ruínas Congeladas
              const offset = ty % 2 === 0 ? 0 : 4;
              ctx.fillRect(px + (offset % 6), py + 1, 5, 2);
              ctx.fillRect(px + ((offset + 2) % 4), py + 5, 5, 2);
              if (hash === 0 && (tx + ty) % 5 === 0) {
                ctx.fillStyle = '#2dd4bf';
                ctx.fillRect(px + 2, py + 2, 1, 1);
              }
            } else if (this.worldIndex === 3) {
              // Veios de rocha ametista com brilhos cristalinos no Pico Gelado
              ctx.fillRect(px + 1, py + (hash % 3) + 1, 5, 2);
              ctx.fillRect(px + 3, py + 5, 3, 2);
              if ((tx * 5 + ty * 3) % 9 === 0) {
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(px + 2, py + 3, 2, 1);
              }
            } else {
              if (hash === 0) {
                ctx.fillRect(px + 1, py + 2, 4, 3);
                ctx.fillRect(px + 5, py + 5, 2, 2);
              } else if (hash === 1) {
                ctx.fillRect(px + 3, py + 1, 4, 3);
                ctx.fillRect(px + 1, py + 5, 3, 2);
              } else if (hash === 2) {
                ctx.fillRect(px + 1, py + 3, 3, 4);
                ctx.fillRect(px + 4, py + 2, 2, 2);
              } else {
                ctx.fillRect(px + 2, py + 2, 4, 4);
              }
            }

            // Outlines escuros nas bordas expostas
            ctx.fillStyle = P.TILE_OUTLINE;
            if (leftExposed) ctx.fillRect(px, py, 1, S);
            if (rightExposed) ctx.fillRect(px + S - 1, py, 1, S);
            if (botExposed) ctx.fillRect(px, py + S - 1, S, 1);

            // Camada espessa de neve no topo (limpa, sem matinhos espetados)
            if (topExposed) {
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(px, py - 1, S, 1);
              ctx.fillStyle = P.SNOW_TOP;
              ctx.fillRect(px, py, S, 2);
              ctx.fillStyle = P.SNOW_MID;
              ctx.fillRect(px, py + 2, S, 1);
              ctx.fillStyle = this.worldIndex === 3 ? '#a5b4fc' : P.SNOW_SHADOW;
              ctx.fillRect(px + (tx % 2), py + 3, S - 2, 1);
            }

            // Pingentes de gelo (icicles) pendurados sob beiradas expostas!
            if (botExposed && (tx * 5 + ty) % 3 !== 0) {
              const icicleLen = 2 + ((tx * 3 + ty) % 4);
              const ix = px + 2 + (tx % 3);
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(ix - 1, py + S, 4, icicleLen);
              ctx.fillStyle = P.ICE_BRIGHT;
              ctx.fillRect(ix, py + S, 2, icicleLen - 1);
              ctx.fillStyle = P.SNOW_TOP;
              ctx.fillRect(ix, py + S, 1, Math.max(1, icicleLen - 2));
            }
            break;
          }

          case TileType.ICE: {
            const topExposed = !this.isSolidBlock(above) && !this.isRamp(above);
            ctx.fillStyle = P.ICE_DARK;
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = P.ICE_MID;
            ctx.fillRect(px, py + 1, S, S - 2);

            // Borda escura lateral se exposta
            ctx.fillStyle = P.TILE_OUTLINE;
            if (!this.isSolidBlock(left)) ctx.fillRect(px, py, 1, S);
            if (!this.isSolidBlock(right)) ctx.fillRect(px + S - 1, py, 1, S);
            if (!this.isSolidBlock(below)) ctx.fillRect(px, py + S - 1, S, 1);

            if (topExposed) {
              ctx.fillStyle = P.SNOW_TOP;
              ctx.fillRect(px, py, S, 2);
              ctx.fillStyle = P.ICE_HIGHLIGHT;
              ctx.fillRect(px, py + 2, S, 2);
            }
            // Reflexo cristalino diagonal
            ctx.fillStyle = P.ICE_HIGHLIGHT;
            ctx.fillRect(px + 1, py + 4, 2, 1);
            ctx.fillRect(px + 3, py + 5, 2, 1);
            const shimmer = Math.floor(time * 5 + tx * 2 + ty) % 7 === 0;
            if (shimmer) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(px + 5, py + 3, 2, 1);
            }
            break;
          }

          case TileType.SOFT_SNOW: {
            ctx.fillStyle = P.TILE_OUTLINE;
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = P.SOFT_SNOW_SHADE;
            ctx.fillRect(px, py + 2, S, S - 2);
            ctx.fillStyle = P.SOFT_SNOW_MAIN;
            ctx.fillRect(px + 1, py + 1, S - 2, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px + 2, py, S - 4, 2);
            break;
          }

          case TileType.BLACK_ICE: {
            const topExposed = !this.isSolidBlock(above) && !this.isRamp(above);
            ctx.fillStyle = P.BLACK_ICE_DARK;
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = P.BLACK_ICE_MID;
            ctx.fillRect(px, py + 1, S, S - 2);

            ctx.fillStyle = P.TILE_OUTLINE;
            if (!this.isSolidBlock(left)) ctx.fillRect(px, py, 1, S);
            if (!this.isSolidBlock(right)) ctx.fillRect(px + S - 1, py, 1, S);
            if (!this.isSolidBlock(below)) ctx.fillRect(px, py + S - 1, S, 1);

            if (topExposed) {
              ctx.fillStyle = P.BLACK_ICE_GLOW;
              ctx.fillRect(px, py, S, 1);
              ctx.fillStyle = '#0ea5e9';
              ctx.fillRect(px, py + 1, S, 1);
            }
            // Reflexos espelhados diagonais deslizantes
            const glintShift = Math.floor(time * 8 + tx * 3) % S;
            ctx.fillStyle = P.BLACK_ICE_GLOW;
            ctx.fillRect(px + glintShift, py + 3, 2, 1);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px + ((tx * 3 + ty) % 5), py + 5, 3, 1);
            break;
          }

          case TileType.ICE_WALL: {
            ctx.fillStyle = P.TILE_OUTLINE;
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = P.ICE_DARK;
            ctx.fillRect(px + 1, py, S - 2, S);
            ctx.fillStyle = P.ICE_MID;
            ctx.fillRect(px + 2, py, S - 4, S);
            // Cristais laterais de gelo liso
            ctx.fillStyle = P.ICE_HIGHLIGHT;
            ctx.fillRect(px + 2, py + ((ty * 3) % 5), 1, 3);
            ctx.fillRect(px + 5, py + ((ty * 5 + 2) % 5), 1, 2);
            break;
          }

          case TileType.WOOD_PLAT: {
            ctx.fillStyle = P.TILE_OUTLINE;
            ctx.fillRect(px, py, S, 4);
            ctx.fillStyle = P.WOOD_DARK;
            ctx.fillRect(px, py + 1, S, 2);
            ctx.fillStyle = P.WOOD_LIGHT;
            ctx.fillRect(px + 1, py + 1, S - 2, 1);
            // Neve fina em cima da tábua
            ctx.fillStyle = P.SNOW_TOP;
            ctx.fillRect(px + 1, py, S - 2, 1);
            break;
          }

          case TileType.RAMP_UP_R: {
            for (let col = 0; col < S; col++) {
              const colH = col + 1;
              const topY = py + S - colH;
              ctx.fillStyle = P.ICE_MID;
              ctx.fillRect(px + col, topY, 1, colH);
              ctx.fillStyle = P.ICE_DARK;
              if (colH > 3) ctx.fillRect(px + col, topY + 3, 1, colH - 3);
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(px + col, topY - 1, 1, 1);
              ctx.fillStyle = P.SNOW_TOP;
              ctx.fillRect(px + col, topY, 1, 2);
            }
            break;
          }

          case TileType.RAMP_DOWN_R: {
            for (let col = 0; col < S; col++) {
              const colH = S - col;
              const topY = py + S - colH;
              ctx.fillStyle = P.ICE_MID;
              ctx.fillRect(px + col, topY, 1, colH);
              ctx.fillStyle = P.ICE_DARK;
              if (colH > 3) ctx.fillRect(px + col, topY + 3, 1, colH - 3);
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(px + col, topY - 1, 1, 1);
              ctx.fillStyle = P.SNOW_TOP;
              ctx.fillRect(px + col, topY, 1, 2);
            }
            break;
          }

          case TileType.SPIKE_UP: {
            for (let s = 0; s < 2; s++) {
              const bx = px + s * 4;
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(bx, py + 2, 4, 6);
              ctx.fillRect(bx + 1, py, 2, 2);
              ctx.fillStyle = P.SPIKE_METAL;
              ctx.fillRect(bx + 1, py + 5, 2, 3);
              ctx.fillStyle = P.SPIKE_TIP;
              ctx.fillRect(bx + 1, py + 2, 2, 3);
              ctx.fillStyle = '#fda4af';
              ctx.fillRect(bx + 1, py + 1, 1, 2);
            }
            break;
          }

          case TileType.SPIKE_DOWN: {
            for (let s = 0; s < 2; s++) {
              const bx = px + s * 4;
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(bx, py, 4, 6);
              ctx.fillStyle = P.SPIKE_METAL;
              ctx.fillRect(bx + 1, py, 2, 3);
              ctx.fillStyle = P.SPIKE_TIP;
              ctx.fillRect(bx + 1, py + 3, 2, 4);
            }
            break;
          }

          case TileType.SPIKE_LEFT: {
            for (let s = 0; s < 2; s++) {
              const by = py + s * 4;
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(px + 2, by, 6, 4);
              ctx.fillStyle = P.SPIKE_METAL;
              ctx.fillRect(px + 5, by + 1, 3, 2);
              ctx.fillStyle = P.SPIKE_TIP;
              ctx.fillRect(px + 1, by + 1, 4, 2);
            }
            break;
          }

          case TileType.SPIKE_RIGHT: {
            for (let s = 0; s < 2; s++) {
              const by = py + s * 4;
              ctx.fillStyle = P.TILE_OUTLINE;
              ctx.fillRect(px, by, 6, 4);
              ctx.fillStyle = P.SPIKE_METAL;
              ctx.fillRect(px, by + 1, 3, 2);
              ctx.fillStyle = P.SPIKE_TIP;
              ctx.fillRect(px + 3, by + 1, 4, 2);
            }
            break;
          }
        }
      }
    }
  }
}
