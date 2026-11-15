import { CONFIG, DEFAULT_SETTINGS, GameSettings } from '../config';
import { Player } from './Player';

export interface SaveProgress {
  unlockedLevel: number; // 1 a 10
  completedLevels: number[];
  goldenFlakes: number[];
  seenCutscenes: string[];
  bestTimes: Record<number, number>;
  bestDeaths: Record<number, number>;
  totalDeaths: number;
  settings: GameSettings;
}

const STORAGE_KEY = 'hoverline_save_v1';

export function loadProgress(): SaveProgress {
  const fallback: SaveProgress = {
    unlockedLevel: 1,
    completedLevels: [],
    goldenFlakes: [],
    seenCutscenes: [],
    bestTimes: {},
    bestDeaths: {},
    totalDeaths: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      unlockedLevel: Math.max(1, Math.min(10, parsed.unlockedLevel || 1)),
      completedLevels: Array.isArray(parsed.completedLevels)
        ? parsed.completedLevels
        : [],
      goldenFlakes: Array.isArray(parsed.goldenFlakes)
        ? parsed.goldenFlakes
        : [],
      seenCutscenes: Array.isArray(parsed.seenCutscenes)
        ? parsed.seenCutscenes
        : [],
      bestTimes: parsed.bestTimes || {},
      bestDeaths: parsed.bestDeaths || {},
      totalDeaths: Number(parsed.totalDeaths) || 0,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return fallback;
  }
}

export function saveProgress(progress: SaveProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignora caso localStorage esteja bloqueado
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds * 10) % 10);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}.${tenths}`;
}

/**
 * Renderiza a barrinha discreta de Energia de Hover (com barra fantasma de dreno)
 * diretamente no Canvas 320x180 perto da Maya para Gaze Routing imediato!
 */
export class DiegeticCanvasHUD {
  private ghostEnergy = CONFIG.HOVER.MAX_ENERGY;

  public update(dt: number, currentEnergy: number): void {
    if (currentEnergy >= this.ghostEnergy) {
      this.ghostEnergy = currentEnergy;
    } else {
      this.ghostEnergy += (currentEnergy - this.ghostEnergy) * Math.min(1, dt * 5.5);
    }
  }

  public renderPlayerMeters(
    ctx: CanvasRenderingContext2D,
    player: Player,
    camX: number,
    camY: number
  ): void {
    if (player.animState === 'dead') return;

    const showHoverBar =
      player.isHovering || player.hoverEnergy < CONFIG.HOVER.MAX_ENERGY - 0.5;
    const showStaminaBar =
      !player.isHovering &&
      player.wallDir !== 0 &&
      player.wallStamina < CONFIG.NORMAL.WALL_STAMINA_MAX - 1;

    if (!showHoverBar && !showStaminaBar) return;

    const sx = Math.round(player.x - camX);
    const sy = Math.round(player.y - camY);

    // Barrinha horizontal compacta logo acima da Maya (14px de largura)
    const barW = 14;
    const barH = 2;
    const bx = Math.max(4, Math.min(CONFIG.CANVAS_WIDTH - barW - 4, sx - Math.floor(barW / 2)));
    const by = Math.max(6, sy - 18);

    // Moldura escura pixelada
    ctx.fillStyle = CONFIG.PALETTE.MAYA_OUTLINE;
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

    if (showHoverBar) {
      const ratio = Math.max(0, Math.min(1, player.hoverEnergy / CONFIG.HOVER.MAX_ENERGY));
      const ghostRatio = Math.max(0, Math.min(1, this.ghostEnergy / CONFIG.HOVER.MAX_ENERGY));

      // Fundo vazio
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, barW, barH);

      // Barra fantasma de dreno (branca/rosa)
      ctx.fillStyle = CONFIG.PALETTE.HAIR_CHARGED;
      ctx.fillRect(bx, by, Math.ceil(barW * ghostRatio), barH);

      // Barra ativa de energia do Hover
      ctx.fillStyle =
        ratio > 0.25 ? CONFIG.PALETTE.BOARD_GLOW : CONFIG.PALETTE.MAYA_SCARF;
      ctx.fillRect(bx, by, Math.ceil(barW * ratio), barH);
    } else if (showStaminaBar) {
      const ratio = Math.max(
        0,
        Math.min(1, player.wallStamina / CONFIG.NORMAL.WALL_STAMINA_MAX)
      );
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle =
        ratio > 0.3 ? CONFIG.PALETTE.CRYSTAL_BRIGHT : CONFIG.PALETTE.SPIKE_TIP;
      ctx.fillRect(bx, by, Math.ceil(barW * ratio), barH);
    }
  }
}
