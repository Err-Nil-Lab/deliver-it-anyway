import { GAME_CONFIG } from "./config";

let audioContext: AudioContext | null = null;

export type Sfx = "load" | "dispatch" | "success" | "bust" | "tick" | "upgrade";

export function playSfx(kind: Sfx): void {
  if (!GAME_CONFIG.juice.soundEnabled) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();

  const now = audioContext.currentTime;
  const notes: Record<Sfx, number[]> = {
    load: [520, 780],
    dispatch: [330, 245],
    success: [523, 659, 784],
    bust: [220, 165, 110],
    tick: [660],
    upgrade: [392, 523, 784],
  };
  notes[kind].forEach((frequency, index) => {
    const start = now + index * 0.075;
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);
    oscillator.connect(gain);
    gain.connect(audioContext!.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.09);
  });
}
