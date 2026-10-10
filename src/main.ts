import { GAME_CONFIG } from "./config";
import { danger, fg, k, session } from "./context";
import { drawHowTo, drawMenu, pressMenu, startGame } from "./scenes/menu";
import { pressNextShift, startNextShift } from "./scenes/report";
import { drawPlay, pressPlay, releasePlay, updatePlay } from "./scenes/play";

const { arena, colors, ui } = GAME_CONFIG;

k.onUpdate(() => {
  if (session.scene === "PLAY") updatePlay();
});

k.onMousePress(() => {
  const mouse = k.mousePos();
  if (pressMenu(mouse.x, mouse.y)) return;
  if (pressNextShift(mouse.x, mouse.y)) return;
  pressPlay(mouse.x, mouse.y);
});

k.onMouseRelease(() => {
  if (session.scene === "PLAY") releasePlay();
});

k.onKeyPress(["enter", "space"], () => {
  if (session.scene === "MENU") startGame();
  else if (session.scene === "HOWTO") session.scene = "MENU";
  else if (session.state.phase === "REPORT") startNextShift();
});

k.onKeyPress("escape", () => {
  if (session.scene === "HOWTO") session.scene = "MENU";
});

k.onKeyPress("h", () => {
  if (session.scene === "MENU") session.scene = "HOWTO";
});

k.onDraw(() => {
  if (session.flash > 0) {
    k.drawRect({ pos: k.vec2(0, 0), width: arena.width, height: arena.height, color: danger, opacity: session.flash });
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

  if (session.scene === "MENU") {
    drawMenu();
    return;
  }
  if (session.scene === "HOWTO") {
    drawHowTo();
    return;
  }

  drawPlay();
});
