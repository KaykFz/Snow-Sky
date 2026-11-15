import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CutsceneDef, renderDialoguePortrait } from '../game/Cutscenes';
import { AudioEngine } from '../game/Audio';

interface CutsceneOverlayProps {
  cutscene: CutsceneDef;
  audio: AudioEngine | null;
  onFinish: () => void;
}

export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({
  cutscene,
  audio,
  onFinish,
}) => {
  const [lineIdx, setLineIdx] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const portraitCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentLine = cutscene.lines[lineIdx] || cutscene.lines[0];
  const isLineComplete = visibleChars >= currentLine.text.length;
  const isLastLine = lineIdx >= cutscene.lines.length - 1;

  // Reinicia índice ao trocar de cutscene
  useEffect(() => {
    setLineIdx(0);
    setVisibleChars(0);
  }, [cutscene.id]);

  // Efeito typewriter + bipes de voz estilo Celeste
  useEffect(() => {
    if (visibleChars >= currentLine.text.length) return;
    const timer = window.setTimeout(() => {
      const next = visibleChars + 1;
      setVisibleChars(next);
      const ch = currentLine.text[next - 1];
      if (next % 3 === 1 && ch && ch !== ' ') {
        audio?.playDialogueBlip(currentLine.speaker);
      }
    }, 24);
    return () => window.clearTimeout(timer);
  }, [visibleChars, currentLine, audio]);

  // Anima o retrato pixel-art (48x48) dentro da caixa de diálogo
  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const canvas = portraitCanvasRef.current;
      if (canvas) {
        renderDialoguePortrait(
          canvas,
          currentLine.speaker,
          currentLine.mood,
          (now - start) / 1000,
          !isLineComplete
        );
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentLine.speaker, currentLine.mood, isLineComplete]);

  const advance = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (!isLineComplete) {
      setVisibleChars(currentLine.text.length);
      return;
    }
    audio?.playUiClick();
    if (!isLastLine) {
      setLineIdx((prev) => prev + 1);
      setVisibleChars(0);
    } else {
      onFinish();
    }
  }, [isLineComplete, currentLine.text.length, isLastLine, audio, onFinish]);

  const skip = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audio?.playUiClick();
    onFinish();
  }, [audio, onFinish]);

  // Teclado: Enter / Espaço / Z avança, Esc pula
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'KeyJ') {
        e.preventDefault();
        e.stopPropagation();
        advance();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        skip();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [advance, skip]);

  const speakerBadgeColor =
    currentLine.speaker === 'luma'
      ? 'text-[#5eead4]'
      : currentLine.speaker === 'echo'
      ? 'text-[#d8b4fe]'
      : 'text-[#38bdf8]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`História: ${cutscene.title}`}
      className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-7 z-10"
    >
      {/* Topo: Capítulo & Botão Pular */}
      <div className="flex items-start justify-between gap-3">
        <div className="pixel-hud-box px-3.5 py-2">
          <div className="text-[9px] text-[#5eead4] tracking-widest uppercase">
            {cutscene.chapterLabel}
          </div>
          <div className="text-xs md:text-sm font-bold text-[#f8fafc]">
            {cutscene.title}
          </div>
        </div>

        <button
          type="button"
          onClick={skip}
          className="pixel-btn pixel-btn-slate px-3.5 py-2 text-[11px] font-bold tracking-wider pointer-events-auto"
        >
          PULAR
        </button>
      </div>

      {/* Base: Caixa de Diálogo Pixel-Art estilo Celeste */}
      <div className="max-w-2xl w-full mx-auto pointer-events-auto">
        <div
          onClick={advance}
          className="pixel-panel p-3.5 md:p-4 flex items-center gap-3.5 md:gap-4 cursor-pointer"
        >
          {/* Retrato 48x48 crisp pixelated inspirado nas artes da Maya e Luma */}
          <div className="pixel-inset p-1 shrink-0 bg-[#0b101d]">
            <canvas
              ref={portraitCanvasRef}
              width={48}
              height={48}
              className="pixel-canvas w-16 h-16 md:w-20 md:h-20 block"
            />
          </div>

          {/* Texto da fala */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[11px] font-bold tracking-widest uppercase ${speakerBadgeColor}`}>
                {currentLine.speakerName}
              </span>
              <span className="font-mono-tabular text-[10px] text-[#64748b]">
                {lineIdx + 1}/{cutscene.lines.length}
              </span>
            </div>

            <p className="text-xs md:text-sm text-[#f1f5f9] leading-relaxed min-h-[2.75rem]">
              {currentLine.text.slice(0, visibleChars)}
            </p>
          </div>

          {/* Botão de avançar explícito e acessível */}
          <button
            type="button"
            data-cutscene-next="true"
            onClick={(e) => {
              e.stopPropagation();
              advance();
            }}
            className="pixel-btn pixel-btn-cyan px-3.5 py-2 text-[11px] font-bold shrink-0"
          >
            {isLastLine && isLineComplete ? 'INICIAR' : 'AVANÇAR'}
          </button>
        </div>
      </div>
    </div>
  );
};
