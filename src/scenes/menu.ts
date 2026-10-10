import { GAME_CONFIG } from "../config";
import { fg, inside, k, muted, session } from "../context";

const { arena, colors, ui } = GAME_CONFIG;

export const START_BUTTON = { x: 300, y: 430, width: 200, height: 52 };
export const HOWTO_BUTTON = { x: 300, y: 498, width: 200, height: 44 };
export const BACK_BUTTON = { x: 300, y: 560, width: 200, height: 44 };

export function startGame(): void {
  session.scene = "PLAY";
}

export function drawMenu(): void {
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

export function drawHowTo(): void {
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

/** Returns true if the press was handled by a menu scene. */
export function pressMenu(px: number, py: number): boolean {
  if (session.scene === "MENU") {
    if (inside(px, py, START_BUTTON.x, START_BUTTON.y, START_BUTTON.width, START_BUTTON.height)) startGame();
    else if (inside(px, py, HOWTO_BUTTON.x, HOWTO_BUTTON.y, HOWTO_BUTTON.width, HOWTO_BUTTON.height)) {
      session.scene = "HOWTO";
    }
    return true;
  }
  if (session.scene === "HOWTO") {
    if (inside(px, py, BACK_BUTTON.x, BACK_BUTTON.y, BACK_BUTTON.width, BACK_BUTTON.height)) session.scene = "MENU";
    return true;
  }
  return false;
}
