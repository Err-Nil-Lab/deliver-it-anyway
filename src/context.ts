import kaplay from "kaplay";
import { GAME_CONFIG } from "./config";
import { createShiftState, createUpgrades, type Package } from "./shiftState";
import "./style.css";

const root = document.querySelector<HTMLElement>("#game");

if (!root) throw new Error("Game root element was not found.");

const { arena, colors } = GAME_CONFIG;

export const k = kaplay({
  root,
  width: arena.width,
  height: arena.height,
  stretch: true,
  letterbox: true,
  background: colors.background,
  font: "monospace",
  global: false,
  crisp: true,
  debug: false,
});

export const fg = k.Color.fromHex(colors.foreground);
export const muted = k.Color.fromHex(colors.muted);
export const danger = k.Color.fromHex(colors.danger);
export const safe = k.Color.fromHex(colors.safe);
export const caution = k.Color.fromHex(colors.caution);

export type Scene = "MENU" | "HOWTO" | "PLAY";
export type Drag = { pkg: Package; fromTruckId: number | null; offsetX: number; offsetY: number };

export const upgrades = createUpgrades();

/** Mutable game session shared by the scenes. `state` is replaced on each new shift. */
export const session = {
  state: createShiftState(0, upgrades),
  scene: "MENU" as Scene,
  drag: null as Drag | null,
  logSeen: 0,
  flash: 0,
};

// Transient feedback, cleared between shifts.
export const banners: { truckId: number; text: string; remaining: number; bust: boolean }[] = [];
export const overlays: { text: string; remaining: number; bust: boolean }[] = [];
export const loadedAt = new Map<number, number>();
export const routeTicks = new Map<number, number>();

export function formatMoney(value: number): string {
  return value < 0 ? `-$${Math.abs(value)}` : `$${value}`;
}

export function chanceColor(chance: number): typeof fg {
  if (chance >= GAME_CONFIG.risk.safeAt) return safe;
  if (chance >= GAME_CONFIG.risk.cautionAt) return caution;
  return danger;
}

export function inside(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
