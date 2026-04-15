import { CONFIG } from "./config.js";

function createBoardCanvas() {
  const board = document.createElement("canvas");
  board.width = CONFIG.GRID_SIZE;
  board.height = CONFIG.GRID_SIZE;
  return board;
}

// The offscreen board is the source image for both the main viewport and the
// minimap. One canvas pixel equals one grid cell, so future cell edits can be
// represented as one-pixel writes here.
export function createEmptyBoard() {
  const board = createBoardCanvas();
  const context = board.getContext("2d");

  context.fillStyle = CONFIG.CLEAR_COLOR;
  context.fillRect(0, 0, CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);

  return board;
}

export function applyCellUpdates(board, cells) {
  const context = board.getContext("2d");

  for (const [x, y, color] of cells) {
    if (x < 0 || y < 0 || x >= CONFIG.GRID_SIZE || y >= CONFIG.GRID_SIZE) continue;

    context.fillStyle = color;
    context.fillRect(x, y, 1, 1);
  }
}
