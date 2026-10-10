import kaplay from "kaplay";
import { GAME_CONFIG } from "./config";
import {
  buyUpgrade,
  createShiftState,
  createUpgrades,
  getUpgradeCost,
  deliver,
  getTruckChance,
  getTruckLoad,
  getTruckValue,
  loadPackage,
  tickShift,
  unloadPackage,
  type Package,
  type UpgradeKey,
  type Truck,
} from "./shiftState";
import { calculateDeliveryChance } from "./systems/risk";
import "./style.css";

const root = document.querySelector<HTMLElement>("#game");

if (!root) throw new Error("Game root element was not found.");

const { arena, colors, ui, juice, shift } = GAME_CONFIG;
const UPGRADE_KEYS: UpgradeKey[] = ["capacity", "duration", "spawn", "trucks"];
const upgrades = createUpgrades();
let state = createShiftState(0, upgrades);

const k = kaplay({
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

const fg = k.Color.fromHex(colors.foreground);
const muted = k.Color.fromHex(colors.muted);
const danger = k.Color.fromHex(colors.danger);
const safe = k.Color.fromHex(colors.safe);
const caution = k.Color.fromHex(colors.caution);

function formatMoney(value: number): string {
  return value < 0 ? `-$${Math.abs(value)}` : `$${value}`;
}

function chanceColor(chance: number): typeof fg {
  if (chance >= GAME_CONFIG.risk.safeAt) return safe;
  if (chance >= GAME_CONFIG.risk.cautionAt) return caution;
  return danger;
}

// Greybox layout. Positions are derived from state each frame; nothing is cached.
// One shared left edge with the header text (24 px).
const EDGE = 24;
const BED = { x: EDGE, width: arena.width - EDGE * 2, firstY: 130 };

// With three trucks the beds compress so the queue below keeps its place.
function bedHeight(): number {
  return state.trucks.length > 2 ? 100 : 150;
}

function bedGap(): number {
  return state.trucks.length > 2 ? 50 : 70;
}
const BOX = { height: 84, gap: 10 };
const QUEUE = { x: EDGE, y: 560, maxRows: 2 };
const CARGO_SCALE = 0.8;

// Card width follows load, so heavier packages look heavier. Visual only: bed space is not a rule.
function cardWidth(load: number, scale = 1): number {
  return Math.round(Math.min(200, Math.max(92, 64 + load * 2.2)) * scale);
}
const DELIVER_BUTTON = { width: 130, height: 28 };
const BANNER_SECONDS = 2.5;
const ROUTE_DOTS = 8;
const START_BUTTON = { x: 300, y: 430, width: 200, height: 52 };
const HOWTO_BUTTON = { x: 300, y: 498, width: 200, height: 44 };
const BACK_BUTTON = { x: 300, y: 560, width: 200, height: 44 };
let scene: "MENU" | "HOWTO" | "PLAY" = "MENU";
const NEXT_BUTTON = { x: 300, y: 640, width: 200, height: 44 };

type Drag = { pkg: Package; fromTruckId: number | null; offsetX: number; offsetY: number };
let drag: Drag | null = null;
let audioContext: AudioContext | null = null;
let logSeen = 0;
let flash = 0;
const banners: { truckId: number; text: string; remaining: number; bust: boolean }[] = [];
const overlays: { text: string; remaining: number; bust: boolean }[] = [];
const loadedAt = new Map<number, number>();
const routeTicks = new Map<number, number>();

type Sfx = "load" | "dispatch" | "success" | "bust" | "tick" | "upgrade";

function playSfx(kind: Sfx): void {
  if (!juice.soundEnabled) return;
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

function bedY(truck: Truck): number {
  return BED.firstY + truck.id * (bedHeight() + bedGap());
}

type Slot = { x: number; y: number; w: number };

function cargoLayout(truck: Truck): Slot[] {
  let x = BED.x + 12;
  const y = bedY(truck) + (bedHeight() - BOX.height) / 2;
  return truck.cargo.map((pkg) => {
    const w = cardWidth(pkg.load, CARGO_SCALE);
    const slot = { x, y, w };
    x += w + BOX.gap;
    return slot;
  });
}

// Queue flows left to right; if it would need more than QUEUE.maxRows rows, cards shrink to fit.
function queueLayout(): Slot[] {
  for (let scale = 1; scale >= 0.55; scale -= 0.05) {
    const slots: Slot[] = [];
    let x = QUEUE.x;
    let row = 0;
    for (const pkg of state.queue) {
      const w = cardWidth(pkg.load, scale);
      if (x > QUEUE.x && x + w > QUEUE.x + BED.width) {
        x = QUEUE.x;
        row += 1;
      }
      slots.push({ x, y: QUEUE.y + row * (BOX.height + BOX.gap), w });
      x += w + BOX.gap;
    }
    if (row < QUEUE.maxRows) return slots;
  }
  return state.queue.map((_, index) => ({ x: QUEUE.x + index * 40, y: QUEUE.y, w: 92 }));
}

/** How far a package exceeds the roomiest truck's remaining safe capacity, or null if it fits safely. */
function overBy(pkg: Package): number | null {
  const open = state.trucks.filter((truck) => truck.status === "LOADING");
  if (open.length === 0) return null;
  const room = Math.max(...open.map((truck) => truck.capacity - getTruckLoad(truck)));
  return pkg.load > room ? pkg.load - Math.max(0, room) : null;
}

function deliverButtonPos(truck: Truck): { x: number; y: number } {
  return { x: BED.x + BED.width - DELIVER_BUTTON.width, y: bedY(truck) - 38 };
}

function canDeliver(truck: Truck): boolean {
  return state.phase === "RUNNING" && truck.status === "LOADING" && truck.cargo.length > 0;
}

function pressDeliver(px: number, py: number): boolean {
  for (const truck of state.trucks) {
    const pos = deliverButtonPos(truck);
    if (!inside(px, py, pos.x, pos.y, DELIVER_BUTTON.width, DELIVER_BUTTON.height)) continue;
    if (canDeliver(truck) && deliver(state, truck.id)) {
      playSfx("dispatch");
      k.shake(juice.dispatchShake);
    }
    return true;
  }
  return false;
}

function startGame(): void {
  scene = "PLAY";
}

function drawMenu(): void {
  const cx = arena.width / 2;
  const bg = k.Color.fromHex(colors.background);

  k.drawText({ text: "DELIVER IT", size: 72, pos: k.vec2(cx, 220), anchor: "center", color: fg });
  k.drawText({ text: "ANYWAY", size: 72, pos: k.vec2(cx, 300), anchor: "center", color: fg });

  k.drawRect({ pos: k.vec2(START_BUTTON.x, START_BUTTON.y), width: START_BUTTON.width, height: START_BUTTON.height, color: fg });
  k.drawText({
    text: "START",
    size: 26,
    pos: k.vec2(START_BUTTON.x + START_BUTTON.width / 2, START_BUTTON.y + START_BUTTON.height / 2),
    anchor: "center",
    color: bg,
  });

  k.drawRect({
    pos: k.vec2(HOWTO_BUTTON.x, HOWTO_BUTTON.y),
    width: HOWTO_BUTTON.width,
    height: HOWTO_BUTTON.height,
    fill: false,
    outline: { width: ui.frameWidth, color: muted },
  });
  k.drawText({
    text: "HOW TO PLAY",
    size: 18,
    pos: k.vec2(HOWTO_BUTTON.x + HOWTO_BUTTON.width / 2, HOWTO_BUTTON.y + HOWTO_BUTTON.height / 2),
    anchor: "center",
    color: muted,
  });
}

function drawHowTo(): void {
  const cx = arena.width / 2;
  const bg = k.Color.fromHex(colors.background);
  const lines = [
    "1  DRAG packages into a truck.",
    "2  Over capacity = DUAR chance.",
    "3  Press DELIVER. Trucks run in parallel.",
    "4  Beat the clock. Upgrade between shifts.",
  ];

  k.drawText({ text: "HOW TO PLAY", size: 40, pos: k.vec2(cx, 170), anchor: "center", color: fg });
  lines.forEach((line, index) => {
    k.drawText({ text: line, size: 22, pos: k.vec2(120, 280 + index * 52), color: fg });
  });

  k.drawRect({ pos: k.vec2(BACK_BUTTON.x, BACK_BUTTON.y), width: BACK_BUTTON.width, height: BACK_BUTTON.height, color: fg });
  k.drawText({
    text: "BACK",
    size: 20,
    pos: k.vec2(BACK_BUTTON.x + BACK_BUTTON.width / 2, BACK_BUTTON.y + BACK_BUTTON.height / 2),
    anchor: "center",
    color: bg,
  });
}

function startNextShift(): void {
  state = createShiftState(state.wallet, upgrades);
  logSeen = 0;
  banners.length = 0;
  flash = 0;
  drag = null;
}

function pressNextShift(px: number, py: number): boolean {
  if (state.phase !== "REPORT") return false;
  if (inside(px, py, NEXT_BUTTON.x, NEXT_BUTTON.y, NEXT_BUTTON.width, NEXT_BUTTON.height)) startNextShift();
  else pressUpgrade(px, py);
  return true;
}

function collectResults(): void {
  while (logSeen < state.log.length) {
    const entry = state.log[logSeen];
    logSeen += 1;
    const bust = entry.outcome === "BUST";
    banners.push({
      truckId: entry.truckId,
      text: bust ? `DUAR  -$${entry.repairCost} REPAIR` : `SUCCESS DELIVERED  +$${entry.payout}`,
      remaining: BANNER_SECONDS,
      bust,
    });
    playSfx(bust ? "bust" : "success");
    if (bust) overlays.push({ text: "DUAR", remaining: juice.overlaySeconds, bust: true });
    else if (entry.payout >= juice.bigPayout) {
      overlays.push({ text: "BIG DELIVERY", remaining: juice.overlaySeconds, bust: false });
    }
    k.shake(bust ? juice.bustShake : juice.successShake);
    if (bust) flash = 0.3;
  }
}

function inside(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function truckAt(px: number, py: number): Truck | undefined {
  return state.trucks.find((truck) => inside(px, py, BED.x, bedY(truck), BED.width, bedHeight()));
}

function pickPackage(px: number, py: number): Drag | null {
  for (const truck of state.trucks) {
    if (truck.status !== "LOADING") continue;
    for (let i = 0; i < truck.cargo.length; i += 1) {
      const pos = cargoLayout(truck)[i];
      if (inside(px, py, pos.x, pos.y, pos.w, BOX.height)) {
        return { pkg: truck.cargo[i], fromTruckId: truck.id, offsetX: px - pos.x, offsetY: py - pos.y };
      }
    }
  }

  const slots = queueLayout();
  for (let i = 0; i < state.queue.length; i += 1) {
    const pos = slots[i];
    if (inside(px, py, pos.x, pos.y, pos.w, BOX.height)) {
      return { pkg: state.queue[i], fromTruckId: null, offsetX: px - pos.x, offsetY: py - pos.y };
    }
  }

  return null;
}

function dropPackage(held: Drag, px: number, py: number): void {
  const target = truckAt(px, py);

  if (held.fromTruckId !== null && target?.id === held.fromTruckId) return;

  if (held.fromTruckId !== null) {
    if (!unloadPackage(state, held.fromTruckId, held.pkg.id)) return;
    if (target && loadPackage(state, target.id, held.pkg.id)) {
      loadedAt.set(held.pkg.id, k.time());
      playSfx("load");
      return;
    }
    // Dropped outside a bed, or target refused the package: it goes back to the queue (already unloaded).
    return;
  }

  if (target && loadPackage(state, target.id, held.pkg.id)) {
    loadedAt.set(held.pkg.id, k.time());
    playSfx("load");
  }
}

// Rarity is shape-only: single frame (common), double frame (rare), double frame + solid header (jackpot).
function drawBox(x: number, y: number, pkg: Package, highlight: boolean, width: number, heavy: boolean): void {
  const bg = k.Color.fromHex(colors.background);
  const ink = highlight ? bg : fg;
  const headerHeight = 22;

  k.drawRect({
    pos: k.vec2(x, y),
    width,
    height: BOX.height,
    color: highlight ? fg : bg,
    outline: { width: ui.frameWidth, color: fg },
  });

  if (pkg.rarity >= 1) {
    k.drawRect({
      pos: k.vec2(x + 5, y + 5),
      width: width - 10,
      height: BOX.height - 10,
      fill: false,
      outline: { width: 1, color: ink },
    });
  }

  if (pkg.rarity >= 2) {
    k.drawRect({ pos: k.vec2(x + 2, y + 2), width: width - 4, height: headerHeight, color: ink });
    k.drawText({
      text: pkg.name,
      size: ui.text.small,
      pos: k.vec2(x + 10, y + 7),
      color: highlight ? fg : bg,
    });
  } else {
    k.drawText({ text: pkg.name, size: ui.text.small, pos: k.vec2(x + 10, y + 9), color: highlight ? bg : muted });
  }

  const valueY = pkg.rarity >= 2 ? y + 28 : y + 26;
  k.drawText({ text: `$${pkg.value}`, size: ui.text.key, pos: k.vec2(x + 10, valueY), color: ink });

  if (heavy && !highlight) {
    k.drawRect({ pos: k.vec2(x + 2, y + BOX.height - 22), width: width - 4, height: 20, color: danger });
    k.drawText({ text: `HEAVY  ${pkg.load}`, size: ui.text.small, pos: k.vec2(x + 10, y + BOX.height - 19), color: bg });
  } else {
    k.drawText({ text: `LOAD ${pkg.load}`, size: ui.text.small, pos: k.vec2(x + 10, y + BOX.height - 19), color: ink });
  }
}

k.onUpdate(() => {
  if (scene !== "PLAY") return;
  const dt = Math.min(k.dt(), 0.1);
  tickShift(state, dt);
  collectResults();

  for (let i = banners.length - 1; i >= 0; i -= 1) {
    banners[i].remaining -= dt;
    if (banners[i].remaining <= 0) banners.splice(i, 1);
  }
  flash = Math.max(0, flash - dt);

  for (let i = overlays.length - 1; i >= 0; i -= 1) {
    overlays[i].remaining -= dt;
    if (overlays[i].remaining <= 0) overlays.splice(i, 1);
  }

  for (const truck of state.trucks) {
    if (truck.status !== "EN_ROUTE") {
      routeTicks.delete(truck.id);
      continue;
    }
    const progress = 1 - truck.timeRemaining / shift.routeSeconds;
    const dotIndex = Math.floor(progress * (ROUTE_DOTS - 1));
    if (routeTicks.get(truck.id) !== dotIndex) {
      if (routeTicks.has(truck.id)) playSfx("tick");
      routeTicks.set(truck.id, dotIndex);
    }
  }
});

k.onMousePress(() => {
  const mouse = k.mousePos();
  if (scene === "MENU") {
    if (inside(mouse.x, mouse.y, START_BUTTON.x, START_BUTTON.y, START_BUTTON.width, START_BUTTON.height)) startGame();
    else if (inside(mouse.x, mouse.y, HOWTO_BUTTON.x, HOWTO_BUTTON.y, HOWTO_BUTTON.width, HOWTO_BUTTON.height)) scene = "HOWTO";
    return;
  }
  if (scene === "HOWTO") {
    if (inside(mouse.x, mouse.y, BACK_BUTTON.x, BACK_BUTTON.y, BACK_BUTTON.width, BACK_BUTTON.height)) scene = "MENU";
    return;
  }
  if (pressNextShift(mouse.x, mouse.y)) return;
  if (pressDeliver(mouse.x, mouse.y)) return;
  drag = pickPackage(mouse.x, mouse.y);
});

k.onKeyPress(["enter", "space"], () => {
  if (scene === "MENU") startGame();
  else if (scene === "HOWTO") scene = "MENU";
  else if (state.phase === "REPORT") startNextShift();
});

k.onKeyPress("escape", () => {
  if (scene === "HOWTO") scene = "MENU";
});

k.onKeyPress("h", () => {
  if (scene === "MENU") scene = "HOWTO";
});

k.onMouseRelease(() => {
  if (!drag) return;
  const mouse = k.mousePos();
  const held = drag;
  drag = null;
  dropPackage(held, mouse.x, mouse.y);
});

const UPGRADE_ROW = { x: 100, firstY: 410, step: 54, buttonWidth: 150, buttonHeight: 36 };

function upgradeButtonPos(index: number): { x: number; y: number } {
  return {
    x: arena.width - UPGRADE_ROW.x - 24 - UPGRADE_ROW.buttonWidth,
    y: UPGRADE_ROW.firstY + index * UPGRADE_ROW.step,
  };
}

function upgradeEffect(key: UpgradeKey): string {
  const defs = GAME_CONFIG.upgrades;
  const level = upgrades[key];
  switch (key) {
    case "capacity":
      return `${shift.truckCapacity + level * defs.capacity.perLevel} -> ${shift.truckCapacity + (level + 1) * defs.capacity.perLevel} LOAD`;
    case "duration":
      return `${shift.durationSeconds + level * defs.duration.perLevel} -> ${shift.durationSeconds + (level + 1) * defs.duration.perLevel}s`;
    case "spawn":
      return `${Math.max(1, shift.spawnIntervalSeconds - level * defs.spawn.perLevel)} -> ${Math.max(1, shift.spawnIntervalSeconds - (level + 1) * defs.spawn.perLevel)}s PER PKG`;
    case "trucks":
      return `${shift.truckCount + level} -> ${shift.truckCount + level + 1} TRUCKS`;
  }
}

function pressUpgrade(px: number, py: number): void {
  UPGRADE_KEYS.forEach((key, index) => {
    const pos = upgradeButtonPos(index);
    if (inside(px, py, pos.x, pos.y, UPGRADE_ROW.buttonWidth, UPGRADE_ROW.buttonHeight)) {
      if (buyUpgrade(state, upgrades, key)) {
        playSfx("upgrade");
        k.shake(juice.upgradeShake);
      }
    }
  });
}

function drawReport(): void {
  const successes = state.log.filter((entry) => entry.outcome === "SUCCESS").length;
  const busts = state.log.length - successes;
  const gross = state.log.reduce((sum, entry) => sum + entry.payout, 0);
  const repairs = state.log.reduce((sum, entry) => sum + entry.repairCost, 0);
  const net = gross - repairs;
  const perMinute = state.elapsed > 0 ? Math.round((net / state.elapsed) * 60) : 0;
  const x = 60;
  const y = 70;

  k.drawRect({
    pos: k.vec2(x, y),
    width: arena.width - x * 2,
    height: 640,
    color: k.Color.fromHex(colors.background),
    outline: { width: ui.frameWidth * 2, color: fg },
  });
  k.drawText({ text: "SHIFT REPORT", size: ui.text.key, pos: k.vec2(arena.width / 2, y + 40), anchor: "center", color: fg });

  const rows: [string, string, typeof fg][] = [
    ["DELIVERIES", `${state.log.length}  (${successes} OK / ${busts} DUAR)`, fg],
    ["PAYOUT", `$${gross}`, gross > 0 ? safe : fg],
    ["REPAIR COST", `-$${repairs}`, repairs > 0 ? danger : fg],
    ["NET", `$${net}`, fg],
    ["PER MINUTE", `$${perMinute}`, fg],
    ["WALLET", formatMoney(state.wallet), state.wallet < 0 ? danger : fg],
  ];
  rows.forEach(([label, value, valueColor], index) => {
    const rowY = y + 86 + index * 34;
    k.drawText({ text: label, size: ui.text.body, pos: k.vec2(x + 40, rowY), color: muted });
    k.drawText({ text: value, size: ui.text.body, pos: k.vec2(arena.width - x - 40, rowY), anchor: "topright", color: valueColor });
  });

  k.drawText({ text: "UPGRADES", size: ui.text.body, pos: k.vec2(x + 40, UPGRADE_ROW.firstY - 40), color: muted });

  UPGRADE_KEYS.forEach((key, index) => {
    const def = GAME_CONFIG.upgrades[key];
    const level = upgrades[key];
    const cost = getUpgradeCost(upgrades, key);
    const rowY = UPGRADE_ROW.firstY + index * UPGRADE_ROW.step;
    const affordable = cost !== null && state.wallet >= cost;
    const pos = upgradeButtonPos(index);

    k.drawText({ text: `${def.label}  LV ${level}/${def.maxLevel}`, size: ui.text.body, pos: k.vec2(x + 40, rowY), color: fg });
    k.drawText({
      text: cost === null ? "MAX" : upgradeEffect(key),
      size: ui.text.small,
      pos: k.vec2(x + 40, rowY + 22),
      color: muted,
    });
    k.drawRect({
      pos: k.vec2(pos.x, pos.y),
      width: UPGRADE_ROW.buttonWidth,
      height: UPGRADE_ROW.buttonHeight,
      color: affordable ? fg : k.Color.fromHex(colors.background),
      outline: { width: ui.frameWidth, color: affordable ? fg : muted },
    });
    k.drawText({
      text: cost === null ? "MAXED" : `BUY $${cost}`,
      size: ui.text.small,
      pos: k.vec2(pos.x + UPGRADE_ROW.buttonWidth / 2, pos.y + UPGRADE_ROW.buttonHeight / 2),
      anchor: "center",
      color: affordable ? k.Color.fromHex(colors.background) : muted,
    });
  });

  k.drawRect({
    pos: k.vec2(NEXT_BUTTON.x, NEXT_BUTTON.y),
    width: NEXT_BUTTON.width,
    height: NEXT_BUTTON.height,
    color: fg,
  });
  k.drawText({
    text: "NEXT SHIFT",
    size: ui.text.body,
    pos: k.vec2(NEXT_BUTTON.x + NEXT_BUTTON.width / 2, NEXT_BUTTON.y + NEXT_BUTTON.height / 2),
    anchor: "center",
    color: k.Color.fromHex(colors.background),
  });
}

k.onDraw(() => {
  const mouse = k.mousePos();

  if (flash > 0) {
    k.drawRect({ pos: k.vec2(0, 0), width: arena.width, height: arena.height, color: danger, opacity: flash });
  }

  // Frame: border on top/left/right and a footer floor, like PROCEED ANYWAY.
  const { borderSize, floorHeight } = arena;
  k.drawRect({ pos: k.vec2(0, 0), width: arena.width, height: borderSize, color: fg });
  k.drawRect({ pos: k.vec2(0, 0), width: borderSize, height: arena.height, color: fg });
  k.drawRect({ pos: k.vec2(arena.width - borderSize, 0), width: borderSize, height: arena.height, color: fg });
  k.drawRect({ pos: k.vec2(0, arena.height - floorHeight), width: arena.width, height: floorHeight, color: fg });
  k.drawText({
    text: "ERR NIL // 002",
    size: ui.text.small,
    pos: k.vec2(24, arena.height - floorHeight / 2),
    anchor: "left",
    color: k.Color.fromHex(colors.footer),
  });

  if (scene === "MENU") {
    drawMenu();
    return;
  }
  if (scene === "HOWTO") {
    drawHowTo();
    return;
  }

  const secondsLeft = Math.ceil(state.timeRemaining);
  k.drawText({
    text: `WALLET ${formatMoney(state.wallet)}`,
    size: ui.text.key,
    pos: k.vec2(24, 28),
    color: state.wallet < 0 ? danger : fg,
  });
  const urgent = state.phase === "RUNNING" && secondsLeft <= 10;
  const timeText = `TIME ${secondsLeft}`;
  const inverted = urgent && Math.floor(k.time() * 2) % 2 === 0;
  if (inverted) {
    const width = k.formatText({ text: timeText, size: ui.text.key }).width;
    k.drawRect({ pos: k.vec2(arena.width - 24 - width - 8, 24), width: width + 16, height: 36, color: caution });
  }
  k.drawText({
    text: timeText,
    size: ui.text.key,
    pos: k.vec2(arena.width - 24, 28),
    anchor: "topright",
    color: inverted ? k.Color.fromHex(colors.background) : fg,
  });
  if (state.phase === "RUNNING" && state.queue.length >= shift.maxQueue) {
    const label = "QUEUE FULL";
    const width = k.formatText({ text: label, size: ui.text.small }).width;
    k.drawRect({ pos: k.vec2(24, 62), width: width + 16, height: 22, color: fg });
    k.drawText({ text: label, size: ui.text.small, pos: k.vec2(32, 66), color: k.Color.fromHex(colors.background) });
  }
  if (state.phase !== "RUNNING") {
    k.drawText({ text: "SHIFT ENDING", size: ui.text.body, pos: k.vec2(arena.width - 24, 62), anchor: "topright", color: fg });
  }

  const hoverTruck = drag ? truckAt(mouse.x, mouse.y) : undefined;

  for (const truck of state.trucks) {
    const y = bedY(truck);
    const load = getTruckLoad(truck);
    const isTarget = hoverTruck?.id === truck.id;

    k.drawRect({
      pos: k.vec2(BED.x, y),
      width: BED.width,
      height: bedHeight(),
      fill: false,
      outline: {
        width: isTarget || load > truck.capacity ? ui.frameWidth * 2 : ui.frameWidth,
        color: isTarget || load > truck.capacity ? fg : muted,
      },
    });

    // Load meter: solid up to capacity, outlined past it, tick marks capacity.
    {
      const scale = Math.max(truck.capacity * 2, load);
      const unit = BED.width / scale;
      const capX = BED.x + truck.capacity * unit;
      const meterY = y - 9;
      k.drawRect({ pos: k.vec2(BED.x, meterY), width: BED.width, height: 6, fill: false, outline: { width: 1, color: muted } });
      k.drawRect({ pos: k.vec2(BED.x, meterY), width: Math.min(load, truck.capacity) * unit, height: 6, color: fg });
      if (load > truck.capacity) {
        k.drawRect({
          pos: k.vec2(capX, meterY),
          width: (load - truck.capacity) * unit,
          height: 6,
          fill: false,
          outline: { width: 2, color: danger },
        });
      }
      k.drawRect({ pos: k.vec2(capX - 1, meterY - 3), width: 2, height: 12, color: fg });
    }

    const status = truck.status === "LOADING" ? "" : `  ${truck.status.replace("_", " ")} ${Math.ceil(truck.timeRemaining)}s`;
    k.drawText({ text: `TRUCK ${String.fromCharCode(65 + truck.id)}${status}`, size: ui.text.body, pos: k.vec2(BED.x, y - 33), color: fg });

    if (truck.status === "LOADING") {
      const adding = isTarget && drag && drag.fromTruckId !== truck.id ? drag.pkg : null;
      const shownLoad = load + (adding?.load ?? 0);
      const shownValue = getTruckValue(truck) + (adding?.value ?? 0);
      const before = getTruckChance(truck);
      const after = calculateDeliveryChance(shownLoad, truck.capacity);
      const centerY = y - 24;
      const over = shownLoad - truck.capacity;
      let right = deliverButtonPos(truck).x - 16;

      // Draws one item right-aligned at `right`, returns the next free right edge.
      const put = (text: string, size: number, color: typeof fg, gap = 18): void => {
        const width = k.formatText({ text, size }).width;
        k.drawText({ text, size, pos: k.vec2(right, centerY), anchor: "right", color });
        right -= width + gap;
      };

      put(adding ? `${before}% > ${after}%` : `${after}%`, ui.text.key, chanceColor(after), 8);
      if (!adding) put("CHANCE", ui.text.small, muted, 22);

      put(`$${shownValue}`, ui.text.body, fg, 8);
      put("VALUE", ui.text.small, muted, 22);

      if (over > 0) {
        const text = `${shownLoad}/${truck.capacity} +${over}`;
        const width = k.formatText({ text, size: ui.text.body }).width;
        k.drawRect({
          pos: k.vec2(right - width - 8, centerY - 14),
          width: width + 16,
          height: 28,
          color: danger,
        });
        k.drawText({ text, size: ui.text.body, pos: k.vec2(right, centerY), anchor: "right", color: k.Color.fromHex(colors.background) });
        right -= width + 16 + 8;
      } else {
        put(`${shownLoad}/${truck.capacity}`, ui.text.body, fg, 8);
      }
      put("LOAD", ui.text.small, muted, 0);
    }

    const button = deliverButtonPos(truck);
    const enabled = canDeliver(truck);
    k.drawRect({
      pos: k.vec2(button.x, button.y),
      width: DELIVER_BUTTON.width,
      height: DELIVER_BUTTON.height,
      color: enabled ? fg : k.Color.fromHex(colors.background),
      outline: { width: ui.frameWidth, color: enabled ? fg : muted },
    });
    k.drawText({
      text: "DELIVER",
      size: ui.text.small,
      pos: k.vec2(button.x + DELIVER_BUTTON.width / 2, button.y + DELIVER_BUTTON.height / 2),
      anchor: "center",
      color: enabled ? k.Color.fromHex(colors.background) : muted,
    });

    if (truck.status === "EN_ROUTE") {
      const progress = 1 - truck.timeRemaining / shift.routeSeconds;
      const laneY = y + bedHeight() / 2;
      const laneLeft = BED.x + 40;
      const laneRight = BED.x + BED.width - 40;
      const dots = ROUTE_DOTS;
      for (let i = 0; i < dots; i += 1) {
        const t = i / (dots - 1);
        k.drawRect({
          pos: k.vec2(laneLeft + (laneRight - laneLeft) * t - 4, laneY - 4),
          width: 8,
          height: 8,
          color: t <= progress ? fg : muted,
        });
      }
      k.drawRect({
        pos: k.vec2(laneLeft + (laneRight - laneLeft) * progress - 18, laneY - 36),
        width: 36,
        height: 24,
        color: fg,
      });
      k.drawText({
        text: `DELIVERING $${truck.lockedValue} @ ${truck.lockedChance}%`,
        size: ui.text.small,
        pos: k.vec2(BED.x + 12, y + bedHeight() - 26),
        color: fg,
      });
      continue;
    }

    if (truck.status === "RETURNING") {
      k.drawText({
        text: `REPAIRING... ${Math.ceil(truck.timeRemaining)}s`,
        size: ui.text.body,
        pos: k.vec2(BED.x + BED.width / 2, y + bedHeight() / 2),
        anchor: "center",
        color: muted,
      });
      continue;
    }

    const slots = cargoLayout(truck);
    truck.cargo.forEach((pkg, index) => {
      if (drag?.pkg.id === pkg.id) return;
      const pos = slots[index];
      const age = k.time() - (loadedAt.get(pkg.id) ?? -Infinity);
      const drop = age < juice.cargoDropSeconds ? (1 - age / juice.cargoDropSeconds) * 28 : 0;
      drawBox(pos.x, pos.y - drop, pkg, false, pos.w, false);
    });
  }

  k.drawText({ text: "PACKAGES — drag into a truck", size: ui.text.small, pos: k.vec2(QUEUE.x, QUEUE.y - 28), color: muted });

  const queueSlots = queueLayout();
  state.queue.forEach((pkg, index) => {
    if (drag?.pkg.id === pkg.id) return;
    const pos = queueSlots[index];
    drawBox(pos.x, pos.y, pkg, false, pos.w, overBy(pkg) !== null);
  });

  for (const banner of banners) {
    const truck = state.trucks.find((item) => item.id === banner.truckId);
    if (!truck) continue;
    const cx = BED.x + BED.width / 2;
    const cy = bedY(truck) + bedHeight() / 2;
    k.drawRect({
      pos: k.vec2(cx - 290, cy - 26),
      width: 580,
      height: 52,
      color: k.Color.fromHex(colors.background),
      outline: { width: ui.frameWidth, color: banner.bust ? danger : safe },
    });
    k.drawText({
      text: banner.text,
      size: ui.text.key,
      pos: k.vec2(cx, cy),
      anchor: "center",
      color: banner.bust ? danger : safe,
    });
  }

  for (const overlay of overlays) {
    const t = Math.max(0, overlay.remaining / juice.overlaySeconds);
    k.drawRect({
      pos: k.vec2(0, arena.height / 2 - 70),
      width: arena.width,
      height: 140,
      color: overlay.bust ? danger : safe,
      opacity: 0.9 * t,
    });
    k.drawText({
      text: overlay.text,
      size: 72,
      pos: k.vec2(arena.width / 2, arena.height / 2),
      anchor: "center",
      color: k.Color.fromHex(colors.background),
      opacity: t,
    });
  }

  if (state.phase === "REPORT") drawReport();

  if (drag) {
    drawBox(mouse.x - drag.offsetX, mouse.y - drag.offsetY, drag.pkg, true, cardWidth(drag.pkg.load), false);
  }
});
