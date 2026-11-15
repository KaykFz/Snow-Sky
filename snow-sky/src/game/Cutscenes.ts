import { CONFIG } from '../config';

export type CutsceneId =
  | 'prologue'
  | 'world2_ruins'
  | 'world2_winds'
  | 'world3_peak'
  | 'epilogue';

export type CutsceneSpeaker = 'maya' | 'luma' | 'echo';
export type CutsceneMood = 'smile' | 'determined' | 'surprised' | 'thoughtful' | 'happy' | 'wise';

export interface DialogueLine {
  speaker: CutsceneSpeaker;
  speakerName: string;
  mood: CutsceneMood;
  text: string;
}

export interface CutsceneDef {
  id: CutsceneId;
  chapterLabel: string;
  title: string;
  backdrop: 'camp' | 'ruins_gate' | 'wind_bridge' | 'crystal_shrine' | 'summit_aurora';
  triggerBeforeLevelId?: number;
  triggerAfterLevelId?: number;
  lines: DialogueLine[];
}

export const CUTSCENES: Record<CutsceneId, CutsceneDef> = {
  prologue: {
    id: 'prologue',
    chapterLabel: 'PRÓLOGO · SOPÉ DA MONTANHA',
    title: 'A Prancha e a Aurora Silenciosa',
    backdrop: 'camp',
    triggerBeforeLevelId: 1,
    lines: [
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'thoughtful',
        text: 'A Aurora Boreal não brilha sobre a nossa vila há três invernos... Só restou este eco frio lá no alto.',
      },
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'surprised',
        text: 'Ei! A prancha antiga que encontrei na caverna começou a flutuar sozinha assim que olhei para o Pico!',
      },
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'determined',
        text: 'Se eu souber a hora certa de deslizar rápido no gelo e de firmar os pés na neve... posso reacender os Marcos até o Cume Estrelado!',
      },
    ],
  },
  world2_ruins: {
    id: 'world2_ruins',
    chapterLabel: 'ATO II · RUÍNAS CONGELADAS',
    title: 'O Despertar de Luma',
    backdrop: 'ruins_gate',
    triggerBeforeLevelId: 4,
    lines: [
      {
        speaker: 'luma',
        speakerName: 'LUMA',
        mood: 'happy',
        text: 'Piu-plim! Fazia séculos que eu não via uma prancha boreal cortando a neve com tanta graça!',
      },
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'surprised',
        text: 'Uau, um pinguim de cristal! Você mora nestas ruínas antigas?',
      },
      {
        speaker: 'luma',
        speakerName: 'LUMA',
        mood: 'wise',
        text: 'Eu guardo as Chaves Estelares da cidade! Os portões selados aqui só abrem quando você toca os cristais dourados e usa os Anéis Boreais para cruzar os vãos.',
      },
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'smile',
        text: 'Combinado, Luma! Vamos abrir passagem pelas ruínas e trazer a luz de volta.',
      },
    ],
  },
  world2_winds: {
    id: 'world2_winds',
    chapterLabel: 'ATO II · CORREDOR DOS VENTOS',
    title: 'Quando Frear Também é Coragem',
    backdrop: 'wind_bridge',
    triggerBeforeLevelId: 7,
    lines: [
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'thoughtful',
        text: 'Que ventania absurda... Se eu continuar voando rápido demais nessas torres estreitas, vou direto para o abismo!',
      },
      {
        speaker: 'luma',
        speakerName: 'LUMA',
        mood: 'wise',
        text: 'Escute o vento, Maya. Nem toda subida pede velocidade máxima: soltar o hover na neve macia segura o seu salto na medida exata.',
      },
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'determined',
        text: 'Certo! Surfar a ventania quando o céu estiver livre, e desligar a prancha para pousar firme. Agora eu entendi o ritmo da montanha!',
      },
    ],
  },
  world3_peak: {
    id: 'world3_peak',
    chapterLabel: 'ATO III · PICO GELADO',
    title: 'Sob o Céu Violeta',
    backdrop: 'crystal_shrine',
    triggerBeforeLevelId: 8,
    lines: [
      {
        speaker: 'luma',
        speakerName: 'LUMA',
        mood: 'happy',
        text: 'Olha só! Os cristais do Pico Estrelado já estão vibrando com o brilho da sua prancha!',
      },
      {
        speaker: 'echo',
        speakerName: 'ECO DA AURORA',
        mood: 'wise',
        text: 'Poucos chegam tão alto sem perder o fôlego... Aqui o gelo exige tudo o que você aprendeu: rampas, chaves e saltos entre paredes.',
      },
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'smile',
        text: 'Falta pouco, Luma. Vamos dançar por essas últimas nuvens até o cume!',
      },
    ],
  },
  epilogue: {
    id: 'epilogue',
    chapterLabel: 'EPÍLOGO · O CUME ESTRELADO',
    title: 'A Canção da Aurora',
    backdrop: 'summit_aurora',
    triggerAfterLevelId: 10,
    lines: [
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'surprised',
        text: 'Conseguimos!! Olha o céu inteiro se abrindo em luz ciano e dourada acima das nuvens!',
      },
      {
        speaker: 'luma',
        speakerName: 'LUMA',
        mood: 'happy',
        text: 'Piu-plim!! Lá embaixo as janelas da sua vila acenderam uma por uma! A Aurora voltou a cantar!',
      },
      {
        speaker: 'maya',
        speakerName: 'MAYA',
        mood: 'smile',
        text: 'Obrigada por voar comigo até aqui, Luma... A montanha parecia solitária no começo, mas cada queda me ensinou a alcançar o céu.',
      },
    ],
  },
};

export function getCutsceneBeforeLevel(levelId: number): CutsceneDef | null {
  for (const cs of Object.values(CUTSCENES)) {
    if (cs.triggerBeforeLevelId === levelId) return cs;
  }
  return null;
}

export function getCutsceneAfterLevel(levelId: number): CutsceneDef | null {
  for (const cs of Object.values(CUTSCENES)) {
    if (cs.triggerAfterLevelId === levelId) return cs;
  }
  return null;
}

// ============================================================================
// Renderização da Cena Pixel-Art Animada (320x180) durante as Cutscenes
// ============================================================================
function drawPixelOwlLuma(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  time: number,
  glowColor = '#60a5fa'
): void {
  const bob = Math.round(Math.sin(time * 4.2) * 2);
  const flap = Math.sin(time * 9) > 0 ? 1 : 0;
  const x = Math.round(lx);
  const y = Math.round(ly + bob);

  // Anel cristalino octagonal fino em torno da Luma + cacos flutuantes
  ctx.fillStyle = '#2dd4bf';
  ctx.fillRect(x - 5, y - 7, 10, 1);
  ctx.fillRect(x - 5, y + 7, 10, 1);
  ctx.fillRect(x - 7, y - 5, 1, 10);
  ctx.fillRect(x + 7, y - 5, 1, 10);
  ctx.fillStyle = '#a5f3fc';
  ctx.fillRect(x + Math.round(Math.cos(time * 3.2) * 8), y + Math.round(Math.sin(time * 3.2) * 8), 1, 1);
  ctx.fillRect(x + Math.round(Math.cos(time * 3.2 + Math.PI) * 8), y + Math.round(Math.sin(time * 3.2 + Math.PI) * 8), 1, 1);

  // Contorno externo arredondado
  ctx.fillStyle = CONFIG.PALETTE.MAYA_OUTLINE;
  ctx.fillRect(x - 4, y - 5, 8, 10);
  ctx.fillRect(x - 5, y - 4, 10, 8);
  ctx.fillRect(x - 6, y - 2 + flap, 12, 4);

  // Orelhinhas/cristais azuis no topo
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(x - 4, y - 6, 2, 2);
  ctx.fillRect(x + 2, y - 6, 2, 2);

  // Corpo azul-celeste arredondado (igual à arte do pinguim!)
  ctx.fillStyle = glowColor;
  ctx.fillRect(x - 4, y - 3, 8, 6);
  ctx.fillRect(x - 3, y - 4, 6, 8);
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(x - 2, y - 4, 4, 2);

  // Rosto branco em formato de coração
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 3, y - 2, 6, 5);
  ctx.fillRect(x - 2, y - 3, 2, 1);
  ctx.fillRect(x + 1, y - 3, 2, 1);

  // Olhinhos brilhantes, bochecha rosada e bico dourado
  ctx.fillStyle = '#0b101d';
  ctx.fillRect(x - 2, y - 1, 1, 2);
  ctx.fillRect(x + 1, y - 1, 1, 2);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x - 3, y + 1, 1, 1);
  ctx.fillRect(x + 2, y + 1, 1, 1);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(x - 1, y + 1, 2, 1);
}

function drawCutsceneMaya(
  ctx: CanvasRenderingContext2D,
  mx: number,
  my: number,
  time: number,
  ridingHover = false
): void {
  const P = CONFIG.PALETTE;
  const x = Math.round(mx);
  const y = Math.round(my + (ridingHover ? Math.sin(time * 4) * 1.5 : 0));

  // Cachos cacheados proporcionais atrás
  for (let i = 4; i >= 0; i--) {
    const sway = Math.round(Math.sin(time * (ridingHover ? 5.2 : 2.2) + i) * 0.6);
    const cx = ridingHover ? x - 4 - i * 1.8 + sway : x - 4 - Math.floor(i * 0.5) + sway;
    const cy = ridingHover
      ? y - 10 + Math.round(i * 0.55)
      : y - 10 + Math.round(i * 1.25);
    const sz = Math.max(1, 3 - Math.floor(i / 2));
    ctx.fillStyle = P.MAYA_OUTLINE;
    ctx.fillRect(cx - 1, cy - 1, sz + 2, sz + 2);
    ctx.fillStyle = i < 2 ? P.HAIR_CURL_MID : P.HAIR_CURL_DARK;
    ctx.fillRect(cx, cy, sz, sz);
    if (i === 1) {
      ctx.fillStyle = P.HAIR_CURL_LIGHT;
      ctx.fillRect(cx + 1, cy, 1, 1);
    }
  }

  // Corpo estilo Celeste com cabeça compacta (5px) e olhos 1x1 nítidos
  ctx.fillStyle = P.MAYA_OUTLINE;
  ctx.fillRect(x - 3, y - 14, 7, 2); // coroa do cabelo
  ctx.fillRect(x - 4, y - 12, 8, 5); // cabeça + cachinho lateral
  ctx.fillRect(x - 4, y - 8, 9, 6); // mochila + jaqueta
  ctx.fillRect(x - 3, y - 3, 7, 3); // calça e botas

  // Cabelo topo
  ctx.fillStyle = P.HAIR_CURL_MID;
  ctx.fillRect(x - 2, y - 13, 5, 2);
  ctx.fillStyle = P.HAIR_CURL_LIGHT;
  ctx.fillRect(x - 1, y - 13, 3, 1);
  ctx.fillStyle = P.HAIR_CURL_DARK;
  ctx.fillRect(x - 3, y - 11, 1, 2);

  // Rosto compacto (5px) com dois olhinhos 1x1 nítidos
  ctx.fillStyle = P.MAYA_SKIN;
  ctx.fillRect(x - 2, y - 11, 5, 2);
  ctx.fillStyle = P.MAYA_SKIN_HIGHLIGHT;
  ctx.fillRect(x, y - 11, 1, 1);
  ctx.fillStyle = '#110814';
  ctx.fillRect(x - 1, y - 10, 1, 1);
  ctx.fillRect(x + 1, y - 10, 1, 1);

  // Cachecol azul + jaqueta azul-celeste + mochila
  ctx.fillStyle = P.MAYA_SCARF_BLUE;
  ctx.fillRect(x - 2, y - 9, 5, 1);
  ctx.fillStyle = P.MAYA_JACKET;
  ctx.fillRect(x - 2, y - 8, 5, 5);
  ctx.fillStyle = P.MAYA_JACKET_SHADE;
  ctx.fillRect(x, y - 7, 2, 3);
  ctx.fillStyle = P.MAYA_PACK;
  ctx.fillRect(x - 3, y - 8, 2, 4);
  // Calça e botas
  ctx.fillStyle = P.MAYA_PANTS;
  ctx.fillRect(x - 2, y - 3, 2, 2);
  ctx.fillRect(x + 1, y - 3, 2, 2);
  ctx.fillStyle = P.MAYA_BOOTS;
  ctx.fillRect(x - 2, y - 1, 2, 1);
  ctx.fillRect(x + 1, y - 1, 2, 1);

  if (ridingHover) {
    // Prancha brilhando sob os pés
    ctx.fillStyle = P.MAYA_OUTLINE;
    ctx.fillRect(x - 7, y, 14, 3);
    ctx.fillStyle = P.BOARD_BODY;
    ctx.fillRect(x - 6, y + 1, 12, 1);
    ctx.fillStyle = P.BOARD_GLOW;
    ctx.fillRect(x - 3, y + 1, 6, 1);
  }
}

function drawCutsceneCliffGround(
  ctx: CanvasRenderingContext2D,
  yTop: number,
  stoneColor: string,
  brickColor: string,
  snowTop: string,
  snowShadow: string
): void {
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;
  ctx.fillStyle = stoneColor;
  ctx.fillRect(0, yTop + 2, W, H - yTop - 2);
  // Tijolos em pixel art para texturizar o penhasco
  ctx.fillStyle = brickColor;
  for (let by = yTop + 8; by < H; by += 8) {
    const offset = ((by / 8) % 2) * 8;
    for (let bx = offset; bx < W; bx += 16) {
      ctx.fillRect(bx + 1, by, 7, 3);
    }
  }
  ctx.fillStyle = snowTop;
  ctx.fillRect(0, yTop, W, 3);
  ctx.fillStyle = snowShadow;
  ctx.fillRect(0, yTop + 3, W, 2);
}

export function renderCutsceneCanvas(
  ctx: CanvasRenderingContext2D,
  cutscene: CutsceneDef,
  time: number
): void {
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;
  const P = CONFIG.PALETTE;

  // 1. Céu atmosférico temático por ato
  const skyPalette =
    cutscene.backdrop === 'ruins_gate' || cutscene.backdrop === 'wind_bridge'
      ? ['#0a1724', '#102438', '#17344f', '#214766']
      : cutscene.backdrop === 'crystal_shrine'
      ? ['#120b26', '#1e133d', '#2b1b57', '#3a2573']
      : cutscene.backdrop === 'summit_aurora'
      ? ['#0c1229', '#162044', '#223163', '#2e4585']
      : ['#111930', '#192647', '#233661', '#2e477a'];

  const bandH = Math.ceil(H / skyPalette.length);
  for (let i = 0; i < skyPalette.length; i++) {
    ctx.fillStyle = skyPalette[i];
    ctx.fillRect(0, i * bandH, W, bandH);
  }

  // 2. Estrelas cintilantes
  for (let i = 0; i < 48; i++) {
    const sx = (i * 73 + 19) % W;
    const sy = (i * 41 + 7) % 105;
    if (Math.sin(time * 2.5 + i) > -0.2) {
      ctx.fillStyle = i % 5 === 0 ? '#fef08a' : '#e0f2fe';
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  // 3. Aurora Boreal (muito intensa e viva no epílogo!)
  const auroraBright = cutscene.backdrop === 'summit_aurora' ? 0.42 : 0.18;
  const bands = cutscene.backdrop === 'summit_aurora' ? 3 : 2;
  const colors = ['#2dd4bf', '#a855f7', '#fbbf24'];
  ctx.save();
  for (let b = 0; b < bands; b++) {
    ctx.fillStyle = colors[b % colors.length];
    ctx.globalAlpha = auroraBright - b * 0.05;
    for (let x = 0; x < W; x += 2) {
      const wave = Math.sin(x * 0.025 + time * 0.9 + b * 1.7) * 10;
      ctx.fillRect(x, Math.round(18 + b * 12 + wave), 2, 16);
    }
  }
  ctx.restore();

  // 4. Silhueta de montanhas distantes limpas
  for (let px = 0; px < W; px++) {
    const ridgeY = Math.round(
      118 - Math.abs(Math.sin(px * 0.018 + 0.5) * 28 + Math.cos(px * 0.032) * 12)
    );
    ctx.fillStyle =
      cutscene.backdrop === 'crystal_shrine' ? '#241845' : '#253559';
    ctx.fillRect(px, ridgeY, 1, H - ridgeY);
  }

  // 5. Terreno / Cenário em primeiro plano específico da cena
  if (cutscene.backdrop === 'camp') {
    // Pinheiros silhuetados nas laterais + penhasco nevado texturizado
    for (const px of [44, 62, 260, 278]) {
      ctx.fillStyle = '#18243d';
      ctx.fillRect(px - 2, 114, 4, 10);
      ctx.fillRect(px - 5, 117, 10, 4);
      ctx.fillRect(px - 7, 120, 14, 4);
      ctx.fillStyle = P.SNOW_TOP;
      ctx.fillRect(px - 2, 113, 4, 1);
    }
    drawCutsceneCliffGround(ctx, 124, P.STONE_DARK, P.STONE_MID, P.SNOW_TOP, P.SNOW_SHADOW);

    // Fogueira aconchegante com faíscas
    const fx = 186;
    const fy = 123;
    ctx.fillStyle = P.WOOD_DARK;
    ctx.fillRect(fx - 5, fy - 2, 10, 3);
    const flicker = Math.sin(time * 14) > 0 ? 1 : 0;
    ctx.fillStyle = '#f97316';
    ctx.fillRect(fx - 3, fy - 8 - flicker, 6, 6 + flicker);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(fx - 2, fy - 6, 4, 4);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(fx - 1, fy - 12 - Math.round((time * 10) % 5), 1, 1);

    // Maya parada observando a prancha flutuando
    drawCutsceneMaya(ctx, 148, 124, time, false);
    const bx = 216;
    const by = Math.round(106 + Math.sin(time * 3.1) * 3);
    ctx.fillStyle = P.MAYA_OUTLINE;
    ctx.fillRect(bx - 10, by - 2, 20, 5);
    ctx.fillStyle = P.BOARD_BODY;
    ctx.fillRect(bx - 9, by - 1, 18, 3);
    ctx.fillStyle = P.BOARD_GLOW;
    ctx.fillRect(bx - 5, by, 10, 1);
  } else if (cutscene.backdrop === 'ruins_gate') {
    // Penhasco das ruínas antigas + coluna esculpida com neve e runas
    drawCutsceneCliffGround(ctx, 124, '#152536', '#21384f', P.SNOW_TOP, '#7dd3fc');

    // Coluna antiga quebrada com degraus, neve no topo e runas ciano
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(198, 66, 26, 58);
    ctx.fillRect(194, 114, 34, 10);
    ctx.fillStyle = '#244159';
    ctx.fillRect(200, 68, 22, 56);
    ctx.fillRect(196, 116, 30, 8);
    ctx.fillStyle = '#1a3044';
    ctx.fillRect(202, 74, 8, 4);
    ctx.fillRect(212, 90, 8, 4);
    ctx.fillRect(202, 106, 9, 4);
    ctx.fillStyle = P.SNOW_TOP;
    ctx.fillRect(199, 66, 20, 3);
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(209, 80, 4, 8);
    ctx.fillRect(207, 94, 8, 3);

    drawCutsceneMaya(ctx, 134, 124, time, false);
    drawPixelOwlLuma(ctx, 182, 98, time);
  } else if (cutscene.backdrop === 'wind_bridge') {
    // Ponte alta nas ruínas com rajadas de vento passando
    ctx.fillStyle = '#182b3b';
    ctx.fillRect(60, 124, 200, 12);
    ctx.fillStyle = P.SNOW_TOP;
    ctx.fillRect(60, 123, 200, 2);

    ctx.fillStyle = 'rgba(224, 242, 254, 0.5)';
    for (let i = 0; i < 8; i++) {
      const wx = ((i * 53 + time * 130) % (W + 40)) - 20;
      const wy = 45 + (i * 17) % 75;
      ctx.fillRect(Math.floor(wx), wy, 14, 1);
    }

    drawCutsceneMaya(ctx, 136, 123, time, false);
    drawPixelOwlLuma(ctx, 178, 104, time);
  } else if (cutscene.backdrop === 'crystal_shrine') {
    // Santuário violeta com grandes cristais brilhantes
    drawCutsceneCliffGround(ctx, 124, '#1b1433', '#2a1f4d', '#e0e7ff', '#a5b4fc');

    // Cristais gigantes ao fundo
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(208, 86, 12, 38);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(210, 88, 6, 34);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(88, 94, 10, 30);

    drawCutsceneMaya(ctx, 140, 124, time, true);
    drawPixelOwlLuma(ctx, 186, 98, time, '#a78bfa');
  } else {
    // Epílogo: Topo do Cume Estrelado com o grande Obelisco aceso + luzes da vila ao fundo
    for (let v = 0; v < 9; v++) {
      ctx.fillStyle = Math.sin(time * 3 + v) > 0 ? '#fde047' : '#fb923c';
      ctx.fillRect(22 + v * 11, 140 + (v % 3) * 4, 2, 2);
    }

    ctx.fillStyle = '#1d1638';
    ctx.fillRect(92, 118, 136, 62);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(92, 116, 136, 3);

    // Grande Marco Boreal aceso lançando feixe para a Aurora
    ctx.fillStyle = 'rgba(45, 212, 191, 0.28)';
    ctx.fillRect(190, 0, 10, 116);
    ctx.fillStyle = P.TILE_OUTLINE;
    ctx.fillRect(188, 92, 14, 26);
    ctx.fillStyle = P.BOARD_ACCENT;
    ctx.fillRect(190, 94, 10, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(193, 97, 4, 16);

    drawCutsceneMaya(ctx, 140, 116, time, false);
    drawPixelOwlLuma(ctx, 166, 92, time, '#fde047');
  }
}

// ============================================================================
// Retrato Pixel-Art 48x48 para a Caixa de Diálogo estilo Celeste
// Inspirado diretamente nas artes close-up da Maya e da Luma (Pinguim Cristalino)
// ============================================================================
function fillPixelDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1);
  }
}

export function renderDialoguePortrait(
  canvas: HTMLCanvasElement,
  speaker: CutsceneSpeaker,
  mood: CutsceneMood,
  time: number,
  isTalking = false
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width || 48;
  const H = canvas.height || 48;
  ctx.clearRect(0, 0, W, H);

  const P = CONFIG.PALETTE;
  const talkOpen = isTalking && Math.sin(time * 22) > 0.1;

  if (speaker === 'maya') {
    const bob = Math.round(Math.sin(time * 3.2) * 0.6);

    // Fundo bordô profundo inspirado na arte de close-up da Maya
    ctx.fillStyle = '#3b0b0e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#260608';
    ctx.fillRect(0, 0, W, 2);
    ctx.fillRect(0, 0, 2, H);

    // Cabelo cacheado volumoso atrás e no topo (silhueta rica e assimétrica)
    fillPixelDisc(ctx, 20, 15 + bob, 16, '#170805');
    fillPixelDisc(ctx, 9, 20 + bob, 10, '#170805');
    fillPixelDisc(ctx, 32, 13 + bob, 11, '#170805');
    fillPixelDisc(ctx, 39, 17 + bob, 7, '#170805');
    fillPixelDisc(ctx, 9, 32 + bob, 7, '#170805');

    // Camadas marrons dos cachos
    fillPixelDisc(ctx, 20, 15 + bob, 14, '#3d1c12');
    fillPixelDisc(ctx, 9, 20 + bob, 8, '#3d1c12');
    fillPixelDisc(ctx, 32, 13 + bob, 9, '#3d1c12');
    fillPixelDisc(ctx, 39, 17 + bob, 5, '#3d1c12');

    // Mechas iluminadas nos cachos (estilo pintura cel-shaded)
    ctx.fillStyle = '#6e3b26';
    ctx.fillRect(10, 7 + bob, 7, 3);
    ctx.fillRect(18, 4 + bob, 9, 3);
    ctx.fillRect(29, 7 + bob, 8, 3);
    ctx.fillRect(35, 11 + bob, 6, 3);
    ctx.fillRect(5, 16 + bob, 6, 4);
    ctx.fillStyle = '#8b4a2b';
    ctx.fillRect(19, 5 + bob, 5, 2);
    ctx.fillRect(30, 8 + bob, 4, 2);
    ctx.fillRect(7, 17 + bob, 3, 2);

    // Orelha esquerda com sombreado
    fillPixelDisc(ctx, 12, 28 + bob, 4, '#170805');
    fillPixelDisc(ctx, 12, 28 + bob, 3, P.MAYA_SKIN);
    ctx.fillStyle = P.MAYA_SKIN_SHADOW;
    ctx.fillRect(11, 27 + bob, 2, 3);

    // Rosto 3/4 acolhedor
    fillPixelDisc(ctx, 27, 25 + bob, 12, '#170805');
    fillPixelDisc(ctx, 27, 25 + bob, 11, P.MAYA_SKIN);
    ctx.fillRect(15, 15 + bob, 15, 15);
    // Sombra sutil no queixo/bochecha e brilho quente na testa
    ctx.fillStyle = P.MAYA_SKIN_SHADOW;
    ctx.fillRect(15, 29 + bob, 6, 4);
    ctx.fillRect(34, 29 + bob, 4, 4);
    ctx.fillStyle = P.MAYA_SKIN_HIGHLIGHT;
    ctx.fillRect(23, 14 + bob, 8, 3);

    // Mechas frontais cacheadas caindo sobre a testa e têmpora
    ctx.fillStyle = '#170805';
    ctx.fillRect(17, 11 + bob, 17, 3);
    ctx.fillRect(25, 13 + bob, 5, 3);
    ctx.fillStyle = '#5c2e1c';
    ctx.fillRect(18, 10 + bob, 14, 3);
    ctx.fillRect(26, 12 + bob, 3, 3);
    ctx.fillStyle = '#7c4028';
    ctx.fillRect(20, 10 + bob, 6, 2);

    // Sobrancelhas expressivas
    ctx.fillStyle = '#170814';
    if (mood === 'determined') {
      ctx.fillRect(20, 16 + bob, 6, 2);
      ctx.fillRect(32, 16 + bob, 5, 2);
      ctx.fillRect(25, 17 + bob, 2, 1);
    } else if (mood === 'surprised' || mood === 'thoughtful') {
      ctx.fillRect(20, 14 + bob, 6, 2);
      ctx.fillRect(32, 14 + bob, 5, 2);
    } else {
      ctx.fillRect(20, 15 + bob, 6, 2);
      ctx.fillRect(32, 15 + bob, 5, 2);
    }

    // Olhos grandes expressivos (esclera branca, íris escura, brilho duplo e cílios)
    // Sempre abertos e vívidos (apenas pisca brevemente)
    const blink = Math.sin(time * 1.9) > 0.975;
    if (blink) {
      ctx.fillStyle = '#170814';
      ctx.fillRect(20, 22 + bob, 7, 2);
      ctx.fillRect(32, 22 + bob, 5, 2);
    } else {
      const eyeH = mood === 'surprised' ? 7 : 6;
      const gazeUp = mood === 'thoughtful' ? -1 : 0;
      // Contorno & cílios curvados
      ctx.fillStyle = '#110814';
      ctx.fillRect(20, 19 + bob, 7, 1);
      ctx.fillRect(18, 18 + bob, 3, 1); // cílio esquerdo alongado
      ctx.fillRect(31, 19 + bob, 6, 1);
      // Esclera branca bem visível
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, 20 + bob, 7, eyeH);
      ctx.fillRect(31, 20 + bob, 6, eyeH);
      // Íris escura + reflexo cinza suave embaixo
      ctx.fillStyle = '#110814';
      ctx.fillRect(22, 20 + bob + Math.max(0, gazeUp), 4, eyeH - 1);
      ctx.fillRect(33, 20 + bob + Math.max(0, gazeUp), 4, eyeH - 1);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(23, 24 + bob, 2, 1);
      ctx.fillRect(34, 24 + bob, 2, 1);
      // Brilhos brancos nítidos nos olhos
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(22, 20 + bob, 2, 2);
      ctx.fillRect(33, 20 + bob, 2, 2);
    }

    // Nariz fofo com brilho dourado na pontinha
    ctx.fillStyle = '#7c3c20';
    ctx.fillRect(29, 26 + bob, 3, 2);
    ctx.fillStyle = '#f2ae88';
    ctx.fillRect(29, 25 + bob, 2, 1);

    // Bochechas rosadas ovais
    ctx.fillStyle = '#e85d4a';
    ctx.fillRect(17, 26 + bob, 4, 2);
    ctx.fillRect(34, 26 + bob, 3, 2);

    // Boca expressiva com movimento sutil ao falar
    ctx.fillStyle = '#170814';
    if (mood === 'surprised') {
      ctx.fillRect(28, 31 + bob, 3, 3);
      ctx.fillStyle = '#9f1239';
      ctx.fillRect(29, 32 + bob, 1, 1);
    } else if (talkOpen) {
      ctx.fillRect(26, 31 + bob, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(27, 31 + bob, 4, 1);
    } else if (mood === 'smile' || mood === 'happy') {
      ctx.fillRect(25, 31 + bob, 6, 1);
      ctx.fillRect(24, 30 + bob, 1, 1);
      ctx.fillRect(31, 30 + bob, 1, 1);
    } else {
      ctx.fillRect(26, 31 + bob, 5, 1);
      ctx.fillRect(31, 30 + bob, 1, 1);
    }

    // Jaqueta azul-celeste com gola levantada + cachecol azul royal (igual à referência!)
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(9, 36 + bob, 30, 12);
    ctx.fillRect(8, 34 + bob, 6, 4); // gola esquerda levantada
    ctx.fillRect(35, 34 + bob, 5, 4); // gola direita levantada
    ctx.fillStyle = P.MAYA_JACKET;
    ctx.fillRect(10, 37 + bob, 28, 11);
    ctx.fillRect(9, 35 + bob, 5, 3);
    ctx.fillRect(35, 35 + bob, 4, 3);
    ctx.fillStyle = P.MAYA_JACKET_LIGHT;
    ctx.fillRect(9, 35 + bob, 5, 1);
    ctx.fillRect(35, 35 + bob, 4, 1);
    ctx.fillRect(12, 37 + bob, 24, 2);
    // Cachecol azul royal no centro
    ctx.fillStyle = P.MAYA_SCARF_BLUE;
    ctx.fillRect(16, 37 + bob, 17, 11);
    ctx.fillStyle = P.MAYA_SCARF_BLUE_LIGHT;
    ctx.fillRect(18, 38 + bob, 11, 2);
  } else if (speaker === 'luma') {
    const bob = Math.round(Math.sin(time * 4.2) * 1);

    // Fundo escuro + anel cristalino ciano brilhante + cacos de gelo (igual ao pinguim!)
    ctx.fillStyle = '#0b162a';
    ctx.fillRect(0, 0, W, H);

    // Anel octagonal ciano luminoso
    for (let a = 0; a < 36; a++) {
      const ang = (a / 36) * Math.PI * 2;
      const rx = Math.round(24 + Math.cos(ang) * 20);
      const ry = Math.round(24 + Math.sin(ang) * 20);
      ctx.fillStyle = a % 2 === 0 ? '#2dd4bf' : '#67e8f9';
      ctx.fillRect(rx - 1, ry - 1, 2, 2);
    }
    // Cacos de cristal orbitando ao redor
    for (let s = 0; s < 4; s++) {
      const sang = time * 1.4 + (s * Math.PI) / 2;
      const sx = Math.round(24 + Math.cos(sang) * 21);
      const sy = Math.round(24 + Math.sin(sang) * 21);
      ctx.fillStyle = '#ccfbf1';
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Orelhas/cristais azul-escuros no topo
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(11, 7 + bob, 6, 7);
    ctx.fillRect(31, 7 + bob, 6, 7);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(12, 8 + bob, 4, 5);
    ctx.fillRect(32, 8 + bob, 4, 5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(13, 8 + bob, 2, 3);
    ctx.fillRect(33, 8 + bob, 2, 3);

    // Corpo/cabeça redonda azul-celeste com contorno
    fillPixelDisc(ctx, 24, 25 + bob, 15, '#0b101d');
    fillPixelDisc(ctx, 24, 25 + bob, 14, '#60a5fa');
    fillPixelDisc(ctx, 24, 22 + bob, 11, '#7dd3fc');
    // Topete de 3 peninhas no alto
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(22, 8 + bob, 5, 4);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(23, 9 + bob, 3, 3);

    // Máscara branca em formato de coração no rosto
    fillPixelDisc(ctx, 19, 24 + bob, 6, '#ffffff');
    fillPixelDisc(ctx, 29, 24 + bob, 6, '#ffffff');
    fillPixelDisc(ctx, 24, 28 + bob, 8, '#ffffff');
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(23, 18 + bob, 2, 2); // entradinha central do coração

    // Olhos grandes adoráveis com cílios e brilho duplo
    const blink = Math.sin(time * 2.1) > 0.96;
    if (blink) {
      ctx.fillStyle = '#0b101d';
      ctx.fillRect(16, 24 + bob, 5, 2);
      ctx.fillRect(27, 24 + bob, 5, 2);
    } else {
      fillPixelDisc(ctx, 19, 23 + bob, 3, '#0b101d');
      fillPixelDisc(ctx, 29, 23 + bob, 3, '#0b101d');
      // Cílios simpáticos
      ctx.fillStyle = '#0b101d';
      ctx.fillRect(15, 20 + bob, 2, 1);
      ctx.fillRect(31, 20 + bob, 2, 1);
      // Brilhos duplos nos olhos
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(17, 21 + bob, 2, 2);
      ctx.fillRect(27, 21 + bob, 2, 2);
      ctx.fillRect(20, 24 + bob, 1, 1);
      ctx.fillRect(30, 24 + bob, 1, 1);
    }

    // Bochechas rosadas ovais
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(14, 27 + bob, 4, 2);
    ctx.fillRect(30, 27 + bob, 4, 2);

    // Bico dourado-laranja em losango (abre ao falar!)
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(22, 25 + bob, 4, talkOpen ? 5 : 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(23, 25 + bob, 2, 3);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(23, 25 + bob, 2, 1);
    if (talkOpen) {
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(23, 28 + bob, 2, 1);
    }
  } else {
    // Eco da Aurora (Cristal Ancestral Luminoso 48x48)
    const pulse = Math.round(Math.sin(time * 4.5) * 1.5);
    ctx.fillStyle = '#1b0f33';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#a855f7' : '#5eead4';
      ctx.fillRect((i * 19 + 5) % W, (i * 13 + 4) % H, 1, 1);
    }
    ctx.fillStyle = '#0b101d';
    ctx.fillRect(17, 8 + pulse, 14, 32);
    ctx.fillStyle = '#7e22ce';
    ctx.fillRect(18, 9 + pulse, 12, 30);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(20, 11 + pulse, 8, 26);
    ctx.fillStyle = '#fae8ff';
    ctx.fillRect(22, 14 + pulse, 4, 20);
  }
}
