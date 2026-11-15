import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CONFIG, GameSettings } from './config';
import { InputManager } from './game/Input';
import { LEVELS, LevelRuntime } from './game/Level';
import { ParticleSystem } from './game/Particles';
import { Player } from './game/Player';
import { Camera } from './game/Camera';
import { AudioEngine } from './game/Audio';
import {
  DiegeticCanvasHUD,
  SaveProgress,
  formatTime,
  loadProgress,
  saveProgress,
} from './game/UI';
import { SnowSkyLogo } from './components/SnowSkyLogo';
import { renderTitleShowcase } from './game/TitleArt';
import {
  CUTSCENES,
  CutsceneDef,
  getCutsceneAfterLevel,
  getCutsceneBeforeLevel,
  renderCutsceneCanvas,
} from './game/Cutscenes';
import { CutsceneOverlay } from './components/CutsceneOverlay';

type ShellState = 'title' | 'cutscene' | 'playing' | 'paused' | 'gameover';
type SubModal = 'none' | 'map' | 'options';

interface StageClearSnapshot {
  levelId: number;
  levelTitle: string;
  worldName: string;
  clearTime: number;
  bestTime: number;
  stageDeaths: number;
  goldenCollected: boolean;
  isFinalLevel: boolean;
}

export default function App() {
  const initialSave = useRef<SaveProgress>(loadProgress());
  const [progress, setProgress] = useState<SaveProgress>(initialSave.current);

  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [shellState, setShellState] = useState<ShellState>(
    isAutostart ? 'playing' : 'title'
  );
  const [subModal, setSubModal] = useState<SubModal>('none');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [stageDeaths, setStageDeaths] = useState<number>(0);
  const [goldenInRun, setGoldenInRun] = useState<boolean>(false);
  const [clearSnapshot, setClearSnapshot] = useState<StageClearSnapshot | null>(null);
  const [activeCutscene, setActiveCutscene] = useState<CutsceneDef | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Refs para o Game Loop de 60 FPS desacoplado do React
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const shellStateRef = useRef<ShellState>(shellState);
  const subModalRef = useRef<SubModal>(subModal);
  const progressRef = useRef<SaveProgress>(progress);
  const currentLevelIdxRef = useRef<number>(currentLevelIdx);
  const activeCutsceneRef = useRef<CutsceneDef | null>(activeCutscene);
  const pendingLevelAfterCutsceneRef = useRef<number | null>(null);
  const pendingClearSnapshotRef = useRef<StageClearSnapshot | null>(null);
  const stageTimeRef = useRef<number>(0);
  const stageDeathsRef = useRef<number>(0);

  const inputRef = useRef<InputManager | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const diegeticHudRef = useRef<DiegeticCanvasHUD | null>(null);
  const levelRuntimeRef = useRef<LevelRuntime | null>(null);
  const playerRef = useRef<Player | null>(null);

  // Sincroniza estado com document.body.dataset.state para inspeção e testes
  useEffect(() => {
    shellStateRef.current = shellState;
    document.body.dataset.state = shellState;
  }, [shellState]);

  useEffect(() => {
    subModalRef.current = subModal;
  }, [subModal]);

  useEffect(() => {
    activeCutsceneRef.current = activeCutscene;
  }, [activeCutscene]);

  useEffect(() => {
    progressRef.current = progress;
    saveProgress(progress);
    if (audioRef.current) {
      audioRef.current.updateSettings(progress.settings);
    }
  }, [progress]);

  // Monitora Fullscreen nativo do navegador
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // Ignora em ambientes onde fullscreen é bloqueado
    }
  }, []);

  // Carrega uma fase específica no motor
  const loadStageIntoEngine = useCallback((idx: number, resetStats = true) => {
    const clampedIdx = Math.max(0, Math.min(LEVELS.length - 1, idx));
    const def = LEVELS[clampedIdx];
    currentLevelIdxRef.current = clampedIdx;
    setCurrentLevelIdx(clampedIdx);

    const alreadyHasFlake = progressRef.current.goldenFlakes.includes(def.id);
    const runtime = new LevelRuntime(def, alreadyHasFlake);
    levelRuntimeRef.current = runtime;

    const player = new Player(runtime.spawnX, runtime.spawnY);
    playerRef.current = player;

    if (cameraRef.current) {
      cameraRef.current.snapTo(
        player.x,
        player.y,
        runtime.widthPx,
        runtime.heightPx
      );
      cameraRef.current.irisState = 'opening';
      cameraRef.current.irisProgress = 0.05;
      cameraRef.current.irisFocusX = Math.round(player.x - cameraRef.current.x);
      cameraRef.current.irisFocusY = Math.round(player.y - cameraRef.current.y);
    }

    if (particlesRef.current) {
      particlesRef.current.emitRespawnShimmer(player.x, player.y - 6);
    }

    if (audioRef.current) {
      audioRef.current.setWorldTheme(def.world);
    }

    if (inputRef.current) {
      inputRef.current.clearAll();
      inputRef.current.resetHoverToggle();
    }

    if (resetStats) {
      stageTimeRef.current = 0;
      stageDeathsRef.current = 0;
      setStageDeaths(0);
    }
    setGoldenInRun(alreadyHasFlake);
  }, []);

  // Finaliza a cutscene atual e avança para a fase ou vitória
  const finishCutscene = useCallback(() => {
    const cs = activeCutsceneRef.current;
    if (cs) {
      setProgress((prev) =>
        prev.seenCutscenes.includes(cs.id)
          ? prev
          : { ...prev, seenCutscenes: [...prev.seenCutscenes, cs.id] }
      );
    }

    setActiveCutscene(null);
    activeCutsceneRef.current = null;

    if (pendingClearSnapshotRef.current) {
      const snap = pendingClearSnapshotRef.current;
      pendingClearSnapshotRef.current = null;
      setClearSnapshot(snap);
      setShellState('gameover');
      document.body.dataset.state = 'gameover';
      return;
    }

    if (pendingLevelAfterCutsceneRef.current !== null) {
      const nextIdx = pendingLevelAfterCutsceneRef.current;
      pendingLevelAfterCutsceneRef.current = null;
      loadStageIntoEngine(nextIdx, true);
      setShellState('playing');
      document.body.dataset.state = 'playing';
      return;
    }

    // Caso tenha sido aberta pelo menu de história, volta ao mapa
    setShellState('title');
    document.body.dataset.state = 'title';
    setSubModal('map');
  }, [loadStageIntoEngine]);

  // Abre uma cutscene manualmente para reassistir pelo Mapa
  const watchCutscene = useCallback((cs: CutsceneDef) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audioRef.current?.playUiClick();
    pendingLevelAfterCutsceneRef.current = null;
    pendingClearSnapshotRef.current = null;
    setSubModal('none');
    setActiveCutscene(cs);
    activeCutsceneRef.current = cs;
    setShellState('cutscene');
    document.body.dataset.state = 'cutscene';
  }, []);

  // Inicia o jogo a partir do Título ou Seleção de Fases (com cutscene automática na 1ª vez)
  const startGameAtLevel = useCallback(
    (levelIdx: number) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      if (audioRef.current) {
        audioRef.current.playUiClick();
      }
      setSubModal('none');
      setClearSnapshot(null);

      const clampedIdx = Math.max(0, Math.min(LEVELS.length - 1, levelIdx));
      const def = LEVELS[clampedIdx];
      const introCutscene = getCutsceneBeforeLevel(def.id);

      if (
        introCutscene &&
        !isAutostart &&
        !progressRef.current.seenCutscenes.includes(introCutscene.id)
      ) {
        pendingLevelAfterCutsceneRef.current = clampedIdx;
        pendingClearSnapshotRef.current = null;
        if (audioRef.current) audioRef.current.setWorldTheme(def.world);
        setActiveCutscene(introCutscene);
        activeCutsceneRef.current = introCutscene;
        setShellState('cutscene');
        document.body.dataset.state = 'cutscene';
        return;
      }

      loadStageIntoEngine(clampedIdx, true);
      setShellState('playing');
      document.body.dataset.state = 'playing';
    },
    [isAutostart, loadStageIntoEngine]
  );

  // Reinicia a fase atual instantaneamente
  const restartCurrentStage = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const runtime = levelRuntimeRef.current;
    const player = playerRef.current;
    const particles = particlesRef.current;
    if (runtime && player && particles) {
      // Reinicia da origem da fase
      const def = LEVELS[currentLevelIdxRef.current];
      const alreadyHasFlake = progressRef.current.goldenFlakes.includes(def.id);
      const freshRuntime = new LevelRuntime(def, alreadyHasFlake);
      levelRuntimeRef.current = freshRuntime;
      player.spawnAt(freshRuntime.spawnX, freshRuntime.spawnY);
      particles.emitRespawnShimmer(player.x, player.y - 6);
      if (audioRef.current) audioRef.current.playRespawn();
      stageTimeRef.current = 0;
      stageDeathsRef.current = 0;
      setStageDeaths(0);
      setGoldenInRun(alreadyHasFlake);
    }
    setSubModal('none');
    setShellState('playing');
    document.body.dataset.state = 'playing';
  }, []);

  // Alterna Pausa
  const togglePause = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (shellStateRef.current === 'playing') {
      if (audioRef.current) {
        audioRef.current.pauseAudioLoops();
        audioRef.current.playUiClick();
      }
      setSubModal('none');
      setShellState('paused');
      document.body.dataset.state = 'paused';
    } else if (shellStateRef.current === 'paused') {
      if (audioRef.current) audioRef.current.playUiClick();
      setSubModal('none');
      if (inputRef.current) inputRef.current.clearAll();
      setShellState('playing');
      document.body.dataset.state = 'playing';
    }
  }, []);

  // Alterna Mute
  const toggleMute = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setProgress((prev) => ({
      ...prev,
      settings: { ...prev.settings, muted: !prev.settings.muted },
    }));
  }, []);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setProgress((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  }, []);

  // Atalho de teclado Enter / Space na tela de título ou vitória e F para Tela Cheia
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (subModalRef.current !== 'none') {
        if (e.code === 'Escape') {
          setSubModal('none');
        }
        return;
      }
      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (
        shellStateRef.current === 'title' &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        startGameAtLevel(0);
      } else if (
        shellStateRef.current === 'gameover' &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        const nextIdx =
          currentLevelIdxRef.current + 1 < LEVELS.length
            ? currentLevelIdxRef.current + 1
            : 0;
        startGameAtLevel(nextIdx);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startGameAtLevel, toggleFullscreen]);

  // Monta o Motor Canvas 2D e Game Loop com Timestep Fixo de 60 FPS (Acumulador)
  useEffect(() => {
    const input = new InputManager();
    const audio = new AudioEngine(progressRef.current.settings);
    const particles = new ParticleSystem();
    const camera = new Camera();
    const diegeticHud = new DiegeticCanvasHUD();

    inputRef.current = input;
    audioRef.current = audio;
    particlesRef.current = particles;
    cameraRef.current = camera;
    diegeticHudRef.current = diegeticHud;

    loadStageIntoEngine(0, true);

    let animFrameId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let globalClock = 0;

    const tickFixedStep = (dt: number) => {
      globalClock += dt;
      input.update(progressRef.current.settings.hoverMode);

      if (input.state.muteJustPressed) {
        toggleMute();
      }

      if (
        input.state.pauseJustPressed &&
        (shellStateRef.current === 'playing' || shellStateRef.current === 'paused')
      ) {
        togglePause();
        return;
      }

      // Cena viva na Tela de Título ou Cutscene animada
      if (shellStateRef.current === 'title' || shellStateRef.current === 'cutscene') {
        particles.update(dt, -22);
        return;
      }

      if (shellStateRef.current !== 'playing') {
        particles.update(dt * 0.3, 0);
        return;
      }

      const level = levelRuntimeRef.current;
      const player = playerRef.current;
      if (!level || !player) return;

      // Reinício rápido com tecla R
      if (input.state.restartJustPressed && player.animState !== 'dead') {
        player.triggerDeath(particles);
        audio.playDeath();
        camera.addShake(0.45, progressRef.current.settings.screenShake);
        stageDeathsRef.current += 1;
        setStageDeaths(stageDeathsRef.current);
        setProgress((prev) => ({ ...prev, totalDeaths: prev.totalDeaths + 1 }));
        return;
      }

      // Hit-stop de 2 a 4 frames em eventos fortes (renderização e câmera continuam)
      if (camera.hitstopFrames > 0) {
        camera.hitstopFrames--;
        camera.update(dt, player.x, player.y, player.vx, level.widthPx, level.heightPx);
        particles.update(dt * 0.25, 0);
        return;
      }

      // Cronômetro da fase
      if (player.animState !== 'dead' && camera.irisState === 'idle') {
        stageTimeRef.current += dt;
      }

      level.update(dt);
      const { events, respawnedNow } = player.update(dt, input.state, level, particles);

      if (respawnedNow) {
        audio.playRespawn();
      }

      // Respostas de Áudio, Câmera e Hit-stop para Eventos da Física
      if (events.hoverActivated) {
        audio.playHoverToggle(true);
      } else if (events.hoverDeactivated) {
        audio.playHoverToggle(false);
      }

      if (events.jumped) {
        audio.playJump(events.chargedJump);
        if (events.chargedJump) {
          camera.addShake(0.28, progressRef.current.settings.screenShake);
        }
      }

      if (events.landed && events.landSpeed > 65) {
        audio.playLand(events.landSpeed);
        if (events.landSpeed > 135) {
          camera.addShake(0.22, progressRef.current.settings.screenShake);
        }
      }

      if (events.crystalCollected) {
        audio.playCrystal();
        camera.triggerHitstop(CONFIG.FEEL.HITSTOP_LIGHT_FRAMES);
      }

      if (events.springBounced) {
        audio.playSpring();
        camera.triggerHitstop(CONFIG.FEEL.HITSTOP_LIGHT_FRAMES);
        camera.addShake(0.32, progressRef.current.settings.screenShake);
      }

      if (events.blockShattered) {
        audio.playBlockBreak();
        camera.triggerHitstop(CONFIG.FEEL.HITSTOP_HEAVY_FRAMES);
        camera.addShake(0.52, progressRef.current.settings.screenShake);
      }

      if (events.boostRingHit) {
        audio.playBoostRing();
        camera.triggerHitstop(CONFIG.FEEL.HITSTOP_LIGHT_FRAMES);
        camera.addShake(0.36, progressRef.current.settings.screenShake);
      }

      if (events.keyCollected) {
        audio.playKeyUnlock();
        camera.triggerHitstop(CONFIG.FEEL.HITSTOP_LIGHT_FRAMES);
        camera.addShake(0.3, progressRef.current.settings.screenShake);
      }

      if (events.checkpointReached) {
        audio.playCrystal();
      }

      if (events.goldenCollected) {
        audio.playGoldenFlake();
        camera.triggerHitstop(CONFIG.FEEL.HITSTOP_LIGHT_FRAMES);
        setGoldenInRun(true);
      }

      if (events.died) {
        audio.playDeath();
        camera.triggerHitstop(CONFIG.FEEL.HITSTOP_HEAVY_FRAMES);
        camera.addShake(0.6, progressRef.current.settings.screenShake);
        stageDeathsRef.current += 1;
        setStageDeaths(stageDeathsRef.current);
        setProgress((prev) => ({ ...prev, totalDeaths: prev.totalDeaths + 1 }));
      }

      // Chegou ao Portal/Cume da Fase!
      if (events.goalReached && camera.irisState === 'idle') {
        audio.playStageClear();
        audio.pauseAudioLoops();
        const finishedIdx = currentLevelIdxRef.current;
        const finishedDef = LEVELS[finishedIdx];
        const clearTime = Number(stageTimeRef.current.toFixed(2));
        const deaths = stageDeathsRef.current;
        const gotGolden = Boolean(level.goldenFlake?.collected);

        camera.startIrisTransition(player.x, player.y - 6, () => {
          const prevBest = progressRef.current.bestTimes[finishedDef.id];
          const newBest =
            prevBest === undefined ? clearTime : Math.min(prevBest, clearTime);

          setProgress((prev) => {
            const nextUnlocked = Math.min(
              LEVELS.length,
              Math.max(prev.unlockedLevel, finishedDef.id + 1)
            );
            const completed = prev.completedLevels.includes(finishedDef.id)
              ? prev.completedLevels
              : [...prev.completedLevels, finishedDef.id];
            const flakes =
              gotGolden && !prev.goldenFlakes.includes(finishedDef.id)
                ? [...prev.goldenFlakes, finishedDef.id]
                : prev.goldenFlakes;
            const prevMinDeaths = prev.bestDeaths[finishedDef.id];
            const newMinDeaths =
              prevMinDeaths === undefined ? deaths : Math.min(prevMinDeaths, deaths);

            return {
              ...prev,
              unlockedLevel: nextUnlocked,
              completedLevels: completed,
              goldenFlakes: flakes,
              bestTimes: { ...prev.bestTimes, [finishedDef.id]: newBest },
              bestDeaths: { ...prev.bestDeaths, [finishedDef.id]: newMinDeaths },
            };
          });

          const snap: StageClearSnapshot = {
            levelId: finishedDef.id,
            levelTitle: finishedDef.title,
            worldName: finishedDef.worldName,
            clearTime,
            bestTime: newBest,
            stageDeaths: deaths,
            goldenCollected: gotGolden,
            isFinalLevel: finishedIdx === LEVELS.length - 1,
          };

          const outroCutscene = getCutsceneAfterLevel(finishedDef.id);
          if (
            outroCutscene &&
            !isAutostart &&
            !progressRef.current.seenCutscenes.includes(outroCutscene.id)
          ) {
            pendingClearSnapshotRef.current = snap;
            pendingLevelAfterCutsceneRef.current = null;
            setActiveCutscene(outroCutscene);
            activeCutsceneRef.current = outroCutscene;
            setShellState('cutscene');
            document.body.dataset.state = 'cutscene';
            return;
          }

          setClearSnapshot(snap);
          setShellState('gameover');
          document.body.dataset.state = 'gameover';
        });
      }

      const activeWindX =
        level.windZones.length > 0 ? level.windZones[0].vx * 0.25 : 0;
      particles.update(dt, activeWindX);
      camera.update(dt, player.x, player.y, player.vx, level.widthPx, level.heightPx);
      diegeticHud.update(dt, player.hoverEnergy);
      audio.update(
        dt,
        player.isHovering,
        Math.hypot(player.vx, player.vy),
        player.onGround,
        player.onIce,
        false
      );
    };

    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      if (shellStateRef.current === 'title') {
        const demoLevel = levelRuntimeRef.current;
        // Montanhas ancoradas na composição com balanço muito suave de parallax
        const titleCamX = Math.sin(globalClock * 0.28) * 6;
        const titleCamY = Math.sin(globalClock * 0.36) * 1.2;
        if (demoLevel) {
          demoLevel.tilemap.renderBackground(ctx, titleCamX, titleCamY, 1, globalClock);
        }
        particles.renderSnowLayer(ctx, 0, 0, 0);
        particles.renderSnowLayer(ctx, 1, 0, 0);
        renderTitleShowcase(ctx, globalClock);
        particles.renderSnowLayer(ctx, 2, 0, 0);
        return;
      }

      if (shellStateRef.current === 'cutscene' && activeCutsceneRef.current) {
        renderCutsceneCanvas(ctx, activeCutsceneRef.current, globalClock);
        particles.renderSnowLayer(ctx, 0, 0, 0);
        particles.renderSnowLayer(ctx, 2, 0, 0);
        return;
      }

      const level = levelRuntimeRef.current;
      const player = playerRef.current;
      if (!level || !player) return;

      const camX = camera.renderX;
      const camY = camera.renderY;

      // 1. Fundo em Parallax (Estrelas, Aurora, Montanhas e Ruínas)
      level.tilemap.renderBackground(ctx, camX, camY, level.def.world, globalClock);

      // 2. Neve distante
      particles.renderSnowLayer(ctx, 0, camX, camY);

      // 3. Tiles do cenário e Objetos interativos
      level.tilemap.render(ctx, camX, camY, globalClock);
      level.renderObjects(ctx, camX, camY, globalClock, player.isHovering);

      // 4. Neve intermediária + Rastros fantasmas + Partículas + Maya
      particles.renderSnowLayer(ctx, 1, camX, camY);
      particles.renderGhosts(ctx, camX, camY);
      particles.renderWorldParticles(ctx, camX, camY);
      player.render(ctx, camX, camY);

      // 5. Barrinha de energia diegética perto da Maya + Neve frontal
      diegeticHud.renderPlayerMeters(ctx, player, camX, camY);
      particles.renderSnowLayer(ctx, 2, camX, camY);

      // 6. Transição Iris Wipe circular
      camera.renderIrisWipe(ctx);
    };

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      // Clamped dt (<= 0.05s) para evitar tunneling após troca de aba
      const clampedDt = Math.min(rawDt, 0.05);
      accumulator += clampedDt;

      while (accumulator >= CONFIG.FIXED_DT) {
        tickFixedStep(CONFIG.FIXED_DT);
        accumulator -= CONFIG.FIXED_DT;
      }

      renderFrame();
      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
      input.destroy();
      audio.pauseAudioLoops();
    };
  }, [isAutostart, loadStageIntoEngine, toggleMute, togglePause]);

  const activeLevelDef = LEVELS[currentLevelIdx] || LEVELS[0];
  const totalGoldenCount = progress.goldenFlakes.length;

  return (
    <main className="relative w-screen h-screen bg-[#060b16] overflow-hidden select-none">
      {/* Canvas em Tela Cheia Real (320x180 escalado sem bordas pretas, crisp pixelated) */}
      <canvas
        ref={canvasRef}
        width={CONFIG.CANVAS_WIDTH}
        height={CONFIG.CANVAS_HEIGHT}
        data-testid="game-canvas"
        className="pixel-canvas w-full h-full block"
      />

      {/* =====================================================================
          1. TELA DE TÍTULO (SNOW SKY — Pixel Art Steam Indie + Jelly UI)
         ===================================================================== */}
      {shellState === 'title' && subModal === 'none' && (
        <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-5 md:p-8">
          {/* Topo: Progresso discreto da montanha */}
          <div className="flex items-center justify-between text-xs tracking-wider text-[#bae6fd] drop-shadow-[0_2px_0_#0b101d]">
            <span className="pixel-hud-box px-3 py-1.5 text-[10px] md:text-xs text-[#e0f2fe]">
              MONTANHA BOREAL · 3 MUNDOS · 10 FASES
            </span>
            <span className="pixel-hud-box px-3 py-1.5 font-mono-tabular flex items-center gap-2 text-[#fbbf24] text-[10px] md:text-xs">
              <svg width="14" height="14" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                <path
                  fill="#fbbf24"
                  d="M7 1h2v5h5v2H9v5H7V8H2V6h5V1zM4 4h2v2H4V4zm6 0h2v2h-2V4zM4 10h2v2H4v-2zm6 0h2v2h-2v-2z"
                />
              </svg>
              {totalGoldenCount}/10
            </span>
          </div>

          {/* Esquerda-Centro: Logo Pixel Art SNOW SKY + Botões Pixel-Art Jelly */}
          <div className="my-auto mr-auto ml-auto md:ml-10 max-w-lg w-full flex flex-col items-center md:items-start text-center md:text-left pointer-events-auto">
            <SnowSkyLogo />

            <p className="text-xs md:text-sm text-[#f1f5f9] mb-6 max-w-md leading-relaxed drop-shadow-[0_2px_0_#0b101d]">
              Deslize pelo gelo, escale paredes cristalinas e quique pelos céus da montanha congelada.
            </p>

            {/* Botões principais estilo Steam Indie Pixel Art + Jelly Effect */}
            <div className="flex flex-col sm:flex-row gap-3.5 w-full md:justify-start">
              <button
                type="button"
                data-start="true"
                onClick={() =>
                  startGameAtLevel(
                    Math.min(LEVELS.length - 1, progress.unlockedLevel - 1)
                  )
                }
                className="pixel-btn pixel-btn-cyan px-6 py-3 font-bold text-sm tracking-wider whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
                  <path fill="#091120" d="M2 1h2v2h2v2h2v2H6v2H4v2H2V1z" />
                </svg>
                {progress.unlockedLevel > 1 ? 'CONTINUAR' : 'JOGAR AGORA'}
              </button>

              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  setSubModal('map');
                }}
                className="pixel-btn pixel-btn-blue px-5 py-3 text-xs tracking-wider whitespace-nowrap shrink-0"
              >
                FASES ({progress.unlockedLevel}/10)
              </button>

              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  setSubModal('options');
                }}
                className="pixel-btn pixel-btn-slate px-5 py-3 text-xs tracking-wider whitespace-nowrap shrink-0"
              >
                OPÇÕES
              </button>
            </div>
          </div>

          <div />
        </div>
      )}

      {/* =====================================================================
          1b. CUTSCENES DA HISTÓRIA (Retrato animado + Caixa estilo Celeste)
         ===================================================================== */}
      {shellState === 'cutscene' && activeCutscene && subModal === 'none' && (
        <CutsceneOverlay
          cutscene={activeCutscene}
          audio={audioRef.current}
          onFinish={finishCutscene}
        />
      )}

      {/* =====================================================================
          2. HUD DE JOGO (Limpo sem caixa superior ou dicas visuais)
         ===================================================================== */}
      {shellState === 'playing' && (
        <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-4">
          {/* Topo Direito: apenas botões utilitários compactos */}
          <div className="flex items-start justify-end">
            {/* Cluster Superior Direito: Botões Utilitários Pixel Art + Jelly */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                tabIndex={-1}
                aria-label={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleFullscreen();
                }}
                className="pixel-btn pixel-btn-slate w-10 h-10 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                  <path
                    fill="#7dd3fc"
                    d="M2 2h4v2H4v2H2V2zm8 0h4v4h-2V4h-2V2zM2 10h2v2h2v2H2v-4zm10 2v-2h2v4h-4v-2h2z"
                  />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label={progress.settings.muted ? 'Ativar Som' : 'Silenciar Som'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleMute();
                }}
                className="pixel-btn pixel-btn-slate w-10 h-10 flex items-center justify-center"
              >
                {progress.settings.muted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                    <path fill="#94a3b8" d="M2 6h3l3-3h1v10H8l-3-3H2V6z" />
                    <path fill="#f43f5e" d="M10 5h2v2h2V5h1v2h-1v2h1v2h-2V9h-2v2h-1V9h1V7h-1V5z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                    <path fill="#38bdf8" d="M2 6h3l3-3h1v10H8l-3-3H2V6z" />
                    <rect x="11" y="5" width="1" height="6" fill="#7dd3fc" />
                    <rect x="13" y="3" width="1" height="10" fill="#bae6fd" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Reiniciar Fase"
                onClick={(e) => {
                  e.currentTarget.blur();
                  restartCurrentStage();
                }}
                className="pixel-btn pixel-btn-slate w-10 h-10 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                  <path
                    fill="#e2f1ff"
                    d="M5 3h6v2h2v5h-2v2H5v-2h6V5H5v2H3V4h2V3zm-2 6h2v2H3V9zm2-6h2v2H5V3z"
                  />
                  <path fill="#22d3ee" d="M3 2h2v2H3V2zm0 2h2v2H3V4zm-2 0h2v2H1V4z" />
                </svg>
              </button>

              <button
                type="button"
                tabIndex={-1}
                aria-label="Pausar Jogo"
                onClick={(e) => {
                  e.currentTarget.blur();
                  togglePause();
                }}
                className="pixel-btn pixel-btn-blue w-10 h-10 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                  <rect x="4" y="3" width="3" height="10" fill="#7dd3fc" />
                  <rect x="9" y="3" width="3" height="10" fill="#7dd3fc" />
                </svg>
              </button>
            </div>
          </div>

          <div />
        </div>
      )}

      {/* =====================================================================
          3. MODAL DE PAUSA (Pixel Art Panel + Botões Jelly)
         ===================================================================== */}
      {shellState === 'paused' && subModal === 'none' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Jogo Pausado"
          className="fixed inset-0 bg-[#050912]/80 flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="pixel-panel p-6 max-w-md w-full">
            {/* Neve decorativa pixelada no topo do modal */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#5eead4] tracking-widest uppercase">
                {activeLevelDef.worldName}
              </span>
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-[#38bdf8] inline-block" />
                <span className="w-2 h-2 bg-[#ffffff] inline-block" />
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#f8fafc] mb-4 drop-shadow-[0_2px_0_#050912]">
              PAUSA · {activeLevelDef.title}
            </h2>

            <div className="pixel-inset grid grid-cols-3 gap-2 mb-6 p-3">
              <div>
                <div className="text-[9px] text-[#94a3b8]">TEMPO</div>
                <div className="font-mono-tabular text-sm font-bold text-[#e0f2fe]">
                  {formatTime(stageTimeRef.current)}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#94a3b8]">MORTES</div>
                <div className="font-mono-tabular text-sm font-bold text-[#f43f5e]">
                  {stageDeaths}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#94a3b8]">FLOCO</div>
                <div className="text-xs font-bold text-[#fbbf24]">
                  {goldenInRun ? 'COLETADO' : 'PENDENTE'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={togglePause}
                className="pixel-btn pixel-btn-cyan w-full py-2.5 font-bold text-xs tracking-wider"
              >
                CONTINUAR
              </button>

              <button
                type="button"
                onClick={restartCurrentStage}
                className="pixel-btn pixel-btn-blue w-full py-2.5 text-xs tracking-wider"
              >
                REINICIAR FASE
              </button>

              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  setSubModal('map');
                }}
                className="pixel-btn pixel-btn-blue w-full py-2.5 text-xs tracking-wider"
              >
                MAPA DA MONTANHA
              </button>

              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  setSubModal('options');
                }}
                className="pixel-btn pixel-btn-slate w-full py-2.5 text-xs tracking-wider"
              >
                OPÇÕES
              </button>

              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  setShellState('title');
                  document.body.dataset.state = 'title';
                }}
                className="pixel-btn pixel-btn-slate w-full py-2.5 text-xs tracking-wider text-[#94a3b8]"
              >
                TELA INICIAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. MODAL DE FASE CONCLUÍDA / VITÓRIA NO CUME ('gameover')
         ===================================================================== */}
      {shellState === 'gameover' && clearSnapshot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fase Concluída"
          className="fixed inset-0 bg-[#050912]/85 flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="pixel-panel p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#5eead4] tracking-widest uppercase">
                {clearSnapshot.isFinalLevel
                  ? 'CUME ESTRELADO ALCANÇADO!'
                  : `${clearSnapshot.worldName} · CONCLUÍDA`}
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
                <path
                  fill={clearSnapshot.goldenCollected ? '#fbbf24' : '#334155'}
                  d="M7 1h2v5h5v2H9v5H7V8H2V6h5V1zM4 4h2v2H4V4zm6 0h2v2h-2V4zM4 10h2v2H4v-2zm6 0h2v2h-2v-2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#f8fafc] mb-4 drop-shadow-[0_2px_0_#050912]">
              {clearSnapshot.levelTitle}
            </h2>

            <div className="pixel-inset grid grid-cols-3 gap-2 mb-6 p-3.5">
              <div>
                <div className="text-[9px] text-[#94a3b8]">TEMPO</div>
                <div className="font-mono-tabular text-sm font-bold text-[#22d3ee]">
                  {formatTime(clearSnapshot.clearTime)}
                </div>
                <div className="font-mono-tabular text-[10px] text-[#64748b]">
                  Melhor: {formatTime(clearSnapshot.bestTime)}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#94a3b8]">MORTES</div>
                <div className="font-mono-tabular text-sm font-bold text-[#f43f5e]">
                  {clearSnapshot.stageDeaths}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#94a3b8]">FLOCO</div>
                <div className="text-xs font-bold text-[#fbbf24] mt-0.5">
                  {clearSnapshot.goldenCollected ? 'OBTIDO' : 'PENDENTE'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {!clearSnapshot.isFinalLevel ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startGameAtLevel(currentLevelIdx + 1)}
                  className="pixel-btn pixel-btn-cyan w-full py-3 font-bold text-xs tracking-wider"
                >
                  PRÓXIMA FASE
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={() => startGameAtLevel(0)}
                  className="pixel-btn pixel-btn-gold w-full py-3 font-bold text-xs tracking-wider"
                >
                  REJOGAR DO INÍCIO
                </button>
              )}

              <button
                type="button"
                onClick={() => startGameAtLevel(currentLevelIdx)}
                className="pixel-btn pixel-btn-blue w-full py-2.5 text-xs tracking-wider"
              >
                REPETIR FASE
              </button>

              <button
                type="button"
                onClick={() => {
                  setClearSnapshot(null);
                  setSubModal('map');
                  setShellState('title');
                }}
                className="pixel-btn pixel-btn-slate w-full py-2.5 text-xs tracking-wider"
              >
                MAPA DA MONTANHA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. SUB-MODAL: MAPA DA MONTANHA (Seleção das 10 Fases em Pixel Art Jelly)
         ===================================================================== */}
      {subModal === 'map' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mapa da Montanha - Seleção de Fases"
          className="fixed inset-0 bg-[#050912]/88 flex items-center justify-center p-4 pointer-events-auto z-20"
        >
          <div className="pixel-panel p-5 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#1e3a5f] pb-3">
              <div>
                <div className="text-[10px] text-[#5eead4] tracking-widest uppercase">
                  SELEÇÃO DE FASES · 3 MUNDOS
                </div>
                <h2 className="text-base md:text-lg font-bold text-[#f8fafc] drop-shadow-[0_2px_0_#050912]">
                  MAPA DA MONTANHA
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  setSubModal('none');
                }}
                className="pixel-btn pixel-btn-slate px-3.5 py-1.5 text-xs"
              >
                FECHAR
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              {LEVELS.map((lvl, idx) => {
                const isCompleted = progress.completedLevels.includes(lvl.id);
                const hasFlake = progress.goldenFlakes.includes(lvl.id);
                const bestTime = progress.bestTimes[lvl.id];

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => startGameAtLevel(idx)}
                    className={`pixel-btn text-left p-3 flex items-center justify-between gap-2 ${
                      idx === currentLevelIdx && shellState !== 'title'
                        ? 'pixel-btn-blue'
                        : 'pixel-btn-slate'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[9px] text-[#5eead4] uppercase tracking-wider">
                        Mundo {lvl.world} · {lvl.worldName}
                      </div>
                      <div className="text-xs font-bold text-[#f8fafc] truncate">
                        {lvl.title}
                      </div>
                      <div className="font-mono-tabular text-[10px] text-[#94a3b8] mt-0.5">
                        {bestTime !== undefined
                          ? `Melhor: ${formatTime(bestTime)}`
                          : isCompleted
                          ? 'Concluída'
                          : 'Disponível'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        shapeRendering="crispEdges"
                        aria-hidden="true"
                      >
                        <path
                          fill={hasFlake ? '#fbbf24' : '#334155'}
                          d="M7 1h2v5h5v2H9v5H7V8H2V6h5V1zM4 4h2v2H4V4zm6 0h2v2h-2V4zM4 10h2v2H4v-2zm6 0h2v2h-2v-2z"
                        />
                      </svg>
                      <span className="px-2 py-1 bg-[#070e1c] border border-[#38bdf8] text-[10px] text-[#7dd3fc]">
                        JOGAR
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cenas da História para Reassistir */}
            <div className="mt-4 pt-3 border-t-2 border-[#1e3a5f]">
              <div className="text-[10px] text-[#5eead4] tracking-widest uppercase mb-2">
                CENAS DA HISTÓRIA
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.values(CUTSCENES).map((cs) => (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => watchCutscene(cs)}
                    className="pixel-btn pixel-btn-blue px-3 py-1.5 text-[10px] font-bold tracking-wider"
                  >
                    {cs.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. SUB-MODAL: OPÇÕES (Pixel Art + Jelly Controls)
         ===================================================================== */}
      {subModal === 'options' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opções"
          className="fixed inset-0 bg-[#050912]/88 flex items-center justify-center p-4 pointer-events-auto z-20"
        >
          <div className="pixel-panel p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#1e3a5f] pb-3">
              <h2 className="text-base font-bold text-[#f8fafc] drop-shadow-[0_2px_0_#050912]">
                OPÇÕES
              </h2>
              <button
                type="button"
                onClick={() => {
                  audioRef.current?.playUiClick();
                  setSubModal('none');
                }}
                className="pixel-btn pixel-btn-slate px-3.5 py-1.5 text-xs"
              >
                FECHAR
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Modo do Hover: Segurar vs Alternar */}
              <div className="pixel-inset flex items-center justify-between p-3 gap-3">
                <div>
                  <div className="font-bold text-[#f8fafc]">MODO DO HOVER</div>
                  <div className="text-[10px] text-[#94a3b8]">
                    Comportamento ao ativar a prancha
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioRef.current?.playUiClick();
                    updateSettings({
                      hoverMode:
                        progress.settings.hoverMode === 'hold' ? 'toggle' : 'hold',
                    });
                  }}
                  className="pixel-btn pixel-btn-cyan px-3 py-1.5 font-bold text-[11px] whitespace-nowrap shrink-0"
                >
                  {progress.settings.hoverMode === 'hold' ? 'SEGURAR' : 'ALTERNAR'}
                </button>
              </div>

              {/* Volume da Música */}
              <div className="pixel-inset p-3">
                <div className="flex justify-between mb-2">
                  <label htmlFor="music-vol" className="font-bold text-[#f8fafc]">
                    MÚSICA
                  </label>
                  <span className="font-mono-tabular text-[#38bdf8]">
                    {Math.round(progress.settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  id="music-vol"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(progress.settings.musicVolume * 100)}
                  onChange={(e) =>
                    updateSettings({ musicVolume: Number(e.target.value) / 100 })
                  }
                  className="pixel-range w-full cursor-pointer"
                />
              </div>

              {/* Volume dos Efeitos Sonoros */}
              <div className="pixel-inset p-3">
                <div className="flex justify-between mb-2">
                  <label htmlFor="sfx-vol" className="font-bold text-[#f8fafc]">
                    EFEITOS SONOROS
                  </label>
                  <span className="font-mono-tabular text-[#38bdf8]">
                    {Math.round(progress.settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  id="sfx-vol"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(progress.settings.sfxVolume * 100)}
                  onChange={(e) =>
                    updateSettings({ sfxVolume: Number(e.target.value) / 100 })
                  }
                  className="pixel-range w-full cursor-pointer"
                />
              </div>

              {/* Screen Shake */}
              <div className="pixel-inset flex items-center justify-between p-3">
                <span className="font-bold text-[#f8fafc]">TREMOR DE TELA</span>
                <button
                  type="button"
                  onClick={() => {
                    audioRef.current?.playUiClick();
                    updateSettings({ screenShake: !progress.settings.screenShake });
                  }}
                  className={`pixel-btn px-3 py-1 text-[11px] font-bold ${
                    progress.settings.screenShake ? 'pixel-btn-cyan' : 'pixel-btn-slate'
                  }`}
                >
                  {progress.settings.screenShake ? 'LIGADO' : 'DESLIGADO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
