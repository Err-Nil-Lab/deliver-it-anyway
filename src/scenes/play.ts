import { GAME_CONFIG } from "../config";
import { playSfx } from "../audio";
import {
  banners,
  caution,
  chanceColor,
  danger,
  fg,
  formatMoney,
  inside,
  k,
  loadedAt,
  muted,
  overlays,
  routeTicks,
  safe,
  session,
  type Drag,
} from "../context";
import {
  BED,
  BOX,
  DELIVER_BUTTON,
  QUEUE,
  bedHeight,
  bedY,
  canDeliver,
  cardWidth,
  cargoLayout,
  deliverButtonPos,
  overBy,
  queueLayout,
  truckAt,
} from "../layout";
import {
  deliver,
  getTruckChance,
  getTruckLoad,
  getTruckValue,
  loadPackage,
  tickShift,
  unloadPackage,
  type Package,
} from "../shiftState";
import { calculateDeliveryChance } from "../systems/risk";
import { drawReport } from "./report";

const { arena, colors, ui, juice, shift } = GAME_CONFIG;
export const BANNER_SECONDS = 2.5;
export const ROUTE_DOTS = 8;

export function pressDeliver(px: number, py: number): boolean {
  for (const truck of session.state.trucks) {
    const pos = deliverButtonPos(truck);
    if (!inside(px, py, pos.x, pos.y, DELIVER_BUTTON.width, DELIVER_BUTTON.height)) continue;
    if (canDeliver(truck) && deliver(session.state, truck.id)) {
      playSfx("dispatch");
      k.shake(juice.dispatchShake);
    }
    return true;
  }
  return false;
}

export function collectResults(): void {
  while (session.logSeen < session.state.log.length) {
    const entry = session.state.log[session.logSeen];
    session.logSeen += 1;
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
    if (bust) session.flash = 0.3;
  }
}

export function pickPackage(px: number, py: number): Drag | null {
  for (const truck of session.state.trucks) {
    if (truck.status !== "LOADING") continue;
    for (let i = 0; i < truck.cargo.length; i += 1) {
      const pos = cargoLayout(truck)[i];
      if (inside(px, py, pos.x, pos.y, pos.w, BOX.height)) {
        return { pkg: truck.cargo[i], fromTruckId: truck.id, offsetX: px - pos.x, offsetY: py - pos.y };
      }
    }
  }

  const slots = queueLayout();
  for (let i = 0; i < session.state.queue.length; i += 1) {
    const pos = slots[i];
    if (inside(px, py, pos.x, pos.y, pos.w, BOX.height)) {
      return { pkg: session.state.queue[i], fromTruckId: null, offsetX: px - pos.x, offsetY: py - pos.y };
    }
  }

  return null;
}

export function dropPackage(held: Drag, px: number, py: number): void {
  const target = truckAt(px, py);

  if (held.fromTruckId !== null && target?.id === held.fromTruckId) return;

  if (held.fromTruckId !== null) {
    if (!unloadPackage(session.state, held.fromTruckId, held.pkg.id)) return;
    if (target && loadPackage(session.state, target.id, held.pkg.id)) {
      loadedAt.set(held.pkg.id, k.time());
      playSfx("load");
      return;
    }
    // Dropped outside a bed, or target refused the package: it goes back to the queue (already unloaded).
    return;
  }

  if (target && loadPackage(session.state, target.id, held.pkg.id)) {
    loadedAt.set(held.pkg.id, k.time());
    playSfx("load");
  }
}

// Rarity is shape-only: single frame (common), double frame (rare), double frame + solid header (jackpot).
export function drawBox(x: number, y: number, pkg: Package, highlight: boolean, width: number, heavy: boolean): void {
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

export function pressPlay(px: number, py: number): void {
  if (pressDeliver(px, py)) return;
  session.drag = pickPackage(px, py);
}

export function releasePlay(): void {
  if (!session.drag) return;
  const mouse = k.mousePos();
  const held = session.drag;
  session.drag = null;
  dropPackage(held, mouse.x, mouse.y);
}

export function updatePlay(): void {
  const dt = Math.min(k.dt(), 0.1);
  tickShift(session.state, dt);
  collectResults();

  for (let i = banners.length - 1; i >= 0; i -= 1) {
    banners[i].remaining -= dt;
    if (banners[i].remaining <= 0) banners.splice(i, 1);
  }
  session.flash = Math.max(0, session.flash - dt);

  for (let i = overlays.length - 1; i >= 0; i -= 1) {
    overlays[i].remaining -= dt;
    if (overlays[i].remaining <= 0) overlays.splice(i, 1);
  }

  for (const truck of session.state.trucks) {
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
}

export function drawPlay(): void {
  const mouse = k.mousePos();

  const secondsLeft = Math.ceil(session.state.timeRemaining);
  k.drawText({
    text: `WALLET ${formatMoney(session.state.wallet)}`,
    size: ui.text.key,
    pos: k.vec2(24, 28),
    color: session.state.wallet < 0 ? danger : fg,
  });
  const urgent = session.state.phase === "RUNNING" && secondsLeft <= 10;
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
  if (session.state.phase === "RUNNING" && session.state.queue.length >= shift.maxQueue) {
    const label = "QUEUE FULL";
    const width = k.formatText({ text: label, size: ui.text.small }).width;
    k.drawRect({ pos: k.vec2(24, 62), width: width + 16, height: 22, color: fg });
    k.drawText({ text: label, size: ui.text.small, pos: k.vec2(32, 66), color: k.Color.fromHex(colors.background) });
  }
  if (session.state.phase !== "RUNNING") {
    k.drawText({ text: "SHIFT ENDING", size: ui.text.body, pos: k.vec2(arena.width - 24, 62), anchor: "topright", color: fg });
  }

  const hoverTruck = session.drag ? truckAt(mouse.x, mouse.y) : undefined;

  for (const truck of session.state.trucks) {
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
      const adding = isTarget && session.drag && session.drag.fromTruckId !== truck.id ? session.drag.pkg : null;
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
      if (session.drag?.pkg.id === pkg.id) return;
      const pos = slots[index];
      const age = k.time() - (loadedAt.get(pkg.id) ?? -Infinity);
      const drop = age < juice.cargoDropSeconds ? (1 - age / juice.cargoDropSeconds) * 28 : 0;
      drawBox(pos.x, pos.y - drop, pkg, false, pos.w, false);
    });
  }

  k.drawText({ text: "PACKAGES — drag into a truck", size: ui.text.small, pos: k.vec2(QUEUE.x, QUEUE.y - 28), color: muted });

  const queueSlots = queueLayout();
  session.state.queue.forEach((pkg, index) => {
    if (session.drag?.pkg.id === pkg.id) return;
    const pos = queueSlots[index];
    drawBox(pos.x, pos.y, pkg, false, pos.w, overBy(pkg) !== null);
  });

  for (const banner of banners) {
    const truck = session.state.trucks.find((item) => item.id === banner.truckId);
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

  if (session.state.phase === "REPORT") drawReport();

  if (session.drag) {
    drawBox(mouse.x - session.drag.offsetX, mouse.y - session.drag.offsetY, session.drag.pkg, true, cardWidth(session.drag.pkg.load), false);
  }
}
