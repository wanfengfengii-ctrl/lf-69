const STRING_FREQUENCIES = [
  0,
  65.41,
  73.42,
  82.41,
  98.0,
  110.0,
  123.47,
  146.83,
];

const HUI_RATIOS = [
  { hui: 0.5, ratio: 0.984 },
  { hui: 1, ratio: 0.969 },
  { hui: 1.5, ratio: 0.954 },
  { hui: 2, ratio: 0.938 },
  { hui: 2.5, ratio: 0.922 },
  { hui: 3, ratio: 0.906 },
  { hui: 3.5, ratio: 0.889 },
  { hui: 4, ratio: 0.872 },
  { hui: 4.5, ratio: 0.854 },
  { hui: 5, ratio: 0.836 },
  { hui: 5.5, ratio: 0.817 },
  { hui: 6, ratio: 0.798 },
  { hui: 6.5, ratio: 0.778 },
  { hui: 7, ratio: 0.758 },
  { hui: 7.5, ratio: 0.737 },
  { hui: 8, ratio: 0.715 },
  { hui: 8.5, ratio: 0.693 },
  { hui: 9, ratio: 0.67 },
  { hui: 9.5, ratio: 0.647 },
  { hui: 10, ratio: 0.623 },
  { hui: 10.5, ratio: 0.598 },
  { hui: 11, ratio: 0.573 },
  { hui: 11.5, ratio: 0.547 },
  { hui: 12, ratio: 0.52 },
  { hui: 12.5, ratio: 0.493 },
  { hui: 13, ratio: 0.465 },
];

export function calculateFrequency(stringIndex: number, huiPosition: number): number {
  const baseFreq = STRING_FREQUENCIES[stringIndex] || 110;
  const huiEntry = HUI_RATIOS.find((h) => h.hui === huiPosition);
  const ratio = huiEntry ? huiEntry.ratio : 0.758;
  return baseFreq / ratio;
}

export class GuqinAudio {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playNote(
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'sine',
  ): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const actualStart = now + startTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, actualStart);
    gainNode.gain.linearRampToValueAtTime(0.5, actualStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, actualStart + duration);

    oscillator.connect(gainNode);
    if (this.masterGain) {
      gainNode.connect(this.masterGain);
    }

    oscillator.start(actualStart);
    oscillator.stop(actualStart + duration + 0.1);
  }

  playString(stringIndex: number, huiPosition: number, duration: number): void {
    const frequency = calculateFrequency(stringIndex, huiPosition);
    this.playNote(frequency, 0, duration, 'triangle');
  }

  stopAll(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    return this.audioContext.currentTime;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const guqinAudio = new GuqinAudio();
