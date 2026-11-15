import { CONFIG } from '../config';

interface PixelCell {
  x: number;
  y: number;
  ch: string;
}

interface CompiledArt {
  outlines: Array<[number, number]>;
  pixels: PixelCell[];
}

function compileArt(rows: string[]): CompiledArt {
  const filled = new Set<string>();
  const pixels: PixelCell[] = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.') {
        filled.add(`${x},${y}`);
        pixels.push({ x, y, ch });
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
      const key = `${p.x + dx},${p.y + dy}`;
      if (!filled.has(key)) {
        outlineSet.add(key);
      }
    }
  }

  const outlines = Array.from(outlineSet).map(
    (s) => s.split(',').map(Number) as [number, number]
  );
  return { outlines, pixels };
}

// Pose heroica da Maya inspirada diretamente na capinha SNOW SKY (26x30)
const TITLE_MAYA_ART = compileArt([
  '.....................S....',
  '....................SS....',
  '.........kHLHHk....jJ.....',
  '........kHLHHkHk..jJd.....',
  '.......kHLkHkSSSkjJd......',
  '......kHkShESSEsjJd.......',
  '......kHkSsESSEhjJ........',
  '......kHkSShSShsJd........',
  '.......kHkSSsWSs..........',
  '........kssSSSss..........',
  '......llPjjJJJJj..........',
  '.....lPPPjJJddJJd.........',
  '....lPPppJJJJjjJd.........',
  '....PpppddJJddJJd.........',
  '...jjppsJJJjjJJdd.........',
  '..Sjjd..dddJJddD..........',
  '..ss.....DDDDDD...........',
  '.........NNNNNNN..........',
  '........NNNNnNNNN.........',
  '.......NNNN...NNNN........',
  '.......NNN.....NNN........',
  '......NNN.......NNN.......',
  '......NNN.......WWW.......',
  '.....WWW........BBB.......',
  '.....BBB........bbb.......',
  '.....bbb..................',
]);

// Hoverboard flutuante inclinado da capa SNOW SKY (28x11)
const TITLE_BOARD_ART = compileArt([
  '..CCCCCC..................',
  '.CCtTTtCCC................',
  'CCtTTTTtCCCC..............',
  'CCCTttTGGGGCCC............',
  '.CCCCGGGGGGGGCCCC.........',
  '...CCCCGGGGGGGtTTtCC......',
  '.....CCCCGGGCtTTTTtCC.....',
  '......ddCCCCCCCtTTtCCC....',
  '........ddddCCCCCCCC......',
  '........bb..dd...bb.......',
]);

function drawCoverCurlCircle(
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
  if (size <= 3) {
    ctx.fillRect(x0 + 1, y0, Math.max(1, size - 2), size);
    ctx.fillRect(x0, y0 + 1, size, Math.max(1, size - 2));
    return;
  }
  ctx.fillRect(x0 + 1, y0, size - 2, size);
  ctx.fillRect(x0, y0 + 1, size, size - 2);
}

function getTitleColor(ch: string): string {
  const P = CONFIG.PALETTE;
  switch (ch) {
    case 'S':
      return P.MAYA_SKIN;
    case 's':
      return P.MAYA_SKIN_SHADOW;
    case 'h':
      return P.MAYA_SKIN_HIGHLIGHT;
    case 'E':
      return '#110814';
    case 'W':
      return '#ffffff';
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
      return P.HAIR_CURL_MID;
    case 'k':
      return P.HAIR_CURL_DARK;
    case 'L':
      return P.HAIR_CURL_LIGHT;
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

function drawCompiledArt(
  ctx: CanvasRenderingContext2D,
  art: CompiledArt,
  ox: number,
  oy: number
): void {
  ctx.fillStyle = CONFIG.PALETTE.MAYA_OUTLINE;
  for (let i = 0; i < art.outlines.length; i++) {
    const [x, y] = art.outlines[i];
    ctx.fillRect(ox + x, oy + y, 1, 1);
  }
  for (let i = 0; i < art.pixels.length; i++) {
    const p = art.pixels[i];
    ctx.fillStyle = getTitleColor(p.ch);
    ctx.fillRect(ox + p.x, oy + p.y, 1, 1);
  }
}

function drawCrossSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(cx - radius, cy, radius * 2 + 1, 1);
  ctx.fillRect(cx, cy - radius, 1, radius * 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx, cy, 1, 1);
}

type Pt = readonly [number, number];

function fillPixelPoly(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  color: string
): void {
  if (pts.length < 3) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i][1] < minY) minY = pts[i][1];
    if (pts[i][1] > maxY) maxY = pts[i][1];
  }
  minY = Math.max(0, Math.floor(minY));
  maxY = Math.min(CONFIG.CANVAS_HEIGHT - 1, Math.ceil(maxY));

  ctx.fillStyle = color;
  const xs: number[] = [];
  for (let y = minY; y <= maxY; y++) {
    xs.length = 0;
    const sy = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) {
        xs.push(xi + ((sy - yi) * (xj - xi)) / (yj - yi));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.round(xs[k]);
      const x1 = Math.round(xs[k + 1]);
      if (x1 > x0) {
        ctx.fillRect(x0, y, x1 - x0, 1);
      }
    }
  }
}

function drawRockFacet(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  baseColor: string,
  highlightEdge?: readonly Pt[],
  shadowEdge?: readonly Pt[]
): void {
  const P = CONFIG.PALETTE;
  fillPixelPoly(ctx, pts, baseColor);

  // Borda iluminada (topo/esquerda)
  if (highlightEdge && highlightEdge.length >= 2) {
    ctx.fillStyle = P.STONE_LIGHT;
    for (let i = 0; i < highlightEdge.length - 1; i++) {
      const [x0, y0] = highlightEdge[i];
      const [x1, y1] = highlightEdge[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let s = 0; s <= steps; s++) {
        const px = Math.round(x0 + ((x1 - x0) * s) / steps);
        const py = Math.round(y0 + ((y1 - y0) * s) / steps);
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  // Fenda / sombra profunda (direita/base)
  if (shadowEdge && shadowEdge.length >= 2) {
    ctx.fillStyle = P.TILE_OUTLINE;
    for (let i = 0; i < shadowEdge.length - 1; i++) {
      const [x0, y0] = shadowEdge[i];
      const [x1, y1] = shadowEdge[i + 1];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let s = 0; s <= steps; s++) {
        const px = Math.round(x0 + ((x1 - x0) * s) / steps);
        const py = Math.round(y0 + ((y1 - y0) * s) / steps);
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
}

function drawTaperedIcicle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  topW: number,
  len: number
): void {
  const P = CONFIG.PALETTE;
  for (let dy = 0; dy < len; dy++) {
    const t = dy / Math.max(1, len - 1);
    const w = Math.max(1, Math.round(topW * (1 - t * 0.85)));
    const ix = x + Math.floor((topW - w) * 0.4);
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(ix - 1, y + dy, w + 2, 1);
    if (dy === len - 1) {
      ctx.fillRect(ix, y + dy + 1, 1, 1);
    }
  }
  for (let dy = 0; dy < len; dy++) {
    const t = dy / Math.max(1, len - 1);
    const w = Math.max(1, Math.round(topW * (1 - t * 0.85)));
    const ix = x + Math.floor((topW - w) * 0.4);
    ctx.fillStyle = P.ICE_MID;
    ctx.fillRect(ix, y + dy, w, 1);
    if (w >= 2 && dy < len - 1) {
      ctx.fillStyle = P.ICE_BRIGHT;
      ctx.fillRect(ix, y + dy, w - 1, 1);
    }
    if (dy < Math.max(2, Math.floor(len * 0.55))) {
      ctx.fillStyle = P.SNOW_TOP;
      ctx.fillRect(ix, y + dy, 1, 1);
    }
  }
}

function drawIceCrystal(
  ctx: CanvasRenderingContext2D,
  pts: readonly Pt[],
  glintPt: Pt
): void {
  const P = CONFIG.PALETTE;
  const offsets: Pt[] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const [ox, oy] of offsets) {
    fillPixelPoly(
      ctx,
      pts.map(([x, y]) => [x + ox, y + oy] as const),
      P.TILE_OUTLINE
    );
  }
  // Base azul profundo na face direita
  fillPixelPoly(ctx, pts, P.ICE_DARK);
  // Faceta central azul celeste
  fillPixelPoly(
    ctx,
    pts.map(([x, y], idx) => (idx >= 2 && idx <= 3 ? ([x - 2, y] as const) : ([x, y] as const))),
    P.ICE_MID
  );
  // Borda iluminada esquerda em ciano vivo
  fillPixelPoly(
    ctx,
    [pts[0], pts[1], [pts[1][0] + 1, pts[1][1] + 5], [pts[0][0] + 2, pts[0][1] + 5]],
    P.ICE_BRIGHT
  );
  // Brilho especular branco no ápice
  ctx.fillStyle = P.SNOW_TOP;
  ctx.fillRect(glintPt[0], glintPt[1], 1, 2);
  ctx.fillRect(glintPt[0] + 1, glintPt[1], 1, 1);
}

function getSlopeY(x: number): number {
  if (x < 96) {
    return Math.round(166 - x * 0.07 + Math.sin(x * 0.08) * 1.4);
  }
  if (x < 154) {
    const t = (x - 96) / 58;
    return Math.round(159 - t * 11 + Math.sin(x * 0.14) * 1.1);
  }
  if (x < 216) {
    const t = (x - 154) / 62;
    return Math.round(148 - t * 13 + Math.cos(x * 0.19) * 0.9);
  }
  const t = Math.min(1, (x - 216) / 42);
  return Math.round(135 - t * 21 + Math.sin(x * 0.25) * 1.0);
}

/**
 * Renderiza a cena heroica da Tela de Título do SNOW SKY em pixel art 1:1 (320x180)
 * diretamente inspirada na capinha oficial (encosta nevada orgânica, penhasco esculpido
 * com cristais e pingentes de gelo, Maya com cachos ao vento alcançando o hoverboard).
 */
export function renderTitleShowcase(
  ctx: CanvasRenderingContext2D,
  time: number
): void {
  const P = CONFIG.PALETTE;

  // 1A. Encosta nevada contínua e orgânica subindo da esquerda até a base dos degraus de pedra
  for (let x = 0; x < 228; x++) {
    const sy = getSlopeY(x);
    const h = CONFIG.CANVAS_HEIGHT - sy;
    if (h <= 0) continue;

    // Outline escuro de 1px na crista da encosta
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(x, sy - 1, 1, h + 1);

    // Rocha base profunda sob a neve
    ctx.fillStyle = '#162033';
    ctx.fillRect(x, sy + 7, 1, Math.max(0, h - 7));

    // Camada de gelo e sombra azulada recortada na encosta
    const snowWave = Math.round(Math.sin(x * 0.17) * 1.5 + Math.cos(x * 0.07) * 1.2);
    const driftDepth = x > 148 ? 14 + snowWave : 9 + snowWave;

    ctx.fillStyle = P.ICE_MID;
    ctx.fillRect(x, sy + driftDepth - 2, 1, 3);
    ctx.fillStyle = P.SNOW_SHADOW;
    ctx.fillRect(x, sy + 4, 1, Math.max(2, driftDepth - 5));
    ctx.fillStyle = P.SNOW_MID;
    ctx.fillRect(x, sy + 2, 1, 4);
    ctx.fillStyle = P.SNOW_TOP;
    ctx.fillRect(x, sy, 1, 3);
  }

  // Degrau natural de neve e rocha na esquerda (borda recortada tipo SNOW SKY)
  drawRockFacet(
    ctx,
    [
      [154, 159],
      [198, 148],
      [216, 156],
      [212, 180],
      [148, 180],
    ],
    P.STONE_DARK,
    [
      [155, 160],
      [196, 149],
    ],
    [
      [198, 148],
      [216, 156],
      [212, 179],
    ]
  );
  // Neve e pequenos pingentes pendurados no degrau esquerdo
  for (let x = 152; x <= 198; x++) {
    const lipY = Math.round(156 - (x - 152) * 0.19 + Math.sin(x * 0.35) * 0.8);
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(x, lipY - 1, 1, 7);
    ctx.fillStyle = P.ICE_BRIGHT;
    ctx.fillRect(x, lipY + 3, 1, 2);
    ctx.fillStyle = P.SNOW_SHADOW;
    ctx.fillRect(x, lipY + 2, 1, 2);
    ctx.fillStyle = P.SNOW_TOP;
    ctx.fillRect(x, lipY, 1, 2);
  }
  drawTaperedIcicle(ctx, 160, 160, 2, 6);
  drawTaperedIcicle(ctx, 173, 157, 3, 8);
  drawTaperedIcicle(ctx, 186, 154, 2, 5);

  // Base rochosa contínua sob os cristais e pedras até o penhasco
  fillPixelPoly(
    ctx,
    [
      [212, 146],
      [258, 128],
      [260, 180],
      [204, 180],
    ],
    '#162033'
  );

  // Pedregulhos esculpidos e degraus sob/à frente da Maya (substitui as caixas retangulares)
  drawRockFacet(
    ctx,
    [
      [210, 149],
      [234, 141],
      [246, 151],
      [244, 180],
      [204, 180],
    ],
    P.STONE_MID,
    [
      [211, 149],
      [234, 141],
    ],
    [
      [234, 141],
      [246, 151],
      [244, 179],
    ]
  );
  drawRockFacet(
    ctx,
    [
      [226, 129],
      [252, 118],
      [264, 130],
      [256, 148],
      [224, 144],
    ],
    P.STONE_DARK,
    [
      [227, 129],
      [251, 119],
    ],
    [
      [252, 118],
      [264, 130],
      [256, 148],
    ]
  );

  // Cristais de gelo facetados e encaixados nas fendas das pedras (detalhe da capa!)
  drawIceCrystal(
    ctx,
    [
      [236, 158],
      [242, 146],
      [248, 151],
      [246, 168],
      [235, 168],
    ],
    [241, 149]
  );
  drawIceCrystal(
    ctx,
    [
      [248, 152],
      [254, 141],
      [260, 146],
      [258, 164],
      [247, 164],
    ],
    [253, 144]
  );
  drawIceCrystal(
    ctx,
    [
      [220, 163],
      [225, 153],
      [231, 157],
      [229, 170],
      [219, 170],
    ],
    [224, 156]
  );
  // Pedra frontal segurando a base dos cristais
  drawRockFacet(
    ctx,
    [
      [216, 169],
      [248, 163],
      [262, 166],
      [262, 180],
      [214, 180],
    ],
    P.STONE_DARK,
    [
      [217, 169],
      [248, 163],
    ]
  );

  // 1B. Penhasco rochoso alto e anguloso à direita (x = 250..319)
  fillPixelPoly(
    ctx,
    [
      [247, 102],
      [284, 84],
      [319, 68],
      [319, 180],
      [242, 180],
    ],
    P.TILE_OUTLINE
  );
  fillPixelPoly(
    ctx,
    [
      [249, 104],
      [285, 86],
      [319, 70],
      [319, 180],
      [246, 180],
    ],
    '#162033'
  );

  // Facetas poligonais de rocha cinzelada com luz diagonal e rachaduras verticais
  drawRockFacet(
    ctx,
    [
      [253, 108],
      [278, 96],
      [282, 118],
      [266, 126],
      [251, 122],
    ],
    P.STONE_DARK,
    [
      [253, 108],
      [277, 97],
    ],
    [
      [278, 96],
      [282, 118],
      [266, 126],
    ]
  );
  drawRockFacet(
    ctx,
    [
      [284, 92],
      [314, 78],
      [318, 110],
      [296, 122],
      [283, 112],
    ],
    P.STONE_MID,
    [
      [284, 92],
      [313, 79],
    ],
    [
      [314, 78],
      [318, 110],
      [296, 122],
    ]
  );
  drawRockFacet(
    ctx,
    [
      [262, 130],
      [291, 120],
      [294, 146],
      [272, 152],
      [259, 144],
    ],
    P.STONE_MID,
    [
      [262, 130],
      [290, 121],
    ],
    [
      [291, 120],
      [294, 146],
      [272, 152],
    ]
  );
  drawRockFacet(
    ctx,
    [
      [296, 122],
      [319, 112],
      [319, 150],
      [299, 154],
      [293, 138],
    ],
    P.STONE_DARK,
    [
      [296, 122],
      [318, 113],
    ],
    [
      [293, 138],
      [299, 154],
    ]
  );
  drawRockFacet(
    ctx,
    [
      [262, 154],
      [297, 148],
      [312, 166],
      [308, 180],
      [258, 180],
    ],
    P.STONE_MID,
    [
      [262, 154],
      [296, 149],
    ],
    [
      [297, 148],
      [312, 166],
    ]
  );

  // Cristais cintilantes e veios de gelo nas fendas do penhasco
  ctx.fillStyle = P.ICE_BRIGHT;
  ctx.fillRect(274, 136, 2, 1);
  ctx.fillRect(275, 135, 1, 3);
  ctx.fillStyle = P.SNOW_TOP;
  ctx.fillRect(275, 136, 1, 1);
  ctx.fillStyle = P.ICE_MID;
  ctx.fillRect(304, 134, 2, 2);
  ctx.fillRect(286, 158, 3, 2);

  // Cornija diagonal grossa de neve no topo do penhasco (subindo até x=319, y=64)
  for (let x = 247; x < 320; x++) {
    const t = (x - 247) / 72;
    const topY = Math.round(101 - t * 35 + Math.sin(x * 0.24) * 1.4);
    const thick = 8 + Math.round(Math.cos(x * 0.31) * 1.5);
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(x, topY - 1, 1, thick + 2);
    ctx.fillStyle = P.ICE_MID;
    ctx.fillRect(x, topY + thick - 2, 1, 2);
    ctx.fillStyle = P.SNOW_SHADOW;
    ctx.fillRect(x, topY + 4, 1, Math.max(2, thick - 6));
    ctx.fillStyle = P.SNOW_MID;
    ctx.fillRect(x, topY + 2, 1, 3);
    ctx.fillStyle = P.SNOW_TOP;
    ctx.fillRect(x, topY, 1, 3);
  }

  // Cortina orgânica de pingentes de gelo variados sob a cornija diagonal
  const cliffIcicles = [
    { x: 251, w: 2, len: 9 },
    { x: 256, w: 3, len: 14 },
    { x: 263, w: 2, len: 7 },
    { x: 268, w: 4, len: 18 },
    { x: 276, w: 2, len: 10 },
    { x: 282, w: 3, len: 15 },
    { x: 290, w: 4, len: 21 },
    { x: 298, w: 2, len: 11 },
    { x: 304, w: 3, len: 16 },
    { x: 311, w: 3, len: 13 },
  ];
  for (const ic of cliffIcicles) {
    const t = (ic.x - 247) / 72;
    const baseY = Math.round(109 - t * 35 + Math.sin(ic.x * 0.24) * 1.2);
    drawTaperedIcicle(ctx, ic.x, baseY, ic.w, ic.len);
  }

  // Cap fofo de neve sobre a pedra-degrau conectando perfeitamente da encosta (x=224) até o penhasco (x=254)
  for (let x = 224; x <= 254; x++) {
    const capY = Math.round(130 - ((x - 224) / 30) * 12 + Math.sin(x * 0.28) * 0.8);
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(x, capY - 1, 1, 7);
    ctx.fillStyle = P.ICE_MID;
    ctx.fillRect(x, capY + 4, 1, 2);
    ctx.fillStyle = P.SNOW_SHADOW;
    ctx.fillRect(x, capY + 2, 1, 2);
    ctx.fillStyle = P.SNOW_TOP;
    ctx.fillRect(x, capY, 1, 2);
  }

  // Pequenas marcas e pedrinhas sutis na neve da encosta
  ctx.fillStyle = P.SNOW_SHADOW;
  ctx.fillRect(132, getSlopeY(132) + 2, 3, 1);
  ctx.fillRect(177, getSlopeY(177) + 3, 2, 1);
  ctx.fillRect(219, getSlopeY(219) + 2, 3, 1);

  // 2. Cachos Volumosos Animados da Maya (sopro de vento atrás da cabeça)
  const mayaBaseX = 197;
  const mayaBaseY = 113 + Math.round(Math.sin(time * 2.1) * 0.6);

  const curlClusters = [
    { dx: 7, dy: 4, sz: 8 },
    { dx: 3, dy: 5, sz: 8 },
    { dx: -2, dy: 6, sz: 7 },
    { dx: -7, dy: 6, sz: 6 },
    { dx: -11, dy: 8, sz: 5 },
    { dx: -14, dy: 7, sz: 4 },
    { dx: 1, dy: 9, sz: 6 },
    { dx: -4, dy: 10, sz: 5 },
    { dx: -9, dy: 11, sz: 4 },
  ];

  // Outline escuro contínuo dos cachos
  for (const c of curlClusters) {
    const waveY = Math.round(Math.sin(time * 3.8 + c.dx * 0.25) * 1.1);
    const waveX = Math.round(Math.cos(time * 2.9 + c.dy * 0.3) * 0.6);
    drawCoverCurlCircle(
      ctx,
      mayaBaseX + c.dx + waveX,
      mayaBaseY + c.dy + waveY,
      c.sz + 2,
      P.MAYA_OUTLINE
    );
  }
  // Camadas de sombra profunda, corpo cacheado e brilho de cacho
  for (let i = 0; i < curlClusters.length; i++) {
    const c = curlClusters[i];
    const waveY = Math.round(Math.sin(time * 3.8 + c.dx * 0.25) * 1.1);
    const waveX = Math.round(Math.cos(time * 2.9 + c.dy * 0.3) * 0.6);
    const cx = mayaBaseX + c.dx + waveX;
    const cy = mayaBaseY + c.dy + waveY;

    drawCoverCurlCircle(ctx, cx, cy, c.sz, P.HAIR_CURL_DARK);
    drawCoverCurlCircle(ctx, cx, cy - 1, Math.max(2, c.sz - 2), P.HAIR_CURL_MID);
    if (i % 2 === 0 && c.sz >= 5) {
      ctx.fillStyle = P.HAIR_CURL_LIGHT;
      ctx.fillRect(cx - 1, cy - Math.floor(c.sz / 2) + 1, 2, 1);
    }
  }

  // 3. Sprite Heroico da Maya pisando na encosta e estendendo a mão para a prancha
  drawCompiledArt(ctx, TITLE_MAYA_ART, mayaBaseX, mayaBaseY);

  // Poeira de neve levantada nos passos da Maya
  const dustShift = Math.floor(time * 8) % 6;
  ctx.fillStyle = P.SNOW_TOP;
  ctx.fillRect(mayaBaseX + 2 - dustShift, mayaBaseY + 24, 2, 2);
  ctx.fillStyle = P.SNOW_MID;
  ctx.fillRect(mayaBaseX - 2 - dustShift, mayaBaseY + 22, 2, 1);
  ctx.fillStyle = P.SNOW_SHADOW;
  ctx.fillRect(mayaBaseX - 5 - Math.floor(dustShift * 0.7), mayaBaseY + 25, 1, 1);

  // 4. Hoverboard Brilhante Flutuando Acima da Mão da Maya + Raios/Brilhos
  const boardX = 224;
  const boardY = 82 + Math.round(Math.sin(time * 3.1) * 2.2);

  drawCompiledArt(ctx, TITLE_BOARD_ART, boardX, boardY);

  // Estrelas/Sparkles dourados e cianos cintilando ao redor do hoverboard
  const sp1 = Math.sin(time * 5.2) > 0 ? 2 : 1;
  const sp2 = Math.cos(time * 4.4) > 0 ? 2 : 1;
  drawCrossSparkle(ctx, boardX + 16, boardY - 5, sp1, P.GOLDEN_GLOW);
  drawCrossSparkle(ctx, boardX + 2, boardY + 11, sp2, P.BOARD_GLOW);
  drawCrossSparkle(ctx, boardX + 26, boardY + 10, 1, P.GOLDEN_FLAKE);
  ctx.fillStyle = P.ICE_HIGHLIGHT;
  ctx.fillRect(boardX + 9, boardY - 3, 1, 1);
  ctx.fillRect(boardX + 22, boardY + 1, 1, 1);
}
