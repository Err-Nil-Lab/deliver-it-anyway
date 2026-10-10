import { GAME_CONFIG } from "./config";
import { inside, session } from "./context";
import { getTruckLoad, type Package, type Truck } from "./shiftState";

const { arena } = GAME_CONFIG;

// Greybox layout. Positions are derived from state each frame; nothing is cached.
// One shared left edge with the header text (24 px).
export const EDGE = 24;
export const BED = { x: EDGE, width: arena.width - EDGE * 2, firstY: 130 };

// With three trucks the beds compress so the queue below keeps its place.
export function bedHeight(): number {
  return session.state.trucks.length > 2 ? 100 : 150;
}

export function bedGap(): number {
  return session.state.trucks.length > 2 ? 50 : 70;
}
export const BOX = { height: 84, gap: 10 };
export const QUEUE = { x: EDGE, y: 560, maxRows: 2 };
export const CARGO_SCALE = 0.8;

// Card width follows load, so heavier packages look heavier. Visual only: bed space is not a rule.
export function cardWidth(load: number, scale = 1): number {
  return Math.round(Math.min(200, Math.max(92, 64 + load * 2.2)) * scale);
}
export const DELIVER_BUTTON = { width: 130, height: 28 };

export function bedY(truck: Truck): number {
  return BED.firstY + truck.id * (bedHeight() + bedGap());
}

export type Slot = { x: number; y: number; w: number };

export function cargoLayout(truck: Truck): Slot[] {
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
export function queueLayout(): Slot[] {
  for (let scale = 1; scale >= 0.55; scale -= 0.05) {
    const slots: Slot[] = [];
    let x = QUEUE.x;
    let row = 0;
    for (const pkg of session.state.queue) {
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
  return session.state.queue.map((_, index) => ({ x: QUEUE.x + index * 40, y: QUEUE.y, w: 92 }));
}

/** How far a package exceeds the roomiest truck's remaining safe capacity, or null if it fits safely. */
export function overBy(pkg: Package): number | null {
  const open = session.state.trucks.filter((truck) => truck.status === "LOADING");
  if (open.length === 0) return null;
  const room = Math.max(...open.map((truck) => truck.capacity - getTruckLoad(truck)));
  return pkg.load > room ? pkg.load - Math.max(0, room) : null;
}

export function deliverButtonPos(truck: Truck): { x: number; y: number } {
  return { x: BED.x + BED.width - DELIVER_BUTTON.width, y: bedY(truck) - 38 };
}

export function canDeliver(truck: Truck): boolean {
  return session.state.phase === "RUNNING" && truck.status === "LOADING" && truck.cargo.length > 0;
}

export function truckAt(px: number, py: number): Truck | undefined {
  return session.state.trucks.find((truck) => inside(px, py, BED.x, bedY(truck), BED.width, bedHeight()));
}
