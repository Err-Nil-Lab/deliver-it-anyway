import { GAME_CONFIG } from "../config";
import { playSfx } from "../audio";
import { banners, danger, fg, formatMoney, inside, k, muted, safe, session, upgrades } from "../context";
import { buyUpgrade, createShiftState, getUpgradeCost, type UpgradeKey } from "../shiftState";

const { arena, colors, ui, juice, shift } = GAME_CONFIG;
export const UPGRADE_KEYS: UpgradeKey[] = ["capacity", "duration", "spawn", "trucks"];

export const NEXT_BUTTON = { x: 300, y: 640, width: 200, height: 44 };

export function startNextShift(): void {
  session.state = createShiftState(session.state.wallet, upgrades);
  session.logSeen = 0;
  banners.length = 0;
  session.flash = 0;
  session.drag = null;
}

export function pressNextShift(px: number, py: number): boolean {
  if (session.state.phase !== "REPORT") return false;
  if (inside(px, py, NEXT_BUTTON.x, NEXT_BUTTON.y, NEXT_BUTTON.width, NEXT_BUTTON.height)) startNextShift();
  else pressUpgrade(px, py);
  return true;
}

export const UPGRADE_ROW = { x: 100, firstY: 410, step: 54, buttonWidth: 150, buttonHeight: 36 };

export function upgradeButtonPos(index: number): { x: number; y: number } {
  return {
    x: arena.width - UPGRADE_ROW.x - 24 - UPGRADE_ROW.buttonWidth,
    y: UPGRADE_ROW.firstY + index * UPGRADE_ROW.step,
  };
}

export function upgradeEffect(key: UpgradeKey): string {
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

export function pressUpgrade(px: number, py: number): void {
  UPGRADE_KEYS.forEach((key, index) => {
    const pos = upgradeButtonPos(index);
    if (inside(px, py, pos.x, pos.y, UPGRADE_ROW.buttonWidth, UPGRADE_ROW.buttonHeight)) {
      if (buyUpgrade(session.state, upgrades, key)) {
        playSfx("upgrade");
        k.shake(juice.upgradeShake);
      }
    }
  });
}

export function drawReport(): void {
  const successes = session.state.log.filter((entry) => entry.outcome === "SUCCESS").length;
  const busts = session.state.log.length - successes;
  const gross = session.state.log.reduce((sum, entry) => sum + entry.payout, 0);
  const repairs = session.state.log.reduce((sum, entry) => sum + entry.repairCost, 0);
  const net = gross - repairs;
  const perMinute = session.state.elapsed > 0 ? Math.round((net / session.state.elapsed) * 60) : 0;
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
    ["DELIVERIES", `${session.state.log.length}  (${successes} OK / ${busts} DUAR)`, fg],
    ["PAYOUT", `$${gross}`, gross > 0 ? safe : fg],
    ["REPAIR COST", `-$${repairs}`, repairs > 0 ? danger : fg],
    ["NET", `$${net}`, fg],
    ["PER MINUTE", `$${perMinute}`, fg],
    ["WALLET", formatMoney(session.state.wallet), session.state.wallet < 0 ? danger : fg],
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
    const affordable = cost !== null && session.state.wallet >= cost;
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
