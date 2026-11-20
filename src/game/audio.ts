import { LevelId } from './types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private ambienceTimer: number | null = null;
  private windNode: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private currentLevel: LevelId = 1;
  private restorationLevel = 0;
  private musicPlaying = false;
  private stepIndex = 0;
  private musicVolume = 0.75;
  private sfxVolume = 0.85;

  public init(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.muted ? 0 : 0.16 * this.musicVolume;
      this.musicGain.connect(this.ctx.destination);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = this.muted ? 0 : 0.13 * this.sfxVolume;
      this.ambienceGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.muted ? 0 : 0.34 * this.sfxVolume;
      this.sfxGain.connect(this.ctx.destination);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGainTargets();
  }

  public setVolumes(musicVolume: number, sfxVolume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, musicVolume));
    this.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
    this.applyGainTargets();
  }

  private applyGainTargets(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.16 * this.musicVolume,
        t,
        0.06,
      );
    }
    if (this.ambienceGain) {
      this.ambienceGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.13 * this.sfxVolume,
        t,
        0.06,
      );
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.34 * this.sfxVolume,
        t,
        0.06,
      );
    }
  }

  public setRestorationLevel(level: number): void {
    this.restorationLevel = Math.max(0, Math.min(1, level));
  }

  private startWindAndWaterLoop(): void {
    if (!this.ctx || !this.ambienceGain || this.windNode) return;

    // 3-second soft pink-noise loop for wind & flowing water ambience
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.018) * 0.35;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = this.currentLevel === 2 ? 520 : 680;
    filter.Q.value = 0.7;

    src.connect(filter);
    filter.connect(this.ambienceGain);
    src.start();

    this.windNode = src;
    this.windFilter = filter;
  }

  public startMusic(levelId: LevelId): void {
    this.init();
    this.currentLevel = levelId;
    this.startWindAndWaterLoop();

    if (this.musicPlaying) return;
    this.musicPlaying = true;

    const scheduleMusic = () => {
      if (!this.musicPlaying) return;
      if (this.ctx && this.musicGain && !this.muted && this.ctx.state === 'running') {
        this.playCinematicBeat(this.stepIndex);
        this.stepIndex = (this.stepIndex + 1) % 16;
      }
      this.musicTimer = window.setTimeout(scheduleMusic, 480);
    };
    scheduleMusic();

    const scheduleNature = () => {
      if (!this.musicPlaying) return;
      if (this.ctx && this.ambienceGain && !this.muted && this.ctx.state === 'running') {
        // Modulate wind/water filter gently
        if (this.windFilter) {
          const baseFreq = this.currentLevel === 2 ? 440 : 620;
          const mod = Math.sin(this.ctx.currentTime * 0.5) * 180;
          this.windFilter.frequency.setTargetAtTime(baseFreq + mod, this.ctx.currentTime, 0.4);
        }
        // Birds chirp more frequently as the world restores (especially Forest & Restored City)
        const birdChance =
          this.currentLevel === 1
            ? 0.32 + this.restorationLevel * 0.48
            : this.currentLevel === 2
              ? 0.2
              : this.restorationLevel * 0.55;
        if (Math.random() < birdChance) {
          this.playBirdChirp();
        }
      }
      this.ambienceTimer = window.setTimeout(scheduleNature, 1300 + Math.random() * 1400);
    };
    scheduleNature();
  }

  public setLevelMusic(levelId: LevelId): void {
    this.currentLevel = levelId;
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ambienceTimer !== null) {
      clearTimeout(this.ambienceTimer);
      this.ambienceTimer = null;
    }
    if (this.windNode) {
      try {
        this.windNode.stop();
      } catch {
        // ignore already stopped
      }
      this.windNode.disconnect();
      this.windNode = null;
    }
    if (this.windFilter) {
      this.windFilter.disconnect();
      this.windFilter = null;
    }
  }

  private playBirdChirp(): void {
    if (!this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const chirps = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < chirps; i++) {
      const start = now + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const base = 1850 + Math.random() * 900;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.25), start + 0.055);
      osc.frequency.exponentialRampToValueAtTime(base * 0.9, start + 0.11);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(this.ambienceGain);
      osc.start(start);
      osc.stop(start + 0.13);
    }
  }

  private playCinematicBeat(step: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    const progressions: Record<LevelId, number[][]> = {
      1: [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [196.0, 246.94, 293.66, 392.0],  // G6
      ],
      2: [
        [293.66, 369.99, 440.0, 554.37], // Dmaj7
        [246.94, 293.66, 369.99, 440.0], // Bm7
        [196.0, 246.94, 293.66, 369.99], // Gmaj7
        [220.0, 277.18, 329.63, 440.0],  // A6
      ],
      3: [
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [196.0, 246.94, 293.66, 349.23], // G7sus
      ],
    };

    const bar = Math.floor(step / 4) % 4;
    const chord = progressions[this.currentLevel][bar];

    // Warm sustained pad on chord change
    if (step % 4 === 0) {
      chord.slice(0, 3).forEach((freq, idx) => {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(idx === 0 ? freq * 0.5 : freq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900 + this.restorationLevel * 500, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.22 : 0.11, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 1.9);
      });
    }

    // Gentle acoustic-like harp arpeggio
    const arpIdx = [0, 1, 2, 3, 2, 1, 3, 2][step % 8];
    const arpFreq = chord[arpIdx % chord.length] * (step % 8 === 6 ? 2 : 1);
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(arpFreq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.28,
    slideToFreq?: number,
    delay = 0,
  ): void {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  public playJump(): void {
    this.playTone(195, 0.19, 'sine', 0.24, 410);
  }

  public playStep(): void {
    this.playTone(88 + Math.random() * 24, 0.06, 'triangle', 0.08, 58);
  }

  public playWaterStep(): void {
    if (this.muted) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate;
    const len = Math.floor(sampleRate * 0.14);
    const buf = this.ctx.createBuffer(1, len, sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 950 + Math.random() * 350;
    filter.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
  }

  public playCollect(): void {
    this.playTone(523.25, 0.12, 'triangle', 0.26, 659.25);
    this.playTone(783.99, 0.2, 'sine', 0.25, undefined, 0.07);
  }

  public playSeedCollect(): void {
    const notes = [659.25, 880, 1174.66];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.22, 'sine', 0.24, undefined, idx * 0.055);
    });
  }

  public playRiverClean(): void {
    const notes = [392.0, 523.25, 659.25, 987.77];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.26, 'sine', 0.25, f * 1.03, idx * 0.06);
    });
  }

  public playPlantTree(): void {
    const notes = [329.63, 440.0, 554.37, 659.25, 880.0];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.28, 'triangle', 0.24, undefined, idx * 0.065);
    });
  }

  public playRescue(): void {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.24, 'sine', 0.26, f * 1.04, idx * 0.06);
    });
  }

  public playMachineOff(): void {
    this.playTone(170, 0.35, 'sawtooth', 0.2, 52);
    this.playTone(523.25, 0.24, 'sine', 0.24, undefined, 0.2);
  }

  public playRecycle(): void {
    this.playTone(587.33, 0.14, 'sine', 0.26);
    this.playTone(880.0, 0.24, 'triangle', 0.24, undefined, 0.09);
  }

  public playCoreRestore(): void {
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, idx) => {
      this.playTone(f, 1.0, 'triangle', 0.24, undefined, idx * 0.075);
    });
  }

  public playLevelComplete(): void {
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((f, idx) => {
      this.playTone(f, 0.42, 'triangle', 0.28, undefined, idx * 0.11);
    });
  }

  public playVictory(): void {
    const anthem = [523.25, 659.25, 783.99, 659.25, 783.99, 1046.5, 1318.51];
    anthem.forEach((f, idx) => {
      this.playTone(f, 0.55, 'triangle', 0.3, undefined, idx * 0.13);
    });
  }

  public playGameOver(): void {
    const notes = [329.63, 293.66, 246.94, 196.0];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.36, 'sawtooth', 0.16, f * 0.92, idx * 0.14);
    });
  }
}

export const soundEngine = new SoundEngine();
