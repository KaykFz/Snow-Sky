import { GameSettings } from '../config';

interface WorldTrackConfig {
  tempoBpm: number;
  bassNotes: number[];
  arpNotes: number[][];
  padNotes: number[][];
}

const WORLD_TRACKS: Record<number, WorldTrackConfig> = {
  // Mundo 1: Encosta Nevada (Ré menor melancólico e aconchegante)
  1: {
    tempoBpm: 92,
    bassNotes: [38, 34, 41, 36], // D2, Bb1, F2, C2
    padNotes: [
      [50, 53, 57, 60], // Dm7
      [46, 50, 53, 57], // Bbmaj7
      [53, 57, 60, 64], // Fmaj7
      [48, 52, 55, 57], // C6
    ],
    arpNotes: [
      [62, 65, 69, 72, 69, 65, 62, 57],
      [58, 62, 65, 69, 65, 62, 58, 53],
      [65, 69, 72, 76, 72, 69, 65, 60],
      [60, 64, 67, 72, 67, 64, 60, 55],
    ],
  },
  // Mundo 2: Ruínas Congeladas (Lá menor cristalino e misterioso)
  2: {
    tempoBpm: 104,
    bassNotes: [33, 29, 36, 31], // A1, F1, C2, G1
    padNotes: [
      [45, 48, 52, 55], // Am7
      [41, 45, 48, 52], // Fmaj7
      [48, 52, 55, 59], // Cmaj7
      [43, 47, 50, 53], // G7
    ],
    arpNotes: [
      [69, 72, 76, 79, 76, 72, 69, 64],
      [65, 69, 72, 76, 72, 69, 65, 60],
      [72, 76, 79, 83, 79, 76, 72, 67],
      [67, 71, 74, 79, 74, 71, 67, 62],
    ],
  },
  // Mundo 3: Pico Gelado (Fá# menor intenso e estrelado)
  3: {
    tempoBpm: 118,
    bassNotes: [30, 26, 33, 28], // F#1, D1, A1, E1
    padNotes: [
      [42, 45, 49, 52], // F#m7
      [38, 42, 45, 49], // Dmaj7
      [45, 49, 52, 56], // Amaj7
      [40, 44, 47, 52], // E
    ],
    arpNotes: [
      [66, 69, 73, 76, 81, 76, 73, 69],
      [62, 66, 69, 73, 78, 73, 69, 66],
      [69, 73, 76, 80, 85, 80, 76, 73],
      [64, 68, 71, 76, 80, 76, 71, 68],
    ],
  },
};

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private hoverLayerGain: GainNode | null = null;

  // Loop contínuo do som de deslizar no gelo
  private slideOsc: OscillatorNode | null = null;
  private slideFilter: BiquadFilterNode | null = null;
  private slideGain: GainNode | null = null;

  private settings: GameSettings;
  private currentWorld = 1;
  private stepIndex = 0;
  private stepTimer = 0;
  private isPlayingMusic = false;
  private hoverIntensity = 0; // 0 a 1 (ativa camadas extras na música)

  constructor(settings: GameSettings) {
    this.settings = { ...settings };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.hoverLayerGain = this.ctx.createGain();

      this.hoverLayerGain.gain.value = 0;
      this.hoverLayerGain.connect(this.musicGain);
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);

      this.setupSlideLoop();
      this.applyVolumeSettings();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupSlideLoop(): void {
    if (!this.ctx || !this.sfxGain) return;
    try {
      this.slideOsc = this.ctx.createOscillator();
      this.slideOsc.type = 'triangle';
      this.slideOsc.frequency.value = 180;

      this.slideFilter = this.ctx.createBiquadFilter();
      this.slideFilter.type = 'bandpass';
      this.slideFilter.frequency.value = 520;
      this.slideFilter.Q.value = 3.5;

      this.slideGain = this.ctx.createGain();
      this.slideGain.gain.value = 0;

      this.slideOsc.connect(this.slideFilter);
      this.slideFilter.connect(this.slideGain);
      this.slideGain.connect(this.sfxGain);
      this.slideOsc.start();
    } catch {
      // Ignora em ambientes sem suporte de áudio
    }
  }

  public updateSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.applyVolumeSettings();
  }

  private applyVolumeSettings(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const mVol = this.settings.muted ? 0 : this.settings.musicVolume * 0.28;
    const sVol = this.settings.muted ? 0 : this.settings.sfxVolume * 0.45;
    this.musicGain.gain.setTargetAtTime(mVol, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(sVol, now, 0.04);
  }

  public setWorldTheme(world: number): void {
    if (this.currentWorld !== world) {
      this.currentWorld = world;
      this.stepIndex = 0;
    }
    this.isPlayingMusic = true;
  }

  public pauseAudioLoops(): void {
    if (this.ctx && this.slideGain) {
      this.slideGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    }
  }

  // Atualiza música dinâmica e som contínuo de deslizar no gelo
  public update(
    dt: number,
    isHovering: boolean,
    speed: number,
    onGround: boolean,
    onIce: boolean,
    isPaused: boolean
  ): void {
    if (!this.ctx) return;

    // 1. Camada dinâmica da música (entra quando o Hover está ativo em velocidade!)
    const targetIntensity =
      !isPaused && isHovering && speed > 65
        ? Math.min(1, (speed - 55) / 110)
        : 0;
    this.hoverIntensity += (targetIntensity - this.hoverIntensity) * Math.min(1, dt * 4.5);

    if (this.hoverLayerGain) {
      this.hoverLayerGain.gain.setTargetAtTime(
        this.hoverIntensity * 0.85,
        this.ctx.currentTime,
        0.08
      );
    }

    // 2. Som contínuo de deslizar no gelo com pitch conforme a velocidade
    if (this.slideGain && this.slideOsc && this.slideFilter) {
      if (!isPaused && isHovering && onGround && speed > 18) {
        const ratio = Math.min(1.4, speed / 140);
        const baseFreq = onIce ? 260 : 170;
        this.slideOsc.frequency.setTargetAtTime(
          baseFreq + ratio * 240,
          this.ctx.currentTime,
          0.04
        );
        this.slideFilter.frequency.setTargetAtTime(
          420 + ratio * 950,
          this.ctx.currentTime,
          0.04
        );
        this.slideGain.gain.setTargetAtTime(
          Math.min(0.22, ratio * 0.16),
          this.ctx.currentTime,
          0.04
        );
      } else {
        this.slideGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
    }

    // 3. Sequenciador da trilha chiptune/synthwave melancólica
    if (!this.isPlayingMusic || isPaused || this.settings.muted) return;

    const track = WORLD_TRACKS[this.currentWorld] || WORLD_TRACKS[1];
    const sixteenthSec = 60 / track.tempoBpm / 4;
    this.stepTimer += dt;

    if (this.stepTimer >= sixteenthSec) {
      this.stepTimer -= sixteenthSec;
      this.triggerSequencerStep(track, this.stepIndex, sixteenthSec);
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  private triggerSequencerStep(
    track: WorldTrackConfig,
    step: number,
    stepDur: number
  ): void {
    if (!this.ctx || !this.musicGain || !this.hoverLayerGain) return;
    const now = this.ctx.currentTime;
    const bar = Math.floor(step / 8) % 4;
    const sub = step % 8;

    // A. Pad suave e longo no início de cada compasso (8 steps)
    if (sub === 0) {
      const chord = track.padNotes[bar];
      for (const note of chord) {
        this.playSynthNote(
          midiToFreq(note),
          'sine',
          stepDur * 7.8,
          0.09,
          0.18,
          this.musicGain
        );
      }
      // Nota de baixo quente
      this.playSynthNote(
        midiToFreq(track.bassNotes[bar]),
        'triangle',
        stepDur * 3.8,
        0.18,
        0.05,
        this.musicGain
      );
    } else if (sub === 4) {
      // Segunda batida do baixo
      this.playSynthNote(
        midiToFreq(track.bassNotes[bar] + 12),
        'triangle',
        stepDur * 3.2,
        0.13,
        0.04,
        this.musicGain
      );
    }

    // B. Arpejo melancólico principal (estilo Celeste)
    const arpNote = track.arpNotes[bar][sub];
    this.playSynthNote(
      midiToFreq(arpNote),
      'triangle',
      stepDur * 1.4,
      0.11,
      0.02,
      this.musicGain
    );

    // C. Camada extra dinâmica do Hover (arpejo oitava acima + percussão leve)
    if (this.hoverIntensity > 0.08) {
      this.playSynthNote(
        midiToFreq(arpNote + 12),
        'sine',
        stepDur * 0.9,
        0.14,
        0.01,
        this.hoverLayerGain
      );
      if (sub % 2 === 0) {
        this.playPercussionTick(
          now,
          sub === 4 ? 220 : 880,
          sub === 4 ? 0.07 : 0.035,
          this.hoverLayerGain
        );
      }
    }
  }

  private playSynthNote(
    freq: number,
    type: OscillatorType,
    duration: number,
    peakGain: number,
    attack: number,
    dest: AudioNode
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playPercussionTick(
    now: number,
    freq: number,
    dur: number,
    dest: AudioNode
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + dur);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  // ==================== EFEITOS SONOROS (SFX) ====================

  public playJump(charged: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = charged ? 'sawtooth' : 'square';
    const startFreq = charged ? 240 : 190;
    const endFreq = charged ? 680 : 440;
    const dur = charged ? 0.18 : 0.12;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

    gain.gain.setValueAtTime(charged ? 0.24 : 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  public playLand(impactSpeed: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const ratio = Math.min(1, impactSpeed / 160);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125 + ratio * 35, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.08);

    gain.gain.setValueAtTime(0.12 + ratio * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playHoverToggle(active: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (active) {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(590, now + 0.11);
    } else {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.09);
    }

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCrystal(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const notes = [587.33, 783.99, 1046.5]; // D5, G5, C6
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.19);
    });
  }

  public playSpring(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.22);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playBlockBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const freqs = [320, 480, 190];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.025);
      osc.frequency.exponentialRampToValueAtTime(75, now + idx * 0.025 + 0.12);
      gain.gain.setValueAtTime(0.22, now + idx * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 0.13);
    });
  }

  public playDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playRespawn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.038;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.15);
    });
  }

  public playGoldenFlake(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.29);
    });
  }

  public playStageClear(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.045);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playBoostRing(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const freqs = [330, 494, 659, 988];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.025);
      osc.frequency.exponentialRampToValueAtTime(f * 1.35, now + idx * 0.025 + 0.14);
      gain.gain.setValueAtTime(0.18, now + idx * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + idx * 0.025);
      osc.stop(now + idx * 0.025 + 0.16);
    });
  }

  public playKeyUnlock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const now = ctx.currentTime + i * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.23);
    });
  }

  public playDialogueBlip(speaker: 'maya' | 'luma' | 'echo'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const base = speaker === 'maya' ? 360 : speaker === 'luma' ? 760 : 250;
    const jitter = (Math.random() - 0.5) * 45;
    osc.type = speaker === 'luma' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(base + jitter, now);
    osc.frequency.exponentialRampToValueAtTime(base + jitter * 0.5 + 35, now + 0.036);

    gain.gain.setValueAtTime(speaker === 'luma' ? 0.09 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }
}
