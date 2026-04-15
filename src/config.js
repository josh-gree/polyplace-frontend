// Shared constants for the grid prototype.
//
// Coordinate convention:
// - One "world" unit is one grid cell.
// - `view.scale` means CSS pixels per grid cell.
//   Example: scale 0.8 is zoomed out; scale 24 means each cell is a 24px square.
export const CONFIG = Object.freeze({
  GRID_SIZE: 1000,
  MAX_SCALE: 96,
  MIN_SCALE_FLOOR: 0.08,
  CELL_GRID_MIN_SCALE: 7,
  LABEL_MIN_SCALE: 30,
  LIVE_UPDATES_URL: "ws://127.0.0.1:8765/ws",
  BACKGROUND_COLOR: "#f3f5f8",
  CLEAR_COLOR: "#d8dde5",
  PALETTE: [
    "#e94f37",
    "#21a67a",
    "#2979c7",
    "#f2c84b",
    "#151515",
    "#c44569",
    "#00a6a6",
  ],
});
