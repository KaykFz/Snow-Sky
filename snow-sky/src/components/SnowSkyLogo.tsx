import React from 'react';

const GLYPHS: Record<string, string[]> = {
  S: [
    '01111',
    '11000',
    '11000',
    '01110',
    '00011',
    '00011',
    '11110',
  ],
  N: [
    '11001',
    '11101',
    '11111',
    '11011',
    '11001',
    '11001',
    '11001',
  ],
  O: [
    '01110',
    '11011',
    '11011',
    '11011',
    '11011',
    '11011',
    '01110',
  ],
  W: [
    '110011',
    '110011',
    '110011',
    '111111',
    '111111',
    '110011',
    '100001',
  ],
  K: [
    '11011',
    '11011',
    '11110',
    '11100',
    '11110',
    '11011',
    '11011',
  ],
  Y: [
    '11011',
    '11011',
    '11011',
    '01110',
    '00110',
    '00110',
    '00110',
  ],
};

const ROW_COLORS = [
  '#e0f2fe',
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8',
  '#0ea5e9',
  '#0284c7',
  '#1d4ed8',
];

export const SnowSkyLogo: React.FC = () => {
  const word = 'SNOW SKY';
  const offsetY = 4; // Espaço para a neve no topo das letras
  const pixels: Array<{ x: number; y: number; color: string }> = [];
  const snowPixels: Array<{ x: number; y: number; color: string }> = [];

  let cursorX = 2;
  const letterTopSpans: Array<{ startX: number; width: number }> = [];

  for (const ch of word) {
    if (ch === ' ') {
      cursorX += 3;
      continue;
    }
    const grid = GLYPHS[ch];
    if (!grid) continue;
    const gw = grid[0].length;
    letterTopSpans.push({ startX: cursorX, width: gw });

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < gw; c++) {
        if (grid[r][c] === '1') {
          pixels.push({
            x: cursorX + c,
            y: offsetY + r,
            color: ROW_COLORS[r] || '#38bdf8',
          });
        }
      }
    }

    // Neve fofa pixelada sobre o topo de cada letra
    for (let c = 0; c < gw; c++) {
      const hasTop = grid[0][c] === '1' || grid[1][c] === '1';
      if (hasTop) {
        snowPixels.push({ x: cursorX + c, y: offsetY - 1, color: '#ffffff' });
        if (c > 0 && c < gw - 1) {
          snowPixels.push({ x: cursorX + c, y: offsetY - 2, color: '#ffffff' });
        }
        if ((c + cursorX) % 3 === 0) {
          snowPixels.push({ x: cursorX + c, y: offsetY, color: '#bae6fd' });
        }
      }
    }

    cursorX += gw + 1;
  }

  // Pingentes de gelo pixelados pendurados sob letras selecionadas
  const icicleSpecs = [
    { x: 3, len: 3 },
    { x: 10, len: 2 },
    { x: 16, len: 4 },
    { x: 24, len: 2 },
    { x: 30, len: 3 },
    { x: 37, len: 3 },
    { x: 44, len: 4 },
  ];

  const iciclePixels: Array<{ x: number; y: number; color: string }> = [];
  for (const ic of icicleSpecs) {
    for (let d = 0; d < ic.len; d++) {
      iciclePixels.push({
        x: ic.x,
        y: offsetY + 7 + d,
        color: d === 0 ? '#bae6fd' : d === ic.len - 1 ? '#ffffff' : '#38bdf8',
      });
    }
  }

  // Conjunto de todos os pixels que precisam de contorno #0b101d
  const allForeground = [...pixels, ...snowPixels, ...iciclePixels];
  const outlineSet = new Set<string>();
  for (const p of allForeground) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        outlineSet.add(`${p.x + dx},${p.y + dy}`);
      }
    }
    // Sombra projetada inferior de 2px estilo GameMaker
    outlineSet.add(`${p.x},${p.y + 2}`);
  }

  const totalWidth = cursorX + 2;
  const totalHeight = offsetY + 13;

  return (
    <div className="mb-3 select-none jelly-logo">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-72 sm:w-80 md:w-[410px] h-auto block"
        shapeRendering="crispEdges"
        role="img"
        aria-label="SNOW SKY"
      >
        {/* Contorno e sombra pixelada #0b101d */}
        <g fill="#0b101d">
          {Array.from(outlineSet).map((coord) => {
            const [x, y] = coord.split(',').map(Number);
            return <rect key={`o-${coord}`} x={x} y={y} width={1} height={1} />;
          })}
        </g>

        {/* Letras em gradiente de gelo */}
        <g>
          {pixels.map((p, idx) => (
            <rect
              key={`p-${idx}`}
              x={p.x}
              y={p.y}
              width={1}
              height={1}
              fill={p.color}
            />
          ))}
        </g>

        {/* Pingentes de gelo sob as letras */}
        <g>
          {iciclePixels.map((p, idx) => (
            <rect
              key={`i-${idx}`}
              x={p.x}
              y={p.y}
              width={1}
              height={1}
              fill={p.color}
            />
          ))}
        </g>

        {/* Camada de neve no topo */}
        <g>
          {snowPixels.map((p, idx) => (
            <rect
              key={`s-${idx}`}
              x={p.x}
              y={p.y}
              width={1}
              height={1}
              fill={p.color}
            />
          ))}
        </g>
      </svg>
      <div className="text-[10px] md:text-xs tracking-[0.26em] text-[#5eead4] font-bold mt-1 drop-shadow-[0_2px_0_#0b101d]">
        PRECISION HOVERBOARD PLATFORMER
      </div>
    </div>
  );
};
